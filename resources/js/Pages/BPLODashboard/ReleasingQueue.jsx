import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    Search, Award, ChevronRight, ChevronLeft, Bike,
    Hash, CheckCircle2, Inbox, X, RotateCcw,
    FolderCheck, MapPin, Receipt, TrendingUp
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// panel pages, so BPLO cards read as part of the same product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const ITEMS_PER_PAGE = 10;

export default function ReleasingQueue({
    applications = [],
    pendingCount = 0,
    issuedTodayCount = 0,
    activeRegistryCount = 0,
}) {
    const [query, setQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh — a TMO physical inspection pass elsewhere feeds new units into
    // this queue without a manual reload.
    useBackgroundRefresh(['applications', 'pendingCount', 'issuedTodayCount', 'activeRegistryCount']);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter((a) => {
            return (
                !q ||
                String(a.id).toLowerCase().includes(q) ||
                (a.reference && a.reference.toLowerCase().includes(q)) ||
                (a.operator && a.operator.toLowerCase().includes(q)) ||
                (a.make && a.make.toLowerCase().includes(q)) ||
                (a.plate && a.plate.toLowerCase().includes(q))
            );
        });
    }, [applications, query]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '';

    const handleClearAll = () => {
        setQuery('');
        setCurrentPage(1);
    };

    return (
        <BPLOLayout title="Releasing Queue" role="BPLO Officer">
            <Head title="BPLO Releasing | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with TMO Queue Layout)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Releasing Queue
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Assign the Sticker Number and release official MTOP permits for verified, roadworthy units
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PREMIUM KPI CARD DECK (TMO Operations style)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Card 1: Pending Issuance */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Pending Issuance
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/[0.12] to-blue-500/[0.02] text-blue-700">
                                <Award size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {pendingCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Awaiting Sticker
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Cleared inspection, ready for release
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Status:</span>
                        <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 text-xs">
                            {pendingCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                            {pendingCount > 0 ? 'Action Needed' : 'All Clear'}
                        </span>
                    </div>
                </div>

                {/* Card 2: Issued Today */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Issued Today
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                <CheckCircle2 size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {issuedTodayCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Completed
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Stickers handed over to drivers
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Session:</span>
                        <span className="text-xs font-bold text-emerald-700">Active</span>
                    </div>
                </div>

                {/* Card 3: Active Masterlist Registry */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Active Registry
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <FolderCheck size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                {activeRegistryCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Total Units
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Official franchises on record
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Registry:</span>
                        <span className="text-xs font-bold text-slate-700">Synced</span>
                    </div>
                </div>

                {/* Card 4: Issuance Progress */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Issuance Progress
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <TrendingUp size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {(pendingCount + issuedTodayCount) > 0 ? Math.round((issuedTodayCount / (pendingCount + issuedTodayCount)) * 100) : 100}%
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Share of today's queue completed
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Today's progress:</span>
                        <span className="text-xs font-bold text-slate-700">{issuedTodayCount} of {pendingCount + issuedTodayCount} done</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. SEARCH & FILTER DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search
                            size={16}
                            strokeWidth={2.2}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by reference ID, operator name, or make…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10"
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

                    <div className="flex items-center gap-2">
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                                title="Reset all filters"
                            >
                                <RotateCcw size={13} strokeWidth={2.2} className="text-slate-400" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY: TABLE WITH INTEGRATED FOOTER PAGINATION
               ══════════════════════════════════════════════════════════════ */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Inbox size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {isFiltering ? 'No matching applications' : 'Releasing Queue is Clear'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No applications match your search query or filter.'
                            : 'Units that have cleared physical inspection will appear here, ready for sticker release.'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                            <RotateCcw size={12} strokeWidth={2.2} />
                            <span>Clear all filters</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── DESKTOP & TABLET DATA TABLE (md: 768px and up) ── */}
                    <div className={`hidden md:block overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tracking / Reference
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Operator &amp; Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Inspection
                                        </th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {paginated.map((app) => (
                                        <DesktopReleasingRow key={app.id} app={app} />
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
                                <span className="tabular-nums font-semibold text-slate-700">{filtered.length}</span> units
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
                                                                ? 'bg-[#1D2542] text-white shadow-sm'
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

                    {/* ── MOBILE PURPOSE-BUILT CARDS (under 768px) ── */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map((app) => (
                            <MobileReleasingCard key={app.id} app={app} />
                        ))}

                        {/* Mobile Pagination Bar */}
                        <div className={`mt-1 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-500">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-400">({filtered.length} units)</span>
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

        </BPLOLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

function getInitials(name) {
    if (!name || name === 'N/A') return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function DesktopReleasingRow({ app }) {
    const initials = getInitials(app.operator);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Tracking / Reference */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400 font-medium">
                        Verified Application
                    </span>
                </div>
            </td>

            {/* Column 2: Operator & Unit */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                            {app.operator}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Bike size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{app.make}</span>
                            {app.plate && app.plate !== 'N/A' && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                                        {app.plate}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </td>


            {/* Column 4: Inspection */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200/70">
                        <CheckCircle2 size={11} strokeWidth={2.5} />
                        TMO Passed · {app.tmo_passed_at || 'Passed'}
                    </span>
                </div>
            </td>

            {/* Column 5: Action */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={`/bplo/issue/${app.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>Issue Sticker Number</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobileReleasingCard({ app }) {
    const initials = getInitials(app.operator);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 transition-all hover:border-slate-300 ${CARD_SHADOW}`}>
            {/* Top Row: Reference & TMO Passed Pill */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                    {app.reference}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/70">
                    <CheckCircle2 size={10} strokeWidth={2.5} />
                    TMO Passed
                </span>
            </div>

            {/* Operator & TODA */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{app.operator}</p>
                    </div>
                </div>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5 truncate">
                    <Bike size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{app.make || 'Tricycle Unit'}</span>
                </div>
                {app.plate && app.plate !== 'N/A' && (
                    <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                        {app.plate}
                    </span>
                )}
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={`/bplo/issue/${app.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>Issue Sticker Number</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}