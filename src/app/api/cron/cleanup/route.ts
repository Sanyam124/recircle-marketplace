import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Message from '@/models/Message';
import BoardPost from '@/models/BoardPost';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Vercel Cron Security: Ensure the request comes from Vercel or matches our CRON_SECRET
        const authHeader = request.headers.get('authorization');
        const hasValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
        
        // Only allow in development without auth, or with auth in production
        if (process.env.NODE_ENV !== 'development' && !hasValidAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Target date: exactly 30 days ago
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // 1. Cleanup old Messages
        const expiredMessages = await Message.find({
            createdAt: { $lt: thirtyDaysAgo }
        }).select('_id image');

        let messageImageCount = 0;
        let messageDbCount = 0;

        for (const msg of expiredMessages) {
            if (msg.image) {
                await deleteFromCloudinary(msg.image).catch(e => console.error('Cloudinary cleanup error (msg):', e));
                messageImageCount++;
            }
            await Message.deleteOne({ _id: msg._id });
            messageDbCount++;
        }

        // 2. Cleanup old BoardPosts
        // We use createdAt < 30 days ago, aligned with the 30-day user expectation
        const expiredBoardPosts = await BoardPost.find({
            createdAt: { $lt: thirtyDaysAgo }
        }).select('_id image');

        let postImageCount = 0;
        let postDbCount = 0;

        for (const post of expiredBoardPosts) {
            if (post.image) {
                await deleteFromCloudinary(post.image).catch(e => console.error('Cloudinary cleanup error (post):', e));
                postImageCount++;
            }
            await BoardPost.deleteOne({ _id: post._id });
            postDbCount++;
        }

        console.log(`[CRON CLEANUP] Messages: ${messageDbCount} deleted (${messageImageCount} images). BoardPosts: ${postDbCount} deleted (${postImageCount} images).`);

        return NextResponse.json({
            success: true,
            message: 'Cron cleanup completed successfully',
            stats: {
                messages: {
                    deletedFromDb: messageDbCount,
                    imagesDeleted: messageImageCount,
                },
                boardPosts: {
                    deletedFromDb: postDbCount,
                    imagesDeleted: postImageCount,
                }
            }
        });

    } catch (error: any) {
        console.error('Cron Cleanup Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error', message: error.message },
            { status: 500 }
        );
    }
}
