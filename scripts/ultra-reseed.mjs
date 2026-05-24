import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

// Reuse logic from reseed-all but use updated accounts and specific university
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
    bannerImage: { type: String },
    bio: { type: String, default: '' },
    authProvider: { type: String, default: 'email' }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String },
    forSell: { type: Boolean, default: true },
    forRent: { type: Boolean, default: false },
    price: { type: Number },
    category: { type: String },
    condition: { type: String },
    images: [{ type: String }],
    status: { type: String, default: 'Available' },
    visibility: { type: String, default: 'Public' },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    location: { pincode: String, city: String, state: String, coordinates: [Number], isPrecise: Boolean }
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
    location: { pincode: String, city: String, state: String, coordinates: [Number], isPrecise: Boolean }
}, { timestamps: true });

// Models
const Community = mongoose.models.Community || mongoose.model('Community', CommunitySchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
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
const BoardPost = mongoose.models.BoardPost || mongoose.model('BoardPost', BoardPostSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);

const ACCOUNTS = [
    { name: 'Sanyam Sharma', email: 'sanyamsharma124@gmail.com', role: 'admin' },
    { name: 'SECRET ARTIST SS', email: 'sanyamsharma0610@gmail.com', role: 'user' },
    { name: 'Kamlesh Sharma', email: 'sharmakk691@gmail.com', role: 'user' },
    { name: 'SANYAM KAMLESH SHARMA', email: '2303051240321@paruluniversity.ac.in', role: 'user' },
    { name: 'Sanyam Sharma', email: 'sanyam.sharma.work@gmail.com', role: 'user' },
    { name: 'GameBig', email: 'gamebig0610@gmail.com', role: 'user' },
    { name: 'PSYCHO KING', email: 'sanyamsharma1006@gmail.com', role: 'user' },
    { name: 'Claude 1', email: 'sam.claude.code.1@gmail.com', role: 'user' },
    { name: 'Claude 2', email: 'sam.claude.code.2@gmail.com', role: 'user' },
    { name: 'Tech Gamerz', email: 'sanyamsharmaq123@gmail.com', role: 'user' },
    { name: 'ReCircle', email: 'recircle.support@gmail.com', role: 'user' }
];

const CATEGORIES = {
    Products: [
        'Electronics & Gadgets', 'Textbooks & Study Material', 'Fashion & Clothing', 
        'Dorm Essentials & Furniture', 'Hobby & Sports', 'Bicycles & Transport', 
        'Appliances', 'Musical Instruments', 'Art & Collectibles'
    ],
    Services: [
        'Academic Tutoring', 'Tech Support & Repairs', 'Laundry & Cleaning',
        'Graphic Design & Creative', 'Photography & Events', 'Personal Training',
        'Coding & Development', 'Notes & Assignments Help'
    ]
};

const PRODUCT_TEMPLATES = [
    { title: 'MacBook Air M2 (Starlight)', desc: 'Barely used, only 20 battery cycles. Perfect for students.', cat: 'Electronics & Gadgets', price: 78000 },
    { title: 'Kindle Paperwhite 11th Gen', desc: 'Comes with a premium leather cover. Great for reading library books.', cat: 'Electronics & Gadgets', price: 9500 },
    { title: 'Intro to Algorithms (CLRS)', desc: 'The holy grail of CS students. No markings inside.', cat: 'Textbooks & Study Material', price: 1200 },
    { title: 'Mechanical Keyboard (RGB)', desc: 'Blue switches, very clicky. Comes with extra keycaps.', cat: 'Electronics & Gadgets', price: 2500 },
    { title: 'Noise Cancelling Headphones', desc: 'Perfect for studying in noisy cafeterias.', cat: 'Electronics & Gadgets', price: 4500 },
    { title: 'Study Desk Lamp', desc: 'Adjustable brightness and color temperature.', cat: 'Dorm Essentials & Furniture', price: 850 },
    { title: 'Ergonomic Chair', desc: 'Lumbar support, adjustable height. Good for long study sessions.', cat: 'Dorm Essentials & Furniture', price: 6000 },
    { title: 'Scientific Calculator fx-991EX', desc: 'Allowed in most exams. Solar powered.', cat: 'Stationery', price: 900 },
    { title: 'Denim Jacket (Vintage)', desc: 'Oversized fit, very comfortable.', cat: 'Fashion & Clothing', price: 1500 },
    { title: 'Mountain Bike (21 Speed)', desc: 'Perfect for campus commute. Recently serviced.', cat: 'Bicycles & Transport', price: 8000 },
    { title: 'Guitar (Acoustic)', desc: 'Fender FA-115. Great for beginners.', cat: 'Musical Instruments', price: 7500 },
    { title: 'Dorm Mini Fridge', desc: 'Keeps drinks ice cold. Silent operation.', cat: 'Appliances', price: 5500 },
];

const SERVICE_TEMPLATES = [
    { title: 'Python Development Help', desc: 'Need help with your Django or Flask project? I can assist with debugging and architecture.', cat: 'Coding & Development', price: 500, unit: 'hour' },
    { title: 'Professional Resume Design', desc: 'Stand out from the crowd with a modern ATS-friendly resume.', cat: 'Graphic Design & Creative', price: 300, unit: 'fixed' },
    { title: 'Mathematics Tutoring', desc: 'Calculus, Linear Algebra, and Statistics. simplified explanations.', cat: 'Academic Tutoring', price: 400, unit: 'hour' },
    { title: 'DSLR Photography Session', desc: 'High quality portraits for LinkedIn or Instagram.', cat: 'Photography & Events', price: 1000, unit: 'session' },
    { title: 'Laptop Dusting & Thermal Pasting', desc: 'Overheating issues? I can clean your fans and repaste the CPU.', cat: 'Tech Support & Repairs', price: 600, unit: 'fixed' },
    { title: 'Handwritten Notes (Semester 4)', desc: 'Complete notes for all core subjects. Very organized.', cat: 'Academic Help (Tutoring, Notes)', price: 200, unit: 'fixed' },
];

async function seed() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected!');

        console.log('🧹 Clearing listings, community board, reviews, and university data...');
        // We DELETE EVERYTHING as requested: "remove everythoing from the database"
        // But we re-initialize the specified accounts
        await Promise.all([
            Community.deleteMany({}),
            User.deleteMany({}),
            Product.deleteMany({}),
            Service.deleteMany({}),
            mongoose.connection.collection('reviews')?.deleteMany({}),
            mongoose.connection.collection('messages')?.deleteMany({}),
            mongoose.connection.collection('conversations')?.deleteMany({}),
            mongoose.connection.collection('notifications')?.deleteMany({}),
            mongoose.connection.collection('otps')?.deleteMany({}),
            mongoose.connection.collection('reports')?.deleteMany({}),
            mongoose.connection.collection('orders')?.deleteMany({}),
            mongoose.connection.collection('boardposts')?.deleteMany({}),
            mongoose.connection.collection('wishlists')?.deleteMany({}),
            mongoose.connection.collection('verificationrequests')?.deleteMany({})
        ]);
        console.log('✨ Database fully purged.');

        console.log('🏘️ Creating Parul University Community...');
        const parulUni = await Community.create({
            name: 'Parul University',
            description: 'The vibrant campus of Parul University, Vadodara.',
            emailDomains: ['paruluniversity.ac.in', 'parul.edu.in'],
            isActive: true,
            hostels: [
              'Shastri Bhawan – A', 'Shastri Bhawan – B', 'Shastri Bhawan – C',
              'Kalam Bhawan – A', 'Kalam Bhawan – B', 'Kalam Bhawan – C',
              'Tagore Bhawan – A', 'Tagore Bhawan – B', 'Tagore Bhawan – C',
              'Dhyan Bhawan',
              'Sardar Bhawan – A', 'Sardar Bhawan – B', 'Sardar Bhawan – C',
              'Milkha Bhawan – A',
              'Atal Bhawan – A1', 'Atal Bhawan – A2', 'Atal Bhawan – B',
              'Azad Bhawan – A',
              'Tilak Bhawan – A',
              'Abraham Lincoln Bhawan – A', 'Abraham Lincoln Bhawan – B',
              'Ratan Tata Bhawan',
              'Sarojini Bhawan – A', 'Sarojini Bhawan – B', 'Sarojini Bhawan – C',
              'Indira Bhawan – A', 'Indira Bhawan – B', 'Indira Bhawan – C',
              'Teresa Bhawan – A', 'Teresa Bhawan – B', 'Teresa Bhawan – C', 'Teresa Bhawan – D',
              'Janki Bhawan',
              'Kalpana Bhawan – A', 'Kalpana Bhawan – B',
              'Shakuntala Bhawan – A', 'Shakuntala Bhawan – B',
              'Rani Laxmibai Bhawan – A', 'Rani Laxmibai Bhawan – B'
            ]
        });

        console.log('👤 Initializing User Accounts...');
        const password = await bcrypt.hash('Sanyam@123', 10);
        const users = [];

        for (const acc of ACCOUNTS) {
            const username = acc.email.split('@')[0].replace(/\./g, '_');
            const isUniUser = acc.email.includes('paruluniversity.ac.in');
            
            const u = await User.create({
                name: acc.name,
                email: acc.email,
                username: username,
                password: password,
                role: acc.role,
                isVerified: true,
                isPhoneVerified: true,
                verifiedCommunities: isUniUser ? [parulUni._id] : [],
                defaultCommunity: isUniUser ? parulUni._id : undefined,
                authProvider: 'email',
                status: 'Active',
                profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name)}&background=random&color=fff&size=256`,
                bannerImage: `https://picsum.photos/seed/${username}/1200/400`,
                bio: `Passionate market member contributing high-quality ${isUniUser ? 'campus' : 'public'} deals.`
            });
            users.push(u);
        }

        console.log(`📦 Seeding 150+ high-quality items for ${users.length} accounts...`);
        
        let counter = 0;
        for (const user of users) {
             const isUniMember = user.email.includes('paruluniversity.ac.in');
             
             // Each account gets ~15 items
             for (let i = 0; i < 15; i++) {
                 counter++;
                 const isProduct = Math.random() > 0.3; // 70% products, 30% services
                 const isCommunity = isUniMember && Math.random() > 0.4; // Mix of public/community for uni users
                 
                 const category = isProduct 
                    ? CATEGORIES.Products[Math.floor(Math.random() * CATEGORIES.Products.length)]
                    : CATEGORIES.Services[Math.floor(Math.random() * CATEGORIES.Services.length)];

                 const template = isProduct 
                    ? PRODUCT_TEMPLATES[Math.floor(Math.random() * PRODUCT_TEMPLATES.length)]
                    : SERVICE_TEMPLATES[Math.floor(Math.random() * SERVICE_TEMPLATES.length)];

                 if (isProduct) {
                    await Product.create({
                        seller: user._id,
                        title: `${template.title} #${counter}`,
                        description: `${template.desc} Clean condition and ready for a new home. Looking for verified buyers nearby.`,
                        price: template.price + Math.floor(Math.random() * 200),
                        category: category,
                        condition: ['New', 'Like New', 'Good'][Math.floor(Math.random() * 3)],
                        images: [`https://picsum.photos/seed/prod${counter}/600/600`, `https://picsum.photos/seed/detail${counter}/600/600`],
                        status: Math.random() > 0.9 ? 'Sold' : 'Available',
                        visibility: isCommunity ? 'Community' : 'Public',
                        community: isCommunity ? parulUni._id : undefined,
                        location: isCommunity ? {
                            hostel: 'Nivedita Bhavan',
                            room: Math.floor(Math.random() * 300) + 1,
                            bed: Math.floor(Math.random() * 4) + 1
                        } : {
                            pincode: '391760',
                            city: 'Vadodara',
                            state: 'Gujarat',
                            coordinates: [73.3644, 22.2890], // Coordinates for Parul University area
                            isPrecise: true
                        }
                    });
                 } else {
                    await Service.create({
                        provider: user._id,
                        title: `${template.title} specialized`,
                        description: `${template.desc} professional service with 100% satisfaction guaranteed. Happy to help campus peers.`,
                        price: template.price,
                        priceUnit: template.unit,
                        category: category,
                        images: [`https://picsum.photos/seed/serv${counter}/600/600`],
                        status: 'Active',
                        visibility: isCommunity ? 'Community' : 'Public',
                        community: isCommunity ? parulUni._id : undefined,
                        location: {
                            pincode: '391760',
                            city: 'Vadodara',
                            state: 'Gujarat',
                            coordinates: [73.3644, 22.2890],
                            isPrecise: true
                        }
                    });
                 }
             }
        }

        console.log(`📌 Seeding board posts for Parul University...`);
        const uniUsers = users.filter(u => u.email.includes('paruluniversity.ac.in'));
        const boardPostContents = [
            "Does anyone have a spare Engineering Physics lab manual? Need it for tomorrow's session.",
            "Selling my semester 2 notes (ME/EE/CS). Highly organized and verified by profs!",
            "Anyone up for a game of football at the main ground today around 5 PM?",
            "Lost my keys near the cafeteria. If anyone finds it, please let me know. They have a blue keychain.",
            "Can anyone recommend a good place for laptop repairs near campus? Screen is flickering.",
            "Is the central library open late today for the upcoming mid-sems?",
            "Hostel residents: Anyone interested in a shared ride to the railway station this weekend?",
            "Freshers: Don't miss the cultural fest registration at the student center!"
        ];

        for (const postContent of boardPostContents) {
            const author = uniUsers[Math.floor(Math.random() * uniUsers.length)];
            await BoardPost.create({
                author: author._id,
                community: parulUni._id,
                content: postContent,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72), // 72 hours
                upvotes: uniUsers.slice(0, 3).map(u => u._id)
            });
        }

        console.log(`✅ Success! Seeded 165 premium listings and 8 board posts across 11 accounts.`);
        console.log(`🎓 Community Created: Parul University (${parulUni._id})`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
