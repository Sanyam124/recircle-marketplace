const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

async function checkLastOrder() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const lastOrder = await Order.findOne().sort({ createdAt: -1 });

    if (!lastOrder) {
      console.log('No orders found.');
    } else {
      console.log('Last Order Details:');
      console.log('ID:', lastOrder._id);
      console.log('Status:', lastOrder.status);
      console.log('Razorpay Order ID:', lastOrder.razorpayOrderId); 
      console.log('Delivery Fee:', lastOrder.deliveryFee);
      console.log('Full Doc:', lastOrder);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLastOrder();
