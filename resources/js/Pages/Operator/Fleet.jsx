import React from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { PageHeader, Button, StatusBadge, EmptyState } from '@/Components/TMO';
import {
    MapPin,
    User,
    Users,
    Navigation2,
    Smartphone,
    Bike,
    Satellite,
    Info,
    Clock,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across TMODashboard, so this
// panel reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px-0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

// Registered units only — vehicleStatus is derived server-side from the driver's actual
// application/franchise relationship (see routes/web.php operator.fleet), including 'expired'
// when the unit's franchise permit has passed its expiry date.
const VEHICLE_STATUS_META = {
    active: { label: 'Active', variant: 'success' },
    expired: { label: 'Expired', variant: 'danger' },
    suspended: { label: 'Suspended', variant: 'warning' },
    revoked: { label: 'Revoked', variant: 'danger' },
    unregistered: { label: 'Unregistered', variant: 'neutral' },
};

// Not-yet-registered units: the badge shows the application's real workflow stage (mirrors
// Operator\MTOPController::index()'s status categories) so an in-flight application can never
// be mistaken for an active registered tricycle.
const PENDING_STAGE_META = {
    draft: { label: 'Draft — Not Submitted', variant: 'neutral' },
    review: { label: 'Under Document Review', variant: 'info' },
    inspection: { label: 'Pending Physical Inspection', variant: 'info' },
    bplo: { label: 'Pending BPLO Release', variant: 'info' },
    final: { label: 'Pending Final Confirmation', variant: 'info' },
    rejected: { label: 'Rejected — Resubmission Required', variant: 'warning' },
    reinspection: { label: 'Reinspection Required', variant: 'warning' },
};

/** Tracking connectivity derived only from real location pings — never fabricated. */
function getTrackingStatus(tricycle) {
    const isIot = tricycle.activeTrackingMode === 'iot_device';
    if (!tricycle.lastSignal) return { label: isIot ? 'Offline' : 'Inactive', dot: 'bg-slate-300', text: 'text-slate-400' };
    if (tricycle.lastSignal.isRecent) return { label: isIot ? 'Online' : 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700' };
    return { label: 'No Recent Update', dot: 'bg-amber-500', text: 'text-amber-700' };
}

/** 'YYYY-MM-DD' from the backend → 'Mar 21, 2027'. */
function formatDate(isoDate) {
    if (!isoDate) return '';
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function MyTricycles({ tricycles = [], auth }) {
    const operatorName = auth?.user?.name || 'Driver';

    // Background refresh of the driver's own tricycles: an approval or activation completed by
    // BPLO/TMO elsewhere moves an item from Pending to Registered without a manual reload.
    useBackgroundRefresh(['tricycles']);

    // Single source of truth: the backend derives both lists from the driver's own
    // application/franchise records — approved/active applications produce registered
    // tricycles; everything still in flight stays in the clearly separated pending section.
    const registered = tricycles.filter((t) => t.isRegistered);
    const pending = tricycles.filter((t) => !t.isRegistered);

    return (
        <OperatorLayout title="My Tricycles" operatorName={operatorName}>
            <Head title="My Tricycles | TRIVORA" />

            <div className="mx-auto max-w-[1500px] pb-10">
                <PageHeader
                    eyebrow="Unit Management"
                    title="My Tricycles"
                    subtitle={
                        registered.length > 0
                            ? `${registered.length} registered unit${registered.length !== 1 ? 's' : ''} • each tracked via IoT GPS or Mobile GPS.`
                            : 'Registered tricycle units linked to your approved franchise applications.'
                    }
                />

                {/* ── Registered units: Driver → Application → Approved/Active Franchise ── */}
                {registered.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${CARD_SHADOW}`}>
                        <EmptyState
                            icon={Bike}
                            title="No registered tricycle"
                            description="You don't have an approved/active franchise unit linked to your account yet."
                            action={
                                <Button as={Link} href={route('operator.mtop')} variant="primary">
                                    View Permit Status
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {registered.map((tricycle, index) => (
                            <TricycleSection key={tricycle.db_id} tricycle={tricycle} index={index} />
                        ))}
                    </div>
                )}

                {/* ── Pending applications: real units, but NOT registered tricycles ── */}
                {pending.length > 0 && (
                    <div className="mt-10">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-600">
                            Pending Application — Not Yet Registered
                        </p>
                        <p className="mb-4 max-w-3xl text-[12.5px] leading-relaxed text-slate-500">
                            These units have applications still in progress — document review, physical inspection,
                            BPLO release, final confirmation, resubmission, or reinspection. They only become
                            registered tricycles once TMO completes Final Confirmation for the application.
                        </p>
                        <div className="space-y-8">
                            {pending.map((tricycle, index) => (
                                <TricycleSection key={tricycle.db_id} tricycle={tricycle} index={index} pending />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </OperatorLayout>
    );
}

function TricycleSection({ tricycle, index, pending = false }) {
    const tracking = getTrackingStatus(tricycle);
    const statusBadge = pending
        ? (PENDING_STAGE_META[tricycle.pendingStage] || PENDING_STAGE_META.review)
        : (VEHICLE_STATUS_META[tricycle.vehicleStatus] || VEHICLE_STATUS_META.unregistered);

    const metaLine = [
        `Application ${tricycle.applicationReference}`,
        tricycle.isRegistered && tricycle.franchiseExpiry
            ? (tricycle.franchiseExpired
                ? `Franchise expired ${formatDate(tricycle.franchiseExpiry)}`
                : `Franchise valid until ${formatDate(tricycle.franchiseExpiry)}`)
            : null,
    ].filter(Boolean).join(' • ');

    return (
        <section>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Tricycle {index + 1}
            </p>

            <div className={`overflow-hidden rounded-2xl border ${pending ? 'border-amber-200/80' : 'border-slate-200/70'} bg-white ${CARD_SHADOW}`}>
                <div className="flex flex-col gap-4 border-b border-dashed border-slate-200 bg-slate-50 px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <Bike size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold leading-tight text-slate-900">{tricycle.plateNo}</h2>
                            <p className="mt-1 text-sm text-slate-500">{tricycle.id} &bull; {tricycle.makeModel}</p>
                            <p className={`mt-0.5 text-[11.5px] font-semibold ${tricycle.franchiseExpired ? 'text-red-600' : 'text-slate-400'}`}>
                                {metaLine}
                            </p>
                        </div>
                    </div>
                    <StatusBadge variant={statusBadge.variant}>{statusBadge.label}</StatusBadge>
                </div>

                {/* Body: spec sheet (left, wide) + tracking & actions rail (right) */}
                <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">

                    {/* ── RIGHT ON DESKTOP / FIRST ON MOBILE: Tracking + quick facts + actions ── */}
                    <div className="space-y-5 lg:order-2">
                        {tricycle.isFinalized ? (
                            <>
                                <div>
                                    <h3 className="mb-3 text-sm font-bold text-slate-900">Tracking</h3>

                                    <TrackingCard tricycle={tricycle} status={tracking} />

                                    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                                        <Info size={13} className="mt-0.5 shrink-0" />
                                        {tricycle.activeTrackingMode === 'iot_device'
                                            ? 'IoT GPS is optional — this unit can switch to Mobile GPS through the Driver app at any time.'
                                            : 'An IoT GPS device is optional and not required for this unit.'}
                                    </p>
                                </div>

                                <div className="space-y-3 border-t border-dashed border-slate-200 pt-5">
                                    <InfoTile icon={User} label="Tricycle Owner" value={tricycle.driver} />
                                    <InfoTile
                                        icon={Users}
                                        label="Tricycle Driver"
                                        value={
                                            tricycle.ownerIsDriver
                                                ? <span className="text-slate-500">Same as Tricycle Owner</span>
                                                : (tricycle.tricycleDriver?.full_name
                                                    ? <span className="truncate">{tricycle.tricycleDriver.full_name}</span>
                                                    : 'Not provided')
                                        }
                                    />
                                    <InfoTile
                                        icon={MapPin}
                                        tone="amber"
                                        label="Color Coding"
                                        value={
                                            <>
                                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tricycle.colorHex }} />
                                                {tricycle.colorCode}
                                            </>
                                        }
                                    />
                                </div>

                                <div className="border-t border-dashed border-slate-200 pt-5">
                                    <Button as={Link} href={route('operator.tracking', { unit: tricycle.db_id })} variant="primary" size="lg" icon={Navigation2} className="w-full">
                                        Open Live GPS Tracking
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <h3 className="mb-3 text-sm font-bold text-slate-900">Tracking</h3>
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center">
                                        <p className="text-[13px] font-semibold text-slate-600">Not available yet</p>
                                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                                            Live tracking, color coding, and franchise details become available once TMO completes Final Confirmation for this unit.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3 border-t border-dashed border-slate-200 pt-5">
                                    <InfoTile icon={User} label="Tricycle Owner" value={tricycle.driver} />
                                    <InfoTile
                                        icon={Users}
                                        label="Tricycle Driver"
                                        value={
                                            tricycle.ownerIsDriver
                                                ? <span className="text-slate-500">Same as Tricycle Owner</span>
                                                : (tricycle.tricycleDriver?.full_name
                                                    ? <span className="truncate">{tricycle.tricycleDriver.full_name}</span>
                                                    : 'Not provided')
                                        }
                                    />
                                </div>
                            </>
                        )}
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
                                    <SpecRow label="LTO Plate Number" value={tricycle.plateNo} />
                                    <SpecRow label="Make &amp; Model" value={tricycle.makeModel} />
                                    <SpecRow label="Year Model" value={tricycle.yearModel} />
                                    <SpecRow label="Body Color" value={tricycle.bodyColor} />
                                    <SpecRow label="Body Type" value={tricycle.bodyType} />
                                </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-5">
                                <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Registration Information</h4>
                                <div className="divide-y divide-slate-200">
                                    <SpecRow label="Engine Number" value={tricycle.engineNumber} />
                                    <SpecRow label="Chassis Number" value={tricycle.chassisNumber} />
                                    <SpecRow label="LTO OR Number" value={tricycle.orNumber} />
                                    <SpecRow label="LTO CR Number" value={tricycle.crNumber} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
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
