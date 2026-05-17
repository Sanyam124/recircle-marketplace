import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { INDIAN_STATES } from '@/constants/location';
import { reverseGeocode, geocodeLocation, isLocationInIndia } from '@/lib/location';

const DynamicLocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-gray-400 font-medium">Loading map...</span>
    </div>
  ),
});

interface LocationData {
  coordinates?: [number, number]; // [lng, lat]
  pincode?: string;
  city?: string;
  state?: string;
  area?: string;
  hostel?: string;
  room?: number;
  bed?: number;
  isPrecise?: boolean;
}

interface LocationPickerProps {
    visibility: 'Public' | 'Community';
    communityId?: string;
    communities?: any[];
    locationData: LocationData;
    onChange: (data: LocationData) => void;
}

/**
 * SmartLocationPicker Component
 * Handles location selection via Browser GPS, Pincode, or State/City search.
 * Enforces India-only locations for physical hand-off reliability.
 */
export default function SmartLocationPicker({ 
    visibility, 
    communityId, 
    communities, 
    locationData, 
    onChange 
}: LocationPickerProps) {

    // --- State ---
    const [mode, setMode] = useState<'pincode' | 'statecity'>('statecity');
    const [detecting, setDetecting] = useState(false);
    const [detectError, setDetectError] = useState('');
    const [pincodeLoading, setPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const [citySearch, setCitySearch] = useState(locationData.city || '');
    const [cityResults, setCityResults] = useState<any[]>([]);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [citySearchLoading, setCitySearchLoading] = useState(false);
    
    const citySearchTimer = useRef<NodeJS.Timeout | null>(null);
    const cityInputRef = useRef<HTMLInputElement>(null);

    // --- Helpers ---
    const updateLocation = (updates: Partial<LocationData>) => {
        onChange({ ...locationData, ...updates });
    };

    const getHostels = useCallback(() => {
        if (!communityId || !communities) return [];
        const targetId = typeof communityId === 'object' ? (communityId as any)._id : communityId;
        const selected = communities.find(c => (c._id || c.id)?.toString() === targetId?.toString());
        return selected?.hostels || [];
    }, [communityId, communities]);

    // --- core Logic ---

    const { refreshLocation } = useAuth();

    /**
     * Auto-detect location using browser GPS
     */
    const handleAutoDetect = () => {
        setDetecting(true);
        setDetectError('');
        
        refreshLocation(
            async (loc) => {
                const { lat, lng } = loc;
                const details = await reverseGeocode(lat, lng);
                
                if (!isLocationInIndia(details.countryCode)) {
                    setDetectError('ReCircle is currently only available within India.');
                    setDetecting(false);
                    return;
                }

                updateLocation({
                    coordinates: [lng, lat],
                    city: details.city,
                    state: details.state,
                    pincode: details.pincode,
                    isPrecise: true
                });
                setCitySearch(details.city);
                setDetecting(false);
            },
            (error) => {
                if (error.code === 1) { // PERMISSION_DENIED
                    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
                    if (isPWA) {
                        setDetectError('Location access is blocked. Please enable location permissions for ReCircle in your device or app settings.');
                    } else {
                        setDetectError('Location access is blocked. Please enable it by clicking the "lock" or "settings" icon next to the website URL above, then try again.');
                    }
                } else if (error.code === 3) { // TIMEOUT
                    setDetectError('Location detection timed out. Please check your signal and try again.');
                } else {
                    setDetectError('Unable to detect location. Please fill manually or try again.');
                }
                setDetecting(false);
            }
        );
    };

    /**
     * Handle Pincode entry and lookup
     */
    const handlePincodeChange = async (pincode: string) => {
        const clean = pincode.replace(/\D/g, '').slice(0, 6);
        if (clean.length < 6) {
            updateLocation({ pincode: clean, city: '', state: '', coordinates: undefined });
            setCitySearch('');
            setPincodeError('');
            return;
        }

        updateLocation({ pincode: clean });
        setPincodeLoading(true);
        setPincodeError('');
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${clean}&countrycodes=in&limit=1`);
            const data = await res.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                const details = await reverseGeocode(lat, lon);

                if (!isLocationInIndia(details.countryCode)) {
                    setPincodeError('This location is outside India. ReCircle is India-only.');
                } else {
                    updateLocation({
                        pincode: clean,
                        city: details.city,
                        state: details.state,
                        coordinates: [lon, lat],
                        isPrecise: false
                    });
                    setCitySearch(details.city);
                }
            } else {
                setPincodeError('Pincode not found. Please check and try again.');
            }
        } catch {
            setPincodeError('Failed to lookup pincode.');
        } finally {
            setPincodeLoading(false);
        }
    };

    /**
     * Search for cities within the selected state
     */
    const handleCitySearchChange = (value: string) => {
        setCitySearch(value);
        if (citySearchTimer.current) clearTimeout(citySearchTimer.current);

        if (value.length < 2 || !locationData.state) {
            setCityResults([]);
            setShowCityDropdown(false);
            return;
        }

        citySearchTimer.current = setTimeout(async () => {
            setCitySearchLoading(true);
            try {
                const query = encodeURIComponent(`${value}, ${locationData.state}, India`);
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&countrycodes=in&addressdetails=1`);
                const data = await res.json();
                
                if (data && data.length > 0) {
                    const seen = new Set();
                    const cities = data.reduce((acc: any[], d: any) => {
                        const addr = d.address || {};
                        const name = addr.city || addr.town || addr.village || addr.county || d.display_name.split(',')[0].trim();
                        if (!seen.has(name)) {
                            seen.add(name);
                            acc.push({ name, display: d.display_name });
                        }
                        return acc;
                    }, []).slice(0, 5);
                    setCityResults(cities);
                    setShowCityDropdown(true);
                } else {
                    setCityResults([]);
                    setShowCityDropdown(false);
                }
            } catch {
                setCityResults([]);
            } finally {
                setCitySearchLoading(false);
            }
        }, 800);
    };

    const selectCity = async (city: string) => {
        if (citySearchTimer.current) clearTimeout(citySearchTimer.current);
        setCitySearch(city);
        setShowCityDropdown(false);
        setCityResults([]);

        const coords = await geocodeLocation(city, locationData.state || '');
        updateLocation({ city, coordinates: coords || undefined, isPrecise: false, pincode: '' });
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
                setShowCityDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // --- Render ---

    if (visibility === 'Public') {
        return (
            <div className="space-y-5">
                {/* Intro Info */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-sm text-indigo-800 dark:text-indigo-400 flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span><b>Meeting Convenience.</b> Set your location for buyers to find you. Use auto-detect or fill manually.</span>
                    </p>
                </div>

                {/* Detect Button */}
                <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={detecting}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-60"
                >
                    {detecting ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Detecting...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Auto Detect Location
                        </div>
                    )}
                </button>
                {detectError && <p className="text-xs font-bold text-red-500 -mt-2 ml-1">{detectError}</p>}

                {/* Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-2xl border border-gray-200/50 dark:border-zinc-800">
                    {['statecity', 'pincode'].map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m as any)}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === m ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            By {m === 'statecity' ? 'State \u0026 City/Area' : 'Pincode'}
                        </button>
                    ))}
                </div>

                {/* Form Inputs */}
                {mode === 'pincode' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Pincode <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input
                                    type="text" inputMode="numeric" maxLength={6}
                                    value={locationData.pincode || ''}
                                    onChange={(e) => handlePincodeChange(e.target.value)}
                                    placeholder="Enter 6-digit pincode"
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all text-gray-900 dark:text-white"
                                />
                                {pincodeLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                            </div>
                            {pincodeError && <p className="text-xs font-bold text-red-500 mt-1.5 ml-1">{pincodeError}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">State <span className="text-red-500">*</span></label>
                            <select
                                value={locationData.state || ''}
                                onChange={(e) => updateLocation({ state: e.target.value, city: '', coordinates: undefined, isPrecise: false, pincode: '' })}
                                className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none cursor-pointer text-gray-900 dark:text-white"
                            >
                                <option value="" className="dark:bg-zinc-900">Select State</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s} className="dark:bg-zinc-900">{s}</option>)}
                            </select>
                        </div>
                        <div className="relative" ref={cityInputRef}>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">City <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={citySearch}
                                onChange={(e) => handleCitySearchChange(e.target.value)}
                                disabled={!locationData.state}
                                placeholder={locationData.state ? 'Search city...' : 'Select state first'}
                                className={`w-full bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all text-gray-900 dark:text-white ${!locationData.state ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            {showCityDropdown && cityResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-50">
                                    {cityResults.map((c, idx) => (
                                        <button
                                            key={idx} type="button"
                                            onClick={() => selectCity(c.name)}
                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-b border-gray-50 dark:border-zinc-800 last:border-0"
                                        >
                                            <p className="text-sm font-black truncate text-gray-900 dark:text-gray-100">{c.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{c.display}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Area/Landmark (Optional)</label>
                            <input
                                type="text"
                                value={locationData.area || ''}
                                onChange={(e) => updateLocation({ area: e.target.value })}
                                placeholder="e.g., Near City Park"
                                className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                )}

                {/* Precise Toggle */}
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors">
                    <input
                        type="checkbox"
                        checked={locationData.isPrecise !== false}
                        onChange={(e) => updateLocation({ isPrecise: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-zinc-700 focus:ring-indigo-500 bg-white dark:bg-zinc-800"
                    />
                    <div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Show Precise Location</span>
                        {!locationData.isPrecise && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Approximate 500m area shown to buyers.</p>}
                    </div>
                </label>

                {/* Map */}
                <DynamicLocationMap coordinates={locationData.coordinates} isPrecise={locationData.isPrecise !== false} readOnly={true} />

                {/* Success Badge */}
                {locationData.coordinates && locationData.city && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Location set: {locationData.city}, {locationData.state}
                    </div>
                )}
            </div>
        );
    }

    // --- Community Mode ---
    if (visibility === 'Community') {
        const hostels = getHostels();
        return (
            <div className="space-y-4">
                 <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-sm text-emerald-800 dark:text-emerald-400 flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <span><b>Campus Exchange.</b> Select your building/room to coordinate deliveries. All fields optional.</span>
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Building/Hostel</label>
                        <select
                            className="w-full h-10 px-3 rounded-md border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={locationData.hostel || ''}
                            onChange={(e) => updateLocation({ hostel: e.target.value, room: undefined, bed: undefined })}
                        >
                            <option value="">Select (Optional)</option>
                            {hostels.map((h: string) => <option key={h} value={h} className="dark:bg-zinc-900">{h}</option>)}
                        </select>
                    </div>
                    {['room', 'bed'].map((field) => (
                        <div key={field} className={!locationData.hostel && field === 'room' || !locationData.room && field === 'bed' ? 'opacity-50 pointer-events-none' : ''}>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{field === 'room' ? 'Room No.' : 'Bed No.'}</label>
                            <input
                                type="number"
                                placeholder="e.g. 1"
                                value={(locationData[field as 'room' | 'bed'] as string | number) || ''}
                                onChange={(e) => updateLocation({ [field]: parseInt(e.target.value) || undefined })}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
}

