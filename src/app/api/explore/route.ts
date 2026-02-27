import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const targetId = searchParams.get('targetId'); // If filtering by specific owner
        const type = searchParams.get('type') || 'all'; // 'all', 'products', 'services'

        if (targetId && !mongoose.Types.ObjectId.isValid(targetId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }
        const sort = searchParams.get('sort') || 'newest';
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const categories = searchParams.getAll('categories[]');
        const conditions = searchParams.getAll('conditions[]');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');

        const skip = (page - 1) * limit;

        // Base Queries
        const productQuery: any = { status: 'Available' };
        const serviceQuery: any = { status: 'Active' };

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
                    return [
                        { title: { $regex: coreTerm, $options: 'i' } },
                        { description: { $regex: coreTerm, $options: 'i' } },
                        { category: { $regex: coreTerm, $options: 'i' } }
                    ];
                });
                productQuery.$or = orGroup;
                serviceQuery.$or = orGroup;
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

        // Fetch Results using Aggregation for unified sorting/pagination
        const pipeline: any[] = [];

        // 1. Build Product match
        pipeline.push({ $match: productQuery });
        pipeline.push({ $addFields: { itemType: 'product' } });

        // 2. Union with Services
        if (type === 'all' || type === 'services') {
            const serviceMatch = { ...serviceQuery };
            const serviceUnion: any = {
                coll: 'services',
                pipeline: [
                    { $match: serviceMatch },
                    { $addFields: { itemType: 'service', seller: '$provider' } }
                ]
            };

            if (type === 'services') {
                // If only services, we swap the start
                // (Easier to just use Product as base and empty the match if type is services only)
                pipeline.length = 0;
                pipeline.push({ $match: serviceMatch });
                pipeline.push({ $addFields: { itemType: 'service' } });
            } else {
                pipeline.push({ $unionWith: serviceUnion });
            }
        }

        // 3. Normalize fields after union
        pipeline.push({
            $project: {
                title: 1,
                price: 1,
                images: 1,
                category: 1,
                condition: 1,
                status: 1,
                itemType: 1,
                createdAt: 1,
                priceUnit: 1,
                seller: { $ifNull: ['$seller', '$provider'] },
                provider: 1
            }
        });

        // 4. Global Sort
        const sortStage: any = {};
        if (sort === 'rating') {
            // Rating needs calculated ownerRating (from a different collection)
            // We'll handle rating sort by joining reviews in aggregation
        } else if (sort === 'price_asc') {
            sortStage.price = 1;
        } else if (sort === 'price_desc') {
            sortStage.price = -1;
        } else {
            sortStage.createdAt = -1;
            sortStage._id = -1;
        }

        if (Object.keys(sortStage).length > 0) {
            pipeline.push({ $sort: sortStage });
        }

        // 5. Lookup Ratings (Avoid N+1)
        pipeline.push({
            $lookup: {
                from: 'reviews',
                localField: 'seller',
                foreignField: 'target',
                as: 'ownerReviews'
            }
        });
        pipeline.push({
            $addFields: {
                ownerRating: { $avg: '$ownerReviews.rating' },
                reviewCount: { $size: '$ownerReviews' }
            }
        });
        pipeline.push({ $project: { ownerReviews: 0 } });

        // Final sort if it was rating-based
        if (sort === 'rating') {
            pipeline.push({ $sort: { ownerRating: -1, createdAt: -1 } });
        }

        // 6. Pagination count and slice
        const countPipeline = [...pipeline, { $count: 'total' }];
        const resultsPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

        // Populate seller/provider info
        resultsPipeline.push({
            $lookup: {
                from: 'users',
                localField: 'seller',
                foreignField: '_id',
                as: 'sellerObj'
            }
        });
        resultsPipeline.push({
            $unwind: { path: '$sellerObj', preserveNullAndEmptyArrays: true }
        });
        resultsPipeline.push({
            $addFields: {
                seller: {
                    _id: '$sellerObj._id',
                    name: '$sellerObj.name',
                    profilePicture: '$sellerObj.profilePicture'
                },
                provider: {
                    _id: '$sellerObj._id',
                    name: '$sellerObj.name',
                    profilePicture: '$sellerObj.profilePicture'
                }
            }
        });
        resultsPipeline.push({ $project: { sellerObj: 0 } });

        const [totalRes, results] = await Promise.all([
            Product.aggregate(countPipeline),
            Product.aggregate(resultsPipeline)
        ]);

        const totalItems = totalRes[0]?.total || 0;
        const totalPages = Math.ceil(totalItems / limit);

        return NextResponse.json({
            items: results,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Explore API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
