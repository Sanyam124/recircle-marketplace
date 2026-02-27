const mongoose = require('mongoose');

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/recircle'); // Assuming standard local DB, or let's use the DB URI from .env
    const db = mongoose.connection.db;
    try {
        const collections = await db.listCollections().toArray();
        const hasReports = collections.some(c => c.name === 'reports');
        if (hasReports) {
            console.log('Dropping reports collection to clear old schema/indexes...');
            await db.collection('reports').drop();
            console.log('Reports collection dropped successfully.');
        } else {
            console.log('No reports collection found.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
