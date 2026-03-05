import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
    seller: mongoose.Types.ObjectId;
    title: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
    status: 'Available' | 'Sold' | 'Reserved';
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
    {
        seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true, index: 'text', maxlength: 80 },
        description: { type: String, required: true, trim: true, index: 'text', maxlength: 2000 },
        price: { type: Number, required: true, min: 0, max: 1000000 },
        images: { type: [String], required: true }, // Array of image URLs
        category: { type: String, required: true, trim: true, index: true },
        condition: {
            type: String,
            enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
            required: true,
        },
        status: {
            type: String,
            enum: ['Available', 'Sold', 'Reserved'],
            default: 'Available',
            index: true,
        },
    },
    { timestamps: true }
);

// Optimization: Compound indexes for common query + sort patterns
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ status: 1, price: 1 });
ProductSchema.index({ status: 1, price: -1 });
ProductSchema.index({ category: 1, status: 1, createdAt: -1 });

const Product: Model<IProduct> =
    mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
