'use client';

import React from 'react';

interface FilterSectionProps {
  title?: string;
  children: React.ReactNode;
  borderTop?: boolean;
  className?: string;
}

export const FilterSection = ({ title, children, borderTop = true, className = "" }: FilterSectionProps) => {
  return (
    <div className={`mb-6 ${borderTop ? 'border-t border-gray-100 dark:border-gray-700 pt-4' : ''} ${className}`}>
      {title && (
        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
};
