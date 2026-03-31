import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Otp from '@/models/Otp';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { target, type, purpose } = await req.json(); // [NEW] Added 'purpose'

        if (!target || !type) {
            return NextResponse.json({ error: 'Missing target or type' }, { status: 400 });
        }

        // 1. Check Purpose and Uniqueness
        if (type !== 'email') {
            return NextResponse.json({ error: 'Only email verification is supported' }, { status: 400 });
        }

        const existingUser = await User.findOne({ email: target });
        
        if (purpose === 'reset') {
            if (!existingUser) {
                return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
            }
        } else {
            // Default: Registration Purpose
            if (existingUser && existingUser.isVerified) {
                return NextResponse.json(
                    { error: 'Email is already registered.' },
                    { status: 409 }
                );
            }
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await hashPassword(otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // 3. Save to Otp Collection (Upsert)
        await Otp.findOneAndUpdate(
            { target, type },
            { otp: otpHash, expiresAt },
            { upsert: true, new: true }
        );

        // 4. Send OTP (Simulated)
        console.log('==================================================');
        console.log(`DEV OTP for ${target} (${type}): ${otp}`);
        console.log('==================================================');

        // In production: await sendEmail(target, otp) or sendSMS(target, otp)

        return NextResponse.json({ message: 'OTP sent successfully' }, { status: 200 });

    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
