import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Community from '@/models/Community';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const limit = parseInt(searchParams.get('limit') || '10');

        let query: any = { isActive: true };

        // 1. GPS Search (Find nearest communities)
        if (lat && lng) {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    }
                }
            };
        } 
        // 2. Text Search (Find by name)
        else if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const communities = await Community.find(query)
            .limit(limit)
            .select('name description location image emailDomains createdAt');

        return NextResponse.json({ communities }, { status: 200 });

    } catch (error: any) {
        console.error('Communities GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, lat, lng, gpsRadius, emailDomains, image } = body;

        if (!name || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: 'Name, lat, and lng are required' }, { status: 400 });
        }

        const newCommunity = await Community.create({
            name,
            description,
            location: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            gpsRadius: gpsRadius || 1000,
            emailDomains: emailDomains || [],
            admins: [user._id],
            verifiers: [user._id], // Admin is automatically a verifier
            image
        });

        return NextResponse.json({ community: newCommunity }, { status: 201 });

    } catch (error: any) {
        console.error('Communities POST Error:', error);
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Community with this name already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
