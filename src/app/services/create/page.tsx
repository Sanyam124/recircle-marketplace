'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import imageCompression from 'browser-image-compression';
import useSWR from 'swr';
import SmartLocationPicker from '@/components/SmartLocationPicker';

export default function CreateServicePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=${encodeURIComponent('/services/create')}`);
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
    price: '',
    priceUnit: 'per hour',
    category: '',
    availability: '',
    visibility: 'Public',
    communityId: '',
  });

  const { data: siteConfigData } = useSWR('/api/site-config');

  useEffect(() => {
    if (siteConfigData) {
      setFormData(prev => ({
        ...prev,
        category: prev.category || siteConfigData.serviceCategories?.[0] || 'Academic Help',
        availability: prev.availability || siteConfigData.serviceAvailability?.[0] || '🗓️ Flexible',
      }));
    }
  }, [siteConfigData]);

  const [location, setLocation] = useState({
    coordinates: undefined as [number, number] | undefined,
    pincode: '',
    city: '',
    state: '',
    hostel: undefined as string | undefined,
    room: undefined as number | undefined,
    bed: undefined as number | undefined,
    isPrecise: true,
  });

  const [images, setImages] = useState<string[]>([]);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

 // Pincode logic removed since map provides it 

  // Prevent form flicker while loading auth or if redirect is imminent
  // Moved after state declarations to comply with Rules of Hooks
  if (authLoading || !user || user.role === 'delivery_partner') {
    return <Loader fullScreen />;
  }


  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxImages = siteConfigData?.maxServiceImages || 5;
      if (files.length + images.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
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

  const [website_url, setWebsiteUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation for Public listings
    const hasMapSettings = location.coordinates && location.coordinates.length > 0;
    const hasHostelSettings = Boolean(location.hostel) || location.room !== undefined || location.bed !== undefined;

    if (formData.visibility === 'Public' && !hasMapSettings && !hasHostelSettings) {
        setError('Please select your State and City, or use Auto Detect to set your location.');
        setLoading(false);
        return;
    }

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          website_url,
          price: Number(formData.price),
          images,
          visibility: formData.visibility,
          communityId: formData.visibility === 'Community' ? formData.communityId : undefined,
          location: location,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create service');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-dynamic flex items-center justify-center bg-gray-50/50 dark:bg-[#080B14] py-8 sm:py-16 px-4 sm:px-6 lg:px-8 -mt-16 sm:mt-0 -mb-24 md:mb-0">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-gray-100 dark:border-zinc-800/50 overflow-hidden">
        <div className="p-6 sm:p-10 md:p-12 relative text-left">
          {/* Status Modal Overlay */}
          {(loading || success) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-white/80 dark:bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
               <div className="max-w-sm w-full bg-white dark:bg-zinc-900 rounded-[3rem] p-10 text-center shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in duration-500">
                {success ? (
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
                      <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Service Offered!</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold">You can manage your listing from your profile page.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 border-4 border-indigo-100 dark:border-white/5 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-6"></div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Publishing...</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-bold">Listing your service in the circle.</p>
                  </div>
                )}
               </div>
            </div>
          )}
            <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Offer a Service</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Share your skills and earn by helping your peers.</p>
              </div>
              <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  <span className="text-red-500 mr-1">*</span> Mandatory Fields
                </p>
              </div>
            </div>
  
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot Trap (Invisible to humans) */}
              <div className="absolute opacity-0 pointer-events-none -z-10 h-0 w-0 overflow-hidden">
                  <input type="text" name="website_url" value={website_url} onChange={(e) => setWebsiteUrl(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>

              <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Service Title <span className="text-indigo-600 dark:text-indigo-400 font-black">*</span></label>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${formData.title.length >= 70 ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  {formData.title.length}/80
                </span>
              </div>
              <input
                type="text"
                name="title"
                id="title"
                required
                maxLength={80}
                placeholder="e.g. Calculus Tutoring, Graphic Design"
                className="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition-all font-medium"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value.replace(/[\r\n]/g, '') })}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="price" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2">Pricing <span className="text-indigo-600 dark:text-indigo-400 font-black">*</span></label>
              <div className="flex gap-2">
                  <div className="relative flex-1 group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        required
                        min={siteConfigData?.minPrice || 5}
                        max={siteConfigData?.maxPriceService || 100000}
                        placeholder="0"
                        className="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-l-2xl rounded-r-none pl-8 pr-4 py-4 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition-all font-black text-xl"
                        onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/\D/g, '') })}
                        value={formData.price}
                      />
                  </div>
                    <select
                    id="priceUnit"
                    name="priceUnit"
                    className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold px-3 rounded-r-2xl border-none outline-none appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    value={formData.priceUnit}
                    onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value })}
                    >
                     <option value="per hour" className="dark:bg-zinc-900 dark:text-white">/ HR</option>
                     <option value="per project" className="dark:bg-zinc-900 dark:text-white">/ PROJ</option>
                     <option value="per session" className="dark:bg-zinc-900 dark:text-white">/ SESS</option>
                     <option value="per day" className="dark:bg-zinc-900 dark:text-white">/ DAY</option>
                   </select>
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="description" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Service Details <span className="text-indigo-600 dark:text-indigo-400 font-black">*</span></label>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${formData.description.length >= 1900 ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  {formData.description.length}/2000
                </span>
              </div>
              <textarea
                id="description"
                name="description"
                rows={5}
                required
                maxLength={2000}
                placeholder="What exactly will you provide? Be specific to attract more clients..."
                className="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-3xl px-5 py-4 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition-all font-medium resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="category" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2">Category <span className="text-indigo-600 dark:text-indigo-400 font-black">*</span></label>
              <select
                id="category"
                name="category"
                className="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-2xl px-5 py-4 text-gray-900 dark:text-white outline-none transition-all font-bold appearance-none cursor-pointer shadow-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {(siteConfigData?.serviceCategories || ['Academic Help', 'Tech Support', 'Graphic Design', 'Photography', 'Dorm Services', 'Fitness Coaching', 'Other']).map((cat: string) => (
                  <option key={cat} value={cat} className="dark:bg-zinc-900 dark:text-white">{cat}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="availability" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2">Availability <span className="text-indigo-600 dark:text-indigo-400 font-black">*</span></label>
              <select
                id="availability"
                name="availability"
                required
                className="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-2xl px-5 py-4 text-gray-900 dark:text-white outline-none transition-all font-bold appearance-none cursor-pointer shadow-sm"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              >
                {(siteConfigData?.serviceAvailability || ['🗓️ Flexible', '🏠 Weekends', '🌙 Evening', '☀️ Daytime']).map((avail: string) => (
                  <option key={avail} value={avail} className="dark:bg-zinc-900 dark:text-white">{avail}</option>
                ))}
              </select>
            </div>

            {/* Visibility Selection */}
            <div className="sm:col-span-6 bg-indigo-50/30 dark:bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-900/30">
              <label htmlFor="visibility" className="block text-sm font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-3">Service Visibility</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, visibility: 'Public' })}
                  className={`flex flex-col gap-1 p-5 rounded-2xl border-2 text-left transition-all ${formData.visibility === 'Public' ? 'bg-white dark:bg-white/10 border-indigo-500 shadow-xl shadow-indigo-500/10' : 'bg-transparent border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200'}`}
                >
                  <span className="text-xl">🌐</span>
                  <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Public Reach</span>
                  <span className="text-xs text-gray-500 leading-tight">Anyone in the city can book you.</span>
                </button>
                <button
                  type="button"
                  disabled={!user?.verifiedCommunities?.length}
                  onClick={() => {
                    const firstComm = user?.verifiedCommunities?.[0];
                    setFormData({ 
                      ...formData, 
                      visibility: 'Community',
                      communityId: firstComm?._id || firstComm?.id || firstComm || '' 
                    });
                  }}
                  className={`flex flex-col gap-1 p-5 rounded-2xl border-2 text-left transition-all relative ${formData.visibility === 'Community' ? 'bg-white dark:bg-white/10 border-indigo-500 shadow-xl shadow-indigo-500/10' : 'bg-transparent border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200 disabled:opacity-30'}`}
                >
                  <span className="text-xl">🔒</span>
                  <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Campus Only</span>
                  <span className="text-xs text-gray-500 leading-tight">Exclusive to verified students.</span>
                  {!user?.verifiedCommunities?.length && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center p-6 text-center z-50 shadow-inner">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" /></svg>
                      </div>
                      <span className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-tight mb-1">Verification Required</span>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 max-w-[140px]">Join a verified campus circle to offer services here.</p>
                    </div>
                  )}
                </button>
              </div>
              {formData.visibility === 'Community' && user?.verifiedCommunities?.length && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Swap Selected Circle</label>
                  <select
                    className="w-full h-12 bg-white dark:bg-zinc-800 rounded-xl px-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                    value={formData.communityId}
                    onChange={(e) => setFormData({ ...formData, communityId: e.target.value })}
                  >
                    {user.verifiedCommunities.map((c: any) => (
                      <option key={c._id || c.id || c} value={c._id || c.id || c}>
                        🏢 {c.name || 'Campus'} {(c as any).isActive === false ? ' (Maintenance/Paused)' : ''}
                      </option>
                    ))}
                  </select>
                  {(() => {
                      const selectedComm = user.verifiedCommunities.find((c: any) => (c._id || c.id || c) === formData.communityId);
                      if (selectedComm && (selectedComm as any).isActive === false) {
                          return (
                              <p className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                  <span>⚠️</span>
                                  This campus is currently in maintenance mode. Creation is disabled.
                              </p>
                          );
                      }
                      return null;
                  })()}
                </div>
              )}
            </div>

            {/* Location Section */}
            <div className="sm:col-span-6">
                <div className="flex items-center gap-2 mb-4">
                   <div className="h-0.5 flex-1 bg-gray-100 dark:bg-white/5"></div>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Service Location <span className="text-indigo-600 dark:text-indigo-400 font-black">*</span></span>
                   <div className="h-0.5 flex-1 bg-gray-100 dark:bg-white/5"></div>
                </div>
                <SmartLocationPicker 
                    visibility={formData.visibility as any}
                    communityId={formData.communityId}
                    communities={user?.verifiedCommunities || []}
                    locationData={location}
                    onChange={(newLoc) => setLocation(newLoc as any)}
                />
            </div>
            
            <div className="sm:col-span-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-4">Visual Portfolio <span className="text-gray-400 font-medium">(MAX {siteConfigData?.maxServiceImages || 5})</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-[1.5rem] overflow-hidden group shadow-lg">
                    <img src={img} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button
                         type="button"
                         onClick={() => removeImage(index)}
                         className="p-2.5 bg-red-500 text-white rounded-full hover:scale-110 transition-transform active:scale-95"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                  </div>
                ))}
                {images.length < (siteConfigData?.maxServiceImages || 5) && (
                  <label className="border-3 border-dashed border-gray-200 dark:border-zinc-800 rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-950 transition-all aspect-square group">
                    <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-full mb-2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 transition-all">
                       <svg className="h-6 w-6 text-gray-400 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                       </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-indigo-600 transition-all">Add Slide</span>
                    <input type="file" className="sr-only" accept="image/*" multiple onChange={handleImageChange} />
                  </label>
                )}
              </div>
              {images.length === 0 && (
                <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1">Growth Tip</p>
                    <p className="text-xs text-indigo-600/80 dark:text-indigo-300/60 font-medium leading-relaxed">
                      Service listings with a visual portfolio (work samples, certificates, or a professional photo) get up to <strong className="font-bold">3x more bookings</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-widest"
            >
              ← Cancel Draft
            </button>
            <button
              type="submit"
              disabled={
                loading || 
                imageProcessing || 
                !formData.title.trim() ||
                !formData.description.trim() ||
                !formData.price || 
                !formData.availability || 
                Number(formData.price) < (siteConfigData?.minPrice || 5) || 
                Number(formData.price) > (siteConfigData?.maxPriceService || 100000) ||
                (formData.visibility === 'Public' && (!location.state || !location.city)) ||
                (formData.visibility === 'Community' && (!formData.communityId || user?.verifiedCommunities?.find((c: any) => (c._id || c.id || c) === formData.communityId)?.isActive === false))
              }
              className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 dark:from-indigo-500 dark:to-indigo-400 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-40"
            >
              {imageProcessing ? 'Processing...' : loading ? 'Publishing...' : 'Confirm Service'}
            </button>
          </div>
           </form>
      </div>
    </div>
  </div>
);
}
