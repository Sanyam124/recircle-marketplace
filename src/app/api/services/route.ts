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

        // Check if new listings are enabled
        const SiteSettings = (await import('@/models/SiteSettings')).default;
        const siteConfig = await SiteSettings.getSingleton();
        if (!siteConfig.newListingsEnabled) {
            return NextResponse.json({ error: 'New listings are temporarily disabled by the platform admin. Please try again later.' }, { status: 503 });
        }

        const body = await req.json();
        const { website_url, title: rawTitle, description: rawDescription, price: rawPrice, priceUnit: rawPriceUnit, category: rawCategory, availability: rawAvailability, images, visibility, communityId, location } = body;
        
        // Honeypot Trap
        if (website_url) {
            console.warn('\x1b[41m[BOT DETECTED]\x1b[0m Service creation blocked by Honeypot.');
            return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
        }

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
        const newlyUploadedUrls: string[] = [];

        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    try {
                        const url = await uploadToCloudinary(img, 'recircle/services');
                        imageUrls.push(url);
                        newlyUploadedUrls.push(url);
                    } catch (e) {
                        console.error('Image upload failed, falling back to base64', e);
                        imageUrls.push(img);
                    }
                } else {
                    imageUrls.push(img);
                }
            }
        }

        try {
            let sanitizedLocation = undefined;
            if (location) {
                sanitizedLocation = {
                    city: location.city,
                    state: location.state,
                    pincode: location.pincode,
                    coordinates: location.coordinates,
                    isPrecise: location.isPrecise,
                    hostel: location.hostel,
                    room: location.room,
                    bed: location.bed
                };
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
                community: visibility === 'Community' ? (communityId || (user.verifiedCommunities?.length > 0 ? user.verifiedCommunities[0] : undefined)) : undefined,
                location: sanitizedLocation
            });

            return NextResponse.json({ service }, { status: 201 });
        } catch (dbError: any) {
            // Rollback Cloudinary uploads if DB fails
            if (newlyUploadedUrls.length > 0) {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                for (const url of newlyUploadedUrls) {
                    await deleteFromCloudinary(url).catch(() => null);
                }
            }
            throw dbError; // propagate to outer catch
        }

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
             const currentUser = await User.findById(decoded.userId).select('blockedUsers verifiedCommunities role').lean();
             if (currentUser && currentUser.blockedUsers) {
                  blockedUserIds = currentUser.blockedUsers.map((id: any) => id.toString());
             }

             if (communityFilter === 'Public') {
                 // Only show globally public items (including legacy)
                 query.$or = [
                     { visibility: 'Public' },
                     { visibility: { $exists: false } },
                     { visibility: null }
                 ];
             } else if (communityFilter !== 'All' && communityFilter !== 'Public') {
                 // Exact community filter
                 query.community = communityFilter;
             } else {
                  // 'All' filter rule: Must be 'Public' OR belong to one of the user's verified communities (Admins see everything)
                  const verifiedCommunityIds = (currentUser as any)?.verifiedCommunities || [];
                  const isAdmin = (currentUser as any)?.role === 'admin';
                  
                  const visibilityOr: any[] = [
                      { visibility: 'Public' },
                      { visibility: { $exists: false } },
                      { visibility: null }
                  ];

                  if (isAdmin) {
                      visibilityOr.push({ visibility: 'Community' });
                  } else {
                      visibilityOr.push({ visibility: 'Community', community: { $in: verifiedCommunityIds } });
                  }
                  
                  query.$or = visibilityOr;
             }
        } else if (!provider) {
             // Unauthenticated users ONLY see Public things when looking at 'All'
             query.$or = [
                 { visibility: 'Public' },
                 { visibility: { $exists: false } },
                 { visibility: null }
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
            .populate('community', 'name location')
            .sort(Object.keys(dbSort).length > 0 ? dbSort : { createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Optimize: Aggregate ratings for all providers in one grouped database query (Eliminate N+1 Leak)
        const providerIds = services.map((s: any) => s.provider._id);
        const serviceIds = services.map((s: any) => s._id);

        const [providerReviews, serviceReviews] = await Promise.all([
            Review.aggregate([
                { $match: { target: { $in: providerIds } } },
                { $group: { _id: { target: '$target', reviewer: '$reviewer' }, reviewerAvgRating: { $avg: '$rating' } } },
                { $group: { _id: '$_id.target', average: { $avg: '$reviewerAvgRating' }, count: { $sum: 1 } } }
            ]),
            Review.aggregate([
                { $match: { service: { $in: serviceIds } } },
                { $group: { _id: '$service', average: { $avg: '$rating' }, count: { $sum: 1 } } }
            ])
        ]);

        const providerReviewMap = new Map(providerReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));
        const serviceReviewMap = new Map(serviceReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const servicesWithRatings = services.map((service: any) => {
            const sidStr = service._id.toString();
            const pidStr = service.provider._id.toString();
            
            const providerStats = providerReviewMap.get(pidStr) || { average: 0, count: 0 };
            const serviceStats = serviceReviewMap.get(sidStr) || { average: 0, count: 0 };
            
            return {
                ...service,
                sellerTrustRating: providerStats.average,
                sellerTrustCount: providerStats.count,
                itemSpecificRating: serviceStats.average,
                itemSpecificCount: serviceStats.count,
                // Legacy fields for insurance
                providerRating: providerStats.average,
                serviceRating: serviceStats.average,
                reviewCount: serviceStats.count
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
