'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ExpandableText from './ExpandableText';

import { formatTimeAgo, calculateDistance, formatDistance } from '@/lib/utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-client';

interface Product {
  _id: string;
  title: string;
  forSell?: boolean;
  forRent?: boolean;
  price?: number;
  rentPrice?: number;
  rentUnit?: string;
  images: string[];
  category: string;
  condition: string;
  description: string;
  createdAt?: string | Date;
  seller: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  sellerTrustRating?: number;
  sellerTrustCount?: number;
  itemSpecificRating?: number;
  itemSpecificCount?: number;
  ownerRating?: number; // Legacy
  itemRating?: number;  // Legacy
  reviewCount?: number; // Legacy
  visibility?: 'Public' | 'Community';
  community?: { _id: string; name: string } | string | any;
  location?: { pincode: string; city: string; state: string; hostel?: string; coordinates?: [number, number] };
  status?: string;
}

interface ProductCardProps {
  product: Product;
  isOwner?: boolean;
  onDelete?: (id: string, type: 'products' | 'services') => void;
  onToggleStatus?: (id: string, newStatus: string, type: 'products' | 'services') => void;
  hideOwnerActions?: boolean;
}

export default function ProductCard({ 
  product, 
  isOwner = false, 
  onDelete, 
  onToggleStatus,
  hideOwnerActions = false
}: ProductCardProps) {
  const { user, setUser, userLocation } = useAuth();
  
  const isActualOwner = !hideOwnerActions && (isOwner || (user && product.seller && (user.id === product.seller._id || user.id === String(product.seller._id) || user.id === (product.seller as any).id)));

  const [liked, setLiked] = useState(false);
  const router = useRouter();

  // Community tag logic: is this product from one of MY communities?
  const userCommunityIds = (user?.verifiedCommunities || []).map((c: any) => (c._id || c.id || c).toString());
  const communityName = typeof product.community === 'object' ? product.community?.name : undefined;
  let communityId: string | undefined;
  if (product.community) {
    if (typeof product.community === 'object') {
      communityId = product.community._id?.toString();
    } else {
      communityId = product.community.toString();
    }
  }
  const isInternal = communityId ? userCommunityIds.includes(communityId) : false;
  // Robust check: explicitly check visibility first to handle buggy older data
  const isCampusOwned = product.visibility === 'Community' || (!product.visibility && !!communityId);

  let distanceBadge = null;
  // Fallback: use community location if product location doesn't have coordinates (typical for campus listings)
  const coords = product.location?.coordinates || (typeof product.community === 'object' ? product.community?.location?.coordinates : null);
  
  if (userLocation && coords && Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords;
      const d = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
      distanceBadge = (
          <div className="flex items-center gap-1 px-2 py-1 bg-indigo-600/90 dark:bg-indigo-500/95 backdrop-blur-md text-white rounded-lg text-[9px] font-black tracking-tighter shadow-sm border border-white/20">
              <svg className="w-3 h-3 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {formatDistance(d)}
          </div>
      );
  }

  useEffect(() => {
    if (user && user.wishlist) {
        setLiked(user.wishlist.includes(product._id));
    }
  }, [user, product._id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
        router.push('/auth');
        return;
    }
    
    // Optimistic Update
    const isLiked = !liked;
    setLiked(isLiked); 
    
    // Update global user state optimistically
    if (user.wishlist) {
        const newWishlist = isLiked 
            ? [...user.wishlist, product._id]
            : user.wishlist.filter(id => id !== product._id);
            
        setUser({ ...user, wishlist: newWishlist });
    }

    try {
        await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product._id })
        });
    } catch (error) {
        console.error('Wishlist toggle failed', error);
        setLiked(!liked); // Revert local
        // Revert global (optional, but good practice)
    }
  };

  return (
    <div className="group relative flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_25px_rgb(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_20px_45px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden border border-gray-200/50 dark:border-gray-700/50 select-none cursor-pointer hover:-translate-y-1">
      <Link href={`/products/${product._id}`} className="absolute inset-0 z-0">
        <span className="sr-only">View {product.title}</span>
      </Link>

      {/* Image Section - Compacted for mobile */}
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
            ) : (
                distanceBadge
            )}
        </div>
      </div>
      
      <div className="p-2 sm:p-3.5 relative z-10 pointer-events-none flex flex-col flex-1 min-h-[140px] sm:min-h-[200px]">
        <div className="mb-auto">
            <div className="flex items-center gap-2 mb-2">
                <Link href={`/profile/${product.seller._id}`} className="shrink-0 pointer-events-auto">
                    <div className="relative h-4 w-4 sm:h-6 sm:w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] ring-1 ring-white dark:ring-gray-800 overflow-hidden shadow-sm transition-transform hover:scale-110">
                        {product.seller?.profilePicture ? (
                            <Image 
                              src={product.seller.profilePicture} 
                              alt={product.seller.name} 
                              fill
                              sizes="24px"
                              className="object-cover" 
                              referrerPolicy="no-referrer"
                            />
                        ) : (
                            product.seller?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                    </div>
                </Link>
                <Link href={`/profile/${product.seller._id}`} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pointer-events-auto truncate max-w-[120px]">
                    {product.seller?.name}
                </Link>
                <span className="hidden sm:flex ml-auto text-[10px] text-gray-400 font-medium opacity-60 whitespace-nowrap pl-1 truncate">
                    {formatTimeAgo(product.createdAt)}
                </span>
            </div>
            <div className="flex flex-col gap-0.5">
                <h3 className="text-xs sm:text-base font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 leading-none tracking-tight">{product.title}</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight opacity-70 min-h-[2.4em]">
                    {product.description}
                </p>
            </div>
            
            {/* Mobile Only: Rating & Timeago */}
            <div className="flex sm:hidden flex-col min-h-[1.5em] gap-0.5 mt-1">
                <div className="flex items-center gap-1">
                    <div className="flex items-center shrink-0">
                        {[...Array(5)].map((_, i) => {
                            const activeRating = product.forRent ? (product.itemSpecificRating ?? 0) : (product.sellerTrustRating ?? 0);
                            return (
                                <svg key={i} className={`h-3 w-3 ${i < Math.floor(activeRating) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            );
                        })}
                    </div>
                    {(product.forRent ? product.itemSpecificCount : product.sellerTrustCount) ? (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">({product.forRent ? product.itemSpecificCount : product.sellerTrustCount})</span>
                    ) : null}
                    <span className="ml-auto text-[9px] text-gray-400 font-medium opacity-60 whitespace-nowrap pl-1 h-full flex items-center">
                        {formatTimeAgo(product.createdAt)}
                    </span>
                </div>
                <span className="text-[8px] font-bold text-gray-400/80 uppercase tracking-widest leading-none">
                    {product.forRent ? 'Item Rating' : 'Seller Rating'}
                </span>
            </div>
        </div>
        
        <div className="flex flex-col mt-auto shrink-0 pt-2">
            {/* Desktop Only: Rating & Condition */}
            <div className="hidden sm:flex items-end justify-between mb-2">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                        <div className="flex items-center shrink-0">
                            {[...Array(5)].map((_, i) => {
                                const activeRating = product.forRent ? (product.itemSpecificRating ?? 0) : (product.sellerTrustRating ?? 0);
                                return (
                                    <svg key={i} className={`h-3 w-3 ${i < Math.floor(activeRating) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                );
                            })}
                        </div>
                        {(product.forRent ? product.itemSpecificCount : product.sellerTrustCount) ? (
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">({product.forRent ? product.itemSpecificCount : product.sellerTrustCount})</span>
                        ) : null}
                    </div>
                    <span className="text-[9px] font-black text-gray-400/80 uppercase tracking-widest leading-none">
                        {product.forRent ? 'Item Rating' : 'Seller Rating'}
                    </span>
                </div>
                <span className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-gray-700/50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 whitespace-nowrap italic">
                    {product.condition}
                </span>
            </div>
            
            <div className="flex items-end justify-between gap-1 w-full overflow-hidden pt-4 border-t border-gray-50 dark:border-gray-700/50">
                <div className="flex flex-col min-w-0">
                    {product.forSell !== false && product.forRent ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-1">
                             <span className="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter leading-none">₹{product.price}</span>
                             <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-50">Buy</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                             <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 italic tracking-tighter leading-none">₹{product.rentPrice}</span>
                             <span className="text-[8px] font-black text-emerald-600/50 uppercase tracking-tighter italic">/{product.rentUnit}</span>
                        </div>
                      </div>
                    ) : product.forRent ? (
                      <div className="flex items-baseline gap-1">
                         <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 italic tracking-tighter leading-none">₹{product.rentPrice}</span>
                         <span className="text-[9px] font-black text-emerald-600/50 uppercase tracking-tighter italic">/{product.rentUnit}</span>
                      </div>
                    ) : (
                      <span className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter leading-none">₹{product.price}</span>
                    )}
                </div>

                {/* Mobile Only: Condition Label beside price */}
                <div className="sm:hidden mb-1">
                    <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 whitespace-nowrap italic">
                        {product.condition}
                    </span>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between w-full gap-2 border-t border-gray-50 dark:border-gray-800/50 pt-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-50 dark:bg-white/5 text-gray-400 shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate tracking-tight">
                        {isCampusOwned
                            ? [communityName, product.location?.hostel].filter(Boolean).join(', ') || 'Campus'
                            : (product.location ? [product.location.city, product.location.state].filter(Boolean).join(', ') || 'Unknown' : 'Unknown')}
                    </span>
                </div>
            </div>

            {/* Owner actions */}
            {isActualOwner && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2 relative z-20 pointer-events-auto">
                {product.status === 'Rented' ? (
                   <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStatus?.(product._id, 'Available', 'products'); }}
                    className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 sm:px-3 py-2 flex-[2] rounded-xl transition-all border border-emerald-100 hover:bg-emerald-100 active:scale-95 shadow-sm"
                  >
                    Make Available
                  </button>
                ) : (product.status !== 'Sold' && product.status !== 'Completed') ? (
                    <button
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleStatus?.(product._id, product.status === 'Available' ? 'Inactive' : 'Available', 'products');
                      }}
                       className={`text-[8px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest px-1.5 sm:px-3 py-2 flex-[2] rounded-xl transition-all border active:scale-95 shadow-sm ${
                        product.status === 'Available' 
                          ? 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50' 
                          : 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50'
                      }`}
                    >
                      {product.status === 'Available' ? 'Hide Listing' : 'Show Listing'}
                    </button>
                ) : null}
                {(product.status !== 'Sold' && product.status !== 'Completed') && (
                   <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(product._id, 'products'); }}
                    className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-1.5 sm:px-3 py-2 flex-1 rounded-xl transition-all border border-rose-100 hover:bg-rose-100 active:scale-95"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
