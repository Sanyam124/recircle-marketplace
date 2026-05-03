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
        const isAdmin = verifier?.role === 'admin';
        if (!verifier || (verifier.role !== 'verifier' && !isAdmin)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const { status, feedback } = await req.json();

        if (!['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
        }

        const request = await VerificationRequest.findById(id);
        if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

        // Ensure verifier is in the same community as the requester (unless admin)
        const assignedCommunity = verifier.verifiedCommunities?.[0]?.toString();
        if (!isAdmin && request.community.toString() !== assignedCommunity) {
            return NextResponse.json({ error: 'Unauthorized to manage this community' }, { status: 403 });
        }

        const communityObj = await Community.findById(request.community);
        const communityName = communityObj ? communityObj.name : 'Your Community';

        // Decision logic
        if (status === 'Approved') {
            const userToUpdate = await User.findById(request.user);
            if (userToUpdate) {
                if (!userToUpdate.verifiedCommunities.some(id => id.toString() === request.community.toString())) {
                    userToUpdate.verifiedCommunities.push(request.community);
                }
                userToUpdate.isVerified = true;
                await userToUpdate.save();
            }
        }

        // Emit Notification to User before deleting the request record
        // (So we can include feedback if it's a rejection)
        await NotificationModel.create({
            recipient: request.user,
            sender: decoded.userId,
            type: 'VERIFICATION_UPDATE',
            message: status === 'Approved' 
                ? `Welcome to ${communityName}! Your ID verification has been approved.` 
                : `Your verification request for ${communityName} was rejected. ${feedback ? `Reason: ${feedback}` : 'Please re-upload a clear ID.'}`,
            link: '/settings'
        });

        // Zero-Retention & Privacy: Burn the ID proof from Cloudinary and wipe the entire request record.
        if (request.idProof && request.idProof.startsWith('http')) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await deleteFromCloudinary(request.idProof).catch(() => null);
            } catch (e) {
                console.error('Cloudinary cleanup failed during verification processing:', e);
            }
        }

        // Final step: Delete the request record entirely
        await VerificationRequest.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: `Request ${status} and record purged.` }, { status: 200 });

    } catch (error) {
        console.error('Update Verification Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
