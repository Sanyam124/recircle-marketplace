'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/chat/unread-count');
      if (res.ok) {
        const data = await res.json();
        setMessageUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // Quietly log fetch failures as they are usually transient network/server-restart issues
      console.warn('Silent unread-count fetch failure:', e instanceof Error ? e.message : e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000); // 10s poll
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900/50 sticky top-0 z-50 transition-colors duration-300 border-b border-transparent dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Image src="/logo.png" alt="ReCircle" width={140} height={40} className="h-10 w-auto dark:brightness-0 dark:invert transition-all" priority />
            </Link>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link href="/explore" className="text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-indigo-500 dark:hover:text-white text-sm font-medium transition-colors">
                Explore
              </Link>
              <Link href="/users" className="text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-indigo-500 dark:hover:text-white text-sm font-medium transition-colors">
                Find User
              </Link>
            </div>
          </div>
          <div className="hidden md:flex sm:items-center">
            {user ? (
              <div className="flex items-center gap-2 lg:gap-3">
                <NotificationBell />
                <div className="flex items-center gap-1 lg:gap-2">
                  <Link href="/wishlist" className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-all" title="Wishlist">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <span className="hidden xl:inline">Wishlist</span>
                  </Link>
                  <Link href="/orders" className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all" title="My Orders">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    <span className="hidden xl:inline">Orders</span>
                  </Link>
                  <Link href="/chat" className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all" title="Messages">
                    <div className="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      {messageUnreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-white dark:border-gray-900 animate-in zoom-in duration-300 shadow-sm">
                          {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                        </span>
                      )}
                    </div>
                    <span className="hidden xl:inline">Messages</span>
                  </Link>

                  {/* Create Dropdown */}
                  <div className="relative" onMouseLeave={() => setIsCreateMenuOpen(false)}>
                    <button
                      onMouseEnter={() => setIsCreateMenuOpen(true)}
                      onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                      className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="hidden xl:inline">Create</span>
                    </button>

                    {isCreateMenuOpen && (
                      <div className="absolute right-0 pt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2">
                          <Link 
                            href="/products/create" 
                            onClick={() => setIsCreateMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            📦 Post a Product
                          </Link>
                          <Link 
                            href="/services/create" 
                            onClick={() => setIsCreateMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            🛠️ Offer a Service
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                

                {user.role === 'admin' && (
                    <div className="flex items-center gap-1 border-l pl-2 border-gray-200 dark:border-gray-700">
                     <Link href="/admin" className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all" title="Dashboard">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                     </Link>
                     <Link href="/admin/reports" className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all" title="Reports">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                     </Link>
                     <Link href="/admin/users" className="p-2 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all" title="Users">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                     </Link>
                    </div>
                )}

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                <div className="flex items-center gap-2">
                    <Link href="/profile" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                             {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="hidden xl:inline break-words max-w-[150px]">{user.name?.split(' ')[0]}</span>
                    </Link>
                    <button
                        onClick={logout}
                        className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Logout"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
              </div>
            ) : (
              <div className="space-x-4">
                <Link href="/login" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Login
                </Link>
                <Link href="/register" className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
                  Get Started
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center md:hidden">
            {user && (
                <div className="mr-2">
                    <NotificationBell />
                </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <div className="pt-2 pb-3 space-y-1 px-4">
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore" className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <span className="text-xl">🔍</span> Explore
            </Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/users" className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <span className="text-xl">👥</span> Find User
            </Link>
          </div>
          
          <div className="pt-2 pb-2 border-t border-gray-100 dark:border-gray-800 space-y-1 px-4">
             <Link onClick={() => setIsMobileMenuOpen(false)} href="/products/create" className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <span className="text-xl">📦</span> Post a Product
            </Link>
             <Link onClick={() => setIsMobileMenuOpen(false)} href="/services/create" className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <span className="text-xl">🛠️</span> Offer a Service
            </Link>
          </div>

          <div className="pt-4 pb-6 border-t border-gray-100 dark:border-gray-800 px-4">
            {user ? (
              <div className="space-y-1">
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/profile" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold border border-indigo-200 dark:border-indigo-800">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-base font-bold text-gray-900 dark:text-white break-words">{user.name}</div>
                        <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium tracking-tight break-words">@{user.username || 'user'}</div>
                    </div>
                </Link>

                <div className="grid grid-cols-3 gap-2 mt-4">
                    <Link onClick={() => setIsMobileMenuOpen(false)} href="/chat" className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                        <div className="relative mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                          {messageUnreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white border-2 border-white dark:border-gray-900 animate-in zoom-in duration-300 shadow-sm">
                              {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Messages</span>
                    </Link>
                    <Link onClick={() => setIsMobileMenuOpen(false)} href="/wishlist" className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Wishlist</span>
                    </Link>
                    <Link onClick={() => setIsMobileMenuOpen(false)} href="/orders" className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Orders</span>
                    </Link>
                </div>

                {user.role === 'admin' && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/admin" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-600 dark:bg-blue-700 text-white font-bold text-[10px] uppercase">
                            📊 Dashboard
                        </Link>
                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/admin/reports" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600 dark:bg-red-700 text-white font-bold text-[10px] uppercase">
                            🚩 Reports
                        </Link>
                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/admin/users" className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-600 dark:bg-purple-700 text-white font-bold text-xs">
                            👥 Users
                        </Link>
                    </div>
                )}

                <button
                    onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                    className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-4 rounded-2xl text-base font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout Account
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/login" className="flex items-center justify-center w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-base font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Login
                </Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/register" className="flex items-center justify-center w-full px-4 py-3 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white text-base font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md">
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
