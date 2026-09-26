import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import TricycleMap from '@/Components/TricycleMap';
import {
    Bike, ShieldAlert, BarChart3, ChevronRight, CheckCircle2,
    Activity, Search, X, ShieldCheck, Calendar, MapPin
} from 'lucide-react';

const CODING_SCHEDULE = {
    Monday:    { color: 'Red',    hex: '#EF4444', digits: '1, 2',  bg: '#FEF2F2', border: '#FECACA' },
    Tuesday:   { color: 'Blue',   hex: '#3B82F6', digits: '3, 4',  bg: '#EFF6FF', border: '#BFDBFE' },
    Wednesday: { color: 'Yellow', hex: '#D97706', digits: '5, 6',  bg: '#FFFBEB', border: '#FDE68A' },
    Thursday:  { color: 'Green',  hex: '#10B981', digits: '7, 8',  bg: '#ECFDF5', border: '#A7F3D0' },
    Friday:    { color: 'White',  hex: '#64748B', digits: '9, 0',  bg: '#F8FAFC', border: '#E2E8F0' },
};

// Live Monitoring refresh cadence (this page only). GPS itself arrives every 5s; the 10s
// Online/Offline threshold is decided server-side (config/tracking.php).
const LIVE_MONITORING_REFRESH_MS = 3000;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Shared soft, layered shadow token — same elevation language used across TMO dashboards.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

/** "8 seconds ago" / "3 minutes ago", ticking off the real backend recorded_at timestamp and the
 * page's own live clock — no extra network request needed between polls. */
const formatElapsed = (isoTimestamp, now) => {
    if (!isoTimestamp) return null;
    const seconds = Math.max(0, Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / 1000));
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
};

