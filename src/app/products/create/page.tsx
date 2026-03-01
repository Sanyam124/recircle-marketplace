'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';

export default function CreateProductPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent('/products/create')}`);
      return;
    }

    if (user?.role === 'delivery_partner') {
      router.push('/delivery-dashboard');
      return;
    }
    
    if (user && !user.isPhoneVerified) {
      router.push('/profile/edit?reason=verify_to_list');
    }
  }, [user, router, authLoading]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Books',
    condition: 'Good',
  });
  // [NEW] Address State

  const [images, setImages] = useState<string[]>([]); // Base64 strings
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prevent form flicker while loading auth or if redirect is imminent
  // Moved after state declarations to comply with Rules of Hooks
  if (authLoading || !user || !user.isPhoneVerified || user.role === 'delivery_partner') {
    return <Loader fullScreen />;
  }



  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + images.length > 5) {
        setError('Maximum 5 images allowed');
        return;
      }

      files.forEach(file => {
        if (file.size > 2 * 1024 * 1024) {
          setError('Image size should be less than 2MB');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');


    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          images,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create product');
      }

      router.push('/products');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
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

            <div className="sm:col-span-2">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <input
                type="number"
                name="price"
                id="price"
                required
                min="5" 
                max="1000000"
                step="1"
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white ${
                  formData.price && Number(formData.price) > 1000000 ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
                }`}
                value={formData.price}
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  const val = e.currentTarget.value;
                  if (val.length > 7) e.currentTarget.value = val.slice(0, 7);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!/^\d*$/.test(val)) return;
                  setFormData({ ...formData, price: val });
                }}
              />
              <p className="mt-1 text-[10px] text-gray-500">Max limit: ₹1,000,000</p>
              {formData.price && Number(formData.price) > 1000000 && (
                <p className="mt-1 text-xs font-bold text-red-600 animate-pulse">
                  Price cannot exceed ₹1,000,000
                </p>
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
              disabled={loading || !formData.price || Number(formData.price) < 5 || Number(formData.price) > 1000000}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'List Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
