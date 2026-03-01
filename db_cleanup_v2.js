const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/recircle';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        const users = db.collection('users');

        // Check how many have googleId field at all
        const existsCount = await users.countDocuments({ googleId: { $exists: true } });
        console.log(`Users with googleId field existing (any value): ${existsCount}`);

        // Find users with googleId field and its value
        const withField = await users.find({ googleId: { $exists: true } }).toArray();
        console.log('Users with googleId field details:', JSON.stringify(withField, null, 2));

        if (existsCount > 0) {
            console.log('Cleaning up remaining googleId fields that might be null...');
            const result = await users.updateMany(
                { googleId: null },
                { $unset: { googleId: "" } }
            );
            console.log(`Updated ${result.modifiedCount} documents.`);
        }

    } catch (err) {
        console.error('Cleanup Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
