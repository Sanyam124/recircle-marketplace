'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';
import { useState } from 'react';
import StartEarningModal from './StartEarningModal';
import { useRouter } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const [isEarningModalOpen, setIsEarningModalOpen] = useState(false);
  
  const { data: unreadData } = useSWR(
    user ? '/api/chat/unread-count' : null,
    { refreshInterval: 60000 }
  );
  const messageUnreadCount = unreadData?.unreadCount || 0;

  // Don't show on auth or creation pages (where keyboard overlap is annoying)
  if (
    pathname.startsWith('/auth') || 
    pathname.startsWith('/products/create') || 
    pathname.startsWith('/services/create')
  ) {
      return null;
  }

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-all ${isEarningModalOpen ? 'z-[600]' : 'z-[140]'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around items-end h-[68px] px-1 pb-2 pt-1">
        
        {/* Explore */}
        <Link href="/explore" className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${pathname.startsWith('/explore') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <div className={`p-1 rounded-full transition-all ${pathname.startsWith('/explore') ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={pathname.startsWith('/explore') ? 2.5 : 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase">Explore</span>
        </Link>
        
        {/* Board */}
        <Link href="/board" className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${pathname.startsWith('/board') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <div className={`p-1 rounded-full transition-all ${pathname.startsWith('/board') ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={pathname.startsWith('/board') ? 2.5 : 2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase">Board</span>
        </Link>
        
        {/* Post (Center Floating Button) */}
        <div className="relative w-full flex justify-center h-full">
            <button 
                onClick={() => {
                  if (!user) {
                    router.push('/auth');
                    return;
                  }
                  setIsEarningModalOpen(true);
                }}
                className="absolute bottom-3 flex items-center justify-center w-[52px] h-[52px] bg-gray-900 dark:bg-white text-white dark:text-black rounded-full shadow-xl shadow-gray-900/20 dark:shadow-white/10 active:scale-95 transition-transform border-[3px] border-white dark:border-[#0a0a0a]"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>

        {/* Message */}
        <Link href="/chat" className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${pathname.startsWith('/chat') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <div className={`p-1 rounded-full transition-all relative ${pathname.startsWith('/chat') ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={pathname.startsWith('/chat') ? 2.5 : 2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
             {messageUnreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white border-2 border-white dark:border-gray-900 shadow-sm animate-in zoom-in">
                  {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                </span>
             )}
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase">Chat</span>
        </Link>

        {/* Orders */}
        <Link href="/orders" className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${pathname.startsWith('/orders') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <div className={`p-1 rounded-full transition-all ${pathname.startsWith('/orders') ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={pathname.startsWith('/orders') ? 2.5 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase">Orders</span>
        </Link>

      </div>

      {isEarningModalOpen && (
        <StartEarningModal onClose={() => setIsEarningModalOpen(false)} />
      )}
    </div>
  );
}
