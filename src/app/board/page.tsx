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
import { showSuccess } from '@/lib/confirm';

import PostCard from '@/components/PostCard';

interface Post {
    _id: string;
    content: string;
    category: 'General' | 'LostFound' | 'Essentials' | 'Events' | 'Alerts';
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
    const { user, loading: authLoading, authFetch } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selectedCommunityId = searchParams.get('communityId') || '';
    const [page, setPage] = useState(1);
    const [allPosts, setAllPosts] = useState<Post[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    
    // Board State
    const [newPostContent, setNewPostContent] = useState('');
    const [postCategory, setPostCategory] = useState('General');
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);

    const { data: siteConfig } = useSWR('/api/site-config');
    const maxPostChars = siteConfig?.maxBoardPostChars || 500;
    const maxReplyChars = siteConfig?.maxBoardReplyChars || 300;

    const flashInfo = () => {
        setShowInfo(true);
        setTimeout(() => setShowInfo(false), 4000);
    };

    const categories = [
        { id: 'All', name: 'All Activity', icon: '🏛️' },
        { id: 'General', name: 'General', icon: '💬' },
        { id: 'LostFound', name: 'Lost & Found', icon: '🔍' },
        { id: 'Essentials', name: 'Essentials', icon: '🥤' },
        { id: 'Events', name: 'Events', icon: '🎉' },
        { id: 'Alerts', name: 'Alerts', icon: '🚨' },
    ];

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // SWR Fetching
    const fetcher = async (url: string) => {
        const res = await authFetch(url);
        if (!res.ok) {
            const error: any = new Error('An error occurred while fetching the board.');
            error.info = await res.json().catch(() => ({}));
            error.status = res.status;
            throw error;
        }
        return res.json();
    };

    const { data, error: postsError, isLoading: loadingPosts, mutate } = useSWR(
        user && selectedCommunityId 
            ? `/api/board?communityId=${selectedCommunityId}&page=${page}&limit=20&category=${activeCategory}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}` 
            : null,
        fetcher,
        { refreshInterval: 60000, shouldRetryOnError: false }
    );

    const isAPIMaintenance = postsError?.status === 503;

    // --- Effects & Lifecycle ---
    
    // 1. Reset when community or category or search changes
    useEffect(() => {
        setPage(1);
        setAllPosts([]);
        setHasMore(true);
        setInitialLoading(true);
        
        // Sync post category with active tab (Default to General if in All)
        if (activeCategory === 'All') {
            setPostCategory('General');
        } else {
            setPostCategory(activeCategory);
        }
    }, [selectedCommunityId, activeCategory, debouncedSearch]);

