import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import ExportDialog from '@/Components/ExportDialog';
import {
    ShieldAlert, AlertCircle, CheckCircle2, Clock, ChevronRight, ChevronLeft,
    Search, X, RotateCcw, MapPin, Scale, Phone, Bike, SlidersHorizontal, ArrowUpRight,
    Download,
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// pages (Dashboard, Live Fleet Monitoring, shared KpiCard/DataTable components), so this page
// reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

export default function Violations({ initialViolations = [], summaryStats = null }) {
    const violations = initialViolations || [];

    // Filter states
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [detectionFilter, setDetectionFilter] = useState('all');
    const [onlyUnsettled, setOnlyUnsettled] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [exportOpen, setExportOpen] = useState(false);
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
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                <div>
                    <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                        Violation Records
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                        Official log of municipal color coding citations, appeals, and penalty settlements in Nasugbu.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setExportOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <Download size={15} strokeWidth={2.2} className="text-white" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                {/* Card 1: Total Citations */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Total Citations
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                <ShieldAlert size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                {totalCount}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                Records
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Recorded municipal citations
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Sources:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 text-right truncate">
                            {detectionOptions.mobile_gps} Mobile · {detectionOptions.iot_gps} Tracker
                        </span>
                    </div>
                </div>

                {/* Card 2: Unpaid Penalties */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Unpaid Penalties
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                <AlertCircle size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-amber-600 leading-none">
                                ₱{stats.unsettled_fines_sum.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {stats.unsettled_count} Due
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Pending municipal settlement
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Status:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-amber-700 shrink-0">Pending Payment</span>
                    </div>
                </div>

                {/* Card 3: Settled Fines */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Settled Fines
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                <CheckCircle2 size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                ₱{stats.settled_fines_sum.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {stats.settled_count} Paid
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Collected and cleared to date
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Settlement:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-emerald-700 shrink-0">{settledPct}% Paid</span>
                    </div>
                </div>

                {/* Card 4: Driver Appeals */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Contested Appeals
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-[#182B62]">
                                <Scale size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                stats.appeals_pending > 0 ? 'text-[#182B62]' : 'text-slate-900'
                            }`}>
                                {stats.appeals_pending}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {stats.appeals_pending === 1 ? 'Appeal' : 'Appeals'}
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            {stats.appeals_pending > 0 ? 'Driver appeals awaiting officer review' : 'No appeals currently pending'}
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Review:</span>
                        <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold shrink-0 ${stats.appeals_pending > 0 ? 'text-[#182B62]' : 'text-slate-800'}`}>
                            {stats.appeals_pending > 0 ? `${stats.appeals_pending} To Review` : 'All cleared'}
                        </span>
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
                            onChange={e => {
                                setQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by ticket number, plate, driver, or sticker number..."
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setCurrentPage(1);
                                }}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    {/* Filter Controls Row */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={e => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            aria-label="Filter by settlement status"
                            className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                        >
                            <option value="all">All Statuses ({totalCount})</option>
                            <option value="unsettled">Unsettled ({unsettledCount})</option>
                            <option value="settled">Settled ({settledCount})</option>
                            {stats.appeals_pending > 0 && (
                                <option value="appeals">Appeals ({stats.appeals_pending})</option>
                            )}
                        </select>

                        {/* Detection Method Filter */}
                        <select
                            value={detectionFilter}
                            onChange={e => {
                                setDetectionFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            aria-label="Filter by detection source"
                            className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[170px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer truncate"
                        >
                            <option value="all">All Sources ({violations.length})</option>
                            <option value="mobile_gps">Driver Mobile GPS ({detectionOptions.mobile_gps})</option>
                            <option value="iot_gps">Installed GPS Tracker ({detectionOptions.iot_gps})</option>
                        </select>

                        {/* Quick Toggle: Only Unsettled */}
                        <button
                            type="button"
                            onClick={() => {
                                setOnlyUnsettled(prev => !prev);
                                setCurrentPage(1);
                            }}
                            className={`col-span-2 sm:col-span-1 inline-flex h-10 w-full sm:w-auto sm:flex-1 lg:flex-none shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer font-['Plus_Jakarta_Sans',sans-serif] ${
                                onlyUnsettled
                                    ? 'border-amber-300 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                        >
                            <AlertCircle size={14} className={onlyUnsettled ? 'text-amber-600' : 'text-slate-500'} />
                            <span>Unsettled Only</span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                onlyUnsettled ? 'bg-amber-600 text-white' : 'bg-slate-200/70 text-slate-700'
                            }`}>
                                {unsettledCount}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY: TABLE & MOBILE CARDS
               ══════════════════════════════════════════════════════════════ */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
                        <ShieldAlert size={22} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 font-['Plus_Jakarta_Sans',sans-serif] text-base font-black text-slate-900">
                        No violation records found
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-600 leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                        {isFiltering
                            ? 'No citations match your selected filters. Try adjusting your search query.'
                            : 'All clear. No active color coding citations are currently recorded.'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
                        >
                            <RotateCcw size={12} strokeWidth={2.2} />
                            <span>Reset all filters</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── DESKTOP & TABLET PURPOSE-BUILT TABLE (md: 768px+) ── */}
                    <div className={`hidden lg:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 bg-slate-50/80">
                                        <th scope="col" className="py-3.5 pl-6 pr-3 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Ticket No. &amp; Date
                                        </th>
                                        <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle &amp; Driver
                                        </th>
                                        <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Color Scheme Sticker
                                        </th>
                                        <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Citation Type
                                        </th>
                                        <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Fine &amp; Penalty
                                        </th>
                                        <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Status
                                        </th>
                                        <th scope="col" className="py-3.5 pl-3 pr-6 text-right font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
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

                        {/* Integrated Table Footer: Pagination */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6 py-3.5">
                            <p className="text-xs text-slate-600 font-['Plus_Jakarta_Sans',sans-serif]">
                                Showing page <span className="font-bold text-slate-900 tabular-nums">{activePage}</span> of{' '}
                                <span className="font-bold text-slate-900 tabular-nums">{totalPages}</span>
                                <span className="mx-2 text-slate-300">·</span>
                                <span className="tabular-nums font-bold text-slate-800">{filtered.length}</span> recorded violations
                            </p>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 font-['Plus_Jakarta_Sans',sans-serif]"
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
                                                        <span className="px-1 text-xs text-slate-500">…</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all font-['Plus_Jakarta_Sans',sans-serif] ${
                                                            activePage === p
                                                                ? 'bg-[#182B62] text-white shadow-sm'
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
                                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── MOBILE PURPOSE-BUILT CARDS (< md: 768px) ── */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                        {paginated.map(record => (
                            <MobileViolationCard key={record.id} record={record} />
                        ))}

                        {/* Mobile Pagination */}
                        <div className={`md:col-span-2 mt-1 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-600 font-['Plus_Jakarta_Sans',sans-serif]">
                                Page <span className="font-bold text-slate-900">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-500">({filtered.length} violations)</span>
                            </p>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40 font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <ChevronLeft size={13} strokeWidth={2.5} />
                                    <span>Prev</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={activePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40 font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
            <ExportDialog
                show={exportOpen}
                onClose={() => setExportOpen(false)}
                title="Export Violation Records"
                recordLabel="violation records"
                recordCount={initialViolations.length}
                scopeNote="All Violation Records"
                exportUrl={route('tmo.violations.export-excel')}
                fallbackName="trivora_violation_records"
            />
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row, Mobile Card & Status Pill
───────────────────────────────────────────────────────────────────────── */

function StatusPill({ record }) {
    const isAppealed = record.appeal_status === 'under_review' || record.raw_status === 'contested';
    const isSettled = record.status === 'settled';

    if (isAppealed) {
        return (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border border-indigo-200/90 bg-indigo-50 text-indigo-800 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
                Appeal Pending
            </span>
        );
    }

    if (isSettled) {
        return (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border border-emerald-200/90 bg-emerald-50 text-emerald-700 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
                Settled
            </span>
        );
    }

    return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border border-amber-200/90 bg-amber-50 text-amber-800 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
            Unsettled
        </span>
    );
}

function EnforcementText({ record }) {
    const status = record.enforcement_status || 'no_action_required';
    const label = record.enforcement_label || 'No Action Required';

    if (status === 'action_required') {
        return (
            <span className="text-[11px] font-bold text-rose-600 font-['Plus_Jakarta_Sans',sans-serif]">
                {label}
            </span>
        );
    }

    if (status === 'completed') {
        return (
            <span className="text-[11px] font-medium text-emerald-600 font-['Plus_Jakarta_Sans',sans-serif]">
                {label}
            </span>
        );
    }

    if (status === 'pending_confirmation') {
        return (
            <span className="text-[11px] font-medium text-amber-600 font-['Plus_Jakarta_Sans',sans-serif]">
                {label}
            </span>
        );
    }

    return (
        <span className="text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
            {label}
        </span>
    );
}

function DesktopViolationRow({ record }) {

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Ticket No. & Date */}
            <td className="py-4 pl-6 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-black tracking-wide text-slate-900 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md w-fit shadow-sm">
                        {record.id}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                        <Clock size={11} strokeWidth={2.2} className="shrink-0" />
                        <span>{record.formatted_date || record.date} · {record.time}</span>
                    </span>
                </div>
            </td>

            {/* Column 2: Tricycle & Driver */}
            <td className="py-4 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={record.operator} src={record.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-sm" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            {record.tricycle_id ? (
                                <Link
                                    href={route('tricycle.details', record.tricycle_id)}
                                    className="font-mono text-xs sm:text-[13px] font-bold text-slate-900 hover:text-[#182B62] transition-colors inline-flex items-center gap-0.5"
                                    title="View Tricycle Profile"
                                >
                                    <span>{record.plate_no}</span>
                                    <ArrowUpRight size={11} strokeWidth={2.5} className="text-slate-500" />
                                </Link>
                            ) : (
                                <span className="font-mono text-xs sm:text-[13px] font-bold text-slate-900">
                                    {record.plate_no}
                                </span>
                            )}
                        </div>
                        <p className="truncate text-xs font-bold text-slate-700 mt-0.5 font-['Plus_Jakarta_Sans',sans-serif]">
                            {record.operator}
                        </p>
                    </div>
                </div>
            </td>

            {/* Column 3: Sticker Number */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-black text-slate-900">
                        #{record.coding_scheme_number || 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Scheme Sticker
                    </span>
                </div>
            </td>

            {/* Column 4: Violation Citation */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                        {record.type}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500 font-medium">
                        {record.detection_label}
                    </span>
                </div>
            </td>

            {/* Column 5: Fine & Penalty (with Enforcement) */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-xs sm:text-[13px] font-['Plus_Jakarta_Sans',sans-serif]">
                        {record.penalty_display || (record.fine ? `₱${Number(record.fine).toFixed(2)}` : 'N/A')}
                    </span>
                    <EnforcementText record={record} />
                </div>
            </td>

            {/* Column 6: Status */}
            <td className="py-4 px-4 align-middle">
                <StatusPill record={record} />
            </td>

            {/* Column 8: Action */}
            <td className="py-4 pl-3 pr-6 text-right align-middle">
                <Link
                    href={`/violations/${record.db_id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all active:scale-[0.98] font-['Plus_Jakarta_Sans',sans-serif]"
                >
                    <span>Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </td>
        </tr>
    );
}

function MobileViolationCard({ record }) {

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            {/* Top Row: Ticket ID, Plate & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black tracking-wide text-slate-900 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md shadow-sm">
                        {record.id}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-500">({record.plate_no})</span>
                </div>

                <StatusPill record={record} />
            </div>

            {/* Operator Information & Penalty */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={record.operator} src={record.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-sm" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">{record.operator}</p>
                        {record.coding_scheme_number && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono font-bold text-slate-600">Sticker #{record.coding_scheme_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                        {record.penalty_display || (record.fine ? `₱${Number(record.fine).toFixed(2)}` : 'N/A')}
                    </span>
                    <div>
                        <EnforcementText record={record} />
                    </div>
                </div>
            </div>

            {/* Infraction Details Row */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                <div className="truncate">
                    <span className="font-bold text-slate-800 text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">{record.type}</span>
                    <span className="text-slate-300 mx-1.5">·</span>
                    <span className="text-[11px] text-slate-600 font-medium">{record.detection_label || record.source}</span>
                </div>

                <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1 font-medium">
                    <Clock size={10} />
                    {record.formatted_date || record.date}
                </span>
            </div>

            {/* Action Button */}
            <div className="mt-3 pt-2.5 border-t border-slate-100">
                <Link
                    href={`/violations/${record.db_id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] font-['Plus_Jakarta_Sans',sans-serif]"
                >
                    <span>View Violation Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </div>
        </div>
    );
}

