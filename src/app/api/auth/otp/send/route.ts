import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Otp from '@/models/Otp';
import { hashPassword } from '@/lib/auth';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // --- Rate Limiting (IP-Based) ---
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfigData = await SiteSettings.getSingleton();

        // --- ADMIN SYSTEM KILLSWITCH ---
        if (!siteConfigData.otpEmailEnabled) {
            return NextResponse.json(
                { error: 'Email OTP service is temporarily down. Please use Google Sign-In to register or login.' },
                { status: 503 }
            );
        }
        
        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'otp-send', siteConfigData.ipLimitOtpSendPerHour, 60 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'Too many OTP requests. Please try again later.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 30
                },
                { status: 429 }
            );
        }

        const { target, type, purpose } = await req.json(); // [NEW] Added 'purpose'

        if (!target || !type) {
            return NextResponse.json({ error: 'Missing target or type' }, { status: 400 });
        }

        // --- ADVANCED OTP PROTECTION ---
        // 1. Global Daily Cap (System-wide)
        const globalRL = await checkRateLimit('global-system', 'otp-send-global', siteConfigData.globalDailyOtpLimit, 24 * 60 * 60 * 1000);
        if (!globalRL.success) {
            console.error('\x1b[41m[SECURITY ALERT]\x1b[0m Global OTP Daily Limit Reached!');
            return NextResponse.json(
                { error: 'Email OTP service is temporarily down. Please use Google Sign-In to register or login.' },
                { status: 503 }
            );
        }

        // 2. Per-Email Hourly Limit (Stops targeting a single user from multiple IPs)
        const emailRL = await checkRateLimit(target, 'otp-send-email', siteConfigData.maxOtpPerEmailPerHour, 60 * 60 * 1000);
        if (!emailRL.success) {
            return NextResponse.json(
                { 
                    error: 'Too many OTPs requested for this email. Please try again in an hour.',
                    retryAfter: emailRL.resetTime ? Math.ceil((emailRL.resetTime.getTime() - Date.now()) / 1000) : 3600
                },
                { status: 429 }
            );
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

        // 2. Check for rate limiting (Dynamic Cooldown)
        const recentOtp = await Otp.findOne({ target, type });
        if (recentOtp) {
            const timeSinceLastSend = Date.now() - new Date(recentOtp.updatedAt).getTime();
            const cooldownMs = siteConfigData.otpSendCooldownSecs * 1000;
            if (timeSinceLastSend < cooldownMs) {
                const waitTime = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
                return NextResponse.json(
                    { 
                        error: `Please wait ${waitTime} seconds before requesting another OTP.`,
                        retryAfter: waitTime
                    },
                    { status: 429 }
                );
            }
        }

        // 3. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await hashPassword(otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // 3. Save to Otp Collection (Upsert)
        await Otp.findOneAndUpdate(
            { target, type },
            { otp: otpHash, expiresAt, purpose: purpose || 'register' },
            { upsert: true, new: true }
        );

        // 4. Send OTP via Email
        try {
            const SiteSettings = (await import('@/models/SiteSettings')).default;
            const siteConfig = await SiteSettings.getSingleton();

            if (siteConfig.otpEmailEnabled) {
                const { sendOtpEmail } = await import('@/lib/mailer');
                await sendOtpEmail(target, otp);
            } else if (process.env.NODE_ENV !== 'production') {
                console.log(`DEV OTP for ${target} (Email Disabled): ${otp}`);
            }
        } catch (emailError) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('Email send failed, falling back to console:', emailError);
                console.log(`DEV OTP for ${target}: ${otp}`);
            } else {
                console.error('Email send failed');
                throw emailError;
            }
        }

        return NextResponse.json({ message: 'OTP sent successfully' }, { status: 200 });

    } catch (error) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
