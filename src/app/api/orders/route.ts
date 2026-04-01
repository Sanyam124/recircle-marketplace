import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Service from '@/models/Service';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { productId, deliveryAddress, serviceId, appointmentDate } = body;

        // --- SERVICE APPOINTMENT LOGIC (Now Free) ---
        if (serviceId) {
            await connectToDatabase();

            const service = await Service.findById(serviceId).populate('provider');
            if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

            const user = await User.findById(decoded.userId);
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            const newOrder = await Order.create({
                buyer: user._id,
                seller: service.provider._id,
                service: service._id,
                orderType: 'Service_Appointment',
                itemPrice: 0,
                totalAmount: 0,
                status: 'Paid',
                appointmentDate: appointmentDate || new Date(),
                deliveryAddress: 'Service Appointment',
            });

            // Notify Provider
            await Notification.create({
                recipient: service.provider._id,
                sender: user._id,
                type: 'SERVICE_REQUEST',
                message: `New service booking for "${service.title}" from ${user.username || user.name}`,
                link: '/profile'
            });

            return NextResponse.json({ success: true, orderId: newOrder._id, paymentMethod: 'free' }, { status: 201 });
        }

        // --- PRODUCT ORDER LOGIC (No Fees, Direct Interaction) ---
        if (!productId || !deliveryAddress) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const product = await Product.findOneAndUpdate(
            { _id: productId, status: 'Available' },
            { status: 'Reserved' },
            { new: true }
        ).populate('seller');

        if (!product) {
            return NextResponse.json({ error: 'Product is no longer available' }, { status: 400 });
        }

        const TOTAL_AMOUNT = product.price;

        const order = await Order.create({
            buyer: decoded.userId,
            seller: product.seller,
            product: productId,
            itemPrice: product.price,
            totalAmount: TOTAL_AMOUNT,
            deliveryAddress: deliveryAddress,
            status: 'Paid', // Assuming direct coordination now
        });
        // Notify Seller
        await Notification.create({
            recipient: product.seller._id,
            sender: user._id,
            type: 'ORDER_PLACED',
            message: `Your product "${product.title}" has been reserved by ${user.username || user.name}!`,
            link: '/profile'
        });

        return NextResponse.json({
            success: true,
            orderId: order._id,
            paymentMethod: 'direct',
            amount: 0
        }, { status: 201 });

    } catch (error: any) {
        console.error('Order Creation Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role');
        const productId = searchParams.get('productId');
        const serviceId = searchParams.get('serviceId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '15');
        const skip = (page - 1) * limit;

        let query: any = {
            status: { $ne: 'Pending_Payment' }
        };

        // If specific item is requested, add to query
        if (productId) query.product = productId;
        if (serviceId) query.service = serviceId;

        if (role === 'seller') {
            query.seller = decoded.userId;
        } else if (role === 'buyer') {
            query.buyer = decoded.userId;
        } else {
            // Default: check both if role is not specified (useful for chat context)
            query.$or = [
                { buyer: decoded.userId },
                { seller: decoded.userId }
            ];
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .populate('product')
            .populate('service', 'title category price duration')
            .populate('seller', 'name username gender')
            .populate('buyer', 'name username gender')
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return NextResponse.json({
            orders,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Order Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
