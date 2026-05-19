'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import StarRating from './StarRating';
import Link from 'next/link';
import Image from 'next/image';
import { showSuccess } from '@/lib/confirm';

interface Review {
  _id: string;
  reviewer: { _id: string; name: string; profilePicture?: string; gender?: string };
  rating: number;
  comment: string;
  createdAt: string;
  product?: string;
  service?: string;
}

interface ReviewSectionProps {
  targetId: string;
  targetName: string;
  productId?: string;
  serviceId?: string;
}

export default function ReviewSection({ targetId, targetName, productId, serviceId, className = "" }: ReviewSectionProps & { className?: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [ratingCounts, setRatingCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit Review state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  const fetchReviews = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      let url = `/api/reviews?page=${pageNum}&limit=5`;
      if (targetId) url += `&targetId=${targetId}`;
      if (productId) url += `&productId=${productId}`;
      if (serviceId) url += `&serviceId=${serviceId}`;
      
      if (filterRating) url += `&rating=${filterRating}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setReviews(prev => [...prev, ...data.reviews]);
        } else {
          setReviews(data.reviews);
        }
        const avg = data.stats?.averageRating;
        setAverage(avg && !isNaN(avg) ? Number(avg.toFixed(1)) : 0);
        setCount(data.stats?.totalReviews || 0);
        setRatingCounts(data.stats?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        setHasMore(data.pagination?.hasMore || false);
        
        if (!append) {
            setCanReview(data.canReview || false);
            setHasReviewed(data.hasReviewed || false);
        }
      }
    } catch (error) {
      console.error('Failed to load reviews', error);
    } finally {
      setLoading(false);
    }
  }, [targetId, productId, serviceId, filterRating]);

  useEffect(() => {
    if ((!targetId || targetId === 'undefined') && !productId && !serviceId) {
        setLoading(false);
        return;
    }
    setReviews([]);
    setPage(1);
    fetchReviews(1);
  }, [targetId, productId, serviceId, filterRating, fetchReviews]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, productId, serviceId, rating, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      await showSuccess('Review Posted', 'Thank you for your feedback! It helps keeping the community safe.');
      setComment('');
      setRating(5);
      setPage(1);
      setFilterRating(null); // Reset filter to show new review
      fetchReviews(1); // Refresh list
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleEditClick = (review: Review) => {
    setEditingReviewId(review._id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const handleEditSubmit = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: editRating, comment: editComment }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update review');
      }
      setEditingReviewId(null);
      await fetchReviews(1);
      await showSuccess('Review Updated', 'Your feedback was successfully updated.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(5);
    setEditComment('');
  };

  const handleFilterClick = (star: number) => {
    if (filterRating === star) {
       setFilterRating(null); // Toggle off
    } else {
       setFilterRating(star); // Toggle on
    }
  };

  if (loading && page === 1) return <div className="py-4">Loading reviews...</div>;

  return (
    <div className={`transition-colors ${className}`}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
        Reviews {productId || serviceId ? 'for this listing' : `for ${targetName}`}
      </h2>
      
      <div className="flex flex-col md:flex-row gap-4 mb-2 border-b border-gray-50 dark:border-gray-700/50 pb-4">
        
        {/* Left Col: Average */}
        <div className="flex flex-col items-center justify-center md:w-1/3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
           <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-1 tracking-tighter">{Number(average).toFixed(1)}</span>
           <StarRating rating={average} />
           <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1">{count} {productId || serviceId ? 'listing ratings' : 'seller ratings'}</p>
        </div>

        {/* Right Col: Distribution Bars */}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
             const rc = ratingCounts[star] || 0;
             const percentage = count > 0 ? Math.round((rc / count) * 100) : 0;
             const isSelected = filterRating === star;

             return (
               <button 
                  key={star} 
                  onClick={() => handleFilterClick(star)}
                  className={`flex items-center gap-3 group w-full text-left transition-all px-2 py-1 rounded-lg outline-none active:scale-[0.98] ${isSelected ? 'opacity-100 bg-indigo-50 dark:bg-indigo-900/40' : (filterRating ? 'opacity-50 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'opacity-100 hover:opacity-80 hover:bg-gray-50 dark:hover:bg-gray-700/50')}`}
                  title={`Filter by ${star} star reviews`}
                >
                 <div className="w-16 text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center justify-end whitespace-nowrap">
                   {star} star
                 </div>
                 
                 {/* Progress Bar Container */}
                 <div className="flex-1 h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600/50 relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-yellow-400 dark:bg-yellow-500 group-hover:bg-yellow-500 dark:group-hover:bg-yellow-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                 </div>
                 
                 <div className="w-10 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                   {percentage}%
                 </div>
               </button>
             );
          })}
          
          {filterRating && (
             <div className="text-left pt-2">
               <button onClick={() => setFilterRating(null)} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 active:scale-95 transition-all outline-none">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                 Clear filter
               </button>
             </div>
          )}
        </div>
      </div>
      {/* Review Form or Notices */}
      {!user ? (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Please login to write a review.</p>
      ) : user.id === targetId ? (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">You cannot review yourself.</p>
      ) : hasReviewed ? (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm">
              You&apos;ve already shared your feedback for this.
          </div>
      ) : !canReview ? (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-600">
             <p className="font-medium text-gray-900 dark:text-white mb-1">Authentic Reviews Only</p>
             Only users who have completed a verified transaction for this {productId ? 'product' : 'service'} can leave a review. 
             If you&apos;ve bought this, ensure the order is marked as &quot;Completed&quot; in your order history.
          </div>
      ) : (
          <div className="mb-0 border-b border-gray-100 dark:border-white/5 pb-4">
            <form onSubmit={handleSubmit}>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Write a Review</h3>
              {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`w-8 h-8 ${rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                    >
                      <svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                 <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Comment</label>
                 <textarea
                   rows={3}
                   className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-gray-900 dark:text-white bg-white dark:bg-gray-700 transition-colors"
                   value={comment}
                   onChange={(e) => setComment(e.target.value)}
                   placeholder="How was the product and the seller's service?"
                   required
                 />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          </div>
      )}

      <div className="space-y-6">
        {[...reviews].sort((a, b) => {
           if (user && a.reviewer?._id === user.id) return -1;
           if (user && b.reviewer?._id === user.id) return 1;
           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }).map((review) => (
          <div key={review._id} className="flex space-x-4">
             <div className="flex-shrink-0">
               <Link href={`/profile/${review.reviewer?._id || ''}`}>
                 <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold border border-gray-200 dark:border-gray-600 text-base hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer overflow-hidden uppercase">
                     {review.reviewer?.profilePicture && !review.reviewer.profilePicture.includes('??') ? (
                         <Image 
                           src={review.reviewer.profilePicture} 
                           alt={review.reviewer.name || 'User'} 
                           width={40} 
                           height={40} 
                           className="w-full h-full object-cover" 
                           referrerPolicy="no-referrer"
                         />
                     ) : (
                         <span className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {(review.reviewer?.name?.[0] || 'U').toUpperCase()}
                         </span>
                     )}
                 </div>
               </Link>
             </div>
             <div className="flex-1">
               <div className="flex items-center justify-between">
                 <Link href={`/profile/${review.reviewer?._id || ''}`}>
                   <h4 className="text-sm font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer">
                     {review.reviewer?.name || 'Deleted User'}
                   </h4>
                 </Link>
                 <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
               </div>
               {editingReviewId === review._id ? (
                 <form onSubmit={(e) => handleEditSubmit(e, review._id)} className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                   <div className="mb-3">
                     <div className="flex gap-1.5">
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button key={star} type="button" onClick={() => setEditRating(star)} className={`w-6 h-6 ${editRating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-500'}`}>
                           <svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                         </button>
                       ))}
                     </div>
                   </div>
                   <textarea rows={2} className="w-full text-sm rounded-md border-gray-200 dark:border-gray-600 focus:border-indigo-500 p-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-3" value={editComment} onChange={(e) => setEditComment(e.target.value)} required />
                   <div className="flex gap-2">
                     <button type="submit" className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
                     <button type="button" onClick={handleCancelEdit} className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                   </div>
                 </form>
               ) : (
                 <>
                   <div className="mt-1 flex items-center justify-between">
                     <StarRating rating={review.rating} />
                     {user?.id === review.reviewer?._id && (
                       <button onClick={() => handleEditClick(review)} className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">Edit Review</button>
                     )}
                   </div>
                   <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 break-all">{review.comment}</p>
                 </>
               )}
             </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No reviews yet for this listing.</p>}
        {hasMore && (
           <div className="flex justify-center mt-6">
             <button
               onClick={handleLoadMore}
               style={{ opacity: 1, visibility: "visible", display: "inline-flex", minHeight: "48px", backgroundColor: "#4F46E5", color: "white", padding: "10px 24px", borderRadius: "9999px", fontWeight: "bold" }} className="items-center border border-transparent transition-all shadow-md active:scale-95 relative"
             >
               Load More Reviews
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
               </svg>
             </button>
           </div>
        )}
      </div>
    </div>
  );
}
