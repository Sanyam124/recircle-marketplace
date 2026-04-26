import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userData = verifyToken(token);
        if (!userData) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const requestedLimit = parseInt(searchParams.get('limit') || '12');
        const limit = Math.min(requestedLimit, 50);
        const type = searchParams.get('type') || 'all'; // Default to 'all' to show both on wishlist page
        const skip = (page - 1) * limit;

        await connectToDatabase();
        
        // Fetch user with raw ID arrays (NO populate)
        const user = await User.findById(userData.userId)
            .select('wishlist wishlistedServices')
            .lean();

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const itemIdsWithTypes: { id: string; type: 'product' | 'service' }[] = [];

        // Collect all related IDs
        if (type === 'product' || type === 'all') {
            const list = Array.isArray(user.wishlist) ? user.wishlist : [];
            list.forEach((id: any) => {
                if (id) itemIdsWithTypes.push({ id: id.toString(), type: 'product' });
            });
        }
        if (type === 'service' || type === 'all') {
            const list = Array.isArray(user.wishlistedServices) ? user.wishlistedServices : [];
            list.forEach((id: any) => {
                if (id) itemIdsWithTypes.push({ id: id.toString(), type: 'service' });
            });
        }

        const totalItems = itemIdsWithTypes.length;
        const totalPages = Math.ceil(totalItems / limit);

        // Standard Reverse Chronological behavior: Newest added first
        // Since we insert at end of array, we reverse manually here
        itemIdsWithTypes.reverse();

        // Slice IDs for pagination BEFORE populating
        const paginatedIdsWithTypes = itemIdsWithTypes.slice(skip, skip + limit);

        const productIds = paginatedIdsWithTypes.filter(i => i.type === 'product').map(i => i.id);
        const serviceIds = paginatedIdsWithTypes.filter(i => i.type === 'service').map(i => i.id);

        // --- Visibility Hardening for Wishlist Fetch ---
        const viewerUser = await User.findById(userData.userId).select('verifiedCommunities role').lean();
        const allowedCommunities = (viewerUser as any)?.verifiedCommunities?.map((c: any) => c.toString()) || [];
        const isAdmin = (viewerUser as any)?.role === 'admin';

        const [products, services] = await Promise.all([
            Product.find({ _id: { $in: productIds } })
                .populate('seller', 'name profilePicture')
                .populate('community', 'name')
                .lean(),
            Service.find({ _id: { $in: serviceIds } })
                .populate('provider', 'name profilePicture')
                .populate('community', 'name')
                .lean()
        ]);

        // Filter out items the user no longer has access to
        const filteredProducts = products.filter(p => {
            if (p.visibility !== 'Community') return true;
            if (isAdmin) return true;
            if (p.seller?._id?.toString() === userData.userId) return true;
            return allowedCommunities.includes(p.community?._id?.toString());
        });

        const filteredServices = services.filter(s => {
            if (s.visibility !== 'Community') return true;
            if (isAdmin) return true;
            if (s.provider?._id?.toString() === userData.userId) return true;
            return allowedCommunities.includes(s.community?._id?.toString());
        });

        // Map back to maintain the reversed order
        const paginatedItems: any[] = [];
        const orphanedProductIds: string[] = [];
        const orphanedServiceIds: string[] = [];

        paginatedIdsWithTypes.forEach(ref => {
            if (ref.type === 'product') {
                const p = filteredProducts.find(p => p._id.toString() === ref.id);
                if (p) paginatedItems.push({ ...p, itemType: 'product' });
                else orphanedProductIds.push(ref.id);
            } else {
                const s = filteredServices.find(s => s._id.toString() === ref.id);
                if (s) paginatedItems.push({ ...s, itemType: 'service' });
                else orphanedServiceIds.push(ref.id);
            }
        });

        // BACKGROUND CLEANUP: "Lazy Garbage Collection"
        // Remove dead references from the user's wishlist arrays so they don't grow with 'zombie' IDs
        if (orphanedProductIds.length > 0 || orphanedServiceIds.length > 0) {
            const pullData: any = {};
            if (orphanedProductIds.length > 0) pullData.wishlist = { $in: orphanedProductIds };
            if (orphanedServiceIds.length > 0) pullData.wishlistedServices = { $in: orphanedServiceIds };
            
            User.findByIdAndUpdate(userData.userId, { $pull: pullData }).catch(e => 
                console.error('Lazy Wishlist Cleanup Failed:', e)
            );
        }

        // Fetch ratings for paginated items
        const ownerIds = paginatedItems.map((item: any) => 
            item.itemType === 'product' ? item.seller?._id : item.provider?._id
        ).filter((id: any) => id != null);
        const itemIds = paginatedItems.map((item: any) => item._id);

        const [ownerReviews, itemReviews] = await Promise.all([
            Review.aggregate([
                { $match: { target: { $in: ownerIds } } },
                { $group: { _id: { target: '$target', reviewer: '$reviewer' }, reviewerAvgRating: { $avg: '$rating' } } },
                { $group: { _id: '$_id.target', average: { $avg: '$reviewerAvgRating' }, count: { $sum: 1 } } }
            ]),
            Review.aggregate([
                { $match: { $or: [{ product: { $in: itemIds } }, { service: { $in: itemIds } }] } },
                { $group: { _id: { $ifNull: ['$product', '$service'] }, average: { $avg: '$rating' }, count: { $sum: 1 } } }
            ])
        ]);

        const ownerReviewMap = new Map(ownerReviews.map((r: any) => [r._id.toString(), { average: r.average, count: r.count } ]));
        const itemReviewMap = new Map(itemReviews.map((r: any) => [r._id.toString(), { average: r.average, count: r.count } ]));

        const wishlistWithRatings = paginatedItems.map((item: any) => {
            const ownerId = item.itemType === 'product' ? item.seller?._id?.toString() : item.provider?._id?.toString();
            const ownerStats = ownerReviewMap.get(ownerId) || { average: 0, count: 0 };
            const itemStats = itemReviewMap.get(item._id.toString()) || { average: 0, count: 0 };
            
            return {
                ...item,
                sellerTrustRating: ownerStats.average,
                sellerTrustCount: ownerStats.count,
                itemSpecificRating: itemStats.average,
                itemSpecificCount: itemStats.count,
                // Legacy fields for insurance
                ownerRating: ownerStats.average,
                providerRating: ownerStats.average,
                serviceRating: itemStats.average,
                itemRating: itemStats.average,
                reviewCount: item.forRent ? itemStats.count : ownerStats.count
            };
        });

        return NextResponse.json({
            wishlist: wishlistWithRatings,
            pagination: { currentPage: page, totalPages, totalItems, hasMore: page < totalPages }
        }, { status: 200 });
    } catch (error: any) {
        console.error('Fetch Wishlist Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userData = verifyToken(token);
        if (!userData) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        const { productId, serviceId } = await req.json();

        // --- ANTI-WISHLIST SPAM SHIELD ---
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(userData.userId, 'wishlist-toggle', 30, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'You are updating your wishlist too quickly. Please slow down.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 10
                },
                { status: 429 }
            );
        }

        if (!productId && !serviceId) {
            return NextResponse.json({ error: 'Product ID or Service ID required' }, { status: 400 });
        }

        const user = await User.findById(userData.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        let isAdded = false;

        if (serviceId) {
            // --- Visibility Hardening for Wishlist Toggle ---
            const item = await Service.findById(serviceId).select('visibility community provider');
            if (item && item.visibility === 'Community') {
                const currentUser = await User.findById(userData.userId).select('verifiedCommunities role');
                const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === item.community?.toString());
                const isOwner = userData.userId === item.provider.toString();
                const isAdmin = currentUser?.role === 'admin';
                if (!isMember && !isOwner && !isAdmin) {
                    return NextResponse.json({ error: 'This listing is restricted to campus members.' }, { status: 403 });
                }
            }

            const list = user.wishlistedServices || [];
            const exists = list.some(id => id.toString() === serviceId.toString());

            if (exists) {
                await User.findByIdAndUpdate(userData.userId, {
                    $pull: { wishlistedServices: serviceId }
                });
                isAdded = false;
            } else {
                await User.findByIdAndUpdate(userData.userId, {
                    $addToSet: { wishlistedServices: serviceId }
                });
                isAdded = true;
            }
        } else if (productId) {
            // --- Visibility Hardening for Wishlist Toggle ---
            const item = await Product.findById(productId).select('visibility community seller');
            if (item && item.visibility === 'Community') {
                const currentUser = await User.findById(userData.userId).select('verifiedCommunities role');
                const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === item.community?.toString());
                const isOwner = userData.userId === item.seller.toString();
                const isAdmin = currentUser?.role === 'admin';
                if (!isMember && !isOwner && !isAdmin) {
                    return NextResponse.json({ error: 'This listing is restricted to campus members.' }, { status: 403 });
                }
            }

            const list = user.wishlist || [];
            const exists = list.some(id => id.toString() === productId.toString());

            if (exists) {
                await User.findByIdAndUpdate(userData.userId, {
                    $pull: { wishlist: productId }
                });
                isAdded = false;
            } else {
                await User.findByIdAndUpdate(userData.userId, {
                    $addToSet: { wishlist: productId }
                });
                isAdded = true;
            }
        }

        return NextResponse.json({ message: 'Success', isAdded }, { status: 200 });

    } catch (error: any) {
        console.error('Toggle Wishlist Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
