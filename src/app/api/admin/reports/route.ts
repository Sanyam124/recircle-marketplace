import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Report from '@/models/Report';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

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

// GET /api/admin/reports — paginated list for admins with aggregated report counts
export async function GET(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 15;
        const status = searchParams.get('status') || 'Pending';

        const dummyUsers = await User.find({ isDummy: true }).select('_id').lean();
        const dummyUserIds = dummyUsers.map(u => u._id);

        const query: any = {
            reporter: { $nin: dummyUserIds },
            targetUser: { $nin: dummyUserIds }
        };
        if (status !== 'all') {
            query.status = status;
        }

        const total = await Report.countDocuments(query);
        const reports = await Report.find(query)
            .populate('reporter', 'name username email')
            .populate('targetUser', 'name username email status')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Aggregate: total reports per target user (all-time)
        const targetUserIds = [...new Set(reports.map((r: any) => r.targetUser?._id?.toString()).filter(Boolean))];
        const userReportCounts = await Report.aggregate([
            { $match: { targetUser: { $in: targetUserIds.map(id => new (require('mongoose').Types.ObjectId)(id)) } } },
            { $group: { _id: '$targetUser', totalReports: { $sum: 1 }, pendingReports: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } } } }
        ]);
        const userCountMap: Record<string, { totalReports: number; pendingReports: number }> = {};
        userReportCounts.forEach((r: any) => { userCountMap[r._id.toString()] = { totalReports: r.totalReports, pendingReports: r.pendingReports }; });

        // Aggregate: total reports per item (for item-specific reports)
        const itemIds = [...new Set(reports.filter((r: any) => r.itemId).map((r: any) => r.itemId.toString()))];
        const itemReportCounts = itemIds.length > 0 ? await Report.aggregate([
            { $match: { itemId: { $in: itemIds.map(id => new (require('mongoose').Types.ObjectId)(id)) } } },
            { $group: { _id: '$itemId', totalReports: { $sum: 1 } } }
        ]) : [];
        const itemCountMap: Record<string, number> = {};
        itemReportCounts.forEach((r: any) => { itemCountMap[r._id.toString()] = r.totalReports; });

        // Attach counts to each report
        const enrichedReports = reports.map((report: any) => ({
            ...report,
            targetUserReportCount: userCountMap[report.targetUser?._id?.toString()] || { totalReports: 1, pendingReports: 1 },
            itemReportCount: report.itemId ? (itemCountMap[report.itemId.toString()] || 1) : 0,
        }));

        return NextResponse.json({
            reports: enrichedReports,
            pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total },
        });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
