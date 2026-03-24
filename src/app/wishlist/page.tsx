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
      const res = await fetch(`/api/wishlist?page=${page}&limit=12&type=${type}`);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => <ItemCardSkeleton key={i} />)}
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
      
      {loading && wishlist.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <ItemCardSkeleton key={i} />)}
        </div>
      ) : wishlist.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
            {wishlist.map((item) => {
               const itemType = item.type || (type === 'all' ? 'product' : type);
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
