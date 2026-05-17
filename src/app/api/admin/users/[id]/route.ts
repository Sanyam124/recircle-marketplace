import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';

async function isAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;
    const decoded = verifyToken(token);
    if (!decoded) return false;
    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user?.role === 'admin';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const requestedLimit = parseInt(searchParams.get('limit') || '8');
        const limit = Math.min(requestedLimit, 50);
        const productPage = parseInt(searchParams.get('productPage') || '1');
        const servicePage = parseInt(searchParams.get('servicePage') || '1');
        const productSkip = (productPage - 1) * limit;
        const serviceSkip = (servicePage - 1) * limit;

        await connectToDatabase();

        const user = await User.findById(id).select('-password -otp -otpExpiry');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Products: count Available + Sold separately; admin sees ALL
        const [totalProductsAvailable, totalProductsSold] = await Promise.all([
            Product.countDocuments({ seller: id, status: 'Available' }),
            Product.countDocuments({ seller: id, status: { $ne: 'Available' } }),
        ]);
        const totalProducts = totalProductsAvailable + totalProductsSold;
        const products = await Product.find({ seller: id })
            .sort({ createdAt: -1 })
            .skip(productSkip)
            .limit(limit);

        // Services: total count + enrollment count (service orders)
        const [totalServices, totalEnrollments] = await Promise.all([
            Service.countDocuments({ provider: id }),
            Order.countDocuments({ seller: id, orderType: 'Service_Appointment' }),
        ]);
        const services = await Service.find({ provider: id })
            .sort({ createdAt: -1 })
            .skip(serviceSkip)
            .limit(limit);

        // Reviews: always use countDocuments for accuracy; fetch ratings for avg
        const [totalReviews, allReviewsForRating] = await Promise.all([
            Review.countDocuments({ target: id }),
            Review.find({ target: id }).select('rating'),
        ]);
        const rating = allReviewsForRating.length > 0
            ? allReviewsForRating.reduce((acc, r) => acc + r.rating, 0) / allReviewsForRating.length
            : 0;
        const reviews = await Review.find({ target: id })
            .populate('reviewer', 'name profilePicture')
            .sort({ createdAt: -1 })
            .limit(20);

        return NextResponse.json({
            user,
            products,
            services,
            reviews,
            pagination: {
                products: {
                    currentPage: productPage,
                    totalPages: Math.ceil(totalProducts / limit),
                    totalItems: totalProducts,
                },
                services: {
                    currentPage: servicePage,
                    totalPages: Math.ceil(totalServices / limit),
                    totalItems: totalServices,
                },
            },
            stats: {
                totalProducts,
                totalProductsAvailable,
                totalProductsSold,
                totalServices,
                totalEnrollments,
                totalReviews,
                rating: rating.toFixed(1),
            },
        }, { status: 200 });

    } catch (error) {
        console.error('Admin User Detail Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        await connectToDatabase();

        const user = await User.findById(id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const allowedFields = [
            'name', 'username', 'email', 'phone', 'isPhoneVerified', 'isVerified',
            'isOnVacation', 'showOnlineStatus', 'compactView', 'notifyOffers', 'notifyMessages',
            'bio', 'state', 'city', 'landmark', 'status'
        ];

        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                (user as any)[field] = body[field];
            }
        });

        if (body.status === 'Banned' && body.banDays) {
            user.bannedUntil = new Date(Date.now() + Number(body.banDays) * 24 * 60 * 60 * 1000);
        } else if (body.status === 'Active') {
            user.bannedUntil = null as any;
        }

        await user.save();

        return NextResponse.json({ success: true, user }, { status: 200 });
    } catch (error: any) {
        console.error('Admin User Detail Update PUT Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
