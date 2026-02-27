import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    name: string;
    username: string; // [NEW] Unique username
    email: string;
    password?: string;
    profilePicture?: string;
    bio?: string;
    role: 'user' | 'admin'; // [MODIFIED] Strictly user or admin
    address?: string;
    isVerified: boolean;
    gender?: 'male' | 'female' | 'other' | 'none'; // [ADDED] 'none'
    allowEmailContact?: boolean; // [ADDED] Email contact preference
    wishlist: mongoose.Types.ObjectId[];
    wishlistedServices: mongoose.Types.ObjectId[];
    authProvider: 'email' | 'google';
    googleId?: string;
    otp?: string;
    otpExpiry?: Date;
    lastSeen?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, unique: true, sparse: true }, // [NEW] Sparse to allow migration
        email: { type: String, required: true, unique: true },
        password: { type: String, select: false },
        profilePicture: { type: String },
        bio: { type: String },
        gender: { type: String, enum: ['male', 'female', 'other', 'none'], default: 'none' },
        allowEmailContact: { type: Boolean, default: false },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        address: { type: String },
        isVerified: { type: Boolean, default: false },
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        wishlistedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
        authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
        googleId: { type: String, unique: true, sparse: true },
        otp: { type: String, select: false },
        otpExpiry: { type: Date, select: false },
        lastSeen: { type: Date },
    },
    { timestamps: true }
);

// Workaround for Next.js HMR: Delete cached model if it lacks the new field
if (mongoose.models.User) {
    const currentSchema = mongoose.models.User.schema;
    if (!currentSchema.path('wishlistedServices')) {
        delete mongoose.models.User;
    }
}

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
