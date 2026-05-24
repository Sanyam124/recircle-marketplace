try {
  require('dns').setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {}
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { PUBLIC_PRODUCTS, PUBLIC_SERVICES } = require('../seed-data/public-data');


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recircle';
const RECORD_PATH = path.join(process.cwd(), 'dummy_accounts_record.md');

// ================= SCHEMAS =================
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['user', 'admin', 'verifier'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  profilePicture: { type: String },
  bannerImage: { type: String },
  bio: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'other', 'none'], default: 'none' },
  status: { type: String, enum: ['Active', 'Banned', 'Deactivated'], default: 'Active' },
  verifiedCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  defaultCommunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  defaultHostel: { type: String },
  authProvider: { type: String, default: 'email' },
  isOnVacation: { type: Boolean, default: false },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  wishlistedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notifyOffers: { type: Boolean, default: true },
  notifyMessages: { type: Boolean, default: true },
  notifyNewsletter: { type: Boolean, default: true },
  notifyCommunity: { type: Boolean, default: true },
  notifySecurity: { type: Boolean, default: true },
  showOnlineStatus: { type: Boolean, default: true },
  compactView: { type: Boolean, default: false },
  usernameChangeCount: { type: Number, default: 0 },
  isDummy: { type: Boolean, default: false }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  forSell: { type: Boolean, default: true },
  forRent: { type: Boolean, default: false },
  price: { type: Number },
  rentPrice: { type: Number },
  rentUnit: { type: String, enum: ['hour', 'day', 'week', 'month', 'year'] },
  images: [{ type: String, required: true }],
  category: { type: String, required: true },
  condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'], required: true },
  status: { type: String, enum: ['Available', 'Sold', 'Reserved', 'Inactive', 'Rented'], default: 'Available' },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  visibility: { type: String, enum: ['Public', 'Community'], default: 'Community' },
  location: {
    city: { type: String },
    state: { type: String },
    coordinates: { type: [Number] },
    isPrecise: { type: Boolean, default: true },
    hostel: { type: String },
    room: { type: Number },
    bed: { type: Number },
    area: { type: String },
    pincode: { type: String }
  }
}, { timestamps: true });

const ServiceSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  priceUnit: { type: String, default: 'fixed' },
  category: { type: String, required: true },
  images: [{ type: String }],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  visibility: { type: String, enum: ['Public', 'Community'], default: 'Community' },
  location: {
    city: { type: String },
    state: { type: String },
    coordinates: { type: [Number] },
    isPrecise: { type: Boolean, default: true },
    hostel: { type: String },
    room: { type: Number },
    bed: { type: Number },
    area: { type: String },
    pincode: { type: String }
  },
  availability: { type: String }
}, { timestamps: true });

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  emailDomains: [{ type: String, required: true }],
  description: { type: String },
  isActive: { type: Boolean, default: true },
  hostels: [{ type: String }]
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String }
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  orderType: { type: String, enum: ['Product', 'Service_Appointment'], required: true },
  totalAmount: { type: Number, required: true },
  itemPrice: { type: Number, required: true },
  status: { type: String, default: 'Pending_Payment' }
}, { timestamps: true });

const BoardPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  content: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['General', 'LostFound', 'Rides', 'Tickets', 'Housing', 'Academic', 'Opportunities', 'Alerts'],
    default: 'General'
  },
  image: { type: String },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  expiresAt: { type: Date }
}, { timestamps: true });

// Models Compilation
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
const Community = mongoose.models.Community || mongoose.model('Community', CommunitySchema);
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const BoardPost = mongoose.models.BoardPost || mongoose.model('BoardPost', BoardPostSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
const Offer = mongoose.models.Offer || mongoose.model('Offer', new mongoose.Schema({}, { strict: false }));
const Report = mongoose.models.Report || mongoose.model('Report', new mongoose.Schema({}, { strict: false }));
const Message = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({}, { strict: false }));
const Otp = mongoose.models.Otp || mongoose.model('Otp', new mongoose.Schema({}, { strict: false }));
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

// ================= DUMMY CONSTANTS & CONSTRAINTS =================
const PU_DOMAIN = 'paruluniversity.ac.in';
const PASSWORD = 'SAM124@sanyamRC';
const TOTAL_BOYS = 25;
const TOTAL_GIRLS = 15;

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

