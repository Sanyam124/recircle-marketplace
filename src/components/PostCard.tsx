'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatTimeAgo } from '@/lib/utils';
import ExpandableText from '@/components/ExpandableText';
import { PostCardHeader, PostCardActions, ReplyItem } from './board/PostCardComponents';

interface Post {
    _id: string;
    content: string;
    category: 'General' | 'LostFound' | 'Rides' | 'Tickets' | 'Housing' | 'Academic' | 'Opportunities' | 'Alerts';
    author: {
        _id: string;
        name: string;
        username: string;
        profilePicture?: string;
    };
    upvotes: string[];
    downvotes?: string[];
    replies: any[];
    createdAt: string;
}

interface PostCardProps {
    post: Post;
    user: any;
    toggleUpvote: (id: string) => void;
    toggleDownvote: (id: string) => void;
    handleReply: (id: string, content: string) => void;
    replyingTo?: string | null;
    setReplyingTo?: (id: string | null) => void;
    replyContent?: string;
    setReplyContent?: (val: string) => void;
    replySubmitting: boolean;
    maxReplyChars: number;
    onDeletePost: (id: string) => void;
    onDeleteReply: (postId: string, replyId: string) => void;
}

export default function PostCard({
    post, user, toggleUpvote, toggleDownvote, handleReply,
    replySubmitting, maxReplyChars,
    onDeletePost, onDeleteReply
}: PostCardProps) {
    const postRef = useRef<HTMLDivElement>(null);
    const [repliesVisible, setRepliesVisible] = useState(false);
    const [repliesLimit, setRepliesLimit] = useState(5);
    // Per-post local reply state — fully independent of other PostCards
    const [localReplyContent, setLocalReplyContent] = useState('');
    const [localReplyingTo, setLocalReplyingTo] = useState<string | null>(null);

    const authorId = typeof post.author === 'object' ? (post.author._id || (post.author as any).id) : post.author;
    const isAuthor = user && (user.id === String(authorId) || (user as any)._id === String(authorId));
    const isAdmin = user?.role === 'admin';
    const canDeletePost = isAuthor || isAdmin;

    const categories: any = {
        'General': { name: 'General', icon: '💬', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
        'LostFound': { name: 'Lost & Found', icon: '🔍', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
        'Rides': { name: 'Carpool & Rides', icon: '🚗', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
        'Tickets': { name: 'Event Passes', icon: '🎟️', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
        'Housing': { name: 'Flatmates', icon: '🏠', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
        'Academic': { name: 'Academic Help', icon: '📚', color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' },
        'Opportunities': { name: 'Gigs & Interns', icon: '💼', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
        'Alerts': { name: 'Alerts', icon: '🚨', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' }
    };

    const cat = categories[post.category || 'General'];
    const currentUserIdStr = String(user?._id || user?.id);
    const isUpvoted = post.upvotes?.includes(currentUserIdStr);
    const isDownvoted = post.downvotes?.includes(currentUserIdStr);

    const scrollPostToTop = () => {
        setTimeout(() => {
            const element = postRef.current;
            if (element) {
                const offset = element.getBoundingClientRect().top + window.pageYOffset - 135;
                window.scrollTo({ top: offset, behavior: 'smooth' });
            }
        }, 100);
    };

    const sortedReplies = [...(post.replies || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const visibleReplies = sortedReplies.slice(0, repliesLimit);

    return (
        <div ref={postRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-4 transition-all animate-in fade-in slide-in-from-bottom-4 scroll-mt-[130px]">
            <div className="flex items-start gap-3 sm:gap-4">
                <Link href={`/profile/${post.author?._id}`} className="shrink-0 transition-transform hover:scale-105 active:scale-95">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
                        {post.author?.profilePicture && !post.author.profilePicture.includes('??') ? (
                            <Image src={post.author.profilePicture} alt={post.author?.name || 'User'} width={40} height={40} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">
                                {(post.author?.name?.[0] || post.author?.username?.[0] || 'U').toUpperCase()}
                            </span>
                        )}
                    </div>
                </Link>
                <div className="flex-1 min-w-0">
                    <PostCardHeader post={post} user={user} canDeletePost={canDeletePost} onDeletePost={onDeletePost} cat={cat} />
                    <ExpandableText text={post.content} maxLines={5} showReadMore={true} onCollapse={scrollPostToTop} className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed" />
                    <PostCardActions post={post} isUpvoted={isUpvoted} isDownvoted={isDownvoted} toggleUpvote={toggleUpvote} toggleDownvote={toggleDownvote} repliesVisible={repliesVisible} setRepliesVisible={setRepliesVisible} setReplyingTo={setLocalReplyingTo} />
                    
                    {repliesVisible && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-3 items-center">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 shrink-0 flex items-center justify-center font-bold text-indigo-600 text-[10px] overflow-hidden border border-indigo-100/50">
                                    {user?.profilePicture && !user.profilePicture.includes('??') ? (
                                        <Image src={user.profilePicture} alt="You" width={32} height={32} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <span>{(user?.name?.[0] || user?.username?.[0] || 'U').toUpperCase()}</span>
                                    )}
                                </div>
                                <input type="text" placeholder="Add a comment..." className="flex-1 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-xs py-2 px-4 focus:ring-1 focus:ring-indigo-500 shadow-inner" value={localReplyContent} onChange={(e) => setLocalReplyContent(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && localReplyContent.trim()) { handleReply(post._id, localReplyContent.trim()); setLocalReplyContent(''); }}} maxLength={maxReplyChars} />
                                <button onClick={() => { if (localReplyContent.trim()) { handleReply(post._id, localReplyContent.trim()); setLocalReplyContent(''); }}} disabled={replySubmitting || !localReplyContent.trim()} className="text-indigo-600 dark:text-indigo-400 text-xs font-black disabled:opacity-30">POST</button>
                            </div>
                            <div className="space-y-3 pl-4 sm:pl-6 border-l-2 border-gray-50 dark:border-gray-700/50">
                                {visibleReplies.map(reply => <ReplyItem key={reply._id} reply={reply} user={user} isAdmin={isAdmin} isAuthor={isAuthor} onDeleteReply={onDeleteReply} post={post} formatTimeAgo={formatTimeAgo} />)}
                                {post.replies.length > repliesLimit ? (
                                    <button onClick={() => setRepliesLimit(prev => prev + 10)} className="text-xs font-black text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-all pt-3 uppercase tracking-tighter relative z-10 opacity-100 visible block w-full text-left appearance-none touch-manipulation cursor-pointer">Load more replies</button>
                                ) : (
                                    repliesLimit > 5 && (
                                        <button onClick={() => { setRepliesLimit(5); scrollPostToTop(); }} className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-all pt-3 uppercase tracking-tighter flex items-center gap-1 relative z-10 opacity-100 visible appearance-none touch-manipulation cursor-pointer">
                                            Collapse All
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
