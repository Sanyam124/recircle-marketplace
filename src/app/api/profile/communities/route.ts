import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        
        const { searchParams } = new URL(req.url);
        const communityId = searchParams.get('communityId');

        if (!communityId) {
            return NextResponse.json({ error: 'Community ID required' }, { status: 400 });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Remove the community from the user's verified list
        await User.findByIdAndUpdate(user._id, {
            $pull: { verifiedCommunities: communityId }
        });

        return NextResponse.json({ message: 'Community successfully removed from your profile.' }, { status: 200 });

    } catch (error: any) {
        console.error('Remove Community Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
