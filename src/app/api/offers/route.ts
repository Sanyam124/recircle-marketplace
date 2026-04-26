import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Offer from '@/models/Offer';
import Product from '@/models/Product';
import Service from '@/models/Service';
import User from '@/models/User';
import Community from '@/models/Community';
import SiteSettings from '@/models/SiteSettings';
import { verifyToken } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// POST /api/offers — buyer makes an offer
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string };

        const user = await User.findById(decoded.userId).select('status').lean();
        if (user?.status === 'Banned') {
            return NextResponse.json({ error: 'Your account is banned. You cannot make offers.' }, { status: 403 });
        }

        const body = await req.json();
        const { productId, serviceId, offeredPrice: rawPrice, message: rawMessage, offerType = 'Buy', rentDuration, rentUnit } = body;
        const offeredPrice = Math.round(rawPrice);
        const message = rawMessage?.trim();

        if (!offeredPrice || (!productId && !serviceId)) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // --- 0. MAINTENANCE CHECK (The Hole Fix) ---
        const itemId = productId || serviceId;
        const Model: any = productId ? Product : Service;
        const itemForMaintenance = await Model.findById(itemId).select('community').lean();
        
        if (itemForMaintenance?.community) {
            const comm = await Community.findById(itemForMaintenance.community).select('isActive name').lean();
            if (comm && !comm.isActive) {
                return NextResponse.json({ 
                    error: `The ${comm.name} circle is currently in maintenance mode. New offers are temporarily disabled.` 
                }, { status: 503 });
            }
        }

        // --- ANTI-OFFER SPAM SHIELD ---
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(decoded.userId, 'offer-create', 5, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'You are submitting offers too quickly. Please wait a minute.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 60
                },
                { status: 429 }
            );
        }

        let item: any = null;
        let sellerId: string;

        if (productId) {
            item = await Product.findById(productId);
            if (!item) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            
            // --- Visibility Hardening ---
            if (item.visibility === 'Community') {
                const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
                const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === item.community?.toString());
                const isOwner = decoded.userId === item.seller.toString();
                const isAdmin = currentUser?.role === 'admin';
                if (!isMember && !isOwner && !isAdmin) {
                    return NextResponse.json({ error: 'This listing is restricted to campus members.' }, { status: 403 });
                }
            }

            if (item.status !== 'Available' && item.status !== 'Rented') {
                return NextResponse.json({ error: `This product is currently ${item.status}.` }, { status: 400 });
            }
            if (item.seller.toString() === decoded.userId) {
                return NextResponse.json({ error: 'You cannot offer on your own listing' }, { status: 400 });
            }
            sellerId = item.seller.toString();
        } else {
            item = await Service.findById(serviceId);
            if (!item) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
            
            // --- Visibility Hardening ---
            if (item.visibility === 'Community') {
                const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
                const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === item.community?.toString());
                const isOwner = decoded.userId === item.provider.toString();
                const isAdmin = currentUser?.role === 'admin';
                if (!isMember && !isOwner && !isAdmin) {
                    return NextResponse.json({ error: 'This service is restricted to campus members.' }, { status: 403 });
                }
            }

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

        const settings = await SiteSettings.getSingleton();
        const maxChars = settings.maxOfferMessageChars || 300;

        if (message && message.length > maxChars) {
            return NextResponse.json({ error: `Message must be ${maxChars} characters or less` }, { status: 400 });
        }

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

        // Notify Seller
        try {
            const bidder = await User.findById(decoded.userId).select('name username').lean();
            await createNotification({
                recipient: sellerId,
                sender: decoded.userId,
                type: 'OFFER_RECEIVED',
                message: `${bidder?.name || bidder?.username || 'A buyer'} made an offer of ₹${offeredPrice} on "${item.title}"`,
                link: `/chat/${bidder?._id}?${productId ? `productId=${productId}` : `serviceId=${serviceId}`}`,
                metadata: {
                    offerId: offer._id.toString(),
                    offeredPrice,
                    itemTitle: item.title,
                    itemId: (productId || serviceId).toString(),
                    itemType: productId ? 'product' : 'service'
                }
            });
        } catch (notifErr) {
            console.error('Failed to notify seller of offer:', notifErr);
        }

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
        const requestedLimit = parseInt(searchParams.get('limit') || '10');
        const limit = Math.min(requestedLimit, 50);
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
