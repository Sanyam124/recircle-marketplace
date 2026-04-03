import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();

        const { targetId, rating, comment: rawComment, orderId, productId, serviceId } = await req.json();
        const comment = rawComment?.trim();

        if (!targetId || !rating) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (user.userId === targetId) {
            return NextResponse.json({ error: 'Cannot review yourself' }, { status: 400 });
        }

        // 1. Verified Transaction Check — either party can review the other
        let query: any = {
            $or: [
                { buyer: user.userId },
                { seller: user.userId }
            ],
            status: 'Completed'
        };

        if (orderId) {
            query._id = orderId;
        } else if (productId) {
            query.product = productId;
        } else if (serviceId) {
            query.service = serviceId;
        } else {
            // General review: require at least one completed order involving both users
            query.$and = [
                { $or: [{ buyer: user.userId }, { seller: user.userId }] },
                { $or: [{ buyer: targetId }, { seller: targetId }] }
            ];
            delete query.$or;
        }

        const order = await Order.findOne(query);

        if (!order) {
            return NextResponse.json({
                error: 'Permission Denied. You can only review after a completed transaction for this item.'
            }, { status: 403 });
        }

        // 2. Prevent duplicate reviews for the same order/item combo
        const duplicateQuery: any = { reviewer: user.userId, target: targetId };
        if (orderId) duplicateQuery.order = orderId;
        else if (productId) duplicateQuery.product = productId;
        else if (serviceId) duplicateQuery.service = serviceId;

        const existingReview = await Review.findOne(duplicateQuery);
        if (existingReview) {
            return NextResponse.json({ error: 'You have already reviewed this purchase' }, { status: 400 });
        }

        const reviewData: any = {
            reviewer: user.userId,
            target: targetId,
            rating: Number(rating),
            comment,
            order: order._id,
            product: order.product,
            service: order.service
        };

        const review = await Review.create(reviewData);

        return NextResponse.json({ review }, { status: 201 });

    } catch (error: any) {
        console.error('Create Review Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get('targetId'); // Seller ID
        const productId = searchParams.get('productId');
        const serviceId = searchParams.get('serviceId');
        const ratingFilter = searchParams.get('rating');

        // TargetId is the shared key for seller profiles, but individual products can have their own reviews
        const query: any = {};
        if (targetId) query.target = targetId;
        if (productId) query.product = productId;
        if (serviceId) query.service = serviceId;

        if (Object.keys(query).length === 0) {
            return NextResponse.json({ error: 'Missing targetId, productId or serviceId' }, { status: 400 });
        }

        if (ratingFilter) {
            query.rating = parseInt(ratingFilter);
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '5');
        const skip = (page - 1) * limit;

        const totalReviews = await Review.countDocuments(query);
        const totalPages = Math.ceil(totalReviews / limit);

        const reviews = await Review.find(query)
            .populate('reviewer', 'name profilePicture gender')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Aggregate stats for the current scope (Seller, Product, or Service)
        const matchQuery: any = {};
        if (targetId) matchQuery.target = new mongoose.Types.ObjectId(targetId);
        if (productId) matchQuery.product = new mongoose.Types.ObjectId(productId);
        if (serviceId) matchQuery.service = new mongoose.Types.ObjectId(serviceId);

        const distributionPipeline = await Review.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$rating', count: { $sum: 1 } } }
        ]);

        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalSum = 0;
        let totalCount = 0;

        distributionPipeline.forEach(group => {
            const r = group._id;
            const c = group.count;
            if (r >= 1 && r <= 5) {
                ratingCounts[r] = c;
                totalSum += r * c;
                totalCount += c;
            }
        });

        const average = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;

        return NextResponse.json({
            reviews,
            average,
            count: totalCount,
            ratingCounts,
            pagination: {
                currentPage: page,
                totalPages,
                totalReviews,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Fetch Reviews Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
