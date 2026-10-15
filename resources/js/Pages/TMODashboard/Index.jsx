import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import TricycleMap, { resolveTricycleStatus } from '@/Components/TricycleMap';
import {
    Bike, ShieldAlert, BarChart3, ChevronRight, CheckCircle2,
    Activity, Search, X, ShieldCheck, Calendar, ArrowUpRight
} from 'lucide-react';

// Live Monitoring refresh cadence (this page only). GPS arrives every 5s; the 10s
// Online/Offline threshold is decided server-side (config/tracking.php).
const LIVE_MONITORING_REFRESH_MS = 3000;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Live Monitoring status badge per DashboardController connection_status.
const CONNECTION_META = {
    online:         { label: 'Online',         badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' },
    no_signal:      { label: 'No Signal',      badge: 'bg-amber-50 text-amber-700 border border-amber-200/60' },
    offline:        { label: 'Offline',        badge: 'bg-slate-100 text-slate-600 border border-slate-200' },
    not_configured: { label: 'Not Configured', badge: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function LiveMonitoring({ initialTricycles = [], stats = {}, activeCodingSchemes = [] }) {
    const [activeTab, setActiveTab] = useState('units'); // 'units' | 'alerts'
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [unitSearch, setUnitSearch] = useState('');
    const [unitStatusFilter, setUnitStatusFilter] = useState('all'); // 'all' | 'online' | 'no_signal' | 'offline'

    // Sourced exclusively from the backend (DashboardController::index() -> tricycle_locations)
    const realTricycles = useMemo(
        () => initialTricycles.map((t) => ({ ...t, source: 'real' })),
        [initialTricycles]
    );

    // 3s silent background reload for live telemetry
    useBackgroundRefresh(['initialTricycles', 'stats'], { interval: LIVE_MONITORING_REFRESH_MS, pauseOnInputFocus: false });

    // Regulatory numbers computed from real coordinate data only
    const realViolations = useMemo(() => realTricycles.filter(t => t.status === 'violator'), [realTricycles]);

    const todayName = WEEKDAY_NAMES[new Date().getDay()] || 'Monday';
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

    const registeredFleet = stats.active_fleet ?? realTricycles.length;

    // Real fleet status composition
    const STATUS_META = {
        compliant:           { label: 'Operating',          color: '#10B981' },
        coding_no_operation: { label: 'Restricted Today',   color: '#F59E0B' },
        violator:            { label: 'Violation',          color: '#DC2626' },
        offline:             { label: 'Offline',            color: '#64748B' },
    };

    const statusBreakdown = useMemo(() => {
        const counts = { compliant: 0, coding_no_operation: 0, violator: 0, offline: 0 };
        realTricycles.forEach((t) => {
            if (counts[t.status] !== undefined) counts[t.status] += 1;
        });
        return Object.keys(STATUS_META).map((key) => ({ key, count: counts[key], ...STATUS_META[key] }));
    }, [realTricycles]);

    // Fleet connectivity
    const connectivity = useMemo(() => {
        const c = { online: 0, no_signal: 0, offline: 0, not_configured: 0, total: realTricycles.length };
        realTricycles.forEach((t) => {
            if (c[t.connection_status] !== undefined) c[t.connection_status] += 1;
        });
        const gpsEquipped = c.online + c.no_signal + c.offline;
        const pct = (n) => (c.total > 0 ? Math.round((n / c.total) * 100) : 0);
        return {
            ...c,
            gpsEquipped,
            gpsEquippedPct: pct(gpsEquipped),
            onlinePct: pct(c.online),
            noSignalPct: pct(c.no_signal),
            offlinePct: pct(c.offline),
            notConfiguredPct: pct(c.not_configured),
        };
    }, [realTricycles]);

    // Filter units by search term
    const searchFilteredUnits = useMemo(() => {
        if (!unitSearch.trim()) return realTricycles;
        const q = unitSearch.toLowerCase().trim();
        return realTricycles.filter(t =>
            (t.plate || '').toLowerCase().includes(q) ||
            (t.id && String(t.id).toLowerCase().includes(q)) ||
            (t.operator && t.operator.toLowerCase().includes(q))
        );
    }, [realTricycles, unitSearch]);

    // Live counts for status filter
    const statusCounts = useMemo(() => ({
        all:            searchFilteredUnits.length,
        online:         searchFilteredUnits.filter(t => t.connection_status === 'online').length,
        no_signal:      searchFilteredUnits.filter(t => t.connection_status === 'no_signal').length,
        offline:        searchFilteredUnits.filter(t => t.connection_status === 'offline').length,
        not_configured: searchFilteredUnits.filter(t => t.connection_status === 'not_configured').length,
    }), [searchFilteredUnits]);

    const filteredUnits = useMemo(() => {
        if (unitStatusFilter !== 'all') return searchFilteredUnits.filter(t => t.connection_status === unitStatusFilter);
        return searchFilteredUnits;
    }, [searchFilteredUnits, unitStatusFilter]);

    // Units/Alerts console — rendered in the side card and, in Full View, beside the map.
    const telemetryConsole = (
        <>
            {/* Top Console Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200/80 bg-slate-50/90 p-1.5 gap-1.5 shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab('units')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all font-['Plus_Jakarta_Sans',sans-serif] ${
                        activeTab === 'units'
                            ? 'bg-[#182B62] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                >
                    <Bike size={14} />
                    <span>Units</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                        activeTab === 'units' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'
                    }`}>
                        {filteredUnits.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('alerts')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all font-['Plus_Jakarta_Sans',sans-serif] ${
                        activeTab === 'alerts'
                            ? 'bg-[#182B62] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                >
                    <ShieldAlert size={14} className={realViolations.length > 0 && activeTab !== 'alerts' ? 'text-rose-500' : ''} />
                    <span>Alerts</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                        realViolations.length > 0
                            ? (activeTab === 'alerts' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700')
                            : (activeTab === 'alerts' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700')
                    }`}>
                        {realViolations.length}
                    </span>
                </button>
            </div>

            {/* ── TAB 1: LIVE UNITS ROSTER ── */}
            {activeTab === 'units' && (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Search + status filter */}
                    <div className="p-3 border-b border-slate-100 bg-white shrink-0">
                        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-stretch xl:items-center gap-2">
                            <div className="relative flex-1 min-w-0">
                                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search plate, sticker, or driver..."
                                    value={unitSearch}
                                    onChange={(e) => setUnitSearch(e.target.value)}
                                    className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-1 focus:ring-[#182B62] transition-colors"
                                />
                                {unitSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setUnitSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            <select
                                value={unitStatusFilter}
                                onChange={(e) => setUnitStatusFilter(e.target.value)}
                                aria-label="Filter units by status"
                                className="w-full sm:w-auto lg:w-full xl:w-auto sm:min-w-[110px] xl:min-w-[110px] h-9 shrink-0 rounded-xl border border-slate-200 bg-slate-50/70 pl-2.5 pr-7 text-xs font-bold text-slate-700 focus:border-[#182B62] focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            >
                                <option value="all">All ({statusCounts.all})</option>
                                <option value="online">Online ({statusCounts.online})</option>
                                <option value="no_signal">No Signal ({statusCounts.no_signal})</option>
                                <option value="offline">Offline ({statusCounts.offline})</option>
                                <option value="not_configured">No GPS ({statusCounts.not_configured})</option>
                            </select>
                        </div>
                    </div>

                    {/* Scrollable Units List */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
                        {filteredUnits.length > 0 ? (
                            filteredUnits.map((unit) => {
                                const isSelected = selectedUnitId === unit.db_id;
                                const isOffline = !unit.is_online;
                                const isNotConfigured = unit.connection_status === 'not_configured';
                                const connection = CONNECTION_META[unit.connection_status] || CONNECTION_META.offline;
                                const lastUpdateLabel = unit.last_update_label || '—';

                                return (
                                    <div
                                        key={unit.db_id}
                                        onClick={() => {
                                            if (unit.hasRealGPS && unit.lat && unit.lng) {
                                                setSelectedUnitId(unit.db_id);
                                            }
                                        }}
                                        className={`p-2.5 rounded-xl border transition-all ${
                                            !unit.hasRealGPS ? 'cursor-default opacity-75' : 'cursor-pointer'
                                        } ${
                                            isSelected
                                                ? 'border-[#182B62] bg-indigo-50/40 ring-1 ring-[#182B62]/20 shadow-xs'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                                    {unit.plate}
                                                </span>
                                                {unit.id && unit.id !== unit.plate && (
                                                    <span className="rounded bg-indigo-50/70 border border-indigo-100/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#182B62]">
                                                        #{unit.id}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold font-['Plus_Jakarta_Sans',sans-serif] ${connection.badge}`}>
                                                {connection.label}
                                            </span>
                                        </div>

                                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="truncate max-w-[170px] font-semibold text-slate-700">
                                                {unit.operator}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 font-mono">
                                                {unit.hasRealGPS ? 'GPS Active' : 'No GPS Setup'}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[10.5px] border-t border-slate-100/80 pt-1.5">
                                            {(() => {
                                                const stMeta = resolveTricycleStatus(unit.status, unit.is_online, unit.connection_status);
                                                const dotColor = isNotConfigured ? '#CBD5E1' : stMeta.color;
                                                const label = isNotConfigured ? 'No GPS Setup' : stMeta.label;
                                                return (
                                                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 font-['Plus_Jakarta_Sans',sans-serif]">
                                                        <span
                                                            className="h-1.5 w-1.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: dotColor }}
                                                        />
                                                        <span>{label}</span>
                                                    </span>
                                                );
                                            })()}
                                            <span className="text-slate-400 font-medium font-mono text-[10px]">
                                                {lastUpdateLabel}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center text-slate-400 text-xs px-4">
                                {realTricycles.length === 0 ? (
                                    <>No units reporting real GPS coordinates currently.</>
                                ) : (
                                    <>No units matching "{unitSearch}"</>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 2: ACTIVE INCIDENTS FEED ── */}
            {activeTab === 'alerts' && (
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
                    {realViolations.length > 0 ? (
                        realViolations.map((v) => (
                            <div
                                key={v.db_id}
                                className="p-3 rounded-xl border border-rose-200/90 bg-rose-50/50 shadow-2xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-rose-200">
                                        {v.plate}
                                    </span>
                                    <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[9.5px] font-extrabold font-['Plus_Jakarta_Sans',sans-serif] uppercase">
                                        Coding Violation
                                    </span>
                                </div>
                                <p className="mt-1.5 text-xs font-bold text-slate-900">{v.operator}</p>
                                <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed font-normal">
                                    Operating during restricted color coding day (#{v.coding_scheme || v.id}).
                                </p>
                                <div className="mt-2.5 flex items-center justify-between border-t border-rose-200/60 pt-2 text-[10.5px]">
                                    <span className="text-slate-400 font-medium">GPS Location</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUnitId(v.db_id)}
                                        className="font-bold text-[#182B62] hover:text-[#25449B] inline-flex items-center gap-0.5 transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
                                    >
                                        View on Map <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3 shadow-2xs">
                                <ShieldCheck size={22} strokeWidth={2.2} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">No Violations Today</h4>
                            <p className="mt-1 text-xs text-slate-500 max-w-[210px] leading-relaxed">
                                All active tricycles are following today's color coding rules.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <TrivoraLayout title="Live Monitoring" role="TMO Supervisor">
            <Head title="Live Fleet Monitoring | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. HEADER & LIVE OPERATIONAL STRIP
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 border-b border-slate-200/80 pb-4">
                <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                    Live Fleet Monitoring
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                    Live GPS tracking and color coding schedule for Nasugbu tricycles.
                </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. COMPACT OPERATIONAL KPI DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-12 items-stretch">

                {/* ─ Card 1: Fleet Connectivity (6 cols on desktop) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} md:col-span-12 xl:col-span-6 transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 sm:pb-2.5 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100/80 text-[#182B62]">
                                    <Bike size={18} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                            {connectivity.total}
                                        </span>
                                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                            Active Fleet
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] truncate">
                                        GPS Tracking
                                    </p>
                                </div>
                            </div>

                            <span className="font-['Plus_Jakarta_Sans',sans-serif] inline-flex items-center rounded-full border border-indigo-200/70 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-[#182B62] shrink-0">
                                {connectivity.gpsEquipped} GPS Tracked ({connectivity.gpsEquippedPct}%)
                            </span>
                        </div>

                        {/* Segmented Meter */}
                        <div className="pt-2 sm:pt-2.5">
                            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 ring-1 ring-slate-200/50">
                                {connectivity.online > 0 && (
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${connectivity.onlinePct}%` }}
                                        title={`Online: ${connectivity.online}`}
                                    />
                                )}
                                {connectivity.no_signal > 0 && (
                                    <div
                                        className="h-full rounded-full bg-amber-500 transition-all duration-500 ml-0.5"
                                        style={{ width: `${connectivity.noSignalPct}%` }}
                                        title={`No Signal: ${connectivity.no_signal}`}
                                    />
                                )}
                                {connectivity.offline > 0 && (
                                    <div
                                        className="h-full rounded-full bg-slate-400 transition-all duration-500 ml-0.5"
                                        style={{ width: `${connectivity.offlinePct}%` }}
                                        title={`Offline: ${connectivity.offline}`}
                                    />
                                )}
                                {connectivity.not_configured > 0 && (
                                    <div
                                        className="h-full rounded-full bg-slate-200 transition-all duration-500 ml-0.5"
                                        style={{ width: `${connectivity.notConfiguredPct}%` }}
                                        title={`No GPS: ${connectivity.not_configured}`}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Status Breakdown Strip */}
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] sm:text-xs">
                        <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-bold text-slate-900 tabular-nums">{connectivity.online}</span>
                            <span className="text-slate-600 font-medium">Online</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <span className="font-bold text-slate-900 tabular-nums">{connectivity.no_signal}</span>
                            <span className="text-slate-600 font-medium">No Signal</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                            <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                            <span className="font-bold text-slate-900 tabular-nums">{connectivity.offline}</span>
                            <span className="text-slate-600 font-medium">Offline</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                            <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0 border border-slate-400/50" />
                            <span className="font-bold text-slate-900 tabular-nums">{connectivity.not_configured}</span>
                            <span className="text-slate-600 font-medium truncate">No GPS</span>
                        </div>
                    </div>
                </div>

                {/* ─ Card 2: Today's Color Coding (3 cols) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} md:col-span-6 xl:col-span-3 transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Today's Color Coding
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-[#182B62]">
                                <Calendar size={15} strokeWidth={2.2} />
                            </div>
                        </div>

                        <div className="mt-2 sm:mt-2.5">
                            <div className="flex items-center gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-lg sm:text-xl font-black text-slate-900">
                                    {todayName}
                                </span>
                                {!isWeekend && todayCodingRule && (
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]"
                                        style={{ backgroundColor: todayCodingRule.bg, borderColor: todayCodingRule.border, borderWidth: 1 }}
                                    >
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: todayCodingRule.hex }} />
                                        {todayCodingRule.color}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                                {!isWeekend && todayCodingRule ? (
                                    <>Restricted digits: <strong className="font-black text-slate-900">{todayCodingRule.digits}</strong></>
                                ) : (
                                    <>Weekend: No travel restrictions today</>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500">Restriction:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 tabular-nums">
                            {todayCodingRule ? `Ending in ${todayCodingRule.digits}` : 'All Units Allowed'}
                        </span>
                    </div>
                </div>

                {/* ─ Card 3: Coding Compliance (3 cols) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} md:col-span-6 xl:col-span-3 transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                Today's Violations
                            </span>
                            <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border ${
                                realViolations.length > 0
                                    ? 'bg-rose-50 border-rose-100 text-rose-600'
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                                {realViolations.length > 0 ? (
                                    <ShieldAlert size={15} strokeWidth={2.2} />
                                ) : (
                                    <CheckCircle2 size={15} strokeWidth={2.2} />
                                )}
                            </div>
                        </div>

                        <div className="mt-2 sm:mt-2.5">
                            <div className="flex items-baseline gap-1.5 sm:gap-2">
                                <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                    realViolations.length > 0 ? 'text-rose-600' : 'text-slate-900'
                                }`}>
                                    {realViolations.length}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {realViolations.length === 1 ? 'Violation Today' : 'Violations Today'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                                {realViolations.length > 0 ? 'Tricycles operating on restricted day' : 'All tricycles following today\'s schedule'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500">Status:</span>
                        <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-extrabold ${realViolations.length > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {realViolations.length > 0 ? `${realViolations.length} Detected` : 'None Detected'}
                        </span>
                    </div>
                </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. COMMAND CENTER MAIN STAGE (MAP + TELEMETRY CONSOLE)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 items-start">

                {/* ── LEFT MAIN: LIVE INTERACTIVE MAP CANVAS (8 COLS) ── */}
                <div className={`lg:col-span-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-2.5 sm:p-3 ${CARD_SHADOW}`}>
                    <div className="relative h-[380px] sm:h-[500px] lg:h-[620px] w-full overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/50">
                        <TricycleMap
                            tricycles={realTricycles}
                            selectedUnitId={selectedUnitId}
                            onSelectUnit={(unitId) => setSelectedUnitId(unitId)}
                            fullscreenPanel={telemetryConsole}
                        />
                    </div>
                </div>

                {/* ── RIGHT DOCKED: TELEMETRY CONSOLE (4 COLS) ── */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white flex flex-col h-[460px] sm:h-[520px] lg:h-[636px] ${CARD_SHADOW}`}>

                        {telemetryConsole}

                    </div>
                </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. BOTTOM OPERATIONAL INTELLIGENCE & ANALYTICS
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 items-stretch">

                {/* Fleet Status Breakdown (8 cols) */}
                <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 lg:p-7 ${CARD_SHADOW} lg:col-span-8 flex flex-col h-full`}>
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap sm:flex-nowrap">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/60 text-[#182B62]">
                                <BarChart3 size={17} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-[13.5px] font-bold text-slate-900">
                                    Fleet Overview
                                </h3>
                                <p className="truncate text-[11px] text-slate-400">
                                    Current daily status of all registered tricycles
                                </p>
                            </div>
                        </div>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] shrink-0 rounded-full bg-slate-100 border border-slate-200/50 px-2.5 py-1 text-[10.5px] font-bold text-slate-600">
                            {realTricycles.length} tricycles
                        </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-center">
                        {realTricycles.length > 0 ? (
                            <>
                                <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 p-0.5 ring-1 ring-slate-200/50">
                                    {statusBreakdown.filter(s => s.count > 0).map((s) => (
                                        <div
                                            key={s.key}
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ background: s.color, flexGrow: s.count, flexBasis: 0 }}
                                            title={`${s.label}: ${s.count}`}
                                        />
                                    ))}
                                </div>

                                <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                    {statusBreakdown.map((s) => (
                                        <div key={s.key} className="rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100/90 p-3 sm:p-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                                                <span className="truncate text-[10.5px] font-bold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">{s.label}</span>
                                            </div>
                                            <span className="mt-1.5 block font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl font-black tabular-nums text-slate-900 leading-none">
                                                {s.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <Bike size={20} strokeWidth={1.8} />
                                </div>
                                <p className="text-xs text-slate-400">No active tricycles registered yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Action Hub (4 cols) */}
                <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 lg:p-7 ${CARD_SHADOW} lg:col-span-4 flex flex-col justify-between h-full`}>
                    <div>
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-3.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/60 text-[#182B62]">
                                <Activity size={17} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[13.5px] font-bold text-slate-900">
                                    Quick Access
                                </h3>
                                <p className="text-[11px] text-slate-400">Direct links to records and citations</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <Link
                                href="/tmo/registry"
                                className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all group shadow-2xs"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#182B62]">
                                        <Bike size={15} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#25449B] transition-colors font-['Plus_Jakarta_Sans',sans-serif]">
                                            Tricycle Registry
                                        </div>
                                        <div className="text-[10.5px] text-slate-500 font-medium">{registeredFleet} registered tricycles</div>
                                    </div>
                                </div>
                                <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <Link
                                href="/violations"
                                className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all group shadow-2xs"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-rose-600">
                                        <ShieldAlert size={15} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors font-['Plus_Jakarta_Sans',sans-serif]">
                                            Violation Records
                                        </div>
                                        <div className="text-[10.5px] text-slate-500 font-medium">View citations and penalty records</div>
                                    </div>
                                </div>
                                <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-[11px] text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                        <span className="font-medium">GPS Telemetry Service</span>
                        {realTricycles.length > 0 ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                                Connected
                            </span>
                        ) : (
                            <span className="font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                Awaiting Signal
                            </span>
                        )}
                    </div>
                </div>

            </div>

        </TrivoraLayout>
    );
}
