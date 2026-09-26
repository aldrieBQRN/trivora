import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ShieldAlert, AlertCircle, CheckCircle2, Clock, ChevronRight, ChevronLeft,
    Search, X, RotateCcw, MapPin, Scale, Phone, Bike, SlidersHorizontal, ArrowUpRight,
    FileSpreadsheet,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// pages (Dashboard, Live Fleet Monitoring, shared KpiCard/DataTable components), so this page
// reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function Violations({ initialViolations = [], summaryStats = null }) {
    const violations = initialViolations || [];

    // Filter states
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [detectionFilter, setDetectionFilter] = useState('all');
    const [onlyUnsettled, setOnlyUnsettled] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Silent background refresh — a new automated coding detection or a TMO appeal decision
    // elsewhere should appear here without a manual reload.
    useBackgroundRefresh(['initialViolations', 'summaryStats']);

    // Detection Method options derived from records — Color Coding is the only active violation
    // type, so the meaningful split left is HOW a record was detected (Mobile GPS vs IoT GPS).
    const detectionOptions = useMemo(() => {
        const counts = { mobile_gps: 0, iot_gps: 0 };
        violations.forEach(v => {
            if (Object.prototype.hasOwnProperty.call(counts, v.detection_key)) {
                counts[v.detection_key] += 1;
            }
        });
        return counts;
    }, [violations]);

    // Pre-computed or dynamic stats
    const stats = useMemo(() => {
        if (summaryStats) return summaryStats;
        const total = violations.length;
        const unsettled = violations.filter(v => v.status === 'unsettled').length;
        const settled = violations.filter(v => v.status === 'settled').length;
        const unsettledSum = violations.filter(v => v.status === 'unsettled').reduce((sum, v) => sum + (v.fine || 0), 0);
        const settledSum = violations.filter(v => v.status === 'settled').reduce((sum, v) => sum + (v.fine || 0), 0);
        const appeals = violations.filter(v => v.appeal_status === 'under_review' || v.raw_status === 'contested').length;

        return {
            total_records: total,
            unsettled_count: unsettled,
            settled_count: settled,
            unsettled_fines_sum: unsettledSum,
            settled_fines_sum: settledSum,
            appeals_pending: appeals,
            automated_count: total,
            manual_count: 0,
        };
    }, [violations, summaryStats]);

    const totalCount = stats.total_records;
    const unsettledCount = stats.unsettled_count;
    const settledCount = stats.settled_count;
    const settledPct = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;
    const unsettledPct = totalCount > 0 ? 100 - settledPct : 0;

    // Multi-dimensional filtering
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return violations.filter(v => {
            const matchesQuery = !q || (
                (v.id && v.id.toLowerCase().includes(q)) ||
                (v.operator && v.operator.toLowerCase().includes(q)) ||
                (v.plate_no && v.plate_no.toLowerCase().includes(q)) ||
                (v.coding_scheme_number && String(v.coding_scheme_number).toLowerCase().includes(q)) ||
                (v.type && v.type.toLowerCase().includes(q)) ||
                (v.notes && v.notes.toLowerCase().includes(q))
            );

            let matchesStatus = true;
            if (onlyUnsettled) {
                matchesStatus = v.status === 'unsettled';
            } else if (statusFilter === 'unsettled') {
                matchesStatus = v.status === 'unsettled';
            } else if (statusFilter === 'settled') {
                matchesStatus = v.status === 'settled';
            } else if (statusFilter === 'appeals') {
                matchesStatus = v.appeal_status === 'under_review' || v.raw_status === 'contested';
            }

            const matchesDetection = detectionFilter === 'all' || v.detection_key === detectionFilter;

            return matchesQuery && matchesStatus && matchesDetection;
        });
    }, [violations, query, statusFilter, detectionFilter, onlyUnsettled]);

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || detectionFilter !== 'all' || onlyUnsettled;

    const handleClearFilters = () => {
        setQuery('');
        setStatusFilter('all');
        setDetectionFilter('all');
        setOnlyUnsettled(false);
        setCurrentPage(1);
    };

    return (
        <TrivoraLayout title="Violation Records" role="TMO Officer">
            <Head title="Violation Records | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with Active Tricycle Registry)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Violation Records
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Records of color coding violations, detections, and fines in Nasugbu
                    </p>
                </div>
                {/* Real server-side .xlsx export (DashboardController::exportViolationRecordsExcel),
                    same shared municipal styling as the Reports exports. */}
                <div className="flex items-center gap-2">
                    <a
                        href={route('tmo.violations.export-excel')}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                        <FileSpreadsheet size={13} /> Export to Excel
                    </a>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PREMIUM KPI CARD DECK (Live Fleet Monitoring style)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Card 1: Total Violations */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Total Violations
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <ShieldAlert size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                {totalCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                All-Time
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Detected via GPS monitoring
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Detection:</span>
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {detectionOptions.mobile_gps} Mobile GPS · {detectionOptions.iot_gps} IoT GPS
                        </span>
                    </div>
                </div>

                {/* Card 2: Unpaid Fines */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Unpaid Fines
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-700">
                                <AlertCircle size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                ₱{stats.unsettled_fines_sum.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {stats.unsettled_count} Cases
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Pending settlement from drivers
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Status:</span>
                        <span className="text-xs font-bold text-amber-700">Pending Payment</span>
                    </div>
                </div>

                {/* Card 3: Paid Fines */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Paid Fines
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-700">
                                <CheckCircle2 size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                ₱{stats.settled_fines_sum.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {stats.settled_count} Cases
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Collected and settled to date
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Payment Rate:</span>
                        <span className="text-xs font-bold text-emerald-700">{settledPct}% Paid</span>
                    </div>
                </div>

                {/* Card 4: Driver Appeals */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Driver Appeals
                            </span>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                stats.appeals_pending > 0
                                    ? 'bg-gradient-to-br from-indigo-500/[0.14] to-indigo-500/[0.02] text-indigo-700'
                                    : 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]'
                            }`}>
                                <Scale size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                                stats.appeals_pending > 0 ? 'text-indigo-700' : 'text-[#1D2542]'
                            }`}>
                                {stats.appeals_pending}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {stats.appeals_pending === 1 ? 'Pending Case' : 'Pending Cases'}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {stats.appeals_pending > 0 ? 'Awaiting TMO review' : 'No pending appeals'}
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Review:</span>
                        <span className={`text-xs font-bold ${stats.appeals_pending > 0 ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {stats.appeals_pending > 0 ? 'Needs Review' : '0 Pending'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. MULTI-DIMENSIONAL COMMAND & FILTER DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                    {/* Primary Search Input */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search
                            size={16}
                            strokeWidth={2.2}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={e => {
                                setQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by ticket ID (VIO-26-...), plate, driver, or receipt number…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-tmo-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-tmo-primary/10"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setCurrentPage(1);
                                }}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    {/* Filter Controls Row */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <div className="col-span-1">
                            <select
                                value={statusFilter}
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-10 w-full sm:w-40 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer"
                            >
                                <option value="all">All Statuses ({totalCount})</option>
                                <option value="unsettled">Unsettled ({unsettledCount})</option>
                                <option value="settled">Settled ({settledCount})</option>
                                {stats.appeals_pending > 0 && (
                                    <option value="appeals">Appeals ({stats.appeals_pending})</option>
                                )}
                            </select>
                        </div>

                        {/* Detection Method Filter */}
                        <div className="col-span-1">
                            <select
                                value={detectionFilter}
                                onChange={e => {
                                    setDetectionFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-10 w-full sm:w-48 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer truncate"
                            >
                                <option value="all">All Detection Methods ({violations.length})</option>
                                <option value="mobile_gps">Mobile GPS ({detectionOptions.mobile_gps})</option>
                                <option value="iot_gps">IoT GPS ({detectionOptions.iot_gps})</option>
                            </select>
                        </div>

                        {/* Quick Toggle: Only Unsettled */}
                        <div className="col-span-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setOnlyUnsettled(prev => !prev);
                                    setCurrentPage(1);
                                }}
                                className={`inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                                    onlyUnsettled
                                        ? 'border-amber-300 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 font-bold'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <AlertCircle size={14} className={onlyUnsettled ? 'text-amber-600' : 'text-slate-400'} />
                                <span>Unsettled Only</span>
                                <span className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold ${
                                    onlyUnsettled ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {unsettledCount}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY: TABLE WITH INTEGRATED FOOTER PAGINATION
               ══════════════════════════════════════════════════════════════ */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <ShieldAlert size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        No violations found
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No violations match your search or filters.'
                            : 'All clear. No violations are currently recorded in the registry.'}
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
                    {/* ── DESKTOP PURPOSE-BUILT TABLE (md: 768px+) ── */}
                    <div className={`hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW} md:block`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Ticket No. &amp; Date
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle &amp; Driver
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Sticker Number
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Violation
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Fine Amount
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Status
                                        </th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {paginated.map(record => (
                                        <DesktopViolationRow key={record.id} record={record} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Integrated Table Footer: Pagination Visually Connected */}
                        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3">
                            <p className="text-xs text-slate-500">
                                Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                                <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                                <span className="mx-2 text-slate-300">·</span>
                                <span className="tabular-nums font-semibold text-slate-700">{filtered.length}</span> records
                            </p>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <ChevronLeft size={13} strokeWidth={2.5} />
                                    <span>Prev</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => {
                                            if (totalPages <= 5) return true;
                                            if (p === 1 || p === totalPages) return true;
                                            return Math.abs(p - activePage) <= 1;
                                        })
                                        .map((p, idx, arr) => {
                                            const prev = arr[idx - 1];
                                            const hasGap = prev && p - prev > 1;

                                            return (
                                                <React.Fragment key={p}>
                                                    {hasGap && (
                                                        <span className="px-0.5 text-xs text-slate-400">…</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all ${
                                                            activePage === p
                                                                ? 'bg-tmo-primary text-white shadow-sm'
                                                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                </React.Fragment>
                                            );
                                        })}
                                </div>

                                <button
                                    type="button"
                                    disabled={activePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── MOBILE PURPOSE-BUILT CARDS (< md: 768px) ── */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map(record => (
                            <MobileViolationCard key={record.id} record={record} />
                        ))}

                        {/* Mobile Pagination Connected at Bottom of List */}
                        <div className={`mt-1 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-500">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-400">({filtered.length} violations)</span>
                            </p>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <ChevronLeft size={13} strokeWidth={2.5} />
                                    <span>Prev</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={activePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row, Mobile Card & Status Pill
───────────────────────────────────────────────────────────────────────── */

function getInitials(name) {
    if (!name || name === 'N/A') return 'DR';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusPill({ record }) {
    const isAppealed = record.appeal_status === 'under_review' || record.raw_status === 'contested';
    const isSettled = record.status === 'settled';

    if (isAppealed) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border border-indigo-200/90 bg-indigo-50 text-indigo-800 shadow-2xs">
                Appeal Pending
            </span>
        );
    }

    if (isSettled) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border border-emerald-200/90 bg-emerald-50 text-emerald-700 shadow-2xs">
                Settled
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border border-amber-200/90 bg-amber-50 text-amber-800 shadow-2xs">
            Unsettled
        </span>
    );
}

function DesktopViolationRow({ record }) {
    const initials = getInitials(record.operator);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Ticket No. & Date */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {record.id}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={10} strokeWidth={2.2} />
                        {record.formatted_date || record.date} · {record.time}
                    </span>
                </div>
            </td>

            {/* Column 2: Tricycle & Driver */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            {record.tricycle_id ? (
                                <Link
                                    href={route('tricycle.details', record.tricycle_id)}
                                    className="font-mono text-xs sm:text-[13px] font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-0.5"
                                    title="View Tricycle Profile"
                                >
                                    <span>{record.plate_no}</span>
                                    <ArrowUpRight size={10} strokeWidth={2.5} className="text-slate-400" />
                                </Link>
                            ) : (
                                <span className="font-mono text-xs sm:text-[13px] font-bold text-slate-900">
                                    {record.plate_no}
                                </span>
                            )}
                        </div>
                        <p className="truncate text-xs font-semibold text-slate-700 mt-0.5">
                            {record.operator}
                        </p>
                    </div>
                </div>
            </td>

            {/* Column 3: Sticker Number */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold text-slate-900">
                        #{record.coding_scheme_number || 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                        Municipal Sticker
                    </span>
                </div>
            </td>

            {/* Column 4: Violation */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-900">
                        {record.type}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                        {record.detection_label}
                    </span>
                </div>
            </td>

            {/* Column 5: Fine Amount */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 tabular-nums text-xs sm:text-[13px]">
                        ₱{record.fine.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                        Fine
                    </span>
                </div>
            </td>

            {/* Column 6: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill record={record} />
            </td>

            {/* Column 7: Action (Styled in #1D2542 with rounded-full pill radius) */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={`/violations/${record.db_id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobileViolationCard({ record }) {
    const initials = getInitials(record.operator);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            {/* Top Row: Ticket ID & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                        {record.id}
                    </span>
                    <span className="font-mono text-xs text-slate-400">({record.plate_no})</span>
                </div>

                <StatusPill record={record} />
            </div>

            {/* Operator Information */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{record.operator}</p>
                        {record.coding_scheme_number && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <span className="font-mono font-medium text-slate-500">#{record.coding_scheme_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold tabular-nums text-slate-900">
                        ₱{record.fine.toFixed(2)}
                    </span>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                        Fine
                    </p>
                </div>
            </div>

            {/* Infraction Details Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <div className="truncate">
                    <span className="font-semibold text-slate-800 text-[11px]">{record.type}</span>
                    <span className="text-slate-300 mx-1.5">·</span>
                    <span className="text-[11px] text-slate-500">{record.source}</span>
                </div>

                <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {record.formatted_date || record.date}
                </span>
            </div>

            {/* Action Button: #1D2542 with rounded-full radius */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={`/violations/${record.db_id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
