'use client';

import { useState, useEffect, use } from 'react';
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

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: string;
  status: string;
  location?: {
    city?: string;
    state?: string;
  };
  community?: {
    _id: string;
    name: string;
  };
  seller: {
    _id: string;
    name: string;
    username?: string;
    email: string;
    profilePicture?: string;
  };
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
}

import { formatTimeAgo } from '@/lib/utils';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { user, setUser, refreshUser } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (user && user.wishlist && product) {
        setLiked(user.wishlist.includes(product._id));
    }
  }, [user, product]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!user) {
        router.push('/auth');
        return;
    }
    
    if (!product) return;

    // Optimistic Update
    const isLiked = !liked;
    setLiked(isLiked); 
    
    // Update global user state optimistically
    if (user.wishlist) {
        const newWishlist = isLiked 
            ? [...user.wishlist, product._id]
            : user.wishlist.filter(id => id !== product._id);
            
        setUser({ ...user, wishlist: newWishlist });
    }

    try {
        await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product._id })
        });
    } catch (error) {
        console.error('Wishlist toggle failed', error);
        setLiked(!liked); // Revert local
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
      } else if (res.status === 403) {
        setIsBlocked(true);
      } else {
        // Handle 404
      }
    } catch (error) {
      console.error('Failed to fetch product', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!product || !user) return;
    setUnblocking(true);
    try {
      const res = await fetch(`/api/user/block?userId=${product.seller._id}`, {
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
      title: 'Delete Product?',
      text: 'Are you sure you want to delete this product? This action cannot be undone.',
      dangerMode: true,
      confirmButtonText: 'Delete Product'
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/products');
      }
    } catch (error) {
      console.error('Failed to delete product', error);
      setIsDeleting(false);
    }
  };

  const isBlockedByMe = user?.blockedUsers?.some((id: any) => id.toString() === product?.seller._id.toString());

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
            You are blocked from viewing this listing, or the user has restricted access.
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

  if (!product) return <div className="text-center py-20">Product not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-colors">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
        {/* Image Carousel */}
        <div>
          <ImageCarousel images={product.images} alt={product.title} />
        </div>

        {/* Product Info */}
        <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl break-words">{product.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ShareButton
                title={product.title}
                text={`Check out "${product.title}" on ReCircle — ₹${product.price}`}
                className="px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              />
              {user && user.id !== product.seller._id && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="px-3 py-1.5 text-sm font-semibold border border-red-200 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                >
                  Report
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Posted {formatTimeAgo(product.createdAt)}</p>
          <div className="mt-3">
            <h2 className="sr-only">Product information</h2>
            <p className="text-3xl text-gray-900 dark:text-white">₹{product.price}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
              {product.category}
            </div>
            <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
              {product.condition}
            </div>
            {product.community && typeof product.community === 'object' && (
              <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                🏫 {product.community.name}
              </div>
            )}
            {(product.location?.city || product.location?.state) && (
              <div className="inline-flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {product.location.city}{product.location.city && product.location.state ? ', ' : ''}{product.location.state}
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Seller Information</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-wider">
                    Direct Coordination
                </span>
            </div>
            <Link href={`/profile/${product.seller._id}`} className="flex items-center group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:shadow-md transition-all">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden border border-indigo-200 dark:border-indigo-800 group-hover:border-indigo-400 transition-colors uppercase">
                   {product.seller.profilePicture ? (
                     <Image 
                        src={product.seller.profilePicture} 
                        alt={product.seller.name} 
                        width={40} 
                        height={40} 
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                   ) : (
                     product.seller.name?.charAt(0) || 'U'
                   )}
                </div>
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{product.seller.name}</div>
                <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">@{ product.seller.username || product.seller._id?.toString().slice(-4) }</div>
                
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
                        className={`h-3 w-3 ${ (product.averageRating || 0) >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600' }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">
                    {product.averageRating || '0'} ({product.reviewCount || 0} reviews)
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
                text={product.description} 
                maxLines={5} 
                incrementalLines={20}
                isHtml={false}
                showReadMore={true}
                className="text-base text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>
          
          <div className="mt-10 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Things to Know</h3>
            
            <div className="space-y-4 mb-6">
                <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Direct Coordination</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Connect with the seller via chat to coordinate the pickup point and payment. 
                        Communication is key! Always clarify terms before the exchange.
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Safe Exchange</h4>
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                         <li>Meet in a public, well-lit place on campus.</li>
                         <li>Inspect the item thoroughly before making any payment.</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Terms & Conditions</h4>
                    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                        <li>All sales are final once the physical exchange is complete.</li>
                        <li>Respect each other's time by being punctual for pickups.</li>
                    </ul>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-2">
             {/* Action Buttons or Unblock Button */}
             {product.status === 'Available' && user && user.id !== product.seller._id && isBlockedByMe ? (
                <button
                  type="button"
                  onClick={handleUnblock}
                  disabled={unblocking}
                  className="w-full bg-red-600 text-white rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-red-700 shadow-md shadow-red-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                >
                  {unblocking ? 'Unblocking...' : 'Unblock User to Interact'}
                </button>
             ) : product.status === 'Available' && (!user || user.id !== product.seller._id) && (
               <>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      router.push('/auth');
                      return;
                    }
                    router.push(`/chat/${product.seller._id}?productId=${product._id}`);
                  }}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                >
                  Chat with Seller
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      router.push('/auth');
                      return;
                    }
                    router.push(`/chat/${product.seller._id}?productId=${product._id}&tab=action&autoMsg=true`);
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all active:scale-95"
                >
                  Make an Offer
                </button>
               </>
             )}
            </div>

            {!isBlockedByMe && (
              <div className="flex flex-col sm:flex-row gap-3">
                {product.status === 'Available' && user && user.id !== product.seller._id && (
                    <button
                    type="button"
                    onClick={toggleWishlist}
                    className={`flex-1 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold transition-all active:scale-95 ${liked ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50' : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                    {liked ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </button>
                )}
                {user && user.id === product.seller._id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`flex-1 border-2 border-red-200 dark:border-red-800 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 transition-all active:scale-95 ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Listing'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-12" id="reviews-section">
             {/* Review Section */}
             <ReviewSection targetId={product.seller._id} targetName={product.seller.name} />
          </div>

          {reportOpen && (
            <ReportModal targetUserId={product.seller._id} itemType="product" itemId={product._id} onClose={() => setReportOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
