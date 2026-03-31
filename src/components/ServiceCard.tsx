'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { formatTimeAgo } from '@/lib/utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-client';
import ExpandableText from './ExpandableText';

interface Service {
  _id: string;
  title: string;
  price: number;
  priceUnit: string;
  category: string;
  images: string[];
  description: string;
  createdAt?: string | Date;
  provider: {
    _id?: string;
    name: string;
    profilePicture?: string;
  };
  ownerRating?: number;
  providerRating?: number;
  reviewCount?: number;
  visibility?: 'Public' | 'Community';
  community?: { _id: string; name: string } | string | any;
  status?: string;
  availability?: string;
  location?: { pincode: string; city: string; state: string };
}

interface ServiceCardProps {
  service: Service;
  isOwner?: boolean;
  onDelete?: (id: string, type: 'products' | 'services') => void;
  onToggleStatus?: (id: string, newStatus: string, type: 'products' | 'services') => void;
}

export default function ServiceCard({ 
  service, 
  isOwner = false, 
  onDelete, 
  onToggleStatus 
}: ServiceCardProps) {
  const { user, setUser } = useAuth();
  const [liked, setLiked] = useState(false);
  const router = useRouter();

  // Community tag logic
  const userCommunityIds = (user?.verifiedCommunities || []).map((c: any) => (c._id || c.id || c).toString());
  const communityName = typeof service.community === 'object' ? service.community?.name : undefined;
  let communityId: string | undefined;
  if (service.community) {
    if (typeof service.community === 'object') {
      communityId = service.community._id?.toString();
    } else {
      communityId = service.community.toString();
    }
  }
  const isInternal = communityId ? userCommunityIds.includes(communityId) : false;

  useEffect(() => {
    if (user && user.wishlistedServices && service._id) {
        setLiked(user.wishlistedServices.includes(service._id));
    }
  }, [user, service._id]);

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
    if (user.wishlistedServices) {
        const newWishlist = isLiked 
            ? [...user.wishlistedServices, service._id]
            : user.wishlistedServices.filter(id => id !== service._id);
            
        setUser({ ...user, wishlistedServices: newWishlist });
    }

    try {
        await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceId: service._id })
        });
    } catch (error) {
        console.error('Wishlist toggle failed', error);
        setLiked(!liked); // Revert local
    }
  };

  return (
    <div className="group relative block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 select-none cursor-pointer">
      <Link href={`/services/${service._id}`} className="absolute inset-0 z-0">
        <span className="sr-only">View {service.title}</span>
      </Link>

      <div className="relative h-40 sm:h-56 w-full block overflow-hidden bg-gray-200 dark:bg-gray-700">
        {service.images && service.images.length > 0 ? (
          <Image
            src={optimizeCloudinaryUrl(service.images[0], { width: 600, height: 400 })}
            alt={service.title}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            referrerPolicy="no-referrer"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400 dark:text-indigo-500">
            <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex gap-1.5">
            <div className="hidden sm:block bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium text-gray-700 dark:text-gray-300 pointer-events-none">
              {service.category}
            </div>
            <button 
                onClick={toggleWishlist}
                className={`p-1 sm:p-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-colors z-20 ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </button>
        </div>
      </div>
      <div className="p-2 sm:p-4 relative z-10 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="w-full min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
                <Link href={`/profile/${service.provider._id || ''}`} className="shrink-0 pointer-events-auto">
                    <div className="h-4 w-4 sm:h-6 sm:w-6 rounded-full bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[8px] sm:text-[10px] ring-1 ring-indigo-200 dark:ring-indigo-800 overflow-hidden shadow-sm">
                        {service.provider?.profilePicture ? (
                            <Image 
                              src={service.provider.profilePicture} 
                              alt={service.provider.name} 
                              width={24} 
                              height={24} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                        ) : (
                            service.provider?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                    </div>
                </Link>
                <Link href={`/profile/${service.provider._id || ''}`} className="text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pointer-events-auto truncate max-w-[80px] sm:max-w-[120px]">
                    {service.provider?.name}
                </Link>
            </div>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 min-h-[1.4em]">{service.title}</h3>
            <div className="mt-0.5 sm:mt-1 flex items-start justify-between text-sm text-gray-500 dark:text-gray-400 gap-2">
              <div className="flex-1 min-w-0">
                <ExpandableText 
                  text={service.description || ''} 
                  maxLines={1} 
                  className="text-[10px] sm:text-[11px] leading-tight sm:leading-normal min-h-[1.2em] sm:min-h-[3em]" 
                  showReadMore={false} 
                />
              </div>
              <div className="flex items-center shrink-0">
                 <svg className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-0.5 sm:mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                 </svg>
                 <span className="font-bold text-[10px] sm:text-sm text-gray-900 dark:text-gray-100">
                    {service.ownerRating ? (typeof service.ownerRating === 'number' ? service.ownerRating.toFixed(1) : service.ownerRating) : (service.providerRating ? service.providerRating.toFixed(1) : 'New')}
                 </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{service.price}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">/ {service.priceUnit.split(' ')[0]}</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-medium">{formatTimeAgo(service.createdAt)}</span>
          </div>
          {service.availability && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[10px] font-bold text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
              {service.availability.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Origin Metadata Footer */}
        {(communityName || service.location?.city) && (
          <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between text-[8px] sm:text-[11px] font-semibold transition-colors">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              {isInternal ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg ring-1 ring-inset ring-emerald-500/10">
                  <span className="uppercase tracking-tight">Campus</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg ring-1 ring-inset ring-gray-400/10">
                  <span className="uppercase tracking-tight">Public</span>
                </div>
              )}
            </div>
            
            <span className="text-gray-400 dark:text-gray-500 truncate max-w-[60px] sm:max-w-[120px]">
              {isInternal ? communityName : (service.location?.city ? service.location.city : (communityName || 'Campus'))}
            </span>
          </div>
        )}
        {/* Owner action bar */}
        {isOwner && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2 relative z-20 pointer-events-auto">
            <button
              onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const currentStatus = service.status || 'Active';
                  const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
                  onToggleStatus?.(service._id, nextStatus, 'services');
              }}
              className={`text-xs font-bold px-3 py-1.5 flex-1 rounded-lg transition-colors ${
                service.status === 'Active'
                  ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-orange-500' 
                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:text-emerald-700'
              }`}
            >
              {service.status === 'Active' ? 'Mark Inactive' : 'Mark Active'}
            </button>
            <button
              onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete?.(service._id, 'services');
              }}
              className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
