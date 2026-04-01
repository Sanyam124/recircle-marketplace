'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import Community from '@/models/Community'; // Register for populate
import { Skeleton } from './Skeletons';


export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [newVerification, setNewVerification] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCreateMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Re-check for verification notification on every path change
    const vc = sessionStorage.getItem('newVerification');
    if (vc) {
      setNewVerification(vc);
      sessionStorage.removeItem('newVerification');
      const timer = setTimeout(() => setNewVerification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

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
    <>
    {/* Global Verification Toast */}
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[60] transition-all duration-700 ease-in-out transform ${newVerification ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-12 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="bg-white dark:bg-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-green-500 dark:border-green-400 rounded-2xl py-4 px-8 flex items-center space-x-4 min-w-[320px] max-w-md animate-in fade-in zoom-in duration-300">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/50 rounded-xl p-2 animate-bounce">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-600 dark:text-green-400 mb-0.5">Verification Success</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Verified for <span className="underline decoration-2 underline-offset-4 decoration-green-500/30">{newVerification}</span>
                </p>
            </div>
        </div>
    </div>

    <nav className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-sm dark:shadow-gray-900/50 sticky top-0 z-50 transition-colors duration-300 border-b border-gray-200/50 dark:border-gray-800/50 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60">
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
              <Link href="/board" className="text-gray-900 dark:text-gray-300 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-indigo-500 dark:hover:text-white text-sm font-medium transition-colors">
                Board
              </Link>

            </div>
          </div>
          <div className="hidden md:flex sm:items-center">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-20 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ) : user ? (
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

                {user.role === 'verifier' && (
                    <div className="flex items-center gap-1 border-l pl-2 border-gray-200 dark:border-gray-700">
                     <Link href="/verifier-dashboard" className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all" title="Campus Dashboard">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
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
                    <Link
                        href="/settings"
                        className="p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </Link>
                    <button
                        onClick={logout}
                        className="p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Logout"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <Link href="/auth" className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]">
                  Sign In / Register
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
            <Link href="/explore" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <span className="text-xl">🔍</span> Explore
            </Link>
            <Link href="/board" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
              <span className="text-xl">🏛️</span> Board
            </Link>
          </div>
          
          <div className="pt-2 pb-2 border-t border-gray-100 dark:border-gray-800 space-y-1 px-4">
             <Link href="/products/create" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <span className="text-xl">📦</span> Post a Product
            </Link>
             <Link href="/services/create" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <span className="text-xl">🛠️</span> Offer a Service
            </Link>
          </div>

          <div className="pt-4 pb-6 border-t border-gray-100 dark:border-gray-800 px-4">
            {loading ? (
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="h-10 w-10 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-16 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ) : user ? (
              <div className="space-y-1">
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold border border-indigo-200 dark:border-indigo-800">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-base font-bold text-gray-900 dark:text-white break-words">{user.name}</div>
                        <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium tracking-tight break-words">@{user.username || 'user'}</div>
                    </div>
                </Link>

                <div className="grid grid-cols-3 gap-2 mt-4">
                    <Link href="/chat" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
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
                    <Link href="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Wishlist</span>
                    </Link>
                    <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Orders</span>
                    </Link>
                </div>

                {user.role === 'admin' && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-600 dark:bg-blue-700 text-white font-bold text-[10px] uppercase">
                            📊 Dashboard
                        </Link>
                        <Link href="/admin/reports" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600 dark:bg-red-700 text-white font-bold text-[10px] uppercase">
                            🚩 Reports
                        </Link>
                        <Link href="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-600 dark:bg-purple-700 text-white font-bold text-xs">
                            👥 Users
                        </Link>
                    </div>
                )}

                {user.role === 'verifier' && (
                  <div className="mt-2 text-center">
                    <Link href="/verifier-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 dark:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wide">
                        🛡️ Campus Dashboard
                    </Link>
                  </div>
                )}


                <Link
                    href="/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-4 rounded-2xl text-base font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Settings
                </Link>
                <button
                    onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                    className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-4 rounded-2xl text-base font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout Account
                </button>
              </div>
            ) : (
              <div className="mt-3 px-2">
                <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center w-full px-4 py-3.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white text-base font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md transition-all active:scale-[0.98]">
                  Sign In / Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
