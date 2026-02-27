import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
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
        let wishlist: any[] = [];

        if (type === 'service' || type === 'all') {
            const servicePopulate = {
                path: 'wishlistedServices',
                select: 'title price priceUnit images category provider createdAt status',
                populate: { path: 'provider', select: 'name' }
            };
            const userWithServices = await User.findById(userData.userId).populate(servicePopulate);
            const services = (userWithServices?.wishlistedServices || [])
                .filter((s: any) => s != null)
                .map((s: any) => ({ ...s.toObject(), type: 'service' }));
            wishlist = [...wishlist, ...services];
        }

        if (type === 'product' || type === 'all') {
            const productPopulate = {
                path: 'wishlist',
                select: 'title price images category condition seller createdAt status',
                populate: { path: 'seller', select: 'name' }
            };
            const userWithProducts = await User.findById(userData.userId).populate(productPopulate);
            const products = (userWithProducts?.wishlist || [])
                .filter((p: any) => p != null)
                .map((p: any) => ({ ...p.toObject(), type: 'product' }));
            wishlist = [...wishlist, ...products];
        }

        // Sort by createdAt descending if we have multiple types
        if (type === 'all') {
            wishlist.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        const totalItems = wishlist.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginated = wishlist.slice(skip, skip + limit);

        return NextResponse.json({
            wishlist: paginated,
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
