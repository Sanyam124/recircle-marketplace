'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProductCard from '@/components/ProductCard';
import ServiceCard from '@/components/ServiceCard';
import { ItemCardSkeleton } from '@/components/Skeletons';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [type, setType] = useState<'product' | 'service' | 'all'>('all');
  const [cols, setCols] = useState<3 | 4 | 5>(4);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=${encodeURIComponent('/wishlist')}`);
      return;
    }

    if (user?.role === 'delivery_partner') {
        router.push('/delivery-dashboard');
        return;
    }
    fetchWishlist();
  }, [user, authLoading, router, page, type]);

  const handleTypeChange = (newType: 'product' | 'service' | 'all') => {
    if (newType !== type) {
        setType(newType);
        setPage(1); // Reset page on tab switch
        setWishlist([]); // Clear current items while loading
    }
  };

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wishlist?page=${page}&limit=20&type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || 0);
      }
    } catch (error) {
      console.error('Failed to load wishlist', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && wishlist.length === 0)) {
      return (
          <div className="max-w-7xl mx-auto px-4 py-10">
              <div className={cols === 3 ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6' : cols === 5 ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-6' : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-6'}>
                  {[...Array(cols * 2)].map((_, i) => <ItemCardSkeleton key={i} />)}
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <h1 id="wishlist-top" className="text-2xl font-bold text-gray-900 dark:text-white">My Wishlist ({totalItems})</h1>
          
          {/* Toggle Tabs */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-sm w-full sm:w-auto self-start border border-gray-200 dark:border-gray-700">
             <button
                 onClick={() => handleTypeChange('all')}
                 className={`flex-1 py-1.5 px-4 text-sm font-semibold rounded-lg transition-all ${type === 'all' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
                 All
             </button>
             <button
                 onClick={() => handleTypeChange('product')}
                 className={`flex-1 py-1.5 px-4 text-sm font-semibold rounded-lg transition-all ${type === 'product' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
                 Products
             </button>
             <button
                 onClick={() => handleTypeChange('service')}
                 className={`flex-1 py-1.5 px-4 text-sm font-semibold rounded-lg transition-all ${type === 'service' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
                 Services
             </button>
          </div>
      </div>
      {/* Controls Bar */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex justify-between items-center transition-colors">
        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
          {loading ? 'Searching...' : `Showing ${totalItems} ${type === 'all' ? 'items' : type + 's'}`}
        </p>
        
        <div className="hidden sm:flex items-center gap-1 bg-gray-50 dark:bg-gray-900 overflow-hidden p-1 rounded-lg border border-gray-200 dark:border-gray-700">
           <button onClick={() => setCols(3)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${cols === 3 ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'}`}>3 Wide</button>
           <button onClick={() => setCols(4)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${cols === 4 ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'}`}>4 Wide</button>
           <button onClick={() => setCols(5)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${cols === 5 ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'}`}>5 Wide</button>
        </div>
      </div>
      
      {loading && wishlist.length === 0 ? (
        <div className={cols === 3 ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6' : cols === 5 ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-6' : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-6'}>
            {[...Array(cols * 2)].map((_, i) => <ItemCardSkeleton key={i} />)}
        </div>
      ) : wishlist.length > 0 ? (
        <>
          <div className={cols === 3 ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6' : cols === 5 ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-6' : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-6'}>
            {wishlist.map((item) => {
               const itemType = item.itemType || (type === 'all' ? 'product' : type);
               return itemType === 'product' ? (
                   <ProductCard key={item._id} product={item} />
               ) : (
                   <ServiceCard key={item._id} service={item} />
               );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                onClick={() => { document.getElementById('wishlist-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setPage(p => Math.max(1, p - 1)); }}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => { document.getElementById('wishlist-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setPage(p => Math.min(totalPages, p + 1)); }}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No {type}s saved</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start browsing and save {type}s you like!</p>
        </div>
      )}
    </div>
  );
}
