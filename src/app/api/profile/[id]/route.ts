import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Community from '@/models/Community';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import Order from '@/models/Order';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!isValidObjectId(id)) {
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

        const user = await User.findById(id)
            .select('name username email profilePicture bannerImage gender createdAt role bio isVerified allowEmailContact authProvider isPhoneVerified phone allowPhoneContact address isOnVacation blockedUsers verifiedCommunities')
            .populate('verifiedCommunities', 'name image isActive')
            .lean();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if the viewer is the owner
        let isOwner = false;
        let currentUserId = null;
        let canReview = false;
        let hasReviewed = false;

        try {
            const { verifyToken } = await import('@/lib/auth');
            const token = req.cookies.get('token')?.value;
            if (token) {
                const decoded = verifyToken(token) as any;
                if (decoded && decoded.userId === id.toString()) isOwner = true;
                if (decoded && decoded.userId) {
                    currentUserId = decoded.userId;
                    
                    // Check eligibility
                    const [orderExists, reviewExists] = await Promise.all([
                        Order.exists({ buyer: decoded.userId, seller: id }),
                        Review.exists({ reviewer: decoded.userId, target: id })
                    ]);
                    
                    canReview = !!orderExists && !isOwner;
                    hasReviewed = !!reviewExists;
                }
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
        const objectId = new Types.ObjectId(id);

        // Products: public shows only Available; owner sees all
        const [totalProductsAvailable, totalProductsSold, totalProductsRented] = await Promise.all([
            Product.countDocuments({ seller: objectId, status: 'Available' }),
            Product.countDocuments({ seller: objectId, status: 'Sold' }),
            Product.countDocuments({ seller: objectId, status: 'Rented' }),
        ]);
        const totalProducts = totalProductsAvailable + totalProductsSold + totalProductsRented;
        
        // [UX FIX]: Don't hide Sold/Rented items from public view, let ProductCard handle overlays
        const productQuery = isOwner
            ? { seller: objectId }
            : (user.isOnVacation ? { _id: null } : { seller: objectId });

        const products = await Product.find(productQuery)
            .populate('seller', 'name profilePicture')
            .populate('community', 'name')
            .sort({ createdAt: -1 })
            .skip(productSkip)
            .limit(limit)
            .lean();

        // Services: public shows only Active; owner sees all
        const [totalServicesActive, totalServicesInactive, totalEnrollments, uniqueClientsRes] = await Promise.all([
            Service.countDocuments({ provider: objectId, status: 'Active' }),
            Service.countDocuments({ provider: objectId, status: { $ne: 'Active' } }),
            Order.countDocuments({ seller: objectId, orderType: 'Service_Appointment' }),
            Order.aggregate([
                { $match: { seller: objectId, service: { $exists: true, $ne: null } } },
                { $group: { _id: '$buyer' } },
                { $count: 'uniqueClients' }
            ])
        ]);
        const totalServices = totalServicesActive + totalServicesInactive;
        const clientsServed = uniqueClientsRes[0]?.uniqueClients || 0;
        const serviceQuery = isOwner
            ? { provider: objectId }
            : (user.isOnVacation ? { _id: null } : { provider: objectId });

        const services = await Service.find(serviceQuery)
            .populate('provider', 'name profilePicture')
            .populate('community', 'name')
            .sort({ createdAt: -1 })
            .skip(serviceSkip)
            .limit(limit)
            .lean();

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
                        },
                        {
                            $lookup: {
                                from: 'communities',
                                localField: 'community',
                                foreignField: '_id',
                                as: 'communityObj'
                            }
                        },
                        { $unwind: { path: '$communityObj', preserveNullAndEmptyArrays: true } },
                        {
                            $addFields: {
                                community: {
                                    $cond: {
                                        if: { $ifNull: ['$communityObj._id', false] },
                                        then: { _id: '$communityObj._id', name: '$communityObj.name' },
                                        else: '$$REMOVE'
                                    }
                                }
                            }
                        },
                        { $project: { communityObj: 0 } }
                    ]
                }
            }
        ];

        const allItemsRes = await Product.aggregate(allItemsPipeline);
        const totalAll = allItemsRes[0]?.metadata[0]?.total || 0;
        const allItems = allItemsRes[0]?.data || [];

        // Efficient Reviews Aggregation (Resolve N+1 & Prevent Review Farming)
        const reviewStats = await Review.aggregate([
            { $match: { target: new Types.ObjectId(id), rating: { $exists: true, $ne: null } } },
            // 1. Group by reviewer to compress multiple spam reviews into a single unique vote
            {
                $group: {
                    _id: '$reviewer',
                    reviewerAvgRating: { $avg: '$rating' }
                }
            },
            // 2. Aggregate the unique votes to get the Master Trust Score
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$reviewerAvgRating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        const rawRating = reviewStats[0]?.averageRating;
        const rating = (rawRating && !isNaN(rawRating)) ? rawRating : 0;
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
                    .limit(boughtLimit)
                    .lean(),
                Order.find({ buyer: id, service: { $exists: true, $ne: null } })
                    .populate('service', 'title images price priceUnit')
                    .populate('seller', 'name username')
                    .sort({ createdAt: -1 })
                    .skip(boughtServiceSkip)
                    .limit(boughtLimit)
                    .lean(),
            ]);
        }

        // Enrich all lists with precise rating info for cards (Block forced profile score injection)
        const productIds = products.map(p => p._id);
        const serviceIds = services.map(s => s._id);
        const allItemIds = allItems.map((i: any) => i._id);

        const [productReviews, serviceReviews] = await Promise.all([
            Review.aggregate([
                { $match: { product: { $exists: true, $ne: null, $in: [...productIds, ...allItemIds] }, rating: { $exists: true, $ne: null } } },
                { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]),
            Review.aggregate([
                { $match: { service: { $exists: true, $ne: null, $in: [...serviceIds, ...allItemIds] }, rating: { $exists: true, $ne: null } } },
                { $group: { _id: '$service', average: { $avg: '$rating' }, count: { $sum: 1 } } }
            ])
        ]);

        const productReviewMap = new Map(productReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));
        const serviceReviewMap = new Map(serviceReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const enrichedProducts = products.map(p => {
            const pidStr = p._id.toString();
            const itemStats = productReviewMap.get(pidStr) || { average: 0, count: 0 };
            return {
                ...p, 
                sellerTrustRating: rating, 
                sellerTrustCount: totalReviews,
                itemSpecificRating: itemStats.average,
                itemSpecificCount: itemStats.count
            };
        });

        const enrichedServices = services.map(s => {
            const sidStr = s._id.toString();
            const serviceStats = serviceReviewMap.get(sidStr) || { average: 0, count: 0 };
            return { 
                ...s, 
                sellerTrustRating: rating,
                sellerTrustCount: totalReviews,
                itemSpecificRating: serviceStats.average,
                itemSpecificCount: serviceStats.count 
            };
        });

        const enrichedAllItems = allItems.map((i: any) => {
           const iidStr = i._id.toString();
           const itemStats = (i.type === 'service' ? serviceReviewMap : productReviewMap).get(iidStr) || { average: 0, count: 0 };
           return { 
                ...i, 
                sellerTrustRating: rating, 
                sellerTrustCount: totalReviews,
                itemSpecificRating: itemStats.average,
                itemSpecificCount: itemStats.count 
           };
        });

        return NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                bannerImage: user.bannerImage,
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
                isOnVacation: user.isOnVacation,
                verifiedCommunities: user.verifiedCommunities || []
            },
            isOwner,
            allItems: enrichedAllItems,
            products: enrichedProducts,
            services: enrichedServices,
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
                clientsServed,
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
