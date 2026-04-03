import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
    seller: mongoose.Types.ObjectId;
    title: string;
    description: string;
    forSell: boolean;
    forRent: boolean;
    price?: number;
    rentPrice?: number;
    rentUnit?: 'hour' | 'day' | 'week' | 'month' | 'year';
    images: string[];
    category: string;
    condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
    status: 'Available' | 'Sold' | 'Reserved' | 'Inactive' | 'Rented';
    community?: mongoose.Types.ObjectId;
    visibility: 'Public' | 'Community';
    location?: { pincode?: string; city?: string; state?: string };
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
    {
        seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 80 },
        description: { type: String, required: true, trim: true, maxlength: 2000 },
        forSell: { type: Boolean, default: true },
        forRent: { type: Boolean, default: false },
        price: { type: Number, min: 0, max: 1000000 },
        rentPrice: { type: Number, min: 0, max: 1000000 },
        rentUnit: { type: String, enum: ['hour', 'day', 'week', 'month', 'year'] },
        images: { type: [String], required: true }, // Array of image URLs
        category: { type: String, required: true, trim: true, index: true },
        condition: {
            type: String,
            enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
            required: true,
        },
        status: {
            type: String,
            enum: ['Available', 'Sold', 'Reserved', 'Inactive', 'Rented'],
            default: 'Available',
            index: true,
        },
        community: { type: Schema.Types.ObjectId, ref: 'Community', index: true },
        visibility: { type: String, enum: ['Public', 'Community'], default: 'Public', index: true },
        location: {
            pincode: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true }
        }
    },
    { timestamps: true }
);

// Optimization: Compound indexes for common query + sort patterns
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ status: 1, price: 1 });
ProductSchema.index({ status: 1, price: -1 });
ProductSchema.index({ category: 1, status: 1, createdAt: -1 });

// Full-text search index
ProductSchema.index(
  { title: 'text', description: 'text', category: 'text' },
  { weights: { title: 10, category: 5, description: 1 }, name: "TextSearchIndex" }
);

if (mongoose.models.Product) {
    const currentSchema = mongoose.models.Product.schema;
    if (!currentSchema.path('forRent') || !currentSchema.path('rentPrice')) {
        delete mongoose.models.Product;
    }
}

const Product: Model<IProduct> =
    mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
