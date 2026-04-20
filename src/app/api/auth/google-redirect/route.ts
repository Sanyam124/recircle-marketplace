import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import { siteConfig } from '@/lib/config';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // Google sends credential as form data in redirect mode
        const formData = await req.formData();
        const credential = formData.get('credential') as string;
        const csrfToken = formData.get('g_csrf_token') as string;

        if (!credential) {
            return NextResponse.redirect(new URL('/auth?error=missing_credential', req.url));
        }

        // Verify CSRF token from cookie matches form
        const cookieCsrf = req.cookies.get('g_csrf_token')?.value;
        if (!csrfToken || !cookieCsrf || csrfToken !== cookieCsrf) {
            return NextResponse.redirect(new URL('/auth?error=csrf_mismatch', req.url));
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return NextResponse.redirect(new URL('/auth?error=invalid_token', req.url));
        }

        const { email: rawEmail, name, picture, sub: googleId } = payload;
        const email = rawEmail.toLowerCase();

        // Search for user by either email OR googleId
        const user = await User.findOne({
            $or: [{ email }, { googleId }]
        }).select('+password');

        if (!user) {
            // New user: Store Google data in a temporary cookie and redirect to registration
            const googleData = JSON.stringify({
                name,
                email,
                profilePicture: picture,
                googleId,
                credential, // We'll need this for the registration step
            });

            const response = NextResponse.redirect(new URL('/auth?step=register', req.url));
            response.cookies.set('google_pending_registration', googleData, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 60 * 10, // 10 minutes
                path: '/',
            });
            return response;
        }

        // Block banned users
        if (user.status === 'Banned') {
            if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
                user.status = 'Active';
                user.bannedUntil = undefined;
                await user.save();
            } else {
                return NextResponse.redirect(new URL('/auth?error=banned', req.url));
            }
        }

        // Link Google ID if user exists by email but hasn't linked Google yet
        if (!user.googleId) {
            user.googleId = googleId;
            user.authProvider = user.password ? 'both' : 'google';
            user.isVerified = true;
            await user.save();
        }

        // --- Community Auto-Verification ---
        const Community = (await import('@/models/Community')).default;
        const emailDomain = user.email.split('@')[1];
        const matchingCommunities = await Community.find({
            isActive: true,
            emailDomains: emailDomain,
            _id: { $nin: user.verifiedCommunities || [] }
        });

        let newCommunityNames: string[] = [];
        if (matchingCommunities.length > 0) {
            const newIds = matchingCommunities.map((c: any) => c._id);
            await User.updateOne(
                { _id: user._id },
                { $addToSet: { verifiedCommunities: { $each: newIds } } }
            );
            newCommunityNames = matchingCommunities.map((c: any) => c.name);
        }

        // Re-fetch populated user
        const populatedUser = await User.findById(user._id)
            .populate('verifiedCommunities', 'name image isActive hostels')
            .lean();

        if (!populatedUser) throw new Error('User not found after update');

        const token = generateToken({ userId: user._id, email: user.email, role: user.role });

        // Store user data in a cookie for the client to pick up
        const userData = JSON.stringify({
            id: (populatedUser as any)._id,
            name: (populatedUser as any).name,
            username: (populatedUser as any).username,
            email: (populatedUser as any).email,
            role: (populatedUser as any).role,
            profilePicture: (populatedUser as any).profilePicture,
            wishlist: (populatedUser as any).wishlist || [],
            wishlistedServices: (populatedUser as any).wishlistedServices || [],
            isVerified: (populatedUser as any).isVerified,
            verifiedCommunities: (populatedUser as any).verifiedCommunities || [],
            authProvider: (populatedUser as any).authProvider,
            defaultCommunity: (populatedUser as any).defaultCommunity,
            defaultHostel: (populatedUser as any).defaultHostel,
        });

        const response = NextResponse.redirect(new URL('/auth?google_login=success', req.url));

        // Set the auth token cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.nextUrl.hostname.includes('192.168.') && !req.nextUrl.hostname.includes('10.') && !req.nextUrl.hostname.includes('localhost'),
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        // Set user data cookie for client-side pickup (non-httpOnly so JS can read it)
        response.cookies.set('google_login_user', userData, {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 60, // 1 minute - just for the redirect
            path: '/',
        });

        if (newCommunityNames.length > 0) {
            response.cookies.set('new_communities', JSON.stringify(newCommunityNames), {
                httpOnly: false,
                secure: false,
                sameSite: 'lax',
                maxAge: 60,
                path: '/',
            });
        }

        return response;

    } catch (error: any) {
        console.error('Google Redirect Auth Error:', error);
        return NextResponse.redirect(new URL(`/auth?error=auth_failed`, req.url));
    }
}
