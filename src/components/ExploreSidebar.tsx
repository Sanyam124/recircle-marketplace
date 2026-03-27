'use client';

import { useState, useEffect } from 'react';
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

export default function ExploreSidebar({ currentFilters, onFilterChange }: ExploreSidebarProps) {
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [filters, setFilters] = useState<ExploreFilters>(currentFilters);
  const [availableCities, setAvailableCities] = useState<{name: string, count: number}[]>([]);
  const [citySearch, setCitySearch] = useState('');
  
  const [productDocsOpen, setProductDocsOpen] = useState(false);
  const [serviceDocsOpen, setServiceDocsOpen] = useState(false);

  // Sync internal state if props change externally
  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  // Notify parent on change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  useEffect(() => {
    fetch('/api/cities')
      .then(res => res.json())
      .then(data => setAvailableCities(data.cities || []))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (cat: string) => {
    setFilters(prev => {
      const newCats = prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories: newCats };
    });
  };

  const toggleCondition = (cond: string) => {
    setFilters(prev => {
      const newConds = prev.conditions.includes(cond)
        ? prev.conditions.filter(c => c !== cond)
        : [...prev.conditions, cond];
      return { ...prev, conditions: newConds };
    });
  };

  const clearFilters = () => {
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
      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] md:hidden transition-all duration-300 ${isMobileOpen ? 'visible' : 'invisible'}`}>
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileOpen(false)}
        />
        <div className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[2rem] shadow-2xl h-[85vh] overflow-hidden flex flex-col transition-transform duration-300 transform ${isMobileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
           <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-2 shrink-0" onClick={() => setIsMobileOpen(false)} />
           <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Filters</h3>
              <button onClick={() => setIsMobileOpen(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </div>
           <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-8">
              <FilterElements 
                filters={filters} handleChange={handleChange} setFilters={setFilters}
                productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
                serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
                citySearch={citySearch} setCitySearch={setCitySearch} availableCities={availableCities}
                toggleCategory={toggleCategory} toggleCondition={toggleCondition} clearFilters={clearFilters} user={user}
              />
           </div>
           <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-4">
              <button onClick={clearFilters} className="flex-1 py-4 text-sm font-bold text-gray-500 border border-gray-200 rounded-2xl">Reset</button>
              <button onClick={() => setIsMobileOpen(false)} className="flex-[2] py-4 text-sm font-bold text-white bg-indigo-600 rounded-2xl">Show Results</button>
           </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-full space-y-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
           <FilterElements 
              filters={filters} handleChange={handleChange} setFilters={setFilters}
              productDocsOpen={productDocsOpen} setProductDocsOpen={setProductDocsOpen}
              serviceDocsOpen={serviceDocsOpen} setServiceDocsOpen={setServiceDocsOpen}
              citySearch={citySearch} setCitySearch={setCitySearch} availableCities={availableCities}
              toggleCategory={toggleCategory} toggleCondition={toggleCondition} clearFilters={clearFilters} user={user}
           />
        </div>
      </div>

      {/* Floating Filter Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-2.5 px-6 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-2xl transition-all active:scale-95"
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
           <span className="font-bold text-sm uppercase">Filters</span>
           {filters.categories.length + filters.conditions.length > 0 && (
             <span className="bg-indigo-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
               {filters.categories.length + filters.conditions.length}
             </span>
           )}
        </button>
      </div>
    </>
  );
}

function FilterElements({ 
  filters, handleChange, setFilters, productDocsOpen, setProductDocsOpen, 
  serviceDocsOpen, setServiceDocsOpen, citySearch, setCitySearch, availableCities, 
  toggleCategory, toggleCondition, clearFilters, user
}: any) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Filters</h3>
        <button onClick={clearFilters} className="text-xs font-bold text-indigo-600">Clear</button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <input
          name="search"
          value={filters.search}
          onChange={handleChange}
          placeholder="Search..."
          className="w-full pl-4 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Type Toggle */}
      <div className="mb-6 flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {['all', 'products', 'services'].map(t => (
            <button key={t} onClick={() => setFilters((p:any) => ({...p, type: t}))}
              className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize ${filters.type === t ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500'}`}
            >
              {t}
            </button>
          ))}
      </div>

      {/* City */}
      <FilterGroup title="City">
        <select name="city" value={filters.city} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border-none">
          <option value="">All Cities</option>
          {availableCities.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </FilterGroup>

      {/* Circle */}
      <FilterGroup title="Community Circle">
        <select name="communityFilter" value={filters.communityFilter} onChange={handleChange} className="w-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200 rounded-xl text-sm border-none font-bold">
          <option value="All">🌍 Network</option>
          <option value="Public">🌐 Public</option>
          {user?.verifiedCommunities?.map((c:any) => <option key={c.id || c._id} value={c.id || c._id}>🔒 {c.name}</option>)}
        </select>
      </FilterGroup>

      {/* Price */}
      <FilterGroup title="Price">
        <div className="flex gap-2">
          <input name="minPrice" value={filters.minPrice} onChange={handleChange} placeholder="Min" className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl text-xs border-none" />
          <input name="maxPrice" value={filters.maxPrice} onChange={handleChange} placeholder="Max" className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl text-xs border-none" />
        </div>
      </FilterGroup>

      {/* Categories */}
      <FilterGroup title="Categories">
        {filters.type !== 'services' && (
          <div className="mb-2">
            <button onClick={() => setProductDocsOpen(!productDocsOpen)} className="w-full text-left text-sm font-bold p-2 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between">
              Products <span className="opacity-50">{productDocsOpen ? '−' : '+'}</span>
            </button>
            {productDocsOpen && (
              <div className="pl-2 mt-2 space-y-2 max-h-40 overflow-y-auto">
                {PRODUCT_CATEGORIES.map(c => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}
              </div>
            )}
          </div>
        )}
        {filters.type !== 'products' && (
          <div>
            <button onClick={() => setServiceDocsOpen(!serviceDocsOpen)} className="w-full text-left text-sm font-bold p-2 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between">
              Services <span className="opacity-50">{serviceDocsOpen ? '−' : '+'}</span>
            </button>
            {serviceDocsOpen && (
              <div className="pl-2 mt-2 space-y-2 max-h-40 overflow-y-auto">
                {SERVICE_CATEGORIES.map(c => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggleCategory(c)} />)}
              </div>
            )}
          </div>
        )}
      </FilterGroup>

      {/* Sort */}
      <FilterGroup title="Sort">
        <select name="sort" value={filters.sort} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border-none">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low-High</option>
          <option value="price_desc">Price: High-Low</option>
        </select>
      </FilterGroup>
    </>
  );
}

function FilterGroup({ title, children }: any) {
  return (
    <div className="mb-6">
      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{title}</h4>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div onClick={onChange} className={`w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200 dark:border-gray-700'}`}>
        {checked && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 transition-colors">{label}</span>
    </label>
  );
}

const PRODUCT_CATEGORIES = ['Textbooks', 'Electronics', 'Clothing', 'Furniture', 'Other'];
const SERVICE_CATEGORIES = ['Tutoring', 'Tech Support', 'Design', 'Other'];
