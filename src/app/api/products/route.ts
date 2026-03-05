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
        const { title: rawTitle, description: rawDescription, price: rawPrice, category: rawCategory, condition, images } = body;
        const title = rawTitle?.trim();
        const description = rawDescription?.trim();
        const category = rawCategory?.trim();
        const price = Math.round(rawPrice);

        if (!title || !description || !price || !category || !condition) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (title.length > 80) return NextResponse.json({ error: 'Title must be 80 characters or less' }, { status: 400 });
        if (description.length > 2000) return NextResponse.json({ error: 'Description must be 2000 characters or less' }, { status: 400 });

        // For MVP, assuming images are sent as base64 strings or URLs. 
        // In a real app, you might upload on client and send URLs, or upload here.
        // We'll handle base64 uploads here if provided.
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
                    imageUrls.push(img); // Assume it's already a URL
                }
            }
        }

        const product = await Product.create({
            seller: user.userId,
            title,
            description,
            price,
            category,
            condition,
            images: imageUrls,
            status: 'Available',
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
        const limit = parseInt(searchParams.get('limit') || '12');
        const skip = (page - 1) * limit;

        const query: any = { status: 'Available' };

        // [VACATION MODE] Hide listings from users who are on vacation
        // Only apply if we are not looking for a specific seller's items
        if (!seller) {
            const vacationUsers = await User.find({ isOnVacation: true }).select('_id');
            if (vacationUsers.length > 0) {
                const vacationIds = vacationUsers.map(u => u._id);
                query.seller = { $nin: vacationIds };
            }
        }

        if (category) {
            query.category = category;
        }

        if (seller) {
            query.seller = seller;
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
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        // Optimize: Aggregate ratings for all sellers in one grouped database query (Eliminate N+1 Leak)
        const sellerIds = products.map((p: any) => p.seller._id);
        const reviews = await Review.aggregate([
            { $match: { target: { $in: sellerIds } } },
            { $group: { _id: '$target', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const reviewMap = new Map(reviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const productsWithRatings = products.map((product: any) => {
            const stats = reviewMap.get(product.seller._id.toString()) || { average: 0, count: 0 };
            return {
                ...product.toObject(),
                sellerRating: stats.average,
                reviewCount: stats.count
            };
        });

        // In-memory sort if sorting by rating
        if (sort === 'rating') {
            productsWithRatings.sort((a, b) => b.sellerRating - a.sellerRating);
        }

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
