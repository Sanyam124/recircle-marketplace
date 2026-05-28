import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Community from '@/models/Community';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

// Helper to check admin status (Database-verified)
async function isAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return false;
    const decoded = verifyToken(token) as { userId: string };
    if (!decoded) return false;

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user?.role === 'admin';
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectToDatabase();
        const communities = await Community.find().sort({ createdAt: -1 });
        return NextResponse.json({ communities });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectToDatabase();
        const { name, emailDomains, description, image, isManualVerificationEnabled } = await req.json();

        if (!name || !emailDomains || !Array.isArray(emailDomains)) {
            return NextResponse.json({ error: 'Name and email domains array are required' }, { status: 400 });
        }

        let finalImageUrl = image;
        let imageUploaded = false;
        if (image && image.startsWith('data:image')) {
            try {
                const { uploadToCloudinary } = await import('@/lib/cloudinary');
                finalImageUrl = await uploadToCloudinary(image, 'recircle/communities');
                imageUploaded = true;
            } catch (e) {
                console.error('Failed to upload community image:', e);
                return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
            }
        }

        try {
            const community = await Community.create({
                name,
                emailDomains: emailDomains.map(d => d.toLowerCase().trim()),
                description,
                image: finalImageUrl,
                isActive: true,
                isManualVerificationEnabled: isManualVerificationEnabled ?? true
            });

            // Auto-add this community to ALL existing users whose email domain matches
            const domainRegexParts = community.emailDomains.map(d => d.replace(/\./g, '\\.'));
            if (domainRegexParts.length > 0) {
                const domainRegex = new RegExp(`@(${domainRegexParts.join('|')})$`, 'i');
                const matchResult = await User.updateMany(
                    { email: { $regex: domainRegex }, verifiedCommunities: { $ne: community._id } },
                    { $addToSet: { verifiedCommunities: community._id } }
                );
                console.log(`[Community Auto-Link] Added "${community.name}" to ${matchResult.modifiedCount} existing users.`);
            }

            return NextResponse.json({ community, autoLinkedUsers: true }, { status: 201 });
        } catch (dbError: any) {
             if (imageUploaded && finalImageUrl) {
                 try {
                     const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                     await deleteFromCloudinary(finalImageUrl);
                 } catch (e) {}
             }
             throw dbError;
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const community = await Community.findById(id);
        if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

        // --- SAFETY GUARDS ---
        const Order = (await import('@/models/Order')).default;
        const Report = (await import('@/models/Report')).default;
        const VerificationRequest = (await import('@/models/VerificationRequest')).default;

        const [activeOrders, pendingReports, pendingVerifications] = await Promise.all([
            Order.findOne({ community: id, status: { $in: ['Paid', 'Scheduled', 'Dispute_Pending'] } }),
            Report.findOne({ itemId: { $in: (await (await import('@/models/Product')).default.find({ community: id }).select('_id')).map(p => p._id) }, status: 'Pending' }),
            VerificationRequest.findOne({ community: id, status: 'pending' })
        ]);

        if (activeOrders) {
            return NextResponse.json({ 
                error: 'Cannot delete circle: There are active, unfulfilled trades currently linked to this campus. Please wait for completion or cancel the orders first.' 
            }, { status: 400 });
        }

        if (pendingReports) {
            return NextResponse.json({ 
                error: 'Cannot delete circle: There are active moderation reports against items in this circle. Resolve reports first.' 
            }, { status: 400 });
        }

        if (pendingVerifications) {
            return NextResponse.json({ 
                error: 'Cannot delete circle: There are pending user verification requests for this campus. Approve or reject them first.' 
            }, { status: 400 });
        }

        // --- CASCADE CLEANUP ---
        const Product = (await import('@/models/Product')).default;
        const Service = (await import('@/models/Service')).default;

        // Collect all images from items in this community to prevent storage leaks
        const [commProducts, commServices] = await Promise.all([
            Product.find({ community: id }).select('images').lean(),
            Service.find({ community: id }).select('images').lean()
        ]);

        const imagesToDelete: string[] = [];
        if (community.image) {
            imagesToDelete.push(community.image);
        }
        commProducts.forEach((p: any) => p.images?.forEach((img: string) => imagesToDelete.push(img)));
        commServices.forEach((s: any) => s.images?.forEach((img: string) => imagesToDelete.push(img)));

        await Promise.all([
            // 1. Pull community from all Users' verified profiles
            User.updateMany(
                { verifiedCommunities: id },
                { $pull: { verifiedCommunities: id } }
            ),
            // 2. Delete all products and services in this community
            Product.deleteMany({ community: id }),
            Service.deleteMany({ community: id }),
            // 3. Finally delete the community
            Community.findByIdAndDelete(id)
        ]);

        // Cleanup Cloudinary Storage only after DB operations succeed
        if (imagesToDelete.length > 0) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await Promise.all(imagesToDelete.map(img => deleteFromCloudinary(img).catch(() => null)));
            } catch (e) {
                console.error('Failed to cleanup community or listing images from Cloudinary:', e);
            }
        }

        return NextResponse.json({ message: 'Community and its listings purged successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
