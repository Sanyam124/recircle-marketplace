const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

// Define Schemas exactly as in src/models to match app behavior
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  gender: String
});

const ProductSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function testPopulate() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const product = await Product.findOne().populate('seller', 'name gender');
    
    console.log('Populated Product Seller:');
    if (product && product.seller) {
        console.log(`Name: ${product.seller.name}`);
        console.log(`Gender: ${product.seller.gender}`);
    } else {
        console.log('No product found or seller missing');
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

testPopulate();
