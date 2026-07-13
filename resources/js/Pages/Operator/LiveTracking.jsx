import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin,
    Navigation2,
    Wifi,
    BatteryMedium,
    Clock,
    Crosshair,
    ArrowLeft,
    Zap,
    Signal,
    Activity
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   DRIVER PORTAL — Live GPS Tracking HUD
   Path: resources/js/Pages/Operator/LiveTracking.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.trk-root { font-family: 'Inter', sans-serif; color: #1C2340; height: calc(100vh - 140px); display: flex; flex-direction: column; }
.trk-root *, .trk-root *::before, .trk-root *::after { box-sizing: border-box; }

/* ── Top Bar ── */
.trk-topbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; flex-shrink: 0;
}
.trk-back-btn {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: #5A6488;
    text-decoration: none; transition: color .2s;
}
.trk-back-btn:hover { color: #1C2340; }
.trk-status-badge {
    display: flex; align-items: center; gap: 8px;
    background: rgba(5,150,105,.1); border: 1px solid rgba(5,150,105,.2);
    padding: 6px 14px; border-radius: 50px;
    font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800;
    letter-spacing: .1em; text-transform: uppercase; color: #059669;
}
.trk-pulse-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #059669;
    animation: trkPulse 2s infinite;
}

/* ── Main Layout (Grid) ── */
.trk-layout {
    display: grid; grid-template-columns: 360px 1fr; gap: 24px;
    flex: 1; min-height: 0;
}
@media (max-width: 1024px) {
    .trk-layout { grid-template-columns: 1fr; grid-template-rows: auto 400px; height: auto; }
    .trk-root { height: auto; }
}

