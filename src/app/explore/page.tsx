'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ExploreSidebar, { ExploreFilters } from '@/components/ExploreSidebar';
import ProductCard from '@/components/ProductCard';
import ServiceCard from '@/components/ServiceCard';
import { ExplorePageSkeleton, ItemsGridSkeleton } from '@/components/Skeletons';
import { useAuth } from '@/context/AuthContext';


function ExploreFiltersAndGrid() {
  const { user, userLocation, authFetch } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const catsFromUrl = [
    ...searchParams.getAll('categories[]'),
    ...searchParams.getAll('category')
  ];
  
  // Only apply user defaults on a clean first visit (no URL params)
  const hasAnyParams = searchParams.toString().length > 0;

  const resolvedCommunity = searchParams.get('communityFilter') || (!hasAnyParams ? (user?.defaultCommunity || (user ? 'All' : 'Public')) : (user ? 'All' : 'Public'));
  const resolvedHostel = searchParams.get('hostel') || (!hasAnyParams && !!user?.defaultHostel && !['All', 'Public', 'Unified'].includes(resolvedCommunity) ? user.defaultHostel : '');

  const currentFilters: ExploreFilters = {
    search: searchParams.get('search') || '',
    type: (searchParams.get('type') as 'all' | 'products' | 'services') || 'all',
    listingType: searchParams.get('listingType') || 'All',
    sort: searchParams.get('sort') || 'newest',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    categories: Array.from(new Set(catsFromUrl)),
    conditions: searchParams.getAll('conditions[]') || [],
    availabilities: searchParams.getAll('availabilities[]') || [],
    communityFilter: resolvedCommunity,
    hostel: resolvedHostel,
    state: searchParams.get('state') || '',
    city: searchParams.get('city') || ''
  };

  const currentPage = parseInt(searchParams.get('page') || '1');
  const [cols, setCols] = useState<2 | 3 | 4 | 5>(user?.compactView ? 5 : 3);
  const [mobileCols, setMobileCols] = useState<1 | 2>(2);

  // Sync with user preference if it changes
  useEffect(() => {
    if (user?.compactView !== undefined) {
        setCols(user.compactView ? 5 : 3);
    }
  }, [user?.compactView]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState(currentFilters.search);
  const isFirstRender = useRef(true);
  const prevScrollY = useRef<number | null>(null);

  const { data: siteConfig } = useSWR('/api/site-config');
  const maxSearchChars = siteConfig?.maxSearchChars || 100;

  // Debounce search
  useEffect(() => {
    if (isFirstRender.current) {
        setSearchTerm(currentFilters.search);
        isFirstRender.current = false;
        return;
    }

    const timer = setTimeout(() => {
      if (searchTerm !== currentFilters.search) {
        handleFilterChange({...currentFilters, search: searchTerm});
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync back if URL changes (e.g. browser back button)
  useEffect(() => {
    if (currentFilters.search !== searchTerm) {
        setSearchTerm(currentFilters.search);
    }
  }, [currentFilters.search]);

  // Function to update the URL with new filters
  const pushUpdatedUrl = (newFilters: ExploreFilters, newPage: number) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.type !== 'all') params.set('type', newFilters.type);
    if (newFilters.listingType !== 'All') params.set('listingType', newFilters.listingType);
    if (newFilters.sort !== 'newest') params.set('sort', newFilters.sort);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
    params.set('communityFilter', newFilters.communityFilter || 'All');
    params.set('hostel', newFilters.hostel || '');
    if (newFilters.state) params.set('state', newFilters.state);
    if (newFilters.city) params.set('city', newFilters.city);
    
    newFilters.categories.forEach(c => params.append('categories[]', c));
    newFilters.conditions.forEach(c => params.append('conditions[]', c));
    newFilters.availabilities.forEach(a => params.append('availabilities[]', a));
    
    if (newPage > 1) params.set('page', newPage.toString());

    const queryString = params.toString();
    const url = `/explore${queryString ? `?${queryString}` : ''}`;
    router.push(url, { scroll: false });
  };

  const fetcher = async (url: string) => {
    const res = await authFetch(url);
    if (!res.ok) {
      const error = new Error('An error occurred while fetching the data.');
      (error as any).status = res.status;
      (error as any).info = await res.json().catch(() => ({}));
      throw error;
    }
    return res.json();
  };

  const getQueryUrl = () => {
    const params = new URLSearchParams();
    if (currentFilters.search) params.set('search', currentFilters.search);
    if (currentFilters.type !== 'all') params.set('type', currentFilters.type);
    if (currentFilters.listingType !== 'All') params.set('listingType', currentFilters.listingType);
    if (currentFilters.sort !== 'newest') params.set('sort', currentFilters.sort);
    if (currentFilters.minPrice) params.set('minPrice', currentFilters.minPrice);
    if (currentFilters.maxPrice) params.set('maxPrice', currentFilters.maxPrice);
    params.set('communityFilter', currentFilters.communityFilter);
    if (currentFilters.hostel) params.set('hostel', currentFilters.hostel);
    if (currentFilters.state) params.set('state', currentFilters.state);
    if (currentFilters.city) params.set('city', currentFilters.city);
    
    if ((currentFilters.sort === 'distance' || currentFilters.city || currentFilters.state) && userLocation?.lat && userLocation?.lng) {
       params.set('lat', userLocation.lat.toString());
       params.set('lng', userLocation.lng.toString());
    }
    
    currentFilters.categories.forEach(c => params.append('categories[]', c));
    currentFilters.conditions.forEach(c => params.append('conditions[]', c));
    currentFilters.availabilities.forEach(a => params.append('availabilities[]', a));
    
    params.append('page', currentPage.toString());
    params.append('limit', '20');
    return `/api/explore?${params.toString()}`;
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(getQueryUrl(), fetcher, { 
    keepPreviousData: true,
    revalidateOnFocus: true,
    refreshInterval: 15000,
    shouldRetryOnError: (err) => err.status !== 429 
  });

  const loading = !data && isLoading; 
  const isFetchingFiltered = isValidating && data; 
  const items = data?.items || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const totalItems = data?.pagination?.totalItems || 0;



  const handlePageChange = (newPage: number) => {
    pushUpdatedUrl(currentFilters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (newFilters: ExploreFilters) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      prevScrollY.current = window.scrollY;
    }
    pushUpdatedUrl(newFilters, 1);
  };

  // Restore scroll position instantly if locked on desktop view
  useEffect(() => {
    if (prevScrollY.current !== null) {
      const targetY = prevScrollY.current;
      window.scrollTo({ top: targetY, behavior: 'instant' });
      const timer = setTimeout(() => {
        if (prevScrollY.current !== null) {
          window.scrollTo({ top: targetY, behavior: 'instant' });
          prevScrollY.current = null;
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <>
      {/* Viewport-wide top progress/loading bar */}
      {isValidating && (
        <div className="fixed top-0 left-0 right-0 h-[4px] z-[9999] bg-transparent overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 shadow-[0_1px_10px_rgba(79,70,229,0.5)] w-full" style={{
            animation: 'loading-bar-anim 1.2s infinite linear'
          }} />
          <style>{`
            @keyframes loading-bar-anim {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      )}

      {/* MOBILE STICKY ROW */}
      <div className="md:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md pb-2 pt-1.5 px-4 rounded-b-[1.5rem] border-b border-gray-200 dark:border-gray-700/50 flex flex-col items-center gap-1.5 sticky top-[64px] z-[40] -mx-4 shadow-md mb-4">
        <div className="w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            name="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') e.preventDefault(); }}
            maxLength={maxSearchChars}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg text-xs border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white transition-all outline-none font-medium"
          />
        </div>
        <div className="flex items-center justify-between w-full px-1">
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{totalItems} results</div>
          <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-inner">
            <button 
              onClick={() => setMobileCols(1)} 
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mobileCols === 1 ? 'bg-white dark:bg-zinc-900 shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              1x
            </button>
            <button 
              onClick={() => setMobileCols(2)} 
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mobileCols === 2 ? 'bg-white dark:bg-zinc-900 shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              2x
            </button>
          </div>
        </div>
      </div>

      <div className={`flex flex-col md:flex-row relative transition-all duration-500 ${isSidebarOpen ? 'gap-8' : 'gap-0'}`}>
        <div className={`hidden md:block fixed top-24 transition-all duration-500 z-[40] ${!isSidebarOpen ? 'left-8 opacity-100 scale-100' : 'left-0 opacity-0 scale-50 pointer-events-none'}`}>
          <button 
            onClick={() => { setIsSidebarOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="w-12 h-12 flex items-center justify-center bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all text-indigo-600 dark:text-indigo-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          </button>
        </div>

        <div className={`transition-all duration-500 shrink-0 md:z-[40] z-[300] ${isSidebarOpen ? 'md:w-64 opacity-100 overflow-visible' : 'md:w-0 md:opacity-0 md:invisible md:pointer-events-none md:overflow-hidden'}`}>
          <ExploreSidebar currentFilters={currentFilters} onFilterChange={handleFilterChange} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>

        <div className={`flex-1 min-w-0 transition-all duration-500`}>
          <div className="hidden md:flex bg-white/70 dark:bg-gray-800/40 backdrop-blur-md p-5 rounded-3xl border border-gray-200 dark:border-gray-700/50 mb-8 justify-between items-center shadow-sm gap-4">
            <div className="w-1/2 xl:w-1/3 relative group text-left">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
              <input name="search" value={searchTerm} maxLength={maxSearchChars} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') e.preventDefault(); }} placeholder="Search products or services..." className="w-full pl-11 pr-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white transition-all outline-none font-medium" />
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Items</p>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{totalItems} Found</h2>
              </div>
              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl shadow-inner">
                {[2, 3, 4, 5].map((val) => (
                  <button key={val} onClick={() => setCols(val as any)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${val > 3 ? 'hidden lg:block' : ''} ${cols === val ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-500'}`}>{val}x</button>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance Notice */}
          {(() => {
              const selectedCommId = currentFilters.communityFilter;
              const isSpecific = selectedCommId && !['All', 'Public', 'Unified'].includes(selectedCommId);
              const commData = user?.verifiedCommunities?.find((c: any) => (c._id || c.id || c) === selectedCommId);
              if (isSpecific && commData && (commData as any).isActive === false) {
                  return (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100/50 dark:border-amber-900/20 rounded-[2rem] p-6 mb-8 flex items-center gap-6 animate-in slide-in-from-top-4 duration-700">
                          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-2xl">🚧</span>
                          </div>
                          <div>
                              <h3 className="text-lg font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter italic">Campus Marketplace Paused</h3>
                              <p className="text-sm font-bold text-amber-700 dark:text-amber-500/80 leading-snug">
                                  The <span className="italic">{commData.name}</span> circle is currently under maintenance. Transactions and new listings are temporarily disabled.
                              </p>
                          </div>
                      </div>
                  );
              }
              return null;
          })()}

          {loading ? (
            <ItemsGridSkeleton count={12} cols={cols} />
          ) : error ? (
            <div className="bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-sm"><div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Something went wrong</h3><p className="text-gray-500 dark:text-gray-400 mt-2 font-bold text-sm">We couldn't load the items. Please check your internet.</p></div>
          ) : items.length === 0 ? (
            <div className="bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-sm"><div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div><h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">No Results Found</h3><p className="text-gray-500 dark:text-gray-400 mt-2 font-bold text-sm">Try using different filters or changing your search.</p></div>
          ) : (
            <div className={`transition-all duration-300 ${isValidating ? 'opacity-40 pointer-events-none blur-[1.5px]' : ''}`}>
              <div className={`grid gap-4 sm:gap-6 ${mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`}>
                {items.map((item: any, index: number) => (
                  <div key={item._id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {item.itemType === 'product' ? (
                      <ProductCard product={item} hideOwnerActions={true} priority={index < 6} />
                    ) : (
                      <ServiceCard service={item} hideOwnerActions={true} priority={index < 6} />
                    )}
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-20 flex justify-center items-center gap-3 pb-12">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 text-gray-400 disabled:opacity-20 hover:text-indigo-600 transition-all active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg></button>
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 p-2 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-12 h-12 rounded-xl text-xs font-black transition-all active:scale-90 ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none' : 'text-gray-400 hover:text-indigo-600'}`}>{pageNum}</button>
                      );
                    })}
                  </div>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 text-gray-400 disabled:opacity-20 hover:text-indigo-600 transition-all active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg></button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const FilterSidebarSkeleton = () => (
  <div className="hidden md:block w-64 h-[600px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shrink-0 shadow-sm animate-pulse" />
);

const MainAreaSkeleton = () => (
  <div className="flex-1 space-y-6 animate-pulse">
      <div className="h-14 w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm" />
      <ItemsGridSkeleton count={12} cols={3} />
  </div>
);

export default function ExplorePage() {
  return (
    <div className="min-h-screen-dynamic bg-[#f5f6f9] dark:bg-gray-900 transition-all duration-500 w-full max-w-[100vw] overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Suspense fallback={
            <div className="flex flex-col md:flex-row gap-8">
              <FilterSidebarSkeleton />
              <MainAreaSkeleton />
            </div>
        }>
            <ExploreFiltersAndGrid />
        </Suspense>
      </div>
    </div>
  );
}
