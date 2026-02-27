import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params; // Await params in Next.js 15+

        const product = await Product.findById(id).populate('seller', 'name username profilePicture email gender');

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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

        return NextResponse.json({ product, buyerId }, { status: 200 });

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

        await Product.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Product deleted' }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
