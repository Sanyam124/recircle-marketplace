import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // --- Rate Limiting (IP-Based) ---
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfigData = await SiteSettings.getSingleton();

        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'check-email', siteConfigData.ipLimitCheckEmailPerHour, 60 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Too many requests from this connection. Please try again later.' },
                { status: 429 }
            );
        }

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail });

        if (user) {
            return NextResponse.json(
                { exists: true, message: 'Email found', authProvider: user.authProvider },
                { status: 200 }
            );
        } else {
             return NextResponse.json(
                { exists: false, message: 'Email not found' },
                { status: 200 }
            );
        }

    } catch (error: any) {
        console.error('Check Email Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
