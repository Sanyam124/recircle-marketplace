const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

// --- Define Schemas (Simplified for Seeding) ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, unique: true, sparse: true },
  password: { type: String, select: false },
  role: { type: String, default: 'student' },
  isVerified: { type: Boolean, default: false },
  profilePicture: { type: String },
  bio: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  walletBalance: { type: Number, default: 0 }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  condition: { type: String, required: true },
  category: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  images: [{ type: String }],
  status: { type: String, default: 'Available' },
}, { timestamps: true });

const ServiceSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  priceUnit: { type: String, default: 'per hour' },
  category: { type: String, required: true },
  images: [{ type: String }],
  status: { type: String, default: 'Active' },
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  orderType: { type: String, enum: ['Product', 'Service_Appointment'], required: true },
  totalAmount: { type: Number, required: true },
  itemPrice: { type: Number, required: true },
  status: { type: String, default: 'Pending_Payment' },
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

const OfferSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  offeredPrice: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
}, { timestamps: true });

const ReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, default: 'Pending' },
}, { timestamps: true });

// Models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
const Offer = mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);
const Otp = mongoose.models.Otp || mongoose.model('Otp', new mongoose.Schema({}, { strict: false }));
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

async function seed() {
  try {
    console.log('Connecting to MongoDB...', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('⚠ CLEARING ALL DATA ⚠');
    await Promise.all([
      User.deleteMany({}), Product.deleteMany({}), Service.deleteMany({}),
      Review.deleteMany({}), Order.deleteMany({}), Message.deleteMany({}),
      Notification.deleteMany({}), Offer.deleteMany({}), Report.deleteMany({}),
      Otp.deleteMany({}), Transaction.deleteMany({})
    ]);
    console.log('All collections cleared.');

    const hashedPassword = await bcrypt.hash('test1234', 10);
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    // 1. Create Users
    console.log('Creating Users...');
    const users = await User.create([
      { name: 'Admin User', email: 'admin@recircle.com', password: hashedPassword, role: 'admin', isVerified: true, profilePicture: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff' },
      { name: 'Sanyam Sharma', email: 'sanyam@test.com', password: hashedPassword, role: 'student', isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', bio: 'CS student, loves hardware.' },
      { name: 'Priya Patel', email: 'priya@test.com', password: hashedPassword, role: 'student', isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', bio: 'Avid reader.' },
      { name: 'Rahul Verma', email: 'rahul@test.com', password: hashedPassword, role: 'student', isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', bio: 'Photography enthusiast.' },
      { name: 'Anjali Gupta', email: 'anjali@test.com', password: hashedPassword, role: 'student', isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80', bio: 'Graphic designer.' }
    ]);
    const [uAdmin, uSanyam, uPriya, uRahul, uAnjali] = users;
    const students = [uSanyam, uPriya, uRahul, uAnjali];

    // 2. Heavy Seeding: Products & Services
    console.log('Generating heavy volume of Products & Services...');
    
    const productCategories = ['Textbooks', 'Electronics', 'Stationery', 'Furniture', 'Other'];
    const serviceCategories = ['Academic Help', 'Tech Support', 'Design', 'Photography', 'Fitness'];
    const conditions = ['New', 'Like New', 'Good', 'Fair'];
    
    const productsData = [];
    const servicesData = [];

    // Generate 45 Products
    for (let i = 0; i < 45; i++) {
        const student = students[i % students.length];
        const cat = productCategories[i % productCategories.length];
        productsData.push({
            seller: student._id,
            title: `${cat} Item #${i+1}`,
            description: `This is a high-quality ${cat.toLowerCase()} item for sale. Tested and working perfectly.`,
            price: Math.floor(Math.random() * 2000) + 100,
            condition: conditions[i % conditions.length],
            category: cat,
            pickupAddress: `Hostel Block ${String.fromCharCode(65 + (i % 5))}, Room ${100 + i}`,
            images: [`https://picsum.photos/seed/product${i}/800/600`],
            status: i % 10 === 0 ? 'Sold' : 'Available',
            createdAt: new Date(now - Math.random() * (7 * oneDay))
        });
    }

    // Generate 45 Services
    for (let i = 0; i < 45; i++) {
        const student = students[i % students.length];
        const cat = serviceCategories[i % serviceCategories.length];
        servicesData.push({
            provider: student._id,
            title: `${cat} Pro Service #${i+1}`,
            description: `Professional ${cat.toLowerCase()} service provided by an experienced student. Fast and reliable.`,
            price: Math.floor(Math.random() * 500) + 50,
            priceUnit: i % 2 === 0 ? 'hour' : 'session',
            category: cat,
            images: [`https://picsum.photos/seed/service${i}/800/600`],
            status: i % 15 === 0 ? 'Inactive' : 'Active',
            createdAt: new Date(now - Math.random() * (7 * oneDay))
        });
    }

    const createdProducts = await Product.create(productsData);
    const createdServices = await Service.create(servicesData);
    console.log(`Created ${createdProducts.length} products and ${createdServices.length} services.`);

    // 3. Heavy Seeding: Reviews
    console.log('Generating 30+ Reviews...');
    const reviewsData = [];
    for (let i = 0; i < 35; i++) {
        const reviewer = students[i % students.length];
        const target = students[(i + 1) % students.length];
        reviewsData.push({
            reviewer: reviewer._id,
            target: target._id,
            rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 star for healthy look
            comment: `Great experience working with ${target.name}. Very professional and polite!`,
            createdAt: new Date(now - Math.random() * (5 * oneDay))
        });
    }
    await Review.create(reviewsData);

    // 4. Interlinked Data (Offers, Orders, Messages)
    console.log('Seeding Interlinked scenarios...');
    
    // Scenario: Interactive threads
    const messagesData = [];
    for (let i = 0; i < 15; i++) {
        const buyer = students[i % students.length];
        const seller = students[(i + 2) % students.length];
        const prod = createdProducts[i];
        messagesData.push(
            { sender: buyer._id, recipient: seller._id, product: prod._id, content: `Is the ${prod.title} still available?` },
            { sender: seller._id, recipient: buyer._id, product: prod._id, content: `Yes, it is! When can you pick it up?` }
        );
    }
    await Message.create(messagesData);

    // Offers & Orders
    for (let i = 0; i < 10; i++) {
        const buyer = students[i % students.length];
        const prod = createdProducts[i + 20]; // Different batch
        const offeredPrice = Math.floor(prod.price * 0.9);
        
        const offer = await Offer.create({
            buyer: buyer._id,
            seller: prod.seller,
            product: prod._id,
            offeredPrice,
            originalPrice: prod.price,
            status: i % 2 === 0 ? 'Accepted' : 'Pending'
        });

        if (offer.status === 'Accepted') {
            await Order.create({
                buyer: buyer._id,
                seller: prod.seller,
                product: prod._id,
                orderType: 'Product',
                itemPrice: offeredPrice,
                totalAmount: offeredPrice,
                status: 'Completed'
            });
            await Product.findByIdAndUpdate(prod._id, { status: 'Sold' });
        }
    }

    // Notifications
    await Notification.create([
      { recipient: uSanyam._id, sender: uPriya._id, type: 'OFFER_RECEIVED', message: 'Priya Patel sent an offer of ₹750 for Arduino Uno Starter Kit', link: '/inbox' },
      { recipient: uPriya._id, sender: uSanyam._id, type: 'OFFER_ACCEPTED', message: 'Sanyam Sharma accepted your offer for Arduino Uno Starter Kit', link: '/orders' },
      { recipient: uAdmin._id, sender: uPriya._id, type: 'ADMIN_ALERT', message: 'New user verification pending: Priya Patel', link: '/admin/users' }
    ]);

    // 4. Create Reviews
    console.log('Seeding Reviews...');
    await Review.create([
      { reviewer: uPriya._id, target: uSanyam._id, rating: 5, comment: 'Great seller! The kit was perfect.' },
      { reviewer: uRahul._id, target: uAnjali._id, rating: 4, comment: 'Cool poster designs.' }
    ]);

    // 5. Reports
    await Report.create({
      reporter: uRahul._id, targetUser: uSanyam._id, reason: 'Duplicate listing detected.', status: 'Pending'
    });

    console.log('Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
