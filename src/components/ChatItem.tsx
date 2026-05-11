'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatChatMessageDate } from '@/lib/utils';
import { getConversationStatus } from '@/lib/chatUtils';
import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface ChatItemProps {
    conv: any;
    isActive: boolean;
    displayUnread: number;
    activeMenu: string | null;
    setActiveMenu: (key: string | null) => void;
    handleDeleteChat: (e: React.MouseEvent, conv: any) => void;
    handleReportClick: (e: React.MouseEvent, conv: any) => void;
    handleReportUserClick: (e: React.MouseEvent, conv: any) => void;
    handleBlockClick: (e: React.MouseEvent, conv: any) => void; // [NEW] block handler
    onItemClick: () => void;
}

export const ChatItem = React.memo(({
    conv,
    isActive,
    displayUnread,
    activeMenu,
    setActiveMenu,
    handleDeleteChat,
    handleReportClick,
    handleReportUserClick,
    handleBlockClick,
    onItemClick
}: ChatItemProps) => {
    const { user } = useAuth();
    const itemTitle = conv.product?.title || conv.service?.title || 'Listing Removed';
    const itemImage = conv.product?.images?.[0] || conv.service?.images?.[0] || null;
    const currentRawUserId = conv.rawUserId || conv.user?._id;
    const currentRawProductId = conv.rawProductId || conv.product?._id;
    const currentRawServiceId = conv.rawServiceId || conv.service?._id;
    
    // Create a truly unique key for each item thread, even if listing is removed
    const itemIdentifier = currentRawProductId || currentRawServiceId || 'generic';
    const menuKey = `${currentRawUserId || 'deleted'}-${itemIdentifier}`;

    // Determine what status badge to show (e.g. SOLD, ACTIVE, CANCELLED).
    // Business logic is kept in chatUtils.ts for testability and readability.
    const statusInfo = getConversationStatus(conv, user?.id?.toString());

    return (
        <div className="relative group">
            <Link
                href={`/chat/${currentRawUserId || 'deleted'}${currentRawProductId ? `?productId=${currentRawProductId}` : (currentRawServiceId ? `?serviceId=${currentRawServiceId}` : '')}`}
                onClick={onItemClick}
                className={`block p-4 transition-all border-b border-gray-100 dark:border-gray-800 relative group overflow-hidden ${
                    isActive ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 dark:bg-indigo-400 shadow-[2px_0_10px_rgba(79,70,229,0.3)] animate-in slide-in-from-left duration-300" />
                )}
                <div className="flex items-start gap-4 mx-1">
                    <div className="relative shrink-0 flex items-center justify-center w-14 h-14 mt-1">
                        <div className="absolute top-0 left-0 right-2 bottom-2 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105">
                            {itemImage ? (
                                <Image src={itemImage} alt={itemTitle} fill sizes="56px" className="object-cover" />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-gray-300 dark:text-gray-700"><svg className="w-6 h-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-[10px] font-black border-2 border-white dark:border-gray-900 shadow-md z-10 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5 overflow-hidden">
                            {conv.user?.profilePicture && !conv.user.profilePicture.includes('??') ? (
                                <Image 
                                    src={conv.user.profilePicture} 
                                    alt={conv.user.name || 'User'} 
                                    fill 
                                    sizes="28px" 
                                    className="object-cover"
                                />
                            ) : (
                                <span className="flex items-center justify-center w-full h-full bg-indigo-50 dark:bg-indigo-950/40 text-[10px]">
                                    {(conv.user?.name?.[0] || conv.user?.username?.[0] || 'U').toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                        <div className="flex justify-between items-center mb-0.5">
                            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white truncate pr-1 whitespace-nowrap overflow-hidden">
                                {conv.user ? (conv.user.name || conv.user.username || 'Anonymous User') : 'User Departed'}
                            </h3>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">
                                {formatChatMessageDate(conv.lastMessage.createdAt)}
                            </span>
                        </div>

                        <div className="flex items-center mb-0.5 min-w-0">
                            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate flex-1 min-w-0">
                                <span className="uppercase text-[9px] opacity-70 mr-1">{conv.product ? 'Product' : 'Service'}:</span>
                                {itemTitle}
                            </p>
                        </div>

                        {/* Message Preview */}
                        <div className="flex items-center min-w-0 mb-1">
                            <div className={`text-xs flex items-center min-w-0 ${displayUnread > 0 ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                {conv.user && conv.lastMessage.sender.toString() !== conv.user?._id?.toString() && (
                                    <span className="flex items-center shrink-0 mr-1">
                                        {conv.lastMessage.isRead ? (
                                            <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 12l4 4L18 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M9 12l4 4L23 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        ) : (
                                            <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 12l4 4L18 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                        <span className="ml-1 shrink-0 font-bold opacity-80 italic">You: </span>
                                    </span>
                                )}
                                <span className="truncate">{conv.lastMessage.content}</span>
                            </div>
                        </div>

                        {/* Stable Unread Badge */}
                        {displayUnread > 0 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group-hover:opacity-0 transition-opacity">
                                <span className="bg-red-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-in zoom-in-50 duration-300 z-[5]">
                                    {displayUnread}
                                </span>
                            </div>
                        )}

                        {/* Status Banner Row (Price + Status) */}
                        {statusInfo.isStatus && (
                            <div className={`flex items-center gap-1.5 text-[10px] py-1 px-2.5 rounded-lg border w-fit max-w-full shadow-sm mt-0.5 ${
                                statusInfo.color?.includes('green') || statusInfo.color?.includes('emerald') ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400' : 
                                statusInfo.color?.includes('indigo') ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300' : 
                                statusInfo.color?.includes('red') ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400' :
                                'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400'
                            }`}>
                                <div className="font-bold flex items-center gap-1.5 truncate text-[9px]">
                                    {statusInfo.priceLabel && (
                                        <span className="shrink-0 font-black">{statusInfo.priceLabel}</span>
                                    )}
                                    {statusInfo.priceLabel && statusInfo.label && (
                                        <span className="opacity-40">|</span>
                                    )}
                                    {statusInfo.label && (
                                        <span className="truncate italic uppercase tracking-widest text-[8px]">{statusInfo.label}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveMenu(activeMenu === menuKey ? null : menuKey);
                }}
                className="absolute top-4 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 z-[20] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>

            {activeMenu === menuKey && (
                <div className="absolute right-3 top-12 w-48 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={(e) => handleDeleteChat(e, conv)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Chat
                    </button>
                    <button 
                        onClick={(e) => handleBlockClick(e, conv)}
                        className={`w-full text-left px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                            user?.blockedUsers?.some((id: any) => id.toString() === currentRawUserId?.toString())
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {user?.blockedUsers?.some((id: any) => id.toString() === currentRawUserId?.toString()) ? 'Unblock User' : 'Block User'}
                    </button>
                    {(conv.product || conv.service) && (
                        <button 
                            onClick={(e) => handleReportClick(e, conv)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Report Listing
                        </button>
                    )}
                    <button 
                        onClick={(e) => handleReportUserClick(e, conv)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Report User
                    </button>
                </div>
            )}
        </div>
    );
});
ChatItem.displayName = 'ChatItem';
