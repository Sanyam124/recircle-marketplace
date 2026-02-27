const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recircle';

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  gender: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function verify() {
  try {
    await mongoose.connect(MONGODB_URI);
    const users = await User.find({}, 'name email gender');
    console.log('Users in DB:');
    users.forEach(u => console.log(`${u.name} (${u.email}): ${u.gender}`));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

verify();
