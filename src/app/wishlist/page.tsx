'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';
import ProductCard from '@/components/ProductCard';
import ServiceCard from '@/components/ServiceCard';
import { ItemCardSkeleton, WishlistPageSkeleton, ItemsGridSkeleton } from '@/components/Skeletons';

function WishlistPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cols, setCols] = useState<2 | 3 | 4 | 5>(4);
  const [mobileCols, setMobileCols] = useState<1 | 2>(2);

  const { data, error, isLoading } = useSWR(user ? '/api/wishlist' : null);
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
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 max-w-md w-full text-center shadow-xl border border-gray-100 dark:border-gray-700">
           <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
           </div>
           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Too many refreshes</h3>
           <p className="text-gray-500 dark:text-gray-400 mb-6">Please take a short break. You can try viewing your wishlist again in a minute.</p>
           <button onClick={() => window.location.reload()} className="w-full py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md">Refresh Now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 transition-colors duration-500 overflow-x-clip">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-950 dark:text-white tracking-tighter italic leading-none">
              Your Wishlist
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold tracking-tight">Saved items and services for quick access.</p>
        </div>
        
        <div className="flex items-center gap-1.5 p-1.5 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[1.5rem] border border-white/50 dark:border-gray-700/50 shadow-inner overflow-hidden flex-shrink-0">
           {/* Mobile Controls */}
           <div className="flex sm:hidden items-center gap-1">
              <button onClick={() => setMobileCols(1)} className={`w-10 h-10 flex items-center justify-center text-[10px] font-black rounded-xl transition-all ${mobileCols === 1 ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}>1x</button>
              <button onClick={() => setMobileCols(2)} className={`w-10 h-10 flex items-center justify-center text-[10px] font-black rounded-xl transition-all ${mobileCols === 2 ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-400'}`}>2x</button>
           </div>
           
           <div className="hidden sm:flex items-center gap-1">
              <button onClick={() => setCols(2)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${cols === 2 ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5 italic' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent'}`}>2 Wide</button>
              <button onClick={() => setCols(3)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${cols === 3 ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5 italic' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent'}`}>3 Wide</button>
              <button onClick={() => setCols(4)} className={`hidden lg:block px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${cols === 4 ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5 italic' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent'}`}>4 Wide</button>
              <button onClick={() => setCols(5)} className={`hidden lg:block px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${cols === 5 ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5 italic' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent'}`}>5 Wide</button>
           </div>
        </div>
      </div>
      
      {isLoading && wishlist.length === 0 ? (
        <ItemsGridSkeleton count={8} cols={cols} />
      ) : wishlist.length > 0 ? (
        <div className={`grid gap-3 sm:gap-6 ${mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${
            cols === 2 ? 'sm:grid-cols-2' : 
            cols === 3 ? 'sm:grid-cols-3' : 
            cols === 4 ? 'sm:grid-cols-4' : 
            'sm:grid-cols-5'
          }`}>
          {wishlist.map((item: any) => (
            item.itemType === 'product' ? (
              <ProductCard key={item._id} product={item} />
            ) : (
              <ServiceCard key={item._id} service={item} />
            )
          ))}
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-[3rem] p-16 text-center border border-white/40 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
          <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/40 rounded-[2rem] flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
             <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
             </svg>
          </div>
          <h3 className="text-3xl font-black text-gray-950 dark:text-white italic tracking-tighter mb-4">EMPTY WISHLIST</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold max-w-md mx-auto leading-relaxed">
            You haven't saved any items yet. Start exploring to find something you like and reserve it here!
          </p>
          <button 
            onClick={() => router.push('/explore')}
            className="mt-10 px-8 py-4 bg-gray-950 dark:bg-white text-white dark:text-gray-950 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 italic inline-flex items-center gap-2"
          >
            <span>Explore Marketplace</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>
      )}
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
