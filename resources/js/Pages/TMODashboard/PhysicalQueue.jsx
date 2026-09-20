import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Clock, ChevronRight, ChevronLeft, Inbox, Bike,
    Search, X, RotateCcw, CheckCircle2, ShieldCheck,
    AlertTriangle, Printer, Gauge, Phone,
} from 'lucide-react';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Re-inspection', label: 'Needs Re-inspection' },
];

const ITEMS_PER_PAGE = 10;

function bucketOf(app) {
    if (app.status === 'Re-inspection' || app.raw_status === 'failed_inspection') return 'Re-inspection';
    return 'Scheduled';
}

function getInitials(name) {
    if (!name || name === 'N/A') return 'TD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusPill({ status }) {
    if (status === 'Re-inspection') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 shadow-2xs">
                Needs Re-inspection
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs">
            Scheduled
        </span>
    );
}

export default function PhysicalQueue({
    applications = [],
    todaZones = [],
    scheduledCount = 0,
    reinspectionCount = 0,
    passedTodayCount = 0,
    completedTodayCount = 0,
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [todaFilter, setTodaFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh — a document-review approval elsewhere feeds new units into this
    // queue without a manual reload.
    useEffect(() => {
        const { stop } = router.poll(15000, {
            only: ['applications', 'scheduledCount', 'reinspectionCount', 'passedTodayCount', 'completedTodayCount'],
        });
        return () => stop();
    }, []);

    // Official TODA list from database paired with current queue counts
    const todaOptions = useMemo(() => {
        const countMap = {};
        applications.forEach(a => {
            const t = a.toda || 'Unassigned';
            countMap[t] = (countMap[t] || 0) + 1;
        });

        const dbNames = (todaZones && todaZones.length > 0)
            ? todaZones.map(z => z.name)
            : ['TODA Brgy. 10', 'TODA Brgy. 4', 'TODA Brgy. 8', 'TODA Bucana'];

        const list = dbNames.map(name => ({
            name,
            count: countMap[name] || 0,
        }));

        Object.keys(countMap).forEach(name => {
            if (!dbNames.includes(name)) {
                list.push({
                    name,
                    count: countMap[name],
                });
            }
        });

        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [applications, todaZones]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter(a => {
            const bucket = bucketOf(a);
            const matchesQuery = !q ||
                String(a.id).toLowerCase().includes(q) ||
                (a.reference && a.reference.toLowerCase().includes(q)) ||
                (a.operator && a.operator.toLowerCase().includes(q)) ||
                (a.plate && a.plate.toLowerCase().includes(q)) ||
                (a.make && a.make.toLowerCase().includes(q)) ||
                (a.toda && a.toda.toLowerCase().includes(q));

            const matchesStatus = statusFilter === 'all' || bucket === statusFilter;
            const matchesToda = todaFilter === 'all' || a.toda === todaFilter;
            return matchesQuery && matchesStatus && matchesToda;
        });
    }, [applications, query, statusFilter, todaFilter]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || todaFilter !== 'all';

    const handleClearAll = () => {
        setQuery('');
        setStatusFilter('all');
        setTodaFilter('all');
        setCurrentPage(1);
    };

    const queueTotal = scheduledCount + reinspectionCount;
    const pct = (n) => queueTotal > 0 ? Math.round((n / queueTotal) * 100) : 0;

    return (
        <TrivoraLayout title="Physical Inspection" role="TMO Officer">
            <Head title="Physical Inspection | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Plain typography, zero redundant badges)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Physical Inspection
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        On-site vehicle roadworthiness testing, physical verification, and payment ticket issuance
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PREMIUM KPI CARD DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Card 1: Scheduled for Inspection */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                            <Clock size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/70">
                            <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {scheduledCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">{pct(scheduledCount)}% of queue</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Scheduled for Inspection
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Status</span>
                        <span className="font-semibold text-amber-700">Awaiting Inspection</span>
                    </div>
                </div>

                {/* Card 2: Needs Re-inspection */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                            <AlertTriangle size={16} strokeWidth={2.2} />
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            reinspectionCount > 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                                : 'bg-slate-100 text-slate-600 border-slate-200/70'
                        }`}>
                            {reinspectionCount > 0 ? 'Action Needed' : 'All Clear'}
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {reinspectionCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">{pct(reinspectionCount)}% re-inspection</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Needs Re-inspection
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Defects to repair</span>
                        <span className={`font-semibold ${reinspectionCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                            {reinspectionCount > 0 ? 'Awaiting Repair' : '0 Pending'}
                        </span>
                    </div>
                </div>

                {/* Card 3: Passed Today */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <CheckCircle2 size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                            Endorsed
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {passedTodayCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">Endorsed to BPLO</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Passed Today
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Payment tickets issued</span>
                        <span className="font-semibold text-emerald-700">To Cashier</span>
                    </div>
                </div>

                {/* Card 4: Inspected Today */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <ShieldCheck size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Today
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {completedTodayCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">On-site tests completed</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Inspected Today
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Field inspector output</span>
                        <span className="font-semibold text-slate-700">Active</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. SEARCH & FILTER DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search
                            size={16}
                            strokeWidth={2.2}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by driver, reference number, plate, or TODA…"
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

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="h-10 w-full sm:w-44 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {/* TODA Zone Filter */}
                        <select
                            value={todaFilter}
                            onChange={e => setTodaFilter(e.target.value)}
                            className="h-10 w-full sm:w-48 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer truncate"
                        >
                            <option value="all">All TODAs ({applications.length})</option>
                            {todaOptions.map(opt => (
                                <option key={opt.name} value={opt.name}>
                                    {opt.name} ({opt.count})
                                </option>
                            ))}
                        </select>
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
                        {isFiltering ? 'No results found' : 'No inspections waiting'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No units match your search or filters.'
                            : 'No tricycles are scheduled for inspection right now.'}
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
                                            Tricycle Driver
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Schedule
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
                                        <DesktopPhysicalRow key={app.id} app={app} />
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

                    {/* ── MOBILE PURPOSE-BUILT CARDS ── */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map(app => (
                            <MobilePhysicalCard key={app.id} app={app} />
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

            {/* ══════════════════════════════════════════════════════════════
                5. TMO FIELD PROTOCOL BANNER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mt-6 flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs">
                    <Gauge size={18} strokeWidth={2} />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-800">TMO Field Testing Protocol</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        Conduct on-site testing only when the tricycle driver and unit are physically present at the inspection bay.
                        Verify brake responsiveness, light functionality, horn loudness, mirror completeness, and frame integrity.
                    </p>
                </div>
            </div>
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

function DesktopPhysicalRow({ app }) {
    const bucket = bucketOf(app);
    const isPassed = bucket === 'Passed';
    const initials = getInitials(app.operator);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Reference Number */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                        Franchise Unit
                    </span>
                </div>
            </td>

            {/* Column 2: Tricycle Driver */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                            {app.operator}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                            <Phone size={10} className="text-slate-400" />
                            {app.contact || 'No contact'}
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
                            {app.make}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Plate: <strong className="text-slate-700 font-semibold">{app.plate}</strong></span>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{app.toda}</span>
                    </div>
                </div>
            </td>

            {/* Column 4: Schedule */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">
                        {app.scheduled_date}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={10} strokeWidth={2.2} />
                        {app.time_slot}
                    </span>
                </div>
            </td>

            {/* Column 5: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill status={bucket} />
            </td>

            {/* Column 6: Action */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={`/tmo/review/physical/${app.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{bucket === 'Re-inspection' ? 'Re-inspect' : 'Start Inspection'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobilePhysicalCard({ app }) {
    const bucket = bucketOf(app);
    const isPassed = bucket === 'Passed';
    const initials = getInitials(app.operator);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 transition-all hover:border-slate-300 ${CARD_SHADOW}`}>
            {/* Top Row: Reference & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                    {app.reference}
                </span>
                <StatusPill status={bucket} />
            </div>

            {/* Driver & TODA */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{app.operator}</p>
                        <p className="truncate text-[11px] text-slate-400">{app.toda}</p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {app.plate}
                </span>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <Bike size={12} className="text-slate-400" />
                <span className="truncate font-medium">{app.make}</span>
            </div>

            {/* Schedule Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <span className="text-[11px] font-medium text-slate-500">{app.scheduled_date}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {app.time_slot}
                </span>
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={`/tmo/review/physical/${app.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{bucket === 'Re-inspection' ? 'Re-inspect' : 'Start Inspection'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
