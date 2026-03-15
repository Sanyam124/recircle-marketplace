import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import Order from '@/models/Order';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
        }
        const { searchParams } = new URL(req.url);

        const limit = parseInt(searchParams.get('limit') || '8');
        const boughtLimit = parseInt(searchParams.get('boughtLimit') || '6');
        const productPage = parseInt(searchParams.get('productPage') || '1');
        const servicePage = parseInt(searchParams.get('servicePage') || '1');
        const allPage = parseInt(searchParams.get('allPage') || '1');
        const boughtProductPage = parseInt(searchParams.get('boughtProductPage') || '1');
        const boughtServicePage = parseInt(searchParams.get('boughtServicePage') || '1');

        const productSkip = (productPage - 1) * limit;
        const serviceSkip = (servicePage - 1) * limit;
        const allSkip = (allPage - 1) * limit;
        const boughtProductSkip = (boughtProductPage - 1) * boughtLimit;
        const boughtServiceSkip = (boughtServicePage - 1) * boughtLimit;

        const user = await User.findById(id).select('name username email profilePicture gender createdAt role bio isVerified allowEmailContact authProvider isPhoneVerified phone allowPhoneContact address isOnVacation blockedUsers');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if the viewer is the owner
        let isOwner = false;
        let currentUserId = null;
        try {
            const { verifyToken } = await import('@/lib/auth');
            const token = req.cookies.get('token')?.value;
            if (token) {
                const decoded = verifyToken(token) as any;
                if (decoded && decoded.userId === id.toString()) isOwner = true;
                if (decoded && decoded.userId) currentUserId = decoded.userId;
            }
        } catch { }

        // Block access if the viewer is blocked by this user
        if (!isOwner && currentUserId) {
             const isBlockedByTarget = user.blockedUsers?.some((blockedId: any) => blockedId.toString() === currentUserId.toString());
             if (isBlockedByTarget) {
                 return NextResponse.json({ error: 'You are blocked from viewing this profile.' }, { status: 403 });
             }
        }

        // IDs for Aggregation (Must be ObjectIds, aggregate doesn't auto-cast strings)
        const objectId = new mongoose.Types.ObjectId(id);

        // Products: public shows only Available; owner sees all
        const [totalProductsAvailable, totalProductsSold] = await Promise.all([
            Product.countDocuments({ seller: objectId, status: 'Available' }),
            Product.countDocuments({ seller: objectId, status: { $ne: 'Available' } }),
        ]);
        const totalProducts = totalProductsAvailable + totalProductsSold;
        const productQuery = isOwner
            ? { seller: objectId }
            : (user.isOnVacation ? { _id: null } : { seller: objectId, status: 'Available' });

        const products = await Product.find(productQuery)
            .sort({ createdAt: -1 })
            .skip(productSkip)
            .limit(limit);

        // Services: public shows only Active; owner sees all
        const [totalServicesActive, totalServicesInactive, totalEnrollments] = await Promise.all([
            Service.countDocuments({ provider: objectId, status: 'Active' }),
            Service.countDocuments({ provider: objectId, status: { $ne: 'Active' } }),
            Order.countDocuments({ seller: objectId, orderType: 'Service_Appointment' }),
        ]);
        const totalServices = totalServicesActive + totalServicesInactive;
        const serviceQuery = isOwner
            ? { provider: objectId }
            : (user.isOnVacation ? { _id: null } : { provider: objectId, status: 'Active' });

        const services = await Service.find(serviceQuery)
            .sort({ createdAt: -1 })
            .skip(serviceSkip)
            .limit(limit);

        // Efficient Unified "All" View using Aggregation
        const allItemsPipeline: any[] = [
            { $match: productQuery },
            { $addFields: { type: 'product' } },
            {
                $unionWith: {
                    coll: 'services',
                    pipeline: [
                        { $match: serviceQuery },
                        { $addFields: { type: 'service', seller: '$provider' } }
                    ]
                }
            },
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $skip: allSkip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'seller', // Covers both seller and provider due to $unionWith normalize
                                foreignField: '_id',
                                as: 'ownerObj'
                            }
                        },
                        { $unwind: { path: '$ownerObj', preserveNullAndEmptyArrays: true } },
                        {
                            $addFields: {
                                seller: { $ifNull: ['$ownerObj', { _id: objectId, name: user.name }] },
                                provider: { $ifNull: ['$ownerObj', { _id: objectId, name: user.name }] }
                            }
                        }
                    ]
                }
            }
        ];

        const allItemsRes = await Product.aggregate(allItemsPipeline);
        const totalAll = allItemsRes[0]?.metadata[0]?.total || 0;
        const allItems = allItemsRes[0]?.data || [];

        // Efficient Reviews Aggregation (Resolve N+1 potential)
        const reviewStats = await Review.aggregate([
            { $match: { target: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: '$target',
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        const rating = reviewStats[0]?.averageRating || 0;
        const totalReviews = reviewStats[0]?.totalReviews || 0;

        // Purchases — only for owner, split by product vs service
        let boughtProducts: any[] = [];
        let boughtServices: any[] = [];
        let totalBoughtProducts = 0;
        let totalBoughtServices = 0;
        if (isOwner) {
            [totalBoughtProducts, totalBoughtServices] = await Promise.all([
                Order.countDocuments({ buyer: id, product: { $exists: true, $ne: null } }),
                Order.countDocuments({ buyer: id, service: { $exists: true, $ne: null } }),
            ]);
            [boughtProducts, boughtServices] = await Promise.all([
                Order.find({ buyer: id, product: { $exists: true, $ne: null } })
                    .populate('product', 'title images price')
                    .populate('seller', 'name username')
                    .sort({ createdAt: -1 })
                    .skip(boughtProductSkip)
                    .limit(boughtLimit),
                Order.find({ buyer: id, service: { $exists: true, $ne: null } })
                    .populate('service', 'title images price priceUnit')
                    .populate('seller', 'name username')
                    .sort({ createdAt: -1 })
                    .skip(boughtServiceSkip)
                    .limit(boughtLimit),
            ]);
        }

        return NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                gender: user.gender,
                bio: user.bio,
                isVerified: user.isVerified,
                isPhoneVerified: user.isPhoneVerified,
                authProvider: user.authProvider,
                phone: user.phone,
                allowPhoneContact: user.allowPhoneContact,
                joinedAt: user.createdAt,
                role: user.role,
                rating: rating.toFixed(1),
                reviewCount: totalReviews,
                allowEmailContact: user.allowEmailContact,
                address: user.address,
                isOnVacation: user.isOnVacation
            },
            isOwner,
            allItems,
            products,
            services,
            boughtProducts,
            boughtServices,
            pagination: {
                all: {
                    currentPage: allPage,
                    totalPages: Math.ceil(totalAll / limit),
                    totalItems: totalAll
                },
                products: {
                    currentPage: productPage,
                    totalPages: Math.max(1, Math.ceil((isOwner ? totalProducts : totalProductsAvailable) / limit)),
                    totalItems: isOwner ? totalProducts : totalProductsAvailable,
                },
                services: {
                    currentPage: servicePage,
                    totalPages: Math.max(1, Math.ceil((isOwner ? totalServices : totalServicesActive) / limit)),
                    totalItems: isOwner ? totalServices : totalServicesActive,
                },
                boughtProducts: {
                    currentPage: boughtProductPage,
                    totalPages: Math.max(1, Math.ceil(totalBoughtProducts / boughtLimit)),
                    totalItems: totalBoughtProducts,
                },
                boughtServices: {
                    currentPage: boughtServicePage,
                    totalPages: Math.max(1, Math.ceil(totalBoughtServices / boughtLimit)),
                    totalItems: totalBoughtServices,
                },
            },
            stats: {
                totalProducts,
                totalProductsAvailable,
                totalProductsSold,
                totalServices,
                totalServicesActive,
                totalEnrollments,
                totalReviews,
                totalBoughtProducts,
                totalBoughtServices,
                rating: rating.toFixed(1),
            },
        }, { status: 200 });

    } catch (error: any) {
        console.error('Fetch Public Profile Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
