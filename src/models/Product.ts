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
        title: { type: String, required: true, index: 'text' },
        description: { type: String, required: true, index: 'text' },
        price: { type: Number, required: true },
        images: { type: [String], required: true }, // Array of image URLs
        category: { type: String, required: true, index: true },
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

const Product: Model<IProduct> =
    mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