// Custom Curated Student Bios & Details (25 Boys)
const BOY_PROFILES = [
  { name: 'Aarav Sharma', hostel: 'Shastri Bhawan – A', bio: 'B.Tech CSE | Guitarist & Cricket enthusiast | Shastri A. HMU for music gear & ride sharing!', pic: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80' },
  { name: 'Vihaan Kumar', hostel: 'Kalam Bhawan – B', bio: 'Robotics & IoT hobbyist | Living in Kalam B. Offering Python tutoring and electronics assistance.', pic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
  { name: 'Vivaan Patel', hostel: 'Kalam Bhawan – A', bio: 'Mechanical Engg | Drafting & Design specialist. Renting out drawing boards and design services.', pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { name: 'Advik Singh', hostel: 'Tagore Bhawan – C', bio: 'BBA student | Sneakerhead & fashion lover. Selling oversized anime tees & varsity jackets.', pic: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80' },
  { name: 'Kabir Joshi', hostel: 'Shastri Bhawan – B', bio: 'Civil Engineering | Ethnic wear collection. Renting out designer kurtas. Very clean roommate.', pic: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80' },
  { name: 'Riyan Mehta', hostel: 'Dhyan Bhawan', bio: 'PU Football team captain | Sports gear enthusiast. Selling cleats, footballs, & moving boxes.', pic: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80' },
  { name: 'Reyansh Shah', hostel: 'Sardar Bhawan – A', bio: 'Fitness freak | Sardar A. Selling dumbbells, steel shakers, and offering premium room laundry.', pic: 'https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&w=200&q=80' },
  { name: 'Ayaan Verma', hostel: 'Milkha Bhawan – A', bio: 'B.Sc Animation & VFX | Photographer | Milkha A. DSLR rentals & event shoots on campus.', pic: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80' },
  { name: 'Krishna Patel', hostel: 'Atal Bhawan – A1', bio: 'B.Tech Civil | Campus commuter. Cycle listings & luggage packing assistance.', pic: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=200&q=80' },
  { name: 'Ishaan Kumar', hostel: 'Atal Bhawan – B', bio: 'GATE & Competitive Exams Prep | CSE Senior. CS textbooks, scientific calculators, & tutoring.', pic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80' },
  { name: 'Shaurya Singh', hostel: 'Azad Bhawan – A', bio: 'Electronics Senior | Room cleaning specialist. Selling bedding comforters, electric kettles.', pic: 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=200&q=80' },
  { name: 'Atharv Joshi', hostel: 'Tilak Bhawan – A', bio: 'Hotel Management | Tech-savvy. Selling induction cooktops, tea pans, & kettles.', pic: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80' },
  { name: 'Rudra Choudhary', hostel: 'Abraham Lincoln Bhawan – A', bio: 'B.Tech IT | Music producer. Selling Bluetooth headphones, laptop stands.', pic: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=200&q=80' },
  { name: 'Aryan Sen', hostel: 'Ratan Tata Bhawan', bio: 'Placement Prep Lead | Ratan Tata Bhawan. Selling aptitude books, lab kits.', pic: 'https://images.unsplash.com/photo-1527983359383-4758693f760c?auto=format&fit=crop&w=200&q=80' },
  { name: 'Shivansh Reddy', hostel: 'Shastri Bhawan – C', bio: 'B.Tech EEE | Living in Shastri C. Selling wireless earbuds and heavy-duty extension boards.', pic: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=200&q=80' },
  { name: 'Aarush Gupta', hostel: 'Kalam Bhawan – C', bio: 'First-year CS | Kalam C. Passionate about coding and photography. Hit me up to collaborate.', pic: 'https://images.unsplash.com/photo-1504257404764-b2b1d70d304a?auto=format&fit=crop&w=200&q=80' },
  { name: 'Dhruv Shah', hostel: 'Tagore Bhawan – A', bio: 'Dhyan Bhawan resident | Sports and fitness lover. Commute to Vadodara daily.', pic: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=200&q=80' },
  { name: 'Kian Patel', hostel: 'Tagore Bhawan – B', bio: 'B.Arch Student | Tagore B. Drawing instruments, sheets, and architectural templates.', pic: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=200&q=80' },
  { name: 'Yash Verma', hostel: 'Sardar Bhawan – B', bio: 'BBA hosteler. Loves listening to music and outdoor trekking. Clean and quiet.', pic: 'https://images.unsplash.com/photo-1506803682981-6e718a9dd3ee?auto=format&fit=crop&w=200&q=80' },
  { name: 'Dev Sharma', hostel: 'Sardar Bhawan – C', bio: 'Sardar C hosteler | Biotech student. Selling reference sheets and lab coats.', pic: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
  { name: 'Arjun Mehta', hostel: 'Milkha Bhawan – A', bio: 'PU Cricket team member. Selling standard sports equipment and bats.', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
  { name: 'Rohan Kumar', hostel: 'Atal Bhawan – A2', bio: 'B.Tech CSE Junior. Passionate about web development. Clean and friendly hosteler.', pic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80' },
  { name: 'Neel Singh', hostel: 'Azad Bhawan – A', bio: 'Azad Bhawan hosteler | B.Des student. Graphic designer, video editor, and animator.', pic: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=200&q=80' },
  { name: 'Aditya Joshi', hostel: 'Tilak Bhawan – A', bio: 'B.Pharm Student. Keeping things organized. Free for quick study sessions.', pic: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=200&q=80' },
  { name: 'Rahul Sharma', hostel: 'Ratan Tata Bhawan', bio: 'Ratan Tata Bhawan senior. Moving out soon, selling all my study guides and room decors.', pic: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80' }
];

// Custom Curated Student Bios & Details (15 Girls)
const GIRL_PROFILES = [
  { name: 'Aadhya Patel', hostel: 'Sarojini Bhawan – A', bio: 'Design & Fashion Student | Sarojini A. Renting out premium traditional lehengas and suits.', pic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { name: 'Kiara Sharma', hostel: 'Indira Bhawan – B', bio: 'BFA Fine Arts | Indira B. Custom paintings, acrylic art sets, and video editing services.', pic: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80' },
  { name: 'Prisha Gupta', hostel: 'Teresa Bhawan – C', bio: 'B.Sc Nursing student. Organised and tidy. Providing express steam ironing services in Teresa C.', pic: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
  { name: 'Avni Singh', hostel: 'Kalpana Bhawan – A', bio: 'B.Tech Food Tech | Kalpana A. Selling egg boilers, multi-cookers, and electric kettles.', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
  { name: 'Myra Joshi', hostel: 'Indira Bhawan – C', bio: 'PU Fest Coordinator | Event Photography. Selling concert passes and freshers tickets.', pic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80' },
  { name: 'Ira Choudhary', hostel: 'Teresa Bhawan – D', bio: 'M.Tech CSE | Coding tutor. Selling scientific calculators, lab kits, and python tutoring.', pic: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80' },
  { name: 'Navya Sen', hostel: 'Sarojini Bhawan – B', bio: 'First-year B.Design | Sarojini B. Selling ergonomic laptop stands and extension boards.', pic: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=200&q=80' },
  { name: 'Anvi Reddy', hostel: 'Kalpana Bhawan – B', bio: 'B.Sc Sports Science. Selling comfortable crocs, slides, and offering campus bike pooling.', pic: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80' },
  { name: 'Shanaya Patel', hostel: 'Shakuntala Bhawan – A', bio: 'B.Pharm Senior | Shakuntala A. Selling white doctor lab coats, safety kits, and notes.', pic: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=200&q=80' },
  { name: 'Nisha Sharma', hostel: 'Rani Laxmibai Bhawan – A', bio: 'Parul campus event volunteer. Selling VIP concert entries and passes.', pic: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=200&q=80' },
  { name: 'Priya Gupta', hostel: 'Janki Bhawan', bio: 'Janki Bhawan hosteler | Literature student. Loves reading and acoustic music.', pic: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=200&q=80' },
  { name: 'Meera Singh', hostel: 'Sarojini Bhawan – C', bio: 'Sarojini C hosteler | CS junior. Active room cleanings and organizer sales.', pic: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80' },
  { name: 'Sneha Joshi', hostel: 'Shakuntala Bhawan – B', bio: 'B.Tech Chemical | Shakuntala B. Selling lab safety guides and exam preparation kits.', pic: 'https://images.unsplash.com/photo-1507152832244-10d49c7dd8b9?auto=format&fit=crop&w=200&q=80' },
  { name: 'Tanya Choudhary', hostel: 'Rani Laxmibai Bhawan – B', bio: 'BBA student. Moving out next month, selling room heaters and power banks.', pic: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80' },
  { name: 'Riya Reddy', hostel: 'Abraham Lincoln Bhawan – B', bio: 'Abraham Lincoln B resident. Passionate about art, sketching, and college events.', pic: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=200&q=80' }
];

const MALE_AVATARS = [
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879674/recircle/defaults/avatars/ujoj8pesdwygl7prxhop.webp", // Idx 1
  "https://res.cloudinary.com/dq3sl82at/image/upload/q_auto/f_auto/v1779185337/Copilot_20260411_092250_wl7rnn.png", // Idx 3
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879826/recircle/defaults/avatars/njihd9oj1h1glmzuoinj.webp", // Idx 5
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879876/recircle/defaults/avatars/ulsdike1w01t9jej98jk.webp", // Idx 7
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880073/recircle/defaults/avatars/ozw4w9mtamtwceivlqeg.webp", // Idx 9
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880201/recircle/defaults/avatars/xsycxnxgogtxl7mnab3k.webp", // Idx 11
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880375/recircle/defaults/avatars/ucpa2c3mhc463fweeceg.webp", // Idx 13
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880512/recircle/defaults/avatars/ffmvy7tvldj5j7goij0f.webp", // Idx 15
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880596/recircle/defaults/avatars/adrlyespwr2nisogppyx.webp", // Idx 17
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881545/recircle/defaults/avatars/ygldm1alqtpzmfj0vzyt.webp", // Idx 19
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881609/recircle/defaults/avatars/sp9esvheofyzhix8iymk.webp", // Idx 21
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881865/recircle/defaults/avatars/vyll052nx0sn7pkpoy15.webp", // Idx 23
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882001/recircle/defaults/avatars/urzgagig0ist1w70vbkq.webp", // Idx 25
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882508/recircle/defaults/avatars/d7cpulnp0qgnk8oana7o.webp", // Idx 27
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882603/recircle/defaults/avatars/wgtkyyr93xsnklnx8zd4.webp", // Idx 29
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882965/recircle/defaults/avatars/xswlonkbehvlvgfcogy2.webp"  // Idx 31
];

const FEMALE_AVATARS = [
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879647/recircle/defaults/avatars/ziodytpld8wihr98ist3.webp", // Idx 0
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879713/recircle/defaults/avatars/xlbrrk5k8fwajdg7atrd.webp", // Idx 2
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879809/recircle/defaults/avatars/f12ns9fpdk9vapfe3rso.webp", // Idx 4
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879850/recircle/defaults/avatars/jpsd54f4ecrj7cjaxqzx.webp", // Idx 6
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879909/recircle/defaults/avatars/jubqhz3y1c2nialsskyk.webp", // Idx 8
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880093/recircle/defaults/avatars/m9e7dxc3jgkn63m78iod.webp", // Idx 10
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880241/recircle/defaults/avatars/n9s9vww8e4oyvdrpsvyf.webp", // Idx 12
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880395/recircle/defaults/avatars/y0lecpk6ljmgwubxcrjd.webp", // Idx 14
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880578/recircle/defaults/avatars/kboynwhyyylpdymscflg.webp", // Idx 16
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881528/recircle/defaults/avatars/yybdriyqunh4ja51n9fx.webp", // Idx 18
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881609/recircle/defaults/avatars/rx4btjxpgncuq05sxnns.webp", // Idx 20
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881843/recircle/defaults/avatars/oluqzmzcp6vidvakutsu.webp", // Idx 22
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881971/recircle/defaults/avatars/zsvvuu1tl9lftjkvsqts.webp", // Idx 24
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882116/recircle/defaults/avatars/vztuvy9ifmoyid7wsk2d.webp", // Idx 26
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882552/recircle/defaults/avatars/hg2uvgsalioeggawunvo.webp", // Idx 28
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882949/recircle/defaults/avatars/aonclvo3yeuty9qopigl.webp"  // Idx 30
];

const MALE_BANNERS = [
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884926/recircle/defaults/banners/uajyrck7hwyvtpayyjvg.jpg",
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884927/recircle/defaults/banners/zqdh9puexp455fkyqf36.jpg",
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/xpmuv5kyvoqzedzej5wp.jpg",
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884929/recircle/defaults/banners/mnfbvgpadbmzzjmfd7db.jpg"
];

const FEMALE_BANNERS = [
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/rus9bykf5y3pzolfabte.jpg",
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884930/recircle/defaults/banners/wavqltixgy5dfcnvuv7y.jpg",
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884931/recircle/defaults/banners/l1kcurhb3gyrfilaiw8y.jpg",
  "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884933/recircle/defaults/banners/rnko4ck2wczrv34jzwu2.jpg"
];

const START_DATE = new Date('2026-01-01T00:00:00Z');
const MAX_DATE = new Date('2026-05-17T23:59:59Z');

// ================= HELPERS =================
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

function generateEmail() {
  const prefixes = ['22', '23', '24', '25'];
  const p = randomItem(prefixes);
  let rest = '';
  for (let i = 0; i < 13; i++) rest += Math.floor(Math.random() * 10);
  return `${p}${rest}@${PU_DOMAIN}`;
}

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Clean fallback data matching the Cloudinary folder exactly in case of offline seeding
const OFFLINE_FALLBACK_IMAGES = [
  // acoustic_guitar_mprs14 RESERVED for Board Posts only
  { public_id: 'acoustic_guitar_mprs14', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094585/acoustic_guitar_mprs14.png' },
  { public_id: 'acrylic_paints___brushes_kit_ecvr10', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094586/acrylic_paints___brushes_kit_ecvr10.png' },
  { public_id: 'arduino_project_kit_1_umebsx', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094586/arduino_project_kit_1_umebsx.png' },
  { public_id: 'aluminium_ergonomic_laptop_stand_pne06l', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094587/aluminium_ergonomic_laptop_stand_pne06l.png' },
  { public_id: 'arduino_project_kit_ow7f0h', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094589/arduino_project_kit_ow7f0h.png' },
  { public_id: 'bedding_wia1nr', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094586/bedding_wia1nr.png' },
  { public_id: 'boat_bluetooth_earbuds_wireless_1_euib3t', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094590/boat_bluetooth_earbuds_wireless_1_euib3t.png' },
  { public_id: 'boat_headphone_ialfij', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094590/boat_headphone_ialfij.png' },
  { public_id: 'campus_placement_preparation_kit_yikkve', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094591/campus_placement_preparation_kit_yikkve.png' },
  { public_id: 'casio_scientific_calculator_d2gsdq', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094593/casio_scientific_calculator_d2gsdq.png' },
  { public_id: 'clothing_stream_iron_wjrpdh', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094595/clothing_stream_iron_wjrpdh.png' },
  { public_id: 'collapsible_mesh_laundry_basket_pymd8t', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094595/collapsible_mesh_laundry_basket_pymd8t.png' },
  { public_id: 'competitive_exam_guides_ektim7', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094597/competitive_exam_guides_ektim7.png' },
  { public_id: 'canvas_painting_handmade_art_iwqhqo', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094599/canvas_painting_handmade_art_iwqhqo.png' },
  { public_id: 'crocs_casual_slides_nq4ycg', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094600/crocs_casual_slides_nq4ycg.png' },
  { public_id: 'crocs_casual_slides_1_x7ip9j', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094600/crocs_casual_slides_1_x7ip9j.png' },
  { public_id: 'designer_lehenga_r1stk9', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094602/designer_lehenga_r1stk9.png' },
  { public_id: 'dumbbells_xtoujo', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094603/dumbbells_xtoujo.png' },
  { public_id: 'ethnic_wear_g0tzi4', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094603/ethnic_wear_g0tzi4.png' },
  { public_id: 'fest_pass_bhy51v', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094604/fest_pass_bhy51v.png' },
  { public_id: 'freshers_fest_pass_ym7rdo', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094604/freshers_fest_pass_ym7rdo.png' },
  { public_id: 'egg_boiler_multi_cooker_nqo3lb', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094605/egg_boiler_multi_cooker_nqo3lb.png' },
  { public_id: 'engineering_drawing_board___drafter_bjjrvb', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094608/engineering_drawing_board___drafter_bjjrvb.png' },
  { public_id: 'football_soccer_ball___cleats_yq8y8s', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094608/football_soccer_ball___cleats_yq8y8s.png' },
  { public_id: 'gym_shaker_bottle_stainless_steel_gamnxi', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094608/gym_shaker_bottle_stainless_steel_gamnxi.png' },
  { public_id: 'hair_dryer___grooming_trimmer_kit_qhllik', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094609/hair_dryer___grooming_trimmer_kit_qhllik.png' },
  { public_id: 'indian_bicycle_cyh4id', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094611/indian_bicycle_cyh4id.png' },
  { public_id: 'indian_textbooks_wslxao', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094611/indian_textbooks_wslxao.png' },
  { public_id: 'keyboard_mouse_bjww70', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094614/keyboard_mouse_bjww70.png' },
  { public_id: 'kashmiri_willow_cricket_bat___tennis_ball_iblgl7', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094615/kashmiri_willow_cricket_bat___tennis_ball_iblgl7.png' },
  { public_id: 'lab_safety_kit_ronuov', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094615/lab_safety_kit_ronuov.png' },
  { public_id: 'maggi_and_kettle_c8owm9', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094614/maggi_and_kettle_c8owm9.png' },
  { public_id: 'maggi_and_kettle_1_p3hjnr', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094619/maggi_and_kettle_1_p3hjnr.png' },
  { public_id: 'maggi_and_kettle_2_lblcfn', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094618/maggi_and_kettle_2_lblcfn.png' },
  { public_id: 'mini_induction_cooktop___tea_pot_dqoz74', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094620/mini_induction_cooktop___tea_pot_dqoz74.png' },
  { public_id: 'mens_oversized_animestreetwear_t_Shirt_s8kf3a', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094621/mens_oversized_animestreetwear_t_Shirt_s8kf3a.png' },
  { public_id: 'navratri_free_style_garba_zone_pass_paruluniversity_xfzg6p', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094620/navratri_free_style_garba_zone_pass_paruluniversity_xfzg6p.png' },
  { public_id: 'darshan_raval_fan_pit_pass_paruluniversity_picajk', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094598/darshan_raval_fan_pit_pass_paruluniversity_picajk.png' },
  { public_id: 'multimeter___resistor_set_ljtpy1', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094622/multimeter___resistor_set_ljtpy1.png' },
  { public_id: 'nike_shoes_pnxfdh', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094624/nike_shoes_pnxfdh.png' },
  { public_id: 'multiple_socket_extension_spike_guard_sbpb1y', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094626/multiple_socket_extension_spike_guard_sbpb1y.png' },
  { public_id: 'portable_room_heater_winter_season_vqvwcu', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094626/portable_room_heater_winter_season_vqvwcu.png' },
  { public_id: 'portable_power_bank_qcvfud', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094628/portable_power_bank_qcvfud.png' },
  { public_id: 'premium_color_pencil___sketching_kit_bg7jdp', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094627/premium_color_pencil___sketching_kit_bg7jdp.png' },
  { public_id: 'red_designer_kurta_lnjefx', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094631/red_designer_kurta_lnjefx.png' },
  { public_id: 'red_varsity_college_jacket_qmcq2l', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094635/red_varsity_college_jacket_qmcq2l.png' },
  { public_id: 'medical_court_q82tne', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094620/medical_court_q82tne.png' },
  { public_id: 'paruluniversity_box_kj9vdc', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094622/paruluniversity_box_kj9vdc.jpg' }
];

const SERVICES_IMAGES = [
  { public_id: 'DSLR_camera_rental_service_njdhau', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094603/DSLR_camera_rental_service_njdhau.png' },
  { public_id: 'college_event_photography_service_q7xljz', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094596/college_event_photography_service_q7xljz.png' },
  { public_id: 'graphic_design___video_editing_service_l7d9hn', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094609/graphic_design___video_editing_service_l7d9hn.png' },
  { public_id: 'hostel_room_cleaning_service_lsrqer', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094611/hostel_room_cleaning_service_lsrqer.png' },
  { public_id: 'high_speed_printing___photocopying_service_gcytzx', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094613/high_speed_printing___photocopying_service_gcytzx.png' },
  { public_id: 'packing___moving_service_r3dmj8', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094623/packing___moving_service_r3dmj8.png' },
  { public_id: 'packing___moving_service_1_pvgaid', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094629/packing___moving_service_1_pvgaid.png' },
  { public_id: 'python_tutoring_fchc5v', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094631/python_tutoring_fchc5v.png' },
  { public_id: 'professional_laundry___ironing_service_b7pyhw', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094631/professional_laundry___ironing_service_b7pyhw.png' },
  { public_id: 'roomsharing_fpmxhs', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094634/roomsharing_fpmxhs.png' },
  { public_id: 'ride_sharing_jf6sv4', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094636/ride_sharing_jf6sv4.png' },
  { public_id: 'scooty_ride_share_2_helmets_idjrdo', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094638/scooty_ride_share_2_helmets_idjrdo.png' },
  { public_id: 'professional_presentation___resume_review_service_ozba7l', secure_url: 'https://res.cloudinary.com/dq3sl82at/image/upload/v1779094637/professional_presentation___resume_review_service_ozba7l.png' }
];

// Metadata Mappings for all Products
// These image keys are RESERVED for Board Posts and must NOT appear in product/service maps:
// acoustic_guitar_mprs14, canvas_painting_handmade_art_iwqhqo, kashmiri_willow_cricket_bat___tennis_ball_iblgl7,
// laptop_travel_backpack_mssj5x, darshan_raval_fan_pit_pass_paruluniversity_picajk, red_designer_kurta_lnjefx,
// scooty_ride_share_2_helmets_idjrdo
const PRODUCT_METADATA_MAP = {
  acrylic_paints___brushes_kit_ecvr10: { title: "Camel Acrylic Paint Set & Brushes", price: 350, category: "Art Supplies", description: "A set of 12 vibrant acrylic tubes along with 4 high-quality nylon brushes. Perfect for architecture or design lab submissions. Used only once. Can hand over near the Design Building Canteen.", gender: "neutral" },
  arduino_project_kit_1_umebsx: { title: "Arduino Uno IoT Project Starter Kit", price: 750, category: "Microcontrollers & Sensors", description: "Complete micro-controller set containing Arduino Uno, premium transparent breadboard, multi-color jumper wire pack, sensors, and LEDs. Essential for CS/IT/EC students. Meet at PU Circle or PPT Food Area.", gender: "neutral" },
  arduino_project_kit_ow7f0h: { title: "Arduino Advanced Hardware Sensor Kit", price: 850, category: "Microcontrollers & Sensors", description: "Advanced IoT sensor kit featuring temperature sensor, RFID reader, servo motor, and a broad range of standard resistors. Pristine condition. Meet at PU Circle or Kalam Bhawan.", gender: "neutral" },
  aluminium_ergonomic_laptop_stand_pne06l: { title: "Folding Aluminium Laptop Stand", price: 400, category: "Accessories", description: "Highly robust, lightweight aluminium laptop stand with anti-slip silicone guards. Adjusts seamlessly for hostel desk posture correction. Meet near Architecture Canteen.", gender: "neutral" },
  bedding_wia1nr: { title: "Cozy Single Bed Warm Comforter & Sheet", price: 650, category: "Hostel Essentials", description: "Super comfortable single-size comforter and a cotton bedsheet designed to fit standard Parul University hostel beds perfectly. Clean and washed. Pick up at Kalam Bhawan – C.", gender: "neutral" },
  boat_bluetooth_earbuds_wireless_1_euib3t: { title: "boAt Airdopes 141 True Wireless Earbuds", price: 800, category: "Gadgets", description: "Incredibly fast-charging boAt wireless earbuds with 42 hours playback time and deep bass. Fully cleaned and sanitized. Can meet at New Food Court.", gender: "neutral" },
  boat_bluetooth_earbuds_wireless_o8imq9: { title: "boAt Noise-Cancelling Earbuds", price: 900, category: "Gadgets", description: "Active noise-canceling true wireless earbuds. Fits perfectly, excellent audio quality for online lectures or gaming. Sanitized. Meet at Medical Canteen.", gender: "neutral" },
  boat_headphone_ialfij: { title: "boAt Rockerz 450 Bluetooth Headphone", price: 950, category: "Gadgets", description: "Comfortable on-ear wireless headphones with super powerful battery life. Cozy cushions and foldable design. Very minor scuffs. Meet at Shastri Bhawan lobby.", gender: "neutral" },
  campus_placement_preparation_kit_yikkve: { title: "Premium Campus Placement Preparation Kit", price: 300, category: "Exam Survival Kits", description: "Complete book set for cracking interviews. Includes Quantitative Aptitude by RS Aggarwal, technical coding notes, and aptitude booklets. Meet at Central Admin Auditorium.", gender: "neutral" },
  casio_scientific_calculator_d2gsdq: { title: "Casio Classwiz fx-991EX Scientific Calculator", price: 850, category: "Electronics", description: "High-performance non-programmable scientific calculator. Essential for engineering labs, math exams, and midsems. Works flawlessly. Handoff near PU Circle.", gender: "neutral" },
  clothing_stream_iron_wjrpdh: { title: "Philips Garment Steamer / Steam Iron", price: 1200, category: "Appliances", description: "Lightweight and powerful portable garment steam iron. Gets creases out of formal shirts and traditional ethnic wear in seconds. Handoff at Utopia Food Court.", gender: "neutral" },
  collapsible_mesh_laundry_basket_pymd8t: { title: "Mesh Collapsible Laundry Basket", price: 150, category: "Organizers", description: "High-capacity breathable mesh laundry basket. Folds flat to save space in shared rooms. Very sturdy wire frame. Pick up at Tagore Bhawan A.", gender: "neutral" },
  competitive_exam_guides_ektim7: { title: "GATE & Competitive CSE Exam Guides", price: 450, category: "Textbooks", description: "Set of highly descriptive GATE computer science study guides with previous years solved question papers (PYQs). No torn pages. Meet at Central Admin.", gender: "neutral" },
  // canvas_painting_handmade_art_iwqhqo: RESERVED for Board Posts
  crocs_casual_slides_nq4ycg: { title: "Classic Unisex Crocs Clogs (Navy Blue)", price: 900, category: "Footwear", description: "Extremely comfortable and water-resistant classic Crocs clogs. Light wear, perfect for walking down to the campus mess. Meet near Greenzy Food Court.", gender: "neutral" },
  crocs_casual_slides_1_x7ip9j: { title: "Comfortable Sports Casual Slides", price: 400, category: "Footwear", description: "Waterproof anti-skid casual hostel slides. Very durable, size UK 8. Sanitized and ready for use. Pick up at Shastri B.", gender: "neutral" },
  designer_lehenga_r1stk9: { title: "Pink Designer Ethnic Lehenga (Rent)", price: 1500, category: "Traditional & Ethnic", description: "Gorgeous heavily embroidered designer pink lehenga available for rental. Worn only once for ethnic day. Size S-M. Dry-cleaned. Handover at BBA Green Tunnel.", gender: "female" },
  dumbbells_xtoujo: { title: "Cast Iron 5KG Hex Dumbbells (Pair)", price: 700, category: "Fitness Gear", description: "Solid cast iron pair of 5kg hex dumbbells. Safe flat edges to prevent rolling on hostel floors. Excellent grip. Pick up at Atal Bhawan A1.", gender: "neutral" },
  ethnic_wear_g0tzi4: { title: "Traditional Yellow Silk Anarkali Suit (Rent)", price: 800, category: "Traditional & Ethnic", description: "Beautiful yellow silk traditional suit available for rent. Ideal for college cultural events and hostel programs. Handoff near Sarojini Bhawan.", gender: "female" },
  fest_pass_bhy51v: { title: "VIP Cultural Fest Concert Entry Pass", price: 600, category: "Event Passes & Tickets", description: "Exclusive front-row VIP entry pass for the upcoming big campus concert. Direct stage-view access. Handoff at Utopia Food Court.", gender: "neutral" },
  freshers_fest_pass_ym7rdo: { title: "Parul University Freshers Welcome Fest Ticket", price: 350, category: "Event Passes & Tickets", description: "Standard entry ticket for the freshers welcome DJ night event. Fully authorized ticket with barcode. Handoff at PU Circle.", gender: "neutral" },
  egg_boiler_multi_cooker_nqo3lb: { title: "Kent Instant Egg Boiler & Multi-Cooker", price: 600, category: "Appliances", description: "Compact electric multi-cooker. Can boil up to 7 eggs at once or quickly make soup/Maggi in your room. Safe auto-off. Pick up at Kalam B.", gender: "neutral" },
  engineering_drawing_board___drafter_bjjrvb: { title: "Solid Wood Imperial Drawing Board & Drafter", price: 1100, category: "Drafting Tools", description: "High-quality engineering drawing board (23x32 inch) complete with a sturdy, metal mini-drafter tool. Ideal for first-year design courses. Handoff near Design Building.", gender: "neutral" },
  football_soccer_ball___cleats_yq8y8s: { title: "Nivia Football & Ground Grip Cleats (Size 8)", price: 800, category: "Sports Equipment", description: "Genuine Nivia football along with solid studs soccer cleats. Great grip and traction, perfect for college turf match. Handoff at BBA Ground.", gender: "neutral" },
  gym_shaker_bottle_stainless_steel_gamnxi: { title: "Insulated Stainless Steel Shaker (700ml)", price: 350, category: "Fitness Gear", description: "Premium quality insulated leak-proof protein shaker bottle. Keeps shakes cool and maintains freshness. Meet at Main Cricket Ground.", gender: "neutral" },
  hair_dryer___grooming_trimmer_kit_qhllik: { title: "Nova Trimmer & Professional Hair Dryer Kit", price: 650, category: "Appliances", description: "Excellent grooming kit containing a foldable 1200W hot air hair dryer and a cordless beard trimmer. Works perfectly. Meet at Tilak Bhawan A.", gender: "neutral" },
  indian_bicycle_cyh4id: { title: "Hero Gearless Campus Bicycle", price: 2800, category: "Bicycles", description: "Highly reliable single speed Hero bicycle with a sturdy front basket and heavy-duty rear carrier. Currently parked near BBA Ground. Commute around campus easily.", gender: "neutral" },
  indian_textbooks_wslxao: { title: "1st Year Engineering Physics & Chemistry Books", price: 250, category: "Textbooks", description: "Official syllabus textbooks for first-year engineering. Mint condition, no pen marks or missing pages. Handoff near Architecture Canteen.", gender: "neutral" },
  keyboard_mouse_bjww70: { title: "RGB Mechanical Keyboard & Gaming Mouse", price: 1300, category: "Gaming", description: "Super tactile wired mechanical keyboard with customized RGB patterns and a high DPI optical gaming mouse. Meet at Dhyan Bhawan.", gender: "neutral" },
  // kashmiri_willow_cricket_bat___tennis_ball_iblgl7: RESERVED for Board Posts
  lab_safety_kit_ronuov: { title: "Engineering/Chemistry Lab Safety Kit", price: 300, category: "Lab Equipment", description: "Includes a clean, white, full-sleeve lab coat along with chemical splash resistant protective safety goggles. Handoff near Medical Canteen.", gender: "neutral" },
  maggi_and_kettle_c8owm9: { title: "Prestige Stainless Steel 1.5L Kettle", price: 450, category: "Appliances", description: "Quick boiling electric kettle. Essential for late-night hostel study sessions. Very clean interior, works perfectly. Pick up at Shastri B.", gender: "neutral" },
  maggi_and_kettle_1_p3hjnr: { title: "Stainless Steel Cordless Electric Kettle", price: 400, category: "Appliances", description: "1.5 Litre electric kettle with auto shut-off function. Perfect condition, used only for hot tea and instant noodles. Pick up at Kalam C.", gender: "neutral" },
  maggi_and_kettle_2_lblcfn: { title: "Rapid Boiling Multi-Purpose Kettle", price: 450, category: "Appliances", description: "High-capacity kettle, rapid boil technology. Well maintained and fully clean inside. Pick up at Sarojini C.", gender: "neutral" },
  mini_induction_cooktop___tea_pot_dqoz74: { title: "Pigeon 1800W Induction Cooktop & Pan", price: 1400, category: "Appliances", description: "Compact digital induction cooktop with touch buttons. Includes a solid stainless steel tea saucepan. Hostel-friendly wattage. Pick up at Sardar Bhawan.", gender: "neutral" },
  mens_oversized_animestreetwear_t_Shirt_s8kf3a: { title: "Japanese Anime Streetwear Oversized T-Shirt (M)", price: 450, category: "Men's Wear", description: "High-density pure cotton oversized black t-shirt with premium wash-resistant graphic back print. Super comfortable. Meet at Capitol Food Court.", gender: "male" },
  navratri_free_style_garba_zone_pass_paruluniversity_xfzg6p: { title: "Parul University Garba VIP Entry Pass", price: 500, category: "Event Passes & Tickets", description: "Premium all-night entry pass for the university grand Navratri celebration. Access to the premium food zone. Handoff at PU Circle.", gender: "neutral" },
  // darshan_raval_fan_pit_pass_paruluniversity_picajk: RESERVED for Board Posts
  multimeter___resistor_set_ljtpy1: { title: "DT830D Digital Multimeter & Resistors", price: 500, category: "Microcontrollers & Sensors", description: "Includes high accuracy digital multimeter with battery and probes, plus a massive pack of 100+ standard carbon resistors.", gender: "neutral" },
  nike_shoes_pnxfdh: { title: "Nike Renew Active Running Shoes (Size 9)", price: 2400, category: "Footwear", description: "Authentic Nike running shoes. Mesh upper for breathability and highly responsive foam cushioning. Extremely comfortable.", gender: "neutral" },
  multiple_socket_extension_spike_guard_sbpb1y: { title: "4-Socket Heavy Duty Extension Board", price: 300, category: "Hostel Essentials", description: "4-socket extension power strip with individual toggles, safety shutters, and status indicators. 2-meter long cable.", gender: "neutral" },
  portable_room_heater_winter_season_vqvwcu: { title: "Orpat 2000W Quick Fan Room Heater", price: 900, category: "Appliances", description: "Compact high-capacity room heater with dual heat settings. Best for chilly winter nights in the hostel.", gender: "neutral" },
  portable_power_bank_qcvfud: { title: "Mi 20000mAh 18W Fast Charging Power Bank", price: 1100, category: "Electronics", description: "Robust grey metallic power bank with dual USB outputs. Easily charges your phone multiple times. Super fast charging.", gender: "neutral" },
  premium_color_pencil___sketching_kit_bg7jdp: { title: "Faber-Castell Color Pencils & Sketchbook", price: 400, category: "Art Supplies", description: "Set of 24 triangular premium color pencils along with a high-GSM sketching cartridge book. Best for hobbyist artists.", gender: "neutral" },
  // red_designer_kurta_lnjefx: RESERVED for Board Posts
  red_varsity_college_jacket_qmcq2l: { title: "Varsity College Sports Fleece Jacket", price: 950, category: "Men's Wear", description: "Cool crimson red and white varsity sports jacket with comfy warm lining. Perfect for winter campus wear.", gender: "male" },
  medical_court_q82tne: { title: "Medical Lab White Doctor Coat (Size L)", price: 250, category: "Lab Equipment", description: "High-grade white lab coat for medical/biology lab classes. Half back belt with two front pockets. Clean and ironed.", gender: "neutral" },
  paruluniversity_box_kj9vdc: { title: "Official Parul University Souvenir Gift Box", price: 300, category: "Other", description: "Collectible official university velvet souvenir packaging box. Excellent gift option for outstanding graduates.", gender: "neutral" },
  wireless_optical_mouse_ejpo6y: { title: "Logitech Pebble Wireless Mouse", price: 600, category: "Gaming", description: "Super slim, silent Bluetooth wireless optical mouse. Charcoal grey color. Works perfectly on all desks. Battery included.", gender: "neutral" },
  foldable_bed_laptop_table_mckgqo: { title: "Multi-Purpose Foldable Laptop Bed Table", price: 350, category: "Hostel Essentials", description: "Sturdy wooden laptop desk table for bed. Has a tablet/phone slot, cup holder, and foldable metal legs with non-slip grips. Perfect for late-night hostel studies.", gender: "neutral" },
  adjustable_mobile_phone_stand_xwwz7z: { title: "Aluminium Adjustable Mobile Desktop Stand", price: 150, category: "Accessories", description: "Fully foldable desktop mobile phone and tablet holder. Anti-slip rubber pads, adjustable viewing angle. Sleek metallic design.", gender: "neutral" },
  college_backpack_kflbg7: { title: "Skybags Casual College Backpack (Unisex)", price: 500, category: "Accessories", description: "Vibrant three-compartment backpack with rain cover. Extremely comfortable shoulder straps and laptop sleeve. Pristine condition, all zippers work smoothly.", gender: "neutral" },
  extension_power_strip_pmvd0y: { title: "Belkin 3-Way Extension Power Strip", price: 450, category: "Hostel Essentials", description: "Heavy-duty extension cord with 3 Indian sockets, individual switch controls, and built-in surge protection. Long 1.8m cable, perfect for hosteler desks.", gender: "neutral" },
  scientific_calculator_ejdkon: { title: "Casio Scientific Calculator fx-82MS", price: 400, category: "Electronics", description: "Authentic non-programmable 2-line scientific calculator. Extremely helpful for engineering math, physics labs, and diploma exams.", gender: "neutral" },
  wireless_over_ear_headphones_v1jjgf: { title: "JBL Tune 510BT Wireless Over-Ear Headphones", price: 1200, category: "Gadgets", description: "Comfortable JBL wireless headphones with signature Pure Bass sound. 40 hours battery life, foldable design. Fully sanitized.", gender: "neutral" },
  // laptop_travel_backpack_mssj5x: RESERVED for Board Posts
  blue_portable_bluetooth_speaker_yweqz8: { title: "boAt Stone 200 Portable Bluetooth Speaker", price: 650, category: "Gadgets", description: "IPX6 waterproof robust outdoor speaker. Rich audio output, deep bass, handy strap. Best companion for hostel room gatherings.", gender: "neutral" },
  playbeat_aqua_deodorant_spray_ww3hxu: { title: "PlayBeat Aqua Intense Body Deodorant Spray", price: 120, category: "Other", description: "Refreshing and long-lasting aqua fragrance body spray. 150ml bottle, around 90% product remaining. Completely clean.", gender: "neutral" },
  transparent_tape_dispenser_roll_eukpmc: { title: "Desktop Transparent Tape Dispenser with 2 Rolls", price: 80, category: "Art Supplies", description: "Weighted desktop tape dispenser, very convenient for architecture and design model building. Includes two heavy-duty adhesive tape rolls.", gender: "neutral" },
  bellavita_white_oud_perfume_qfdapn: { title: "Bella Vita Luxury White Oud Perfume (100ml)", price: 350, category: "Other", description: "Exquisite spicy and woody unisex luxury white oud perfume spray. 100ml bottle, used sparingly (around 95% remaining). Excellent gift.", gender: "neutral" },
  philips_beard_trimmer_set_sims1o: { title: "Philips Cordless Beard Trimmer Series 1000", price: 600, category: "Appliances", description: "Cordless rechargeable beard trimmer. Self-sharpening stainless steel blades, USB charging. Comes with detailed trimming guide comb and brush.", gender: "male" },
  white_blue_hrx_running_shoes_ctd5nn: { title: "HRX Active Running Shoes (Size UK 9)", price: 950, category: "Footwear", description: "Breathable knitted upper, lightweight EVA midsole, excellent ground grip. Only used for morning college track jogs. Sanitized.", gender: "male" },
  milton_water_camphor_gpltjp: { title: "Milton Insulated Camp Water Camper (5 Litres)", price: 400, category: "Hostel Essentials", description: "Insulated leak-proof camper with handy tap and top handle. Keeps water ice-cold for over 12 hours in hot Vadodara summers.", gender: "neutral" },
  milton_steel_water_bottle_z8kuns: { title: "Milton Thermosteel Vacuum Bottle (1000ml)", price: 450, category: "Hostel Essentials", description: "Double-walled copper-plated stainless steel vacuum flask. Keeps beverages hot or cold for a full 24 hours. Sleek silver finish.", gender: "neutral" },
  black_water_bottle_study_table_dj0uuj: { title: "Matte Black Stainless Steel Gym Water Bottle", price: 250, category: "Hostel Essentials", description: "A premium single-walled leak-proof sports water bottle. Perfect for college backpacks and gym desks.", gender: "neutral" },
  oneplus_earbuds_case_black_u1sbiq: { title: "OnePlus Buds Z2 Case Cover (Silicone Black)", price: 100, category: "Accessories", description: "Ultra-thin shockproof protective liquid silicone case cover for OnePlus Buds Z2 with carabiner clip. Prevents scratch marks.", gender: "neutral" },
  rubiks_cube_keychain_usxzul: { title: "Mini Rubik's Cube Metal Keychain", price: 50, category: "Other", description: "Fully functional fully rotating mini Rubik's cube attached to a heavy-duty chrome key ring. Great cute backpack accessory.", gender: "neutral" },
  blue_foldable_umbrella_hprjbz: { title: "Compact Windproof Foldable Umbrella (Royal Blue)", price: 200, category: "Hostel Essentials", description: "Triple-folding lightweight travel umbrella. Water-repellent coating and heavy-duty fiberglass frame to sustain monsoon Vadodara winds.", gender: "neutral" },
  steel_clothes_drying_stand_vveimk: { title: "Heavy-Duty Steel Clothes Drying Stand", price: 850, category: "Hostel Essentials", description: "Robust rust-proof metal frame with generous hanging space. Fully collapsible, fits easily behind shared hostel room wardrobes.", gender: "neutral" },
  black_bean_bag_chair_zl5uq1: { title: "Sattva Classic XXXL Leatherette Bean Bag", price: 700, category: "Hostel Essentials", description: "Super comfortable black classic bean bag chair. Made of durable artificial leather, double stitched. Prefilled with high density beans.", gender: "neutral" },
  bedside_storage_organizer_ptop6o: { title: "Felt Bedside Caddy Hanging Organizer", price: 200, category: "Organizers", description: "Bedside felt pocket organizer. Hooks onto standard bunk bed side-rails. Perfect for keeping phones, books, chargers, and glasses.", gender: "neutral" },
  black_protein_shaker_pronext_twd3mf: { title: "ProNext Gym Protein Shaker Bottle (800ml)", price: 200, category: "Fitness Gear", description: "leak-proof black protein mixer bottle with blender ball and extra storage compartment for health supplements.", gender: "neutral" },
  purple_yoga_mat_wiselife_zyzaql: { title: "WiseLife Dual-Color Non-Slip Yoga Mat", price: 450, category: "Fitness Gear", description: "6mm high density TPE yoga mat with alignment lines. Excellent shock absorption and sweat resistant. Comes with carrier strap.", gender: "neutral" },
  parul_university_water_bottle_bnqkdw: { title: "Official Parul University Alumnus Bottle", price: 150, category: "Other", description: "Premium official varsity aluminum water bottle with official Parul University print. Lightweight and leakproof.", gender: "neutral" },
  yonex_badminton_wcfcbg: { title: "Yonex ZR 100 Light Badminton Racket", price: 650, category: "Sports Equipment", description: "Extremely lightweight aluminum frame racket with durable steel shaft. Great tension strings, ideal for campus badminton courts.", gender: "neutral" },
  warm_fairy_lights_LED_strip_lights_dorm_decor_rr3dsv: { title: "Warm White LED Fairy Lights Strip (10 Meter)", price: 150, category: "Hostel Essentials", description: "10m flexible copper wire LED fairy lights with USB plug. Gives a cozy golden glow to your study desk or bed wall.", gender: "neutral" },
  zara_denim_jacket_jbxh2a: { title: "Zara Men Classic Blue Denim Jacket (Size L)", price: 1400, category: "Men's Wear", description: "Authentic Zara classic faded blue distressed denim jacket. Highly durable heavy cotton. Perfect layers for cool winter evenings.", gender: "male" },
  ukulele_instrument_qifcet: { title: "Kadence Soprano Acoustic Ukulele (Sapele Wood)", price: 1500, category: "Musical Instruments", description: "Premium mahogany soprano ukulele with nylon strings. Warm, resonant tone. Includes a waterproof gig bag and detailed beginner chord guide book.", gender: "neutral" },
  wooden_desk_organizer___pen_stand_fkbpzs: { title: "Handcrafted Wooden Multi-Slot Desk Organizer", price: 250, category: "Organizers", description: "Varnished rosewood desk pen holder, memo pad stand, and sticky note slots. Keeps your study table fully organized.", gender: "neutral" },
  wildcraft_bag_eccsly: { title: "Wildcraft Unisex School & College Backpack", price: 600, category: "Accessories", description: "Sleek blue 30L college bag. Ergonomic padded straps, single main compartment with small front quick-access pocket. Minor wear.", gender: "neutral" },
  unisex_white_sneakers_sneaker_culture_fbgyd2: { title: "White Streetwear Sneakers (UK Size 8)", price: 1100, category: "Footwear", description: "Super stylish crisp white daily campus sneakers. Comfortable interior cushioning. Matches beautifully with cargo pants or jeans.", gender: "neutral" },
  travel_duffle_bag_buwusc: { title: "Aristocrat 45L Foldable Travel Duffle Bag", price: 600, category: "Accessories", description: "Spacious nylon travel duffle bag. Collapsible frame, strong dual handles and long shoulder strap. Used only twice to travel home.", gender: "neutral" },
  traditional_indian_jhumka_earrings_womens_jewelry_mrdzzw: { title: "Rajasthani Brass Traditional Jhumka Earrings", price: 200, category: "Traditional & Ethnic", description: "Exquisite gold-plated brass jhumki earrings with delicate pearl bead drops. Extremely lightweight and stunning for ethnic programs.", gender: "female" },
  storage_box_drwaql: { title: "Plastic Modular Storage Container Box (20 Litres)", price: 180, category: "Organizers", description: "Transparent heavy-duty plastic storage box with locking handles. Helps keep extra books or seasonal clothes clean and dust-free.", gender: "neutral" },
  study_lamp_pmfplb: { title: "Rechargeable LED Touch Desk Study Lamp", price: 350, category: "Appliances", description: "Flexible gooseneck LED table lamp. Has three level touch brightness adjustment, pen stand base, and phone holder slot. USB cable included.", gender: "neutral" },
  tabletop_whiteboard___markers_dorm_exam_prep_vacyj9: { title: "Double-Sided Tabletop Magnetic Whiteboard (1x1.5 Ft)", price: 250, category: "Art Supplies", description: "Perfect whiteboard for solving math/CSE equations, drafting daily to-do lists, and dorm study sessions. Includes 3 markers and 1 magnetic eraser.", gender: "neutral" },
  smartwatch_fitness_tracker_boat_Realme_mwycqc: { title: "boAt Wave Call Smartwatch (Active Black)", price: 1100, category: "Gadgets", description: "1.69 inch HD curved screen smartwatch with Bluetooth calling, multiple sports modes, SpO2, and heart rate monitor. Pristine condition.", gender: "neutral" },
  soldering_iron___wire_reel_ftv4l7: { title: "25W Soldering Iron & Flux Wire Reel Kit", price: 300, category: "Microcontrollers & Sensors", description: "Engineering project soldering kit containing high-heat iron rod, standard wire reel, soldering stand, and paste flux.", gender: "neutral" },
  red_women_saree_fzwfte: { title: "Crimson Red Georgette Embroidered Saree (Rent)", price: 700, category: "Traditional & Ethnic", description: "Beautiful elegant red saree with premium borders available for rental. Very light and easy to drape, perfect for farewells.", gender: "female" },
  sandwich_maker_toaster_kghgh5: { title: "Prestige Non-Stick Grill Sandwich Toaster", price: 650, category: "Appliances", description: "Fast heating non-stick grill sandwich plates. Safe cool-touch body, indicator neon lights. Ideal for quick late-night hostel sandwiches.", gender: "neutral" },
  heavy_duty_resistance_bands_set_fyitrc: { title: "Premium Latex Fitness Resistance Bands (5 Set)", price: 350, category: "Fitness Gear", description: "Set of 5 color-coded gym resistance bands with varying tension levels (10lbs to 30lbs). Includes handles, door anchor, and carry pouch.", gender: "neutral" }
};

// Metadata Mappings for all Services
const SERVICE_METADATA_MAP = {
  DSLR_camera_rental_service_njdhau: { title: "DSLR Camera Rental & Event Shoots", price: 400, category: "Photography", description: "High-quality professional Canon DSLR camera with 18-55mm lens available for rent. Also taking bookings for campus events. Shoot locations include BBA Green Tunnel, PU Circle, and Design Building." },
  college_event_photography_service_q7xljz: { title: "College Event & Fest Photography", price: 500, category: "Photography", description: "Professional photography for cultural programs, events, fests, and group portraits at Parul University (PU Circle, BBA Ground, Canteen areas). Quick delivery of edited photos." },
  graphic_design___video_editing_service_l7d9hn: { title: "Pro Video Editing & Presentation Design", price: 300, category: "Graphic Design", description: "I will edit high-quality Reels/YouTube videos and design premium professional PowerPoint slides for your assignments and minor projects." },
  hostel_room_cleaning_service_lsrqer: { title: "Deep Room Scrubbing & Cleaning Service", price: 150, category: "Room Cleaning", description: "Reliable room deep cleaning, bathroom sanitization, shelf dust wiping, and waste disposal. Available on weekend mornings." },
  high_speed_printing___photocopying_service_gcytzx: { title: "High-Speed Document Printing & Lobby Delivery", price: 50, category: "Delivery Services", description: "Send me your exam notes/syllabus PDFs. I will print them at high quality (₹1 per page black & white) and deliver directly to your hostel lobby (Shastri, Kalam, Atal, Sarojini etc.)." },
  packing___moving_service_r3dmj8: { title: "Hostel Packing & Luggage Moving Help", price: 350, category: "Packing Services", description: "Complete assistance with sturdy packing boxes, packing tape, bubble wrap, and lifting loading support when changing rooms or vacating." },
  packing___moving_service_1_pvgaid: { title: "Express Hostel Luggage Relocation Service", price: 300, category: "Packing Services", description: "Prompt moving support with two helpers. Secure packaging and fast luggage transfer between hostel blocks." },
  python_tutoring_fchc5v: { title: "Python Programming & DSA Lab Tutoring", price: 250, category: "Tutoring", description: "Personal tutoring for computer science labs. I will explain python basics, data structures, and debug your lab coding assignments." },
  professional_laundry___ironing_service_b7pyhw: { title: "Express Steam Ironing & Laundry Service", price: 100, category: "Laundry Services", description: "Hygiene detergent washing, soft tumble drying, and crisp garment steam ironing. Free pickup and drop back within 24 hours." },
  roomsharing_fpmxhs: { title: "Double-Sharing Roommate Matching Assistance", price: 100, category: "Roommate Matching", description: "We will help you locate compatible, friendly, clean, and academic-focused roommates inside Parul University hostels." },
  ride_sharing_jf6sv4: { title: "Campus Scooter Pillion Ride Sharing", price: 50, category: "Carpooling & Rides", description: "Frequent commuting on my Activa scooter from PU Circle to Vadodara railway station and back. Pocket-friendly pillion sharing." },
  // scooty_ride_share_2_helmets_idjrdo: RESERVED for Board Posts
  professional_presentation___resume_review_service_ozba7l: { title: "Minor Project PPT & Resume Review Help", price: 200, category: "Tutoring", description: "Professional PowerPoint slide design, custom project templates, resume formatting, and mock interview preparation by a final year CS student. Can meet at Design Building Canteen or PU Circle." }
};


// ================= ================= =================
// DETERMINISTIC STUDENT PORTFOLIO MAPS TO DEFINE COHERENT PERSONAS
// ================= ================= =================
const BOY_DETERMINISTIC_PORTFOLIOS = [
  // Aarav Sharma (Index 0): The Musical Sportsman
  {
    products: ['ukulele_instrument_qifcet', 'yonex_badminton_wcfcbg'],
    service: 'ride_sharing_jf6sv4'
  },
  // Vihaan Kumar (Index 1): The CS IoT Geek
  {
    products: ['arduino_project_kit_1_umebsx', 'multimeter___resistor_set_ljtpy1'],
    service: 'python_tutoring_fchc5v'
  },
  // Vivaan Patel (Index 2): The Hardware & Design Geek
  {
    products: ['arduino_project_kit_ow7f0h', 'engineering_drawing_board___drafter_bjjrvb'],
    service: 'graphic_design___video_editing_service_l7d9hn'
  },
  // Advik Singh (Index 3): The Stylish Streetwear Enthusiast
  {
    products: ['mens_oversized_animestreetwear_t_Shirt_s8kf3a', 'red_varsity_college_jacket_qmcq2l'],
    service: 'roomsharing_fpmxhs'
  },
  // Kabir Joshi (Index 4): The Traditional & Active Guy
  {
    products: ['crocs_casual_slides_nq4ycg'],
    service: 'high_speed_printing___photocopying_service_gcytzx'
  },
  // Riyan Mehta (Index 5): The Active Athlete
  {
    products: ['nike_shoes_pnxfdh', 'football_soccer_ball___cleats_yq8y8s'],
    service: 'packing___moving_service_r3dmj8'
  },
  // Reyansh Shah (Index 6): The Fitness Buff
  {
    products: ['dumbbells_xtoujo', 'gym_shaker_bottle_stainless_steel_gamnxi'],
    service: 'professional_laundry___ironing_service_b7pyhw'
  },
  // Ayaan Verma (Index 7): The Photographer
  {
    products: ['portable_power_bank_qcvfud'],
    service: 'DSLR_camera_rental_service_njdhau'
  },
  // Krishna Patel (Index 8): The Commuter
  {
    products: ['indian_bicycle_cyh4id'],
    service: 'packing___moving_service_1_pvgaid'
  },
  // Ishaan Kumar (Index 9): The Academic Topper
  {
    products: ['competitive_exam_guides_ektim7', 'casio_scientific_calculator_d2gsdq'],
    service: 'python_tutoring_fchc5v'
  },
  // Shaurya Singh (Index 10): The Cozy Dorm Hosteler
  {
    products: ['bedding_wia1nr', 'maggi_and_kettle_c8owm9'],
    service: 'hostel_room_cleaning_service_lsrqer'
  },
  // Atharv Joshi (Index 11): The Chef Hosteler
  {
    products: ['mini_induction_cooktop___tea_pot_dqoz74', 'maggi_and_kettle_1_p3hjnr'],
    service: 'ride_sharing_jf6sv4'
  },
  // Rudra Choudhary (Index 12): The Tech Saver
  {
    products: ['boat_headphone_ialfij', 'aluminium_ergonomic_laptop_stand_pne06l'],
    service: 'graphic_design___video_editing_service_l7d9hn'
  },
  // Aryan Sen (Index 13): The Study Leader
  {
    products: ['campus_placement_preparation_kit_yikkve', 'indian_textbooks_wslxao'],
    service: 'high_speed_printing___photocopying_service_gcytzx'
  },
  // Shivansh Reddy (Index 14): The Smart Gadget Seller
  {
    products: ['boat_bluetooth_earbuds_wireless_1_euib3t', 'multiple_socket_extension_spike_guard_sbpb1y'],
    service: 'professional_laundry___ironing_service_b7pyhw'
  }
];

const GIRL_DETERMINISTIC_PORTFOLIOS = [
  // Aadhya Patel (Index 0): The Festive Diva
  {
    products: ['designer_lehenga_r1stk9', 'ethnic_wear_g0tzi4'],
    service: 'roomsharing_fpmxhs'
  },
  // Kiara Sharma (Index 1): The Artist
  {
    products: ['acrylic_paints___brushes_kit_ecvr10', 'premium_color_pencil___sketching_kit_bg7jdp'],
    service: 'graphic_design___video_editing_service_l7d9hn'
  },
  // Prisha Gupta (Index 2): The Neat Dorm Girl
  {
    products: ['collapsible_mesh_laundry_basket_pymd8t', 'clothing_stream_iron_wjrpdh'],
    service: 'professional_laundry___ironing_service_b7pyhw'
  },
  // Avni Singh (Index 3): The Smart Chef
  {
    products: ['egg_boiler_multi_cooker_nqo3lb', 'maggi_and_kettle_2_lblcfn'],
    service: 'hostel_room_cleaning_service_lsrqer'
  },
  // Myra Joshi (Index 4): The Event Planner
  {
    products: ['fest_pass_bhy51v', 'freshers_fest_pass_ym7rdo'],
    service: 'college_event_photography_service_q7xljz'
  },
  // Ira Choudhary (Index 5): The Academic Geek
  {
    products: ['casio_scientific_calculator_d2gsdq', 'lab_safety_kit_ronuov'],
    service: 'python_tutoring_fchc5v'
  },
  // Navya Sen (Index 6): The Smart Organizer
  {
    products: ['aluminium_ergonomic_laptop_stand_pne06l', 'multiple_socket_extension_spike_guard_sbpb1y'],
    service: 'high_speed_printing___photocopying_service_gcytzx'
  },
  // Anvi Reddy (Index 7): The Active Girl
  {
    products: ['crocs_casual_slides_1_x7ip9j', 'crocs_casual_slides_nq4ycg'],
    service: 'ride_sharing_jf6sv4'
  },
  // Shanaya Patel (Index 8): The Medical Lab Student
  {
    products: ['medical_court_q82tne', 'lab_safety_kit_ronuov'],
    service: 'python_tutoring_fchc5v'
  },
  // Nisha Sharma (Index 9): The Creative Event Lover
  {
    products: ['navratri_free_style_garba_zone_pass_paruluniversity_xfzg6p', 'darshan_raval_fan_pit_pass_paruluniversity_picajk'],
    service: 'college_event_photography_service_q7xljz'
  }
];

function getPriceUnitForService(category) {
  if (category === 'Tutoring' || category === 'Tech Support' || category === 'Graphic Design') {
    return 'per hour';
  } else if (category === 'Photography' || category === 'Videography') {
    return 'per day';
  } else if (category === 'Project Assistance' || category === 'Resume Building' || category === 'Interview Prep' || category === 'Roommate Matching') {
    return 'per project';
  } else {
    return 'per session';
  }
}

function getAvailabilityForService(category) {
  if (category === 'Tutoring' || category === 'Tech Support') {
    return '🗓️ Flexible';
  } else if (category === 'Room Cleaning' || category === 'Moving Assistance' || category === 'Packing Services' || category === 'Laundry Services') {
    return '🏠 Weekends';
  } else if (category === 'Photography' || category === 'Videography' || category === 'Carpooling & Rides') {
    return '🌙 Evening';
  } else {
    return '🗓️ Flexible';
  }
}

async function runSeedingProcess() {
  try {
    console.log('🧹 Cleaning existing database...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Service.deleteMany({}),
      Review.deleteMany({}),
      Order.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
      Offer.deleteMany({}),
      Report.deleteMany({}),
      Community.deleteMany({}),
      Otp.deleteMany({}),
      Transaction.deleteMany({}),
      BoardPost.deleteMany({})
    ]);
    console.log('✅ All collections dropped.');

    console.log('🏘️ Registering Parul University Community Circle...');
    const puCommunity = await Community.create({
      name: 'Parul University',
      emailDomains: [PU_DOMAIN],
      description: 'The exclusive buying, selling, and renting community circle for Parul University Vadodara students and hostelers.',
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
      ],
      createdAt: new Date('2025-01-01T00:00:00Z')
    });

    // 1. Fetch Cloudinary Images
    let imagesPool = await fetchCloudinaryImages();
    if (imagesPool.length === 0) {
      console.log('ℹ️ Running in backup offline mode: Loading predefined secure URL assets.');
      imagesPool = [...OFFLINE_FALLBACK_IMAGES];
    }

    // Map images pool by public_id to secure_url for O(1) lookup
    const urlLookup = {};
    imagesPool.forEach(img => {
      urlLookup[img.public_id] = img.secure_url;
    });
    // Add service images to lookup
    SERVICES_IMAGES.forEach(img => {
      urlLookup[img.public_id] = img.secure_url;
    });

    // 2. Generate 40 Curated, Highly Detailed student records
    console.log(`👥 Registering 40 Parul University Accounts (Password: ${PASSWORD})...`);
    const commonHash = await bcrypt.hash(PASSWORD, 10);
    const usersToInsert = [];
    
    let recordContent = `# 🎓 Verified Parul University Seeded Accounts\n\n`;
    recordContent += `All accounts are strictly bound to the **Parul University** circle and are fully verified. All passwords are set to \`${PASSWORD}\`.\n\n`;
    recordContent += `| Student Name | Gender | Registered Email ID | Assigned Hostel Block (Strictly Gender Match) |\n`;
    recordContent += `| :--- | :--- | :--- | :--- |\n`;

    // 25 Boys
    for (let i = 0; i < TOTAL_BOYS; i++) {
      const email = generateEmail();
      const profile = BOY_PROFILES[i];
      const joinDate = randomDate(START_DATE, MAX_DATE);
      usersToInsert.push({
        name: profile.name,
        username: email.split('@')[0].replace(/[^a-z0-9_.]/gi, '_').substring(0, 20),
        email: email,
        password: commonHash,
        role: 'user',
        isVerified: true,
        gender: 'male',
        isDummy: true,
        profilePicture: MALE_AVATARS[i % MALE_AVATARS.length],
        bannerImage: MALE_BANNERS[i % MALE_BANNERS.length],
        verifiedCommunities: [puCommunity._id],
        defaultCommunity: puCommunity._id,
        defaultHostel: profile.hostel,
        bio: profile.bio,
        createdAt: joinDate
      });
    }

    // 15 Girls
    for (let i = 0; i < TOTAL_GIRLS; i++) {
      const email = generateEmail();
      const profile = GIRL_PROFILES[i];
      const joinDate = randomDate(START_DATE, MAX_DATE);
      usersToInsert.push({
        name: profile.name,
        username: email.split('@')[0].replace(/[^a-z0-9_.]/gi, '_').substring(0, 20),
        email: email,
        password: commonHash,
        role: 'user',
        isVerified: true,
        gender: 'female',
        isDummy: true,
        profilePicture: FEMALE_AVATARS[i % FEMALE_AVATARS.length],
        bannerImage: FEMALE_BANNERS[i % FEMALE_BANNERS.length],
        verifiedCommunities: [puCommunity._id],
        defaultCommunity: puCommunity._id,
        defaultHostel: profile.hostel,
        bio: profile.bio,
        createdAt: joinDate
      });
    }

    const createdUsers = await User.insertMany(usersToInsert);
    createdUsers.forEach(u => {
      recordContent += `| ${u.name} | ${u.gender} | \`${u.email}\` | ${u.defaultHostel} |\n`;
    });

    // Save Markdown Record
    fs.writeFileSync(RECORD_PATH, recordContent);
    console.log(`📝 Generated user login credentials recorded perfectly in: ${RECORD_PATH}`);

    const boysUsers = createdUsers.filter(u => u.gender === 'male');
    const girlsUsers = createdUsers.filter(u => u.gender === 'female');

    console.log('🛒 Distributing logical, organic campus product & service portfolios...');
    
    const seededProducts = [];
    const seededServices = [];

    // Track used images to ensure NO image is used more than once in the entire database!
    const usedImages = new Set();

    // 1. Gather all Campus Products and Services
    const campusProductsToDistribute = [];
    const campusServicesToDistribute = [];

    // Collect deterministic boy portfolios
    BOY_DETERMINISTIC_PORTFOLIOS.forEach((portfolio) => {
      portfolio.products.forEach(pId => {
        const metadata = PRODUCT_METADATA_MAP[pId];
        const imageUrl = urlLookup[pId];
        if (metadata && imageUrl && !usedImages.has(imageUrl)) {
          usedImages.add(imageUrl);
          campusProductsToDistribute.push({ metadata, imageUrl, gender: metadata.gender || 'neutral' });
        }
      });
      if (portfolio.service) {
        const sMetadata = SERVICE_METADATA_MAP[portfolio.service];
        const sImageUrl = urlLookup[portfolio.service];
        if (sMetadata && sImageUrl && !usedImages.has(sImageUrl)) {
          usedImages.add(sImageUrl);
          campusServicesToDistribute.push({ sMetadata, sImageUrl });
        }
      }
    });

    // Collect deterministic girl portfolios
    GIRL_DETERMINISTIC_PORTFOLIOS.forEach((portfolio) => {
      portfolio.products.forEach(pId => {
        const metadata = PRODUCT_METADATA_MAP[pId];
        const imageUrl = urlLookup[pId];
        if (metadata && imageUrl && !usedImages.has(imageUrl)) {
          usedImages.add(imageUrl);
          campusProductsToDistribute.push({ metadata, imageUrl, gender: metadata.gender || 'neutral' });
        }
      });
      if (portfolio.service) {
        const sMetadata = SERVICE_METADATA_MAP[portfolio.service];
        const sImageUrl = urlLookup[portfolio.service];
        if (sMetadata && sImageUrl && !usedImages.has(sImageUrl)) {
          usedImages.add(sImageUrl);
          campusServicesToDistribute.push({ sMetadata, sImageUrl });
        }
      }
    });

    // Collect remaining campus products
    imagesPool.forEach(img => {
      const imageUrl = img.secure_url;
      if (usedImages.has(imageUrl)) return;
      const metadata = PRODUCT_METADATA_MAP[img.public_id];
      if (metadata) {
        usedImages.add(imageUrl);
        campusProductsToDistribute.push({ metadata, imageUrl, gender: metadata.gender || 'neutral' });
      }
    });

    // Collect remaining campus services
    SERVICES_IMAGES.forEach(img => {
      const imageUrl = img.secure_url;
      if (usedImages.has(imageUrl)) return;
      const metadata = SERVICE_METADATA_MAP[img.public_id];
      if (metadata) {
        usedImages.add(imageUrl);
        campusServicesToDistribute.push({ sMetadata: metadata, sImageUrl: imageUrl });
      }
    });

    // Keep a global record of all used image URLs to guarantee 100% absolute uniqueness
    const usedImagesGlobal = new Set();

    // 2. Distribute Campus Listings Organically to the 40 Student Users
    // This gives a random organic distribution: some have 1, some have 3, 4, or 5
    campusProductsToDistribute.forEach(item => {
      let owner;
      if (item.gender === 'male') {
        owner = randomItem(boysUsers);
      } else if (item.gender === 'female') {
        owner = randomItem(girlsUsers);
      } else {
        owner = randomItem(createdUsers);
      }
      
      const listingDate = randomDate(new Date(owner.createdAt), MAX_DATE);
      
      // Ensure image is globally unique
      let finalImgUrl = item.imageUrl;
      if (usedImagesGlobal.has(finalImgUrl)) {
        // Safe signature fallback should it ever overlap
        finalImgUrl = `${finalImgUrl}${finalImgUrl.includes('?') ? '&' : '?'}sig=${Math.random().toString(36).substr(2, 5)}`;
      }
      usedImagesGlobal.add(finalImgUrl);

      // Organic pricing model: 40% Sell only, 30% Rent only, 30% Both Buy & Rent
      let forSell = true;
      let forRent = false;
      let price = item.metadata.price;
      let rentPrice = undefined;
      let rentUnit = undefined;

      const lowerTitle = item.metadata.title.toLowerCase();
      const isExplicitRent = lowerTitle.includes('rent') || lowerTitle.includes('saree') || lowerTitle.includes('lehenga');

      const rand = Math.random();
      if (isExplicitRent) {
        // Explicitly rent-only or both
        if (rand < 0.5) {
          forSell = false;
          forRent = true;
          price = undefined;
          rentPrice = Math.max(10, Math.round(item.metadata.price * 0.05));
          rentUnit = randomItem(['day', 'week']);
        } else {
          forSell = true;
          forRent = true;
          price = item.metadata.price;
          rentPrice = Math.max(10, Math.round(item.metadata.price * 0.04));
          rentUnit = randomItem(['day', 'week']);
        }
      } else {
        if (rand < 0.4) {
          // Buy only
          forSell = true;
          forRent = false;
          price = item.metadata.price;
        } else if (rand < 0.7) {
          // Rent only
          forSell = false;
          forRent = true;
          price = undefined;
          rentPrice = Math.max(10, Math.round(item.metadata.price * 0.05));
          rentUnit = randomItem(['day', 'week', 'month']);
        } else {
          // Both Buy and Rent
          forSell = true;
          forRent = true;
          price = item.metadata.price;
          rentPrice = Math.max(10, Math.round(item.metadata.price * 0.04));
          rentUnit = randomItem(['day', 'week', 'month']);
        }
      }

      seededProducts.push({
        seller: owner._id,
        title: item.metadata.title,
        description: item.metadata.description,
        forSell,
        forRent,
        price,
        rentPrice,
        rentUnit,
        images: [finalImgUrl],
        category: item.metadata.category,
        condition: randomItem(['New', 'Like New', 'Good', 'Fair', 'Poor']),
        status: 'Available',
        community: puCommunity._id,
        visibility: 'Community',
        location: {
          city: 'Vadodara',
          state: 'Gujarat',
          hostel: owner.defaultHostel,
          room: undefined,
          bed: undefined,
          isPrecise: true
        },
        createdAt: listingDate,
        updatedAt: listingDate
      });
    });

    campusServicesToDistribute.forEach(item => {
      const provider = randomItem(createdUsers);
      const serviceDate = randomDate(new Date(provider.createdAt), MAX_DATE);

      // Ensure service image is globally unique
      let finalImgUrl = item.sImageUrl;
      if (usedImagesGlobal.has(finalImgUrl)) {
        finalImgUrl = `${finalImgUrl}${finalImgUrl.includes('?') ? '&' : '?'}sig=${Math.random().toString(36).substr(2, 5)}`;
      }
      usedImagesGlobal.add(finalImgUrl);

      seededServices.push({
        provider: provider._id,
        title: item.sMetadata.title,
        description: item.sMetadata.description,
        price: item.sMetadata.price,
        priceUnit: getPriceUnitForService(item.sMetadata.category),
        category: item.sMetadata.category,
        images: [finalImgUrl],
        status: 'Active',
        community: puCommunity._id,
        visibility: 'Community',
        location: {
          city: 'Vadodara',
          state: 'Gujarat',
          hostel: provider.defaultHostel,
          room: undefined,
          bed: undefined,
          isPrecise: true
        },
        availability: getAvailabilityForService(item.sMetadata.category),
        createdAt: serviceDate,
        updatedAt: serviceDate
      });
    });

    // 3. Add Vadodara Public Listings (at least 60)
    console.log(`🌐 Distributing ${PUBLIC_PRODUCTS.length} Public Products and ${PUBLIC_SERVICES.length} Public Services in Vadodara...`);
    
    PUBLIC_PRODUCTS.forEach(p => {
      // Choose an owner randomly
      const owner = randomItem(createdUsers);
      const listingDate = randomDate(new Date(owner.createdAt), MAX_DATE);
      
      // Ensure public product image is globally unique
      let finalImgUrl = p.image;
      if (usedImagesGlobal.has(finalImgUrl)) {
        finalImgUrl = `${finalImgUrl}${finalImgUrl.includes('?') ? '&' : '?'}sig=${Math.random().toString(36).substr(2, 5)}`;
      }
      usedImagesGlobal.add(finalImgUrl);

      // Organic pricing model: 40% Sell only, 30% Rent only, 30% Both Buy & Rent
      let forSell = true;
      let forRent = false;
      let price = p.price;
      let rentPrice = undefined;
      let rentUnit = undefined;

      const lowerTitle = p.title.toLowerCase();
      const isExplicitRent = lowerTitle.includes('rent') || lowerTitle.includes('saree') || lowerTitle.includes('lehenga');

      const rand = Math.random();
      if (isExplicitRent) {
        if (rand < 0.5) {
          forSell = false;
          forRent = true;
          price = undefined;
          rentPrice = Math.max(10, Math.round(p.price * 0.05));
          rentUnit = randomItem(['day', 'week']);
        } else {
          forSell = true;
          forRent = true;
          price = p.price;
          rentPrice = Math.max(10, Math.round(p.price * 0.04));
          rentUnit = randomItem(['day', 'week']);
        }
      } else {
        if (rand < 0.4) {
          // Buy only
          forSell = true;
          forRent = false;
          price = p.price;
        } else if (rand < 0.7) {
          // Rent only
          forSell = false;
          forRent = true;
          price = undefined;
          rentPrice = Math.max(10, Math.round(p.price * 0.05));
          rentUnit = randomItem(['day', 'week', 'month']);
        } else {
          // Both Buy and Rent
          forSell = true;
          forRent = true;
          price = p.price;
          rentPrice = Math.max(10, Math.round(p.price * 0.04));
          rentUnit = randomItem(['day', 'week', 'month']);
        }
      }

      seededProducts.push({
        seller: owner._id,
        title: p.title,
        description: p.description,
        forSell,
        forRent,
        price,
        rentPrice,
        rentUnit,
        images: [finalImgUrl],
        category: p.category,
        condition: p.condition || randomItem(['New', 'Like New', 'Good', 'Fair', 'Poor']),
        status: 'Available',
        community: undefined,
        visibility: 'Public',
        location: {
          city: 'Vadodara',
          state: 'Gujarat',
          coordinates: [
            73.1812 + (Math.random() - 0.5) * 0.08,
            22.3072 + (Math.random() - 0.5) * 0.08
          ],
          isPrecise: true,
          area: randomItem(['Alkapuri', 'Sayajiganj', 'Gotri', 'Akota', 'Fatehgunj', 'Vasna Road', 'Manjalpur', 'Karelibaug', 'Sama Savli Road']),
          pincode: randomItem(['390001', '390002', '390005', '390007', '390015', '390018', '390020', '390021'])
        },
        createdAt: listingDate,
        updatedAt: listingDate
      });
    });

    PUBLIC_SERVICES.forEach(s => {
      const provider = randomItem(createdUsers);
      const serviceDate = randomDate(new Date(provider.createdAt), MAX_DATE);
      
      // Ensure public service image is globally unique
      let finalImgUrl = s.image;
      if (usedImagesGlobal.has(finalImgUrl)) {
        finalImgUrl = `${finalImgUrl}${finalImgUrl.includes('?') ? '&' : '?'}sig=${Math.random().toString(36).substr(2, 5)}`;
      }
      usedImagesGlobal.add(finalImgUrl);

      seededServices.push({
        provider: provider._id,
        title: s.title,
        description: s.description,
        price: s.price,
        priceUnit: s.priceUnit || 'per hour',
        category: s.category,
        images: [finalImgUrl],
        status: 'Active',
        community: undefined,
        visibility: 'Public',
        location: {
          city: 'Vadodara',
          state: 'Gujarat',
          coordinates: [
            73.1812 + (Math.random() - 0.5) * 0.08,
            22.3072 + (Math.random() - 0.5) * 0.08
          ],
          isPrecise: true,
          area: randomItem(['Alkapuri', 'Sayajiganj', 'Gotri', 'Akota', 'Fatehgunj', 'Vasna Road', 'Manjalpur', 'Karelibaug', 'Sama Savli Road']),
          pincode: randomItem(['390001', '390002', '390005', '390007', '390015', '390018', '390020', '390021'])
        },
        availability: s.availability || '🗓️ Flexible',
        createdAt: serviceDate,
        updatedAt: serviceDate
      });
    });

    const products = await Product.insertMany(seededProducts);
    const services = await Service.insertMany(seededServices);
    console.log(`✅ Seeded ${products.length} Products and ${services.length} Services.`);

    // 4. Seeding Circle Board student threads
    console.log('📢 Seeding Circle Board student threads...');
    const boardPosts = [];
    const THIRTY_DAYS_AGO = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const POST_START = THIRTY_DAYS_AGO.getTime() > START_DATE.getTime() ? THIRTY_DAYS_AGO : START_DATE;
    
    const REALISTIC_POSTS = [
      {
        category: 'Alerts',
        content: 'Bhai log sunlo, Shastri Bhawan – B me random checking chal rahi hai abhi! Warden 2nd floor pe hai aur guard ke sath do dogs bhi hain sniffing ke liye. Cupboards bhi khol ke check kar rahe hain, apna kettle aur induction jaldi chupa do sab! Mera roommate ka cooktop pakda gaya, scene bohot kharab hai. Jaldi karo!! 😭🚨',
        imageKey: null,
        replies: [
          'Wtf do dogs?? Kettle rakhna kabse crime ban gaya yaar, ye admin log pagal hain fr.',
          'Thanks bro, saved my induction at floor 3. Ek chai udhaar rhi tumhari! ☕',
          'Shastri A me bhi aayenge kya ye log? Mera toaster table par hi pada hai 💀'
        ]
      },
      {
        category: 'Rides',
        content: 'Monsoon me Hathni Mata Waterfall ka scene ekdum lit hai yaar! Is Sunday subah subah ride pe chalte hain. 6:30 AM ko PU Circle se nikalenge. Activa pe ek seat khali hai aur extra helmet bhi hai mere paas. Boring hostel mess se escape chahiye toh chal lo, hmu jaldi! Petrol cost split kar lenge dw 🛵💨',
        imageKey: 'scooty_ride_share_2_helmets_idjrdo',
        replies: [
          'Bhai main chalunga! Hathni Mata ka waterfall check karna hai. Seat khali hai na abhi?',
          'Barish me road bohot slippery ho jata hai, thoda safely drive karna please.',
          'Chalo WhatsApp group banao iska, sabko add krlo fatfat! 🏞️'
        ]
      },
      {
        category: 'Rides',
        content: 'Guys, next Saturday hum log Zarwani Waterfall aur Statue of Unity ja rahe hain. Subah 6:00 baje Central Admin Auditorium se cab nikalegi. Total Ertiga booking cost split kar lenge, per person around ₹650 padega. Abhi 2 seats khali hain, koi chalega kya hamare sath? Pls jaldi DM karo, seats confirm karni hain! 🚗✨',
        imageKey: null,
        replies: [
          'Bhai ek seat mere liye reserve krdo! Ekdum perfect road trip scene hai.',
          'Tbh count me in, main bhi camera leke aaunga. Statue of Unity cover ho jayega.',
          'Zarwani me abhi entry allowed hai na bathing ke liye? Ya ban hai monsoons me?'
        ]
      },
      {
        category: 'Rides',
        content: 'Pavagadh hill pe Kalika Mata Temple ja rha hu this Sunday. BBA Ground se 5:00 AM nikalenge bike pe, ropeway ki bheed se bachna hai early jaake. Fuel cost share karne ke liye pillion rider chahiye. Endsems se pehle thoda aashirwad le lete hain yaar, warna math paper lag jayega! 🙏🍃',
        imageKey: null,
        replies: [
          'Pavagadh ki morning absolute bliss hai bhai. Par subah 5 baje is too early, main so rha hu tab 😂',
          'Aashirwad are needed fr, math paper is going to cook us otherwise. Count me in!'
        ]
      },
      {
        category: 'Rides',
        content: 'Friday evening Vadodara movie chalte hain yaar, 6:30 PM ka show. Yaha campus se city 15 km door hai aur auto wale bohot loot rahe hain. 5:15 PM ko PU Circle se Uber share karenge. 2 seats empty hain fare split ke liye. Koi chalega kya movie dekhne? 🍿🎬',
        imageKey: null,
        replies: [
          'Bhai PVR Transcube chalenge na? Ticket sath me book kar lete hain.',
          'Transcube is fine, WhatsApp pe coordinate karte hain jaldi.'
        ]
      },
      {
        category: 'General',
        content: 'Utopia Food Court me aaj raat 8:00 baje acoustic jam session hai yaar! Sab log aao retro Bollywood gaate hain aur chill karte hain hot waffle ke sath. Guitar ya ukulele hai kisi ke paas toh le aana. Ekdum mast vibe banayenge, last time itna fun aaya tha ki 2 ghante baith gaye the sab 🎸🎶❤️',
        imageKey: 'acoustic_guitar_mprs14',
        replies: [
          'Mera ukulele ekdum ready hai! Aaj toh old school Bollywood loops chalenge.',
          'Utopia has the best crowd fr, main bhi aaunga pure hostel gang ke sath.',
          'Bhai waffle ki treat teri taraf se toh done hai na? 😂'
        ]
      },
      {
        category: 'General',
        content: 'Navratri coming soon guys! Capitol Food Court me aaj sham 5:30 baje Garba flash mob ki practice ho rhi hai. Steps seekhne hain toh bina sharme aajaao, yaha sab beginners hi hain. Practice ke baad Capitol ki special garam chai peeyenge! Traditional wear pehen ke aana ho toh even better vibes aayengi 💃🔥',
        imageKey: 'red_designer_kurta_lnjefx',
        replies: [
          'Dodhiya steps seekhne hain, bilkul aaunga bhai! Capitol ki chai > everything.',
          'Traditional ethnic wear pehen ke aana hai kya practice me? Mere paas kurta hai!',
          'Capitol mein garba practice aur chai, perfect combo honestly 🫖'
        ]
      },
      {
        category: 'Academic',
        content: 'Design building walo dhyan do! 🎨 Art exhibition aur live canvas sketching workshop tomorrow at the BBA Green Tunnel from 10:00 AM to 3:00 PM. Design Building ke seniors ne organize kiya hai. Sketching material aur canvas free me milega waha pe. Come paint your heart out, sabko welcome hai beginners bhi! 🌿',
        imageKey: 'canvas_painting_handmade_art_iwqhqo',
        replies: [
          'BBA green tunnel is the most aesthetic spot on campus, ekdum sahi jagah choose ki hai exhibition ke liye.',
          'Bhai first years bhi display kar sakte hain kya artwork? Mere paas kuch design sheets ready hain.'
        ]
      },
      {
        category: 'General',
        content: 'Hostel boys, ready ho jaao! Semi-finals of the Inter-Hostel Cricket Tournament today at the Main Cricket Ground! Shastri Bhawan – A vs Kalam Bhawan – C. Match 4:30 PM start hai under the floodlights. Come support your hostel team, energy bohot insane hone wali hai! Greenzy se samose leke aana cheering ke liye 🏏🏆',
        imageKey: 'kashmiri_willow_cricket_bat___tennis_ball_iblgl7',
        replies: [
          'Shastri A hi jeetega pakka! Aarav bhai is in full form, last match me 50 mara tha 🔥',
          'Abey Kalam C ke bowlers match nikal lenge, dekh lena pitch pe bro!'
        ]
      },
      {
        category: 'LostFound',
        content: 'Bhai log, mera black laptop travel backpack PPT Food Area me ghum gaya hai kal raat 8 baje ke aas-paas. Usme drawing sheets, room keys aur Casio calculator tha. Mera submission kal hi hai, scene ekdum cooked hai mera! Agar kisi ko mila ho toh please return kar do yaar, Greenzy pe mast party dunga pakka! 😭🙏',
        imageKey: 'laptop_travel_backpack_mssj5x',
        replies: [
          'Drawing sheets ghumna is nightmare level. Upvoting for visibility, hope jaldi mil jaye.',
          'PPT area me juice stall wale bhaiya se pucha? Log waha bhool jate hain aksar.'
        ]
      },
      {
        category: 'LostFound',
        content: 'Medical Canteen me lunch ke time mera boat earbuds ghum gaya. Black silicone case me tha outdoor tables ke pass. Pocket money bacha ke liya tha, bohot dukh ho rha hai yaar... Kisi ko mila ho toh please batado, reward bhi de dunga. 💔',
        imageKey: null,
        replies: [
          'Library wale official group me kisi ne earbuds ki photo daali thi, check karo jaldi!',
          'Oh really? Bahut shukriya bhai, abhi check karta hu!'
        ]
      },
      {
        category: 'Tickets',
        content: 'Mere paas Darshan Raval fan pit VIP pass pada hai purana, concert ho chuka hai. Kisi ko old passes collect karne ka shauk hai toh le lo, free me de dunga. DM karo bas 🎫',
        imageKey: 'darshan_raval_fan_pit_pass_paruluniversity_picajk',
        replies: [
          'Bhai mujhe chahiye! DM kiya hai check karo.',
          'Nice collectible hai ye, Darshan Raval ka concert lit tha!'
        ]
      },
      {
        category: 'LostFound',
        content: 'Found a Casio Classwiz fx-991EX scientific calculator on seat Row G in the Central Admin Auditorium after the morning seminar. Maine security desk pe de diya hai. Midsems next week hain toh owner ko jaldi chahiye hoga ye, please share karo guys!',
        imageKey: null,
        replies: [
          'Super work bhai! My friend was searching for this calculator everywhere, usko bolunga jaake le aaye.'
        ]
      },
      {
        category: 'Academic',
        content: 'First year engineering guys sunlo: mera clean chemistry/physics lab safety kit bech rha hu (white lab coat size L + safety goggles). Architecture Canteen me aaj 2 PM to 4 PM tak rahunga agar kisi ko lena hai toh aa jao. Sirf ₹200 me de rha hu, almost naya hai, wash karke iron kiya hua.',
        imageKey: null,
        replies: [
          'Lab coat clean hai na bhai? Lab class has strict guidelines about stains.',
          'Haan bro, ekdum spotless hai. Architecture canteen aa jao, wahi baitha hu.'
        ]
      },
      {
        category: 'Alerts',
        content: 'Kalam Bhawan – B walo dhyan do! Curfew timing (10:00 PM) ke baad strict checking hone wali hai aaj raat. Warden gusse me ghum rha hai kyuki log New Food Court se late aa rhe hain. Gate pe do security guard aur dogs khade hain checking ke liye, late mat aana nahi toh fine lagega! ⚠️',
        imageKey: null,
        replies: [
          'Warden Kalam B is always on power trip fr, daily ka scene hai ye.',
          'Thanks for the update bhai, library se jaldi nikalna padega aaj. 📚'
        ]
      },
      {
        category: 'Alerts',
        content: 'Girls alert 🚨 Sarojini Bhawan – C me surprise checking chal rhi hai floor 4 pe abhi! Guard log ke sath do security dogs bhi hain common lobby me. Apne kettles aur room heaters chupa lo sab jaldi se, strictly inspect kar rhe hain. Hair straightener bhi rakh lo dhyan se!',
        imageKey: null,
        replies: [
          'Omg, hide the straightener too! They took my friend\'s iron last time 😤',
          'Inko exam times pe hi checkings karni hoti hai, so annoying yaar!'
        ]
      },
      {
        category: 'General',
        content: 'Naya campus music band banana hai, acoustic guitar player hu main. Ek professional vocalist aur drummer chahiye. Design Building Canteen ya BBA Green Tunnel me free time me jam karenge. Serious log hi DM karo, jam session regular rakhni hai weekly. Let\'s create something amazing together! 🎵🤘',
        imageKey: null,
        replies: [
          'Vocalist here! I do pop/rock, Sarojini me rehti hu. Design canteen this Friday chalega?',
          'Cajon player here from Shastri B. Bhai let\'s make this band happen!'
        ]
      },
      {
        category: 'LostFound',
        content: 'Lost a red Honda keychain with some keys near the BBA Ground basketball court. Room keys aur scooty keys dono isme hain. Agar kisi ko mila ho toh please return kar do, bohot zaruri hai. Super worried right now 😭',
        imageKey: null,
        replies: [
          'Bhai BBA ground spectator bench ke paas around 4 PM dekha tha keys, jaake jaldi check karo!',
          'Haan abhi checking right now, thanks bro! 🙏'
        ]
      },
      {
        category: 'Housing',
        content: 'Moving out ho rha hai hostel se. Mera single bed comforter aur blue bedsheet set bechna hai, sirf 3 months use kiya hai, washed and clean hai. Kalam Bhawan – C floor 2 se pick up kar lena. DM for price, bohot sasta dunga kyuki jaldi nikalna hai.',
        imageKey: null,
        replies: [
          'Interested bhai! Kitna price hai? Need it for my Kalam room.',
          'Check your DM, price details send kar diya.'
        ]
      },
      {
        category: 'Rides',
        content: 'Daily PU Circle se Vadodara Station commute karta hu bike pe. Agar kisi ko pillion ride chahiye toh fuel cost share kar lenge, bohot pocket friendly padega. Safely drive karta hu aur spare helmet bhi hai mere paas. Regular commuters ko preference. DM karo! 🏍️',
        imageKey: null,
        replies: [
          'Hey, Saturday mornings bhi travel karta hai kya? Mere train ke liye drop chahiye.',
          'Haan bhai, Saturday 8:00 AM nikalunga. DM karo confirm karne ke liye.'
        ]
      }
    ];

    for (let i = 0; i < REALISTIC_POSTS.length; i++) {
      const postTemplate = REALISTIC_POSTS[i];
      const author = randomItem(createdUsers);
      const authorJoinTime = new Date(author.createdAt).getTime();
      const possibleStartTime = Math.max(authorJoinTime, POST_START.getTime());
      
      const postDate = randomDate(new Date(possibleStartTime), MAX_DATE);
      const expiresAt = new Date(postDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      let postImage = undefined;
      if (postTemplate.imageKey) {
        postImage = urlLookup[postTemplate.imageKey] || undefined;
      }

      boardPosts.push({
        author: author._id,
        community: puCommunity._id,
        content: postTemplate.content,
        category: postTemplate.category,
        image: postImage,
        upvotes: createdUsers.slice(0, Math.floor(Math.random() * 8)).map(u => u._id),
        replies: postTemplate.replies.map(replyContent => {
            const replyDate = randomDate(postDate, MAX_DATE);
            let replyAuthor;
            do {
              replyAuthor = randomItem(createdUsers);
            } while (replyAuthor._id.toString() === author._id.toString());

            return {
                author: replyAuthor._id,
                content: replyContent,
                createdAt: replyDate
            }
        }),
        createdAt: postDate,
        updatedAt: postDate,
        expiresAt: expiresAt
      });
    }
    await BoardPost.insertMany(boardPosts);
    console.log(`✅ Seeded ${boardPosts.length} Circle Board student threads with attached images where relevant.`);

    // 5. Create random Completed orders and matching reviews for EACH AND EVERY listing
    // This gives between 1 to 5 reviews randomly per item, ensuring no duplicates by same user
    console.log('🤝 Seeding historical transactions & unique ratings (1 to 5 reviews per listing)...');
    
    function generateProductReviewComment(title, rating, isRent) {
      const positiveRent = [
        `Rented this ${title} for my lab work and it was in great shape. Smooth return.`,
        `Really convenient rental! The owner kept the ${title} very clean and was easy to meet.`,
        `Renting this was a lifesaver for the exams. Worked perfectly, no issues.`,
        `Super smooth transaction for renting ${title}. Highly recommended student deal.`,
        `Needed this ${title} temporarily and renting was so much better than buying. Great experience.`
      ];
      const positiveBuy = [
        `Bought this ${title} and it's in mint condition as described. Clean transaction.`,
        `Met the seller near their hostel block to get this ${title}. Very polite and quick.`,
        `Great deal for the price. The ${title} works exactly as expected. Thanks!`,
        `Highly satisfied with this purchase. The ${title} is almost brand new.`,
        `Excellent campus buy. Decent price and very good condition.`
      ];
      const averageReviews = [
        `Decent condition. The ${title} had some minor scratch marks but works fine.`,
        `Okay deal. The seller was a bit late to meet but the ${title} is fine.`,
        `Fair price for this ${title}. Helpful for my semester studies.`,
        `Item is fine, has standard wear and tear. Serves the purpose.`
      ];

      if (rating >= 4) {
        return isRent ? randomItem(positiveRent) : randomItem(positiveBuy);
      } else {
        return randomItem(averageReviews);
      }
    }

    function generateServiceReviewComment(title, rating) {
      const positiveService = [
        `Highly skilled! Help with ${title} was exceptional and completed on time.`,
        `Extremely helpful session for ${title}. Guided me through all steps clearly.`,
        `Professional service for ${title}. Punctual and very cooperative.`,
        `Great experience booking this for ${title}. Saved me a lot of time.`,
        `Highly recommend their ${title} service. Very reliable and neat work.`
      ];
      const averageService = [
        `Decent work for ${title}. Handled standard requirements fine.`,
        `Okay service. Got the job done for ${title} though communication was slightly slow.`,
        `Satisfied with the ${title} help. Good value for money.`,
        `Completed the work. A bit of delay but overall fine.`
      ];

      if (rating >= 4) {
        return randomItem(positiveService);
      } else {
        return randomItem(averageService);
      }
    }

    let totalOrdersCreated = 0;
    let totalReviewsCreated = 0;

    // We process products
    for (const prod of products) {
      const potentialBuyers = createdUsers.filter(u => u._id.toString() !== prod.seller.toString());
      const maxReviewsPossible = Math.min(5, potentialBuyers.length);
      const reviewCount = Math.floor(Math.random() * maxReviewsPossible) + 1; // 1 to 5 reviews
      
      const shuffledBuyers = [...potentialBuyers].sort(() => Math.random() - 0.5);
      
      for (let r = 0; r < reviewCount; r++) {
        const buyer = shuffledBuyers[r];
        const orderDate = randomDate(new Date(prod.createdAt), MAX_DATE);
        const finalPrice = prod.price !== undefined && prod.price !== null ? prod.price : (prod.rentPrice || 100);

        const order = await Order.create({
          buyer: buyer._id,
          seller: prod.seller,
          product: prod._id,
          orderType: 'Product',
          itemPrice: finalPrice,
          totalAmount: finalPrice,
          status: 'Completed',
          createdAt: orderDate,
          updatedAt: orderDate
        });
        totalOrdersCreated++;

        const isBuyOnly = prod.forSell && !prod.forRent;
        const rating = randomItem([4, 5, 4, 5, 3]);
        const comment = generateProductReviewComment(prod.title, rating, !isBuyOnly);

        await Review.create({
          reviewer: buyer._id,
          target: prod.seller,
          order: order._id,
          product: isBuyOnly ? undefined : prod._id,
          rating,
          comment,
          createdAt: randomDate(orderDate, MAX_DATE)
        });
        totalReviewsCreated++;
      }
    }

    // We process services
    for (const serv of services) {
      const potentialBuyers = createdUsers.filter(u => u._id.toString() !== serv.provider.toString());
      const maxReviewsPossible = Math.min(5, potentialBuyers.length);
      const reviewCount = Math.floor(Math.random() * maxReviewsPossible) + 1; // 1 to 5 reviews
      
      const shuffledBuyers = [...potentialBuyers].sort(() => Math.random() - 0.5);
      
      for (let r = 0; r < reviewCount; r++) {
        const buyer = shuffledBuyers[r];
        const orderDate = randomDate(new Date(serv.createdAt), MAX_DATE);
        
        const order = await Order.create({
          buyer: buyer._id,
          seller: serv.provider,
          service: serv._id,
          orderType: 'Service_Appointment',
          itemPrice: serv.price,
          totalAmount: serv.price,
          status: 'Completed',
          createdAt: orderDate,
          updatedAt: orderDate
        });
        totalOrdersCreated++;

        const rating = randomItem([4, 5, 4, 5, 3]);
        const comment = generateServiceReviewComment(serv.title, rating);

        await Review.create({
          reviewer: buyer._id,
          target: serv.provider,
          order: order._id,
          service: serv._id,
          rating,
          comment,
          createdAt: randomDate(orderDate, MAX_DATE)
        });
        totalReviewsCreated++;
      }
    }

    console.log(`✅ Seeded ${totalOrdersCreated} Completed Orders and ${totalReviewsCreated} Ratings/Reviews.`);
    console.log('\n⭐ DATABASE SEEDING PROCESS COMPLETED FOR CURRENT URI ⭐');
  } catch (err) {
    console.error('❌ SEEDING PROCESS FAILED:', err);
    throw err;
  }
}

async function fetchCloudinaryImages() {
  console.log('☁ Connecting to Cloudinary folder "recircle/dummy-data"...');
  try {
    const result = await cloudinary.search
      .expression('folder:recircle/dummy-data')
      .max_results(100)
      .execute();
    if (result && result.resources && result.resources.length > 0) {
      console.log(`✅ Loaded ${result.resources.length} images from Cloudinary.`);
      return result.resources.map(r => ({
        public_id: r.public_id.split('/').pop(),
        secure_url: r.secure_url
      }));
    }
  } catch (err) {
    console.warn('⚠️ Cloudinary Search API rejected/failed. Falling back to robust offline URLs.', err.message);
  }
  return [];
}

async function seed() {
  const URIs = [
    'mongodb://127.0.0.1:27017/recircle',
    '***REDACTED_MONGODB_URI***'
  ];
  for (const uri of URIs) {
    try {
      console.log('\n======================================');
      console.log('🚀 Connecting to MongoDB:', uri);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ Connected.');
      await runSeedingProcess();
      await mongoose.disconnect();
      console.log('🔌 Disconnected from', uri);
    } catch (err) {
      console.error(`❌ Seeding failed for ${uri}:`, err.message);
      try {
        await mongoose.disconnect();
      } catch (e) {}
    }
  }
  process.exit(0);
}

seed();
