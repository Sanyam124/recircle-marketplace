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
        const { status, actionType } = await req.json();

        const report = await Report.findById(id).populate('targetUser');
        if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

        // Standard Status Update
        if (status && ['Reviewed', 'Dismissed'].includes(status)) {
            report.status = status;
        }

        // --- Execute Specific Admin Actions ---
        if (actionType === 'ban_user') {
            const User = (await import('@/models/User')).default;
            await User.findByIdAndUpdate(report.targetUser._id, { status: 'Banned' });
            report.status = 'Reviewed';
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
