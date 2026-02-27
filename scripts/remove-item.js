const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function removeProduct() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const result = await Product.deleteOne({ title: 'Casio FX-991EX Scientific Calculator' });
    
    if (result.deletedCount > 0) {
        console.log('Successfully removed: Casio FX-991EX Scientific Calculator');
    } else {
        console.log('Product not found.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeProduct();
