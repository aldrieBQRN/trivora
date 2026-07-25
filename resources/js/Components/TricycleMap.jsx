import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Search, X, Maximize2, Minimize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import routeAData from '../data/routeA.json';
import routeBData from '../data/routeB.json';
import routeCData from '../data/routeC.json';
import routeDData from '../data/routeD.json';

const createCustomIcon = (status) => {
    let color, pulse, hasAnimation;

    if (status === 'compliant') {
        color = 'bg-emerald-500';
        pulse = '';
        hasAnimation = false;
    } else if (status === 'coding_no_operation') {
        color = 'bg-amber-500';
        pulse = '';
        hasAnimation = false;
    } else if (status === 'route_violator') {
        color = 'bg-purple-600';
        pulse = 'bg-purple-400';
        hasAnimation = true;
    } else {
        color = 'bg-red-600';
        pulse = 'bg-red-400';
        hasAnimation = true;
    }

    return L.divIcon({
        className: 'custom-tricycle-marker',
        html: `
            <div class="relative flex items-center justify-center w-6 h-6">
                ${hasAnimation ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pulse} opacity-75"></span>` : ''}
                <div class="relative inline-flex rounded-full h-4 w-4 ${color} ring-2 ring-white shadow-md z-10"></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14]
    });
};

export default function TricycleMap({ tricycles = [], routes = {} }) {
    const [searchInput, setSearchInput] = React.useState('');
    const [selectedTricycle, setSelectedTricycle] = React.useState(null);
    const [mapRef, setMapRef] = React.useState(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const [isFollowing, setIsFollowing] = React.useState(false);
    const [isFlying, setIsFlying] = React.useState(false);

    const markerRefs = React.useRef({});
    const containerRef = React.useRef(null);

    const nasugbuCenter = [14.0733, 120.6320];

    // Fullscreen change listener & map invalidateSize trigger
    React.useEffect(() => {
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
        document.addEventListener('MSFullscreenChange', handleFsChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
            document.removeEventListener('mozfullscreenchange', handleFsChange);
            document.removeEventListener('MSFullscreenChange', handleFsChange);
        };
    }, [mapRef]);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            const req = containerRef.current.requestFullscreen ||
                        containerRef.current.webkitRequestFullscreen ||
                        containerRef.current.mozRequestFullScreen ||
                        containerRef.current.msRequestFullscreen;

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
                         document.mozCancelFullScreen ||
                         document.msExitFullscreen;

            if (exit) {
                exit.call(document).then(() => {
                    setIsFullscreen(false);
                    if (mapRef) setTimeout(() => mapRef.invalidateSize(), 200);
                });
            }
        }
    };

    // HARD LOCK CAMERA LOGIC (Suspended while flying to allow smooth animation)
    React.useEffect(() => {
        if (isFollowing && !isFlying && selectedTricycle && mapRef) {
            const currentTricycle = tricycles.find(t => t.id === selectedTricycle.id);
            if (currentTricycle) {
                mapRef.setView([currentTricycle.lat, currentTricycle.lng], mapRef.getZoom(), {
                    animate: false // Keeps the pin rigidly in the center without stuttering
                });
            }
        }
    }, [isFollowing, isFlying, selectedTricycle, mapRef, tricycles]);

    const filteredTricycles = searchInput.trim() === ''
        ? []
        : tricycles.filter(t =>
            t.id.toLowerCase().includes(searchInput.toLowerCase()) ||
            t.operator.toLowerCase().includes(searchInput.toLowerCase()) ||
            t.plate.includes(searchInput)
        );

    // SMOOTH FLY AND POPUP OPEN
    const trackTricycle = (tricycle) => {
        setSelectedTricycle(tricycle);
        setIsFollowing(true);
        setIsFlying(true); // Pause hard-lock

        if (mapRef) {
            // Smoothly fly to the target
            mapRef.flyTo([tricycle.lat, tricycle.lng], 18, {
                duration: 1.5
            });

            // Once the flight finishes, re-engage the hard-lock
            mapRef.once('moveend', () => {
                setIsFlying(false);
            });
        }

        // Programmatically open the popup perfectly on the pin
        if (markerRefs.current[tricycle.id]) {
            markerRefs.current[tricycle.id].openPopup();
        }
    };

    const handleSearchResultClick = (tricycle) => {
        trackTricycle(tricycle);
        setSearchInput('');
    };

    const closeAndStopFollowing = (e) => {
        if (e) e.stopPropagation();
        setIsFollowing(false);
        setIsFlying(false);
        setSelectedTricycle(null);
        if (mapRef) mapRef.closePopup();
    };

    return (
        <div
            ref={containerRef}
            className={`relative border border-stone-200 transition-all duration-300 ${
                isFullscreen
                    ? 'fixed inset-0 z-[99999] w-screen h-screen bg-stone-900 rounded-none border-none'
                    : 'h-full w-full rounded-[1.5rem]'
            }`}
            style={{ overflow: 'hidden' }}
        >
            {/* SEARCH BAR (TOP LEFT) */}
            <div style={{ position: 'absolute', top: '12px', left: '16px', zIndex: 9998, width: '300px' }}>
                <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', minHeight: '28px' }}>
                        <Search size={20} style={{ color: '#9CA3AF', marginRight: '10px', flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="Search by ID, plate, or operator..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', fontFamily: "'Inter', sans-serif", color: '#1F2937', backgroundColor: 'transparent' }}
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput('')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                            >
                                <X size={18} style={{ color: '#9CA3AF' }} />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {filteredTricycles.length > 0 && (
                        <div style={{ borderTop: '1px solid #E5E7EB', maxHeight: '300px', overflowY: 'auto' }}>
                            {filteredTricycles.map((trike) => (
                                <div
                                    key={trike.id}
                                    onClick={() => handleSearchResultClick(trike)}
                                    style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: 'transparent' }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', fontFamily: "'Inter', sans-serif" }}>
                                        Plate: {trike.plate} | {trike.id}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
                                        {trike.operator}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* FULLSCREEN TOGGLE BUTTON (TOP RIGHT WITH WHITE BACKGROUND) */}
            <div style={{ position: 'absolute', top: '12px', right: '16px', zIndex: 9998 }}>
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map View'}
                    style={{
                        backgroundColor: '#FFFFFF',
                        color: '#1F2937',
                        border: '1px solid #E5E7EB',
                        borderRadius: '14px',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: "'DM Sans', sans-serif",
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                    {isFullscreen ? (
                        <>
                            <Minimize2 size={16} color="#DC2626" />
                            <span>Exit Fullscreen</span>
                        </>
                    ) : (
                        <>
                            <Maximize2 size={16} color="#2563EB" />
                            <span>Fullscreen</span>
                        </>
                    )}
                </button>
            </div>

            <style>{`
                .leaflet-popup-tip { display: none !important; }
                .leaflet-popup { margin-bottom: 0 !important; }
                .leaflet-popup-close-button { display: none !important; }
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
            `}</style>

            <MapContainer
                ref={setMapRef}
                center={nasugbuCenter}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', backgroundColor: '#F7F7F5', borderRadius: '24px', overflow: 'hidden' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    subdomains="abcd"
                    maxZoom={20}
                />

                {/* TODA Route 25m Tolerance Corridors (Semi-transparent halo) */}
                <GeoJSON key="buf-bucana" data={routes?.bucana || routeDData} style={{ color: '#7C3AED', weight: 22, opacity: 0.16 }} />
                <GeoJSON key="buf-brgy10" data={routes?.brgy10 || routeCData} style={{ color: '#F59E0B', weight: 22, opacity: 0.16 }} />
                <GeoJSON key="buf-brgy8"  data={routes?.brgy8  || routeAData} style={{ color: '#4F5BCB', weight: 22, opacity: 0.16 }} />
                <GeoJSON key="buf-brgy14" data={routes?.brgy14 || routeBData} style={{ color: '#059669', weight: 22, opacity: 0.16 }} />

                {/* TODA Designated Route Centerlines */}
                <GeoJSON key="route-bucana" data={routes?.bucana || routeDData} style={{ color: '#7C3AED', weight: 4, opacity: 0.9 }} />
                <GeoJSON key="route-brgy10" data={routes?.brgy10 || routeCData} style={{ color: '#F59E0B', weight: 4, opacity: 0.9 }} />
                <GeoJSON key="route-brgy8"  data={routes?.brgy8  || routeAData} style={{ color: '#4F5BCB', weight: 4, opacity: 0.9 }} />
                <GeoJSON key="route-brgy14" data={routes?.brgy14 || routeBData} style={{ color: '#059669', weight: 4, opacity: 0.9 }} />

                {tricycles.map((trike) => {
                    if (!trike.lat || !trike.lng) return null;

                    return (
                        <Marker
                            key={trike.id}
                            position={[trike.lat, trike.lng]}
                            icon={createCustomIcon(trike.status)}
                            zIndexOffset={trike.status === 'violator' ? 1000 : trike.status === 'coding_no_operation' ? 500 : 0}
                            ref={(ref) => { if (ref) markerRefs.current[trike.id] = ref; }}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    trackTricycle(trike); // Triggers smooth fly & opens modal
                                }
                            }}
                        >
                            <Popup className="trivora-popup" closeButton={false}>
                                <div style={{ padding: '8px', minWidth: '200px', fontFamily: "'Inter', sans-serif", color: '#292524', fontSize: '13px', backgroundColor: '#FFFFFF', borderRadius: '8px', position: 'relative' }}>

                                    <button
                                        onClick={closeAndStopFollowing}
                                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9CA3AF', fontSize: '20px', lineHeight: '1' }}
                                    >
                                        ✕
                                    </button>

                                    <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #E7E5E4', paddingRight: '20px' }}>
                                        <span style={{ fontSize: '18px', fontWeight: '900', color: '#111827', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>
                                            Plate: {trike.plate}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                            GPS ID: {trike.id}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563', display: 'block' }}>
                                            Operator: {trike.operator}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '10px', height: '10px', borderRadius: '50%',
                                                backgroundColor: trike.status === 'compliant' ? '#16A34A' : trike.status === 'coding_no_operation' ? '#D97706' : trike.status === 'route_violator' ? '#9333EA' : '#DC2626'
                                            }}></div>
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#292524' }}>
                                                {trike.status === 'compliant' ? 'On Route (Allowed)' : trike.status === 'coding_no_operation' ? 'Coding - Off Duty' : trike.status === 'route_violator' ? 'Route Violation (>25m Stray)' : 'Coding Violator'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#57534E' }}>
                                            <Navigation size={11} strokeWidth={2.5} />
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                {trike.toda || 'TODA Route'} {trike.speed_kmh ? `• ${trike.speed_kmh} km/h` : ''}
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
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)', padding: '16px', borderRadius: '18px', border: '1px solid #c7d2fe', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', pointerEvents: 'auto', zIndex: 9999, minWidth: '220px' }}>
                <p style={{ fontSize: '11px', fontWeight: 900, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #c7d2fe' }}>Live Telematics Legend</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16A34A' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>Compliant (In 25m Zone)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9333EA' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>Route Violation (&gt;25m Stray)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#DC2626' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>Coding Restriction Breach</span>
                    </div>
                </div>
            </div>
        </div>
    );
}