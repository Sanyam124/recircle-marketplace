import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { itemId, itemType, recipientId, verificationCode } = await req.json();

        if (!itemId || !itemType || !recipientId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Find the existing scheduled order that needs to be 'Completed'
        const order = await Order.findOne({
            seller: decoded.userId,
            buyer: recipientId,
            ...(itemType === 'product' ? { product: itemId } : { service: itemId }),
            status: 'Scheduled'
        });

        if (!order) {
            return NextResponse.json({ error: 'No active scheduled order found for this deal.' }, { status: 404 });
        }

        // 2. [MENTAL/LOGICAL FIX]: Security verification of handoff code
        if (order && order.verificationCode !== verificationCode) {
            return NextResponse.json({ error: 'Invalid verification code. Please ask the buyer for their secret code.' }, { status: 403 });
        }

        let item;
        const isRental = order.transactionType === 'Rent';
        
        if (itemType === 'product') {
            item = await Product.findById(itemId);
            if (!item) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            if (item.seller.toString() !== decoded.userId) {
                return NextResponse.json({ error: 'Unauthorized: You are not the seller' }, { status: 403 });
            }
            
            // [BUSINESS LOGIC]: Distinguish between permanent sale and temporary rental
            item.status = isRental ? 'Rented' : 'Sold';
            await item.save();

            // 3. [UX FIX]: Automatically decline all OTHER pending offers for this product.
            const Offer = (await import('@/models/Offer')).default;
            await Offer.updateMany(
                { product: itemId, status: 'Pending' },
                { $set: { status: 'Declined' } }
            );
        } else {
            item = await Service.findById(itemId);
            if (!item) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
            if (item.provider.toString() !== decoded.userId) {
                return NextResponse.json({ error: 'Unauthorized: You are not the provider' }, { status: 403 });
            }
            await item.save();
        }

        // 4. Update the existing Order Document (Purchases History)
        order.status = 'Completed';
        await order.save();

        // 5. Send System Message to Chat
        const closureVerb = isRental ? 'Rented Out' : 'Sold';
        const systemMsg = await Message.create({
            sender: decoded.userId,
            recipient: recipientId,
            content: itemType === 'product'
                ? `🤝 DEAL CLOSED! I've marked "${item.title}" as ${closureVerb}. Thanks for the coordination!`
                : `🤝 SERVICE COMPLETED! I've marked "${item.title}" as finished. Glad to help!`,
            product: itemType === 'product' ? item._id : undefined,
            service: itemType === 'service' ? item._id : undefined
        });

        // 6. [UX FIX]: Trigger Pusher Sync for the deal closed message (Deduplicated)
        try {
            const { pusherServer } = await import('@/lib/pusherServer');
            const recipients = new Set([recipientId.toString(), decoded.userId]);
            for (const rId of recipients) {
                await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
            }
        } catch (pusherErr) {
            console.error('Pusher sync error in deal closure:', pusherErr);
        }

        // Notify Recipient
        const sender = await User.findById(decoded.userId).select('name');
        await createNotification({
            recipient: recipientId,
            sender: decoded.userId,
            type: 'ORDER_UPDATE',
            message: itemType === 'product'
                ? `${sender?.name || 'Seller'} marked "${item.title}" as ${closureVerb.toLowerCase()} to you!`
                : `${sender?.name || 'Provider'} completed the service "${item.title}"!`,
            link: `/chat/${decoded.userId}`
        });

        return NextResponse.json({ success: true, message: systemMsg }, { status: 200 });

    } catch (error: any) {
        console.error('Deal Closure Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
