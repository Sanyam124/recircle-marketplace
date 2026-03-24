import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import VerificationRequest from '@/models/VerificationRequest';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        require('@/models/Community');
        
        const requests = await VerificationRequest.find({
            user: decoded.userId,
            status: 'Pending'
        }).populate('community', 'name').sort({ createdAt: -1 });

        return NextResponse.json({ requests }, { status: 200 });

    } catch (error) {
        console.error('Fetch My Verification Requests Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
