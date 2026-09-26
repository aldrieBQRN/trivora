import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Maximize2, Minimize2, MapPin, Compass } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const createCustomIcon = (status, isOnline = true) => {
    let color, pulse, hasAnimation;

    if (!isOnline || status === 'offline') {
        color = 'bg-slate-400';
        pulse = '';
        hasAnimation = false;
    } else if (status === 'violator') {
        // Coding restriction breach / violator
        color = 'bg-rose-600';
        pulse = 'bg-rose-400';
        hasAnimation = true;
    } else if (status === 'coding_no_operation') {
        // Active GPS unit subject to today's coding scheme
        color = 'bg-amber-500';
        pulse = 'bg-amber-400';
        hasAnimation = true;
    } else {
        // Compliant & active GPS unit
        color = 'bg-emerald-500';
        pulse = 'bg-emerald-400';
        hasAnimation = true;
    }

    return L.divIcon({
        className: 'custom-tricycle-marker',
        html: `
            <div class="relative flex items-center justify-center w-6 h-6">
                ${hasAnimation ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pulse} opacity-75"></span>` : ''}
                <div class="relative inline-flex rounded-full h-3.5 w-3.5 ${color} shadow-md z-10" style="border: 2px solid #FFFFFF;"></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14]
    });
};

const MAP_THEMES = {
    roadmap: {
        label: 'Google Map',
        url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>',
        subdomains: '0123',
        bg: '#F2EFE9',
    },
    satellite: {
        label: 'Satellite',
        url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps Imagery</a>',
        subdomains: '0123',
        bg: '#1D2542',
    },
    carto: {
        label: 'CARTO',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_3qo7_1_ac41fdc9883213d666d06544',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        bg: '#F8FAFC',
    },
};

