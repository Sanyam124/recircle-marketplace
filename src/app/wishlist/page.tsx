'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';
import ProductCard from '@/components/ProductCard';
import ServiceCard from '@/components/ServiceCard';
import { ItemCardSkeleton, WishlistPageSkeleton, ItemsGridSkeleton } from '@/components/Skeletons';
import RateLimitScreen from '@/components/RateLimitScreen';

function WishlistPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cols, setCols] = useState<2 | 3 | 4 | 5>(4);
  const [mobileCols, setMobileCols] = useState<1 | 2>(2);

  const { data, error, isLoading, mutate } = useSWR(user ? '/api/wishlist' : null);
  const wishlist = data?.wishlist || [];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/wishlist');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return <WishlistPageSkeleton />;
  }

  if (error && error.status === 429) {
    return <RateLimitScreen onRetry={() => mutate()} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#080B14] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20">
        
        {/* Professional Header Section (Mirrors Explore) */}
        <div className="hidden md:flex bg-white/70 dark:bg-gray-800/40 backdrop-blur-md p-5 rounded-3xl border border-gray-200 dark:border-gray-700/50 mb-8 justify-between items-center shadow-sm gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex flex-col text-left">
             <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Your Wishlist</h1>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Saved for later</p>
           </div>

           <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Items</p>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{wishlist.length} Saved</h2>
              </div>
              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl shadow-inner">
                 {[2, 3, 4, 5].map((val) => (
                   <button key={val} onClick={() => setCols(val as any)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${val > 3 ? 'hidden lg:block' : ''} ${cols === val ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-500'}`}>{val}x</button>
                 ))}
              </div>
           </div>
        </div>

        {/* Mobile Header (Mirrors Explore) */}
        <div className="md:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md pb-3 pt-4 px-6 rounded-[1.5rem] border border-gray-200 dark:border-gray-700/50 flex flex-col items-center gap-3 shadow-lg mb-6 sticky top-[64px] z-[40]">
           <div className="w-full flex items-center justify-between">
              <div className="flex flex-col text-left">
                 <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Your Wishlist</h1>
              </div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{wishlist.length} items</div>
           </div>
           <div className="w-full flex items-center justify-end border-t border-gray-100 dark:border-gray-700/50 pt-2">
              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl">
                 <button onClick={() => setMobileCols(1)} className={`px-3 py-1 text-xs font-bold rounded-lg ${mobileCols === 1 ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600' : 'text-gray-400'}`}>1x</button>
                 <button onClick={() => setMobileCols(2)} className={`px-3 py-1 text-xs font-bold rounded-lg ${mobileCols === 2 ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600' : 'text-gray-400'}`}>2x</button>
              </div>
           </div>
        </div>
        
        {/* Content Section */}
        <div className="relative min-h-[400px]">
          {isLoading && wishlist.length === 0 ? (
            <ItemsGridSkeleton count={8} cols={cols} />
          ) : wishlist.length > 0 ? (
            <div className={`grid gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ${mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${
                cols === 2 ? 'sm:grid-cols-2' : 
                cols === 3 ? 'sm:grid-cols-3' : 
                cols === 4 ? 'sm:grid-cols-4' : 
                'sm:grid-cols-5'
              }`}>
              {wishlist.map((item: any) => (
                <div key={item._id} className="transition-all duration-500 hover:scale-[1.02] active:scale-95">
                  {item.itemType === 'product' ? (
                    <ProductCard product={item} />
                  ) : (
                    <ServiceCard service={item} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 dark:bg-gray-900/20 backdrop-blur-xl rounded-[4rem] p-16 md:p-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 transition-all animate-in zoom-in-95 duration-700">
              <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-3xl flex items-center justify-center mx-auto mb-10 rotate-6 shadow-2xl border border-gray-100 dark:border-gray-800">
                 <svg className="w-10 h-10 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                 </svg>
              </div>
              <h3 className="text-4xl font-black text-gray-950 dark:text-white tracking-tighter mb-6 uppercase italic">No saved finds yet</h3>
              <p className="text-gray-400 dark:text-gray-500 font-bold max-w-sm mx-auto leading-relaxed mb-10 italic">
                Your wishlist is empty. Explore the marketplace and tap the heart to save items here!
              </p>
              <button 
                onClick={() => router.push('/explore')}
                className="group px-10 py-5 bg-gray-950 dark:bg-white text-white dark:text-gray-950 font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center gap-3 mx-auto"
              >
                Start Exploring
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<WishlistPageSkeleton />}>
      <WishlistPageContent />
    </Suspense>
  );
}
