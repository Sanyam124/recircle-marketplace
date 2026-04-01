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

    if (!user) {
        router.push('/auth');
        return;
    }
    
    if (!service) return;

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
      } else {
        // Handle 404
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
        router.push('/services');
      }
    } catch (error) {
      console.error('Failed to delete service', error);
      setIsDeleting(false);
    }
  };

  const isBlockedByMe = user?.blockedUsers?.some((id: any) => id.toString() === service?.provider._id.toString());

  if (loading) return <DetailSkeleton />;
  
  if (isBlocked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-12 border-2 border-red-100 dark:border-red-900/30 shadow-xl">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
            You are blocked from viewing this service, or the user has restricted access.
          </p>
          <button 
            onClick={() => router.back()}
            className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!service) return <div className="text-center py-20">Service not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-colors duration-300">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
        {/* Image Carousel */}
        <div>
          <ImageCarousel images={service.images || []} alt={service.title} />
        </div>

        {/* Service Info */}
        <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl break-words">{service.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ShareButton
                title={service.title}
                text={`Check out "${service.title}" on ReCircle — ₹${service.price} ${service.priceUnit}`}
                className="px-3 py-1.5 text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              />
              {user && user.id !== service.provider._id && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="px-3 py-1.5 text-sm font-semibold border border-red-200 dark:border-red-900 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Report
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Posted {formatTimeAgo(service.createdAt)}</p>
          <div className="mt-3">
            <h2 className="sr-only">Service information</h2>
            <p className="text-3xl text-gray-900 dark:text-white">₹{service.price} <span className="text-lg text-gray-500 dark:text-gray-400 font-normal">/ {service.priceUnit}</span></p>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
              {service.category}
            </div>
            {service.availability && (
               <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                 {service.availability}
               </div>
            )}
            {service.community && typeof service.community === 'object' && (
              <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                🏫 {service.community.name}
              </div>
            )}
            {(service.location?.city || service.location?.state) && (
              <div className="inline-flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {service.location.city}{service.location.city && service.location.state ? ', ' : ''}{service.location.state}
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Provider Information</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-wider">
                    Direct Coordination
                </span>
            </div>
            <Link href={`/profile/${service.provider._id}`} className="mt-4 flex items-center group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:shadow-md transition-all">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 border border-gray-100 dark:border-gray-700 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden group-hover:scale-105 transition-transform uppercase">
                   {service.provider.profilePicture ? (
                     <Image 
                        src={service.provider.profilePicture} 
                        alt={service.provider.name} 
                        width={40} 
                        height={40} 
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                   ) : (
                     service.provider.name.charAt(0)
                   )}
                </div>
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{service.provider.name}</div>
                <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">@{ service.provider.username || service.provider._id?.toString().slice(-4) }</div>
                
                {/* Average Rating & Review Count */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center mt-1 group/rating"
                >
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`h-3 w-3 ${ (service.averageRating || 0) >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600' }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">
                    {service.averageRating || '0'} ({service.reviewCount || 0} reviews)
                  </span>
                </button>
              </div>
              <div className="ml-auto">
                <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Description</h3>
            <div className="mt-3">
              <ExpandableText 
                text={service.description} 
                maxLines={5} 
                incrementalLines={20}
                isHtml={false}
                showReadMore={true}
                className="text-base text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>
          
          <div className="mt-10 flex gap-4 flex-col sm:flex-row">
            {user && user.id === service.provider._id ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex-1 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-red-700 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-red-500 transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/30'}`}
              >
                {isDeleting ? 'Deleting...' : 'Delete Service'}
              </button>
            ) : (
                  <div className="w-full bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Things to Know</h3>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Direct Coordination</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Coordinate the appointment time and location directly with the provider via chat.
                                Communication is key! Always clarify terms before the service begins.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Payment Disclosure</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Payment should be handled directly between you and the provider. No platform fees are collected by ReCircle.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mb-2">
                       {user && isBlockedByMe ? (
                            <button
                                type="button"
                                onClick={handleUnblock}
                                disabled={unblocking}
                                className="w-full bg-red-600 text-white rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-red-700 shadow-md shadow-red-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                            >
                                {unblocking ? 'Unblocking...' : 'Unblock User to Interact'}
                            </button>
                       ) : (
                           <>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!user) {
                                        router.push('/auth');
                                        return;
                                    }
                                    router.push(`/chat/${service.provider._id}?serviceId=${service._id}`);
                                }}
                                className="flex-1 bg-indigo-600 text-white rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                            >
                                Chat with Provider
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!user) {
                                        router.push('/auth');
                                        return;
                                    }
                                    router.push(`/chat/${service.provider._id}?serviceId=${service._id}&tab=action&autoMsg=true`);
                                }}
                                className="flex-1 bg-white dark:bg-gray-800 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all active:scale-95"
                            >
                                Request Appointment
                            </button>
                           </>
                       )}
                    </div>

                    {!isBlockedByMe && (
                        <div className="flex flex-col sm:flex-row gap-3">
                        {service.status === 'Active' && user && user.id !== service.provider._id && (
                            <button
                            type="button"
                            onClick={toggleWishlist}
                            className={`flex-1 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold transition-all active:scale-95 ${liked ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50' : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                            {liked ? 'Remove from Wishlist' : 'Add to Wishlist'}
                            </button>
                        )}
                        </div>
                    )}
                </div>
            )}
          </div>

          <div className="mt-12" id="reviews-section">
            <ReviewSection targetId={service.provider._id} targetName={service.provider.name} />
          </div>

          {reportOpen && (
            <ReportModal targetUserId={service.provider._id} itemType="service" itemId={service._id} onClose={() => setReportOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
