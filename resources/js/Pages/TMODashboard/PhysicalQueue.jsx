import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Clock, ChevronRight, ChevronLeft, Inbox, Bike,
    Search, X, RotateCcw, CheckCircle2, ShieldCheck,
    Phone,
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Awaiting Inspection', label: 'Pending Inspection' },
    { value: 'Reinspect', label: 'Re-inspection Required' },
];

const ITEMS_PER_PAGE = 10;

function bucketOf(app) {
    if (app.status === 'Ready for Reinspection') return 'Ready for Reinspection';
    if (app.status === 'Reinspection Required' || app.raw_status === 'failed_inspection') return 'Reinspection Required';
    return 'Awaiting Inspection';
}

function displayGroupOf(bucket) {
    return bucket === 'Awaiting Inspection' ? 'Awaiting Inspection' : 'Reinspect';
}

function StatusPill({ status }) {
    if (displayGroupOf(status) === 'Reinspect') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 shadow-sm">
                Reinspect
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 shadow-sm">
            Pending
        </span>
    );
}

export default function PhysicalQueue({
    applications = [],
    awaitingCount = 0,
    readyReinspectionCount = 0,
    reinspectionRequiredCount = 0,
    scheduledCount = 0,
    reinspectionCount = 0,
    passedTodayCount = 0,
    completedTodayCount = 0,
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh for multi-officer synchronization
    useBackgroundRefresh(
        ['applications', 'awaitingCount', 'readyReinspectionCount', 'reinspectionRequiredCount', 'scheduledCount', 'reinspectionCount', 'passedTodayCount', 'completedTodayCount']
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter(a => {
            const bucket = bucketOf(a);
            const matchesQuery = !q ||
                String(a.id).toLowerCase().includes(q) ||
                (a.reference && a.reference.toLowerCase().includes(q)) ||
                (a.operator && a.operator.toLowerCase().includes(q)) ||
                (a.contact && a.contact.toLowerCase().includes(q)) ||
                (a.plate && a.plate.toLowerCase().includes(q)) ||
                (a.make && a.make.toLowerCase().includes(q));

            const matchesStatus = statusFilter === 'all' || displayGroupOf(bucket) === statusFilter;
            const matchesType = typeFilter === 'all' || (a.application_type || '').toLowerCase() === typeFilter;
            return matchesQuery && matchesStatus && matchesType;
        });
    }, [applications, query, statusFilter, typeFilter]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || typeFilter !== 'all';

    const handleClearAll = () => {
        setQuery('');
        setStatusFilter('all');
        setTypeFilter('all');
        setCurrentPage(1);
    };

    const totalAwaiting = awaitingCount || scheduledCount;
    const totalReadyReinspection = readyReinspectionCount || reinspectionCount;
    const queueTotal = totalAwaiting + totalReadyReinspection;
    const pct = (n) => queueTotal > 0 ? Math.round((n / queueTotal) * 100) : 0;

    return (
        <TrivoraLayout title="Physical Inspection" role="TMO Officer">
            <Head title="Physical Inspection | TRIVORA" />

            <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                {/* ══════════════════════════════════════════════════════════════
                    1. CLEAN HEADER
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Physical Inspection
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                            On-site vehicle roadworthiness testing, safety verification, and BPLO clearance endorsements.
                        </p>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                    {/* Card 1: Pending Inspection */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Pending Inspection
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {totalAwaiting}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    {totalAwaiting === 1 ? 'Unit' : 'Units'}
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Awaiting on-site roadworthiness test
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Queue Status:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-amber-700 shrink-0">
                                {pct(totalAwaiting)}% of queue
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Re-inspections */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Re-inspections
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                                    <RotateCcw size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                    totalReadyReinspection > 0 ? 'text-rose-600' : 'text-slate-900'
                                }`}>
                                    {totalReadyReinspection}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    {totalReadyReinspection === 1 ? 'Re-test' : 'Re-tests'}
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Units flagged for defect repairs
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Driver Status:</span>
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold shrink-0 ${
                                totalReadyReinspection > 0 ? 'text-rose-700' : 'text-slate-600'
                            }`}>
                                {totalReadyReinspection > 0 ? 'Awaiting Re-test' : 'All Clear'}
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Passed Today */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Passed Today
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <CheckCircle2 size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {passedTodayCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    {passedTodayCount === 1 ? 'Passed' : 'Passed'}
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Roadworthy units approved by officer
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Endorsement:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-emerald-700 shrink-0">
                                Forwarded to BPLO
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Inspected Today */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Inspected Today
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {completedTodayCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    {completedTodayCount === 1 ? 'Total' : 'Total'}
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                On-site tests completed by officer
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Field Activity:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0">
                                Active Today
                            </span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. SEARCH & FILTER TOOLBAR
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
                                placeholder="Search by operator, reference number, contact, or plate…"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <select
                                value={typeFilter}
                                onChange={e => {
                                    setTypeFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                aria-label="Filter by application type"
                                className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[160px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                <option value="all">All Application Types</option>
                                <option value="new">New Franchise</option>
                                <option value="renewal">Renewal Franchise</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                aria-label="Filter by inspection status"
                                className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[150px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. APPLICATION DATA TABLE / CARDS
                   ══════════════════════════════════════════════════════════════ */}
                {filtered.length === 0 ? (
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-10 sm:p-14 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200/70">
                            <Inbox size={22} strokeWidth={1.8} />
                        </div>
                        <h3 className="mt-3.5 text-base font-bold text-slate-900">
                            {isFiltering ? 'No matching inspections found' : 'No units awaiting inspection'}
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-600 leading-relaxed">
                            {isFiltering
                                ? 'No units match your search query or filter selection.'
                                : 'All endorsed tricycles have completed roadworthiness testing.'}
                        </p>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                <RotateCcw size={12} strokeWidth={2.2} />
                                <span>Clear all filters</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── DESKTOP & TABLET TABLE (>= 768px) ── */}
                        <div className={`hidden lg:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/75">
                                            <th scope="col" className="py-3 pl-5 pr-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                                Application No. &amp; Type
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                                Tricycle Owner
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                                Tricycle Unit
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                                Status
                                            </th>
                                            <th scope="col" className="py-3 pl-3 pr-5 text-right text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {paginated.map(app => (
                                            <DesktopPhysicalRow key={app.id} app={app} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Integrated Table Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
                                <p className="text-xs text-slate-600 font-medium">
                                    Showing <span className="font-bold text-slate-900 tabular-nums">{filtered.length > 0 ? startIndex + 1 : 0}</span> to{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{endIndex}</span> of{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{filtered.length}</span> units
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
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
                                                            <span className="px-1 text-xs text-slate-500 font-medium">…</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
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
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE PURPOSE-BUILT CARDS (< 768px) ── */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                            {paginated.map(app => (
                                <MobilePhysicalCard key={app.id} app={app} />
                            ))}

                            <div className={`md:col-span-2 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                                <p className="text-xs text-slate-600 font-medium">
                                    Page <span className="font-bold text-slate-900 tabular-nums">{activePage}</span> of{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{totalPages}</span>
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        <ChevronLeft size={13} strokeWidth={2.5} />
                                        <span>Prev</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={activePage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

function DesktopPhysicalRow({ app }) {
    const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';
    const bucket = bucketOf(app);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Application No. & Type */}
            <td className="py-4 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold text-slate-600">
                        {isRenewal ? 'Renewal Franchise' : 'New Franchise'}
                    </span>
                </div>
            </td>

            {/* Column 2: Tricycle Owner & Contact */}
            <td className="py-4 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={app.operator} src={app.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-xs font-black text-white shadow-sm" />
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                            {app.operator}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-600 font-medium">
                            <Phone size={10} className="text-slate-500 shrink-0" />
                            {app.contact || 'No contact number'}
                        </p>
                    </div>
                </div>
            </td>

            {/* Column 3: Tricycle Unit & Plate */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <Bike size={14} className="text-[#182B62] shrink-0" />
                        <span className="truncate text-xs sm:text-sm font-bold text-slate-800">
                            {app.make}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                        <span>Plate:</span>
                        <span className="font-mono font-bold text-slate-800">{app.plate}</span>
                    </div>
                </div>
            </td>

            {/* Column 4: Status */}
            <td className="py-4 px-4 align-middle">
                <StatusPill status={bucket} />
            </td>

            {/* Column 5: Action (Single word, No Icon, Consistent compact sizing) */}
            <td className="py-4 pl-3 pr-6 text-right align-middle">
                <Link
                    href={`/tmo/review/physical/${app.id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                >
                    <span>{displayGroupOf(bucket) === 'Reinspect' ? 'Reinspect' : 'Inspect'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </td>
        </tr>
    );
}

function MobilePhysicalCard({ app }) {
    const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';
    const bucket = bucketOf(app);

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 transition-all ${CARD_SHADOW}`}>
            {/* Top Row: Reference & Status */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold text-slate-600">
                        {isRenewal ? 'Renewal Franchise' : 'New Franchise'}
                    </span>
                </div>
                <StatusPill status={bucket} />
            </div>

            {/* Driver / Owner info */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={app.operator} src={app.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-sm" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{app.operator}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600 font-medium truncate">
                            <Phone size={10} className="text-slate-500 shrink-0" />
                            {app.contact || 'No contact'}
                        </p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                    {app.plate}
                </span>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5">
                <Bike size={13} className="text-[#182B62] shrink-0" />
                <span className="truncate font-semibold">{app.make}</span>
            </div>

            {/* Action Button (Solid, Text only, No Icon) */}
            <div className="mt-3 pt-2.5 border-t border-slate-100">
                <Link
                    href={`/tmo/review/physical/${app.id}`}
                    className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2.5 text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                >
                    <span>{displayGroupOf(bucket) === 'Reinspect' ? 'Reinspect' : 'Inspect'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </div>
        </div>
    );
}
