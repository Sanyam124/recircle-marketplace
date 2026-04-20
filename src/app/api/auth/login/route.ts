import { NextRequest, NextResponse } from 'next/server';

import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyPassword, generateToken } from '@/lib/auth';
import { safeString } from '@/lib/utils';
import { siteConfig } from '@/lib/config';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Account Login Controller
 * Handles Email/Username based authentication with multi-layer security.
 */
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // 1. Rate Limiting & Site Config
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfigData = await SiteSettings.getSingleton();
        
        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'login', siteConfigData.ipLimitLoginPerHour, 60 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json({ 
                error: 'Too many attempts. Please wait.',
                retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 30
            }, { status: 429 });
        }

        let { identifier, password } = await req.json();
        identifier = safeString(identifier);
        password = safeString(password);

        if (!identifier || !password) return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });

        // 2. Identity Resolution
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier.toLowerCase() }
            ]
        }).select('+password +failedLoginAttempts +lockUntil');

        if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

        // 3. Security Checks (Brute Force & Lockdown)
        const userAny = user as any;
        if (userAny.lockUntil && userAny.lockUntil > Date.now()) {
            const remainingMins = Math.ceil((userAny.lockUntil - Date.now()) / 60000);
            return NextResponse.json({ 
                error: `Account locked. Please wait ${remainingMins} minutes.`,
                retryAfter: Math.ceil((userAny.lockUntil - Date.now()) / 1000)
            }, { status: 429 });
        }

        if (user.status === 'Banned') {
            // Auto-Unban Logic
            if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
                user.status = 'Active';
                user.bannedUntil = undefined;
                await user.save();
            } else {
                const isShadowLocked = user.bio?.includes('moderation review') || user.bio?.includes('Shadow Lockdown');
                const expiryMsg = user.bannedUntil 
                    ? ` Ban expires on ${new Date(user.bannedUntil).toLocaleDateString('en-IN')}.`
                    : ' Access is permanently restricted.';

                return NextResponse.json({ 
                    error: isShadowLocked 
                        ? "Account Frozen: Your profile is currently under safety review. Contact support."
                        : `Your account is suspended.${expiryMsg}` 
                }, { status: 403 });
            }
        }

        if (!user.password) {
            return NextResponse.json({ error: 'Auth Mismatch: Please sign in with Google.' }, { status: 401 });
        }

        // 4. Password Verification
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            const failedAttempts = (userAny.failedLoginAttempts || 0) + 1;
            const update: any = { $set: { failedLoginAttempts: failedAttempts } };
            
            if (failedAttempts >= siteConfigData.loginMaxAttempts) {
                update.$set.lockUntil = new Date(Date.now() + siteConfigData.loginLockoutMins * 60 * 1000); 
                update.$set.failedLoginAttempts = 0;
            }

            await User.updateOne({ _id: user._id }, update);
            const remaining = siteConfigData.loginMaxAttempts - failedAttempts;
            return NextResponse.json({ 
                error: remaining > 0 ? `Invalid credentials. ${remaining} attempts left.` : `Account locked for ${siteConfigData.loginLockoutMins} mins.` 
            }, { status: 401 });
        }

        // 5. Successful Auth & Session Creation
        if (userAny.failedLoginAttempts > 0 || userAny.lockUntil) {
            await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });
        }

        const token = generateToken({ userId: user._id, email: user.email, role: user.role });

        // Dynamic Community Discovery
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
            await User.updateOne({ _id: user._id }, { $addToSet: { verifiedCommunities: { $each: newIds } } });
            newCommunityNames = matchingCommunities.map(c => c.name);
        }

        const populatedUser = await User.findById(user._id).populate('verifiedCommunities', 'name image isActive hostels').lean();
        if (!populatedUser) throw new Error('Auth processing failed.');

        const response = NextResponse.json({
            message: 'Welcome back!',
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
        }, { status: 200 });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.nextUrl.hostname.includes('localhost'),
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Login API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
