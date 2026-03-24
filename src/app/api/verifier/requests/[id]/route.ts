import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import VerificationRequest from '@/models/VerificationRequest';
import Community from '@/models/Community';
import NotificationModel from '@/models/Notification';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        await connectToDatabase();
        const verifier = await User.findById(decoded.userId);
        if (!verifier || verifier.role !== 'verifier') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const { status, feedback } = await req.json();

        if (!['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
        }

        const request = await VerificationRequest.findById(id);
        if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

        // Ensure verifier is in the same community as the requester
        const assignedCommunity = verifier.verifiedCommunities?.[0]?.toString();
        if (request.community.toString() !== assignedCommunity) {
            return NextResponse.json({ error: 'Unauthorized to manage this community' }, { status: 403 });
        }

        request.status = status;
        request.feedback = feedback;
        await request.save({ validateBeforeSave: false });

        // Zero-Retention Policy: Incinerate the ID proof from Cloudinary immediately upon decision. 
        if (request.idProof && request.idProof.includes('cloudinary.com')) {
            const { deleteFromCloudinary } = await import('@/lib/cloudinary');
            await deleteFromCloudinary(request.idProof);
            
            // We can optionally nullify it in the database for extra cleanliness
            request.idProof = 'DELETED_FOR_PRIVACY';
            await request.save({ validateBeforeSave: false });
        }

        // If approved, add the community to the user's verifiedCommunities
        let communityObj = await Community.findById(request.community);
        let communityName = communityObj ? communityObj.name : 'Your Community';

        if (status === 'Approved') {
            const userToUpdate = await User.findById(request.user);
            if (userToUpdate) {
                if (!userToUpdate.verifiedCommunities.includes(request.community)) {
                    userToUpdate.verifiedCommunities.push(request.community);
                }
                userToUpdate.isVerified = true;
                await userToUpdate.save();
            }
        }

        // Emit Notification to User
        await NotificationModel.create({
            recipient: request.user,
            sender: decoded.userId,
            type: 'VERIFICATION_UPDATE',
            message: status === 'Approved' 
                ? `Welcome to ${communityName}! Your ID verification has been approved.` 
                : `Your verification request for ${communityName} was not approved. ${feedback ? `Reason: ${feedback}` : 'Please re-upload a clear ID.'}`,
            link: '/settings'
        });

        return NextResponse.json({ success: true, request }, { status: 200 });

    } catch (error) {
        console.error('Update Verification Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
