'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

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
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll for notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

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
            // Optimistic Update
            const oldNotifications = [...notifications];
            const oldUnreadCount = unreadCount;

            if (id) {
                setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
                setUnreadCount(Math.max(0, unreadCount - 1));
            } else {
                setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            }

            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(id ? { notificationId: id } : { markAll: true }),
            });
            if (res.ok) {
                // Refresh silently to sync with server (e.g. if other notifications arrived)
                fetchNotifications();
            } else {
                // Rollback on failure
                setNotifications(oldNotifications);
                setUnreadCount(oldUnreadCount);
                console.error('Failed to update notification on server');
            }
        } catch (error) {
            console.error('Failed to update notification', error);
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
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 ring-1 ring-black ring-opacity-5 z-[60] transition-colors">
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

                    <div className="max-h-96 overflow-y-auto">
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

                    <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-center bg-gray-50 dark:bg-gray-800/50 rounded-b-xl transition-colors">
                        <Link
                            href="/profile"
                            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            View All Activity
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
