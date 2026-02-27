const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  gender: String
});

const ReviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comment: String,
  rating: Number
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

async function testReviewPopulate() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Find a review
    const reviews = await Review.find().populate('reviewer', 'name gender').limit(5);
    
    console.log(`Found ${reviews.length} reviews`);
    
    reviews.forEach((r, i) => {
        console.log(`Review ${i+1}:`);
        if (r.reviewer) {
            console.log(`  Reviewer: ${r.reviewer.name}`);
            console.log(`  Gender: ${r.reviewer.gender}`);
        } else {
            console.log('  Reviewer not populated (null)');
        }
    });
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

testReviewPopulate();
