import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Clock, ChevronRight, ChevronLeft, Inbox, Bike,
    Search, X, RotateCcw, CheckCircle2,
    Cpu, Smartphone, Phone,
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
const ITEMS_PER_PAGE = 10;

function StatusPill({ status }) {
    const isPending = status === 'Awaiting Final Confirmation' || status === 'awaiting_tmo_confirmation' || status === 'Pending';
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-2xs transition-colors ${
                isPending
                    ? 'border border-amber-200 bg-amber-50 text-amber-800'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
        >
            {isPending ? 'Pending' : 'Active'}
        </span>
    );
}

export default function FinalConfirmationQueue({
    applications = [],
    searchTerm = '',
    awaitingCount = 0,
    confirmedTodayCount = 0,
    iotActiveCount = 0,
    mobileActiveCount = 0,
}) {
    const [query, setQuery] = useState(searchTerm);
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh for multi-officer synchronization
    useBackgroundRefresh(
        ['applications', 'awaitingCount', 'confirmedTodayCount', 'iotActiveCount', 'mobileActiveCount']
    );

    // Only actionable pending applications are presented in this activation queue
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter(a => {
            const matchesQuery = !q ||
                String(a.id).toLowerCase().includes(q) ||
                (a.reference && a.reference.toLowerCase().includes(q)) ||
                (a.operator_name && a.operator_name.toLowerCase().includes(q)) ||
                (a.plate_number && a.plate_number.toLowerCase().includes(q)) ||
                (a.sticker_number && a.sticker_number.toLowerCase().includes(q));
            const matchesType = typeFilter === 'all' || (a.application_type || '').toLowerCase() === typeFilter;

            return matchesQuery && matchesType && a.raw_status === 'awaiting_tmo_confirmation';
        });
    }, [applications, query, typeFilter]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || typeFilter !== 'all';

    const handleClearAll = () => {
        setQuery('');
        setTypeFilter('all');
        setCurrentPage(1);
    };

    const queueTotal = applications.length;
    const pct = (n) => queueTotal > 0 ? Math.round((n / queueTotal) * 100) : 0;

    return (
        <TrivoraLayout title="Final Confirmation & GPS Setup" role="TMO Officer">
            <Head title="Final Confirmation & GPS Setup | TRIVORA" />

            <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                {/* ══════════════════════════════════════════════════════════════
                    1. CLEAN HEADER (Consistent with other TMO modules)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Final Confirmation &amp; GPS Setup
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                            Verify BPLO release sign-off and official Sticker Number, then activate GPS tracking.
                        </p>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                    {/* Card 1: Pending Confirmation */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Pending Confirmation
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {awaitingCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {awaitingCount === 1 ? 'Unit' : 'Units'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Awaiting final clearance sign-off
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Queue Status:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-amber-700 shrink-0">
                                {pct(awaitingCount)}% of queue
                            </span>
                        </div>
                    </div>

                    {/* Card 2: GPS Tracker Devices */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    GPS Tracker Devices
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                                    <Cpu size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {iotActiveCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {iotActiveCount === 1 ? 'Device' : 'Devices'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Battery-wired hardware trackers
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Tracker Mode:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-indigo-700 shrink-0">
                                Always On
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Driver Smartphone GPS */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Driver Smartphone GPS
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <Smartphone size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {mobileActiveCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {mobileActiveCount === 1 ? 'Driver' : 'Drivers'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Driver app location sharing
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Mobile Mode:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-emerald-700 shrink-0">
                                Driver App
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Confirmed Today */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Confirmed Today
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <CheckCircle2 size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {confirmedTodayCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {confirmedTodayCount === 1 ? 'Activated' : 'Activated'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Franchises activated today
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Registry Status:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0">
                                Active Fleet
                            </span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. SEARCH TOOLBAR
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                    <div className="flex items-center gap-2.5">
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
                                placeholder="Search by operator, reference number, contact, plate, or sticker…"
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
                            {isFiltering ? 'No matching applications found' : 'No applications awaiting confirmation'}
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                            {isFiltering
                                ? 'No applications match your search query.'
                                : 'Tricycles cleared through BPLO release will appear here for final GPS fleet activation.'}
                        </p>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <RotateCcw size={12} strokeWidth={2.2} />
                                <span>Clear filter</span>
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
                                        <tr className="border-b border-slate-100 bg-slate-50/75">
                                            <th scope="col" className="py-3 pl-5 pr-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Application No. &amp; Type
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Tricycle Owner
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Tricycle Unit
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Sticker Number
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Status
                                            </th>
                                            <th scope="col" className="py-3 pl-3 pr-6 text-right text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {paginated.map(app => (
                                            <DesktopConfirmationRow key={app.id} app={app} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Integrated Table Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
                                <p className="text-xs text-slate-500 font-medium">
                                    Showing <span className="font-bold text-slate-900 tabular-nums">{filtered.length > 0 ? startIndex + 1 : 0}</span> to{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{endIndex}</span> of{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{filtered.length}</span> units
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
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
                                                            <span className="px-1 text-xs text-slate-400 font-medium">…</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE PURPOSE-BUILT CARDS (< 768px) ── */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {paginated.map(app => (
                                <MobileConfirmationCard key={app.id} app={app} />
                            ))}

                            <div className={`flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                                <p className="text-xs text-slate-500 font-medium">
                                    Page <span className="font-bold text-slate-900 tabular-nums">{activePage}</span> of{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{totalPages}</span>
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                    >
                                        <ChevronLeft size={13} strokeWidth={2.5} />
                                        <span>Prev</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={activePage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
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

function DesktopConfirmationRow({ app }) {
    const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';
    const isAwaiting = app.raw_status === 'awaiting_tmo_confirmation';

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Application No. & Type */}
            <td className="py-4 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold text-slate-500">
                        {isRenewal ? 'Renewal Franchise' : 'New Franchise'}
                    </span>
                </div>
            </td>

            {/* Column 2: Tricycle Owner */}
            <td className="py-4 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={app.operator_name} src={app.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-xs font-black text-white shadow-2xs" />
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                            {app.operator_name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500 font-medium">
                            <Phone size={10} className="text-slate-400 shrink-0" />
                            {app.contact_number || 'No contact number'}
                        </p>
                    </div>
                </div>
            </td>

            {/* Column 3: Tricycle Unit */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <Bike size={14} className="text-[#182B62] shrink-0" />
                        <span className="truncate text-xs sm:text-sm font-bold text-slate-800">
                            {app.make_model}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <span>Plate:</span>
                        <span className="font-mono font-bold text-slate-800">{app.plate_number}</span>
                    </div>
                </div>
            </td>

            {/* Column 4: Sticker Number */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md w-fit">
                        #{app.coding_number}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: app.color_hex || '#3B82F6' }}
                        />
                        {app.color_scheme} Scheme
                    </span>
                </div>
            </td>

            {/* Column 5: Status */}
            <td className="py-4 px-4 align-middle">
                <StatusPill status={app.raw_status} />
            </td>

            {/* Column 6: Action (Single word, No Icon, Consistent compact sizing) */}
            <td className="py-4 pl-3 pr-6 text-right align-middle">
                <Link
                    href={`/tmo/final-confirmation/${app.id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{isAwaiting ? 'Confirm' : 'View'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </td>
        </tr>
    );
}

function MobileConfirmationCard({ app }) {
    const isRenewal = (app.application_type || '').toLowerCase() === 'renewal';
    const isAwaiting = app.raw_status === 'awaiting_tmo_confirmation';

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 transition-all ${CARD_SHADOW}`}>
            {/* Top Row: Reference & Status */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold text-slate-500">
                        {isRenewal ? 'Renewal Franchise' : 'New Franchise'}
                    </span>
                </div>
                <StatusPill status={app.raw_status} />
            </div>

            {/* Driver / Owner info */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={app.operator_name} src={app.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-2xs" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{app.operator_name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 font-medium truncate">
                            <Phone size={10} className="text-slate-400 shrink-0" />
                            {app.contact_number || 'No contact'}
                        </p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                    {app.plate_number}
                </span>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5">
                <Bike size={13} className="text-[#182B62] shrink-0" />
                <span className="truncate font-semibold">{app.make_model}</span>
            </div>

            {/* Sticker Number Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-xs">
                <span className="font-mono font-bold text-slate-900">
                    Sticker #{app.coding_number}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: app.color_hex || '#3B82F6' }}
                    />
                    {app.color_scheme} Scheme
                </span>
            </div>

            {/* Action Button (Solid, Text only, No Icon) */}
            <div className="mt-3 pt-2.5 border-t border-slate-100">
                <Link
                    href={`/tmo/final-confirmation/${app.id}`}
                    className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{isAwaiting ? 'Confirm' : 'View'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </div>
        </div>
    );
}
