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

        // --- ANTI-LISTING SPAM SHIELD ---
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(user.userId, 'service-create', 5, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'You are creating listings too quickly. Please wait a minute.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 60
                },
                { status: 429 }
            );
        }

        // --- ACCOUNT CAPACITY SHIELD ---
        const [productCount, serviceCount] = await Promise.all([
            (await import('@/models/Product')).default.countDocuments({ seller: user.userId, status: { $ne: 'Sold' } }),
            Service.countDocuments({ provider: user.userId, status: 'Active' })
        ]);

        if (productCount + serviceCount >= (siteConfig.maxListingsPerUser || 100)) {
            return NextResponse.json({ 
                error: `Account Limit Reached: You can have a maximum of ${siteConfig.maxListingsPerUser || 100} active listings. Please delete or sell existing items first.` 
            }, { status: 403 });
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
        const price = Math.round(Number(rawPrice));
        if (price <= 0) return NextResponse.json({ error: 'Price must be greater than zero' }, { status: 400 });

        if (!title || !description || !price || !category || !availability) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const maxTitleChars = siteConfig.maxServiceNameChars || 80;
        const maxDescChars = siteConfig.maxServiceDescriptionChars || 2000;
        if (title.length > maxTitleChars) return NextResponse.json({ error: `Title must be ${maxTitleChars} characters or less` }, { status: 400 });
        if (description.length > maxDescChars) return NextResponse.json({ error: `Description must be ${maxDescChars} characters or less` }, { status: 400 });
        if (category.length > 50) return NextResponse.json({ error: 'Category name too long' }, { status: 400 });
        if (priceUnit && priceUnit.length > 30) return NextResponse.json({ error: 'Price unit too long' }, { status: 400 });
        if (availability && availability.length > 100) return NextResponse.json({ error: 'Availability text too long' }, { status: 400 });

        if (location) {
            if (location.city && location.city.length > 50) return NextResponse.json({ error: 'City name too long' }, { status: 400 });
            if (location.state && location.state.length > 50) return NextResponse.json({ error: 'State name too long' }, { status: 400 });
            if (location.hostel && location.hostel.length > 50) return NextResponse.json({ error: 'Hostel name too long' }, { status: 400 });
        }

        const imageUrls: string[] = [];
        const newlyUploadedUrls: string[] = [];

        if (images && Array.isArray(images)) {
            const maxImages = siteConfig.maxServiceImages || 5;
            if (images.length > maxImages) {
                return NextResponse.json({ error: `Maximum ${maxImages} images allowed per service listing` }, { status: 400 });
            }
            for (const img of images) {
                if (typeof img !== 'string') {
                    return NextResponse.json({ error: 'Invalid image format in request payload' }, { status: 400 });
                }
                if (img.startsWith('data:image')) {
                    if (img.length > 7 * 1024 * 1024) {
                        return NextResponse.json({ error: 'Image too large. Max 5MB allowed per image.' }, { status: 400 });
                    }
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
                    coordinates: location.coordinates,
                    isPrecise: location.isPrecise,
                    hostel: location.hostel,
                    room: location.room,
                    bed: location.bed,
                    area: location.area,
                    pincode: location.pincode
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
                community: (await (async function() {
                    if (visibility !== 'Community') return undefined;
                    
                    const fullUser = await User.findById(user.userId).select('verifiedCommunities role');
                    if (!fullUser) return undefined;

                    const targetId = communityId || (fullUser.verifiedCommunities?.length > 0 ? (fullUser.verifiedCommunities[0]._id || fullUser.verifiedCommunities[0].id || fullUser.verifiedCommunities[0]) : undefined);
                    
                    if (!targetId) return undefined;

                    const userCommunityIds = (fullUser.verifiedCommunities || []).map((c: any) => (c._id || c.id || c || '').toString());
                    const isAdmin = fullUser.role === 'admin';
                    
                    if (!isAdmin && !userCommunityIds.includes(targetId.toString())) {
                        return undefined;
                    }
                    return targetId;
                })()),
                location: location ? {
                    city: location.city?.trim() || 'Generic',
                    state: location.state?.trim() || 'Global',
                    coordinates: Array.isArray(location.coordinates) ? location.coordinates.map(Number) : undefined,
                    isPrecise: location.isPrecise !== false,
                    hostel: location.hostel?.trim() || '',
                    room: (location.room && !isNaN(Number(location.room))) ? Number(location.room) : undefined,
                    bed: (location.bed && !isNaN(Number(location.bed))) ? Number(location.bed) : undefined,
                    area: location.area?.trim() || '',
                    pincode: location.pincode?.trim() || ''
                } : undefined
            });

            // --- Maintenance Mode Protection (Creation) ---
            if (service.community) {
                const Community = (await import('@/models/Community')).default;
                const comm = await Community.findById(service.community).select('isActive name');
                if (comm && !comm.isActive && user.role !== 'admin') {
                    // Rollback creation and images
                    await Service.findByIdAndDelete(service._id);
                    if (newlyUploadedUrls.length > 0) {
                        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                        for (const url of newlyUploadedUrls) {
                            await deleteFromCloudinary(url).catch(() => null);
                        }
                    }
                    return NextResponse.json({ 
                        error: `New listings in ${comm.name} are temporarily disabled due to campus maintenance.` 
                    }, { status: 503 });
                }
            }

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
        const requestedLimit = parseInt(searchParams.get('limit') || '12');
        const limit = Math.min(requestedLimit, 50);
        const communityFilter = searchParams.get('communityFilter') || 'All';
        const cityFilter = searchParams.get('city');
        const skip = (page - 1) * limit;

        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        let blockedUserIds: string[] = [];

        const query: any = { status: 'Active' };

        // [MAINTENANCE MODE FILTER]
        const isAdmin = decoded?.role === 'admin';
        if (!isAdmin) {
            const Community = (await import('@/models/Community')).default;
            const inactiveCommunities = await Community.find({ isActive: false }).select('_id').lean();
            if (inactiveCommunities.length > 0) {
                const inactiveIds = inactiveCommunities.map(c => c._id);
                if (!query.$and) query.$and = [];
                // Filter out inactive communities UNLESS we are looking for a specific provider
                // (This allows providers to still see their own services on their profile)
                if (!provider) {
                    query.$and.push({ community: { $nin: inactiveIds } });
                }
            }
        }

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
