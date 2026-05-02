import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlacklist extends Document {
    email: string;
    username: string;
    reason: string;
    bannedAt: Date;
}

const BlacklistSchema: Schema<IBlacklist> = new Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true, index: true },
        username: { type: String, required: true, unique: true, lowercase: true, index: true },
        reason: { type: String, default: 'Violations of community marketplace guidelines' },
        bannedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Blacklist: Model<IBlacklist> = mongoose.models.Blacklist || mongoose.model<IBlacklist>('Blacklist', BlacklistSchema);

export default Blacklist;
