import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBoardPost extends Document {
    author: mongoose.Types.ObjectId;
    community: mongoose.Types.ObjectId;
    content: string;
    category: 'General' | 'LostFound' | 'Essentials' | 'Events' | 'Alerts';
    upvotes: mongoose.Types.ObjectId[];
    downvotes: mongoose.Types.ObjectId[];
    replies: {
        author: mongoose.Types.ObjectId;
        content: string;
        createdAt: Date;
    }[];
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const BoardPostSchema: Schema<IBoardPost> = new Schema(
    {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
        content: { type: String, required: true, maxlength: 500, trim: true },
        category: { 
            type: String, 
            enum: ['General', 'LostFound', 'Essentials', 'Events', 'Alerts'],
            default: 'General'
        },
        upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: {
        type: [{
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            content: { type: String, required: true, maxlength: 300, trim: true },
            createdAt: { type: Date, default: Date.now }
        }],
        default: []
    },
    expiresAt: { 
        type: Date, 
        default: () => new Date(+new Date() + 48*60*60*1000), 
    },
},
    { timestamps: true }
);

// Optimization: Compound indexes for common query + sort patterns
BoardPostSchema.index({ community: 1, category: 1, createdAt: -1 });
BoardPostSchema.index({ community: 1, createdAt: -1 });
BoardPostSchema.index({ author: 1, createdAt: -1 });

// TTL Index: Deletes the document precisely when the `expiresAt` date is reached
BoardPostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BoardPost: Model<IBoardPost> = mongoose.models.BoardPost || mongoose.model<IBoardPost>('BoardPost', BoardPostSchema);


export default BoardPost;
