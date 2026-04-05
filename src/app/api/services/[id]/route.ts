import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Service from '@/models/Service';
import User from '@/models/User';
import Order from '@/models/Order';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const service = await Service.findById(id).populate('provider', 'name username profilePicture email').populate('community', 'name');

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // Block access if a user relationship is blocked
        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        if (decoded && service.provider) {
            const currentUserId = decoded.userId;
            const providerId = service.provider._id.toString();

            if (currentUserId !== providerId) {
                const providerUser = await User.findById(providerId).select('blockedUsers');
                const isBlockedByOther = providerUser?.blockedUsers?.some((id: any) => id.toString() === currentUserId);

                if (isBlockedByOther) {
                    return NextResponse.json({ error: 'Access denied due to privacy settings (blocked user).' }, { status: 403 });
                }
            }
        }

        // Check for buyerId ONLY if there's an ACTIVE order (not completed)
        let buyerId = null;
        const lastOrder = await Order.findOne({
            service: id,
            status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] }
        }).select('buyer').sort({ createdAt: -1 });
        buyerId = lastOrder?.buyer;

        // Fetch Provider Review Stats
        const reviewStats = await Review.aggregate([
            { $match: { target: service.provider._id } },
            { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const averageRating = reviewStats.length > 0 ? Number(reviewStats[0].average.toFixed(1)) : 0;
        const reviewCount = reviewStats.length > 0 ? reviewStats[0].count : 0;

        return NextResponse.json({
            service: {
                ...service.toObject(),
                averageRating,
                reviewCount
            },
            buyerId
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        const { id } = await params;

        const service = await Service.findById(id);

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        if (service.provider.toString() !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- DELETION GUARD ---
        // Check for active orders (Paid, Scheduled, Dispute_Pending)
        const activeOrder = await Order.findOne({
            service: id,
            status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] }
        });

        if (activeOrder) {
            return NextResponse.json({
                error: 'Cannot delete service with active appointments. Please complete or refund existing bookings first.'
            }, { status: 400 });
        }
        
        // --- DELETION GUARD (REPORTS) ---
        const Report = (await import('@/models/Report')).default;
        const activeReport = await Report.findOne({ itemId: id, itemType: 'service', status: 'Pending' });
        if (activeReport) {
            return NextResponse.json({
                error: 'Cannot delete this service because it has been reported and is currently under review by moderation.'
            }, { status: 400 });
        }
        
        // Cascade: Decline all pending offers and update their message bubbles
        const Offer = (await import('@/models/Offer')).default;
        const Message = (await import('@/models/Message')).default;
        const pendingOffers = await Offer.find({ service: id, status: 'Pending' }).select('_id');
        if (pendingOffers.length > 0) {
            const offerIds = pendingOffers.map(o => o._id);
            await Offer.updateMany({ _id: { $in: offerIds } }, { $set: { status: 'Declined' } });
            await Message.updateMany({ 'offer.offerId': { $in: offerIds } }, { $set: { 'offer.status': 'Declined' } });
        }

        // DB Delete First
        await Service.findByIdAndDelete(id);

        // Cleanup Cloudinary Storage after DB delete
        if (service.images && service.images.length > 0) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                for (const img of service.images) {
                    await deleteFromCloudinary(img).catch(() => null);
                }
            } catch(e) {
                console.error("Cloudinary cleanup failed after service deletion", e);
            }
        }

        return NextResponse.json({ message: 'Service deleted' }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        const { id } = await params;
        const body = await req.json();

        let service = await Service.findById(id);
        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // Only the provider can update their own service
        if (service.provider.toString() !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Hardening: Prevents hiding a service that has active bookings/disputes
        if (body.status && ['Active', 'Inactive'].includes(body.status)) {
            const Order = (await import('@/models/Order')).default;
            const activeOrder = await Order.findOne({
                service: id,
                status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] }
            });

            if (activeOrder) {
                return NextResponse.json({ error: 'Cannot hide a service with active appointments or disputes.' }, { status: 400 });
            }
            service.status = body.status;
        }

        // Add more fields here in the future if users need to edit Titles/Prices.
        // Currently, we only need to support the the `status` toggle.
        await service.save();

        return NextResponse.json({ message: 'Service updated', service }, { status: 200 });

    } catch (error: any) {
        console.error("PUT /api/services/[id] Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
