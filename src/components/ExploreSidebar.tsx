'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { FilterCheckbox } from './FilterCheckbox';
import { FilterSection } from './FilterSection';
import { useAuth } from '@/context/AuthContext';

export interface ExploreFilters {
  search: string;
  type: 'all' | 'products' | 'services';
  sort: string;
  minPrice: string;
  maxPrice: string;
  categories: string[];
  conditions: string[];
  communityFilter: string;
  city: string;
}

interface ExploreSidebarProps {
  currentFilters: ExploreFilters;
  onFilterChange: (filters: ExploreFilters) => void;
}

const PRODUCT_CATEGORIES = [
  'Textbooks', 'Study Notes', 'Stationery', 'Electronics & Gadgets', 
  'Clothing & Accessories', 'Bags & Luggage', 'Storage & Organizers',
  'Hostel Essentials', 'Sports & Fitness', 'Furniture', 'Other'
];

const SERVICE_CATEGORIES = [
  'Academic Help (Tutoring, Notes)', 'Assignment & Projects', 
  'Tech Support & Repairs', 'Graphic Design & Editing', 
  'Photography & Videography', 'Dorm & Room Services (Cleaning, Moving)', 
  'Fitness & Sports Coaching', 'Event Organizing', 'Other'
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export default function ExploreSidebar({ currentFilters, onFilterChange }: ExploreSidebarProps) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';

  const [filters, setFilters] = useState<ExploreFilters>(currentFilters);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isFirstRender = useRef(true);

  // Sync with parent when parent aggressively changes filters (like "Clear All" in empty state)
  useEffect(() => {
    setFilters(prev => {
        if (JSON.stringify(prev) === JSON.stringify(currentFilters)) {
            return prev;
        }
        return currentFilters;
    });
  }, [currentFilters]);

  const { user } = useAuth();
  
  // Separate dropdown toggles so they can be opened independently
  const [productDocsOpen, setProductDocsOpen] = useState(false);
  const [serviceDocsOpen, setServiceDocsOpen] = useState(false);

  const [availableCities, setAvailableCities] = useState<{ name: string; count: number }[]>([]);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch('/api/explore/cities');
        if (res.ok) {
          const data = await res.json();
          setAvailableCities(data.cities || []);
        }
      } catch (err) {
        console.error('Failed to fetch cities', err);
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    if (filters.categories.some(c => PRODUCT_CATEGORIES.includes(c))) setProductDocsOpen(true);
    if (filters.categories.some(c => SERVICE_CATEGORIES.includes(c))) setServiceDocsOpen(true);
  }, []);

  // Debounce search and emit changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (cat: string, isProductCategory: boolean) => {
    setFilters(prev => {
      // Handle the "Other" collision where both arrays have "Other"
      let active = prev.categories.includes(cat);
      
      let nextType = prev.type;
      // If user is viewing 'All' and clicks 'Other' (which exists in both), we need to force 
      // the filter into 'products' or 'services' so the backend knows which 'Other' they meant.
      if (cat === 'Other' && prev.type === 'all' && !active) {
        nextType = isProductCategory ? 'products' : 'services';
      }
      
      if (active) {
        // If "Other" is clicked to be removed, just remove it.
        return { ...prev, type: nextType, categories: prev.categories.filter(c => c !== cat) };
      } else {
        // If we are adding it, just add it. 
        return { ...prev, type: nextType, categories: [...prev.categories, cat] };
      }
    });
  };

  const toggleCondition = (cond: string) => {
    setFilters(prev => {
      const active = prev.conditions.includes(cond);
      if (active) return { ...prev, conditions: prev.conditions.filter(c => c !== cond) };
      return { ...prev, conditions: [...prev.conditions, cond] };
    });
  };

  const clearFilters = () => {
    setCitySearch('');
    setFilters({
      search: '',
      type: 'all',
      sort: 'newest',
      minPrice: '',
      maxPrice: '',
      categories: [],
      conditions: [],
      communityFilter: 'All',
      city: ''
    });
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden w-full flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4"
      >
        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
           <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           Filters & Sort
        </span>
        <svg className={`w-5 h-5 transform transition-transform ${isMobileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {/* Sidebar Content */}
      <div className={`${isMobileOpen ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0 space-y-6 transition-colors`}>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-gray-900 dark:text-white shrink-0">Explore</h3>
             {(filters.categories.length > 0 || filters.conditions.length > 0 || filters.minPrice || filters.maxPrice || filters.search || filters.city || filters.communityFilter !== 'All') ? (
                <button onClick={clearFilters} className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline transition-all">Clear All</button>
             ) : (
                <span className="text-[10px] text-gray-400 font-medium italic">No Active Filters</span>
             )}
          </div>

          {/* Search Input */}
          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Type Toggle */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Item Type</h4>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
               <button 
                  onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))} 
                  className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${filters.type === 'all' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >
                 All
               </button>
               <button 
                  onClick={() => setFilters(prev => ({ ...prev, type: 'products' }))} 
                  className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${filters.type === 'products' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >
                 Products
               </button>
               <button 
                  onClick={() => setFilters(prev => ({ ...prev, type: 'services' }))} 
                  className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${filters.type === 'services' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >
                 Services
               </button>
            </div>
          </div>

          {/* Sort Select */}
          <FilterSection title="Sort By">
            <select
              name="sort"
              value={filters.sort}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-white"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </FilterSection>

          {/* City Filter - Searchable Dynamic Version */}
          <FilterSection title="Explore Cities">
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-xs focus:ring-2 focus:ring-orange-500 transition-colors dark:text-white"
                />
              </div>

              {/* Suggestions List */}
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-1">
                {(citySearch.trim() === '' 
                  ? availableCities.slice(0, 5) 
                  : availableCities.filter(city => city.name.toLowerCase().includes(citySearch.toLowerCase()))
                ).map(city => (
                    <button
                      key={city.name}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, city: city.name }));
                        setCitySearch('');
                      }}
                      className={`flex justify-between items-center text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        filters.city === city.name 
                          ? 'bg-orange-500 text-white' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="truncate">{city.name}</span>
                      <span className={`text-[10px] opacity-70 ${filters.city === city.name ? 'text-white' : 'text-gray-400'}`}>
                        {city.count}
                      </span>
                    </button>
                  ))}
                
                {availableCities.length > 5 && citySearch.trim() === '' && (
                  <p className="text-[10px] text-center text-gray-400 py-1 italic">Type to search all cities...</p>
                )}
                
                {availableCities.length === 0 && (
                  <p className="text-[10px] text-gray-400 italic text-center py-2">No active cities found</p>
                )}
              </div>

              {filters.city && (
                <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30">
                  <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">Filtered by: {filters.city}</span>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, city: '' }))}
                    className="p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full transition-colors"
                  >
                    <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              )}
            </div>
          </FilterSection>

          {/* Community Location Filter */}
          <FilterSection title="Location (Circles)">
            <select
              name="communityFilter"
              value={filters.communityFilter}
              onChange={handleChange}
              className="w-full font-semibold bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200 border-none rounded-xl text-sm py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm"
            >
              <option value="All" className="font-bold">🌍 Entire Network</option>
              <option value="Public">🌐 Public Items Only</option>
              {user?.verifiedCommunities?.map((c: any) => (
                 <option key={c._id || c.id} value={c._id || c.id}>
                    🔒 {c.name}
                 </option>
              ))}
            </select>
          </FilterSection>

          {/* Price Range */}
          <FilterSection title="Price Range">
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleChange}
                placeholder="Min ₹"
                className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-white placeholder-gray-400"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleChange}
                placeholder="Max ₹"
                className="w-full bg-gray-50 dark:bg-gray-700/50 border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-white placeholder-gray-400"
              />
            </div>
          </FilterSection>

          {/* Categories */}
          <FilterSection title="Categories">
            {/* Products Category Dropdown */}
            {(filters.type === 'all' || filters.type === 'products') && (
              <div className="mb-3">
                <button 
                  onClick={() => setProductDocsOpen(!productDocsOpen)}
                  className="flex w-full items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 mb-2 transition-colors transition-transform shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    📦 Products
                    {filters.categories.filter(c => PRODUCT_CATEGORIES.includes(c)).length > 0 && (
                      <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                        {filters.categories.filter(c => PRODUCT_CATEGORIES.includes(c)).length}
                      </span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 transform transition-transform ${productDocsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {productDocsOpen && (
                  <div className="space-y-1 pl-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-1">
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <FilterCheckbox 
                        key={cat}
                        label={cat}
                        checked={filters.categories.includes(cat) && (cat !== 'Other' || filters.type !== 'services')}
                        onChange={() => toggleCategory(cat, true)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Services Category Dropdown */}
            {(filters.type === 'all' || filters.type === 'services') && (
              <div>
                <button 
                  onClick={() => setServiceDocsOpen(!serviceDocsOpen)}
                  className="flex w-full items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 mb-2 transition-colors transition-transform shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    🛠️ Services
                    {filters.categories.filter(c => SERVICE_CATEGORIES.includes(c)).length > 0 && (
                      <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                        {filters.categories.filter(c => SERVICE_CATEGORIES.includes(c)).length}
                      </span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 transform transition-transform ${serviceDocsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {serviceDocsOpen && (
                  <div className="space-y-1 pl-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-1">
                    {SERVICE_CATEGORIES.map((cat) => (
                      <FilterCheckbox 
                        key={cat}
                        label={cat}
                        checked={filters.categories.includes(cat) && (cat !== 'Other' || filters.type !== 'products')}
                        onChange={() => toggleCategory(cat, false)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </FilterSection>

          {/* Conditions */}
          {filters.type !== 'services' && CONDITIONS.length > 0 && (
             <FilterSection title="Item Condition">
               <div className="space-y-2">
                 {CONDITIONS.map((cond) => (
                   <FilterCheckbox 
                      key={cond}
                      label={cond}
                      checked={filters.conditions.includes(cond)}
                      onChange={() => toggleCondition(cond)}
                   />
                 ))}
               </div>
             </FilterSection>
          )}
        </div>
      </div>
    </>
  );
}
