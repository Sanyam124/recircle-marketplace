import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Order from '@/models/Order';
import User from '@/models/User';
import Service from '@/models/Service';
import Message from '@/models/Message';
import { createNotification } from '@/lib/notifications';
import { sendPushNotification } from '@/lib/pushNotifications';
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

                    const productTitle = updatedOrder.orderType === 'Service_Appointment' ? 'Service' : 'Product';
                    const itemTitle = updatedOrder.orderType === 'Service_Appointment' ? (await Service.findById(updatedOrder.service))?.title : (await Product.findById(updatedOrder.product))?.title;
                    const messageContent = `${productTitle} reservation for "${itemTitle || 'Item'}" has been cancelled by Admin.`;
                    const systemMsg = await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.buyer,
                        content: messageContent,
                        product: updatedOrder.product,
                        service: updatedOrder.service
                    });

                    try {
                        const { pusherServer } = await import('@/lib/pusherServer');
                        const recipients = new Set([updatedOrder.buyer.toString(), decoded.userId]);
                        for (const rId of recipients) {
                            await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                        }
                    } catch (pusherErr) {
                        console.error('Pusher sync error in admin cancel:', pusherErr);
                    }

                    if (updatedOrder.buyer.toString() !== decoded.userId) {
                        await createNotification({
                            recipient: updatedOrder.buyer.toString(),
                            type: 'ORDER_UPDATE',
                            message: `Dispute for your ${productTitle} was resolved. The reservation has been cancelled.`,
                            link: '/orders'
                        });
                    }

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

                    await createNotification({
                        recipient: updatedOrder.buyer.toString(),
                        type: 'ORDER_UPDATE',
                        message: `Dispute for your order was dismissed. Your purchase is now marked Completed.`,
                        link: '/orders'
                    });

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
                        { _id: id, status: 'Scheduled' }, // Always look for Scheduled now
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

                    await createNotification({
                        recipient: updatedOrder.buyer.toString(),
                        type: 'ORDER_UPDATE',
                        message: `Your service booking has been accepted and scheduled!`,
                        link: '/orders'
                    });

                    const service = await Service.findById(updatedOrder.service);
                    const msgContent = `📅 Appointment confirmed for "${service?.title || 'Service'}"! Secret code is ${verificationCode}.`;
                    const systemMsg = await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.buyer,
                        content: msgContent,
                        service: updatedOrder.service
                    });
                    try {
                        const { pusherServer } = await import('@/lib/pusherServer');
                        const recipients = new Set([updatedOrder.buyer.toString(), decoded.userId]);
                        for (const rId of recipients) {
                            await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                        }
                    } catch (pusherErr) {
                        console.error('Pusher sync error in accept appointment:', pusherErr);
                    }

                    return NextResponse.json({ success: true, order: updatedOrder }, { status: 200 });
                } else if (action === 'reject' || action === 'cancel') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $nin: ['Cancelled', 'Completed'] } },
                        { $set: { status: 'Cancelled' } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        return NextResponse.json({ error: 'Cannot cancel completed order' }, { status: 400 });
                    }

                    const service = await Service.findById(updatedOrder.service);
                    const msg = `Appointment for "${service?.title || 'Service'}" has been cancelled.`;
                    const systemMsg = await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.buyer,
                        content: msg,
                        service: updatedOrder.service
                    });

                    // Trigger Pusher (Deduplicated)
                    try {
                        const { pusherServer } = await import('@/lib/pusherServer');
                        const recipients = new Set([updatedOrder.buyer.toString(), decoded.userId]);
                        for (const rId of recipients) {
                            await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                        }
                    } catch (pusherErr) {
                        console.error('Pusher sync error in appointment cancel:', pusherErr);
                    }

                    // Update corresponding Offer status if exists
                    const Offer = (await import('@/models/Offer')).default;
                    await Offer.findOneAndUpdate(
                        { service: updatedOrder.service, buyer: updatedOrder.buyer, status: 'Accepted' },
                        { $set: { status: 'Declined' } }
                    );

                    if (updatedOrder.buyer.toString() !== decoded.userId) {
                        await createNotification({
                            recipient: updatedOrder.buyer.toString(),
                            type: 'ORDER_UPDATE',
                            message: `Service provider cancelled the appointment for "${service?.title}".`,
                            link: '/orders'
                        });
                    }

                    return NextResponse.json({ success: true, message: 'Appointment Cancelled' }, { status: 200 });
                }
            } else if (user._id.toString() === order.buyer.toString()) { // Use ELSE IF
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
                        const checkAlreadyDone = await Order.findById(id);
                        if (checkAlreadyDone?.status === 'Completed') {
                            return NextResponse.json({ success: true, message: 'Already Completed', order: checkAlreadyDone }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Order status changed or already completed' }, { status: 409 });
                    }

                    await createNotification({
                        recipient: updatedOrder.seller.toString(),
                        type: 'ORDER_UPDATE',
                        message: `Buyer has confirmed completion of service.`,
                        link: '/orders'
                    });

                    const service = await Service.findById(updatedOrder.service);
                    const msgContent = `🤝 SERVICE COMPLETED! Buyer has confirmed successful service execution for "${service?.title || 'Service'}". Thanks!`;
                    const systemMsg = await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.seller,
                        content: msgContent,
                        service: updatedOrder.service
                    });
                    try {
                        const { pusherServer } = await import('@/lib/pusherServer');
                        const recipients = new Set([updatedOrder.seller.toString(), decoded.userId]);
                        for (const rId of recipients) {
                            await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                        }
                    } catch (pusherErr) {
                        console.error('Pusher sync error in complete appointment:', pusherErr);
                    }

                    return NextResponse.json({ success: true, message: 'Appointment Completed', order: updatedOrder }, { status: 200 });
                } else if (action === 'cancel') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $nin: ['Cancelled', 'Completed'] } },
                        { $set: { status: 'Cancelled' } },
                        { new: true }
                    );

                    if (updatedOrder) {
                        const service = await Service.findById(updatedOrder.service);
                        const msg = `Appointment for "${service?.title || 'Service'}" has been cancelled.`;
                        const systemMsg = await Message.create({
                            sender: decoded.userId,
                            recipient: updatedOrder.seller,
                            content: msg,
                            service: updatedOrder.service
                        });

                        // Trigger Pusher (Deduplicated)
                        try {
                            const { pusherServer } = await import('@/lib/pusherServer');
                            const recipients = new Set([updatedOrder.seller.toString(), decoded.userId]);
                            for (const rId of recipients) {
                                await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                            }
                        } catch (pusherErr) {
                            console.error('Pusher sync error in buyer cancel appointment:', pusherErr);
                        }

                        // Update corresponding Offer status
                        const Offer = (await import('@/models/Offer')).default;
                        await Offer.findOneAndUpdate(
                            { service: updatedOrder.service, buyer: updatedOrder.buyer, status: 'Accepted' },
                            { $set: { status: 'Declined' } }
                        );

                        if (updatedOrder.seller.toString() !== decoded.userId) {
                            await createNotification({
                                recipient: updatedOrder.seller.toString(),
                                sender: decoded.userId,
                                type: 'ORDER_UPDATE',
                                message: `Buyer cancelled the appointment for "${service?.title || 'Service'}".`,
                                link: '/orders'
                            });
                        }
                    }

                    return NextResponse.json({ success: true, message: 'Appointment Cancelled' }, { status: 200 });
                }
            }
        }

        // --- PRODUCT ORDER LOGIC ---
        if (order.orderType === 'Product') {
            if (user._id.toString() === order.seller.toString()) {
                if (action === 'complete_delivery') {
                    // Hardening: 5-Minute Cool-Down Mechanism
                    const COOL_DOWN_MS = 5 * 60 * 1000;
                    const now = new Date();
                    const lastAttempt = order.lastOtpAttemptAt ? new Date(order.lastOtpAttemptAt) : null;

                    if ((order.otpAttempts || 0) >= 3 && lastAttempt && (now.getTime() - lastAttempt.getTime()) < COOL_DOWN_MS) {
                        const remaining = Math.ceil((COOL_DOWN_MS - (now.getTime() - lastAttempt.getTime())) / 1000);
                        const mins = Math.floor(remaining / 60);
                        const secs = remaining % 60;
                        return NextResponse.json({ 
                            error: `Too many failed attempts. Cool-down is active. Please try again in ${mins}m ${secs}s.` 
                        }, { status: 403 });
                    }

                    if (otp?.toUpperCase() !== order.verificationCode) {
                        await Order.updateOne({ _id: id }, { 
                            $inc: { otpAttempts: 1 },
                            $set: { lastOtpAttemptAt: new Date() }
                        });
                        const currentFailures = (order.otpAttempts || 0) + 1;
                        const remaining = 3 - currentFailures;
                        
                        let errorMessage = `Incorrect code. ${remaining} attempt(s) remaining.`;
                        if (remaining <= 0) errorMessage = `3/3 failed attempts. You are now locked for 5 minutes.`;

                        return NextResponse.json({ error: errorMessage }, { status: 400 });
                    }

                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: 'Scheduled' }, 
                        { $set: { status: 'Completed', otpAttempts: 0 } },
                        { new: true }
                    );

                    if (!updatedOrder) {
                        const checkAlreadyDone = await Order.findById(id);
                        if (checkAlreadyDone?.status === 'Completed') {
                            return NextResponse.json({ success: true, message: 'Already Confirmed', order: checkAlreadyDone }, { status: 200 });
                        }
                        return NextResponse.json({ error: 'Order status changed or already confirmed' }, { status: 409 });
                    }

                    const product = await Product.findByIdAndUpdate(updatedOrder.product, { status: 'Sold' });
                    await createNotification({
                        recipient: updatedOrder.buyer.toString(),
                        type: 'ORDER_UPDATE',
                        message: `Handoff confirmed! Your product purchase is now marked Completed.`,
                        link: '/orders'
                    });

                    const msgContent = `🤝 HANDOFF SUCCESSFUL! Delivery confirmed using secret code. "${product?.title || 'Product'}" is now marked as Sold/Completed. Thanks!`;
                    const systemMsg = await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.buyer,
                        content: msgContent,
                        product: updatedOrder.product
                    });
                    try {
                        const { pusherServer } = await import('@/lib/pusherServer');
                        const recipients = new Set([updatedOrder.buyer.toString(), decoded.userId]);
                        for (const rId of recipients) {
                            await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                        }
                    } catch (pusherErr) {
                        console.error('Pusher sync error in complete delivery:', pusherErr);
                    }

                    return NextResponse.json({ success: true, message: 'Delivery Confirmed', order: updatedOrder }, { status: 200 });
                } else if (action === 'cancel') {
                    const updatedOrder = await Order.findOneAndUpdate(
                        { _id: id, status: { $nin: ['Cancelled', 'Completed', 'Sold'] } },
                        { $set: { status: 'Cancelled' } },
                        { new: true }
                    );

                    if (updatedOrder) {
                        await Product.findByIdAndUpdate(updatedOrder.product, { status: 'Available' });
                        const product = await Product.findById(updatedOrder.product);
                        const msg = `Order for "${product?.title || 'Product'}" has been cancelled.`;
                        const systemMsg = await Message.create({
                            sender: decoded.userId,
                            recipient: updatedOrder.buyer,
                            content: msg,
                            product: updatedOrder.product
                        });

                        // Trigger Pusher (Deduplicated)
                        try {
                            const { pusherServer } = await import('@/lib/pusherServer');
                            const recipients = new Set([updatedOrder.buyer.toString(), decoded.userId]);
                            for (const rId of recipients) {
                                await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                            }
                        } catch (pusherErr) {
                            console.error('Pusher sync error in seller cancel product:', pusherErr);
                        }

                        // Update Offer status
                        const Offer = (await import('@/models/Offer')).default;
                        await Offer.findOneAndUpdate(
                            { product: updatedOrder.product, buyer: updatedOrder.buyer, status: 'Accepted' },
                            { $set: { status: 'Declined' } }
                        );

                        if (updatedOrder.buyer.toString() !== decoded.userId) {
                            await createNotification({
                                recipient: updatedOrder.buyer.toString(),
                                type: 'ORDER_UPDATE',
                                message: `Seller cancelled the order for "${product?.title}".`,
                                link: '/orders'
                            });
                        }
                    }
                    return NextResponse.json({ success: true, message: 'Order Cancelled' }, { status: 200 });
                }
            } else if (user._id.toString() === order.buyer.toString()) { // Use ELSE IF
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
                    const msg = `Order for "${product?.title || 'Product'}" has been cancelled.`;
                    const systemMsg = await Message.create({
                        sender: decoded.userId,
                        recipient: updatedOrder.seller,
                        content: msg,
                        product: updatedOrder.product
                    });

                    // Trigger Pusher (Deduplicated)
                    try {
                        const { pusherServer } = await import('@/lib/pusherServer');
                        const recipients = new Set([updatedOrder.seller.toString(), decoded.userId]);
                        for (const rId of recipients) {
                            await pusherServer.trigger(`private-user-${rId}`, 'new-message', systemMsg);
                        }
                    } catch (pusherErr) {
                        console.error('Pusher sync error in buyer cancel product:', pusherErr);
                    }

                    // Update Offer status
                    const Offer = (await import('@/models/Offer')).default;
                    await Offer.findOneAndUpdate(
                        { product: updatedOrder.product, buyer: updatedOrder.buyer, status: 'Accepted' },
                        { $set: { status: 'Declined' } }
                    );

                    if (updatedOrder.seller.toString() !== decoded.userId) {
                        await createNotification({
                            recipient: updatedOrder.seller.toString(),
                            sender: decoded.userId,
                            type: 'ORDER_UPDATE',
                            message: `Buyer cancelled the order for "${product?.title || 'Product'}".`,
                            link: '/orders'
                        });
                    }

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
export const revalidate = 0;
