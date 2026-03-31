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
        const type = searchParams.get('type') || 'product'; // 'product' or 'service'
        const skip = (page - 1) * limit;

        await connectToDatabase();
        
        // Use a single user fetch for efficiency
        const user = await User.findById(userData.userId)
            .populate({
                path: 'wishlist',
                select: 'title price images category description condition seller createdAt status community visibility location',
                populate: [
                    { path: 'seller', select: 'name profilePicture' },
                    { path: 'community', select: 'name' }
                ],
                model: Product
            })
            .populate({
                path: 'wishlistedServices',
                select: 'title price priceUnit images category description provider createdAt status community visibility location availability',
                populate: [
                    { path: 'provider', select: 'name profilePicture' },
                    { path: 'community', select: 'name' }
                ],
                model: Service
            })
            .lean();

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        let allItems: any[] = [];

        if (type === 'product' || type === 'all') {
            const products = (user.wishlist || [])
                .filter((p: any) => p != null && typeof p === 'object')
                .map((p: any) => ({ ...p, itemType: 'product' }));
            allItems = [...allItems, ...products];
        }

        if (type === 'service' || type === 'all') {
            const services = (user.wishlistedServices || [])
                .filter((s: any) => s != null && typeof s === 'object')
                .map((s: any) => ({ ...s, itemType: 'service' }));
            allItems = [...allItems, ...services];
        }

        // Sort by createdAt descending
        allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const totalItems = allItems.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginated = allItems.slice(skip, skip + limit);

        // Fetch ratings for paginated items
        const ownerIds = paginated.map(item => 
            item.itemType === 'product' ? item.seller?._id : item.provider?._id
        ).filter(id => id != null);

        const reviews = await Review.aggregate([
            { $match: { target: { $in: ownerIds } } },
            { $group: { _id: '$target', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const reviewMap = new Map(reviews.map(r => [r._id.toString(), { average: r.average, count: r.count }]));

        const wishlistWithRatings = paginated.map(item => {
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
