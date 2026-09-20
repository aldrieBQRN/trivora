import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { PageHeader, Button, StatusBadge, EmptyState } from '@/Components/TMO';
import {
    MapPin,
    User,
    Navigation2,
    Smartphone,
    Bike,
    Satellite,
    Info,
    Clock,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across TMODashboard, so this
// panel reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TRACKING_META = {
    iot_device: { label: 'IoT GPS', icon: Satellite, badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    mobile_app: { label: 'Mobile GPS', icon: Smartphone, badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const VEHICLE_STATUS_META = {
    active: { label: 'Active', variant: 'success' },
    suspended: { label: 'Suspended', variant: 'warning' },
    revoked: { label: 'Revoked', variant: 'danger' },
    unregistered: { label: 'Unregistered', variant: 'neutral' },
};

/** Tracking connectivity derived only from real location pings — never fabricated. */
function getTrackingStatus(tricycle) {
    const isIot = tricycle.activeTrackingMode === 'iot_device';
    if (!tricycle.lastSignal) return { label: isIot ? 'Offline' : 'Inactive', dot: 'bg-slate-300', text: 'text-slate-400' };
    if (tricycle.lastSignal.isRecent) return { label: isIot ? 'Online' : 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700' };
    return { label: 'No Recent Update', dot: 'bg-amber-500', text: 'text-amber-700' };
}

export default function MyTricycles({ tricycles = [], selectedId = null, auth }) {
    const operatorName = auth?.user?.name || 'Driver';
    const [currentId, setCurrentId] = useState(selectedId);

    const selected = useMemo(
        () => tricycles.find((t) => t.db_id === currentId) || tricycles[0] || null,
        [tricycles, currentId]
    );

    if (tricycles.length === 0) {
        return (
            <OperatorLayout title="My Tricycles" operatorName={operatorName}>
                <Head title="My Tricycles | TRIVORA" />
                <div className="mx-auto max-w-[1500px]">
                    <PageHeader
                        eyebrow="Unit Management"
                        title="My Tricycles"
                        subtitle="View your registered tricycle units and how each one is being tracked."
                    />
                    <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${CARD_SHADOW}`}>
                        <EmptyState
                            icon={Bike}
                            title="No registered tricycle"
                            description="You don't have an active tricycle unit linked to your account yet."
                            action={
                                <Button as={Link} href={route('operator.mtop')} variant="primary">
                                    View Permit Status
                                </Button>
                            }
                        />
                    </div>
                </div>
            </OperatorLayout>
        );
    }

    const unitQuery = (base) => ({ unit: selected.db_id, ...(base || {}) });
    const selectedTracking = getTrackingStatus(selected);
    const selectedVehicleStatus = VEHICLE_STATUS_META[selected.vehicleStatus] || VEHICLE_STATUS_META.unregistered;

    return (
        <OperatorLayout title="My Tricycles" operatorName={operatorName}>
            <Head title="My Tricycles | TRIVORA" />

            <div className="mx-auto max-w-[1500px] pb-10">
                <PageHeader
                    eyebrow="Unit Management"
                    title="My Tricycles"
                    subtitle={`${tricycles.length} registered unit${tricycles.length !== 1 ? 's' : ''} • each tracked via IoT GPS or Mobile GPS.`}
                />

                {/* ── VEHICLE SWITCHER — a horizontal strip, only shown with more than one
                    unit, so a single-tricycle driver never sees an empty rail beside the
                    detail panel. Height is intrinsic to one row, independent of the panel below. ── */}
                {tricycles.length > 1 && (
                    <div className="mb-6 flex flex-wrap gap-3">
                        {tricycles.map((t) => {
                            const isActive = selected?.db_id === t.db_id;
                            const tm = TRACKING_META[t.activeTrackingMode] || TRACKING_META.mobile_app;
                            const TmIcon = tm.icon;
                            const tracking = getTrackingStatus(t);
                            const needsAttention = t.vehicleStatus !== 'active';

                            return (
                                <button
                                    key={t.db_id}
                                    type="button"
                                    onClick={() => setCurrentId(t.db_id)}
                                    className={`relative flex shrink-0 flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                                        isActive ? `border-[#1D2542]/20 bg-[#1D2542]/[0.06] ${CARD_SHADOW}` : 'border-slate-200 bg-white hover:border-[#1D2542]/40'
                                    }`}
                                    style={{ minWidth: 200 }}
                                >
                                    {needsAttention && (
                                        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500" title="Needs attention" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900">{t.plateNo}</p>
                                        <p className="truncate text-[11px] text-slate-500">{t.id}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tm.badgeClass}`}>
                                            <TmIcon size={10} /> {tm.label}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                            {tracking.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── SELECTED VEHICLE DETAIL (full width) ── */}
                <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                    <div className="flex flex-col gap-4 border-b border-dashed border-slate-200 bg-slate-50 px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Bike size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold leading-tight text-slate-900">{selected.plateNo}</h2>
                                <p className="mt-1 text-sm text-slate-500">{selected.id} &bull; {selected.makeModel}</p>
                            </div>
                        </div>
                        <StatusBadge variant={selectedVehicleStatus.variant}>{selectedVehicleStatus.label}</StatusBadge>
                    </div>

                    {/* Body: spec sheet (left, wide) + tracking & actions rail (right) */}
                    <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">

                        {/* ── RIGHT ON DESKTOP / FIRST ON MOBILE: Tracking + quick facts + actions ── */}
                        <div className="space-y-5 lg:order-2">
                            <div>
                                <h3 className="mb-3 text-sm font-bold text-slate-900">Tracking</h3>

                                <TrackingCard tricycle={selected} status={selectedTracking} />

                                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                                    <Info size={13} className="mt-0.5 shrink-0" />
                                    {selected.activeTrackingMode === 'iot_device'
                                        ? 'IoT GPS is optional — this unit can switch to Mobile GPS through the Driver app at any time.'
                                        : 'An IoT GPS device is optional and not required for this unit.'}
                                </p>
                            </div>

                            <div className="space-y-3 border-t border-dashed border-slate-200 pt-5">
                                <InfoTile icon={User} label="Assigned Driver" value={selected.driver} />
                                <InfoTile
                                    icon={MapPin}
                                    tone="amber"
                                    label="Color Coding"
                                    value={
                                        <>
                                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: selected.colorHex }} />
                                            {selected.colorCode}
                                        </>
                                    }
                                />
                            </div>

                            <div className="border-t border-dashed border-slate-200 pt-5">
                                <Button as={Link} href={route('operator.tracking', unitQuery())} variant="primary" size="lg" icon={Navigation2} className="w-full">
                                    Open Live GPS Tracking
                                </Button>
                            </div>
                        </div>

                        {/* ── LEFT ON DESKTOP / SECOND ON MOBILE: Vehicle Specifications ── */}
                        <div className="lg:order-1">
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-slate-900">Vehicle Specifications</h3>
                                <p className="mt-0.5 text-[11px] text-slate-400">Registered details from this unit's Tricycle Registration record.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="rounded-xl bg-slate-50 p-5">
                                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Vehicle Information</h4>
                                    <div className="divide-y divide-slate-200">
                                        <SpecRow label="LTO Plate Number" value={selected.plateNo} />
                                        <SpecRow label="Make &amp; Model" value={selected.makeModel} />
                                        <SpecRow label="Year Model" value={selected.yearModel} />
                                        <SpecRow label="Body Color" value={selected.bodyColor} />
                                        <SpecRow label="Body Type" value={selected.bodyType} />
                                    </div>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-5">
                                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Registration Information</h4>
                                    <div className="divide-y divide-slate-200">
                                        <SpecRow label="TODA Assignment" value={selected.zone} />
                                        <SpecRow label="Engine Number" value={selected.engineNumber} />
                                        <SpecRow label="Chassis Number" value={selected.chassisNumber} />
                                        <SpecRow label="LTO OR Number" value={selected.orNumber} />
                                        <SpecRow label="LTO CR Number" value={selected.crNumber} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </OperatorLayout>
    );
}

function TrackingCard({ tricycle, status }) {
    const isIot = tricycle.activeTrackingMode === 'iot_device';
    const Icon = isIot ? Satellite : Smartphone;
    const signal = tricycle.lastSignal;

    return (
        <div className={`rounded-xl border p-5 ${isIot ? 'border-indigo-200/70 bg-indigo-50/60' : 'border-slate-200/70 bg-slate-50/70'}`}>
            <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${isIot ? 'bg-gradient-to-br from-indigo-500/[0.14] to-indigo-500/[0.02] text-indigo-700' : 'bg-white text-slate-600'}`}>
                    <Icon size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className={`text-sm font-bold ${isIot ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {isIot ? 'IoT GPS' : 'Mobile GPS'}
                        </p>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${status.text}`}>
                            {status.label}
                        </span>
                    </div>
                    <p className={`mt-1 text-xs ${isIot ? 'text-indigo-700' : 'text-slate-600'}`}>
                        {isIot
                            ? `SinoTrack GPS device${tricycle.iotDeviceId ? ` (ID: ${tricycle.iotDeviceId})` : ''} installed on this unit.`
                            : "Tracked via the driver's phone using the Trivora Driver app."}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-dashed border-black/5 pt-4 sm:grid-cols-2">
                <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"><MapPin size={11} /> Last Location</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">
                        {signal ? `${signal.latitude.toFixed(5)}, ${signal.longitude.toFixed(5)}` : 'Not available yet'}
                    </p>
                </div>
                <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Clock size={11} /> Last Updated</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">{signal ? signal.at : 'Never'}</p>
                </div>
            </div>
        </div>
    );
}

function SpecRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-[11px] font-semibold text-slate-500">{label}</span>
            {value ? (
                <span className="text-right text-[13px] font-semibold text-slate-900">{value}</span>
            ) : (
                <span className="text-right text-[13px] italic text-slate-400">Not provided</span>
            )}
        </div>
    );
}

const TILE_TONES = {
    default: 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]',
    amber: 'bg-gradient-to-br from-amber-500/[0.12] to-amber-500/[0.02] text-amber-600',
    emerald: 'bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600',
    danger: 'bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.02] text-red-600',
};

function InfoTile({ icon: Icon, label, value, tone = 'default' }) {
    return (
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/70 bg-white p-4 transition-colors hover:bg-slate-50/60">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${TILE_TONES[tone] || TILE_TONES.default}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">{value}</p>
            </div>
        </div>
    );
}
