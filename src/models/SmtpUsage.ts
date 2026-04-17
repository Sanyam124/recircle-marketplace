import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISmtpUsage extends Document {
    dateId: string; // YYYY-MM-DD
    smtp1: number;
    smtp2: number;
    smtp3: number;
}

const SmtpUsageSchema: Schema<ISmtpUsage> = new Schema(
    {
        dateId: { type: String, required: true, unique: true, index: true },
        smtp1: { type: Number, default: 0 },
        smtp2: { type: Number, default: 0 },
        smtp3: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const SmtpUsage: Model<ISmtpUsage> = mongoose.models.SmtpUsage || mongoose.model<ISmtpUsage>('SmtpUsage', SmtpUsageSchema);
export default SmtpUsage;