/* ── Side Panel (Telemetry) ── */
.trk-sidebar {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
    border-radius: 20px; display: flex; flex-direction: column;
    overflow: hidden; box-shadow: 0 4px 20px rgba(28,35,64,.03);
}
.trk-sb-header {
    padding: 24px; border-bottom: 1px solid rgba(28,35,64,.06);
    background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F9 100%);
}
.trk-sb-title {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px;
    font-weight: 800; color: #1C2340; line-height: 1; margin-bottom: 6px;
}
.trk-sb-subtitle { font-size: 13px; font-weight: 500; color: #5A6488; }

.trk-telemetry { padding: 24px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }

/* Telemetry Cards */
.trk-stat-box {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
    border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 16px;
    box-shadow: 0 2px 8px rgba(28,35,64,.02);
}
.trk-stat-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: rgba(79,91,203,.08); color: #4F5BCB;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.trk-stat-icon.green { background: rgba(5,150,105,.08); color: #059669; }
.trk-stat-icon.amber { background: rgba(245,158,11,.08); color: #D97706; }
.trk-stat-info { flex: 1; }
.trk-stat-lbl {
    font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-bottom: 4px;
}
.trk-stat-val {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px;
    font-weight: 800; color: #1C2340; line-height: 1; font-variant-numeric: tabular-nums;
}
.trk-stat-unit { font-size: 12px; font-weight: 600; color: #8A96BC; margin-left: 4px; }

/* Info List */
.trk-info-list { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; border-top: 1px dashed rgba(28,35,64,.1); padding-top: 20px; }
.trk-info-item { display: flex; justify-content: space-between; align-items: center; }
.trk-info-item-lbl { display: flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #5A6488; }
.trk-info-item-val { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #1C2340; }

/* ── Map Area ── */
.trk-map-container {
    background: #E2E8F0; border-radius: 20px; border: 1px solid rgba(28,35,64,.1);
    position: relative; overflow: hidden; display: flex;
    box-shadow: inset 0 4px 20px rgba(0,0,0,0.05);
}

/* Simulated Map UI Elements */
.trk-map-overlay-top {
    position: absolute; top: 20px; left: 20px; right: 20px;
    display: flex; justify-content: space-between; pointer-events: none; z-index: 1000;
}
.trk-map-card {
    background: rgba(255,255,255,.95); backdrop-filter: blur(10px);
    border: 1px solid rgba(28,35,64,.1); padding: 12px 16px; border-radius: 12px;
    box-shadow: 0 4px 14px rgba(0,0,0,.05); pointer-events: auto;
    display: flex; align-items: center; gap: 12px;
}
.trk-map-coord { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #5A6488; }
.trk-map-coord strong { color: #1C2340; font-family: 'Inter', sans-serif; font-size: 12px; font-variant-numeric: tabular-nums; }

.trk-map-controls {
    position: absolute; bottom: 20px; left: 20px;
    display: flex; flex-direction: column; gap: 10px; pointer-events: auto; z-index: 1000;
}
.trk-map-btn {
    width: 44px; height: 44px; border-radius: 12px; background: #FFFFFF;
    border: 1px solid rgba(28,35,64,.1); color: #1C2340;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(0,0,0,.05); cursor: pointer; transition: all .2s;
}
.trk-map-btn:hover { background: #F8F9FC; border-color: #4F5BCB; color: #4F5BCB; }
.trk-map-btn.active { background: #EEF2FF; border-color: #4F5BCB; color: #4F5BCB; }

@keyframes trkPulse {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
}

/* Fix Leaflet container size */
.leaflet-container {
    width: 100%; height: 100%; z-index: 1; font-family: 'Inter', sans-serif;
}
`;

// Creates the custom pulsing green dot icon (Identical to TMO TricycleMap.jsx)
const driverIcon = L.divIcon({
    className: 'custom-trivora-pin',
    html: `
        <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute inset-0 rounded-full opacity-30 animate-ping bg-emerald-400"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-emerald-600 ring-[3px] ring-white shadow-md z-10"></div>
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

// Component to handle map centering when tricycle moves
function MapController({ position, isFollowing }) {
    const map = useMap();
    useEffect(() => {
        if (isFollowing) {
            // Smoothly pan to the new position
            map.setView(position, 17, { animate: true, duration: 1 });
        }
    }, [position, isFollowing, map]);
    return null;
}

export default function LiveTracking({ tricycle, pathCoordinates: dbCoordinates = [], auth }) {
    const operatorName = auth?.user?.name || "Driver";
    
    const pathCoordinates = dbCoordinates.length > 0 ? dbCoordinates : [
        [14.0733, 120.6320], [14.0738, 120.6322], [14.0744, 120.6325],
        [14.0748, 120.6330], [14.0745, 120.6336], [14.0740, 120.6338],
        [14.0735, 120.6335], [14.0730, 120.6330], [14.0728, 120.6325]
    ];

    const [pathIndex, setPathIndex] = useState(0);
    const [position, setPosition] = useState(pathCoordinates[0]);
    const [speed, setSpeed] = useState(tricycle?.speed || 24);
    const [isFollowing, setIsFollowing] = useState(true);

    useEffect(() => {
        if (pathCoordinates.length <= 1) return;
        const interval = setInterval(() => {
            setPathIndex(prev => {
                const nextIdx = (prev + 1) % pathCoordinates.length;
                setPosition(pathCoordinates[nextIdx]);
                return nextIdx;
            });

            setSpeed(prev => {
                const variance = Math.floor(Math.random() * 5) - 2;
                const newSpeed = prev + variance;
                return newSpeed < 10 ? 10 : (newSpeed > 45 ? 45 : newSpeed);
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [pathCoordinates]);

    const handleRecenter = () => {
        setIsFollowing(true);
    };

    const details = tricycle || {
        body_no: 'Pending',
        make_model: 'Honda TMX 125 Alpha',
        plate_no: 'Pending',
        zone: 'Poblacion (TODA A)',
        battery: '89%',
        last_ping: 'Just now',
    };

    return (
        <OperatorLayout title="Live Tracking" operatorName={operatorName}>
            <Head title="Live GPS Tracking | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="trk-root">

                {/* ── TOPBAR ── */}
                <div className="trk-topbar">
                    <Link href={route('operator.fleet')} className="trk-back-btn">
                        <ArrowLeft size={14} strokeWidth={2.5} /> Back to Tricycle Details
                    </Link>
                    <div className="trk-status-badge">
                        <div className="trk-pulse-dot" /> Live IoT Connection
                    </div>
                </div>

                {/* ── MAIN LAYOUT ── */}
                <div className="trk-layout">

                    {/* Left: Telemetry Sidebar */}
                    <div className="trk-sidebar">
                        <div className="trk-sb-header">
                            <h2 className="trk-sb-title">{details.body_no}</h2>
                            <p className="trk-sb-subtitle">{details.make_model} &bull; Plate: {details.plate_no}</p>
                        </div>

                        <div className="trk-telemetry">
                            {/* Speed */}
                            <div className="trk-stat-box">
                                <div className="trk-stat-icon">
                                    <Activity size={24} strokeWidth={2} />
                                </div>
                                <div className="trk-stat-info">
                                    <p className="trk-stat-lbl">Current Speed</p>
                                    <p className="trk-stat-val">{speed}<span className="trk-stat-unit">km/h</span></p>
                                </div>
                            </div>

                            {/* Battery */}
                            <div className="trk-stat-box">
                                <div className="trk-stat-icon green">
                                    <BatteryMedium size={24} strokeWidth={2} />
                                </div>
                                <div className="trk-stat-info">
                                    <p className="trk-stat-lbl">IoT Battery Level</p>
                                    <p className="trk-stat-val">{details.battery}<span className="trk-stat-unit"></span></p>
                                </div>
                            </div>

                            {/* Signal */}
                            <div className="trk-stat-box">
                                <div className="trk-stat-icon amber">
                                    <Signal size={24} strokeWidth={2} />
                                </div>
                                <div className="trk-stat-info">
                                    <p className="trk-stat-lbl">GPS Signal</p>
                                    <p className="trk-stat-val" style={{fontSize: '16px'}}>Strong</p>
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="trk-info-list">
                                <div className="trk-info-item">
                                    <span className="trk-info-item-lbl"><MapPin size={12}/> Current Zone</span>
                                    <span className="trk-info-item-val">{details.zone}</span>
                                </div>
                                <div className="trk-info-item">
                                    <span className="trk-info-item-lbl"><Clock size={12}/> Last Ping</span>
                                    <span className="trk-info-item-val" style={{ color: '#059669' }}>{details.last_ping}</span>
                                </div>
                                <div className="trk-info-item">
                                    <span className="trk-info-item-lbl"><Zap size={12}/> System Status</span>
                                    <span className="trk-info-item-val">{tricycle ? 'Active / Moving' : 'Offline / Inactive'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actual Leaflet Map Interface */}
                    <div className="trk-map-container">

                        {/* UI Overlay: Coordinates */}
                        <div className="trk-map-overlay-top">
                            <div className="trk-map-card">
                                <MapPin size={16} color="#4F5BCB" />
                                <div className="trk-map-coord">
                                    LAT: <strong>{position[0].toFixed(5)}° N</strong> &nbsp;|&nbsp; LNG: <strong>{position[1].toFixed(5)}° E</strong>
                                </div>
                            </div>
                        </div>

                        {/* UI Overlay: Map Controls */}
                        <div className="trk-map-controls">
                            <button
                                className={`trk-map-btn ${isFollowing ? 'active' : ''}`}
                                title="Lock Camera to Tricycle"
                                onClick={handleRecenter}
                            >
                                <Crosshair size={20} strokeWidth={2} />
                            </button>
                        </div>

                        {/* React Leaflet Map */}
                        <MapContainer
                            center={position}
                            zoom={17}
                            zoomControl={false}
                            scrollWheelZoom={true}
                            eventHandlers={{
                                dragstart: () => setIsFollowing(false) // Stop following if user drags map
                            }}
                        >
                            <TileLayer
                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                attribution="&copy; Google Maps"
                            />

                            <Marker position={position} icon={driverIcon} />

                            <ZoomControl position="bottomright" />
                            <MapController position={position} isFollowing={isFollowing} />
                        </MapContainer>

                    </div>

                </div>
            </div>
        </OperatorLayout>
    );
}