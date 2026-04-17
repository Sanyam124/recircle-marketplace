import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Community from '@/models/Community';
import { hashPassword, generateToken } from '@/lib/auth';
import { sanitize, safeString } from '@/lib/utils';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // --- Rate Limiting (IP-Based) ---
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfigData = await SiteSettings.getSingleton();

        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'register', siteConfigData.ipLimitRegisterPerHour, 60 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Too many registration attempts from this connection. Please try again in an hour.' },
                { status: 429 }
            );
        }

        // Check if new registrations are enabled
        if (!siteConfigData.newRegistrationsEnabled) {
            return NextResponse.json({ error: 'New registrations are temporarily disabled. Please try again later.' }, { status: 503 });
        }

        // Security Shield: Check the Permanent Blacklist
        const Blacklist = (await import('@/models/Blacklist')).default;
        
        let body = await req.json();
        body = sanitize(body);
        const { website_url } = body;
        
        // Honeypot Trap: If a bot fills this invisible field, reject them immediately
        if (website_url) {
            console.warn('\x1b[41m[BOT DETECTED]\x1b[0m Registration attempt blocked by Honeypot.');
            return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
        }

        let { name, email, password, emailToken, googleToken } = body;
        
        name = safeString(name);
        email = safeString(email);
        password = safeString(password);
        emailToken = safeString(emailToken);
        googleToken = safeString(googleToken);

        if (!name || name.trim().length < 3 || name.trim().length > 30) {
            return NextResponse.json({ error: 'Name must be between 3 and 30 characters' }, { status: 400 });
        }

        const isGoogleAuth = !!googleToken;

        if (!email || (!password && !isGoogleAuth) || (!emailToken && !isGoogleAuth)) {
            return NextResponse.json(
                { error: 'Missing required fields. Verification is mandatory.' },
                { status: 400 }
            );
        }

        // --- Automatic Unique Username Generation ---
        let username = '';
        let isUnique = false;
        let attempts = 0;
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
        
        while (!isUnique && attempts < 15) {
            const random = Math.floor(1000 + Math.random() * 89999); // 4-5 digit random
            const candidate = `${cleanName}${random}`;
            const exists = await User.findOne({ username: candidate });
            if (!exists) {
                username = candidate;
                isUnique = true;
            }
            attempts++;
        }

        if (!username) {
            // Fallback to purely random if name-based fails
            username = `user${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
        }

        let verifiedGoogleId = null;

        // Verify Verification Method
        if (googleToken) {
            try {
                const ticket = await client.verifyIdToken({
                    idToken: googleToken,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                if (!payload || payload.email !== email) {
                    throw new Error('Google identity mismatch');
                }
                verifiedGoogleId = payload.sub;
            } catch (e: any) {
                return NextResponse.json({ error: `Google verification failed: ${e.message}` }, { status: 400 });
            }
        } else {
            // Verify Legacy Email Token
            try {
                const decodedEmail = jwt.verify(emailToken, JWT_SECRET) as any;
                if (decodedEmail.target !== email || decodedEmail.type !== 'email' || !decodedEmail.verified) {
                    throw new Error('Invalid Email Token');
                }
            } catch (e) {
                return NextResponse.json(
                    { error: 'Invalid or expired Email Verification. Please verify again.' },
                    { status: 400 }
                );
            }
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check Blacklist for email (username check is skipped since it's auto-generated)
        const isBlacklisted = await Blacklist.findOne({ email: normalizedEmail });
        if (isBlacklisted) {
            return NextResponse.json(
                { error: 'This account has been permanently restricted due to safety violations.' },
                { status: 403 }
            );
        }

        // Check if this Google ID is already registered to ANOTHER email
        if (verifiedGoogleId) {
            const existingGoogleUser = await User.findOne({ googleId: verifiedGoogleId });
            if (existingGoogleUser) {
                if (existingGoogleUser.email === normalizedEmail) {
                    return NextResponse.json({ error: 'This Google account is already registered. Please log in.' }, { status: 409 });
                }
                return NextResponse.json({ error: `This Google account is already linked to another email (${existingGoogleUser.email}).` }, { status: 409 });
            }
        }

        // Final Check for Uniqueness
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
            if (existingEmail.isVerified) {
                return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
            }
            await User.deleteOne({ email });
        }

        const hashedPassword = isGoogleAuth ? undefined : await hashPassword(password);

        // Community Auto-Verification (Email Domain Match)
        const emailDomain = normalizedEmail.split('@')[1];
        const matchingCommunities = await Community.find({
            isActive: true,
            emailDomains: emailDomain
        });
        const verifiedCommunityIds = matchingCommunities.map(c => c._id);

        let userDoc = await User.create({
            name,
            username,
            email,
            ...(hashedPassword && { password: hashedPassword }),
            role: 'user',
            gender: 'none',
            isVerified: true,
            authProvider: isGoogleAuth ? 'google' : 'email',
            verifiedCommunities: verifiedCommunityIds,
            ...(verifiedGoogleId && { googleId: verifiedGoogleId })
        });

        const user = await User.findById(userDoc._id)
            .populate('verifiedCommunities', 'name image isActive hostels')
            .lean();

        if (!user) throw new Error('User creation failed');

        const token = generateToken({
            userId: user._id,
            email: user.email,
            role: user.role,
            name: user.name
        });

        const response = NextResponse.json(
            {
                message: 'Registration successful!',
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
            },
            { status: 201 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !req.nextUrl.hostname.includes('192.168.') && !req.nextUrl.hostname.includes('10.') && !req.nextUrl.hostname.includes('localhost'),
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Registration Error:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const msg = field === 'googleId' ? 'This Google account is already registered.' : `${field} already exists.`;
            return NextResponse.json({ error: msg }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
