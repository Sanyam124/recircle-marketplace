const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env or .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define MONGODB_URI in .env.local');
  process.exit(1);
}

// Define minimal schemas for migration
const ProductSchema = new mongoose.Schema({ visibility: String }, { strict: false });
const ServiceSchema = new mongoose.Schema({ visibility: String }, { strict: false });

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
    const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);

    // Update Products
    const pResult = await Product.updateMany(
      { visibility: { $exists: false } },
      { $set: { visibility: 'Public' } }
    );
    console.log(`Updated ${pResult.modifiedCount} products with Public visibility.`);

    // Update Services
    const sResult = await Service.updateMany(
      { visibility: { $exists: false } },
      { $set: { visibility: 'Public' } }
    );
    console.log(`Updated ${sResult.modifiedCount} services with Public visibility.`);

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
