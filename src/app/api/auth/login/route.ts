import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyPassword, generateToken } from '@/lib/auth';
import { safeString } from '@/lib/utils';
import { siteConfig } from '@/lib/config';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

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
        }).select('+password');

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
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
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
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
                    authProvider: user.authProvider,
                }
            },
            { status: 200 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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
