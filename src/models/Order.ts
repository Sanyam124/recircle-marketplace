import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrder extends Document {
    buyer: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    product?: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    transactionType: 'Buy' | 'Rent';
    rentDuration?: number;
    rentUnit?: string;
    orderType: 'Product' | 'Service_Appointment';
    appointmentDate?: Date;
    itemPrice: number;
    totalAmount: number;
    status: 'Paid' | 'Scheduled' | 'Completed' | 'Cancelled' | 'Dispute_Pending'; // Financial -> Active -> Done / Dead
    pickupAddress?: string;
    deliveryAddress?: string;
    verificationCode?: string; 
    otpAttempts: number;
    lastOtpAttemptAt?: Date; // Tracking cool-down for failed OTPs
    paymentMethod: 'Cash' | 'Online';
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
        transactionType: { type: String, enum: ['Buy', 'Rent'], default: 'Buy' },
        rentDuration: { type: Number, min: 1 },
        rentUnit: { type: String, enum: ['hour', 'day', 'week', 'month', 'year'] },
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
            enum: ['Paid', 'Scheduled', 'Completed', 'Cancelled', 'Dispute_Pending'],
            default: 'Scheduled',
            index: true,
        },
        pickupAddress: { type: String, maxlength: 200 },
        deliveryAddress: { type: String, maxlength: 200 },
        verificationCode: { type: String },
        otpAttempts: { type: Number, default: 0 },
        lastOtpAttemptAt: { type: Date },
        paymentMethod: { type: String, enum: ['Cash', 'Online'], default: 'Cash' },
        disputeReason: { type: String, maxlength: 500 },
    },
    { timestamps: true }
);

// Optimization: Speed up order history lookups for buyers and sellers
OrderSchema.index({ buyer: 1, status: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, status: 1, createdAt: -1 });

// Safety: Prevent duplicate Scheduled orders per item (CONC-4 fix)
OrderSchema.index({ product: 1 }, { unique: true, sparse: true, partialFilterExpression: { status: 'Scheduled', product: { $exists: true } } });
OrderSchema.index({ service: 1, buyer: 1 }, { unique: true, sparse: true, partialFilterExpression: { status: 'Scheduled', service: { $exists: true } } });

if (mongoose.models.Order) {
    const currentSchema = mongoose.models.Order.schema;
    if (!currentSchema.path('transactionType')) {
        delete mongoose.models.Order;
    }
}

const Order: Model<IOrder> =
    mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
