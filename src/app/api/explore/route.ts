import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        // --- ANTI-CRAWL SHIELD ---
        const { checkRateLimit, getClientIp } = await import('@/lib/rate-limit');
        const ip = getClientIp(req);
        const rl = await checkRateLimit(ip, 'explore-search', 200, 60 * 60 * 1000); // 200 per hour
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'Search/Explore limit reached. Please try again in an hour.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 300
                },
                { status: 429 }
            );
        }
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const targetId = searchParams.get('targetId'); // If filtering by specific owner
        const type = searchParams.get('type') || 'all'; // 'all', 'products', 'services'

        if (targetId && !isValidObjectId(targetId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }
        const sort = searchParams.get('sort') || 'newest';
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const categories = searchParams.getAll('categories[]');
        const conditions = searchParams.getAll('conditions[]');
        const availabilities = searchParams.getAll('availabilities[]');
        const page = parseInt(searchParams.get('page') || '1');
        const requestedLimit = parseInt(searchParams.get('limit') || '12');
        const limit = Math.min(requestedLimit, 50);
        const communityFilter = searchParams.get('communityFilter') || 'All'; // 'All', 'Public', or specific ID
        const stateFilter = searchParams.get('state');
        const cityFilter = searchParams.get('city');
        const hostelFilter = searchParams.get('hostel');
        const listingType = searchParams.get('listingType') || 'All'; // 'Buy', 'Rent', 'All'

        const skip = (page - 1) * limit;

        // Base Queries
        const productQuery: any = { status: 'Available' };
        const serviceQuery: any = { status: 'Active' };

        // [MAINTENANCE MODE] Filter out circles paused by Admin
        const Community = (await import('@/models/Community')).default;
        const inactiveCommunities = await Community.find({ isActive: false }).select('_id').lean();
        if (inactiveCommunities.length > 0) {
            const inactiveIds = inactiveCommunities.map(c => c._id);
            productQuery.community = { $nin: inactiveIds };
            serviceQuery.community = { $nin: inactiveIds };
        }

        // [VACATION MODE] & [BLOCKED USERS] & [BAN CHECK]
        if (!targetId) {
            const token = req.cookies.get('token')?.value;
            const decodedToken = token ? verifyToken(token) : null;
            let hiddenIds: any[] = [];

            // 1. Vacation Mode
            const vacationUsers = await User.find({ isOnVacation: true }).select('_id').lean();
            hiddenIds = vacationUsers.map((u: any) => u._id);

            // 1.5 Banned Users
            const bannedUsers = await User.find({ status: 'Banned' }).select('_id').lean();
            const bannedUsersIds = bannedUsers.map((u: any) => u._id);
            hiddenIds = [...hiddenIds, ...bannedUsersIds];

            // 2. Blocked Users
            if (decodedToken?.userId) {
                const currentUser = await User.findById(decodedToken.userId).select('blockedUsers').lean();
                if (currentUser && (currentUser as any).blockedUsers) {
                    hiddenIds = [...hiddenIds, ...(currentUser as any).blockedUsers];
                }
                const usersWhoBlockedMe = await User.find({ blockedUsers: decodedToken.userId }).select('_id').lean();
                const usersWhoBlockedMeIds = usersWhoBlockedMe.map((u: any) => u._id);
                hiddenIds = [...hiddenIds, ...usersWhoBlockedMeIds];
            }

            if (hiddenIds.length > 0) {
                productQuery.seller = { $nin: hiddenIds };
                serviceQuery.provider = { $nin: hiddenIds };
            }
        }

        // [CIRCLE VISIBILITY LOGIC]
        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        let user: any = null;
        if (decoded?.userId) {
            user = await User.findById(decoded.userId).select('verifiedCommunities role').lean();
        }

        if (communityFilter !== 'All' && communityFilter !== 'Public' && isValidObjectId(communityFilter)) {
            const isAdmin = user?.role === 'admin';
            const isMember = user?.verifiedCommunities?.some((c: any) => (c._id || c.id || c).toString() === communityFilter);
            
            if (!isAdmin && !isMember) {
                return NextResponse.json({ error: 'You are not a member of this community' }, { status: 403 });
            }

            productQuery.community = new Types.ObjectId(communityFilter);
            productQuery.visibility = 'Community';
            serviceQuery.community = new Types.ObjectId(communityFilter);
            serviceQuery.visibility = 'Community';
        } 
        else if (communityFilter === 'Public') {
            const publicOr = [
                { visibility: 'Public' },
                { visibility: { $exists: false } },
                { visibility: null }
            ];
            productQuery.$or = publicOr;
            serviceQuery.$or = publicOr;
        }
        else {
            const allowedCommunityIds = user?.verifiedCommunities || [];
            const isAdmin = user?.role === 'admin';

            const visibilityOr: any[] = [
                { visibility: 'Public' },
                { visibility: { $exists: false } },
                { visibility: null }
            ];

            if (isAdmin) {
                visibilityOr.push({ visibility: 'Community' });
            } else {
                visibilityOr.push({ visibility: 'Community', community: { $in: allowedCommunityIds } });
            }

            if (!productQuery.$and) productQuery.$and = [];
            if (!serviceQuery.$and) serviceQuery.$and = [];
            productQuery.$and.push({ $or: visibilityOr });
            serviceQuery.$and.push({ $or: visibilityOr });
        }

        // Search logic
        if (search) {
            const stopWords = ['a', 'an', 'the', 'in', 'on', 'at', 'for', 'to', 'of', 'with', 'and', 'or', 'if', 'but', 'is', 'are', 'was', 'were'];
            const searchTerms = search.split(' ')
                .map(term => term.trim())
                .filter(term => term.length > 1 && !stopWords.includes(term.toLowerCase()));

            if (searchTerms.length > 0) {
                const orGroup = searchTerms.flatMap(term => {
                    let coreTerm = term;
                    if (term.length > 3) {
                        if (term.endsWith('ies')) coreTerm = term.slice(0, -3) + 'y';
                        else if (term.endsWith('es')) coreTerm = term.slice(0, -2);
                        else if (term.endsWith('s') && !term.endsWith('ss')) coreTerm = term.slice(0, -1);
                    }
                    const escapedTerm = coreTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return [
                        { title: { $regex: escapedTerm, $options: 'i' } },
                        { description: { $regex: escapedTerm, $options: 'i' } },
                        { category: { $regex: escapedTerm, $options: 'i' } }
                    ];
                });
                if (!productQuery.$and) productQuery.$and = [];
                if (!serviceQuery.$and) serviceQuery.$and = [];
                productQuery.$and.push({ $or: orGroup });
                serviceQuery.$and.push({ $or: orGroup });
            }
        }

        // Price logic
        if (minPrice || maxPrice) {
            productQuery.price = {};
            serviceQuery.price = {};
            if (minPrice) {
                productQuery.price.$gte = Number(minPrice);
                serviceQuery.price.$gte = Number(minPrice);
            }
            if (maxPrice) {
                productQuery.price.$lte = Number(maxPrice);
                serviceQuery.price.$lte = Number(maxPrice);
            }
        }

        // Categories logic
        if (categories.length > 0) {
            if (type === 'products') {
                productQuery.category = { $in: categories };
            } else if (type === 'services') {
                serviceQuery.category = { $in: categories };
            } else {
                productQuery.category = { $in: categories };
                serviceQuery.category = { $in: categories };
            }
        }

        // Conditions logic (Products only)
        if (conditions.length > 0) {
            productQuery.condition = { $in: conditions };
        }

        // Availabilities logic (Services only)
        if (availabilities.length > 0) {
            serviceQuery.availability = { $in: availabilities };
        }

        // Other filters
        if (stateFilter) { productQuery['location.state'] = stateFilter; serviceQuery['location.state'] = stateFilter; }
        if (cityFilter) { productQuery['location.city'] = cityFilter; serviceQuery['location.city'] = cityFilter; }
        if (hostelFilter) { productQuery['location.hostel'] = hostelFilter; serviceQuery['location.hostel'] = hostelFilter; }

        if (listingType === 'Buy') {
            if (!productQuery.$and) productQuery.$and = [];
            productQuery.$and.push({ $or: [{ forSell: true }, { forSell: { $exists: false } }] });
        } else if (listingType === 'Rent') {
            productQuery.forRent = true;
        }

        const pipeline: any[] = [];
        const hasGeo = lat && lng;
        let latNum = 0, lngNum = 0;
        if (hasGeo) { latNum = parseFloat(lat as string); lngNum = parseFloat(lng as string); }

        if (type === 'services') {
            pipeline.push({ $match: { _id: { $exists: false } } });
        } else {
            if (hasGeo) {
                pipeline.push({
                    $geoNear: {
                        near: { type: 'Point', coordinates: [lngNum, latNum] },
                        distanceField: 'calculatedDistance',
                        spherical: true,
                        query: productQuery
                    }
                });
            } else {
                pipeline.push({ $match: productQuery });
            }
        }
        pipeline.push({ $addFields: { itemType: 'product' } });

        if (type === 'all' || type === 'services') {
            const servicePipeline: any[] = [];
            if (hasGeo) {
                servicePipeline.push({
                    $geoNear: {
                        near: { type: 'Point', coordinates: [lngNum, latNum] },
                        distanceField: 'calculatedDistance',
                        spherical: true,
                        query: serviceQuery
                    }
                });
            } else {
                servicePipeline.push({ $match: serviceQuery });
            }
            servicePipeline.push({ $addFields: { itemType: 'service' } });
            servicePipeline.push({ $project: { community: 1, visibility: 1, title: 1, price: 1, images: 1, category: 1, description: 1, status: 1, createdAt: 1, priceUnit: 1, provider: 1, location: 1, availability: 1, calculatedDistance: 1 } });
            pipeline.push({ $unionWith: { coll: 'services', pipeline: servicePipeline } });
        }

        pipeline.push({
            $project: {
                title: 1, price: 1, forSell: 1, forRent: 1, rentPrice: 1, rentUnit: 1, images: 1, category: 1, description: 1, condition: 1, status: 1, itemType: 1, createdAt: 1, priceUnit: 1, seller: { $ifNull: ['$seller', '$provider'] }, provider: 1, community: 1, visibility: 1, location: 1, availability: 1, calculatedDistance: 1
            }
        });

        const sortStage: any = {};
        if (sort === 'price_asc') sortStage.price = 1;
        else if (sort === 'price_desc') sortStage.price = -1;
        else if (sort === 'distance' && hasGeo) sortStage.calculatedDistance = 1;
        else { sortStage.createdAt = -1; sortStage._id = -1; }

        if (Object.keys(sortStage).length > 0) pipeline.push({ $sort: sortStage });
        if (sort === 'rating') pipeline.push({ $sort: { ownerRating: -1, createdAt: -1 } });

        const countPipeline = [...pipeline, { $count: 'total' }];
        const resultsPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

        resultsPipeline.push({ $lookup: { from: 'users', localField: 'seller', foreignField: '_id', as: 'sellerObj' } });
        resultsPipeline.push({ $unwind: { path: '$sellerObj', preserveNullAndEmptyArrays: true } });
        resultsPipeline.push({
            $addFields: {
                seller: { _id: '$sellerObj._id', name: '$sellerObj.name', profilePicture: '$sellerObj.profilePicture' },
                provider: { _id: '$sellerObj._id', name: '$sellerObj.name', profilePicture: '$sellerObj.profilePicture' }
            }
        });
        resultsPipeline.push({ $project: { sellerObj: 0 } });
        
        resultsPipeline.push({ $lookup: { from: 'communities', localField: 'community', foreignField: '_id', as: 'communityObj' } });
        resultsPipeline.push({ $unwind: { path: '$communityObj', preserveNullAndEmptyArrays: true } });
        resultsPipeline.push({
            $addFields: {
                community: {
                    $cond: {
                        if: { $ifNull: ['$communityObj._id', false] },
                        then: { _id: '$communityObj._id', name: '$communityObj.name' },
                        else: '$$REMOVE'
                    }
                }
            }
        });
        resultsPipeline.push({ $project: { communityObj: 0 } });

        const [totalRes, results] = await Promise.all([
            Product.aggregate(countPipeline),
            Product.aggregate(resultsPipeline)
        ]);

        const totalItems = totalRes[0]?.total || 0;
        const totalPages = Math.ceil(totalItems / limit);

        const sellerIds = results.map((i: any) => i.seller._id);
        const itemIds = results.map((i: any) => i._id);

        const [ReviewModel] = await Promise.all([import('@/models/Review').then(m => m.default)]);
        const [sellerReviews, specificItemReviews] = await Promise.all([
            ReviewModel.aggregate([
                { $match: { target: { $in: sellerIds } } },
                { $group: { _id: { target: '$target', reviewer: '$reviewer' }, reviewerAvgRating: { $avg: '$rating' } } },
                { $group: { _id: '$_id.target', average: { $avg: '$reviewerAvgRating' }, count: { $sum: 1 } } }
            ]),
            ReviewModel.aggregate([
                { $match: { $or: [{ product: { $in: itemIds } }, { service: { $in: itemIds } }] } },
                { $group: { _id: { $ifNull: ['$product', '$service'] }, average: { $avg: '$rating' }, count: { $sum: 1 } } }
            ])
        ]);

        const sellerReviewMap = new Map(sellerReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));
        const specificReviewMap = new Map(specificItemReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const resultsWithRatings = results.map((item: any) => {
            const itemIdStr = item._id.toString();
            const sellerIdStr = item.seller._id.toString();
            const sellerStats = sellerReviewMap.get(sellerIdStr) || { average: 0, count: 0 };
            const itemStats = specificReviewMap.get(itemIdStr) || { average: 0, count: 0 };
            return {
                ...item,
                sellerTrustRating: sellerStats.average,
                sellerTrustCount: sellerStats.count,
                itemSpecificRating: itemStats.average,
                itemSpecificCount: itemStats.count
            };
        });

        return NextResponse.json({
            items: resultsWithRatings,
            pagination: { currentPage: page, totalPages, totalItems, hasMore: page < totalPages }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Explore API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
