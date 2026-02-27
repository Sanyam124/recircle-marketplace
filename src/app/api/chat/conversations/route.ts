import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import Offer from '@/models/Offer';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '15');
        const skip = (page - 1) * limit;

        await connectToDatabase();
        const userId = decoded.userId;

        const objectIdUserId = new mongoose.Types.ObjectId(userId);

        const conversationAggPipeline: any[] = [
            {
                $match: {
                    $or: [
                        { sender: objectIdUserId },
                        { recipient: objectIdUserId }
                    ],
                    deletedBy: { $ne: objectIdUserId } // Hide messages deleted by this user
                }
            },
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $group: {
                    _id: {
                        otherUserId: {
                            $cond: [
                                { $eq: ["$sender", objectIdUserId] },
                                "$recipient",
                                "$sender"
                            ]
                        },
                        productId: "$product",
                        serviceId: "$service"
                    },
                    lastMessageId: { $first: "$_id" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$recipient", objectIdUserId] },
                                        { $eq: ["$isRead", false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "messages",
                    localField: "lastMessageId",
                    foreignField: "_id",
                    as: "lastMessage"
                }
            },
            { $unwind: "$lastMessage" },
            { $sort: { "lastMessage.createdAt": -1, "lastMessage._id": -1 } }
        ];

        // We use facet to get total count and paginated items in one query
        const result = await Message.aggregate([
            ...conversationAggPipeline,
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ]);

        const totalConversations = result[0].metadata[0]?.total || 0;
        const totalPages = Math.ceil(totalConversations / limit);
        const paginatedData = result[0].data;

        const userIds = paginatedData.map((d: any) => d._id.otherUserId);

        const usersList = await User.find({ _id: { $in: userIds } })
            .select('name username profilePicture gender');

        // Need to grab basic product and service info for the sidebar
        const productIds = paginatedData.map((d: any) => d._id.productId).filter(Boolean);
        const serviceIds = paginatedData.map((d: any) => d._id.serviceId).filter(Boolean);

        const [productsList, servicesList, ordersList] = await Promise.all([
            mongoose.models.Product
                ? mongoose.model('Product').find({ _id: { $in: productIds } }).select('title images price seller status').lean()
                : Promise.resolve([]),
            mongoose.models.Service
                ? mongoose.model('Service').find({ _id: { $in: serviceIds } }).select('title images price provider').lean()
                : Promise.resolve([]),
            mongoose.models.Order
                ? mongoose.model('Order').find({
                    $or: [
                        { product: { $in: productIds } },
                        { service: { $in: serviceIds } }
                    ],
                    status: { $in: ['Paid', 'Scheduled', 'Completed', 'Cancelled', 'Dispute_Pending'] }
                }).select('product service buyer status updatedAt').sort({ updatedAt: -1 }).lean()
                : Promise.resolve([])
        ]);

        // Map users and item context back to the paginatedData
        const conversations = await Promise.all(paginatedData.map(async (d: any) => {
            const user = usersList.find(u => u._id.toString() === d._id.otherUserId.toString());
            const product = d._id.productId ? productsList.find((p: any) => p._id.toString() === d._id.productId.toString()) : null;
            const service = d._id.serviceId ? servicesList.find((s: any) => s._id.toString() === d._id.serviceId.toString()) : null;

            // Attach buyerId and orderStatus if sold or active booking
            let buyerId = null;
            let orderStatus = null;
            let order = null;

            if (product && product.status === 'Sold') {
                order = ordersList.find((o: any) => String(o.product) === String(product._id));
                if (order) {
                    buyerId = order.buyer;
                    orderStatus = order.status;
                }
            } else if (service) {
                // For services, find the latest order for this service between these two specific users
                order = ordersList.find((o: any) =>
                    String(o.service) === String(service._id) &&
                    (String(o.buyer) === objectIdUserId.toString() || String(o.buyer) === d._id.otherUserId.toString())
                );
                if (order) {
                    buyerId = order.buyer;
                    orderStatus = order.status;
                }
            }

            // Enrichment: Check for LATEST offer in this specific context
            let latestOffer = null;
            if (product) {
                latestOffer = await Offer.findOne({
                    product: product._id,
                    $or: [
                        { buyer: objectIdUserId, seller: d._id.otherUserId },
                        { buyer: d._id.otherUserId, seller: objectIdUserId }
                    ]
                }).select('offeredPrice status updatedAt').sort({ updatedAt: -1 });
            } else if (service) {
                latestOffer = await Offer.findOne({
                    service: service._id,
                    $or: [
                        { buyer: objectIdUserId, seller: d._id.otherUserId },
                        { buyer: d._id.otherUserId, seller: objectIdUserId }
                    ]
                }).select('offeredPrice status updatedAt').sort({ updatedAt: -1 });
            }

            return {
                user,
                product,
                service,
                lastMessage: d.lastMessage,
                unreadCount: d.unreadCount,
                latestOffer,
                buyerId, // top level for easier access
                orderStatus,
                orderUpdatedAt: order?.updatedAt || null
            };
        }));

        // Filter out general user-to-user legacy chats without an item
        const finalConversations = conversations.filter((c: any) => c.user && (c.product || c.service));

        return NextResponse.json({
            conversations: finalConversations,
            pagination: {
                currentPage: page,
                totalPages,
                totalConversations,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Conversations GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const otherUserId = searchParams.get('otherUserId');
        const productId = searchParams.get('productId');
        const serviceId = searchParams.get('serviceId');

        if (!otherUserId || (!productId && !serviceId)) {
            return NextResponse.json({ error: 'Target user ID and item ID are required to isolate the thread' }, { status: 400 });
        }

        await connectToDatabase();
        const userId = decoded.userId;

        const objectIdUserId = new mongoose.Types.ObjectId(userId);
        const objectIdOtherUser = new mongoose.Types.ObjectId(otherUserId);

        const baseMatch = {
            $or: [
                { sender: objectIdUserId, recipient: objectIdOtherUser },
                { sender: objectIdOtherUser, recipient: objectIdUserId }
            ],
            ...(productId ? { product: new mongoose.Types.ObjectId(productId) } : { service: new mongoose.Types.ObjectId(serviceId!) })
        };

        // Add the current user's ID to the deletedBy array for all matching messages
        await Message.updateMany(
            baseMatch,
            { $addToSet: { deletedBy: objectIdUserId } }
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Conversations DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
