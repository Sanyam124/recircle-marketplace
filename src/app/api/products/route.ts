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
            price = Math.round(rawPrice);
        }

        if (forRent) {
             if (rawRentPrice === undefined || rawRentPrice === null || rawRentPrice === '' || !rentUnit) return NextResponse.json({ error: 'Rent price and unit are required when For Rent is checked' }, { status: 400 });
             rentPrice = Math.round(rawRentPrice);
        }

        if (title.length > 80) return NextResponse.json({ error: 'Title must be 80 characters or less' }, { status: 400 });
        if (description.length > 2000) return NextResponse.json({ error: 'Description must be 2000 characters or less' }, { status: 400 });

        const imageUrls: string[] = [];
        const newlyUploadedUrls: string[] = [];

        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
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
                    pincode: location.pincode,
                    coordinates: location.coordinates,
                    isPrecise: location.isPrecise,
                    hostel: location.hostel,
                    room: location.room,
                    bed: location.bed
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
                community: visibility === 'Community' ? (communityId || (user.verifiedCommunities?.length > 0 ? user.verifiedCommunities[0] : undefined)) : undefined,
                location: sanitizedLocation
            });

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
        const limit = parseInt(searchParams.get('limit') || '24');
        const communityFilter = searchParams.get('communityFilter') || 'All';
        const cityFilter = searchParams.get('city');
        const skip = (page - 1) * limit;

        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        let blockedUserIds: string[] = [];

        const query: any = { status: { $in: ['Available', 'Rented'] } };

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
