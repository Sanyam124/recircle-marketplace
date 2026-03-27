import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Community from '@/models/Community';
import VerificationRequest from '@/models/VerificationRequest';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

/**
 * Smart Verification Routing
 * Determines if a user qualifies for Auto-Verification (Email Domain)
 * or requires Manual Verification (ID Upload).
 */
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        
        const body = await req.json();
        const { communityId, proofUrls } = body;

        if (!communityId) {
            return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const community = await Community.findById(communityId);
        if (!community || !community.isActive) {
            return NextResponse.json({ error: 'Community not found or inactive' }, { status: 404 });
        }

        // Check if already verified
        if (user.verifiedCommunities?.some(id => id.toString() === community._id.toString())) {
            return NextResponse.json({ 
                success: true, 
                message: 'Already verified for this community',
                mode: 'auto' 
            }, { status: 200 });
        }

        // 1. Automatic Verification (Email Suffix Match)
        // If the user's email ends with any of the community's authorized domains
        const domainMatches = community.emailDomains?.some(domain => 
            user.email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
        );

        if (domainMatches) {
            // Apply Instant Verification
            await User.findByIdAndUpdate(user._id, {
                $addToSet: { verifiedCommunities: community._id }
            });

            return NextResponse.json({ 
                success: true, 
                message: 'Automatically verified via community email match!',
                mode: 'auto'
            }, { status: 200 });
        }

        // 2. Manual Verification Routing (ID Uploads)
        if (!proofUrls || !Array.isArray(proofUrls) || proofUrls.length === 0) {
            return NextResponse.json({ 
                error: 'Email does not match community domain. Please provide proof URLs (ID/documents).' 
            }, { status: 400 });
        }

        // Check if they already have a Pending request for this community
        const existingReq = await VerificationRequest.findOne({
            user: user._id,
            community: community._id,
            status: 'Pending'
        });

        if (existingReq) {
            return NextResponse.json({ error: 'You already have a verification request pending for this community.' }, { status: 409 });
        }

        // Create new Manual Request directly routed to Verifiers
        const request = await VerificationRequest.create({
            user: user._id,
            community: community._id,
            idProof: proofUrls[0], // Schema expects a single string for idProof
            status: 'Pending'
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Manual verification request submitted successfully to community Verifiers.',
            mode: 'manual',
            requestId: request._id 
        }, { status: 201 });

    } catch (error: any) {
        console.error('Community Verification Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
