import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import Notification from '@/models/Notification';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token) as { userId: string };
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfig = await SiteSettings.getSingleton();
        const maxChars = siteConfig.maxReportOtherChars || 1000;
        // --- ANTI-REPORT SPAM SHIELD ---
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(decoded.userId, 'report-create', 5, 15 * 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'You have submitted too many reports recently. Please try again later.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 900
                },
                { status: 429 }
            );
        }

        const { targetUserId, itemType, itemId, reason } = await req.json();

        if (!targetUserId || !reason || typeof reason !== 'string' || reason.trim().length === 0 || reason.length > maxChars || !['product', 'service', 'none'].includes(itemType)) {
            return NextResponse.json({ error: `Invalid input. Reason must be between 1 and ${maxChars} characters.` }, { status: 400 });
        }

        if (!isValidObjectId(targetUserId) || (itemId && !isValidObjectId(itemId))) {
            return NextResponse.json({ error: 'Invalid IDs provided' }, { status: 400 });
        }

        const query: any = { 
            reporter: new Types.ObjectId(decoded.userId), 
            targetUser: new Types.ObjectId(targetUserId)
        };
        
        if (itemType !== 'none' && itemId) {
            query.itemId = new Types.ObjectId(itemId);
            query.itemType = itemType;
        } else {
            // General user reports
            query.itemType = 'none';
        }

        // Only block if a report is currently 'Pending'. 
        query.status = 'Pending';

        const existing = await Report.findOne(query);
        if (existing) {
            return NextResponse.json({ error: 'You already have an active pending report for this.' }, { status: 409 });
        }

        await Report.create({
            reporter: decoded.userId,
            targetUser: targetUserId,
            itemType,
            itemId: itemType !== 'none' ? itemId : undefined,
            reason
        });

        // AUTO-BAN LOGIC — uses dynamic settings from admin panel

        if (siteConfig.autoBanEnabled && siteConfig.autoBanRules.length > 0) {
            const uniqueReporters = await Report.distinct('reporter', { 
                targetUser: targetUserId, 
                status: { $in: ['Pending', 'Reviewed'] } 
            });
            const uniqueReportCount = uniqueReporters.length;

            // --- [NEW] AUTO-REMOVE LISTING LOGIC ---
            if (itemType !== 'none' && itemId) {
                const threshold = siteConfig.autoRemoveThreshold || 5;
                const uniqueItemReporters = await Report.distinct('reporter', {
                    itemId: new Types.ObjectId(itemId),
                    status: { $in: ['Pending', 'Reviewed'] }
                });
                
                if (uniqueItemReporters.length >= threshold) {
                    const Product = (await import('@/models/Product')).default;
                    const Service = (await import('@/models/Service')).default;
                    const User = (await import('@/models/User')).default;
                    const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                    
                    let item: any = null;
                    if (itemType === 'product') {
                        item = await Product.findById(itemId);
                    } else if (itemType === 'service') {
                        item = await Service.findById(itemId);
                    }

                    if (item) {
                        // 1. Cleanup Images (Cloudinary)
                        if (item.images && item.images.length > 0) {
                            for (const imgUrl of item.images) {
                                await deleteFromCloudinary(imgUrl);
                            }
                        }

                        // 2. Remove from ALL User Wishlists
                        await User.updateMany(
                            { }, 
                            { $pull: { wishlist: itemId, wishlistedServices: itemId } }
                        );

                        // 3. Archive all reports for this item to preserve the seller's lifetime report count
                        await Report.updateMany(
                            { itemId: new Types.ObjectId(itemId) },
                            { $set: { status: 'Reviewed' } }
                        );

                        // 4. Purge all offers for this item
                        const Offer = (await import('@/models/Offer')).default;
                        await Offer.deleteMany({
                            $or: [
                                { product: new Types.ObjectId(itemId) },
                                { service: new Types.ObjectId(itemId) }
                            ]
                        });

                        // 5. Notify the User (In-app and Push)
                        const { createNotification } = await import('@/lib/notifications');
                        const ownerId = item.seller || item.provider;
                        if (ownerId) {
                            await createNotification({
                                recipient: ownerId.toString(),
                                type: 'ADMIN_ALERT',
                                message: `Your ${itemType} "${item.title}" was automatically removed because it reached the maximum community report threshold. Please ensure your future listings follow our community guidelines.`,
                                link: '/profile/' + ownerId.toString()
                            });
                        }

                        // 6. Final Deletion
                        if (itemType === 'product') await Product.findByIdAndDelete(itemId);
                        else await Service.findByIdAndDelete(itemId);

                        console.log(`[Auto-Remove] ${itemType} ${itemId} purged from DB & Storage due to ${uniqueItemReporters.length} community reports.`);
                    }
                }
            }
            // ----------------------------------------

            // Find matching ban rule (rules are sorted ascending by threshold)
            let banDays = 0;
            for (const rule of [...siteConfig.autoBanRules].reverse()) {
                if (uniqueReportCount >= rule.reportThreshold) {
                    banDays = rule.banDays;
                    break;
                }
            }

            if (banDays > 0) {
                const until = new Date();
                until.setDate(until.getDate() + banDays);
                const userToBan = await User.findById(targetUserId);
                
                if (userToBan && userToBan.status !== 'Banned') {
                    userToBan.status = 'Banned';
                    userToBan.bannedUntil = until;
                    await userToBan.save();

                    // Notify via Email (if enabled)
                    if (siteConfig.banEmailEnabled) {
                        try {
                            const { sendBanNotification } = await import('@/lib/mailer');
                            await sendBanNotification({
                                to: userToBan.email,
                                userName: userToBan.name,
                                reason: 'Multiple community reports for violating marketplace guidelines.',
                                banDays,
                                banExpiry: until
                            });
                        } catch (emailErr) {
                            console.error('Auto-Ban Email Error:', emailErr);
                        }
                    }

                    // Reset active reports counter so they don't get trapped in a re-ban loop when they return
                    await Report.updateMany(
                        { targetUser: targetUserId, status: 'Pending' },
                        { $set: { status: 'Reviewed' } }
                    );
                    
                    console.log(`[Auto-Ban] User ${userToBan.username} banned for ${banDays} days (${uniqueReportCount} unique reports). All active reports resolved.`);
                }
            }
        }

        return NextResponse.json({ message: 'Report submitted for review.' }, { status: 201 });
    } catch (err) {
        console.error('Report error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