export default function TricycleMap({
    tricycles = [],
    selectedUnitId = null,
    onSelectUnit = () => {},
}) {
    const [mapType, setMapType] = useState('roadmap');
    const [selectedTricycle, setSelectedTricycle] = useState(null);
    const [mapRef, setMapRef] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [isFollowing, setIsFollowing] = useState(false);
    const [isFlying, setIsFlying] = useState(false);

    const markerRefs = useRef({});
    const containerRef = useRef(null);

    const nasugbuCenter = [14.0733, 120.6320];

    // Listen to external selection from parent. `db_id` — the tricycle's primary key — is the
    // identity here (and the marker key/ref below) because `id` is only the display body/coding
    // number and can legitimately repeat across units; see DashboardController::index().
    useEffect(() => {
        if (!selectedUnitId) return;
        const target = tricycles.find(t => t.db_id === selectedUnitId);
        if (target) {
            trackTricycle(target);
        }
    }, [selectedUnitId]);

    // Fullscreen change listener & map invalidateSize trigger
    useEffect(() => {
        const handleFsChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            if (mapRef) {
                setTimeout(() => mapRef.invalidateSize(), 200);
            }
        };

        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);
        document.addEventListener('mozfullscreenchange', handleFsChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
            document.removeEventListener('mozfullscreenchange', handleFsChange);
        };
    }, [mapRef]);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            const req = containerRef.current.requestFullscreen ||
                        containerRef.current.webkitRequestFullscreen ||
                        containerRef.current.mozRequestFullScreen;

            if (req) {
                req.call(containerRef.current).then(() => {
                    setIsFullscreen(true);
                    if (mapRef) setTimeout(() => mapRef.invalidateSize(), 200);
                }).catch(() => {
                    setIsFullscreen(!isFullscreen);
                    if (mapRef) setTimeout(() => mapRef.invalidateSize(), 200);
                });
            } else {
                setIsFullscreen(!isFullscreen);
                if (mapRef) setTimeout(() => mapRef.invalidateSize(), 200);
            }
        } else {
            const exit = document.exitFullscreen ||
                         document.webkitExitFullscreen ||
                         document.mozCancelFullScreen;

            if (exit) {
                exit.call(document).then(() => {
                    setIsFullscreen(false);
                    if (mapRef) setTimeout(() => mapRef.invalidateSize(), 200);
                });
            }
        }
    };

    // Camera follow logic (keeps focused pin centered during live tracking)
    useEffect(() => {
        if (isFollowing && !isFlying && selectedTricycle && mapRef) {
            const currentTricycle = tricycles.find(t => t.db_id === selectedTricycle.db_id);
            if (currentTricycle) {
                mapRef.setView([currentTricycle.lat, currentTricycle.lng], mapRef.getZoom(), {
                    animate: false
                });
            }
        }
    }, [isFollowing, isFlying, selectedTricycle, mapRef, tricycles]);

    // Smooth fly to vehicle & open popup
    const trackTricycle = (tricycle) => {
        setSelectedTricycle(tricycle);
        onSelectUnit(tricycle.db_id);
        setIsFollowing(true);
        setIsFlying(true);

        if (mapRef) {
            mapRef.flyTo([tricycle.lat, tricycle.lng], 17, {
                duration: 1.2
            });

            mapRef.once('moveend', () => {
                setIsFlying(false);
            });
        }

        if (markerRefs.current[tricycle.db_id]) {
            markerRefs.current[tricycle.db_id].openPopup();
        }
    };

    const closeAndStopFollowing = (e) => {
        if (e) e.stopPropagation();
        setIsFollowing(false);
        setIsFlying(false);
        setSelectedTricycle(null);
        onSelectUnit(null);
        if (mapRef) mapRef.closePopup();
    };

    const resetToNasugbuView = () => {
        setIsFollowing(false);
        setIsFlying(true);
        setSelectedTricycle(null);
        onSelectUnit(null);

        if (mapRef) {
            mapRef.closePopup();
            mapRef.flyTo(nasugbuCenter, 15, {
                duration: 1.2
            });

            mapRef.once('moveend', () => {
                setIsFlying(false);
            });
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative flex flex-col overflow-hidden bg-slate-900 border border-slate-200/90 shadow-sm ${
                isFullscreen
                    ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none'
                    : 'h-full w-full rounded-2xl'
            }`}
        >
            {/* ══════════════════════════════════════════════════════════════
                TOP CONTROLS: MAP THEME SELECTOR + FULL VIEW BUTTON
               ══════════════════════════════════════════════════════════════ */}
            <div className="absolute top-2 left-2 right-2 sm:top-3.5 sm:left-auto sm:right-3.5 z-[1000] pointer-events-none flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                {/* Auto-focus Default Nasugbu View Button — icon-only on mobile so this row
                    doesn't overflow the map's width on narrow screens. */}
                <button
                    type="button"
                    onClick={resetToNasugbuView}
                    title="Focus Default Nasugbu View"
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-white px-2 sm:px-3 py-1.5 text-xs font-bold text-[#1D2542] shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    <Compass size={13} className="text-[#1D2542]" />
                    <span className="hidden sm:inline">Nasugbu View</span>
                </button>

                <div className="pointer-events-auto flex items-center rounded-xl bg-white p-0.5 shadow-sm border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setMapType('roadmap')}
                        className={`rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-all ${
                            mapType === 'roadmap'
                                ? 'bg-[#1D2542] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        Map
                    </button>
                    <button
                        type="button"
                        onClick={() => setMapType('satellite')}
                        title="Satellite"
                        className={`rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-all ${
                            mapType === 'satellite'
                                ? 'bg-[#1D2542] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        <span className="sm:hidden">Sat</span>
                        <span className="hidden sm:inline">Satellite</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMapType('carto')}
                        className={`rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-all ${
                            mapType === 'carto'
                                ? 'bg-[#1D2542] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        CARTO
                    </button>
                </div>

                <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit Full View' : 'Full View'}
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-white px-2 sm:px-3.5 py-1.5 text-xs font-bold text-[#1D2542] shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                    {isFullscreen ? <Minimize2 size={13} className="text-[#1D2542]" /> : <Maximize2 size={13} className="text-[#1D2542]" />}
                    <span className="hidden sm:inline">{isFullscreen ? 'Exit Full View' : 'Full View'}</span>
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                LEAFLET MAP CONTAINER
               ══════════════════════════════════════════════════════════════ */}
            <MapContainer
                ref={setMapRef}
                center={nasugbuCenter}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
                style={{ height: '100%', width: '100%', backgroundColor: MAP_THEMES[mapType]?.bg || '#F2EFE9' }}
            >
                {/* Active Basemap Tile Layer */}
                <TileLayer
                    key={mapType}
                    url={MAP_THEMES[mapType].url}
                    attribution={MAP_THEMES[mapType].attribution}
                    subdomains={MAP_THEMES[mapType].subdomains}
                    maxZoom={20}
                />

                {tricycles.map((trike) => {
                    if (!trike.lat || !trike.lng) return null;

                    return (
                        <Marker
                            key={trike.db_id}
                            position={[trike.lat, trike.lng]}
                            icon={createCustomIcon(trike.status, trike.is_online)}
                            zIndexOffset={trike.status === 'violator' ? 1000 : trike.status === 'coding_no_operation' ? 500 : 0}
                            ref={(ref) => { if (ref) markerRefs.current[trike.db_id] = ref; }}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    trackTricycle(trike);
                                }
                            }}
                        >
                            <Popup className="trivora-popup" closeButton={false}>
                                <div style={{ padding: '8px', minWidth: '190px', fontFamily: "'Inter', sans-serif", color: '#1D2542', fontSize: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', position: 'relative' }}>

                                    <button
                                        type="button"
                                        onClick={closeAndStopFollowing}
                                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8', fontSize: '18px', lineHeight: '1' }}
                                    >
                                        ✕
                                    </button>

                                    <div style={{ marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9', paddingRight: '16px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1D2542', letterSpacing: '0.04em', display: 'block', marginBottom: '2px' }}>
                                            {trike.plate}
                                        </span>
                                        <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#64748B', display: 'block', marginBottom: '2px' }}>
                                            Coding #{trike.coding_scheme || trike.id}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155', display: 'block' }}>
                                            {trike.operator}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                backgroundColor: !trike.is_online || trike.status === 'offline'
                                                    ? '#94A3B8'
                                                    : trike.status === 'violator'
                                                        ? '#DC2626'
                                                        : trike.status === 'coding_no_operation'
                                                            ? '#F59E0B'
                                                            : '#10B981'
                                            }}></div>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase',
                                                color: !trike.is_online || trike.status === 'offline'
                                                    ? '#64748B'
                                                    : trike.status === 'violator'
                                                        ? '#DC2626'
                                                        : trike.status === 'coding_no_operation'
                                                            ? '#D97706'
                                                            : '#059669'
                                            }}>
                                                {!trike.is_online || trike.status === 'offline'
                                                    ? 'Offline'
                                                    : trike.status === 'violator'
                                                        ? 'Coding Violator'
                                                        : trike.status === 'coding_no_operation'
                                                            ? 'Restricted Today (Coding Day)'
                                                            : 'Active · Allowed Operation'}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#94A3B8', paddingTop: '4px', borderTop: '1px dashed #F1F5F9' }}>
                                            {trike.last_seen === 'Never'
                                                ? 'No GPS signal received yet'
                                                : `Last update: ${trike.last_seen || 'just now'}`}
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                <ZoomControl position="bottomright" />
            </MapContainer>

            {/* FLOATING LEGEND — compacted (smaller padding/font/dot size) on mobile so it
                doesn't dominate a shorter mobile map viewport; unchanged from the original at
                sm+ breakpoints. */}
            <div className="pointer-events-auto absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-[9999] min-w-[150px] sm:min-w-[200px] rounded-xl border border-slate-200 bg-white/95 p-2.5 sm:p-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.08)] backdrop-blur-[6px]">
                <p className="mb-1.5 sm:mb-2 border-b border-slate-200 pb-1 sm:pb-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#1D2542]">
                    Status Legend
                </p>

                <div className="flex flex-col gap-1 sm:gap-1.5">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="h-2 w-2 sm:h-[9px] sm:w-[9px] shrink-0 rounded-full bg-emerald-500" />
                        <span className="text-[9px] sm:text-[10.5px] font-semibold text-slate-700">Active (Operating)</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="h-2 w-2 sm:h-[9px] sm:w-[9px] shrink-0 rounded-full bg-amber-500" />
                        <span className="text-[9px] sm:text-[10.5px] font-semibold text-slate-700">Restricted Today (Coding Day)</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="h-2 w-2 sm:h-[9px] sm:w-[9px] shrink-0 rounded-full bg-red-600" />
                        <span className="text-[9px] sm:text-[10.5px] font-semibold text-slate-700">Coding Restriction Breach</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="h-2 w-2 sm:h-[9px] sm:w-[9px] shrink-0 rounded-full bg-slate-400" />
                        <span className="text-[9px] sm:text-[10.5px] font-semibold text-slate-700">Offline (No recent signal)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}