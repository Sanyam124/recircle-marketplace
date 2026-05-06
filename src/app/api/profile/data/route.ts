import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import SiteSettings from '@/models/SiteSettings';
import { verifyToken } from '@/lib/auth';
import { validateProfileUpdate, performAccountDeletion } from '@/lib/profile';

/**
 * GET: Fetch User Profile
 */
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        require('@/models/Community');

        const user = await User.findById(decoded.userId)
            .populate('verifiedCommunities', 'name image isActive')
            .select('-password');
            
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const configData = await SiteSettings.getSingleton();

        return NextResponse.json({ user, configData }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT: Update Profile
 */
export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        const body = await req.json();
        
        // Strip protected fields to prevent Mongoose validation errors
        delete body._id;
        delete body.email;
        delete body.role;
        delete body.verifiedCommunities;
        
        const errors = validateProfileUpdate(body);
        if (errors.length > 0) return NextResponse.json({ error: errors[0] }, { status: 400 });

        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Username change limit check
        if (body.username && body.username !== user.username) {
            if (user.usernameChangeCount >= 3) return NextResponse.json({ error: 'Username change limit reached' }, { status: 403 });
            const exists = await User.findOne({ username: body.username, _id: { $ne: user._id } });
            if (exists) return NextResponse.json({ error: 'Username taken' }, { status: 409 });
            body.usernameChangeCount = (user.usernameChangeCount || 0) + 1;
        }

        const updatedUser = await User.findByIdAndUpdate(decoded.userId, { $set: body }, { new: true, runValidators: true })
            .populate('verifiedCommunities', 'name image isActive');

        return NextResponse.json({ message: 'Profile updated', user: updatedUser }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE: Wipe Account
 */
export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        await performAccountDeletion(decoded.userId);

        const response = NextResponse.json({ message: 'Account deleted' }, { status: 200 });
        response.cookies.set('token', '', { httpOnly: true, expires: new Date(0), path: '/' });
        return response;
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Deletion failed' }, { status: 400 });
    }
}
