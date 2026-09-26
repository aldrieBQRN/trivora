import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    AlertCircle,
    MapPin,
    Clock,
    Bike,
    ShieldAlert,
    Activity,
    Scale,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
    RotateCcw,
} from 'lucide-react';

const PAGE_SIZE = 10;

// Shared soft, layered shadow token — same elevation language used across TMODashboard, so this
// panel reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function Violations({ violations = [], auth }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [detectionFilter, setDetectionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Background refresh of the driver's violation list: an appeal decision or settlement made in
    // the TMO panel elsewhere appears here without a manual reload. The filters and page above
    // are local state and survive every refresh.
    useBackgroundRefresh(['violations']);
    const operatorName = auth?.user?.name || 'Driver';

    const activeViolations = violations;

    // Detection Method counts for the filter — derived from the real detection_key the backend
    // resolved from the GPS ping source (tricycle_locations.source).
    const detectionCounts = useMemo(() => {
        const counts = { mobile_gps: 0, iot_gps: 0 };
        activeViolations.forEach((v) => {
            if (Object.prototype.hasOwnProperty.call(counts, v.detection_key)) {
                counts[v.detection_key] += 1;
            }
        });
        return counts;
    }, [activeViolations]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return activeViolations.filter((v) => {
            const matchesQuery = !q ||
                v.id.toLowerCase().includes(q) ||
                v.unit.toLowerCase().includes(q) ||
                v.location.toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
            const matchesDetection = detectionFilter === 'all' || v.detection_key === detectionFilter;
            return matchesQuery && matchesStatus && matchesDetection;
        });
    }, [activeViolations, query, statusFilter, detectionFilter]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * PAGE_SIZE;
    const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || detectionFilter !== 'all';

    const handleClearFilters = () => {
        setQuery('');
        setStatusFilter('all');
        setDetectionFilter('all');
        setCurrentPage(1);
    };

    const totalFines = activeViolations.reduce((sum, v) => sum + v.fine, 0);
    const activeCount = activeViolations.length;
    const uniqueUnits = [...new Set(activeViolations.map(v => v.unit))].length;
    const unpaidCount = activeViolations.filter((v) => v.status === 'unpaid').length;
    const appealPendingCount = activeViolations.filter((v) => v.status === 'appeal_pending').length;
    const appealRejectedCount = activeViolations.filter((v) => v.status === 'appeal_rejected').length;
    const appealsCount = appealPendingCount + appealRejectedCount;

    return (
        <OperatorLayout title="Active Violations" operatorName={operatorName}>
            <Head title="Active Violations | TRIVORA" />

            {/* 1. CLEAN HEADER */}
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
                        Active Violations
                    </h1>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
                        Real-time IoT detection logs for the Color Coding Ordinance.
                    </p>
                </div>
            </div>

            {/* 2. KPI CARDS */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW} transition-all hover:border-slate-300 sm:p-5`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.02] text-red-700 transition-colors group-hover:from-red-500/[0.18]">
                            <ShieldAlert size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200/70 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            {activeCount} Unsettled
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">
                            ₱{totalFines.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Total Unsettled Fines</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Status</span>
                        <span className="font-semibold text-red-700">Action Needed</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW} transition-all hover:border-slate-300 sm:p-5`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.12] to-amber-500/[0.02] text-amber-700 transition-colors group-hover:from-amber-500/[0.18]">
                            <AlertCircle size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">Active</span>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">{activeCount}</span>
                            <span className="text-xs font-semibold text-slate-400">records</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Active Violations</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Detection</span>
                        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1D2542] animate-pulse" />
                            {detectionCounts.mobile_gps} Mobile GPS · {detectionCounts.iot_gps} IoT GPS
                        </span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW} transition-all hover:border-slate-300 sm:p-5`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542] transition-colors group-hover:from-[#1D2542]/[0.16]">
                            <Bike size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">Flagged</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">{uniqueUnits}</span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Unit{uniqueUnits !== 1 ? 's' : ''} Flagged</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Fleet</span>
                        <span className="font-semibold text-slate-700">1 Registered Unit</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW} transition-all hover:border-slate-300 sm:p-5`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/[0.12] to-indigo-500/[0.02] text-indigo-700 transition-colors group-hover:from-indigo-500/[0.18]">
                            <Scale size={16} strokeWidth={2.2} />
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            appealsCount > 0
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                                : 'bg-slate-100 text-slate-600 border-slate-200/70'
                        }`}>
                            {appealsCount > 0 ? 'Pending Review' : 'None Filed'}
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">{appealsCount}</span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Appeals Filed</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Review</span>
                        <span className={`font-semibold ${appealsCount > 0 ? 'text-indigo-700' : 'text-slate-600'}`}>
                            {appealsCount > 0 ? 'Under TMO Review' : '0 Pending'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. FILTER DECK */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 ${CARD_SHADOW} sm:p-3.5`}>
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                    <div className="relative min-w-[220px] flex-1">
                        <Search size={16} strokeWidth={2.2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search by ticket ID, unit, or location…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:text-sm"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => { setQuery(''); setCurrentPage(1); }}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 items-center gap-2 sm:flex sm:flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:w-48"
                        >
                            <option value="all">All Statuses ({activeCount})</option>
                            <option value="unpaid">Unpaid ({unpaidCount})</option>
                            <option value="appeal_pending">Appeal Pending ({appealPendingCount})</option>
                            <option value="appeal_rejected">Appeal Rejected ({appealRejectedCount})</option>
                        </select>

                        <select
                            value={detectionFilter}
                            onChange={(e) => { setDetectionFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:w-48"
                        >
                            <option value="all">All Detection Methods ({activeCount})</option>
                            <option value="mobile_gps">Mobile GPS ({detectionCounts.mobile_gps})</option>
                            <option value="iot_gps">IoT GPS ({detectionCounts.iot_gps})</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 4. DATA DISPLAY */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600">
                        <ShieldAlert size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {isFiltering ? 'No results found' : 'No Active Violations'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                        {isFiltering
                            ? 'No violations match your search or filters.'
                            : 'Your tricycles currently have no active color coding offenses. Keep up the good work!'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <RotateCcw size={13} strokeWidth={2.2} />
                            Clear Search &amp; Filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className={`hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW} md:block`}>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Offense Details</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Tricycle Unit</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Detection Info</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Fine Amount</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {paginated.map((v) => (
                                        <DesktopViolationRow key={v.id} v={v} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <PaginationFooter activePage={activePage} totalPages={totalPages} totalItems={filtered.length} onPageChange={setCurrentPage} noun="records" />
                    </div>

                    {/* Mobile cards */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map((v) => (
                            <MobileViolationCard key={v.id} v={v} />
                        ))}

                        <div className={`mt-1 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-500">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-400">({filtered.length} violations)</span>
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button type="button" disabled={activePage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40">
                                    <ChevronLeft size={13} strokeWidth={2.5} /><span>Prev</span>
                                </button>
                                <button type="button" disabled={activePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40">
                                    <span>Next</span><ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

        </OperatorLayout>
    );
}

function PaginationFooter({ activePage, totalPages, totalItems, onPageChange, noun }) {
    return (
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3">
            <p className="text-xs text-slate-500">
                Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                <span className="mx-2 text-slate-300">&middot;</span>
                <span className="font-semibold text-slate-700 tabular-nums">{totalItems}</span> {noun}
            </p>
            <div className="flex items-center gap-1.5">
                <button type="button" disabled={activePage <= 1} onClick={() => onPageChange(p => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40">
                    <ChevronLeft size={13} strokeWidth={2.5} /><span>Prev</span>
                </button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => totalPages <= 5 || p === 1 || p === totalPages || Math.abs(p - activePage) <= 1)
                        .map((p, idx, arr) => {
                            const prev = arr[idx - 1];
                            const hasGap = prev && p - prev > 1;
                            return (
                                <React.Fragment key={p}>
                                    {hasGap && <span className="px-0.5 text-xs text-slate-400">&hellip;</span>}
                                    <button
                                        type="button"
                                        onClick={() => onPageChange(p)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all ${
                                            activePage === p ? 'bg-[#1D2542] text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                </div>
                <button type="button" disabled={activePage >= totalPages} onClick={() => onPageChange(p => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40">
                    <span>Next</span><ChevronRight size={13} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

function DetectionTag({ label }) {
    return (
        <span className="inline-flex items-center gap-1 rounded bg-[#1D2542]/[0.08] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#1D2542]">
            <Activity size={8} /> {label}
        </span>
    );
}

const STATUS_PILL = {
    unpaid: { label: 'Unpaid', dot: 'bg-red-500 animate-pulse', className: 'border-red-200/90 bg-red-50 text-red-700' },
    appeal_pending: { label: 'Appeal Pending', dot: 'bg-[#1D2542]', className: 'border-[#1D2542]/25 bg-[#1D2542]/[0.08] text-[#1D2542]' },
    appeal_rejected: { label: 'Appeal Rejected', dot: 'bg-red-500', className: 'border-red-200/90 bg-red-50 text-red-700' },
};

function StatusPill({ status }) {
    const s = STATUS_PILL[status] || STATUS_PILL.unpaid;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs ${s.className}`}>
            {s.label}
        </span>
    );
}

function DesktopViolationRow({ v }) {
    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="mb-1.5 flex items-center gap-2">
                    <p className="text-[13px] font-bold text-slate-900">{v.type}</p>
                    <DetectionTag label={v.detection_label} />
                </div>
                <p className="font-mono text-[11px] text-slate-400">{v.id}</p>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <p className="text-[13px] font-bold text-slate-900">Unit #{v.unit}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: v.colorHex }} />
                    <span className="text-[11px] font-medium text-slate-500">{v.colorCode} Coding</span>
                </div>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <MapPin size={12} className="shrink-0 text-slate-400" />
                    <span className="whitespace-normal break-words leading-relaxed">{v.location}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 pl-[18px] text-[11px] text-slate-400">
                    <Clock size={11} /> {v.date} &bull; {v.time}
                </p>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <span className="text-[13px] font-bold tabular-nums text-red-600">₱{v.fine.toFixed(2)}</span>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <StatusPill status={v.status} />
            </td>
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={route('operator.violations.ticket', { id: v.db_id })}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-[#283256] active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobileViolationCard({ v }) {
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-sm font-bold tracking-wide text-slate-900">{v.id}</span>
                <StatusPill status={v.status} />
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{v.type}</p>
                    <div className="mt-1"><DetectionTag label={v.detection_label} /></div>
                </div>
                <div className="shrink-0 text-right">
                    <span className="text-sm font-extrabold tabular-nums text-red-600">₱{v.fine.toFixed(2)}</span>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Fine</p>
                </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <div className="flex min-w-0 items-center gap-1.5 truncate text-slate-600">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: v.colorHex }} />
                    <span className="truncate">Unit #{v.unit} &bull; {v.location}</span>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={10} /> {v.date}
                </span>
            </div>

            <div className="mt-2.5 border-t border-slate-100 pt-2">
                <Link
                    href={route('operator.violations.ticket', { id: v.db_id })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-[#283256] active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
