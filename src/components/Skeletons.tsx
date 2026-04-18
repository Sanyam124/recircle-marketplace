'use client';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 dark:bg-gray-800/50 rounded ${className}`} />
);

export default Skeleton;

export const ItemCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] sm:rounded-3xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
      {/* Image Placeholder */}
      <div className="h-28 sm:h-48 w-full bg-gray-100 dark:bg-gray-800/50" />
      
      <div className="p-2 sm:p-3.5 flex flex-col flex-1 min-h-[140px] sm:min-h-[200px]">
        {/* Seller Info Row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 sm:h-6 sm:w-6 rounded-md bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="hidden sm:block ml-auto h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded opacity-40" />
        </div>
        
        {/* Title & Description */}
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-800 rounded opacity-60" />
        </div>
        
        {/* Price & Metadata Container */}
        <div className="mt-auto space-y-3">
          {/* Desktop Rating Placeholder */}
          <div className="hidden sm:flex items-center justify-between mb-2">
             <div className="h-3 w-16 bg-gray-50 dark:bg-gray-800 rounded" />
             <div className="h-4 w-12 bg-gray-50 dark:bg-gray-800 rounded italic" />
          </div>

          {/* Price Bar */}
          <div className="pt-4 border-t border-gray-50 dark:border-gray-800/50 flex items-center justify-between">
            <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="sm:hidden h-4 w-10 bg-gray-50 dark:bg-gray-800 rounded" />
          </div>
          
          {/* Location Footer */}
          <div className="mt-3 pt-2.5 border-t border-gray-50 dark:border-gray-800/50 flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-50 dark:bg-gray-800 rounded shrink-0" />
            <div className="h-3 w-24 bg-gray-50 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ItemsGridSkeleton = ({ count = 6, cols = 3 }: { count?: number; cols?: number }) => {
  const gridClass = `grid gap-4 sm:gap-6 ${
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
    <div className="min-h-screen bg-gray-50/30 dark:bg-[#080B14] transition-colors animate-pulse">
      {/* Banner Placeholder */}
      <div className="h-[220px] sm:h-[280px] lg:h-[320px] bg-gray-100 dark:bg-gray-800/50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-30 -mt-36 sm:-mt-44 lg:-mt-48 pb-12">
        {/* Glass Card Placeholder */}
        <div className="p-6 md:p-10 rounded-[2.5rem] bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar Placeholder */}
            <div className="h-32 w-32 md:h-44 md:w-44 rounded-2xl bg-gray-50 dark:bg-gray-800" />
            
            <div className="flex-1 space-y-6 w-full text-center md:text-left pt-2">
              <div className="space-y-3">
                <div className="h-10 w-48 sm:w-64 bg-gray-50 dark:bg-gray-800 rounded-xl mx-auto md:mx-0" />
                <div className="flex gap-4 justify-center md:justify-start">
                  <div className="h-4 w-20 bg-gray-50 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-32 bg-gray-50 dark:bg-gray-800 rounded" />
                </div>
              </div>
              
              <div className="space-y-2 max-w-2xl mx-auto md:mx-0">
                <div className="h-4 w-full bg-gray-50 dark:bg-gray-800/50 rounded" />
                <div className="h-4 w-5/6 bg-gray-50 dark:bg-gray-800/50 rounded" />
              </div>

              <div className="flex gap-3 justify-center md:justify-start pt-2">
                <div className="h-11 w-32 bg-gray-50 dark:bg-gray-800 rounded-xl" />
                <div className="h-11 w-11 bg-gray-50 dark:bg-gray-800 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar Skeleton */}
        <div className="flex gap-2 mt-12 mb-8 p-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-max">
          <div className="h-10 w-24 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-white/5" />
          <div className="h-10 w-28 bg-transparent rounded-xl" />
          <div className="h-10 w-28 bg-transparent rounded-xl" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const OrderRowSkeleton = () => {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-sm border border-gray-100 dark:border-[#2a2a2a] overflow-hidden flex flex-col md:flex-row mb-4 animate-pulse">
      <div className="p-5 flex-1 flex flex-col sm:flex-row gap-5">
        {/* Item Image */}
        <div className="w-full sm:w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl shrink-0" />
        
        {/* Item Info */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex justify-between items-start gap-4">
            <div className="h-7 w-3/4 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded-md" />
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded-md" />
          </div>
          
          <div className="h-12 w-full bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5" />
        </div>
      </div>
      
      {/* Sidebar actions */}
      <div className="bg-gray-50/50 dark:bg-white/5 border-t md:border-t-0 md:border-l border-gray-100 dark:border-[#2a2a2a] p-5 w-full md:w-64 flex flex-col justify-center gap-3">
        <div className="h-11 w-full bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="h-11 w-full bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
      </div>
    </div>
  );
};

export const DetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 animate-pulse">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
        {/* Gallery Placeholder */}
        <div className="space-y-4">
             <div className="aspect-square w-full rounded-[2.5rem] bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a]" />
             <div className="flex gap-3 mt-4">
                <div className="h-16 w-16 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a]" />
                <div className="h-16 w-16 rounded-xl bg-gray-100 dark:bg-[#1a1a1a]" />
                <div className="h-16 w-16 rounded-xl bg-gray-100 dark:bg-[#1a1a1a]" />
             </div>
             
             {/* Large Description Placeholder */}
             <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-200 dark:border-[#2a2a2a] space-y-4">
                <div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-50 dark:bg-gray-800/50 rounded" />
                    <div className="h-4 w-full bg-gray-50 dark:bg-gray-800/50 rounded" />
                    <div className="h-4 w-2/3 bg-gray-50 dark:bg-gray-800/50 rounded" />
                </div>
             </div>
        </div>

        {/* Right Info Sidebar Placeholder */}
        <div className="mt-8 lg:mt-0 space-y-6">
           {/* Header Card */}
           <div className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 border border-gray-200 dark:border-[#2a2a2a] space-y-8">
              <div className="space-y-3">
                 <div className="h-8 w-2/3 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                 <div className="h-4 w-32 bg-gray-50 dark:bg-gray-800/50 rounded" />
              </div>
              
              <div className="flex items-baseline gap-2">
                 <div className="h-10 w-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl" />
                 <div className="h-4 w-12 bg-gray-50 dark:bg-gray-800/50 rounded" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="h-14 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5" />
                 <div className="h-14 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5" />
              </div>
           </div>

           {/* Seller Card */}
           <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-200 dark:border-[#2a2a2a] flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="flex-1 space-y-2">
                 <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                 <div className="h-3 w-20 bg-gray-50 dark:bg-gray-800/50 rounded" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-800/50" />
           </div>

           {/* Sticky CTA Placeholder (Mobile View) */}
           <div className="bg-indigo-600 rounded-[2rem] h-16 w-full opacity-20" />
        </div>
      </div>
    </div>
  );
};

export const PostSkeleton = () => {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] p-4 mb-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-32 bg-gray-50 dark:bg-gray-800/50" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-50 dark:bg-gray-800/50" />
            <div className="h-4 w-5/6 bg-gray-50 dark:bg-gray-800/50" />
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
      {/* Header area */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4 shrink-0">
         <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
         <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
         </div>
      </div>
      
      {/* Message body */}
      <div className="flex-1 p-4 space-y-8 overflow-hidden">
        <div className="flex justify-start">
           <div className="h-12 w-[60%] bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-tl-none" />
        </div>
        <div className="flex justify-end">
           <div className="h-16 w-[45%] bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl rounded-tr-none" />
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#080B14] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 animate-pulse">
        {/* Header Breadcrumb placeholder */}
        <div className="mb-6 h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Skeleton */}
          <div className="hidden md:block w-64 h-[700px] bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] border border-gray-200 dark:border-[#2a2a2a] shrink-0 shadow-sm" />
          
          <div className="flex-1 space-y-6">
             {/* Filter summary bar placeholder */}
             <div className="h-16 w-full bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-200 dark:border-[#2a2a2a] shadow-sm" />
             
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#080B14] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 animate-pulse">
        {/* Header placeholder */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
           <div className="h-12 w-64 bg-gray-200 dark:bg-gray-800 rounded-[1.5rem]" />
           <div className="h-12 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
        
        {/* Content grid */}
        <ItemsGridSkeleton count={8} cols={4} />
      </div>
    </div>
  );
};

export const OrdersPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#080B14] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 animate-pulse">
        {/* Header Section */}
        <div className="mb-10 text-center space-y-4">
           <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-2xl mx-auto" />
           <div className="h-5 w-72 bg-gray-100 dark:bg-gray-800/50 rounded-lg mx-auto" />
        </div>
        
        {/* Tabs switcher */}
        <div className="flex justify-center mb-10">
           <div className="h-14 w-64 bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-200 dark:border-[#2a2a2a] shadow-sm" />
        </div>

        {/* Orders rows */}
        <div className="space-y-6">
           {[...Array(4)].map((_, i) => <OrderRowSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
};

export const BoardPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#080B14] transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-20 animate-pulse">
         {/* Circular Board switcher area */}
         <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-[2rem] h-16 w-full mb-8 shadow-sm" />
         
         {/* Posts List */}
         <div className="space-y-4">
             {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
         </div>
      </div>
    </div>
  );
};

export const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50/50 dark:bg-[#080B14] transition-colors">
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-12" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {[...Array(10)].map((_, i) => <ItemCardSkeleton key={i} />)}
      </div>
    </div>
  </div>
);

export const HomeSkeleton = () => {
  return (
    <div className="bg-white dark:bg-[#080B14] transition-colors">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32 flex flex-col items-center text-center space-y-8 animate-pulse">
        <div className="h-16 w-3/4 max-w-2xl bg-gray-100 dark:bg-gray-800 rounded-[2rem]" />
        <div className="h-8 w-1/2 max-w-xl bg-gray-50 dark:bg-gray-800 rounded-xl" />
        <div className="flex gap-4">
          <div className="h-12 w-40 rounded-full bg-indigo-600/10" />
          <div className="h-12 w-32 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
};
