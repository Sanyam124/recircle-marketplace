import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVerificationRequest extends Document {
    user: mongoose.Types.ObjectId;
    community: mongoose.Types.ObjectId;
    idProof: string; // URL to the image
    status: 'Pending' | 'Approved' | 'Rejected';
    feedback?: string;
    createdAt: Date;
    updatedAt: Date;
}

const VerificationRequestSchema: Schema<IVerificationRequest> = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        community: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
        idProof: { type: String, required: true },
        status: { 
            type: String, 
            enum: ['Pending', 'Approved', 'Rejected'], 
            default: 'Pending', 
            index: true 
        },
        feedback: { type: String, trim: true, maxlength: 500 }
    },
    { timestamps: true }
);

// Prevent duplicate pending requests for the same user + community
VerificationRequestSchema.index({ user: 1, community: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'Pending' } });

const VerificationRequest: Model<IVerificationRequest> =
    mongoose.models.VerificationRequest || mongoose.model<IVerificationRequest>('VerificationRequest', VerificationRequestSchema);

export default VerificationRequest;
