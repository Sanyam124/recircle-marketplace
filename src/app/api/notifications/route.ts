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

        const unreadCount = await Notification.countDocuments({ recipient: decoded.userId, isRead: false });
        const totalPages = Math.ceil(unreadCount / limit);

        const notifications = await Notification.find({ recipient: decoded.userId, isRead: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'name')
            .lean();

        // BACKGROUND CLEANUP: "Lazy Garbage Collection" for orphaned notifications
        const currentNotifications = notifications.filter((n: any) => n.sender !== null);
        const orphanedNotificationIds = notifications
            .filter((n: any) => n.sender === null)
            .map((n: any) => n._id);

        if (orphanedNotificationIds.length > 0) {
            // Silently prune dead notifications from the DB
            Notification.deleteMany({ _id: { $in: orphanedNotificationIds } }).catch(e => 
                console.error('Lazy Notification Cleanup Failed:', e)
            );
        }

        return NextResponse.json({
            notifications: currentNotifications,
            unreadCount: unreadCount - orphanedNotificationIds.length,
            pagination: {
                currentPage: page,
                totalPages,
                totalNotifications: unreadCount - orphanedNotificationIds.length,
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
            await Notification.deleteMany({ recipient: decoded.userId });
        } else if (notificationId) {
            await Notification.deleteOne({ _id: notificationId, recipient: decoded.userId });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Update Notification Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
