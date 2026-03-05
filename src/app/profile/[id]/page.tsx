'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import ReviewSection from '@/components/ReviewSection';
import ExpandableText from '@/components/ExpandableText';
import ShareButton from '@/components/ShareButton';
import ReportModal from '@/components/ReportModal';
import { useAuth } from '@/context/AuthContext';

// ── Pagination Controls ───────────────────────────────────────────────────────

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
    <div className="mt-5 flex items-center justify-center gap-2">
      <button
        onClick={() => go(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => Math.abs(p - page) <= 2)
        .map(p => (
          <button
            key={p}
            onClick={() => go(p)}
            className={`w-8 h-8 text-sm font-bold rounded-lg transition-colors ${
              p === page ? 'bg-indigo-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {p}
          </button>
        ))}
      <button
        onClick={() => go(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}


// ── Item Card (public listing card) ──────────────────────────────────────────

function ItemCard({
  item, type, isOwner,
  onDelete, onToggleStatus
}: {
  item: any; type: 'product' | 'service'; isOwner: boolean;
  onDelete?: (id: string, type: 'products' | 'services') => void;
  onToggleStatus?: (id: string, newStatus: string, type: 'products' | 'services') => void;
}) {
  const href = type === 'product' ? `/products/${item._id}` : `/services/${item._id}`;
  const image = item.images?.[0];
  const price = type === 'product'
    ? `₹${item.price}`
    : `₹${item.price}${item.priceUnit ? `/${item.priceUnit}` : ''}`;

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col select-none cursor-pointer">
      <Link href={href} className="absolute inset-0 z-0">
        <span className="sr-only">View {item.title}</span>
      </Link>
      
      <div className="relative h-36 overflow-hidden bg-gray-50 dark:bg-gray-700 z-10 pointer-events-none">
        {image ? (
          <Image
            src={image}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            referrerPolicy="no-referrer"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${
          item.status === 'Available' || item.status === 'Active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
        }`}>
          {item.status || 'Active'}
        </div>
      </div>
      <div className="px-3 pt-3 pb-2 flex-1 flex flex-col pointer-events-none">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-1 min-h-[1.6em]">{item.title}</h3>
        
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
          <ExpandableText text={item.description} maxLines={2} className="min-h-[3em]" showReadMore={false} />
        </div>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">{price}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full">{item.category}</span>
          {type === 'product' && item.condition && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{item.condition}</span>
          )}
        </div>
      </div>
      {/* Owner action bar */}
      {isOwner && (
        <div className="px-3 py-2 bg-gray-50/60 dark:bg-gray-700/60 border-t border-gray-100 dark:border-gray-600 flex gap-2 mt-auto">
          {type === 'service' && (
            <button
              onClick={() => {
                  const currentStatus = item.status || 'Active';
                  const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
                  onToggleStatus?.(item._id, nextStatus, 'services');
              }}
              className={`text-xs font-bold px-2 py-1 flex-1 text-center transition-colors ${
                item.status === 'Active'
                  ? 'text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400' 
                  : 'text-emerald-500 hover:text-emerald-600'
              }`}
            >
              {item.status === 'Active' ? 'Mark Inactive' : 'Mark Active'}
            </button>
          )}
          <button
            onClick={() => onDelete?.(item._id, type === 'product' ? 'products' : 'services')}
            className="text-xs font-bold text-red-400 hover:text-red-600 px-2 py-1 ml-auto transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Order Card (owner My Orders) ─────────────────────────────────────────────

function OrderCard({ order }: { order: any }) {
  const item = order.product || order.service;
  const type = order.product ? 'products' : 'services';
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col">
      <div className="p-4 flex gap-4 flex-1">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-600">
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
            <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-300">
              <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm">{item?.title || 'Unknown Item'}</h4>
            <span className={`text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded ml-2 flex-shrink-0 ${
              order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}>{order.status}</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            {order.product ? 'Seller' : 'Provider'}:
            <Link href={`/profile/${order.seller?._id}`} className="ml-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {order.seller?.name || 'Unknown'}
            </Link>
          </p>
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-auto">₹{order.totalAmount}</p>
        </div>
      </div>
      <div className="px-4 py-2.5 bg-gray-50/60 dark:bg-gray-700/60 border-t border-gray-100 dark:border-gray-600 flex gap-2">
        {item && <Link href={`/${type}/${item._id}`} className="text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 transition-colors">View</Link>}
        {order.status === 'Completed' && (
          <Link href={`/${type}/${item?._id}#reviews`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2 py-1 transition-colors">Leave Review</Link>
        )}
      </div>
    </div>
  );
}

function ExpandableBio({ bio }: { bio: string }) {
  return (
    <div className="mb-4 max-w-2xl mx-auto md:mx-0">
      <ExpandableText 
        text={bio || ''} 
        maxLines={3} 
        incrementalLines={20}
        className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
        showReadMore={true}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'products' | 'services';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user: authUser } = useAuth();
  const router = useRouter();
  const isOwner = authUser?.id === id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [productPage, setProductPage] = useState(1);
  const [servicePage, setServicePage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    fetchProfile(1, 1, 1, false);
  }, [id]);

  useEffect(() => {
    if (data) fetchProfile(productPage, servicePage, allPage, true);
  }, [productPage, servicePage, allPage]);

  const fetchProfile = async (pPage: number, sPage: number, aPage: number, isPageChange: boolean) => {
    try {
      if (isPageChange) setSectionLoading(true);
      else setLoading(true);
      const res = await fetch(`/api/profile/${id}?productPage=${pPage}&servicePage=${sPage}&allPage=${aPage}&limit=8`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setLoading(false);
      setSectionLoading(false);
    }
  };

  const handleDelete = async (itemId: string, type: 'products' | 'services') => {
    if (!confirm(`Delete this ${type === 'products' ? 'listing' : 'service'}?`)) return;
    try {
      const res = await fetch(`/api/${type}/${itemId}`, { method: 'DELETE' });
      if (res.ok) fetchProfile(productPage, servicePage, allPage, true);
      else alert('Failed to delete');
    } catch { console.error('Delete failed'); }
  };

  const handleToggleStatus = async (itemId: string, newStatus: string, type: 'products' | 'services') => {
    try {
      const res = await fetch(`/api/${type}/${itemId}`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchProfile(productPage, servicePage, allPage, true);
      else alert('Failed to update status');
    } catch { console.error('Update failed'); }
  };


  if (loading) return <Loader />;
  if (!data) return <div className="text-center py-20">User not found</div>;

  const { user, products, services, allItems, pagination, stats } = data;
  const productPagination = pagination?.products;
  const servicePagination = pagination?.services;
  const allPagination = pagination?.all;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">

      {/* ── Profile Header ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden transition-colors duration-300">
        <div className="p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-5xl font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex-shrink-0">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          {/* Info */}
          <div className="text-center md:text-left flex-1 min-w-0">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-2 break-words">
              {user.name}
            </h1>

            {/* Vacation Notice Banner */}
            {user.isOnVacation && (
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-700 dark:text-amber-400">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-xs font-black uppercase tracking-widest italic">Currently on Vacation</span>
              </div>
            )}
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">@{user.username || 'user'}</span>
              
              <span className="flex items-center gap-1.5 py-0.5">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Joined {new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Contact Info Rows */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {/* Display Phone if allowed */}
                {(user.allowPhoneContact || isOwner) && user.phone && (
                  <div className="flex items-center gap-2 py-1.5 px-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-xs font-bold tracking-tight">{user.phone}</span>
                  </div>
                )}

                {/* Display Gender if provided */}
                {user.gender && user.gender !== 'hidden' && user.gender !== 'none' && (
                  <div className="flex items-center gap-2 py-1.5 px-3 bg-fuchsia-50/50 dark:bg-fuchsia-900/20 rounded-xl border border-fuchsia-100/50 dark:border-fuchsia-800/30 text-fuchsia-700 dark:text-fuchsia-300">
                    {user.gender === 'male' ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="10" cy="14" r="5" />
                        <path d="M15 9l6-6" />
                        <path d="M16 3h5v5" />
                      </svg>
                    ) : user.gender === 'female' ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="9" r="5" />
                        <path d="M12 14v7" />
                        <path d="M9 18h6" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.5 4.5h4.5l-3.5 3 1.5 4.5-4-3-4 3 1.5-4.5-3.5-3h4.5z" />
                      </svg>
                    )}
                    <span className="text-xs font-bold tracking-tight capitalize">{user.gender}</span>
                  </div>
                )}
              </div>

              {/* Display Email if allowed (Second Row) */}
              {(user.allowEmailContact || isOwner) && user.email && (
                <div className="flex items-center justify-center md:justify-start">
                  <div className="flex items-center gap-2 py-1.5 px-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100/50 dark:border-blue-800/30 text-blue-700 dark:text-blue-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="text-xs font-bold tracking-tight">{user.email}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Display Address if provided */}
            {user.address && (
              <div className="flex items-start justify-center md:justify-start mb-4 max-w-full">
                <div className="flex items-center gap-2 py-1.5 px-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100/50 dark:border-amber-800/20 text-amber-700 dark:text-amber-400 max-w-full">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-bold tracking-tight whitespace-pre-wrap break-words min-w-0">{user.address}</span>
                </div>
              </div>
            )}

            
            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
              <div className="flex items-center gap-3">
                {/* Google Icon */}
                <div className={`p-1.5 rounded-full border ${user.authProvider === 'google' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-300'} relative group/icon`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.153-1.859 4.104-1.187 1.187-3.047 2.487-6.981 2.487-6.01 0-10.73-4.86-10.73-10.87s4.72-10.87 10.73-10.87c3.25 0 5.59 1.28 7.35 2.95l2.31-2.31C18.63 1.05 15.73 0 12.48 0 5.86 0 .3 5.38.3 12s5.56 12 12.18 12c3.51 0 6.16-1.16 8.25-3.35 2.12-2.12 2.79-5.11 2.79-7.51 0-.71-.06-1.38-.18-2.02h-10.91z"/>
                  </svg>
                  {user.authProvider === 'google' && (
                    <div className="absolute -top-1 -right-1 bg-indigo-500 rounded-full p-0.5 border-2 border-white dark:border-gray-800">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                    </div>
                  )}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    Google Connected
                  </div>
                </div>

                {/* Email Icon */}
                <div className={`p-1.5 rounded-full border ${user.isVerified ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-300'} relative group/icon`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.isVerified && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white dark:border-gray-800">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                    </div>
                  )}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    Email Verified
                  </div>
                </div>

                {/* Phone Icon */}
                <div className={`p-1.5 rounded-full border ${user.isPhoneVerified ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-300'} relative group/icon`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {user.isPhoneVerified && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white dark:border-gray-800">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                    </div>
                  )}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    Phone Verified
                  </div>
                </div>
              </div>

              <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg border border-yellow-100 dark:border-yellow-900/30 text-sm">
                <span className="text-yellow-500 mr-1.5 text-base">★</span>
                <span className="font-bold text-yellow-800 dark:text-yellow-400">{user.rating}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1.5 font-medium">({user.reviewCount} reviews)</span>
              </div>
            </div>

            {user.bio && <ExpandableBio bio={user.bio} />}
          </div>

          {/* Actions — owner vs visitor */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 flex-shrink-0">
            {isOwner ? (
              <>
                <Link
                  href="/profile/edit"
                  className="inline-flex items-center justify-center px-5 py-2 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95 gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center justify-center px-5 py-2 border border-gray-200 dark:border-gray-600 text-sm font-bold rounded-xl text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-all active:scale-95 gap-2"
                >
                  Settings
                </Link>
              </>
            ) : (
              <>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-xl">
                  {user.allowEmailContact && user.email && (
                    <a
                      href={`mailto:${user.email}`}
                      className="px-3 py-2 text-xs font-bold rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 transition-all flex items-center gap-1.5"
                      title="Send Email"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-3 py-2 text-xs font-bold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-gray-600 transition-all flex items-center gap-1.5"
                    title="Read Reviews"
                  >
                    <span className="text-base">★</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to block ${user.name}? You will no longer see their listings.`)) {
                        // handleBlockUser(user._id)
                      }
                    }}
                    className="px-3 py-2 text-xs font-bold rounded-lg text-red-500 dark:text-red-400 hover:bg-white dark:hover:bg-gray-600 transition-all flex items-center gap-1.5"
                    title="Block User"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </button>
                  <button
                    onClick={() => setReportOpen(true)}
                    className="px-3 py-2 text-xs font-bold rounded-lg text-orange-500 dark:text-orange-400 hover:bg-white dark:hover:bg-gray-600 transition-all flex items-center gap-1.5"
                    title="Report User"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </button>
                </div>
                <ShareButton
                  title={`${user.name}'s profile on ReCircle`}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-sm font-bold rounded-xl text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-all active:scale-95"
                />
              </>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 grid grid-cols-2 gap-4 bg-gray-50/60 dark:bg-gray-700/40">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.totalProducts ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Products</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {stats?.totalProductsAvailable ?? 0} available · {stats?.totalProductsSold ?? 0} sold
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{isOwner ? (stats?.totalServices ?? 0) : (stats?.totalServicesActive ?? 0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Services</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stats?.totalEnrollments ?? 0} users served</p>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────── */}
      <div className={`transition-opacity duration-200 ${sectionLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div id="listings-top" className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-full overflow-x-auto scrollbar-hide mb-6 transition-colors">
          {/* All */}
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'all' ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            All
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'all' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
              {(isOwner ? (stats?.totalProducts ?? 0) : (stats?.totalProductsAvailable ?? 0)) + (isOwner ? (stats?.totalServices ?? 0) : (stats?.totalServicesActive ?? 0))}
            </span>
          </button>
          
          {/* Products */}
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'products' ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Products
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'products' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
              {isOwner ? (stats?.totalProducts ?? 0) : (stats?.totalProductsAvailable ?? 0)}
            </span>
          </button>
          {/* Services */}
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'services' ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Services
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'services' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
              {isOwner ? (stats?.totalServices ?? 0) : (stats?.totalServicesActive ?? 0)}
            </span>
          </button>


        </div>

        {/* All Panel */}
        {activeTab === 'all' && (
          <div className="mb-10">
            {allItems.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No items found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {allItems.map((item: any) => (
                  <ItemCard
                    key={item._id} item={item} type={item.type} isOwner={isOwner}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            )}
            <PaginationControls page={allPage} totalPages={allPagination?.totalPages || 1} onPageChange={setAllPage} scrollTargetId="listings-top" />
          </div>
        )}

        {/* Products Panel */}
        {activeTab === 'products' && (
          <div className="mb-10">
            {products.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No products listed.</p>
                {isOwner && <Link href="/products/create" className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-2 inline-block hover:underline">Add a product?</Link>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {products.map((product: any) => (
                    <ItemCard
                      key={product._id} item={product} type="product" isOwner={isOwner}
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
                <PaginationControls page={productPage} totalPages={productPagination?.totalPages || 1} onPageChange={setProductPage} scrollTargetId="listings-top" />
              </>
            )}
          </div>
        )}

        {/* Services Panel */}
        {activeTab === 'services' && (
          <div className="mb-10">
            {services.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No services offered.</p>
                {isOwner && <Link href="/services/create" className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-2 inline-block hover:underline">Add a service?</Link>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {services.map((service: any) => (
                    <ItemCard
                      key={service._id} item={service} type="service" isOwner={isOwner}
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
                <PaginationControls page={servicePage} totalPages={servicePagination?.totalPages || 1} onPageChange={setServicePage} scrollTargetId="listings-top" />
              </>
            )}
          </div>
        )}




        {/* Reviews */}
        <div id="reviews-section">
          <ReviewSection targetId={user._id} targetName={user.name} />
        </div>

      </div>



      {reportOpen && (
        <ReportModal targetUserId={user._id} itemType="none" itemId={null} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
