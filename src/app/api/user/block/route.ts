import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        const { targetUserId } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        }

        if (targetUserId === decoded.userId) {
            return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });
        }

        const objectIdTarget = new mongoose.Types.ObjectId(targetUserId);

        // Add to blockedUsers array
        await User.findByIdAndUpdate(decoded.userId, {
            $addToSet: { blockedUsers: objectIdTarget }
        });

        return NextResponse.json({ success: true, message: 'User blocked successfully' }, { status: 200 });
    } catch (error) {
        console.error('Block User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get('userId');

        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await connectToDatabase();
        const objectIdTarget = new mongoose.Types.ObjectId(targetUserId);

        // Remove from blockedUsers array
        await User.findByIdAndUpdate(decoded.userId, {
            $pull: { blockedUsers: objectIdTarget }
        });

        return NextResponse.json({ success: true, message: 'User unblocked successfully' }, { status: 200 });
    } catch (error) {
        console.error('Unblock User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
