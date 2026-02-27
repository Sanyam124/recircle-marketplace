import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

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

        const { email, name, picture, sub: googleId } = payload;

        const user = await User.findOne({ email });

        if (!user) {
            // NEW: Instead of creating, return data for auto-fill
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

        // Existing user logic continues
        if (user.authProvider === 'email' && !user.googleId) {
            user.googleId = googleId;
            user.authProvider = 'google'; // Or keep 'email' but allow google login
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
                    email: user.email,
                    role: user.role,
                    profilePicture: user.profilePicture,
                    wishlist: user.wishlist || [],
                    wishlistedServices: user.wishlistedServices || [],
                    isVerified: user.isVerified
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
