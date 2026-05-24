/**
 * ReCircle Marketplace - Heavy Seed Script
 * Run: node seed.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const COMMUNITIES_DATA = require('./seed-data/communities');
const USERS_DATA = require('./seed-data/users');
const PRODUCTS_TEMPLATE = require('./seed-data/products');
const SERVICES_TEMPLATE = require('./seed-data/services');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

// Schemas
const UserSchema = new mongoose.Schema({ name: String, username: String, email: String, password: String, profilePicture: String, role: { type: String, default: 'user' }, status: { type: String, default: 'Active' }, isVerified: { type: Boolean, default: false }, isPhoneVerified: { type: Boolean, default: false }, verifiedCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }], isOnVacation: { type: Boolean, default: false }, wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], authProvider: { type: String, default: 'email' }, isDummy: { type: Boolean, default: false } }, { timestamps: true });
const CommunitySchema = new mongoose.Schema({ name: String, description: String, location: { type: { type: String, default: 'Point' }, coordinates: [Number] }, gpsRadius: { type: Number, default: 1000 }, emailDomains: [String], hostels: [String], isActive: { type: Boolean, default: true } }, { timestamps: true });
CommunitySchema.index({ location: '2dsphere' });
const ProductSchema = new mongoose.Schema({ seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, title: String, description: String, forSell: Boolean, forRent: Boolean, price: Number, rentPrice: Number, rentUnit: String, images: [String], category: String, condition: String, status: { type: String, default: 'Available' }, community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' }, visibility: String, location: { city: String, state: String, coordinates: [Number], hostel: String, room: Number, bed: Number } }, { timestamps: true });
const ServiceSchema = new mongoose.Schema({ provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, title: String, description: String, price: Number, priceUnit: String, category: String, images: [String], status: { type: String, default: 'Active' }, community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' }, visibility: String, location: { city: String, coordinates: [Number], hostel: String }, availability: String }, { timestamps: true });
const MessageSchema = new mongoose.Schema({ sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, offer: { price: Number, offerType: String, status: String, verificationCode: String }, content: String, isRead: Boolean }, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Community = mongoose.models.Community || mongoose.model('Community', CommunitySchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randBool = (c = 0.5) => Math.random() < c;

const indianCities = [
  { city: 'Vadodara', state: 'Gujarat', coords: [73.2070, 22.3131] },
  { city: 'Mumbai', state: 'Maharashtra', coords: [72.9162, 19.1334] },
  { city: 'Pilani', state: 'Rajasthan', coords: [72.3548, 28.3673] },
  { city: 'Surat', state: 'Gujarat', coords: [72.7830, 21.1594] },
  { city: 'Vellore', state: 'Tamil Nadu', coords: [79.1559, 12.9692] },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Wipe all collections
  const colls = await mongoose.connection.db.collections();
  for (const c of colls) { await c.drop().catch(() => {}); }
  console.log('🗑️  Cleared all collections');

  // 1. Communities
  const communities = await Community.insertMany(COMMUNITIES_DATA);
  console.log(`🏫 Seeded ${communities.length} communities`);

  // 2. Users
  const hashedPassword = await bcrypt.hash('Test@1234', 10);
  const userDocs = USERS_DATA.map(u => ({
    ...u, password: hashedPassword,
    profilePicture: `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`,
    verifiedCommunities: u.communityIdx !== null && u.isVerified ? [communities[u.communityIdx]._id] : [],
    status: u.status || 'Active',
    isOnVacation: u.isOnVacation || false,
    isDummy: u.role === 'user' && !u.username.startsWith('sanyam'),
  }));
  const users = await User.insertMany(userDocs);
  console.log(`👤 Seeded ${users.length} users`);

  const activeUsers = users.filter(u => u.status === 'Active' && u.role === 'user');
  const verifiedUsers = users.filter(u => u.isVerified && u.status === 'Active');
  const commHostelMap = {};
  communities.forEach(c => { commHostelMap[c._id.toString()] = c.hostels; });
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
  const statuses = ['Available', 'Available', 'Available', 'Sold', 'Reserved', 'Rented'];

  // 3. Products
  const productDocs = [];
  for (const tmpl of PRODUCTS_TEMPLATE) {
    const seller = pick(activeUsers);
    const cId = seller.verifiedCommunities.length > 0 ? seller.verifiedCommunities[0] : null;
    const useCommunity = tmpl.visibility === 'Community' && cId;
    const loc = pick(indianCities);
    const hostels = useCommunity ? (commHostelMap[cId?.toString()] || []) : [];
    const hostel = hostels.length > 0 ? pick(hostels) : undefined;
    productDocs.push({
      seller: seller._id, title: tmpl.title, description: tmpl.description,
      forSell: tmpl.forSell, forRent: tmpl.forRent, price: tmpl.price,
      rentPrice: tmpl.rentPrice, rentUnit: tmpl.rentUnit, images: tmpl.images,
      category: tmpl.category, condition: tmpl.condition || pick(conditions),
      status: pick(statuses), community: useCommunity ? cId : undefined,
      visibility: tmpl.visibility,
      location: { city: loc.city, state: loc.state, coordinates: [loc.coords[0] + (Math.random()*0.01-0.005), loc.coords[1] + (Math.random()*0.01-0.005)], hostel, room: hostel ? randInt(101,420) : undefined, bed: hostel ? randInt(1,4) : undefined },
    });
  }
  // Duplicate to ~120
  const extras = productDocs.slice(0, 60).map((p, i) => ({
    ...p, seller: pick(activeUsers)._id,
    title: p.title + (i%3===0 ? ' (Negotiable)' : i%3===1 ? ' – Best Price' : ' – Urgent Sale'),
    price: p.price ? Math.floor(p.price * (0.8 + Math.random()*0.4)) : undefined,
    status: pick(statuses), condition: pick(conditions),
  }));
  productDocs.push(...extras);
  const products = await Product.insertMany(productDocs);
  console.log(`📦 Seeded ${products.length} products`);

  // 4. Services
  const serviceDocs = [];
  for (const tmpl of SERVICES_TEMPLATE) {
    const provider = pick(verifiedUsers);
    const cId = provider.verifiedCommunities.length > 0 ? provider.verifiedCommunities[0] : null;
    const useCommunity = tmpl.visibility === 'Community' && cId;
    const loc = pick(indianCities);
    const hostels = useCommunity ? (commHostelMap[cId?.toString()] || []) : [];
    serviceDocs.push({
      provider: provider._id, title: tmpl.title, description: tmpl.description,
      price: tmpl.price, priceUnit: tmpl.priceUnit, category: tmpl.category,
      images: tmpl.images, status: randBool(0.85) ? 'Active' : 'Inactive',
      community: useCommunity ? cId : undefined, visibility: tmpl.visibility,
      location: { city: loc.city, coordinates: [loc.coords[0]+(Math.random()*0.01-0.005), loc.coords[1]+(Math.random()*0.01-0.005)], hostel: hostels.length > 0 ? pick(hostels) : undefined },
      availability: tmpl.availability,
    });
  }
  const extraSvc = serviceDocs.slice(0, 30).map(s => ({
    ...s, provider: pick(verifiedUsers)._id,
    price: Math.floor(s.price * (0.85 + Math.random()*0.3)),
    status: randBool(0.8) ? 'Active' : 'Inactive',
  }));
  serviceDocs.push(...extraSvc);
  const services = await Service.insertMany(serviceDocs);
  console.log(`🛠️  Seeded ${services.length} services`);

  // Wishlists
  for (const user of activeUsers.slice(0, 30)) {
    const items = products.filter(p => p.seller.toString() !== user._id.toString()).slice(0, randInt(1,6)).map(p => p._id);
    await User.updateOne({ _id: user._id }, { wishlist: items });
  }
  console.log('💝 Updated wishlists');

  // 5. Messages (200)
  const msgs = [];
  const genericMsgs = ['Hi, is this still available?','Can you do a discount?','Interested. When can we meet?','Is condition as shown?','Can I check before buying?','Do you deliver to Hostel H2?','What\'s the best price?','Can I rent for the weekend?','Still selling?','Can I try before paying?','Already sold?','I\'ll take it. Meet on campus?','Can you share more photos?','Is this genuine?','Price seems high. Negotiate?','I\'ll pick up today evening.','UPI payment fine.','Do you have original box?','How old is this?','Any warranty left?'];
  const offerTypes = ['Buy', 'Rent'];
  const offerStatuses = ['Pending', 'Accepted', 'Declined'];
  for (let i = 0; i < 200; i++) {
    const sender = pick(activeUsers);
    let recipient = pick(activeUsers);
    while (recipient._id.toString() === sender._id.toString()) recipient = pick(activeUsers);
    const useProduct = randBool(0.6);
    const useService = !useProduct && randBool(0.6);
    const hasOffer = useProduct && randBool(0.4);
    msgs.push({
      sender: sender._id, recipient: recipient._id,
      product: useProduct ? pick(products)._id : undefined,
      service: useService ? pick(services)._id : undefined,
      offer: hasOffer ? { price: randInt(200, 20000), offerType: pick(offerTypes), status: pick(offerStatuses), verificationCode: randBool(0.3) ? Math.random().toString(36).substring(2,8).toUpperCase() : undefined } : undefined,
      content: pick(genericMsgs), isRead: randBool(0.55),
    });
  }
  await Message.insertMany(msgs);
  console.log(`💬 Seeded ${msgs.length} messages`);

  // Summary
  console.log('\n══════════════════════════════════════════');
  console.log('  ReCircle Marketplace Seed Complete ✅');
  console.log('══════════════════════════════════════════');
  console.log(`  Communities : ${communities.length}`);
  console.log(`  Users       : ${users.length}  (password: Test@1234)`);
  console.log(`  Products    : ${products.length}`);
  console.log(`  Services    : ${services.length}`);
  console.log(`  Messages    : ${msgs.length}`);
  console.log('══════════════════════════════════════════');
  console.log('\n📧 USER CREDENTIALS (all use password: Test@1234):');
  console.log('─────────────────────────────────────────');
  users.forEach(u => {
    console.log(`  ${u.role.toUpperCase().padEnd(9)} | ${u.email.padEnd(45)} | ${u.status}`);
  });
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Seed failed:', err); mongoose.disconnect(); process.exit(1); });
