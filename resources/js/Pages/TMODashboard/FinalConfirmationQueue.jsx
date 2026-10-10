import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Clock, ChevronRight, ChevronLeft, Inbox, Bike,
    Search, X, RotateCcw, CheckCircle2,
    Cpu, Smartphone, Phone,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// Shared soft, layered shadow token — same elevation language used across the TMO panel (Index.jsx,
// Dashboard.jsx, KpiCard.jsx) so this queue page reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

function getInitials(name) {
    if (!name || name === 'N/A') return 'TD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Matches TMODashboard/DocumentQueue.jsx's StatusPill exactly (size, weight, not uppercase) so
// the Status column reads the same across TMO queue pages — the shared StatusBadge component is
// deliberately not used here since it renders uppercase, which this page's Status column should not.
function StatusPill({ status }) {
    const isPending = status === 'Awaiting Final Confirmation' || status === 'awaiting_tmo_confirmation' || status === 'Pending';
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs transition-colors ${
                isPending
                    ? 'border border-amber-200/90 bg-amber-50 text-amber-800'
                    : 'border border-emerald-200/90 bg-emerald-50 text-emerald-700'
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
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh — a BPLO release elsewhere feeds new units into this queue, and a
    // just-confirmed application moves out of "Pending" here, without a manual reload.
    useBackgroundRefresh(
        ['applications', 'awaitingCount', 'confirmedTodayCount', 'iotActiveCount', 'mobileActiveCount']
    );

    // This queue only ever shows the actionable, pending items — an application that already
    // finished Final Confirmation is settled, not something waiting on TMO. No status filter/tab
    // to switch views; the backend still fetches 'completed' rows too (used elsewhere, e.g. the
    // Active Registry), this list just never displays them.
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter(a => {
            const matchesQuery = !q ||
                String(a.id).toLowerCase().includes(q) ||
                (a.reference && a.reference.toLowerCase().includes(q)) ||
                (a.operator_name && a.operator_name.toLowerCase().includes(q)) ||
                (a.plate_number && a.plate_number.toLowerCase().includes(q)) ||
                (a.sticker_number && a.sticker_number.toLowerCase().includes(q));

            return matchesQuery && a.raw_status === 'awaiting_tmo_confirmation';
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

    const queueTotal = applications.length;
    const pct = (n) => queueTotal > 0 ? Math.round((n / queueTotal) * 100) : 0;

    return (
        <TrivoraLayout title="Final Confirmation & GPS Setup" role="TMO Officer">
            <Head title="Final Confirmation & GPS Setup | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with Physical Inspection)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Final Confirmation &amp; GPS Setup
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Verify clearances and Sticker Number, then activate GPS tracking.
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. STAT CARDS
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Card 1: Pending Confirmation */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                            <Clock size={16} strokeWidth={2.2} />
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            awaitingCount > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                                : 'bg-slate-100 text-slate-600 border-slate-200/70'
                        }`}>
                            {awaitingCount > 0 && <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />}
                            {awaitingCount > 0 ? 'Needs Review' : 'All Clear'}
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {awaitingCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">{pct(awaitingCount)}% of queue</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Pending Confirmation
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Status</span>
                        <span className={`font-semibold ${awaitingCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {awaitingCount > 0 ? 'Needs Review' : 'All Clear'}
                        </span>
                    </div>
                </div>

                {/* Card 2: GPS Tracker Devices */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/[0.14] to-indigo-500/[0.02] text-indigo-600">
                            <Cpu size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Installed
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {iotActiveCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">active units</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            GPS Tracker Devices
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Mode</span>
                        <span className="font-semibold text-indigo-700">Always On</span>
                    </div>
                </div>

                {/* Card 3: Driver Smartphone GPS */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <Smartphone size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Driver App
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {mobileActiveCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">app users</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Driver Smartphone GPS
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Mode</span>
                        <span className="font-semibold text-emerald-700">Driver App</span>
                    </div>
                </div>

                {/* Card 4: Confirmed Today */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#182B62]/[0.10] to-[#182B62]/[0.02] text-[#182B62]">
                            <CheckCircle2 size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Today
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {confirmedTodayCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">permits activated</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Confirmed Today
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Period</span>
                        <span className="font-semibold text-slate-700">Today</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. SEARCH DECK — no status filter: this queue only ever shows
                   Pending (awaiting_tmo_confirmation) applications.
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="relative">
                    <Search
                        size={16}
                        strokeWidth={2.2}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by driver, reference number, or plate…"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-tmo-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-tmo-primary/10"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        >
                            <X size={12} strokeWidth={2.5} />
                        </button>
                    )}
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
                        {isFiltering ? 'No results found' : 'No applications awaiting confirmation'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No applications match your search or filters.'
                            : 'Tricycles that completed inspection and payment will appear here for final GPS setup.'}
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
                    {/* ── DESKTOP & TABLET DATA TABLE ── */}
                    <div className={`hidden md:block overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Reference No.
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Owner
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Sticker Number
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
                                    {paginated.map(app => (
                                        <DesktopConfirmationRow
                                            key={app.id}
                                            app={app}
                                        />
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
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── MOBILE PURPOSE-BUILT CARDS ── */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map(app => (
                            <MobileConfirmationCard
                                key={app.id}
                                app={app}
                            />
                        ))}

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
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

function DesktopConfirmationRow({ app }) {
    const isAwaiting = app.raw_status === 'awaiting_tmo_confirmation';
    const initials = getInitials(app.operator_name);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Reference Number */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                        {app.application_type || 'Franchise'} Unit
                    </span>
                </div>
            </td>

            {/* Column 2: Tricycle Owner */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                            {app.operator_name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                            <Phone size={10} className="text-slate-400" />
                            {app.contact_number || 'No contact'}
                        </p>
                    </div>
                </div>
            </td>

            {/* Column 3: Tricycle Unit */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <Bike size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
                        <span className="truncate text-xs sm:text-[13px] font-semibold text-slate-800">
                            {app.make_model}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Plate: <strong className="text-slate-700 font-semibold">{app.plate_number}</strong></span>
                    </div>
                </div>
            </td>

            {/* Column 4: Sticker Number */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        #{app.coding_number}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: app.color_hex || '#3B82F6' }}
                        />
                        {app.color_scheme} Scheme
                    </span>
                </div>
            </td>

            {/* Column 5: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill status={app.raw_status} />
            </td>

            {/* Column 6: Action */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={route('tmo.final-confirmation.show', app.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#182B62] hover:bg-[#25449B] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{isAwaiting ? 'Confirm' : 'View'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobileConfirmationCard({ app }) {
    const isAwaiting = app.raw_status === 'awaiting_tmo_confirmation';
    const initials = getInitials(app.operator_name);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            {/* Top Row: Reference & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                    {app.reference}
                </span>
                <StatusPill status={app.raw_status} />
            </div>

            {/* Tricycle Owner */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{app.operator_name}</p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {app.plate_number}
                </span>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <Bike size={12} className="text-slate-400" />
                <span className="truncate font-medium">{app.make_model}</span>
            </div>

            {/* Sticker Number Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <span className="font-mono font-bold text-slate-800">
                    Sticker #{app.coding_number}
                </span>
                <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                    <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: app.color_hex || '#3B82F6' }}
                    />
                    {app.color_scheme} Scheme
                </span>
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={route('tmo.final-confirmation.show', app.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#182B62] hover:bg-[#25449B] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{isAwaiting ? 'Confirm' : 'View'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
