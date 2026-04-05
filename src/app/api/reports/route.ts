import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

        if (!mongoose.Types.ObjectId.isValid(targetUserId) || (itemId && !mongoose.Types.ObjectId.isValid(itemId))) {
            return NextResponse.json({ error: 'Invalid IDs provided' }, { status: 400 });
        }

        const query: any = { 
            reporter: new mongoose.Types.ObjectId(decoded.userId), 
            targetUser: new mongoose.Types.ObjectId(targetUserId),
            itemType
        };
        
        if (itemType !== 'none' && itemId) {
            query.itemId = new mongoose.Types.ObjectId(itemId);
        } else {
            // For general user reports, ensure we only allow one per reporter-target pair
            query.$or = [{ itemId: { $exists: false } }, { itemId: null }];
        }

        // Only block if a report is currently 'Pending'. 
        // This allows re-reporting if the previous report was 'Reviewed' or 'Dismissed'.
        query.status = 'Pending';

        const existing = await Report.findOne(query);
        if (existing) {
            return NextResponse.json({ error: 'You already have an active pending report for this. Please wait for our team to review it.' }, { status: 409 });
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
