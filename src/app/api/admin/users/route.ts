import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import BoardPost from '@/models/BoardPost';
import Order from '@/models/Order';
import Review from '@/models/Review';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import Report from '@/models/Report';
import VerificationRequest from '@/models/VerificationRequest';
import Offer from '@/models/Offer';
import { verifyToken } from '@/lib/auth';

// Helper to check if user is admin
async function isAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;
    const decoded = verifyToken(token);
    if (!decoded) return false;

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user?.role === 'admin';
}

export async function GET(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        await connectToDatabase();

        const query: any = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(query)
            .select('-password -otp -otpExpiry')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Batch-count listings per user
        const userIds = users.map((u: any) => u._id);

        const [productCounts, serviceCounts] = await Promise.all([
            Product.aggregate([
                { $match: { seller: { $in: userIds } } },
                { $group: { _id: '$seller', count: { $sum: 1 } } }
            ]),
            Service.aggregate([
                { $match: { provider: { $in: userIds } } },
                { $group: { _id: '$provider', count: { $sum: 1 } } }
            ])
        ]);

        const pMap = Object.fromEntries(productCounts.map((p: any) => [p._id.toString(), p.count]));
        const sMap = Object.fromEntries(serviceCounts.map((s: any) => [s._id.toString(), s.count]));

        const usersWithCounts = users.map((u: any) => ({
            ...u,
            productCount: pMap[u._id.toString()] || 0,
            serviceCount: sMap[u._id.toString()] || 0,
        }));

        return NextResponse.json({
            users: usersWithCounts,
            pagination: { currentPage: page, totalPages, totalUsers, hasMore: page < totalPages }
        }, { status: 200 });

    } catch (error) {
        console.error('Admin Users Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, role, communityId } = await req.json();

        // Valid roles verification
        const validRoles = ['user', 'student', 'faculty', 'admin', 'verifier'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        await connectToDatabase();
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        user.role = role;

        // If promoting to verifier and a community is provided, ensure it's the primary verified community
        if (role === 'verifier' && communityId) {
            const index = user.verifiedCommunities.findIndex((id: any) => id.toString() === communityId.toString());
            if (index > -1) {
                // Move existing community to front
                const [comm] = user.verifiedCommunities.splice(index, 1);
                user.verifiedCommunities.unshift(comm);
            } else {
                // Add as primary community
                user.verifiedCommunities.unshift(communityId);
            }
            user.isVerified = true;
        }

        await user.save();

        return NextResponse.json({ success: true, user }, { status: 200 });

    } catch (error) {
        console.error('Admin User Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Ban a user directly from the user list
export async function PATCH(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, banDays, sendEmail } = await req.json();
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        await connectToDatabase();
        const user = await User.findById(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const days = parseInt(banDays) || 7;
        const bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        user.status = 'Banned';
        user.bannedUntil = bannedUntil;
        await user.save();

        // Optionally send email
        if (sendEmail && user.email) {
            try {
                const { sendBanNotification } = await import('@/lib/mailer');
                await sendBanNotification({
                    to: user.email,
                    userName: user.name,
                    reason: 'Violation of community guidelines',
                    banDays: days,
                    banExpiry: bannedUntil
                });
            } catch (emailErr) {
                console.error('Ban email failed (non-blocking):', emailErr);
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Admin Ban User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Delete a user and all their content
export async function DELETE(req: NextRequest) {
    try {
        if (!(await isAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        await connectToDatabase();
        const user = await User.findById(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // 0. Permanent Blacklist: Prevent them from ever re-registering
        try {
            const Blacklist = (await import('@/models/Blacklist')).default;
            await Blacklist.create({
                email: user.email,
                username: user.username,
                reason: 'Account deleted by administrator due to guideline violations'
            });
        } catch (e) { 
            // In case they are already blacklisted, we just continue
            console.log('User already blacklisted or duplicate found during erasure.');
        }

        // Step 1: Collect ALL targets for Cloudinary cleanup BEFORE database deletion
        const productsFetched = await Product.find({ seller: userId }).select('images');
        const servicesFetched = await Service.find({ provider: userId }).select('images');
        
        const imagesToDelete: string[] = [];
        if (user.profilePicture) imagesToDelete.push(user.profilePicture);
        productsFetched.forEach(p => p.images?.forEach((img: string) => imagesToDelete.push(img)));
        servicesFetched.forEach(s => s.images?.forEach((img: string) => imagesToDelete.push(img)));

        // Step 2: Perform Shared Records Lifecycle Checks (Orders/Messages)
        // Only delete if the OTHER participant is also gone
        const [privateOrders, privateMessages] = await Promise.all([
            Order.find({ $or: [{ buyer: userId }, { seller: userId }] }).lean(),
            Message.find({ $or: [{ sender: userId }, { recipient: userId }] }).lean()
        ]);

        const sharedRecordsToDelete = {
            orders: [] as any[],
            messages: [] as any[]
        };

        await Promise.all([
            ...privateOrders.map(async (order: any) => {
                const otherPartyId = order.buyer.toString() === userId.toString() ? order.seller : order.buyer;
                const otherExists = await User.exists({ _id: otherPartyId });
                if (!otherExists) sharedRecordsToDelete.orders.push(order._id);
            }),
            ...privateMessages.map(async (msg: any) => {
                const recipientId = msg.sender.toString() === userId.toString() ? msg.recipient : msg.sender;
                const otherExists = await User.exists({ _id: recipientId });
                if (!otherExists) sharedRecordsToDelete.messages.push(msg._id);
            })
        ]);

        // Step 3: Perform ALL Database Deletions (DB FIRST)
        const dbOperations = [
            Product.deleteMany({ seller: userId }),
            Service.deleteMany({ provider: userId }),
            BoardPost.deleteMany({ author: userId }),
            Offer.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] }),
            Review.deleteMany({ reviewer: userId }), // Remove reviews they WROTE
            Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
            Report.deleteMany({ $or: [{ reporter: userId }, { targetUser: userId }] }),
            VerificationRequest.deleteMany({ user: userId }),
            User.findByIdAndDelete(userId)
        ];

        if (sharedRecordsToDelete.orders.length > 0) {
            dbOperations.push(Order.deleteMany({ _id: { $in: sharedRecordsToDelete.orders } }) as any);
        }
        if (sharedRecordsToDelete.messages.length > 0) {
            dbOperations.push(Message.deleteMany({ _id: { $in: sharedRecordsToDelete.messages } }) as any);
        }

        await Promise.all(dbOperations);

        // Step 3: Global Board Post Cleanup (Pulling references)
        try {
            await BoardPost.updateMany(
                { 'replies.author': userId },
                { $pull: { replies: { author: userId } } }
            );
            await BoardPost.updateMany(
                { upvotes: userId },
                { $pull: { upvotes: userId } }
            );
        } catch (e) {}

        // Step 4: Trigger Cloudinary Cleanup AFTER successful DB removal
        if (imagesToDelete.length > 0) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                // Use Promise.all with catch to ensure we attempt to delete all images even if some fail
                await Promise.all(imagesToDelete.map(img => deleteFromCloudinary(img).catch(() => null)));
            } catch (e) {
                console.error('Admin deletion Cloudinary cleanup failed:', e);
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Admin Delete User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
