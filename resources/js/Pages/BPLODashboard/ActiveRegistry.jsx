import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    Search, Award, Bike, Hash, Filter,
    CheckCircle2, Inbox, X, Calendar,
    ShieldAlert, Download, RotateCcw, ChevronLeft, ChevronRight,
    MapPin, Phone
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// Shared soft, layered shadow token — matches the elevation language used across the TMO panel
// pages so every dashboard in the product reads as one consistent system.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function ActiveRegistry({
    registryList = [],
    activeCount = 0,
    revokedCount = 0
}) {
    const [query, setQuery] = useState('');
    const [todaFilter, setTodaFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);

    // Silent background refresh — a Final Confirmation activation elsewhere adds new units to this
    // registry without a manual reload.
    useEffect(() => {
        const { stop } = router.poll(15000, { only: ['registryList', 'activeCount', 'revokedCount'] });
        return () => stop();
    }, []);

    // Extract unique TODAs for the filter dropdown
    const availableTodas = useMemo(() => {
        const set = new Set();
        registryList.forEach(item => {
            if (item.toda) set.add(item.toda);
        });
        return Array.from(set).sort();
    }, [registryList]);

    // Filtered list
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return registryList.filter((unit) => {
            const opStr = unit.operator ? String(unit.operator).toLowerCase() : '';
            const plateStr = unit.plate_no ? String(unit.plate_no).toLowerCase() : '';
            const bodyStr = unit.body_no ? String(unit.body_no).toLowerCase() : '';
            const todaStr = unit.toda ? String(unit.toda).toLowerCase() : '';

            const matchesQuery = !q || opStr.includes(q) || plateStr.includes(q) || bodyStr.includes(q) || todaStr.includes(q);
            const matchesToda = todaFilter === 'all' || unit.toda === todaFilter;
            const matchesStatus = statusFilter === 'all' || (unit.status && unit.status.toLowerCase() === statusFilter.toLowerCase());

            return matchesQuery && matchesToda && matchesStatus;
        });
    }, [registryList, query, todaFilter, statusFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || todaFilter !== 'all' || statusFilter !== 'all';

    const handleClearAll = () => {
        setQuery('');
        setTodaFilter('all');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            setIsExporting(false);
            // Create a simple CSV client-side download
            try {
                const headers = ['Coding Scheme No', 'Plate No', 'Operator', 'Make', 'TODA', 'Issue Date', 'Status'];
                const rows = filtered.map(u => [
                    `"${u.body_no || ''}"`,
                    `"${u.plate_no || ''}"`,
                    `"${u.operator || ''}"`,
                    `"${u.make || ''}"`,
                    `"${u.toda || ''}"`,
                    `"${u.issue_date || ''}"`,
                    `"${u.status || ''}"`
                ]);
                const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `bplo_active_registry_${new Date().toISOString().slice(0,10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error('Export error:', err);
            }
        }, 600);
    };

    const totalCount = registryList.length;
    const pct = (n) => totalCount > 0 ? Math.round((n / totalCount) * 100) : 0;

    return (
        <BPLOLayout title="Active Registry" role="BPLO Officer">
            <Head title="Active Registry | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with TMO Standard)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        BPLO Active Registry
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Masterlist and official vehicle records of approved Municipal Tricycle Operator's Permits (MTOP)
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting || filtered.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        <Download size={14} strokeWidth={2.2} className="text-slate-500" />
                        {isExporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PREMIUM KPI CARD DECK (TMO Operations style)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Card 1: Total Issued Units */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Total Issued Units
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Hash size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                {totalCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                100% of Fleet
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Official registry size
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Registry:</span>
                        <span className="text-xs font-bold text-[#1D2542]">Synced</span>
                    </div>
                </div>

                {/* Card 2: Active Franchises */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Active Franchises
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                <CheckCircle2 size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {activeCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {pct(activeCount)}% Operational
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            In good civic standing
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Status:</span>
                        <span className="text-xs font-bold text-emerald-700">Compliant</span>
                    </div>
                </div>

                {/* Card 3: Revoked / Suspended */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Revoked / Suspended
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                                <ShieldAlert size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {revokedCount}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {pct(revokedCount)}% of Fleet
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Non-compliant permits
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Flagged:</span>
                        <span className={`text-xs font-bold ${revokedCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                            {revokedCount > 0 ? `${revokedCount} Units` : '0 Pending'}
                        </span>
                    </div>
                </div>

                {/* Card 4: TODA Coverage */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                TODA Coverage
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <MapPin size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {availableTodas.length}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Associations
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Distinct TODA groups represented
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">District:</span>
                        <span className="text-xs font-bold text-slate-700">Nasugbu</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. FILTER & SEARCH DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Search bar */}
                    <div className="relative flex-1">
                        <Search
                            size={16}
                            strokeWidth={2.2}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search by Coding Scheme No, Plate No, Operator, or TODA..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setCurrentPage(1);
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-2">
                        {/* TODA Dropdown */}
                        <select
                            value={todaFilter}
                            onChange={(e) => {
                                setTodaFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10"
                        >
                            <option value="all">All Associations</option>
                            {availableTodas.map((toda) => (
                                <option key={toda} value={toda}>{toda}</option>
                            ))}
                        </select>

                        {/* Status Dropdown */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="revoked">Revoked Only</option>
                        </select>

                        {/* Reset button */}
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Reset all filters"
                            >
                                <RotateCcw size={13} />
                                <span className="hidden sm:inline">Reset</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter info banner */}
                {isFiltering && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium">
                            Showing <strong className="text-slate-800 font-bold">{filtered.length}</strong> matching unit{filtered.length === 1 ? '' : 's'}
                        </span>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. REGISTRY DATA DISPLAY (Desktop Table + Mobile Cards)
               ══════════════════════════════════════════════════════════════ */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Bike size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        No matching tricycles found
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No vehicles match your active search terms or association filters.'
                            : 'No finalized MTOP franchise records currently exist in the database.'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                            <RotateCcw size={12} strokeWidth={2.2} />
                            <span>Reset all filters</span>
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
                                            Coding Scheme &amp; Plate
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Operator &amp; Contact
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            TODA Association
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Issue Date
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Franchise Status
                                        </th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {paginated.map((unit, idx) => (
                                        <DesktopRegistryRow key={unit.plate_no || idx} unit={unit} />
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
                        {paginated.map((unit, idx) => (
                            <MobileRegistryCard key={unit.plate_no || idx} unit={unit} />
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

function StatusPill({ status }) {
    const isActive = status === 'active';
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs transition-colors ${
                isActive
                    ? 'border border-emerald-200/90 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-200/90 bg-rose-50 text-rose-700'
            }`}
        >
            {isActive ? 'Active' : 'Revoked'}
        </span>
    );
}

function DesktopRegistryRow({ unit }) {
    const initials = getInitials(unit.operator);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Body & Plate */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        No. {unit.body_no || 'N/A'}
                    </span>
                    <div className="mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                            PLT-{unit.plate_no}
                        </span>
                    </div>
                </div>
            </td>

            {/* Column 2: Operator & Contact */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                            {unit.operator || 'Unknown Operator'}
                        </p>
                        {unit.contact && unit.contact !== 'N/A' ? (
                            <a
                                href={`tel:${unit.contact}`}
                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                            >
                                <Phone size={10} strokeWidth={2.2} className="text-slate-400" />
                                {unit.contact}
                            </a>
                        ) : (
                            <span className="text-[11px] text-slate-400">Franchise Holder</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Column 3: Tricycle Unit */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-1.5">
                    <Bike size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
                    <span className="truncate text-xs sm:text-[13px] font-semibold text-slate-800">
                        {unit.make || 'Tricycle Unit'}
                    </span>
                </div>
            </td>

            {/* Column 4: TODA Association */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span>{unit.toda || 'Unassigned TODA'}</span>
                </div>
            </td>

            {/* Column 5: Issue Date */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Calendar size={12} className="text-slate-400" />
                    <span>{unit.issue_date || 'N/A'}</span>
                </div>
            </td>

            {/* Column 6: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill status={unit.status} />
            </td>

            {/* Column 7: Action */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={`/bplo/registry/${unit.plate_no}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobileRegistryCard({ unit }) {
    const initials = getInitials(unit.operator);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            {/* Top Row: Body No, Plate & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                        No. {unit.body_no || 'N/A'}
                    </span>
                    <span className="font-mono text-[10.5px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                        PLT-{unit.plate_no}
                    </span>
                </div>
                <StatusPill status={unit.status} />
            </div>

            {/* Operator & TODA */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{unit.operator || 'Unknown Operator'}</p>
                        <p className="truncate text-[11px] text-slate-400">{unit.toda || 'Unassigned'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                    <Calendar size={11} className="text-slate-400" />
                    <span>{unit.issue_date || 'N/A'}</span>
                </div>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <Bike size={12} className="text-slate-400 shrink-0" />
                <span className="truncate font-medium">{unit.make || 'Tricycle Unit'}</span>
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={`/bplo/registry/${unit.plate_no}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}