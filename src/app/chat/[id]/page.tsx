'use client';

import { useState, useEffect, useLayoutEffect, useRef, use, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageBubbleSkeleton } from '@/components/Skeletons';
import { pusherClient } from '@/lib/pusherClient';
import { confirmAction } from '@/lib/confirm';
import ReviewModal from '@/components/ReviewModal';

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
    const [offerType, setOfferType] = useState<'Buy' | 'Rent'>('Buy');
    const [rentDuration, setRentDuration] = useState('');
    const [rentUnit, setRentUnit] = useState('day');
    const [actionError, setActionError] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');

    const activeAcceptedOffer = useMemo(() => {
        // Find the latest accepted offer message that matches the current referencing item
        return [...messages].reverse().find(m => 
            m.offer && 
            m.offer.status === 'Accepted' &&
            (m.offer.productId?.toString() === referencingItem?.id?.toString() || 
             m.offer.serviceId?.toString() === referencingItem?.id?.toString())
        );
    }, [messages, referencingItem?.id]);

    const [sendingMessage, setSendingMessage] = useState(false);
    const [acceptingOffer, setAcceptingOffer] = useState(false);
    const [decliningOffer, setDecliningOffer] = useState(false);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [reviewOrder, setReviewOrder] = useState<any | null>(null);

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

    const isCurrentSeller = useMemo(() => {
        if (!referencingItem?.data || !user?.id) return false;
        const sellerId = referencingItem.data.seller?._id || referencingItem.data.seller?.id || referencingItem.data.seller ||
                         referencingItem.data.provider?._id || referencingItem.data.provider?.id || referencingItem.data.provider;
        return sellerId?.toString() === user.id.toString();
    }, [referencingItem?.data, user?.id]);

    const isSold = useMemo(() => {
        return referencingItem?.type === 'product' && (referencingItem?.data?.status === 'Sold' || referencingItem?.data?.status === 'Rented');
    }, [referencingItem]);

    const isRented = useMemo(() => {
        return referencingItem?.type === 'product' && referencingItem?.data?.status === 'Rented';
    }, [referencingItem]);

    const inVerificationPhase = useMemo(() => {
        return !!(activeAcceptedOffer || (activeOrder && activeOrder.status === 'Scheduled'));
    }, [activeAcceptedOffer, activeOrder]);

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
                if (newMsg.sender === userId || newMsg.recipient === userId) {
                    setMessages((prev) => {
                        // UPDATE: Check for existing message ID to support status updates (Accepted/Declined)
                        const existingIndex = prev.findIndex(m => m._id === newMsg._id);
                        if (existingIndex !== -1) {
                            const updated = [...prev];
                            updated[existingIndex] = newMsg;
                            return updated;
                        }
                        
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
        const activeTab = searchParams.get('tab') || 'chat';
        // Only send if explicit autoMsg=true AND we're NOT initiating from an action tab
        if (!loading && shouldSendAutoMsg && !hasSentAutoMsg.current && messages.length === 0) {
            hasSentAutoMsg.current = true;
            
            if (activeTab !== 'action') {
                const sendInitialMsg = async () => {
                    const itemType = productId ? 'product' : (serviceId ? 'service' : null);
                    const itemName = referencingItem?.data?.title || 'this item';
                    const content = itemType 
                        ? `Hii, I'm interested in "${itemName}". Is it still available?`
                        : "Hii, I'm interested!";
                    
                    await handleSendMessage(undefined, content);
                };
                sendInitialMsg();
            }
        }
    }, [loading, messages.length, searchParams, productId, serviceId, referencingItem]);
    
    const hasAutoFilledPrice = useRef(false);
    
    // Dedicated effect for price and type pre-filling when switching to action tab
    useEffect(() => {
        if (activeTab === 'action' && !hasAutoFilledPrice.current && referencingItem?.data) {
            const data = referencingItem.data;
            const isProduct = referencingItem.type === 'product';
            
            if (isProduct) {
                // Determine initial offer type
                if (data.forRent && data.forSell === false) {
                    setOfferType('Rent');
                    if (data.rentPrice) setActionPrice(data.rentPrice.toString());
                } else {
                    setOfferType('Buy');
                    if (data.price) setActionPrice(data.price.toString());
                }
            } else {
                // For services
                if (data.price) setActionPrice(data.price.toString());
            }
            
            hasAutoFilledPrice.current = true;
        } else if (activeTab !== 'action') {
            hasAutoFilledPrice.current = false; 
        }
    }, [activeTab, referencingItem]);

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
                    scrollAdjustRef.current = {
                        savedTop: scrollRef.current?.scrollTop || 0,
                        savedHeight: scrollRef.current?.scrollHeight || 0,
                    };
                    setMessages(prev => [...data.messages, ...prev]);
                    setHasMore(data.pagination?.hasMore || false);
                } else if (isPolling) {
                   if (data.messages.length > 0) {
                        setMessages(prev => {
                            const updatedMessages = [...prev];
                            let hasChanges = false;
                            
                            data.messages.forEach((newMsg: any) => {
                                const index = updatedMessages.findIndex(m => m._id === newMsg._id);
                                if (index !== -1) {
                                    const oldMsg = updatedMessages[index];
                                    const offerStatusChanged = JSON.stringify(oldMsg.offer) !== JSON.stringify(newMsg.offer);
                                    if (offerStatusChanged || oldMsg.content !== newMsg.content || oldMsg.isRead !== newMsg.isRead) {
                                        updatedMessages[index] = newMsg;
                                        hasChanges = true;
                                    }
                                } else {
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

                if (data.otherUser?.lastSeen) {
                    setOtherUserLastSeen(new Date(data.otherUser.lastSeen));
                }
                
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
                
                try {
                    const orderRes = await fetch(`/api/orders?productId=${type === 'product' ? id : ''}&serviceId=${type === 'service' ? id : ''}&limit=10`);
                    if (orderRes.ok) {
                        const orderData = await orderRes.json();
                        const active = orderData.orders?.find((o: any) => 
                            o.status === 'Scheduled' && 
                            (
                                (o.buyer?._id?.toString() === user?.id?.toString() || o.buyer?.toString() === user?.id?.toString()) ||
                                (o.seller?._id?.toString() === user?.id?.toString() || o.seller?.toString() === user?.id?.toString())
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
                await fetchHistory(); 
                setTimeout(() => scrollToBottom('smooth'), 100); 
            }
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setSendingMessage(false);
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
                    text: 'An active order already exists for this item.\n\nOverride the previous order with the current one? (This will cancel the old order)',
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
                    await fetchItemData(referencingItem.type, referencingItem.id);
                }
            } else if (!data.promptOverride) {
                alert(data.error || 'Failed to accept offer');
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
                    await fetchItemData(referencingItem.type, referencingItem.id);
                }
            }
        } catch (error) {
            console.error('Decline offer error', error);
        } finally {
            setDecliningOffer(false);
        }
    };

    const handleActionSubmit = async (type: 'offer' | 'deal_closure' = 'offer') => {
        console.log("handleActionSubmit called with type:", type);
        if (!referencingItem?.data) {
            console.warn("No referencingItem data found");
            return;
        }

        if (referencingItem.type === 'product' && referencingItem.data.forRent && referencingItem.data.forSell === false && offerType === 'Buy') {
             setOfferType('Rent');
        } else if (referencingItem.type === 'product' && referencingItem.data.forSell && referencingItem.data.forRent === false && offerType === 'Rent') {
             setOfferType('Buy');
        }

        setSubmittingAction(true);
        setActionError('');

        try {
            if (type === 'deal_closure') {
                console.log("Starting deal_closure with code:", verificationCode);
                if (verificationCode.length !== 6) {
                    setActionError("Enter the complete 6-character code.");
                    setSubmittingAction(false);
                    return;
                }
                const res = await fetch('/api/chat/deal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId: referencingItem.id,
                        itemType: referencingItem.type,
                        recipientId: userId,
                        verificationCode: verificationCode
                    })
                });
                const data = await res.json();
                console.log("Deal closure response:", data);
                if (!res.ok) throw new Error(data.error || 'Failed to close deal');
                
                await fetchHistory();
                if (referencingItem) {
                    await fetchItemData(referencingItem.type, referencingItem.id);
                }
                
                setVerificationCode('');
                setActiveTab('chat');
                return;
            }

            const price = Number(actionPrice);
            const isProduct = referencingItem.type === 'product';

            if (!price || price <= 0) { setActionError('Please enter a valid price/budget.'); return; }
            if (isProduct) {
                if (offerType === 'Buy') {
                    if (price < (referencingItem.data.price || 0) * 0.5) { setActionError('Minimum offer: 50% of listed price.'); return; }
                    if (price > (referencingItem.data.price || 0) * 2) { setActionError('Maximum offer: 200% of listed price.'); return; }
                } else if (offerType === 'Rent') {
                    if (price < (referencingItem.data.rentPrice || 0) * 0.5) { setActionError('Minimum offer: 50% of listed rent price.'); return; }
                    if (!rentDuration || Number(rentDuration) <= 0) { setActionError('Please enter a valid rental duration.'); return; }
                }
            }

            const res = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: isProduct ? referencingItem.id : undefined,
                    serviceId: !isProduct ? referencingItem.id : undefined,
                    offerType: isProduct ? offerType : undefined,
                    rentDuration: (isProduct && offerType === 'Rent') ? Number(rentDuration) : undefined,
                    rentUnit: (isProduct && offerType === 'Rent') ? rentUnit : undefined,
                    offeredPrice: price,
                    message: actionMessage
                })
            });

            const data = await res.json();
            
            if (res.ok) { 
                const offerPayload = {
                    offerId: data.offer._id,
                    price: price,
                    offerType: offerType,
                    rentDuration: offerType === 'Rent' ? Number(rentDuration) : undefined,
                    rentUnit: offerType === 'Rent' ? rentUnit : undefined,
                    status: 'Pending' as const
                };
                
                const offerTypeStr = isProduct ? 'Offer' : 'Appointment Request';
                const note = actionMessage.trim();
                
                await handleSendMessage(undefined, note || `Sent an ${offerTypeStr}`, offerPayload);
                if (referencingItem) {
                    fetchItemData(referencingItem.type, referencingItem.id);
                }
                setActiveTab('chat');
                setActionPrice('');
                setActionMessage('');
            } else {
                setActionError(data.error || 'Something went wrong');
            }
        } catch (err: any) {
            setActionError(err.message || 'Server error. Try again later.');
        } finally {
            setSubmittingAction(false);
        }
    };

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
                    <Link 
                        href="/chat" 
                        className="md:hidden p-2 -ml-2 shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>

                    <div className="relative shrink-0 flex items-center justify-center w-14 h-14">
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
                        
                        <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/80 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-extrabold border-[2.5px] border-white dark:border-gray-900 shadow-md z-10 backdrop-blur-sm overflow-hidden">
                            {otherUser?.profilePicture ? (
                                <img 
                                    src={otherUser.profilePicture} 
                                    alt={otherUser.name} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                otherUser?.name?.charAt(0).toUpperCase() || 'U'
                            )}
                            {otherUserLastSeen && (Date.now() - otherUserLastSeen.getTime()) < 2 * 60 * 1000 && (
                                <span className="absolute bottom-0 -right-0.5 w-2.5 h-2.5 bg-green-400 border-[1.5px] border-white dark:border-gray-900 rounded-full" title="Online now" />
                            )}
                        </div>
                    </div>

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
                        <div className="px-4 py-1.5 shrink-0 flex items-center gap-3 bg-white/50 dark:bg-gray-900/20">
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-extrabold">Price</span>
                            <div className="flex items-center gap-3">
                                {referencingItem.type === 'product' ? (
                                    <>
                                        {referencingItem.data?.forSell !== false && (
                                            <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                                ₹{referencingItem.data.price?.toLocaleString()}{referencingItem.data?.forRent && <span className="ml-1 text-[8px] font-black opacity-50 uppercase tracking-tighter">Buy</span>}
                                            </span>
                                        )}
                                        {referencingItem.data?.forRent && (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center gap-0.5">
                                                ₹{referencingItem.data.rentPrice?.toLocaleString()}
                                                <span className="text-[8px] opacity-70 uppercase">/{referencingItem.data.rentUnit}</span>
                                                {referencingItem.data?.forSell !== false && <span className="ml-1 text-[8px] font-black opacity-50 uppercase tracking-tighter">Rent</span>}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center gap-0.5">
                                        ₹{referencingItem.data.price?.toLocaleString()}
                                        <span className="text-[8px] opacity-70">/{referencingItem.data.priceUnit?.split(' ')[0]}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {(referencingItem.type === 'product' && (referencingItem.data?.status === 'Sold' || referencingItem.data?.status === 'Rented')) && (
                        <div className={`px-4 py-1 border-t flex items-center justify-between ${isRented ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
                            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight ${isRented ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isRented ? "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                </svg>
                                {isRented ? 'Product Rented Out' : 'Product Sold'}
                            </div>
                            {(() => {
                                const sellerId = referencingItem.data?.seller?.id || referencingItem.data?.seller?._id || referencingItem.data?.seller;
                                const buyerId = referencingItem.data?.buyerId?.id || referencingItem.data?.buyerId?._id || referencingItem.data?.buyerId;
                                const isSeller = sellerId?.toString() === user?.id?.toString();
                                const isActualBuyer = buyerId?.toString() === user?.id?.toString();
                                
                                if (buyerId && !isActualBuyer && !isSeller) return <span className={`text-[9px] font-medium italic ${isRented ? 'text-emerald-500/70' : 'text-red-500/70'}`}>Not available</span>;
                                if (isSeller && buyerId && buyerId.toString() !== userId.toString()) return <span className={`text-[9px] font-medium italic ${isRented ? 'text-emerald-500/70' : 'text-red-500/70'}`}>Rented to other user</span>;
                                if (isActualBuyer) return <span className={`text-[9px] font-medium italic ${isRented ? 'text-emerald-500/70' : 'text-red-500/70'}`}>{isRented ? 'Product Rented' : 'Product Bought'}</span>;
                                if (isSeller && buyerId?.toString() === userId?.toString()) return <span className={`text-[9px] font-medium italic ${isRented ? 'text-emerald-500/70' : 'text-red-500/70'}`}>{isRented ? 'Rented to this user' : 'Sold to this user'}</span>;
                                return null;
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* Messages Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50 transition-colors"
            >
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
                    const latestOfferMsgId = [...messages].reverse().find(m => m.offer)?._id;
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
                                    <div className="sticky top-1 z-10 flex justify-center my-3 pointer-events-none">
                                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full shadow-sm">
                                            {group.label}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                         {group.msgs.map((msg: any) => (
                                             <div key={msg._id}>
                                                   <div className={`flex items-end gap-2 ${msg.sender === userId ? 'flex-row' : 'flex-row-reverse'}`}>
                                                      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-black text-white border border-white dark:border-gray-900 shadow-sm mb-1">
                                                          {msg.sender === userId ? (
                                                              otherUser?.profilePicture ? (
                                                                  <img src={otherUser.profilePicture} alt={otherUser.name} className="w-full h-full object-cover" />
                                                              ) : (
                                                                  otherUser?.name?.charAt(0).toUpperCase() || 'U'
                                                              )
                                                          ) : (
                                                              user?.profilePicture ? (
                                                                  <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                                                              ) : (
                                                                  user?.name?.charAt(0).toUpperCase() || 'U'
                                                              )
                                                          )}
                                                      </div>

                                                      {!msg.offer ? (
                                                          <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm transition-colors ${
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
                                                          <div className={`max-w-[90%] sm:max-w-[75%] w-full rounded-2xl overflow-hidden shadow-sm transition-colors border ${
                                                              msg.sender === userId 
                                                                  ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-tl-none' 
                                                                  : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/40 rounded-tr-none'
                                                          }`}>
                                                            <div className="p-4 flex flex-col items-center justify-center border-b border-gray-100 dark:border-gray-700/50">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                                                        {msg.sender === userId ? 'Offer Received' : 'You Offered'}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ring-1 ring-inset ${msg.offer.offerType === 'Rent' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20'}`}>
                                                                        {msg.offer.offerType || 'Buy'}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`text-4xl font-black tracking-tight ${msg.sender === userId ? 'text-gray-900 dark:text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                                        ₹{msg.offer.price?.toLocaleString()}
                                                                        {msg.offer.offerType === 'Rent' && <span className="text-xs opacity-60 ml-1 font-bold lowercase">/{msg.offer.rentUnit}</span>}
                                                                    </div>
                                                                    
                                                                    {msg.offer.offerType === 'Rent' && (
                                                                        <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-inner">
                                                                             <div className="flex flex-col items-center">
                                                                                <span className="text-[8px] font-black text-emerald-700/60 dark:text-emerald-400/60 uppercase tracking-widest">Total Duration</span>
                                                                                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-300">
                                                                                    {msg.offer.rentDuration} {msg.offer.rentUnit}{msg.offer.rentDuration > 1 ? 's' : ''}
                                                                                </span>
                                                                             </div>
                                                                        </div>
                                                                    )}
                                                                </div>
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

                                                                        {msg.offer.status === 'Accepted' && msg.sender !== userId && activeOrder?.verificationCode && (
                                                                            <div className="mt-3 w-full px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex flex-col items-center animate-in zoom-in duration-300 shadow-inner">
                                                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Secret Handoff Code</span>
                                                                                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tracking-[0.2em] font-mono">{activeOrder.verificationCode}</span>
                                                                            </div>
                                                                        )}
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

                                                            {msg._id === latestOfferMsgId && !activeOrder && (
                                                                <div className={`flex p-2 gap-2 ${msg.sender === userId ? 'bg-gray-50 dark:bg-gray-800/80' : 'bg-indigo-100/30 dark:bg-indigo-900/20'}`}>
                                                                    {msg.sender !== userId ? (
                                                                        msg.offer.status === 'Pending' && (
                                                                            <button 
                                                                                onClick={() => { setActiveTab('action'); setActionPrice(msg.offer.price.toString()); }}
                                                                                className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm active:scale-95"
                                                                            >
                                                                                Edit Offer
                                                                            </button>
                                                                        )
                                                                    ) : (
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
                                         ))}
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

            {/* Bottom Panel */}
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 relative z-20">
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-all relative ${
                            activeTab === 'chat' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
                        }`}
                    >
                        Chat
                        {activeTab === 'chat' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />}
                    </button>
                    
                    {!isBlockedByMe && !isBlockedByOther && (() => {
                        const showActionTab = (!isCurrentSeller && !activeOrder) || (isCurrentSeller && inVerificationPhase);
                        const isCompleted = activeOrder?.status === 'Completed' || (referencingItem?.data?.status === 'Sold' || referencingItem?.data?.status === 'Rented');
                        const role = isCurrentSeller ? 'seller' : 'buyer';
                        const manageLabel = isCurrentSeller ? 'Manage Order' : 'Next Step';

                        return (
                            <>
                                {showActionTab && referencingItem?.data && (
                                    <button 
                                        onClick={() => setActiveTab('action')}
                                        className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-all relative ${
                                            activeTab === 'action' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                                        }`}
                                    >
                                        {isCurrentSeller ? 'Verify Handoff' : (referencingItem?.type === 'product' ? 'Make Offer' : 'Req Appointment')}
                                        {activeTab === 'action' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />}
                                    </button>
                                )}

                                {(activeOrder || isCompleted) && (
                                    <Link 
                                        href={`/orders?tab=${role}${activeOrder ? `&orderId=${activeOrder._id}` : ''}`}
                                        className="flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-all relative border-l border-gray-100 dark:border-gray-800"
                                    >
                                        {manageLabel}
                                        <span className="ml-1 text-[8px]">↗</span>
                                    </Link>
                                )}

                                {isCompleted && !isCurrentSeller && (
                                    <button 
                                        onClick={() => setReviewOrder(activeOrder || { _id: 'temp', product: referencingItem?.data, service: referencingItem?.data, seller: referencingItem?.data?.seller, orderType: referencingItem?.type === 'product' ? 'Product' : 'Service_Appointment' })}
                                        className="flex-1 py-3 text-xs font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-all relative border-l border-gray-100 dark:border-gray-800"
                                    >
                                        Leave Review
                                    </button>
                                )}
                            </>
                        );
                    })()}
                </div>

                <div className="p-3">
                    {activeTab === 'chat' ? (
                        <div className="space-y-3">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {smartReplies.map((reply) => (
                                    <button
                                        key={reply}
                                        type="button"
                                        onClick={() => setNewMessage(reply)}
                                        className="whitespace-nowrap px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-xs font-bold border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 transition-all"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2 relative bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 items-center p-1 px-2 shadow-inner">
                                <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors shrink-0 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="w-full bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none text-sm py-2 px-2"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className={`p-2 rounded-full transition-all flex-shrink-0 ${newMessage.trim() ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-gray-300'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${newMessage.trim() ? '-rotate-45' : ''} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(() => {
                                const prodData = referencingItem?.data;
                                const prodStatus = prodData?.status;
                                if (prodStatus === 'Sold') {
                                    return (
                                        <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/10 border-2 border-dashed border-red-100 rounded-3xl">
                                            <div className="h-14 w-14 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center text-red-600 mb-3">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </div>
                                            <h3 className="text-sm font-black text-red-700 uppercase mb-1">Item Sold</h3>
                                            <p className="text-[11px] text-red-600/80 font-bold text-center">This product has been sold to someone else.</p>
                                        </div>
                                    );
                                }

                                if (isCurrentSeller) {
                                    if (inVerificationPhase) {
                                        return (
                                            <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4">
                                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 p-3 rounded-2xl shadow-sm">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-6 w-6 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" /></svg>
                                                        </div>
                                                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Handoff Verification</span>
                                                    </div>
                                                    <p className="text-[10px] text-emerald-700/70 mb-3 font-bold">
                                                        Enter the buyer's 6-character <span className="underline italic">Secret Code</span>.
                                                    </p>
                                                    <div className="relative">
                                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={verificationCode}
                                                            onChange={(e) => {setVerificationCode(e.target.value.replace(/\s/g, '').toUpperCase());}}
                                                            placeholder="CODE"
                                                            className="w-full bg-white dark:bg-gray-800 border-2 border-emerald-100 rounded-xl pl-10 pr-4 py-2.5 text-base font-black tracking-[0.2em] font-mono text-emerald-700 outline-none focus:border-emerald-500 transition-colors"
                                                            maxLength={6}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); handleActionSubmit('deal_closure'); }}
                                                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg flex items-center justify-center gap-2 ${
                                                        verificationCode.length === 6 && !submittingAction ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer' : 'bg-gray-100 text-gray-400'
                                                    }`}
                                                >
                                                    {submittingAction ? 'Processing...' : `Verify & Mark ${prodData?.type === 'service' ? 'Completed' : (offerType === 'Rent' ? 'Rented' : 'Sold')}`}
                                                </button>
                                                {actionError && <p className="text-[10px] text-red-500 font-bold px-3 py-1.5 bg-red-50 dark:bg-red-900/10 border border-red-100 rounded-lg mt-2">{actionError}</p>}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Awaiting Buyer's Offer</p>
                                            <p className="text-[9px] text-gray-400 mt-1 text-center font-medium">Once an offer is accepted, you can verify handoff here.</p>
                                        </div>
                                    );
                                }

                                return !activeOrder ? (
                                    <div className="flex flex-col gap-3">
                                        {prodStatus === 'Rented' && (
                                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                                <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-wider">Item Currently Occupied - Inquire for Later</p>
                                            </div>
                                        )}
                                        {referencingItem?.type === 'product' && (
                                            <div className="flex gap-2 items-center justify-center p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full w-max mx-auto shadow-inner border border-gray-200 dark:border-gray-700 mb-2">
                                                {prodData?.forSell !== false && (
                                                    <button 
                                                       onClick={(e) => { e.preventDefault(); setOfferType('Buy'); setActionPrice(''); }} 
                                                       className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${offerType === 'Buy' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                                                       Buy Offer
                                                    </button>
                                                )}
                                                {prodData?.forRent && (
                                                    <button 
                                                       onClick={(e) => { e.preventDefault(); setOfferType('Rent'); setActionPrice(''); }} 
                                                       className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${offerType === 'Rent' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                                                       Rent Offer
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                            {[
                                                { label: 'Listed', val: Math.round((offerType === 'Buy' || referencingItem?.type === 'service') ? (prodData?.price || 0) : (prodData?.rentPrice || 0)) },
                                                { label: '-5%', val: Math.round(((offerType === 'Buy' || referencingItem?.type === 'service') ? (prodData?.price || 0) : (prodData?.rentPrice || 0)) * 0.95) },
                                                { label: '-10%', val: Math.round(((offerType === 'Buy' || referencingItem?.type === 'service') ? (prodData?.price || 0) : (prodData?.rentPrice || 0)) * 0.90) }
                                            ].map((item) => (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    onClick={() => { setActionPrice(item.val.toString()); }}
                                                    className="whitespace-nowrap px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 text-[10px] sm:text-xs font-bold border border-emerald-100"
                                                >
                                                    {item.label}: ₹{item.val.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                            <div className="flex-1 relative flex items-center w-full">
                                                <div className="absolute left-4 text-sm font-bold text-gray-400">₹</div>
                                                <input
                                                    type="number"
                                                    value={actionPrice}
                                                    onChange={e => { setActionPrice(e.target.value); }}
                                                    placeholder={offerType === 'Rent' ? 'Rent Price...' : 'Enter amount...'}
                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none dark:bg-gray-800 dark:text-white"
                                                />
                                            </div>
                                            {offerType === 'Rent' && (
                                                <div className="flex items-center gap-1 w-full sm:w-auto">
                                                    <input 
                                                        type="number" 
                                                        value={rentDuration} 
                                                        onChange={e => setRentDuration(e.target.value.replace(/\D/g, ''))} 
                                                        placeholder="Qty"
                                                        className="w-16 border border-gray-200 dark:border-gray-700 rounded-2xl px-2 py-2.5 text-sm outline-none dark:bg-gray-800 dark:text-white"
                                                    />
                                                    <select 
                                                        value={rentUnit} 
                                                        onChange={e => setRentUnit(e.target.value)}
                                                        className="border border-gray-200 dark:border-gray-700 rounded-2xl px-2 py-2.5 text-sm outline-none dark:bg-gray-800 font-bold text-gray-600 dark:text-gray-300"
                                                    >
                                                        <option value="hour">Hours</option>
                                                        <option value="day">Days</option>
                                                        <option value="week">Weeks</option>
                                                        <option value="month">Months</option>
                                                        <option value="year">Years</option>
                                                    </select>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleActionSubmit('offer')}
                                                disabled={submittingAction || !actionPrice || (offerType === 'Rent' && !rentDuration)}
                                                className={`px-6 py-2.5 rounded-2xl text-[10px] w-full sm:w-auto font-black uppercase tracking-widest transition-all ${
                                                    (!actionPrice || submittingAction || (offerType === 'Rent' && !rentDuration)) ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' : 'bg-indigo-600 text-white'
                                                }`}
                                            >
                                                {submittingAction ? '...' : (referencingItem?.type === 'product' ? 'Send Offer' : 'Send Req')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-dashed border-emerald-200/50">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center">Deal Scheduled</p>
                                        <p className="text-[9px] text-emerald-600/70 mt-1 text-center font-bold">Coordination in progress. Check orders for details.</p>
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>
            </div>
            {reviewOrder && (
                <ReviewModal 
                    order={reviewOrder} 
                    onClose={() => setReviewOrder(null)} 
                    onSuccess={() => {
                        setReviewOrder(null);
                        if (referencingItem) fetchItemData(referencingItem.type, referencingItem.id);
                    }} 
                />
            )}
        </>
    );
}
