import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import Review from '@/models/Review';
import SiteSettings from '@/models/SiteSettings';
import { verifyToken } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        const user = decoded as any;

        const { id } = await params;
        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid Review ID' }, { status: 400 });
        }

        const { rating, comment } = await req.json();

        if (rating === undefined || !comment) {
            return NextResponse.json({ error: 'Missing rating or comment' }, { status: 400 });
        }

        await connectToDatabase();
        const settings = await SiteSettings.getSingleton();
        const maxChars = settings.maxReviewChars || 1000;

        if (comment.length > maxChars) {
            return NextResponse.json({ error: `Review comment must be ${maxChars} characters or less` }, { status: 400 });
        }

        const review = await Review.findById(id);
        if (!review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        if (review.reviewer.toString() !== user.userId) {
            return NextResponse.json({ error: 'You are not authorized to edit this review' }, { status: 403 });
        }

        review.rating = rating;
        review.comment = comment;
        await review.save();

        return NextResponse.json({ success: true, review });
    } catch (error: any) {
        console.error('Update Review Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        const user = decoded as any;

        const { id } = await params;
        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid Review ID' }, { status: 400 });
        }

        await connectToDatabase();
        const review = await Review.findById(id);
        
        if (!review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        // Allow deletion if the user is the reviewer OR if they are an admin
        if (review.reviewer.toString() !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
            return NextResponse.json({ error: 'You are not authorized to delete this review' }, { status: 403 });
        }

        await Review.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Review Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
