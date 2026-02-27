import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { itemId, itemType, recipientId } = await req.json();

        if (!itemId || !itemType || !recipientId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        await connectToDatabase();

        let item;
        if (itemType === 'product') {
            item = await Product.findById(itemId);
            if (!item) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            if (item.seller.toString() !== decoded.userId) {
                return NextResponse.json({ error: 'Unauthorized: You are not the seller' }, { status: 403 });
            }
            item.status = 'Sold';
            await item.save();
        } else {
            item = await Service.findById(itemId);
            if (!item) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
            if (item.provider.toString() !== decoded.userId) {
                return NextResponse.json({ error: 'Unauthorized: You are not the provider' }, { status: 403 });
            }
            // item.status = 'Inactive'; // Services are continuous, don't mark as inactive
            await item.save();
        }

        // Create Order Document for Buyer (Purchases History)
        await Order.create({
            buyer: recipientId,
            seller: decoded.userId,
            product: itemType === 'product' ? item._id : undefined,
            service: itemType === 'service' ? item._id : undefined,
            orderType: itemType === 'product' ? 'Product' : 'Service_Appointment',
            itemPrice: item.price,
            totalAmount: item.price,
            status: 'Completed',
        });

        // Send System Message to Chat
        const systemMsg = await Message.create({
            sender: decoded.userId,
            recipient: recipientId,
            content: itemType === 'product'
                ? `🤝 DEAL CLOSED! I've marked "${item.title}" as Sold. Thanks for the coordination!`
                : `🤝 ENROLLED! I've added you to the service "${item.title}". You can now access it from your profile!`,
            product: itemType === 'product' ? item._id : undefined,
            service: itemType === 'service' ? item._id : undefined
        });

        // Notify Recipient
        const sender = await User.findById(decoded.userId).select('name');
        await Notification.create({
            recipient: recipientId,
            sender: decoded.userId,
            type: 'ORDER_UPDATE',
            message: itemType === 'product'
                ? `${sender?.name || 'Seller'} marked "${item.title}" as sold to you!`
                : `${sender?.name || 'Provider'} added you to "${item.title}"!`,
            link: `/chat/${decoded.userId}`
        });

        return NextResponse.json({ success: true, message: systemMsg }, { status: 200 });

    } catch (error: any) {
        console.error('Deal Closure Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
