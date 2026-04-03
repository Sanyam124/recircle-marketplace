import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOtp extends Document {
    target: string; // Email or Phone
    otp: string; // Hashed OTP
    type: 'email' | 'phone';
    attempts?: number;
    lastAttemptAt?: Date;
    expiresAt: Date;
}

const OtpSchema: Schema<IOtp> = new Schema(
    {
        target: { type: String, required: true },
        otp: { type: String, required: true },
        type: { type: String, enum: ['email', 'phone'], required: true },
        attempts: { type: Number, default: 0 },
        lastAttemptAt: { type: Date },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: true }
);

// TTL Index: Automatically delete documents after expiresAt
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent overwriting model during hot reload
const Otp: Model<IOtp> = mongoose.models.Otp || mongoose.model<IOtp>('Otp', OtpSchema);

export default Otp;
