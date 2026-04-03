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
        const limit = parseInt(searchParams.get('limit') || '12');
        const type = searchParams.get('type') || 'all'; // Default to 'all' to show both on wishlist page
        const skip = (page - 1) * limit;

        await connectToDatabase();
        
        // Fetch user with raw ID arrays (NO populate)
        const user = await User.findById(userData.userId)
            .select('wishlist wishlistedServices')
            .lean();

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        let itemIdsWithTypes: { id: string; type: 'product' | 'service' }[] = [];

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

        // Map back to maintain the reversed order
        const paginatedItems = paginatedIdsWithTypes.map(ref => {
            if (ref.type === 'product') {
                const p = products.find(p => p._id.toString() === ref.id);
                return p ? { ...p, itemType: 'product' } : null;
            } else {
                const s = services.find(s => s._id.toString() === ref.id);
                return s ? { ...s, itemType: 'service' } : null;
            }
        }).filter(item => item !== null);

        // Fetch ratings for paginated items
        const ownerIds = paginatedItems.map((item: any) => 
            item.itemType === 'product' ? item.seller?._id : item.provider?._id
        ).filter((id: any) => id != null);

        const reviews = await Review.aggregate([
            { $match: { target: { $in: ownerIds } } },
            { $group: { _id: '$target', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const reviewMap = new Map(reviews.map((r: any) => [r._id.toString(), { average: r.average, count: r.count } ]));

        const wishlistWithRatings = paginatedItems.map((item: any) => {
            const ownerId = item.itemType === 'product' ? item.seller?._id?.toString() : item.provider?._id?.toString();
            const stats = reviewMap.get(ownerId) || { average: 0, count: 0 };
            return {
                ...item,
                ownerRating: stats.average || 0,
                reviewCount: stats.count || 0
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

        if (!productId && !serviceId) {
            return NextResponse.json({ error: 'Product ID or Service ID required' }, { status: 400 });
        }

        const user = await User.findById(userData.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        let isAdded = false;

        if (serviceId) {
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
