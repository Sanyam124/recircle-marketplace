import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import VerificationRequest from '@/models/VerificationRequest';
import { verifyToken } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

// GET: Fetch pending requests for the verifier's assigned campus
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        
        // Force registration in serverless context
        require('@/models/User');
        require('@/models/Community');
        require('@/models/VerificationRequest');
        const verifier = await User.findById(decoded.userId);
        if (!verifier || verifier.role !== 'verifier') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // The verifier manages their assigned community (first one in list)
        const communityId = verifier.verifiedCommunities?.[0];
        if (!communityId) return NextResponse.json({ requests: [] });

        const requests = await VerificationRequest.find({
            community: communityId,
            status: 'Pending'
        }).populate('user', 'name username email profilePicture').sort({ createdAt: -1 });

        return NextResponse.json({ requests }, { status: 200 });

    } catch (error) {
        console.error('Fetch Verification Requests Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: User submits a verification request for a community
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        
        const { communityId, idProof } = await req.json();
        if (!communityId || !idProof) {
            return NextResponse.json({ error: 'Missing community or ID proof' }, { status: 400 });
        }

        // Upload ID proof to Cloudinary
        let idProofUrl = idProof;
        if (idProof.startsWith('data:image')) {
            try {
                idProofUrl = await uploadToCloudinary(idProof, 'recircle/verifications');
            } catch (e) {
                console.warn('ID proof upload to Cloudinary failed, falling back to base64 storage.', e);
                idProofUrl = idProof;
            }
        }

        // Create the request
        const request = await VerificationRequest.create({
            user: decoded.userId,
            community: communityId,
            idProof: idProofUrl,
            status: 'Pending'
        });

        return NextResponse.json({ success: true, request }, { status: 201 });

    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ error: 'A pending request already exists for this community' }, { status: 409 });
        }
        console.error('Submit Verification Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
