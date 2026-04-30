import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

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
    } else {
        color = 'bg-red-600';
        pulse = 'bg-red-400';
        hasAnimation = true;
    }

    return L.divIcon({
        className: 'custom-trivora-pin',
        html: `
            <div class="relative flex items-center justify-center w-8 h-8">
                ${hasAnimation ? `<div class="absolute inset-0 rounded-full opacity-30 animate-ping ${pulse}"></div>` : ''}
                <div class="w-3.5 h-3.5 rounded-full ${color} ring-[3px] ring-white shadow-md z-10"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -22]
    });
};

export default function TricycleMap({ tricycles = [], routes = {} }) {
    const [searchInput, setSearchInput] = React.useState('');
    const [selectedTricycle, setSelectedTricycle] = React.useState(null);
    const [mapRef, setMapRef] = React.useState(null);

    const [isFollowing, setIsFollowing] = React.useState(false);
    const [isFlying, setIsFlying] = React.useState(false); // New state to allow smooth zooming

    const markerRefs = React.useRef({});

    const nasugbuCenter = [14.0733, 120.6320];

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
        <div className="h-full w-full relative rounded-[1.5rem] border border-stone-200" style={{ overflow: 'visible' }}>
            {/* SEARCH BAR */}
            <div style={{ position: 'absolute', top: '12px', right: '16px', zIndex: 9998, width: '320px' }}>
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
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    attribution="&copy; Google Maps"
                />

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
                                                backgroundColor: trike.status === 'compliant' ? '#16A34A' : trike.status === 'coding_no_operation' ? '#D97706' : '#DC2626'
                                            }}></div>
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#292524' }}>
                                                {trike.status === 'compliant' ? 'Allowed' : trike.status === 'coding_no_operation' ? 'Coding - Not Operating' : 'Violator'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#57534E' }}>
                                            <Navigation size={11} strokeWidth={2.5} />
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                {trike.toda}
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
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)', padding: '16px', borderRadius: '18px', border: '1px solid #c7d2fe', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', pointerEvents: 'auto', zIndex: 9999, minWidth: '200px' }}>
                <p style={{ fontSize: '11px', fontWeight: 900, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #c7d2fe' }}>Legend</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#d1fae5' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#059669' }}></div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#292524', textTransform: 'uppercase', lineHeight: '1.2' }}>Allowed<br/>Operating</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fef3c7' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#d97706' }}></div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#292524', textTransform: 'uppercase', lineHeight: '1.2' }}>Coding<br/>Not Operating</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fee2e2' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#292524', textTransform: 'uppercase', lineHeight: '1.2' }}>Violator<br/>Operating</span>
                    </div>
                </div>
            </div>
        </div>
    );
}