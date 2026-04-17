'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PostSkeleton, BoardPageSkeleton } from '@/components/Skeletons';
import { formatTimeAgo } from '@/lib/utils';
import ExpandableText from '@/components/ExpandableText';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import RateLimitScreen from '@/components/RateLimitScreen';

interface Post {
    _id: string;
    content: string;
    author: {
        _id: string;
        name: string;
        username: string;
        profilePicture?: string;
    };
    upvotes: string[];
    replies: {
        _id: string;
        author: {
            _id: string;
            name: string;
            username: string;
            profilePicture?: string;
        };
        content: string;
        createdAt: string;
    }[];
    createdAt: string;
    expiresAt: string;
}

function BoardPageContent() {
    const { user, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selectedCommunityId = searchParams.get('communityId') || '';
    const [page, setPage] = useState(1);
    const [allPosts, setAllPosts] = useState<Post[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    
    // SWR Fetching
    const { data, error: postsError, isLoading: loadingPosts, mutate } = useSWR(
        user && selectedCommunityId ? `/api/board?communityId=${selectedCommunityId}&page=${page}&limit=20` : null,
        { refreshInterval: 60000 } // Auto-refresh every minute
    );

    const isRateLimited = postsError?.status === 429;

    // Reset when community changes
    useEffect(() => {
        setPage(1);
        setAllPosts([]);
        setHasMore(true);
        setInitialLoading(true);
    }, [selectedCommunityId]);

    // Update allPosts when data changes
    useEffect(() => {
        if (data && data.posts) {
            if (page === 1) {
                setAllPosts(data.posts);
                setInitialLoading(false);
            } else {
                // Append unique posts
                setAllPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const newUnique = data.posts.filter((p: any) => !existingIds.has(p._id));
                    return [...prev, ...newUnique];
                });
            }
            
            // Check if we reached the end
            if (data.posts.length < 20 || (data.pagination && page >= data.pagination.totalPages)) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        }
    }, [data, page]);

    const [newPostContent, setNewPostContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);
    const isFirstRender = useRef(true);

    const { data: siteConfig } = useSWR('/api/site-config');
    const maxPostChars = siteConfig?.maxBoardPostChars || 500;
    const maxReplyChars = siteConfig?.maxBoardReplyChars || 300;

    // Sync URL -> State (Initial selection)
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push(`/auth?redirect=${encodeURIComponent('/board')}`);
                return;
            }
            if (user?.verifiedCommunities && user.verifiedCommunities.length > 0 && !selectedCommunityId) {
                const firstId = (user.verifiedCommunities[0] as any)._id || (user.verifiedCommunities[0] as any).id || user.verifiedCommunities[0];
                const params = new URLSearchParams(searchParams.toString());
                params.set('communityId', firstId);
                router.replace(`/board?${params.toString()}`, { scroll: false });
            }
        }
    }, [user, authLoading, router, selectedCommunityId, searchParams]);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostContent.trim() || !selectedCommunityId) return;

        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newPostContent.trim(),
                    communityId: selectedCommunityId
                })
            });

            if (res.ok) {
                mutate(); 
                setNewPostContent('');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to post.');
            }
        } catch (err) {
            setError('Something went wrong. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleUpvote = async (postId: string) => {
        try {
            const res = await fetch('/api/board', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, action: 'upvote' })
            });

            if (res.ok) {
                mutate();
            }
        } catch (err) {
            console.error('Upvote failed:', err);
        }
    };

    const handleReply = async (postId: string) => {
        if (!replyContent.trim()) return;
        setReplySubmitting(true);
        try {
            const res = await fetch('/api/board', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    postId, 
                    action: 'reply',
                    content: replyContent.trim()
                })
            });

            if (res.ok) {
                mutate();
                setReplyContent('');
                setReplyingTo(null);
            }
        } catch (err) {
            console.error('Reply failed:', err);
        } finally {
            setReplySubmitting(false);
        }
    };

    if (isRateLimited) {
        return <RateLimitScreen onRetry={() => mutate()} />;
    }

    if (authLoading || (!user && !authLoading)) {
        return <BoardPageSkeleton />;
    }

    if (user && (!user.verifiedCommunities || user.verifiedCommunities.length === 0)) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 inline-block max-w-lg border border-gray-100 dark:border-gray-700">
                    <span className="text-6xl mb-6 block">🔒</span>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4 italic uppercase tracking-tighter">Community Only Access</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                        The Circle Board is a private space for verified campus communities. You must verify your account with a community to join the conversation.
                    </p>
                    <Link href="/settings" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]">
                        Join a Community
                    </Link>
                </div>
            </div>
        );
    }

    const selectedCommunity = (user?.verifiedCommunities || []).find((c: any) => (c._id || c.id || c) === selectedCommunityId);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors overflow-x-clip">
            {/* Board Header & Switcher */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-[65px] z-30 transition-colors">
                <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                         <span className="text-lg sm:text-xl shrink-0">🏛️</span>
                         <h1 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-sm sm:text-base truncate pr-1">Circle Board</h1>
                    </div>
                    
                    <select
                        className="bg-gray-50 dark:bg-gray-700/50 border-none rounded-lg text-[11px] sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 py-1 sm:py-1.5 pl-2 sm:pl-3 pr-7 sm:pr-8 shadow-sm transition-all max-w-[140px] sm:max-w-[220px] truncate"
                        value={selectedCommunityId}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('communityId', e.target.value);
                            router.push(`/board?${params.toString()}`, { scroll: false });
                        }}
                    >
                        {user?.verifiedCommunities?.map((c: any) => (
                            <option key={c._id || c.id || c} value={c._id || c.id || c}>
                                🏢 {c.name || 'Your Community'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
                {/* Create Post Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-4 mb-6 transition-all hover:shadow-md">
                    <form onSubmit={handleCreatePost}>
                        <div className="flex gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 border border-indigo-200 dark:border-indigo-800 overflow-hidden shadow-sm">
                                {user?.profilePicture ? (
                                    <Image 
                                      src={user.profilePicture} 
                                      alt="You" 
                                      width={40} 
                                      height={40} 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    user?.name?.[0]?.toUpperCase()
                                )}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    className="w-full bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-0 text-sm py-2 pl-1 resize-none min-h-[40px] max-h-[160px]"
                                    placeholder={`What's happening at ${selectedCommunity?.name || 'campus'}?`}
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    maxLength={maxPostChars}
                                    required
                                />
                                {error && <p className="text-[10px] text-red-500 font-bold mb-2">{error}</p>}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                    <div className="flex items-center gap-4">
                                         <span className="text-[10px] text-gray-400 font-medium">🕒 Posts expire in 48h</span>
                                          <span className={`text-[10px] font-bold ${newPostContent.length >= (maxPostChars - 50) ? 'text-red-500' : 'text-gray-300'}`}>
                                            {newPostContent.length}/{maxPostChars}
                                          </span>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={submitting || !newPostContent.trim()}
                                        className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-[0.98]"
                                    >
                                        {submitting ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Posts Timeline */}
                <div className="space-y-4">
                    {initialLoading ? <BoardPageSkeleton /> : allPosts.length === 0 ? (
                        <div className="py-20 text-center text-gray-500 dark:text-gray-400 italic">
                             🏖️ Quiet today. Be the first to start the conversation.
                        </div>
                    ) : (
                        <>
                            {allPosts.map(post => (
                                <PostCard 
                                    key={post._id} 
                                    post={post} 
                                    user={user} 
                                    toggleUpvote={toggleUpvote}
                                    handleReply={handleReply}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                    replyContent={replyContent}
                                    setReplyContent={setReplyContent}
                                    replySubmitting={replySubmitting}
                                    maxReplyChars={maxReplyChars}
                                />
                            ))}
                            
                            {/* Load More Button */}
                            {hasMore && (
                                <div className="pt-6 text-center">
                                    <button
                                        onClick={() => setPage(prev => prev + 1) }
                                        disabled={loadingPosts}
                                        className="inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {loadingPosts ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Fetching...
                                            </>
                                        ) : (
                                            'Load Older Posts'
                                        )}
                                    </button>
                                </div>
                            )}
                            
                            {!hasMore && allPosts.length > 5 && (
                                <p className="text-center text-gray-400 dark:text-gray-600 text-[10px] font-bold uppercase tracking-widest pt-8">
                                    ✨ You've reached the end of the circle
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function PostCard({ 
    post, 
    user, 
    toggleUpvote, 
    handleReply, 
    replyingTo, 
    setReplyingTo,
    replyContent,
    setReplyContent,
    replySubmitting,
    maxReplyChars
}: { 
    post: Post; 
    user: any; 
    toggleUpvote: (id: string) => void; 
    handleReply: (id: string) => void;
    replyingTo: string | null;
    setReplyingTo: (id: string | null) => void;
    replyContent: string;
    setReplyContent: (val: string) => void;
    replySubmitting: boolean;
    maxReplyChars: number;
}) {
    const postRef = useRef<HTMLDivElement>(null);
    const [repliesVisible, setRepliesVisible] = useState(false);
    const [repliesLimit, setRepliesLimit] = useState(5);

    const scrollPostToTop = () => {
        setTimeout(() => {
            const element = postRef.current;
            if (element) {
                const headerOffset = 135; 
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        }, 100);
    };

    const sortedReplies = [...(post.replies || [])].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const visibleReplies = sortedReplies.slice(0, repliesLimit);
    const hasMoreReplies = (post.replies?.length || 0) > repliesLimit;

    return (
        <div ref={postRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-4 transition-all animate-in fade-in slide-in-from-bottom-4 scroll-mt-[130px]">
            <div className="flex items-start gap-3 sm:gap-4">
                <Link href={`/profile/${post.author._id}`} className="shrink-0 transition-transform hover:scale-105 active:scale-95">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
                        {post.author?.profilePicture ? (
                                <Image src={post.author.profilePicture} alt={post.author?.name || 'User'} width={40} height={40} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="text-gray-500 dark:text-gray-400 font-bold text-xs">{post.author?.name?.[0].toUpperCase() || '?'}</span>
                        )}
                    </div>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Link href={`/profile/${post.author?._id}`} className="group flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                            <span className="font-bold text-gray-900 dark:text-white text-sm truncate uppercase tracking-tight italic group-hover:text-indigo-600 transition-colors">{post.author?.name || 'Deleted User'}</span>
                            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-tight">@{post.author?.username || 'deleted'}</span>
                        </Link>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-tight">{formatTimeAgo(post.createdAt)}</span>
                    </div>
                    
                    <ExpandableText text={post.content} maxLines={5} showReadMore={true} onCollapse={scrollPostToTop} className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed" />
                    
                    <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50">
                        <button onClick={() => toggleUpvote(post._id)} className={`flex items-center gap-2 group transition-all text-xs font-bold ${post.upvotes?.includes((user as any)?._id) ? 'text-indigo-600 dark:text-indigo-400 scale-105' : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'}`}>
                            <div className={`p-1.5 rounded-full transition-colors ${post.upvotes?.includes((user as any)?._id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10'}`}>
                                <svg className="w-4 h-4" fill={post.upvotes?.includes((user as any)?._id) ? "currentColor" : "none" } stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                                </svg>
                            </div>
                            <span>{post.upvotes?.length || 0}</span>
                        </button>

                        <button onClick={() => { setRepliesVisible(!repliesVisible); if (!repliesVisible) setReplyingTo(post._id); else if (replyingTo === post._id) setReplyingTo(null); }} className={`flex items-center gap-2 group transition-all text-xs font-bold ${repliesVisible ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'}`}>
                            <div className={`p-1.5 rounded-full transition-colors ${repliesVisible ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <span>{post.replies?.length || 0} Replies</span>
                        </button>
                    </div>

                    {repliesVisible && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-3 items-center">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 shrink-0 flex items-center justify-center font-bold text-indigo-600 text-[10px] border border-indigo-100/50 dark:border-indigo-800/30 overflow-hidden shadow-sm">
                                    {user?.profilePicture ? <Image src={user.profilePicture} alt="You" width={32} height={32} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : user?.name?.[0].toUpperCase()}
                                </div>
                                <input type="text" placeholder="Add a comment..." className="flex-1 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-xs py-2 px-4 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 shadow-inner" value={replyingTo === post._id ? replyContent : ''} onFocus={() => setReplyingTo(post._id)} onKeyDown={(e) => { if (e.key === 'Enter') { setReplyingTo(post._id); handleReply(post._id); } }} onChange={(e) => { setReplyingTo(post._id); setReplyContent(e.target.value); }} maxLength={maxReplyChars} />
                                <button onClick={() => handleReply(post._id)} disabled={replySubmitting || !replyContent.trim() || replyingTo !== post._id} className="text-indigo-600 dark:text-indigo-400 text-xs font-black disabled:opacity-30 hover:text-indigo-800 transition-colors">
                                    {replySubmitting ? '...' : 'POST'}
                                </button>
                            </div>

                            <div className="space-y-3 pl-4 sm:pl-6 border-l-2 border-gray-50 dark:border-gray-700/50">
                                {visibleReplies.map(reply => (
                                    <div key={reply._id} className="flex items-start gap-3 animate-in fade-in duration-300">
                                        <Link href={`/profile/${reply.author._id}`} className="shrink-0 transition-transform hover:scale-105 active:scale-95">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden">
                                                {reply.author?.profilePicture ? <Image src={reply.author.profilePicture} alt={reply.author?.name || 'User'} width={24} height={24} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="text-[8px] flex items-center justify-center h-full font-bold text-gray-400">{reply.author?.name?.[0].toUpperCase() || '?'}</span>}
                                            </div>
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <Link href={`/profile/${reply.author?._id}`} className="flex flex-col group">
                                                    <span className="font-bold text-gray-900 dark:text-white text-[11px] uppercase tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{reply.author?.name || 'Deleted user'}</span>
                                                    <span className="text-gray-400 dark:text-gray-500 text-[9px] font-medium tracking-tighter">@{reply.author?.username || 'deleted'}</span>
                                                </Link>
                                                <span className="text-gray-300 dark:text-gray-600 self-center">·</span>
                                                <span className="text-gray-400 dark:text-gray-500 text-[10px] self-center">{formatTimeAgo(reply.createdAt)}</span>
                                            </div>
                                            <ExpandableText text={reply.content} maxLines={4} showReadMore={true} onCollapse={scrollPostToTop} className="text-gray-800 dark:text-gray-200 text-xs leading-relaxed" />
                                        </div>
                                    </div>
                                ))}

                                {hasMoreReplies && (
                                    <button onClick={() => setRepliesLimit(prev => prev + 10)} className="text-xs font-black text-gray-400 hover:text-indigo-600 transition-colors pt-2 uppercase tracking-tighter">Load more</button>
                                )}
                                
                                {repliesVisible && (post.replies?.length || 0) > 0 && (
                                    <button onClick={() => { setRepliesVisible(false); setRepliesLimit(5); setTimeout(() => { postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }} className="text-xs font-black text-gray-400 hover:text-red-500 transition-colors pt-2 uppercase tracking-tighter ml-4">Hide replies</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BoardPage() {
    return (
        <Suspense fallback={<BoardPageSkeleton />}>
            <BoardPageContent />
        </Suspense>
    );
}
