import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';

import connectToDatabase from '@/lib/db';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Service from '@/models/Service';
import { verifyToken } from '@/lib/auth';

/**
 * GET History between two users
 * Handles item-specific context (product/service) and marks messages as read.
 */
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const recipientId = searchParams.get('userId');
        const productId = searchParams.get('productId');
        const serviceId = searchParams.get('serviceId');

        // ID Validation
        if (recipientId && !isValidObjectId(recipientId)) return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
        if (productId && !isValidObjectId(productId)) return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
        if (serviceId && !isValidObjectId(serviceId)) return NextResponse.json({ error: 'Invalid Service ID' }, { status: 400 });

        if (!recipientId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        const before = searchParams.get('before');
        const limit = parseInt(searchParams.get('limit') || '20');

        await connectToDatabase();

        // Mark context-specific messages as read
        const itemId = productId || serviceId;
        const itemType = productId ? 'product' : (serviceId ? 'service' : null);

        const readFilter: any = { sender: recipientId, recipient: decoded.userId, isRead: false };
        if (itemType) {
            readFilter[itemType] = itemId;
        } else {
            readFilter.product = { $exists: false };
            readFilter.service = { $exists: false };
        }
        await Message.updateMany(readFilter, { isRead: true });
        
        // Also clear the notification bell for this chat
        await Notification.deleteMany({
            recipient: decoded.userId,
            sender: recipientId,
            type: 'CHAT_MESSAGE'
        });

        // Build Query
        const query: any = {
            $or: [
                { sender: decoded.userId, recipient: recipientId },
                { recipient: decoded.userId, sender: recipientId }
            ],
            deletedBy: { $ne: decoded.userId }
        };

        if (itemType) {
            query[itemType] = itemId;
        } else {
            query.product = { $exists: false };
            query.service = { $exists: false };
        }

        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const total = await Message.countDocuments(query);
        const messages = await Message.find(query)
            .populate('product', 'title price images seller provider')
            .populate('service', 'title price images priceUnit seller provider')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        messages.reverse(); // Chronological order for UI

        // Resolve item-specific context for the header UI
        let lastContext = null;
        if (messages.length > 0) {
            const lastWithRef = [...messages].reverse().find(m => m.product || m.service);
            if (lastWithRef) {
                const itemId = lastWithRef.product?._id || lastWithRef.service?._id;
                const iType = lastWithRef.product ? 'product' : 'service';

                const order = await Order.findOne({
                    [iType]: itemId,
                    status: { $in: ['Paid', 'Scheduled', 'Completed', 'Dispute_Pending'] },
                    $or: [
                        { buyer: decoded.userId, seller: recipientId },
                        { buyer: recipientId, seller: decoded.userId }
                    ]
                }).select('buyer').lean();

                lastContext = {
                    type: iType,
                    data: { ...(lastWithRef.product || lastWithRef.service), buyerId: order ? order.buyer : null },
                    messageId: lastWithRef._id
                };
            }
        }

        const otherUser = await User.findById(recipientId).select('lastSeen showOnlineStatus name username profilePicture').lean();

        return NextResponse.json({
            messages,
            lastContext,
            pagination: { hasMore: total > messages.length },
            otherUser: otherUser ? { lastSeen: otherUser.lastSeen, showOnlineStatus: (otherUser as any).showOnlineStatus ?? true, name: (otherUser as any).name } : null,
        }, { status: 200 });

    } catch (error) {
        console.error('Chat GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST New Message
 * Includes anti-spam protection, blocking checks, and notification triggering.
 */
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { recipientId, content, productId, serviceId, offer, image } = await req.json();

        if (!recipientId || (!content && !image)) return NextResponse.json({ error: 'Missing recipient or content/image' }, { status: 400 });

        // Anti-Spam Protection
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(decoded.userId, 'chat-send', 60, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Sending too fast. Please slow down.', retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 10 },
                { status: 429 }
            );
        }

        if (recipientId && !isValidObjectId(recipientId)) return NextResponse.json({ error: 'Invalid Recipient ID' }, { status: 400 });
        if (content && content.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });

        let imageUrl = undefined;
        if (image) {
            if (typeof image !== 'string' || !image.startsWith('data:image')) {
                return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
            }
            // Backend size check: ~5MB base64 ≈ 6.9M chars
            if (image.length > 7 * 1024 * 1024) {
                return NextResponse.json({ error: 'Image too large. Max 5MB allowed.' }, { status: 400 });
            }
            // Stricter rate limit for image uploads: 10 per hour
            const imgRl = await checkRateLimit(decoded.userId, 'chat-image-upload', 10, 60 * 60 * 1000);
            if (!imgRl.success) {
                return NextResponse.json(
                    { error: 'Too many images sent. Max 10 per hour.', retryAfter: imgRl.resetTime ? Math.ceil((imgRl.resetTime.getTime() - Date.now()) / 1000) : 3600 },
                    { status: 429 }
                );
            }
            try {
                const { uploadToCloudinary } = await import('@/lib/cloudinary');
                imageUrl = await uploadToCloudinary(image, 'recircle/messages');
            } catch (error) {
                console.error('Image upload error:', error);
                return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
            }
        }

        await connectToDatabase();

        const [sender, receiver] = await Promise.all([
            User.findById(decoded.userId).select('name profilePicture status blockedUsers'),
            User.findById(recipientId).select('blockedUsers')
        ]);

        if (!sender || !receiver) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (sender.status === 'Banned') return NextResponse.json({ error: 'Account banned. Cannot send messages.' }, { status: 403 });

        // Privacy Checks
        const isBlockedBySender = sender.blockedUsers?.some((id: any) => id.toString() === recipientId.toString());
        const isBlockedByReceiver = receiver.blockedUsers?.some((id: any) => id.toString() === decoded.userId.toString());

        if (isBlockedBySender) return NextResponse.json({ error: 'You have blocked this user.' }, { status: 403 });
        if (isBlockedByReceiver) return NextResponse.json({ error: 'Cannot message this user.' }, { status: 403 });

        let message;
        try {
            message = await Message.create({
                sender: decoded.userId,
                recipient: recipientId,
                content: content || '',
                product: productId || undefined,
                service: serviceId || undefined,
                offer: offer || undefined,
                image: imageUrl
            });
        } catch (dbError) {
            if (imageUrl) {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await deleteFromCloudinary(imageUrl).catch(() => null);
            }
            throw dbError;
        }

        // Pusher Sync
        try {
            const { pusherServer } = await import('@/lib/pusherServer');
            const recipients = Array.from(new Set([recipientId.toString(), decoded.userId]));
            for (const rId of recipients) {
                await pusherServer.trigger(`private-user-${rId}`, 'new-message', message);
            }
        } catch (pusherErr) {
            console.error('Pusher error:', pusherErr);
        }

        // Trigger Notifications
        try {
            if (!offer) {
                const { createNotification } = await import('@/lib/notifications');
                const senderName = (sender as any).name || 'Someone';
                
                await createNotification({
                    recipient: recipientId,
                    sender: decoded.userId,
                    type: 'CHAT_MESSAGE',
                    message: content,
                    link: `/chat/${decoded.userId}${productId ? `?productId=${productId}` : (serviceId ? `?serviceId=${serviceId}` : '')}`,
                    metadata: { senderName, offer: false, itemId: productId || serviceId, itemType: productId ? 'product' : 'service' }
                });
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({ success: true, message }, { status: 201 });

    } catch (error) {
        console.error('Chat POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
