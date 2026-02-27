'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface SearchAndFilterProps {
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
  showRatingSort?: boolean;
  categories?: string[];
}

export interface FilterState {
  search: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  category?: string;
}

export default function SearchAndFilter({ onFilterChange, initialFilters, showRatingSort = false, categories = [] }: SearchAndFilterProps) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';

  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    search: '',
    sort: 'newest',
    minPrice: '',
    maxPrice: '',
    category: initialCategory
  });

  const isFirstRender = useRef(true);

  // Debounce search input
  useEffect(() => {
    // Skip the very first render so we don't trigger a double-fetch on page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 transition-colors">
      {/* Search Bar */}
      <div className="flex-1 relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleChange}
          placeholder="Search..."
          className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 dark:text-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors"
        />
      </div>

      {/* Sort Dropdown */}
      <div className="sm:w-48">
        <select
          name="sort"
          value={filters.sort}
          onChange={handleChange}
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 dark:text-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors"
        >
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          {showRatingSort && <option value="rating">Highest Rated</option>}
        </select>
      </div>

       {/* Category Dropdown */}
       {categories && categories.length > 0 && (
        <div className="sm:w-48">
          <select
            name="category"
            value={filters.category || ''}
            onChange={handleChange}
            className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 dark:text-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range */}
      <div className="flex items-center space-x-2">
        <input
          type="number"
          name="minPrice"
          value={filters.minPrice}
          onChange={handleChange}
          placeholder="Min ₹"
          className="flex-1 block w-full sm:w-24 rounded-md border-0 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors"
        />
        <span className="text-gray-500 dark:text-gray-400">-</span>
        <input
          type="number"
          name="maxPrice"
          value={filters.maxPrice}
          onChange={handleChange}
          placeholder="Max ₹"
          className="flex-1 block w-full sm:w-24 rounded-md border-0 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-colors"
        />
      </div>
    </div>
  );
}
