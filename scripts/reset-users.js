const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, unique: true, sparse: true },
  password: { type: String, select: false },
  role: { type: String, default: 'student' },
  isVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  walletBalance: { type: Number, default: 0 },
  profilePicture: { type: String },
  bio: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  condition: { type: String, required: true },
  category: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  images: [String],
  status: { type: String, default: 'Available' },
}, { timestamps: true });

const ServiceSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  priceUnit: { type: String, default: 'per hour' },
  category: { type: String, required: true },
  availability: { type: String },
  images: [String],
  status: { type: String, default: 'Active' },
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  orderType: { type: String, enum: ['Product', 'Service_Appointment'], default: 'Product' },
  itemPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Completed' },
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true },
  comment: { type: String },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

async function reset() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Cleaning collections...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Service.deleteMany({}),
      Order.deleteMany({}),
      Review.deleteMany({})
    ]);

    const hashedPassword = await bcrypt.hash('test1234', 10);

    console.log('Seeding 10 Users...');
    const usersData = [
      { name: 'Sanyam Sharma', username: 'sanyam', email: 'sanyam@test.com', role: 'user', gender: 'male', isVerified: true, bio: 'CS student at IITB. Tech enthusiast.' },
      { name: 'Priya Patel', username: 'priya', email: 'priya@test.com', role: 'user', gender: 'female', isVerified: true, bio: 'Marketing student. Photography lover.' },
      { name: 'Rahul Verma', username: 'rahul', email: 'rahul@test.com', role: 'user', gender: 'male', isVerified: true, bio: 'Mechanical engineer. DIY specialist.' },
      { name: 'Anjali Gupta', username: 'anjali', email: 'anjali@test.com', role: 'user', gender: 'female', isVerified: true, bio: 'Design student. Creative soul.' },
      { name: 'Vikram Singh', username: 'vikram', email: 'vikram@test.com', role: 'user', gender: 'male', isVerified: true, bio: 'Professor of Physics.' },
      { name: 'Sneha Reddy', username: 'sneha', email: 'sneha@test.com', role: 'user', gender: 'female', isVerified: true },
      { name: 'Arjun Das', username: 'arjun', email: 'arjun@test.com', role: 'user', gender: 'male', isVerified: true },
      { name: 'Kavita Iyer', username: 'kavita', email: 'kavita@test.com', role: 'user', gender: 'female', isVerified: true },
      { name: 'Admin User', username: 'admin', email: 'admin@recircle.com', role: 'admin', gender: 'other', isVerified: true },
      { name: 'Staff User', username: 'staff', email: 'staff@recircle.com', role: 'user', gender: 'male', isVerified: true }
    ];

    const users = await User.create(usersData.map(u => ({ ...u, password: hashedPassword })));
    const getU = (uname) => users.find(u => u.username === uname);

    console.log('Seeding 12 Products...');
    const products = await Product.create([
      { seller: getU('priya')._id, title: 'Calculus III Textbook', price: 450, category: 'Textbooks', condition: 'Gently Used', pickupAddress: 'Hostel 12', images: ['https://images.unsplash.com/photo-1543004218-283029ee9b07?w=400'], status: 'Available', description: 'Comprehensive guide for advanced calculus. No markings inside.' },
      { seller: getU('priya')._id, title: 'Canvas Backpack', price: 900, category: 'Bags', condition: 'Like New', pickupAddress: 'Hostel 12', images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'], status: 'Available', description: 'Sturdy canvas material, midnight blue color. Fits 15-inch laptop.' },
      { seller: getU('sanyam')._id, title: 'Arduino Uno Kit', price: 1200, category: 'Electronics', condition: 'Open Box', pickupAddress: 'Hostel 5', images: ['https://images.unsplash.com/photo-1553406830-ef2513450d76?w=400'], status: 'Sold', description: 'Complete starter kit with sensors and cables. Only used for one project.' },
      { seller: getU('sanyam')._id, title: 'Logitech G502 Mouse', price: 1500, category: 'Computing', condition: 'Good', pickupAddress: 'Hostel 5', images: ['https://images.unsplash.com/photo-1527814050087-37a3c71ccec7?w=400'], status: 'Available', description: 'High-performance gaming mouse with adjustable weights.' },
      { seller: getU('rahul')._id, title: 'Multi-tool Kit', price: 600, category: 'Tools', condition: 'Used', pickupAddress: 'Workshop Area', images: ['https://images.unsplash.com/photo-1530124560676-44b291d90bc5?w=400'], status: 'Available', description: 'Essential tools for hostel room repairs and DIY projects.' },
      { seller: getU('rahul')._id, title: 'Desk Lamp', price: 300, category: 'Furniture', condition: 'Good', pickupAddress: 'Hostel 3', images: ['https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=400'], status: 'Available', description: 'Flexible neck LED lamp. Very energy efficient.' },
      { seller: getU('anjali')._id, title: 'Sketching Pencils Set', price: 400, category: 'Stationery', condition: 'New', pickupAddress: 'Design Lab', images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'], status: 'Available', description: 'Professional grade HB-8B pencil set for artists.' },
      { seller: getU('sneha')._id, title: 'Novels Bundle', price: 500, category: 'Books', condition: 'Good', pickupAddress: 'Girls Hostel', images: ['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400'], status: 'Available', description: 'Set of 4 best-selling fiction novels.' },
      { seller: getU('arjun')._id, title: 'Yoga Mat', price: 350, category: 'Sports', condition: 'Used', pickupAddress: 'Gymkhana', images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400'], status: 'Available', description: '6mm thick anti-skid mat. Blue color.' },
      { seller: getU('kavita')._id, title: 'Plant Pots (3)', price: 150, category: 'Home', condition: 'Good', pickupAddress: 'Hostel 15', images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400'], status: 'Available', description: 'Ceramic pots for small indoor plants.' },
      { seller: getU('vikram')._id, title: 'Whiteboard Markers', price: 100, category: 'Stationery', condition: 'New', pickupAddress: 'Dept of Physics', images: ['https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=400'], status: 'Sold', description: 'Pack of 4 refillable markers (Black, Blue, Red, Green).' },
      { seller: getU('rahul')._id, title: 'Cycle Lock', price: 200, category: 'Accessories', condition: 'Good', pickupAddress: 'Cycle Stand', images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400'], status: 'Available', description: 'Heavy-duty steel wire lock with 2 keys.' }
    ]);

    console.log('Seeding 6 Services...');
    const services = await Service.create([
      { provider: getU('sanyam')._id, title: 'Python Tutoring', price: 300, category: 'Tutoring', description: 'Help with basic syntax and projects.', status: 'Active', images: ['https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400'] },
      { provider: getU('anjali')._id, title: 'Graphic Design', price: 500, category: 'Design', description: 'Poster design, logos, UI sketches.', status: 'Active', images: ['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400'] },
      { provider: getU('rahul')._id, title: 'PC Cleaning', price: 250, category: 'Tech Support', description: 'Thermal paste application and dust removal.', status: 'Active', images: ['https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400'] },
      { provider: getU('priya')._id, title: 'Event Photography', price: 800, category: 'Photography', description: 'High quality shots for campus events.', status: 'Active', images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'] },
      { provider: getU('arjun')._id, title: 'Guitar Lessons', price: 400, category: 'Music', description: 'Beginner lessons for acoustic guitar.', status: 'Active', images: ['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400'] },
      { provider: getU('sneha')._id, title: 'Proofreading', price: 200, category: 'Consulting', description: 'Checking reports for grammar and flow.', status: 'Active', images: ['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400'] }
    ]);

    console.log('Seeding 10 Orders (Purchases)...');
    // Generating some completed orders for verification status and user history
    const orders = await Order.create([
      { buyer: getU('rahul')._id, seller: getU('sanyam')._id, product: products.find(p => p.title === 'Arduino Uno Kit')._id, itemPrice: 1200, totalAmount: 1200, status: 'Completed', orderType: 'Product' },
      { buyer: getU('sanyam')._id, seller: getU('vikram')._id, product: products.find(p => p.title === 'Whiteboard Markers')._id, itemPrice: 100, totalAmount: 100, status: 'Completed', orderType: 'Product' },
      { buyer: getU('anjali')._id, seller: getU('priya')._id, product: products.find(p => p.title === 'Calculus III Textbook')._id, itemPrice: 450, totalAmount: 450, status: 'Completed', orderType: 'Product' },
      { buyer: getU('priya')._id, seller: getU('anjali')._id, service: services.find(s => s.title === 'Graphic Design')._id, itemPrice: 500, totalAmount: 500, status: 'Completed', orderType: 'Service_Appointment' },
      { buyer: getU('sanyam')._id, seller: getU('rahul')._id, service: services.find(s => s.title === 'PC Cleaning')._id, itemPrice: 250, totalAmount: 250, status: 'Completed', orderType: 'Service_Appointment' },
      { buyer: getU('sneha')._id, seller: getU('arjun')._id, service: services.find(s => s.title === 'Guitar Lessons')._id, itemPrice: 400, totalAmount: 400, status: 'Completed', orderType: 'Service_Appointment' },
      { buyer: getU('arjun')._id, seller: getU('sneha')._id, service: services.find(s => s.title === 'Proofreading')._id, itemPrice: 200, totalAmount: 200, status: 'Completed', orderType: 'Service_Appointment' },
      { buyer: getU('kavita')._id, seller: getU('priya')._id, product: products.find(p => p.title === 'Canvas Backpack')._id, itemPrice: 900, totalAmount: 900, status: 'Completed', orderType: 'Product' },
      { buyer: getU('vikram')._id, seller: getU('sanyam')._id, service: services.find(s => s.title === 'Python Tutoring')._id, itemPrice: 300, totalAmount: 300, status: 'Completed', orderType: 'Service_Appointment' },
      { buyer: getU('rahul')._id, seller: getU('anjali')._id, service: services.find(s => s.title === 'Graphic Design')._id, itemPrice: 500, totalAmount: 500, status: 'Completed', orderType: 'Service_Appointment' }
    ]);

    console.log('Seeding 8 Reviews...');
    await Review.create([
      { reviewer: getU('rahul')._id, target: getU('sanyam')._id, rating: 5, comment: 'Great condition, helpful explanation on how to use it!' },
      { reviewer: getU('sanyam')._id, target: getU('vikram')._id, rating: 4, comment: 'Simple markers, seller was very polite.' },
      { reviewer: getU('anjali')._id, target: getU('priya')._id, rating: 5, comment: 'Book is like new. Fast handoff.' },
      { reviewer: getU('priya')._id, target: getU('anjali')._id, rating: 5, comment: 'Incredible design work! Really understood the brief.' },
      { reviewer: getU('sanyam')._id, target: getU('rahul')._id, rating: 4, comment: 'PC runs much cooler now. Recommended.' },
      { reviewer: getU('sneha')._id, target: getU('arjun')._id, rating: 5, comment: 'Patient teacher, learned 3 chords in the first session!' },
      { reviewer: getU('kavita')._id, target: getU('priya')._id, rating: 5, comment: 'The bag is super durable. Thanks Priya!' },
      { reviewer: getU('vikram')._id, target: getU('sanyam')._id, rating: 5, comment: 'Excellent tutoring. Very clear concepts.' }
    ]);

    console.log('Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

reset();
