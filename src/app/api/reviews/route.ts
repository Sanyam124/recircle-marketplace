import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Service from '@/models/Service';
import User from '@/models/User';
import Review from '@/models/Review';
import SiteSettings from '@/models/SiteSettings';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { targetId, orderId, productId, serviceId, rating, comment } = await req.json();

        if (!targetId || !rating || !comment) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectToDatabase();
        const settings = await SiteSettings.getSingleton();
        const maxChars = settings.maxReviewChars || 1000;

        if (comment.length > maxChars) {
            return NextResponse.json({ error: `Review comment must be ${maxChars} characters or less` }, { status: 400 });
        }
        const user = decoded as any;

        if (user.userId === targetId) {
            return NextResponse.json({ error: 'You cannot review yourself or your own listings.' }, { status: 403 });
        }

        // 1. Verify eligibility (MUST have a completed order matching exactly what they are reviewing)
        const query: any = { 
            $or: [
                { buyer: user.userId, seller: targetId },
                { buyer: targetId, seller: user.userId }
            ],
            status: 'Completed'
        };

        if (orderId && isValidObjectId(orderId)) {
            query._id = orderId;
        } else if (productId && isValidObjectId(productId)) {
            query.product = productId;
        } else if (serviceId && isValidObjectId(serviceId)) {
            query.service = serviceId;
        }

        const order = await Order.findOne(query);

        if (!order) {
            return NextResponse.json({ error: 'You are only eligible to leave a review if you have a verified, completed transaction exactly matching this item or seller.' }, { status: 403 });
        }

        // 2. Prevent duplicate reviews
        const duplicateQuery: any = { reviewer: user.userId };
        
        if (orderId && isValidObjectId(orderId)) {
            duplicateQuery.order = orderId;
        } else if (serviceId && isValidObjectId(serviceId)) {
            duplicateQuery.service = serviceId;
            duplicateQuery.target = targetId;
        } else if (productId && isValidObjectId(productId)) {
            duplicateQuery.product = productId;
            duplicateQuery.target = targetId;
        } else {
            // Global seller review check (must NOT have an item associated)
            duplicateQuery.target = targetId;
            duplicateQuery.service = { $exists: false };
            duplicateQuery.product = { $exists: false };
        }

        const existingReview = await Review.findOne(duplicateQuery);
        if (existingReview) {
            return NextResponse.json({ 
                error: `You have already reviewed this transaction/listing.` 
            }, { status: 409 });
        }

        const review = await Review.create({
            reviewer: user.userId,
            target: targetId,
            order: (orderId && isValidObjectId(orderId)) ? orderId : undefined,
            product: productId || undefined,
            service: serviceId || undefined,
            rating,
            comment
        });

        return NextResponse.json({ success: true, review }, { status: 201 });
    } catch (error: any) {
        console.error('Create Review Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get('targetId');
        const productId = searchParams.get('productId');
        const serviceId = searchParams.get('serviceId');
        const page = parseInt(searchParams.get('page') || '1');
        const requestedLimit = parseInt(searchParams.get('limit') || '5');
        const limit = Math.min(requestedLimit, 50);
        const skip = (page - 1) * limit;

        await connectToDatabase();

        // --- Visibility Hardening for Reviews ---
        if (productId || serviceId) {
            const item = productId 
                ? await Product.findById(productId).select('visibility community seller')
                : await Service.findById(serviceId).select('visibility community provider');
            
            if (item && item.visibility === 'Community') {
                const token = req.cookies.get('token')?.value;
                const decoded = token ? verifyToken(token) : null;
                let isAuthorized = false;

                if (decoded) {
                    const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
                    const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === item.community?.toString());
                    const ownerId = productId ? (item as any).seller : (item as any).provider;
                    const isOwner = decoded.userId === ownerId?.toString();
                    const isAdmin = currentUser?.role === 'admin';
                    isAuthorized = isMember || isOwner || isAdmin;
                }

                if (!isAuthorized) {
                    return NextResponse.json({ error: 'Reviews for this campus item are private.' }, { status: 403 });
                }
            }
        }

        // 1. Fetch Reviews
        const filter: any = {};
        if (targetId && isValidObjectId(targetId)) filter.target = targetId;
        if (productId && isValidObjectId(productId)) filter.product = productId;
        if (serviceId && isValidObjectId(serviceId)) filter.service = serviceId;

        const total = await Review.countDocuments(filter);
        const reviews = await Review.find(filter)
            .populate('reviewer', 'name profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 2. Aggregate Rating Summary
        const matchQuery: any = {};
        if (targetId && isValidObjectId(targetId)) matchQuery.target = new Types.ObjectId(targetId);
        if (productId && isValidObjectId(productId)) matchQuery.product = new Types.ObjectId(productId);
        if (serviceId && isValidObjectId(serviceId)) matchQuery.service = new Types.ObjectId(serviceId);

        const summaryStats = await Review.aggregate([
            { $match: matchQuery },
            { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const averageRating = summaryStats.length > 0 ? summaryStats[0].average : 0;
        const totalReviews = summaryStats.length > 0 ? summaryStats[0].count : 0;

        // 3. Score Distribution
        const distributionPipeline = await Review.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$rating', count: { $sum: 1 } } }
        ]);

        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalSum = 0;
        let totalCount = 0;

        distributionPipeline.forEach(d => {
            const r = d._id;
            const c = d.count;
            if (r >= 1 && r <= 5) {
                ratingCounts[r] = c;
                totalSum += r * c;
                totalCount += c;
            }
        });

        const avgScore = totalCount > 0 ? (totalSum / totalCount) : 0;
        const average = !isNaN(avgScore) ? Number(avgScore.toFixed(1)) : 0;
        const totalPages = Math.ceil(total / limit);

        // 4. Check Current User's Eligibility & Status (Drives the UI)
        let canReview = false;
        let hasReviewed = false;
        try {
            const token = req.cookies.get('token')?.value;
            const decoded = token ? verifyToken(token) : null;
            if (decoded) {
                const currentUserId = (decoded as any).userId;
                
                // If targetId is missing in query, try to infer it from the object if unique (usually passed by frontend anyway)
                if ((!targetId || targetId === 'undefined') && reviews.length > 0) {
                   // This is a fallback but frontend should always pass targetId
                }

                if (targetId && targetId !== 'undefined' && currentUserId !== targetId) {
                    // Eligibility: Completed order for this specific target/item (buyer or seller)
                    const eligibilityQuery: any = { 
                        $or: [
                            { buyer: currentUserId, seller: targetId },
                            { buyer: targetId, seller: currentUserId }
                        ],
                        status: 'Completed' 
                    };
                    if (serviceId) eligibilityQuery.service = serviceId;
                    else if (productId) eligibilityQuery.product = productId;

                    const [completedOrder, existingUserReview] = await Promise.all([
                        Order.findOne(eligibilityQuery).select('_id').lean(),
                        Review.findOne({ reviewer: currentUserId, ...filter }).select('_id').lean()
                    ]);

                    canReview = !!completedOrder;
                    hasReviewed = !!existingUserReview;
                }
            }
        } catch (e) {
            console.error("Review Meta Check Error:", e);
        }

        return NextResponse.json({
            reviews,
            canReview,
            hasReviewed,
            stats: {
                averageRating: Number(average),
                totalReviews,
                distribution: ratingCounts
            },
            pagination: {
                total,
                page,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (error: any) {
        console.error('Fetch Reviews Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
