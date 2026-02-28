import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import '@/models/User'; // Force Mongoose to register User schema for .populate()
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const totalNotifications = await Notification.countDocuments({ recipient: decoded.userId });
        const totalPages = Math.ceil(totalNotifications / limit);

        const notifications = await Notification.find({ recipient: decoded.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'name');

        const unreadCount = await Notification.countDocuments({ recipient: decoded.userId, isRead: false });

        return NextResponse.json({
            notifications,
            unreadCount,
            pagination: {
                currentPage: page,
                totalPages,
                totalNotifications,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();

        const { notificationId, markAll } = await req.json();

        if (markAll) {
            await Notification.updateMany({ recipient: decoded.userId, isRead: false }, { isRead: true });
        } else if (notificationId) {
            await Notification.updateOne({ _id: notificationId, recipient: decoded.userId }, { isRead: true });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Update Notification Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
