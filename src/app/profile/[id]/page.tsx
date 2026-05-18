'use client';

import { useState, useEffect, use, useRef } from 'react';
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
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        onClick={() => go(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 disabled:opacity-20 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <div className="flex items-center gap-1 font-medium">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => Math.abs(p - page) <= 2)
          .map(p => (
            <button
              key={p}
              onClick={() => go(p)}
              className={`w-9 h-9 text-xs rounded-lg transition-all ${
                p === page ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          ))}
      </div>

      <button
        onClick={() => go(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 disabled:opacity-20 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}

type TabKey = 'all' | 'products' | 'services';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user: authUser, refreshUser, authFetch } = useAuth();
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
  const [productStatus, setProductStatus] = useState<'all' | 'available' | 'sold'>('all');
  const [reportOpen, setReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [cols, setCols] = useState<2 | 3 | 4 | 5>(4);
  const [mobileCols, setMobileCols] = useState<1 | 2>(2);

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
    if (productStatus !== 'all' && activeTab === 'products') params.set('productStatus', productStatus);
    const queryString = params.toString();
    const url = `/profile/${id}${queryString ? `?${queryString}` : ''}`;
    // Use history.replaceState to update URL silently without triggering Next.js scroll-to-top logic
    window.history.replaceState({ ...window.history.state, as: url, url }, '', url);
  }, [activeTab, productPage, servicePage, allPage, id, productStatus]);

  const getQueryUrl = () => {
    const params = new URLSearchParams();
    params.append('productPage', productPage.toString());
    params.append('servicePage', servicePage.toString());
    params.append('allPage', allPage.toString());
    params.append('limit', '20');
    if (productStatus !== 'all') params.append('productStatus', productStatus);
    return `/api/profile/${id}?${params.toString()}`;
  };

  const fetcher = async (url: string) => {
    const res = await authFetch(url);
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
    revalidateOnFocus: true,
  });

  const isRateLimited = error?.status === 429;
  const loading = isLoading && !data;
  const sectionLoading = isValidating && data;

  useEffect(() => {
    if (authUser?.blockedUsers?.some((b: any) => b.toString() === id)) setIsBlocked(true);
  }, [id, authUser]);

  const handleDelete = async (itemId: string, type: 'products' | 'services') => {
    const confirmed = await confirmAction({
      title: 'Confirm Deletion',
      text: 'Are you sure you want to remove this item?',
      dangerMode: true,
      confirmButtonText: 'Delete'
    });
    if (!confirmed) return;
    try {
      const res = await authFetch(`/api/${type}/${itemId}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } catch { console.error('Delete failed'); }
  };

  const handleToggleStatus = async (itemId: string, newStatus: string, type: 'products' | 'services') => {
    try {
      const res = await authFetch(`/api/${type}/${itemId}`, { 
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
      const res = await authFetch(isBlocked ? `/api/user/block?userId=${id}` : '/api/user/block', {
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

  if (loading) return <ProfileSkeleton />;
  if (error || isRateLimited) return <div className="text-center py-20 font-medium text-gray-500">{error?.message || 'Access Denied'}</div>;
  if (!data) return <div className="text-center py-20 font-medium text-gray-500">User not found</div>;

  const { user, products, services, allItems, pagination, stats } = data;
  const isOwner = authUser?.id === id || authUser?.id === user?._id?.toString();

  const productPagination = pagination?.products;
  const servicePagination = pagination?.services;
  const allPagination = pagination?.all;

  return (
    <div className="min-h-screen-dynamic w-full overflow-x-hidden bg-gray-50/30 dark:bg-[#080B14] transition-colors duration-500 pb-20">
      
      {/* 🔹 Panoramic Immersive Header */}
      <div className="relative w-full h-[220px] sm:h-[280px] lg:h-[320px] overflow-hidden group">
        {/* Dynamic Background Banner */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {user.bannerImage ? (
             <>
                <Image src={user.bannerImage} alt="Profile Banner" fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 scale-100" referrerPolicy="no-referrer" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-[#080B14] via-gray-50/20 dark:via-transparent to-transparent opacity-95"></div>
                <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
             </>
          ) : (
              <div className="h-full w-full bg-slate-50 dark:bg-[#0A0D18] relative overflow-hidden">
                {/* 🎨 Premium Mesh Gradient Background */}
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-violet-500/10 blur-[100px] rounded-full" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-sky-400/10 blur-[80px] rounded-full animate-pulse" style={{ animationDuration: '4s' }}></div>
                
                {/* 🌊 Subtle Geometric Texture Override */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234338ca' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
                
                <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-gray-50/80 dark:from-[#080B14] via-transparent to-transparent"></div>
              </div>
          )}
        </div>
      </div>

      {/* Floating Profile Glass Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-30 -mt-36 sm:-mt-44 lg:-mt-48 pb-12">
          <div className="w-full p-6 md:p-10 rounded-[2.5rem] bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 hover:shadow-indigo-500/10 overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            
              {/* Avatar Column */}
              <div className="flex flex-col items-center gap-5 flex-shrink-0 animate-in slide-in-from-left-4 duration-700">
                <div className="relative h-32 w-32 md:h-44 md:w-44 group-avatar">
                   <div className="h-full w-full rounded-2xl bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden flex items-center justify-center text-4xl font-bold text-indigo-600 transition-all duration-500 group-avatar:scale-[1.02]">
                     {user.profilePicture ? (
                       <Image src={user.profilePicture} alt={user.name} fill className="object-cover" referrerPolicy="no-referrer" />
                     ) : (
                       user.name?.charAt(0).toUpperCase()
                     )}
                   </div>
                   {user.isVerified && (
                     <div className="absolute -bottom-1.5 -right-1.5 h-8 w-8 bg-blue-500 border-4 border-white dark:border-gray-950 rounded-full flex items-center justify-center text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)] z-20">
                       <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                       </svg>
                     </div>
                   )}
                </div>
              </div>


            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left pt-2 min-w-0 w-full max-w-full">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tighter leading-tight break-words max-w-full drop-shadow-sm">{user.name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-900/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">@{user.username || 'user'}</span>
                      {user.gender && user.gender !== 'none' && (
                        <span className="text-[10px] sm:text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 select-none">
                          {user.gender === 'male' ? '♂ Male' : user.gender === 'female' ? '♀ Female' : '⚧ ' + user.gender}
                        </span>
                      )}
                    </div>
                  </div>

                  {user.verifiedCommunities && user.verifiedCommunities.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
                      {user.verifiedCommunities.map((community: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter shadow-sm">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                           {community.name}
                        </span>
                      ))}
                    </div>
                  )}
              
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 mb-6">
                    {(isOwner || user.allowEmailContact) && user.email && (
                      <a href={`mailto:${user.email}`} className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-all flex items-center gap-2 group/meta">
                         <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/meta:bg-indigo-50 dark:group-hover/meta:bg-indigo-900/30 transition-colors">
                            <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                         </div>
                         <span className="truncate">{user.email}</span>
                      </a>
                    )}
                    {(isOwner || user.allowPhoneContact) && user.phone && (
                      <a href={`tel:${user.phone}`} className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-all flex items-center gap-2 group/meta">
                         <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/meta:bg-indigo-50 dark:group-hover/meta:bg-indigo-900/30 transition-colors">
                            <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                         </div>
                         {user.phone}
                      </a>
                    )}
                    <span className="text-xs sm:text-sm font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-gray-100/50 dark:bg-gray-800/50 flex items-center justify-center">
                          <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </div>
                       Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                    {(user.state || user.city) && (
                      <span className="text-xs sm:text-sm font-bold text-gray-400 dark:text-gray-500 flex items-start gap-2 max-w-full">
                        <div className="w-8 h-8 rounded-full bg-gray-100/50 dark:bg-gray-800/50 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0 break-words overflow-hidden pt-1.5">
                          {user.state && <span className="shrink-0">{user.state}</span>}
                          {user.city && (
                            <>
                              <span className="opacity-30 text-[10px] shrink-0">❯</span>
                              <span className="shrink-0">{user.city}</span>
                            </>
                          )}
                          {user.landmark && (
                            <>
                              <span className="opacity-30 text-[10px] shrink-0">❯</span>
                              <span className="opacity-70 font-medium break-all sm:break-words">{user.landmark}</span>
                            </>
                          )}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Enhanced Stats Row */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                     <div className="flex flex-col px-4 border-r border-gray-200 dark:border-gray-800 last:border-0 min-w-[70px]">
                        <span className="text-lg font-black text-gray-900 dark:text-white leading-tight">{stats?.totalProductsAvailable ?? 0}</span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Goods</span>
                     </div>
                     <div className="flex flex-col px-4 border-r border-gray-200 dark:border-gray-800 last:border-0 min-w-[70px]">
                        <span className="text-lg font-black text-gray-900 dark:text-white leading-tight">{stats?.totalServicesActive ?? 0}</span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Services</span>
                     </div>
                     <div className="flex flex-col px-4 last:border-0 min-w-[70px]">
                        <span className="text-lg font-black text-amber-500 leading-tight">★ {Number(user.rating).toFixed(1)}</span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{user.reviewCount} Reviews</span>
                     </div>
                  </div>

              {/* Actions Box */}
              <div className="w-full flex flex-col gap-3 shrink-0 mt-6 md:mt-8">
                {isOwner ? (
                  <Link href="/settings?tab=profile" className="w-full md:w-44 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 text-center transition-all hover:-translate-y-1 active:scale-95">
                    Edit Settings
                  </Link>
                ) : (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full max-w-full">
                     <ShareButton 
                       title={`${user.name}'s Profile`} 
                       className="h-12 px-5 flex items-center justify-center gap-2 bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500/30 rounded-xl text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs uppercase tracking-wider select-none shrink-0 active:scale-95 transition-all duration-200 hover:shadow-sm" 
                     />
                     
                     <button 
                       onClick={handleBlockUser} 
                       disabled={blocking}
                       className={`h-12 px-5 flex items-center justify-center gap-2 rounded-xl border font-bold text-xs uppercase tracking-wider select-none shrink-0 active:scale-95 transition-all duration-200 hover:shadow-sm ${
                         isBlocked 
                           ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40' 
                           : 'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/30 hover:bg-rose-50/10 dark:hover:bg-rose-950/10'
                       }`}
                       title={isBlocked ? 'Unblock User' : 'Block User'}
                     >
                       {blocking ? (
                         <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                       ) : (
                         <>
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                           </svg>
                           <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                         </>
                       )}
                     </button>

                     <button 
                       onClick={() => setReportOpen(true)}
                       className="h-12 px-5 flex items-center justify-center gap-2 bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 hover:border-rose-300 dark:hover:border-rose-900/30 rounded-xl text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs uppercase tracking-wider select-none shrink-0 active:scale-95 transition-all duration-200 hover:shadow-sm hover:bg-rose-50/10 dark:hover:bg-rose-950/10"
                       title="Report User"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                       </svg>
                       <span>Report</span>
                     </button>
                  </div>
                )}

                  {/* Bio Section */}
                  {user.bio && (
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5 animate-in fade-in duration-1000">
                      <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.2em] mb-3">About the User</p>
                      <ExpandableText text={user.bio} maxLines={3} className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic" showReadMore={true} />
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 🔹 Content Tabs & Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-100 dark:border-gray-800">
           <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full sm:w-fit font-bold">
               {[
                 { id: 'all', label: 'All Catalog', count: stats?.totalAll },
                 { id: 'products', label: 'Products', count: stats?.totalProducts },
                 { id: 'services', label: 'Services', count: stats?.totalServices }
               ].map(tab => (
                 <button 
                   key={tab.id} 
                   onClick={() => setActiveTab(tab.id as any)} 
                   className={`px-5 sm:px-6 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                 >
                   <span>{tab.label}</span>
                   <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500' : 'bg-gray-200 dark:bg-gray-900 text-gray-500'}`}>
                      {tab.count || 0}
                   </span>
                 </button>
               ))}
            </div>

           <div className="flex items-center gap-3">
              {/* Mobile Grid Toggle */}
              <div className="flex md:hidden items-center gap-1 bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl shadow-inner">
                {[1, 2].map(num => (
                  <button key={num} onClick={() => setMobileCols(num as any)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${mobileCols === num ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-500'}`}>{num}x</button>
                ))}
              </div>

              {/* Desktop Grid Toggle */}
              <div className="hidden md:flex items-center gap-1 bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl shadow-inner">
                 {[2, 3, 4, 5].map(val => (
                   <button key={val} onClick={() => setCols(val as any)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${val > 3 ? 'hidden lg:block' : ''} ${cols === val ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-indigo-500'}`}>{val}x</button>
                 ))}
              </div>
           </div>
        </div>

        <div id="listings-top" className={`transition-all duration-300 ${sectionLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            {activeTab === 'all' && (
              <>
                {allItems.length === 0 ? <p className="text-center py-20 text-gray-400 font-medium">No current listings from this user.</p> : (
                  <div className={`grid gap-5 sm:gap-6 ${mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`}>
                    {allItems.map((item: any, index: number) => (item.type === 'product' ? <ProductCard key={item._id} product={item} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} priority={index < 4} /> : <ServiceCard key={item._id} service={item} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} priority={index < 4} />))}
                  </div>
                )}
                <PaginationControls page={allPage} totalPages={allPagination?.totalPages || 1} onPageChange={setAllPage} scrollTargetId="listings-top" />
              </>
           )}


           {activeTab === 'products' && (
              <div className="mb-8 flex items-center gap-2 p-1 bg-gray-50 dark:bg-black/20 rounded-xl w-fit">
                {[
                  { id: 'all', label: 'All', count: stats?.totalProducts },
                  { id: 'available', label: 'Available', count: stats?.totalProductsAvailable },
                  { id: 'sold', label: 'Sold', count: stats?.totalProductsSold }
                ].map(sub => (
                  <button 
                    key={sub.id} 
                    onClick={() => { setProductStatus(sub.id as any); setProductPage(1); }}
                    className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ${productStatus === sub.id ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm border border-gray-100 dark:border-gray-700' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                    {sub.label}
                    <span className="opacity-60 text-[9px]">{sub.count || 0}</span>
                  </button>
                ))}
              </div>
           )}

           {activeTab === 'products' && (
              <>
                {products.length === 0 ? <p className="text-center py-20 text-gray-400 font-medium">No products listed yet.</p> : (
                  <div className={`grid gap-5 sm:gap-6 ${mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`}>
                    {products.map((product: any, index: number) => (<ProductCard key={product._id} product={product} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} priority={index < 4} />))}
                  </div>
                )}
                <PaginationControls page={productPage} totalPages={productPagination?.totalPages || 1} onPageChange={setProductPage} scrollTargetId="listings-top" />
              </>
           )}

           {activeTab === 'services' && (
              <>
                {services.length === 0 ? <p className="text-center py-20 text-gray-400 font-medium">No services provided yet.</p> : (
                  <div className={`grid gap-5 sm:gap-6 ${mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`}>
                    {services.map((service: any, index: number) => (<ServiceCard key={service._id} service={service} isOwner={isOwner} onDelete={handleDelete} onToggleStatus={handleToggleStatus} priority={index < 4} />))}
                  </div>
                )}
                <PaginationControls page={servicePage} totalPages={servicePagination?.totalPages || 1} onPageChange={setServicePage} scrollTargetId="listings-top" />
              </>
           )}
        </div>

        {/* Reviews */}
        <div id="reviews-section" className="mt-32 pt-16 border-t border-gray-100 dark:border-gray-800">
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 tracking-tight">Community Feedback</h2>
           <ReviewSection targetId={user.id || user._id} targetName={user.name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors" />
        </div>
      </div>

      {reportOpen && <ReportModal targetUserId={user.id || user._id} itemType={null} itemId={null} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
