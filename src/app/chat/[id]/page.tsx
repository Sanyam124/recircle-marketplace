'use client';

import { useState, useEffect, useLayoutEffect, useRef, use, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageBubbleSkeleton } from '@/components/Skeletons';
import { pusherClient } from '@/lib/pusherClient';
import { confirmAction } from '@/lib/confirm';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const userId = resolvedParams.id;
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
    }, [user, authLoading, router]);
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [referencingItem, setReferencingItemState] = useState<{ type: 'product' | 'service', id: string, data?: any, messageId?: string } | null>(null);
    
    // Use refs to avoid stale closures in polling interval
    const referencingItemRef = useRef(referencingItem);
    const lastServerContextIdRef = useRef<string | null>(null);
    const hasSentAutoMsg = useRef(false);

    const setReferencingItem = (val: any) => {
        referencingItemRef.current = val;
        setReferencingItemState(val);
    };

    const [activeTab, setActiveTab] = useState<'chat' | 'action'>('chat');
    const [actionPrice, setActionPrice] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [acceptingOffer, setAcceptingOffer] = useState(false);
    const [decliningOffer, setDecliningOffer] = useState(false);
    const [actionError, setActionError] = useState('');
    const [activeOrder, setActiveOrder] = useState<any>(null);

    const [otherUserLastSeen, setOtherUserLastSeen] = useState<Date | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    // Stores scroll metrics captured BEFORE a prepend so useLayoutEffect can restore position
    const scrollAdjustRef = useRef<{ savedTop: number; savedHeight: number } | null>(null);

    // Derived block state
    const isBlockedByMe = useMemo(() => {
        return user?.blockedUsers?.some((id: any) => id.toString() === userId) || false;
    }, [user?.blockedUsers, userId]);

    // Track if the current user was blocked by the recipient
    const [isBlockedByOther, setIsBlockedByOther] = useState(false);

    // Runs synchronously after DOM commit — before browser paints — to restore scroll
    useLayoutEffect(() => {
        if (scrollAdjustRef.current && scrollRef.current) {
            const { savedTop, savedHeight } = scrollAdjustRef.current;
            const newHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = savedTop + (newHeight - savedHeight);
            scrollAdjustRef.current = null;
        }
    }, [messages]);

    const productId = searchParams.get('productId');
    const serviceId = searchParams.get('serviceId');

    useEffect(() => {
        // Reset state on conversation switch
        setMessages([]);
        setHasMore(false);
        setInitialLoad(true);
        setLoading(true);
        setActionPrice('');
        setActionMessage('');
        setActionError('');
        hasSentAutoMsg.current = false;

        // Handle deep linking for Make Offer/Request Appointment
        if (searchParams.get('tab') === 'action') {
            setActiveTab('action');
        } else {
            setActiveTab('chat');
        }
        
        // Update item context
        if (productId) {
            setReferencingItem({ type: 'product', id: productId });
            fetchItemData('product', productId);
        } else if (serviceId) {
            setReferencingItem({ type: 'service', id: serviceId });
            fetchItemData('service', serviceId);
        } else {
            setReferencingItem(null);
        }

        fetchHistory(null);
        fetchOtherUser();
        
        // Keep a slow 30-second polling heartbeat as a fallback sync
        const interval = setInterval(() => {
            fetchHistory(null, true);
            const currentItem = referencingItemRef.current;
            if (currentItem?.id) {
                fetchItemData(currentItem.type, currentItem.id);
            }
        }, 30000); 

        // WebSockets Real-time Updates
        let channelName = '';
        if (user) {
            const currentUserId = user.id || (user as any)._id;
            channelName = `user-${currentUserId}`;
            const channel = pusherClient.subscribe(channelName);
            
            channel.bind('new-message', (newMsg: any) => {
                // Only act on messages that belong to THIS opened conversation
                if (newMsg.sender === userId || newMsg.recipient === userId) {
                    setMessages((prev) => {
                        // Avoid duplicates if polling beat us to it
                        if (prev.find(m => m._id === newMsg._id)) return prev;
                        
                        // Ensure chronological order
                        return [...prev, newMsg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    });
                    
                    // Fire a silent background fetch to sync Read receipts immediately over HTTP
                    fetchHistory(null, true);
                }
            });
        }

        // Heartbeat: update our own lastSeen every 30 seconds
        const heartbeat = () => fetch('/api/user/online', { method: 'PATCH' });
        heartbeat(); // immediate on mount
        const heartbeatInterval = setInterval(heartbeat, 30_000);

        return () => { 
            clearInterval(interval); 
            clearInterval(heartbeatInterval); 
            if (channelName) pusherClient.unsubscribe(channelName);
        };
    }, [userId, productId, serviceId, user]);
    
    // Dedicated effect for automated intro message on redirection
    useEffect(() => {
        const shouldSendAutoMsg = searchParams.get('autoMsg') === 'true';
        if (!loading && shouldSendAutoMsg && !hasSentAutoMsg.current && messages.length === 0) {
            // Set synchronous flag immediately to prevent double-execution in Strict Mode/polling
            hasSentAutoMsg.current = true;
            
            const sendInitialMsg = async () => {
                const typeLabel = productId ? 'product' : 'service';
                const msg = `Hii, I came across this ${typeLabel} and wanted to discuss it further!`;
                await handleSendMessage(undefined, msg);
            };
            sendInitialMsg();
        }
    }, [loading, messages.length, searchParams, productId, serviceId]);
    
    const hasAutoFilledPrice = useRef(false);
    
    // Dedicated effect for price pre-filling when switching to action tab via deep link
    useEffect(() => {
        if (activeTab === 'action' && !hasAutoFilledPrice.current && referencingItem?.data?.price) {
            setActionPrice(referencingItem.data.price.toString());
            hasAutoFilledPrice.current = true;
        } else if (activeTab !== 'action') {
            hasAutoFilledPrice.current = false; // Reset when leaving action tab to allow re-fill on re-entry
        }
    }, [activeTab, referencingItem]); // referencingItem updates (polling) won't re-fill if we already did it for this session

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior
            });
        }
    };

    useEffect(() => {
        if (initialLoad && messages.length > 0 && scrollRef.current) {
            scrollToBottom('auto');
            setInitialLoad(false);
        } else if (messages.length > 0 && scrollRef.current) {
            // Smart scroll: only auto-scroll if user is already near the bottom
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;
            if (isNearBottom) {
               scrollToBottom('smooth');
            }
        }
    }, [messages, initialLoad]);

    const fetchHistory = async (before: string | null = null, isPolling: boolean = false) => {
        try {
            if (before) setLoadingMore(true);
            
            const url = new URL('/api/chat', window.location.origin);
            url.searchParams.append('userId', userId);
            
            const pId = searchParams.get('productId');
            const sId = searchParams.get('serviceId');
            if (pId) url.searchParams.append('productId', pId);
            if (sId) url.searchParams.append('serviceId', sId);
            
            if (before) url.searchParams.append('before', before);
            url.searchParams.append('limit', '20');

            const res = await fetch(url.toString());
            if (res.ok) {
                const data = await res.json();
                
                if (before) {
                    // Capture scroll state BEFORE state update so useLayoutEffect can restore it
                    scrollAdjustRef.current = {
                        savedTop: scrollRef.current?.scrollTop || 0,
                        savedHeight: scrollRef.current?.scrollHeight || 0,
                    };
                    setMessages(prev => [...data.messages, ...prev]);
                    setHasMore(data.pagination?.hasMore || false);
                } else if (isPolling) {
                   // When polling, merge new messages AND update existing ones (patching)
                   if (data.messages.length > 0) {
                        setMessages(prev => {
                            const updatedMessages = [...prev];
                            let hasChanges = false;
                            
                            data.messages.forEach((newMsg: any) => {
                                const index = updatedMessages.findIndex(m => m._id === newMsg._id);
                                if (index !== -1) {
                                    // Patch existing message if offer status or content changed
                                    const oldMsg = updatedMessages[index];
                                    const offerStatusChanged = JSON.stringify(oldMsg.offer) !== JSON.stringify(newMsg.offer);
                                    if (offerStatusChanged || oldMsg.content !== newMsg.content || oldMsg.isRead !== newMsg.isRead) {
                                        updatedMessages[index] = newMsg;
                                        hasChanges = true;
                                    }
                                } else {
                                    // Append brand new message
                                    updatedMessages.push(newMsg);
                                    hasChanges = true;
                                }
                            });
                            
                            if (hasChanges) {
                                return updatedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                            }
                            return prev;
                        });
                   }
                } else {
                    setMessages(data.messages);
                    setHasMore(data.pagination?.hasMore || false);
                }

                // Update other user lastSeen from polling response
                if (data.otherUser?.lastSeen) {
                    setOtherUserLastSeen(new Date(data.otherUser.lastSeen));
                }
                
                // If the URL context is somehow missing but the server has historically 
                // mapped this legacy generic chat to an item earlier, fall back to it
                if (!searchParams.get('productId') && !searchParams.get('serviceId') && data.lastContext) {
                    setReferencingItem(data.lastContext);
                }
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreMessages = useCallback(() => {
        if (!loadingMore && hasMore && messages.length > 0) {
            const oldestMessage = messages[0];
            fetchHistory(oldestMessage.createdAt);
        }
    }, [loadingMore, hasMore, messages, userId]);

    // Intersection Observer for scroll up
    useEffect(() => {
        if (!hasMore || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreMessages();
                }
            },
            { threshold: 0.1 }
        );

        const target = document.getElementById('chat-top-sentinel');
        if (target) observer.observe(target);

        return () => observer.disconnect();
    }, [hasMore, loadingMore, messages, loadMoreMessages]);

    const fetchOtherUser = async () => {
        try {
            const res = await fetch(`/api/profile/${userId}?limit=5`);
            if (res.ok) {
                const data = await res.json();
                setOtherUser(data.user);
            } else if (res.status === 403) {
                // If we get a 403 here, we know the target profile blocked us.
                setIsBlockedByOther(true);
            }
        } catch (error) {
            console.error('Failed to fetch other user', error);
        }
    };

    const fetchItemData = async (type: 'product' | 'service', id: string) => {
        try {
            const res = await fetch(`/api/${type}s/${id}`);
            if (res.ok) {
                const data = await res.json();
                const itemData = data[type];
                setReferencingItem({ type, id, data: { ...itemData, buyerId: data.buyerId } });
                
                // Fetch active order for this item context
                try {
                    const orderRes = await fetch(`/api/orders?productId=${type === 'product' ? id : ''}&serviceId=${type === 'service' ? id : ''}&limit=10`);
                    if (orderRes.ok) {
                        const orderData = await orderRes.json();
                        // Find the order involving these two specific users (current and other)
                        const active = orderData.orders?.find((o: any) => 
                            (o.status === 'Scheduled' || o.status === 'Paid') && 
                            (
                                (o.buyer?._id?.toString() === user?.id?.toString() && o.seller?._id?.toString() === userId.toString()) || 
                                (o.buyer?._id?.toString() === userId.toString() && o.seller?._id?.toString() === user?.id?.toString())
                            )
                        );
                        setActiveOrder(active || null);
                    }
                } catch (err) {
                    console.error("Order lookup error", err);
                }
            }
        } catch (error) {
            console.error(`Failed to fetch ${type} data`, error);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, customContent?: string, offerPayload?: any) => {
        if (e) e.preventDefault();
        const content = customContent || newMessage.trim();
        if ((!content && !offerPayload) || sendingMessage) return;

        setSendingMessage(true);
        if (!customContent && !offerPayload) setNewMessage('');

        try {
            const pId = searchParams.get('productId');
            const sId = searchParams.get('serviceId');

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recipientId: userId, 
                    content: content || 'Sent an Offer',
                    productId: pId,
                    serviceId: sId,
                    offer: offerPayload || undefined
                })
            });

            if (res.ok) {
                await fetchHistory(); // Wait for history refresh
                setTimeout(() => scrollToBottom('smooth'), 100); // Ensure scroll after state update
            }
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setSendingMessage(false);
        }
    };

    const handleSearchUsers = async (q: string) => {
        if (q.length < 2) {
            return;
        }
        try {
            const res = await fetch(`/api/profile/search?q=${q}`);
            if (res.ok) {
                // Search functionality no longer needed here if modal is gone
            }
        } catch (error) {
            console.error('Search error', error);
        }
    };

    const handleAcceptOffer = async (offerId: string, offerPrice: number, override: boolean = false) => {
        if (acceptingOffer) return;
        setAcceptingOffer(true);
        try {
            const res = await fetch(`/api/offers/${offerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept', override })
            });
            
            const data = await res.json();

            if (res.status === 409 && data.promptOverride) {
                const confirmed = await confirmAction({
                    title: 'Active Order Exists',
                    text: "An active order already exists for this item.\n\nOverride the previous order with the current one? (This will cancel the old order)",
                    dangerMode: true,
                    confirmButtonText: 'Override & Accept'
                });
                
                if (confirmed) {
                    handleAcceptOffer(offerId, offerPrice, true);
                }
                return;
            }

            if (res.ok) {
                await fetchHistory(); 
                if (referencingItem) {
                    // Update: Immediate refresh to make tabs appear faster
                    await fetchItemData(referencingItem.type, referencingItem.id);
                }
            } else if (!data.promptOverride) {
                alert(data.error || "Failed to accept offer");
            }
        } catch (error) {
            console.error('Accept offer error', error);
        } finally {
            setAcceptingOffer(false);
        }
    };

    const handleDeclineOffer = async (offerId: string) => {
        if (decliningOffer) return;
        setDecliningOffer(true);
        try {
            const res = await fetch(`/api/offers/${offerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline' })
            });
            if (res.ok) {
                await fetchHistory(); 
                if (referencingItem) {
                    // Update: Immediate refresh to make tabs disappear/reappear faster
                    await fetchItemData(referencingItem.type, referencingItem.id);
                }
            }
        } catch (error) {
            console.error('Decline offer error', error);
        } finally {
            setDecliningOffer(false);
        }
    };

    const handleActionSubmit = async () => {
        if (!referencingItem?.data) return;
        const price = Number(actionPrice);
        const isProduct = referencingItem.type === 'product';
        const originalPrice = referencingItem.data.price;

        if (!price || price <= 0) { setActionError('Please enter a valid price/budget.'); return; }

        setSubmittingAction(true);
        setActionError('');
        try {
            const bodyPayload = isProduct 
                ? { productId: referencingItem.id, offeredPrice: price, message: actionMessage.trim() || undefined }
                : { serviceId: referencingItem.id, offeredPrice: price, message: actionMessage.trim() || undefined };
            
            const res = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });
            const data = await res.json();
            
            if (res.ok) { 
                // OLX Style: Push a formal message into the chat room to act as the Offer Bubble
                const offerPayload = {
                    offerId: data.offer._id,
                    price: price,
                    status: 'Pending'
                };
                
                const offerTypeStr = isProduct ? 'Offer' : 'Appointment Request';
                const fullMsgStr = actionMessage.trim() ? `Note: ${actionMessage.trim()}` : `I've sent an ${offerTypeStr}.`;
                
                await handleSendMessage(undefined, fullMsgStr, offerPayload);
                if (referencingItem) {
                    // Update: Immediate refresh so tabs stay in sync
                    await fetchItemData(referencingItem.type, referencingItem.id);
                }
                setActiveTab('chat');
            }
            else { setActionError(data.error || 'Failed to submit request.'); }
        } catch {
            setActionError('Network error. Please try again.');
        } finally {
            setSubmittingAction(false);
        }
    };



    // ── Date separator helper ──────────────────────────────────────────────
    const getDateLabel = (date: Date): string => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const smartReplies = [
        "Is this still available?",
        "Where can we meet?",
        "Final price?",
        "Can I see it today?",
        "I'm interested!"
    ];

    if (authLoading || loading) return <MessageBubbleSkeleton />;

    return (
        <>
                    {/* Unified Context Header */}
                    <div 
                        className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10 transition-colors shrink-0 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => window.location.href = `/profile/${userId}`}
                    >
                        <div className="px-4 py-3 flex items-center gap-4">
                            {/* Mobile Back Button */}
                            <Link 
                                href="/chat" 
                                className="md:hidden p-2 -ml-2 shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </Link>

                            {/* Stacked Images UI */}
                            <div className="relative shrink-0 flex items-center justify-center w-14 h-14">
                                {/* Base Item Image */}
                                <div className="absolute top-0 left-0 right-2 bottom-2 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    {referencingItem?.data?.images?.[0] || referencingItem?.data?.image ? (
                                        <img 
                                            src={referencingItem?.data?.images?.[0] || referencingItem?.data?.image || ''} 
                                            alt={referencingItem?.data?.title || 'Item'} 
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Orbiting User Avatar */}
                                <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/80 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-extrabold border-[2.5px] border-white dark:border-gray-900 shadow-md z-10 backdrop-blur-sm">
                                    {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                                    {/* Online indicator dot */}
                                    {otherUserLastSeen && (Date.now() - otherUserLastSeen.getTime()) < 2 * 60 * 1000 && (
                                        <span className="absolute bottom-0 -right-0.5 w-2.5 h-2.5 bg-green-400 border-[1.5px] border-white dark:border-gray-900 rounded-full" title="Online now" />
                                    )}
                                </div>
                            </div>

                            {/* Text Info */}
                            <div className="flex-1 min-w-0 pr-2">
                                <h1 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                                    {otherUser?.name || 'Loading...'}
                                </h1>
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                                    {otherUserLastSeen && (Date.now() - otherUserLastSeen.getTime()) < 2 * 60 * 1000 
                                        ? 'Online now' 
                                        : 'Active conversation'}
                                </p>
                            </div>
                            
                            <div className="shrink-0 pl-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 dark:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Item Info Bar */}
                    {referencingItem?.data && (
                        <div className="flex flex-col bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="flex text-[11px] font-bold text-gray-500 dark:text-gray-400 divide-x divide-gray-200 dark:divide-gray-800">
                                <div className="flex-1 px-4 py-1.5 truncate flex items-center gap-2">
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-extrabold shrink-0">Discussing</span>
                                    <span className="text-gray-700 dark:text-gray-200 truncate">{referencingItem.data.title}</span>
                                </div>
                                <div className="px-4 py-1.5 shrink-0 flex items-center gap-2 bg-white/50 dark:bg-gray-900/20">
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-extrabold">Price</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">₹{referencingItem.data.price?.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            {/* Sold State Note */}
                            {referencingItem.type === 'product' && referencingItem.data?.status === 'Sold' && (
                                <div className="px-4 py-1 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Product Sold
                                    </div>
                                    {/* Show specific note if sold to someone else in this chat context */}
                                    {(() => {
                                        const sellerId = referencingItem.data?.seller?.id || referencingItem.data?.seller?._id || referencingItem.data?.seller;
                                        const buyerId = referencingItem.data?.buyerId?.id || referencingItem.data?.buyerId?._id || referencingItem.data?.buyerId;
                                        const isSeller = sellerId?.toString() === user?.id?.toString();
                                        const isActualBuyer = buyerId?.toString() === user?.id?.toString();
                                        
                                        // Case 1: Current user is a potential buyer, but it's sold to someone else
                                        if (buyerId && !isActualBuyer && !isSeller) {
                                            return <span className="text-[9px] text-red-500/70 font-medium italic">This item is no longer available</span>;
                                        }

                                        // Case 2: Current user is the seller, and it's sold to someone other than the person in this chat
                                        if (isSeller && buyerId && buyerId.toString() !== userId.toString()) {
                                            return <span className="text-[9px] text-red-500/70 font-medium italic">Sold to other user</span>;
                                        }

                                        // Case 3: Current user is the actual buyer
                                        if (isActualBuyer) {
                                            return <span className="text-[9px] text-red-500/70 font-medium italic">Product Bought</span>;
                                        }

                                        // Case 4: Current user is the seller, chatting with the actual buyer
                                        if (isSeller && buyerId?.toString() === userId?.toString()) {
                                            return <span className="text-[9px] text-red-500/70 font-medium italic">Sold to this user</span>;
                                        }

                                        return null;
                                    })()}

                                    {/* Sub-messages logic stays here, but offer status note is removed as per user request */}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages Area - Universally Visible */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50 transition-colors"
                    >
                        {/* Sentinel — always in DOM so observer can attach; bouncing dots show when loading more */}
                        <div id="chat-top-sentinel" className="h-6 w-full flex items-center justify-center my-2">
                            {loadingMore && (
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            )}
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                            </div>
                        ) : (() => {
                            // Find the ID of the latest offer message to restrict buttons only to the newest one
                            const latestOfferMsgId = [...messages].reverse().find(m => m.offer)?._id;

                            // Group messages by calendar day
                            type DayGroup = { dateKey: string; label: string; msgs: any[] };
                            const groups: DayGroup[] = [];
                            messages.forEach((msg: any) => {
                                const key = new Date(msg.createdAt).toDateString();
                                if (groups.length && groups[groups.length - 1].dateKey === key) {
                                    groups[groups.length - 1].msgs.push(msg);
                                } else {
                                    groups.push({ dateKey: key, label: getDateLabel(new Date(msg.createdAt)), msgs: [msg] });
                                }
                            });

                            return (
                                <>
                                    {groups.map((group: DayGroup) => (
                                        <div key={group.dateKey}>
                                            {/* Sticky date pill — sticks at top while scrolling within this day group */}
                                            <div className="sticky top-1 z-10 flex justify-center my-3 pointer-events-none">
                                                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full shadow-sm">
                                                    {group.label}
                                                </span>
                                            </div>

                                    {/* Messages for this day */}
                                    <div className="space-y-4">
                                         {group.msgs.map((msg: any, index: number) => {
                                             return (
                                                 <div key={msg._id}>
                                                     <div className={`flex ${msg.sender === userId ? 'justify-start' : 'justify-end'}`}>
                                                        
                                                        {!msg.offer ? (
                                                            // Standard Text Bubble
                                                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm transition-colors ${
                                                                msg.sender === userId
                                                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
                                                                    : 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-tr-none'
                                                            }`}>
                                                                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                                                                <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${msg.sender === userId ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-200 dark:text-indigo-100'}`}>
                                                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    {msg.sender !== userId && (
                                                                        <span className="flex items-center ml-1">
                                                                            {msg.isRead ? (
                                                                                <svg className="w-3.5 h-3.5 text-indigo-200 dark:text-indigo-100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                    <path d="M3 12l5 5 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                    <path d="M8 12l5 5 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                    <path d="M8 12l5 5 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                </svg>
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Interactive Offer Bubble Widget
                                                            <div className={`max-w-[85%] sm:max-w-[65%] w-full rounded-2xl overflow-hidden shadow-sm transition-colors border ${
                                                                msg.sender === userId 
                                                                    ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-tl-none' 
                                                                    : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/40 rounded-tr-none'
                                                            }`}>
                                                                <div className="p-4 flex flex-col items-center justify-center border-b border-gray-100 dark:border-gray-700/50">
                                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                                                                        {msg.sender === userId ? 'Offer Received' : 'You Offered'}
                                                                    </span>
                                                                    <span className={`text-4xl font-black tracking-tight ${msg.sender === userId ? 'text-gray-900 dark:text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                                        ₹{msg.offer.price?.toLocaleString()}
                                                                    </span>
                                                                    {msg.offer.status === 'Accepted' && (
                                                                        <div className="mt-3 flex flex-col items-center">
                                                                            <span className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 mb-2">
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                                Accepted
                                                                            </span>
                                                                            <Link 
                                                                                href={msg.sender === userId 
                                                                                    ? `/orders?tab=seller${activeOrder ? `&orderId=${activeOrder._id}` : ''}` 
                                                                                    : `/orders?tab=buyer${activeOrder ? `&orderId=${activeOrder._id}` : ''}`}
                                                                                className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline underline-offset-4 decoration-indigo-200 dark:decoration-indigo-800 transition-colors text-center px-2"
                                                                            >
                                                                                {msg.sender === userId 
                                                                                    ? 'Process your order in My Sales & Services →'
                                                                                    : 'Check your order in My Purchases & Bookings →'}
                                                                            </Link>
                                                                        </div>
                                                                    )}
                                                                    {msg.offer.status === 'Declined' && (
                                                                        <span className="mt-3 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full">Declined</span>
                                                                    )}
                                                                </div>
                                                                
                                                                {msg.content && msg.content !== 'Sent an Offer' && !msg.content.startsWith("🤝") && (
                                                                    <div className={`px-4 py-3 text-sm italic border-b border-gray-100 dark:border-gray-700/50 ${msg.sender === userId ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300' : 'bg-white/50 dark:bg-gray-900/20 text-indigo-900/80 dark:text-indigo-200'}`}>
                                                                        "{msg.content.replace(/^Note:\s*/, '')}"
                                                                    </div>
                                                                )}

                                                                {msg._id === latestOfferMsgId && (
                                                                    <div className={`flex p-2 gap-2 ${msg.sender === userId ? 'bg-gray-50 dark:bg-gray-800/80' : 'bg-indigo-100/30 dark:bg-indigo-900/20'}`}>
                                                                        {msg.sender !== userId ? (
                                                                            // Buyer Actions: You sent the offer
                                                                            msg.offer.status === 'Pending' && (
                                                                                <button 
                                                                                    onClick={() => { setActiveTab('action'); setActionPrice(msg.offer.price.toString()); }}
                                                                                    className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm active:scale-95"
                                                                                >
                                                                                    Edit Offer
                                                                                </button>
                                                                            )
                                                                        ) : (
                                                                            // Seller Actions: The other user sent the offer to you
                                                                            msg.offer.status === 'Pending' && (
                                                                                <>
                                                                                    <button 
                                                                                        onClick={() => handleAcceptOffer(msg.offer.offerId, msg.offer.price)}
                                                                                        disabled={acceptingOffer}
                                                                                        className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ${acceptingOffer ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                                                    >
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                                        {acceptingOffer ? 'Processing...' : 'Accept Order'}
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => handleDeclineOffer(msg.offer.offerId)}
                                                                                        disabled={decliningOffer}
                                                                                        className={`px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm active:scale-95 ${decliningOffer ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    >
                                                                                        {decliningOffer ? '...' : 'Decline'}
                                                                                    </button>
                                                                                </>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div className={`px-3 pb-2 pt-1 flex items-center justify-end gap-1 text-[10px] ${msg.sender === userId ? 'bg-gray-50 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500' : 'bg-indigo-100/30 dark:bg-indigo-900/20 text-indigo-400 dark:text-indigo-400/70'}`}>
                                                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    {msg.sender !== userId && (
                                                                        <span className="flex items-center ml-1">
                                                                            {msg.isRead ? (
                                                                                <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                    <path d="M4 12l4 4L18 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                    <path d="M9 12l4 4L23 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                    <path d="M4 12l4 4L18 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                </svg>
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                     </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            </>
                            );
                        })()}
                        {!loading && messages.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Send a message to start coordinating!</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom Area: Redesigned Tabbed Interface */}
                    <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors flex flex-col flex-shrink-0 relative z-20 shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.03)] dark:shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.2)]">
                        
                        <div className="flex border-b border-gray-100 dark:border-gray-800">
                            {/* Tab Switcher */}
                            <button 
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-all relative ${
                                    activeTab === 'chat' 
                                        ? 'text-indigo-600 dark:text-indigo-400' 
                                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                                }`}
                            >
                                Chat
                                {activeTab === 'chat' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />}
                            </button>
                            
                            {!isBlockedByMe && !isBlockedByOther && (() => {
                                const sellerId = referencingItem?.data?.seller?._id || referencingItem?.data?.seller?.id || referencingItem?.data?.seller ||
                                                 referencingItem?.data?.provider?._id || referencingItem?.data?.provider?.id || referencingItem?.data?.provider;
                                const isCurrentSeller = sellerId?.toString() === user?.id?.toString();
                                const isSold = referencingItem?.type === 'product' && referencingItem?.data?.status === 'Sold';
                                
                                // CASE 1: Active Order exists -> Show Redirection Tab
                                if (activeOrder) {
                                    const role = isCurrentSeller ? 'seller' : 'buyer';
                                    const label = isCurrentSeller ? 'Manage Order' : 'Next Step';
                                    return (
                                        <Link 
                                            href={`/orders?tab=${role}&orderId=${activeOrder._id}`}
                                            className="flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-all relative"
                                        >
                                            {label}
                                            <span className="ml-1">↗</span>
                                        </Link>
                                    );
                                }

                                // CASE 2: No Order -> Show Action tab for non-sellers
                                if (!isCurrentSeller && !isSold && referencingItem?.data) {
                                    return (
                                        <button 
                                            onClick={() => setActiveTab('action')}
                                            className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-all relative ${
                                                activeTab === 'action' 
                                                    ? 'text-indigo-600 dark:text-indigo-400' 
                                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                                            }`}
                                        >
                                            {referencingItem?.type === 'product' ? 'Make Offer' : 'Req Appointment'}
                                            {activeTab === 'action' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />}
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        <div className="p-3">
                            {isBlockedByMe ? (
                                <div className="py-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-2">
                                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-900 dark:text-white font-bold text-sm">You blocked this user.</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">To chat, you must unblock them in their profile or your settings.</p>
                                </div>
                            ) : isBlockedByOther ? (
                                <div className="py-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-2">
                                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-900 dark:text-white font-bold text-sm">This user has blocked you.</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">You cannot interact with this user.</p>
                                </div>
                            ) : activeTab === 'chat' ? (
                                <div className="space-y-3">
                                    {/* Quick Chat Suggestions */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {smartReplies.map((reply) => (
                                            <button
                                                key={reply}
                                                type="button"
                                                onClick={() => setNewMessage(reply)}
                                                className="whitespace-nowrap px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-xs font-bold border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all active:scale-95 shadow-sm"
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Message Input */}
                                    <form onSubmit={handleSendMessage} className="flex gap-2 relative bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 items-center p-1 px-2 shadow-inner">
                                        <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 rounded-full hover:bg-white dark:hover:bg-gray-700">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        </button>
                                        
                                        <div className="flex-1 flex flex-col">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                maxLength={2000}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder={referencingItem ? `Ask about ${referencingItem.data?.title}...` : "Type a message..."}
                                                className="w-full bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none text-sm py-2 px-2"
                                            />
                                            {newMessage.length > 0 && (
                                                <span className={`text-[8px] px-2 font-bold ${newMessage.length >= 1900 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {newMessage.length}/2000
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className={`p-2 rounded-full transition-all flex-shrink-0 ${newMessage.trim() ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95' : 'bg-transparent text-gray-300 dark:text-gray-600'}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${newMessage.trim() ? '-rotate-45' : ''} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Quick Price Suggestions */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {[
                                            { label: 'Listed', val: Math.round(referencingItem?.data?.price || 0) },
                                            { label: '-5%', val: Math.round((referencingItem?.data?.price || 0) * 0.95) },
                                            { label: '-10%', val: Math.round((referencingItem?.data?.price || 0) * 0.9) },
                                            { label: '+5%', val: Math.round((referencingItem?.data?.price || 0) * 1.05) },
                                            { label: '+10%', val: Math.round((referencingItem?.data?.price || 0) * 1.1) },
                                        ].map((item) => (
                                            <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => { setActionPrice(item.val.toString()); setActionError(''); }}
                                                className="whitespace-nowrap px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-bold border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-95 shadow-sm"
                                            >
                                                {item.label}: ₹{item.val.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Price Writing Area */}
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 relative flex items-center">
                                                    <div className="absolute left-4 text-sm font-bold text-gray-400 dark:text-gray-500 pointer-events-none">₹</div>
                                                    <input
                                                        type="number"
                                                        value={actionPrice}
                                                        step="1"
                                                        onChange={e => { 
                                                            const val = e.target.value;
                                                            if (!/^\d*$/.test(val)) return;
                                                            setActionPrice(val); 
                                                            setActionError(''); 
                                                        }}
                                                        placeholder="Enter amount..."
                                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition-all shadow-inner"
                                                    />
                                                </div>
                                            <button
                                                onClick={handleActionSubmit}
                                                disabled={
                                                    submittingAction || 
                                                    !actionPrice || 
                                                    Number(actionPrice) <= 0 || 
                                                    Number(actionPrice) < (referencingItem?.data?.price || 0) * 0.5 ||
                                                    Number(actionPrice) > (referencingItem?.data?.price || 0) * 2
                                                }
                                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:grayscale active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
                                            >
                                                {submittingAction ? '...' : (referencingItem?.type === 'product' ? 'Send Offer' : 'Send Req')}
                                            </button>
                                        </div>
                                        {actionPrice && Number(actionPrice) > 0 && Number(actionPrice) < (referencingItem?.data?.price || 0) * 0.5 && (
                                            <p className="text-[10px] text-red-500 font-bold px-2 animate-pulse">Price cannot be less than ₹{Math.floor((referencingItem?.data?.price || 0) * 0.5)}</p>
                                        )}
                                        {actionPrice && Number(actionPrice) > (referencingItem?.data?.price || 0) * 2 && (
                                            <p className="text-[10px] text-red-500 font-bold px-2 animate-pulse">Max limit: 200% of listed price (₹{(referencingItem?.data?.price || 0) * 2})</p>
                                        )}
                                        {actionError && (
                                            <p className="text-[10px] text-red-500 font-bold px-2 animate-pulse">{actionError}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                        
        </>
    );
}
