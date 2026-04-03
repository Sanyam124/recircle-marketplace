import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string; role: string };
        if (decoded.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { status, actionType, banDays, sendEmail } = await req.json();

        const report = await Report.findById(id).populate('targetUser');
        if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

        const targetUser = (report.targetUser as any); // Type safe access for fields after population

        // Standard Status Update
        if (status && ['Reviewed', 'Dismissed'].includes(status)) {
            report.status = status;
        }

        // --- Execute Specific Admin Actions ---
        if (actionType === 'ban_user') {
            const User = (await import('@/models/User')).default;
            const Order = (await import('@/models/Order')).default;
            const Product = (await import('@/models/Product')).default;
            const days = parseInt(banDays) || 7;
            const bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            
            await User.findByIdAndUpdate(targetUser._id, { 
                status: 'Banned',
                bannedUntil
            });

            // Auto-cleanup: Cancel all active deals involving the banned user
            const activeDeals = await Order.find({
                $or: [{ buyer: targetUser._id }, { seller: targetUser._id }],
                status: 'Scheduled'
            });

            for (const order of activeDeals) {
                order.status = 'Cancelled';
                order.disputeReason = `User banned (${days}-day ban)`;
                await order.save();

                // Release product if it was Reserved
                if (order.product) {
                    await Product.updateOne(
                        { _id: order.product, status: 'Reserved' },
                        { $set: { status: 'Available' } }
                    );
                }
            }

            report.status = 'Reviewed';

            // Optionally send ban notification email
            if (sendEmail && targetUser?.email) {
                try {
                    const { sendBanNotification } = await import('@/lib/mailer');
                    let itemContext: string | undefined;
                    if (report.itemType !== 'none' && report.itemId) {
                        const Model: any = report.itemType === 'product' 
                            ? (await import('@/models/Product')).default 
                            : (await import('@/models/Service')).default;
                        const item = await Model.findById(report.itemId).select('title').lean();
                        if (item) itemContext = `${report.itemType === 'product' ? 'Product' : 'Service'}: ${(item as any).title}`;
                    }
                    await sendBanNotification({
                        to: targetUser.email,
                        userName: targetUser.name,
                        reason: report.reason,
                        itemContext,
                        banDays: days,
                        banExpiry: bannedUntil
                    });
                } catch (emailErr) {
                    console.error('Ban email failed (non-blocking):', emailErr);
                }
            }
        } 
        else if (actionType === 'delete_content' && report.itemType !== 'none' && report.itemId) {
            let item: any = null;
            if (report.itemType === 'product') {
                const Product = (await import('@/models/Product')).default;
                item = await Product.findById(report.itemId);
                if (item) {
                     // Delete image from Cloudinary if exists
                    if (item.images && item.images.length > 0) {
                        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                        for (const img of item.images) {
                            try { await deleteFromCloudinary(img); } catch (e) {}
                        }
                    }
                    await Product.findByIdAndDelete(report.itemId);
                }
            } else {
                const Service = (await import('@/models/Service')).default;
                item = await Service.findById(report.itemId);
                if (item) {
                     // Delete image from Cloudinary if exists
                    if (item.images && item.images.length > 0) {
                        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                        for (const img of item.images) {
                            try { await deleteFromCloudinary(img); } catch (e) {}
                        }
                    }
                    await Service.findByIdAndDelete(report.itemId);
                }
            }
            report.status = 'Reviewed';
        }

        await report.save();

        return NextResponse.json({ success: true, report });
    } catch (err) {
        console.error("Admin Report Action Error:", err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
