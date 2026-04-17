import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import BoardPost from '@/models/BoardPost';
import SiteSettings from '@/models/SiteSettings';
import { verifyToken } from '@/lib/auth';

/**
 * Notice Board API
 * GET: Fetch posts for a specific community
 * POST: Create a new post in a community
 */
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        require('@/models/User');
        require('@/models/Community');
        require('@/models/BoardPost');

        const { searchParams } = new URL(req.url);
        const communityId = searchParams.get('communityId');

        if (!communityId || !isValidObjectId(communityId)) {
            return NextResponse.json({ error: 'Valid Community ID required' }, { status: 400 });
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const query = {
            community: new Types.ObjectId(communityId),
        };
        
        console.log('Fetching Board for Community:', communityId, 'Page:', page);

        const totalPosts = await BoardPost.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limit);

        // Fetch posts for this community, sorted by newest
        const posts = await BoardPost.find(query)
        .populate('author', 'name profilePicture username')
        .populate({
            path: 'replies.author',
            select: 'name profilePicture username',
            strictPopulate: false
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

        return NextResponse.json({ 
            posts,
            pagination: {
                currentPage: page,
                totalPages,
                totalPosts,
                hasMore: page < totalPages
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Board GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

        await connectToDatabase();
        require('@/models/User');
        require('@/models/Community');
        require('@/models/BoardPost');

        const { content, communityId } = await req.json();

        const settings = await SiteSettings.getSingleton();
        const maxChars = settings.maxBoardPostChars || 500;

        if (!content || content.length > maxChars) {
            return NextResponse.json({ error: `Content must be 1-${maxChars} characters` }, { status: 400 });
        }

        if (!communityId || !isValidObjectId(communityId)) {
            return NextResponse.json({ error: 'Valid Community ID required' }, { status: 400 });
        }

        const newPost = await BoardPost.create({
            author: decoded.userId,
            community: communityId,
            content: content.trim()
        });

        // Populate author before returning
        const populatedPost = await BoardPost.findById(newPost._id).populate('author', 'name profilePicture username');

        return NextResponse.json({ post: populatedPost }, { status: 201 });

    } catch (error: any) {
        console.error('Board POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

        await connectToDatabase();
        require('@/models/User');
        require('@/models/Community');
        require('@/models/BoardPost');

        const { postId, action, content } = await req.json();

        if (!postId || !isValidObjectId(postId)) {
             return NextResponse.json({ error: 'Valid Post ID required' }, { status: 400 });
        }

        const post = await BoardPost.findById(postId);
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        const userId = new Types.ObjectId(decoded.userId);

        if (action === 'upvote') {
            const upvoteIndex = post.upvotes.indexOf(userId);
            if (upvoteIndex > -1) {
                post.upvotes.splice(upvoteIndex, 1);
            } else {
                post.upvotes.push(userId);
            }
            await post.save();
            return NextResponse.json({ 
                upvotes: post.upvotes.length,
                isUpvoted: post.upvotes.includes(userId)
            }, { status: 200 });
        } 
        
        else if (action === 'reply') {
            const settings = await SiteSettings.getSingleton();
            const maxReply = settings.maxBoardReplyChars || 300;

            if (!content || content.length > maxReply) {
                return NextResponse.json({ error: `Reply must be 1-${maxReply} characters` }, { status: 400 });
            }
            
            if (!post.replies) post.replies = [];
            
            post.replies.push({
                author: userId,
                content: content.trim(),
                createdAt: new Date()
            });
            
            await post.save();
            
            // Return the full post with populated authors (including new reply author)
            const updatedPost = await BoardPost.findById(postId)
                .populate('author', 'name profilePicture username')
                .populate('replies.author', 'name profilePicture username');
                
            return NextResponse.json({ success: true, post: updatedPost }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Board PATCH error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
