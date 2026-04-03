'use client';

import { useState, useEffect, use, useMemo, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileSkeleton, ItemCardSkeleton } from '@/components/Skeletons';
import ReviewSection from '@/components/ReviewSection';
import ExpandableText from '@/components/ExpandableText';
import ShareButton from '@/components/ShareButton';
import ReportModal from '@/components/ReportModal';
import { useAuth } from '@/context/AuthContext';
import ProductCard from '@/components/ProductCard';
import ServiceCard from '@/components/ServiceCard';
import { confirmAction } from '@/lib/confirm';

export const dynamic = 'force-dynamic';

function PaginationControls({
  page, totalPages, onPageChange, scrollTargetId,
}: { page: number; totalPages: number; onPageChange: (p: number) => void; scrollTargetId?: string }) {
  if (totalPages <= 1) return null;

  const go = (p: number) => {
    if (scrollTargetId) {
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onPageChange(p);
  };

  return (
    <div className="mt-12 flex items-center justify-center gap-2">
      <button
        onClick={() => go(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-3.5 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 text-gray-400 disabled:opacity-20 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <div className="flex items-center gap-1.5 bg-white/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-inner">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => Math.abs(p - page) <= 2)
          .map(p => (
            <button
              key={p}
              onClick={() => go(p)}
              className={`w-10 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 ${
                p === page ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              {p}
            </button>
          ))}
      </div>

      <button
        onClick={() => go(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="p-3.5 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 text-gray-400 disabled:opacity-20 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}

type TabKey = 'all' | 'products' | 'services';

function OrderCard({ order }: { order: any }) {
  const item = order.product || order.service;
  const type = order.product ? 'products' : 'services';
  return (
    <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-100 dark:border-gray-700 shadow-sm rounded-[1.5rem] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      <div className="p-4 flex gap-4 flex-1">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105">
          {item?.images?.[0] ? (
            <Image 
              src={item.images[0]} 
              alt={item.title || "Order item"} 
              fill
              sizes="80px"
              className="object-cover" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-300">
              <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1 min-w-0 py-0.5">
          <div className="flex items-start justify-between">
            <h4 className="font-black text-gray-950 dark:text-white truncate text-sm uppercase tracking-tight italic">{item?.title || 'Unknown Item'}</h4>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ml-2 flex-shrink-0 shrink-0 ${
              order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700'
            }`}>{order.status}</span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-black tracking-tight">
            {order.product ? 'SOURCE' : 'PROVIDER'}:
            <Link href={`/profile/${order.seller?._id}`} className="ml-1 text-indigo-600 dark:text-indigo-400 hover:underline">
              {order.seller?.name || 'Unknown'}
            </Link>
          </p>
          <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-auto">₹{order.totalAmount}</p>
        </div>
      </div>
      <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800/50 flex gap-4">
        {item && <Link href={`/${type}/${item._id}`} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 transition-colors">Details</Link>}
        {order.status === 'Completed' && (
          <Link href={`/${type}/${item?._id}#reviews`} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline transition-colors ml-auto">Write Review</Link>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user: authUser, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  const tabParam = searchParams.get('tab') as TabKey;
  const pPageParam = parseInt(searchParams.get('pPage') || '1');
  const sPageParam = parseInt(searchParams.get('sPage') || '1');
  const aPageParam = parseInt(searchParams.get('aPage') || '1');

  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || 'all');
  const [productPage, setProductPage] = useState(pPageParam);
  const [servicePage, setServicePage] = useState(sPageParam);
  const [allPage, setAllPage] = useState(aPageParam);
  const [reportOpen, setReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [cols, setCols] = useState<3 | 4 | 5>(4);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabKey;
    if (tabFromUrl && tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
    const pPFromUrl = parseInt(searchParams.get('pPage') || '1');
    if (pPFromUrl !== productPage) setProductPage(pPFromUrl);
    const sPFromUrl = parseInt(searchParams.get('sPage') || '1');
    if (sPFromUrl !== servicePage) setServicePage(sPFromUrl);
    const aPFromUrl = parseInt(searchParams.get('aPage') || '1');
    if (aPFromUrl !== allPage) setAllPage(aPFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (productPage > 1) params.set('pPage', productPage.toString());
    if (servicePage > 1) params.set('sPage', servicePage.toString());
    if (allPage > 1) params.set('aPage', allPage.toString());
    const queryString = params.toString();
    const url = `/profile/${id}${queryString ? `?${queryString}` : ''}`;
    router.push(url, { scroll: false });
  }, [activeTab, productPage, servicePage, allPage, id]);

  const getQueryUrl = () => {
    const params = new URLSearchParams();
    params.append('productPage', productPage.toString());
    params.append('servicePage', servicePage.toString());
    params.append('allPage', allPage.toString());
    params.append('limit', '20');
    return `/api/profile/${id}?${params.toString()}`;
  };

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
       const errData = await res.json().catch(() => ({}));
       const error: any = new Error(errData.error || 'Failed to load profile');
       error.status = res.status;
       throw error;
    }
    return res.json();
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(id ? getQueryUrl() : null, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false
  });

  const isRateLimited = error?.status === 429;
  const loading = isLoading && !data;
  const sectionLoading = isValidating && data;
  const errorMsg = error?.message || null;

  useEffect(() => {
    if (authUser?.blockedUsers?.some((b: any) => b.toString() === id)) setIsBlocked(true);
  }, [id, authUser]);

  const handleDelete = async (itemId: string, type: 'products' | 'services') => {
    const confirmed = await confirmAction({
      title: `Delete ${type === 'products' ? 'Listing' : 'Service'}?`,
      text: `Are you sure you want to delete this ${type === 'products' ? 'listing' : 'service'}? This action cannot be undone.`,
      dangerMode: true,
      confirmButtonText: 'Delete'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/${type}/${itemId}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } catch { console.error('Delete failed'); }
  };

  const handleToggleStatus = async (itemId: string, newStatus: string, type: 'products' | 'services') => {
    try {
      const res = await fetch(`/api/${type}/${itemId}`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) mutate();
    } catch { console.error('Update failed'); }
  };

  const handleBlockUser = async () => {
    if (!authUser) return;
    try {
      setBlocking(true);
      const res = await fetch(isBlocked ? `/api/user/block?userId=${id}` : '/api/user/block', {
        method: isBlocked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(isBlocked ? {} : { body: JSON.stringify({ targetUserId: id }) })
      });
      if (res.ok) {
        setIsBlocked(!isBlocked);
        await refreshUser();
      }
    } catch (error) { console.error(error); } finally { setBlocking(false); }
  };

  if (isRateLimited) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase italic tracking-tighter">Whoa, slow down!</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-8 font-medium">You're browsing faster than we can keep up with. Please wait a minute before refreshing.</p>
          <button onClick={() => mutate()} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95">Try Again</button>
        </div>
      </div>
    );
  }

  if (loading) return <ProfileSkeleton />;
  if (errorMsg) return (
       <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-12 border-2 border-red-100 dark:border-red-900/30 shadow-xl">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
              {errorMsg === 'Failed to load profile' ? 'You are blocked from viewing this profile, or the user has restricted access.' : errorMsg}
            </p>
            <button onClick={() => router.back()} className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg active:scale-95">Go Back</button>
          </div>
       </div>
    );
  if (!data) return <div className="text-center py-20">User not found</div>;

  const { user, products, services, allItems, pagination, stats } = data;
  
  // Extra robust owner check
  const isOwner = authUser?.id === id || 
                  authUser?.id === user?.id || 
                  authUser?.id === user?._id?.toString() || 
                  (authUser?.id && user?._id && authUser.id.toString() === user._id.toString());

  const productPagination = pagination?.products;
  const servicePagination = pagination?.services;
  const allPagination = pagination?.all;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300 overflow-x-hidden w-full">
      {/* Profile Header */}
      <div className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-700/50 mb-10 overflow-hidden transition-all">
        <div className="p-8 sm:p-12 flex flex-col md:flex-row items-center md:items-start gap-10">
          <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-800/40 flex items-center justify-center text-5xl font-black text-indigo-600 dark:text-indigo-400 border-4 border-white dark:border-gray-800 shadow-2xl overflow-hidden flex-shrink-0 relative group">
            {user.profilePicture ? (
              <Image src={user.profilePicture} alt={user.name} width={128} height={128} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
            ) : (
              user.name?.charAt(0).toUpperCase() || 'U'
            )}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="text-center md:text-left flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-3">
              <h1 className="text-4xl font-black text-gray-950 dark:text-white leading-none tracking-tighter italic break-words">{user.name}</h1>
              {user.isOnVacation && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 dark:text-amber-400">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest italic">On Sabbatical</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-3 text-xs text-gray-500 dark:text-gray-400 mb-6">
              <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">@{user.username || 'user'}</span>
              <span className="flex items-center gap-2 font-black uppercase tracking-tight opacity-70">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                EST. {new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
            </div>
            
            {user.verifiedCommunities && user.verifiedCommunities.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-6">
                {user.verifiedCommunities.map((community: any) => (
                  <div key={community._id} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-[1rem] text-emerald-700 dark:text-emerald-400 shadow-sm transition-all hover:border-emerald-500/40 select-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{community.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 mb-6 max-w-full lg:max-w-xl">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(user.allowPhoneContact || isOwner) && user.phone && (
                    <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-indigo-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Phone</span>
                          <span className="text-xs font-black text-gray-950 dark:text-white">{user.phone}</span>
                        </div>
                    </div>
                  )}
                  {user.gender && user.gender !== 'none' && (
                    <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-indigo-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Gender</span>
                          <span className="text-xs font-black text-gray-950 dark:text-white capitalize">{user.gender}</span>
                        </div>
                    </div>
                  )}
               </div>

               {(user.allowEmailContact || isOwner) && user.email && (
                 <div className="flex items-center gap-3 p-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 w-full">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-indigo-500">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email</span>
                       <span className="text-xs font-black text-gray-950 dark:text-white break-all leading-tight">{user.email}</span>
                    </div>
                 </div>
               )}

               {user.address && (
                 <div className="flex items-start gap-3 p-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 w-full">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-indigo-500 shrink-0 mt-1">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Location</span>
                       <span className="text-xs font-black text-gray-950 dark:text-white leading-relaxed break-words">{user.address}</span>
                    </div>
                 </div>
               )}
            </div>

            {user.bio && (
              <div className="mb-6 relative">
                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 rounded-full" />
                 <div className="pl-5">
                    <ExpandableText text={user.bio} maxLines={3} incrementalLines={20} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-bold italic" showReadMore={true} />
                 </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {isOwner ? (
                <Link href="/profile/edit" className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit profile
                </Link>
            ) : (
              <div className="flex flex-col gap-3">
                 <button onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })} className="w-full flex items-center justify-between px-6 py-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-2xl active:scale-95 transition-all group">
                    <div className="flex flex-col items-start px-2">
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-70">User Rating</span>
                       <span className="text-lg font-black tracking-tighter italic">★ {user.rating}</span>
                    </div>
                    <div className="p-2 bg-yellow-500 text-white rounded-xl shadow-lg group-hover:rotate-12 transition-transform">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </div>
                 </button>
                 <div className="flex gap-2">
                    <button onClick={() => setReportOpen(true)} className="flex-1 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-600 rounded-2xl active:scale-95 transition-all"><svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></button>
                    <button onClick={handleBlockUser} disabled={blocking} className={`flex-1 p-4 border rounded-2xl active:scale-95 transition-all ${isBlocked ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20'}`}><svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={isBlocked ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" : "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"} /></svg></button>
                    <ShareButton title={`${user.name}'s profile on ReCircle`} className="flex-1 p-4 bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 rounded-2xl hover:text-indigo-600 transition-all" />
                 </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100/50 dark:border-gray-800/50 px-6 sm:px-12 py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/10 dark:bg-gray-700/5">
          <div className="flex flex-col p-6 rounded-[2rem] bg-white/50 dark:bg-gray-800/20 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 transition-all hover:shadow-xl hover:-translate-y-1">
            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1 italic">Total Products</span>
            <div className="flex items-end justify-between">
               <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none italic">{stats?.totalProducts ?? 0}</span>
               <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-[1.25rem] text-indigo-600 dark:text-indigo-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-tight text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40 w-fit">{stats?.totalProductsAvailable ?? 0} ACTIVE NOW</p>
          </div>
          
          <div className="flex flex-col p-6 rounded-[2rem] bg-white/50 dark:bg-gray-800/20 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 transition-all hover:shadow-xl hover:-translate-y-1">
            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1 italic">Total Services</span>
            <div className="flex items-end justify-between">
               <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none italic">{isOwner ? (stats?.totalServices ?? 0) : (stats?.totalServicesActive ?? 0)}</span>
               <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-[1.25rem] text-indigo-600 dark:text-indigo-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-tight text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/40 w-fit">{stats?.totalEnrollments ?? 0} CLIENTS SERVED</p>
          </div>

          <div className="flex flex-col p-6 rounded-[2rem] bg-white/50 dark:bg-gray-800/20 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 transition-all hover:shadow-xl hover:-translate-y-1">
             <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 ml-1 italic">Performance</span>
             <div className="flex items-end justify-between">
               <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none italic">{user.rating}</span>
               <div className="p-2.5 bg-yellow-400/10 rounded-[1.25rem] text-yellow-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></div>
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-tight text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 w-fit">{user.reviewCount} GLOBAL REVIEWS</p>
          </div>

          <div className="flex flex-col p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none transition-all hover:-translate-y-1">
             <span className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-3 ml-1 italic">Market Share</span>
             <div className="flex items-end justify-between">
               <span className="text-4xl font-black leading-none italic">{stats?.totalProductsSold ?? 0}</span>
               <div className="p-2.5 bg-indigo-500/30 rounded-[1.25rem]"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-tight text-indigo-100 bg-indigo-500/30 px-3 py-1.5 rounded-xl border border-indigo-400/30 w-fit uppercase tracking-widest">TOTAL SALES</p>
          </div>
        </div>
      </div>

      <div className={`transition-all duration-300 w-full max-w-full overflow-hidden ${sectionLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 w-full">
          <div id="listings-top" className="flex items-center gap-1.5 p-1.5 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide border border-gray-100 dark:border-gray-700/50">
            {[
              { id: 'all', label: 'ALL LISTINGS', count: (isOwner ? (stats?.totalProducts ?? 0) : (stats?.totalProductsAvailable ?? 0)) + (isOwner ? (stats?.totalServices ?? 0) : (stats?.totalServicesActive ?? 0)), icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
              { id: 'products', label: 'PRODUCTS', count: isOwner ? (stats?.totalProducts ?? 0) : (stats?.totalProductsAvailable ?? 0), icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
              { id: 'services', label: 'SERVICES', count: isOwner ? (stats?.totalServices ?? 0) : (stats?.totalServicesActive ?? 0), icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`group flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all active:scale-95 whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-100/20 dark:shadow-none font-black italic' : 'text-gray-400 hover:text-gray-950 dark:hover:text-white font-black opacity-60'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
                <span className="text-[10px] uppercase tracking-[0.2em]">{tab.label}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-lg border font-black ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-100 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-50'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-gray-100/30 dark:bg-gray-800/30 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700">
             {[3, 4, 5].map(v => (
               <button key={v} onClick={() => setCols(v as 3 | 4 | 5)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-90 ${cols === v ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-100 dark:border-gray-700 italic' : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>{v}x</button>
             ))}
          </div>
        </div>

        {activeTab === 'all' && (
          <div className="mb-10">
            {allItems.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 transition-colors"><p className="text-gray-500 dark:text-gray-400 text-sm italic">No items found.</p></div>
            ) : (
              <div className={cols === 3 ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6' : cols === 5 ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-6' : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'}>
                {sectionLoading ? ([...Array(cols * 2)].map((_, i) => <ItemCardSkeleton key={i} />)) : (allItems.map((item: any) => (item.type === 'product' ? <ProductCard key={item._id} product={item} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} /> : <ServiceCard key={item._id} service={item} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />)))}
              </div>
            )}
            <PaginationControls page={allPage} totalPages={allPagination?.totalPages || 1} onPageChange={setAllPage} scrollTargetId="listings-top" />
          </div>
        )}

        {activeTab === 'products' && (
          <div className="mb-10">
            {products.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No products listed.</p>
                {isOwner && <Link href="/products/create" className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-2 inline-block hover:underline">Add a product?</Link>}
              </div>
            ) : (
              <>
                <div className={cols === 3 ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6' : cols === 5 ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-6' : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'}>
                  {sectionLoading ? ([...Array(cols * 2)].map((_, i) => <ItemCardSkeleton key={i} />)) : (products.map((product: any) => (<ProductCard key={product._id} product={product} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />)))}
                </div>
                <PaginationControls page={productPage} totalPages={productPagination?.totalPages || 1} onPageChange={setProductPage} scrollTargetId="listings-top" />
              </>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="mb-10">
            {services.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No services offered.</p>
                {isOwner && <Link href="/services/create" className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-2 inline-block hover:underline">Add a service?</Link>}
              </div>
            ) : (
              <>
                <div className={cols === 3 ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6' : cols === 5 ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-6' : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'}>
                  {sectionLoading ? ([...Array(cols * 2)].map((_, i) => <ItemCardSkeleton key={i} />)) : (services.map((service: any) => (<ServiceCard key={service._id} service={service} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />)))}
                </div>
                <PaginationControls page={servicePage} totalPages={servicePagination?.totalPages || 1} onPageChange={setServicePage} scrollTargetId="listings-top" />
              </>
            )}
          </div>
        )}

        <div id="reviews-section"><ReviewSection targetId={user.id || user._id} targetName={user.name} /></div>
      </div>
      {reportOpen && (
        <ReportModal targetUserId={user.id || user._id} itemType={null} itemId={null} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
