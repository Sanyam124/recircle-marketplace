'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';
import { FilterElements } from './explore/FilterElements';
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from '@/constants/marketplace';

export interface ExploreFilters {
  search: string;
  type: 'all' | 'products' | 'services';
  listingType: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  categories: string[];
  conditions: string[];
  availabilities: string[];
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

  // Auto-expand accordions based on selected categories
  useEffect(() => {
    if (currentFilters.categories.some(cat => PRODUCT_CATEGORIES.includes(cat))) {
      setProductDocsOpen(true);
    }
    if (currentFilters.categories.some(cat => SERVICE_CATEGORIES.includes(cat))) {
      setServiceDocsOpen(true);
    }
  }, [currentFilters.categories]);

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
        const sidebar = document.getElementById(isMobileOpen ? 'mobile-sidebar-inner' : 'desktop-sidebar-inner');
        if (sidebar) {
            const sidebarRect = sidebar.getBoundingClientRect();
            const scrollTop = isMobileOpen ? sidebar.scrollTop : 0;
            setToastTop(rect.top - sidebarRect.top + scrollTop);
        }
    }
    setActiveOverlay('guest');
    toastTimeoutRef.current = setTimeout(closeOverlays, 3000);
  }, [closeOverlays, isMobileOpen]);

  const { user, userLocation, refreshLocation } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-detect location if "Nearest First" is selected and location is missing
    if (name === 'sort' && value === 'distance' && !userLocation) {
        refreshLocation(
            (loc) => {
               const newFilters = { ...filters, [name]: value };
               setFilters(newFilters);
               if (!isMobileOpen) onFilterChange(newFilters);
            },
            (err) => {
               // If permission denied or failed, we just don't apply the sort
               // or we can show an alert
               if (err.code === 1) {
                   const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
                   if (isPWA) {
                       alert("Location access is required for distance sorting. Please enable location permissions for ReCircle in your device settings.");
                   } else {
                       alert("Location access is required for distance sorting. Please enable it by clicking the 'lock' or 'settings' icon next to the website URL above.");
                   }
               } else alert("Unable to detect your location.");
               
               // Revert sort to 'newest' if detection failed
               const resetFilters = { ...filters, sort: 'newest' };
               setFilters(resetFilters);
               if (!isMobileOpen) onFilterChange(resetFilters);
            }
        );
        return;
    }

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

  const toggleAvailability = (avail: string) => {
    const newAvails = filters.availabilities.includes(avail)
      ? filters.availabilities.filter(a => a !== avail)
      : [...filters.availabilities, avail];
    const newFilters = { ...filters, availabilities: newAvails };
    setFilters(newFilters);
    if (!isMobileOpen) onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const reset: ExploreFilters = {
      search: '', type: 'all', listingType: 'All', sort: 'newest',
      minPrice: '', maxPrice: '', categories: [], conditions: [], availabilities: [],
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
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[3rem] h-[85vh] overflow-hidden z-10 animate-in slide-in-from-bottom duration-500">
             {/* Locked Header */}
             <div className="absolute top-0 left-0 right-0 h-16 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-30 flex flex-col justify-center px-7 rounded-t-[3rem]">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
                <div className="flex items-center justify-between pt-2">
                   <h3 className="text-xl font-black italic uppercase">Filters</h3>
                   <button onClick={() => setIsMobileOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-xs">✕</button>
                </div>
             </div>
             {/* Scrolling Content Container */}
             <div id="mobile-sidebar-inner" className="absolute top-16 bottom-[80px] left-0 right-0 overflow-y-auto px-7 py-6 z-20">
                <FilterElements 
                   filters={filters} handleChange={handleChange} setFilters={setFilters}
                   productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
                   serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
                   citySearch={citySearch} setCitySearch={setCitySearch} 
                   availableStates={availableStates} availableCities={availableCities}
                   toggleCategory={toggleCategory} toggleCondition={toggleCondition} toggleAvailability={toggleAvailability}
                   clearFilters={clearFilters} onFilterChange={onFilterChange} user={user}
                   isSidebarOpen={true} triggerGuestToast={triggerGuestToast} isMobileMode={true}
                   activeOverlay={activeOverlay} setActiveOverlay={setActiveOverlay} closeOverlays={closeOverlays}
                   locationStats={locationDataResp?.stats || {}}
                 />
                 {activeOverlay === 'guest' && (
                    <div className="absolute left-[20px] right-[20px] z-[200] animate-in fade-in zoom-in-95" style={{ top: `${toastTop}px`, transform: 'translateY(-100%)' }}>
                       <div className="bg-gray-950 text-white p-5 rounded-2xl shadow-2xl border border-white/20">
                         <p className="text-[10px] font-bold leading-relaxed">Sign in with your <span className="text-indigo-400 italic font-black">college email</span> to unlock campus listings and hostel filters.</p>
                       </div>
                    </div>
                 )}
             </div>
             {/* Absolute Locked Footer */}
             <div className="absolute bottom-0 left-0 right-0 h-[80px] px-6 py-3.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
                <button onClick={clearFilters} className="flex-1 h-full font-black uppercase text-gray-500 border-2 border-gray-100 dark:border-gray-800 rounded-xl active:scale-95 transition-transform text-xs sm:text-sm">Reset</button>
                <button onClick={applyFilters} className="flex-[2] h-full bg-indigo-600 text-white rounded-xl font-black uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-transform text-xs sm:text-sm">Apply Filters</button>
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
              toggleCategory={toggleCategory} toggleCondition={toggleCondition} toggleAvailability={toggleAvailability}
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
        className="fixed bottom-[calc(92px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[150] md:hidden flex items-center gap-3 px-8 py-5 bg-gray-950 text-white rounded-[2rem] shadow-2xl active:scale-95 transition-transform"
      >
        <div className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-lg">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
        </div>
        <span className="font-black text-[10px] uppercase tracking-[0.2em] italic">Filters</span>
      </button>
    </>
  );
}
