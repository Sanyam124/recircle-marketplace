'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';

export interface ExploreFilters {
  search: string;
  type: 'all' | 'products' | 'services';
  listingType: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  categories: string[];
  conditions: string[];
  communityFilter: string;
  hostel: string;
  state: string;
  city: string;
}

interface ExploreSidebarProps {
  currentFilters: ExploreFilters;
  onFilterChange: (filters: ExploreFilters) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function ExploreSidebar({ 
  currentFilters, 
  onFilterChange,
  isSidebarOpen = true,
  onToggleSidebar
}: ExploreSidebarProps) {
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [filters, setFilters] = useState<ExploreFilters>(currentFilters);
  const [citySearch, setCitySearch] = useState('');
  const [showGuestToast, setShowGuestToast] = useState(false);
  const [toastTop, setToastTop] = useState(0);
  const [activeTimeout, setActiveTimeout] = useState<NodeJS.Timeout | null>(null);

  const triggerGuestToast = useCallback((e?: React.MouseEvent) => {
    if (activeTimeout) clearTimeout(activeTimeout);
    
    if (e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const sidebar = document.getElementById('desktop-sidebar-inner');
        if (sidebar) {
            const sidebarRect = sidebar.getBoundingClientRect();
            setToastTop(rect.top - sidebarRect.top);
        }
    }
    
    setShowGuestToast(true);
    
    const timeout = setTimeout(() => {
        setShowGuestToast(false);
        setActiveTimeout(null);
    }, 5000);
    
    setActiveTimeout(timeout);
  }, [activeTimeout]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isMobileOpen]);
  
  const [productDocsOpen, setProductDocsOpen] = useState(false);
  const [serviceDocsOpen, setServiceDocsOpen] = useState(false);

  const { data: locationDataResp } = useSWR('/api/cities');
  const availableLocations: Record<string, string[]> = locationDataResp?.locations || {};
  const availableStates = Object.keys(availableLocations);
  const availableCities = filters.state ? (availableLocations[filters.state] || []) : [];

