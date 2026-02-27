const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function listIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        for (const col of collections) {
            const indexes = await mongoose.connection.db.collection(col.name).indexes();
            console.log(`Indexes for ${col.name}:`, JSON.stringify(indexes, null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
listIndexes();
