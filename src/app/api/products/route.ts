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

        const body = await req.json();
        const { title: rawTitle, description: rawDescription, price: rawPrice, category: rawCategory, condition, images, visibility, communityId, location, forSell = true, forRent = false, rentPrice: rawRentPrice, rentUnit } = body;
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
        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    try {
                        const url = await uploadToCloudinary(img, 'recircle/products');
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
            community: communityId || (user.verifiedCommunities?.length > 0 ? user.verifiedCommunities[0] : undefined),
            location: visibility === 'Public' ? location : undefined
        });

        return NextResponse.json({ product }, { status: 201 });

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
             const currentUser = await User.findById(decoded.userId).select('blockedUsers verifiedCommunities').lean();
             if (currentUser && currentUser.blockedUsers) {
                  blockedUserIds = currentUser.blockedUsers.map((id: any) => id.toString());
             }

             if (communityFilter === 'Public') {
                 query.visibility = 'Public';
             } else if (communityFilter !== 'All' && communityFilter !== 'Public') {
                 query.community = communityFilter;
             } else {
                 const verifiedCommunityIds = (currentUser as any)?.verifiedCommunities || [];
                  query.$or = [
                      { visibility: 'Public' },
                      { visibility: { $exists: false } },
                      { visibility: 'Community', community: { $in: verifiedCommunityIds } }
                  ];
             }
        } else if (!seller) {
             query.$or = [
                 { visibility: 'Public' },
                 { visibility: { $exists: false } }
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
            .populate('community', 'name')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

        const sellerIds = products.map((p: any) => p.seller._id);
        const reviews = await Review.aggregate([
            { $match: { target: { $in: sellerIds } } },
            { $group: { _id: '$target', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const reviewMap = new Map(reviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const productsWithRatings = products.map((product: any) => {
            const stats = reviewMap.get(product.seller._id.toString()) || { average: 0, count: 0 };
            return {
                ...product,
                ownerRating: stats.average,
                reviewCount: stats.count
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
