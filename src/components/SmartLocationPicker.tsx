'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const DynamicLocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-gray-400 font-medium">Loading map...</span>
    </div>
  ),
});

interface LocationPickerProps {
    visibility: 'Public' | 'Community';
    communityId?: string;
    communities?: any[];
    locationData: {
      coordinates?: [number, number]; // [lng, lat]
      pincode?: string;
      city?: string;
      state?: string;
      hostel?: string;
      room?: number;
      bed?: number;
      isPrecise?: boolean; // Toggle for exact vs approximate distance.
    };
    onChange: (data: any) => void;
}

export default function SmartLocationPicker({ visibility, communityId, communities, locationData, onChange }: LocationPickerProps) {

    // Helper to extract hostel list from selected community
    const getHostels = () => {
        if (!communityId || !communities) return [];
        
        // Robust ID matching: communityId could be string or object, 
        // communities could have _id, id, or $oid depending on how it's serialized.
        const targetId = typeof communityId === 'object' ? (communityId as any)._id || (communityId as any).id : communityId;

        const selected = communities.find(c => {
            const cid = c._id || c.id || (c.$oid);
            return cid?.toString() === targetId?.toString();
        });

        return selected?.hostels || [];
    };

    const hostels = getHostels();

    const handleFieldChange = (field: string, value: any) => {
        onChange({ ...locationData, [field]: value });
    };

    if (visibility === 'Public') {
        return (
            <div className="space-y-4">
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-sm text-indigo-800 dark:text-indigo-400 flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>
                            <b>Trade-off Convenience.</b> Please provide a meeting location to facilitate buying/selling or service delivery. 
                        </span>
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-2">
                    <div className="flex-1">
                        <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={locationData.isPrecise !== false} 
                                onChange={(e) => handleFieldChange('isPrecise', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded" 
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Precise Location (Pin)</span>
                        </label>
                        {!locationData.isPrecise && locationData.isPrecise !== undefined && (
                            <p className="text-xs text-gray-500 mt-1 pl-2">Buyers will only see an approximate 500m area.</p>
                        )}
                    </div>
                </div>

                {/* Map Display */}
                <DynamicLocationMap 
                    coordinates={locationData.coordinates}
                    isPrecise={locationData.isPrecise !== false}
                    onChange={(coords: [number, number], details: any) => {
                        // Pass current state to onChange as functional update to preserve isPrecise toggle
                        onChange((prev: any) => ({
                            ...prev,
                            coordinates: coords,
                            pincode: details.pincode,
                            city: details.city,
                            state: details.state
                        }));
                    }}
                />

                {/* Hidden Fields populated by map */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                     <div className="col-span-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Auto City</label>
                          <input 
                            type="text" 
                            disabled 
                            value={locationData.city || ''} 
                            className="w-full h-10 text-xs bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl px-3 text-gray-600 dark:text-gray-300 font-bold placeholder:text-gray-400" 
                            placeholder="Auto-fills from Map" 
                          />
                     </div>
                     <div className="col-span-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Auto Pincode</label>
                          <input 
                            type="text" 
                            disabled 
                            value={locationData.pincode || ''} 
                            className="w-full h-10 text-xs bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl px-3 text-gray-600 dark:text-gray-300 font-bold placeholder:text-gray-400" 
                            placeholder="Auto-fills from Map" 
                          />
                     </div>
                </div>
            </div>
        );
    }

    // Community Listing Case
    if (visibility === 'Community') {
        const canPickRoom = !!locationData.hostel;
        const canPickBed = !!locationData.room;

        return (
            <div className="space-y-4">
                 <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-sm text-emerald-800 dark:text-emerald-400 flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <span>
                            <b>Campus Trade-off.</b> Select your hostel/room to coordinate deliveries seamlessly. Providing your hostel also ensures your listing appears in targeted hostel-based searches. <i>All fields are optional.</i>
                        </span>
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Hostel */}
                    <div className="col-span-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Hostel</label>
                        <select 
                            className="w-full h-10 px-3 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 font-medium"
                            value={locationData.hostel || ''}
                            onChange={(e) => {
                                onChange({
                                    ...locationData,
                                    hostel: e.target.value,
                                    room: undefined, // Reset dependents
                                    bed: undefined
                                });
                            }}
                        >
                            <option value="" className="dark:bg-gray-800 dark:text-white">Select Hostel (Optional)</option>
                            {hostels.map((h: string) => <option key={h} value={h} className="dark:bg-gray-800 dark:text-white">{h}</option>)}
                        </select>
                        {!hostels.length && communityId && <p className="text-[10px] text-gray-400 mt-1">No hostels configured for this Circle.</p>}
                    </div>

                    {/* Room */}
                    <div className={`col-span-1 transition-opacity ${!canPickRoom ? 'opacity-50 pointer-events-none' : ''}`}>
                         <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Room Number</label>
                         <input 
                            type="number"
                            min="1" max="1000"
                            placeholder="e.g. 338"
                            value={locationData.room || ''}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                onChange({
                                    ...locationData,
                                    room: isNaN(val) ? undefined : val,
                                    bed: undefined // Reset dependents
                                });
                            }}
                            className="w-full h-10 px-3 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 font-medium disabled:bg-gray-100 dark:disabled:bg-gray-900"
                            disabled={!canPickRoom}
                         />
                    </div>

                    {/* Bed */}
                    <div className={`col-span-1 transition-opacity ${!canPickBed ? 'opacity-50 pointer-events-none' : ''}`}>
                         <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Bed Number</label>
                         <input 
                            type="number"
                            min="1" max="19"
                            placeholder="e.g. 2"
                            value={locationData.bed || ''}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                handleFieldChange('bed', isNaN(val) ? undefined : val);
                            }}
                            className="w-full h-10 px-3 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 font-medium disabled:bg-gray-100 dark:disabled:bg-gray-900"
                            disabled={!canPickBed}
                         />
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
