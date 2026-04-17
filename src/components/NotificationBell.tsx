'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/lib/confirm';
import useSWR, { useSWRConfig } from 'swr';

interface NotificationItem {
    _id: string;
    type: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationBell() {
    const { user } = useAuth();
    const { mutate: globalMutate } = useSWRConfig();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Notifications Fetching via SWR
    const { data: notificationsData, mutate: mutateNotifications } = useSWR(
        user ? '/api/notifications' : null,
        { refreshInterval: 30000 }
    );
    
    // Preferences Fetching via SWR (Only when open to save bandwidth)
    const { data: settingsData, mutate: mutateSettings } = useSWR(
        (user && isOpen) ? '/api/notifications/settings' : null
    );

    const notifications: NotificationItem[] = notificationsData?.notifications || [];
    const unreadCount: number = notificationsData?.unreadCount || 0;
    const notifyOffers: boolean = settingsData?.notifyOffers ?? true;
    const notifyMessages: boolean = settingsData?.notifyMessages ?? true;

    const updatePreference = async (type: 'offers' | 'messages', value: boolean) => {
        try {
            // Optimistic update
            const updatedSettings = { ...settingsData, [type === 'offers' ? 'notifyOffers' : 'notifyMessages']: value };
            mutateSettings(updatedSettings, false);

            await fetch('/api/notifications/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(type === 'offers' ? { notifyOffers: value } : { notifyMessages: value })
            });
            
            mutateSettings(); // Revalidate
        } catch (error) {
            console.error('Failed to update preference', error);
            mutateSettings(); // Rollback
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id?: string) => {
        try {
            // Optimistic update
            if (id) {
                const newData = {
                    ...notificationsData,
                    notifications: notifications.filter(n => n._id !== id),
                    unreadCount: Math.max(0, unreadCount - 1)
                };
                mutateNotifications(newData, false);
            } else {
                mutateNotifications({ notifications: [], unreadCount: 0 }, false);
            }

            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(id ? { notificationId: id } : { markAll: true }),
            });
            
            if (res.ok) {
                mutateNotifications(); // Sync with server
            } else {
                mutateNotifications(); // Rollback
            }
        } catch (error) {
            console.error('Failed to update notification', error);
            mutateNotifications(); // Rollback
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed top-[4.5rem] left-4 right-4 sm:absolute sm:top-full sm:-right-2 sm:left-auto mt-0 sm:mt-3 w-auto sm:w-[380px] sm:min-w-[340px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 ring-1 ring-black ring-opacity-5 z-[60] transition-colors origin-top sm:origin-top-right">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl transition-colors">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAsRead()}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Push Toggles */}
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-indigo-50/20 dark:bg-indigo-900/10 flex flex-col gap-2">
                        <button 
                            onClick={async () => {
                                try {
                                    if ((window as any).pushSubscription) {
                                        if ((window as any).unsubscribeFromPush) {
                                            await (window as any).unsubscribeFromPush();
                                        }
                                    } else {
                                        if ((window as any).subscribeToPush) {
                                            await (window as any).subscribeToPush();
                                        } else {
                                            showError('Desktop Notifications Not Available', 'Push notifications are not available. Please refresh the page or use Chrome/Edge.');
                                        }
                                    }
                                } catch (err: any) {
                                    console.error('Push toggle error:', err);
                                    showError('Notification Error', err.message || 'Unknown error');
                                }
                                setIsOpen(false);
                                setTimeout(() => setIsOpen(true), 100);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 mb-2"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {(typeof window !== 'undefined' && (window as any).pushSubscription) ? 'Disable Desktop Alerts' : 'Enable Desktop Alerts'}
                        </button>
                        
                        {(typeof window !== 'undefined' && (window as any).pushSubscription) && (
                            <>
                                <label className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 p-1.5 rounded transition-colors group">
                                    <span>System Alerts (Offers & Orders)</span>
                                    <div className="relative inline-block w-8 h-4">
                                        <input type="checkbox" className="peer sr-only" checked={notifyOffers} onChange={(e) => updatePreference('offers', e.target.checked)} />
                                        <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                </label>
                                <label className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 p-1.5 rounded transition-colors group">
                                    <span>Chat Messages Only</span>
                                    <div className="relative inline-block w-8 h-4">
                                        <input type="checkbox" className="peer sr-only" checked={notifyMessages} onChange={(e) => updatePreference('messages', e.target.checked)} />
                                        <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                </label>
                            </>
                        )}
                    </div>

                    <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div
                                    key={notif._id}
                                    className={`p-4 border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer relative ${
                                        !notif.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''
                                    }`}
                                    onClick={() => {
                                        if (!notif.isRead) markAsRead(notif._id);
                                        if (notif.link) {
                                            window.location.href = notif.link;
                                        }
                                        setIsOpen(false);
                                    }}
                                >
                                    {!notif.isRead && (
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                                    )}
                                    <div className="ml-2">
                                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{notif.message}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                                            {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
