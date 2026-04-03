import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Offer from '@/models/Offer';
import Product from '@/models/Product';
import Service from '@/models/Service';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// POST /api/offers — buyer makes an offer
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string };

        const { productId, serviceId, offeredPrice: rawPrice, message: rawMessage, offerType = 'Buy', rentDuration, rentUnit } = await req.json();
        const offeredPrice = Math.round(rawPrice);
        const message = rawMessage?.trim();

        if (!offeredPrice || (!productId && !serviceId)) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        let item: any = null;
        let sellerId: string;

        if (productId) {
            item = await Product.findById(productId);
            if (!item) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            if (item.status !== 'Available') {
                return NextResponse.json({ error: 'This product is no longer available.' }, { status: 400 });
            }
            if (item.seller.toString() === decoded.userId) {
                return NextResponse.json({ error: 'You cannot offer on your own listing' }, { status: 400 });
            }
            sellerId = item.seller.toString();
        } else {
            item = await Service.findById(serviceId);
            if (!item) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
            if (item.status !== 'Active') {
                return NextResponse.json({ error: 'This service is no longer active.' }, { status: 400 });
            }
            if (item.provider.toString() === decoded.userId) {
                return NextResponse.json({ error: 'You cannot offer on your own listing' }, { status: 400 });
            }
            sellerId = item.provider.toString();
        }

        // Price Validation
        if (offeredPrice <= 0) {
            return NextResponse.json({ error: 'Offer must be greater than 0' }, { status: 400 });
        }

        let basePrice = item.price;
        if (productId) {
            if (offerType === 'Rent') {
                if (!item.forRent) return NextResponse.json({ error: 'This item is not available for rent' }, { status: 400 });
                if (!rentDuration || !rentUnit) return NextResponse.json({ error: 'Rent duration and unit are required' }, { status: 400 });
                basePrice = item.rentPrice;
            } else {
                if (!item.forSell) return NextResponse.json({ error: 'This item is not available for sale' }, { status: 400 });
            }
        }

        if (offeredPrice < basePrice * 0.5) {
            return NextResponse.json({ error: `Offer must be at least 50% of listed price (₹${Math.floor(basePrice * 0.5)})` }, { status: 400 });
        }
        if (offeredPrice > basePrice * 2) {
            return NextResponse.json({ error: `Offer cannot exceed 200% of listed price (₹${basePrice * 2})` }, { status: 400 });
        }

        // Atomically decline existing pending offer from same buyer to prevent race conditions
        await Offer.findOneAndUpdate(
            {
                buyer: decoded.userId,
                ...(productId ? { product: productId } : { service: serviceId }),
                status: 'Pending',
            },
            { $set: { status: 'Declined' } }
        );

        const offer = await Offer.create({
            buyer: decoded.userId,
            seller: sellerId,
            ...(productId ? { product: productId } : { service: serviceId }),
            offerType,
            rentDuration: offerType === 'Rent' ? rentDuration : undefined,
            rentUnit: offerType === 'Rent' ? rentUnit : undefined,
            offeredPrice,
            originalPrice: productId ? (offerType === 'Rent' ? item.rentPrice : item.price) : item.price,
            message,
        });

        return NextResponse.json({ offer }, { status: 201 });
    } catch (err) {
        console.error('Offer POST error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// GET /api/offers — seller fetches their incoming pending offers
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string };

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const type = searchParams.get('type');
        const skip = (page - 1) * limit;

        const query: any = { seller: decoded.userId, status: 'Pending' };
        if (type === 'product') query.product = { $exists: true };
        if (type === 'service') query.service = { $exists: true };

        const totalOffers = await Offer.countDocuments(query);
        const totalPages = Math.ceil(totalOffers / limit);

        const offers = await Offer.find(query)
            .populate('buyer', 'name username profilePicture')
            .populate('product', 'title images price')
            .populate('service', 'title images price priceUnit')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return NextResponse.json({
            offers,
            pagination: { currentPage: page, totalPages, totalOffers, hasMore: page < totalPages }
        });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
