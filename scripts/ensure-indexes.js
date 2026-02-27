const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
}

// Minimal schemas for indexing
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    username: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    role: String,
    createdAt: Date
}));

const Product = mongoose.model('Product', new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String,
    status: String,
    createdAt: Date
}));

const Service = mongoose.model('Service', new mongoose.Schema({
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String,
    status: String,
    createdAt: Date
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isRead: Boolean,
    createdAt: Date
}));

const Notification = mongoose.model('Notification', new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isRead: Boolean,
    createdAt: Date
}));

const Offer = mongoose.model('Offer', new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: String,
    createdAt: Date
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: String,
    createdAt: Date
}));

const Report = mongoose.model('Report', new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    itemId: mongoose.Schema.Types.ObjectId,
    status: String,
    createdAt: Date
}));

async function createIndexes() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        console.log('Creating Indexes...');

        const safeIndex = async (model, indexObj, options = {}) => {
            try {
                await model.collection.createIndex(indexObj, options);
                console.log(`- Created index on ${model.modelName}: ${JSON.stringify(indexObj)}`);
            } catch (err) {
                if (err.code === 85 || err.code === 11000) {
                    console.warn(`- Index already exists on ${model.modelName} with different options, skipping.`);
                } else {
                    console.error(`- Error indexing ${model.modelName}:`, err.message);
                }
            }
        };
        
        // --- Product Indexes ---
        await safeIndex(Product, { category: 1 });
        await safeIndex(Product, { seller: 1 });
        await safeIndex(Product, { status: 1 });
        await safeIndex(Product, { createdAt: -1 });
        await safeIndex(Product, { title: 'text', description: 'text' });

        // --- Service Indexes ---
        await safeIndex(Service, { category: 1 });
        await safeIndex(Service, { provider: 1 });
        await safeIndex(Service, { status: 1 });
        await safeIndex(Service, { createdAt: -1 });
        await safeIndex(Service, { title: 'text', description: 'text' });

        // --- Message Indexes ---
        await safeIndex(Message, { sender: 1, recipient: 1, createdAt: -1 });
        await safeIndex(Message, { recipient: 1, isRead: 1 });
        await safeIndex(Message, { createdAt: -1 });

        // --- Notification Indexes ---
        await safeIndex(Notification, { recipient: 1, isRead: 1 });
        await safeIndex(Notification, { createdAt: -1 });

        // --- Offer Indexes ---
        await safeIndex(Offer, { buyer: 1 });
        await safeIndex(Offer, { seller: 1 });
        await safeIndex(Offer, { status: 1 });
        await safeIndex(Offer, { createdAt: -1 });

        // --- Order Indexes ---
        await safeIndex(Order, { buyer: 1 });
        await safeIndex(Order, { seller: 1 });
        await safeIndex(Order, { status: 1 });
        await safeIndex(Order, { createdAt: -1 });

        // --- Report Indexes ---
        await safeIndex(Report, { reporter: 1, targetUser: 1, itemId: 1 }, { unique: true });
        await safeIndex(Report, { status: 1 });
        await safeIndex(Report, { createdAt: -1 });

        console.log('Indexing process completed.');
        process.exit(0);
    } catch (e) {
        console.error('Connection/Fatal Error:', e);
        process.exit(1);
    }
}

createIndexes();
