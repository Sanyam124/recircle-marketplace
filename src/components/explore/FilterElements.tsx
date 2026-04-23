import React, { useMemo } from 'react';
import useSWR from 'swr';
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from '@/constants/marketplace';

interface FilterElementsProps {
  filters: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setFilters: (filters: any) => void;
  productDocsOpen: boolean;
  setProductDocsOpen: (open: boolean) => void;
  serviceDocsOpen: boolean;
  setServiceDocsOpen: (open: boolean) => void;
  citySearch: string;
  setCitySearch: (s: string) => void;
  availableStates: string[];
  availableCities: string[];
  toggleCategory: (cat: string) => void;
  toggleCondition: (cond: string) => void;
  clearFilters: () => void;
  onFilterChange: (filters: any) => void;
  user: any;
  isSidebarOpen: boolean;
  onToggleSidebar?: () => void;
  triggerGuestToast: (e: React.MouseEvent) => void;
  isMobileMode: boolean;
  activeOverlay: string | null;
  setActiveOverlay: (id: string | null) => void;
  closeOverlays: () => void;
  locationStats: any;
}

export function FilterElements({ 
  filters, handleChange, setFilters, productDocsOpen, setProductDocsOpen, 
  serviceDocsOpen, setServiceDocsOpen, availableStates, availableCities, 
  toggleCategory, toggleCondition, clearFilters, onFilterChange, user,
  onToggleSidebar, triggerGuestToast, isMobileMode,
  activeOverlay, setActiveOverlay, closeOverlays, locationStats
}: FilterElementsProps) {
  const { data: siteConfig } = useSWR('/api/site-config');
  const productCategories = siteConfig?.productCategories || PRODUCT_CATEGORIES;
  const serviceCategories = siteConfig?.serviceCategories || SERVICE_CATEGORIES;

  const communityHostels = useMemo(() => {
      if (filters.communityFilter === 'Public') return [];
      if (filters.communityFilter === 'All') {
          const allHostels = user?.verifiedCommunities?.reduce((acc: string[], curr: any) => {
              if (curr.hostels) return [...acc, ...curr.hostels];
              return acc;
          }, []) || [];
          return Array.from(new Set(allHostels)).sort() as string[];
      }
      const selected = user?.verifiedCommunities?.find((c: any) => (c._id || c.id || c) === filters.communityFilter);
      return (selected?.hostels || []) as string[];
  }, [filters.communityFilter, user]);

  return (
    <div className="space-y-8">
      {onToggleSidebar && (
        <button 
          onClick={onToggleSidebar}
          className="hidden md:flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 19l-7-7 7-7" /></svg>
          Hide Sidebar
        </button>
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-gray-900 dark:text-white uppercase tracking-tight text-xl italic">Filters</h3>
        <button onClick={clearFilters} className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline transition-all opacity-70 hover:opacity-100">Reset</button>
      </div>

      <FilterGroup id="community" title="Community" info="Unlock campus listings and hostel filters. Sign in with your college email." activeOverlay={activeOverlay} setActiveOverlay={setActiveOverlay} closeOverlays={closeOverlays}>
        <div className="relative group" onClick={(e) => (!user || !user.verifiedCommunities?.length) && triggerGuestToast(e)}>
            <select 
              name="communityFilter" 
              value={filters.communityFilter} 
              onChange={(e) => {
                  const newComm = e.target.value;
                  const newFilters = { ...filters, communityFilter: newComm, hostel: '' };
                  setFilters(newFilters);
                  closeOverlays();
                  if (!isMobileMode) onFilterChange(newFilters);
              }} 
              disabled={!user || !user.verifiedCommunities?.length}
              className={`w-full bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-2xl py-4 pl-5 pr-12 text-sm border border-indigo-200 dark:border-indigo-900/50 font-bold appearance-none outline-none transition-all ${(!user || !user.verifiedCommunities?.length) ? 'opacity-70 pointer-events-none' : 'cursor-pointer'}`}
            >
              {user?.verifiedCommunities?.length ? (
                <>
                  <option value="All">🌏 Unified Feed</option>
                  <option value="Public">🌐 Public Only</option>
                  {user.verifiedCommunities.map((c:any) => <option key={c._id} value={c._id}>🔒 {c.name}</option>)}
                </>
              ) : <option value="Public">🌐 Public Only</option>}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
        <div className="mt-4" onClick={(e) => (!user || !user.verifiedCommunities?.length) && triggerGuestToast(e)}>
            <label className="text-[10px] font-black uppercase tracking-widest italic ml-1 mb-1.5 block text-gray-400 dark:text-gray-500">Hostel/Building</label>
            <div className={`relative group transition-opacity duration-300 ${(filters.communityFilter === 'Public' || filters.communityFilter === 'All' || !user?.verifiedCommunities?.length) ? 'opacity-50 pointer-events-none' : ''}`}>
                <select name="hostel" value={filters.hostel || ''} onChange={handleChange} disabled={filters.communityFilter === 'Public' || filters.communityFilter === 'All' || !user} className="w-full py-3.5 pl-4 pr-10 text-[11px] border font-bold appearance-none outline-none transition-all rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50">
                  <option value="">All Areas</option>
                  {communityHostels.map(h => <option key={h} value={h}>🏢 {h}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
      </FilterGroup>

      <FilterGroup title="Sort By">
        <div className="relative group">
            <select name="sort" value={filters.sort} onChange={handleChange} className="w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl py-4 pl-5 pr-12 text-sm border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-200 font-bold appearance-none outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              {(filters.communityFilter === 'All' || filters.communityFilter === 'Public') && <option value="distance">Nearest First</option>}
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
      </FilterGroup>

      <FilterGroup title="I am looking for">
        <div className="flex flex-col gap-2 bg-gray-100/50 dark:bg-gray-900/50 p-2 rounded-[1.25rem]">
            {['all', 'products', 'services'].map((t: any) => (
              <button key={t} onClick={() => {
                  const newFilters = { ...filters, type: t };
                  setFilters(newFilters);
                  if (!isMobileMode) onFilterChange(newFilters);
                }}
                className={`py-3 px-4 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all text-center ${filters.type === t ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm italic' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                {t}
              </button>
            ))}
        </div>
        
        {filters.type === 'products' && (
            <div className="mt-4">
                <label className="text-[10px] font-black uppercase tracking-widest italic ml-1 mb-1.5 block text-gray-400 dark:text-gray-500">Transaction Type</label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100/50 dark:bg-gray-900/50 p-1.5 rounded-[1.25rem]">
                    {['All', 'Buy', 'Rent'].map((lt: any) => (
                        <button key={lt} onClick={() => {
                            const newFilters = { ...filters, listingType: lt };
                            setFilters(newFilters);
                            if (!isMobileMode) onFilterChange(newFilters);
                        }}
                        className={`py-2 px-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${filters.listingType === lt ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm italic' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                            {lt}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </FilterGroup>

      <FilterGroup title="Region & City">
        <div className="grid grid-cols-1 gap-3">
            <div className="relative group">
                <select name="state" value={filters.state || ''} onChange={handleChange} className="w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl py-3.5 pl-4 pr-10 text-[11px] border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-200 font-bold appearance-none outline-none">
                    <option value="">All States</option>
                    {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
            <div className="relative group">
                <select name="city" value={filters.city || ''} onChange={handleChange} className="w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl py-3.5 pl-4 pr-10 text-[11px] border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-200 font-bold appearance-none outline-none">
                    <option value="">All Cities</option>
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
      </FilterGroup>

      <FilterGroup title="Categories">
        {filters.type !== 'services' && (
          <div className="mb-4">
            <button onClick={() => setProductDocsOpen(!productDocsOpen)} className="w-full text-[11px] font-black uppercase tracking-widest px-4 py-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl flex justify-between items-center transition-all border border-gray-100 dark:border-gray-700">
              <span>Products</span>
              <div className={`transition-transform duration-300 ${productDocsOpen ? 'rotate-180' : ''}`}><svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg></div>
            </button>
            {productDocsOpen && <div className="px-1 mt-5 space-y-4 max-h-64 overflow-y-auto">{productCategories.map((c: string) => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}</div>}
          </div>
        )}
        {filters.type !== 'products' && (
          <div>
            <button onClick={() => setServiceDocsOpen(!serviceDocsOpen)} className="w-full text-[11px] font-black uppercase tracking-widest px-4 py-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl flex justify-between items-center transition-all border border-gray-100 dark:border-gray-700">
              <span>Services</span> 
              <div className={`transition-transform duration-300 ${serviceDocsOpen ? 'rotate-180' : ''}`}><svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg></div>
            </button>
            {serviceDocsOpen && <div className="px-1 mt-5 space-y-4 max-h-64 overflow-y-auto">{serviceCategories.map((c: string) => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}</div>}
          </div>
        )}
      </FilterGroup>

      <FilterGroup title="Price Range">
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">₹</span>
             <input name="minPrice" value={filters.minPrice} onChange={handleChange} placeholder="Min Price" className="w-full pl-8 pr-4 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl text-xs border-2 border-gray-100 dark:border-gray-800 outline-none font-black" />
          </div>
          <div className="relative flex-1">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">₹</span>
             <input name="maxPrice" value={filters.maxPrice} onChange={handleChange} placeholder="Max Price" className="w-full pl-8 pr-4 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl text-xs border-2 border-gray-100 dark:border-gray-800 outline-none font-black" />
          </div>
        </div>
      </FilterGroup>

      {filters.type !== 'services' && (
        <FilterGroup title="Item Condition">
          <div className="grid grid-cols-2 gap-3">
              {['Like New', 'Good', 'Fair', 'Poor'].map((cond: string) => (
                  <button
                      key={cond}
                      onClick={() => toggleCondition(cond)}
                      className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          filters.conditions.includes(cond)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg italic'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500'
                      }`}
                  >
                      {cond}
                  </button>
              ))}
          </div>
        </FilterGroup>
      )}
    </div>
  );
}

function FilterGroup({ id, title, children, info, activeOverlay, setActiveOverlay, closeOverlays }: any) {
  const isOpen = activeOverlay === id;
  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center gap-2 mb-4 ml-1">
        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">{title}</h4>
        {info && (
          <div className="relative group/info">
            <button type="button" onClick={() => setActiveOverlay(isOpen ? null : id)} className="p-1 bg-gray-100 dark:bg-gray-800 rounded-lg"><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
            {isOpen && <div className="absolute left-0 top-full mt-2 w-64 p-4 bg-gray-950 text-white text-[10px] font-bold rounded-2xl z-[150] border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">{info}</div>}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-4 cursor-pointer select-none">
      <div onClick={onChange} className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${checked ? 'bg-indigo-600 border-indigo-600 rotate-6 shadow-lg' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800'}`}>
        {checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-[11px] font-black uppercase tracking-tight ${checked ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
    </label>
  );
}
