const mongoose = require('mongoose');

// URI from .env.local
const MONGODB_URI = 'mongodb://localhost:27017/recircle';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        const users = db.collection('users');

        // Remove googleId field where it is null
        const result = await users.updateMany(
            { googleId: null },
            { $unset: { googleId: "" } }
        );

        console.log(`Matched ${result.matchedCount} documents and updated ${result.modifiedCount} documents.`);
        
        // Final check
        const remainingNulls = await users.countDocuments({ googleId: null });
        console.log(`Remaining documents with googleId: null: ${remainingNulls}`);

    } catch (err) {
        console.error('Cleanup Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
