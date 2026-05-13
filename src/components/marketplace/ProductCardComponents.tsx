import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-client';
import { formatTimeAgo } from '@/lib/utils';

export function ProductCardImage({ 
  product, 
  liked, 
  toggleWishlist, 
  distanceBadge, 
  isCampusOwned, 
  priority 
}: any) {
  return (
    <div className="relative h-28 sm:h-48 w-full overflow-hidden bg-gray-50 dark:bg-gray-900 border-b border-gray-100/50 dark:border-gray-800/50 pointer-events-none">
      {(product.status === 'Sold' || product.status === 'Completed' || product.status === 'Rented') && (
          <>
            <div className="absolute inset-0 z-10 bg-gray-900/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"></div>
            <div className={`absolute top-4 -left-10 w-36 -rotate-45 z-20 flex justify-center py-1 shadow-lg pointer-events-none ${
              (product.status === 'Rented' || product.status === 'Completed') ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
                <span className="text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {(product.status === 'Rented' || product.status === 'Completed') ? 'Rented' : 'Sold Out'}
                </span>
            </div>
          </>
      )}
      {product.images && product.images.length > 0 ? (
        <Image
          src={optimizeCloudinaryUrl(product.images[0], { width: 600, height: 400 })}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          priority={priority}
          className={`object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out ${(product.status === 'Sold' || product.status === 'Completed' || product.status === 'Rented') ? 'grayscale-[0.5] opacity-60' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-900">
          <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
      )}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20 pointer-events-auto">
          <div className="hidden sm:flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider text-gray-900 dark:text-white pointer-events-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 border border-white/20">
              {product.category}
          </div>
          <button 
              onClick={toggleWishlist}
              className={`p-1.5 rounded-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-md transition-all shadow-sm ring-1 ring-black/5 dark:ring-white/5 active:scale-90 border border-white/20 ${liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
          >
              <svg className="w-5 h-5 transition-transform group-active:scale-125" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
          </button>
      </div>
      <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
          {isCampusOwned ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-600/90 dark:bg-emerald-500/90 backdrop-blur-md text-white rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm border border-white/20">
                  Campus
              </div>
          ) : distanceBadge}
      </div>
    </div>
  );
}

export function ProductCardHeader({ product }: any) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Link href={`/profile/${product.seller._id}`} className="shrink-0 pointer-events-auto">
          <div className="relative h-4 w-4 sm:h-6 sm:w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] ring-1 ring-white dark:ring-gray-800 overflow-hidden shadow-sm transition-transform hover:scale-110">
              {product.seller?.profilePicture ? (
                  <Image src={product.seller.profilePicture} alt={product.seller.name} fill sizes="24px" className="object-cover" referrerPolicy="no-referrer" />
              ) : (
                  product.seller?.name?.charAt(0).toUpperCase() || 'U'
              )}
          </div>
      </Link>
      <Link href={`/profile/${product.seller._id}`} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pointer-events-auto truncate max-w-[120px]">
          {product.seller?.name}
      </Link>
      <span className="flex ml-auto text-[10px] text-gray-400 font-medium opacity-60 whitespace-nowrap pl-1 shrink-0">
          {formatTimeAgo(product.createdAt)}
      </span>
    </div>
  );
}

export function ProductCardPricing({ product }: any) {
  const showBuy = product.forSell !== false && product.price !== undefined && product.price !== null;
  const showRent = product.forRent && product.rentPrice !== undefined && product.rentPrice !== null;

  if (showBuy && showRent) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1">
             <span className="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter leading-none">₹{product.price.toLocaleString()}</span>
             <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-50">Buy</span>
        </div>
        <div className="flex items-baseline gap-1">
             <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 italic tracking-tighter leading-none">₹{product.rentPrice.toLocaleString()}</span>
             <span className="text-[8px] font-black text-emerald-600/50 uppercase tracking-tighter italic">/{product.rentUnit?.split(' ').pop()}</span>
        </div>
      </div>
    );
  }
  if (showRent) {
    return (
      <div className="flex items-baseline gap-1">
         <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 italic tracking-tighter leading-none">₹{product.rentPrice.toLocaleString()}</span>
         <span className="text-[9px] font-black text-emerald-600/50 uppercase tracking-tighter italic">/{product.rentUnit?.split(' ').pop()}</span>
      </div>
    );
  }
  if (showBuy) {
    return <span className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter leading-none">₹{product.price.toLocaleString()}</span>;
  }
  return null;
}

export function ProductCardRating({ product }: any) {
  const activeRating = product.forRent ? (product.itemSpecificRating ?? 0) : (product.sellerTrustRating ?? 0);
  const count = product.forRent ? product.itemSpecificCount : product.sellerTrustCount;
  
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-1">
          <div className="flex items-center shrink-0">
              {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`h-3 w-3 ${i < Math.floor(activeRating) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
              ))}
          </div>
          {count ? <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">({count})</span> : null}
      </div>
      <span className="text-[9px] font-black text-gray-400/80 uppercase tracking-widest leading-none">
          {product.forRent ? 'Item Rating' : 'Seller Rating'}
      </span>
    </div>
  );
}
