import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Otp from '@/models/Otp';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';

// POST: Generate and "Send" OTP
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // 1. Authenticate User
        const token = req.cookies.get('token')?.value;
        const decoded = verifyToken(token || '');
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { phone } = await req.json();
        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        // 2. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await hashPassword(otp);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // 3. Save to Otp Collection
        await Otp.findOneAndUpdate(
            { target: phone, type: 'phone' },
            { otp: otpHash, expiresAt },
            { upsert: true, new: true }
        );

        // 4. Log to Server Terminal (Mock Send)
        console.log('--- PHONE VERIFICATION OTP ---');
        console.log(`User ID: ${decoded.userId}`);
        console.log(`Phone: ${phone}`);
        console.log(`OTP Code: ${otp}`);
        console.log('-------------------------------');

        return NextResponse.json({ message: 'OTP sent to terminal' });
    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT: Verify OTP and Update Phone
export async function PUT(req: NextRequest) {
    try {
        await connectToDatabase();

        // 1. Authenticate User
        const token = req.cookies.get('token')?.value;
        const decoded = verifyToken(token || '');
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { phone, otp } = await req.json();
        if (!phone || !otp) {
            return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
        }

        // 2. Find and Verify OTP
        const otpDoc = await Otp.findOne({ target: phone, type: 'phone' });
        if (!otpDoc) {
            return NextResponse.json({ error: 'OTP not found or expired' }, { status: 400 });
        }

        const isValid = await verifyPassword(otp, otpDoc.otp);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // 3. Update User
        await User.findByIdAndUpdate(decoded.userId, {
            phone,
            isPhoneVerified: true
        });

        // 4. Clean up OTP
        await Otp.deleteOne({ _id: otpDoc._id });

        return NextResponse.json({ message: 'Phone verified and updated successfully' });
    } catch (error) {
        console.error('OTP Verify Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
