try {
  require('dns').setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {}
const mongoose = require('mongoose');

// Support loading env variables from .env.local
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recircle';

// Basic Schema declarations to avoid import compilation issues
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ email: String }));
const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({ seller: mongoose.Schema.Types.ObjectId }));
const Service = mongoose.models.Service || mongoose.model('Service', new mongoose.Schema({ provider: mongoose.Schema.Types.ObjectId }));
const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({ buyer: mongoose.Schema.Types.ObjectId, seller: mongoose.Schema.Types.ObjectId }));
const Review = mongoose.models.Review || mongoose.model('Review', new mongoose.Schema({ reviewer: mongoose.Schema.Types.ObjectId, target: mongoose.Schema.Types.ObjectId }));
const BoardPost = mongoose.models.BoardPost || mongoose.model('BoardPost', new mongoose.Schema({ author: mongoose.Schema.Types.ObjectId }));
const Community = mongoose.models.Community || mongoose.model('Community', new mongoose.Schema({ name: String }));

async function main() {
  try {
    console.log('🧹 Connecting to MongoDB to wipe seeded dummy campus data...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected.');

    // 1. Locate all seeded accounts via email suffix
    const dummyUsers = await User.find({ email: /@paruluniversity\.ac\.in$/ });
    const dummyUserIds = dummyUsers.map(u => u._id);
    console.log(`🔍 Found ${dummyUserIds.length} seeded student accounts.`);

    if (dummyUserIds.length > 0) {
      // 2. Perform deep relational cleanup
      const deletedProducts = await Product.deleteMany({ seller: { $in: dummyUserIds } });
      const deletedServices = await Service.deleteMany({ provider: { $in: dummyUserIds } });
      const deletedOrders = await Order.deleteMany({ 
        $or: [
          { buyer: { $in: dummyUserIds } }, 
          { seller: { $in: dummyUserIds } }
        ] 
      });
      const deletedReviews = await Review.deleteMany({ 
        $or: [
          { reviewer: { $in: dummyUserIds } }, 
          { target: { $in: dummyUserIds } }
        ] 
      });
      const deletedPosts = await BoardPost.deleteMany({ author: { $in: dummyUserIds } });
      const deletedUsers = await User.deleteMany({ _id: { $in: dummyUserIds } });

      console.log(`🗑️ Deleted ${deletedProducts.deletedCount} products.`);
      console.log(`🗑️ Deleted ${deletedServices.deletedCount} services.`);
      console.log(`🗑️ Deleted ${deletedOrders.deletedCount} orders.`);
      console.log(`🗑️ Deleted ${deletedReviews.deletedCount} reviews.`);
      console.log(`🗑️ Deleted ${deletedPosts.deletedCount} board posts.`);
      console.log(`🗑️ Deleted ${deletedUsers.deletedCount} student accounts.`);
    }

    // 3. Clear the community circle itself
    const deletedComm = await Community.deleteMany({ name: 'Parul University' });
    console.log(`🗑️ Deleted Parul University community circle.`);

    console.log('\n⭐ ALL DUMMY SEED DATA HAS BEEN CLEANSED FROM THE DATABASE ⭐');
    process.exit(0);
  } catch (err) {
    console.error('❌ SEED CLEANUP FAILED:', err);
    process.exit(1);
  }
}

main();
