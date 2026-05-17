'use client';

import { useState, useEffect, useLayoutEffect, useRef, use, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageBubbleSkeleton } from '@/components/Skeletons';
import { pusherClient } from '@/lib/pusherClient';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';
import ReviewModal from '@/components/ReviewModal';
import ReportModal from '@/components/ReportModal';

const CHAR_STEP = 150;
const INITIAL_LIMIT = 300;

function ExpandableMessage({ content, msgId, isSender }: { content: string; msgId: string; isSender: boolean }) {
    const [visibleChars, setVisibleChars] = useState(INITIAL_LIMIT);
    const msgRef = useRef<HTMLDivElement>(null);

    if (!content || content.length <= INITIAL_LIMIT) {
        return <p className="break-words whitespace-pre-wrap">{content}</p>;
    }

    const isFullyExpanded = visibleChars >= content.length;
    const displayed = content.slice(0, visibleChars);
    const isTruncated = !isFullyExpanded;

    const handleShowLess = () => {
        setVisibleChars(INITIAL_LIMIT);
        // Scroll back to this message so user doesn't get lost
        setTimeout(() => {
            const el = document.getElementById(`msg-${msgId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    };

    return (
        <div ref={msgRef}>
            <p className="break-words whitespace-pre-wrap">
                {displayed}{isTruncated && '…'}
            </p>
            <div className="flex gap-2 mt-1">
                {isTruncated && (
                    <button
                        onClick={() => setVisibleChars(prev => Math.min(prev + CHAR_STEP, content.length))}
                        className={`text-[11px] font-bold underline underline-offset-2 transition-colors ${
                            isSender ? 'text-indigo-200 hover:text-white' : 'text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
                        }`}
                    >
                        Read more
                    </button>
                )}
                {visibleChars > INITIAL_LIMIT && (
                    <button
                        onClick={handleShowLess}
                        className={`text-[11px] font-bold underline underline-offset-2 transition-colors ${
                            isSender ? 'text-indigo-200 hover:text-white' : 'text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
                        }`}
                    >
                        Show less
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const userId = resolvedParams.id;
    const router = useRouter();
    const { user, loading: authLoading, refreshUser, authFetch } = useAuth();

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
    const [userLoading, setUserLoading] = useState(true);
    const [itemLoading, setItemLoading] = useState(!!(searchParams.get('productId') || searchParams.get('serviceId')));
    // Tracks whether the initial fetchHistory has resolved context (lastContext)
    const [contextResolved, setContextResolved] = useState(false);
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
            (m.product?.toString() === referencingItem?.id?.toString() || 
             m.service?.toString() === referencingItem?.id?.toString() ||
             m.offer.productId?.toString() === referencingItem?.id?.toString() || 
             m.offer.serviceId?.toString() === referencingItem?.id?.toString())
        );
    }, [messages, referencingItem?.id]);

    const [sendingMessage, setSendingMessage] = useState(false);
    const [acceptingOffer, setAcceptingOffer] = useState(false);
    const [decliningOffer, setDecliningOffer] = useState(false);
    const [unblocking, setUnblocking] = useState(false);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [reviewOrder, setReviewOrder] = useState<any | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportMode, setReportMode] = useState<'user' | 'item'>('user');
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

    const handleUnblock = async () => {
        if (unblocking) return;
        setUnblocking(true);
        try {
            const res = await authFetch(`/api/user/block?userId=${userId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                await refreshUser();
                showSuccess('User Unblocked', 'You can now message this user again.');
            } else {
                showError('Action Failed', 'Failed to unblock user.');
            }
        } catch (error) {
            console.error('Failed to unblock user', error);
            showError('System Error', 'An unexpected error occurred.');
        } finally {
            setUnblocking(false);
        }
    };

    const handleDeleteChat = async () => {
        const confirmed = await confirmAction({
            title: 'Delete Chat?',
            text: "Are you sure you want to delete this chat? This action only hides it for you.",
            dangerMode: true,
            confirmButtonText: 'Delete'
        });
        if (!confirmed) return;

        try {
            const pId = referencingItem?.type === 'product' ? referencingItem.id : '';
            const sId = referencingItem?.type === 'service' ? referencingItem.id : '';

            const res = await authFetch(`/api/chat/conversations?otherUserId=${userId}${pId ? `&productId=${pId}` : (sId ? `&serviceId=${sId}` : '')}`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                router.push('/chat');
            } else {
                showError('Action Failed', 'Failed to delete chat.');
            }
        } catch (err) {
            console.error(err);
            showError('System Error', 'Something went wrong.');
        }
    };

    const handleBlockToggle = async () => {
        const alreadyBlocked = isBlockedByMe;
        
        const confirmed = await confirmAction({
            title: alreadyBlocked ? `Unblock User?` : `Block User?`,
            text: alreadyBlocked 
                ? `They will be able to message you again.` 
                : `They will no longer be able to message you and their listings will be hidden.`,
            dangerMode: !alreadyBlocked,
            confirmButtonText: alreadyBlocked ? 'Unblock' : 'Block'
        });
        if (!confirmed) return;

        try {
            const res = await authFetch(alreadyBlocked ? `/api/user/block?userId=${userId}` : '/api/user/block', {
                method: alreadyBlocked ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                ...(alreadyBlocked ? {} : { body: JSON.stringify({ targetUserId: userId }) })
            });
            
            if (res.ok) {
                await refreshUser();
                showSuccess(alreadyBlocked ? 'User Unblocked' : 'User Blocked', `User has been ${alreadyBlocked ? 'unblocked' : 'blocked'}.`);
                setHeaderMenuOpen(false);
            } else {
                showError('Action Failed', `Failed to ${alreadyBlocked ? 'unblock' : 'block'} user.`);
            }
        } catch (err) {
            console.error(err);
            showError('System Error', 'Something went wrong.');
        }
    };

    const [otherUserLastSeen, setOtherUserLastSeen] = useState<Date | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const justSentRef = useRef(false);
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
        return referencingItem?.type === 'product' && referencingItem?.data?.status === 'Sold';
    }, [referencingItem]);

    const isRented = useMemo(() => {
        return referencingItem?.type === 'product' && referencingItem?.data?.status === 'Rented';
    }, [referencingItem]);

    const isReserved = useMemo(() => {
        return referencingItem?.type === 'product' && referencingItem?.data?.status === 'Reserved';
    }, [referencingItem]);

    const prevConvRef = useRef<string>("");
    const itemIsOccupied = useMemo(() => {
        if (!referencingItem?.data) return false;
        
        // Use the explicit flag from the API if available
        if (referencingItem.data.isOccupied !== undefined) {
            return referencingItem.data.isOccupied;
        }

        // Fallback to internal status check
        if (referencingItem.type === 'product') {
            return ['Sold', 'Rented', 'Reserved'].includes(referencingItem.data.status);
        }
        return false;
    }, [referencingItem]);

    const isCampusPaused = useMemo(() => {
        // Check if the item's community is paused
        const comm = referencingItem?.data?.communityId;
        if (typeof comm === 'object' && comm?.isActive === false) return true;
        
        // Fallback to otherUser's community if discussing a general chat
        if (!referencingItem?.data && otherUser?.verifiedCommunities?.[0]?.isActive === false) return true;
        
        return false;
    }, [referencingItem, otherUser]);

    const isShadowBanned = useMemo(() => {
        return otherUser?.status === 'Banned' && (otherUser?.bio?.includes('moderation review') || otherUser?.bio?.includes('Shadow Lockdown'));
    }, [otherUser]);

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
    const currentUserId = user?.id || (user as any)?._id;

    useEffect(() => {
        const convKey = `${userId}-${productId || ''}-${serviceId || ''}`;
        if (prevConvRef.current === convKey) return;
        prevConvRef.current = convKey;

        // Reset state on conversation switch
        setMessages([]);
        setHasMore(false);
        setInitialLoad(true);
        setLoading(true);
        setContextResolved(false);
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
            setItemLoading(true);
            setContextResolved(true); // URL has explicit context, no need to wait
            fetchItemData('product', productId);
        } else if (serviceId) {
            setReferencingItem({ type: 'service', id: serviceId });
            setItemLoading(true);
            setContextResolved(true); // URL has explicit context, no need to wait
            fetchItemData('service', serviceId);
        } else {
            setReferencingItem(null);
            setItemLoading(false);
            // contextResolved stays false — will be set true once fetchHistory resolves lastContext
        }

        fetchHistory(null);
        setUserLoading(true);
        fetchOtherUser();
    }, [userId, productId, serviceId]);

    // WebSockets Real-time Updates
    useEffect(() => {
        let channelName = '';
        if (currentUserId) {
            channelName = `private-user-${currentUserId}`;
            const channel = pusherClient.subscribe(channelName);
            
            channel.bind('new-message', (newMsg: any) => {
                if (newMsg.sender === userId || newMsg.recipient === userId) {
                    setMessages((prev) => {
                        // Check for existing message by real ID (status updates like Accepted/Declined)
                        const existingIndex = prev.findIndex(m => m._id === newMsg._id);
                        if (existingIndex !== -1) {
                            const updated = [...prev];
                            updated[existingIndex] = newMsg;
                            return updated;
                        }
                        
                        // If the message was sent by us, replace the optimistic temp-* message
                        if (newMsg.sender === currentUserId || newMsg.sender?.toString() === currentUserId) {
                            const tempIndex = prev.findIndex(m => 
                                typeof m._id === 'string' && m._id.startsWith('temp-') &&
                                m.content === newMsg.content
                            );
                            if (tempIndex !== -1) {
                                const updated = [...prev];
                                updated[tempIndex] = newMsg;
                                return updated;
                            }
                        }
                        
                        // Only add if truly new (prevent duplicates from polling + Pusher race)
                        const isDuplicate = prev.some(m => m._id === newMsg._id);
                        if (isDuplicate) return prev;
                        
                        return [...prev, newMsg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    });
                    
                    // Instant sync of item status (Rented, Sold, Occupied labels) when new message arrives
                    if (referencingItemRef.current) {
                        fetchItemData(referencingItemRef.current.type, referencingItemRef.current.id);
                    }
                    
                    // Only fire background sync for messages from OTHER users (read receipts)
                    // Skip for our own messages — we already have them via optimistic update
                    if (newMsg.sender !== currentUserId && newMsg.sender?.toString() !== currentUserId) {
                        fetchHistory(null, true);
                    }
                }
            });
        }

        // Heartbeat: update our own lastSeen every 30 seconds
        const heartbeat = () => authFetch('/api/user/online', { method: 'PATCH' });
        heartbeat(); // immediate on mount
        const heartbeatInterval = setInterval(heartbeat, 30_000);

        return () => { 
            clearInterval(heartbeatInterval); 
            if (channelName) pusherClient.unsubscribe(channelName);
        };
    }, [userId, productId, serviceId, currentUserId]);

    // Handle mobile keyboard layout issues
    useEffect(() => {
        if (!window.visualViewport) return;

        const handleResize = () => {
            if (scrollRef.current && window.visualViewport) {
                // When keyboard opens, scroll to bottom to keep input visible
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, []);

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
        if (scrollRef.current) {
            if (initialLoad && messages.length > 0) {
                scrollToBottom('auto');
                setInitialLoad(false);
            } else if (messages.length > 0) {
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 600;
                
                if (justSentRef.current || isNearBottom) {
                    scrollToBottom(justSentRef.current ? 'auto' : 'smooth');
                    justSentRef.current = false;
                }
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

            const res = await authFetch(url.toString());
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
                
                if (!searchParams.get('productId') && !searchParams.get('serviceId')) {
                    if (data.lastContext) {
                        setReferencingItem(data.lastContext);
                        // Also fetch full item data for status bars / price display
                        if (data.lastContext.type && (data.lastContext.data?._id || data.lastContext.id)) {
                            const ctxId = data.lastContext.data?._id || data.lastContext.id;
                            setItemLoading(true);
                            fetchItemData(data.lastContext.type, ctxId).finally(() => setContextResolved(true));
                            return; // Don't set contextResolved here, let fetchItemData do it
                        }
                    }
                    // No context found or context has no valid ID — mark resolved
                    setContextResolved(true);
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
            setUserLoading(true);
            const res = await authFetch(`/api/profile/${userId}?limit=5`);
            if (res.ok) {
                const data = await res.json();
                setOtherUser(data.user);
            } else if (res.status === 403) {
                setIsBlockedByOther(true);
            }
        } catch (error) {
            console.error('Failed to fetch other user', error);
        } finally {
            setUserLoading(false);
        }
    };

    const fetchItemData = async (type: 'product' | 'service', id: string) => {
        try {
            setItemLoading(true);
            const res = await authFetch(`/api/${type}s/${id}`);
            if (res.ok) {
                const data = await res.json();
                const itemData = data[type];
                setReferencingItem({ type, id, data: { ...itemData, buyerId: data.buyerId } });
                
                try {
                    const orderRes = await authFetch(`/api/orders?productId=${type === 'product' ? id : ''}&serviceId=${type === 'service' ? id : ''}&limit=10`);
                    if (orderRes.ok) {
                        const orderData = await orderRes.json();
                        const active = orderData.orders?.find((o: any) => {
                            const bId = (o.buyer?._id || o.buyer)?.toString();
                            const sId = (o.seller?._id || o.seller)?.toString();
                            const currId = user?.id?.toString();
                            const targId = userId?.toString();
                            
                            if (!currId || !targId) return false;
                            
                            // Check if this order is exactly between the current user and the chat partner
                            const isMyOrder = (bId === currId && sId === targId) || (sId === currId && bId === targId);
                            return isMyOrder && (o.status === 'Scheduled' || o.status === 'Completed' || o.status === 'Reserved');
                        });
                        setActiveOrder(active || null);
                    }
                } catch (err) {
                    console.error("Order lookup error", err);
                }
            }
        } catch (error) {
            console.error(`Failed to fetch ${type} data`, error);
        } finally {
            setItemLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, customContent?: string, offerPayload?: any) => {
        if (e) e.preventDefault();
        const content = customContent || newMessage.trim();
        if ((!content && !offerPayload) || sendingMessage) return;

        setSendingMessage(true);
        if (!customContent && !offerPayload) setNewMessage('');

        // Optimistic UI Update
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempId,
            sender: user?.id || (user as any)?._id,
            recipient: userId,
            content: content || (referencingItem?.type === 'service' ? 'Sent an Appointment Request' : 'Sent an Offer'),
            createdAt: new Date().toISOString(),
            isRead: false,
            offer: offerPayload || undefined
        };

        setMessages(prev => {
            const newMessages = [...prev, optimisticMessage];
            return newMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        
        // Immediate scroll before server roundtrip
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        justSentRef.current = true;
        setTimeout(() => scrollToBottom('auto'), 10);

        try {
            const pId = searchParams.get('productId');
            const sId = searchParams.get('serviceId');

            const res = await authFetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recipientId: userId, 
                    content: content || (referencingItem?.type === 'service' ? 'Sent an Appointment Request' : 'Sent an Offer'),
                    productId: pId,
                    serviceId: sId,
                    offer: offerPayload || undefined
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Replace the optimistic message with the real server message immediately
                // This prevents duplicates: Pusher will see the real _id already exists and skip it
                if (data.message?._id) {
                    setMessages(prev => prev.map(m => m._id === tempId ? data.message : m));
                }
                setTimeout(() => scrollToBottom('smooth'), 50); 
            } else {
                setMessages(prev => prev.filter(m => m._id !== tempId));
            }
        } catch (error) {
            console.error('Failed to send message', error);
            setMessages(prev => prev.filter(m => m._id !== tempId));
        } finally {
            setSendingMessage(false);
        }
    };

    const handleAcceptOffer = async (offerId: string, offerPrice: number, override: boolean = false) => {
        if (isBlockedByMe) {
            showError('User Blocked', 'You must unblock this user to accept their offer.');
            return;
        }
        if (isBlockedByOther) {
            showError('Action Restricted', 'You cannot accept offers from a user who has blocked you.');
            return;
        }
        if (acceptingOffer) return;
        setAcceptingOffer(true);
        try {
            const res = await authFetch(`/api/offers/${offerId}`, {
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
                showSuccess('Offer Accepted', 'The deal has been confirmed!');
                await fetchHistory(null, true); 
                if (referencingItem) {
                    await fetchItemData(referencingItem.type, referencingItem.id);
                }
            } else {
                showError('Action Denied', data.error || 'Failed to accept offer');
            }
        } catch (error) {
            console.error(error);
            showError('System Error', 'An unexpected error occurred.');
        } finally {
            setAcceptingOffer(false);
        }
    };

    const handleDeclineOffer = async (offerId: string) => {
        if (isBlockedByMe) {
            showError('User Blocked', 'You must unblock this user to decline their offer.');
            return;
        }
        if (isBlockedByOther) {
            showError('Action Restricted', 'You cannot decline offers from a user who has blocked you.');
            return;
        }
        if (decliningOffer) return;
        setDecliningOffer(true);
        try {
            const res = await authFetch(`/api/offers/${offerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline' })
            });
            if (res.ok) {
                await fetchHistory(null, true); 
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
                const res = await authFetch('/api/chat/deal', {
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
                
                await fetchHistory(null, true);
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

            const res = await authFetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: isProduct ? referencingItem.id : undefined,
                    serviceId: !isProduct ? referencingItem.id : undefined,
                    offerType: isProduct ? offerType : undefined,
                    rentDuration: (isProduct && offerType === 'Rent') ? Number(rentDuration) : undefined,
                    rentUnit: (isProduct && offerType === 'Rent') ? rentUnit : undefined,
                    offeredPrice: price,
                    message: undefined
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
                
                await handleSendMessage(undefined, `Sent an ${offerTypeStr}`, offerPayload);
                if (referencingItem) {
                    fetchItemData(referencingItem.type, referencingItem.id);
                }
                setActiveTab('chat');
                justSentRef.current = true;
                setTimeout(() => scrollToBottom('auto'), 50);
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

    if ((authLoading || loading || userLoading || itemLoading || !contextResolved) && messages.length === 0) return <MessageBubbleSkeleton />;

    return (
        <>
            {/* Unified Context Header */}
            <div 
                className="relative z-[60] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors shrink-0 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => router.push(`/profile/${userId}`)}
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
                            {otherUser?.profilePicture && !otherUser.profilePicture.includes('??') ? (
                                <img 
                                    src={otherUser.profilePicture} 
                                    alt={otherUser.name || 'User'} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="flex items-center justify-center w-full h-full bg-indigo-50 dark:bg-indigo-900/40">
                                    {(otherUser?.name?.[0] || otherUser?.username?.[0] || 'U').toUpperCase()}
                                </span>
                            )}
                            {otherUserLastSeen && (Date.now() - otherUserLastSeen.getTime()) < 2 * 60 * 1000 && (
                                <span className="absolute bottom-0 -right-0.5 w-2.5 h-2.5 bg-green-400 border-[1.5px] border-white dark:border-gray-900 rounded-full" title="Online now" />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                        <h1 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                            {userLoading ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                    Syncing Profile...
                                </span>
                            ) : (
                                otherUser?.name || (isBlockedByOther ? 'Restricted User' : 'User Departed')
                            )}
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1.5 leading-none mt-0.5">
                            {userLoading 
                                ? 'Establishing secure connection...' 
                                : (isBlockedByOther ? 'Messages restricted' : (otherUser ? 'Active conversation' : 'Conversation archived'))}
                        </p>
                    </div>
                    
                    <div className="relative pl-1 shrink-0">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(!headerMenuOpen); }}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>

                        {headerMenuOpen && (
                            <div 
                                className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-[100] animate-in fade-in zoom-in duration-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); handleDeleteChat(); }}
                                    className="w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Chat
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleBlockToggle(); }}
                                    className={`w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors border-t border-gray-50 dark:border-gray-700/50 ${isBlockedByMe ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    {isBlockedByMe ? 'Unblock User' : 'Block User'}
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700/50 my-1"></div>
                                <button 
                                    onClick={() => { setHeaderMenuOpen(false); setReportMode('user'); setIsReportModalOpen(true); }}
                                    className="w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Report User
                                </button>
                                {referencingItem?.data && (
                                    <button 
                                        onClick={() => { setHeaderMenuOpen(false); setReportMode('item'); setIsReportModalOpen(true); }}
                                        className="w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors border-t border-gray-50 dark:border-gray-700/50"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Report Listing
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>            {/* Item Info Bar */}
            <div className="flex flex-col bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
                <div className="flex text-[11px] font-bold text-gray-500 dark:text-gray-400 divide-x divide-gray-200 dark:divide-gray-800">
                    <div className="flex-1 px-4 py-1.5 truncate flex items-center gap-2">
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-extrabold shrink-0">Discussing</span>
                        <span className="text-gray-700 dark:text-gray-200 truncate">{referencingItem?.data?.title || (itemLoading || !contextResolved ? 'Loading Context...' : 'Listing Removed from Marketplace')}</span>
                    </div>
                    {referencingItem?.data && (
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
                                                <span className="text-[8px] opacity-70 uppercase">/{referencingItem.data.rentUnit?.split(' ').pop()}</span>
                                                {referencingItem.data?.forSell !== false && <span className="ml-1 text-[8px] font-black opacity-50 uppercase tracking-tighter">Rent</span>}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center gap-0.5">
                                        ₹{referencingItem.data.price?.toLocaleString()}
                                        <span className="text-[8px] opacity-70">/{referencingItem.data.priceUnit?.split(' ').pop()}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {(referencingItem?.data && (
                    (referencingItem.type === 'product' && (referencingItem.data?.status === 'Sold' || referencingItem.data?.status === 'Rented')) ||
                    (referencingItem.type === 'service' && referencingItem.data?.isOccupied)
                )) && (
                    <div className={`px-4 py-1 border-t flex items-center justify-between ${ (isRented || referencingItem.type === 'service') ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
                        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight ${ (isRented || referencingItem.type === 'service') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isSold ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"} />
                            </svg>
                            {isSold ? 'Product Sold' : (isRented ? 'Product Rented Out' : 'Provider Busy (Active Booking)')}
                        </div>
                        {(() => {
                            const sellerId = referencingItem.data?.seller?.id || referencingItem.data?.seller?._id || referencingItem.data?.seller || 
                                             referencingItem.data?.provider?.id || referencingItem.data?.provider?._id || referencingItem.data?.provider;
                            const buyerId = referencingItem.data?.buyerId?.id || referencingItem.data?.buyerId?._id || referencingItem.data?.buyerId;
                            const isSeller = sellerId?.toString() === user?.id?.toString();
                            const isActualBuyer = buyerId?.toString() === user?.id?.toString();
                            
                            const labelType = referencingItem.type === 'product' ? (isRented ? 'Rented' : 'Sold') : 'Booked';

                            if (buyerId && !isActualBuyer && !isSeller) return <span className={`text-[9px] font-medium italic ${isSold ? 'text-red-500/70' : 'text-emerald-500/70'}`}>Currently Busy</span>;
                            if (isSeller && buyerId && buyerId.toString() !== userId.toString()) return <span className={`text-[9px] font-medium italic ${isSold ? 'text-red-500/70' : 'text-emerald-500/70'}`}>{labelType} to other user</span>;
                            if (isActualBuyer) return <span className={`text-[9px] font-medium italic ${isSold ? 'text-red-500/70' : 'text-emerald-500/70'}`}>{referencingItem.type === 'product' ? (isRented ? 'Product Rented' : 'Product Bought') : 'Service Booked'}</span>;
                            if (isSeller && buyerId?.toString() === userId?.toString()) return <span className={`text-[9px] font-medium italic ${isSold ? 'text-red-500/70' : 'text-emerald-500/70'}`}>{labelType} to this user</span>;
                            return null;
                        })()}
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50 transition-colors"
            >
                {/* Retention Policy Hint */}
                <div className="flex justify-center mb-6 pt-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100/50 dark:bg-gray-900/30 rounded-2xl border border-gray-200 dark:border-gray-800/50 shadow-sm transition-all hover:bg-white dark:hover:bg-gray-900/50 group">
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Messages expire after 30 days</span>
                    </div>
                </div>

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
                                             <div key={msg._id} id={`msg-${msg._id}`}>
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
                                                              <ExpandableMessage content={msg.content} msgId={msg._id} isSender={msg.sender !== userId} />
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
                                                                        {msg.service 
                                                                            ? (msg.sender === userId ? 'Request Received' : 'Request Sent') 
                                                                            : (msg.sender === userId ? 'Offer Received' : 'You Offered')}
                                                                    </span>
                                                                    {!msg.service && (
                                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ring-1 ring-inset ${msg.offer.offerType === 'Rent' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20'}`}>
                                                                            {msg.offer.offerType || 'Buy'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`text-4xl font-black tracking-tight ${msg.sender === userId ? 'text-gray-900 dark:text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                                        ₹{msg.offer.price?.toLocaleString()}
                                                                        {msg.offer.offerType === 'Rent' && <span className="text-xs opacity-60 ml-1 font-bold lowercase">/{msg.offer.rentUnit?.split(' ').pop()}</span>}
                                                                    </div>
                                                                    
                                                                    {msg.offer.offerType === 'Rent' && (
                                                                        <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-inner">
                                                                             <div className="flex flex-col items-center">
                                                                                <span className="text-[8px] font-black text-emerald-700/60 dark:text-emerald-400/60 uppercase tracking-widest">Total Duration</span>
                                                                                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-300">
                                                                                    {msg.offer.rentDuration} {msg.offer.rentUnit?.split(' ').pop()}{msg.offer.rentDuration > 1 ? 's' : ''}
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

                                                                        {msg.offer.status === 'Accepted' && msg.sender !== userId && msg.offer.verificationCode && (
                                                                            <div className="mt-3 w-full px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex flex-col items-center animate-in zoom-in duration-300 shadow-inner">
                                                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Secret Handoff Code</span>
                                                                                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tracking-[0.2em] font-mono">{msg.offer.verificationCode}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {msg.offer.status === 'Declined' && (
                                                                    <span className="mt-3 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full">Declined</span>
                                                                )}
                                                            </div>
                                                            
                                                            {msg.content && !msg.content.startsWith("🤝") && (
                                                                <div className={`px-4 py-3 text-sm italic border-b border-gray-100 dark:border-gray-700/50 ${msg.sender === userId ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300' : 'bg-white/50 dark:bg-gray-900/20 text-indigo-900/80 dark:text-indigo-200'}`}>
                                                                    "{msg.content.replace(/^Note:\s*/, '')}"
                                                                </div>
                                                            )}

                                                            {msg._id === latestOfferMsgId && !isSold && (
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
                                                                                    onClick={() => {
                                                                                        if (itemIsOccupied) {
                                                                                            showError('Item Occupied', `This ${referencingItem?.type || 'item'} is currently ${referencingItem?.data?.status === 'Rented' ? 'rented out' : 'busy with another order'}. Please wait until the current transaction concludes or cancel the previous order first.`);
                                                                                            return;
                                                                                        }
                                                                                        handleAcceptOffer(msg.offer.offerId, msg.offer.price);
                                                                                    }}
                                                                                    disabled={acceptingOffer}
                                                                                    className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ${acceptingOffer || (itemIsOccupied && msg.offer.status === 'Pending') ? 'bg-gray-400 grayscale cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                                    {acceptingOffer ? 'Processing...' : (itemIsOccupied ? 'Item Busy' : 'Accept Order')}
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
                {!isBlockedByMe && !isBlockedByOther && (
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
                        
                        {(() => {
                            // Action tab should be hidden for buyers if an active (Scheduled/Reserved) order exists OR if product is already busy
                            const hasActiveDeal = activeOrder && ['Scheduled', 'Reserved', 'Paid'].includes(activeOrder.status);
                            const isRecurrent = activeOrder?.status === 'Completed'; 
                            
                            const showActionTab = (!isCurrentSeller && !isSold && !isRented && (!activeOrder || isRecurrent)) || (isCurrentSeller && inVerificationPhase);
                            const isCompleted = activeOrder?.status === 'Completed';
                            const role = isCurrentSeller ? 'seller' : 'buyer';
                            const manageLabel = isCurrentSeller ? 'Manage Order' : 'Next Step';

                            return (
                                <>
                                    {showActionTab && referencingItem?.data && !isSold && (
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

                                    {activeOrder && (
                                        <Link 
                                            href={`/orders?tab=${role}${activeOrder ? `&orderId=${activeOrder._id}` : ''}`}
                                            className="flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-all relative border-l border-gray-100 dark:border-gray-800"
                                        >
                                            {manageLabel}
                                            <span className="ml-1 text-[8px]">↗</span>
                                        </Link>
                                    )}

                                    {isCompleted && activeOrder && !isCurrentSeller && !activeOrder.isReviewed && (
                                        <button 
                                            onClick={() => setReviewOrder(activeOrder || { _id: 'temp', product: referencingItem?.data, service: referencingItem?.data, seller: referencingItem?.data?.seller, orderType: referencingItem?.type === 'product' ? 'Product' : 'Service_Appointment', itemPrice: referencingItem?.data?.price || referencingItem?.data?.rentPrice })}
                                            className="flex-1 py-3 text-xs font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-all relative border-l border-gray-100 dark:border-gray-800"
                                        >
                                            Leave Review
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                <div className="p-3">
                    {isBlockedByMe ? (
                        <div className="flex flex-col items-center gap-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="w-full flex items-center gap-4">
                                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Contact Blocked</span>
                                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                             </div>
                             
                             <div className="flex flex-col items-center gap-2">
                                <button 
                                    onClick={handleUnblock}
                                    disabled={unblocking}
                                    className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-500/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {unblocking ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        'Unblock User'
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-2">Unblock to resume conversation and viewing listings.</p>
                             </div>

                             <div className="w-full h-px bg-gray-100 dark:bg-gray-800" />
                        </div>
                    ) : (isBlockedByOther || isShadowBanned || (otherUser?.status === 'Banned')) ? (
                        <div className="flex flex-col items-center justify-center py-10 px-6 bg-red-50/50 dark:bg-red-950/5 rounded-[2rem] border border-dashed border-red-100 dark:border-red-900/20 animate-in zoom-in-95 duration-500">
                            <div className="w-12 h-12 bg-red-100/50 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isShadowBanned ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z"} />
                                </svg>
                            </div>
                            <h3 className="text-sm font-black text-red-900 dark:text-red-200 uppercase tracking-widest mb-1">
                                {isShadowBanned ? 'Account Frozen' : 'Access Restricted'}
                            </h3>
                            <p className="text-[10px] text-red-600/70 dark:text-red-400/60 font-bold text-center leading-relaxed">
                                {isShadowBanned 
                                    ? "Your profile is currently under safety review and cannot be re-activated at this time. Please contact ReCircle Support."
                                    : (otherUser?.status === 'Banned' ? "This account has been permanently suspended for violating community safety guidelines." : "You cannot send messages to this user because of their privacy settings.")}
                            </p>
                        </div>
                    ) : isCampusPaused ? (
                        <div className="flex flex-col items-center justify-center py-8 px-6 bg-amber-50/50 dark:bg-amber-900/5 rounded-[2rem] border border-dashed border-amber-100 dark:border-amber-900/20 animate-in zoom-in-95 duration-500">
                             <div className="w-10 h-10 bg-amber-100/50 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-[11px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest mb-1.5">Marketplace Offline</h3>
                            <p className="text-[10px] text-amber-700/70 dark:text-amber-400/60 font-black text-center leading-relaxed uppercase tracking-tight">
                                Access Restricted: This campus circle is currently under maintenance. Marketplace activity is temporarily paused.
                            </p>
                        </div>
                    ) : (
                        activeTab === 'chat' ? (
                            <>
                                {isSold ? (
                                    <div className="flex flex-col items-center justify-center py-6 px-6 bg-gray-100 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 shadow-inner">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                            <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em] italic">Product Sold • Chat Closed</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-bold px-6 leading-relaxed">This transaction has reached its conclusion. Further messaging is disabled for this listing.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                            {smartReplies.map((reply) => (
                                                <button
                                                    key={reply}
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewMessage(reply); }}
                                                    className="whitespace-nowrap px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-xs font-bold border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 transition-all shadow-sm active:scale-95"
                                                >
                                                    {reply}
                                                </button>
                                            ))}
                                        </div>
                                        <form onSubmit={handleSendMessage} className="flex gap-2 relative bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 items-center p-1 px-2 shadow-inner">
                                            <button 
                                                type="button" 
                                                onClick={() => showSuccess('Coming Soon!', 'Attachments and file sharing will be available in v2.0 🚀')}
                                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors shrink-0 rounded-full"
                                            >
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
                                )}
                            </>
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
                                                        {submittingAction ? 'Processing...' : `Verify & Mark ${referencingItem?.type === 'service' ? 'Completed' : ((activeAcceptedOffer?.offer?.offerType || activeOrder?.transactionType || offerType || 'Buy') === 'Rent' ? 'Rented' : 'Sold')}`}
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

                                    return (
                                        <div className="flex flex-col gap-3">
                                            {referencingItem?.data?.isOccupied && (
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
                                                        onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                                                        onChange={e => { setActionPrice(e.target.value.replace(/\D/g, '')); }}
                                                        placeholder={offerType === 'Rent' ? 'Rent Price...' : 'Enter amount...'}
                                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none dark:bg-gray-800 dark:text-white"
                                                    />
                                                </div>
                                                {offerType === 'Rent' && (
                                                    <div className="flex items-center gap-1 w-full sm:w-auto">
                                                        <input 
                                                            type="number" 
                                                            value={rentDuration} 
                                                            onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
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
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleActionSubmit('offer'); }}
                                                    disabled={submittingAction || !actionPrice || (offerType === 'Rent' && !rentDuration)}
                                                    className={`px-6 py-2.5 rounded-2xl text-[10px] w-full sm:w-auto font-black uppercase tracking-widest transition-all ${
                                                        (!actionPrice || submittingAction || (offerType === 'Rent' && !rentDuration)) ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' : 'bg-indigo-600 text-white'
                                                    }`}
                                                >
                                                    {submittingAction ? '...' : (referencingItem?.type === 'product' ? 'Send Offer' : 'Send Req')}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )
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

            {isReportModalOpen && (
                <ReportModal
                    targetUserId={userId}
                    itemType={reportMode === 'item' ? (referencingItem?.type || null) : null}
                    itemId={reportMode === 'item' ? referencingItem?.id : null}
                    onClose={() => setIsReportModalOpen(false)}
                />
            )}
        </>
    );
}
