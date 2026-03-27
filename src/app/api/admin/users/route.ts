import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

// Helper to check if user is admin
async function isAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;
    const decoded = verifyToken(token);
    if (!decoded) return false;

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user?.role === 'admin';
}

export async function GET(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        await connectToDatabase();

        const query: any = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(query)
            .select('-password -otp -otpExpiry')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return NextResponse.json({
            users,
            pagination: { currentPage: page, totalPages, totalUsers, hasMore: page < totalPages }
        }, { status: 200 });

    } catch (error) {
        console.error('Admin Users Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, role, communityId } = await req.json();

        // Valid roles verification
        const validRoles = ['user', 'student', 'faculty', 'admin', 'verifier'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        await connectToDatabase();
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        user.role = role;

        // If promoting to verifier and a community is provided, ensure it's the primary verified community
        if (role === 'verifier' && communityId) {
            const index = user.verifiedCommunities.findIndex((id: any) => id.toString() === communityId.toString());
            if (index > -1) {
                // Move existing community to front
                const [comm] = user.verifiedCommunities.splice(index, 1);
                user.verifiedCommunities.unshift(comm);
            } else {
                // Add as primary community
                user.verifiedCommunities.unshift(communityId);
            }
            user.isVerified = true;
        }

        await user.save();

        return NextResponse.json({ success: true, user }, { status: 200 });

    } catch (error) {
        console.error('Admin User Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
