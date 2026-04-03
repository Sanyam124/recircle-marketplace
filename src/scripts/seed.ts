import mongoose from 'mongoose';
import User from '../models/User';
import Community from '../models/Community';
import Product from '../models/Product';
import Service from '../models/Service';
import Order from '../models/Order';
import Review from '../models/Review';
import BoardPost from '../models/BoardPost';
import Notification from '../models/Notification';
import { hashPassword } from '../lib/auth';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recircle';

const SAMPLE_COMMUNITIES = [
    { name: 'IIT Delhi', domains: ['iitd.ac.in'], desc: 'The hub of tech innovation in India.' },
    { name: 'Parul University', domains: ['paruluniversity.ac.in'], desc: 'Vibrant campus in Vadodara.' },
    { name: 'BITS Pilani', domains: ['bits-pilani.ac.in'], desc: 'Excellence in engineering and science.' },
    { name: 'DTU', domains: ['dtu.ac.in'], desc: 'Delhi Technological University Community.' },
    { name: 'SRM Institute', domains: ['srmist.edu.in'], desc: 'Connected SRM Campus.' }
];

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Cycles', 'Appliances', 'Notes', 'Stationery', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const SERVICE_CATEGORIES = ['Tutoring', 'Laundry', 'Delivery', 'Project Help', 'Technical Support', 'Repairs'];

async function seed() {
    try {
        console.log('🚀 Connecting to MongoDB:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        // 1. CLEANUP (Optional)
        console.log('🧹 Cleaning existing data...');
        await Promise.all([
            User.deleteMany({}),
            Community.deleteMany({}),
            Product.deleteMany({}),
            Service.deleteMany({}),
            Order.deleteMany({}),
            Review.deleteMany({}),
            BoardPost.deleteMany({}),
            Notification.deleteMany({})
        ]);

        // 2. CREATE COMMUNITIES
        console.log('🏘️ Seeding Communities...');
        const communities = await Community.insertMany(SAMPLE_COMMUNITIES.map(c => ({
            name: c.name,
            emailDomains: c.domains,
            description: c.desc,
            isActive: true,
            createdAt: new Date()
        })));

        // 3. CREATE USERS (50 Students)
        console.log('👥 Seeding 50 Users (Password: password123)...');
        const commonHash = await hashPassword('password123');
        const users = [];
        for (let i = 1; i <= 50; i++) {
            const comm = communities[i % communities.length];
            users.push({
                name: `Student ${i}`,
                username: `student_${i}`,
                email: `student${i}@${comm.emailDomains[0]}`,
                password: commonHash,
                role: 'user',
                gender: i % 2 === 0 ? 'male' : 'female',
                isVerified: true,
                verifiedCommunities: [comm._id],
                createdAt: new Date(Date.now() - (i * 3600000))
            });
        }
        const createdUsers = await User.insertMany(users);

        // 4. CREATE PRODUCTS (200 Units)
        console.log('🛒 Seeding 200 Products...');
        const products = [];
        for (let i = 1; i <= 200; i++) {
            const seller = createdUsers[i % 50];
            products.push({
                seller: seller._id,
                title: `Item ${i}: ${CATEGORIES[i % CATEGORIES.length]}`,
                description: `High quality academic used item ${i}. Used for 1 semester only.`,
                price: Math.floor(Math.random() * 5000) + 100,
                images: [`https://picsum.photos/seed/prod${i}/400/400`],
                category: CATEGORIES[i % CATEGORIES.length],
                condition: CONDITIONS[i % CONDITIONS.length],
                status: 'Available',
                community: seller.verifiedCommunities[0],
                visibility: 'Community'
            });
        }
        const createdProducts = await Product.insertMany(products);

        // 5. CREATE SERVICES (100 Units)
        console.log('🛠️ Seeding 100 Services...');
        const services = [];
        for (let i = 1; i <= 100; i++) {
            const provider = createdUsers[i % 50];
            services.push({
                provider: provider._id,
                title: `${SERVICE_CATEGORIES[i % SERVICE_CATEGORIES.length]} by ${provider.name}`,
                description: `Expert help in ${SERVICE_CATEGORIES[i % SERVICE_CATEGORIES.length]}. Contact for details.`,
                price: (Math.floor(Math.random() * 10) + 1) * 100,
                priceUnit: 'session',
                category: SERVICE_CATEGORIES[i % SERVICE_CATEGORIES.length],
                images: [`https://picsum.photos/seed/serv${i}/400/400`],
                status: 'Active',
                community: provider.verifiedCommunities[0]
            });
        }
        const createdServices = await Service.insertMany(services);

        // 6. CREATE BOARD POSTS (150 Posts - To test pagination)
        console.log('📢 Seeding 150 Circle Board Posts...');
        const posts = [];
        for (let i = 1; i <= 150; i++) {
            const author = createdUsers[i % 50];
            posts.push({
                author: author._id,
                community: author.verifiedCommunities[0],
                content: `Important campus update #${i}: Has anyone checked the new library timings?`,
                upvotes: createdUsers.slice(0, Math.floor(Math.random() * 10)).map(u => u._id),
                replies: [
                    { author: createdUsers[(i + 1) % 50]._id, content: 'Yes, it is now open 24/7!', createdAt: new Date() }
                ],
                createdAt: new Date(Date.now() - (i * 1800000)) // Spread out in time
            });
        }
        await BoardPost.insertMany(posts);

        // 7. CREATE SOME TRANSACTIONS (Orders & Reviews)
        console.log('🤝 Seeding Transactions...');
        for (let i = 0; i < 20; i++) {
            const buyer = createdUsers[i];
            const seller = createdUsers[i + 1];
            const product = createdProducts[i];
            
            const order = await Order.create({
                buyer: buyer._id,
                seller: seller._id,
                product: product._id,
                orderType: 'Product',
                itemPrice: product.price,
                totalAmount: product.price,
                status: 'Completed',
                paymentMethod: 'Cash'
            });

            await Review.create({
                reviewer: buyer._id,
                target: seller._id,
                order: order._id,
                product: product._id,
                rating: 5,
                comment: 'Great transaction! Item was exactly as described.'
            });
        }

        console.log('⭐ SEEDING COMPLETED SUCCESSFULLY ⭐');
        process.exit(0);

    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

seed();
