'use client';

import React from 'react';

interface AdBlockProps {
  layout?: 'sidebar' | 'in-feed' | 'banner';
  className?: string;
}

const AdBlock: React.FC<AdBlockProps> = ({ layout = 'sidebar', className = '' }) => {
  // Common styles for the ad block container
  const baseStyles = "bg-gray-100 dark:bg-gray-800/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center relative group transition-all duration-300";
  
  // Layout specific dimensions and styles
  const layoutStyles = {
    sidebar: "aspect-square w-full py-10",
    'in-feed': "w-full py-12 px-6 mb-6",
    banner: "w-full py-8 px-4"
  };

  return (
    <div className={`${baseStyles} ${layoutStyles[layout]} ${className}`}>
      {/* Sponsored Badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-md">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sponsored</span>
      </div>

      <div className="flex flex-col items-center text-center gap-3">
        {/* Placeholder for ad icon/logo */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div className="space-y-1 px-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Promote Your Item</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">Get 10x more visibility and sell your items faster.</p>
        </div>

        <button className="mt-2 px-6 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-indigo-900/10 transition-colors shadow-sm active:scale-95">
          Learn More
        </button>
      </div>

      {/* Subtle overlay accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
};

export default AdBlock;
