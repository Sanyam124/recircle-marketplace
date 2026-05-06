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
    const [viewMode, setViewMode] = useState<'list' | 'feed'>('list');
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
        { id: 'All', name: 'All Activity', icon: '🏛️', desc: 'Everything from your campus' },
        { id: 'General', name: 'General', icon: '💬', desc: 'General chats & discussions' },
        { id: 'LostFound', name: 'Lost & Found', icon: '🔍', desc: 'Find lost items or help others' },
        { id: 'Essentials', name: 'Essentials', icon: '🥤', desc: 'Quick trade & urgent needs' },
        { id: 'Events', name: 'Events', icon: '🎉', desc: 'Happenings & gatherings' },
        { id: 'Alerts', name: 'Alerts', icon: '🚨', desc: 'Critical updates & safety info' },
    ];

    // Handle responsiveness
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setViewMode('feed');
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ... (rest of effects remain same)
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
        <div className="min-h-screen-dynamic bg-gray-50 dark:bg-gray-900 pb-20 transition-colors overflow-x-clip">
            
            {/* Stage 1: Category List (Mobile Only) */}
            <div className={`max-w-3xl mx-auto px-4 py-8 md:hidden ${viewMode === 'feed' ? 'hidden' : 'block animate-in fade-in slide-in-from-left-4 duration-500'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Circle Board</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Campus Bulletin</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setViewMode('feed');
                            }}
                            className={`flex items-center gap-5 p-6 rounded-[2.5rem] bg-white dark:bg-gray-800 border-2 transition-all group shadow-sm ${
                                activeCategory === cat.id ? 'border-indigo-600 shadow-indigo-100 dark:shadow-none' : 'border-transparent'
                            }`}
                        >
                            <span className="text-3xl">{cat.icon}</span>
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{cat.name}</span>
                                <span className="text-[10px] font-medium text-slate-400 mt-0.5">{cat.desc}</span>
                            </div>
                            <div className="ml-auto opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stage 2: Main Layout (Sidebar + Feed) */}
            <div className={`max-w-6xl mx-auto px-4 py-8 sm:py-12 ${viewMode === 'list' ? 'hidden md:block' : 'block animate-in fade-in slide-in-from-right-4 duration-500'}`}>
                
                <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                    
                    {/* Left Sidebar (Desktop Only) */}
                    <div className="hidden md:block w-72 shrink-0">
                        <div className="sticky top-24 space-y-8">
                            <div className="flex flex-col mb-8">
                                <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">Circle Board</h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-3">Campus Bulletin</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] transition-all group border-2 ${
                                            activeCategory === cat.id 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none' 
                                            : 'bg-white dark:bg-gray-800 border-transparent text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 shadow-sm'
                                        }`}
                                    >
                                        <span className="text-2xl">{cat.icon}</span>
                                        <div className="flex flex-col text-left">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeCategory === cat.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{cat.name}</span>
                                            <span className={`text-[9px] font-medium opacity-60 mt-0.5 line-clamp-1`}>{cat.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Community Switcher in Sidebar */}
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Your Campus</label>
                                <select
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 py-3 pl-4 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none"
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
                        </div>
                    </div>

                    {/* Main Feed Area */}
                    <div className="flex-1 min-w-0">
                        
                        {/* Mobile Back Button & Header */}
                        <div className="md:hidden flex items-center gap-4 mb-6 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl py-2 z-50">
                            <button 
                                onClick={() => setViewMode('list')}
                                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-indigo-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">
                                    {categories.find(t => t.id === activeCategory)?.name}
                                </h2>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Circle Board</span>
                            </div>
                        </div>

                        {/* Top Utility Bar (Search & Mobile Select) */}
                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-4 sm:p-6 mb-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-400 group-focus-within:text-indigo-500 transition-colors">🔍</span>
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                        placeholder={`Search in ${categories.find(c => c.id === activeCategory)?.name}...`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={flashInfo}
                                    className="w-12 h-12 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 transition-all hover:scale-105 active:scale-95"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            </div>
                            
                            {/* Mobile Info Toast */}
                            {showInfo && (
                                <div className="bg-indigo-600 text-white rounded-2xl py-3 px-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 text-[10px] font-bold leading-relaxed flex items-center gap-3">
                                    <span className="text-lg">📢</span>
                                    <p>Campus notice board. All posts vanish after <span className="underline underline-offset-4">48 hours</span> automatically.</p>
                                </div>
                            )}

                            {/* Mobile Only Community Switcher */}
                            <div className="md:hidden pt-2">
                                <select
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 py-3 px-4 focus:ring-2 focus:ring-indigo-500"
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
                        </div>

                        {/* Post Creation Form */}
                        {isMaintenance ? (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2.5rem] p-8 mb-8 text-center">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🚧</span>
                                </div>
                                <h2 className="text-xl font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter italic mb-2">Campus on Break</h2>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-500/80 max-w-sm mx-auto">Circle maintenance. Posting is temporarily disabled.</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8 mb-8 transition-all hover:shadow-md relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-indigo-500/10 transition-colors"></div>
                                <form onSubmit={handleCreatePost}>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-xl">
                                                    {categories.find(c => c.id === (activeCategory === 'All' ? 'General' : activeCategory))?.icon || '💬'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Launch a Post</span>
                                                    <span className="text-[9px] font-bold text-gray-400">In {categories.find(c => c.id === postCategory)?.name}</span>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold ${newPostContent.length >= (maxPostChars - 50) ? 'text-red-500' : 'text-gray-300'}`}>
                                                {newPostContent.length}/{maxPostChars}
                                            </span>
                                        </div>
                                        
                                        <textarea
                                            className="w-full bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-0 text-base py-0 min-h-[100px] resize-none"
                                            placeholder={activeCategory === 'All' ? "Share something with the campus..." : `Post an update to ${categories.find(c => c.id === activeCategory)?.name}...`}
                                            value={newPostContent}
                                            onChange={(e) => setNewPostContent(e.target.value)}
                                            maxLength={maxPostChars}
                                            required
                                        />

                                        {activeCategory === 'All' && (
                                            <div className="flex flex-wrap gap-2">
                                                {categories.filter(c => c.id !== 'All').map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setPostCategory(c.id)}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            postCategory === c.id 
                                                            ? 'bg-indigo-600 text-white shadow-lg' 
                                                            : 'bg-gray-50 dark:bg-gray-900 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {c.icon} {c.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
                                        
                                        <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    type="button" 
                                                    onClick={() => showSuccess('Coming Soon!', 'Images coming in v2.0 🚀')}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </button>
                                                <span className="text-[10px] text-gray-400 font-medium italic opacity-60">📌 Visible in {selectedCommunity?.name}</span>
                                            </div>
                                            <button type="submit" disabled={submitting || !newPostContent.trim()} className="bg-indigo-600 dark:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-xl shadow-indigo-500/20">
                                                {submitting ? 'Launching...' : 'Post Now'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Posts Feed */}
                        <div className="space-y-6">
                            <div className="flex items-baseline justify-between px-2">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest italic">{activeCategory === 'All' ? 'Live Activity' : `${categories.find(c => c.id === activeCategory)?.name} Hub`}</h2>
                                <span className="text-[10px] text-gray-300 font-bold">{allPosts.length} updates found</span>
                            </div>

                            {initialLoading ? <BoardPageSkeleton /> : allPosts.length === 0 ? (
                                <div className="py-24 text-center bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700">
                                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl grayscale opacity-30">
                                        {categories.find(c => c.id === activeCategory)?.icon}
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-2">Silence in the {activeCategory}</h3>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Be the first to spark a conversation here.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
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
                                            <button onClick={() => setPage(prev => prev + 1) } disabled={loadingPosts} className="inline-flex items-center gap-3 px-12 py-5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-[2rem] hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-xl hover:shadow-indigo-500/10 active:scale-95">
                                                {loadingPosts ? 'Diving Deeper...' : 'Dive Deeper'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
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
