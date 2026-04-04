import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`}
    />
  );
};

export const ItemCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
      {/* Image Placeholder */}
      <div className="h-40 sm:h-56 w-full bg-gray-200 dark:bg-gray-700" />
      
      <div className="p-2 sm:p-4 flex-1 flex flex-col">
        {/* Seller Info Row */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="h-4 w-4 sm:h-6 sm:w-6 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        
        {/* Title Lines */}
        <div className="space-y-2 mb-3 sm:mb-4">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        
        {/* Price & Metadata Row */}
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* Bottom metadata footer */}
          <div className="pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ItemsGridSkeleton = ({ count = 6, cols = 3 }: { count?: number; cols?: number }) => {
  const gridClass = `grid gap-6 ${
    cols === 2 ? 'grid-cols-2' : 
    cols === 3 ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3' : 
    cols === 4 ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 
    'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5'
  }`;

  return (
    <div className={gridClass}>
      {[...Array(count)].map((_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Profile Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 shadow-sm" />
          <div className="flex-1 space-y-4 w-full">
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="h-8 w-48 sm:w-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="flex gap-4">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
            <div className="space-y-2 max-w-2xl mx-auto md:mx-0">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="h-10 flex-1 md:w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-10 flex-1 md:w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-5 grid grid-cols-2 gap-4 bg-gray-50/50 dark:bg-gray-700/20">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>

      {/* Tab Bar Skeleton */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-max">
        <div className="h-9 w-24 bg-white dark:bg-gray-700 rounded-lg shadow-sm" />
        <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const OrderRowSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row mb-4 animate-pulse">
      <div className="p-5 flex-1 flex flex-col sm:flex-row gap-5">
        {/* Item Image */}
        <div className="w-full sm:w-28 h-28 sm:h-24 bg-gray-200 dark:bg-gray-700 rounded-xl shrink-0" />
        
        {/* Item Info */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex justify-between items-start gap-4">
            <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* Party row */}
          <div className="h-10 w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700/50 flex items-center px-3 gap-2">
             <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
             <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Sidebar actions */}
      <div className="bg-gray-50/50 dark:bg-gray-800/50 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 p-5 w-full md:w-64 flex flex-col justify-center gap-3">
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-4 w-1/2 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
};

export const DetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
        {/* Image Skeleton */}
        <div className="aspect-square w-full rounded-2xl sm:rounded-3xl bg-gray-200 dark:bg-gray-700" />

        {/* Info Skeleton */}
        <div className="mt-10 lg:mt-0 space-y-8">
          <div className="space-y-3">
            <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
          
          <div className="flex items-center gap-4 py-4 border-y border-gray-100 dark:border-gray-800">
            <div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl space-y-6">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
               <div className="space-y-2 flex-1">
                 <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                 <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
               </div>
               <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
              <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PostSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex gap-6 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatSidebarSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1 animate-pulse">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
               <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
               <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessageBubbleSkeleton = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 animate-pulse">
      {/* Search/Header area */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4 shrink-0">
         <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
         <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
         </div>
         <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      
      {/* Message body */}
      <div className="flex-1 p-4 space-y-8 overflow-hidden">
        <div className="flex justify-start">
           <div className="h-12 w-[60%] bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-tl-none shadow-sm" />
        </div>
        <div className="flex justify-end">
           <div className="h-16 w-[45%] bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl rounded-tr-none shadow-sm" />
        </div>
        <div className="flex justify-start">
           <div className="h-20 w-[70%] bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-tl-none shadow-sm" />
        </div>
        <div className="flex justify-end">
           <div className="h-10 w-[30%] bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl rounded-tr-none shadow-sm" />
        </div>
        <div className="flex justify-start">
           <div className="h-12 w-[40%] bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-tl-none shadow-sm" />
        </div>
      </div>
      
      {/* Input area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
         <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
};

export const ExplorePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        {/* Header Breadcrumb */}
        <div className="mb-6 h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        
        {/* Main Layout Container */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Skeleton */}
          <div className="hidden md:block w-64 h-[600px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shrink-0 shadow-sm" />
          
          <div className="flex-1 space-y-6">
             {/* Filter summary bar placeholder */}
             <div className="h-14 w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm" />
             
             {/* Grid of items */}
             <ItemsGridSkeleton count={6} cols={3} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const WishlistPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        {/* Header and Toggle Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
           <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
           <div className="h-10 w-64 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700" />
        </div>
        
        {/* Controls Bar Placeholder */}
        <div className="h-14 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 shadow-sm" />

        {/* Grid of items */}
        <ItemsGridSkeleton count={8} cols={4} />
      </div>
    </div>
  );
};

export const OrdersPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        {/* Header Section */}
        <div className="mb-10 text-center space-y-3">
           <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-2xl mx-auto" />
           <div className="h-5 w-72 bg-gray-200 dark:bg-gray-700/50 rounded-lg mx-auto" />
        </div>
        
        {/* Tabs Bar Placeholder */}
        <div className="flex justify-center mb-10">
           <div className="h-12 w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm" />
        </div>

        {/* Orders List */}
        <div className="space-y-6">
           {[...Array(4)].map((_, i) => <OrderRowSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
};

export const BoardPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
         {/* Circular Board Header switcher area */}
         <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl h-16 w-full mb-8 shadow-sm" />
         
         {/* Posts List */}
         <div className="space-y-4">
             {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
         </div>
      </div>
    </div>
  );
};

export const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-12" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => <ItemCardSkeleton key={i} />)}
      </div>
    </div>
  </div>
);

export const HomeSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32 flex flex-col items-center text-center space-y-8">
        <Skeleton className="h-16 w-3/4 max-w-2xl" />
        <Skeleton className="h-8 w-2/3 max-w-xl" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-40 rounded-full" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-2xl text-center mb-12">
            <Skeleton className="h-10 w-48 mx-auto mb-4" />
            <Skeleton className="h-6 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center p-8 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-4">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
