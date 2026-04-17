import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import User from '@/models/User';
import Order from '@/models/Order';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params; // Await params in Next.js 15+

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
        }

        const product = await Product.findById(id).populate('seller', 'name username profilePicture email gender').populate('community', 'name');

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Block access if a user relationship is blocked
        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        if (decoded && product.seller) {
            const currentUserId = decoded.userId;
            const sellerId = product.seller._id.toString();

            if (currentUserId !== sellerId) {
                const sellerUser = await User.findById(sellerId).select('blockedUsers');
                const isBlockedByOther = sellerUser?.blockedUsers?.some((id: any) => id.toString() === currentUserId);

                if (isBlockedByOther) {
                    return NextResponse.json({ error: 'Access denied due to privacy settings (blocked user).' }, { status: 403 });
                }
            }
        }

        // Check for buyerId if sold, rented, or reserved
        let buyerId = null;
        if (product.status === 'Sold' || product.status === 'Reserved' || product.status === 'Rented') {
            const lastOrder = await Order.findOne({
                product: id,
                status: { $in: ['Scheduled', 'Completed'] }
            }).select('buyer').sort({ createdAt: -1 });
            buyerId = lastOrder?.buyer;
        }

        // 1. Fetch Seller Trust Stats (Unique Reviewer Compressed)
        const sellerTrustStats = await Review.aggregate([
            { $match: { target: product.seller._id, rating: { $exists: true, $ne: null } } },
            { $group: { _id: { target: '$target', reviewer: '$reviewer' }, reviewerAvgRating: { $avg: '$rating' } } },
            { $group: { _id: '$_id.target', average: { $avg: '$reviewerAvgRating' }, count: { $sum: 1 } } }
        ]);

        // 2. Fetch Listing-Specific Stats
        const itemStats = await Review.aggregate([
            { $match: { product: product._id, rating: { $exists: true, $ne: null } } },
            { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const sellerStats = sellerTrustStats[0] || { average: 0, count: 0 };
        const specificStats = itemStats[0] || { average: 0, count: 0 };

        const isOccupied = ['Sold', 'Rented', 'Reserved'].includes(product.status);

        return NextResponse.json({
            product: {
                ...product.toObject(),
                // Unified Bulletproof Schema
                sellerTrustRating: sellerStats.average,
                sellerTrustCount: sellerStats.count,
                itemSpecificRating: specificStats.average,
                itemSpecificCount: specificStats.count,
                // Legacy fields for backward compatibility
                averageRating: sellerStats.average,
                reviewCount: product.forRent ? specificStats.count : sellerStats.count,
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
            return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
        }

        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        if (product.seller.toString() !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- DELETION GUARD ---
        // Check for active orders (Paid, Scheduled, Dispute_Pending)
        const activeOrder = await Order.findOne({
            product: id,
            status: 'Scheduled'
        });

        if (activeOrder) {
            return NextResponse.json({
                error: 'Cannot delete product with active orders. Please complete or resolve existing transactions first.'
            }, { status: 400 });
        }

        // --- DELETION GUARD (REPORTS) ---
        const Report = (await import('@/models/Report')).default;
        const activeReport = await Report.findOne({ itemId: id, itemType: 'product', status: 'Pending' });
        if (activeReport) {
            return NextResponse.json({
                error: 'Cannot delete this product because it has been reported and is currently under review by moderation.'
            }, { status: 400 });
        }

        // Cascade: Decline all pending offers and update their message bubbles
        const Offer = (await import('@/models/Offer')).default;
        const Message = (await import('@/models/Message')).default;
        const pendingOffers = await Offer.find({ product: id, status: 'Pending' }).select('_id');
        if (pendingOffers.length > 0) {
            const offerIds = pendingOffers.map(o => o._id);
            await Offer.updateMany({ _id: { $in: offerIds } }, { $set: { status: 'Declined' } });
            await Message.updateMany({ 'offer.offerId': { $in: offerIds } }, { $set: { 'offer.status': 'Declined' } });
        }

        // Delete from DB First to prevent broken UI if DB fails
        await Product.findByIdAndDelete(id);

        // Cleanup Cloudinary Storage only after DB delete is successful
        if (product.images && product.images.length > 0) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                for (const img of product.images) {
                    await deleteFromCloudinary(img).catch(() => null); // non-blocking error for individual images
                }
            } catch (e) {
                console.error("Cloudinary cleanup failed after product deletion", e);
            }
        }
        return NextResponse.json({ message: 'Product deleted' }, { status: 200 });

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
            return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });
        }

        const body = await req.json();

        let product = await Product.findById(id);
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Only the seller can update their own product
        if (product.seller.toString() !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Apply permitted status updates (only Available ↔ Inactive toggle, or Rented → Available reset)
        if (body.status && ['Available', 'Inactive'].includes(body.status)) {
            // Cannot deactivate if Sold or Reserved
            if (['Reserved', 'Sold'].includes(product.status)) {
                return NextResponse.json({ error: `Cannot hide an item while it is ${product.status}` }, { status: 400 });
            }
            
            // Allow transition from Rented back to Available
            product.status = body.status;
        }

        await product.save();

        return NextResponse.json({ message: 'Product updated', product }, { status: 200 });

    } catch (error: any) {
        console.error("PUT /api/products/[id] Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
