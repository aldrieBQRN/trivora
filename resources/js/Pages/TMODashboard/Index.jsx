import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import TricycleMap from '@/Components/TricycleMap';
import {
    Users, Navigation, Ban, AlertCircle, CheckCircle2, BarChart3,
    Play, Pause, Zap, AlertTriangle, Radio, ChevronRight,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatusBadge } from '@/Components/TMO';

import routeA from '../../data/routeA.json';
import routeB from '../../data/routeB.json';
import routeC from '../../data/routeC.json';
import routeD from '../../data/routeD.json';

const getCodingDetails = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
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

export default function Dashboard({ initialTricycles = [] }) {
    const [currentTime] = useState(new Date());
    const codingInfo = getCodingDetails();

    // TODA GeoJSON Route Coordinate Sets
    const todaRoutes = useMemo(() => ({
        bucana: extractRouteCoordinates(routeD),
        brgy10: extractRouteCoordinates(routeC),
        brgy8:  extractRouteCoordinates(routeA),
        brgy14: extractRouteCoordinates(routeB),
    }), []);

    // Initial Simulated Units (16 active units distributed across all 4 TODA routes)
    const defaultUnits = useMemo(() => [
        // TODA Bucana (Violet)
        { id: 'TRV-GPS-992', plate: 'AAA-1234', operator: 'Pedro Ramos', toda: 'TODA Bucana', routeKey: 'bucana', status: 'compliant', speed_kmh: 24 },
        { id: 'TRV-GPS-998', plate: 'CCC-9012', operator: 'Eduardo Villanueva', toda: 'TODA Bucana', routeKey: 'bucana', status: 'compliant', speed_kmh: 26 },
        { id: 'TRV-GPS-901', plate: 'NSG-1001', operator: 'Alejandro Diaz', toda: 'TODA Bucana', routeKey: 'bucana', status: 'compliant', speed_kmh: 28 },
        { id: 'TRV-GPS-902', plate: 'NSG-1002', operator: 'Benjamin Corpuz', toda: 'TODA Bucana', routeKey: 'bucana', status: 'compliant', speed_kmh: 22 },

        // TODA Brgy. 10 (Orange)
        { id: 'TRV-GPS-995', plate: 'DDD-3456', operator: 'Mario Clara', toda: 'TODA Brgy. 10', routeKey: 'brgy10', status: 'compliant', speed_kmh: 28 },
        { id: 'TRV-GPS-903', plate: 'NSG-2001', operator: 'Carlo Gomez', toda: 'TODA Brgy. 10', routeKey: 'brgy10', status: 'compliant', speed_kmh: 30 },
        { id: 'TRV-GPS-904', plate: 'NSG-2002', operator: 'Daniel Mercado', toda: 'TODA Brgy. 10', routeKey: 'brgy10', status: 'compliant', speed_kmh: 25 },
        { id: 'TRV-GPS-905', plate: 'NSG-2003', operator: 'Efren Agoncillo', toda: 'TODA Brgy. 10', routeKey: 'brgy10', status: 'compliant', speed_kmh: 27 },

        // TODA Brgy. 8 (Blue)
        { id: 'TRV-GPS-996', plate: 'BBB-5678', operator: 'Juan Bautista', toda: 'TODA Brgy. 8', routeKey: 'brgy8', status: 'compliant', speed_kmh: 22 },
        { id: 'TRV-GPS-906', plate: 'NSG-3001', operator: 'Gabriel Reyes', toda: 'TODA Brgy. 8', routeKey: 'brgy8', status: 'compliant', speed_kmh: 31 },
        { id: 'TRV-GPS-907', plate: 'NSG-3002', operator: 'Hernan Castillo', toda: 'TODA Brgy. 8', routeKey: 'brgy8', status: 'compliant', speed_kmh: 29 },
        { id: 'TRV-GPS-908', plate: 'NSG-3003', operator: 'Ignazio Alvarez', toda: 'TODA Brgy. 8', routeKey: 'brgy8', status: 'compliant', speed_kmh: 23 },

        // TODA Brgy. 4 (Green)
        { id: 'TRV-GPS-997', plate: 'EEE-7890', operator: 'Ramon Santos', toda: 'TODA Brgy. 4', routeKey: 'brgy14', status: 'compliant', speed_kmh: 31 },
        { id: 'TRV-GPS-909', plate: 'NSG-4001', operator: 'Joaquin Torres', toda: 'TODA Brgy. 4', routeKey: 'brgy14', status: 'compliant', speed_kmh: 26 },
        { id: 'TRV-GPS-910', plate: 'NSG-4002', operator: 'Lando Gutierrez', toda: 'TODA Brgy. 4', routeKey: 'brgy14', status: 'compliant', speed_kmh: 33 },
        { id: 'TRV-GPS-911', plate: 'NSG-4003', operator: 'Manuel Naval', toda: 'TODA Brgy. 4', routeKey: 'brgy14', status: 'compliant', speed_kmh: 24 },
    ], []);

    // Count units per TODA route key to stagger initial route positions
    const routeCounters = {};

    // Initialize tricycles with staggered route positions
    const [tricycles, setTricycles] = useState(() => {
        return defaultUnits.map((unit) => {
            const rKey = unit.routeKey || 'bucana';
            const routeCoords = todaRoutes[rKey] || todaRoutes.bucana;
            const countOnRoute = (routeCounters[rKey] || 0);
            routeCounters[rKey] = countOnRoute + 1;

            const totalPoints = routeCoords.length || 1;
            const startIdx = Math.floor((countOnRoute * totalPoints) / 4) % totalPoints;
            const pos = routeCoords[startIdx] || [14.0725, 120.6355];

            return {
                ...unit,
                routeIndex: startIdx,
                lat: pos[0],
                lng: pos[1],
            };
        });
    });

    // Simulation Controls State
    const [isSimulating, setIsSimulating] = useState(true);
    const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 5x
    const [simViolations, setSimViolations] = useState([]);

    // Live Telematics Position Simulator Effect
    useEffect(() => {
        if (!isSimulating) return;

        const intervalMs = Math.max(300, Math.floor(1500 / simSpeed));
        const timer = setInterval(() => {
            setTricycles(prevList => prevList.map(trike => {
                const rKey = trike.routeKey || 'bucana';
                const coords = todaRoutes[rKey];
                if (!coords || coords.length === 0) return trike;

                const nextIdx = (trike.routeIndex + 1) % coords.length;
                const [nextLat, nextLng] = coords[nextIdx];
                const speed = Math.floor(Math.random() * 15) + 20; // 20 - 35 km/h

                return {
                    ...trike,
                    routeIndex: nextIdx,
                    lat: nextLat,
                    lng: nextLng,
                    speed_kmh: speed,
                };
            }));
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isSimulating, simSpeed, todaRoutes]);

    // Trigger Coding violation test event
    const handleTriggerCodingViolation = () => {
        if (tricycles.length === 0) return;
        const targetIdx = Math.floor(Math.random() * tricycles.length);
        const target = tricycles[targetIdx];

        setTricycles(prev => prev.map((t, idx) => idx === targetIdx ? { ...t, status: 'violator' } : t));

        const newIncident = {
            id: target.id,
            plate: target.plate,
            operator: target.operator,
            toda: target.toda,
            type: 'coding',
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            message: `CODING BREACH: Unit ${target.plate} (${target.id}) operating on restricted coding day (${codingInfo.restricted}).`,
        };

        setSimViolations(prev => [newIncident, ...prev]);
    };

    // Trigger Route Deviation test event (>25m Stray)
    const handleTriggerRouteStray = () => {
        if (tricycles.length === 0) return;
        const targetIdx = Math.floor(Math.random() * tricycles.length);
        const target = tricycles[targetIdx];
        const strayOffset = 0.00065; // approx 72 meters off route

        setTricycles(prev => prev.map((t, idx) => idx === targetIdx ? {
            ...t,
            status: 'route_violator',
            lat: t.lat + strayOffset,
            lng: t.lng + strayOffset,
        } : t));

        const newIncident = {
            id: target.id,
            plate: target.plate,
            operator: target.operator,
            toda: target.toda,
            type: 'route',
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            message: `ROUTE VIOLATION: Unit ${target.plate} (${target.id}) strayed 72m outside designated ${target.toda} corridor (Exceeds 25m buffer).`,
        };

        setSimViolations(prev => [newIncident, ...prev]);
    };

    const violations = tricycles.filter(t => t.status === 'violator' || t.status === 'route_violator');
    const complianceRate = tricycles.length > 0
        ? Math.round(((tricycles.length - violations.length) / tricycles.length) * 100)
        : 100;

    // Official TODA Scope with designated color mappings
    const todaGroups = [
        { name: 'TODA Bucana',   color: '#7C3AED' }, // Violet
        { name: 'TODA Brgy. 10', color: '#F59E0B' }, // Orange
        { name: 'TODA Brgy. 8',  color: '#4F5BCB' }, // Blue
        { name: 'TODA Brgy. 4',  color: '#059669' }, // Green
    ];

    return (
        <TrivoraLayout title="Fleet Command" role="TMO Supervisor">
            <Head title="TMO Dashboard" />

            {/* ── TOPBAR ── */}
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1.5 flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-widest text-tmo-ink">
                        <span className="h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-emerald-600" />
                        Active Enforcement &amp; Telematics Monitor
                    </p>
                    <h1 className="text-2xl font-extrabold tracking-tight text-tmo-ink sm:text-[30px]">Coding &amp; Route Monitor</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex min-w-[140px] flex-col items-center rounded-2xl bg-tmo-primary px-5 py-3 text-white shadow-lg shadow-tmo-primary/20">
                        <span className="mb-1 text-[8px] font-bold uppercase tracking-widest">Restricted Plates</span>
                        <span className="text-xl font-extrabold tracking-wide">{codingInfo.restricted}</span>
                    </div>
                    <div className="border-l border-tmo-border pl-4 text-right">
                        <p className="mb-1 text-xl font-bold tabular-nums leading-none text-tmo-ink">
                            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-tmo-ink">{codingInfo.day}</p>
                    </div>
                </div>
            </div>

            {/* ── SIMULATION & ROUTE VIOLATION CONTROL BAR ── */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-tmo-primary px-5 py-3.5 text-white shadow-lg shadow-tmo-primary/20">
                <div>
                    <div className="flex items-center gap-2 text-[13px] font-extrabold">
                        <Radio size={16} className="animate-pulse text-emerald-400" />
                        TODA Route Telematics &amp; 25m Buffer Simulator
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/60">
                        Live GPS monitoring with 25m tolerance corridor geofencing (Bucana, Brgy. 10, Brgy. 8, Brgy. 4).
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold transition-colors ${
                            isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                    >
                        {isSimulating ? <><Pause size={14} /> Pause Sim</> : <><Play size={14} /> Resume Sim</>}
                    </button>

                    <div className="flex gap-0.5 rounded-lg bg-white/10 p-0.5">
                        {[1, 2, 5].map(spd => (
                            <button
                                key={spd}
                                type="button"
                                onClick={() => setSimSpeed(spd)}
                                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                    simSpeed === spd ? 'bg-white text-tmo-primary' : 'text-white/50 hover:text-white'
                                }`}
                            >
                                {spd}x
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleTriggerCodingViolation}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/15 px-3.5 py-2 text-[11px] font-bold text-amber-300 transition-colors hover:bg-amber-400/25"
                    >
                        <AlertTriangle size={14} /> Coding Breach
                    </button>

                    <button
                        type="button"
                        onClick={handleTriggerRouteStray}
                        className="flex items-center gap-1.5 rounded-lg border border-purple-400/35 bg-purple-500/20 px-3.5 py-2 text-[11px] font-bold text-purple-300 transition-colors hover:bg-purple-500/30"
                    >
                        <Zap size={14} /> Route Stray (&gt;25m)
                    </button>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard title="Tricycles on Road" value={tricycles.length} unit="Active" icon={Users} tone="primary" trend="Live" trendVariant="danger" />
                <KpiCard title="Illegal Movement" value={violations.length} unit="Violators" icon={Ban} tone="danger" trend="Detecting" trendVariant="warning" unitAlert={violations.length > 0} />
                <KpiCard title="Compliance Rate" value={`${complianceRate}%`} unit="Safe" icon={CheckCircle2} tone="success" trend="Optimal" trendVariant="success" />
                <KpiCard title="Active TODA Routes" value="4" unit="Groups" icon={Navigation} tone="warning" trend="Synced" trendVariant="info" />
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_380px]">
                <div className="flex flex-col gap-6">
                    <div className="relative h-[500px] rounded-2xl border border-tmo-border bg-tmo-surface p-2 shadow-sm">
                        <div className="relative z-0 h-full w-full overflow-hidden rounded-xl">
                            <TricycleMap tricycles={tricycles} routes={{ bucana: routeD, brgy10: routeC, brgy8: routeA, brgy14: routeB }} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-tmo-border bg-tmo-surface p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-2.5 border-b border-tmo-border pb-4">
                            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-tmo-primarySoft text-tmo-primary">
                                <BarChart3 size={16} strokeWidth={1.8} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-tmo-ink">Peak Violation Periods</span>
                        </div>
                        <div className="h-[200px] w-full">
                            <ViolationTrendChart />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="rounded-2xl border border-tmo-border bg-tmo-surface p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-2.5 border-b border-tmo-border pb-4">
                            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-tmo-primary text-white">
                                <Navigation size={16} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-tmo-ink">TODA Compliance</span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            {todaGroups.map(g => (
                                <TODARow
                                    key={g.name}
                                    name={g.name}
                                    color={g.color}
                                    count={tricycles.filter(t => (t.toda === g.name || t.todaName === g.name) && (t.status === 'violator' || t.status === 'route_violator')).length}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 rounded-2xl border border-tmo-border bg-tmo-surface p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between border-b border-tmo-border pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-red-50 text-red-600">
                                    <AlertCircle size={16} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-tmo-ink">Violation Feed</span>
                            </div>
                            <Link href={route('tmo.violations')} className="flex items-center gap-0.5 text-[11px] font-bold text-tmo-primary">
                                See All <ChevronRight size={13} />
                            </Link>
                        </div>
                        <div className="flex max-h-[360px] flex-col gap-4 overflow-y-auto">
                            {simViolations.length > 0 ? (
                                simViolations.slice(0, 3).map((inc, i) => (
                                    <IncidentEntry key={i} id={inc.id} plate={inc.plate} operator={inc.operator} type={inc.type} message={inc.message} time={inc.time} />
                                ))
                            ) : violations.length > 0 ? (
                                violations.slice(0, 3).map(trike => (
                                    <IncidentEntry
                                        key={trike.id}
                                        id={trike.id}
                                        plate={trike.plate}
                                        operator={trike.operator}
                                        type={trike.status === 'route_violator' ? 'route' : 'coding'}
                                        message={
                                            trike.status === 'route_violator'
                                                ? `ROUTE VIOLATION: Unit ${trike.plate} (${trike.id}) strayed outside designated ${trike.toda} corridor (>25m buffer).`
                                                : `CODING BREACH: Unit ${trike.plate} (${trike.id}) operating on restricted coding day (${codingInfo.restricted}).`
                                        }
                                        time="Live"
                                    />
                                ))
                            ) : (
                                <div className="py-10 text-center text-[9.5px] font-bold uppercase leading-loose tracking-widest text-tmo-subtle">
                                    No Active Violations<br />Detected
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </TrivoraLayout>
    );
}

function KpiCard({ title, value, unit, icon: Icon, tone, trend, trendVariant, unitAlert }) {
    const TONES = {
        primary: 'bg-tmo-primarySoft text-tmo-primary',
        danger: 'bg-red-50 text-red-600',
        success: 'bg-emerald-50 text-emerald-600',
        warning: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="rounded-xl border border-tmo-border bg-tmo-surface p-5">
            <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONES[tone] || TONES.primary}`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <StatusBadge variant={trendVariant}>{trend}</StatusBadge>
            </div>
            <div className="mb-1 flex items-baseline gap-1.5">
                <span className="text-[28px] font-extrabold leading-none tracking-tight text-tmo-ink">{value}</span>
                <span className={`text-[9.5px] font-bold uppercase tracking-wide ${unitAlert ? 'text-red-600' : 'text-tmo-ink'}`}>{unit}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-tmo-muted">{title}</p>
        </div>
    );
}

function TODARow({ name, color, count }) {
    const isAlert = count > 0;
    return (
        <div className="flex items-center justify-between rounded-lg border border-tmo-border bg-tmo-bg px-3.5 py-3">
            <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color || '#4F5BCB' }} />
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-tmo-ink">{name}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className={`text-lg font-extrabold leading-none ${isAlert ? 'text-red-600' : 'text-tmo-ink'}`}>{count}</span>
                <span className="text-[8.5px] font-bold uppercase tracking-wide text-tmo-subtle">Violations</span>
            </div>
        </div>
    );
}

function IncidentEntry({ id, plate, operator, type, message, time }) {
    const isRoute = type === 'route';
    const pipColor = isRoute ? '#9333EA' : '#DC2626';

    return (
        <div className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full" style={{ background: pipColor }} />
            <div className="flex-1">
                <div className="mb-1 flex items-start justify-between">
                    <div>
                        <p className="mb-1 flex items-center gap-1.5 text-sm font-extrabold text-tmo-ink">
                            Plate: {plate}
                            <span
                                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                style={{ background: isRoute ? 'rgba(147,51,234,.12)' : 'rgba(220,38,38,.12)', color: pipColor }}
                            >
                                {isRoute ? 'Route Violation' : 'Coding Breach'}
                            </span>
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-tmo-muted">{operator} • {id}</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-tmo-ink">{time || 'Live'}</span>
                </div>
                <p className="mt-1.5 border-l-2 pl-2 text-[10.5px] font-medium uppercase tracking-wide text-tmo-muted" style={{ borderColor: `${pipColor}26` }}>
                    {message}
                </p>
            </div>
        </div>
    );
}

function ViolationTrendChart() {
    const data = [
        { time: '06:00', v: 2 }, { time: '08:00', v: 8 },
        { time: '10:00', v: 14 }, { time: '12:00', v: 11 },
        { time: '14:00', v: 6 }, { time: '16:00', v: 19 },
        { time: '18:00', v: 7 }, { time: '20:00', v: 3 },
    ];
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
                <defs>
                    <linearGradient id="tdAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1D2542" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#1D2542" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(28,35,64,.06)" />
                <XAxis dataKey="time" axisLine={true} axisLineStyle={{ stroke: 'rgba(28,35,64,.1)', strokeWidth: 1 }} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} label={{ value: 'Time', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 700, fill: '#1D2542' }} />
                <YAxis axisLine={true} axisLineStyle={{ stroke: 'rgba(28,35,64,.1)', strokeWidth: 1 }} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} label={{ value: 'Violations', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 700, fill: '#1D2542' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(28,35,64,.08)', boxShadow: '0 10px 24px rgba(28,35,64,.1)', fontSize: 11 }} labelStyle={{ fontWeight: 700, color: '#1D2542', marginBottom: 4 }} />
                <Area type="monotone" dataKey="v" stroke="#1D2542" strokeWidth={2.5} fillOpacity={1} fill="url(#tdAreaFill)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}
