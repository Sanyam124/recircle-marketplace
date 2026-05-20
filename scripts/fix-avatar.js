const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://127.0.0.1:27017/recircle';

const oldUrl = 'https://res.cloudinary.com/dq3sl82at/image/upload/v1775879779/recircle/defaults/avatars/tgl886mu6da8jute1kiw.webp';
const newUrl = 'https://res.cloudinary.com/dq3sl82at/image/upload/q_auto/f_auto/v1779185337/Copilot_20260411_092250_wl7rnn.png';

async function fix() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Update Users
    const userRes = await db.collection('users').updateMany(
        { profilePicture: oldUrl },
        { $set: { profilePicture: newUrl } }
    );
    console.log(`Updated ${userRes.modifiedCount} users.`);

    // Update SiteSettings
    const settings = await db.collection('sitesettings').findOne({});
    if (settings && settings.defaultAvatars) {
        const avatars = settings.defaultAvatars.map(url => url === oldUrl ? newUrl : url);
        await db.collection('sitesettings').updateOne(
            { _id: settings._id },
            { $set: { defaultAvatars: avatars } }
        );
        console.log('Updated SiteSettings default avatars.');
    }
    
    await mongoose.disconnect();
}

fix().catch(console.error);
