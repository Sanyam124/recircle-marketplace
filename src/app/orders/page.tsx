'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { OrderRowSkeleton } from '@/components/Skeletons';
import { useAuth } from '@/context/AuthContext';
import NextImage from 'next/image';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';
import ReviewModal from '@/components/ReviewModal';
import useSWR from 'swr';


function OrdersPageContent() {
  const { user, loading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>((searchParams.get('tab') as 'buyer' | 'seller') || 'buyer');
  
  const bPage = parseInt(searchParams.get('bPage') || '1');
  const sPage = parseInt(searchParams.get('sPage') || '1');

  // SWR Fetching
  const { data: buyerData, error: buyerError, isLoading: buyerLoading, mutate: mutateBuyer } = useSWR(
    user && activeTab === 'buyer' ? `/api/orders?role=buyer&page=${bPage}&limit=10` : null,
    { refreshInterval: 10000 }
  );

  const { data: sellerData, error: sellerError, isLoading: sellerLoading, mutate: mutateSeller } = useSWR(
    user && activeTab === 'seller' ? `/api/orders?role=seller&page=${sPage}&limit=10` : null,
    { refreshInterval: 10000 }
  );

  const isRateLimited = buyerError?.status === 429 || sellerError?.status === 429;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=${encodeURIComponent('/orders')}`);
    }
  }, [user, authLoading, router]);

  // Sync state to URL 
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    const params = new URLSearchParams();
    params.set('tab', activeTab);
    if (bPage > 1) params.set('bPage', bPage.toString());
    if (sPage > 1) params.set('sPage', sPage.toString());
    
    // Check if we already have an orderId to preserve
    const orderId = searchParams.get('orderId');
    if (orderId) params.set('orderId', orderId);

    const queryString = params.toString();
    const url = `/orders${queryString ? `?${queryString}` : ''}`;
    router.push(url, { scroll: false });
  }, [activeTab, bPage, sPage, router, searchParams]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId) {
      setTimeout(() => {
        const el = document.getElementById(`order-${orderId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-4', 'dark:ring-offset-gray-900');
          setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-4', 'dark:ring-offset-gray-900'), 3000);
        }
      }, 800);
    }
  }, [searchParams]);

  const [otpModalData, setOtpModalData] = useState<{ id: string, type: 'Product' | 'Service_Appointment', role: 'buyer' | 'seller', order: any } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [submittingOTP, setSubmittingOTP] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);

  const buyerOrders = buyerData?.orders || [];
  const buyerTotalPages = buyerData?.pagination?.totalPages || 1;

  const sellerOrders = sellerData?.orders || [];
  const sellerTotalPages = sellerData?.pagination?.totalPages || 1;

  const submitOTP = async () => {
    if (!otpModalData || otpCode.length < 6) return;
    setSubmittingOTP(true);
    const action = otpModalData.type === 'Product' ? 'complete_delivery' : 'complete_appointment';
    try {
      const res = await authFetch(`/api/orders/${otpModalData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, otp: otpCode }),
      });
      if (res.ok) {
        mutateBuyer();
        mutateSeller();
        setOtpModalData(null);
        setOtpCode('');
        showSuccess('Verification Successful', 'Transaction has been completed.');
      } else if (res.status === 429) {
          // Handled globally by authFetch
      } else {
          const errData = await res.json();
          showError('Verification Failed', errData.error || 'Check the code and try again.');
      }
    } catch (err) {
      console.error(err);
      showError('System Error', 'Something went wrong during verification.');
    } finally {
      setSubmittingOTP(false);
    }
  };

  const handleCancelOrder = async (orderId: string, role: 'buyer' | 'seller') => {
    const confirmed = await confirmAction({
        title: 'Cancel Transaction?',
        text: 'Are you sure you want to cancel this order? This action cannot be undone and will revert the item to available.',
        dangerMode: true,
        confirmButtonText: 'Yes, Cancel'
    });
    if (!confirmed) return;
    
    try {
      const res = await authFetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) {
        mutateBuyer();
        mutateSeller();
      }
    } catch (err: any) {
      console.error('Cancel order error:', err);
    }
  };



  if (authLoading || !user) return <div className="max-w-5xl mx-auto px-4 py-12"><OrderRowSkeleton /><OrderRowSkeleton /><OrderRowSkeleton /></div>;

  return (
    <div className="min-h-screen-dynamic bg-[#f5f6f9] dark:bg-gray-900 pt-8 pb-20 transition-all duration-300 overflow-x-clip">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12 flex flex-col gap-2">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-950 dark:text-white tracking-tighter italic leading-none">
              My Orders
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold tracking-tight">Track your purchases, sales, and service bookings here.</p>
        </div>

        {/* Tabs */}
        <div className="inline-flex p-1.5 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[1.5rem] mb-12 overflow-hidden border border-white/50 dark:border-gray-700/50 shadow-inner max-w-full overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('buyer')}
            className={`flex items-center gap-2 py-3 px-8 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
              activeTab === 'buyer' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5 dark:ring-white/5 italic' 
                : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            🛒 Purchases
          </button>
          <button
            onClick={() => setActiveTab('seller')}
            className={`flex items-center gap-2 py-3 px-8 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
              activeTab === 'seller' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5 dark:ring-white/5 italic' 
                : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            💼 My Business
          </button>
        </div>

        <div id="orders-top">
          {(() => {
            if (activeTab === 'buyer') {
              if (buyerLoading) return <div>{[...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)}</div>;
              if (buyerOrders.length === 0) {
                return (
                  <div className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-[3rem] p-16 text-center border border-white/40 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
                    <p className="text-gray-500 dark:text-gray-400 text-xl font-bold tracking-tight italic mb-8">You haven't bought anything yet.</p>
                    <Link href="/explore" className="inline-flex items-center gap-2 px-8 py-4 bg-gray-950 dark:bg-white text-white dark:text-gray-950 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 italic">
                      <span>Explore Marketplace</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </Link>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {buyerOrders.map((order: any) => (
                    <OrderRow key={order._id} order={order} role="buyer" onCancel={() => handleCancelOrder(order._id, 'buyer')} onOpenOtpModal={() => setOtpModalData({ id: order._id, type: order.orderType, role: 'buyer', order })} onOpenReview={() => setReviewOrder(order)} />
                  ))}
                  <PaginationControls 
                    page={bPage} 
                    totalPages={buyerTotalPages} 
                    onPageChange={(p) => {
                       const params = new URLSearchParams(searchParams.toString());
                       params.set('bPage', p.toString());
                       router.push(`/orders?${params.toString()}`, { scroll: false });
                    }} 
                    scrollTargetId="orders-top" 
                  />
                </div>
              );
            } else {
              if (sellerLoading) return <div>{[...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)}</div>;
              if (sellerOrders.length === 0) {
                return (
                  <div className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-[3rem] p-16 text-center border border-white/40 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
                    <p className="text-gray-500 dark:text-gray-400 text-xl font-bold tracking-tight italic mb-8">You haven't made any sales yet.</p>
                    <Link href="/profile" className="inline-flex items-center gap-2 px-8 py-4 bg-gray-950 dark:bg-white text-white dark:text-gray-950 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 italic">
                      <span>View My Profile</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </Link>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {sellerOrders.map((order: any) => (
                    <OrderRow key={order._id} order={order} role="seller" onCancel={() => handleCancelOrder(order._id, 'seller')} onOpenOtpModal={() => setOtpModalData({ id: order._id, type: order.orderType, role: 'seller', order })} onOpenReview={() => {}} />
                  ))}
                  <PaginationControls 
                    page={sPage} 
                    totalPages={sellerTotalPages} 
                    onPageChange={(p) => {
                       const params = new URLSearchParams(searchParams.toString());
                       params.set('sPage', p.toString());
                       router.push(`/orders?${params.toString()}`, { scroll: false });
                    }} 
                    scrollTargetId="orders-top" 
                  />
                </div>
              );
            }
          })()}
        </div>
      </div>

      {otpModalData && <OTPModal data={otpModalData} code={otpCode} setCode={setOtpCode} onSubmit={submitOTP} onCancel={() => setOtpModalData(null)} submitting={submittingOTP} />}
      {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} onSuccess={() => { mutateBuyer(); mutateSeller(); setReviewOrder(null); }} />}
    </div>
  );
}

function PaginationControls({ page, totalPages, onPageChange, scrollTargetId }: { page: number; totalPages: number; onPageChange: (p: number) => void; scrollTargetId?: string }) {
  if (totalPages <= 1) return null;
  const go = (p: number) => { if (scrollTargetId) document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); onPageChange(p); };
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      <button onClick={() => go(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2).map(p => (
        <button key={p} onClick={() => go(p)} className={`w-8 h-8 text-sm font-bold rounded-lg transition-colors ${ p === page ? 'bg-indigo-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' }`} >{p}</button>
      ))}
      <button onClick={() => go(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" >Next</button>
    </div>
  );
}

function OTPModal({ data, code, setCode, onSubmit, onCancel, submitting }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.7)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-700">
        <div className="p-8 border-b border-gray-50 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/10 dark:bg-gray-900/10">
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic opacity-80">Verify Handoff</h3>
          <button onClick={onCancel} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-50 dark:bg-gray-900/50 rounded-xl hover:rotate-90 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100/50 dark:border-indigo-900/30 animate-pulse"><svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 leading-relaxed px-4">{data.type === 'Product' ? 'Confirm physical delivery by entering the 6-digit code from the buyer.' : 'Verify service attendance with the 6-digit code from the provider.'}</p>
          <input 
            type="text" 
            maxLength={6} 
            autoFocus 
            value={code} 
            onChange={(e) => setCode(e.target.value.replace(/\s/g, '').toUpperCase())} 
            className="w-full text-center text-4xl font-black italic tracking-[0.25em] text-indigo-700 dark:text-indigo-400 bg-gray-50/50 dark:bg-gray-950/50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl py-6 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 transition-all outline-none shadow-inner" 
            placeholder="••••••" 
          />
          <button 
             onClick={onSubmit} 
             disabled={code.length !== 6 || submitting} 
             className="w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 disabled:scale-[0.98] uppercase tracking-[0.15em] text-sm shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 group"
          >
            {submitting ? 'Verifying Identity...' : (
                <span className="flex items-center justify-center gap-2">
                    Confirm Completion
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, role, onCancel, onOpenOtpModal, onOpenReview }: any) {
  const item = order.product || order.service;
  const isProduct = order.orderType === 'Product';
  const otherParty = role === 'buyer' ? order.seller : order.buyer;
  const otherPartyLabel = role === 'buyer' ? (isProduct ? 'Seller' : 'Provider') : 'Buyer';
  
  const itemLink = item ? `/${isProduct ? 'products' : 'services'}/${item._id}` : '#';
  const itemTitle = item?.title || (isProduct ? 'Product Removed' : 'Service Removed');
  
  return (
    <div id={`order-${order._id}`} className="group bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-gray-700/50 overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-indigo-900/50">
      <div className="p-4 sm:p-6 flex-1 flex flex-col sm:flex-row gap-5 min-w-0">
        <Link href={itemLink} className="block w-full sm:w-28 h-28 sm:h-28 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden shrink-0 relative shadow-inner border border-gray-100 dark:border-gray-800">
          {item?.images?.[0] ? <NextImage src={item.images[0]} alt={itemTitle} fill className="object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="flex h-full w-full items-center justify-center text-gray-300 bg-gray-100 dark:bg-gray-800"><svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>}
        </Link>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
            <Link href={itemLink} className="flex-1 font-black text-gray-900 dark:text-white text-lg sm:text-xl hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1 tracking-tight min-w-0">{itemTitle}</Link>
            <div className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest shrink-0 border mt-1 ${
              order.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' : 
              order.status === 'Cancelled' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50' : 
              'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50 shadow-sm'
            }`}>{order.status}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="font-black text-gray-950 dark:text-gray-100 italic tracking-tighter text-base">₹{order.itemPrice.toLocaleString()}</span>
            {order.transactionType === 'Rent' && (
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-lg border border-indigo-100 dark:border-indigo-800/50 uppercase italic tracking-tighter">
                per {order.rentUnit}
              </span>
            )}
            <span className="opacity-30">•</span>
            <span className="font-bold">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {order.transactionType === 'Rent' && order.rentDuration && (
              <>
                <span className="opacity-30">•</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200 dark:border-gray-700">
                  {order.rentDuration} {order.rentUnit}{order.rentDuration > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          <div className="mt-auto flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 w-fit max-w-full min-w-0">
            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest ml-1">{otherPartyLabel}</span>
            {otherParty ? (
              <Link href={`/profile/${otherParty._id}`} className="font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 truncate pr-2 group/user transition-colors min-w-0">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border-2 border-white dark:border-gray-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden shadow-sm group-hover/user:scale-110 transition-transform">{otherParty.profilePicture ? <NextImage src={otherParty.profilePicture} alt={otherParty.name} width={24} height={24} className="w-full h-full object-cover" /> : otherParty.name?.charAt(0)}</div>
                <span className="truncate">{otherParty.name}</span>
              </Link>
            ) : <span className="text-gray-400 font-bold italic py-1 px-2">User Departed</span>}
          </div>
        </div>
      </div>
      
      {order.status === 'Scheduled' && (
        <div className="bg-gray-50/50 dark:bg-gray-900/40 border-t md:border-l border-gray-100 dark:border-gray-800 p-6 w-full md:w-64 shrink-0 flex flex-col justify-center gap-4 transition-colors">
          {role === 'buyer' && (
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Secret Verification Code</p>
                <p className="text-3xl font-black italic tracking-widest text-indigo-600 font-mono">{order.verificationCode}</p>
            </div>
          )}
          {role === 'seller' && (
            <button 
                onClick={onOpenOtpModal} 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 group"
            >
                Confirm Handoff
                <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </button>
          )}
          
          <Link 
            href={item ? `/chat/${otherParty?._id}?${isProduct ? `productId=${item._id}` : `serviceId=${item._id}`}` : `/chat/${otherParty?._id}`} 
            className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest rounded-2xl text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95"
          >
            Message {otherPartyLabel}
          </Link>
          
          <button onClick={onCancel} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 hover:underline transition-colors opacity-60 hover:opacity-100">Cancel Entire Deal</button>
        </div>
      )}

      {order.status === 'Completed' && (
         <div className="bg-gray-50/50 dark:bg-gray-900/40 border-t md:border-l border-gray-100 dark:border-gray-800 p-6 w-full md:w-64 shrink-0 flex flex-col justify-center gap-4">
            {role === 'buyer' && !order.isReviewed && (
                <button 
                  onClick={onOpenReview} 
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:scale-125" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <span>
                    {isProduct 
                      ? (order.transactionType === 'Rent' ? 'Review Rental' : 'Review Seller') 
                      : 'Review Service'
                    }
                  </span>
                </button>
            )}
            <Link 
                href={item ? `/chat/${otherParty?._id}?${isProduct ? `productId=${item._id}` : `serviceId=${item._id}`}` : `/chat/${otherParty?._id}`} 
                className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest rounded-2xl text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95"
            >
                Message Again
            </Link>
         </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12"><OrderRowSkeleton /><OrderRowSkeleton /><OrderRowSkeleton /></div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
