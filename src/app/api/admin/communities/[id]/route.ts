import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Community from '@/models/Community';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

export async function GET(req: NextRequest, context: any) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;

        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const id = params?.id || req.nextUrl.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Community ID missing' }, { status: 400 });

        const community = await Community.findById(id);
        if (!community) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // FETCH REAL-TIME STATS
        const Product = (await import('@/models/Product')).default;
        const Service = (await import('@/models/Service')).default;
        
        const [memberCount, productCount, serviceCount] = await Promise.all([
            User.countDocuments({ verifiedCommunities: id }),
            Product.countDocuments({ community: id }),
            Service.countDocuments({ community: id })
        ]);

        return NextResponse.json({ 
            success: true, 
            community,
            stats: {
                totalMembers: memberCount,
                totalItems: productCount + serviceCount,
                products: productCount,
                services: serviceCount
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, context: any) {
    try {
        await connectToDatabase();
        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;

        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const id = params?.id || req.nextUrl.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Community ID missing' }, { status: 400 });

        const body = await req.json();
        const { action, hostels, isManualVerificationEnabled } = body;

        let community;

        if (action === 'add_hostels' || action === 'update_hostels') {
            community = await Community.findByIdAndUpdate(
                id,
                { $set: { hostels } },
                { new: true }
            );
        } else if (action === 'toggle_manual_verification') {
            community = await Community.findByIdAndUpdate(
                id,
                { $set: { isManualVerificationEnabled } },
                { new: true }
            );
        } else if (action === 'toggle_active') {
            const current = await Community.findById(id);
            community = await Community.findByIdAndUpdate(
                id,
                { $set: { isActive: !current?.isActive } },
                { new: true }
            );
        } else if (action === 'update_metadata') {
            const { name, description, emailDomains } = body;
            community = await Community.findByIdAndUpdate(
                id,
                { $set: { name, description, emailDomains } },
                { new: true }
            );
        } else {
             return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (!community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, community }, { status: 200 });

    } catch (error: any) {
        console.error('Update Community Failed:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
