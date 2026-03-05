import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Product from '@/models/Product';
import Service from '@/models/Service';
import Review from '@/models/Review';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import Order from '@/models/Order';
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

        // Fetch User
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
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
                authProvider: user.authProvider,
                usernameChangeCount: user.usernameChangeCount || 0
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
        const body = await req.json();
        const { name, username, gender, address, bio, allowEmailContact, allowPhoneContact, isOnVacation } = body;

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

        // 4. Bio with length check
        if (bio !== undefined) {
            if (bio.length > 500) {
                return NextResponse.json({ error: 'Bio must be 500 characters or less' }, { status: 400 });
            }
            updateData.bio = bio;
        }

        // 5. Privacy Toggles
        if (allowEmailContact !== undefined) updateData.allowEmailContact = allowEmailContact;
        if (allowPhoneContact !== undefined) updateData.allowPhoneContact = allowPhoneContact;
        if (isOnVacation !== undefined) updateData.isOnVacation = isOnVacation;

        const updatedUser = await User.findByIdAndUpdate(
            decoded.userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

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
                authProvider: updatedUser.authProvider,
                usernameChangeCount: updatedUser.usernameChangeCount || 0
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

        // Parallel Delete - Performance and Cleanliness
        await Promise.all([
            Product.deleteMany({ seller: userId }),
            Service.deleteMany({ provider: userId }),
            Review.deleteMany({ $or: [{ reviewer: userId }, { target: userId }] }),
            Order.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] }),
            // Handle Messages (both sides)
            Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
            // Handle Notifications
            Notification.deleteMany({ recipient: userId }),
            // Finally the User
            User.findByIdAndDelete(userId)
        ]);

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
