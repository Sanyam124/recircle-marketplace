'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function CreateServicePage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'delivery_partner') {
        router.push('/delivery-dashboard');
    }
  }, [user, router]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    priceUnit: 'per hour',
    category: 'Academic Help (Tutoring, Notes)',
    availability: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


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
      const res = await fetch('/api/services', {
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
        throw new Error(data.error || 'Failed to create service');
      }

      router.push('/services');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Offer a Service</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Service Title</label>
              <input
                type="text"
                name="title"
                id="title"
                required
                placeholder="e.g. Calculus Tutoring, Graphic Design"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="number"
                  name="price"
                  id="price"
                  required
                  min="0"
                  max="10000"
                  className="block w-full rounded-md border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Max limit: ₹10,000 to keep services affordable.</p>
            </div>

            <div className="sm:col-span-2">
               <label htmlFor="priceUnit" className="block text-sm font-medium text-gray-700">Per</label>
               <select
                id="priceUnit"
                name="priceUnit"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                value={formData.priceUnit}
                onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value })}
               >
                 <option value="hour">Hour</option>
                 <option value="project">Project</option>
                 <option value="session">Session</option>
                 <option value="day">Day</option>
               </select>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
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
                <option>Academic Help (Tutoring, Notes)</option>
                <option>Assignment & Projects</option>
                <option>Tech Support & Repairs</option>
                <option>Graphic Design & Editing</option>
                <option>Photography & Videography</option>
                <option>Dorm & Room Services (Cleaning, Moving)</option>
                <option>Fitness & Sports Coaching</option>
                <option>Event Organizing</option>
                <option>Other</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Don't see your category? <a href="mailto:sanyam.sharma.work@gmail.com?subject=New%20Service%20Category%20Request" className="text-indigo-600 hover:text-indigo-500">Request to add it here.</a>
              </p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="availability" className="block text-sm font-medium text-gray-700">Availability (Time/Days)</label>
              <select
                id="availability"
                name="availability"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3 border text-gray-900 bg-white"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              >
                <option value="">Select Availability</option>
                <option value="Flexible">Flexible / Anytime</option>
                <option value="Weekends Only">Weekends Only</option>
                <option value="Weekdays (Evenings)">Weekdays (Evenings)</option>
                <option value="Weekdays (Daytime)">Weekdays (Daytime)</option>
              </select>
            </div>
            
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio/Images (Max 5)</label>
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
              disabled={loading}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'List Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
