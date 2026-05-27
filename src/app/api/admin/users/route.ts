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
async function isAdminCheck(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return { status: false };
    const decoded = verifyToken(token) as any;
    if (!decoded) return { status: false };

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin') return { status: false };
    
    return { status: true, currentUserId: decoded.userId };
}

export async function GET(req: NextRequest) {
    try {
        if (!(await isAdminCheck(req)).status) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const requestedLimit = parseInt(searchParams.get('limit') || '20');
        const limit = Math.min(requestedLimit, 50);
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

        const [productCounts, serviceCounts, reportCounts] = await Promise.all([
            Product.aggregate([
                { $match: { seller: { $in: userIds } } },
                { $group: { _id: '$seller', count: { $sum: 1 } } }
            ]),
            Service.aggregate([
                { $match: { provider: { $in: userIds } } },
                { $group: { _id: '$provider', count: { $sum: 1 } } }
            ]),
            Report.aggregate([
                { $match: { targetUser: { $in: userIds }, status: { $in: ['Pending', 'Reviewed'] } } },
                { $group: { _id: { target: '$targetUser', reporter: '$reporter' } } },
                { $group: { _id: '$_id.target', count: { $sum: 1 } } }
            ])
        ]);

        const pMap = Object.fromEntries(productCounts.map((p: any) => [p._id.toString(), p.count]));
        const sMap = Object.fromEntries(serviceCounts.map((s: any) => [s._id.toString(), s.count]));
        const rMap = Object.fromEntries(reportCounts.map((r: any) => [r._id.toString(), r.count]));

        const usersWithCounts = users.map((u: any) => ({
            ...u,
            productCount: pMap[u._id.toString()] || 0,
            serviceCount: sMap[u._id.toString()] || 0,
            reportCount: rMap[u._id.toString()] || 0,
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
        const adminCheck = await isAdminCheck(req);
        if (!adminCheck.status) {
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

        // --- ADMIN SELF-PROTECTION ---
        if (userId === adminCheck.currentUserId && role !== 'admin') {
            return NextResponse.json({ error: 'You cannot demote yourself. Another admin must perform this action.' }, { status: 403 });
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
        const adminCheck = await isAdminCheck(req);
        if (!adminCheck.status) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, banDays, sendEmail, action } = await req.json();
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        await connectToDatabase();
        const user = await User.findById(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // --- ADMIN PROTECTION ---
        if (userId === adminCheck.currentUserId) {
            return NextResponse.json({ error: 'You cannot ban yourself' }, { status: 403 });
        }
        if (user.role === 'admin') {
            return NextResponse.json({ error: 'You cannot ban another administrator' }, { status: 403 });
        }

        // UNBAN LOGIC
        if (action === 'unban') {
            user.status = 'Active'; 
            user.bannedUntil = null as any; 
            await user.save();
            return NextResponse.json({ success: true }, { status: 200 });
        }

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
        const adminCheck = await isAdminCheck(req);
        if (!adminCheck.status) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        await connectToDatabase();
        const user = await User.findById(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // --- ADMIN PROTECTION ---
        if (userId === adminCheck.currentUserId) {
            return NextResponse.json({ error: 'You cannot delete yourself. Self-erasure must be initiated from the profile settings.' }, { status: 403 });
        }
        if (user.role === 'admin') {
            return NextResponse.json({ error: 'You cannot delete another administrator account' }, { status: 403 });
        }

        // --- TRANSACTIONAL SAFETY GUARD ---
        // Block deletion if there are active, unfulfilled orders to prevent "ghost trades"
        const Order = (await import('@/models/Order')).default;
        const activeOrders = await Order.findOne({
            $or: [{ buyer: userId }, { seller: userId }],
            status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] }
        });

        if (activeOrders) {
            return NextResponse.json({ 
                error: 'Deletion Blocked: This user has active, unfulfilled trades (Orders) currently in progress. Please ensure these orders are completed, cancelled, or disputed before purging the account to protect the other party.' 
            }, { status: 400 });
        }

        // 0. Permanent Blacklist
        try {
            const Blacklist = (await import('@/models/Blacklist')).default;
            await Blacklist.create({
                email: user.email,
                username: user.username,
                reason: 'Account deleted by administrator'
            });
        } catch (e) { }

        // Step 1: Collect targets
        const [productsFetched, servicesFetched, postsFetched, messagesFetched] = await Promise.all([
            Product.find({ seller: userId }).select('images'),
            Service.find({ provider: userId }).select('images'),
            BoardPost.find({ author: userId, image: { $exists: true, $ne: null } }).select('image'),
            Message.find({ sender: userId, image: { $exists: true, $ne: null } }).select('image')
        ]);
        
        const imagesToDelete: string[] = [];
        if (user.profilePicture) imagesToDelete.push(user.profilePicture);
        if (user.bannerImage) imagesToDelete.push(user.bannerImage);
        productsFetched.forEach(p => p.images?.forEach((img: string) => imagesToDelete.push(img)));
        servicesFetched.forEach(s => s.images?.forEach((img: string) => imagesToDelete.push(img)));
        postsFetched.forEach(p => { if (p.image) imagesToDelete.push(p.image); });
        messagesFetched.forEach(m => { if (m.image) imagesToDelete.push(m.image); });

        // Step 2: Shared Records Lifecycle Checks
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

        // Step 3: Database Deletions
        const dbOperations = [
            Product.deleteMany({ seller: userId }),
            Service.deleteMany({ provider: userId }),
            BoardPost.deleteMany({ author: userId }),
            Offer.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] }),
            Review.deleteMany({ reviewer: userId }),
            Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
            Report.deleteMany({ $or: [{ reporter: userId }, { targetUser: userId }] }),
            VerificationRequest.deleteMany({ user: userId }),
            User.findByIdAndDelete(userId)
        ];

        if (sharedRecordsToDelete.orders.length > 0) dbOperations.push(Order.deleteMany({ _id: { $in: sharedRecordsToDelete.orders } }) as any);
        if (sharedRecordsToDelete.messages.length > 0) dbOperations.push(Message.deleteMany({ _id: { $in: sharedRecordsToDelete.messages } }) as any);

        await Promise.all(dbOperations);

        // Step 3.5: Board Post Cleanup
        try {
            await BoardPost.updateMany({ 'replies.author': userId }, { $pull: { replies: { author: userId } } });
            await BoardPost.updateMany({ upvotes: userId }, { $pull: { upvotes: userId } });
        } catch (e) {}

        // Step 4: Cloudinary Cleanup
        if (imagesToDelete.length > 0) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await Promise.all(imagesToDelete.map(img => deleteFromCloudinary(img).catch(() => null)));
            } catch (e) { }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Admin Delete User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
