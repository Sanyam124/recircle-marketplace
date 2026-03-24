const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function patch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Define Schemas
        const Community = mongoose.models.Community || mongoose.model('Community', new mongoose.Schema({ 
            name: String, 
            emailDomains: [String] 
        }));
        
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
            email: String,
            verifiedCommunities: [mongoose.Schema.Types.ObjectId]
        }));
        
        const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({ 
            seller: mongoose.Schema.Types.ObjectId, 
            community: mongoose.Schema.Types.ObjectId 
        }));
        
        const Service = mongoose.models.Service || mongoose.model('Service', new mongoose.Schema({ 
            provider: mongoose.Schema.Types.ObjectId, 
            community: mongoose.Schema.Types.ObjectId 
        }));

        const pu = await Community.findOne({ name: 'Parul University' });
        if (!pu) {
            console.error('❌ Parul University Community not found in DB');
            process.exit(1);
        }

        const parulUsers = await User.find({ email: /@paruluniversity\.ac\.in/i });
        console.log(`Found ${parulUsers.length} users from Parul University`);

        for (const user of parulUsers) {
            // Add community to user if not already there
            if (!user.verifiedCommunities.some(id => id.equals(pu._id))) {
                user.verifiedCommunities.push(pu._id);
                await user.save();
                console.log(`Updated user: ${user.email}`);
            }

            // Patch their products
            const pResult = await Product.updateMany(
                { seller: user._id, community: { $exists: false } }, 
                { community: pu._id }
            );
            console.log(`Patched ${pResult.modifiedCount} products for ${user.email}`);

            // Patch their services
            const sResult = await Service.updateMany(
                { provider: user._id, community: { $exists: false } }, 
                { community: pu._id }
            );
            console.log(`Patched ${sResult.modifiedCount} services for ${user.email}`);
        }

        console.log('✅ Final Patch Complete!');
        process.exit(0);

    } catch (err) {
        console.error('Patch failed:', err);
        process.exit(1);
    }
}

patch();
