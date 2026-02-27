import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Service from '@/models/Service';
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
        const { title, description, price, priceUnit, category, availability, images } = body;

        if (!title || !description || !price || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

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
        const skip = (page - 1) * limit;

        const query: any = { status: 'Active' };

        if (category) {
            query.category = category;
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
            .sort(Object.keys(dbSort).length > 0 ? dbSort : { createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit);

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
                ...service.toObject(),
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
