import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import User from '../models/User';
import Community from '../models/Community';
import Product from '../models/Product';
import Service from '../models/Service';
import Order from '../models/Order';
import Review from '../models/Review';
import BoardPost from '../models/BoardPost';
import Notification from '../models/Notification';
import { hashPassword } from '../lib/auth';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recircle';
const RECORD_PATH = path.join(process.cwd(), 'dummy_accounts_record.md');

// ================= CONSTANTS & CONSTRAINTS =================
const PU_DOMAIN = 'paruluniversity.ac.in';
const PU_COMMUNITY = { name: 'Parul University', domains: [PU_DOMAIN], desc: 'Vibrant campus in Vadodara.' };
const TOTAL_BOYS = 25;
const TOTAL_GIRLS = 15;
const PASSWORD = 'SAM124@sanyamRC';

const BOYS_HOSTELS = [
    'Shastri Bhawan – A', 'Shastri Bhawan – B', 'Shastri Bhawan – C', 'Kalam Bhawan – A', 'Kalam Bhawan – B', 'Kalam Bhawan – C', 
    'Tagore Bhawan – A', 'Tagore Bhawan – B', 'Tagore Bhawan – C', 'Dhyan Bhawan', 'Sardar Bhawan – A', 'Sardar Bhawan – B', 
    'Sardar Bhawan – C', 'Milkha Bhawan – A', 'Atal Bhawan – A1', 'Atal Bhawan – A2', 'Atal Bhawan – B', 'Azad Bhawan – A', 
    'Tilak Bhawan – A', 'Abraham Lincoln Bhawan – A', 'Ratan Tata Bhawan'
];
const GIRLS_HOSTELS = [
    'Sarojini Bhawan – A', 'Sarojini Bhawan – B', 'Sarojini Bhawan – C', 'Indira Bhawan – A', 'Indira Bhawan – B', 'Indira Bhawan – C', 
    'Teresa Bhawan – A', 'Teresa Bhawan – B', 'Teresa Bhawan – C', 'Teresa Bhawan – D', 'Janki Bhawan', 'Kalpana Bhawan – A', 
    'Kalpana Bhawan – B', 'Shakuntala Bhawan – A', 'Shakuntala Bhawan – B', 'Rani Laxmibai Bhawan – A', 'Rani Laxmibai Bhawan – B', 
    'Abraham Lincoln Bhawan – B'
];

