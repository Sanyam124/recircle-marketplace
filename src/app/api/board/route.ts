import { NextRequest, NextResponse } from 'next/server';
import { Types, isValidObjectId } from 'mongoose';
import connectToDatabase from '@/lib/db';
import BoardPost from '@/models/BoardPost';
import User from '@/models/User';
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

        // --- Visibility Hardening for Board Access ---
        const token = req.cookies.get('token')?.value;
        const decoded = token ? verifyToken(token) : null;
        let isAuthorized = false;

        if (decoded) {
            const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
            const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === communityId);
            const isAdmin = currentUser?.role === 'admin';
            isAuthorized = isMember || isAdmin;
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'This campus board is private. Verify your email to join the conversation.' }, { status: 403 });
        }

        // --- Maintenance Mode Check ---
        const Community = (await import('@/models/Community')).default;
        const commObj = await Community.findById(communityId).select('isActive name');
        if (commObj && !commObj.isActive) {
            const isAdmin = decoded?.role === 'admin';
            if (!isAdmin) {
                return NextResponse.json({ 
                    error: `The ${commObj.name} notice board is currently in maintenance mode. Discussions are temporarily frozen.`,
                    maintenance: true 
                }, { status: 503 });
            }
        }

        const page = parseInt(searchParams.get('page') || '1');
        const requestedLimit = parseInt(searchParams.get('limit') || '20');
        const category = searchParams.get('category'); // e.g. 'General', 'LostFound', etc.
        const search = searchParams.get('search'); // Keyword search
        const limit = Math.min(requestedLimit, 50);
        const skip = (page - 1) * limit;

        const query: any = {
            community: new Types.ObjectId(communityId),
        };

        if (category && category !== 'All') {
            query.category = category;
        }

        if (search) {
            query.content = { $regex: search, $options: 'i' };
        }
        
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

        // --- ANTI-BOARD SPAM SHIELD ---
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rl = await checkRateLimit(decoded.userId, 'board-post', 5, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: 'You are posting on the board too quickly. Please wait a minute.',
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 60
                },
                { status: 429 }
            );
        }

        const { content, communityId, category, image } = await req.json();

        const settings = await SiteSettings.getSingleton();
        const maxChars = settings.maxBoardPostChars || 500;

        if (!content && !image) {
            return NextResponse.json({ error: 'Content or image is required' }, { status: 400 });
        }
        if (content && content.length > maxChars) {
            return NextResponse.json({ error: `Content must be up to ${maxChars} characters` }, { status: 400 });
        }

        let imageUrl = undefined;
        if (image) {
            if (typeof image !== 'string' || !image.startsWith('data:image')) {
                return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
            }
            // Backend size check: ~5MB base64 ≈ 6.9M chars
            if (image.length > 7 * 1024 * 1024) {
                return NextResponse.json({ error: 'Image too large. Max 5MB allowed.' }, { status: 400 });
            }
            // Stricter rate limit for image uploads: 5 per hour
            const imgRl = await checkRateLimit(decoded.userId, 'board-image-upload', 5, 60 * 60 * 1000);
            if (!imgRl.success) {
                return NextResponse.json(
                    { error: 'Too many image uploads. Max 5 per hour.', retryAfter: imgRl.resetTime ? Math.ceil((imgRl.resetTime.getTime() - Date.now()) / 1000) : 3600 },
                    { status: 429 }
                );
            }
            try {
                const { uploadToCloudinary } = await import('@/lib/cloudinary');
                imageUrl = await uploadToCloudinary(image, 'recircle/boards');
            } catch (error) {
                console.error('Image upload error:', error);
                return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
            }
        }

        if (!communityId || !isValidObjectId(communityId)) {
            return NextResponse.json({ error: 'Valid Community ID required' }, { status: 400 });
        }

        // Validate category
        const validCategories = ['General', 'LostFound', 'Rides', 'Tickets', 'Housing', 'Academic', 'Opportunities', 'Alerts'];
        if (category && !validCategories.includes(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }

        // --- Visibility Hardening for Board Posting ---
        const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
        const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === communityId);
        const isAdmin = currentUser?.role === 'admin';
        
        if (!isMember && !isAdmin) {
            return NextResponse.json({ error: 'You must be a verified member of this campus to post.' }, { status: 403 });
        }

        // --- Maintenance Mode Check (Write Guard) ---
        const Community = (await import('@/models/Community')).default;
        const commObj = await Community.findById(communityId).select('isActive name');
        if (commObj && !commObj.isActive && !isAdmin) {
            return NextResponse.json({ error: `The ${commObj.name} circle is in maintenance. New posts are disabled.` }, { status: 503 });
        }

        const newPost = await BoardPost.create({
            author: decoded.userId,
            community: communityId,
            content: content?.trim() || '',
            category: category || 'General',
            image: imageUrl
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

        // --- ANTI-BOARD INTERACTION SPAM SHIELD ---
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const isVoteAction = action === 'upvote' || action === 'downvote';
        const actionKey = isVoteAction ? 'board-upvote' : 'board-reply';
        const limitPerMinute = isVoteAction ? 20 : 10;
        
        const rl = await checkRateLimit(decoded.userId, actionKey, limitPerMinute, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { 
                    error: `You are ${isVoteAction ? 'voting' : 'replying'} too quickly. Please wait a minute.`,
                    retryAfter: rl.resetTime ? Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000) : 60
                },
                { status: 429 }
            );
        }

        const post = await BoardPost.findById(postId);
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        const userId = new Types.ObjectId(decoded.userId);

        // --- Visibility Hardening for Board Interactions ---
        const currentUser = await User.findById(decoded.userId).select('verifiedCommunities role');
        const isMember = currentUser?.verifiedCommunities?.some((cId: any) => cId.toString() === post.community.toString());
        const isAdmin = currentUser?.role === 'admin';

        if (!isMember && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized interaction.' }, { status: 403 });
        }

        // --- Maintenance Mode Check (Interaction Guard) ---
        const Community = (await import('@/models/Community')).default;
        const commObj = await Community.findById(post.community).select('isActive name');
        if (commObj && !commObj.isActive && !isAdmin) {
            return NextResponse.json({ error: `The ${commObj.name} circle is in maintenance. Interactions are disabled.` }, { status: 503 });
        }

        if (action === 'upvote') {
            if (!post.upvotes) post.upvotes = [];
            if (!post.downvotes) post.downvotes = [];

            // Remove from downvotes if present (mutual exclusion)
            const downIndex = post.downvotes.findIndex((id: any) => id.toString() === decoded.userId);
            if (downIndex > -1) {
                post.downvotes.splice(downIndex, 1);
            }

            // Toggle upvote
            const upIndex = post.upvotes.findIndex((id: any) => id.toString() === decoded.userId);
            if (upIndex > -1) {
                post.upvotes.splice(upIndex, 1);
            } else {
                post.upvotes.push(userId);
            }

            await post.save();

            const updatedPost = await BoardPost.findById(postId)
                .populate('author', 'name profilePicture username')
                .populate('replies.author', 'name profilePicture username')
                .lean();

            return NextResponse.json({ success: true, post: updatedPost }, { status: 200 });
        } 
        
        else if (action === 'downvote') {
            if (!post.upvotes) post.upvotes = [];
            if (!post.downvotes) post.downvotes = [];

            // Remove from upvotes if present (mutual exclusion)
            const upIndex = post.upvotes.findIndex((id: any) => id.toString() === decoded.userId);
            if (upIndex > -1) {
                post.upvotes.splice(upIndex, 1);
            }

            // Toggle downvote
            const downIndex = post.downvotes.findIndex((id: any) => id.toString() === decoded.userId);
            if (downIndex > -1) {
                post.downvotes.splice(downIndex, 1);
            } else {
                post.downvotes.push(userId);
            }

            await post.save();

            const updatedPost = await BoardPost.findById(postId)
                .populate('author', 'name profilePicture username')
                .populate('replies.author', 'name profilePicture username')
                .lean();

            return NextResponse.json({ success: true, post: updatedPost }, { status: 200 });
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
                .populate('replies.author', 'name profilePicture username')
                .lean();
                
            return NextResponse.json({ success: true, post: updatedPost }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Board PATCH error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const postId = searchParams.get('postId');
        const replyId = searchParams.get('replyId');

        if (!postId || !isValidObjectId(postId)) {
            return NextResponse.json({ error: 'Valid Post ID required' }, { status: 400 });
        }

        await connectToDatabase();
        const post = await BoardPost.findById(postId);
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        const userDoc = await User.findById(decoded.userId).select('role');
        const isAdmin = userDoc?.role === 'admin';

        // CASE 1: Deleting a specific reply
        if (replyId) {
            const reply = post.replies?.find((r: any) => r._id.toString() === replyId);
            if (!reply) return NextResponse.json({ error: 'Reply not found' }, { status: 404 });

            if (reply.author.toString() !== decoded.userId && !isAdmin && post.author.toString() !== decoded.userId) {
                return NextResponse.json({ error: 'Unauthorized to delete this reply' }, { status: 403 });
            }

            post.replies = post.replies.filter((r: any) => r._id.toString() !== replyId);
            await post.save();
            return NextResponse.json({ success: true, message: 'Reply deleted' }, { status: 200 });
        }

        if (post.author.toString() !== decoded.userId && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized to delete this post' }, { status: 403 });
        }

        if (post.image) {
            try {
                const { deleteFromCloudinary } = await import('@/lib/cloudinary');
                await deleteFromCloudinary(post.image);
            } catch (err) {
                console.error("Failed to delete image from cloudinary", err);
            }
        }

        await BoardPost.findByIdAndDelete(postId);
        return NextResponse.json({ success: true, message: 'Post deleted' }, { status: 200 });

    } catch (error: any) {
        console.error('Board DELETE error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
