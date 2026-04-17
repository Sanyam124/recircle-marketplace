'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { calculateDistance, formatDistance } from '@/lib/utils';

// Dynamic import for the Map section to avoid SSR issues
const MapSection = dynamic(() => import('./MapSection'), { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 dark:bg-white/5 animate-pulse" />
});

interface LocationViewerProps {
    visibility: 'Public' | 'Community';
    location?: {
        pincode?: string;
        city?: string;
        state?: string;
        coordinates?: [number, number]; // [lng, lat]
        isPrecise?: boolean;
        hostel?: string;
        room?: number;
        bed?: number;
    };
}

export default function LocationViewer({ visibility, location }: LocationViewerProps) {
    const [isClient, setIsClient] = useState(false);
    const [recenterTick, setRecenterTick] = useState(0);
    const { userLocation } = useAuth();

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!location) return null;

    const hasMapSettings = location.coordinates && location.coordinates.length > 0;
    const hasHostelSettings = Boolean(location.hostel) || location.room !== undefined || location.bed !== undefined;



    const coordinates: [number, number] = hasMapSettings 
        ? [location.coordinates![1], location.coordinates![0]] 
        : [0, 0];
    
    const isPrecise = location.isPrecise !== false;

    let distanceBadge = null;
    if (userLocation && hasMapSettings) {
        const d = calculateDistance(userLocation.lat, userLocation.lng, coordinates[0], coordinates[1]);
        distanceBadge = (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 border border-indigo-500/50">
               <svg className="w-4 h-4 text-indigo-100/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
               <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100/80 leading-none">Distance</span>
                  <span className="text-sm font-black tracking-tight leading-none mt-0.5">{formatDistance(d)}</span>
               </div>
            </div>
        );
    }

    if (!isClient) return <div className="h-[300px] bg-gray-100 dark:bg-white/5 animate-pulse rounded-[2rem]" />;

    return (
        <div className="flex flex-col gap-6 mt-6">
            {/* Map Display with Official Location - ONLY for Public listings */}
            {visibility === 'Public' && hasMapSettings && (
                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30">
                    <div className="flex items-center gap-4 mb-2 sm:mb-6">
                        <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] leading-none mb-1.5">Public Setup</p>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight break-words">Meeting Point</h4>
                        </div>
                        <div className="shrink-0 flex items-center">
                            {distanceBadge}
                        </div>
                    </div>

                    {/* Official Location - simple text above the map */}
                    {(location.city || location.state || location.pincode) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <span className="font-bold text-gray-800 dark:text-gray-200">Location:</span> {[location.city, location.state, location.pincode].filter(Boolean).join(', ')}
                        </p>
                    )}

                    <div className="rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-white/5 shadow-2xl bg-gray-50 dark:bg-black/20 h-[300px] sm:h-[350px] relative group z-0">
                        <MapSection 
                            coordinates={coordinates}
                            isPrecise={isPrecise}
                            recenterTick={recenterTick}
                        />

                        {/* Action Buttons Overlay */}
                        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                            <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${coordinates[0]},${coordinates[1]}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-xl shadow-lg transition-all active:scale-95 border border-indigo-500/50"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                Directions
                            </a>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setRecenterTick(t => t + 1);
                                }}
                                className="flex items-center justify-center p-2 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl shadow-lg transition-all active:scale-95 border border-gray-200 dark:border-gray-700 backdrop-blur-sm"
                                title="Recenter Map"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Campus Trade-off Details - Shown whenever entered */}
            {hasHostelSettings && (
                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] leading-none mb-1.5">Campus Delivery</p>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Exchange Point</h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {location.hostel && (
                            <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-indigo-100/30 dark:border-white/5 shadow-sm overflow-hidden min-w-0">
                                <span className="text-[10px] font-black text-gray-400 dark:text-indigo-400/50 uppercase block mb-1 tracking-widest">Hostel</span>
                                <span className="text-lg font-black text-gray-900 dark:text-indigo-300 break-all">{location.hostel}</span>
                            </div>
                        )}
                        {location.room !== undefined && (
                            <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-indigo-100/30 dark:border-white/5 shadow-sm">
                                <span className="text-[10px] font-black text-gray-400 dark:text-indigo-400/50 uppercase block mb-1 tracking-widest">Room</span>
                                <span className="text-lg font-black text-gray-900 dark:text-indigo-300">{location.room}</span>
                            </div>
                        )}
                        {location.bed !== undefined && (
                            <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-indigo-100/30 dark:border-white/5 shadow-sm">
                                <span className="text-[10px] font-black text-gray-400 dark:text-indigo-400/50 uppercase block mb-1 tracking-widest">Bed</span>
                                <span className="text-lg font-black text-gray-900 dark:text-indigo-300">{location.bed}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
