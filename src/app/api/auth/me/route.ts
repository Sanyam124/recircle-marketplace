import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Community from '@/models/Community';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        await connectToDatabase();
        require('@/models/Community');

        const user = await User.findById(decoded.userId)
            .populate('verifiedCommunities', 'name image isActive hostels')
            .select('-password');

        if (!user) {
            // Clear stale cookie so middleware stops blocking /auth access
            const res = NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
            res.cookies.set('token', '', { maxAge: 0, path: '/' });
            return res;
        }

        // Force-logout banned users by destroying their session (auto-unban if expired)
        if (user.status === 'Banned') {
            if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
                // Ban expired — auto-unban silently
                user.status = 'Active';
                user.bannedUntil = undefined;
                await user.save();
            } else {
                const res = NextResponse.json({ error: 'Account banned' }, { status: 401 });
                res.cookies.set('token', '', { maxAge: 0, path: '/' });
                return res;
            }
        }

        return NextResponse.json(
            {
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    profilePicture: user.profilePicture,
                    wishlist: user.wishlist || [],
                    wishlistedServices: user.wishlistedServices || [],
                    isVerified: user.isVerified,
                    isPhoneVerified: user.isPhoneVerified,
                    allowPhoneContact: user.allowPhoneContact,
                    usernameChangeCount: user.usernameChangeCount || 0,
                    authProvider: user.authProvider,
                    blockedUsers: user.blockedUsers || [],
                    verifiedCommunities: user.verifiedCommunities || [],
                    status: user.status,
                    isOnVacation: user.isOnVacation,
                    notifyOffers: user.notifyOffers ?? true,
                    notifyMessages: user.notifyMessages ?? true,
                    showOnlineStatus: user.showOnlineStatus ?? true,
                    compactView: user.compactView ?? false,
                    defaultCommunity: user.defaultCommunity,
                    defaultHostel: user.defaultHostel,
                    state: user.state,
                    city: user.city,
                    landmark: user.landmark
                }
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('Auth Check Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
