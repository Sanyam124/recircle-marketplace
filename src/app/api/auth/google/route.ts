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
        const { credential } = await req.json();

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return NextResponse.json({ error: 'Invalid Google Token' }, { status: 400 });
        }

        const { email: rawEmail, name, picture, sub: googleId } = payload;
        const email = rawEmail.toLowerCase();

        // Search for user by either email OR googleId
        let user = await User.findOne({
            $or: [{ email }, { googleId }]
        }).select('+password');

        if (!user) {
            // New user: Return data for auto-fill in register page
            return NextResponse.json({
                exists: false,
                googleData: {
                    name,
                    email,
                    profilePicture: picture,
                    googleId
                }
            }, { status: 200 });
        }

        // Block banned users from logging in via Google (auto-unban if expired)
        if (user.status === 'Banned') {
            if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
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

        // Link Google ID if user exists by email but hasn't linked Google yet
        if (!user.googleId) {
            user.googleId = googleId;
            // They are a "both" user if they have a password, otherwise "google"
            user.authProvider = user.password ? 'both' : 'google';
            user.isVerified = true;
            await user.save();
        }

        const token = generateToken({ userId: user._id, email: user.email, role: user.role });

        const response = NextResponse.json(
            {
                message: 'Login successful',
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
                    authProvider: user.authProvider
                }
            },
            { status: 200 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Google Auth Error:', error);
        return NextResponse.json({ error: `Google authentication failed: ${error.message}` }, { status: 500 });
    }
}