  useEffect(() => {
    setFilters(prev => {
      const isDifferent = JSON.stringify(prev) !== JSON.stringify(currentFilters);
      return isDifferent ? currentFilters : prev;
    });
  }, [currentFilters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    if (!isMobileOpen) {
        onFilterChange(newFilters);
    }
  };

  const toggleCategory = (cat: string) => {
    const newCats = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
      
    const newFilters = { ...filters, categories: newCats };
    setFilters(newFilters);
    if (!isMobileOpen) {
        onFilterChange(newFilters);
    }
  };

  const toggleCondition = (cond: string) => {
    const newConds = filters.conditions.includes(cond)
      ? filters.conditions.filter(c => c !== cond)
      : [...filters.conditions, cond];
      
    const newFilters = { ...filters, conditions: newConds };
    setFilters(newFilters);
    if (!isMobileOpen) {
        onFilterChange(newFilters);
    }
  };

  const clearFilters = () => {
    const reset: ExploreFilters = {
      search: '',
      type: 'all',
      listingType: 'All',
      sort: 'newest',
      minPrice: '',
      maxPrice: '',
      categories: [],
      conditions: [],
      communityFilter: user ? 'All' : 'Public',
      hostel: '',
      state: '',
      city: ''
    };
    setFilters(reset);
    onFilterChange(reset);
    if (isMobileOpen) {
        setIsMobileOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const applyFilters = () => {
    onFilterChange(filters);
    setIsMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Mobile Drawer - Bottom Sheet with scroll lock */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-[100] md:hidden" 
          role="dialog" 
          aria-modal="true"
        >
          {/* Backdrop - prevents all background interaction */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setIsMobileOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
          />
          {/* Drawer Panel - slides up from bottom */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.25)] h-[85vh] overflow-hidden flex flex-col border-t border-white/20 dark:border-gray-800/50 animate-in slide-in-from-bottom duration-500"
            style={{ animationTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
          >
             {/* Drag handle */}
             <div 
               className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-1 shrink-0 cursor-pointer active:bg-gray-400" 
               onClick={() => setIsMobileOpen(false)} 
             />
             {/* Header */}
             <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 dark:border-gray-800/50 shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight italic uppercase">Marketplace</h3>
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1 opacity-70">Personalize Your Feed</p>
                </div>
                <button 
                  onClick={() => setIsMobileOpen(false)} 
                  className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:rotate-90 transition-all active:scale-90"
                >
                  <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             {/* Scrollable filter content */}
             <div className="flex-1 overflow-y-auto overscroll-contain px-7 py-6 pb-36 space-y-10 scroll-smooth">
                <FilterElements 
                   filters={filters} handleChange={handleChange} setFilters={setFilters}
                   productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
                   serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
                   citySearch={citySearch} setCitySearch={setCitySearch} availableStates={availableStates} availableCities={availableCities}
                   toggleCategory={toggleCategory} toggleCondition={toggleCondition} clearFilters={clearFilters} onFilterChange={onFilterChange} user={user}
                   isSidebarOpen={true}
                   triggerGuestToast={triggerGuestToast}
                   isMobileMode={isMobileOpen}
                />
             </div>
             
             {/* Guest Toast Notification (Mobile Specific) */}
             {showGuestToast && isMobileOpen && (
               <div className="absolute bottom-[100px] left-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gray-950/98 dark:bg-gray-900/98 text-white p-5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-2xl">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                         <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-[11px] font-bold leading-relaxed">
                        Sign up with <span className="text-indigo-400 italic font-black">college email</span> to unlock campus listings & hostel filters.
                      </p>
                    </div>
                  </div>
               </div>
             )}

             {/* Mobile Actions - Fixed at bottom */}
             <div className="shrink-0 p-6 pb-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800/50 flex gap-4">
                <button 
                  onClick={clearFilters}
                  className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 border-2 border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
                >
                  Reset
                </button>
                <button 
                  onClick={applyFilters}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  Apply Filters
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-full">
        <div id="desktop-sidebar-inner" className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm sticky top-24 z-[40]">
           <FilterElements 
              filters={filters} handleChange={handleChange} setFilters={setFilters}
              productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
              serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
              citySearch={citySearch} setCitySearch={setCitySearch} availableStates={availableStates} availableCities={availableCities}
              toggleCategory={toggleCategory} toggleCondition={toggleCondition} clearFilters={clearFilters} onFilterChange={onFilterChange} user={user}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={onToggleSidebar}
              triggerGuestToast={triggerGuestToast}
           />
            {/* Desktop Guest Toast (Contextual) */}
            {showGuestToast && (
               <div 
                 className="absolute left-[-5px] right-[-5px] z-[200] animate-in fade-in zoom-in-95 duration-300 pointer-events-none"
                 style={{ top: `${toastTop}px`, transform: 'translateY(calc(-100% + 10px))' }}
               >
                  <div className="bg-gray-950/98 dark:bg-gray-900/98 text-white p-5 rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-white/20 backdrop-blur-2xl mx-1 relative">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                         <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-[10px] font-bold leading-relaxed">
                         Sign up with <span className="text-indigo-400 italic font-black">college email</span> to unlock campus listings & hostel filters.
                      </p>
                    </div>
                    {/* Arrow overlapping inside the field */}
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-gray-950/98 dark:bg-gray-900/98 rotate-45 border-r border-b border-white/20 shadow-2xl z-[-1]" />
                  </div>
               </div>
             )}
        </div>
      </div>

      {/* Floating Filter Button (Mobile) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] md:hidden">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-3 px-8 py-5 bg-gray-950 dark:bg-white text-white dark:text-gray-950 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all active:scale-90 group"
        >
           <div className="relative">
              <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              {filters.categories.length + filters.conditions.length > 0 && (
                <span className="absolute -top-3 -right-3 bg-indigo-500 text-white text-[8px] w-5 h-5 rounded-full flex items-center justify-center font-black ring-4 ring-gray-950 dark:ring-white">
                    {filters.categories.length + filters.conditions.length}
                </span>
              )}
           </div>
           <span className="font-black text-xs uppercase tracking-widest italic">Filters</span>
        </button>
      </div>
    </>
  );
}

function FilterElements({ 
  filters, handleChange, setFilters, productDocsOpen, setProductDocsOpen, 
  serviceDocsOpen, setServiceDocsOpen, citySearch, setCitySearch, availableStates, availableCities, 
  toggleCategory, toggleCondition, clearFilters, onFilterChange, user,
  isSidebarOpen, onToggleSidebar, triggerGuestToast, isMobileMode
}: any) {
  const { data: siteConfig, isLoading: configLoading } = useSWR('/api/site-config');
  const productCategories = siteConfig?.productCategories || PRODUCT_CATEGORIES_DEFAULT;
  const serviceCategories = siteConfig?.serviceCategories || SERVICE_CATEGORIES_DEFAULT;

  const communityHostels = useMemo(() => {
      if (filters.communityFilter === 'Public') return [];
      
      if (filters.communityFilter === 'All') {
          // Flatten all hostels from all verified communities
          const allHostels = user?.verifiedCommunities?.reduce((acc: string[], curr: any) => {
              if (curr.hostels) return [...acc, ...curr.hostels];
              return acc;
          }, []) || [];
          // Remove duplicates and sort
          return Array.from(new Set(allHostels)).sort();
      }

      const selected = user?.verifiedCommunities?.find((c: any) => (c._id || c.id || c) === filters.communityFilter);
      return selected?.hostels || [];
  }, [filters.communityFilter, user]);

  return (
    <div className="space-y-8">
      {onToggleSidebar && (
        <button 
          onClick={onToggleSidebar}
          className="hidden md:flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 19l-7-7 7-7" /></svg>
          Hide Sidebar
        </button>
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-gray-900 dark:text-white uppercase tracking-tight text-xl italic">Filters</h3>
        <button onClick={clearFilters} className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline transition-all opacity-70 hover:opacity-100">Reset</button>
      </div>

      <FilterGroup 
        title="Community" 
        info={!user ? "Sign up with your college email ID to unlock private campus listings and gain access to hostel-specific filtering for your community." : null}
      >
        <div className="relative group" onClick={(e) => !user && triggerGuestToast(e)}>
            <select 
              name="communityFilter" 
              value={filters.communityFilter} 
              onChange={(e) => {
                 const newComm = e.target.value;
                 const isVerified = newComm !== 'All' && newComm !== 'Public';
                 const newSort = (isVerified && filters.sort === 'distance') ? 'newest' : filters.sort;
                 const newFilters = { ...filters, communityFilter: newComm, hostel: '', sort: newSort };
                 setFilters(newFilters);
                 if (!isMobileMode) {
                     onFilterChange(newFilters);
                 }
              }} 
              disabled={!user}
              className={`w-full bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-2xl py-4 pl-5 pr-12 text-sm border border-indigo-200 dark:border-indigo-900/50 font-bold focus:ring-4 focus:ring-indigo-100 appearance-none outline-none transition-all ${!user ? 'opacity-70 pointer-events-none' : 'cursor-pointer'}`}
            >
              {user ? (
                <>
                  <option value="All" className="dark:bg-gray-900 dark:text-white text-gray-900">🌏 Unified Feed</option>
                  <option value="Public" className="dark:bg-gray-900 dark:text-white text-gray-900">🌐 Public Only</option>
                  {user?.verifiedCommunities?.map((c:any) => (
                    <option key={c.id || c._id} value={c.id || c._id} className="dark:bg-gray-900 dark:text-white text-gray-900">
                      🔒 {c.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value="Public" className="dark:bg-gray-900 dark:text-white text-gray-900">🌐 Public Only</option>
              )}
            </select>
            <div className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none ${(filters.communityFilter === 'All' || filters.communityFilter === 'Public') ? 'text-gray-300' : 'text-indigo-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
        <div className="mt-4" onClick={(e) => !user && triggerGuestToast(e)}>
            <label className={`text-[10px] font-black uppercase tracking-widest italic ml-1 mb-1.5 block ${ (filters.communityFilter === 'Public' || filters.communityFilter === 'All') ? 'text-gray-300 dark:text-gray-700' : 'text-gray-400'}`}>Building/Hostel</label>
            <div className={`relative group transition-opacity duration-300 ${(filters.communityFilter === 'Public' || filters.communityFilter === 'All' || !user) ? 'opacity-50 pointer-events-none' : ''}`}>
                <select 
                  name="hostel" 
                  value={filters.hostel || ''} 
                  onChange={handleChange} 
                  disabled={filters.communityFilter === 'Public' || filters.communityFilter === 'All' || !user}
                  className={`w-full py-3.5 pl-4 pr-10 text-[11px] border font-bold appearance-none outline-none transition-all rounded-2xl ${
                    filters.communityFilter === 'Public' || filters.communityFilter === 'All' || !user
                    ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 border-gray-100 dark:border-gray-800 pointer-events-none'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 focus:ring-4 focus:ring-emerald-100 border-dashed cursor-pointer'
                  }`}
                >
                  <option value="">All Hostels</option>
                  {communityHostels.map((h: string) => (
                    <option key={h} value={h} className="dark:bg-gray-900 dark:text-white text-gray-900">
                      🏢 {h}
                    </option>
                  ))}
                </select>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${ (filters.communityFilter === 'Public' || filters.communityFilter === 'All') ? 'text-gray-300' : 'text-emerald-400'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
      </FilterGroup>

      {/* Sort */}
      <FilterGroup title="Sort By">
        <div className="relative group">
            <select name="sort" value={filters.sort} onChange={handleChange} className="w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl py-4 pl-5 pr-12 text-sm border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold appearance-none outline-none cursor-pointer">
              <option value="newest" className="dark:bg-gray-900 dark:text-white text-gray-900">Newest First</option>
              {(filters.communityFilter === 'All' || filters.communityFilter === 'Public') && (
                <option value="distance" className="dark:bg-gray-900 dark:text-white text-gray-900">Distance: Nearest First</option>
              )}
              <option value="price_asc" className="dark:bg-gray-900 dark:text-white text-gray-900">Price: Low to High</option>
              <option value="price_desc" className="dark:bg-gray-900 dark:text-white text-gray-900">Price: High to Low</option>
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
      </FilterGroup>

      {/* Type Toggle */}
      <FilterGroup title="I am looking for">
        <div className="grid grid-cols-1 gap-2 w-full bg-gray-100/50 dark:bg-gray-900/50 p-1.5 rounded-[1.25rem] border border-gray-100/50 dark:border-gray-800/50 shadow-inner">
            {['all', 'products', 'services'].map((t: any) => (
              <button key={t} onClick={() => {
                  const newFilters = { ...filters, type: t };
                  setFilters(newFilters);
                  if (!isMobileMode) {
                      onFilterChange(newFilters);
                  }
                }}
                className={`flex items-center justify-center py-2.5 px-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${filters.type === t ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5 italic' : 'text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
              >
                {t}
              </button>
            ))}
        </div>
      </FilterGroup>

      {/* Categories */}
      <FilterGroup title="Filter by Type">
        {filters.type !== 'services' && (
          <div className="mb-4">
            <button 
              onClick={() => setProductDocsOpen(!productDocsOpen)} 
              className="w-full text-left text-[11px] font-black uppercase tracking-widest px-4 py-4 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl flex justify-between items-center text-gray-900 dark:text-white transition-all border border-gray-100 dark:border-gray-700 active:scale-95 shadow-sm"
            >
              <span>Product Types</span>
              <div className={`transition-transform duration-300 ${productDocsOpen ? 'rotate-180' : ''}`}>
                 <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </button>
            {productDocsOpen && (
              <div className="px-1 mt-5 space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {productCategories.map((c: string) => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}
              </div>
            )}
          </div>
        )}
        {filters.type !== 'products' && (
          <div>
            <button 
              onClick={() => setServiceDocsOpen(!serviceDocsOpen)} 
              className="w-full text-left text-[11px] font-black uppercase tracking-widest px-4 py-4 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl flex justify-between items-center text-gray-900 dark:text-white transition-all border border-gray-100 dark:border-gray-700 active:scale-95 shadow-sm"
            >
              <span>Service Types</span> 
              <div className={`transition-transform duration-300 ${serviceDocsOpen ? 'rotate-180' : ''}`}>
                 <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </button>
            {serviceDocsOpen && (
              <div className="px-1 mt-5 space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {serviceCategories.map((c: string) => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}
              </div>
            )}
          </div>
        )}
      </FilterGroup>

      {/* Listing Type Toggle */}
      {filters.type !== 'services' && (
        <FilterGroup title="I want to">
          <div className="flex bg-gray-100/50 dark:bg-gray-900/50 p-1.5 rounded-[1.25rem] border border-gray-100/50 dark:border-gray-800/50 shadow-inner">
              {['All', 'Buy', 'Rent'].map((t: any) => (
                <button key={t} onClick={() => {
                    const newFilters = { ...filters, listingType: t };
                    setFilters(newFilters);
                    onFilterChange(newFilters);
                  }}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filters.listingType === t ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                >
                  {t}
                </button>
              ))}
          </div>
        </FilterGroup>
      )}

      {/* State & City */}
      <FilterGroup title="Location">
        <div className="space-y-3">
          {/* State */}
          <div className="relative group">
              <select 
                name="state" 
                value={filters.state} 
                onChange={(e) => {
                  const newFilters = { ...filters, state: e.target.value, city: '' }; // reset city
                  setFilters(newFilters);
                  onFilterChange(newFilters);
                }} 
                className="w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl py-4 px-5 text-sm border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 transition-all font-bold appearance-none outline-none"
              >
                <option value="" className="dark:bg-gray-900 dark:text-white text-gray-900">All States</option>
                {availableStates.map((s: string) => <option key={s} value={s} className="dark:bg-gray-900 dark:text-white text-gray-900 font-bold">{s}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
          </div>

          {/* City */}
          <div className={`relative group transition-opacity duration-300 ${!filters.state ? 'opacity-50 pointer-events-none' : ''}`}>
              <select 
                name="city" 
                value={filters.city} 
                onChange={handleChange} 
                disabled={!filters.state}
                className="w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl py-4 px-5 text-sm border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 transition-all font-bold appearance-none outline-none disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50"
              >
                <option value="" className="dark:bg-gray-900 dark:text-white text-gray-900">
                   {filters.state ? "All Cities" : "Select State First"}
                </option>
                {availableCities.map((c: string) => <option key={c} value={c} className="dark:bg-gray-900 dark:text-white text-gray-900 font-bold">{c}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
          </div>
        </div>
      </FilterGroup>

      {/* Price */}
      <FilterGroup title="Price Range">
        <div className="flex gap-4">
          <div className="relative flex-1">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">₹</span>
             <input name="minPrice" value={filters.minPrice} onChange={handleChange} placeholder="Min" className="w-full pl-8 pr-4 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl text-xs border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-4 focus:ring-indigo-100 outline-none font-black" />
          </div>
          <div className="relative flex-1">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">₹</span>
             <input name="maxPrice" value={filters.maxPrice} onChange={handleChange} placeholder="Max" className="w-full pl-8 pr-4 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl text-xs border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-4 focus:ring-indigo-100 outline-none font-black" />
          </div>
        </div>
      </FilterGroup>


    </div>
  );
}

function FilterGroup({ title, children, info }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 group/filter">
      <div className="flex items-center gap-2 mb-4 ml-1">
        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] italic">{title}</h4>
        {info && (
          <div className="relative group/info">
            <div className="p-1 px-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-help">
               <svg className="w-3 h-3 text-gray-400 group-hover/info:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <div className="absolute left-[-10px] top-full mt-3 w-64 p-4 bg-gray-950 dark:bg-gray-800 text-white text-[10px] font-bold rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-[150] border border-white/10 backdrop-blur-xl pointer-events-none">
              <div className="relative leading-relaxed">
                {info}
                <div className="absolute -top-5 left-3.5 w-3 h-3 bg-gray-950 dark:bg-gray-800 rotate-45 border-l border-t border-white/10" />
              </div>
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-4 cursor-pointer group/label select-none">
      <div 
        onClick={onChange} 
        className={`w-6 h-6 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${checked ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none rotate-6' : 'border-gray-100 dark:border-gray-800 group-hover/label:border-indigo-400'}`}
      >
        {checked && <svg className="w-4 h-4 text-white animate-in zoom-in-50 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-[11px] font-black uppercase tracking-tight transition-all ${checked ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover/label:text-gray-800 dark:group-hover/label:text-white'}`}>{label}</span>
    </label>
  );
}

const PRODUCT_CATEGORIES_DEFAULT = [
  'Textbooks', 
  'Study Notes', 
  'Stationery', 
  'Electronics & Gadgets', 
  'Clothing & Accessories', 
  'Bags & Luggage', 
  'Storage & Organizers', 
  'Hostel Essentials', 
  'Sports & Fitness', 
  'Furniture', 
  'Other'
];

const SERVICE_CATEGORIES_DEFAULT = [
  'Academic Help (Tutoring, Notes)', 
  'Assignment & Projects', 
  'Tech Support & Repairs', 
  'Graphic Design & Editing', 
  'Photography & Videography', 
  'Dorm & Room Services (Cleaning, Moving)', 
  'Fitness & Sports Coaching', 
  'Event Organizing', 
  'Other'
];
