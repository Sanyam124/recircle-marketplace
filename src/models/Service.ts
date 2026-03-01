import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IService extends Document {
    provider: mongoose.Types.ObjectId;
    title: string;
    description: string;
    price: number; // Storing as number, could be hourly rate or fixed
    priceUnit: string; // e.g., 'per hour', 'fixed', 'starting from'
    category: string;
    availability?: string;
    images?: string[];
    status: 'Active' | 'Inactive';
    createdAt: Date;
    updatedAt: Date;
}

const ServiceSchema: Schema<IService> = new Schema(
    {
        provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true, index: 'text' },
        description: { type: String, required: true, trim: true, index: 'text' },
        price: { type: Number, required: true, min: 0, max: 100000 },
        priceUnit: { type: String, trim: true, default: 'fixed' },
        category: { type: String, required: true, trim: true, index: true },
        availability: { type: String, trim: true },
        images: { type: [String] },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
    },
    { timestamps: true }
);

// Optimization: Compound indexes for common discovery patterns
ServiceSchema.index({ status: 1, createdAt: -1 });
ServiceSchema.index({ status: 1, category: 1, createdAt: -1 });

const Service: Model<IService> =
    mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
