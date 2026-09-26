import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin,
    Clock,
    Crosshair,
    ArrowLeft,
    Satellite,
    Smartphone,
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

export default function LiveTracking({ tricycle, pathCoordinates = [], auth }) {
    const operatorName = auth?.user?.name || 'Driver';

    // Real recorded GPS path only — never a fabricated demo route. When the unit has no
    // recorded pings yet, the map area below renders an explicit "no ping recorded" state
    // instead of animating a made-up position.
    const [pathIndex, setPathIndex] = useState(0);
    const [position, setPosition] = useState(pathCoordinates.length > 0 ? pathCoordinates[0] : null);
    const [isFollowing, setIsFollowing] = useState(true);

    // Background refresh of the recorded path + unit status: a new ping from the driver's own
    // session lands here without a manual reload. The playback below is keyed to the path LENGTH
    // (not the array) so an identical refresh never restarts the animation or rewinds the marker.
    useBackgroundRefresh(['tricycle', 'pathCoordinates']);

    useEffect(() => {
        if (pathCoordinates.length <= 1) return;
        const interval = setInterval(() => {
            setPathIndex(prev => {
                const nextIdx = (prev + 1) % pathCoordinates.length;
                setPosition(pathCoordinates[nextIdx]);
                return nextIdx;
            });
        }, 3000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- length-only dep keeps the 3s
        // playback cadence stable across prop refreshes; a new array identity with the same
        // number of pings must not tear down and re-create this interval.
    }, [pathCoordinates.length]);

    const handleRecenter = () => {
        setIsFollowing(true);
    };

    // A tricycle whose franchise isn't finalized yet has no real GPS history to show — render a
    // placeholder instead of the map rather than fabricating a position from partial data.
    if (tricycle && tricycle.isFinalized === false) {
        return (
            <OperatorLayout title="Live Tracking" operatorName={operatorName}>
                <Head title="Live GPS Tracking | TRIVORA" />
                <div className="mx-auto max-w-2xl pb-10">
                    <Link href={route('operator.fleet')} className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900">
                        <ArrowLeft size={14} strokeWidth={2.5} /> Back to My Tricycles
                    </Link>
                    <div className={`rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <MapPin size={26} strokeWidth={1.8} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Live tracking not available yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                            {tricycle.plate_no || tricycle.coding_scheme_number} will show live location once TMO completes Final Confirmation and activates this unit's franchise.
                        </p>
                    </div>
                </div>
            </OperatorLayout>
        );
    }

    // No unit linked to the driver's account — same honest placeholder treatment as a
    // not-yet-finalized unit, rather than a fabricated demo record.
    if (!tricycle) {
        return (
            <OperatorLayout title="Live Tracking" operatorName={operatorName}>
                <Head title="Live GPS Tracking | TRIVORA" />
                <div className="mx-auto max-w-2xl pb-10">
                    <Link href={route('operator.fleet')} className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900">
                        <ArrowLeft size={14} strokeWidth={2.5} /> Back to My Tricycles
                    </Link>
                    <div className={`rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <MapPin size={26} strokeWidth={1.8} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">No tricycle unit linked</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                            There is no tricycle unit linked to your account yet, so there is no live location to show.
                        </p>
                    </div>
                </div>
            </OperatorLayout>
        );
    }

    const details = tricycle;

    const trackingMeta = TRACKING_META[details.active_tracking_mode] || TRACKING_META.mobile_app;
    const TrackingIcon = trackingMeta.icon;
    const trackingStatus = getTrackingStatus(details);

    return (
        <OperatorLayout title="Live Tracking" operatorName={operatorName}>
            <Head title="Live GPS Tracking | TRIVORA" />

            <div className="flex h-[calc(100vh-140px)] min-h-[560px] flex-col">

                {/* ── TOPBAR ── */}
                <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={route('operator.fleet')} className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900">
                        <ArrowLeft size={14} strokeWidth={2.5} /> Back to My Tricycles
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${trackingStatus.badgeClass}`}>
                            {trackingMeta.label}: {trackingStatus.label}
                        </div>
                    </div>
                </div>

                {/* ── UNIT & TELEMETRY INFO BAR — one balanced row instead of a tall
                    sidebar stretched to match the map's height ── */}
                <div className={`mb-5 flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} sm:flex-row sm:items-center sm:justify-between sm:gap-6`}>
                    <div className="shrink-0">
                        <h2 className="text-lg font-extrabold leading-none text-slate-900">{details.coding_scheme_number}</h2>
                        <p className="mt-1.5 text-[13px] text-slate-500">{details.make_model} &bull; Plate: {details.plate_no}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:justify-end">
                        <MiniStat icon={TrackingIcon} label="Tracking Method" value={trackingMeta.label} />
                        <MiniStat icon={MapPin} label="Current Zone" value={details.zone} />
                        <MiniStat icon={Clock} label="Last Updated" value={details.last_ping} tone={details.is_recent_ping ? 'success' : 'warning'} />
                    </div>
                </div>

                {/* ── MAP — full width, fills the remaining page height. With no recorded
                    GPS ping yet, an explicit honest state replaces the map (never a
                    fabricated position). ── */}
                {position ? (
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
                ) : (
                    <div className={`flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <MapPin size={26} strokeWidth={1.8} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">No GPS ping recorded yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                            {details.coding_scheme_number} has not reported a location yet. The live map appears as soon as the
                            unit sends its first {trackingMeta.label} ping.
                        </p>
                    </div>
                )}

                </div>
        </OperatorLayout>
    );
}
