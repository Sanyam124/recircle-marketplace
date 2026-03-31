import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { email, verificationToken, newPassword } = await req.json();

        if (!email || !verificationToken || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify Verification Token
        try {
            const decoded = jwt.verify(verificationToken, JWT_SECRET) as any;
            if (decoded.target !== email || decoded.type !== 'email' || !decoded.verified) {
                throw new Error('Invalid Reset Token');
            }
        } catch (e) {
            return NextResponse.json(
                { error: 'Invalid or expired session. Please verify your email again.' },
                { status: 400 }
            );
        }

        // 2. Find User
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 3. Hash New Password
        const hashedPassword = await hashPassword(newPassword);

        // 4. Update User: Set password and change provider to both if they have Google, otherwise email
        user.password = hashedPassword;
        if (user.authProvider === 'google' || user.googleId) {
            user.authProvider = 'both';
        } else {
            user.authProvider = 'email';
        }
        await user.save();

        return NextResponse.json({ 
            message: 'Password reset successful! You can now log in with your new password.' 
        }, { status: 200 });

    } catch (error: any) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
