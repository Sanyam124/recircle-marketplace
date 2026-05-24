import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICommunity extends Document {
    name: string;
    description?: string;
    location?: {
        type: string;
        coordinates: number[]; // [longitude, latitude]
    };
    gpsRadius?: number; // In meters
    emailDomains: string[]; // e.g., ["paruluniversity.ac.in"]
    admins: mongoose.Types.ObjectId[];
    verifiers: mongoose.Types.ObjectId[];
    image?: string;
    isActive: boolean;
    isManualVerificationEnabled: boolean;
    hostels: string[]; // List of campus-specific hostels
    createdAt: Date;
    updatedAt: Date;
}

const CommunitySchema: Schema<ICommunity> = new Schema(
    {
        name: { type: String, required: true, trim: true, unique: true, maxlength: 500 },
        description: { type: String, trim: true, maxlength: 10000 },
        location: {
            // GeoJSON format for the center of the community (e.g., center of campus)
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], index: '2dsphere' }, // [longitude, latitude]
        },
        gpsRadius: { type: Number, default: 1000 }, // Default 1km detection radius
        emailDomains: [{ type: String, lowercase: true, trim: true, maxlength: 100 }],
        admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        verifiers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        image: { type: String },
        isActive: { type: Boolean, default: true },
        isManualVerificationEnabled: { type: Boolean, default: true },
        hostels: [{ type: String, trim: true, maxlength: 50 }],
    },
    { timestamps: true }
);

if (mongoose.models.Community) {
    const currentSchema = mongoose.models.Community.schema;
    if (currentSchema.path('name').options.maxlength === 100) {
        delete mongoose.models.Community;
    }
}

const Community: Model<ICommunity> = mongoose.models.Community || mongoose.model<ICommunity>('Community', CommunitySchema);

export default Community;
