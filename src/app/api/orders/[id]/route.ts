import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Order from '@/models/Order';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Service from '@/models/Service';
import Message from '@/models/Message';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token) as { userId: string };
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await req.json();
        const { action, resolution, otp, reason } = body;

        await connectToDatabase();
        const order = await Order.findById(id);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // --- ADMIN ACTION LOGIC ---
        if (user.role === 'admin') {
            if (action === 'resolve_dispute') {
                if (order.status !== 'Dispute_Pending') {
                    return NextResponse.json({ error: 'Order is not in dispute' }, { status: 400 });
                }

                if (resolution === 'refund_buyer') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: 'Dispute_Pending' },
                        {
                            $set: {
                                status: 'Cancelled',
                                disputeReason: (order.disputeReason || '') + ' [Resolved: Cancelled by Admin]'
                            }
                        },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        return NextResponse.json({ error: 'Order status changed or not in dispute' }, { status: 409 });
                    }

                    const itemTitle = updatedOrder.orderType === 'Service_Appointment' ? (await Service.findById(updatedOrder.service))?.title : (await Product.findById(updatedOrder.product))?.title;
                    await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.buyer,
                        content: `Order for "${itemTitle || 'Item'}" has been cancelled by Admin.`,
                        product: updatedOrder.product,
                        service: updatedOrder.service
                    });

                    const productTitle = updatedOrder.orderType === 'Service_Appointment' ? 'Service' : 'Product';
                    await Notification.create({
                        recipient: updatedOrder.buyer,
                        type: 'ORDER_UPDATE',
                        message: `Dispute for your ${productTitle} was resolved. The reservation has been cancelled.`,
                        link: '/profile'
                    });

                    return NextResponse.json({ success: true, message: 'Dispute Resolved: Reservation Cancelled', order: updatedOrder }, { status: 200 });

                } else if (resolution === 'dismiss_dispute') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: 'Dispute_Pending' },
                        {
                            $set: {
                                status: 'Completed',
                                disputeReason: (order.disputeReason || '') + ' [Resolved: Dismissed by Admin]'
                            }
                        },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        return NextResponse.json({ error: 'Order status changed or not in dispute' }, { status: 409 });
                    }

                    return NextResponse.json({ success: true, message: 'Dispute Resolved: Dismissed', order: updatedOrder }, { status: 200 });
                }
                return NextResponse.json({ error: 'Invalid resolution type' }, { status: 400 });
            }
        }

        // --- SERVICE APPOINTMENT LOGIC ---
        if (order.orderType === 'Service_Appointment') {
            if (user._id.toString() === order.seller.toString()) {
                if (action === 'accept') {
                    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: 'Pending_Payment' },
                        { $set: { status: 'Scheduled', verificationCode } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        const checkOrder = await Order.findById(id);
                        if (checkOrder?.status === 'Scheduled') {
                            return NextResponse.json({ success: true, order: checkOrder }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Order status changed' }, { status: 409 });
                    }

                    return NextResponse.json({ success: true, order: updatedOrder }, { status: 200 });
                } else if (action === 'reject' || action === 'cancel') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $nin: ['Cancelled', 'Completed'] } },
                        { $set: { status: 'Cancelled' } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        const checkOrder = await Order.findById(id);
                        if (checkOrder?.status === 'Cancelled') {
                            return NextResponse.json({ success: true, message: 'Already Cancelled' }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Cannot cancel completed order' }, { status: 400 });
                    }

                    const service = await Service.findById(updatedOrder.service);
                    await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.buyer,
                        content: `I've cancelled the appointment for "${service?.title || 'Service'}".`,
                        service: updatedOrder.service
                    });

                    return NextResponse.json({ success: true, message: 'Appointment Cancelled' }, { status: 200 });
                }
            }

            if (user._id.toString() === order.buyer.toString()) {
                if (action === 'complete_appointment') {
                    if (!otp || otp !== order.verificationCode) {
                        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
                    }
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: 'Scheduled' },
                        { $set: { status: 'Completed' } },
                        { new: true }
                    );
                    if (!updatedOrder) {
                        const checkOrder = await Order.findById(id);
                        if (checkOrder?.status === 'Completed') {
                            return NextResponse.json({ success: true, message: 'Already Completed' }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Order status changed' }, { status: 409 });
                    }
                    return NextResponse.json({ success: true, message: 'Appointment Completed' }, { status: 200 });
                } else if (action === 'report_issue') {
                    if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 });
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $in: ['Scheduled', 'Paid'] } },
                        { $set: { status: 'Dispute_Pending', disputeReason: reason } },
                        { new: true }
                    );
                    if (!updatedOrder) return NextResponse.json({ error: 'Cannot report issue for this status' }, { status: 400 });
                    return NextResponse.json({ success: true, message: 'Issue Reported' }, { status: 200 });
                } else if (action === 'cancel') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $nin: ['Cancelled', 'Completed'] } },
                        { $set: { status: 'Cancelled' } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        const checkOrder = await Order.findById(id);
                        if (checkOrder?.status === 'Cancelled') {
                            return NextResponse.json({ success: true, message: 'Already Cancelled' }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Cannot cancel completed order' }, { status: 400 });
                    }

                    const service = await Service.findById(updatedOrder.service);
                    await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.seller,
                        content: `I've cancelled the appointment for "${service?.title || 'Service'}".`,
                        service: updatedOrder.service
                    });

                    return NextResponse.json({ success: true, message: 'Appointment Cancelled' }, { status: 200 });
                }
            }
        }

        // --- PRODUCT ORDER LOGIC ---
        if (order.orderType === 'Product') {
            if (user._id.toString() === order.seller.toString()) {
                if (action === 'complete_delivery') {
                    if (!otp || otp !== order.verificationCode) {
                        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
                    }
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: 'Scheduled' },
                        { $set: { status: 'Completed' } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        const checkOrder = await Order.findById(id);
                        if (checkOrder?.status === 'Completed') {
                            return NextResponse.json({ success: true, message: 'Already Completed', order: checkOrder }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Order status changed' }, { status: 409 });
                    }

                    await Product.findByIdAndUpdate(updatedOrder.product, { status: 'Sold' });

                    await Notification.create({
                        recipient: updatedOrder.buyer,
                        type: 'ORDER_UPDATE',
                        message: `Handoff confirmed! Your product purchase is now marked Completed.`,
                        link: '/orders'
                    });

                    return NextResponse.json({ success: true, message: 'Delivery Confirmed', order: updatedOrder }, { status: 200 });
                } else if (action === 'cancel') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $nin: ['Cancelled', 'Completed', 'Sold'] } },
                        { $set: { status: 'Cancelled' } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        const checkOrder = await Order.findById(id);
                        if (checkOrder?.status === 'Cancelled') {
                            return NextResponse.json({ success: true, message: 'Already Cancelled' }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Cannot cancel completed order' }, { status: 400 });
                    }

                    await Product.findByIdAndUpdate(updatedOrder.product, { status: 'Available' });

                    const product = await Product.findById(updatedOrder.product);
                    await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.buyer,
                        content: `I've cancelled the order for "${product?.title || 'Product'}".`,
                        product: updatedOrder.product
                    });

                    return NextResponse.json({ success: true, message: 'Order Cancelled' }, { status: 200 });
                }
            }

            if (user._id.toString() === order.buyer.toString()) {
                if (action === 'cancel') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $nin: ['Cancelled', 'Completed', 'Sold'] } },
                        { $set: { status: 'Cancelled' } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        const checkOrder = await Order.findById(id);
                        if (checkOrder?.status === 'Cancelled') {
                            return NextResponse.json({ success: true, message: 'Already Cancelled', order: checkOrder }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Cannot cancel completed order' }, { status: 400 });
                    }

                    await Product.findByIdAndUpdate(updatedOrder.product, { status: 'Available' });

                    const product = await Product.findById(updatedOrder.product);
                    await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.seller,
                        content: `I've cancelled the order for "${product?.title || 'Product'}".`,
                        product: updatedOrder.product
                    });

                    return NextResponse.json({ success: true, message: 'Order Cancelled', order: updatedOrder }, { status: 200 });
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
