'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';
import { FilterElements } from './explore/FilterElements';

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
  const [productDocsOpen, setProductDocsOpen] = useState(false);
  const [serviceDocsOpen, setServiceDocsOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [toastTop, setToastTop] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync filters with currentFilters from parent
  useEffect(() => {
    if (!isMobileOpen) {
      setFilters(currentFilters);
    }
  }, [currentFilters, isMobileOpen]);

  // Auto-close info overlays after 3 seconds
  useEffect(() => {
    if (activeOverlay && activeOverlay !== 'guest') {
      const timer = setTimeout(() => {
        setActiveOverlay(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeOverlay]);

  const closeOverlays = useCallback(() => {
    setActiveOverlay(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  const triggerGuestToast = useCallback((e?: React.MouseEvent) => {
    closeOverlays();
    if (e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const sidebar = document.getElementById('desktop-sidebar-inner');
        if (sidebar) {
            const sidebarRect = sidebar.getBoundingClientRect();
            setToastTop(rect.top - sidebarRect.top);
        }
    }
    setActiveOverlay('guest');
    toastTimeoutRef.current = setTimeout(closeOverlays, 3000);
  }, [closeOverlays]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    if (!isMobileOpen) onFilterChange(newFilters);
  };

  const toggleCategory = (cat: string) => {
    const newCats = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    const newFilters = { ...filters, categories: newCats };
    setFilters(newFilters);
    if (!isMobileOpen) onFilterChange(newFilters);
  };

  const toggleCondition = (cond: string) => {
    const newConds = filters.conditions.includes(cond)
      ? filters.conditions.filter(c => c !== cond)
      : [...filters.conditions, cond];
    const newFilters = { ...filters, conditions: newConds };
    setFilters(newFilters);
    if (!isMobileOpen) onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const reset: ExploreFilters = {
      search: '', type: 'all', listingType: 'All', sort: 'newest',
      minPrice: '', maxPrice: '', categories: [], conditions: [],
      communityFilter: user ? 'All' : 'Public', hostel: '', state: '', city: ''
    };
    setFilters(reset);
    onFilterChange(reset);
    setIsMobileOpen(false);
  };

  const applyFilters = () => {
    onFilterChange(filters);
    setIsMobileOpen(false);
  };

  const { data: locationDataResp } = useSWR('/api/cities');
  const availableLocations = locationDataResp?.locations || {};
  const availableStates = Object.keys(availableLocations);
  const availableCities = filters.state ? (availableLocations[filters.state] || []) : [];

  return (
    <>
      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[250] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[3rem] h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-500">
             <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-1" />
             <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-2xl font-black italic uppercase">Filters</h3>
                <button onClick={() => setIsMobileOpen(false)} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl">✕</button>
             </div>
             <div className="flex-1 overflow-y-auto px-7 py-6 pb-20">
                <FilterElements 
                   filters={filters} handleChange={handleChange} setFilters={setFilters}
                   productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
                   serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
                   citySearch={citySearch} setCitySearch={setCitySearch} 
                   availableStates={availableStates} availableCities={availableCities}
                   toggleCategory={toggleCategory} toggleCondition={toggleCondition} 
                   clearFilters={clearFilters} onFilterChange={onFilterChange} user={user}
                   isSidebarOpen={true} triggerGuestToast={triggerGuestToast} isMobileMode={true}
                   activeOverlay={activeOverlay} setActiveOverlay={setActiveOverlay} closeOverlays={closeOverlays}
                   locationStats={locationDataResp?.stats || {}}
                 />
             </div>
             <div className="p-6 pb-safe bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <button onClick={clearFilters} className="flex-1 py-4 font-black uppercase text-gray-500 border-2 border-gray-100 dark:border-gray-800 rounded-2xl active:scale-95 transition-transform">Reset</button>
                <button onClick={applyFilters} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-transform">Apply Filters</button>
             </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-full">
        <div id="desktop-sidebar-inner" className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 shadow-sm sticky top-24 z-[40]">
           <FilterElements 
              filters={filters} handleChange={handleChange} setFilters={setFilters}
              productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
              serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
              citySearch={citySearch} setCitySearch={setCitySearch}
              availableStates={availableStates} availableCities={availableCities}
              toggleCategory={toggleCategory} toggleCondition={toggleCondition}
              clearFilters={clearFilters} onFilterChange={onFilterChange} user={user}
              isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} triggerGuestToast={triggerGuestToast} isMobileMode={false}
              activeOverlay={activeOverlay} setActiveOverlay={setActiveOverlay} closeOverlays={closeOverlays}
              locationStats={locationDataResp?.stats || {}}
           />
           {activeOverlay === 'guest' && (
              <div className="absolute left-[-5px] right-[-5px] z-[200] animate-in fade-in zoom-in-95" style={{ top: `${toastTop}px`, transform: 'translateY(-100%)' }}>
                 <div className="bg-gray-950 text-white p-5 rounded-2xl shadow-2xl border border-white/20 mx-1">
                   <p className="text-[10px] font-bold leading-relaxed">Sign in with your <span className="text-indigo-400 italic font-black">college email</span> to unlock campus listings and hostel filters.</p>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Floating Filter Button (Mobile) */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[90] md:hidden flex items-center gap-3 px-8 py-5 bg-gray-950 text-white rounded-[2rem] shadow-2xl"
      >
        <span className="font-black text-xs uppercase tracking-widest italic">Filters</span>
      </button>
    </>
  );
}
