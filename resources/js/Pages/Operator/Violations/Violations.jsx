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
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

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

    const unsettledFines = activeViolations.filter((v) => v.status !== 'paid').reduce((sum, v) => sum + v.fine, 0);
    const unpaidCount = activeViolations.filter((v) => v.status === 'unpaid').length;
    const paidCount = activeViolations.filter((v) => v.status === 'paid').length;
    const uniqueUnits = [...new Set(activeViolations.map(v => v.unit))].length;
    const appealPendingCount = activeViolations.filter((v) => v.status === 'appeal_pending').length;
    const appealRejectedCount = activeViolations.filter((v) => v.status === 'appeal_rejected').length;
    const appealsCount = appealPendingCount + appealRejectedCount;
    const totalCitations = activeViolations.length;

    return (
        <OperatorLayout title="Active Violations" operatorName={operatorName}>
            <Head title="Active Violations | TRIVORA" />

            {/* 1. CLEAN HEADER */}
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                        Active Violations
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                        Review traffic citations, track pending appeals, and view municipal payment settlement receipts.
                    </p>
                </div>
            </div>

            {/* 2. COMPACT OPERATIONAL KPI DECK */}
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                {/* Card 1: Total Unsettled Fines */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Unsettled Fines
                            </span>
                            <div className={`flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl border ${unsettledFines > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                <ShieldAlert size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${unsettledFines > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                ₱{unsettledFines.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {unpaidCount} Due
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            {unsettledFines > 0 ? 'Pending municipal settlement' : 'All citation fines fully settled'}
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Status:</span>
                        <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold tabular-nums shrink-0 ${unpaidCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            {unpaidCount > 0 ? `${unpaidCount} Action Needed` : 'All Settled'}
                        </span>
                    </div>
                </div>

                {/* Card 2: Active Violations */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Recorded Citations
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                <AlertCircle size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                {totalCitations}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                Citations
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Recorded municipal citations
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Settlement:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 tabular-nums shrink-0">
                            {paidCount} Paid · {unpaidCount} Unpaid
                        </span>
                    </div>
                </div>

                {/* Card 3: Flagged Units */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Flagged Units
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                <Bike size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                {uniqueUnits}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                Tricycles
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Units with active citations
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Fleet:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 tabular-nums shrink-0">
                            {uniqueUnits} Flagged Unit{uniqueUnits !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Card 4: Contested Appeals */}
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
                                appealsCount > 0 ? 'text-[#182B62]' : 'text-slate-900'
                            }`}>
                                {appealsCount}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {appealsCount === 1 ? 'Appeal' : 'Appeals'}
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            {appealsCount > 0 ? 'Driver appeals under TMO review' : 'No appeals currently filed'}
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Review:</span>
                        <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold tabular-nums shrink-0 ${appealsCount > 0 ? 'text-[#182B62]' : 'text-slate-800'}`}>
                            {appealsCount > 0 ? `${appealsCount} In Review` : 'None Filed'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. MULTI-DIMENSIONAL COMMAND & FILTER TOOLBAR */}
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
                            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search by ticket ID, unit, or location..."
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => { setQuery(''); setCurrentPage(1); }}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    {/* Filter Controls Row */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            aria-label="Filter by status"
                            className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                        >
                            <option value="all">All Citations ({totalCitations})</option>
                            <option value="unpaid">Unpaid ({unpaidCount})</option>
                            <option value="paid">Paid ({paidCount})</option>
                            <option value="appeal_pending">Appeal Pending ({appealPendingCount})</option>
                            <option value="appeal_rejected">Appeal Rejected ({appealRejectedCount})</option>
                        </select>

                        <select
                            value={detectionFilter}
                            onChange={(e) => { setDetectionFilter(e.target.value); setCurrentPage(1); }}
                            aria-label="Filter by detection method"
                            className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[150px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                        >
                            <option value="all">All Sources ({totalCitations})</option>
                            <option value="mobile_gps">Mobile GPS ({detectionCounts.mobile_gps})</option>
                            <option value="iot_gps">IoT GPS ({detectionCounts.iot_gps})</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 4. DATA DISPLAY */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600">
                        <ShieldAlert size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {isFiltering ? 'No results found' : 'No Active Violations'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
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
                    <div className={`hidden overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW} lg:block`}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[900px] whitespace-nowrap border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Offense Details</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Tricycle Unit</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Detection Info</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Fine Amount</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">Status</th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">Action</th>
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
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:hidden">
                        {paginated.map((v) => (
                            <MobileViolationCard key={v.id} v={v} />
                        ))}

                        <div className={`md:col-span-2 mt-2 flex items-center justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white px-4 py-3.5 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-600">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-500">({filtered.length} violations)</span>
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button type="button" disabled={activePage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40">
                                    <ChevronLeft size={13} strokeWidth={2.5} /><span>Prev</span>
                                </button>
                                <button type="button" disabled={activePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40">
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
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
            <p className="text-xs text-slate-600">
                Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                <span className="mx-2 text-slate-300">&middot;</span>
                <span className="font-semibold text-slate-700 tabular-nums">{totalItems}</span> {noun}
            </p>
            <div className="flex items-center gap-1.5">
                <button type="button" disabled={activePage <= 1} onClick={() => onPageChange(p => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40">
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
                                    {hasGap && <span className="px-0.5 text-xs text-slate-500">&hellip;</span>}
                                    <button
                                        type="button"
                                        onClick={() => onPageChange(p)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                                            activePage === p ? 'bg-[#182B62] text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                </div>
                <button type="button" disabled={activePage >= totalPages} onClick={() => onPageChange(p => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40">
                    <span>Next</span><ChevronRight size={13} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

function DetectionTag({ label }) {
    return (
        <span className="inline-flex items-center gap-1 rounded bg-[#182B62]/[0.08] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#182B62]">
            <Activity size={8} /> {label}
        </span>
    );
}

const STATUS_PILL = {
    paid: { label: 'Paid', className: 'border-emerald-200/90 bg-emerald-50 text-emerald-700' },
    unpaid: { label: 'Unpaid', className: 'border-red-200/90 bg-red-50 text-red-700' },
    appeal_pending: { label: 'Appeal Pending', className: 'border-[#182B62]/25 bg-[#182B62]/[0.08] text-[#182B62]' },
    appeal_rejected: { label: 'Appeal Rejected', className: 'border-red-200/90 bg-red-50 text-red-700' },
};

function StatusPill({ status }) {
    const s = STATUS_PILL[status] || STATUS_PILL.unpaid;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase shadow-sm ${s.className}`}>
            {s.label}
        </span>
    );
}

function DesktopViolationRow({ v }) {
    const isPaid = v.status === 'paid';

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="mb-1.5 flex items-center gap-2">
                    <p className="text-[13px] font-bold text-slate-900">{v.type}</p>
                    <DetectionTag label={v.detection_label} />
                </div>
                <p className="font-mono text-[11px] text-slate-500">{v.id}</p>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <p className="text-[13px] font-bold text-slate-900">Unit #{v.unit}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: v.colorHex }} />
                    <span className="text-[11px] font-medium text-slate-600">{v.colorCode} Coding</span>
                </div>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <MapPin size={12} className="shrink-0 text-slate-500" />
                    <span className="whitespace-normal break-words leading-relaxed">{v.location}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 pl-[18px] text-[11px] text-slate-500">
                    <Clock size={11} /> {v.date} &bull; {v.time}
                </p>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <span className={`text-[13px] font-bold tabular-nums ${isPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₱{v.fine.toFixed(2)}
                </span>
                {isPaid && v.paid_at && (
                    <p className="text-[10px] font-medium text-emerald-700 mt-0.5">Paid {v.paid_at}</p>
                )}
            </td>
            <td className="px-4 py-3.5 align-middle">
                <StatusPill status={v.status} />
            </td>
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={route('operator.violations.ticket', { id: v.db_id })}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#25449B] active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </td>
        </tr>
    );
}

function MobileViolationCard({ v }) {
    const isPaid = v.status === 'paid';

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <span className="font-mono text-sm font-bold tracking-wide text-slate-900">{v.id}</span>
                <StatusPill status={v.status} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{v.type}</p>
                    <div className="mt-1"><DetectionTag label={v.detection_label} /></div>
                </div>
                <div className="shrink-0 text-right">
                    <span className={`text-sm font-black tabular-nums ${isPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                        ₱{v.fine.toFixed(2)}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {isPaid ? 'Settled' : 'Fine'}
                    </p>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                <div className="flex min-w-0 items-center gap-1.5 truncate text-slate-600">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: v.colorHex }} />
                    <span className="truncate font-medium">Unit #{v.unit} &bull; {v.location}</span>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                    <Clock size={11} /> {v.date}
                </span>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-2.5">
                <Link
                    href={route('operator.violations.ticket', { id: v.db_id })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#182B62] py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#25449B] active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </div>
        </div>
    );
}
