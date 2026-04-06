'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import imageCompression from 'browser-image-compression';

export default function CreateProductPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=${encodeURIComponent('/products/create')}`);
      return;
    }

    if (user?.role === 'delivery_partner') {
      router.push('/delivery-dashboard');
      return;
    }
  }, [user, router, authLoading]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    forSell: true,
    price: '',
    forRent: false,
    rentPrice: '',
    rentUnit: 'month',
    category: 'Textbooks',
    condition: 'Good',
    visibility: 'Public',
    communityId: '',
  });
  
  const [location, setLocation] = useState({
    pincode: '',
    city: '',
    state: '',
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const [images, setImages] = useState<string[]>([]); // Base64 strings
  const [imageProcessing, setImageProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Prevent form flicker while loading auth or if redirect is imminent
  if (authLoading || !user || user.role === 'delivery_partner') {
    return <Loader fullScreen />;
  }

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setLocation(prev => ({ ...prev, pincode: pin }));

    if (pin.length === 6) {
      setFetchingLocation(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          setLocation(prev => ({
            ...prev,
            city: postOffice.District,
            state: postOffice.State
          }));
        } else {
          setError('Invalid Pincode. Please check again.');
        }
      } catch (err) {
        console.error('Pincode fetch error:', err);
      } finally {
        setFetchingLocation(false);
      }
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + images.length > 5) {
        setError('Maximum 5 images allowed');
        return;
      }

      setImageProcessing(true);
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
      };

      for (const file of files) {
        try {
          const compressedFile = await imageCompression(file, options);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(compressedFile);
        } catch (error) {
          console.error("Image compression error:", error);
          setError('Failed to process one or more images');
        }
      }
      setImageProcessing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation for Public listings
    if (formData.visibility === 'Public' && (!location.pincode || !location.city)) {
        setError('Location (Pincode) is required for Public listings.');
        setLoading(false);
        return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.forSell ? Number(formData.price) : undefined,
          rentPrice: formData.forRent ? Number(formData.rentPrice) : undefined,
          images,
          visibility: formData.visibility,
          communityId: formData.visibility === 'Community' ? formData.communityId : undefined,
          location: formData.visibility === 'Public' ? location : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create product');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/products');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {success ? (
          <div className="py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Listing Created!</h1>
            <p className="text-gray-500 font-medium">Redirecting you to the marketplace...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">List Item for Sale</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title, Price, Description, Category, Condition fields remain same... */}
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <div className="flex items-center justify-between">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <span className={`text-[10px] font-bold ${formData.title.length >= 70 ? 'text-red-500' : 'text-gray-400'}`}>
                  {formData.title.length}/80
                </span>
              </div>
              <input
                type="text"
                name="title"
                id="title"
                required
                maxLength={80}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value.replace(/[\r\n]/g, '') })}
              />
            </div>

            {/* Listing Type Modes */}
            <div className="sm:col-span-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-bold text-gray-900 mb-3">Listing Modes <span className="text-red-500">*</span></label>
              <div className="flex gap-6">
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={formData.forSell} onChange={(e) => setFormData({...formData, forSell: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">For Sell</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={formData.forRent} onChange={(e) => setFormData({...formData, forRent: e.target.checked})} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-600 transition-colors">For Rent</span>
                 </label>
              </div>
              {!formData.forSell && !formData.forRent && (
                <p className="mt-2 text-[10px] font-bold text-red-500">You must select at least one listing mode.</p>
              )}
            </div>

            {/* Dynamic Price Fields */}
            <div className="sm:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
               {formData.forSell && (
                  <div>
                    <label htmlFor="price" className="block text-sm font-bold text-indigo-700 mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        required={formData.forSell}
                        min="5" 
                        max="1000000"
                        step="1"
                        className={`block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white ${
                          formData.price && Number(formData.price) > 1000000 ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
                        }`}
                        value={formData.price}
                        onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                          const val = e.currentTarget.value;
                          if (val.length > 7) e.currentTarget.value = val.slice(0, 7);
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, price: val });
                        }}
                      />
                    <p className="mt-1 text-[10px] text-gray-500">Max limit: ₹1,000,000</p>
                  </div>
               )}

               {formData.forRent && (
                  <div>
                    <label htmlFor="rentPrice" className="block text-sm font-bold text-emerald-700 mb-1">Rent Price (₹)</label>
                    <div className="flex">
                       <input
                         type="number"
                         name="rentPrice"
                         id="rentPrice"
                         required={formData.forRent}
                         min="5" 
                         max="100000"
                         step="1"
                         className="block w-full rounded-l-md shadow-sm border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                         value={formData.rentPrice}
                         onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                         onChange={(e) => {
                           const val = e.target.value.replace(/\D/g, '');
                           setFormData({ ...formData, rentPrice: val });
                         }}
                       />
                       <select 
                         value={formData.rentUnit} 
                         onChange={(e) => setFormData({...formData, rentUnit: e.target.value})} 
                         className="rounded-r-md border-l-0 shadow-sm border-gray-300 bg-emerald-50 text-emerald-800 sm:text-sm h-10 focus:ring-emerald-500 font-bold px-3 border outline-none"
                       >
                          <option value="hour">/ hour</option>
                          <option value="day">/ day</option>
                          <option value="week">/ week</option>
                          <option value="month">/ month</option>
                          <option value="year">/ year</option>
                       </select>
                    </div>
                  </div>
               )}
            </div>

            <div className="sm:col-span-6">
              <div className="flex items-center justify-between">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <span className={`text-[10px] font-bold ${formData.description.length >= 1900 ? 'text-red-500' : 'text-gray-400'}`}>
                  {formData.description.length}/2000
                </span>
              </div>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                maxLength={2000}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border text-gray-900 bg-white"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <select
                id="category"
                name="category"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Textbooks</option>
                <option>Study Notes</option>
                <option>Stationery</option>
                <option>Electronics & Gadgets</option>
                <option>Clothing & Accessories</option>
                <option>Bags & Luggage</option>
                <option>Storage & Organizers</option>
                <option>Hostel Essentials</option>
                <option>Sports & Fitness</option>
                <option>Furniture</option>
                <option>Other</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700">Condition</label>
              <select
                id="condition"
                name="condition"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                <option>New</option>
                <option>Like New</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
              </select>
            </div>

            {/* Circles Feature: Visibility & Community Selection */}
            <div className="sm:col-span-3 border-l-2 border-indigo-500 pl-4 py-1 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-r-lg">
              <label htmlFor="visibility" className="block text-sm font-bold text-gray-900 dark:text-gray-100 italic">Marketplace Visibility</label>
              <select
                id="visibility"
                name="visibility"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white font-semibold"
                value={formData.visibility}
                onChange={(e) => {
                   const val = e.target.value;
                   setFormData({ 
                     ...formData, 
                     visibility: val as any,
                     // Auto-select first community if switching to Community visibility
                     communityId: (val === 'Community' && user?.verifiedCommunities?.length) ? (user.verifiedCommunities[0]._id || user.verifiedCommunities[0].id || user.verifiedCommunities[0]) : ''
                   });
                }}
              >
                <option value="Public">🌐 Public (Visible to Everyone)</option>
                <option value="Community" disabled={!user?.verifiedCommunities?.length}>
                   🔒 Community & Campus (Private)
                </option>
              </select>
              {!user?.verifiedCommunities?.length && (
                 <p className="mt-1 text-[10px] text-gray-500 italic">You aren't verified in any communities yet. Verification is required for Private listings.</p>
              )}
            </div>

            {formData.visibility === 'Public' && (
              <div className="sm:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-l-2 border-orange-500 pl-4 py-2 bg-orange-50/30 dark:bg-orange-900/10 rounded-r-lg animate-in fade-in slide-in-from-left-2 transition-all">
                <div className="sm:col-span-1">
                  <label htmlFor="pincode" className="block text-sm font-bold text-gray-900 dark:text-gray-100 italic">Pincode</label>
                  <input
                    type="text"
                    id="pincode"
                    required
                    placeholder="6-digit Pincode"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white font-medium"
                    value={location.pincode}
                    onChange={handlePincodeChange}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 italic opacity-60">City</label>
                  <input
                    type="text"
                    disabled
                    placeholder={fetchingLocation ? "Fetching..." : "Auto-filled"}
                    className="mt-1 block w-full rounded-md border-gray-100 bg-gray-50/50 sm:text-sm h-10 px-3 border text-gray-500 font-medium"
                    value={location.city}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 italic opacity-60">State</label>
                  <input
                    type="text"
                    disabled
                    placeholder={fetchingLocation ? "Fetching..." : "Auto-filled"}
                    className="mt-1 block w-full rounded-md border-gray-100 bg-gray-50/50 sm:text-sm h-10 px-3 border text-gray-500 font-medium"
                    value={location.state}
                  />
                </div>
              </div>
            )}

            {formData.visibility === 'Community' && user?.verifiedCommunities?.length && (
               <div className="sm:col-span-3 border-l-2 border-emerald-500 pl-4 py-1 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-r-lg animate-in fade-in slide-in-from-left-2 transition-all">
                  <label htmlFor="communityId" className="block text-sm font-bold text-gray-900 dark:text-gray-100 italic">Select Community</label>
                  <select
                    id="communityId"
                    name="communityId"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white font-medium"
                    value={formData.communityId}
                    onChange={(e) => setFormData({ ...formData, communityId: e.target.value })}
                  >
                    {user.verifiedCommunities.map((c: any) => (
                      <option key={c._id || c.id || c} value={c._id || c.id || c}>
                        🏢 {c.name || 'Your Community'}
                      </option>
                    ))}
                  </select>
               </div>
            )}
            

            {/* Images (Keep existing) */}
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Images (Max 5)</label>
              {/* Note and grid existing code */}
               <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong className="font-bold">Strict Policy:</strong> Upload only real, genuine images of the product. Using fake or misleading images will result in immediate <span className="underline font-bold">account suspension</span>.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square border rounded-lg overflow-hidden group">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors aspect-square">
                    <div className="text-center">
                      <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="mt-2 block text-xs font-medium text-gray-900">Add Image</span>
                    </div>
                    <input type="file" className="sr-only" accept="image/*" multiple onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading || 
                imageProcessing ||
                (!formData.forSell && !formData.forRent) || 
                (formData.forSell && (!formData.price || Number(formData.price) < 5 || Number(formData.price) > 1000000)) || 
                (formData.forRent && (!formData.rentPrice || Number(formData.rentPrice) < 5))
              }
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {imageProcessing ? 'Processing Images...' : loading ? 'Creating...' : 'List Item'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
