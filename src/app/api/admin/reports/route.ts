import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

// GET /api/admin/reports — paginated list for admins
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string; role: string };
        if (decoded.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 15;
        const status = searchParams.get('status') || 'Pending';

        const query = status === 'all' ? {} : { status };
        const total = await Report.countDocuments(query);
        const reports = await Report.find(query)
            .populate('reporter', 'name username email')
            .populate('targetUser', 'name username email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return NextResponse.json({
            reports,
            pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total },
        });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
