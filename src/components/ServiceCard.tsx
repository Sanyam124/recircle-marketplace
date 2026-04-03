'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-client';
import { formatTimeAgo } from '@/lib/utils';

interface ServiceCardProps {
  service: any;
  onRefresh?: () => void;
  onDelete?: (id: string, type: 'services') => void;
  onToggleStatus?: (id: string, status: string, type: 'services') => void;
  hideOwnerActions?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  onRefresh, 
  onDelete, 
  onToggleStatus,
  hideOwnerActions = false
}) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Use the same ownership logic as ProductCard
  const sellerId = typeof service.provider === 'object' ? service.provider._id : service.provider;
  const isActualOwner = !hideOwnerActions && user && user.id === sellerId;

  const isCampusOwned = service.communityFilter !== 'All';
  const communityName = service.communityName;

  useEffect(() => {
    if (user && service.wishlistedBy) {
      setLiked(service.wishlistedBy.includes(user.id));
    }
  }, [user, service.wishlistedBy]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isLiking) return;

    setIsLiking(true);
    setLiked(!liked);

    try {
      await axios.post(`/api/services/${service._id}/wishlist`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Wishlist toggle failed', error);
      setLiked(!liked);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="group relative flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_25px_rgb(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_20px_45px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden border border-gray-200/50 dark:border-gray-700/50 select-none cursor-pointer hover:-translate-y-1">
      <Link href={`/services/${service._id}`} className="absolute inset-0 z-0">
        <span className="sr-only">View {service.title}</span>
      </Link>

      {/* Image Section - Compacted for mobile */}
      <div className="relative h-28 sm:h-48 w-full overflow-hidden bg-gray-50 dark:bg-gray-900 border-b border-gray-100/50 dark:border-gray-800/50">
        {service.status === 'Inactive' && (
            <div className="absolute inset-0 z-10 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-500">
                <div className="bg-gray-500 text-white px-5 py-2 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-2xl border-2 border-white/20 transform -rotate-6 scale-110">
                    Inactive
                </div>
            </div>
        )}
        {service.images && service.images.length > 0 ? (
          <Image
            src={optimizeCloudinaryUrl(service.images[0], { width: 600, height: 400 })}
            alt={service.title}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className={`object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out ${service.status === 'Inactive' ? 'grayscale-[0.5] opacity-60' : ''}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-indigo-400/30 dark:text-indigo-500/20 bg-gray-50 dark:bg-gray-900">
            <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5 z-20">
            <div className="hidden sm:flex bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider text-gray-900 dark:text-white pointer-events-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 border border-white/20">
                {service.category}
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
      </div>
      
      <div className="p-2 sm:p-3.5 relative z-10 pointer-events-none flex flex-col flex-1 min-h-[140px] sm:min-h-[200px]">
        <div className="mb-auto">
            <div className="flex items-center gap-2 mb-2">
                <Link href={`/profile/${service.provider?._id || ''}`} className="shrink-0 pointer-events-auto">
                    <div className="relative h-4 w-4 sm:h-6 sm:w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] ring-1 ring-white dark:ring-gray-800 overflow-hidden shadow-sm transition-transform hover:scale-110">
                        {service.provider?.profilePicture ? (
                            <Image 
                              src={service.provider.profilePicture} 
                              alt={service.provider.name} 
                              fill
                              sizes="24px"
                              className="object-cover" 
                              referrerPolicy="no-referrer"
                            />
                        ) : (
                            service.provider?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                    </div>
                </Link>
                <Link href={`/profile/${service.provider?._id || ''}`} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pointer-events-auto truncate max-w-[120px]">
                    {service.provider?.name}
                </Link>
                <span className="hidden sm:flex ml-auto text-[9px] text-gray-400 font-bold uppercase tracking-widest opacity-60 whitespace-nowrap pl-1 truncate">
                    {formatTimeAgo(service.createdAt)}
                </span>
            </div>
            
            {/* Title - Synced weight with ProductCard */}
            <div className="flex flex-col gap-0.5">
                <h3 className="text-[10px] sm:text-[15px] font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 leading-none tracking-tight">{service.title}</h3>
                <p className="text-[9px] sm:text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight opacity-70 min-h-[2.4em]">
                    {service.description}
                </p>
            </div>
            
            {/* Mobile Only: Rating & Timeago */}
            <div className="flex sm:hidden items-center gap-1 min-h-[1.5em]">
                <div className="flex items-center shrink-0">
                    {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`h-3 w-3 ${i < Math.floor(service.ownerRating || service.providerRating || 0) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    ))}
                </div>
                {service.reviewCount ? (
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">({service.reviewCount})</span>
                ) : null}
                <span className="ml-auto text-[8px] text-gray-400 font-bold uppercase tracking-widest opacity-60 whitespace-nowrap pl-1 truncate">
                    {formatTimeAgo(service.createdAt)}
                </span>
            </div>
        </div>
        
        <div className="flex flex-col mt-auto shrink-0 pt-2">
            {/* Desktop Only: Rating & Availability */}
            <div className="hidden sm:flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                    <div className="flex items-center shrink-0">
                        {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`h-3 w-3 ${i < Math.floor(service.ownerRating || service.providerRating || 0) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        ))}
                    </div>
                    {service.reviewCount ? (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">({service.reviewCount})</span>
                    ) : null}
                </div>
                {service.availability && (
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800 italic">
                        {service.availability.split(' ')[0]}
                    </span>
                )}
            </div>
          <div className="flex items-end justify-between gap-1 w-full overflow-hidden pt-4 border-t border-gray-50 dark:border-gray-700/50">
           <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 italic tracking-tighter leading-none">₹{service.price}</span>
                    <span className="text-[9px] font-black text-indigo-600/50 uppercase tracking-tighter italic">/{service.priceUnit?.split(' ')[0] || 'hr'}</span>
                </div>
           </div>
          </div>

        {/* Action tags footer - Synced structure with ProductCard */}
        <div className="mt-3 flex flex-col gap-2 overflow-hidden w-full">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
                {isCampusOwned ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50 text-[9px] font-black uppercase tracking-tighter">
                        Campus-Only
                    </div>
                ) : (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-md border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-tighter">
                        Public List
                    </div>
                )}
                
                {/* Availability label mobile only beside campus/public tag */}
                {service.availability && (
                    <div className="sm:hidden">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800 italic">
                            {service.availability.split(' ')[0]}
                        </span>
                    </div>
                )}
            </div>
            
            {/* Desktop Location Name */}
            <div className="hidden sm:block ml-auto text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-600 italic truncate min-w-0 flex-1 text-right">
                {isCampusOwned ? (communityName || 'Campus') : (service.location?.city || 'Public')}
            </div>
          </div>
          
          {/* Mobile Location Name (Below tags) */}
          <div className="sm:hidden text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 italic truncate w-full opacity-60">
                {isCampusOwned ? (communityName || 'Campus') : (service.location?.city || 'Public')}
          </div>
        </div>

        {/* Owner actions */}
        {isActualOwner && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2 relative z-20 pointer-events-auto">
            <button
              onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleStatus?.(service._id, service.status === 'Active' ? 'Inactive' : 'Active', 'services');
              }}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 flex-[2] rounded-xl transition-all border active:scale-95 shadow-sm ${
                service.status === 'Active' 
                  ? 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50' 
                  : 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50'
              }`}
            >
              {service.status === 'Active' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(service._id, 'services'); }}
              className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 flex-1 rounded-xl transition-all border border-rose-100 hover:bg-rose-100 active:scale-95"
            >
              Delete
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
