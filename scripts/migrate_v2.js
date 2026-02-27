const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env.local');
    process.exit(1);
}

// Minimal User Schema for Migration
const UserSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true, sparse: true },
    email: String,
    gender: { type: String, default: 'none' },
    role: { type: String, default: 'user' }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ $or: [{ username: { $exists: false } }, { username: '' }, { gender: { $exists: false } }] });
        console.log(`Found ${users.length} users to migrate.`);

        for (const user of users) {
            let updated = false;

            // 1. Assign Username if missing
            if (!user.username) {
                let baseUsername = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                let finalUsername = baseUsername;
                let counter = 1;

                // Check for uniqueness
                while (await User.findOne({ username: finalUsername, _id: { $ne: user._id } })) {
                    finalUsername = `${baseUsername}${counter}`;
                    counter++;
                }

                user.username = finalUsername;
                updated = true;
                console.log(`Assigned username @${finalUsername} to ${user.email}`);
            }

            // 2. Assign default gender if missing
            if (!user.gender) {
                user.gender = 'none';
                updated = true;
            }

            // 3. Remove delivery_partner role if exists (mapped to student or user)
            if (user.role === 'delivery_partner') {
                user.role = 'user';
                updated = true;
                console.log(`Reassigned role for ${user.email} from delivery_partner to user`);
            }

            if (updated) {
                await user.save();
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
