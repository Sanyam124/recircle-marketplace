import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import Order from '@/models/Order';
import Community from '@/models/Community';
import VerificationRequest from '@/models/VerificationRequest';
import BoardPost from '@/models/BoardPost';
import Report from '@/models/Report';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) {
            console.error('ProfileAPI: Invalid Token');
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        console.log('ProfileAPI: Fetching data for user:', decoded.userId);
        await connectToDatabase();
        require('@/models/Community');

        // Fetch User
        const user = await User.findById(decoded.userId)
            .populate('verifiedCommunities', 'name image isActive')
            .select('-password');
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
                bannerImage: user.bannerImage,
                bio: user.bio,
                phone: user.phone,
                isPhoneVerified: user.isPhoneVerified,
                allowPhoneContact: user.allowPhoneContact,
                address: user.address,
                gender: user.gender,
                allowEmailContact: user.allowEmailContact,
                wishlist: user.wishlist || [],
                wishlistedServices: user.wishlistedServices || [],
                isVerified: user.isVerified,
                isOnVacation: user.isOnVacation || false,
                notifyOffers: user.notifyOffers ?? true,
                notifyMessages: user.notifyMessages ?? true,
                notifyNewsletter: user.notifyNewsletter ?? true,
                notifyCommunity: user.notifyCommunity ?? true,
                notifySecurity: user.notifySecurity ?? true,
                showOnlineStatus: user.showOnlineStatus ?? true,
                compactView: user.compactView ?? false,
                defaultCommunity: user.defaultCommunity,
                defaultHostel: user.defaultHostel,
                authProvider: user.authProvider,
                usernameChangeCount: user.usernameChangeCount || 0,
                verifiedCommunities: user.verifiedCommunities || []
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Profile Data Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        require('@/models/Community');
        const body = await req.json();
        const { 
            name, username, gender, address, bio, phone,
            allowEmailContact, allowPhoneContact, isOnVacation, 
            profilePicture, bannerImage, notifyOffers, notifyMessages,
            notifyNewsletter, notifyCommunity, notifySecurity,
            showOnlineStatus, compactView, defaultCommunity, defaultHostel
        } = body;

        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const updateData: any = {};

        // 1. Name update
        if (name !== undefined) {
            const trimmedName = name.trim();
            if (trimmedName) {
                if (trimmedName.length < 3 || trimmedName.length > 30) {
                    return NextResponse.json({ error: 'Name must be between 3 and 30 characters' }, { status: 400 });
                }
                updateData.name = trimmedName;
            }
        }

        // 2. Username update with limit
        if (username !== undefined) {
            const newUsername = username.trim().toLowerCase();
            if (newUsername && newUsername !== user.username) {
                // Check Limit
                if (user.usernameChangeCount >= 3) {
                    return NextResponse.json({ error: 'Username change limit reached (max 3)' }, { status: 403 });
                }

                // Uniqueness check
                const existingUser = await User.findOne({
                    username: newUsername,
                    _id: { $ne: decoded.userId }
                });
                if (existingUser) {
                    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
                }

                if (newUsername.length > 20) {
                    return NextResponse.json({ error: 'Username must be 20 characters or less' }, { status: 400 });
                }

                updateData.username = newUsername;
                updateData.usernameChangeCount = (user.usernameChangeCount || 0) + 1;
                updateData.usernameLastChanged = new Date();
            }
        }

        // 3. Simple fields
        if (gender !== undefined) updateData.gender = gender;
        if (address !== undefined) {
            if (address.length > 150) {
                return NextResponse.json({ error: 'Address must be 150 characters or less' }, { status: 400 });
            }
            updateData.address = address;
        }
        if (phone !== undefined) {
            // Basic number check
            updateData.phone = phone.replace(/\D/g, '').slice(0, 15);
        }

        // 4. Bio with length check
        if (bio !== undefined) {
            if (bio.length > 500) {
                return NextResponse.json({ error: 'Bio must be 500 characters or less' }, { status: 400 });
            }
            updateData.bio = bio;
        }

        // 5. Toggles (Privacy, Notifications, UI)
        if (allowEmailContact !== undefined) updateData.allowEmailContact = allowEmailContact;
        if (allowPhoneContact !== undefined) updateData.allowPhoneContact = allowPhoneContact;
        if (isOnVacation !== undefined) updateData.isOnVacation = isOnVacation;
        if (notifyOffers !== undefined) updateData.notifyOffers = notifyOffers;
        if (notifyMessages !== undefined) updateData.notifyMessages = notifyMessages;
        if (notifyNewsletter !== undefined) updateData.notifyNewsletter = notifyNewsletter;
        if (notifyCommunity !== undefined) updateData.notifyCommunity = notifyCommunity;
        if (notifySecurity !== undefined) updateData.notifySecurity = notifySecurity;
        if (showOnlineStatus !== undefined) updateData.showOnlineStatus = showOnlineStatus;
        if (compactView !== undefined) updateData.compactView = compactView;
        if (defaultCommunity !== undefined) {
            updateData.defaultCommunity = defaultCommunity === "" ? null : defaultCommunity;
        }
        if (defaultHostel !== undefined) updateData.defaultHostel = defaultHostel;

        // 6. Profile Picture Auto-Upload & Garbage Collection
        let newlyUploadedUrl: string | null = null;
        let oldUrlToDelete: string | null = null;

        if (profilePicture !== undefined && profilePicture !== user.profilePicture) {
            let finalUrl = profilePicture;

            // If it's a NEW Base64 image, upload it NOW
            if (profilePicture && profilePicture.startsWith('data:image')) {
                try {
                    const { uploadToCloudinary } = await import('@/lib/cloudinary');
                    finalUrl = await uploadToCloudinary(profilePicture, 'recircle/profiles');
                    newlyUploadedUrl = finalUrl;
                } catch (e) {
                    console.error('Failed to upload new profile pic:', e);
                    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
                }
            }

            // Flag the old URL to be deleted IF AND ONLY IF the DB update succeeds
            if (user.profilePicture && (finalUrl !== user.profilePicture)) {
                oldUrlToDelete = user.profilePicture;
            }
            updateData.profilePicture = finalUrl;
        }

        // 7. Banner Image Auto-Upload & Garbage Collection
        let newlyUploadedBannerUrl: string | null = null;
        let oldBannerUrlToDelete: string | null = null;

        if (bannerImage !== undefined && bannerImage !== user.bannerImage) {
            let finalUrl = bannerImage;

            if (bannerImage && bannerImage.startsWith('data:image')) {
                try {
                    const { uploadToCloudinary } = await import('@/lib/cloudinary');
                    finalUrl = await uploadToCloudinary(bannerImage, 'recircle/profiles');
                    newlyUploadedBannerUrl = finalUrl;
                } catch (e) {
                    console.error('Failed to upload new banner:', e);
                    return NextResponse.json({ error: 'Failed to process banner image' }, { status: 500 });
                }
            }

            if (user.bannerImage && (finalUrl !== user.bannerImage)) {
                oldBannerUrlToDelete = user.bannerImage;
            }
            updateData.bannerImage = finalUrl;
        }

        let updatedUser;
        try {
            updatedUser = await User.findByIdAndUpdate(
                decoded.userId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).populate('verifiedCommunities', 'name image isActive').select('-password');
        } catch (dbError) {
             // Rollback newly uploaded images if DB update failed
             if (newlyUploadedUrl) {
                 try {
                     const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                     await deleteFromCloudinary(newlyUploadedUrl);
                 } catch (e) {}
             }
             if (newlyUploadedBannerUrl) {
                 try {
                     const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                     await deleteFromCloudinary(newlyUploadedBannerUrl);
                 } catch (e) {}
             }
             throw dbError;
        }

        // DB update successful, now garbage collect the old picture
        if (oldUrlToDelete) {
             try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await deleteFromCloudinary(oldUrlToDelete);
             } catch (e) {
                console.error('Failed to garbage collect old profile pic:', e);
             }
        }
        if (oldBannerUrlToDelete) {
             try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await deleteFromCloudinary(oldBannerUrlToDelete);
             } catch (e) {
                console.error('Failed to garbage collect old banner pic:', e);
             }
        }

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                profilePicture: updatedUser.profilePicture,
                bannerImage: updatedUser.bannerImage,
                bio: updatedUser.bio,
                phone: updatedUser.phone,
                isPhoneVerified: updatedUser.isPhoneVerified,
                allowPhoneContact: updatedUser.allowPhoneContact,
                address: updatedUser.address,
                gender: updatedUser.gender,
                allowEmailContact: updatedUser.allowEmailContact,
                wishlist: updatedUser.wishlist || [],
                wishlistedServices: updatedUser.wishlistedServices || [],
                isVerified: updatedUser.isVerified,
                isOnVacation: updatedUser.isOnVacation || false,
                notifyOffers: updatedUser.notifyOffers ?? true,
                notifyMessages: updatedUser.notifyMessages ?? true,
                notifyNewsletter: updatedUser.notifyNewsletter ?? true,
                notifyCommunity: updatedUser.notifyCommunity ?? true,
                notifySecurity: updatedUser.notifySecurity ?? true,
                showOnlineStatus: updatedUser.showOnlineStatus ?? true,
                compactView: updatedUser.compactView ?? false,
                defaultCommunity: updatedUser.defaultCommunity,
                defaultHostel: updatedUser.defaultHostel,
                authProvider: updatedUser.authProvider,
                usernameChangeCount: updatedUser.usernameChangeCount || 0,
                verifiedCommunities: updatedUser.verifiedCommunities || []
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Profile Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();

        const userId = decoded.userId;

        await connectToDatabase();
        
        // --- PRE-FETCHING & AUDIT ---
        // 1. Identify pending reports to determine Hard vs Shadow deletion
        const pendingReportsAgainstUser = await Report.countDocuments({ targetUser: userId, status: 'Pending' });

        // 2. Identify Cloudinary assets for garbage collection
        const [userProducts, userServices, userObj] = await Promise.all([
            Product.find({ seller: userId }).select('images'),
            Service.find({ provider: userId }).select('images'),
            User.findById(userId).select('profilePicture')
        ]);

        const imagesToDelete: string[] = [];
        if (userObj?.profilePicture) imagesToDelete.push(userObj.profilePicture);
        if (userObj?.bannerImage) imagesToDelete.push(userObj.bannerImage);
        userProducts.forEach(p => p.images?.forEach((img: string) => imagesToDelete.push(img)));
        userServices.forEach(s => s.images?.forEach((img: string) => imagesToDelete.push(img)));

        // Step 2: Parallel Database Delete - Intelligent Lifecycle Management
        // Products and Services are OWNED content - delete them immediately for Zero-Retention
        const dbOperations = [
            Product.deleteMany({ seller: userId }),
            Service.deleteMany({ provider: userId }),
            BoardPost.deleteMany({ author: userId }),
            Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
            VerificationRequest.deleteMany({ user: userId }),
            Review.deleteMany({ reviewer: userId }), 
            Report.deleteMany({ reporter: userId })
        ];

        // Step 2.1: Conditional User Erasure (Shadow Deletion for Evidence)
        if (pendingReportsAgainstUser > 0) {
            dbOperations.push(User.findByIdAndUpdate(userId, {
                $set: {
                    status: 'Banned',
                    isVerified: false,
                    profilePicture: '',
                    bio: 'Account self-deactivated while under moderation review.',
                    otp: null,
                    otpExpiry: null
                }
            }) as any);
        } else {
            dbOperations.push(User.findByIdAndDelete(userId) as any);
            dbOperations.push(Report.deleteMany({ $or: [{ reporter: userId }, { targetUser: userId }] }) as any);
        }

        // Step 2.5: Shared Records (Orders/Messages) - Mutual Abandonment Cleanup
        const [privateOrders, privateMessages] = await Promise.all([
            Order.find({ $or: [{ buyer: userId }, { seller: userId }] }).lean(),
            Message.find({ $or: [{ sender: userId }, { recipient: userId }] }).lean()
        ]);

        const sharedRecordsToDelete = {
            orders: [] as any[],
            messages: [] as any[]
        };

        // For performance, we limit the check to a few samples or just do a bulk existence check if possible
        // But for a Minor Project, a filtered promise.all is acceptable for a single user deletion
        await Promise.all([
            ...privateOrders.map(async (order: any) => {
                const otherPartyId = order.buyer.toString() === userId.toString() ? order.seller : order.buyer;
                const otherExists = await User.exists({ _id: otherPartyId });
                if (!otherExists) sharedRecordsToDelete.orders.push(order._id);
            }),
            ...privateMessages.map(async (msg: any) => {
                const otherPartyId = msg.sender.toString() === userId.toString() ? msg.recipient : msg.sender;
                const otherExists = await User.exists({ _id: otherPartyId });
                if (!otherExists) sharedRecordsToDelete.messages.push(msg._id);
            })
        ]);

        if (sharedRecordsToDelete.orders.length > 0) {
            dbOperations.push(Order.deleteMany({ _id: { $in: sharedRecordsToDelete.orders } }) as any);
        }
        if (sharedRecordsToDelete.messages.length > 0) {
            dbOperations.push(Message.deleteMany({ _id: { $in: sharedRecordsToDelete.messages } }) as any);
        }

        await Promise.all(dbOperations);

        // Step 3: Trigger Cloudinary Cleanup AFTER DB succeeds
        if (imagesToDelete.length > 0) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await Promise.all(imagesToDelete.map(img => deleteFromCloudinary(img).catch(() => null)));
            } catch (e) {
                console.error("Cloudinary cleanup failed during account deletion", e);
            }
        }

        const response = NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });

        // Clear Cookie
        response.cookies.set('token', '', {
            httpOnly: true,
            expires: new Date(0),
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Account Deletion Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
