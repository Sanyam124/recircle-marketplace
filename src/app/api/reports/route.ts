import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token) as { userId: string };
        const { targetUserId, itemType, itemId, reason } = await req.json();

        if (!targetUserId || !reason || !['product', 'service', 'none'].includes(itemType)) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const query: any = { reporter: decoded.userId, targetUser: targetUserId };
        if (itemType !== 'none' && itemId) {
            query.itemId = itemId;
        } else {
            query.itemType = 'none';
        }

        const existing = await Report.findOne(query);
        if (existing) {
            return NextResponse.json({ error: 'You have already reported this user for this item.' }, { status: 409 });
        }

        await Report.create({
            reporter: decoded.userId,
            targetUser: targetUserId,
            itemType,
            itemId: itemType !== 'none' ? itemId : undefined,
            reason
        });
        return NextResponse.json({ message: 'Report submitted. Our team will review it.' }, { status: 201 });
    } catch (err) {
        console.error('Report error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
