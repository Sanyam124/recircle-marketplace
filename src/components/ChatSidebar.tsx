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
import { confirmAction, showError, showSuccess } from '@/lib/confirm';
import { pusherClient } from '@/lib/pusherClient';
import useSWR from 'swr';

export default function ChatSidebar() {
    const { user, refreshUser } = useAuth();
    const [page, setPage] = useState(1);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'buying' | 'selling'>('all');
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null); // To track which menu is open
    const [reportTarget, setReportTarget] = useState<{ userId: string, type: 'product' | 'service' | null, id: string | null } | null>(null);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Primary fetcher for the first page
    const { data: initialData, mutate: mutateConversations, isLoading: initialLoading } = useSWR(
        user ? `/api/chat/conversations?page=1&limit=10` : null,
        { keepPreviousData: true }
    );

    // Sync SWR data to our local state which supports pagination
    useEffect(() => {
        if (initialData?.conversations) {
            setConversations(prev => {
                // If we've already loaded more than one page, merge cleanly by ID to avoid duplicates
                if (page > 1) {
                    const getUniqueKey = (c: any) => `${c.rawUserId || (c.user?._id || c.user?.id) || 'deleted'}-${c.rawProductId || c.rawServiceId || 'generic'}`;
                    const newKeys = new Set(initialData.conversations.map(getUniqueKey));
                    const others = prev.filter(c => !newKeys.has(getUniqueKey(c)));
                    return [...initialData.conversations, ...others];
                }
                return initialData.conversations;
            });
            setHasMore(initialData.pagination.hasMore);
        }
    }, [initialData, page]);

    const currentUserId = user?.id || (user as any)?._id;

    useEffect(() => {
        let channelName = '';
        if (currentUserId) {
            channelName = `private-user-${currentUserId}`;
            const channel = pusherClient.subscribe(channelName);
            
            // Listen for any new messages and instantly refresh the sidebar
            channel.bind('new-message', () => {
                mutateConversations();
            });
        }
        
        // Close menu on click outside
        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener('click', handleClickOutside);
        
        return () => {
            if (channelName) pusherClient.unsubscribe(channelName);
            window.removeEventListener('click', handleClickOutside);
        };
    }, [currentUserId, mutateConversations]);

    const fetchConversations = async (pageNum: number, append: boolean = false) => {
        try {
            if (append) setLoadingMore(true);
            
            const res = await fetch(`/api/chat/conversations?page=${pageNum}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                if (append) {
                    setConversations(prev => {
                        const getUniqueKey = (c: any) => `${c.rawUserId || 'deleted'}-${c.rawProductId || c.rawServiceId || 'item'}`;
                        const prevKeys = new Set(prev.map(getUniqueKey));
                        const uniqueNew = data.conversations.filter((c: any) => !prevKeys.has(getUniqueKey(c)));
                        return [...prev, ...uniqueNew];
                    });
                    setHasMore(data.pagination.hasMore);
                } else {
                    mutateConversations(data, false);
                }
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        } finally {
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
        
        const confirmed = await confirmAction({
            title: 'Delete Chat?',
            text: "Are you sure you want to delete this chat? This action only hides it for you.",
            dangerMode: true,
            confirmButtonText: 'Delete'
        });
        if (!confirmed) return;

        try {
            const currentRawOtherUserId = conv.rawUserId || conv.user?._id;
            const currentRawProductId = conv.rawProductId || conv.product?._id;
            const currentRawServiceId = conv.rawServiceId || conv.service?._id;

            const res = await fetch(`/api/chat/conversations?otherUserId=${currentRawOtherUserId}${currentRawProductId ? `&productId=${currentRawProductId}` : (currentRawServiceId ? `&serviceId=${currentRawServiceId}` : '')}`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                // Instantly remove from local state
                setConversations(prev => prev.filter(c => {
                    const convOtherUserId = (c.rawUserId || c.user?._id || c.user?.id)?.toString();
                    const convProductId = (c.rawProductId || c.product?._id || c.product?.id)?.toString();
                    const convServiceId = (c.rawServiceId || c.service?._id || c.service?.id)?.toString();

                    const isSameUser = convOtherUserId === currentRawOtherUserId?.toString();
                    const isSameProduct = convProductId === currentRawProductId?.toString();
                    const isSameService = convServiceId === currentRawServiceId?.toString();

                    // Remove if user matches AND (both product IDs match OR both service IDs match OR both are null)
                    return !(isSameUser && isSameProduct && isSameService);
                }));

                // If the current chat is the one we just deleted, redirect to /chat
                const isActiveURL = pathname === `/chat/${currentRawOtherUserId?.toString()}`;
                const isActiveProduct = currentRawProductId?.toString() === searchParams.get('productId');
                const isActiveService = currentRawServiceId?.toString() === searchParams.get('serviceId');
                
                // If both URL user and the product/service match, redirect
                if (isActiveURL && (isActiveProduct || isActiveService || (!currentRawProductId && !currentRawServiceId && !searchParams.get('productId') && !searchParams.get('serviceId')))) {
                    router.push('/chat');
                }
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
        
        const type = (conv.product || conv.rawProductId) ? 'product' : 'service';
        const id = conv.product?._id || conv.rawProductId || conv.service?._id || conv.rawServiceId;
        const targetUserId = (conv.user?._id || conv.user?.id) || conv.rawUserId;
        
        if (id && targetUserId) {
            setReportTarget({
                userId: targetUserId.toString(),
                type,
                id: id.toString()
            });
        }
    };

    const handleReportUserClick = (e: React.MouseEvent, conv: any) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(null);
        
        const targetUserId = conv.user?._id || conv.rawUserId;
        if (!targetUserId) return;

        setReportTarget({
            userId: targetUserId.toString(),
            type: null,
            id: null
        });
    };

    const handleBlockClick = async (e: React.MouseEvent, conv: any) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(null);
        
        const targetUserId = (conv.user?._id || conv.user?.id) || conv.rawUserId;
        if (!targetUserId) return;

        const alreadyBlocked = user?.blockedUsers?.some((id: any) => id.toString() === targetUserId.toString());
        
        const confirmed = await confirmAction({
            title: alreadyBlocked ? `Unblock ${conv.user?.name || 'User'}?` : `Block ${conv.user?.name || 'User'}?`,
            text: alreadyBlocked 
                ? `They will be able to message you again.` 
                : `They will no longer be able to message you and their listings will be hidden.`,
            dangerMode: !alreadyBlocked,
            confirmButtonText: alreadyBlocked ? 'Unblock' : 'Block'
        });
        if (!confirmed) return;

        try {
            const res = await fetch(alreadyBlocked ? `/api/user/block?userId=${targetUserId}` : '/api/user/block', {
                method: alreadyBlocked ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                ...(alreadyBlocked ? {} : { body: JSON.stringify({ targetUserId }) })
            });
            
            if (res.ok) {
                await refreshUser();
                showSuccess(alreadyBlocked ? 'User Unblocked' : 'User Blocked', `${conv.user?.name || 'User'} has been ${alreadyBlocked ? 'unblocked' : 'blocked'}.`);
            } else {
                showError('Action Failed', `Failed to ${alreadyBlocked ? 'unblock' : 'block'} user.`);
            }
        } catch (err) {
            console.error(err);
            showError('System Error', 'Something went wrong.');
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
            // [EMPTY FILTER] Ensure we don't show chats with no content
            if (!conv.lastMessage) return false;

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
                {initialLoading && conversations.length === 0 && (
                    <ChatSidebarSkeleton />
                )}
                {!initialLoading && filteredConversations.length === 0 && (
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
                    const currentRawUserId = conv.rawUserId || conv.user?._id;
                    const currentRawProductId = conv.rawProductId || conv.product?._id;
                    const currentRawServiceId = conv.rawServiceId || conv.service?._id;

                    const isActiveURL = pathname === `/chat/${currentRawUserId?.toString()}`;
                    const isActiveItem = (currentRawProductId && currentRawProductId.toString() === activeProductId) || (currentRawServiceId && currentRawServiceId.toString() === activeServiceId);
                    const isActive = isActiveURL && isActiveItem;
                    const displayUnread = isActive ? 0 : conv.unreadCount;

                    return (
                        <ChatItem 
                            key={`${currentRawUserId}-${currentRawProductId || currentRawServiceId || 'generic'}`}
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
                                    (c.rawUserId || c.user?._id) === currentRawUserId && ((c.rawProductId || c.product?._id) === currentRawProductId && (c.rawServiceId || c.service?._id) === currentRawServiceId)
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
