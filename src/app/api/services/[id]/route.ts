import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Service from '@/models/Service';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const service = await Service.findById(id).populate('provider', 'name username profilePicture email');

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // Check for buyerId ONLY if there's an ACTIVE order (not completed)
        let buyerId = null;
        const lastOrder = await Order.findOne({
            service: id,
            status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] }
        }).select('buyer').sort({ createdAt: -1 });
        buyerId = lastOrder?.buyer;

        return NextResponse.json({ service, buyerId }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
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

        await Service.findByIdAndDelete(id);

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

        // Apply only permitted updates (e.g. status)
        if (body.status && ['Active', 'Inactive'].includes(body.status)) {
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
