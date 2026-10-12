import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import ExportDialog from '@/Components/ExportDialog';
import {
    Search, Award, Bike, Hash, Filter,
    CheckCircle2, Inbox, X, Calendar,
    ShieldAlert, Download, RotateCcw, ChevronLeft, ChevronRight,
    MapPin, Phone
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
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
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Silent background refresh — a Final Confirmation activation elsewhere adds new units to this
    // registry without a manual reload.
    useBackgroundRefresh(['registryList', 'activeCount', 'revokedCount']);

    // Filtered list
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return registryList.filter((unit) => {
            const opStr = unit.operator ? String(unit.operator).toLowerCase() : '';
            const plateStr = unit.plate_no ? String(unit.plate_no).toLowerCase() : '';
            const codingStr = unit.coding_scheme_number ? String(unit.coding_scheme_number).toLowerCase() : '';
            const franchiseStr = unit.sticker_no ? String(unit.sticker_no).toLowerCase() : '';

            const matchesQuery = !q || opStr.includes(q) || plateStr.includes(q) || codingStr.includes(q) || franchiseStr.includes(q);
            const matchesStatus = statusFilter === 'all' || (unit.status && unit.status.toLowerCase() === statusFilter.toLowerCase());

            return matchesQuery && matchesStatus;
        });
    }, [registryList, query, statusFilter]);

    // Pagination calculations
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

    // Server-side Excel/PDF export (BPLOController::exportActiveRegistryExcel, ?format=excel|pdf)
    // built from the same rows this list renders; the dialog handles format choice + download.
    const exportUrl = route('bplo.registry.export-excel');
    const [exportOpen, setExportOpen] = useState(false);

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
                        Active Registry
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Masterlist and official vehicle records of approved Municipal Tricycle Operator's Permits (MTOP)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setExportOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <Download size={15} strokeWidth={2.2} className="text-white" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                {/* Card 1: Total Issued Units */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Total Issued Units
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                <Hash size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                {totalCount}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                100% of Fleet
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Official registry size
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Registry:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0">
                            Synced
                        </span>
                    </div>
                </div>

                {/* Card 2: Active Franchises */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Active Franchises
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                <CheckCircle2 size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                {activeCount}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                {pct(activeCount)}% Operational
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            In good civic standing
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Status:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-emerald-700 shrink-0">
                            Compliant
                        </span>
                    </div>
                </div>

                {/* Card 3: Revoked / Suspended */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Revoked / Suspended
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                                <ShieldAlert size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                revokedCount > 0 ? 'text-rose-600' : 'text-slate-900'
                            }`}>
                                {revokedCount}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                {pct(revokedCount)}% of Fleet
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Non-compliant permits
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Flagged:</span>
                        <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold shrink-0 ${
                            revokedCount > 0 ? 'text-rose-700' : 'text-slate-600'
                        }`}>
                            {revokedCount > 0 ? `${revokedCount} Units` : '0 Pending'}
                        </span>
                    </div>
                </div>

                {/* Card 4: Jurisdiction Coverage */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Jurisdiction
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                <MapPin size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 leading-none">
                                Nasugbu
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                Municipal
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Unified franchise service area
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Coverage:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0">
                            All Barangays
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
                            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search by franchise no., sticker no., plate no., or operator…"
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

                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            aria-label="Filter registry by franchise status"
                            className="h-10 w-full sm:w-auto sm:min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="revoked">Revoked Only</option>
                        </select>
                    </div>
                </div>
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
                    <div className={`hidden md:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Franchise &amp; Sticker No.
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Operator &amp; Contact
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
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
            <ExportDialog
                show={exportOpen}
                onClose={() => setExportOpen(false)}
                title="Export Active Registry"
                recordLabel="registry units"
                recordCount={totalCount}
                scopeNote="Entire Active Registry"
                exportUrl={exportUrl}
                fallbackName="bplo_active_registry"
            />
        </BPLOLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

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

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Franchise & Sticker Number */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {unit.sticker_no || 'N/A'}
                    </span>
                    <span className="mt-0.5 font-mono text-[11px] font-semibold text-slate-500">
                        {unit.coding_scheme_number || 'N/A'}
                    </span>
                </div>
            </td>

            {/* Column 2: Operator & Contact */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={unit.operator} src={unit.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-bold text-white shadow-2xs" />
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
                            <span className="text-[11px] text-slate-400">No contact number</span>
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
                <div className="mt-0.5">
                    <span className="pl-[19px] font-mono text-[11px] font-semibold text-slate-500">
                        PLT-{unit.plate_no}
                    </span>
                </div>
            </td>

            {/* Column 4: Issue Date */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Calendar size={12} className="text-slate-400" />
                    <span>{unit.issue_date || 'N/A'}</span>
                </div>
                {unit.issue_time && (
                    <p className="mt-0.5 pl-[18px] text-[11px] text-slate-400">{unit.issue_time}</p>
                )}
            </td>

            {/* Column 5: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill status={unit.status} />
            </td>

            {/* Column 6: Action */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={`/bplo/registry/${unit.plate_no}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                >
                    <span>View</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobileRegistryCard({ unit }) {

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-all hover:border-slate-300 ${CARD_SHADOW}`}>
            {/* Top Row: Franchise & Sticker Number, Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex flex-col min-w-0">
                    <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                        {unit.sticker_no || 'N/A'}
                    </span>
                    <span className="font-mono text-[10.5px] font-semibold text-slate-500">
                        {unit.coding_scheme_number || 'N/A'}
                    </span>
                </div>
                <StatusPill status={unit.status} />
            </div>

            {/* Operator */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={unit.operator} src={unit.operator_photo} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-[10px] font-bold text-white shadow-2xs" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{unit.operator || 'Unknown Operator'}</p>
                        {unit.contact && unit.contact !== 'N/A' ? (
                            <a href={`tel:${unit.contact}`} className="inline-flex items-center gap-1 truncate text-[11px] text-slate-500 hover:text-slate-800">
                                <Phone size={10} strokeWidth={2.2} className="text-slate-400" />
                                {unit.contact}
                            </a>
                        ) : (
                            <p className="truncate text-[11px] text-slate-400">No contact number</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                    <Calendar size={11} className="text-slate-400" />
                    <span>{unit.issue_date || 'N/A'}{unit.issue_time ? ` · ${unit.issue_time}` : ''}</span>
                </div>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <Bike size={12} className="text-slate-400 shrink-0" />
                <span className="truncate font-medium">{unit.make || 'Tricycle Unit'}</span>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-500">
                    PLT-{unit.plate_no}
                </span>
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={`/bplo/registry/${unit.plate_no}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2 text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
