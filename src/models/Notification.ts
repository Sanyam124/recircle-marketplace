import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId;
    type: 'ORDER_PLACED' | 'SERVICE_REQUEST' | 'DELIVERY_UPDATE' | 'ORDER_UPDATE' | 'ADMIN_ALERT' | 'CHAT_MESSAGE' | 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED' | 'VERIFICATION_UPDATE';
    message: string;
    link?: string;
    metadata?: Record<string, any>;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
    {
        recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        sender: { type: Schema.Types.ObjectId, ref: 'User' },
        type: {
            type: String,
            enum: ['ORDER_PLACED', 'SERVICE_REQUEST', 'DELIVERY_UPDATE', 'ORDER_UPDATE', 'ADMIN_ALERT', 'CHAT_MESSAGE', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'VERIFICATION_UPDATE'],
            required: true
        },
        message: { type: String, required: true },
        link: { type: String },
        metadata: { type: Schema.Types.Mixed },
        isRead: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

// Optimization: Optimize fetching activity feed for a user
NotificationSchema.index({ recipient: 1, createdAt: -1 });

// TTL Index: Auto-delete notifications after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
