import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReport extends Document {
    reporter: mongoose.Types.ObjectId;
    targetUser: mongoose.Types.ObjectId;
    itemType: 'product' | 'service' | 'none';
    itemId?: mongoose.Types.ObjectId;
    reason: string;
    status: 'Pending' | 'Reviewed' | 'Dismissed';
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema: Schema<IReport> = new Schema(
    {
        reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        targetUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        itemType: { type: String, enum: ['product', 'service', 'none'], default: 'none' },
        itemId: { type: Schema.Types.ObjectId, index: true },
        reason: { type: String, required: true },
        status: { type: String, enum: ['Pending', 'Reviewed', 'Dismissed'], default: 'Pending', index: true },
    },
    { timestamps: true }
);

// Add index for faster queries (no unique constraint to allow reporting again when closed)
ReportSchema.index({ reporter: 1, targetUser: 1, itemId: 1 });

const Report: Model<IReport> =
    mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;
