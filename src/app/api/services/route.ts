import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Service from '@/models/Service';
import User from '@/models/User';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();

        const body = await req.json();
        const { title: rawTitle, description: rawDescription, price: rawPrice, priceUnit: rawPriceUnit, category: rawCategory, availability: rawAvailability, images, visibility, communityId, location } = body;
        const title = rawTitle?.trim();
        const description = rawDescription?.trim();
        const category = rawCategory?.trim();
        const priceUnit = rawPriceUnit?.trim();
        const availability = rawAvailability?.trim();
        const price = Math.round(rawPrice);

        if (!title || !description || !price || !category || !availability) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (title.length > 80) return NextResponse.json({ error: 'Title must be 80 characters or less' }, { status: 400 });
        if (description.length > 2000) return NextResponse.json({ error: 'Description must be 2000 characters or less' }, { status: 400 });

        const imageUrls: string[] = [];
        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    try {
                        const url = await uploadToCloudinary(img, 'recircle/services');
                        imageUrls.push(url);
                    } catch (e) {
                        console.error('Image upload failed, falling back to base64', e);
                        imageUrls.push(img);
                    }
                } else {
                    imageUrls.push(img);
                }
            }
        }

        const service = await Service.create({
            provider: user.userId,
            title,
            description,
            price,
            priceUnit: priceUnit || 'fixed',
            category,
            availability,
            images: imageUrls,
            status: 'Active',
            visibility: visibility === 'Community' ? 'Community' : 'Public',
            community: communityId || (user.verifiedCommunities?.length > 0 ? user.verifiedCommunities[0] : undefined),
            location: visibility === 'Public' ? location : undefined
        });

        return NextResponse.json({ service }, { status: 201 });

    } catch (error: any) {
        console.error('Create Service Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const provider = searchParams.get('provider');
        const sort = searchParams.get('sort') || 'newest';
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const communityFilter = searchParams.get('communityFilter') || 'All';
        const cityFilter = searchParams.get('city');
        const skip = (page - 1) * limit;

        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        let blockedUserIds: string[] = [];

        const query: any = { status: 'Active' };

        if (decoded && !provider) {
             const currentUser = await User.findById(decoded.userId).select('blockedUsers verifiedCommunities').lean();
             if (currentUser && currentUser.blockedUsers) {
                  blockedUserIds = currentUser.blockedUsers.map((id: any) => id.toString());
             }

             if (communityFilter === 'Public') {
                 // Only show globally public items
                 query.visibility = 'Public';
             } else if (communityFilter !== 'All' && communityFilter !== 'Public') {
                 // Exact community filter
                 query.community = communityFilter;
             } else {
                 // 'All' filter rule: Must be 'Public' OR belong to one of the user's verified communities
                 const verifiedCommunityIds = (currentUser as any)?.verifiedCommunities || [];
                  query.$or = [
                      { visibility: 'Public' },
                      { visibility: { $exists: false } },
                      { visibility: 'Community', community: { $in: verifiedCommunityIds } }
                  ];
             }
        } else if (!provider) {
             // Unauthenticated users ONLY see Public things when looking at 'All'
             query.$or = [
                 { visibility: 'Public' },
                 { visibility: { $exists: false } }
             ];
        }

        // [VACATION MODE] & [BLOCKED USERS]
        // Hide listings from users who are on vacation or have been blocked by the current user
        // Only apply if we are not looking for a specific provider's items
        if (!provider) {
            const vacationUsers = await User.find({ isOnVacation: true }).select('_id').lean();
            const vacationUserIds = vacationUsers.map(u => u._id.toString());
            
            let hiddenIds = [...vacationUserIds, ...blockedUserIds];
            
            // Reverse-block check: Hide listings of people who blocked the current user
            if (decoded?.userId) {
                const usersWhoBlockedMe = await User.find({ blockedUsers: decoded.userId }).select('_id').lean();
                const usersWhoBlockedMeIds = usersWhoBlockedMe.map(u => u._id.toString());
                hiddenIds = [...hiddenIds, ...usersWhoBlockedMeIds];
            }
            
            if (hiddenIds.length > 0) {
                 query.provider = { $nin: hiddenIds };
            }
        }

        if (category) {
            query.category = category;
        }

        if (cityFilter) {
            query['location.city'] = cityFilter;
        }

        if (provider) {
            query.provider = provider;
        }

        if (search) {
            query.$text = { $search: search };
            // MongoDB text index automatically handles stemming, stop words, and optimized lookups
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let dbSort: any = {};
        if (sort === 'price_asc') dbSort = { price: 1, _id: -1 };
        else if (sort === 'price_desc') dbSort = { price: -1, _id: -1 };
        else if (sort === 'newest') dbSort = { createdAt: -1, _id: -1 };
        // 'rating' sort is handled after aggregation

        const totalServices = await Service.countDocuments(query);
        const totalPages = Math.ceil(totalServices / limit);

        const services = await Service.find(query)
            .populate('provider', 'name profilePicture')
            .populate('community', 'name')
            .sort(Object.keys(dbSort).length > 0 ? dbSort : { createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Optimize: Aggregate ratings for all providers in one grouped database query (Eliminate N+1 Leak)
        const providerIds = services.map((s: any) => s.provider._id);
        const reviews = await Review.aggregate([
            { $match: { target: { $in: providerIds } } },
            { $group: { _id: '$target', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const reviewMap = new Map(reviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const servicesWithRatings = services.map((service: any) => {
            const stats = reviewMap.get(service.provider._id.toString()) || { average: 0, count: 0 };
            return {
                ...service,
                providerRating: stats.average,
                reviewCount: stats.count
            };
        });

        // Handle in-memory sort for rating
        if (sort === 'rating') {
            servicesWithRatings.sort((a: any, b: any) => b.providerRating - a.providerRating);
        }

        return NextResponse.json({
            services: servicesWithRatings,
            pagination: {
                currentPage: page,
                totalPages,
                totalServices,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Fetch Services Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
