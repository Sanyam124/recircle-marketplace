'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ExploreSidebar, { ExploreFilters } from '@/components/ExploreSidebar';
import ProductCard from '@/components/ProductCard';
import ServiceCard from '@/components/ServiceCard';
import Loader from '@/components/Loader';

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialType = (searchParams.get('type') as 'all' | 'products' | 'services') || 'all';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [filters, setFilters] = useState<ExploreFilters>({
    search: initialSearch,
    type: initialType,
    sort: 'newest',
    minPrice: '',
    maxPrice: '',
    categories: initialCategory ? [initialCategory] : [],
    conditions: []
  });

  // Next.js static rendering hydration fix: sync searchParams when client mounts/updates
  useEffect(() => {
    const urlType = (searchParams.get('type') as 'all' | 'products' | 'services') || 'all';
    const urlCategory = searchParams.get('category') || '';
    const urlSearch = searchParams.get('search') || '';

    setFilters(prev => {
      // Avoid infinite loop by only updating if there's an actual mismatch
      if (prev.type === urlType && prev.categories.includes(urlCategory) && prev.search === urlSearch) {
        return prev;
      }
      return {
        ...prev,
        type: urlType,
        search: urlSearch,
        categories: urlCategory ? [urlCategory] : [],
      };
    });
  }, [searchParams]);

  const fetchItems = useCallback(async (currentFilters: ExploreFilters, currentPage: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.type !== 'all') params.append('type', currentFilters.type);
      if (currentFilters.sort) params.append('sort', currentFilters.sort);
      if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
      if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
      
      currentFilters.categories.forEach(c => params.append('categories[]', c));
      currentFilters.conditions.forEach(c => params.append('conditions[]', c));
      
      params.append('page', currentPage.toString());
      params.append('limit', '12');

      const res = await fetch(`/api/explore?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.totalItems);
      }
    } catch (error) {
      console.error('Failed to fetch explore items', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(filters, page);
  }, [filters, page, fetchItems]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = useCallback((newFilters: ExploreFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Explore</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
              Discover products and services offered by students across campus. Use the filters to find exactly what you're looking for.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <ExploreSidebar 
              currentFilters={filters}
              onFilterChange={handleFilterChange} 
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            
            {/* Results Info */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex justify-between items-center transition-colors">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                {loading ? 'Searching...' : `Found ${totalItems} ${filters.type === 'all' ? 'items' : filters.type}`}
              </p>
            </div>

            {/* Grid */}
            {loading ? (
              <Loader />
            ) : items.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">No items found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">Try adjusting your filters, trying a different search term, or browsing a different category.</p>
                <button 
                  onClick={() => handleFilterChange({ search: '', type: 'all', sort: 'newest', minPrice: '', maxPrice: '', categories: [], conditions: [] })}
                  className="mt-6 px-6 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {items.map(item => (
                    item.itemType === 'product' 
                      ? <ProductCard key={`prod-${item._id}`} product={item} />
                      : <ServiceCard key={`serv-${item._id}`} service={item} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => Math.abs(p - page) <= 2)
                      .map(p => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`w-10 h-10 text-sm font-bold rounded-xl transition-all ${
                            p === page 
                              ? 'bg-indigo-600 shadow-md text-white' 
                              : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
