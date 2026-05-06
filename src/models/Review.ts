import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
    reviewer: mongoose.Types.ObjectId;
    target: mongoose.Types.ObjectId; // User being reviewed
    order?: mongoose.Types.ObjectId; // The specific transaction
    product?: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema: Schema<IReview> = new Schema(
    {
        reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        target: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
        product: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
        service: { type: Schema.Types.ObjectId, ref: 'Service', index: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true, maxlength: 1000 },
    },
    { timestamps: true }
);

// Prevent multiple reviews from same user for same target/order/item if desired, 
// but for now we'll allow flexibility and let the API handle validation.

const Review: Model<IReview> =
    mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
