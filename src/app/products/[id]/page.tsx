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
import LocationViewer from '@/components/LocationViewer';
import AdBanner from '@/components/AdBanner';
import Image from 'next/image';
import { confirmAction, showError } from '@/lib/confirm';
import { formatTimeAgo } from '@/lib/utils';

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  rentPrice?: number;
  rentUnit?: string;
  forRent?: boolean;
  forSell?: boolean;
  images: string[];
  category: string;
  condition: string;
  status: string;
  visibility: 'Public' | 'Community';
  location?: {
    city?: string;
    state?: string;
    pincode?: string;
    area?: string;
    coordinates?: [number, number];
    hostel?: string;
    room?: number;
    bed?: number;
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
    if (!user) { router.push('/auth'); return; }
    if (!product) return;

    const isLiked = !liked;
    setLiked(isLiked); 
    
    if (user.wishlist) {
        const newWishlist = isLiked 
            ? [...user.wishlist, product._id]
            : user.wishlist.filter(item => item !== product._id);
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
        setLiked(!liked);
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
        setProduct(null);
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
      title: 'Delete Listing?',
      text: 'Are you sure you want to delete this listing? This action cannot be undone.',
      dangerMode: true,
      confirmButtonText: 'Delete Listing'
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/explore');
      } else {
        const errorData = await res.json();
        showError('Deletion Blocked', errorData.error || 'Failed to delete listing.');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Failed to delete product', error);
      showError('System Error', 'An unexpected error occurred. Please try again.');
      setIsDeleting(false);
    }
  };

  const isBlockedByMe = user?.blockedUsers?.some((id: any) => id.toString() === product?.seller._id.toString());
  const isOwner = user?.id === product?.seller._id;

  if (loading) return <DetailSkeleton />;
  
  if (isBlocked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-12 border-2 border-red-100 dark:border-red-900/30 shadow-xl text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            You can't see this product.
          </p>
          <button 
            onClick={() => router.push('/explore')}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
          >
            Explore Marketplace
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-3xl p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight">Item Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            This product may have been deleted by the seller or removed from the marketplace.
          </p>
          <button 
            onClick={() => router.push('/explore')}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            Return to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-40 sm:pb-20 w-full min-w-0">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
        {/* Left Column: Image Carousel + Details */}
        <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto lg:max-w-none">
          {/* Mobile Meta Actions (Fixed Single Line) */}
          <div className="lg:hidden flex items-center justify-between gap-2 px-1 pb-2">
             <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                  product.status === 'Available' 
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'Available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-rose-500 animate-pulse'}`} />
                {product.status === 'Available' ? 'Available' : 'Sold'}
             </div>
             
             <div className="flex items-center gap-2">
                <ShareButton
                  title={product.title}
                  className="p-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter px-3 shadow-sm active:scale-95"
                />
                {user && !isOwner && product.status === 'Available' && (
                  <button
                    onClick={() => setReportOpen(true)}
                    className="p-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all text-[9px] font-black uppercase tracking-tighter px-3 flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                    Report
                  </button>
                )}
             </div>
          </div>

          <div className="relative group rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-xl sm:shadow-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111] transition-all duration-500 hover:shadow-indigo-500/10">
            <ImageCarousel images={product.images || []} alt={product.title} />
            {/* Mobile Hovering Wishlist Button */}
            {user && (
              <button
                onClick={toggleWishlist}
                className={`sm:hidden absolute top-4 right-4 z-[100] p-3 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 border ${
                  liked 
                    ? 'bg-rose-50/90 text-rose-600 border-rose-200/50 dark:bg-rose-500/20 dark:text-rose-500 dark:border-rose-500/30' 
                    : 'bg-white/90 text-gray-600 border-white/50 dark:bg-black/40 dark:text-white dark:border-white/10 hover:text-gray-900'
                }`}
              >
                <svg className={`w-6 h-6 ${liked ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* Description Card (Desktop Only) */}
          <div className="hidden lg:block bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-[2rem] sm:rounded-3xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              Description
            </h3>
            <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-normal whitespace-pre-wrap">
              <ExpandableText text={product.description} maxLines={10} className="text-gray-800 dark:text-gray-300" showReadMore={true} scrollOnCollapse={true} />
            </div>
          </div>

           {/* Reviews Card (Desktop Only) */}
             <ReviewSection 
                targetId={product.seller._id} 
                targetName={product.seller.name} 
                productId={(product.forSell !== false && !product.forRent) ? undefined : product._id} 
                className="hidden lg:block bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-[2rem] sm:rounded-3xl p-5 sm:p-6 shadow-sm"
              />
        </div>

        {/* Right Column: Information */}
        <div className="flex flex-col gap-4 mt-4 lg:mt-0 max-w-2xl mx-auto lg:max-w-none w-full">
          {/* Header & Meta */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-[2rem] sm:rounded-3xl p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 shadow-sm">
            <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">

                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                  product.status === 'Available' 
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${product.status === 'Available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
                  {product.status === 'Available' ? 'Available' : 'Sold'}
                </div>
              </div>
              
              <div className="flex gap-2 self-start sm:self-auto">
                <ShareButton
                  title={product.title}
                  className="p-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#333] transition-all flex items-center gap-2 text-xs font-bold px-4 shadow-sm"
                />
                {user && !isOwner && product.status === 'Available' && (
                  <button
                    onClick={() => setReportOpen(true)}
                    className="p-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] rounded-xl text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-[#333] hover:border-red-200 dark:hover:border-rose-900/50 transition-all text-xs font-bold px-4 flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                    Report
                  </button>
                )}
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight break-words">
              {product.title}
            </h1>

            {/* Pricing Section */}
            <div className="flex flex-col gap-2 py-2">
                {product.forSell !== false && product.price !== undefined && product.price !== null && (
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                      ₹{product.price?.toLocaleString()}
                    </span>
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-md text-[10px] font-black uppercase tracking-tight">
                      Sale price
                    </span>
                  </div>
                )}

                {product.forRent && (
                  <div className="flex flex-wrap items-baseline gap-4 mt-2">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                      ₹{product.rentPrice?.toLocaleString()}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-md text-[10px] font-black uppercase tracking-tight">
                      {product.rentUnit?.split(' ').pop()}
                    </span>
                  </div>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-y-3 gap-x-6 pt-2 border-t border-gray-100 dark:border-[#2a2a2a] mt-2">
               <span className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Posted {formatTimeAgo(product.createdAt)}
               </span>
               <span className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                  {product.visibility === 'Community' || (!product.visibility && product.community)
                    ? (product.community?.name || 'Campus Listing')
                    : (product.location ? [product.location.area, product.location.city, product.location.state].filter(Boolean).join(', ') || 'Location unknown' : 'Location unknown')}
               </span>
            </div>
          </div>

          {/* Description Card (Mobile Only) */}
          <div className="lg:hidden bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-[2rem] sm:rounded-3xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              Description
            </h3>
            <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-normal whitespace-pre-wrap">
              <ExpandableText text={product.description} maxLines={10} className="text-gray-800 dark:text-gray-300" showReadMore={true} scrollOnCollapse={true} />
            </div>
          </div>

          {/* Seller Card */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm group">
            <div className="flex items-center gap-4">
              <Link href={`/profile/${product.seller._id}`} className="relative h-14 w-14 rounded-full overflow-hidden border border-gray-200 dark:border-[#3a3a3a] shadow-sm flex-shrink-0 flex items-center justify-center">
                  {product.seller.profilePicture && !product.seller.profilePicture.includes('??') ? (
                    <Image src={product.seller.profilePicture} alt={product.seller.name} fill className="object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                        {(product.seller.name?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <Link href={`/profile/${product.seller._id}`} className="text-lg font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
                    {product.seller.name}
                  </Link>
                  <Link href={`/profile/${product.seller._id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 group/link shrink-0 ml-2">
                    View <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest hidden sm:block">Seller</p>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-[#3a3a3a] rounded-full hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <span className="flex text-xs space-x-[2px]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className={`w-3.5 h-3.5 ${star <= Math.round(product.averageRating || 0) ? "text-yellow-400 dark:text-yellow-500" : "text-gray-200 dark:text-gray-700"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{product.reviewCount || 0} reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Grid 2x2 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl sm:rounded-[2rem] flex flex-col gap-1.5 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors group shadow-sm">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Category</span>
              <span className="text-sm sm:text-md font-bold text-indigo-700 dark:text-indigo-400">{product.category}</span>
            </div>
            <div className="p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl sm:rounded-[2rem] flex flex-col gap-1.5 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-colors group shadow-sm">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Condition</span>
              <span className="text-sm sm:text-md font-bold text-emerald-700 dark:text-emerald-400">{product.condition}</span>
            </div>
            <div className="p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl sm:rounded-[2rem] flex flex-col gap-1.5 hover:border-amber-300 dark:hover:border-amber-500/30 transition-colors group shadow-sm">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Listing Type</span>
              <span className="text-sm sm:text-md font-bold text-amber-600 dark:text-amber-500">
                {product.forSell !== false && product.forRent ? 'Sale + Rent' : product.forRent ? 'Rent' : 'Sale'}
              </span>
            </div>
            <div className="p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl sm:rounded-[2rem] flex flex-col gap-1.5 hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors group shadow-sm">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Visibility</span>
              <span className="text-sm sm:text-md font-bold text-blue-600 dark:text-blue-400">{product.visibility || 'Public'}</span>
            </div>
          </div>

          {/* Location Display */}
          <LocationViewer 
            visibility={product.visibility} 
            location={product.location} 
          />
          
          {/* Action Buttons Stack */}
          <div className="flex flex-col gap-3 mt-2 sm:mt-4">
            {user && isOwner && (product.status !== 'Sold' && product.status !== 'Completed') ? (
                <button 
                  onClick={handleDelete} 
                  disabled={isDeleting} 
                  className="hidden sm:block w-full py-4 sm:py-5 bg-red-50 dark:bg-rose-500/10 hover:bg-red-100 dark:hover:bg-rose-500/20 text-red-600 dark:text-rose-500 border border-red-200 dark:border-rose-500/30 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Listing'}
                </button>
            ) : user && isOwner ? null : isBlockedByMe ? (
                <button 
                  onClick={handleUnblock} 
                  disabled={unblocking} 
                  className="w-full py-4 sm:py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                >
                  {unblocking ? 'Unblocking...' : 'Unblock User'}
                </button>
            ) : (
                <>
                  <button
                    onClick={() => { if (!user) router.push('/auth'); else router.push(`/chat/${product.seller._id}?productId=${product._id}`); }}
                    disabled={product.status !== 'Available'}
                    className={`hidden sm:block w-full py-4 sm:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all border shadow-lg ${
                      product.status !== 'Available' 
                        ? 'bg-gray-100 text-gray-400 border-transparent dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed' 
                        : 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:border-white dark:hover:bg-gray-200 active:scale-[0.98]'
                    }`}
                  >
                    {product.status !== 'Available' ? 'Sold Out' : 'Message seller'}
                  </button>
                  <button
                    onClick={() => { if (!user) router.push('/auth'); else router.push(`/chat/${product.seller._id}?productId=${product._id}&tab=action&autoMsg=true`); }}
                    disabled={product.status !== 'Available'}
                    className={`hidden sm:block w-full py-4 sm:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all border ${
                      product.status !== 'Available' 
                        ? 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800/50 dark:text-gray-600 dark:border-[#2a2a2a] cursor-not-allowed' 
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 dark:bg-transparent dark:text-white dark:border-[#3a3a3a] dark:hover:bg-[#222] active:scale-[0.98]'
                    }`}
                  >
                    Reserve item
                  </button>
                  <button
                    onClick={toggleWishlist}
                    className={`hidden sm:flex w-full py-4 sm:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all border items-center justify-center gap-2 ${
                      liked 
                        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-500 dark:border-rose-500/30' 
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 dark:bg-transparent dark:text-white dark:border-[#3a3a3a] dark:hover:bg-[#222]'
                    } active:scale-[0.98]`}
                  >
                    <svg className={`w-4 h-4 ${liked ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    {liked ? 'Wishlisted' : 'Add to wishlist'}
                  </button>
                </>
            )}
          </div>
          
          {/* Sticky Mobile Action Bar */}
          <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] sm:bottom-0 left-0 right-0 sm:hidden z-[150] p-4 bg-white/95 dark:bg-[#111]/90 backdrop-blur-md border-t border-gray-200 dark:border-[#2a2a2a] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
             <div className="flex gap-3 max-w-lg mx-auto">
                {!isOwner && (
                   <>
                      <button
                        onClick={() => { if (!user) router.push('/auth'); else router.push(`/chat/${product.seller._id}?productId=${product._id}`); }}
                        className="flex-1 py-4 bg-gray-900 text-white dark:bg-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                      >
                        Message
                      </button>
                      <button
                        onClick={() => { if (!user) router.push('/auth'); else router.push(`/chat/${product.seller._id}?productId=${product._id}&tab=action&autoMsg=true`); }}
                        className="flex-1 py-4 bg-white text-gray-900 border border-gray-300 dark:bg-transparent dark:text-white dark:border-[#3a3a3a] rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                      >
                        Reserve
                      </button>
                   </>
                )}
                {isOwner && (product.status !== 'Sold' && product.status !== 'Completed') && (
                    <button onClick={handleDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                       Delete Listing
                    </button>
                )}
             </div>
          </div>
          
          {/* Reviews Card (Mobile Only) */}
          <div className="lg:hidden w-full">
              <ReviewSection 
                targetId={product.seller._id} 
                targetName={product.seller.name} 
                productId={(product.forSell !== false && !product.forRent) ? undefined : product._id} 
                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-[2rem] sm:rounded-3xl p-4 shadow-sm"
              />
          </div>
        </div>
      </div>
      
      {reportOpen && (
        <ReportModal 
          targetUserId={product.seller._id} 
          itemType="product" 
          itemId={product._id} 
          onClose={() => setReportOpen(false)} 
        />
      )}
      
    </div>
  );
}
