const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function assignRole() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    const role = process.argv[3] || 'delivery_partner';

    if (!email) {
      console.log('Usage: node assign-role.js <email> [role]');
      process.exit(1);
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.error('User not found!');
      process.exit(1);
    }

    user.role = role;
    await user.save();

    console.log(`Success! User ${email} is now a ${role}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

assignRole();
