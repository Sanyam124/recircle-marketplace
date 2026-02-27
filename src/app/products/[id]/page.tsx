'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import ImageCarousel from '@/components/ImageCarousel';
import ShareButton from '@/components/ShareButton';
import ReportModal from '@/components/ReportModal';
import ReviewSection from '@/components/ReviewSection';
import MakeOfferModal from '@/components/MakeOfferModal';

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: string;
  status: string;
  seller: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

import { formatTimeAgo } from '@/lib/utils';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use() for Next.js 15+ compatibility if passed as Promise
  // But strictly `params` in Page props is a Promise in Next.js 15? 
  // Wait, in Next.js 15 app router, params is a Promise.
  // I will assume standard usage or await it.
  
  // NOTE: In Client Components, we can't await props directly in the component body easily without `use`.
  // Let's handle it with `use` or useEffect.
  
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const { user, setUser } = useAuth();
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
        router.push('/login');
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
      } else {
        // Handle 404
      }
    } catch (error) {
      console.error('Failed to fetch product', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/products');
      }
    } catch (error) {
      console.error('Failed to delete product', error);
    }
  };

  if (loading) return <Loader />;
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
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{product.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
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

          <div className="mt-3">
            <div className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
              {product.category}
            </div>
            <div className="ml-4 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
              {product.condition}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="sr-only">Description</h3>
            <div className="text-base text-gray-700 dark:text-gray-300 space-y-6" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
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
                   {product.seller.name?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{product.seller.name}</div>
                <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">@{ (product.seller as any).username || (product.seller as any)._id?.toString().slice(-4) }</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Member since {new Date(product.createdAt).getFullYear()}</div>
              </div>
              <div className="ml-auto">
                <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          </div>

          <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
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
             {/* Chat with Seller Button */}
             {product.status === 'Available' && user && user.id !== product.seller._id && (
               <button
                 type="button"
                 onClick={() => router.push(`/chat/${product.seller._id}?productId=${product._id}`)}
                 className="flex-1 bg-indigo-600 text-white rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
               >
                 Chat with Seller
               </button>
             )}

             {/* Make an Offer */}
             {product.status === 'Available' && user && user.id !== product.seller._id && (
                <button
                  type="button"
                  onClick={() => router.push(`/chat/${product.seller._id}?productId=${product._id}&tab=action`)}
                  className="flex-1 bg-white dark:bg-gray-800 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all active:scale-95"
                >
                  Make an Offer
                </button>
             )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {product.status === 'Available' && (
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
                  className="flex-1 border-2 border-red-200 dark:border-red-800 rounded-xl py-3.5 px-6 flex items-center justify-center text-base font-bold bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all active:scale-95"
                >
                  Delete Listing
                </button>
              )}
            </div>
          </div>

          <div className="mt-12">
             {/* Review Section */}
             {/* We need to dynamically import or just use it. Since it's client component using hooks, it's fine. */}
             <ReviewSection targetId={product.seller._id} targetName={product.seller.name} />
          </div>

          {reportOpen && (
            <ReportModal targetUserId={product.seller._id} itemType="product" itemId={product._id} onClose={() => setReportOpen(false)} />
          )}
          {offerOpen && (
            <MakeOfferModal
              productId={product._id}
              itemTitle={product.title}
              originalPrice={product.price}
              onClose={() => setOfferOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
