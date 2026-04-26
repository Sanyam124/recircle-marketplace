import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import Service from '@/models/Service';
import User from '@/models/User';
import Order from '@/models/Order';
import Review from '@/models/Review';
import Community from '@/models/Community';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid Service ID' }, { status: 400 });
        }

        const service = await Service.findById(id).populate('provider', 'name username profilePicture email').populate('community', 'name isActive');

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) as { userId: string, role: string } : null;

        // --- Maintenance Mode Check ---
        if (service.community && !(service.community as any).isActive) {
            const isAdmin = decoded?.role === 'admin';
            const isOwner = decoded?.userId === service.provider._id.toString();
            
            if (!isAdmin && !isOwner) {
                return NextResponse.json({ 
                    error: `This circle (${(service.community as any).name}) is currently under maintenance. Services from this campus are temporarily hidden.`,
                    maintenance: true 
                }, { status: 503 });
            }
        }

        // --- Community Visibility Hardening ---
        if (service.visibility === 'Community' && service.community) {
            const communityObj = service.community as any;
            const isOwner = decoded?.userId === service.provider._id.toString();
            let isMember = false;
            let isAdmin = false;

            if (decoded?.userId) {
                const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
                isMember = !!(currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === communityObj._id.toString()));
                isAdmin = currentUser?.role === 'admin';
            }

            if (!isOwner && !isMember && !isAdmin) {
                return NextResponse.json({ 
                    error: 'This service is exclusive to verified campus community members.',
                    restricted: true 
                }, { status: 403 });
            }
        }

        // Block access if a user relationship is blocked
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

        // 1. Fetch Provider Trust Stats (Unique Reviewer Compressed)
        const providerTrustStats = await Review.aggregate([
            { $match: { target: service.provider._id, rating: { $exists: true, $ne: null } } },
            { $group: { _id: { target: '$target', reviewer: '$reviewer' }, reviewerAvgRating: { $avg: '$rating' } } },
            { $group: { _id: '$_id.target', average: { $avg: '$reviewerAvgRating' }, count: { $sum: 1 } } }
        ]);

        // 2. Fetch Listing-Specific Stats
        const itemStats = await Review.aggregate([
            { $match: { service: service._id, rating: { $exists: true, $ne: null } } },
            { $group: { _id: '$service', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const providerStats = providerTrustStats[0] || { average: 0, count: 0 };
        const specificStats = itemStats[0] || { average: 0, count: 0 };

        const isOccupied = !!(await Order.findOne({ service: id, status: { $in: ['Scheduled', 'Paid', 'Reserved'] } }));

        return NextResponse.json({
            service: {
                ...service.toObject(),
                // Unified Bulletproof Schema
                sellerTrustRating: providerStats.average,
                sellerTrustCount: providerStats.count,
                itemSpecificRating: specificStats.average,
                itemSpecificCount: specificStats.count,
                // Legacy fields for backward compatibility
                averageRating: providerStats.average,
                reviewCount: specificStats.count, 
                isOccupied
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

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid Service ID' }, { status: 400 });
        }

        const service = await Service.findById(id);

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        const userDoc = await User.findById(user.userId).select('role');
        const isAdmin = userDoc?.role === 'admin';

        if (service.provider.toString() !== user.userId && !isAdmin) {
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

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid Service ID' }, { status: 400 });
        }

        const body = await req.json();

        const service = await Service.findById(id);
        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // Only the provider or admin can update
        const userDoc = await User.findById(user.userId).select('role');
        const isAdmin = userDoc?.role === 'admin';

        if (service.provider.toString() !== user.userId && !isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- Maintenance Mode Protection (Update) ---
        if (service.community) {
            const comm = await Community.findById(service.community).select('isActive name');
            if (comm && !comm.isActive && !isAdmin) {
                return NextResponse.json({ 
                    error: `The ${comm.name} circle is in maintenance mode. Updates to listings are temporarily disabled.` 
                }, { status: 503 });
            }
        }

        // Hardening: Prevents hiding a service that has active bookings/disputes
        if (body.status && ['Active', 'Inactive'].includes(body.status)) {
            const activeOrder = await Order.findOne({
                service: id,
                status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] }
            });

            if (activeOrder) {
                return NextResponse.json({ error: 'Cannot hide a service with active appointments or disputes.' }, { status: 400 });
            }
            service.status = body.status;
        }

        await service.save();

        return NextResponse.json({ message: 'Service updated', service }, { status: 200 });

    } catch (error: any) {
        console.error("PUT /api/services/[id] Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
