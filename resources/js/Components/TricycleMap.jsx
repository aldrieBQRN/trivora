import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Maximize2, Minimize2, MapPin, Compass } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const createTodaIcon = (zone) => {
    return L.divIcon({
        className: 'custom-toda-marker',
        html: `
            <div class="relative flex items-center justify-center cursor-pointer" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.28));">
                <div style="
                    background: #1D2542;
                    color: #FFFFFF;
                    width: 28px;
                    height: 28px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #FFFFFF;
                ">
                    <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                    </div>
                </div>
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -26]
    });
};

const createCustomIcon = (status, source = 'real', isOnline = true) => {
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

    // Simulated units get a dashed outline instead of a solid ring so they read as distinct from
    // real GPS markers at a glance, without adding another color to the map.
    const ringStyle = source === 'simulated'
        ? 'border: 2px dashed #FFFFFF;'
        : 'border: 2px solid #FFFFFF;';

    return L.divIcon({
        className: 'custom-tricycle-marker',
        html: `
            <div class="relative flex items-center justify-center w-6 h-6">
                ${hasAnimation ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pulse} opacity-75"></span>` : ''}
                <div class="relative inline-flex rounded-full h-3.5 w-3.5 ${color} shadow-md z-10" style="${ringStyle}"></div>
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
    todaZones = [],
    selectedUnitId = null,
    selectedTodaId = null,
    onSelectUnit = () => {},
    onSelectToda = () => {},
}) {
    const [mapType, setMapType] = useState('roadmap');
    const [selectedTricycle, setSelectedTricycle] = useState(null);
    const [mapRef, setMapRef] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [isFollowing, setIsFollowing] = useState(false);
    const [isFlying, setIsFlying] = useState(false);

    const markerRefs = useRef({});
    const todaMarkerRefs = useRef({});
    const containerRef = useRef(null);

    const nasugbuCenter = [14.0733, 120.6320];
    const hasSimulated = tricycles.some((t) => t.source === 'simulated');

    // Listen to external selection from parent
    useEffect(() => {
        if (!selectedUnitId) return;
        const target = tricycles.find(t => t.id === selectedUnitId);
        if (target) {
            trackTricycle(target);
        }
    }, [selectedUnitId]);

    // Listen to external TODA selection from parent (e.g. clicking TODA card in sidebar)
    useEffect(() => {
        if (!selectedTodaId) return;
        const target = todaZones.find(z => z.id === selectedTodaId || z.code === selectedTodaId || z.name === selectedTodaId);
        if (target && target.latitude && target.longitude) {
            focusToda(target);
        }
    }, [selectedTodaId, todaZones]);

    const focusToda = (zone) => {
        setIsFollowing(false);
        setIsFlying(true);
        setSelectedTricycle(null);
        onSelectUnit(null);

        if (mapRef) {
            mapRef.flyTo([Number(zone.latitude), Number(zone.longitude)], 17, {
                duration: 1.2
            });

            mapRef.once('moveend', () => {
                setIsFlying(false);
            });
        }

        const marker = todaMarkerRefs.current[zone.id];
        if (marker) {
            marker.openPopup();
        }
    };

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

    // Camera follow logic (keeps focused pin centered during live simulation)
    useEffect(() => {
        if (isFollowing && !isFlying && selectedTricycle && mapRef) {
            const currentTricycle = tricycles.find(t => t.id === selectedTricycle.id);
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
        onSelectUnit(tricycle.id);
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

        if (markerRefs.current[tricycle.id]) {
            markerRefs.current[tricycle.id].openPopup();
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
        if (onSelectToda) onSelectToda(null);

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
            <div className="absolute top-3.5 right-3.5 z-[1000] pointer-events-auto flex items-center gap-2">
                {/* Auto-focus Default Nasugbu View Button */}
                <button
                    type="button"
                    onClick={resetToNasugbuView}
                    title="Focus Default Nasugbu View"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#1D2542] shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    <Compass size={13} className="text-[#1D2542]" />
                    <span>Nasugbu View</span>
                </button>

                <div className="flex items-center rounded-xl bg-white p-0.5 shadow-sm border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setMapType('roadmap')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
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
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            mapType === 'satellite'
                                ? 'bg-[#1D2542] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        Satellite
                    </button>
                    <button
                        type="button"
                        onClick={() => setMapType('carto')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#1D2542] shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                    {isFullscreen ? <Minimize2 size={13} className="text-[#1D2542]" /> : <Maximize2 size={13} className="text-[#1D2542]" />}
                    <span>{isFullscreen ? 'Exit Full View' : 'Full View'}</span>
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

                {/* Static TODA Terminal Markers */}
                {todaZones.map((zone) => {
                    if (!zone.latitude || !zone.longitude) return null;

                    return (
                        <Marker
                            key={`toda-terminal-${zone.id}`}
                            ref={(el) => { if (el) todaMarkerRefs.current[zone.id] = el; }}
                            position={[Number(zone.latitude), Number(zone.longitude)]}
                            icon={createTodaIcon(zone)}
                            zIndexOffset={100}
                            eventHandlers={{
                                click: () => {
                                    if (onSelectToda) onSelectToda(zone.id);
                                }
                            }}
                        >
                            <Popup className="trivora-popup" closeButton={true}>
                                <div style={{ padding: '10px 12px', minWidth: '200px', fontFamily: "'Inter', sans-serif", color: '#1D2542', fontSize: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#1D2542' }}>{zone.name}</span>
                                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                                            {zone.code}
                                        </span>
                                    </div>

                                    {zone.terminal_name && (
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={11} color="#64748B" style={{ flexShrink: 0 }} />
                                            <span>{zone.terminal_name}</span>
                                        </div>
                                    )}

                                    {zone.address && (
                                        <div style={{ fontSize: '10.5px', color: '#64748B', marginBottom: '6px', lineHeight: '1.3' }}>
                                            {zone.address}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', paddingTop: '5px', borderTop: '1px dashed #F1F5F9' }}>
                                        <span>Authorized Units:</span>
                                        <span style={{ fontWeight: '800', color: '#1D2542' }}>
                                            {zone.tricycles_count ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {tricycles.map((trike) => {
                    if (!trike.lat || !trike.lng) return null;

                    return (
                        <Marker
                            key={trike.id}
                            position={[trike.lat, trike.lng]}
                            icon={createCustomIcon(trike.status, trike.source, trike.is_online)}
                            zIndexOffset={trike.status === 'violator' ? 1000 : trike.status === 'coding_no_operation' ? 500 : 0}
                            ref={(ref) => { if (ref) markerRefs.current[trike.id] = ref; }}
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
                                        {trike.source === 'simulated' && (
                                            <span style={{
                                                display: 'inline-block', fontSize: '9px', fontWeight: 800,
                                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                                padding: '2px 6px', borderRadius: '4px', marginBottom: '5px',
                                                color: '#475569',
                                                backgroundColor: '#F1F5F9',
                                                border: '1px dashed #94A3B8',
                                            }}>
                                                Simulated
                                            </span>
                                        )}
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

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                                            <Navigation size={11} strokeWidth={2.2} />
                                            <span style={{ fontSize: '10px', fontWeight: '600' }}>
                                                {trike.toda || 'TODA Route'} {trike.speed_kmh ? `• ${trike.speed_kmh} km/h` : ''}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#94A3B8', paddingTop: '4px', borderTop: '1px dashed #F1F5F9' }}>
                                            {trike.source === 'simulated'
                                                ? 'Simulation — not real GPS'
                                                : trike.last_seen === 'Never'
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

            {/* FLOATING LEGEND */}
            <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(6px)',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                pointerEvents: 'auto',
                zIndex: 9999,
                minWidth: '200px'
            }}>
                <p style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#1D2542',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '8px',
                    paddingBottom: '4px',
                    borderBottom: '1px solid #E2E8F0'
                }}>Status Legend</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
                        <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#334155' }}>Active (Operating)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></div>
                        <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#334155' }}>Restricted Today (Coding Day)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#DC2626' }}></div>
                        <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#334155' }}>Coding Restriction Breach</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#94A3B8' }}></div>
                        <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#334155' }}>Offline (No recent signal)</span>
                    </div>
                    {hasSimulated && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#94A3B8', border: '1.5px dashed #FFFFFF', boxSizing: 'border-box' }}></div>
                            <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#334155' }}>Dashed ring = Simulated</span>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #E2E8F0' }}>
                    <p style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        color: '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '6px'
                    }}>TODA Terminals</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '10px', height: '10px',
                            backgroundColor: '#1D2542', border: '1.5px solid #FFFFFF',
                            borderRadius: '50% 50% 50% 0',
                            transform: 'rotate(-45deg)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}></div>
                        <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#334155' }}>
                            Configured Terminal
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}