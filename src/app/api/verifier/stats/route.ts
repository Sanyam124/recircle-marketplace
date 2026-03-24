import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Community from '@/models/Community';
import Product from '@/models/Product';
import Service from '@/models/Service';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        
        // Force Next.js to register models in serverless edge
        require('@/models/Community');
        require('@/models/Product');
        require('@/models/Service');
        require('@/models/VerificationRequest');

        const verifier = await User.findById(decoded.userId).populate('verifiedCommunities');
        
        if (!verifier || verifier.role !== 'verifier') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // For now, the verifier manages the first community in their list
        const community = verifier.verifiedCommunities?.[0] as any;
        if (!community) {
            return NextResponse.json({ error: 'No community assigned' }, { status: 404 });
        }

        const communityId = community._id;

        // Fetch Real Stats
        const [totalUsers, totalProducts, totalServices] = await Promise.all([
            User.countDocuments({ verifiedCommunities: communityId }),
            Product.countDocuments({ community: communityId, status: 'Available' }),
            Service.countDocuments({ community: communityId, status: 'Active' })
        ]);

        return NextResponse.json({
            stats: {
                totalUsers,
                totalListings: totalProducts + totalServices,
                pendingVerifications: 0, // Placeholder for manual uploads part
                communityName: community.name
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Verifier Stats Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
