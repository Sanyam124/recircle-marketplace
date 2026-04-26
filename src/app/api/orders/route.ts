import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Service from '@/models/Service';
import User from '@/models/User';
import Review from '@/models/Review';
import { createNotification } from '@/lib/notifications';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        // --- ANTI-ORDER SPAM SHIELD ---
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(decoded.userId, 'order-create', 5, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'You are placing orders too quickly. Please wait a minute.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 60
                },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { productId, deliveryAddress, serviceId, appointmentDate } = body;

        await connectToDatabase();
        const Community = (await import('@/models/Community')).default;

        // --- SERVICE APPOINTMENT LOGIC (Now Free) ---
        if (serviceId) {
            const service = await Service.findById(serviceId).populate('provider');
            if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

            // --- Visibility & Maintenance Hardening for Services ---
            const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
            const isAdmin = currentUser?.role === 'admin';

            if (service.visibility === 'Community' && service.community) {
                const communityId = service.community.toString();
                const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === communityId);
                const isOwner = decoded.userId === service.provider._id.toString();
                if (!isMember && !isOwner && !isAdmin) {
                    return NextResponse.json({ error: 'This service is exclusive to campus community members.' }, { status: 403 });
                }
            }

            // Maintenance Check
            if (service.community && !isAdmin) {
                const comm = await Community.findById(service.community).select('isActive name');
                if (comm && !comm.isActive) {
                    return NextResponse.json({ 
                        error: `Marketplace activity in ${comm.name} is temporarily paused for maintenance. New bookings are disabled.` 
                    }, { status: 503 });
                }
            }

            const newOrder = await Order.create({
                buyer: decoded.userId,
                seller: service.provider._id,
                service: service._id,
                orderType: 'Service_Appointment',
                itemPrice: 0,
                totalAmount: 0,
                status: 'Scheduled',
                appointmentDate: appointmentDate || new Date(),
                deliveryAddress: 'Service Appointment',
            });

            // Notify Provider
            await createNotification({
                recipient: (service.provider as any)._id,
                sender: decoded.userId,
                type: 'SERVICE_REQUEST',
                message: `New service booking for "${service.title}"`,
                link: `/orders?tab=seller&orderId=${newOrder._id}`
            });

            return NextResponse.json({ success: true, orderId: newOrder._id, paymentMethod: 'free' }, { status: 201 });
        }

        // --- PRODUCT ORDER LOGIC (No Fees, Direct Interaction) ---
        if (!productId || !deliveryAddress) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const product = await Product.findOne({ _id: productId, status: 'Available' }).populate('seller');
        if (!product) {
            return NextResponse.json({ error: 'Product is no longer available' }, { status: 400 });
        }

        // --- Visibility & Maintenance Hardening for Products ---
        const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
        const isAdmin = currentUser?.role === 'admin';

        if (product.visibility === 'Community' && product.community) {
            const communityId = product.community.toString();
            const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === communityId);
            const isOwner = decoded.userId === product.seller._id.toString();
            if (!isMember && !isOwner && !isAdmin) {
                return NextResponse.json({ error: 'This listing is exclusive to campus community members.' }, { status: 403 });
            }
        }

        // Maintenance Check
        if (product.community && !isAdmin) {
            const comm = await Community.findById(product.community).select('isActive name');
            if (comm && !comm.isActive) {
                return NextResponse.json({ 
                    error: `Direct deals in ${comm.name} are temporarily paused for maintenance.` 
                }, { status: 503 });
            }
        }

        // Apply reservation now that checks are passed
        product.status = 'Reserved';
        await product.save();

        const order = await Order.create({
            buyer: decoded.userId,
            seller: product.seller,
            product: productId,
            itemPrice: product.price,
            totalAmount: product.price,
            deliveryAddress: deliveryAddress,
            status: 'Scheduled',
        });

        // Notify Seller
        await createNotification({
            recipient: (product.seller as any)._id,
            sender: decoded.userId,
            type: 'ORDER_PLACED',
            message: `Your product "${product.title}" has been reserved!`,
            link: `/orders?tab=seller&orderId=${order._id}`
        });

        return NextResponse.json({
            success: true,
            orderId: order._id,
            paymentMethod: 'direct'
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
        const requestedLimit = parseInt(searchParams.get('limit') || '15');
        const limit = Math.min(requestedLimit, 50);
        const skip = (page - 1) * limit;

        const query: any = {};

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
            .populate('seller', 'name username gender profilePicture')
            .populate('buyer', 'name username gender profilePicture')
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Mark orders as reviewed if the user has already left a review for this listing
        const ordersWithReviewStatus = await Promise.all(orders.map(async (o: any) => {
            const hasReview = await Review.exists({
                reviewer: decoded.userId,
                $or: [
                    ...(o.product ? [{ product: o.product._id || o.product }] : []),
                    ...(o.service ? [{ service: o.service._id || o.service }] : [])
                ]
            });
            return { ...o, isReviewed: !!hasReview };
        }));

        return NextResponse.json({
            orders: ordersWithReviewStatus,
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
export const revalidate = 0;
