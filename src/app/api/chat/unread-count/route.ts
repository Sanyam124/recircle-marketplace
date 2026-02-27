import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Message from '@/models/Message';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ unreadCount: 0 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ unreadCount: 0 });

        await connectToDatabase();

        const unreadCount = await Message.countDocuments({
            recipient: decoded.userId,
            isRead: false,
            deletedBy: { $ne: decoded.userId },
            $or: [
                { product: { $exists: true, $ne: null } },
                { service: { $exists: true, $ne: null } }
            ]
        });

        return NextResponse.json({ unreadCount }, { status: 200 });

    } catch (error) {
        console.error('Unread Count GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
