'use client';

import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Internal component to handle map center updates
function MapViewUpdater({ center, recenterTick }: { center: [number, number], recenterTick?: number }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { animate: true, duration: 1.5 });
        }
    }, [center, map, recenterTick]);
    return null;
}

interface MapSectionProps {
    coordinates: [number, number]; // [lat, lng] for Leaflet
    isPrecise: boolean;
    recenterTick?: number;
}

export default function MapSection({ coordinates, isPrecise, recenterTick }: MapSectionProps) {
    const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });

    return (
        <MapContainer 
            center={coordinates} 
            zoom={15} 
            scrollWheelZoom={true} 
            className="h-full w-full"
            style={{ position: 'relative' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewUpdater center={coordinates} recenterTick={recenterTick} />
            {isPrecise ? (
                <Marker position={coordinates} icon={icon} />
            ) : (
                <Circle 
                    center={coordinates}
                    radius={500}
                    pathOptions={{ 
                        color: '#f59e0b', 
                        fillColor: '#f59e0b', 
                        fillOpacity: 0.2,
                        weight: 2,
                        dashArray: '5, 10'
                    }}
                />
            )}
        </MapContainer>
    );
}
