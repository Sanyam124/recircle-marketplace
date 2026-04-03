import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
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
        const Product = (await import('@/models/Product')).default;
        const Service = (await import('@/models/Service')).default;

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

        // 1. Delete user's products and their Cloudinary images
        try {
            const Product = (await import('@/models/Product')).default;
            const { deleteFromCloudinary } = await import('@/lib/cloudinary');
            const products = await Product.find({ seller: userId });
            for (const p of products) {
                if (p.images?.length) {
                    for (const img of p.images) {
                        try { await deleteFromCloudinary(img); } catch {}
                    }
                }
            }
            await Product.deleteMany({ seller: userId });
        } catch (e) { console.error('Product cleanup failed:', e); }

        // 2. Delete user's services and their Cloudinary images
        try {
            const Service = (await import('@/models/Service')).default;
            const { deleteFromCloudinary } = await import('@/lib/cloudinary');
            const services = await Service.find({ provider: userId });
            for (const s of services) {
                if (s.images?.length) {
                    for (const img of s.images) {
                        try { await deleteFromCloudinary(img); } catch {}
                    }
                }
            }
            await Service.deleteMany({ provider: userId });
        } catch (e) { console.error('Service cleanup failed:', e); }

        // 3. Delete user's Board Posts
        try {
            const BoardPost = (await import('@/models/BoardPost')).default;
            // First, delete posts written by the user
            await BoardPost.deleteMany({ author: userId });
            
            // Second, remove their replies from other people's posts
            await BoardPost.updateMany(
                { 'replies.author': userId },
                { $pull: { replies: { author: userId } } }
            );
            
            // Third, remove their upvotes from other people's posts
            await BoardPost.updateMany(
                { upvotes: userId },
                { $pull: { upvotes: userId } }
            );
        } catch (e) { console.error('BoardPost cleanup failed:', e); }

        // 4. Handle Active Orders Cleanup 
        try {
            const Order = (await import('@/models/Order')).default;
            const Product = (await import('@/models/Product')).default;
            const activeOrders = await Order.find({
                $or: [{ buyer: userId }, { seller: userId }],
                status: 'Scheduled'
            });
            for (const order of activeOrders) {
                // Return someone else's product if THIS user was the buyer
                if (order.buyer.toString() === userId.toString() && order.product) {
                    await Product.updateOne(
                        { _id: order.product, status: 'Reserved' },
                        { $set: { status: 'Available' } }
                    );
                }
            }
            await Order.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] });
        } catch (e) { console.error('Order cleanup failed:', e); }

        // 5. Cleanup Offers (Sent and Received)
        try {
            const Offer = (await import('@/models/Offer')).default;
            await Offer.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] });
        } catch (e) { console.error('Offer cleanup failed:', e); }

        // 6. Cleanup Reviews (Written and Received)
        try {
            const Review = (await import('@/models/Review')).default;
            await Review.deleteMany({ $or: [{ reviewer: userId }, { target: userId }] });
        } catch (e) { console.error('Review cleanup failed:', e); }

        // 7. Cleanup Messages
        try {
            const Message = (await import('@/models/Message')).default;
            await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
        } catch (e) { console.error('Message cleanup failed:', e); }

        // 8. Cleanup Notifications
        try {
            const Notification = (await import('@/models/Notification')).default;
            await Notification.deleteMany({ $or: [{ userId: userId }, { senderId: userId }] });
        } catch (e) { console.error('Notification cleanup failed:', e); }

        // 9. Cleanup Reports (Filed by the user or against them)
        try {
            const Report = (await import('@/models/Report')).default;
            await Report.deleteMany({ $or: [{ reporter: userId }, { targetUser: userId }] });
        } catch (e) { console.error('Report cleanup failed:', e); }

        // 10. Cleanup Verification Requests
        try {
            const VerificationRequest = (await import('@/models/VerificationRequest')).default;
            await VerificationRequest.deleteMany({ user: userId });
        } catch (e) { console.error('VerificationRequest cleanup failed:', e); }

        // 11. Delete user's profile picture from cloudinary
        if (user.profilePicture) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await deleteFromCloudinary(user.profilePicture);
            } catch {}
        }

        // 12. Finally delete the user account
        await User.findByIdAndDelete(userId);

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Admin Delete User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
