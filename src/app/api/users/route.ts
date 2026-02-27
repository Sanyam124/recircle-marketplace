import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/models/User';
import connectDB from '@/lib/db';

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');

        let query: any = {};

        if (search) {
            query = {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        // Only return non-sensitive public info
        const users = await User.find(query)
            .select('_id name username profilePicture bio')
            .skip(skip)
            .limit(limit)
            .lean();

        return NextResponse.json({
            users,
            pagination: { currentPage: page, totalPages, totalUsers, hasMore: page < totalPages }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
