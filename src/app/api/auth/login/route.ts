import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyPassword, generateToken } from '@/lib/auth';
import { safeString } from '@/lib/utils';
import { siteConfig } from '@/lib/config';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // --- Rate Limiting (IP-Based) ---
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfigData = await SiteSettings.getSingleton();
        
        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'login', siteConfigData.ipLimitLoginPerHour, 60 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Too many login attempts from this connection. Please try again later.' },
                { status: 429 }
            );
        }

        let { identifier, password } = await req.json(); // identifier can be email or username
        identifier = safeString(identifier);
        password = safeString(password);

        if (!identifier || !password) {
            return NextResponse.json(
                { error: 'Missing email/username or password' },
                { status: 400 }
            );
        }

        // Find user by email OR username
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier.toLowerCase() }
            ]
        }).select('+password +failedLoginAttempts +lockUntil');

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // --- Brute Force Protection ---
        // (Cast to any for convenience or update IUser interface)
        const userAny = user as any;
        if (userAny.lockUntil && userAny.lockUntil > Date.now()) {
            const remainingMins = Math.ceil((userAny.lockUntil - Date.now()) / 60000);
            return NextResponse.json(
                { error: `Too many failed attempts. Account locked. Try again in ${remainingMins} minutes.` },
                { status: 429 }
            );
        }

        // Block banned users from logging in (auto-unban if expired)
        if (user.status === 'Banned') {
            if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
                // Ban expired — auto-unban
                user.status = 'Active';
                user.bannedUntil = undefined;
                await user.save();
            } else {
                const expiryMsg = user.bannedUntil 
                    ? ` Your ban expires on ${new Date(user.bannedUntil).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.`
                    : '';
                return NextResponse.json(
                    { error: `Your account has been banned.${expiryMsg} To appeal, contact ${siteConfig.supportEmail}` },
                    { status: 403 }
                );
            }
        }

        // If no password exists, it means this was a Google-only registration
        if (!user.password) {
            return NextResponse.json(
                { error: 'No password set for this email. Please sign in with Google or Reset Password.' },
                { status: 401 }
            );
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            const failedAttempts = (userAny.failedLoginAttempts || 0) + 1;
            let update: any = { $set: { failedLoginAttempts: failedAttempts } };
            
            if (failedAttempts >= siteConfigData.loginMaxAttempts) {
                update.$set.lockUntil = new Date(Date.now() + siteConfigData.loginLockoutMins * 60 * 1000); 
                update.$set.failedLoginAttempts = 0; // Reset after lock
            }

            await User.updateOne({ _id: user._id }, update);

            const remaining = siteConfigData.loginMaxAttempts - failedAttempts;
            const lockoutMsg = `Too many failed attempts. Account locked for ${siteConfigData.loginLockoutMins} minutes.`;
            return NextResponse.json(
                { error: remaining > 0 ? `Invalid credentials. ${remaining} attempts remaining.` : lockoutMsg },
                { status: 401 }
            );
        }

        // Reset failed attempts on success
        if (userAny.failedLoginAttempts > 0 || userAny.lockUntil) {
            await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });
        }

        const token = generateToken({ userId: user._id, email: user.email, role: user.role });

        // Community Auto-Verification on Login (catch new communities added after registration)
        const Community = (await import('@/models/Community')).default;
        const emailDomain = user.email.split('@')[1];
        const matchingCommunities = await Community.find({
            isActive: true,
            emailDomains: emailDomain,
            _id: { $nin: user.verifiedCommunities || [] }
        });
        
        let newCommunityNames: string[] = [];
        if (matchingCommunities.length > 0) {
            const newIds = matchingCommunities.map(c => c._id);
            await User.updateOne(
                { _id: user._id },
                { $addToSet: { verifiedCommunities: { $each: newIds } } }
            );
            newCommunityNames = matchingCommunities.map(c => c.name);
        }

        // Re-fetch populated user to ensure frontend has all community details (names, etc)
        const populatedUser = await User.findById(user._id)
            .populate('verifiedCommunities', 'name image isActive hostels')
            .lean();

        if (!populatedUser) throw new Error('User not found after update');

        const response = NextResponse.json(
            {
                message: 'Login successful',
                newCommunityJoined: newCommunityNames.length > 0,
                newCommunityNames,
                user: {
                    id: populatedUser._id,
                    name: populatedUser.name,
                    username: populatedUser.username,
                    email: populatedUser.email,
                    role: populatedUser.role,
                    profilePicture: populatedUser.profilePicture,
                    wishlist: populatedUser.wishlist || [],
                    wishlistedServices: populatedUser.wishlistedServices || [],
                    isVerified: populatedUser.isVerified,
                    verifiedCommunities: populatedUser.verifiedCommunities || [],
                    authProvider: populatedUser.authProvider,
                }
            },
            { status: 200 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.nextUrl.hostname.includes('192.168.') && !req.nextUrl.hostname.includes('localhost'),
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
