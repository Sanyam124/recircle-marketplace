import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Otp from '@/models/Otp';
import { verifyPassword, generateToken } from '@/lib/auth'; // Reusing generateToken for convenience, or create a specific one
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // --- Rate Limiting (IP-Based) ---
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfigData = await SiteSettings.getSingleton();

        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'otp-verify', siteConfigData.ipLimitOtpVerifyPerHour, 60 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'Too many verification attempts. Please try again later.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 30
                },
                { status: 429 }
            );
        }

        const { target, otp, type } = await req.json();

        if (!target || !otp || !type) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const record = await Otp.findOne({ target, type });
        if (!record) {
            return NextResponse.json({ error: 'OTP not found or expired. Please resend.' }, { status: 400 });
        }

        // --- HARDENING: Anti-Brute Force (Dynamic Strike) ---
        const NOW = new Date();
        const COOL_DOWN_MS = siteConfigData.otpVerifyLockoutMins * 60 * 1000; 
        const lastAttempt = record.lastAttemptAt ? new Date(record.lastAttemptAt) : null;
        
        if ((record.attempts || 0) >= siteConfigData.otpVerifyMaxAttempts && lastAttempt && (NOW.getTime() - lastAttempt.getTime()) < COOL_DOWN_MS) {
            const mins = Math.ceil((COOL_DOWN_MS - (NOW.getTime() - lastAttempt.getTime())) / 60000);
            return NextResponse.json({ error: `Locked for ${mins}m due to suspect activity.` }, { status: 403 });
        }

        const isValid = await verifyPassword(otp, record.otp);
        if (!isValid) {
            await Otp.updateOne({ _id: record._id }, { 
                $inc: { attempts: 1 },
                $set: { lastAttemptAt: NOW }
            });
            const currentFailures = (record.attempts || 0) + 1;
            const remaining = siteConfigData.otpVerifyMaxAttempts - currentFailures;
            const errorMsg = `Incorrect code. ${remaining > 0 ? remaining + ' tries left.' : 'Locked for ' + siteConfigData.otpVerifyLockoutMins + 'm.'}`;
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        // Verification Successful
        // Remove OTP record to prevent reuse
        await Otp.deleteOne({ _id: record._id });

        // Generate Verification Token (Short lived, e.g., 1 hour)
        const verificationToken = jwt.sign(
            { target, type, verified: true, purpose: record.purpose || 'register' },
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
