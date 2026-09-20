import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin,
    Clock,
    Crosshair,
    ArrowLeft,
    Activity,
    Satellite,
    Smartphone,
    Layers,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across TMODashboard, so this
// panel reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TRACKING_META = {
    iot_device: { label: 'IoT GPS', icon: Satellite, tone: 'primary' },
    mobile_app: { label: 'Mobile GPS', icon: Smartphone, tone: 'green' },
};

/** Tracking connectivity derived only from real ping data — matches My Tricycles' wording. */
function getTrackingStatus(details) {
    const isIot = details.active_tracking_mode === 'iot_device';
    if (!details.last_ping || details.last_ping === 'Never') {
        return { label: isIot ? 'Offline' : 'Inactive', badgeClass: 'border-slate-200 bg-slate-50 text-slate-500', dot: 'bg-slate-400' };
    }
    if (details.is_recent_ping) {
        return { label: isIot ? 'Online' : 'Active', badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500 animate-pulse' };
    }
    return { label: 'No Recent Update', badgeClass: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
}

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
            map.setView(position, 17, { animate: true, duration: 1 });
        }
    }, [position, isFollowing, map]);
    return null;
}

function MiniStat({ icon: Icon, label, value, tone = 'default' }) {
    const toneClasses = {
        default: 'text-slate-900',
        success: 'text-emerald-600',
        warning: 'text-amber-600',
    };
    return (
        <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                <Icon size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className={`text-[13px] font-bold leading-tight ${toneClasses[tone]}`}>{value}</p>
            </div>
        </div>
    );
}

export default function LiveTracking({ tricycle, pathCoordinates: dbCoordinates = [], auth }) {
    const operatorName = auth?.user?.name || 'Driver';

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
        active_tracking_mode: 'mobile_app',
        last_ping: 'Just now',
        is_recent_ping: false,
        other_units_count: 0,
    };

    const trackingMeta = TRACKING_META[details.active_tracking_mode] || TRACKING_META.mobile_app;
    const TrackingIcon = trackingMeta.icon;
    const trackingStatus = getTrackingStatus(details);

    return (
        <OperatorLayout title="Live Tracking" operatorName={operatorName}>
            <Head title="Live GPS Tracking | TRIVORA" />

            <div className="flex h-[calc(100vh-140px)] min-h-[560px] flex-col">

                {/* ── TOPBAR ── */}
                <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={route('operator.fleet', tricycle?.db_id ? { unit: tricycle.db_id } : {})} className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900">
                        <ArrowLeft size={14} strokeWidth={2.5} /> Back to My Tricycles
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                        {details.other_units_count > 0 && (
                            <Link
                                href={route('operator.fleet')}
                                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-900"
                            >
                                <Layers size={12} /> Switch Unit
                            </Link>
                        )}
                        <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${trackingStatus.badgeClass}`}>
                            {trackingMeta.label}: {trackingStatus.label}
                        </div>
                    </div>
                </div>

                {/* ── UNIT & TELEMETRY INFO BAR — one balanced row instead of a tall
                    sidebar stretched to match the map's height ── */}
                <div className={`mb-5 flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} sm:flex-row sm:items-center sm:justify-between sm:gap-6`}>
                    <div className="shrink-0">
                        <h2 className="text-lg font-extrabold leading-none text-slate-900">{details.body_no}</h2>
                        <p className="mt-1.5 text-[13px] text-slate-500">{details.make_model} &bull; Plate: {details.plate_no}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:justify-end">
                        <MiniStat icon={Activity} label="Current Speed" value={`${speed} km/h`} />
                        <MiniStat icon={TrackingIcon} label="Tracking Method" value={trackingMeta.label} />
                        <MiniStat icon={MapPin} label="Current Zone" value={details.zone} />
                        <MiniStat icon={Clock} label="Last Updated" value={details.last_ping} tone={details.is_recent_ping ? 'success' : 'warning'} />
                    </div>
                </div>

                {/* ── MAP — full width, fills the remaining page height ── */}
                <div className={`relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-gray-200 ${CARD_SHADOW}`}>

                        {/* UI Overlay: Coordinates */}
                        <div className="pointer-events-none absolute inset-x-5 top-5 z-[1000] flex justify-between">
                            <div className={`pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur ${CARD_SHADOW}`}>
                                <MapPin size={16} className="text-[#1D2542]" />
                                <div className="text-[10px] font-bold tracking-wide text-slate-500">
                                    LAT: <strong className="font-mono text-xs font-semibold tabular-nums text-slate-900">{position[0].toFixed(5)}&deg; N</strong> &nbsp;|&nbsp; LNG: <strong className="font-mono text-xs font-semibold tabular-nums text-slate-900">{position[1].toFixed(5)}&deg; E</strong>
                                </div>
                            </div>
                        </div>

                        {/* UI Overlay: Map Controls */}
                        <div className="pointer-events-auto absolute bottom-5 left-5 z-[1000] flex flex-col gap-2.5">
                            <button
                                className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-colors ${
                                    isFollowing ? 'border-[#1D2542]/20 bg-[#1D2542]/[0.06] text-[#1D2542]' : 'border-slate-200 bg-white text-slate-900 hover:border-[#1D2542] hover:text-[#1D2542]'
                                }`}
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
                            className="z-[1] h-full w-full"
                            eventHandlers={{
                                dragstart: () => setIsFollowing(false)
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
        </OperatorLayout>
    );
}
