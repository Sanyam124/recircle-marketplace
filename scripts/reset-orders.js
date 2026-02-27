const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

const orderSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    status: String
});
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

const productSchema = new mongoose.Schema({
    status: String
});
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
    role: String,
    walletBalance: Number
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function resetData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find all orders to get the Product IDs
        const orders = await Order.find({});
        const productIds = orders.map(o => o.product).filter(id => id);

        if (orders.length > 0) {
            console.log(`Found ${orders.length} orders. Resetting associated products...`);
            
            // 2. Reset Products to 'Available'
            const result = await Product.updateMany(
                { _id: { $in: productIds } },
                { $set: { status: 'Available' } }
            );
            console.log(`Updated ${result.modifiedCount} products to 'Available'.`);

            // 3. Delete All Orders
            const deleteResult = await Order.deleteMany({});
            console.log(`Deleted ${deleteResult.deletedCount} orders.`);
        } else {
            console.log('No active orders found (already cleared).');
        }

        // 4. Reset Delivery Partner Wallets
        const walletResult = await User.updateMany(
            { role: 'delivery_partner' },
            { $set: { walletBalance: 0 } }
        );
        console.log(`Reset wallet balance for ${walletResult.modifiedCount} delivery partners.`);
        
        // 5. Reset Seller Wallets (Optional, but good for clean slate if requested 'remove transactions')
        // const sellerResult = await User.updateMany(
        //    { role: 'student' }, // Assuming sellers are students? Or check if they have products? 
        //    // Safer not to unless asked explicitly. User said 'delivery partner'.
        // );

        console.log('Done! System reset for testing.');

    } catch (error) {
        console.error('Error resetting data:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

resetData();
