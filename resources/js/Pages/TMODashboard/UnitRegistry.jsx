import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Bike, Phone, Search, X, ChevronRight, ChevronLeft,
    MapPin, Calendar, RotateCcw, ShieldAlert, SlidersHorizontal
} from 'lucide-react';

const CODING_SCHEDULE = {
    Monday:    { color: 'Red',    hex: '#EF4444', digits: '1, 2',  bg: '#FEF2F2', border: '#FECACA' },
    Tuesday:   { color: 'Blue',   hex: '#3B82F6', digits: '3, 4',  bg: '#EFF6FF', border: '#BFDBFE' },
    Wednesday: { color: 'Yellow', hex: '#D97706', digits: '5, 6',  bg: '#FFFBEB', border: '#FDE68A' },
    Thursday:  { color: 'Green',  hex: '#10B981', digits: '7, 8',  bg: '#ECFDF5', border: '#A7F3D0' },
    Friday:    { color: 'White',  hex: '#64748B', digits: '9, 0',  bg: '#F8FAFC', border: '#E2E8F0' },
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// pages (Dashboard.jsx, Index.jsx) so this page reads as part of the same product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function TricycleRegistry({ initialUnits = [] }) {
    const units = initialUnits || [];

    // Silent background refresh — a newly activated/suspended tricycle from another session
    // should appear here without a manual reload. Search/filter/pagination state below is local
    // React state, untouched by this prop refresh.
    useEffect(() => {
        const { stop } = router.poll(15000, { only: ['initialUnits'] });
        return () => stop();
    }, []);


    // Filters state
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [todaFilter, setTodaFilter] = useState('all');
    const [codingFilter, setCodingFilter] = useState('all');
    const [onlyCodedToday, setOnlyCodedToday] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Contextual day calculation
    const todayName = useMemo(() => {
        const dayIdx = new Date().getDay();
        return WEEKDAY_NAMES[dayIdx] || 'Monday';
    }, []);

    const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';
    const todayCodingRule = !isWeekend ? CODING_SCHEDULE[todayName] : null;

    // Dynamic TODA list & counts
    const todaOptions = useMemo(() => {
        const map = {};
        units.forEach(u => {
            const t = u.toda || 'Unassigned';
            map[t] = (map[t] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    }, [units]);

    // Dynamic Coding Scheme options
    const codingOptions = useMemo(() => {
        return Object.entries(CODING_SCHEDULE).map(([day, meta]) => {
            const count = units.filter(u => u.coding_color === meta.color || (u.coding_day && u.coding_day.includes(day))).length;
            return {
                day,
                color: meta.color,
                hex: meta.hex,
                digits: meta.digits,
                count
            };
        });
    }, [units]);

    // Fast, immediate multi-dimensional filtering
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return units.filter(u => {
            const matchesQuery = !q || (
                (u.coding_scheme_number && String(u.coding_scheme_number).toLowerCase().includes(q)) ||
                (u.body_no && String(u.body_no).toLowerCase().includes(q)) ||
                (u.plate_no && String(u.plate_no).toLowerCase().includes(q)) ||
                (u.operator && String(u.operator).toLowerCase().includes(q)) ||
                (u.id && String(u.id).toLowerCase().includes(q)) ||
                (u.unit_code && String(u.unit_code).toLowerCase().includes(q)) ||
                (u.contact && String(u.contact).toLowerCase().includes(q)) ||
                (u.toda && String(u.toda).toLowerCase().includes(q)) ||
                (u.coding_day && String(u.coding_day).toLowerCase().includes(q)) ||
                (u.coding_color && String(u.coding_color).toLowerCase().includes(q))
            );

            const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
            const matchesToda = todaFilter === 'all' || u.toda === todaFilter;
            const matchesCoding = codingFilter === 'all' || (
                (u.coding_color && u.coding_color.toLowerCase() === codingFilter.toLowerCase()) ||
                (u.coding_day && u.coding_day.toLowerCase().includes(codingFilter.toLowerCase()))
            );
            const matchesCodedToday = !onlyCodedToday || (
                !isWeekend && u.coding_day && u.coding_day.toLowerCase().includes(todayName.toLowerCase())
            );

            return matchesQuery && matchesStatus && matchesToda && matchesCoding && matchesCodedToday;
        });
    }, [units, query, statusFilter, todaFilter, codingFilter, onlyCodedToday, isWeekend, todayName]);

    // KPI Metrics
    const totalCount = units.length;
    const activeCount = units.filter(u => u.status === 'active').length;
    const suspendedCount = units.filter(u => u.status === 'suspended').length;
    const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
    const suspendedPct = totalCount > 0 ? 100 - activePct : 0;

    // Units restricted under today's ordinance
    const codedTodayCount = useMemo(() => {
        if (isWeekend) return 0;
        return units.filter(u => u.coding_day && u.coding_day.toLowerCase().includes(todayName.toLowerCase())).length;
    }, [units, todayName, isWeekend]);

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || todaFilter !== 'all' || codingFilter !== 'all' || onlyCodedToday;

    const handleClearAll = () => {
        setQuery('');
        setStatusFilter('all');
        setTodaFilter('all');
        setCodingFilter('all');
        setOnlyCodedToday(false);
        setCurrentPage(1);
    };

    return (
        <TrivoraLayout title="Active Tricycle Registry" role="TMO Officer">
            <Head title="Active Tricycle Registry | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Without redundant label or tags)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Active Tricycle Registry
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Master record of all registered and operating tricycles in Nasugbu
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. COMPACT OPERATIONAL KPI DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-12">
                {/* ─ Primary Anchor: Fleet Volume & Operational Breakdown ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} md:col-span-12 xl:col-span-6`}>
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Bike size={20} strokeWidth={2.2} />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                        {totalCount}
                                    </span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Total Units
                                    </span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-500">
                                    Franchised Fleet
                                </p>
                            </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {activePct}% Road-Ready
                        </span>
                    </div>

                    {/* Proportional Segmented Meter */}
                    <div className="pt-3">
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 ring-1 ring-slate-200/60">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${activePct}%` }}
                            />
                            <div
                                className="h-full rounded-full bg-amber-500 transition-all duration-500 ml-0.5"
                                style={{ width: `${suspendedPct}%` }}
                            />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-bold text-slate-900 tabular-nums">{activeCount}</span>
                                <span className="text-slate-600">Active</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                <span className="font-bold text-slate-900 tabular-nums">{suspendedCount}</span>
                                <span className="text-slate-600">Suspended</span>
                            </div>

                            <span className="text-[11px] text-slate-400 font-medium">
                                Compliance: <strong className="text-slate-700">{activePct}%</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─ Secondary Metric: Today's Color Coding Compliance ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} md:col-span-6 xl:col-span-3`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Ordinance Enforcement
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Calendar size={14} />
                            </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-base sm:text-lg font-extrabold text-slate-900">{todayName}</span>
                            {!isWeekend && todayCodingRule && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-slate-800"
                                    style={{ backgroundColor: todayCodingRule.bg, borderColor: todayCodingRule.border, borderWidth: 1 }}
                                >
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: todayCodingRule.hex }} />
                                    {todayCodingRule.color}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {!isWeekend && todayCodingRule ? (
                                <>Restricted digits: <strong className="text-slate-800">{todayCodingRule.digits}</strong></>
                            ) : (
                                <>Weekend rule: All schemes operating</>
                            )}
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Restricted Today:</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                            {codedTodayCount} units
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({totalCount > 0 ? Math.round((codedTodayCount / totalCount) * 100) : 0}%)
                            </span>
                        </span>
                    </div>
                </div>

                {/* ─ Tertiary Metric: Route & TODA Coverage ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} md:col-span-6 xl:col-span-3`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Franchise Zones
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <MapPin size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {todaOptions.length}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Active TODAs
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Franchise zones registered
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">LGU District:</span>
                        <span className="text-xs font-bold text-slate-800">Nasugbu Central</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. SAAS MULTI-DIMENSIONAL COMMAND & FILTER DECK
                   (Not basic: Search + Status + TODA + Color + Coded Today)
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                    {/* Primary Search Input */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search
                            size={16}
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
                            placeholder="Search by plate number, body #, operator, or TODA…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-tmo-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-tmo-primary/10"
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

                    {/* Filter Controls Row / Grid */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                        {/* Fleet / Status Filter */}
                        <div className="col-span-1">
                            <select
                                value={statusFilter}
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-10 w-full sm:w-40 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer"
                            >
                                <option value="all">All Fleet — {totalCount}</option>
                                <option value="active">Active — {activeCount}</option>
                                <option value="suspended">Suspended — {suspendedCount}</option>
                            </select>
                        </div>

                        {/* TODA Zone Filter */}
                        <div className="col-span-1">
                            <select
                                value={todaFilter}
                                onChange={e => {
                                    setTodaFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-10 w-full sm:w-44 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer truncate"
                            >
                                <option value="all">All TODAs ({units.length})</option>
                                {todaOptions.map(([toda, cnt]) => (
                                    <option key={toda} value={toda}>{toda} ({cnt})</option>
                                ))}
                            </select>
                        </div>

                        {/* Color Coding Scheme Filter */}
                        <div className="col-span-1">
                            <select
                                value={codingFilter}
                                onChange={e => {
                                    setCodingFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-10 w-full sm:w-40 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer truncate"
                            >
                                <option value="all">All Schemes ({units.length})</option>
                                {codingOptions.map(opt => (
                                    <option key={opt.day} value={opt.color}>
                                        {opt.color} — {opt.day.slice(0, 3)} ({opt.count})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quick Enforcement Filter: Coded Today */}
                        <div className="col-span-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setOnlyCodedToday(prev => !prev);
                                    setCurrentPage(1);
                                }}
                                className={`inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                                    onlyCodedToday
                                        ? 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 font-bold'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <ShieldAlert size={14} className={onlyCodedToday ? 'text-rose-600' : 'text-slate-400'} />
                                <span>Coded Today</span>
                                <span className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold ${
                                    onlyCodedToday ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {codedTodayCount}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY: TABLE WITH INTEGRATED FOOTER PAGINATION
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
                        No tricycle records match your selected filter criteria. Try adjusting or clearing filters.
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
                    {/* ── DESKTOP & TABLET DATA TABLE WITH INTEGRATED FOOTER (md: 768px and up) ── */}
                    <div className={`hidden md:block overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Operator &amp; Contact
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            TODA Route
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Color Coding Scheme
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
                                    {paginated.map(unit => (
                                        <DesktopTableRow
                                            key={unit.id}
                                            unit={unit}
                                            todayName={todayName}
                                            isWeekend={isWeekend}
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

                    {/* ── MOBILE PURPOSE-BUILT CARDS (< md: 768px) ── */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map(unit => (
                            <MobileUnitCard
                                key={unit.id}
                                unit={unit}
                                todayName={todayName}
                                isWeekend={isWeekend}
                            />
                        ))}

                        {/* Mobile Pagination Connected at Bottom of List */}
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
                    : 'border border-amber-200/90 bg-amber-50 text-amber-800'
            }`}
        >
            {isActive ? 'Active' : 'Suspended'}
        </span>
    );
}

function DesktopTableRow({ unit, todayName, isWeekend }) {
    const unitCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;
    const bodyNumber = unit.coding_scheme_number || unit.body_no || unit.sticker_no;
    const isCodedToday = !isWeekend && unit.coding_day && unit.coding_day.toLowerCase().includes(todayName.toLowerCase());
    const initials = getInitials(unit.operator);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Tricycle Unit Plate & ID */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {unit.plate_no}
                    </span>
                    <span className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {unitCode}
                    </span>
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
                            {unit.operator}
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
                            <span className="text-[11px] text-slate-400">No contact</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Column 3: TODA Franchise Route (Clean typography, no box) */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-1.5 text-xs">
                    <MapPin size={12} className={unit.toda === 'Unassigned' ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
                    <span className={unit.toda === 'Unassigned' ? 'text-amber-700 font-medium' : 'text-slate-700 font-medium'}>
                        {unit.toda}
                    </span>
                </div>
            </td>

            {/* Column 4: Color Coding Scheme & Number */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-[13px] font-bold text-slate-900">
                            #{bodyNumber}
                        </span>
                        <span className="text-slate-300 text-xs">·</span>
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-800">
                            <span
                                className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: unit.coding_hex || '#64748B' }}
                            />
                            <span className="font-semibold text-slate-900">{unit.coding_color}</span>
                        </div>

                        {isCodedToday && (
                            <span className="inline-flex items-center rounded bg-rose-50 border border-rose-200/80 px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                Coded
                            </span>
                        )}
                    </div>

                    {/* Restricted Day label directly under #0142 · Red */}
                    <span className="mt-0.5 text-[11px] text-slate-400">
                        Restricted: <span className="font-medium text-slate-600">{unit.coding_day}</span>
                    </span>
                </div>
            </td>

            {/* Column 5: Compliance Status (Badge like before) */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill status={unit.status} />
            </td>

            {/* Column 6: Actions (Styled button in #1D2542 with rounded-full pill radius) */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={route('tricycle.details', unit.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>Profile</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobileUnitCard({ unit, todayName, isWeekend }) {
    const unitCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;
    const bodyNumber = unit.coding_scheme_number || unit.body_no || unit.sticker_no;
    const isCodedToday = !isWeekend && unit.coding_day && unit.coding_day.toLowerCase().includes(todayName.toLowerCase());
    const initials = getInitials(unit.operator);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            {/* Top Row: Vehicle Plate & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                        {unit.plate_no}
                    </span>
                    <span className="font-mono text-xs text-slate-400">({unitCode})</span>
                </div>

                <StatusPill status={unit.status} />
            </div>

            {/* Operator Information */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <p className="truncate text-xs font-semibold text-slate-900">{unit.operator}</p>
                </div>

                {unit.contact && unit.contact !== 'N/A' && (
                    <a
                        href={`tel:${unit.contact}`}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                    >
                        <Phone size={10} strokeWidth={2.2} className="text-slate-400" />
                        <span>{unit.contact}</span>
                    </a>
                )}
            </div>

            {/* Route & Color Coding Metadata */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <div className="flex items-center gap-1 text-[11px] truncate">
                    <MapPin size={11} className={unit.toda === 'Unassigned' ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
                    <span className={`truncate ${unit.toda === 'Unassigned' ? 'text-amber-700 font-medium' : 'text-slate-600 font-medium'}`}>
                        {unit.toda}
                    </span>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono font-bold text-slate-900">#{bodyNumber}</span>
                        <span className="text-slate-300">·</span>
                        <span
                            className="h-2 w-2 rounded-full shrink-0 ring-1 ring-black/10"
                            style={{ backgroundColor: unit.coding_hex || '#64748B' }}
                        />
                        <span className="font-semibold text-slate-900">{unit.coding_color}</span>
                        {isCodedToday && (
                            <span className="rounded bg-rose-50 border border-rose-200/80 px-1 py-0.2 text-[9px] font-bold uppercase text-rose-700">
                                Coded
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                        Restricted: <span className="font-medium text-slate-600">{unit.coding_day}</span>
                    </span>
                </div>
            </div>

            {/* Action Button: #1D2542 with rounded-full radius */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={route('tricycle.details', unit.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>View Profile</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
