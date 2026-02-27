/**
 * seed-pagination-test.js
 * 
 * Populates the DB with a LARGE volume of data to stress-test all pagination.
 * 
 * What gets seeded (for the PRIMARY user = sanyam):
 *   - 60  Products  (seller = sanyam)        → tests Products page pagination (8/page)
 *   - 35  Services  (provider = sanyam)      → tests Services page pagination (8/page)
 *   - 40  Reviews   (target = sanyam)        → tests ReviewSection Load More (5/page)
 *   - 35  Orders    (buyer = sanyam)         → tests Profile purchases section (4 → See All)
 *   - 50  Messages  (sanyam ↔ priya)        → tests Chat infinite scroll (20/page)
 * 
 * All existing products, services, orders, reviews, messages are CLEARED first.
 * Users are preserved (not deleted).
 * 
 * Run: node seed-pagination-test.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: String, username: String, email: String,
  password: String, role: String, isVerified: Boolean,
  gender: String, bio: String, wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String, description: String, price: Number, condition: String,
  category: String, pickupAddress: String, images: [String],
  status: { type: String, default: 'Available' },
}, { timestamps: true });

const ServiceSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String, description: String, price: Number,
  priceUnit: { type: String, default: 'per hour' },
  category: String, availability: String, images: [String],
  status: { type: String, default: 'Active' },
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  orderType: { type: String, default: 'Product' },
  itemPrice: Number, totalAmount: Number,
  status: { type: String, default: 'Completed' },
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: Number, comment: String,
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String, isRead: { type: Boolean, default: true },
}, { timestamps: true });

const User    = mongoose.models.User    || mongoose.model('User',    UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
const Order   = mongoose.models.Order   || mongoose.model('Order',   OrderSchema);
const Review  = mongoose.models.Review  || mongoose.model('Review',  ReviewSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// ─── Data pools ───────────────────────────────────────────────────────────────

const PRODUCT_CATEGORIES = ['Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Books', 'Stationery', 'Sports', 'Computing', 'Tools', 'Home'];
const SERVICE_CATEGORIES = ['Tutoring', 'Design', 'Tech Support', 'Photography', 'Music', 'Consulting', 'Fitness', 'Writing'];
const CONDITIONS         = ['New', 'Like New', 'Good', 'Gently Used', 'Used', 'Open Box'];
const PRICE_UNITS        = ['per hour', 'per session', 'per day', 'per project'];
const STATUSES           = ['Available', 'Available', 'Available', 'Sold']; // Bias towards Available

const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1543004218-283029ee9b07?w=400',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=400',
  'https://images.unsplash.com/photo-1527814050087-37a3c71ccec7?w=400',
  'https://images.unsplash.com/photo-1530124560676-44b291d90bc5?w=400',
  'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=400',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400',
];

const SERVICE_IMAGES = [
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400',
  'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400',
  'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400',
];

const REVIEW_COMMENTS = [
  'Excellent experience, highly recommend!',
  'Very professional and reliable.',
  'Great quality, exactly as described.',
  'Could be better but overall satisfactory.',
  'Amazing! Will definitely come back.',
  'Quick and efficient. No complaints.',
  'Value for money. Happy with the purchase.',
  'Good communication, smooth transaction.',
  'Slightly delayed but the quality was worth it.',
  'Perfect. Exactly what I needed.',
  'Super helpful and friendly seller.',
  'The item was in even better condition than expected.',
  'Quick response and prompt delivery.',
  'Highly knowledgeable, explained everything clearly.',
  'Very patient teacher, learned a lot!',
  'Would have preferred more details upfront.',
  'Smooth handoff, no issues at all.',
  'Wonderful experience from start to finish.',
  'The product works perfectly, no defects.',
  'Well packaged and presented. Five stars!',
];

const CHAT_MESSAGES_FROM_SANYAM = [
  'Hi! Is this still available?',
  'What is the best price you can offer?',
  'Can we meet at the library?',
  'I am interested in the item.',
  'Can you send more photos?',
  'Does it come with accessories?',
  'When can we meet?',
  'Is there any discount for quick pickup?',
  'Looks good, I will take it.',
  'Can I inspect it first?',
];

const CHAT_MESSAGES_FROM_PRIYA = [
  'Yes, still available!',
  'I can do a small discount for you.',
  'Sure, library at 4pm works for me.',
  'Great! What time suits you?',
  'Sure, will send them shortly.',
  'Yes, everything is included.',
  'Tomorrow afternoon?',
  'Let me check and get back to you.',
  'Perfect! See you then.',
  'Of course, no problem.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log('\n🔌  Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅  Connected!\n');

    // Load existing users
    const users = await User.find({});
    if (users.length === 0) {
      console.error('❌  No users found. Run reset-users.js first!');
      process.exit(1);
    }

    const getU = (uname) => users.find(u => u.username === uname);
    const sanyam = getU('sanyam');
    const priya  = getU('priya');
    const rahul  = getU('rahul');
    const anjali = getU('anjali');

    if (!sanyam || !priya) {
      console.error('❌  Required users (sanyam, priya) not found. Run reset-users.js first!');
      process.exit(1);
    }

    console.log('🧹  Clearing existing products, services, orders, reviews, messages...');
    await Promise.all([
      Product.deleteMany({}),
      Service.deleteMany({}),
      Order.deleteMany({}),
      Review.deleteMany({}),
      Message.deleteMany({}),
    ]);
    console.log('✅  Cleared.\n');

    // ── 1. Products (60 for sanyam, 10 each for others) ──────────────────────
    console.log('📦  Seeding 60 Products for sanyam...');
    const productDocs = range(60).map((i) => ({
      seller: sanyam._id,
      title: `Product Item #${i + 1} – ${pick(PRODUCT_CATEGORIES)}`,
      description: `This is a test product #${i + 1} for pagination testing. It is in ${pick(CONDITIONS)} condition.`,
      price: Math.floor(Math.random() * 2000) + 100,
      condition: pick(CONDITIONS),
      category: pick(PRODUCT_CATEGORIES),
      pickupAddress: `Hostel Block ${String.fromCharCode(65 + (i % 10))}`,
      images: [pick(PRODUCT_IMAGES)],
      status: pick(STATUSES),
    }));

    // Also seed 8 products for other users for their profiles
    const otherUserProducts = [
      ...range(8).map(i => ({ seller: priya._id, title: `Priya's Product #${i+1}`, description: `Priya's item #${i+1}`, price: 350 + i * 50, condition: 'Good', category: pick(PRODUCT_CATEGORIES), pickupAddress: 'Hostel 12', images: [pick(PRODUCT_IMAGES)], status: 'Available' })),
      ...range(6).map(i => ({ seller: rahul._id, title: `Rahul's Product #${i+1}`, description: `Rahul's item #${i+1}`, price: 200 + i * 30, condition: 'Used', category: pick(PRODUCT_CATEGORIES), pickupAddress: 'Hostel 3', images: [pick(PRODUCT_IMAGES)], status: 'Available' })),
    ];

    const products = await Product.insertMany([...productDocs, ...otherUserProducts]);
    console.log(`✅  ${products.length} products created.\n`);

    // ── 2. Services (35 for sanyam, 5 each for others) ───────────────────────
    console.log('🛠️   Seeding 35 Services for sanyam...');
    const serviceDocs = range(35).map((i) => ({
      provider: sanyam._id,
      title: `Service #${i + 1} – ${pick(SERVICE_CATEGORIES)}`,
      description: `Pagination test service #${i + 1}. Professional and reliable.`,
      price: Math.floor(Math.random() * 800) + 100,
      priceUnit: pick(PRICE_UNITS),
      category: pick(SERVICE_CATEGORIES),
      availability: 'Weekdays 10am – 6pm',
      images: [pick(SERVICE_IMAGES)],
      status: 'Active',
    }));

    const otherUserServices = [
      ...range(6).map(i => ({ provider: priya._id, title: `Priya's Service #${i+1}`, description: `Priya's service #${i+1}`, price: 300 + i * 50, priceUnit: 'per session', category: pick(SERVICE_CATEGORIES), images: [pick(SERVICE_IMAGES)], status: 'Active' })),
    ];

    const services = await Service.insertMany([...serviceDocs, ...otherUserServices]);
    console.log(`✅  ${services.length} services created.\n`);

    // ── 3. Reviews (40 reviews targeting sanyam) ──────────────────────────────
    console.log('⭐  Seeding 40 Reviews for sanyam...');
    const reviewers = users.filter(u => u.username !== 'sanyam');
    const reviewDocs = range(40).map((i) => ({
      reviewer: pick(reviewers)._id,
      target: sanyam._id,
      rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
      comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
    }));

    // Also add some reviews targeting priya
    const priyaReviews = range(10).map(i => ({
      reviewer: pick(reviewers.filter(u => u.username !== 'priya'))._id,
      target: priya._id,
      rating: Math.floor(Math.random() * 2) + 4,
      comment: REVIEW_COMMENTS[(i + 5) % REVIEW_COMMENTS.length],
    }));

    const reviews = await Review.insertMany([...reviewDocs, ...priyaReviews]);
    console.log(`✅  ${reviews.length} reviews created.\n`);

    // ── 4. Orders / Purchases (35 where sanyam is buyer) ─────────────────────
    console.log('🛒  Seeding 35 Orders for sanyam as buyer...');
    const sellers = users.filter(u => u.username !== 'sanyam');
    const sanyamProducts = products.filter(p => p.seller.toString() !== sanyam._id.toString());

    const orderDocs = range(35).map((i) => {
      const isProductOrder = i % 3 !== 0; // 2/3 product, 1/3 service
      const seller = pick(sellers);
      const productForOrder = sanyamProducts[i % sanyamProducts.length];
      const serviceForOrder = services[i % services.length];
      return {
        buyer: sanyam._id,
        seller: seller._id,
        ...(isProductOrder
          ? { product: productForOrder._id, orderType: 'Product' }
          : { service: serviceForOrder._id, orderType: 'Service_Appointment' }),
        itemPrice: Math.floor(Math.random() * 1000) + 100,
        totalAmount: Math.floor(Math.random() * 1000) + 100,
        status: 'Completed',
      };
    });

    const orders = await Order.insertMany(orderDocs);
    console.log(`✅  ${orders.length} orders created.\n`);

    // ── 5. Messages (50 between sanyam and priya, 30 between sanyam and rahul) ─
    console.log('💬  Seeding 80 Messages for chat pagination...');
    const messageDocs = [];

    // sanyam ↔ priya: 50 messages back and forth
    for (let i = 0; i < 50; i++) {
      const fromSanyam = i % 2 === 0;
      messageDocs.push({
        sender: fromSanyam ? sanyam._id : priya._id,
        recipient: fromSanyam ? priya._id : sanyam._id,
        content: fromSanyam
          ? CHAT_MESSAGES_FROM_SANYAM[i % CHAT_MESSAGES_FROM_SANYAM.length]
          : CHAT_MESSAGES_FROM_PRIYA[i % CHAT_MESSAGES_FROM_PRIYA.length],
        isRead: true,
        // Spread messages over past 30 days
        createdAt: new Date(Date.now() - (50 - i) * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - (50 - i) * 60 * 60 * 1000),
      });
    }

    // sanyam ↔ rahul: 30 messages
    if (rahul) {
      for (let i = 0; i < 30; i++) {
        const fromSanyam = i % 2 === 0;
        messageDocs.push({
          sender: fromSanyam ? sanyam._id : rahul._id,
          recipient: fromSanyam ? rahul._id : sanyam._id,
          content: fromSanyam
            ? `Hey Rahul! Message #${i + 1}`
            : `Hey Sanyam! Reply #${i + 1}`,
          isRead: true,
          createdAt: new Date(Date.now() - (30 - i) * 90 * 60 * 1000),
          updatedAt: new Date(Date.now() - (30 - i) * 90 * 60 * 1000),
        });
      }
    }

    // sanyam ↔ anjali: 25 messages
    if (anjali) {
      for (let i = 0; i < 25; i++) {
        const fromSanyam = i % 2 === 0;
        messageDocs.push({
          sender: fromSanyam ? sanyam._id : anjali._id,
          recipient: fromSanyam ? anjali._id : sanyam._id,
          content: fromSanyam ? `Message to Anjali #${i + 1}` : `Anjali's reply #${i + 1}`,
          isRead: true,
          createdAt: new Date(Date.now() - (25 - i) * 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - (25 - i) * 2 * 60 * 60 * 1000),
        });
      }
    }

    await Message.collection.insertMany(messageDocs); // bypass middleware for timestamps
    console.log(`✅  ${messageDocs.length} messages created.\n`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅  PAGINATION TEST SEED COMPLETE!\n');
    console.log('What to test and where:');
    console.log('  /products?seller=<sanyam_id>    → 60 products, 8/page +');
    console.log('  /services?provider=<sanyam_id>  → 35 services, 8/page +');
    console.log('  Profile page (sanyam)           → Reviews Load More (40 reviews)');
    console.log('  Profile page (sanyam)           → Purchases See All (35 orders)');
    console.log('  Chat sanyam ↔ priya             → 50 msgs, scroll up to load older');
    console.log('  Chat sanyam ↔ rahul             → 30 msgs');
    console.log('  Chat sanyam ↔ anjali            → 25 msgs');
    console.log('  Chat Sidebar                    → 3 conversations (infinite scroll)');
    console.log('  Admin /admin/users              → All users with pagination');
    console.log('  Admin /admin/users/<sanyam_id>  → 60 products + 35 services, 8/page');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌  Seed failed:', error);
    process.exit(1);
  }
}

seed();
