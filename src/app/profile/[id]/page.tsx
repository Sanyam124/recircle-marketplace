'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import ReviewSection from '@/components/ReviewSection';
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
    <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col">
      <Link href={href} className="block">
        <div className="relative h-36 overflow-hidden bg-gray-50 dark:bg-gray-700">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
        <div className="p-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">{price}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full">{item.category}</span>
            {type === 'product' && item.condition && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{item.condition}</span>
            )}
          </div>
        </div>
      </Link>
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
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1 justify-center md:justify-start">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{user.name}</h1>
              {user.isVerified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  Verified
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="font-mono text-indigo-600 dark:text-indigo-400">@{user.username || 'user'}</span>
              <span>•</span>
              <span className="capitalize">{user.role}</span>
              <span>•</span>
              <span>Joined {new Date(user.joinedAt).getFullYear()}</span>
            </div>

            {user.bio && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 max-w-2xl leading-relaxed mx-auto md:mx-0">
                {user.bio}
              </p>
            )}
            
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg border border-yellow-100 dark:border-yellow-900/30 text-sm shadow-sm">
                <span className="text-yellow-500 mr-1.5 text-base">★</span>
                <span className="font-bold text-yellow-800 dark:text-yellow-400">{user.rating}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1.5 font-medium">({user.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          {/* Actions — owner vs visitor */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 flex-shrink-0">
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

                {user.allowEmailContact && user.email && (
                  <a
                    href={`mailto:${user.email}`}
                    className="inline-flex items-center justify-center px-5 py-2 text-sm font-bold rounded-xl text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm transition-all active:scale-95 gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </a>
                )}
                <button
                  onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center px-5 py-2 border border-indigo-200 dark:border-indigo-800 text-sm font-bold rounded-xl text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 shadow-sm transition-all active:scale-95 gap-2"
                >
                  Review
                </button>
                <button
                  onClick={() => setReportOpen(true)}
                  className="px-4 py-2 border border-red-200 dark:border-red-900 text-sm font-bold rounded-xl text-red-500 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm transition-all active:scale-95"
                >
                  Report
                </button>
              </>
            )}
            <ShareButton
              title={`${user.name}'s profile on ReCircle`}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-sm font-bold rounded-xl text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-all active:scale-95"
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 grid grid-cols-3 gap-4 bg-gray-50/60 dark:bg-gray-700/40">
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
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.totalReviews ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Reviews</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stats?.rating ?? '0.0'} ★</p>
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
