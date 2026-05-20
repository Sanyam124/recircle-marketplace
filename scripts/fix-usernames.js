const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixUsernames() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Connected!');

        const users = await User.find({});
        let updated = 0;
        for (const u of users) {
            if (u.username && u.username.length > 20) {
                console.log(`Fixing username: ${u.username}`);
                let base = u.username.replace(/[^a-z0-9_.]/gi, '_').substring(0, 16);
                let newUsername = base;
                let suffix = 1;
                while (await User.findOne({ username: newUsername, _id: { $ne: u._id } })) {
                    newUsername = base + suffix;
                    suffix++;
                }
                u.username = newUsername;
                await u.save({ validateBeforeSave: false });
                updated++;
            }
        }
        console.log(`✅ Updated ${updated} users with long usernames.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixUsernames();
