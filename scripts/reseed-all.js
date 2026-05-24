const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

// --- Simplified Schemas for Seeding ---
const CommunitySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    emailDomains: [{ type: String }],
    isActive: { type: Boolean, default: true },
    hostels: [{ type: String }]
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['user', 'admin', 'verifier'], default: 'user' },
    isVerified: { type: Boolean, default: true },
    isPhoneVerified: { type: Boolean, default: true },
    verifiedCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
    status: { type: String, default: 'Active' },
    gender: { type: String, enum: ['male', 'female', 'other', 'none'], default: 'none' },
    profilePicture: { type: String },
    isDummy: { type: Boolean, default: false }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number },
    category: { type: String },
    condition: { type: String },
    images: [{ type: String }],
    status: { type: String, default: 'Available' },
    visibility: { type: String, default: 'Public' },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    location: { pincode: String, city: String, state: String }
}, { timestamps: true });

const ServiceSchema = new mongoose.Schema({
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number },
    priceUnit: { type: String, default: 'fixed' },
    category: { type: String },
    images: [{ type: String }],
    status: { type: String, default: 'Active' },
    visibility: { type: String, default: 'Public' },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    location: { pincode: String, city: String, state: String }
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, required: true },
    comment: { type: String },
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

const BoardPostSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    content: { type: String, required: true },
    category: { type: String },
    image: { type: String },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    expiresAt: { type: Date }
}, { timestamps: true });

