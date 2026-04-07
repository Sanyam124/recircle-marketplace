'use client';

import { useState, useEffect, useCallback } from 'react';
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
    onFilterChange(newFilters);
  };

  const toggleCategory = (cat: string) => {
    const newCats = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
      
    const newFilters = { ...filters, categories: newCats };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleCondition = (cond: string) => {
    const newConds = filters.conditions.includes(cond)
      ? filters.conditions.filter(c => c !== cond)
      : [...filters.conditions, cond];
      
    const newFilters = { ...filters, conditions: newConds };
    setFilters(newFilters);
    onFilterChange(newFilters);
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
      communityFilter: 'All',
      hostel: '',
      state: '',
      city: ''
    };
    setFilters(reset);
    onFilterChange(reset);
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
                />
             </div>
             {/* Sticky bottom action bar */}
             <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800/50 flex gap-3">
                <button onClick={() => { clearFilters(); setIsMobileOpen(false); }} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95">Reset</button>
                <button 
                  onClick={() => {
                    setIsMobileOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className="flex-[2] py-4 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 dark:shadow-none active:scale-95 transition-all text-center"
                >
                  Apply Filters
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-full">
        <div className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm sticky top-24">
           <FilterElements 
              filters={filters} handleChange={handleChange} setFilters={setFilters}
              productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
              serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
              citySearch={citySearch} setCitySearch={setCitySearch} availableStates={availableStates} availableCities={availableCities}
              toggleCategory={toggleCategory} toggleCondition={toggleCondition} clearFilters={clearFilters} onFilterChange={onFilterChange} user={user}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={onToggleSidebar}
           />
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
  isSidebarOpen, onToggleSidebar
}: any) {
  // Extract hostels for selected community
  const getSelectedCommunityHostels = () => {
    if (filters.communityFilter === 'All' || filters.communityFilter === 'Public' || !user?.verifiedCommunities) return [];
    
    const selectedComm = user.verifiedCommunities.find((c: any) => 
      (c.id || c._id)?.toString() === filters.communityFilter
    );
    return selectedComm?.hostels || [];
  };

  const communityHostels = getSelectedCommunityHostels();

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

      {/* Circle */}
      <FilterGroup title="Community">
        <div className="relative group">
            <select 
              name="communityFilter" 
              value={filters.communityFilter} 
              onChange={(e) => {
                 const newComm = e.target.value;
                 const isVerified = newComm !== 'All' && newComm !== 'Public';
                 const newSort = (isVerified && filters.sort === 'distance') ? 'newest' : filters.sort;
                 const newFilters = { ...filters, communityFilter: newComm, hostel: '', sort: newSort };
                 setFilters(newFilters);
                 onFilterChange(newFilters);
              }} 
              className="w-full bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-2xl py-4 pl-5 pr-12 text-sm border border-indigo-200 dark:border-indigo-900/50 font-bold focus:ring-4 focus:ring-indigo-100 appearance-none outline-none cursor-pointer"
            >
              <option value="All" className="dark:bg-gray-900 dark:text-white text-gray-900">🌍 All Communities</option>
              <option value="Public" className="dark:bg-gray-900 dark:text-white text-gray-900">🌐 Public Only</option>
              {user?.verifiedCommunities?.map((c:any) => (
                <option key={c.id || c._id} value={c.id || c._id} className="dark:bg-gray-900 dark:text-white text-gray-900">
                  🔒 {c.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600 bg-indigo-200/50 dark:bg-indigo-900 p-1.5 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
        {communityHostels.length > 0 && (
           <div className="relative group mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
               <select 
                 name="hostel" 
                 value={filters.hostel || ''} 
                 onChange={handleChange} 
                 className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-2xl py-3 pl-5 pr-12 text-sm border border-emerald-200 dark:border-emerald-900/50 font-bold focus:ring-4 focus:ring-emerald-100 appearance-none outline-none cursor-pointer border-dashed"
               >
                 <option value="" className="dark:bg-gray-900 dark:text-white text-gray-900">All Hostels</option>
                 {communityHostels.map((h: string) => (
                   <option key={h} value={h} className="dark:bg-gray-900 dark:text-white text-gray-900">
                     🏢 {h}
                   </option>
                 ))}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 bg-emerald-200/50 dark:bg-emerald-900 p-1.5 rounded-lg flex items-center justify-center">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
               </div>
           </div>
        )}
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 bg-gray-200/50 dark:bg-gray-800 p-1.5 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
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
                  onFilterChange(newFilters);
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
                {PRODUCT_CATEGORIES.map((c: string) => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}
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
                {SERVICE_CATEGORIES.map((c: string) => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}
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

function FilterGroup({ title, children }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
      <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 ml-1 italic">{title}</h4>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-4 cursor-pointer group/label select-none">
      <div 
        onClick={onChange} 
        className={`w-6 h-6 flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${checked ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none rotate-6' : 'border-gray-100 dark:border-gray-800 group-hover/label:border-indigo-400'}`}
      >
        {checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-[11px] font-black uppercase tracking-tight transition-all ${checked ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover/label:text-gray-800 dark:group-hover/label:text-white'}`}>{label}</span>
    </label>
  );
}

const PRODUCT_CATEGORIES = [
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

const SERVICE_CATEGORIES = [
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
