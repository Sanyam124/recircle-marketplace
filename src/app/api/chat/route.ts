import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Service from '@/models/Service';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

// GET history between two users
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
        const before = searchParams.get('before'); // Fetch messages before this timestamp
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!recipientId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        await connectToDatabase();

        // Mark messages as read for THIS context specifically
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

        const query: any = {
            $or: [
                { sender: decoded.userId, recipient: recipientId },
                { sender: recipientId, recipient: decoded.userId }
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
            .sort({ createdAt: -1 }) // Get newest first for limit
            .limit(limit)
            .lean();

        // Reverse to maintain chronological order in UI
        messages.reverse();

        const hasMore = total > messages.length;

        // Find last context if not provided
        let lastContext = null;
        if (messages.length > 0) {
            const lastWithRef = [...messages].reverse().find(m => m.product || m.service);
            if (lastWithRef) {
                const itemId = lastWithRef.product?._id || lastWithRef.service?._id;
                const itemType = lastWithRef.product ? 'product' : 'service';

                // Fetch buyerId for this specific context
                const order = await Order.findOne({
                    [itemType]: itemId,
                    status: { $in: ['Paid', 'Scheduled', 'Completed', 'Dispute_Pending'] },
                    // Ensure it's between these two users
                    $or: [
                        { buyer: decoded.userId, seller: recipientId },
                        { buyer: recipientId, seller: decoded.userId }
                    ]
                }).select('buyer').lean();

                lastContext = {
                    type: itemType,
                    data: { ...(lastWithRef.product || lastWithRef.service), buyerId: order ? order.buyer : null },
                    messageId: lastWithRef._id
                };
            }
        }

        // Fetch other user's lastSeen for online status
        const otherUser = await User.findById(recipientId).select('lastSeen name username profilePicture').lean();

        return NextResponse.json({
            messages,
            lastContext,
            pagination: { hasMore },
            otherUser: otherUser ? { lastSeen: otherUser.lastSeen, name: (otherUser as any).name } : null,
        }, { status: 200 });


    } catch (error) {
        console.error('Chat GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST new message
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { recipientId, content, productId, serviceId, offer } = await req.json();

        if (!recipientId || !content) {
            return NextResponse.json({ error: 'Missing recipient or content' }, { status: 400 });
        }

        if (content.length > 2000) {
            return NextResponse.json({ error: 'Message must be 2000 characters or less' }, { status: 400 });
        }

        if (!productId && !serviceId && !content) {
            return NextResponse.json({ error: 'Chats must have content or be linked to an item' }, { status: 400 });
        }

        await connectToDatabase();

        // Check if either user has blocked the other
        const [sender, receiver] = await Promise.all([
            User.findById(decoded.userId).select('name profilePicture blockedUsers'),
            User.findById(recipientId).select('blockedUsers')
        ]);

        if (!sender || !receiver) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isBlockedBySender = sender.blockedUsers?.some((id: any) => id.toString() === recipientId.toString());
        const isBlockedByReceiver = receiver.blockedUsers?.some((id: any) => id.toString() === decoded.userId.toString());

        if (isBlockedBySender) {
            return NextResponse.json({ error: 'You have blocked this user. Unblock them to send a message.' }, { status: 403 });
        }
        if (isBlockedByReceiver) {
            return NextResponse.json({ error: 'You cannot message this user.' }, { status: 403 });
        }

        const message = await Message.create({
            sender: decoded.userId,
            recipient: recipientId,
            content,
            product: productId || undefined,
            service: serviceId || undefined,
            offer: offer || undefined
        });

        // 6. [UX FIX]: Trigger Pusher Sync for the deal closed message (Deduplicated)
        try {
            const { pusherServer } = await import('@/lib/pusherServer');
            const recipients = new Set([recipientId.toString(), decoded.userId]);
            for (const rId of recipients) {
                await pusherServer.trigger(`user-${rId}`, 'new-message', message);
            }
        } catch (pusherErr) {
            console.error('Pusher sync error in deal closure:', pusherErr);
        }

        // Trigger Push Notification for offline/background users
        try {
            const { sendPushNotification } = await import('../../../lib/pushNotifications');
            const senderName = (sender as any).name || 'Someone';
            
            let notificationTitle = `New message from ${senderName}`;
            let notificationBody = content;

            // If it's an offer, provide context in the notification itself
            if (offer) {
                let itemName = 'your listing';
                if (productId) {
                    const item = await Product.findById(productId).select('title');
                    if (item) itemName = item.title;
                } else if (serviceId) {
                    const item = await Service.findById(serviceId).select('title');
                    if (item) itemName = item.title;
                }
                
                const isRental = offer.offerType === 'Rent';
                
                if (isRental) {
                    notificationTitle = `Rental Offer: ₹${offer.price}/${offer.rentUnit} from ${senderName}`;
                    notificationBody = `Wants to rent "${itemName}" for ${offer.rentDuration} ${offer.rentUnit}(s)`;
                    if (content && !content.startsWith('Sent an')) {
                        notificationBody += `. Message: "${content}"`;
                    }
                } else {
                    notificationTitle = `${productId ? 'Buy Offer' : 'Service Offer'}: ₹${offer.price} from ${senderName}`;
                    const isPlaceholder = content === 'Sent an Offer' || content === 'Sent an Appointment Request' || content?.startsWith('Sent an');
                    notificationBody = `On "${itemName}"${content && !isPlaceholder ? `: ${content}` : ''}`;
                }
            }

            await sendPushNotification(recipientId, {
                title: notificationTitle,
                body: notificationBody,
                icon: (sender as any).profilePicture || '/icon-192x192.png',
                data: {
                    url: `/chat/${decoded.userId}${productId ? `?productId=${productId}` : (serviceId ? `?serviceId=${serviceId}` : '')}`
                }
            }, (offer && typeof offer === 'object') ? 'offer' : 'message');
        } catch (pushErr) {
            console.error('Push notification error:', pushErr);
        }

        return NextResponse.json({ success: true, message }, { status: 201 });

    } catch (error) {
        console.error('Chat POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
