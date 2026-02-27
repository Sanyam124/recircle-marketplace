import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
    reviewer: mongoose.Types.ObjectId;
    target: mongoose.Types.ObjectId; // User being reviewed
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema: Schema<IReview> = new Schema(
    {
        reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        target: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String },
    },
    { timestamps: true }
);

const Review: Model<IReview> =
    mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
