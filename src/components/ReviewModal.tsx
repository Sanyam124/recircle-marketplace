'use client';

import { useState } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import { showSuccess } from '@/lib/confirm';
import { useAuth } from '@/context/AuthContext';

interface ReviewModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({ order, onClose, onSuccess }: ReviewModalProps) {
  const { user } = useAuth();
  const item = order.product || order.service;
  const isProduct = order.orderType === 'Product';
  const currentUserId = user?.id || (user as any)?._id;
  const isSeller = currentUserId === (order.seller?._id || order.seller)?.toString();
  const targetId = isSeller 
    ? (order.buyer?._id || order.buyer)
    : (order.seller?._id || order.seller);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: siteConfig } = useSWR('/api/site-config');
  const maxChars = siteConfig?.maxReviewChars || 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          orderId: order._id,
          productId: (isProduct && order.transactionType === 'Rent') ? item._id : undefined,
          serviceId: !isProduct ? item._id : undefined,
          rating,
          comment
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      await showSuccess('Review Posted', 'Thank you for your feedback! It helps keeping the community safe.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {isSeller ? 'Review Buyer' : (
                isProduct 
                  ? (order.transactionType === 'Rent' ? 'Review Rental Item' : 'Review Seller') 
                  : 'Review Service Provider'
              )}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Share your experience with the community</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            
            {/* Item Info Card */}
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-950/40 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
               <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shrink-0 border border-gray-200 dark:border-zinc-800">
                  {item?.images?.[0] ? (
                    <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                       <svg className="w-6 h-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                  )}
               </div>
               <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate text-sm">{item?.title}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{isProduct ? 'Product' : 'Service'} • ₹{order.itemPrice}</p>
               </div>
            </div>

            {/* Error Message */}
            {error && (
               <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  {error}
               </div>
            )}

            {/* Rating Stars */}
            <div className="text-center">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Overall Rating</label>
              <div className="flex justify-center gap-2.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="group outline-none whitespace-nowrap active:scale-[0.85] transition-transform"
                  >
                    <svg 
                      className={`w-10 h-10 transition-colors drop-shadow-sm ${rating >= star ? 'text-yellow-400' : 'text-gray-200 dark:text-zinc-700 hover:text-gray-300 dark:hover:text-zinc-600'}`} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest h-4">
                 {rating === 1 && 'Awful'}
                 {rating === 2 && 'Poor'}
                 {rating === 3 && 'Average'}
                 {rating === 4 && 'Good'}
                 {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Comment Field */}
            <div className="space-y-1.5">
               <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Your Feedback</label>
                  <span className={`text-[10px] font-bold ${comment.length >= maxChars ? 'text-red-500' : 'text-gray-400'}`}>{comment.length}/{maxChars}</span>
               </div>
               <textarea
                 rows={4}
                 maxLength={maxChars}
                 className="w-full rounded-2xl border-gray-200 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-4 border text-gray-900 dark:text-white bg-white dark:bg-gray-900/70 transition-all outline-none resize-none"
                 value={comment}
                 onChange={(e) => setComment(e.target.value)}
                 placeholder="What did you like or dislike? Your feedback helps the community stay safe and trust each other."
                 required
               />
            </div>

          </div>

          <div className="p-6 bg-gray-50 dark:bg-zinc-800/30 flex gap-3 border-t border-gray-100 dark:border-zinc-800/50">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 py-3 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={submitting}
               className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95 disabled:opacity-50"
             >
               {submitting ? 'Sharing Feedback...' : 'Post and Finish'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
