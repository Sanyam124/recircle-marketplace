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
    const itemTitle = conv.product?.title || conv.service?.title || 'Unknown Item';
    const itemImage = conv.product?.images?.[0] || conv.service?.images?.[0] || '/placeholder.png';
    const menuKey = `${conv.user._id}-${conv.product?._id || conv.service?._id}`;

    // Determine what status badge to show (e.g. SOLD, ACTIVE, CANCELLED).
    // Business logic is kept in chatUtils.ts for testability and readability.
    const statusInfo = getConversationStatus(conv, user?.id?.toString());

    return (
        <div className="relative group">
            <Link
                href={`/chat/${conv.user._id}${conv.product ? `?productId=${conv.product._id}` : (conv.service ? `?serviceId=${conv.service._id}` : '')}`}
                onClick={onItemClick}
                className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 ${
                    isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 border-r-4 border-r-indigo-600 dark:border-r-indigo-400' : ''
                }`}
            >
                <div className="flex items-start gap-4 mx-1">
                    <div className="relative shrink-0 flex items-center justify-center w-14 h-14 mt-1">
                        <div className="absolute top-0 left-0 right-2 bottom-2 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105">
                            <Image src={itemImage || '/placeholder.png'} alt={itemTitle} fill sizes="56px" className="object-cover" />
                        </div>
                        <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-[10px] font-black border-2 border-white dark:border-gray-900 shadow-md z-10 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5">
                            {conv.user.name?.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                        <div className="flex justify-between items-start mb-0.5">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white break-words flex-1 min-w-0 pr-1">
                                {conv.user.name}
                            </h3>
                            <div className="flex flex-col items-end shrink-0 pl-1">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                    {formatChatMessageDate(conv.lastMessage.createdAt)}
                                </span>
                                {displayUnread > 0 && (
                                    <span className="mt-1 bg-red-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-50 duration-300 z-[5]">
                                        {displayUnread}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center mb-1 min-w-0">
                            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 break-words flex-1 min-w-0">
                                <span className="uppercase text-[9px] opacity-70 mr-1">{conv.product ? 'Product' : 'Service'}:</span>
                                {itemTitle}
                            </p>
                        </div>

                        {/* Message Preview */}
                        <div className="flex items-center min-w-0 mb-1">
                            <div className={`text-xs flex items-center min-w-0 ${displayUnread > 0 ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                {conv.lastMessage.sender.toString() !== conv.user._id.toString() && (
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
                                        <span className="ml-1 shrink-0">You: </span>
                                    </span>
                                )}
                                <span className="truncate">{conv.lastMessage.content}</span>
                            </div>
                        </div>

                        {/* Status Banner Row (Price + Status) */}
                        {statusInfo.isStatus && (
                            <div className={`flex items-center gap-1.5 text-[10px] py-1 px-2.5 rounded-lg border w-fit max-w-full shadow-sm mt-0.5 ${
                                statusInfo.color?.includes('green') || statusInfo.color?.includes('emerald') ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400' : 
                                statusInfo.color?.includes('indigo') ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300' : 
                                statusInfo.color?.includes('red') ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400' :
                                'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400'
                            }`}>
                                <div className="font-bold flex items-center gap-1.5 truncate">
                                    {statusInfo.priceLabel && (
                                        <span className="shrink-0 font-black">{statusInfo.priceLabel}</span>
                                    )}
                                    {statusInfo.priceLabel && statusInfo.label && (
                                        <span className="opacity-40">|</span>
                                    )}
                                    {statusInfo.label && (
                                        <span className="truncate italic uppercase tracking-widest text-[9px]">{statusInfo.label}</span>
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
                className="absolute top-4 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>

            {activeMenu === menuKey && (
                <div className="absolute right-3 top-12 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
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
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Block User
                    </button>
                    <button 
                        onClick={(e) => handleReportClick(e, conv)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Report Listing
                    </button>
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
