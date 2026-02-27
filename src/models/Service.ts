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
        title: { type: String, required: true, index: 'text' },
        description: { type: String, required: true, index: 'text' },
        price: { type: Number, required: true },
        priceUnit: { type: String, default: 'fixed' },
        category: { type: String, required: true, index: true },
        availability: { type: String },
        images: { type: [String] },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
    },
    { timestamps: true }
);

const Service: Model<IService> =
    mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
