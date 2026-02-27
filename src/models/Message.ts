import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId;
    recipient: mongoose.Types.ObjectId;
    product?: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    offer?: {
        offerId: mongoose.Types.ObjectId;
        price: number;
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
            status: { type: String, enum: ['Pending', 'Accepted', 'Declined'] }
        },
        content: { type: String, required: true },
        isRead: { type: Boolean, default: false, index: true },
        deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

// Index for fetching conversation history between two users
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

if (mongoose.models.Message) {
    delete mongoose.models.Message;
}

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
