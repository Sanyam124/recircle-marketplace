import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
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
        const rl = await checkRateLimit(user.userId, 'product-create', 5, 60 * 1000);
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
            Product.countDocuments({ seller: user.userId, status: { $ne: 'Sold' } }),
            (await import('@/models/Service')).default.countDocuments({ provider: user.userId, status: 'Active' })
        ]);

        if (productCount + serviceCount >= (siteConfig.maxListingsPerUser || 100)) {
            return NextResponse.json({ 
                error: `Account Limit Reached: You can have a maximum of ${siteConfig.maxListingsPerUser || 100} active listings. Please delete or sell existing items first.` 
            }, { status: 403 });
        }

        const body = await req.json();
        const { website_url, title: rawTitle, description: rawDescription, price: rawPrice, category: rawCategory, condition, images, visibility, communityId, location, forSell = true, forRent = false, rentPrice: rawRentPrice, rentUnit } = body;
        
        // Honeypot Trap
        if (website_url) {
            console.warn('\x1b[41m[BOT DETECTED]\x1b[0m Product creation blocked by Honeypot.');
            return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
        }

        const title = rawTitle?.trim();
        const description = rawDescription?.trim();
        const category = rawCategory?.trim();
        
        if (!title || !description || !category || !condition) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!forSell && !forRent) {
            return NextResponse.json({ error: 'Product must be listed for sale or rent' }, { status: 400 });
        }

        let price = undefined;
        let rentPrice = undefined;

        if (forSell) {
            if (rawPrice === undefined || rawPrice === null || rawPrice === '') return NextResponse.json({ error: 'Sell price is required when For Sell is checked' }, { status: 400 });
            price = Math.round(Number(rawPrice));
            if (price <= 0) return NextResponse.json({ error: 'Sell price must be greater than zero' }, { status: 400 });
        }

        if (forRent) {
             if (rawRentPrice === undefined || rawRentPrice === null || rawRentPrice === '' || !rentUnit) return NextResponse.json({ error: 'Rent price and unit are required when For Rent is checked' }, { status: 400 });
             rentPrice = Math.round(Number(rawRentPrice));
             if (rentPrice <= 0) return NextResponse.json({ error: 'Rent price must be greater than zero' }, { status: 400 });
        }

        const maxTitleChars = siteConfig.maxProductNameChars || 80;
        const maxDescChars = siteConfig.maxProductDescriptionChars || 2000;
        if (title.length > maxTitleChars) return NextResponse.json({ error: `Title must be ${maxTitleChars} characters or less` }, { status: 400 });
        if (description.length > maxDescChars) return NextResponse.json({ error: `Description must be ${maxDescChars} characters or less` }, { status: 400 });

        if (location) {
            if (location.city && location.city.length > 50) return NextResponse.json({ error: 'City name too long' }, { status: 400 });
            if (location.state && location.state.length > 50) return NextResponse.json({ error: 'State name too long' }, { status: 400 });
            if (location.hostel && location.hostel.length > 50) return NextResponse.json({ error: 'Hostel name too long' }, { status: 400 });
        }

        const imageUrls: string[] = [];
        const newlyUploadedUrls: string[] = [];

        if (images && Array.isArray(images)) {
            if (images.length > 5) {
                return NextResponse.json({ error: 'Maximum 5 images allowed per product listing' }, { status: 400 });
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
                        const url = await uploadToCloudinary(img, 'recircle/products');
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

            const product = await Product.create({
                seller: user.userId,
                title,
                description,
                forSell,
                forRent,
                price,
                rentPrice,
                rentUnit,
                category,
                condition,
                images: imageUrls,
                status: 'Available',
                visibility: visibility === 'Community' ? 'Community' : 'Public',
                community: (await (async function() {
                    if (visibility !== 'Community') return undefined;
                    
                    const fullUser = await User.findById(user.userId).select('verifiedCommunities role');
                    if (!fullUser) return undefined;

                    // Find matching community ID from verified list or fallback
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
            if (product.community) {
                const Community = (await import('@/models/Community')).default;
                const comm = await Community.findById(product.community).select('isActive name');
                if (comm && !comm.isActive && user.role !== 'admin') {
                    // Rollback creation and images
                    await Product.findByIdAndDelete(product._id);
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

            return NextResponse.json({ product }, { status: 201 });
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
        console.error('Create Product Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const seller = searchParams.get('seller');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort') || 'newest';
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const page = parseInt(searchParams.get('page') || '1');
        const requestedLimit = parseInt(searchParams.get('limit') || '24');
        const limit = Math.min(requestedLimit, 50);
        const communityFilter = searchParams.get('communityFilter') || 'All';
        const cityFilter = searchParams.get('city');
        const skip = (page - 1) * limit;

        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        let blockedUserIds: string[] = [];

        const query: any = { status: { $in: ['Available', 'Rented'] } };

        // [MAINTENANCE MODE FILTER]
        const isAdmin = decoded?.role === 'admin';
        if (!isAdmin) {
            const Community = (await import('@/models/Community')).default;
            const inactiveCommunities = await Community.find({ isActive: false }).select('_id').lean();
            if (inactiveCommunities.length > 0) {
                const inactiveIds = inactiveCommunities.map(c => c._id);
                if (!query.$and) query.$and = [];
                // Filter out inactive communities UNLESS we are looking for a specific seller
                // (This allows sellers to still see their own items on their profile)
                if (!seller) {
                    query.$and.push({ community: { $nin: inactiveIds } });
                }
            }
        }

        if (decoded && !seller) {
             const currentUser = await User.findById(decoded.userId).select('blockedUsers verifiedCommunities role').lean();
             if (currentUser && currentUser.blockedUsers) {
                  blockedUserIds = currentUser.blockedUsers.map((id: any) => id.toString());
             }

             if (communityFilter === 'Public') {
                 query.$or = [
                     { visibility: 'Public' },
                     { visibility: { $exists: false } },
                     { visibility: null }
                 ];
             } else if (communityFilter !== 'All' && communityFilter !== 'Public') {
                 query.community = communityFilter;
             } else {
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
        } else if (!seller) {
             query.$or = [
                 { visibility: 'Public' },
                 { visibility: { $exists: false } },
                 { visibility: null }
             ];
        }

        if (!seller) {
            const vacationUsers = await User.find({ isOnVacation: true }).select('_id').lean();
            const vacationUserIds = vacationUsers.map(u => u._id.toString());
            
            let hiddenIds = [...vacationUserIds, ...blockedUserIds];
            
            if (decoded?.userId) {
                const usersWhoBlockedMe = await User.find({ blockedUsers: decoded.userId }).select('_id').lean();
                const usersWhoBlockedMeIds = usersWhoBlockedMe.map(u => u._id.toString());
                hiddenIds = [...hiddenIds, ...usersWhoBlockedMeIds];
            }
            
            if (hiddenIds.length > 0) {
                 query.seller = { $nin: hiddenIds };
            }
        }

        if (category) {
            query.category = category;
        }

        if (cityFilter) {
            query['location.city'] = cityFilter;
        }

        if (seller) {
            query.seller = seller;
        }

        if (search) {
            query.$text = { $search: search };
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let sortOptions: any = {};
        switch (sort) {
            case 'price_asc':
                sortOptions = { price: 1, _id: -1 };
                break;
            case 'price_desc':
                sortOptions = { price: -1, _id: -1 };
                break;
            case 'newest':
            default:
                sortOptions = { createdAt: -1, _id: -1 };
                break;
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(query)
            .populate('seller', 'name profilePicture gender')
            .populate('community', 'name location')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

        const sellerIds = products.map((p: any) => p.seller._id);
        const productIds = products.map((p: any) => p._id);
        
        // Parallel queries to fetch both explicit item ratings and global seller trust scores
        const [sellerReviews, itemReviews] = await Promise.all([
            // Seller Ratings (compressed anti-farm logic)
            Review.aggregate([
                { $match: { target: { $in: sellerIds } } },
                { $group: { _id: { target: '$target', reviewer: '$reviewer' }, reviewerAvgRating: { $avg: '$rating' } } },
                { $group: { _id: '$_id.target', average: { $avg: '$reviewerAvgRating' }, count: { $sum: 1 } } }
            ]),
            // Specific Item Ratings
            Review.aggregate([
                { $match: { product: { $in: productIds } } },
                { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }
            ])
        ]);

        const sellerReviewMap = new Map(sellerReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));
        const itemReviewMap = new Map(itemReviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const productsWithRatings = products.map((product: any) => {
            const sellerStats = sellerReviewMap.get(product.seller._id.toString()) || { average: 0, count: 0 };
            const itemStats = itemReviewMap.get(product._id.toString()) || { average: 0, count: 0 };
            
            return {
                ...product,
                sellerTrustRating: sellerStats.average,
                sellerTrustCount: sellerStats.count,
                itemSpecificRating: itemStats.average,
                itemSpecificCount: itemStats.count,
                // Legacy fields for insurance
                ownerRating: sellerStats.average,
                itemRating: itemStats.average,
                reviewCount: product.forRent ? itemStats.count : sellerStats.count
            };
        });

        return NextResponse.json({
            products: productsWithRatings,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Fetch Products Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
