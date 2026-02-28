import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOffer extends Document {
    buyer: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    product?: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    offeredPrice: number;
    originalPrice: number;
    message?: string;
    status: 'Pending' | 'Accepted' | 'Declined' | 'Withdrawn';
    createdAt: Date;
    updatedAt: Date;
}

const OfferSchema: Schema<IOffer> = new Schema(
    {
        buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        service: { type: Schema.Types.ObjectId, ref: 'Service' },
        offeredPrice: { type: Number, required: true, min: 0 },
        originalPrice: { type: Number, required: true, min: 0 },
        message: { type: String, trim: true },
        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Declined', 'Withdrawn'],
            default: 'Pending',
            index: true,
        },
    },
    { timestamps: true }
);

// Optimization: Optimize fetching pending offers for a seller
OfferSchema.index({ seller: 1, status: 1, createdAt: -1 });

const Offer: Model<IOffer> =
    mongoose.models.Offer || mongoose.model<IOffer>('Offer', OfferSchema);

export default Offer;
