import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import TricycleMap from '@/Components/TricycleMap';
import {
    Bike, Navigation, ShieldAlert, BarChart3, Clock, ChevronRight, CheckCircle2,
    Activity, Search, X, Radio, Eye, Layers, Gauge, ExternalLink, ShieldCheck,
    AlertTriangle, Sparkles, Filter, Calendar, MapPin
} from 'lucide-react';

import routeA from '../../data/routeA.json';
import routeB from '../../data/routeB.json';
import routeC from '../../data/routeC.json';
import routeD from '../../data/routeD.json';

const CODING_SCHEDULE = {
    Monday:    { color: 'Red',    hex: '#EF4444', digits: '1, 2',  bg: '#FEF2F2', border: '#FECACA' },
    Tuesday:   { color: 'Blue',   hex: '#3B82F6', digits: '3, 4',  bg: '#EFF6FF', border: '#BFDBFE' },
    Wednesday: { color: 'Yellow', hex: '#D97706', digits: '5, 6',  bg: '#FFFBEB', border: '#FDE68A' },
    Thursday:  { color: 'Green',  hex: '#10B981', digits: '7, 8',  bg: '#ECFDF5', border: '#A7F3D0' },
    Friday:    { color: 'White',  hex: '#64748B', digits: '9, 0',  bg: '#F8FAFC', border: '#E2E8F0' },
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Shared soft, layered shadow token — same elevation language used on the TMO Dashboard page, so
// both pages read as one consistent product rather than two different templates.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

// Polling cadence for real backend GPS refresh. The driver app reports at most once every 60s
// (WATCH_TIME_INTERVAL_MS in the driver app), so this only needs to be frequent enough to feel
// live without hammering the server — it re-requests the exact same props DashboardController
// already computes for this page (initialTricycles, stats), nothing bespoke.
const REAL_GPS_POLL_INTERVAL_MS = 15000;

// Frontend-only demo units for testing the monitoring UI with a single physical device. These
// IDs can never collide with a real tricycle's id (real ids are either a 4-digit body number or
// "TRV-<db id>", see DashboardController::index()). Coordinates are seeded along the SAME real
// TODA GeoJSON routes already used for the map's route lines — not arbitrary made-up points.
const SIMULATED_UNIT_SEEDS = [
    { id: 'SIM-001', plate: 'SIM-001', operator: 'Simulation Unit 1', todaKey: 'bucana',  todaName: 'TODA Bucana',    baseSpeed: 22 },
    { id: 'SIM-002', plate: 'SIM-002', operator: 'Simulation Unit 2', todaKey: 'brgy10',  todaName: 'TODA Brgy. 10',  baseSpeed: 26 },
    { id: 'SIM-003', plate: 'SIM-003', operator: 'Simulation Unit 3', todaKey: 'brgy8',   todaName: 'TODA Brgy. 8',   baseSpeed: 24 },
    { id: 'SIM-004', plate: 'SIM-004', operator: 'Simulation Unit 4', todaKey: 'brgy14',  todaName: 'TODA Brgy. 4',   baseSpeed: 28 },
    { id: 'SIM-005', plate: 'SIM-005', operator: 'Simulation Unit 5', todaKey: 'bucana',  todaName: 'TODA Bucana',    baseSpeed: 25 },
];

const getCodingDetails = () => {
    const today = WEEKDAY_NAMES[new Date().getDay()] || 'Monday';
    const schedule = {
        'Monday': '1, 2', 'Tuesday': '3, 4', 'Wednesday': '5, 6',
        'Thursday': '7, 8', 'Friday': '9, 0', 'Saturday': 'None', 'Sunday': 'None',
    };
    return { day: today, restricted: schedule[today] || 'None' };
};

const extractRouteCoordinates = (geoJson) => {
    try {
        if (!geoJson) return [];
        const features = geoJson.features ? geoJson.features : [geoJson];
        let allCoords = [];
        features.forEach(f => {
            const geom = f.geometry ? f.geometry : f;
            if (geom.type === 'LineString') allCoords.push(...geom.coordinates);
            else if (geom.type === 'MultiLineString' || geom.type === 'Polygon') allCoords.push(...geom.coordinates[0]);
        });
        return allCoords.map(coord => [coord[1], coord[0]]);
    } catch { return []; }
};

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

const seedSimulatedUnits = (todaRoutes) => {
    const routeCounters = {};
    return SIMULATED_UNIT_SEEDS.map((seed) => {
        const coords = todaRoutes[seed.todaKey] || todaRoutes.bucana || [];
        const countOnRoute = routeCounters[seed.todaKey] || 0;
        routeCounters[seed.todaKey] = countOnRoute + 1;

        const totalPoints = coords.length || 1;
        const startIdx = Math.floor((countOnRoute * totalPoints) / 3) % totalPoints;
        const [lat, lng] = coords[startIdx] || [14.0733, 120.6320];

        return {
            ...seed,
            source: 'simulated',
            toda: seed.todaName,
            coding_scheme: seed.id,
            status: 'compliant', // simulated units never count toward real enforcement breaches
            hasRealGPS: false,
            routeIndex: startIdx,
            lat, lng,
            speed_kmh: seed.baseSpeed,
            last_seen: 'Just now',
        };
    });
};

export default function LiveMonitoring({ initialTricycles = [], stats = {}, todaZones = [] }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState('units'); // 'units' | 'alerts' | 'toda'
    const [selectedToda, setSelectedToda] = useState('all');
    const [selectedTodaId, setSelectedTodaId] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [unitSearch, setUnitSearch] = useState('');
    const [simulationEnabled, setSimulationEnabled] = useState(false);

    const codingInfo = getCodingDetails();

    useEffect(() => {
        const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockTimer);
    }, []);

    // TODA GeoJSON Route Coordinate Sets — real municipal route shapes, used both to draw the
    // route lines on the map and to seed/move the frontend-only simulated units along them.
    const todaRoutes = useMemo(() => ({
        bucana: extractRouteCoordinates(routeD),
        brgy10: extractRouteCoordinates(routeC),
        brgy8:  extractRouteCoordinates(routeA),
        brgy14: extractRouteCoordinates(routeB),
    }), []);

    // ── REAL: sourced exclusively from the backend (DashboardController::index() -> tricycle_locations) ──
    const realTricycles = useMemo(
        () => initialTricycles.map((t) => ({ ...t, source: 'real' })),
        [initialTricycles]
    );

    // Poll the SAME Laravel route this page already renders from, requesting only the props that
    // change (initialTricycles, stats) — no separate API, no client-side coordinate fabrication.
    // A fresh telemetry ping from the driver app becomes visible here on the next poll tick.
    useEffect(() => {
        const { stop } = router.poll(REAL_GPS_POLL_INTERVAL_MS, { only: ['initialTricycles', 'stats'] });
        return () => stop();
    }, []);

    // ── SIMULATED: frontend-only, for testing the monitoring UI with a single physical device.
    // Never touches tricycle_locations, never calls /v1/driver/telematics, never creates a
    // Violation — it is pure client-side presentation state. ──
    const [simulatedTricycles, setSimulatedTricycles] = useState(() => seedSimulatedUnits(todaRoutes));

    useEffect(() => {
        if (!simulationEnabled) return;
        const timer = setInterval(() => {
            setSimulatedTricycles((prevList) => prevList.map((unit) => {
                const coords = todaRoutes[unit.todaKey] || todaRoutes.bucana;
                if (!coords || coords.length === 0) return unit;
                const nextIdx = (unit.routeIndex + 1) % coords.length;
                const [lat, lng] = coords[nextIdx];
                // Deterministic speed drift (not Math.random()) so movement is reproducible, not jittery.
                const speed = unit.baseSpeed + ((nextIdx % 3) - 1) * 2;
                return { ...unit, routeIndex: nextIdx, lat, lng, speed_kmh: speed, last_seen: 'Just now' };
            }));
        }, 2000);
        return () => clearInterval(timer);
    }, [simulationEnabled, todaRoutes]);

    // ── DISPLAYED: what the map/list actually render. Real units are always present; simulated
    // units are appended only while the toggle is on, and can never replace/overwrite a real one
    // (distinct id namespaces by construction). ──
    const displayedTricycles = useMemo(
        () => (simulationEnabled ? [...realTricycles, ...simulatedTricycles] : realTricycles),
        [realTricycles, simulatedTricycles, simulationEnabled]
    );

    // Regulatory numbers (breach counts, per-TODA compliance) are computed from REAL data only —
    // turning simulation on must never inflate or dilute an actual enforcement statistic.
    const realViolations = useMemo(() => realTricycles.filter(t => t.status === 'violator'), [realTricycles]);

    // Units that have ever actually reported a GPS ping (recorded_at is set). realTricycles now
    // also includes tricycles that have NEVER reported (kept visible, marked Offline/No Signal per
    // the fleet's offline-status requirement) — GPS-reporting KPIs must keep counting only units
    // that genuinely have telemetry, so this denominator's meaning doesn't silently shift.
    const reportingTricycles = useMemo(() => realTricycles.filter(t => t.recorded_at), [realTricycles]);
    const realComplianceRate = reportingTricycles.length > 0
        ? Math.round(((reportingTricycles.length - realViolations.length) / reportingTricycles.length) * 100)
        : 100;

    const todayName = WEEKDAY_NAMES[new Date().getDay()] || 'Monday';
    const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';
    const todayCodingRule = !isWeekend ? CODING_SCHEDULE[todayName] : null;

    // Average speed of whatever is currently on screen — a presentational figure, not an
    // enforcement statistic, so it's fine for it to include simulated units when the toggle is on.
    const averageSpeed = useMemo(() => {
        if (!displayedTricycles.length) return 0;
        const totalSpeed = displayedTricycles.reduce((acc, t) => acc + (t.speed_kmh || 0), 0);
        return Math.round(totalSpeed / displayedTricycles.length);
    }, [displayedTricycles]);

    const registeredFleet = stats.active_fleet ?? realTricycles.length;

    // Real fleet status composition — reuses the exact same status categories
    // DashboardController::index() already assigns per tricycle (compliant / coding_no_operation /
    // violator / offline), just tallied for display. Real data only, by construction (realTricycles).
    const STATUS_META = {
        compliant:           { label: 'Compliant',        color: '#10B981' },
        coding_no_operation: { label: 'Restricted Today',  color: '#F59E0B' },
        violator:            { label: 'Violation',         color: '#E11D48' },
        offline:             { label: 'Offline / No Signal', color: '#94A3B8' },
    };
    const statusBreakdown = useMemo(() => {
        const counts = { compliant: 0, coding_no_operation: 0, violator: 0, offline: 0 };
        realTricycles.forEach((t) => {
            if (counts[t.status] !== undefined) counts[t.status] += 1;
        });
        return Object.keys(STATUS_META).map((key) => ({ key, count: counts[key], ...STATUS_META[key] }));
    }, [realTricycles]);

    // Filter units for the sidebar list — searches across whatever is currently displayed.
    const filteredUnits = useMemo(() => {
        let list = displayedTricycles;
        if (selectedToda !== 'all') {
            list = list.filter(t => (t.toda === selectedToda || t.todaName === selectedToda));
        }
        if (unitSearch.trim() !== '') {
            const q = unitSearch.toLowerCase().trim();
            list = list.filter(t =>
                (t.plate || '').toLowerCase().includes(q) ||
                (t.coding_scheme && t.coding_scheme.toLowerCase().includes(q)) ||
                (t.operator && t.operator.toLowerCase().includes(q)) ||
                (t.toda && t.toda.toLowerCase().includes(q))
            );
        }
        return list;
    }, [displayedTricycles, selectedToda, unitSearch]);

    // TODA Groups definition — uses dynamically managed todaZones when available, with fallback defaults
    const todaGroups = useMemo(() => {
        if (todaZones && todaZones.length > 0) {
            return todaZones.map((z) => ({
                id: z.id,
                name: z.name,
                code: z.code,
                terminal_name: z.terminal_name,
            }));
        }
        return [
            { name: 'TODA Bucana' },
            { name: 'TODA Brgy. 10' },
            { name: 'TODA Brgy. 8' },
            { name: 'TODA Brgy. 4' },
        ];
    }, [todaZones]);

    return (
        <TrivoraLayout title="Live Monitoring" role="TMO Supervisor">
            <Head title="Live Fleet Monitoring | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. HEADER & LIVE OPERATIONAL STRIP
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Live Command Center</span>
                    </div>
                    <h1 className="mt-1.5 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Live Fleet Monitoring
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Real-time GPS tracking and color coding compliance for tricycles operating in Nasugbu.
                    </p>
                </div>

                {/* Right: Simulation Toggle + Clock & Active Day Ticker */}
                <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                        <button
                            type="button"
                            onClick={() => setSimulationEnabled(v => !v)}
                            title="Show frontend-only test units for single-device UI testing. Never touches real GPS/violation data."
                            className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors ${
                                simulationEnabled
                                    ? 'border-[#1D2542]/20 bg-[#1D2542]/[0.06] text-[#1D2542]'
                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <Radio size={14} strokeWidth={2.2} />
                            <span className="hidden sm:inline">Simulation</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                simulationEnabled ? 'bg-[#1D2542] text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {simulationEnabled ? 'On' : 'Off'}
                            </span>
                        </button>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.09] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <Clock size={18} strokeWidth={2.2} />
                        </div>
                        <div>
                            <p className="font-mono text-xl font-extrabold leading-none text-slate-900 tabular-nums tracking-tight">
                                {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                            </p>
                            <p className="mt-1.5 text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                                <span className="font-bold text-slate-700">{codingInfo.day}</span>
                                <span className="text-slate-300">·</span>
                                {codingInfo.restricted !== 'None' ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700">
                                        Restricted: <strong className="text-[#1D2542]">{codingInfo.restricted}</strong>
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">
                                        No Coding Rest Day
                                    </span>
                                )}
                            </p>
                        </div>
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
                            {simulationEnabled && ` · +${simulatedTricycles.length} simulated on map`}
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

                {/* ─ Card 3: Franchise Zones (TODA Route Coverage) ─ */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
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
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                4
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Active TODAs
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Designated TODA route network
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">LGU District:</span>
                        <span className="text-xs font-bold text-[#1D2542]">Nasugbu Central</span>
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
                    <div className="relative h-[500px] sm:h-[600px] w-full overflow-hidden rounded-xl">
                        <TricycleMap
                            tricycles={displayedTricycles}
                            todaZones={todaZones}
                            selectedToda={selectedToda}
                            onSelectToda={(todaId) => {
                                setSelectedTodaId(todaId);
                                setSelectedUnitId(null);
                            }}
                            selectedTodaId={selectedTodaId}
                            selectedUnitId={selectedUnitId}
                            onSelectUnit={(unitId) => {
                                setSelectedUnitId(unitId);
                                if (unitId) setSelectedTodaId(null);
                            }}
                        />
                    </div>
                </div>

                {/* ── RIGHT DOCKED: SAAS TELEMETRY CONSOLE (4 COLS) ── */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white flex flex-col h-[520px] sm:h-[616px] ${CARD_SHADOW}`}>

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

                            <button
                                type="button"
                                onClick={() => setActiveTab('toda')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === 'toda'
                                        ? 'bg-[#1D2542] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                                }`}
                            >
                                <Navigation size={13} />
                                <span>TODA</span>
                                <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                                    activeTab === 'toda' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {todaGroups.length}
                                </span>
                            </button>
                        </div>

                        {/* ── TAB 1: LIVE UNITS ROSTER ── */}
                        {activeTab === 'units' && (
                            <div className="flex flex-col flex-1 min-h-0">
                                {/* Search Filter Box */}
                                <div className="p-3 border-b border-slate-100 bg-white shrink-0">
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Filter by plate, coding #, or driver..."
                                            value={unitSearch}
                                            onChange={(e) => setUnitSearch(e.target.value)}
                                            className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#1D2542] focus:ring-1 focus:ring-[#1D2542]"
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
                                </div>

                                {/* Scrollable Units List */}
                                <div className="flex-1 overflow-y-auto p-2.5 divide-y divide-slate-100/80 space-y-1">
                                    {filteredUnits.length > 0 ? (
                                        filteredUnits.map((unit) => {
                                            const isSelected = selectedUnitId === unit.id;
                                            const isSimulated = unit.source === 'simulated';
                                            const isOffline = !isSimulated && !unit.is_online;
                                            const lastUpdateLabel = isSimulated
                                                ? 'Just now'
                                                : !unit.recorded_at
                                                    ? 'No Signal'
                                                    : (formatElapsed(unit.recorded_at, currentTime) || unit.last_seen || 'Unknown');

                                            return (
                                                <div
                                                    key={unit.id}
                                                    onClick={() => setSelectedUnitId(unit.id)}
                                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-[#1D2542] bg-slate-50 shadow-xs'
                                                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50/60'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            {isSimulated && (
                                                                <span className="rounded px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider border border-dashed border-slate-300 text-slate-500">
                                                                    Sim
                                                                </span>
                                                            )}
                                                            <span className="font-mono text-xs font-extrabold text-slate-900">
                                                                {unit.plate}
                                                            </span>
                                                        </div>
                                                        <span className="font-mono text-xs font-extrabold text-[#1D2542]">
                                                            {unit.speed_kmh != null ? `${unit.speed_kmh} km/h` : '—'}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                                                        <span className="truncate max-w-[160px] font-medium text-slate-700">
                                                            {unit.operator}
                                                        </span>
                                                        <span className="text-[10.5px] font-semibold text-slate-500">
                                                            {unit.toda}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between text-[10.5px] border-t border-slate-100 pt-1.5">
                                                        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${isSimulated ? 'bg-slate-400' : isOffline ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                                                            {isSimulated ? 'Simulation' : isOffline ? 'Offline' : 'GPS Active'}
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
                                            {realTricycles.length === 0 && !simulationEnabled ? (
                                                <>
                                                    No real GPS signals yet. Turn on Simulation above to test the
                                                    monitoring interface with sample units.
                                                </>
                                            ) : (
                                                <>No units matching "{unitSearch}"</>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── TAB 2: ACTIVE INCIDENTS FEED (real data only — simulation never appears here) ── */}
                        {activeTab === 'alerts' && (
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                                {realViolations.length > 0 ? (
                                    realViolations.map((v) => (
                                        <div
                                            key={v.id}
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
                                                    onClick={() => setSelectedUnitId(v.id)}
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

                        {/* ── TAB 3: TODA GROUPS (real data only) ── */}
                        {activeTab === 'toda' && (
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
                                <p className="text-[11px] text-slate-500 mb-1">
                                    Active tricycles and compliance rate per municipal TODA group:
                                </p>

                                {todaGroups.map((g) => {
                                    const total = reportingTricycles.filter(t => (t.toda === g.name || t.todaName === g.name || (g.code && t.toda === g.code))).length;
                                    const violCount = realViolations.filter(t => (t.toda === g.name || t.todaName === g.name || (g.code && t.toda === g.code))).length;
                                    const pct = total > 0 ? Math.round(((total - violCount) / total) * 100) : 100;
                                    const isSelected = selectedTodaId === g.id;

                                    return (
                                        <div
                                            key={g.id || g.name}
                                            onClick={() => {
                                                setSelectedTodaId(g.id);
                                                setSelectedUnitId(null);
                                            }}
                                            className={`rounded-xl border transition-all cursor-pointer p-3.5 shadow-2xs ${
                                                isSelected
                                                    ? 'border-[#1D2542] bg-slate-100/90 ring-1 ring-[#1D2542]'
                                                    : 'border-slate-200/90 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-800 block">{g.name}</span>
                                                    {g.terminal_name && (
                                                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                            <MapPin size={10} className="text-slate-400 shrink-0" />
                                                            <span>{g.terminal_name}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="rounded bg-white px-2 py-0.5 text-[10.5px] font-bold text-slate-700 border border-slate-200 shadow-3xs font-mono">
                                                    {total} active
                                                </span>
                                            </div>

                                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                                                <span>Compliance Rate</span>
                                                <span className="font-bold text-[#1D2542]">{pct}%</span>
                                            </div>

                                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500 bg-[#1D2542]"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10.5px]">
                                                <span className="text-slate-400 font-medium">Terminal Pin</span>
                                                <span className="font-bold text-[#1D2542] inline-flex items-center gap-0.5">
                                                    Locate on Map <ChevronRight size={11} />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs text-slate-700 leading-relaxed">
                                    <strong>Municipal Ordinance Enforcement:</strong> Trivora tracks coding compliance across managed TODA zones.
                                </div>

                                <Link
                                    href="/tmo/toda"
                                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#1D2542] hover:bg-slate-50 shadow-xs transition-colors"
                                >
                                    <MapPin size={13} />
                                    <span>Manage TODA Terminals</span>
                                    <ChevronRight size={13} className="text-slate-400" />
                                </Link>
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
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <BarChart3 size={16} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-[13.5px] font-bold text-slate-900">Fleet Status Breakdown</h3>
                                <p className="text-[11px] text-slate-400">Current status of every registered unit, right now</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-600">
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
                                            Violation Log &amp; Citations
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

