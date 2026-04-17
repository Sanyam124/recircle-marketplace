import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Community from '@/models/Community';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

export async function PATCH(req: NextRequest, context: any) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;

        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const id = params?.id || req.nextUrl.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Community ID missing' }, { status: 400 });

        const body = await req.json();
        const { action, hostels } = body;

        let community;

        if (action === 'add_hostels') {
            // Replace full list or merge, as requested the payload brings uniqueHostels array
            community = await Community.findByIdAndUpdate(
                id,
                { $set: { hostels } },
                { new: true }
            );
        } else if (action === 'update_hostels') {
            community = await Community.findByIdAndUpdate(
                id,
                { $set: { hostels } },
                { new: true }
            );
        } else {
             return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (!community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, community }, { status: 200 });

    } catch (error: any) {
        console.error('Update Community Failed:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
