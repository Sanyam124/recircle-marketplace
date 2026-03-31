
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  process.exit(1);
}

const ServiceSchema = new mongoose.Schema({
  availability: String
}, { collection: 'services' });

const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Update existing ones to "Flexible" instead of the custom string
    const result = await Service.updateMany(
      { 
        $or: [ 
          { availability: { $exists: false } }, 
          { availability: "" }, 
          { availability: null },
          { availability: "Mon - Fri (Coordination via Chat)" } // Also fix the previous one if it was set
        ] 
      },
      { $set: { availability: 'Flexible' } }
    );

    console.log(`Updated ${result.modifiedCount} services to "Flexible" availability.`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
