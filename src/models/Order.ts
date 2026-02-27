import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrder extends Document {
    buyer: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    product?: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    orderType: 'Product' | 'Service_Appointment';
    appointmentDate?: Date;
    itemPrice: number;
    totalAmount: number;
    status: 'Pending_Payment' | 'Paid' | 'Cancelled' | 'Returned' | 'Scheduled' | 'Completed' | 'Dispute_Pending' | 'Dispute_Resolved'; // Simplified statuses
    pickupAddress?: string;
    deliveryAddress?: string;
    verificationCode?: string; // Generic code for service/handoff verification
    disputeReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema: Schema<IOrder> = new Schema(
    {
        buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        service: { type: Schema.Types.ObjectId, ref: 'Service' },
        orderType: {
            type: String,
            enum: ['Product', 'Service_Appointment'],
            default: 'Product'
        },
        appointmentDate: { type: Date },
        itemPrice: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['Pending_Payment', 'Paid', 'Cancelled', 'Returned', 'Scheduled', 'Completed', 'Dispute_Pending', 'Dispute_Resolved'],
            default: 'Pending_Payment',
            index: true,
        },
        pickupAddress: { type: String },
        deliveryAddress: { type: String },
        verificationCode: { type: String },
        disputeReason: { type: String },
    },
    { timestamps: true }
);

const Order: Model<IOrder> =
    mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
