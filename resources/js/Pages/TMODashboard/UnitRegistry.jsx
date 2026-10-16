import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import ExportDialog from '@/Components/ExportDialog';
import {
    Bike, Phone, Search, X, ChevronRight, ChevronLeft,
    Calendar, RotateCcw, ShieldAlert, ShieldCheck,
    Download
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Layered soft shadow matching Live Fleet Monitoring and Dashboard
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

export default function TricycleRegistry({ initialUnits = [], activeCodingSchemes = [] }) {
    const units = initialUnits || [];

    // Silent background refresh
    useBackgroundRefresh(['initialUnits']);

    // Filters state
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [codingFilter, setCodingFilter] = useState('all');
    const [onlyCodedToday, setOnlyCodedToday] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [exportOpen, setExportOpen] = useState(false);
    const itemsPerPage = 10;

    // Contextual day calculation
    const todayName = useMemo(() => {
        const dayIdx = new Date().getDay();
        return WEEKDAY_NAMES[dayIdx] || 'Monday';
    }, []);

    const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';

    // Authoritative coding rule for today from database schemes
    const todayCodingRule = useMemo(() => {
        if (isWeekend) return null;
        const scheme = (activeCodingSchemes || []).find((s) =>
            Array.isArray(s.restricted_days) && s.restricted_days.includes(todayName)
        );
        if (!scheme || !scheme.restricted_digits || scheme.restricted_digits.length === 0) {
            return null;
        }
        return {
            color: scheme.name,
            hex: scheme.color_hex,
            digits: scheme.restricted_digits.join(', '),
            bg: `${scheme.color_hex}15`,
            border: `${scheme.color_hex}40`,
        };
    }, [activeCodingSchemes, todayName, isWeekend]);

    // Dynamic Coding Scheme options from database
    const codingOptions = useMemo(() => {
        return (activeCodingSchemes || [])
            .filter((s) => Array.isArray(s.restricted_days) && s.restricted_days.length > 0 && s.restricted_digits?.length > 0)
            .map((s) => {
                const day = s.restricted_days[0];
                const count = units.filter((u) => u.coding_color === s.name || (u.coding_day && u.coding_day.includes(day))).length;
                return {
                    day,
                    color: s.name,
                    hex: s.color_hex,
                    digits: s.restricted_digits.join(', '),
                    count,
                };
            });
    }, [activeCodingSchemes, units]);

    // Multi-dimensional filtering
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return units.filter(u => {
            const matchesQuery = !q || (
                (u.coding_scheme_number && String(u.coding_scheme_number).toLowerCase().includes(q)) ||
                (u.plate_no && String(u.plate_no).toLowerCase().includes(q)) ||
                (u.operator && String(u.operator).toLowerCase().includes(q)) ||
                (u.id && String(u.id).toLowerCase().includes(q)) ||
                (u.unit_code && String(u.unit_code).toLowerCase().includes(q)) ||
                (u.franchise_number && String(u.franchise_number).toLowerCase().includes(q)) ||
                (u.validity_term && String(u.validity_term).toLowerCase().includes(q)) ||
                (u.contact && String(u.contact).toLowerCase().includes(q)) ||
                (u.coding_day && String(u.coding_day).toLowerCase().includes(q)) ||
                (u.coding_color && String(u.coding_color).toLowerCase().includes(q))
            );

            const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
            const matchesCoding = codingFilter === 'all' || (
                (u.coding_color && u.coding_color.toLowerCase() === codingFilter.toLowerCase()) ||
                (u.coding_day && u.coding_day.toLowerCase().includes(codingFilter.toLowerCase()))
            );
            const matchesCodedToday = !onlyCodedToday || (
                !isWeekend && u.coding_day && u.coding_day.toLowerCase().includes(todayName.toLowerCase())
            );

            return matchesQuery && matchesStatus && matchesCoding && matchesCodedToday;
        });
    }, [units, query, statusFilter, codingFilter, onlyCodedToday, isWeekend, todayName]);

    // KPI Metrics
    const totalCount = units.length;
    const activeCount = units.filter(u => u.status === 'active').length;
    const suspendedCount = units.filter(u => u.status === 'suspended').length;
    const revokedCount = units.filter(u => u.status === 'revoked').length;
    const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

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

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || codingFilter !== 'all' || onlyCodedToday;

    const handleClearAll = () => {
        setQuery('');
        setStatusFilter('all');
        setCodingFilter('all');
        setOnlyCodedToday(false);
        setCurrentPage(1);
    };

    return (
        <TrivoraLayout title="Active Tricycle Registry" role="TMO Officer">
            <Head title="Active Tricycle Registry | TRIVORA" />
            <div className="font-['Plus_Jakarta_Sans',sans-serif]">

                {/* ══════════════════════════════════════════════════════════════
                    1. PAGE HEADER
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                    <div>
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Active Tricycle Registry
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                            Official registry of registered tricycles operating in Nasugbu.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setExportOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <Download size={15} strokeWidth={2.2} className="text-white" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">

                    {/* ─ Card 1: Total Units ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Total Registered
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {totalCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Tricycles
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Registered in municipal system
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Allowed:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-900 tabular-nums shrink-0">{activePct}%</span>
                        </div>
                    </div>

                    {/* ─ Card 2: Active Fleet ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Active Tricycles
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {activeCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Active
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                {activeCount} of {totalCount} active and running
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Share:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-900 tabular-nums shrink-0">{activePct}%</span>
                        </div>
                    </div>

                    {/* ─ Card 3: Restricted Units ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Suspended / Revoked
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                    <ShieldAlert size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-amber-600 leading-none">
                                    {suspendedCount + revokedCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Restricted
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Currently held or revoked
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">Held:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 tabular-nums shrink-0">
                                <span className="hidden sm:inline">{suspendedCount} Susp · {revokedCount} Rev</span>
                                <span className="sm:hidden">{suspendedCount + revokedCount} total</span>
                            </span>
                        </div>
                    </div>

                    {/* ─ Card 4: Restricted Today (Color Coding) ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Restricted Today
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-[#182B62]">
                                    <Calendar size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {codedTodayCount}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Coded
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                {!isWeekend && todayCodingRule ? (
                                    <>Digits: <strong className="font-black text-slate-900">{todayCodingRule.digits}</strong></>
                                ) : (
                                    <>No restrictions today</>
                                )}
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-600 truncate">{todayName.slice(0, 3)}:</span>
                            {!isWeekend && todayCodingRule ? (
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0 leading-[14px] text-[10px] sm:text-[11px] font-bold text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]"
                                    style={{ backgroundColor: todayCodingRule.bg, borderColor: todayCodingRule.border, borderWidth: 1 }}
                                >
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: todayCodingRule.hex }} />
                                    {todayCodingRule.color}
                                </span>
                            ) : (
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-xs font-bold text-slate-800 shrink-0">All allowed</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. MULTI-DIMENSIONAL COMMAND & FILTER TOOLBAR
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">

                        {/* Primary Search Input */}
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
                                placeholder="Search by plate number, sticker number, owner, or franchise..."
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Filter Controls Row */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                aria-label="Filter by status"
                                className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[135px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                <option value="all">All Status ({totalCount})</option>
                                <option value="active">Active ({activeCount})</option>
                                <option value="suspended">Suspended ({suspendedCount})</option>
                                <option value="revoked">Revoked ({revokedCount})</option>
                            </select>

                            {/* Color Coding Scheme Filter */}
                            <select
                                value={codingFilter}
                                onChange={e => {
                                    setCodingFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                aria-label="Filter by color coding scheme"
                                className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer truncate"
                            >
                                <option value="all">All Schemes ({units.length})</option>
                                {codingOptions.map(opt => (
                                    <option key={opt.day} value={opt.color}>
                                        {opt.color} — {opt.day.slice(0, 3)} ({opt.count})
                                    </option>
                                ))}
                            </select>

                            {/* Quick Toggle: Restricted Today */}
                            <button
                                type="button"
                                onClick={() => {
                                    setOnlyCodedToday(prev => !prev);
                                    setCurrentPage(1);
                                }}
                                className={`col-span-2 sm:col-span-1 inline-flex h-10 w-full sm:w-auto sm:flex-1 lg:flex-none shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer font-['Plus_Jakarta_Sans',sans-serif] ${
                                    onlyCodedToday
                                        ? 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                                }`}
                            >
                                <ShieldAlert size={14} className={onlyCodedToday ? 'text-rose-600' : 'text-slate-500'} />
                                <span>Coded Today</span>
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                    onlyCodedToday ? 'bg-rose-600 text-white' : 'bg-slate-200/70 text-slate-700'
                                }`}>
                                    {codedTodayCount}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. DATA DISPLAY: TABLE & MOBILE CARDS
                   ══════════════════════════════════════════════════════════════ */}
                {filtered.length === 0 ? (
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-12 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
                            <Bike size={22} strokeWidth={1.8} />
                        </div>
                        <h3 className="mt-3.5 font-['Plus_Jakarta_Sans',sans-serif] text-base font-black text-slate-900">
                            No matching tricycles found
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-600 leading-relaxed">
                            No tricycles match your selected criteria. Try adjusting your search or clearing your filters.
                        </p>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                <RotateCcw size={12} strokeWidth={2.2} />
                                <span>Reset all filters</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── DESKTOP & TABLET DATA TABLE WITH INTEGRATED FOOTER (>= md) ── */}
                        <div className={`hidden lg:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 bg-slate-50/80">
                                            <th scope="col" className="py-3.5 pl-6 pr-3 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Tricycle
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Tricycle Owner
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Franchise
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Color Coding Scheme
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Status
                                            </th>
                                            <th scope="col" className="py-3.5 pl-3 pr-6 text-right font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-bold uppercase tracking-wider text-slate-500">
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

                            {/* Integrated Table Footer: Pagination */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6 py-3.5">
                                <p className="text-xs text-slate-600 font-['Plus_Jakarta_Sans',sans-serif]">
                                    Showing page <span className="font-bold text-slate-900 tabular-nums">{activePage}</span> of{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{totalPages}</span>
                                    <span className="mx-2 text-slate-300">·</span>
                                    <span className="tabular-nums font-bold text-slate-800">{filtered.length}</span> matching tricycles
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 font-['Plus_Jakarta_Sans',sans-serif]"
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
                                                            <span className="px-1 text-xs text-slate-500">…</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all font-['Plus_Jakarta_Sans',sans-serif] ${
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
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 font-['Plus_Jakarta_Sans',sans-serif]"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE PURPOSE-BUILT CARDS (< md) ── */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                            {paginated.map(unit => (
                                <MobileUnitCard
                                    key={unit.id}
                                    unit={unit}
                                    todayName={todayName}
                                    isWeekend={isWeekend}
                                />
                            ))}

                            {/* Mobile Pagination */}
                            <div className={`md:col-span-2 mt-1 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 ${CARD_SHADOW}`}>
                                <p className="text-xs text-slate-600 font-['Plus_Jakarta_Sans',sans-serif]">
                                    Page <span className="font-bold text-slate-900">{activePage}</span> of {totalPages}
                                    <span className="ml-1 text-[11px] text-slate-500">({filtered.length} tricycles)</span>
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        <ChevronLeft size={13} strokeWidth={2.5} />
                                        <span>Prev</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={activePage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
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
                    title="Export Tricycle Registry"
                    recordLabel="registered units"
                    recordCount={initialUnits.length}
                    scopeNote="Entire Tricycle Registry"
                    exportUrl={route('tmo.registry.export-excel')}
                    fallbackName="trivora_active_tricycle_registry"
                />
            </div>
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

const STATUS_PILL_META = {
    active:    { label: 'Active',    className: 'border border-emerald-200/90 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    suspended: { label: 'Suspended', className: 'border border-amber-200/90 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
    revoked:   { label: 'Revoked',   className: 'border border-rose-200/90 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
};

function StatusPill({ status }) {
    const meta = STATUS_PILL_META[status] || STATUS_PILL_META.suspended;
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm transition-colors font-['Plus_Jakarta_Sans',sans-serif] ${meta.className}`}
        >
            <span>{meta.label}</span>
        </span>
    );
}

function DesktopTableRow({ unit, todayName, isWeekend }) {
    const unitCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;
    const stickerNumber = unit.coding_scheme_number;
    const isCodedToday = !isWeekend && unit.coding_day && unit.coding_day.toLowerCase().includes(todayName.toLowerCase());

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Tricycle Unit Plate & ID */}
            <td className="py-4 pl-6 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-black tracking-wide text-slate-900 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md w-fit shadow-sm">
                        {unit.plate_no || 'NO PLATE'}
                    </span>
                    <span className="mt-1 font-mono text-[11px] font-semibold text-slate-500">
                        {unitCode}
                    </span>
                </div>
            </td>

            {/* Column 2: Owner & Contact */}
            <td className="py-4 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={unit.operator} src={unit.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-sm" />
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#182B62] transition-colors font-['Plus_Jakarta_Sans',sans-serif]">
                            {unit.operator}
                        </p>
                        {unit.contact && unit.contact !== 'N/A' ? (
                            <a
                                href={`tel:${unit.contact}`}
                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-[#182B62] transition-colors"
                            >
                                <Phone size={10} strokeWidth={2.2} className="text-slate-500" />
                                <span>{unit.contact}</span>
                            </a>
                        ) : (
                            <span className="text-[11px] text-slate-500 font-medium">No contact</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Column 3: Franchise (Franchise Number & Validity Term) */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold text-slate-900">
                        {unit.franchise_number || '—'}
                    </span>
                    <span className="mt-1 font-mono text-[11px] text-slate-600 flex items-center gap-1">
                        <Calendar size={11} className="text-slate-500 shrink-0" />
                        <span>{unit.validity_term || '—'}</span>
                    </span>
                </div>
            </td>

            {/* Column 4: Color Coding Scheme & Number */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-[13px] font-black text-slate-900">
                            #{stickerNumber}
                        </span>
                        <span className="text-slate-300 text-xs">·</span>
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-800">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: unit.coding_hex || '#64748B' }}
                            />
                            <span className="font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">{unit.coding_color}</span>
                        </div>

                        {isCodedToday && (
                            <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200/90 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700 font-['Plus_Jakarta_Sans',sans-serif]">
                                Coded
                            </span>
                        )}
                    </div>

                    <span className="mt-1 text-[11px] text-slate-500">
                        Restricted: <span className="font-semibold text-slate-600">{unit.coding_day}</span>
                    </span>
                </div>
            </td>

            {/* Column 4: Compliance Status */}
            <td className="py-4 px-4 align-middle">
                <StatusPill status={unit.status} />
            </td>

            {/* Column 5: Actions */}
            <td className="py-4 pl-3 pr-6 text-right align-middle">
                <Link
                    href={route('tricycle.details', unit.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all active:scale-[0.98] font-['Plus_Jakarta_Sans',sans-serif]"
                >
                    <span>Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </td>
        </tr>
    );
}

function MobileUnitCard({ unit, todayName, isWeekend }) {
    const unitCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;
    const stickerNumber = unit.coding_scheme_number;
    const isCodedToday = !isWeekend && unit.coding_day && unit.coding_day.toLowerCase().includes(todayName.toLowerCase());

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            {/* Top Row: Vehicle Plate & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black tracking-wide text-slate-900 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md shadow-sm">
                        {unit.plate_no || 'NO PLATE'}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-500">({unitCode})</span>
                </div>

                <StatusPill status={unit.status} />
            </div>

            {/* Owner Information */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={unit.operator} src={unit.operator_photo} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-sm" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">{unit.operator}</p>
                        {unit.contact && unit.contact !== 'N/A' ? (
                            <a
                                href={`tel:${unit.contact}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-[#182B62]"
                            >
                                <Phone size={10} strokeWidth={2.2} className="text-slate-500" />
                                <span>{unit.contact}</span>
                            </a>
                        ) : (
                            <span className="text-[11px] text-slate-500 font-medium">No contact</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Franchise Metadata */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Franchise</span>
                <div className="flex flex-col items-end shrink-0">
                    <span className="font-mono font-bold text-slate-900 text-xs">{unit.franchise_number || '—'}</span>
                    <span className="text-[10px] text-slate-600 font-mono mt-0.5">{unit.validity_term || '—'}</span>
                </div>
            </div>

            {/* Color Coding Metadata */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Color Scheme</span>

                <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono font-black text-slate-900">#{stickerNumber}</span>
                        <span className="text-slate-300">·</span>
                        <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                            style={{ backgroundColor: unit.coding_hex || '#64748B' }}
                        />
                        <span className="font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">{unit.coding_color}</span>
                        {isCodedToday && (
                            <span className="rounded-md bg-rose-50 border border-rose-200/90 px-1.5 py-0.2 text-[9.5px] font-extrabold uppercase text-rose-700">
                                Coded
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                        Restricted: <span className="font-semibold text-slate-600">{unit.coding_day}</span>
                    </span>
                </div>
            </div>

            {/* Action Button */}
            <div className="mt-3 pt-2.5 border-t border-slate-100">
                <Link
                    href={route('tricycle.details', unit.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] font-['Plus_Jakarta_Sans',sans-serif]"
                >
                    <span>View Details</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-white/70" />
                </Link>
            </div>
        </div>
    );
}
