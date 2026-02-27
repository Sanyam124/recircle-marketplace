import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

// PATCH /api/user/online — heartbeat: update lastSeen to now
export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string };
        await User.findByIdAndUpdate(decoded.userId, { lastSeen: new Date() });
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
