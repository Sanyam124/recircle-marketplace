import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const totalDisputes = await Order.countDocuments({ status: 'Dispute_Pending' });
        const totalPages = Math.ceil(totalDisputes / limit);

        const disputes = await Order.find({ status: 'Dispute_Pending' })
            .populate('buyer', 'name email')
            .populate('seller', 'name email')
            .populate('product', 'title images')
            .populate('service', 'title images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return NextResponse.json({
            disputes,
            pagination: { currentPage: page, totalPages, totalDisputes, hasMore: page < totalPages }
        }, { status: 200 });

    } catch (error) {
        console.error('Fetch Disputes Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
export const dynamic = 'force-dynamic';
