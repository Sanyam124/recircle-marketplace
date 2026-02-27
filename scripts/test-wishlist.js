const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

const ProductSchema = new mongoose.Schema({
  title: String
});

// Force refresh models if needed
if (mongoose.models.User) delete mongoose.models.User;
if (mongoose.models.Product) delete mongoose.models.Product;

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);

async function testWishlist() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Pick a user and product
    const user = await User.findOne();
    const product = await Product.findOne();

    if (!user || !product) {
        console.log('Missing user or product');
        process.exit(1);
    }

    console.log(`Testing with User: ${user.name}`);
    console.log(`Testing with Product: ${product.title}`);

    // 1. Add to wishlist
    console.log('Adding to wishlist...');
    if (!user.wishlist.includes(product._id)) {
        user.wishlist.push(product._id);
        await user.save();
    }
    console.log('Saved. Wishlist length:', user.wishlist.length);

    // 2. Verify persistence
    const updatedUser = await User.findById(user._id);
    const hasItem = updatedUser.wishlist.some(id => id.toString() === product._id.toString());
    console.log('Item persisted?', hasItem);

    // 3. Remove from wishlist (Cleanup)
    console.log('Removing from wishlist...');
    updatedUser.wishlist = updatedUser.wishlist.filter(id => id.toString() !== product._id.toString());
    await updatedUser.save();
    console.log('Removed. Wishlist length:', updatedUser.wishlist.length);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

testWishlist();