const BOY_NAMES = ['Aarav', 'Vihaan', 'Vivaan', 'Advik', 'Kabir', 'Riyan', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Rudra', 'Aryan', 'Shivansh', 'Aarush', 'Dhruv', 'Kian', 'Yash', 'Dev', 'Arjun', 'Rohan', 'Neel', 'Aditya', 'Rahul'];
const GIRL_NAMES = ['Aadhya', 'Kiara', 'Prisha', 'Avni', 'Myra', 'Ira', 'Navya', 'Anvi', 'Shanaya', 'Nisha', 'Priya', 'Meera', 'Sneha', 'Tanya', 'Riya'];

// Dates: Jan 1, 2026 to May 17, 2026
const START_DATE = new Date('2026-01-01T00:00:00Z');
const MAX_DATE = new Date('2026-05-17T23:59:59Z');

// ================= LISTING TEMPLATES =================
const MALE_NEUTRAL_PRODUCTS = [
    { title: "Barely Used Arduino Uno Kit", desc: "Includes all sensors, jumper wires, and breadboard. Used for one mini-project.", price: 800, cat: "Microcontrollers & Sensors", images: ["https://images.unsplash.com/photo-1553406830-ef2513450d76?w=400"] },
    { title: "Casio fx-991EX Scientific Calculator", desc: "Perfect condition. Survived 3 semesters with me, no scratches.", price: 600, cat: "Electronics", images: ["https://images.unsplash.com/photo-1590845947376-2638caa89309?w=400"] },
    { title: "Yonex Carbon Badminton Racket", desc: "Excellent tension. Comes with full cover.", price: 1200, cat: "Sports Equipment", images: ["https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400"] },
    { title: "Zara Black Denim Jacket (Men's M)", desc: "Worn twice for fests. Selling because it's slightly tight now.", price: 900, cat: "Men's Wear", images: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400"] },
    { title: "Nike Air Force 1s (Size 9)", desc: "Cleaned and well-maintained. Authentic.", price: 2500, cat: "Footwear", images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400"] },
    { title: "Engineering Mathematics 3rd Sem Book", desc: "No pages missing. Essential for passing the midsems.", price: 200, cat: "Textbooks", images: ["https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400"] },
    { title: "Sony WH-1000XM4 Headphones", desc: "Noise cancelling is perfect for noisy hostels. With case.", price: 8500, cat: "Electronics", images: ["https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400"] },
    { title: "Hero Gearless Bicycle", desc: "Great for campus commute. Recently serviced.", price: 3000, cat: "Bicycles", images: ["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400"] }
];

const FEMALE_NEUTRAL_PRODUCTS = [
    { title: "Designer Lehenga (Pink)", desc: "Worn once for ethnic day. Very heavy embroidery.", price: 1500, cat: "Traditional & Ethnic", images: ["https://images.unsplash.com/photo-1610030469983-98e550d61dc0?w=400"] },
    { title: "Silver Oxidized Jhumkas", desc: "Beautiful heavy earrings. Never worn.", price: 250, cat: "Accessories", images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400"] },
    { title: "Philips Hair Dryer & Straightener Kit", desc: "Works perfectly. Moving out so selling it.", price: 1100, cat: "Appliances", images: ["https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400"] },
    { title: "Cute LED Fairy Lights (Warm)", desc: "Perfect for dorm decor. 5 meters long.", price: 150, cat: "Room Decor", images: ["https://images.unsplash.com/photo-1513519245088-0e12902e35a6?w=400"] },
    { title: "Women's Stylish Denim Jacket", desc: "H&M cropped denim jacket. Size S.", price: 750, cat: "Women's Wear", images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400"] },
    { title: "MacBook Pro M1 (2020)", desc: "Pristine condition. Battery health 92%.", price: 55000, cat: "Electronics", images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400"] },
    { title: "Stainless Steel Electric Kettle", desc: "Hostel life saver for Maggi and tea.", price: 400, cat: "Appliances", images: ["https://images.unsplash.com/photo-1594213114663-d94fac9bbafc?w=400"] },
    { title: "Dhoom Fest 2026 Entry Pass", desc: "Can't attend due to an exam. Selling at MRP.", price: 500, cat: "Event Passes & Tickets", images: ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400"] }
];

const SERVICES_TEMPLATES = [
    { title: "React/Next.js Project Help", desc: "I will help you debug or build your minor project.", price: 500, cat: "Academic Mentoring" },
    { title: "Professional PPT Design", desc: "Will make your presentation look sleek and professional.", price: 300, cat: "Graphic Design" },
    { title: "Hostel Room Cleaning", desc: "Thorough cleaning of your room and bathroom.", price: 200, cat: "Room Cleaning" },
    { title: "Math 2 (M2) Crash Course Tutoring", desc: "I scored an O grade. I will help you pass midsems easily.", price: 400, cat: "Tutoring" },
    { title: "Campus Ride to Station", desc: "Taking my bike to the station this Friday, hit me up.", price: 100, cat: "Carpooling & Rides" }
];

// ================= HELPERS =================
const randomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

function generateEmail() {
    const prefixes = ['22', '23', '24', '25'];
    const p = randomItem(prefixes);
    let rest = '';
    for (let i = 0; i < 13; i++) rest += Math.floor(Math.random() * 10);
    return `${p}${rest}@${PU_DOMAIN}`;
}

async function seed() {
    try {
        console.log('🚀 Connecting to MongoDB:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

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

        console.log('🏘️ Creating Parul University Community...');
        const puCommunity = await Community.create({
            name: PU_COMMUNITY.name,
            emailDomains: PU_COMMUNITY.domains,
            description: PU_COMMUNITY.desc,
            isActive: true,
            createdAt: new Date('2025-01-01T00:00:00Z')
        });

        console.log(`👥 Seeding ${TOTAL_BOYS + TOTAL_GIRLS} Dummy Accounts...`);
        const commonHash = await hashPassword(PASSWORD);
        const usersToCreate = [];
        let recordContent = `# 📚 Dummy Accounts Record\n\n**Total:** ${TOTAL_BOYS + TOTAL_GIRLS}\n**Password (All):** \`${PASSWORD}\`\n\n| Name | Gender | Email | Joining Date |\n|---|---|---|---|\n`;

        // Create Boys
        for (let i = 0; i < TOTAL_BOYS; i++) {
            const joinDate = randomDate(START_DATE, MAX_DATE);
            const email = generateEmail();
            usersToCreate.push({
                name: BOY_NAMES[i % BOY_NAMES.length],
                username: `user_${email.split('@')[0]}`,
                email: email,
                password: commonHash,
                role: 'user',
                gender: 'male',
                isVerified: true,
                verifiedCommunities: [puCommunity._id],
                location: {
                    hostel: randomItem(BOYS_HOSTELS),
                    room: "",
                    bed: ""
                },
                createdAt: joinDate
            });
        }

        // Create Girls
        for (let i = 0; i < TOTAL_GIRLS; i++) {
            const joinDate = randomDate(START_DATE, MAX_DATE);
            const email = generateEmail();
            usersToCreate.push({
                name: GIRL_NAMES[i % GIRL_NAMES.length],
                username: `user_${email.split('@')[0]}`,
                email: email,
                password: commonHash,
                role: 'user',
                gender: 'female',
                isVerified: true,
                verifiedCommunities: [puCommunity._id],
                location: {
                    hostel: randomItem(GIRLS_HOSTELS),
                    room: "",
                    bed: ""
                },
                createdAt: joinDate
            });
        }

        const createdUsers = await User.insertMany(usersToCreate);
        createdUsers.forEach(u => {
            recordContent += `| ${u.name} | ${u.gender} | ${u.email} | ${new Date(u.createdAt).toLocaleDateString()} |\n`;
        });

        fs.writeFileSync(RECORD_PATH, recordContent);
        console.log(`📝 Dummy accounts record saved to ${RECORD_PATH}`);

        console.log('🛒 Seeding Realistic Products & Services...');
        const products = [];
        const services = [];

        for (const user of createdUsers) {
            // Give each user 1-2 random products and 1 service, posted AFTER their join date
            const numProducts = Math.floor(Math.random() * 2) + 1;
            const itemPool = user.gender === 'male' ? MALE_NEUTRAL_PRODUCTS : FEMALE_NEUTRAL_PRODUCTS;

            for (let i = 0; i < numProducts; i++) {
                const template = randomItem(itemPool);
                products.push({
                    seller: user._id,
                    title: template.title,
                    description: template.desc,
                    price: template.price,
                    images: template.images,
                    category: template.cat,
                    condition: randomItem(['New', 'Like New', 'Good']),
                    status: 'Available',
                    community: puCommunity._id,
                    visibility: 'Community',
                    createdAt: randomDate(new Date(user.createdAt), MAX_DATE) // Strictly AFTER join date
                });
            }

            // 50% chance they offer a service
            if (Math.random() > 0.5) {
                const sTemplate = randomItem(SERVICES_TEMPLATES);
                services.push({
                    provider: user._id,
                    title: sTemplate.title,
                    description: sTemplate.desc,
                    price: sTemplate.price,
                    priceUnit: 'session',
                    category: sTemplate.cat,
                    images: [],
                    status: 'Active',
                    community: puCommunity._id,
                    createdAt: randomDate(new Date(user.createdAt), MAX_DATE) // Strictly AFTER join date
                });
            }
        }

        await Product.insertMany(products);
        await Service.insertMany(services);

        console.log('📢 Seeding Circle Board Posts...');
        const posts = [];
        for (let i = 0; i < 20; i++) {
            const author = randomItem(createdUsers);
            const postDate = randomDate(new Date(author.createdAt), MAX_DATE);
            posts.push({
                author: author._id,
                community: puCommunity._id,
                content: `Does anyone know the timing for the cultural fest registration? Needs to be done ASAP.`,
                upvotes: [],
                replies: [],
                createdAt: postDate
            });
        }
        await BoardPost.insertMany(posts);

        console.log('⭐ SEEDING COMPLETED SUCCESSFULLY ⭐');
        process.exit(0);

    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

seed();
