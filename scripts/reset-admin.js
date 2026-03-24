const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function resetAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
            email: String, 
            password: { type: String, select: false },
            role: String,
            name: String,
            isVerified: Boolean
        }));

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);

        const result = await User.updateOne(
            { email: 'admin@recircle.com' },
            { 
                $set: { 
                    password: hash,
                    role: 'admin',
                    isVerified: true
                } 
            },
            { upsert: true }
        );

        console.log('✅ Admin Password Reset to: admin123');
        console.log('Result:', result);
        process.exit(0);
    } catch (err) {
        console.error('Reset failed:', err);
        process.exit(1);
    }
}

resetAdmin();
