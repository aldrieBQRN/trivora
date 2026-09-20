import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, Receipt, ChevronRight, ChevronLeft,
    Clock, AlertTriangle, CheckCircle2, TrendingUp,
    Inbox, X, RotateCcw,
    Phone, Bike, MapPin
} from 'lucide-react';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Waiting for Verification' },
    { value: 'issue', label: 'Payment Issues Flagged' },
];

const ITEMS_PER_PAGE = 10;

export default function PaymentQueue({
    applications = [],
    awaitingCount = 0,
    issueCount = 0,
    verifiedTodayCount = 0,
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh — a physical-inspection pass elsewhere feeds new units into this
    // queue without a manual reload.
    useEffect(() => {
        const { stop } = router.poll(15000, {
            only: ['applications', 'awaitingCount', 'issueCount', 'verifiedTodayCount'],
        });
        return () => stop();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter((app) => {
            const matchesQuery = !q ||
                (app.reference && app.reference.toLowerCase().includes(q)) ||
                (app.ticket_number && app.ticket_number.toLowerCase().includes(q)) ||
                (app.operator && app.operator.toLowerCase().includes(q)) ||
                (app.plate && app.plate.toLowerCase().includes(q)) ||
                (app.toda && app.toda.toLowerCase().includes(q));

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'pending' && app.raw_status === 'pending_payment') ||
                (statusFilter === 'issue' && app.raw_status === 'payment_issue');

            return matchesQuery && matchesStatus;
        });
    }, [applications, query, statusFilter]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all';

    const handleClearAll = () => {
        setQuery('');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const cycleTotal = awaitingCount + issueCount + verifiedTodayCount;
    const pct = (n) => cycleTotal > 0 ? Math.round((n / cycleTotal) * 100) : 0;

    return (
        <TrivoraLayout title="Payment Verification" role="TMO Officer">
            <Head title="Payment Verification Queue | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with TMO Queue Layout)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Payment Verification
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Inspect the physical Official Receipt (OR) &amp; Municipal Payment Ticket the driver brings back from the Municipal Treasurer's Office
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PREMIUM KPI CARD DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Card 1: Waiting for Verification */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                            <Clock size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/70">
                            <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                            Needs Review
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {awaitingCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">{pct(awaitingCount)}% of total</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Waiting for Verification
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Status</span>
                        <span className="font-semibold text-amber-700">Awaiting Physical OR</span>
                    </div>
                </div>

                {/* Card 2: Payment Issues Flagged */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                            <AlertTriangle size={16} strokeWidth={2.2} />
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            issueCount > 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                                : 'bg-slate-100 text-slate-600 border-slate-200/70'
                        }`}>
                            {issueCount > 0 ? 'Action Needed' : 'All Clear'}
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {issueCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">{pct(issueCount)}% flagged</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Payment Issues Flagged
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Discrepancy or Unpaid</span>
                        <span className={`font-semibold ${issueCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                            {issueCount > 0 ? 'Needs Review' : '0 Pending'}
                        </span>
                    </div>
                </div>

                {/* Card 3: Verified Today */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <CheckCircle2 size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Today
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {verifiedTodayCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">Advanced to Release</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Verified Today
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Completed Today</span>
                        <span className="font-semibold text-emerald-700">Active Session</span>
                    </div>
                </div>

                {/* Card 4: Verification Progress */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <TrendingUp size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Cycle
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {cycleTotal > 0 ? Math.round((verifiedTodayCount / cycleTotal) * 100) : 100}%
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Verification Progress
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Today's progress</span>
                        <span className="font-semibold text-slate-700">{verifiedTodayCount} of {cycleTotal} done</span>
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
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by ticket no, reference, operator, or plate…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10"
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

                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 cursor-pointer"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                        {isFiltering ? 'No matching applications' : 'Payment Queue is Empty'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No payment verification records match your search or filters.'
                            : 'Applications that passed Physical Inspection and are awaiting Municipal Treasurer payment will appear here.'}
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
                                            Ticket / Reference
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Applicant
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            TODA Zone
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Amount Payable
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
                                    {paginated.map((app) => (
                                        <DesktopPaymentRow key={app.id} app={app} />
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
                                <span className="tabular-nums font-semibold text-slate-700">{filtered.length}</span> applications
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
                            <MobilePaymentCard key={app.id} app={app} />
                        ))}

                        {/* Mobile Pagination Bar */}
                        <div className={`mt-1 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-500">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-400">({filtered.length} applications)</span>
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

function getInitials(name) {
    if (!name || name === 'N/A') return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusPill({ status }) {
    if (status === 'payment_issue') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                Issue Flagged
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
            Awaiting OR
        </span>
    );
}

function DesktopPaymentRow({ app }) {
    const initials = getInitials(app.operator);
    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Ticket / Reference */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.ticket_number}
                    </span>
                    <span className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {app.reference}
                    </span>
                </div>
            </td>

            {/* Column 2: Applicant */}
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
                            {app.make || 'Tricycle Unit'}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                            {app.plate || 'No Plate'}
                        </span>
                    </div>
                </div>
            </td>

            {/* Column 4: TODA Zone */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span>{app.toda}</span>
                </div>
            </td>

            {/* Column 5: Amount Payable */}
            <td className="py-3.5 px-4 align-middle">
                <span className="inline-flex items-center font-mono font-bold text-xs sm:text-[13px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    ₱{Number(app.amount_due || 0).toFixed(2)}
                </span>
            </td>

            {/* Column 6: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill status={app.raw_status} />
            </td>

            {/* Column 7: Action */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={`/tmo/verify-payment/${app.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <Receipt size={12} />
                    <span>Verify Receipt</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobilePaymentCard({ app }) {
    const initials = getInitials(app.operator);
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 transition-all hover:border-slate-300 ${CARD_SHADOW}`}>
            {/* Top Row: Ticket & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                    <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                        {app.ticket_number}
                    </span>
                    <span className="block font-mono text-[11px] text-slate-400">
                        {app.reference}
                    </span>
                </div>
                <StatusPill status={app.raw_status} />
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

                <span className="inline-flex items-center font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 shrink-0">
                    ₱{Number(app.amount_due || 0).toFixed(2)}
                </span>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5 truncate">
                    <Bike size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{app.make || 'Tricycle Unit'}</span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                    {app.plate || 'No Plate'}
                </span>
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={`/tmo/verify-payment/${app.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <Receipt size={12} />
                    <span>Verify Receipt</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
