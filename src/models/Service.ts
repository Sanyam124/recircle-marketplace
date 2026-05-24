import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IService extends Document {
    provider: mongoose.Types.ObjectId;
    title: string;
    description: string;
    price: number; // Storing as number, could be hourly rate or fixed
    priceUnit: string; // e.g., 'per hour', 'fixed', 'starting from'
    category: string;
    images?: string[];
    status: 'Active' | 'Inactive';
    community?: mongoose.Types.ObjectId;
    visibility: 'Public' | 'Community';
    location?: { 
        city?: string; 
        state?: string;
        coordinates?: number[]; // [lng, lat]
        isPrecise?: boolean;
        hostel?: string;
        room?: number;
        bed?: number;
        area?: string;
        pincode?: string;
    };
    availability: string;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceSchema: Schema<IService> = new Schema(
    {
        provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 500 },
        description: { type: String, required: true, trim: true, maxlength: 20000 },
        price: { type: Number, required: true, min: 0, max: 100000 },
        priceUnit: { type: String, trim: true, default: 'fixed', maxlength: 30 },
        category: { type: String, required: true, trim: true, index: true, maxlength: 50 },
        images: { type: [String] },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
        community: { type: Schema.Types.ObjectId, ref: 'Community', index: true },
        visibility: { type: String, enum: ['Public', 'Community'], default: 'Public', index: true },
        location: {
            city: { type: String, trim: true, maxlength: 50 },
            state: { type: String, trim: true, maxlength: 50 },
            coordinates: { type: [Number], index: '2dsphere' }, // [longitude, latitude]
            isPrecise: { type: Boolean, default: true },
            hostel: { type: String, trim: true, maxlength: 50 },
            room: { type: Number, min: 1, max: 1000 },
            bed: { type: Number, min: 1, max: 19 },
            area: { type: String, trim: true, maxlength: 100 },
            pincode: { type: String, trim: true, maxlength: 10 }
        },
        availability: { type: String, trim: true, maxlength: 100 },
    },
    { timestamps: true }
);

// Optimization: Compound indexes for common discovery patterns
ServiceSchema.index({ status: 1, createdAt: -1 });
ServiceSchema.index({ status: 1, category: 1, createdAt: -1 });

// Full-text search index
ServiceSchema.index(
  { title: 'text', description: 'text', category: 'text' },
  { weights: { title: 10, category: 5, description: 1 }, name: "TextSearchIndex" }
);

if (mongoose.models.Service) {
    const currentSchema = mongoose.models.Service.schema;
    if (currentSchema.path('title').options.maxlength === 80) {
        delete mongoose.models.Service;
    }
}

const Service: Model<IService> =
    mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
