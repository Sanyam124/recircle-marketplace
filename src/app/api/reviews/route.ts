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

        const { targetId, rating, comment } = await req.json();

        if (!targetId || !rating) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (user.userId === targetId) {
            return NextResponse.json({ error: 'Cannot review yourself' }, { status: 400 });
        }

        // 1. Verified Buyer Check
        // User must have bought something from 'targetId' (Seller) OR been served by 'targetId' (Partner)
        // AND the order must be 'Delivered' (Products) or 'Completed' (Services)
        const hasVerifiedTransaction = await Order.findOne({
            buyer: user.userId,
            status: 'Completed',
            $or: [
                { seller: targetId },
                { deliveryPartner: targetId }
            ]
        });

        if (!hasVerifiedTransaction) {
            return NextResponse.json({
                error: 'Permission Denied. You can only review users after a completed verified transaction (Order Delivered or Service Completed).'
            }, { status: 403 });
        }

        // 2. Check if already reviewed
        const existingReview = await Review.findOne({ reviewer: user.userId, target: targetId });
        if (existingReview) {
            return NextResponse.json({ error: 'You have already reviewed this user' }, { status: 400 });
        }

        const review = await Review.create({
            reviewer: user.userId,
            target: targetId,
            rating: Number(rating),
            comment
        });

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
        const targetId = searchParams.get('targetId');
        const ratingFilter = searchParams.get('rating'); // New parameter for filtering by specific star rating

        if (!targetId) {
            return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
        }

        let canReview = false;
        const token = req.cookies.get('token')?.value;
        if (token) {
            const user = verifyToken(token);
            if (user && user.userId !== targetId) {
                const hasVerifiedTransaction = await Order.findOne({
                    buyer: user.userId,
                    status: 'Completed',
                    $or: [
                        { seller: targetId },
                        { deliveryPartner: targetId }
                    ]
                });
                if (hasVerifiedTransaction) {
                    canReview = true;
                }
            }
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '5');
        const skip = (page - 1) * limit;

        // Build the query and add rating filter if present
        const query: any = { target: targetId };
        if (ratingFilter) {
            query.rating = parseInt(ratingFilter);
        }

        const totalReviews = await Review.countDocuments(query);
        const totalPages = Math.ceil(totalReviews / limit);

        const reviews = await Review.find(query)
            .populate('reviewer', 'name profilePicture gender')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Calculate distribution and average (from ALL reviews, regardless of active filter)
        const distributionPipeline = await Review.aggregate([
            { $match: { target: new mongoose.Types.ObjectId(targetId) } }, // Match all target reviews
            { $group: { _id: '$rating', count: { $sum: 1 } } }
        ]);

        // Transform [ { _id: 5, count: 2 } ] -> { "5": 2, "4": 0, ... }
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
            count: totalCount, // Total across all ratings (for stats UI)
            ratingCounts,      // {1: x, 2: y, 3: z, 4: a, 5: b} for Progress Bars
            canReview,
            pagination: {
                currentPage: page,
                totalPages,
                totalReviews,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
