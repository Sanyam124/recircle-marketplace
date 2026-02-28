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
        name: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
        username: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            minlength: 3,
            maxlength: 20,
            lowercase: true,
            match: /^(?![0-9]+$)(?!.*\.\.)[a-z0-9_][a-z0-9._]{1,18}[a-z0-9_]$/
        }, // [REFINED] No periods at start/end, no consecutive periods, no pure numbers
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, select: false },
        profilePicture: { type: String },
        bio: { type: String, trim: true },
        gender: { type: String, enum: ['male', 'female', 'other', 'none'], default: 'none' },
        allowEmailContact: { type: Boolean, default: false },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        address: { type: String, trim: true },
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
    if (!currentSchema.path('wishlistedServices') || !currentSchema.path('googleId')) {
        delete mongoose.models.User;
    }
}

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
