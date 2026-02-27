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
            user
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
        const { name, username, gender, address, bio, allowEmailContact } = await req.json();

        // Check if username is already taken by another user
        if (username) {
            const existingUser = await User.findOne({
                username: username,
                _id: { $ne: decoded.userId }
            });
            if (existingUser) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
            }
        }

        const updateData: any = {
            name,
            gender: gender || 'none',
            address,
            bio
        };

        if (allowEmailContact !== undefined) {
            updateData.allowEmailContact = allowEmailContact;
        }

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
            user: updatedUser
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
