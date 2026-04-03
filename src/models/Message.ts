import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId;
    recipient: mongoose.Types.ObjectId;
    product?: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    offer?: {
        offerId: mongoose.Types.ObjectId;
        price: number;
        offerType?: 'Buy' | 'Rent';
        rentDuration?: number;
        rentUnit?: string;
        status: 'Pending' | 'Accepted' | 'Declined';
    };
    content: string;
    isRead: boolean;
    deletedBy: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema(
    {
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        service: { type: Schema.Types.ObjectId, ref: 'Service' },
        offer: {
            offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
            price: { type: Number },
            offerType: { type: String, enum: ['Buy', 'Rent'] },
            rentDuration: { type: Number },
            rentUnit: { type: String },
            status: { type: String, enum: ['Pending', 'Accepted', 'Declined'] },
            verificationCode: { type: String }
        },
        content: { type: String, required: true, maxlength: 2000 },
        isRead: { type: Boolean, default: false, index: true },
        deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

// Optimization: Speed up context-specific conversation fetches
MessageSchema.index({ sender: 1, recipient: 1, product: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, recipient: 1, service: 1, createdAt: -1 });

// Index for fetching conversation history between two users
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

// TTL Index: Auto-delete messages after 30 days
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Optimization: Speed up unread count queries for recipients
MessageSchema.index({ recipient: 1, isRead: 1 });

if (mongoose.models.Message) {
    delete mongoose.models.Message;
}

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
