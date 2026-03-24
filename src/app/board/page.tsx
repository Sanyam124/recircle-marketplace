'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PostSkeleton, ProfileSkeleton } from '@/components/Skeletons';
import { formatTimeAgo } from '@/lib/utils';
import Link from 'next/link';

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
    createdAt: string;
    expiresAt: string;
}

export default function BoardPage() {
    const { user, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    const initialCommunityId = searchParams.get('communityId') || '';
    const [selectedCommunityId, setSelectedCommunityId] = useState<string>(initialCommunityId);
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const isFirstRender = useRef(true);

    // Sync state to URL
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (selectedCommunityId) {
            const params = new URLSearchParams();
            params.set('communityId', selectedCommunityId);
            router.push(`/board?${params.toString()}`, { scroll: false });
        }
    }, [selectedCommunityId]); // Only sync when community selection changes

    // Verification check & initial community selection
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push(`/auth?redirect=${encodeURIComponent('/board')}`);
                return;
            }
            if (user?.verifiedCommunities && user.verifiedCommunities.length > 0 && !selectedCommunityId) {
                const firstId = (user.verifiedCommunities[0] as any)._id || (user.verifiedCommunities[0] as any).id || user.verifiedCommunities[0];
                setSelectedCommunityId(firstId);
            }
        }
    }, [user, authLoading, router]);

    // Load posts when community is changed
    useEffect(() => {
        if (selectedCommunityId) {
            fetchPosts(selectedCommunityId);
        }
    }, [selectedCommunityId]);

    const fetchPosts = async (communityId: string) => {
        setLoadingPosts(true);
        try {
            const res = await fetch(`/api/board?communityId=${communityId}`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts || []);
            }
        } catch (err) {
            console.error('Failed to load posts:', err);
        } finally {
            setLoadingPosts(false);
        }
    };

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
                const data = await res.json();
                setPosts([data.post, ...posts]); // Optimistic prepend
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
                body: JSON.stringify({ postId })
            });

            if (res.ok) {
                const { upvotes: count, isUpvoted } = await res.json();
                setPosts(posts.map(post => {
                    if (post._id === postId) {
                        return { 
                            ...post, 
                            upvotes: isUpvoted 
                                ? [...(post.upvotes || []), (user as any)?._id] 
                                : (post.upvotes || []).filter(id => id !== (user as any)?._id)
                        };
                    }
                    return post;
                }));
            }
        } catch (err) {
            console.error('Upvote failed:', err);
        }
    };

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors">
                <div className="space-y-8">
                    <ProfileSkeleton />
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
                    </div>
                </div>
            </div>
        );
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
            {/* Board Header & Switcher */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-[64px] z-30 transition-colors">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <span className="text-xl">🏛️</span>
                         <h1 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Circle Board</h1>
                    </div>
                    
                    <select
                        className="bg-gray-50 dark:bg-gray-700/50 border-none rounded-lg text-sm font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 py-1.5 pl-3 pr-8 shadow-sm transition-all"
                        value={selectedCommunityId}
                        onChange={(e) => setSelectedCommunityId(e.target.value)}
                    >
                        {user?.verifiedCommunities?.map((c: any) => (
                            <option key={c._id || c.id || c} value={c._id || c.id || c}>
                                🏢 {c.name || 'Your Community'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Create Post Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6 transition-all hover:shadow-md">
                    <form onSubmit={handleCreatePost}>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 border border-indigo-200 dark:border-indigo-800">
                                {user?.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    className="w-full bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-0 text-sm py-2 resize-none min-h-[40px] max-h-[160px]"
                                    placeholder={`What's happening at ${selectedCommunity?.name || 'campus'}?`}
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    maxLength={500}
                                    required
                                />
                                {error && <p className="text-[10px] text-red-500 font-bold mb-2">{error}</p>}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                    <div className="flex items-center gap-4">
                                         <span className="text-[10px] text-gray-400 font-medium">🕒 Posts expire in 48h</span>
                                         <span className={`text-[10px] font-bold ${newPostContent.length >= 450 ? 'text-red-500' : 'text-gray-300'}`}>
                                            {newPostContent.length}/500
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
                    {loadingPosts ? (
                         <div className="space-y-4">
                            {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
                         </div>
                    ) : posts.length === 0 ? (
                        <div className="py-20 text-center text-gray-500 dark:text-gray-400 italic">
                             🏖️ Quiet today. Be the first to start the conversation.
                        </div>
                    ) : (
                        posts.map(post => (
                            <div key={post._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 transition-all animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600">
                                        {post.author.profilePicture ? (
                                             <img src={post.author.profilePicture} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400 font-bold text-xs">{post.author.name?.[0].toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900 dark:text-white text-sm truncate">{post.author.name}</span>
                                            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-tight">@{post.author.username} · {formatTimeAgo(post.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                                        
                                        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50">
                                            <button 
                                                onClick={() => toggleUpvote(post._id)}
                                                className={`flex items-center gap-2 group transition-all text-xs font-bold ${post.upvotes?.includes((user as any)?._id) ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'}`}
                                            >
                                                <div className={`p-1.5 rounded-full transition-colors ${post.upvotes?.includes((user as any)?._id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10'}`}>
                                                    <svg className="w-4 h-4" fill={post.upvotes?.includes((user as any)?._id) ? "currentColor" : "none" } stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                                                    </svg>
                                                </div>
                                                <span>{post.upvotes?.length || 0}</span>
                                            </button>

                                            {(user as any)?._id !== post.author._id && (
                                                <Link 
                                                    href={`/chat/${post.author._id}?autoMsg=true`}
                                                    className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 group transition-all text-xs font-bold"
                                                >
                                                    <div className="p-1.5 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                    </div>
                                                    <span>Chat</span>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-center">
                                         {/* Potential menu toggle */}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
