'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';



interface LocationMapProps {
    coordinates?: [number, number]; // [lng, lat] expected from db
    isPrecise?: boolean;
    onChange?: (coords: [number, number], details: { city?: string; state?: string; pincode?: string }) => void;
}

// Component to handle clicks on the map to drop the marker
function LocationPicker({ coordinates, isPrecise, setPosition }: any) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]); // Internal state uses [lat, lng]
        },
    });

    const bluePin = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });

    return coordinates ? (
        <>
            {isPrecise ? (
                <Marker position={coordinates} icon={bluePin} />
            ) : (
                <Circle 
                    center={coordinates} 
                    pathOptions={{ fillColor: '#4f46e5', fillOpacity: 0.1, color: '#4f46e5', weight: 1.5, dashArray: '5, 5' }} 
                    radius={500} 
                />
            )}
        </>
    ) : null;
}

// Controller to fly map to specific coordinates programmatically
function MapController({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15);
        }
    }, [center, map]);
    return null;
}

export default function LocationMap({ coordinates, isPrecise = true, onChange }: LocationMapProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    
    // Convert from Database [lng, lat] to Leaflet [lat, lng] internally
    const initialPos: [number, number] | null = coordinates ? [coordinates[1], coordinates[0]] : null;
    const [position, setPosition] = useState<[number, number] | null>(initialPos);
    const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(initialPos);
    
    const isFirstRender = useRef(true);

    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Whenever position changes (and it's not the first load auto-triggering), we reverse geocode it.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        
        if (position && onChange) {
            reverseGeocode(position[0], position[1]).then(details => {
                 // Pass back to parent as [lng, lat] (GeoJSON format)
                 onChange([position[1], position[0]], details);
            });
        }
    }, [position]);

    // Live Auto-Search (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 2) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 600); // 600ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const address = data.address || {};
            return {
                city: address.city || address.town || address.county || address.state_district,
                state: address.state,
                pincode: address.postcode
            };
        } catch (error) {
            console.error("Reverse geocoding failed", error);
            return {};
        }
    };

    const performSearch = async (query: string) => {
        setSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            if (data && data.length > 0) {
                setSearchResults(data);
                setShowResults(true);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setSearching(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(searchQuery);
    };

    const selectResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setPosition([lat, lon]);
        setFlyToCenter([lat, lon]);
        setShowResults(false);
        setSearchQuery(result.name || result.display_name.split(',')[0]); // Update input with selected short name
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setPosition([lat, lng]);
                setFlyToCenter([lat, lng]);
            },
            () => alert('Unable to retrieve your location. Please allow permissions.')
        );
    };

    return (
        <div className="relative w-full border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm group">
             {/* Overlay Toolbar */}
             <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
                  <div className="flex-1 relative">
                      <form 
                        onSubmit={handleSearchSubmit} 
                        className="bg-white dark:bg-[#1a1a1a] rounded-[15px] shadow-2xl shadow-black/20 flex items-center px-3 py-1.5 w-full border border-gray-100 dark:border-white/5"
                      >
                           <input 
                              type="text" 
                              className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-1 outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 font-bold"
                              placeholder="Search location or pincode..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                           />
                           <button type="submit" disabled={searching} className="text-gray-400 hover:text-indigo-600 p-1.5 transition-colors">
                                {searching ? (
                                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                )}
                           </button>
                      </form>
                      
                      {/* Search Results Dropdown */}
                      {showResults && searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] rounded-[20px] shadow-2xl border border-gray-100 dark:border-white/10 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
                              {searchResults.map((result, idx) => (
                                  <button
                                      key={idx}
                                      type="button"
                                      onClick={() => selectResult(result)}
                                      className="w-full text-left px-4 py-3 text-sm border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors last:border-0"
                                  >
                                      <p className="font-black text-gray-900 dark:text-gray-100 truncate tracking-tight">{result.name || result.display_name.split(',')[0]}</p>
                                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate opacity-70">{result.display_name}</p>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
                 <button 
                    type="button" 
                    onClick={handleLocateMe}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-[15px] shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                    title="Use My Location"
                 >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </button>
             </div>

            <div className="h-96 w-full">
                <MapContainer 
                    center={position || [20.5937, 78.9629]} // Default to India
                    zoom={position ? 15 : 5} 
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    scrollWheelZoom={true} 
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={flyToCenter} />
                    <LocationPicker 
                        key={isPrecise ? 'pin' : 'area'} 
                        coordinates={position} 
                        isPrecise={isPrecise} 
                        setPosition={setPosition}
                    />
                </MapContainer>
            </div>
            
            {/* Instruction Footer */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 text-center border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 font-medium">Click anywhere on the map to pin your exact trace-off location.</p>
            </div>
        </div>
    );
}
