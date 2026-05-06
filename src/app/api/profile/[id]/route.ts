import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Community from '@/models/Community';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        
        // --- ANTI-SCRAPE SHIELD ---
        const { checkRateLimit, getClientIp } = await import('@/lib/rate-limit');
        const ip = getClientIp(req);
        const rlProfile = await checkRateLimit(ip, 'profile-view-scrape', 60, 60 * 60 * 1000); 
        if (!rlProfile.success) {
            return NextResponse.json(
                { 
                    error: 'Profile view limit reached. Researching too many profiles? Take a break.',
                    retryAfter: rlProfile.resetTime ? Math.ceil((rlProfile.resetTime.getTime() - Date.now()) / 1000) : 300
                },
                { status: 429 }
            );
        }
        const { id } = await params;

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
        }
        const { searchParams } = new URL(req.url);

        const requestedLimit = parseInt(searchParams.get('limit') || '8');
        const limit = Math.min(requestedLimit, 50);
        const productPage = parseInt(searchParams.get('productPage') || '1');
        const servicePage = parseInt(searchParams.get('servicePage') || '1');
        const allPage = parseInt(searchParams.get('allPage') || '1');
        const productStatus = searchParams.get('productStatus') || 'all'; // all, available, sold

        const productSkip = (productPage - 1) * limit;
        const serviceSkip = (servicePage - 1) * limit;
        const allSkip = (allPage - 1) * limit;

        // Ensure models are registered for populate
        const _models = [Community, Product, Service, Review, Order]; 

        const user = await User.findById(id)
            .select('name username email profilePicture bannerImage gender createdAt role bio isVerified allowEmailContact authProvider isPhoneVerified phone allowPhoneContact state city landmark isOnVacation blockedUsers verifiedCommunities')
            .populate('verifiedCommunities', 'name image isActive hostels')
            .lean();
            
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if the viewer is the owner
        let isOwner = false;
        let currentUserId = null;

        try {
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

        const objectId = new Types.ObjectId(id);

        // Visibility Logic
        const visibilityOr: any[] = [
            { visibility: 'Public' },
            { visibility: { $exists: false } },
            { visibility: null }
        ];

        if (!isOwner) {
            const viewerToken = req.cookies.get('token')?.value;
            const decodedViewer = viewerToken ? verifyToken(viewerToken) : null;
            if (decodedViewer) {
                const viewerUser = await User.findById(decodedViewer.userId).select('verifiedCommunities role').lean();
                const isAdmin = viewerUser?.role === 'admin';
                const allowedCommunityIds = (viewerUser as any)?.verifiedCommunities || [];
                if (isAdmin) visibilityOr.push({ visibility: 'Community' });
                else visibilityOr.push({ visibility: 'Community', community: { $in: allowedCommunityIds } });
            }
        }

        // Product Counts
        const productStatsQueryBase = isOwner ? { seller: objectId } : { seller: objectId, $or: visibilityOr };
        const [totalProductsAvailable, totalProductsSold, totalProducts] = await Promise.all([
            Product.countDocuments({ ...productStatsQueryBase, status: 'Available' }),
            Product.countDocuments({ ...productStatsQueryBase, status: 'Sold' }),
            Product.countDocuments(productStatsQueryBase)
        ]);

        // Products Fetch
        const productQuery: any = { ...productStatsQueryBase };
        if (productStatus === 'available') productQuery.status = 'Available';
        else if (productStatus === 'sold') productQuery.status = 'Sold';
        
        if (!isOwner && user.isOnVacation) productQuery._id = null;

        const filteredProductCount = await Product.countDocuments(productQuery);
        const products = await Product.find(productQuery)
            .populate('seller', 'name profilePicture')
            .populate('community', 'name')
            .sort({ createdAt: -1 })
            .skip(productSkip)
            .limit(limit)
            .lean();

        // Service Counts
        const serviceStatsQueryBase = isOwner ? { provider: objectId } : { provider: objectId, $or: visibilityOr };
        const [totalServicesActive, totalServices] = await Promise.all([
            Service.countDocuments({ ...serviceStatsQueryBase, status: 'Active' }),
            Service.countDocuments(serviceStatsQueryBase)
        ]);

        // Services Fetch
        const serviceQuery: any = { ...serviceStatsQueryBase };
        if (!isOwner && user.isOnVacation) serviceQuery._id = null;

        const services = await Service.find(serviceQuery)
            .populate('provider', 'name profilePicture')
            .populate('community', 'name')
            .sort({ createdAt: -1 })
            .skip(serviceSkip)
            .limit(limit)
            .lean();

        // Unified View (All)
        const allItemsPipeline: any[] = [
            { $match: isOwner ? { seller: objectId } : { seller: objectId, $or: visibilityOr } },
            { $addFields: { type: 'product' } },
            {
                $unionWith: {
                    coll: 'services',
                    pipeline: [
                        { $match: isOwner ? { provider: objectId } : { provider: objectId, $or: visibilityOr } },
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
                                localField: 'seller',
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

        // Review Stats (Uniquified)
        const reviewStats = await Review.aggregate([
            { $match: { target: new Types.ObjectId(id), rating: { $exists: true, $ne: null } } },
            { $group: { _id: '$reviewer', reviewerAvgRating: { $avg: '$rating' } } },
            { $group: { _id: null, averageRating: { $avg: '$reviewerAvgRating' }, totalReviews: { $sum: 1 } } }
        ]);

        const rawRating = reviewStats[0]?.averageRating;
        const rating = (rawRating && !isNaN(rawRating)) ? rawRating : 0;
        const totalReviews = reviewStats[0]?.totalReviews || 0;

        // Enrich with Ratings
        const productIds = products.map((p: any) => p._id);
        const serviceIds = services.map((s: any) => s._id);
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

        const pRevMap = new Map(productReviews.map(r => [r._id.toString(), r]));
        const sRevMap = new Map(serviceReviews.map(r => [r._id.toString(), r]));

        const enrich = (item: any, isService: boolean) => {
            const stats = (isService ? sRevMap : pRevMap).get(item._id.toString()) || { average: 0, count: 0 };
            return {
                ...item,
                sellerTrustRating: rating,
                sellerTrustCount: totalReviews,
                itemSpecificRating: stats.average,
                itemSpecificCount: stats.count
            };
        };

        return NextResponse.json({
            user: { ...user, id: user._id, rating: rating.toFixed(1), reviewCount: totalReviews },
            isOwner,
            allItems: allItems.map((i: any) => enrich(i, i.type === 'service')),
            products: products.map(p => enrich(p, false)),
            services: services.map(s => enrich(s, true)),
            pagination: {
                all: { currentPage: allPage, totalPages: Math.ceil(totalAll / limit), totalItems: totalAll },
                products: { currentPage: productPage, totalPages: Math.max(1, Math.ceil(filteredProductCount / limit)), totalItems: filteredProductCount },
                services: { currentPage: servicePage, totalPages: Math.max(1, Math.ceil(totalServices / limit)), totalItems: totalServices }
            },
            stats: {
                totalProducts, totalProductsAvailable, totalProductsSold,
                totalServices, totalServicesActive,
                totalAll, totalReviews, rating: rating.toFixed(1)
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
