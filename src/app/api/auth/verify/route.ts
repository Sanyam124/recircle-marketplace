import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const user = await User.findOne({ email }).select('+otp +otpExpiry');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.isVerified) {
            return NextResponse.json({ error: 'User already verified, please login' }, { status: 400 });
        }

        if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            return NextResponse.json({ error: 'OTP expired or invalid' }, { status: 400 });
        }

        // Verify OTP (assuming hash if we hashed it, but for MVP plain/console log, let's assuming hashed for security practice)
        // Since we are logging to console, we might have just saved plain but better to hash.
        // Let's check how we stored it in register route. We haven't written register route yet.
        // Let's assume we store it hashed.

        const isValid = await bcrypt.compare(otp, user.otp);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = generateToken({ userId: user._id, email: user.email, role: user.role });

        const response = NextResponse.json(
            {
                message: 'Email verified successfully',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    profilePicture: user.profilePicture,
                    wishlist: user.wishlist || [],
                    isVerified: true
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
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
