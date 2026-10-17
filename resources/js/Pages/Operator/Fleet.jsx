import React, { useState, useMemo } from 'react';
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
    ShieldCheck,
    Search,
    X,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across TMODashboard, so this
// panel reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

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
    if (!tricycle.lastSignal) return { label: isIot ? 'Offline' : 'Inactive', dot: 'bg-slate-300', text: 'text-slate-500' };
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
    // Prefilled from ?search= so other pages (e.g. MTOP application details) can link to a specific unit.
    const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
    const [fleetFilter, setFleetFilter] = useState('all');

    // Background refresh of the driver's own tricycles: an approval or activation completed by
    // BPLO/TMO elsewhere moves an item from Pending to Registered without a manual reload.
    useBackgroundRefresh(['tricycles']);

    // Single source of truth: the backend derives both lists from the driver's own
    // application/franchise records — approved/active applications produce registered
    // tricycles; everything still in flight stays in the clearly separated pending section.
    const registered = tricycles.filter((t) => t.isRegistered);
    const pending = tricycles.filter((t) => !t.isRegistered);

    // KPI Metrics
    const totalCount = tricycles.length;
    const activeCount = registered.filter((t) => !t.franchiseExpired).length;
    const expiredCount = registered.filter((t) => t.franchiseExpired).length;
    const pendingCount = pending.length;
    const onlineCount = registered.filter((t) => t.lastSignal && t.lastSignal.isRecent).length;
    const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    const filteredRegistered = useMemo(() => {
        return registered.filter((t) => {
            const q = query.trim().toLowerCase();
            const matchesQuery = !q || (
                (t.plateNo && String(t.plateNo).toLowerCase().includes(q)) ||
                (t.id && String(t.id).toLowerCase().includes(q)) ||
                (t.driver && String(t.driver).toLowerCase().includes(q)) ||
                (t.makeModel && String(t.makeModel).toLowerCase().includes(q))
            );
            const matchesFilter = fleetFilter === 'all' ||
                fleetFilter === 'registered' ||
                (fleetFilter === 'active' && !t.franchiseExpired) ||
                (fleetFilter === 'expired' && t.franchiseExpired) ||
                (fleetFilter === 'online' && t.lastSignal?.isRecent);
            return matchesQuery && matchesFilter;
        });
    }, [registered, query, fleetFilter]);

    const filteredPending = useMemo(() => {
        if (fleetFilter === 'registered' || fleetFilter === 'active' || fleetFilter === 'expired' || fleetFilter === 'online') {
            return [];
        }
        return pending.filter((t) => {
            const q = query.trim().toLowerCase();
            const matchesQuery = !q || (
                (t.plateNo && String(t.plateNo).toLowerCase().includes(q)) ||
                (t.id && String(t.id).toLowerCase().includes(q)) ||
                (t.driver && String(t.driver).toLowerCase().includes(q)) ||
                (t.makeModel && String(t.makeModel).toLowerCase().includes(q))
            );
            return matchesQuery;
        });
    }, [pending, query, fleetFilter]);

    return (
        <OperatorLayout title="My Tricycles" operatorName={operatorName}>
            <Head title="My Tricycles | TRIVORA" />

            <div className="mx-auto max-w-[1500px] pb-10">
                {/* ══════════════════════════════════════════════════════════════
                    1. PAGE HEADER
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            My Tricycles
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                            View your registered tricycle units, franchise details, and tracking status.
                        </p>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                    {/* ─ Card 1: Total Fleet ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Total Fleet
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {totalCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Units
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Tricycle units linked to account
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Registered:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-900 tabular-nums shrink-0">{registered.length} of {totalCount}</span>
                        </div>
                    </div>

                    {/* ─ Card 2: Active Franchises ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Active Franchises
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {activeCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Valid
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Permits currently in good standing
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Standing:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-900 tabular-nums shrink-0">{activePct}% Valid</span>
                        </div>
                    </div>

                    {/* ─ Card 3: In-Flight Units ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    In-Flight Units
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-amber-600 leading-none">
                                    {pendingCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Pending
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Applications moving through pipeline
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Queue:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 tabular-nums shrink-0">{pendingCount} Processing</span>
                        </div>
                    </div>

                    {/* ─ Card 4: GPS Telemetry ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    GPS Telemetry
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-[#182B62]">
                                    <Satellite size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {onlineCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Online
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Reporting live location telemetry
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Signal:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 tabular-nums shrink-0">{onlineCount} of {registered.length} Live</span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. MULTI-DIMENSIONAL COMMAND & FILTER TOOLBAR
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                        {/* Primary Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search
                                size={14}
                                strokeWidth={2.2}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by plate number, unit ID, make/model, or driver..."
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Filter Controls Row */}
                        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2">
                            <select
                                value={fleetFilter}
                                onChange={(e) => setFleetFilter(e.target.value)}
                                aria-label="Filter by unit status"
                                className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[170px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                <option value="all">All Units ({totalCount})</option>
                                <option value="registered">Registered ({registered.length})</option>
                                <option value="active">Active Franchises ({activeCount})</option>
                                {expiredCount > 0 && <option value="expired">Expired Franchises ({expiredCount})</option>}
                                <option value="pending">Pending ({pendingCount})</option>
                                <option value="online">Online GPS ({onlineCount})</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Registered units: Driver → Application → Approved/Active Franchise ── */}
                {totalCount === 0 ? (
                    <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${CARD_SHADOW}`}>
                        <EmptyState
                            icon={Bike}
                            title="No registered tricycle"
                            description="You don't have an approved/active franchise unit linked to your account yet."
                            action={
                                <Link
                                    href={route('operator.mtop')}
                                    className="inline-flex items-center justify-center rounded-xl bg-[#182B62] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#25449B] transition-colors"
                                >
                                    View Permit Status
                                </Link>
                            }
                        />
                    </div>
                ) : filteredRegistered.length === 0 && filteredPending.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${CARD_SHADOW}`}>
                        <EmptyState
                            icon={Bike}
                            title="No units found"
                            description="We couldn't find any tricycles or pending applications matching your search or filter."
                            action={
                                <button
                                    type="button"
                                    onClick={() => { setQuery(''); setFleetFilter('all'); }}
                                    className="inline-flex items-center justify-center rounded-xl bg-[#182B62] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#25449B] transition-colors"
                                >
                                    Clear Filters
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {filteredRegistered.map((tricycle, index) => (
                            <TricycleSection key={tricycle.db_id} tricycle={tricycle} index={index} />
                        ))}
                    </div>
                )}

                {/* ── Pending applications: real units, but NOT registered tricycles ── */}
                {filteredPending.length > 0 && (
                    <div className="mt-10">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-600">
                            Pending Application — Not Yet Registered ({filteredPending.length})
                        </p>
                        <p className="mb-4 max-w-3xl text-[12.5px] leading-relaxed text-slate-600">
                            These units have applications still in progress — document review, physical inspection,
                            BPLO release, final confirmation, resubmission, or reinspection. They only become
                            registered tricycles once TMO completes Final Confirmation for the application.
                        </p>
                        <div className="space-y-8">
                            {filteredPending.map((tricycle, index) => (
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
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Tricycle {index + 1}
            </p>

            <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border ${pending ? 'border-amber-200/90' : 'border-slate-200/80'} bg-white ${CARD_SHADOW}`}>
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#182B62]/[0.08] text-[#182B62]">
                            <Bike size={24} strokeWidth={2.4} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold leading-tight text-slate-900">{tricycle.plateNo}</h2>
                            <p className="mt-1 text-sm text-slate-600">{tricycle.id} &bull; {tricycle.makeModel}</p>
                            <p className={`mt-0.5 text-[11.5px] font-semibold ${tricycle.franchiseExpired ? 'text-red-600' : 'text-slate-500'}`}>
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
                                    <h3 className="mb-3 text-sm font-bold text-slate-900">Tracking Connectivity</h3>

                                    <TrackingCard tricycle={tricycle} status={tracking} />

                                    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                                        <Info size={13} className="mt-0.5 shrink-0" />
                                        {tricycle.activeTrackingMode === 'iot_device'
                                            ? 'IoT GPS is optional — this unit can switch to Mobile GPS through the Driver app at any time.'
                                            : 'An IoT GPS device is optional and not required for this unit.'}
                                    </p>
                                </div>

                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <InfoTile icon={User} label="Tricycle Owner" value={tricycle.driver} />
                                    <InfoTile
                                        icon={Users}
                                        label="Tricycle Driver"
                                        value={
                                            tricycle.ownerIsDriver
                                                ? <span className="text-slate-600">Same as Tricycle Owner</span>
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

                                <div className="border-t border-slate-100 pt-5">
                                    <Link
                                        href={route('operator.tracking', { unit: tricycle.db_id })}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#182B62] px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#25449B] transition-colors"
                                    >
                                        <Navigation2 size={15} />
                                        Open Live GPS Tracking
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <h3 className="mb-3 text-sm font-bold text-slate-900">Tracking</h3>
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
                                        <p className="text-[13px] font-semibold text-slate-600">Not available yet</p>
                                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                                            Live tracking, color coding, and franchise details become available once TMO completes Final Confirmation for this unit.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <InfoTile icon={User} label="Tricycle Owner" value={tricycle.driver} />
                                    <InfoTile
                                        icon={Users}
                                        label="Tricycle Driver"
                                        value={
                                            tricycle.ownerIsDriver
                                                ? <span className="text-slate-600">Same as Tricycle Owner</span>
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
                            <p className="mt-0.5 text-[11px] text-slate-500">Registered details from this unit's Tricycle Registration record.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="rounded-xl bg-slate-50 p-5">
                                <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">Vehicle Information</h4>
                                <div className="divide-y divide-slate-200">
                                    <SpecRow label="LTO Plate Number" value={tricycle.plateNo} />
                                    <SpecRow label="Make &amp; Model" value={tricycle.makeModel} />
                                    <SpecRow label="Year Model" value={tricycle.yearModel} />
                                    <SpecRow label="Body Color" value={tricycle.bodyColor} />
                                    <SpecRow label="Body Type" value={tricycle.bodyType} />
                                </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-5">
                                <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">Registration Information</h4>
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
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"><MapPin size={11} /> Last Location</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">
                        {signal ? `${signal.latitude.toFixed(5)}, ${signal.longitude.toFixed(5)}` : 'Not available yet'}
                    </p>
                </div>
                <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"><Clock size={11} /> Last Updated</p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">{signal ? signal.at : 'Never'}</p>
                </div>
            </div>
        </div>
    );
}

function SpecRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-[11px] font-semibold text-slate-600">{label}</span>
            {value ? (
                <span className="text-right text-[13px] font-semibold text-slate-900">{value}</span>
            ) : (
                <span className="text-right text-[13px] italic text-slate-500">Not provided</span>
            )}
        </div>
    );
}

const TILE_TONES = {
    default: 'bg-gradient-to-br from-[#182B62]/[0.10] to-[#182B62]/[0.02] text-[#182B62]',
    amber: 'bg-gradient-to-br from-amber-500/[0.12] to-amber-500/[0.02] text-amber-600',
    emerald: 'bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600',
    danger: 'bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.02] text-red-600',
};

function InfoTile({ icon: Icon, label, value, tone = 'default' }) {
    return (
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 transition-colors hover:bg-slate-50/60">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${TILE_TONES[tone] || TILE_TONES.default}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
                <p className="mt-1 flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">{value}</p>
            </div>
        </div>
    );
}
