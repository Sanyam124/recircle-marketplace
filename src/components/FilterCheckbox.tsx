'use client';

import React from 'react';

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}

export const FilterCheckbox = React.memo(({ label, checked, onChange, count }: FilterCheckboxProps) => {
  return (
    <label className="flex items-center group cursor-pointer py-1">
      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
        checked 
          ? 'bg-indigo-600 border-indigo-600' 
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
      }`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        onChange={onChange}
      />
      <span className={`ml-3 text-sm transition-colors cursor-pointer leading-tight flex-1 ${checked ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
         <span className="text-[10px] text-gray-400 font-medium ml-2">{count}</span>
      )}
    </label>
  );
});
