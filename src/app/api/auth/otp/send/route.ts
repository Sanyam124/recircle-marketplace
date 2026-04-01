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

        // 4. Send OTP via Email
        try {
            const nodemailer = (await import('nodemailer')).default;
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD,
                },
            });

            await transporter.sendMail({
                from: `"ReCircle" <${process.env.SMTP_EMAIL}>`,
                to: target,
                subject: `${otp} is your ReCircle verification code`,
                html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
                        <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 32px 24px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">ReCircle</h1>
                            <p style="color: #c7d2fe; margin: 8px 0 0; font-size: 13px;">Campus Marketplace</p>
                        </div>
                        <div style="padding: 32px 24px; text-align: center;">
                            <p style="color: #374151; font-size: 14px; margin: 0 0 24px;">Your verification code is:</p>
                            <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 0 0 24px; letter-spacing: 8px;">
                                <span style="font-size: 36px; font-weight: 900; color: #111827;">${otp}</span>
                            </div>
                            <p style="color: #6b7280; font-size: 12px; margin: 0;">This code expires in 10 minutes. Do not share it with anyone.</p>
                        </div>
                        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} ReCircle · Campus Marketplace</p>
                        </div>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error('Email send failed, falling back to console:', emailError);
            console.log(`DEV OTP for ${target}: ${otp}`);
        }

        return NextResponse.json({ message: 'OTP sent successfully' }, { status: 200 });

    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
