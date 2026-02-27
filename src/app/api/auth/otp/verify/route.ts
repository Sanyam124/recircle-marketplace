import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Otp from '@/models/Otp';
import { verifyPassword, generateToken } from '@/lib/auth'; // Reusing generateToken for convenience, or create a specific one
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { target, otp, type } = await req.json();

        if (!target || !otp || !type) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const record = await Otp.findOne({ target, type });
        if (!record) {
            return NextResponse.json({ error: 'OTP not found or expired. Please resend.' }, { status: 400 });
        }

        const isValid = await verifyPassword(otp, record.otp);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // Verification Successful
        // Remove OTP record to prevent reuse
        await Otp.deleteOne({ _id: record._id });

        // Generate Verification Token (Short lived, e.g., 1 hour)
        const verificationToken = jwt.sign(
            { target, type, verified: true },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        return NextResponse.json({
            success: true,
            message: 'Email verified!',
            token: verificationToken
        }, { status: 200 });

    } catch (error) {
        console.error('OTP Verify Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
