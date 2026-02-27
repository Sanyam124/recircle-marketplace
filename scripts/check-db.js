const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

async function checkResources() {
  await mongoose.connect(MONGODB_URI);
  
  const Service = mongoose.connection.collection('services');
  const Product = mongoose.connection.collection('products');
  const Order = mongoose.connection.collection('orders');

  const services = await Service.find({}).toArray();
  const products = await Product.find({}).toArray();
  const orders = await Order.find({}).toArray();

  console.log('\n--- SERVICES ---');
  services.forEach(s => {
      console.log(`- Title: ${s.title}`);
      console.log(`  ID: ${s._id}`);
      console.log(`  Images: ${JSON.stringify(s.images)}`);
  });

  console.log('\n--- BOUGHT SERVICES IN ORDERS ---');
  orders.filter(o => o.service).forEach(o => {
      console.log(`- Order ID: ${o._id}`);
      console.log(`  Service ID: ${o.service}`);
      console.log(`  Buyer: ${o.buyer}`);
  });

  process.exit(0);
}

checkResources();
