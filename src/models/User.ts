import mongoose, { Schema, Document, Model } from 'mongoose';
import Community from './Community'; // [FIX] Registered for populate dependency

export interface IUser extends Document {
    name: string;
    username: string;
    email: string;
    password?: string;
    profilePicture?: string;
    bannerImage?: string;
    bio?: string;
    role: 'user' | 'admin' | 'verifier';
    state?: string;
    city?: string;
    landmark?: string;
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
    pushSubscription?: string; // Store as JSON string 
    failedLoginAttempts: number;
    lockUntil?: Date;
    notifyOffers: boolean;
    notifyMessages: boolean;
    notifyNewsletter: boolean; // [NEW] Newsletter toggle
    notifyCommunity: boolean; // [NEW] Community Board toggle
    notifySecurity: boolean; // [NEW] Security alerts toggle
    showOnlineStatus: boolean;
    compactView: boolean;
    defaultCommunity?: mongoose.Types.ObjectId;
    defaultHostel?: string;
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
            match: /^(?!.*\.\.)[a-z0-9_][a-z0-9._]{1,18}[a-z0-9_]$/
        },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, select: false },
        profilePicture: { type: String },
        bannerImage: { type: String },
        bio: { type: String, trim: true, maxlength: 500, default: '' },
        gender: { type: String, enum: ['male', 'female', 'other', 'none'], default: 'none', maxlength: 15 },
        allowEmailContact: { type: Boolean, default: false },
        phone: { type: String, trim: true, maxlength: 15 },
        isPhoneVerified: { type: Boolean, default: false },
        allowPhoneContact: { type: Boolean, default: false },
        status: { type: String, enum: ['Active', 'Banned', 'Deactivated'], default: 'Active', index: true },
        bannedUntil: { type: Date },
        role: { type: String, enum: ['user', 'admin', 'verifier'], default: 'user' },
        state: { type: String, trim: true, maxlength: 50 },
        city: { type: String, trim: true, maxlength: 50 },
        landmark: { type: String, trim: true, maxlength: 100 },
        isVerified: { type: Boolean, default: false },
        isOnVacation: { type: Boolean, default: false, index: true },
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        wishlistedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
        blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        verifiedCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community', index: true }],
        authProvider: { type: String, enum: ['email', 'google', 'both'], default: 'email' },
        googleId: { type: String, unique: true, sparse: true },
        otp: { type: String, select: false },
        otpExpiry: { type: Date, select: false },
        lastSeen: { type: Date },
        usernameChangeCount: { type: Number, default: 0 },
        usernameLastChanged: { type: Date },
        pushSubscription: { type: String }, // Store the JSON stringified PushSubscription object
        notifyOffers: { type: Boolean, default: true },
        notifyMessages: { type: Boolean, default: true },
        notifyNewsletter: { type: Boolean, default: true },
        notifyCommunity: { type: Boolean, default: true },
        notifySecurity: { type: Boolean, default: true },
        showOnlineStatus: { type: Boolean, default: true },
        compactView: { type: Boolean, default: false },
        defaultCommunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
        defaultHostel: { type: String, maxlength: 50 },
        failedLoginAttempts: { type: Number, default: 0, select: false },
        lockUntil: { type: Date, select: false },
    },
    { timestamps: true }
);

// Workaround for Next.js HMR: Delete cached model if it lacks the new fields or has old constraints
if (mongoose.models.User) {
    const currentSchema = mongoose.models.User.schema;
    if (!currentSchema.path('pushSubscription') || !currentSchema.path('bannerImage') || !currentSchema.path('notifyNewsletter') || !currentSchema.path('notifySecurity') || !currentSchema.path('notifyOffers') || !currentSchema.path('notifyCommunity') || !currentSchema.path('notifyMessages') || !currentSchema.path('phone') || !currentSchema.path('blockedUsers') || !currentSchema.path('status') || !currentSchema.path('isPhoneVerified') || !currentSchema.path('usernameChangeCount') || !currentSchema.path('isOnVacation') || !currentSchema.path('showOnlineStatus') || !currentSchema.path('compactView') || !currentSchema.path('defaultCommunity') || !currentSchema.path('defaultHostel') || !currentSchema.path('state') || !currentSchema.path('city') || !currentSchema.path('landmark')) {
        delete mongoose.models.User;
    }
}

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
