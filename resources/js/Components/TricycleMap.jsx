import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const createCustomIcon = (status) => {
    const isCompliant = status === 'compliant';
    const color = isCompliant ? 'bg-emerald-600' : 'bg-rose-600';
    const pulse = isCompliant ? 'bg-emerald-400' : 'bg-rose-400';

    return L.divIcon({
        className: 'custom-trivora-pin',
        html: `
            <div class="relative flex items-center justify-center w-8 h-8">
                <div class="absolute inset-0 rounded-full opacity-30 animate-ping ${pulse}"></div>
                <div class="w-3.5 h-3.5 rounded-full ${color} ring-[3px] ring-white shadow-md z-10"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10]
    });
};

export default function TricycleMap({ tricycles = [], routes = {} }) {
    const nasugbuCenter = [14.0733, 120.6320];

    const routeStyles = {
        'A': { color: '#2563eb', weight: 5, opacity: 0.7 },
        'B': { color: '#7c3aed', weight: 5, opacity: 0.7 },
        'C': { color: '#ea580c', weight: 5, opacity: 0.7 },
        'D': { color: '#10b981', weight: 5, opacity: 0.7 },
    };

    return (
        <div className="h-full w-full relative z-0 rounded-[1.5rem] overflow-hidden border border-stone-200">
            <MapContainer
                center={nasugbuCenter}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', backgroundColor: '#F7F7F5' }}
            >
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    attribution="&copy; Google Maps"
                />

                {Object.keys(routes).map(id => (
                    <GeoJSON
                        key={id}
                        data={routes[id]}
                        style={routeStyles[id] || { color: '#444' }}
                    />
                ))}

                {tricycles.map((trike) => {
                    if (!trike.lat || !trike.lng) return null;

                    return (
                        <Marker
                            key={trike.id}
                            position={[trike.lat, trike.lng]}
                            icon={createCustomIcon(trike.status)}
                        >
                            <Popup className="trivora-popup">
                                <div className="p-1 min-w-[150px] font-sans">
                                    <div className="flex justify-between items-center mb-1.5 border-b border-stone-100 pb-1.5">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-stone-900 uppercase tracking-tighter leading-none mb-1">
                                                {trike.id}
                                            </span>
                                            {/* ADDED: Operator Name */}
                                            <span className="text-[9px] font-bold text-stone-500 uppercase leading-none">
                                                {trike.operator}
                                            </span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${trike.status === 'compliant' ? 'bg-emerald-500' : 'bg-rose-600'}`}></div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-stone-400">
                                            <Navigation size={10} strokeWidth={3} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">
                                                TODA {trike.toda} // LIVE GPS
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                <ZoomControl position="bottomright" />
            </MapContainer>

            {/* FLOATING LEGEND */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-stone-200 shadow-sm pointer-events-none">
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Enforcement</p>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-bold text-stone-700 uppercase">Compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-stone-700 uppercase">Coding Alert</span>
                    </div>
                </div>
            </div>
        </div>
    );
}