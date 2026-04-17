
import '@/lib/db';
import Notification from '@/models/Notification';
import connectToDatabase from '@/lib/db';

async function run() {
    await connectToDatabase();
    const res = await Notification.deleteMany({});
    console.log(`DELETED ${res.deletedCount} NOTIFICATIONS`);
    process.exit(0);
}

run();
