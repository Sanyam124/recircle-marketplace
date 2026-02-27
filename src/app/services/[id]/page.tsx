'use client';

import { useState, useEffect, use } from 'react';
import { formatTimeAgo } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import ImageCarousel from '@/components/ImageCarousel';
import ShareButton from '@/components/ShareButton';
import ReportModal from '@/components/ReportModal';
import ReviewSection from '@/components/ReviewSection';
import RequestAppointmentModal from '@/components/RequestAppointmentModal';

interface Service {
  _id: string;
  title: string;
  description: string;
  price: number;
  priceUnit: string;
  images: string[];
  category: string;
  availability: string;
  provider: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const { user, setUser } = useAuth();
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
        router.push('/login');
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
      } else {
        // Handle 404
      }
    } catch (error) {
      console.error('Failed to fetch service', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/services');
      }
    } catch (error) {
      console.error('Failed to delete service', error);
    }
  };

  if (loading) return <Loader />;
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
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{service.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
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

          <div className="mt-3">
            <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
              {service.category}
            </div>
            {service.availability && (
               <div className="ml-4 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                 {service.availability}
               </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="sr-only">Description</h3>
            <div className="text-base text-gray-700 dark:text-gray-300 space-y-6" dangerouslySetInnerHTML={{ __html: service.description.replace(/\n/g, '<br/>') }} />
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
                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold border border-indigo-700 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                  {service.provider.name.charAt(0)}
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{service.provider.name}</div>
                <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">@{ (service.provider as any).username || (service.provider as any)._id?.toString().slice(-4) }</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Member since {new Date(service.createdAt).getFullYear()}</div>
              </div>
              <div className="ml-auto">
                <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          </div>

          <div className="mt-10 flex gap-4 flex-col sm:flex-row">
            {user && user.id === service.provider._id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-red-500 transition-colors"
              >
                Delete Service
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
                       <button
                           type="button"
                           onClick={() => {
                               if (!user) {
                                   router.push('/login');
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
                                   router.push('/login');
                                   return;
                               }
                               router.push(`/chat/${service.provider._id}?serviceId=${service._id}&tab=action`);
                           }}
                           className="flex-1 bg-white dark:bg-gray-800 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all active:scale-95"
                       >
                           Request Appointment
                       </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {service.availability && (
                          <button
                          type="button"
                          onClick={toggleWishlist}
                          className={`flex-1 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold transition-all active:scale-95 ${liked ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50' : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                          {liked ? 'Remove from Wishlist' : 'Add to Wishlist'}
                          </button>
                      )}
                    </div>
                </div>
            )}
          </div>

          <div className="mt-12">
            <ReviewSection targetId={service.provider._id} targetName={service.provider.name} />
          </div>

          {reportOpen && (
            <ReportModal targetUserId={service.provider._id} itemType="service" itemId={service._id} onClose={() => setReportOpen(false)} />
          )}

          {requestOpen && (
            <RequestAppointmentModal
               serviceId={service._id}
               itemTitle={service.title}
               originalPrice={service.price}
               onClose={() => setRequestOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
