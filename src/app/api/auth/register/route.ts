import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { hashPassword, generateToken } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { name, username, email, password, emailToken, googleToken } = await req.json();

        if (!name || !username || !email || !password || (!emailToken && !googleToken)) {
            return NextResponse.json(
                { error: 'Missing required fields. Verification is mandatory.' },
                { status: 400 }
            );
        }

        const USERNAME_REGEX = /^[a-z](?!.*[._]{2})[a-z0-9._]{2,18}[a-z0-9]$/;
        if (!USERNAME_REGEX.test(username)) {
            return NextResponse.json(
                { error: 'Invalid username format. Must be 4-20 chars, start with a letter, and contain no consecutive special characters.' },
                { status: 400 }
            );
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

        // REMOVED: Phone Token Verification (Moved to Profile later)

        // REMOVED: Strict Domain Check (@paruluniversity.ac.in)

        // Final Check for Uniqueness (Race condition protection)
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            if (existingEmail.isVerified) {
                return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
            }
            // If unverified, we overwrite.
            await User.deleteOne({ email });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name,
            username,
            email,
            password: hashedPassword,
            role: 'user', // Default Role
            gender: 'none', // Default Gender
            isVerified: true,
            authProvider: googleToken ? 'google' : 'email',
            googleId: verifiedGoogleId
        });

        // Generate Login Token
        // Fix (Final): Use userId to match Login API standard
        const token = generateToken({
            userId: user._id,
            email: user.email,
            role: user.role,
            name: user.name
        });

        const response = NextResponse.json(
            { message: 'Registration successful!', user },
            { status: 201 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Registration Error:', error);
        // Duplicate key error handling (backup for race conditions)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({ error: `${field} already exists.` }, { status: 409 });
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
