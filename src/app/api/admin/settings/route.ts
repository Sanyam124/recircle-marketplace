import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import SiteSettings from '@/models/SiteSettings';
import { verifyToken } from '@/lib/auth';

async function isAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;
    const decoded = verifyToken(token);
    if (!decoded) return false;
    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user?.role === 'admin';
}

// GET — fetch current settings
export async function GET(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await connectToDatabase();
        const settings = await SiteSettings.getSingleton();

        // Calculate current usage for the security dashboard
        const RequestLog = (await import('@/models/RequestLog')).default;
        const globalLog = await RequestLog.findOne({
            ip: 'global-system',
            path: 'otp-send-global'
        });
        
        const smtp1Log = await RequestLog.findOne({
            ip: 'global-system',
            path: 'smtp-1-usage'
        });
        
        const smtp2Log = await RequestLog.findOne({
            ip: 'global-system',
            path: 'smtp-2-usage'
        });

        const smtp3Log = await RequestLog.findOne({
            ip: 'global-system',
            path: 'smtp-3-usage'
        });

        const nowMilli = Date.now();
        const get24HCount = (log: any) => {
            return (log && (nowMilli - new Date(log.lastRequest).getTime() < 24 * 60 * 60 * 1000)) ? log.count : 0;
        };

        const usageData = {
            sentInLast24h: get24HCount(globalLog),
            smtp1Sent: get24HCount(smtp1Log),
            smtp2Sent: get24HCount(smtp2Log),
            smtp3Sent: get24HCount(smtp3Log)
        };

        return NextResponse.json({ settings, usage: usageData }, { status: 200 });
    } catch (error) {
        console.error('Admin Settings GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT — update settings
export async function PUT(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await connectToDatabase();
        const body = await req.json();
        const settings = await SiteSettings.getSingleton();

        // Whitelist of updatable fields
        const allowedFields = [
            'autoBanRules', 'autoBanEnabled',
            'productCategories', 'serviceCategories', 'serviceAvailability', 'productConditions',
            'defaultAvatars', 'defaultBanners',
            'maxProductImages', 'maxServiceImages',
            'maxPriceProduct', 'maxPriceService', 'minPrice',
            'apiRateLimitGeneral', 'apiRateLimitAuth',
            'maintenanceMode', 'newRegistrationsEnabled', 'newListingsEnabled',
            'banEmailEnabled', 'otpEmailEnabled',
            'maxBoardPostChars', 'maxBoardReplyChars', 'maxSearchChars',
            // Security & Rate Limits
            'loginMaxAttempts', 'loginLockoutMins', 'otpSendCooldownSecs', 'otpVerifyMaxAttempts', 'otpVerifyLockoutMins',
            'ipLimitLoginPerHour', 'ipLimitRegisterPerHour', 'ipLimitOtpSendPerHour', 'ipLimitOtpVerifyPerHour', 'ipLimitCheckEmailPerHour', 'ipLimitResetPasswordPerHour',
            'maxOtpPerEmailPerHour', 'globalDailyOtpLimit', 'activeSmtpIndex', 'maxListingsPerUser'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                (settings as any)[field] = body[field];
            }
        }

        // Validate auto-ban rules
        if (body.autoBanRules) {
            const rules = body.autoBanRules;
            if (!Array.isArray(rules)) {
                return NextResponse.json({ error: 'autoBanRules must be an array' }, { status: 400 });
            }
            for (const rule of rules) {
                if (!rule.reportThreshold || !rule.banDays || rule.reportThreshold < 1 || rule.banDays < 1) {
                    return NextResponse.json({ error: 'Each ban rule needs valid reportThreshold and banDays (≥1)' }, { status: 400 });
                }
            }
            // Sort by threshold ascending
            settings.autoBanRules = rules.sort((a: any, b: any) => a.reportThreshold - b.reportThreshold);
        }

        // Validate categories (must have at least 1)
        if (body.productCategories && (!Array.isArray(body.productCategories) || body.productCategories.length === 0)) {
            return NextResponse.json({ error: 'At least one product category is required' }, { status: 400 });
        }
        if (body.serviceCategories && (!Array.isArray(body.serviceCategories) || body.serviceCategories.length === 0)) {
            return NextResponse.json({ error: 'At least one service category is required' }, { status: 400 });
        }
        if (body.productConditions && (!Array.isArray(body.productConditions) || body.productConditions.length === 0)) {
            return NextResponse.json({ error: 'At least one product condition is required' }, { status: 400 });
        }

        await settings.save();
        return NextResponse.json({ settings, message: 'Settings updated successfully' }, { status: 200 });

    } catch (error) {
        console.error('Admin Settings PUT Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
