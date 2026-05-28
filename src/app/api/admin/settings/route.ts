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
            'maxProductNameChars', 'maxProductDescriptionChars', 'maxServiceNameChars', 'maxServiceDescriptionChars', 'maxMessageChars', 'maxUserNameChars', 'maxUserBioChars', 'maxCommunityNameChars', 'maxCommunityDescriptionChars',
            // Security & Rate Limits
            'loginMaxAttempts', 'loginLockoutMins', 'otpSendCooldownSecs', 'otpVerifyMaxAttempts', 'otpVerifyLockoutMins',
            'ipLimitLoginPerHour', 'ipLimitRegisterPerHour', 'ipLimitOtpSendPerHour', 'ipLimitOtpVerifyPerHour', 'ipLimitCheckEmailPerHour', 'ipLimitResetPasswordPerHour',
            'maxOtpPerEmailPerHour', 'globalDailyOtpLimit', 'activeSmtpIndex', 'maxListingsPerUser'
        ];

        const newlyUploadedUrls: string[] = [];
        const removedImageUrls: string[] = [];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                // Special handling for image arrays (Avatars and Banners)
                if (field === 'defaultAvatars' || field === 'defaultBanners') {
                    const currentList = (settings as any)[field] as string[] || [];
                    const newList = body[field] as string[];
                    
                    if (!Array.isArray(newList)) continue;
                    
                    const { uploadToCloudinary } = await import('@/lib/cloudinary');
                    const folder = field === 'defaultAvatars' ? 'recircle/defaults/avatars' : 'recircle/defaults/banners';

                    // 1. Collect removed images (do not delete yet!)
                    const removed = currentList.filter(url => !newList.includes(url) && url.includes('cloudinary.com'));
                    removedImageUrls.push(...removed);

                    // 2. Upload any new base64 images
                    const processedList = await Promise.all(newList.map(async (item) => {
                        if (item.startsWith('data:image')) {
                            try {
                                const url = await uploadToCloudinary(item, folder);
                                newlyUploadedUrls.push(url);
                                return url;
                            }
                            catch (e) {
                                console.error('Failed to upload image', e);
                                return null;
                            }
                        }
                        return item;
                    }));

                    (settings as any)[field] = processedList.filter(Boolean); // Filter out failed uploads
                } else {
                    (settings as any)[field] = body[field];
                }
            }
        }

        let savedSuccess = false;
        try {
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
            savedSuccess = true;
        } finally {
            if (!savedSuccess) {
                // Rollback newly uploaded images
                if (newlyUploadedUrls.length > 0) {
                    const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                    for (const url of newlyUploadedUrls) {
                        await deleteFromCloudinary(url).catch(() => null);
                    }
                }
            } else {
                // Deletions of removed images ONLY after save succeeded
                if (removedImageUrls.length > 0) {
                    const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                    for (const url of removedImageUrls) {
                        await deleteFromCloudinary(url).catch(() => null);
                    }
                }
            }
        }
        return NextResponse.json({ settings, message: 'Settings updated successfully' }, { status: 200 });

    } catch (error) {
        console.error('Admin Settings PUT Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
