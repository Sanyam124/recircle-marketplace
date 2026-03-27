'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ExpandableText from './ExpandableText';

import { formatTimeAgo } from '@/lib/utils';

interface Product {
  _id: string;
  title: string;
  price: number;
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
  ownerRating?: number;
  reviewCount?: number;
  visibility?: 'Public' | 'Community';
  community?: { _id: string; name: string } | string | any;
  location?: { pincode: string; city: string; state: string };
}

export default function ProductCard({ product }: { product: Product }) {
  const { user, setUser } = useAuth();
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
    <div className="group relative block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 select-none cursor-pointer">
      <Link href={`/products/${product._id}`} className="absolute inset-0 z-0">
        <span className="sr-only">View {product.title}</span>
      </Link>

      {/* Image Section */}
      <div className="relative h-56 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
            No Image
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 pointer-events-none">
                {product.category}
            </div>
            <button 
                onClick={toggleWishlist}
                className={`p-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-colors z-20 ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            >
                <svg className="w-5 h-5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </button>
        </div>
      </div>
      
      <div className="p-4 relative z-10 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="w-full min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 min-h-[1.6em]">{product.title}</h3>
            <div className="mt-1 flex items-start justify-between text-sm text-gray-500 dark:text-gray-400 gap-2">
              <div className="flex-1 min-w-0">
                <ExpandableText 
                  text={product.description || ''} 
                  maxLines={2} 
                  className="text-[11px] leading-normal min-h-[3em]" 
                  showReadMore={false} 
                />
              </div>
              
              <div className="flex items-center shrink-0">
                 <svg className="h-4 w-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                 </svg>
                 <span className="font-semibold text-gray-900 dark:text-white">
                    {product.ownerRating ? (typeof product.ownerRating === 'number' ? product.ownerRating.toFixed(1) : product.ownerRating) : 'New'}
                 </span>
                 {product.reviewCount ? (
                    <span className="ml-1 text-gray-500 dark:text-gray-400">({product.reviewCount})</span>
                 ) : null}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
           <div className="flex flex-col">
               <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{product.price}</span>
               <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{formatTimeAgo(product.createdAt)}</span>
           </div>
           <span className="inline-flex items-center rounded-full bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-600">
             {product.condition}
           </span>
        </div>

        {/* Origin Metadata Footer */}
        {(communityName || product.location?.city) && (
          <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-[10px] sm:text-[11px] font-semibold transition-colors">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              {isInternal ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg ring-1 ring-inset ring-emerald-500/10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  <span className="uppercase tracking-tight">Campus Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg ring-1 ring-inset ring-gray-400/10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="uppercase tracking-tight">Public Presence</span>
                </div>
              )}
            </div>
            
            <span className="text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
              {isInternal ? communityName : (product.location?.city ? `${product.location.city}, ${product.location.state}` : (communityName || 'Across Campus'))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
