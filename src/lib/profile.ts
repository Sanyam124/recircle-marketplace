import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import Order from '@/models/Order';
import VerificationRequest from '@/models/VerificationRequest';
import BoardPost from '@/models/BoardPost';
import Report from '@/models/Report';

/**
 * Validates profile update fields
 */
export function validateProfileUpdate(body: any) {
    const { name, username, bio, address } = body;
    const errors: string[] = [];

    if (name !== undefined) {
        const trimmedName = name.trim();
        if (trimmedName && (trimmedName.length < 3 || trimmedName.length > 30)) {
            errors.push('Name must be between 3 and 30 characters');
        }
    }

    if (username !== undefined) {
        const newUsername = username.trim().toLowerCase();
        if (newUsername && newUsername.length > 20) {
            errors.push('Username must be 20 characters or less');
        }
    }

    if (address !== undefined && address.length > 150) {
        errors.push('Address must be 150 characters or less');
    }

    if (bio !== undefined && bio.length > 500) {
        errors.push('Bio must be 500 characters or less');
    }

    return errors;
}

/**
 * Handles complex account deletion logic including garbage collection and mutual abandonment cleanup
 */
export async function performAccountDeletion(userId: string) {
    const userObj = await User.findById(userId).select('+password authProvider profilePicture bannerImage');
    if (!userObj) throw new Error('User not found');

    // 1. Transactional check
    const activeOrders = await Order.findOne({
        $or: [{ buyer: userId }, { seller: userId }],
        status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] }
    });
    if (activeOrders) throw new Error('Active orders block deletion');

    // 2. Identify pending reports
    const pendingReportsAgainstUser = await Report.countDocuments({ targetUser: userId, status: 'Pending' });

    // 3. Identify images for cleanup
    const [userProducts, userServices] = await Promise.all([
        Product.find({ seller: userId }).select('images'),
        Service.find({ provider: userId }).select('images')
    ]);

    const imagesToDelete: string[] = [];
    if (userObj.profilePicture) imagesToDelete.push(userObj.profilePicture);
    if (userObj.bannerImage) imagesToDelete.push(userObj.bannerImage);
    userProducts.forEach(p => p.images?.forEach((img: string) => imagesToDelete.push(img)));
    userServices.forEach(s => s.images?.forEach((img: string) => imagesToDelete.push(img)));

    // 4. Parallel Delete Operations
    const dbOperations: Promise<any>[] = [
        Product.deleteMany({ seller: userId }),
        Service.deleteMany({ provider: userId }),
        BoardPost.deleteMany({ author: userId }),
        Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
        VerificationRequest.deleteMany({ user: userId }),
        Review.deleteMany({ reviewer: userId }), 
        Report.deleteMany({ reporter: userId })
    ];

    if (pendingReportsAgainstUser > 0) {
        dbOperations.push(User.findByIdAndUpdate(userId, {
            $set: { status: 'Banned', isVerified: false, profilePicture: '', bio: 'Account deactivated under review.' }
        }));
    } else {
        dbOperations.push(User.findByIdAndDelete(userId));
        dbOperations.push(Report.deleteMany({ $or: [{ reporter: userId }, { targetUser: userId }] }));
    }

    await Promise.all(dbOperations);

    // 5. Cloudinary Cleanup
    if (imagesToDelete.length > 0) {
        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
        await Promise.all(imagesToDelete.map(img => deleteFromCloudinary(img).catch(() => null)));
    }

    return true;
}
