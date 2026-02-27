import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId;
    type: 'ORDER_PLACED' | 'SERVICE_REQUEST' | 'DELIVERY_UPDATE' | 'ORDER_UPDATE' | 'ADMIN_ALERT' | 'CHAT_MESSAGE' | 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED';
    message: string;
    link?: string;
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
            enum: ['ORDER_PLACED', 'SERVICE_REQUEST', 'DELIVERY_UPDATE', 'ORDER_UPDATE', 'ADMIN_ALERT', 'CHAT_MESSAGE', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_DECLINED'],
            required: true
        },
        message: { type: String, required: true },
        link: { type: String },
        isRead: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