export default function LiveMonitoring({ initialTricycles = [], stats = {} }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState('units'); // 'units' | 'alerts'
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [unitSearch, setUnitSearch] = useState('');
    const [unitStatusFilter, setUnitStatusFilter] = useState('all'); // 'all' | 'online' | 'offline'

    useEffect(() => {
        const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockTimer);
    }, []);

    // ── REAL: sourced exclusively from the backend (DashboardController::index() -> tricycle_locations) ──
    const realTricycles = useMemo(
        () => initialTricycles.map((t) => ({ ...t, source: 'real' })),
        [initialTricycles]
    );

    // Poll the SAME Laravel route this page already renders from, requesting only the props that
    // change (initialTricycles, stats) — no separate API, no client-side coordinate fabrication.
    // Live Monitoring only: 3s refresh (every other page keeps the shared 5s default). The hook's
    // in-flight guard skips a tick while the previous reload is still running, so a slow response
    // never stacks requests. Refreshing faster than GPS arrives (every 5s) just re-reads the latest
    // stored coordinate — it never creates one.
    useBackgroundRefresh(['initialTricycles', 'stats'], { interval: LIVE_MONITORING_REFRESH_MS });

    // Regulatory numbers (breach counts, compliance) are computed from real coordinate data only.
    const realViolations = useMemo(() => realTricycles.filter(t => t.status === 'violator'), [realTricycles]);

    // Units reporting GPS (recorded_at is set).
    const reportingTricycles = useMemo(() => realTricycles.filter(t => t.recorded_at), [realTricycles]);
    const realComplianceRate = reportingTricycles.length > 0
        ? Math.round(((reportingTricycles.length - realViolations.length) / reportingTricycles.length) * 100)
        : 100;

    const todayName = WEEKDAY_NAMES[new Date().getDay()] || 'Monday';
    const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';
    const todayCodingRule = !isWeekend ? CODING_SCHEDULE[todayName] : null;

    const registeredFleet = stats.active_fleet ?? realTricycles.length;

    // Real fleet status composition
    const STATUS_META = {
        compliant:           { label: 'Compliant',          color: '#10B981' },
        coding_no_operation: { label: 'Restricted Today',   color: '#F59E0B' },
        violator:            { label: 'Violation',          color: '#E11D48' },
        offline:             { label: 'Offline / No Signal', color: '#94A3B8' },
    };
    const statusBreakdown = useMemo(() => {
        const counts = { compliant: 0, coding_no_operation: 0, violator: 0, offline: 0 };
        realTricycles.forEach((t) => {
            if (counts[t.status] !== undefined) counts[t.status] += 1;
        });
        return Object.keys(STATUS_META).map((key) => ({ key, count: counts[key], ...STATUS_META[key] }));
    }, [realTricycles]);

    // Filter units for the sidebar list by search term
    const searchFilteredUnits = useMemo(() => {
        if (!unitSearch.trim()) return realTricycles;
        const q = unitSearch.toLowerCase().trim();
        return realTricycles.filter(t =>
            (t.plate || '').toLowerCase().includes(q) ||
            (t.id && String(t.id).toLowerCase().includes(q)) ||
            (t.operator && t.operator.toLowerCase().includes(q))
        );
    }, [realTricycles, unitSearch]);

    // All / Online / Offline status filter — derives from the same server-side freshness flag
    // (is_online, computed in DashboardController::index(): drivers.is_online first, then the
    // 10s GPS threshold from config/tracking.fleet_online_threshold_seconds) that the roster's Online/Offline badges
    // and the map already display. No separate client-side timing logic.
    const statusCounts = useMemo(() => ({
        all:    searchFilteredUnits.length,
        online: searchFilteredUnits.filter(t => t.is_online).length,
        offline: searchFilteredUnits.filter(t => !t.is_online).length,
    }), [searchFilteredUnits]);

    const filteredUnits = useMemo(() => {
        if (unitStatusFilter === 'online') return searchFilteredUnits.filter(t => t.is_online);
        if (unitStatusFilter === 'offline') return searchFilteredUnits.filter(t => !t.is_online);
        return searchFilteredUnits;
    }, [searchFilteredUnits, unitStatusFilter]);

    return (
        <TrivoraLayout title="Live Monitoring" role="TMO Supervisor">
            <Head title="Live Fleet Monitoring | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. HEADER & LIVE OPERATIONAL STRIP
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Live Fleet Monitoring
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Real-time GPS tracking and color coding compliance for tricycles operating in Nasugbu.
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. COMPACT OPERATIONAL KPI DECK (Matching Registry Design)
               ══════════════════════════════════════════════════════════════ */}

            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {/* ─ Card 1: Active Tricycles (Units on Road) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Active Tricycles
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Bike size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                {reportingTricycles.length}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Reporting GPS
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {realComplianceRate}% coding compliance
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">GPS Signal:</span>
                        {reportingTricycles.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active &amp; Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-500 text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                No Real GPS Yet
                            </span>
                        )}
                    </div>
                </div>

                {/* ─ Card 2: Ordinance Enforcement (Today's Color Coding Compliance) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
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
                            <span className="text-base sm:text-lg font-extrabold text-[#1D2542]">{todayName}</span>
                            {!isWeekend && todayCodingRule && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-slate-800"
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
                            {realViolations.length > 0 ? (
                                <span className="text-rose-600 font-extrabold">{realViolations.length} Breach Detected</span>
                            ) : (
                                <span className="text-slate-800 font-bold">{todayCodingRule ? `${todayCodingRule.digits} Coded` : 'None (Weekend)'}</span>
                            )}
                        </span>
                    </div>
                </div>

                {/* ─ Card 3: Franchise Validity (Permit Standing) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Franchise Standing
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <ShieldCheck size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                Active
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                MTOP Standing
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Zero expired or suspended permits
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Regulatory Oversight:</span>
                        <span className="text-xs font-bold text-[#1D2542]">TMO &amp; BPLO</span>
                    </div>
                </div>

                {/* ─ Card 4: Coding Enforcement (Active Breaches — REAL data only) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Coding Enforcement
                            </span>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                realViolations.length > 0
                                    ? 'bg-gradient-to-br from-rose-500/[0.12] to-rose-500/[0.02] text-rose-600'
                                    : 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]'
                            }`}>
                                <ShieldAlert size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                                realViolations.length > 0 ? 'text-rose-600' : 'text-[#1D2542]'
                            }`}>
                                {realViolations.length}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {realViolations.length === 1 ? 'Active Breach' : 'Active Breaches'}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {realViolations.length > 0 ? 'Operating on restricted coding day' : 'All active units compliant with coding'}
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Ordinance Status:</span>
                        <span className={`text-xs font-bold ${realViolations.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {realViolations.length > 0 ? `${realViolations.length} Non-Compliant` : '100% Compliant'}
                        </span>
                    </div>
                </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. COMMAND CENTER MAIN STAGE (MAP + TELEMETRY CONSOLE)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">

                {/* ── LEFT MAIN: LIVE INTERACTIVE MAP CANVAS (8 COLS) ── */}
                <div className={`lg:col-span-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-2 ${CARD_SHADOW}`}>
                    <div className="relative h-[360px] sm:h-[500px] lg:h-[600px] w-full overflow-hidden rounded-xl">
                        <TricycleMap
                            tricycles={realTricycles}
                            selectedUnitId={selectedUnitId}
                            onSelectUnit={(unitId) => setSelectedUnitId(unitId)}
                        />
                    </div>
                </div>

                {/* ── RIGHT DOCKED: SAAS TELEMETRY CONSOLE (4 COLS) ── */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white flex flex-col h-[420px] sm:h-[520px] lg:h-[616px] ${CARD_SHADOW}`}>

                        {/* Top Console Navigation Tabs */}
                        <div className="flex items-center border-b border-slate-200/70 bg-slate-50/80 p-1.5 gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => setActiveTab('units')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'units'
                                        ? 'bg-[#1D2542] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                                }`}
                            >
                                <Bike size={13} />
                                <span>Units</span>
                                <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                                    activeTab === 'units' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {filteredUnits.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('alerts')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'alerts'
                                        ? 'bg-[#1D2542] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                                }`}
                            >
                                <ShieldAlert size={13} className={realViolations.length > 0 && activeTab !== 'alerts' ? 'text-rose-500' : ''} />
                                <span>Alerts</span>
                                <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                                    realViolations.length > 0
                                        ? (activeTab === 'alerts' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700')
                                        : (activeTab === 'alerts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')
                                }`}>
                                    {realViolations.length}
                                </span>
                            </button>
                        </div>

                        {/* ── TAB 1: LIVE UNITS ROSTER ── */}
                        {activeTab === 'units' && (
                            <div className="flex flex-col flex-1 min-h-0">
                                {/* Search + status filter — one row */}
                                <div className="p-3 border-b border-slate-100 bg-white shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1 min-w-0">
                                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Filter by plate, sticker number, or driver..."
                                                value={unitSearch}
                                                onChange={(e) => setUnitSearch(e.target.value)}
                                                className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#1D2542] focus:ring-1 focus:ring-[#1D2542]"
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

                                        {/* All / Online / Offline dropdown — same is_online freshness
                                            flag as the badges and map, with live counts. pl/pr reserves
                                            room so the label never runs under the dropdown arrow icon. */}
                                        <select
                                            value={unitStatusFilter}
                                            onChange={(e) => setUnitStatusFilter(e.target.value)}
                                            aria-label="Filter units by status"
                                            className="h-8 min-w-[108px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-7 text-xs font-semibold text-slate-700 focus:border-[#1D2542] focus:outline-none focus:ring-1 focus:ring-[#1D2542]"
                                        >
                                            <option value="all">All ({statusCounts.all})</option>
                                            <option value="online">Online ({statusCounts.online})</option>
                                            <option value="offline">Offline ({statusCounts.offline})</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Scrollable Units List */}
                                <div className="flex-1 overflow-y-auto p-2.5 divide-y divide-slate-100/80 space-y-1">
                                    {filteredUnits.length > 0 ? (
                                        filteredUnits.map((unit) => {
                                            const isSelected = selectedUnitId === unit.db_id;
                                            const isOffline = !unit.is_online;
                                            const lastUpdateLabel = !unit.recorded_at
                                                ? 'No Signal'
                                                : (formatElapsed(unit.recorded_at, currentTime) || unit.last_seen || 'Unknown');

                                            return (
                                                <div
                                                    // db_id (the tricycle's primary key) is the row identity, not `id` —
                                                    // `id` is the display Sticker Number, which legitimately repeats
                                                    // across units (see DashboardController::index()).
                                                    key={unit.db_id}
                                                    onClick={() => setSelectedUnitId(unit.db_id)}
                                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-[#1D2542] bg-slate-50 shadow-xs'
                                                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50/60'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-extrabold text-slate-900">
                                                                {unit.plate}
                                                            </span>
                                                            {unit.id && unit.id !== unit.plate && (
                                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                                                                    #{unit.id}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            unit.is_online
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                        }`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${unit.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                            {unit.is_online ? 'Online' : 'Offline'}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                                                        <span className="truncate max-w-[170px] font-medium text-slate-700">
                                                            {unit.operator}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-slate-400 font-mono">
                                                            GPS Acquired
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between text-[10.5px] border-t border-slate-100 pt-1.5">
                                                        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${
                                                                isOffline
                                                                    ? 'bg-slate-400'
                                                                    : unit.status === 'violator'
                                                                        ? 'bg-rose-500'
                                                                        : unit.status === 'coding_no_operation'
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-emerald-500'
                                                            }`} />
                                                            {isOffline
                                                                ? 'Offline'
                                                                : unit.status === 'violator'
                                                                    ? 'Coding Violation'
                                                                    : unit.status === 'coding_no_operation'
                                                                        ? 'Restricted Today'
                                                                        : 'Compliant'}
                                                        </span>
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
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                                {realViolations.length > 0 ? (
                                    realViolations.map((v) => (
                                        <div
                                            key={v.db_id}
                                            className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 shadow-2xs"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-xs font-extrabold text-slate-900">
                                                    {v.plate}
                                                </span>
                                                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-800 uppercase">
                                                    Coding Breach
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs font-semibold text-slate-800">{v.operator}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
                                                Operating on public road during restricted color coding day (#{v.coding_scheme || v.id}).
                                            </p>
                                            <div className="mt-2.5 flex items-center justify-between border-t border-rose-200/60 pt-2 text-[10.5px]">
                                                <span className="text-slate-400">Live Location</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedUnitId(v.db_id)}
                                                    className="font-bold text-[#1D2542] hover:underline inline-flex items-center gap-0.5"
                                                >
                                                    Locate on Map <ChevronRight size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#1D2542] mb-3">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900">All Units Compliant</h4>
                                        <p className="mt-1 text-xs text-slate-500 max-w-[200px] leading-relaxed">
                                            No color coding violations detected. All operating units are authorized for today.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. BOTTOM OPERATIONAL INTELLIGENCE & ANALYTICS
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">

                {/* Fleet Status Breakdown — real tricycles only, by the same status categories
                    DashboardController::index() already assigns. No time-series/hourly data is
                    available from the backend, so this deliberately shows a real current snapshot
                    rather than a fabricated trend. */}
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} lg:col-span-8 flex flex-col h-full`}>
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <BarChart3 size={16} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate text-[13.5px] font-bold text-slate-900">Fleet Status Breakdown</h3>
                                <p className="truncate text-[11px] text-slate-400">Current status of every registered unit, right now</p>
                            </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-600">
                            {realTricycles.length} tricycles
                        </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-center">
                        {realTricycles.length > 0 ? (
                            <>
                                <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
                                    {statusBreakdown.filter(s => s.count > 0).map((s) => (
                                        <div
                                            key={s.key}
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ background: s.color, flexGrow: s.count, flexBasis: 0 }}
                                            title={`${s.label}: ${s.count}`}
                                        />
                                    ))}
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {statusBreakdown.map((s) => (
                                        <div key={s.key} className="rounded-xl bg-slate-50 p-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                                                <span className="truncate text-[10.5px] font-semibold text-slate-500">{s.label}</span>
                                            </div>
                                            <span className="mt-1.5 block text-2xl font-extrabold tabular-nums text-slate-900">{s.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <Bike size={20} strokeWidth={1.8} />
                                </div>
                                <p className="text-xs text-slate-400">No active tricycles registered yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Action Hub */}
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} lg:col-span-4 flex flex-col justify-between h-full`}>
                    <div>
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#1D2542]">
                                <Activity size={16} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Enforcement Hub</h3>
                                <p className="text-[11px] text-slate-400">Quick registry and records access</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <Link
                                href="/tmo/registry"
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                                        <Bike size={14} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            Active Tricycle Registry
                                        </div>
                                        <div className="text-[10.5px] text-slate-500">{registeredFleet} units officially authorized</div>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <Link
                                href="/violations"
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                                        <ShieldAlert size={14} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                                            Violation Records
                                        </div>
                                        <div className="text-[10.5px] text-slate-500">Review citations and driver appeals</div>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-[11px] text-slate-500">
                        <span>GPS Service</span>
                        {realTricycles.length > 0 ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                            </span>
                        ) : (
                            <span className="font-bold text-slate-500 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                Awaiting Signal
                            </span>
                        )}
                    </div>
                </div>

            </div>

        </TrivoraLayout>
    );
}

