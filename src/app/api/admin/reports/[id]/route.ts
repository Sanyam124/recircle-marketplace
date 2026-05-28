import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

import User from '@/models/User';

// Helper to check if user is admin (Database-verified)
async function isAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;
    const decoded = verifyToken(token) as { userId: string };
    if (!decoded) return false;

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user?.role === 'admin';
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await connectToDatabase();

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

            // Auto-cleanup: Archive all pending reports targeting this user
            await Report.updateMany(
                { targetUser: targetUser._id, status: 'Pending' },
                { $set: { status: 'Reviewed' } }
            );

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
            // 1. Remove from all wishlists
            await User.updateMany(
                { }, 
                { $pull: { wishlist: report.itemId, wishlistedServices: report.itemId } }
            );

            // 2. Archive all pending reports for this item
            await Report.updateMany(
                { itemId: report.itemId, status: 'Pending' },
                { $set: { status: 'Reviewed' } }
            );

            // 3. Purge all offers for this item
            const Offer = (await import('@/models/Offer')).default;
            await Offer.deleteMany({
                $or: [
                    { product: report.itemId },
                    { service: report.itemId }
                ]
            });

            let item: any = null;
            if (report.itemType === 'product') {
                const Product = (await import('@/models/Product')).default;
                item = await Product.findById(report.itemId);
                if (item) {
                    await Product.findByIdAndDelete(report.itemId);
                    if (item.images && item.images.length > 0) {
                        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                        for (const img of item.images) {
                            try { await deleteFromCloudinary(img); } catch (e) {}
                        }
                    }
                }
            } else if (report.itemType === 'service') {
                const Service = (await import('@/models/Service')).default;
                item = await Service.findById(report.itemId);
                if (item) {
                    await Service.findByIdAndDelete(report.itemId);
                    if (item.images && item.images.length > 0) {
                        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                        for (const img of item.images) {
                            try { await deleteFromCloudinary(img); } catch (e) {}
                        }
                    }
                }
            } else if (report.itemType === 'board-post') {
                const BoardPost = (await import('@/models/BoardPost')).default;
                const post = await BoardPost.findById(report.itemId);
                if (post) {
                    await BoardPost.findByIdAndDelete(report.itemId);
                    if (post.image) {
                        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                        try { await deleteFromCloudinary(post.image); } catch (e) {}
                    }
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