    // 2. Sync URL -> Default Community
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push(`/auth?redirect=${encodeURIComponent('/board')}`);
                return;
            }
            if (user?.verifiedCommunities && user.verifiedCommunities.length > 0 && !selectedCommunityId) {
                const first = user.verifiedCommunities[0] as any;
                const firstId = first._id || first.id || first;
                const params = new URLSearchParams(searchParams.toString());
                params.set('communityId', firstId);
                router.replace(`/board?${params.toString()}`, { scroll: false });
            }
        }
    }, [user, authLoading, router, selectedCommunityId, searchParams]);

    // 3. Update Feed when data arrives
    useEffect(() => {
        if (data?.posts) {
            if (page === 1) {
                setAllPosts(data.posts);
                setInitialLoading(false);
            } else {
                setAllPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const newUnique = data.posts.filter((p: any) => !existingIds.has(p._id));
                    return [...prev, ...newUnique];
                });
            }
            setHasMore(!(data.posts.length < 20 || (data.pagination && page >= data.pagination.totalPages)));
        }
    }, [data, page]);

    // --- Actions ---

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostContent.trim() || !selectedCommunityId) return;

        setSubmitting(true);
        setError('');
        try {
            const res = await authFetch('/api/board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: newPostContent.trim(), 
                    communityId: selectedCommunityId,
                    category: postCategory
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
            setError('Connection error.');
        } finally {
            setSubmitting(false);
        }
    };
    // ... all other actions (toggleUpvote, handleReply, handleDeletePost, handleDeleteReply) stay the same ...

    const toggleUpvote = async (postId: string) => {
        try {
            const res = await authFetch('/api/board', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, action: 'upvote' })
            });
            if (res.ok) mutate();
        } catch (err) {
            console.error('Upvote error:', err);
        }
    };

    const handleReply = async (postId: string) => {
        if (!replyContent.trim()) return;
        setReplySubmitting(true);
        try {
            const res = await authFetch('/api/board', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, action: 'reply', content: replyContent.trim() })
            });
            if (res.ok) {
                mutate();
                setReplyContent('');
                setReplyingTo(null);
            }
        } catch (err) {
            console.error('Reply error:', err);
        } finally {
            setReplySubmitting(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            const res = await authFetch(`/api/board?postId=${postId}`, { method: 'DELETE' });
            if (res.ok) {
                mutate();
                setAllPosts(prev => prev.filter(p => p._id !== postId));
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) {
            console.error('Delete error');
        }
    };

    const handleDeleteReply = async (postId: string, replyId: string) => {
        if (!window.confirm('Delete this reply?')) return;
        try {
            const res = await authFetch(`/api/board?postId=${postId}&replyId=${replyId}`, { method: 'DELETE' });
            if (res.ok) mutate();
            else alert('Failed to delete.');
        } catch (err) {
            console.error('Delete error');
        }
    };

    if (authLoading || (!user && !authLoading)) return <BoardPageSkeleton />;

    if (user && (!user.verifiedCommunities || user.verifiedCommunities.length === 0)) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-24 text-center animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl p-10 sm:p-16 inline-block max-w-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <span className="text-4xl">🔒</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 italic uppercase tracking-tighter leading-none">Community Only Board</h1>
                        <p className="text-base font-bold text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                            Sign in with your <span className="text-indigo-600 dark:text-indigo-400 italic">college email</span> to join the conversation.
                        </p>
                        <Link href="/settings?tab=circles" className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 uppercase tracking-widest text-xs text-sm">
                            Verify Now
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const selectedCommunity = (user?.verifiedCommunities || []).find((c: any) => (c._id || c.id || c) === selectedCommunityId);
    const isMaintenance = (selectedCommunity && (selectedCommunity as any).isActive === false) || isAPIMaintenance;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors overflow-x-clip">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-[65px] z-30 transition-colors">
                <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700/50 relative">
                    <div className="flex items-center gap-1.5 min-w-0">
                         <span className="text-lg sm:text-xl shrink-0">🏛️</span>
                         <h1 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-sm sm:text-base truncate pr-1">Circle Board</h1>
                         <button 
                            onClick={flashInfo}
                            className="p-1 px-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-help outline-none"
                         >
                            <svg className={`w-3 h-3 transition-colors ${showInfo ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                         </button>
                    </div>

                    {/* Instructional Toast */}
                    {showInfo && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[95%] max-w-sm bg-indigo-600 text-white rounded-2xl py-3 px-5 shadow-2xl shadow-indigo-600/30 animate-in fade-in slide-in-from-top-4 duration-300 z-50 text-[11px] font-bold leading-relaxed flex items-start gap-3 border border-white/20 backdrop-blur-xl">
                            <span className="text-lg">📢</span>
                            <p>Campus notice board for local updates & requests. To keep info fresh, <span className="underline decoration-indigo-400 underline-offset-4">all posts vanish after 48 hours</span> automatically.</p>
                        </div>
                    )}

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
                            <option key={c._id || c.id || c} value={c._id || c.id || c}>🏢 {c.name}</option>
                        ))}
                    </select>
                </div>
                
                {/* Search & Category Tabs */}
                <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 space-y-2">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400 group-focus-within:text-indigo-500 transition-colors">🔍</span>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                            placeholder={`Hunt for topics in ${categories.find(c => c.id === activeCategory)?.name}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 py-1 overflow-x-auto no-scrollbar scroll-smooth">
                        {/* Mobile Dropdown */}
                        <div className="sm:hidden w-full">
                            <select
                                value={activeCategory}
                                onChange={(e) => setActiveCategory(e.target.value)}
                                className="w-full bg-indigo-50 dark:bg-indigo-900/30 border-none rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 py-2.5 px-4 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Desktop Tabs */}
                        <div className="hidden sm:flex items-center gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border-2 ${
                                        activeCategory === cat.id 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' 
                                        : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
                {isMaintenance ? (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 sm:p-8 mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <span className="text-2xl">🚧</span>
                        </div>
                        <h2 className="text-xl font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter italic mb-2">Campus on Break</h2>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-500/80 max-w-sm mx-auto leading-relaxed">Circle maintenance. Posting is temporarily disabled.</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 mb-8 transition-all hover:shadow-md relative overflow-hidden group">
                        {/* Decorative background for post form */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>

                        <form onSubmit={handleCreatePost}>
                            <div className="flex gap-4">
                                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 items-center justify-center text-xl shrink-0 border border-indigo-100 dark:border-indigo-800/50 shadow-inner">
                                    {categories.find(c => c.id === (activeCategory === 'All' ? 'General' : activeCategory))?.icon || '💬'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-gray-700/50 border-none rounded-lg py-1.5 px-3 text-indigo-600 dark:text-indigo-400 shadow-sm">
                                                Posting to: {categories.find(c => c.id === postCategory)?.name}
                                            </span>
                                            {activeCategory === 'All' && (
                                                <select 
                                                    value={postCategory}
                                                    onChange={(e) => setPostCategory(e.target.value)}
                                                    className="text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-800 border-none rounded-lg py-1.5 px-3 text-gray-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                                >
                                                    {categories.filter(c => c.id !== 'All').map(c => (
                                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold ${newPostContent.length >= (maxPostChars - 50) ? 'text-red-500' : 'text-gray-300'}`}>
                                            {newPostContent.length}/{maxPostChars}
                                        </span>
                                    </div>
                                    <textarea
                                        className="w-full bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-0 text-base py-0 px-5 min-h-[60px] resize-none"
                                        placeholder={activeCategory === 'All' ? "Share something with the campus..." : `Post an update to ${categories.find(c => c.id === activeCategory)?.name}...`}
                                        value={newPostContent}
                                        onChange={(e) => setNewPostContent(e.target.value)}
                                        maxLength={maxPostChars}
                                        required
                                    />
                                    {error && <p className="text-[10px] text-red-500 font-bold mt-2">{error}</p>}
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                type="button" 
                                                onClick={() => showSuccess('Coming Soon!', 'Image attachments will be available in v2.0 🚀')}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all shrink-0 rounded-xl"
                                                title="Attach Image"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </button>
                                            <span className="text-[10px] text-gray-400 font-medium italic">📌 Visible in {selectedCommunity?.name}</span>
                                        </div>
                                        <button type="submit" disabled={submitting || !newPostContent.trim()} className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20">
                                            {submitting ? '...' : 'Launch Post'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex items-baseline justify-between mb-2">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest italic">{activeCategory === 'All' ? 'Live Stream' : `${categories.find(c => c.id === activeCategory)?.name} Hub`}</h2>
                        <span className="text-[10px] text-gray-300 font-bold">{allPosts.length} updates found</span>
                    </div>

                    {initialLoading ? <BoardPageSkeleton /> : allPosts.length === 0 ? (
                        <div className="py-24 text-center animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl opacity-50 grayscale">
                                {categories.find(c => c.id === activeCategory)?.icon}
                            </div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-1">Silence in the {activeCategory}</h3>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Be the first to spark a conversation here.</p>
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
                                    onDeletePost={handleDeletePost}
                                    onDeleteReply={handleDeleteReply}
                                />
                            ))}
                            {hasMore && (
                                <div className="pt-8 text-center">
                                    <button onClick={() => setPage(prev => prev + 1) } disabled={loadingPosts} className="inline-flex items-center gap-2 px-10 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-indigo-500/5">
                                        {loadingPosts ? 'Loading...' : 'Dive Deeper'}
                                    </button>
                                </div>
                            )}
                        </>
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
