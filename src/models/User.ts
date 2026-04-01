import mongoose, { Schema, Document, Model } from 'mongoose';
import Community from './Community'; // [FIX] Registered for populate dependency

export interface IUser extends Document {
    name: string;
    username: string;
    email: string;
    password?: string;
    profilePicture?: string;
    bio?: string;
    role: 'user' | 'admin' | 'verifier';
    address?: string;
    isVerified: boolean;
    phone?: string; // [NEW] Optional phone
    isPhoneVerified: boolean; // [NEW] Level 2 verification
    allowPhoneContact?: boolean; // [NEW] Privacy toggle
    status: 'Active' | 'Banned' | 'Deactivated'; // [NEW] Admin status
    bannedUntil?: Date; // [NEW] Auto-expiry for timed bans
    gender?: 'male' | 'female' | 'other' | 'none';
    allowEmailContact?: boolean;
    isOnVacation: boolean;
    wishlist: mongoose.Types.ObjectId[];
    wishlistedServices: mongoose.Types.ObjectId[];
    blockedUsers: mongoose.Types.ObjectId[]; // [NEW] For Block feature
    verifiedCommunities: mongoose.Types.ObjectId[]; // [NEW] Circles Feature: Permanent verified Residents
    authProvider: 'email' | 'google' | 'both';
    googleId?: string;
    otp?: string;
    otpExpiry?: Date;
    lastSeen?: Date;
    usernameChangeCount: number;
    usernameLastChanged?: Date;
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
        },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, select: false },
        profilePicture: { type: String },
        bio: { type: String, trim: true, maxlength: 500, default: '' },
        gender: { type: String, enum: ['male', 'female', 'other', 'none'], default: 'none' },
        allowEmailContact: { type: Boolean, default: false },
        phone: { type: String, trim: true },
        isPhoneVerified: { type: Boolean, default: false },
        allowPhoneContact: { type: Boolean, default: false },
        status: { type: String, enum: ['Active', 'Banned', 'Deactivated'], default: 'Active' },
        bannedUntil: { type: Date },
        role: { type: String, enum: ['user', 'admin', 'verifier'], default: 'user' },
        address: { type: String, trim: true, maxlength: 150 },
        isVerified: { type: Boolean, default: false },
        isOnVacation: { type: Boolean, default: false },
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        wishlistedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
        blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        verifiedCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
        authProvider: { type: String, enum: ['email', 'google', 'both'], default: 'email' },
        googleId: { type: String, unique: true, sparse: true },
        otp: { type: String, select: false },
        otpExpiry: { type: Date, select: false },
        lastSeen: { type: Date },
        usernameChangeCount: { type: Number, default: 0 },
        usernameLastChanged: { type: Date },
    },
    { timestamps: true }
);

// Workaround for Next.js HMR: Delete cached model if it lacks the new fields or has old constraints
if (mongoose.models.User) {
    const currentSchema = mongoose.models.User.schema;
    const bioPath = currentSchema.path('bio') as any;
    const isOldBioLimit = bioPath?.options?.maxlength === 300;
    const rolePath = currentSchema.path('role') as any;
    const isOldRoleEnum = !rolePath?.options?.enum?.includes('verifier');
    const authProviderPath = currentSchema.path('authProvider') as any;
    const isOldAuthProviderEnum = !authProviderPath?.options?.enum?.includes('both');

    if (isOldRoleEnum || isOldBioLimit || isOldAuthProviderEnum || !currentSchema.path('phone') || !currentSchema.path('blockedUsers') || !currentSchema.path('verifiedCommunities') || !currentSchema.path('status') || !currentSchema.path('bannedUntil') || !currentSchema.path('authProvider') || !currentSchema.path('isPhoneVerified') || !currentSchema.path('usernameChangeCount') || (currentSchema.path('address') as any)?.options?.maxlength !== 150 || !currentSchema.path('isOnVacation')) {
        delete mongoose.models.User;
    }
}

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
