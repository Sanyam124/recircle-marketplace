'use client';

import { useState, useEffect, use } from 'react';
import { formatTimeAgo } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DetailSkeleton } from '@/components/Skeletons';
import ImageCarousel from '@/components/ImageCarousel';
import ShareButton from '@/components/ShareButton';
import ReportModal from '@/components/ReportModal';
import ReviewSection from '@/components/ReviewSection';
import ExpandableText from '@/components/ExpandableText';
import Image from 'next/image';
import { confirmAction } from '@/lib/confirm';

interface Service {
  _id: string;
  title: string;
  description: string;
  price: number;
  priceUnit: string;
  images: string[];
  category: string;
  availability: string;
  location?: {
    city?: string;
    state?: string;
  };
  community?: {
    _id: string;
    name: string;
  };
  provider: {
    _id: string;
    name: string;
    username?: string;
    email: string;
    profilePicture?: string;
  };
  averageRating?: number;
  reviewCount?: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { user, setUser, refreshUser } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (user && user.wishlistedServices && service) {
        setLiked(user.wishlistedServices.includes(service._id));
    }
  }, [user, service]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push('/auth'); return; }
    if (!service) return;

    const isLiked = !liked;
    setLiked(isLiked); 
    
    if (user.wishlistedServices) {
        const newWishlist = isLiked 
            ? [...user.wishlistedServices, service._id]
            : user.wishlistedServices.filter(item => item !== service._id);
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
        setLiked(!liked);
    }
  };

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      const res = await fetch(`/api/services/${id}`);
      if (res.ok) {
        const data = await res.json();
        setService(data.service);
      } else if (res.status === 403) {
        setIsBlocked(true);
      }
    } catch (error) {
      console.error('Failed to fetch service', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!service || !user) return;
    setUnblocking(true);
    try {
      const res = await fetch(`/api/user/block?userId=${service.provider._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to unblock user', error);
    } finally {
      setUnblocking(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: 'Delete Service?',
      text: 'Are you sure you want to delete this service? This action cannot be undone.',
      dangerMode: true,
      confirmButtonText: 'Delete Service'
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/explore');
      }
    } catch (error) {
      console.error('Failed to delete service', error);
      setIsDeleting(false);
    }
  };

  const isBlockedByMe = user?.blockedUsers?.some((id: any) => id.toString() === service?.provider._id.toString());
  const isOwner = user?.id === service?.provider._id;

  if (loading) return <DetailSkeleton />;
  
  if (isBlocked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-12 border-2 border-red-100 dark:border-red-900/30 shadow-xl text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">You are blocked from viewing this service.</p>
          <button onClick={() => router.back()} className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg active:scale-95">Go Back</button>
        </div>
      </div>
    );
  }

  if (!service) return <div className="text-center py-20">Service not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-300 overflow-x-hidden">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
        {/* Left Column: Image Carousel */}
        <div className="w-full max-w-2xl mx-auto lg:max-w-none mb-10 lg:mb-0">
          <div className="relative group rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <ImageCarousel images={service.images || []} alt={service.title} />
          </div>
        </div>

        {/* Right Column: Information */}
        <div className="flex flex-col gap-8">
          {/* Header & Meta */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-md">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{service.category}</span>
                 </div>
                 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                   service.status === 'Active' 
                     ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800/50' 
                     : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50'
                 }`}>
                   <span className={`w-1.5 h-1.5 rounded-full ${service.status === 'Active' ? 'bg-green-500' : 'bg-rose-500 animate-pulse'}`} />
                   {service.status === 'Active' ? 'Available' : 'Inactive'}
                 </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 w-full min-w-0">
                <h1 className="flex-1 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight break-all max-w-full leading-tight min-w-0">
                  {service.title}
                </h1>
                
                <div className="flex gap-2 shrink-0">
                  <ShareButton
                    title={service.title}
                    className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  />
                  {user && !isOwner && (
                    <button
                      onClick={() => setReportOpen(true)}
                      className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold text-xs"
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="grid grid-cols-1 gap-4 mt-2">
                <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 flex flex-col items-start transition-all w-full">
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-800/70 dark:text-indigo-400 mb-1 block">Service Rate</span>
                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="text-3xl font-black text-indigo-900 dark:text-indigo-300">₹{service.price?.toLocaleString()}</span>
                    <span className="text-sm font-bold text-indigo-700/60 ml-1 block">/ {service.priceUnit}</span>
                  </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-1">
               <span className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Posted {formatTimeAgo(service.createdAt)}
               </span>
               <span className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                  {service.location?.city || 'Location unavailable'}
               </span>
            </div>
          </div>

          {/* Provider Card - Synced with Product Seller view */}
          <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
             <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-5 border-b border-gray-100 dark:border-gray-800 pb-5">
                <Link href={`/profile/${service.provider._id}`} className="relative h-16 w-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0 group">
                   {service.provider.profilePicture ? (
                     <Image src={service.provider.profilePicture} alt={service.provider.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                   ) : (
                     <div className="h-full w-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xl">{service.provider.name?.charAt(0)}</div>
                   )}
                </Link>
                <div className="text-center sm:text-left flex-1 min-w-0 flex flex-col justify-center">
                   <Link href={`/profile/${service.provider._id}`} className="text-xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{service.provider.name}</Link>
                   <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Provider • {service.reviewCount || 0} reviews</p>
                   {service.averageRating && service.averageRating > 0 ? (
                     <div className="flex items-center justify-center sm:justify-start gap-1 mt-2">
                        <span className="text-yellow-400 text-sm">★</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{service.averageRating}</span>
                     </div>
                   ) : null}
                </div>
                {service.community && (
                   <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-gray-500 uppercase mb-0.5 tracking-wide">Campus</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-300 whitespace-nowrap">{service.community.name}</span>
                   </div>
                )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-transparent dark:border-gray-800">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Category</span>
                   <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize block truncate">{service.category}</span>
                </div>
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">
                   <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 block">Availability</span>
                   <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 capitalize block truncate">{service.availability}</span>
                </div>
             </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">Description</h3>
            <div className="text-base text-gray-600 dark:text-gray-300 leading-relaxed font-normal pt-1">
              <ExpandableText text={service.description} maxLines={8} className="whitespace-pre-wrap" showReadMore={true} />
            </div>
          </div>

          {/* Action Hub */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm transition-all focus-within:ring-4 focus-within:ring-indigo-100">
             <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Need this service?</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Message the provider to coordinate an appointment and clarify details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                   {user && isOwner ? (
                      <button onClick={handleDelete} disabled={isDeleting} className="col-span-full w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl font-bold tracking-wide transition-all disabled:opacity-50">
                        {isDeleting ? 'Deleting...' : 'Delete Service'}
                      </button>
                   ) : isBlockedByMe ? (
                      <button onClick={handleUnblock} disabled={unblocking} className="col-span-full w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold tracking-wide transition-all">
                        {unblocking ? 'Unblocking...' : 'Unblock User'}
                      </button>
                   ) : (
                      <>
                        <button
                          onClick={() => { if (!user) router.push('/auth'); else router.push(`/chat/${service.provider._id}?serviceId=${service._id}`); }}
                          disabled={service.status !== 'Active'}
                          className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all ${
                            service.status !== 'Active' ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95'
                          }`}
                        >
                          {service.status !== 'Active' ? 'Unavailable' : 'Chat with Provider'}
                        </button>
                        <button
                          onClick={() => { if (!user) router.push('/auth'); else router.push(`/chat/${service.provider._id}?serviceId=${service._id}&tab=action&autoMsg=true`); }}
                          disabled={service.status !== 'Active'}
                          className={`w-full py-4 border-2 rounded-xl font-bold text-sm tracking-wide transition-all ${
                            service.status !== 'Active' ? 'border-gray-200 text-gray-400 dark:border-gray-800 dark:text-gray-600' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:scale-95'
                          }`}
                        >
                          Request Appointment
                        </button>
                      </>
                   )}
                </div>

                {!isOwner && service.status === 'Active' && user && (
                   <button
                     onClick={toggleWishlist}
                     className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all border ${liked ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:border-rose-900/50' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 active:scale-95'}`}
                   >
                     {liked ? 'Added to Wishlist' : 'Add to Wishlist'}
                   </button>
                )}
             </div>
          </div>

          <div className="mt-8" id="reviews-section">
             <ReviewSection 
                targetId={service.provider._id} 
                targetName={service.provider.name} 
                serviceId={service._id} 
              />
          </div>

          {reportOpen && (
            <ReportModal targetUserId={service.provider._id} itemType="service" itemId={service._id} onClose={() => setReportOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
