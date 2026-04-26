import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Offer from '@/models/Offer';
import Notification from '@/models/Notification';
import Message from '@/models/Message';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { verifyToken } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// PATCH /api/offers/[id] — seller accepts or declines an offer
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string; role?: string };
        if (!decoded?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const action: string = body.action;
        const override: boolean = body.override;

        if (!['accept', 'decline'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Use accept or decline.' }, { status: 400 });
        }

        const newStatus = action === 'accept' ? 'Accepted' : 'Declined';

        // Find the offer first (to verify ownership and get item info for notification)
        const offer = await Offer.findById(id)
            .populate('product', 'title')
            .populate('service', 'title');

        if (!offer) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        // Verify this offer belongs to the logged-in seller
        if (offer.seller.toString() !== decoded.userId) {
            return NextResponse.json({ error: 'Forbidden: not your offer' }, { status: 403 });
        }

        // --- Maintenance Mode Protection (Action Guard) ---
        if (action === 'accept') {
            const Community = (await import('@/models/Community')).default;
            const Product = (await import('@/models/Product')).default;
            const Service = (await import('@/models/Service')).default;
            
            const itemId = offer.product || offer.service;
            let item;
            if (offer.product) {
                item = await Product.findById(itemId).select('community');
            } else {
                item = await Service.findById(itemId).select('community');
            }
            
            if (item?.community) {
                const comm = await Community.findById(item.community).select('isActive name');
                if (comm && !comm.isActive) {
                    const isAdmin = decoded?.role === 'admin';
                    if (!isAdmin) {
                        return NextResponse.json({ 
                            error: `The ${comm.name} circle is in maintenance. New transactions are temporarily frozen.` 
                        }, { status: 503 });
                    }
                }
            }
        }

        // If accepted, check for product status first
        if (action === 'accept' && offer.product) {
            const product = await Product.findById(offer.product);
            if (product && (product.status === 'Sold' || product.status === 'Rented')) {
                return NextResponse.json({ 
                    error: `This product is already ${product.status === 'Rented' ? 'rented out' : 'sold'}.` 
                }, { status: 400 });
            }
        }

        // If accepted, check for overrides BEFORE atomic update 
        if (action === 'accept') {
            const queryQuery = {
                status: 'Scheduled',
                ...(offer.product ? { product: offer.product._id } : { service: offer.service?._id })
            };

            const existingOrder = await Order.findOne(queryQuery);

            if (existingOrder) {
                // Prevent overriding if the existing order belongs to a completely different buyer
                if (existingOrder.buyer.toString() !== offer.buyer.toString()) {
                    return NextResponse.json({
                        error: 'This item is already reserved or sold to another buyer. You must cancel the existing order before accepting offers from other users.'
                    }, { status: 400 });
                }

                if (!override) {
                    return NextResponse.json({
                        error: 'An active order already exists for this item.',
                        promptOverride: true
                    }, { status: 409 });
                } else {
                    // Override approved: cancel the old conflicting order(s)
                    await Order.updateMany(queryQuery, { $set: { status: 'Cancelled' } });

                    // Revert product status to Available since the old order is cancelled
                    if (offer.product) {
                        await Product.updateOne(
                            { _id: offer.product._id, status: 'Reserved' },
                            { $set: { status: 'Available' } }
                        );
                    }

                    // Count how many orders have already been COMPLETED for this item between these users
                    const completedOrderCount = await Order.countDocuments({
                        seller: decoded.userId,
                        buyer: offer.buyer,
                        status: 'Completed',
                        ...(offer.product ? { product: offer.product._id } : { service: offer.service?._id })
                    });

                    // Find all 'Accepted' offers for this item
                    const acceptedOffers = await Offer.find({
                        seller: decoded.userId,
                        buyer: offer.buyer,
                        status: 'Accepted',
                        ...(offer.product ? { product: offer.product._id } : { service: offer.service?._id })
                    }).sort({ createdAt: -1 });

                    // Only decline offers that are "excess" (i.e., not accounted for by a completed order)
                    // We skip the most recent N offers where N = completedOrderCount
                    const offersToDecline = acceptedOffers.slice(completedOrderCount);
                    const idsToDecline = offersToDecline.map(o => o._id);

                    if (idsToDecline.length > 0) {
                        await Offer.updateMany(
                            { _id: { $in: idsToDecline } },
                            { $set: { status: 'Declined' } }
                        );

                        await Message.updateMany(
                            { "offer.offerId": { $in: idsToDecline } },
                            { $set: { "offer.status": "Declined" } }
                        );
                    }
                }
            }
        }

        // Atomic update to prevent race conditions (Now happens after override check)
        const result = await Offer.updateOne(
            { _id: id, status: 'Pending' },
            { $set: { status: newStatus } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Offer is no longer pending' }, { status: 409 });
        }

        let verificationCode = undefined;
        // Proceed with creating the new order
        if (action === 'accept') {
            verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            await Order.create({
                buyer: offer.buyer,
                seller: decoded.userId,
                product: offer.product?._id,
                service: offer.service?._id,
                transactionType: offer.offerType || 'Buy',
                rentDuration: offer.rentDuration,
                rentUnit: offer.rentUnit,
                orderType: offer.product ? 'Product' : 'Service_Appointment',
                itemPrice: offer.offeredPrice,
                totalAmount: offer.offeredPrice,
                status: 'Scheduled',
                verificationCode: verificationCode,
            });

            // If it's a product, mark it as Reserved
            if (offer.product) {
                await Product.updateOne(
                    { _id: offer.product._id },
                    { $set: { status: 'Reserved' } }
                );
            }

            // Auto decline other pending product offers? Let's leave them for now or the seller can decline them.
        }

        const itemName = (offer.product as any)?.title || (offer.service as any)?.title || 'your listing';

        // 1. Notify buyer via notification system
        await createNotification({
            recipient: offer.buyer.toString(),
            sender: decoded.userId,
            type: action === 'accept' ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED',
            message: action === 'accept'
                ? `Your offer of ₹${offer.offeredPrice} on "${itemName}" was accepted! Your secret handoff code is ${verificationCode}. Reach out to coordinate.`
                : `Your offer of ₹${offer.offeredPrice} on "${itemName}" was declined.`,
            link: action === 'accept' ? `/chat/${decoded.userId}?${offer.product ? `productId=${offer.product._id}` : `serviceId=${offer.service?._id}`}` : undefined,
            metadata: {
                offerId: id,
                offeredPrice: offer.offeredPrice,
                action,
                itemName
            }
        });

        // 2. Automatically update the Offer Bubble visual status and include verification code
        const updateData: any = { "offer.status": newStatus };
        if (verificationCode) updateData["offer.verificationCode"] = verificationCode;
        
        await Message.updateMany(
            { "offer.offerId": id },
            { $set: updateData }
        );

        // 3. Trigger Pusher events for all related messages to sync UI in real-time (Deduplicated)
        try {
            const { pusherServer } = await import('@/lib/pusherServer');
            const updatedMessages = await Message.find({ "offer.offerId": id });
            
            for (const msg of updatedMessages) {
                const recipients = new Set([msg.recipient.toString(), msg.sender.toString()]);
                for (const rId of recipients) {
                    await pusherServer.trigger(`private-user-${rId}`, 'new-message', msg);
                }
            }
        } catch (pusherErr) {
            console.error('Pusher sync error in offer action:', pusherErr);
        }

        return NextResponse.json({ ok: true, status: newStatus });
    } catch (err) {
        console.error('Offer PATCH error:', err);
        return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
    }
}
