import { NextRequest, NextResponse } from 'next/server';
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

        // Check for buyerId if sold or reserved
        let buyerId = null;
        if (product.status === 'Sold' || product.status === 'Reserved') {
            const lastOrder = await Order.findOne({
                product: id,
                status: { $in: ['Paid', 'Scheduled', 'Completed', 'Dispute_Pending'] }
            }).select('buyer').sort({ createdAt: -1 });
            buyerId = lastOrder?.buyer;
        }

        // Fetch Seller Review Stats
        const reviewStats = await Review.aggregate([
            { $match: { target: product.seller._id } },
            { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const averageRating = reviewStats.length > 0 ? Number(reviewStats[0].average.toFixed(1)) : 0;
        const reviewCount = reviewStats.length > 0 ? reviewStats[0].count : 0;

        return NextResponse.json({
            product: {
                ...product.toObject(),
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

        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        if (product.seller.toString() !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- DELETION GUARD ---
        // Check for active orders (Paid, Assigned, Out_for_Delivery, Dispute_Pending)
        const activeOrder = await Order.findOne({
            product: id,
            status: { $in: ['Paid', 'Assigned', 'Out_for_Delivery', 'Dispute_Pending'] }
        });

        if (activeOrder) {
            return NextResponse.json({
                error: 'Cannot delete product with active orders. Please complete or resolve existing transactions first.'
            }, { status: 400 });
        }

        // Cleanup Cloudinary Storage
        if (product.images && product.images.length > 0) {
            const { deleteFromCloudinary } = await import('@/lib/cloudinary');
            for (const img of product.images) {
                await deleteFromCloudinary(img);
            }
        }

        await Product.findByIdAndDelete(id);
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
        const body = await req.json();

        let product = await Product.findById(id);
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Only the seller can update their own product
        if (product.seller.toString() !== user.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Apply permitted status updates
        if (body.status && ['Available', 'Inactive', 'Reserved', 'Sold'].includes(body.status)) {
            // For simple toggle from profile, we usually switch between Available/Inactive
            product.status = body.status;
        }

        await product.save();

        return NextResponse.json({ message: 'Product updated', product }, { status: 200 });

    } catch (error: any) {
        console.error("PUT /api/products/[id] Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
