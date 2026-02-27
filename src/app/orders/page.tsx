'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

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

export default function OrdersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabOption = urlParams.get('tab');
    if (tabOption === 'buyer' || tabOption === 'seller') {
      setActiveTab(tabOption);
    }
  }, []);

  const [buyerOrders, setBuyerOrders] = useState<any[]>([]);
  const [buyerPagination, setBuyerPagination] = useState({ page: 1, totalPages: 1 });
  const [buyerLoading, setBuyerLoading] = useState(true);

  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerPagination, setSellerPagination] = useState({ page: 1, totalPages: 1 });
  const [sellerLoading, setSellerLoading] = useState(true);

  const [otpModalData, setOtpModalData] = useState<{ id: string, type: 'Product' | 'Service_Appointment', role: 'buyer' | 'seller', order: any } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [submittingOTP, setSubmittingOTP] = useState(false);

  useEffect(() => {
    if (user) {
      if (activeTab === 'buyer') {
        fetchBuyerOrders(buyerPagination.page);
      } else if (activeTab === 'seller') {
        fetchSellerOrders(sellerPagination.page);
      }
    }
  }, [user, activeTab, buyerPagination.page, sellerPagination.page]);

  const fetchBuyerOrders = async (page: number) => {
    setBuyerLoading(true);
    try {
      const res = await fetch(`/api/orders?role=buyer&page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setBuyerOrders(data.orders || []);
        setBuyerPagination(data.pagination || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuyerLoading(false);
    }
  };

  const fetchSellerOrders = async (page: number) => {
    setSellerLoading(true);
    try {
      const res = await fetch(`/api/orders?role=seller&page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSellerOrders(data.orders || []);
        setSellerPagination(data.pagination || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSellerLoading(false);
    }
  };

  const submitOTP = async () => {
    if (!otpModalData || otpCode.length < 4) return;
    setSubmittingOTP(true);
    
    const action = otpModalData.type === 'Product' ? 'complete_delivery' : 'complete_appointment';
    
    try {
      const res = await fetch(`/api/orders/${otpModalData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, otp: otpCode }),
      });
      const data = await res.json();
      
      if (res.ok) {
        if (activeTab === 'buyer') fetchBuyerOrders(buyerPagination.page);
        else fetchSellerOrders(sellerPagination.page);
        setOtpModalData(null);
        setOtpCode('');
      } else {
        alert(data.error || 'Failed to verify code.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while verifying the code.');
    } finally {
      setSubmittingOTP(false);
    }
  };

  const handleCancelOrder = async (orderId: string, role: 'buyer' | 'seller') => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) {
        if (role === 'buyer') fetchBuyerOrders(buyerPagination.page);
        else fetchSellerOrders(sellerPagination.page);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel order.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-8 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">My Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your purchases, sales, and appointments securely.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-gray-200/50 dark:bg-gray-800 rounded-2xl mb-8 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('buyer')}
            className={`flex-1 flex justify-center py-2.5 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'buyer' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            My Purchases & Bookings
          </button>
          <button
            onClick={() => setActiveTab('seller')}
            className={`flex-1 flex justify-center py-2.5 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'seller' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            My Sales & Services
          </button>
        </div>

        {/* Tab Content */}
        <div id="orders-top">
          {(() => {
            if (activeTab === 'buyer') {
              if (buyerLoading) return <Loader />;
              if (buyerOrders.length === 0) {
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">You haven't bought anything yet.</p>
                    <Link href="/explore" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Explore Marketplace</Link>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {buyerOrders.map(order => (
                    <OrderRow key={order._id} order={order} role="buyer" onCancel={() => handleCancelOrder(order._id, 'buyer')} onOpenOtpModal={() => setOtpModalData({ id: order._id, type: order.orderType, role: 'buyer', order })} />
                  ))}
                  <PaginationControls page={buyerPagination.page} totalPages={buyerPagination.totalPages} onPageChange={(p) => setBuyerPagination({ ...buyerPagination, page: p })} scrollTargetId="orders-top" />
                </div>
              );
            } else {
              if (sellerLoading) return <Loader />;
              if (sellerOrders.length === 0) {
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">You haven't made any sales yet.</p>
                    <Link href="/profile" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 font-bold hover:underline">View My Profile</Link>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {sellerOrders.map(order => (
                    <OrderRow key={order._id} order={order} role="seller" onCancel={() => handleCancelOrder(order._id, 'seller')} onOpenOtpModal={() => setOtpModalData({ id: order._id, type: order.orderType, role: 'seller', order })} />
                  ))}
                  <PaginationControls page={sellerPagination.page} totalPages={sellerPagination.totalPages} onPageChange={(p) => setSellerPagination({ ...sellerPagination, page: p })} scrollTargetId="orders-top" />
                </div>
              );
            }
          })()}
        </div>

      </div>

      {/* OTP Modal */}
      {otpModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Handoff</h3>
              <button onClick={() => { setOtpModalData(null); setOtpCode(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-6">
                {otpModalData.type === 'Product' 
                   ? 'Please enter the 4-digit code provided to the buyer to confirm physical delivery.'
                   : 'Please enter the 4-digit code provided by the service provider to verify attendance.'}
              </p>
              
              <input 
                type="text"
                maxLength={4}
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center text-4xl font-mono tracking-[0.5em] font-bold text-indigo-700 dark:text-indigo-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="0000"
              />
              
              <button 
                onClick={submitOTP}
                disabled={otpCode.length !== 4 || submittingOTP}
                className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingOTP ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────────────

function OrderRow({ order, role, onCancel, onOpenOtpModal }: { order: any; role: 'buyer' | 'seller'; onCancel: () => void; onOpenOtpModal: () => void }) {
  const item = order.product || order.service;
  const isProduct = order.orderType === 'Product';
  const otherParty = role === 'buyer' ? order.seller : order.buyer;
  const otherPartyLabel = role === 'buyer' ? (isProduct ? 'Seller' : 'Provider') : 'Buyer';
  
  if (!item) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row">
      <div className="p-5 flex-1 flex flex-col sm:flex-row gap-5">
        
        {/* Item Image */}
        <Link href={`/${isProduct ? 'products' : 'services'}/${item._id}`} className="block w-full sm:w-28 h-28 sm:h-24 bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden shrink-0 relative group">
          {item?.images?.[0] ? (
            <Image src={item.images[0]} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors pointer-events-none" />
        </Link>
        
        {/* Item Info */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <Link href={`/${isProduct ? 'products' : 'services'}/${item._id}`} className="font-bold text-gray-900 dark:text-white text-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
              {item.title}
            </Link>
            <div className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide shrink-0 ${
              order.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              order.status === 'Cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' :
              order.status === 'Scheduled' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-700' :
              'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {order.status === 'Scheduled' ? (isProduct ? 'Handoff Pending' : 'Appt. Scheduled') : order.status}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">₹{order.itemPrice.toLocaleString()}</span>
            <span>•</span>
            <span className="capitalize">{isProduct ? 'Product' : 'Service'}</span>
            <span>•</span>
            <span className="truncate">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          
          <div className="mt-auto flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{otherPartyLabel}:</span>
            {otherParty ? (
              <Link href={`/profile/${otherParty._id}`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 truncate">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] shrink-0">
                  {otherParty.name?.charAt(0) || 'U'}
                </div>
                {otherParty.name}
              </Link>
            ) : <span className="text-gray-400 font-medium">Deleted User</span>}
          </div>
        </div>
      </div>
      
      {/* Active Actions Block */}
      {order.status === 'Scheduled' && (
        <div className="bg-gray-50/50 dark:bg-gray-800/50 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 p-5 w-full md:w-64 flex flex-col justify-center gap-3 shrink-0">
          
          {/* BUYER VIEW for Products (Shows Code) */}
          {role === 'buyer' && isProduct && (
            <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-sm">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Your Delivery Code</p>
               <p className="text-2xl font-mono tracking-[0.2em] font-black text-indigo-600 dark:text-indigo-400">{order.verificationCode}</p>
               <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1.5">Show this to the seller<br/>when receiving the item.</p>
            </div>
          )}

          {/* PROVIDER VIEW for Services (Shows Code) */}
          {role === 'seller' && !isProduct && (
            <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-sm">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Your Appointment Code</p>
               <p className="text-2xl font-mono tracking-[0.2em] font-black text-indigo-600 dark:text-indigo-400">{order.verificationCode}</p>
               <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1.5">Provide this to the student<br/>after completing the session.</p>
            </div>
          )}

          {/* SELLER VIEW for Products (Inputs Code) */}
          {role === 'seller' && isProduct && (
            <button
               onClick={onOpenOtpModal}
               className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm text-center"
            >
               Confirm Delivery...
            </button>
          )}

          {/* BUYER VIEW for Services (Inputs Code) */}
          {role === 'buyer' && !isProduct && (
            <button
               onClick={onOpenOtpModal}
               className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm text-center"
            >
               Complete Appointment...
            </button>
          )}

          {/* Common Actions */}
          <Link href={`/chat/${otherParty?._id}`} className="w-full py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl transition-colors text-center shadow-sm">
             Message
          </Link>

          <button onClick={onCancel} className="text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mt-1 transition-colors underline underline-offset-2">
             Cancel Transaction
          </button>
        </div>
      )}

      {/* Completed / Cancelled Actions */}
      {order.status !== 'Scheduled' && (
        <div className="bg-gray-50/50 dark:bg-gray-800/50 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 p-5 w-full md:w-48 flex flex-col justify-center gap-3 shrink-0">
           {order.status === 'Completed' && role === 'buyer' && (
             <Link href={`/${isProduct ? 'products' : 'services'}/${item._id}#reviews`} className="w-full py-2.5 px-4 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 border border-indigo-200 dark:border-indigo-800 font-bold text-sm rounded-xl transition-colors text-center">
                Leave Review
             </Link>
           )}
           <Link href={`/${isProduct ? 'products' : 'services'}/${item._id}`} className="w-full py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl transition-colors text-center shadow-sm">
             View Listing
           </Link>
        </div>
      )}
    </div>
  );
}
