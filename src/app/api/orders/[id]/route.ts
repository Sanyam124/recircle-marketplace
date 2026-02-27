import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Order from '@/models/Order';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Service from '@/models/Service';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { action, resolution, otp, reason } = body;

        await connectToDatabase();
        const order = await Order.findById(id);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Role Check
        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // --- ADMIN ACTION LOGIC ---
        if (user.role === 'admin') {
            if (action === 'resolve_dispute') {
                if (order.status !== 'Dispute_Pending') {
                    return NextResponse.json({ error: 'Order is not in dispute' }, { status: 400 });
                }

                if (resolution === 'refund_buyer') {
                    order.status = 'Cancelled';
                    order.disputeReason += ' [Resolved: Cancelled by Admin]';
                    await order.save();

                    // Notify Parties
                    const productTitle = order.orderType === 'Service_Appointment' ? 'Service' : 'Product';
                    await Notification.create({
                        recipient: order.buyer,
                        type: 'ORDER_UPDATE',
                        message: `Dispute for your ${productTitle} was resolved. The reservation has been cancelled.`,
                        link: '/profile'
                    });

                    return NextResponse.json({ success: true, message: 'Dispute Resolved: Reservation Cancelled', order }, { status: 200 });

                } else if (resolution === 'dismiss_dispute') {
                    order.status = 'Completed';
                    order.disputeReason += ' [Resolved: Dismissed by Admin]';
                    await order.save();

                    return NextResponse.json({ success: true, message: 'Dispute Resolved: Dismissed', order }, { status: 200 });
                }
                return NextResponse.json({ error: 'Invalid resolution type' }, { status: 400 });
            }
        }

        // --- SERVICE APPOINTMENT LOGIC ---
        if (order.orderType === 'Service_Appointment') {
            // PROVIDER ACTIONS
            if (user._id.toString() === order.seller.toString()) {
                if (action === 'accept') {
                    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
                    order.status = 'Scheduled';
                    order.verificationCode = verificationCode;
                    await order.save();

                    return NextResponse.json({ success: true, order }, { status: 200 });
                } else if (action === 'reject' || action === 'cancel') {
                    order.status = 'Cancelled';
                    await order.save();
                    return NextResponse.json({ success: true, message: 'Appointment Cancelled' }, { status: 200 });
                }
            }

            // BUYER ACTIONS
            if (user._id.toString() === order.buyer.toString()) {
                if (action === 'complete_appointment') {
                    if (!otp || otp !== order.verificationCode) {
                        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
                    }
                    order.status = 'Completed';
                    await order.save();
                    return NextResponse.json({ success: true, message: 'Appointment Completed' }, { status: 200 });
                } else if (action === 'report_issue') {
                    if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 });
                    order.status = 'Dispute_Pending';
                    order.disputeReason = reason;
                    await order.save();
                    return NextResponse.json({ success: true, message: 'Issue Reported' }, { status: 200 });
                } else if (action === 'cancel') {
                    order.status = 'Cancelled';
                    await order.save();
                    return NextResponse.json({ success: true, message: 'Appointment Cancelled' }, { status: 200 });
                }
            }
        }

        // --- PRODUCT ORDER LOGIC ---
        if (order.orderType === 'Product') {
            // SELLER ACTIONS
            if (user._id.toString() === order.seller.toString()) {
                if (action === 'complete_delivery') {
                    if (!otp || otp !== order.verificationCode) {
                        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
                    }
                    order.status = 'Completed';
                    await order.save();
                    await Product.findByIdAndUpdate(order.product, { status: 'Sold' });

                    // Notify Buyer
                    await Notification.create({
                        recipient: order.buyer,
                        type: 'ORDER_UPDATE',
                        message: `Handoff confirmed! Your product purchase is now marked Completed.`,
                        link: '/orders'
                    });

                    return NextResponse.json({ success: true, message: 'Delivery Confirmed', order }, { status: 200 });
                } else if (action === 'cancel') {
                    order.status = 'Cancelled';
                    await order.save();
                    await Product.findByIdAndUpdate(order.product, { status: 'Available' });
                    return NextResponse.json({ success: true, message: 'Order Cancelled' }, { status: 200 });
                }
            }

            // BUYER ACTIONS
            if (user._id.toString() === order.buyer.toString()) {
                if (action === 'cancel') {
                    order.status = 'Cancelled';
                    await order.save();
                    await Product.findByIdAndUpdate(order.product, { status: 'Available' });
                    return NextResponse.json({ success: true, message: 'Order Cancelled', order }, { status: 200 });
                }
            }
        }

        return NextResponse.json({ error: 'Unauthorized or Invalid Action' }, { status: 403 });
    } catch (error: any) {
        console.error('Order Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