// Models
const Community = mongoose.models.Community || mongoose.model('Community', CommunitySchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const BoardPost = mongoose.models.BoardPost || mongoose.model('BoardPost', BoardPostSchema);

async function seed() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected!');

        console.log('🧹 Clearing all collections...');
        await Promise.all([
            Community.deleteMany({}),
            User.deleteMany({}),
            Product.deleteMany({}),
            Service.deleteMany({}),
            Review.deleteMany({}),
            Message.deleteMany({}),
            BoardPost.deleteMany({}),
            mongoose.connection.collection('orders')?.deleteMany({}),
            mongoose.connection.collection('notifications')?.deleteMany({}),
            mongoose.connection.collection('otps')?.deleteMany({}),
            mongoose.connection.collection('reports')?.deleteMany({}),
            mongoose.connection.collection('verificationrequests')?.deleteMany({})
        ]);
        console.log('✨ Database cleared.');

        const adminPass = await bcrypt.hash('admin123', 10);
        const userPass = await bcrypt.hash('user123', 10);

        // 1. Create Communities
        console.log('🏘️ Creating communities...');
        const parulUni = await Community.create({
            name: 'Parul University',
            description: 'The vibrant campus of Parul University, Vadodara.',
            emailDomains: ['parul.edu.in'],
        });
        const lpuUni = await Community.create({
            name: 'Lovely Professional University',
            description: 'Indias largest private university campus in Phagwara.',
            emailDomains: ['lpu.in'],
        });

        // 2. Create Admin
        const adminUser = await User.create({
            name: 'Super Admin',
            username: 'admin',
            email: 'admin@recircle.com',
            password: adminPass,
            role: 'admin',
            isVerified: true,
            isPhoneVerified: true,
            profilePicture: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
        });

        // 3. Create Parul Users (15)
        console.log('👥 Creating users for Parul University...');
        const parulUsers = [];
        const firstNames = ['Sanyam', 'Arjun', 'Isha', 'Kabir', 'Ananya', 'Rohan', 'Sneha', 'Aarav', 'Diya', 'Vihaan', 'Avni', 'Advait', 'Zara', 'Reyansh', 'Kiara'];
        
        for (let i = 0; i < 15; i++) {
            const name = i < firstNames.length ? firstNames[i] : `Student${i}`;
            const u = await User.create({
                name: `${name} Sharma`,
                username: `${name.toLowerCase()}${i+1}`,
                email: `${name.toLowerCase()}@parul.edu.in`,
                password: userPass,
                role: 'user',
                isVerified: true,
                isPhoneVerified: true,
                verifiedCommunities: [parulUni._id],
                gender: i % 2 === 0 ? 'male' : 'female',
                profilePicture: `https://i.pravatar.cc/150?u=${name}${i}`,
                isDummy: !name.toLowerCase().startsWith('sanyam')
            });
            parulUsers.push(u);
        }

        // 4. Create LPU Users (10)
        console.log('👥 Creating users for Lovely Professional University...');
        const lpuUsers = [];
        const lpuNames = ['Amit', 'Sunita', 'Jatin', 'Mehak', 'Varun', 'Tanisha', 'Deepak', 'Sonia', 'Karan', 'Pooja'];
        
        for (let i = 0; i < 10; i++) {
            const name = i < lpuNames.length ? lpuNames[i] : `LPUStudent${i}`;
            const u = await User.create({
                name: `${name} Kumar`,
                username: `${name.toLowerCase()}${i+1}`,
                email: `${name.toLowerCase()}@lpu.in`,
                password: userPass,
                role: 'user',
                isVerified: true,
                isPhoneVerified: true,
                verifiedCommunities: [lpuUni._id],
                gender: i % 2 === 0 ? 'male' : 'female',
                profilePicture: `https://i.pravatar.cc/150?u=${name}${i+10}`,
                isDummy: true
            });
            lpuUsers.push(u);
        }

        const allUsers = [...parulUsers, ...lpuUsers];

        // 5. Create Products & Services
        console.log('📦 Seeding Products and Services...');
        const prodCats = ['Textbooks', 'Electronics & Gadgets', 'Stationery', 'Furniture', 'Clothing & Accessories'];
        const servCats = ['Academic Help (Tutoring, Notes)', 'Tech Support & Repairs', 'Graphic Design & Editing', 'Photography & Videography'];
        
        for (const user of allUsers) {
            // 2-3 products per user
            const numProducts = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < numProducts; i++) {
                const isCommunity = Math.random() > 0.3;
                await Product.create({
                    seller: user._id,
                    title: `${prodCats[Math.floor(Math.random() * prodCats.length)]} for sale`,
                    description: 'Gently used item from my dorm. Looking for a quick sale or exchange.',
                    price: Math.floor(Math.random() * 5000) + 100,
                    category: prodCats[Math.floor(Math.random() * prodCats.length)],
                    condition: i % 2 === 0 ? 'Good' : 'New',
                    images: [`https://picsum.photos/seed/${user.username}${i}/400/400`],
                    status: 'Available',
                    visibility: isCommunity ? 'Community' : 'Public',
                    community: isCommunity ? user.verifiedCommunities[0] : undefined,
                    location: isCommunity ? undefined : { pincode: '391760', city: 'Vadodara', state: 'Gujarat' }
                });
            }

            // 1 service per user
            const isLPUMember = user.email.includes('lpu.in');
            await Service.create({
                provider: user._id,
                title: `${servCats[Math.floor(Math.random() * servCats.length)]} assistance`,
                description: 'I can help you with your projects or assignments. Reasonable rates and fast delivery.',
                price: Math.floor(Math.random() * 1000) + 50,
                priceUnit: 'project',
                category: servCats[Math.floor(Math.random() * servCats.length)],
                images: [`https://picsum.photos/seed/service${user.username}/400/400`],
                status: 'Active',
                visibility: 'Public',
                location: isLPUMember ? { pincode: '144411', city: 'Phagwara', state: 'Punjab' } : { pincode: '391760', city: 'Vadodara', state: 'Gujarat' }
            });
        }

        // 6. Seed Reviews
        console.log('⭐ Generating reviews...');
        for (let i = 0; i < 40; i++) {
            const reviewer = allUsers[Math.floor(Math.random() * allUsers.length)];
            let target = allUsers[Math.floor(Math.random() * allUsers.length)];
            while (target._id.equals(reviewer._id)) {
                target = allUsers[Math.floor(Math.random() * allUsers.length)];
            }
            await Review.create({
                reviewer: reviewer._id,
                target: target._id,
                rating: Math.floor(Math.random() * 3) + 3, // 3 to 5 stars
                comment: 'Great interaction, would recommend to others. Verified community member.'
            });
        }

        // 7. Seed Messages
        console.log('💬 Seeding chat history...');
        for (let i = 0; i < 20; i++) {
            const sender = allUsers[Math.floor(Math.random() * allUsers.length)];
            let recipient = allUsers[Math.floor(Math.random() * allUsers.length)];
            while (recipient._id.equals(sender._id)) {
                recipient = allUsers[Math.floor(Math.random() * allUsers.length)];
            }
            await Message.create({
                sender: sender._id,
                recipient: recipient._id,
                content: 'Hey, is this still available? I can come to the dorm tomorrow.',
                isRead: Math.random() > 0.5
            });
        }

        // 8. Seed Board Posts
        console.log('📌 Seeding community board posts...');
        for (let i = 0; i < 15; i++) {
            const author = allUsers[Math.floor(Math.random() * allUsers.length)];
            await BoardPost.create({
                author: author._id,
                community: author.verifiedCommunities[0],
                content: 'Does anyone have a spare calculator for the exam tomorrow? Please ping me!',
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48 hours
                upvotes: [allUsers[0]._id, allUsers[1]._id]
            });
        }

        console.log('🏁 Seeding finished successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
