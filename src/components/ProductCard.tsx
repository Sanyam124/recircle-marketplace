'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { calculateDistance, formatDistance } from '@/lib/utils';
import { ProductCardImage, ProductCardHeader, ProductCardPricing, ProductCardRating } from './marketplace/ProductCardComponents';

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
  visibility?: 'Public' | 'Community';
  community?: { _id: string; name: string } | string | any;
  location?: { pincode: string; city: string; state: string; hostel?: string; coordinates?: [number, number] };
  status?: string;
}

interface ProductCardProps {
  product: Product;
  isOwner?: boolean;
  priority?: boolean;
  onDelete?: (id: string, type: 'products' | 'services') => void;
  onToggleStatus?: (id: string, newStatus: string, type: 'products' | 'services') => void;
  hideOwnerActions?: boolean;
}

export default function ProductCard({ 
  product, 
  isOwner = false, 
  priority = false,
  onDelete, 
  onToggleStatus,
  hideOwnerActions = false
}: ProductCardProps) {
  const { user, setUser, userLocation } = useAuth();
  const [liked, setLiked] = useState(false);
  const router = useRouter();

  const sellerId = typeof product.seller === 'object' ? (product.seller._id || (product.seller as any).id) : product.seller;
  const isActualOwner = !hideOwnerActions && (isOwner || (user && (user.id === String(sellerId) || (user as any)._id === String(sellerId))));

  useEffect(() => {
    if (user && user.wishlist) {
        setLiked(user.wishlist.includes(product._id));
    }
  }, [user, product._id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/auth'); return; }
    const isLiked = !liked;
    setLiked(isLiked); 
    if (user.wishlist) {
        const newWishlist = isLiked ? [...user.wishlist, product._id] : user.wishlist.filter(id => id !== product._id);
        setUser({ ...user, wishlist: newWishlist });
    }
    try {
        await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product._id })
        });
    } catch (error) {
        setLiked(!liked);
    }
  };

  const userCommunityIds = (user?.verifiedCommunities || []).map((c: any) => (c._id || c.id || c).toString());
  const communityName = typeof product.community === 'object' ? product.community?.name : undefined;
  const communityId = typeof product.community === 'object' ? product.community?._id?.toString() : product.community?.toString();
  const isInternal = communityId ? userCommunityIds.includes(communityId) : false;
  const isCampusOwned = product.visibility === 'Community' || (!product.visibility && !!communityId);

  let distanceBadge = null;
  const coords = product.location?.coordinates || (typeof product.community === 'object' ? product.community?.location?.coordinates : null);
  if (userLocation && coords && Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords;
      const d = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
      distanceBadge = (
          <div className="flex items-center gap-1 px-2 py-1 bg-indigo-600/90 dark:bg-indigo-500/95 backdrop-blur-md text-white rounded-lg text-[9px] font-black tracking-tighter shadow-sm border border-white/20">
              <svg className="w-3 h-3 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {formatDistance(d)}
          </div>
      );
  }

  return (
    <div className="group relative flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_25px_rgb(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_20px_45px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden border border-gray-200/50 dark:border-gray-700/50 select-none cursor-pointer hover:-translate-y-1">
      <Link href={`/products/${product._id}`} className="absolute inset-0 z-0"><span className="sr-only">View {product.title}</span></Link>
      
      <ProductCardImage product={product} liked={liked} toggleWishlist={toggleWishlist} distanceBadge={distanceBadge} isCampusOwned={isCampusOwned} priority={priority} />
      
      <div className="p-2 sm:p-3.5 relative z-10 pointer-events-none flex flex-col flex-1 min-h-[140px] sm:min-h-[200px]">
        <div className="mb-auto">
            <ProductCardHeader product={product} />
            <div className="flex flex-col gap-0.5">
                <h3 className="text-xs sm:text-base font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 leading-none tracking-tight">{product.title}</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight opacity-70 min-h-[2.4em]">{product.description}</p>
            </div>
            <div className="flex sm:hidden flex-col min-h-[1.5em] gap-0.5 mt-1">
                <ProductCardRating product={product} />
            </div>
        </div>
        
        <div className="flex flex-col mt-auto shrink-0 pt-2">
            <div className="hidden sm:flex items-end justify-between mb-1">
                <ProductCardRating product={product} />
                <span className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-gray-700/50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 whitespace-nowrap italic">{product.condition}</span>
            </div>
            <div className="flex items-end justify-between gap-1 w-full overflow-hidden pt-3 border-t border-gray-50 dark:border-gray-700/50">
                <ProductCardPricing product={product} />
                <div className="sm:hidden mb-1">
                    <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 whitespace-nowrap italic">{product.condition}</span>
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between w-full gap-2 border-t border-gray-50 dark:border-gray-800/50 pt-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-50 dark:bg-white/5 text-gray-400 shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate tracking-tight">
                        {isCampusOwned ? [communityName, product.location?.hostel].filter(Boolean).join(', ') || 'Campus' : (product.location ? [product.location.city, product.location.state].filter(Boolean).join(', ') : 'Unknown')}
                    </span>
                </div>
            </div>

            {isActualOwner && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2 relative z-20 pointer-events-auto">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStatus?.(product._id, product.status === 'Available' ? 'Inactive' : 'Available', 'products'); }} className="text-[8px] sm:text-[10px] font-black uppercase px-1.5 sm:px-3 py-2 flex-[2] rounded-xl transition-all border active:scale-95 shadow-sm text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100">
                  {product.status === 'Available' ? 'Hide' : 'Show'}
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(product._id, 'products'); }} className="text-[8px] sm:text-[10px] font-black uppercase px-1.5 sm:px-3 py-2 flex-1 rounded-xl transition-all border text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100">Delete</button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
