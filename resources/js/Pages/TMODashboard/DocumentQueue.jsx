import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Clock, ChevronRight, ChevronLeft, Inbox, FileText,
    Search, X, RotateCcw, CheckCircle2, TrendingUp, Phone
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending Verification' },
    { value: 'Re-submission', label: 'Needs Correction' },
];

const ITEMS_PER_PAGE = 10;
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function DocumentQueue({
    applications = [],
    pendingCount = 0,
    reviewedTodayCount = 0,
    resubmissionCount = 0,
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh for multi-officer synchronization
    useBackgroundRefresh(['applications', 'pendingCount', 'reviewedTodayCount', 'resubmissionCount']);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter(a => {
            const matchesQuery = !q ||
                String(a.id).toLowerCase().includes(q) ||
                (a.reference && a.reference.toLowerCase().includes(q)) ||
                (a.operator && a.operator.toLowerCase().includes(q)) ||
                (a.contact && a.contact.toLowerCase().includes(q));
            const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
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

    const cycleTotal = pendingCount + reviewedTodayCount + resubmissionCount;
    const pct = (n) => cycleTotal > 0 ? Math.round((n / cycleTotal) * 100) : 0;

    return (
        <TrivoraLayout title="Document Review" role="TMO Officer">
            <Head title="Document Review | TRIVORA" />

            <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                {/* ══════════════════════════════════════════════════════════════
                    1. PAGE HEADER
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Document Review
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                            Verify uploaded franchise requirements and clearances before endorsing units for physical roadworthiness inspection.
                        </p>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                    {/* Card 1: Pending Verification */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Pending Verification
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {pendingCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {pendingCount === 1 ? 'Application' : 'Applications'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Awaiting municipal document check
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Queue Status:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-amber-700 shrink-0">
                                {pct(pendingCount)}% of queue
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Reviewed Today */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Reviewed Today
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <CheckCircle2 size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {reviewedTodayCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {reviewedTodayCount === 1 ? 'Verified' : 'Verified'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Processed and endorsed by officer
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Daily Output:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-emerald-700 shrink-0">
                                Processed Today
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Needs Correction */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Needs Correction
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                                    <RotateCcw size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                    resubmissionCount > 0 ? 'text-rose-600' : 'text-slate-900'
                                }`}>
                                    {resubmissionCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {resubmissionCount === 1 ? 'Return' : 'Returns'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Returned to applicant for fixes
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Applicant Action:</span>
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold shrink-0 ${
                                resubmissionCount > 0 ? 'text-rose-700' : 'text-slate-600'
                            }`}>
                                {resubmissionCount > 0 ? 'Awaiting Files' : 'All Clear'}
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Review Completion */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Review Completion
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <TrendingUp size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {cycleTotal > 0 ? Math.round((reviewedTodayCount / cycleTotal) * 100) : 100}%
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Rate
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Daily queue completion pace
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Total Volume:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0 tabular-nums">
                                {reviewedTodayCount} of {cycleTotal} Total
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
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={e => {
                                    setQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search by applicant name, reference number, or contact…"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
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
                                className="h-10 w-full sm:w-auto sm:min-w-[160px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
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
                                aria-label="Filter by queue status"
                                className="h-10 w-full sm:w-auto sm:min-w-[150px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
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
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/70">
                            <Inbox size={22} strokeWidth={1.8} />
                        </div>
                        <h3 className="mt-3.5 text-base font-bold text-slate-900">
                            {isFiltering ? 'No matching applications found' : 'No applications awaiting review'}
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                            {isFiltering
                                ? 'No applications match your search query or filter selection.'
                                : 'All online document submissions have been processed for today.'}
                        </p>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
                            >
                                <RotateCcw size={12} strokeWidth={2.2} />
                                <span>Clear all filters</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── DESKTOP & TABLET TABLE (>= 768px) ── */}
                        <div className={`hidden md:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[760px] text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <th scope="col" className="py-3.5 pl-6 pr-3">
                                                Application No. &amp; Type
                                            </th>
                                            <th scope="col" className="py-3.5 px-4">
                                                Applicant Operator
                                            </th>
                                            <th scope="col" className="py-3.5 px-4">
                                                Submitted Files
                                            </th>
                                            <th scope="col" className="py-3.5 px-4">
                                                Submission Date
                                            </th>
                                            <th scope="col" className="py-3.5 px-4">
                                                Review Status
                                            </th>
                                            <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {paginated.map(app => (
                                            <DesktopQueueRow key={app.id} app={app} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table Pagination Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <p className="text-xs text-slate-500">
                                    Showing <strong className="text-slate-900">{startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-900">{filtered.length}</strong> applications
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-40"
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
                                                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                                                                activePage === p
                                                                    ? 'bg-[#182B62] text-white shadow-2xs'
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
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-40"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE CARD DECK (< 768px) ── */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {paginated.map(app => (
                                <MobileQueueCard key={app.id} app={app} />
                            ))}

                            {/* Mobile Pagination */}
                            {totalPages > 1 && (
                                <div className={`flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 ${CARD_SHADOW}`}>
                                    <p className="text-xs text-slate-500">
                                        <span className="font-bold text-slate-900">{activePage}</span> / {totalPages}
                                        <span className="ml-1 text-[11px] text-slate-400">({filtered.length} total)</span>
                                    </p>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={activePage <= 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:opacity-40"
                                        >
                                            <ChevronLeft size={13} strokeWidth={2.5} />
                                            <span>Prev</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={activePage >= totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:opacity-40"
                                        >
                                            <span>Next</span>
                                            <ChevronRight size={13} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row, Mobile Card & Status Pill
───────────────────────────────────────────────────────────────────────── */

function StatusPill({ status }) {
    const isPending = status === 'Pending';
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                isPending
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-rose-500'}`} />
            <span>{isPending ? 'Pending Verification' : 'Needs Correction'}</span>
        </span>
    );
}

function DesktopQueueRow({ app }) {
    const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Application No. & Type */}
            <td className="py-4 pl-6 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold text-slate-500">
                        {isRenewal ? 'Renewal Franchise' : 'New Franchise'}
                    </span>
                </div>
            </td>

            {/* Column 2: Applicant Operator & Contact (Consistent rounded-xl gradient profile + phone) */}
            <td className="py-4 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={app.operator} src={app.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-2xs" />
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#182B62] transition-colors">
                            {app.operator}
                        </p>
                        {app.contact && app.contact !== 'N/A' ? (
                            <a
                                href={`tel:${app.contact}`}
                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#182B62] transition-colors font-mono"
                            >
                                <Phone size={10} strokeWidth={2.2} className="text-slate-400" />
                                <span>{app.contact}</span>
                            </a>
                        ) : (
                            <span className="text-[11px] text-slate-400 font-medium">No contact</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Column 3: Files */}
            <td className="py-4 px-4 align-middle">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 border border-slate-200/80 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                    <FileText size={12} strokeWidth={2.2} className="text-slate-400" />
                    <span>{app.docs_count} Files</span>
                </span>
            </td>

            {/* Column 4: Submission Date */}
            <td className="py-4 px-4 align-middle">
                <span className="text-xs font-semibold text-slate-800 block">
                    {app.submitted_date}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock size={10} strokeWidth={2.2} />
                    <span>{app.submitted_at}</span>
                </span>
            </td>

            {/* Column 5: Status */}
            <td className="py-4 px-4 align-middle">
                <StatusPill status={app.status} />
            </td>

            {/* Column 6: Action (Consistent with Violation Records: No icon) */}
            <td className="py-4 pl-3 pr-6 text-right align-middle">
                <Link
                    href={`/tmo/review/docs/${app.id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-4 py-1.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{app.status === 'Pending' ? 'Review' : 'Re-review'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </td>
        </tr>
    );
}

function MobileQueueCard({ app }) {
    const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 transition-all ${CARD_SHADOW}`}>
            {/* Top Row: Reference & Status (Type directly under Reference No.) */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold text-slate-500">
                        {isRenewal ? 'Renewal Franchise' : 'New Franchise'}
                    </span>
                </div>
                <StatusPill status={app.status} />
            </div>

            {/* Applicant Information & Contact */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={app.operator} src={app.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-2xs" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{app.operator}</p>
                        {app.contact && app.contact !== 'N/A' ? (
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Phone size={10} className="text-slate-400" />
                                <span>{app.contact}</span>
                            </span>
                        ) : (
                            <span className="text-[10px] text-slate-400">No contact</span>
                        )}
                    </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    <FileText size={10} strokeWidth={2.2} className="text-slate-400" />
                    <span>{app.docs_count} files</span>
                </span>
            </div>

            {/* Submission Date Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <span className="text-[11px] font-medium text-slate-500">{app.submitted_date}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Clock size={10} />
                    <span>{app.submitted_at}</span>
                </span>
            </div>

            {/* Full-Width Action Button (No icon) */}
            <div className="mt-3 pt-2.5 border-t border-slate-100">
                <Link
                    href={`/tmo/review/docs/${app.id}`}
                    className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{app.status === 'Pending' ? 'Review' : 'Re-review'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </div>
        </div>
    );
}
