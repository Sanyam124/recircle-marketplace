import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Community from '@/models/Community';
import { hashPassword, generateToken } from '@/lib/auth';
import { sanitize, safeString } from '@/lib/utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Account Registration Controller
 * Handles Email/Password and Google-linked registrations with multi-layer security.
 */
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // 1. Rate Limiting Check
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfigData = await SiteSettings.getSingleton();

        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'register', siteConfigData.ipLimitRegisterPerHour, 60 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json({ 
                error: 'Too many attempts. Please wait.',
                retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 30
            }, { status: 429 });
        }

        if (!siteConfigData.newRegistrationsEnabled) {
            return NextResponse.json({ error: 'Registrations are temporarily disabled.' }, { status: 503 });
        }

        // 2. Security Shield & Sanitization
        const Blacklist = (await import('@/models/Blacklist')).default;
        let body = sanitize(await req.json());
        
        // Honeypot Bot Trap
        if (body.website_url) {
            console.warn('[BOT BLOCKED] Honeypot triggered.');
            return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
        }

        let { name, email, password, emailToken, googleToken } = body;
        name = safeString(name);
        email = safeString(email);
        password = safeString(password);
        emailToken = safeString(emailToken);
        googleToken = safeString(googleToken);

        if (!name || name.trim().length < 3 || name.trim().length > 30) {
            return NextResponse.json({ error: 'Name must be 3-30 characters.' }, { status: 400 });
        }

        const isGoogleAuth = !!googleToken;
        if (!email || (!password && !isGoogleAuth) || (!emailToken && !isGoogleAuth)) {
            return NextResponse.json({ error: 'Verification is mandatory.' }, { status: 400 });
        }

        // 3. Identity Verification
        let verifiedGoogleId = null;
        if (googleToken) {
            try {
                const ticket = await client.verifyIdToken({ idToken: googleToken, audience: process.env.GOOGLE_CLIENT_ID });
                const payload = ticket.getPayload();
                if (!payload || payload.email !== email) throw new Error('Identity mismatch');
                verifiedGoogleId = payload.sub;
            } catch (e: any) {
                return NextResponse.json({ error: `Google verification failed: ${e.message}` }, { status: 400 });
            }
        } else {
            try {
                const decodedEmail = jwt.verify(emailToken, JWT_SECRET) as any;
                if (decodedEmail.target !== email || decodedEmail.type !== 'email' || !decodedEmail.verified) throw new Error('Invalid Token');
            } catch (e) {
                return NextResponse.json({ error: 'Verification expired. Please try again.' }, { status: 400 });
            }
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 4. Persistence & Lockdown Logic
        const isBlacklisted = await Blacklist.findOne({ email: normalizedEmail });
        if (isBlacklisted) {
            return NextResponse.json({ error: 'Access Restricted: This account is permanently suspended.' }, { status: 403 });
        }

        if (verifiedGoogleId) {
            const existingGoogleUser = await User.findOne({ googleId: verifiedGoogleId });
            if (existingGoogleUser) {
                return NextResponse.json({ 
                    error: existingGoogleUser.email === normalizedEmail ? 'Account already exists. Please log in.' : `Linked to another email (${existingGoogleUser.email}).` 
                }, { status: 409 });
            }
        }

        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
            if (existingEmail.isVerified) {
                // Shadow Lockdown Detection
                const isShadowLocked = existingEmail.status === 'Banned' && (existingEmail.bio?.includes('moderation review') || existingEmail.bio?.includes('Shadow Lockdown'));
                if (isShadowLocked) {
                    return NextResponse.json({ error: 'Account Frozen: Your profile is currently under safety review.' }, { status: 403 });
                }
                
                if (existingEmail.status === 'Banned') {
                    return NextResponse.json({ error: 'Access Restricted: This account is permanently suspended.' }, { status: 403 });
                }

                return NextResponse.json({ error: 'Email already registered. Please log in.' }, { status: 409 });
            }
            await User.deleteOne({ email: normalizedEmail }); // Clear unverified stale accounts
        }

        // 5. User Creation & Community Discovery
        let username = '';
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
        let attempts = 0;
        while (attempts < 15) {
            const candidate = `${cleanName || 'user'}${Math.floor(1000 + Math.random() * 89999)}`;
            if (!(await User.findOne({ username: candidate }))) {
                username = candidate;
                break;
            }
            attempts++;
        }

        const hashedPassword = isGoogleAuth ? undefined : await hashPassword(password);
        const emailDomain = normalizedEmail.split('@')[1];
        const matchingCommunities = await Community.find({ isActive: true, emailDomains: emailDomain });
        const verifiedCommunityIds = matchingCommunities.map(c => c._id);

        const userDoc = await User.create({
            name,
            username: username || `u${Date.now()}`,
            email: normalizedEmail,
            ...(hashedPassword && { password: hashedPassword }),
            role: 'user',
            isVerified: true,
            authProvider: isGoogleAuth ? 'google' : 'email',
            verifiedCommunities: verifiedCommunityIds,
            ...(verifiedGoogleId && { googleId: verifiedGoogleId })
        });

        const user = await User.findById(userDoc._id).populate('verifiedCommunities', 'name image isActive hostels').lean();
        if (!user) throw new Error('Registration processing failed.');

        // 6. Response & Session
        const token = generateToken({ userId: user._id, email: user.email, role: user.role, name: user.name });
        const response = NextResponse.json({
            message: 'Welcome to ReCircle!',
            newCommunityJoined: matchingCommunities.length > 0,
            newCommunityNames: matchingCommunities.map(c => c.name),
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
                isVerified: user.isVerified,
                verifiedCommunities: user.verifiedCommunities,
                authProvider: user.authProvider
            }
        }, { status: 201 });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.nextUrl.hostname.includes('localhost'),
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Registration API Error:', error);
        if (error.code === 11000) return NextResponse.json({ error: 'Conflict: Identity already exists.' }, { status: 409 });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
