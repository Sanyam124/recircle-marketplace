import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRequestLog extends Document {
    ip: string;
    path: string;
    count: number;
    lastRequest: Date;
}

const RequestLogSchema: Schema<IRequestLog> = new Schema(
    {
        ip: { type: String, required: true, index: true },
        path: { type: String, required: true, index: true },
        count: { type: Number, default: 1 },
        lastRequest: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// TTL Index: Automatically expire logs after 24 hours
RequestLogSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

// Unique compound index for ip and path
RequestLogSchema.index({ ip: 1, path: 1 }, { unique: true });

const RequestLog: Model<IRequestLog> = mongoose.models.RequestLog || mongoose.model<IRequestLog>('RequestLog', RequestLogSchema);

export default RequestLog;
