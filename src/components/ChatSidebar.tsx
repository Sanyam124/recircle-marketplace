'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ReportModal from './ReportModal';
import { formatChatMessageDate } from '@/lib/utils';
import { ChatSidebarSkeleton } from './Skeletons';
import { ChatItem } from './ChatItem';

export default function ChatSidebar() {
    const { user, refreshUser } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'buying' | 'selling'>('all');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null); // To track which menu is open
    const [reportTarget, setReportTarget] = useState<{ userId: string, type: 'product' | 'service' | null, id: string | null } | null>(null);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        fetchConversations(1, false);
        // Polling for updates
        const interval = setInterval(() => fetchConversations(1, false), 5000);
        
        // Close menu on click outside
        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener('click', handleClickOutside);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('click', handleClickOutside);
        };
    }, [user]);

    const fetchConversations = async (pageNum: number, append: boolean = false) => {
        try {
            if (append) setLoadingMore(true);
            else if (pageNum === 1) {
                // For silent polling, don't trigger global loading
            } else {
                setLoading(true);
            }

            const res = await fetch(`/api/chat/conversations?page=${pageNum}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                if (append) {
                    setConversations(prev => [...prev, ...data.conversations]);
                } else if (pageNum === 1) {
                    setConversations(prev => {
                        // Compare current page 1 with new data to avoid flickering
                        const currentTop = prev.slice(0, data.conversations.length);
                        const isSame = JSON.stringify(currentTop) === JSON.stringify(data.conversations);
                        
                        if (isSame) return prev;

                        // If we are on a later page, only update the first page part and keep the rest
                        if (page > 1) {
                            return [...data.conversations, ...prev.slice(data.conversations.length)];
                        }
                        return data.conversations;
                    });
                } else {
                    setConversations(data.conversations);
                }
                setHasMore(data.pagination.hasMore);
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchConversations(nextPage, true);
        }
    };

    const handleDeleteChat = async (e: React.MouseEvent, conv: any) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!window.confirm("Are you sure you want to delete this chat? This action only hides it for you.")) return;

        try {
            const res = await fetch(`/api/chat/conversations?otherUserId=${conv.user._id}${conv.product ? `&productId=${conv.product._id}` : `&serviceId=${conv.service._id}`}`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                // Instantly remove from local state
                setConversations(prev => prev.filter(c => 
                    !(c.user._id === conv.user._id && (c.product?._id === conv.product?._id && c.service?._id === conv.service?._id))
                ));
            } else {
                alert("Failed to delete chat.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReportClick = (e: React.MouseEvent, conv: any) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(null);
        
        const type = conv.product ? 'product' : 'service';
        const id = conv.product?._id || conv.service?._id;
        
        if (id) {
            setReportTarget({
                userId: conv.user._id,
                type,
                id: id.toString()
            });
        }
    };

    const handleReportUserClick = (e: React.MouseEvent, conv: any) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(null);
        
        setReportTarget({
            userId: conv.user._id,
            type: null,
            id: null
        });
    };

    const handleBlockClick = async (e: React.MouseEvent, conv: any) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(null);
        
        if (!window.confirm(`Are you sure you want to block ${conv.user.name}? They will no longer be able to message you and their listings will be hidden.`)) return;

        try {
            const res = await fetch('/api/user/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: conv.user._id })
            });
            
            if (res.ok) {
                // Remove from local state immediately
                setConversations(prev => prev.filter(c => c.user._id !== conv.user._id));
                
                // If the current chat is the one we just blocked, redirect to /chat
                if (pathname === `/chat/${conv.user._id}`) {
                    router.push('/chat');
                }

                await refreshUser();
                alert(`${conv.user.name} has been blocked.`);
            } else {
                alert("Failed to block user.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(entry => {
            if (entry[0].isIntersecting && hasMore && !loadingMore) {
                loadMore();
            }
        }, { threshold: 0.5 });
        const target = document.getElementById('chat-bottom-sentinel');
        if (target) observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, page]);

    const filteredConversations = useMemo(() => {
        if (!user) return conversations;
        return conversations.filter(conv => {
            // [BLOCK FILTER] Skip conversations with blocked users
            const isBlocked = user.blockedUsers?.some((id: any) => id.toString() === conv.user._id.toString());
            if (isBlocked) return false;

            if (activeTab === 'all') return true;
            
            const itemOwnerId = conv.product?.seller || conv.service?.provider;
            const isOwner = itemOwnerId?.toString() === user.id?.toString();
            
            if (activeTab === 'buying') return !isOwner;
            if (activeTab === 'selling') return isOwner;
            return true;
        });
    }, [conversations, activeTab, user]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-colors">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Messages</h2>
                
                {/* Status Tabs */}
                <div className="flex p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            activeTab === 'all' 
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setActiveTab('buying')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            activeTab === 'buying' 
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Buying
                    </button>
                    <button 
                        onClick={() => setActiveTab('selling')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            activeTab === 'selling' 
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Selling
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading && conversations.length === 0 && (
                    <ChatSidebarSkeleton />
                )}
                {!loading && filteredConversations.length === 0 && (
                    <div className="p-10 text-center">
                        <div className="flex justify-center mb-3 text-gray-300 dark:text-gray-600">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">
                            No {activeTab !== 'all' ? activeTab : ''} conversations yet.
                        </p>
                    </div>
                )}
                {filteredConversations.map((conv) => {
                    const activeProductId = searchParams.get('productId');
                    const activeServiceId = searchParams.get('serviceId');
                    const isActiveURL = pathname === `/chat/${conv.user._id.toString()}`;
                    const isActiveItem = (conv.product && conv.product._id.toString() === activeProductId) || (conv.service && conv.service._id.toString() === activeServiceId);
                    const isActive = isActiveURL && isActiveItem;
                    const displayUnread = isActive ? 0 : conv.unreadCount;

                    return (
                        <ChatItem 
                            key={`${conv.user._id}-${conv.product?._id || conv.service?._id || 'generic'}`}
                            conv={conv}
                            isActive={isActive}
                            displayUnread={displayUnread}
                            activeMenu={activeMenu}
                            setActiveMenu={setActiveMenu}
                            handleDeleteChat={handleDeleteChat}
                            handleReportClick={handleReportClick}
                            handleReportUserClick={handleReportUserClick}
                            handleBlockClick={handleBlockClick}
                            onItemClick={() => {
                                setConversations(prev => prev.map(c => 
                                    c.user._id === conv.user._id && (c.product?._id === conv.product?._id && c.service?._id === conv.service?._id)
                                    ? { ...c, unreadCount: 0 } 
                                    : c
                                ));
                            }}
                        />
                    );
                })}
                <div id="chat-bottom-sentinel" className="h-10 flex items-center justify-center">
                    {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>}
                </div>
            </div>

            {reportTarget && (
                <ReportModal
                    targetUserId={reportTarget.userId}
                    itemType={reportTarget.type}
                    itemId={reportTarget.id}
                    onClose={() => setReportTarget(null)}
                />
            )}
        </div>
    );
}
