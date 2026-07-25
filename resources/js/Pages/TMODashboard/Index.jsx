import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import TricycleMap from '@/Components/TricycleMap';
import {
    ShieldAlert, Users, Navigation, Ban,
    AlertCircle, CheckCircle2, BarChart3,
    Play, Pause, Zap, AlertTriangle, Radio, ChevronRight
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

import routeA from '../../data/routeA.json';
import routeB from '../../data/routeB.json';
import routeC from '../../data/routeC.json';
import routeD from '../../data/routeD.json';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.td-root { font-family: 'Inter', sans-serif; color: #1C2340; max-width: 1500px; margin: 0 auto; padding-bottom: 48px; }
.td-root *, .td-root *::before, .td-root *::after { box-sizing: border-box; }
.td-eyebrow { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #1C2340; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.td-eyebrow::before { content: ''; width: 18px; height: 1.5px; background: #4F5BCB; border-radius: 2px; }
.td-live-pip { width: 7px; height: 7px; border-radius: 50%; background: #059669; animation: tdPulse 1.4s ease-in-out infinite; flex-shrink: 0; }
@keyframes tdPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.8); } }
.td-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800; letter-spacing: -.025em; color: #1C2340; line-height: 1; }
.td-topbar { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.td-badge-dark { background: #1C2340; color: #FFFFFF; padding: 12px 20px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; min-width: 140px; box-shadow: 0 4px 18px rgba(28,35,64,.18); }
.td-badge-dark-sub { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #FFFFFF; margin-bottom: 5px; }
.td-badge-dark-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: .06em; color: #FFFFFF; line-height: 1; }
.td-time-block { text-align: right; padding: 0 16px; border-left: 1px solid rgba(28,35,64,.1); }
.td-time-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -.01em; color: #1C2340; line-height: 1; margin-bottom: 5px; font-variant-numeric: tabular-nums; }
.td-time-day { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #1C2340; }

.td-sim-bar { background: linear-gradient(135deg, #1C2340 0%, #2A345B 100%); color: #FFFFFF; padding: 14px 20px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; box-shadow: 0 8px 24px rgba(28,35,64,.18); flex-wrap: wrap; }
.td-sim-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 8px; letter-spacing: .02em; }
.td-sim-sub { font-family: 'Inter', sans-serif; font-size: 11px; color: #94A3B8; margin-top: 2px; }
.td-sim-controls { display: flex; align-items: center; gap: 10px; }
.td-sim-btn { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .15s; }
.td-sim-btn-play { background: #059669; color: #FFFFFF; }
.td-sim-btn-play:hover { background: #047857; }
.td-sim-btn-pause { background: #DC2626; color: #FFFFFF; }
.td-sim-btn-pause:hover { background: #B91C1C; }
.td-sim-btn-trigger { background: rgba(245,158,11,.15); color: #F59E0B; border: 1px solid rgba(245,158,11,.3); }
.td-sim-btn-trigger:hover { background: rgba(245,158,11,.25); }

.td-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 32px; }
@media (max-width: 1280px) { .td-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .td-kpi-grid { grid-template-columns: 1fr; } }
.td-kpi { background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F9 100%); border: 1px solid rgba(79,91,203,.12); border-radius: 14px; padding: 20px 22px; transition: box-shadow .2s, border-color .2s, transform .2s; position: relative; overflow: hidden; }
.td-kpi:hover { border-color: rgba(79,91,203,.25); box-shadow: 0 8px 24px rgba(79,91,203,.12); transform: translateY(-2px); }
.td-kpi::after { content: ''; position: absolute; bottom: 0; right: 0; width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle, rgba(79,91,203,.08) 0%, transparent 70%); pointer-events: none; }
.td-kpi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.td-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.td-kpi-icon-stone  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.td-kpi-icon-rose   { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);  color: #FFFFFF; }
.td-kpi-icon-emerald{ background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.td-kpi-icon-amber  { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }
.td-kpi-trend { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; border-radius: 6px; padding: 4px 10px; transition: all .2s ease; }
.td-kpi-trend-live { color: #DC2626; background: linear-gradient(135deg, rgba(220,38,38,.1) 0%, rgba(220,38,38,.05) 100%); border: 1px solid rgba(220,38,38,.25); }
.td-kpi-trend-detecting { color: #F59E0B; background: linear-gradient(135deg, rgba(245,158,11,.1) 0%, rgba(245,158,11,.05) 100%); border: 1px solid rgba(245,158,11,.25); }
.td-kpi-trend-optimal { color: #059669; background: linear-gradient(135deg, rgba(5,150,105,.1) 0%, rgba(5,150,105,.05) 100%); border: 1px solid rgba(5,150,105,.25); }
.td-kpi-trend-synced { color: #4F5BCB; background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.05) 100%); border: 1px solid rgba(79,91,203,.25); }
.td-kpi-val-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; line-height: 1; }
.td-kpi-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800; letter-spacing: -.025em; color: #1C2340; }
.td-kpi-unit { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #1C2340; }
.td-kpi-unit-alert { color: #DC2626; }
.td-kpi-lbl { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #1C2340; line-height: 1; }
.td-grid { display: grid; grid-template-columns: 1fr 380px; gap: 28px; align-items: start; }
@media (max-width: 1280px) { .td-grid { grid-template-columns: 1fr; } }
.td-col-left  { display: flex; flex-direction: column; gap: 24px; }
.td-col-right { display: flex; flex-direction: column; gap: 24px; }
.td-card { background: #FFFFFF; border: 1px solid rgba(79,91,203,.12); border-radius: 18px; box-shadow: 0 2px 8px rgba(79,91,203,.08); overflow: hidden; transition: box-shadow .2s, border-color .2s; }
.td-card:hover { border-color: rgba(79,91,203,.2); box-shadow: 0 8px 24px rgba(79,91,203,.12); }
.td-card-body { padding: 24px; }
.td-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid rgba(79,91,203,.1); }
.td-card-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.td-card-icon-dark   { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%); color: #FFFFFF; }
.td-card-icon-rose   { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #FFFFFF; }
.td-card-icon-muted  { background: rgba(79,91,203,.08); color: #4F5BCB; }
.td-card-title { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #1C2340; }
.td-map-card { background: #FFFFFF; border: 1px solid rgba(79,91,203,.12); border-radius: 18px; box-shadow: 0 2px 8px rgba(79,91,203,.08); padding: 8px; height: 500px; position: relative; transition: box-shadow .2s, border-color .2s; }
.td-map-card:hover { border-color: rgba(79,91,203,.2); box-shadow: 0 8px 24px rgba(79,91,203,.12); }
.td-map-overlay { position: absolute; top: 20px; left: 20px; z-index: 1000; background: rgba(255,255,255,.95); backdrop-filter: blur(16px); border: 1px solid rgba(79,91,203,.15); border-radius: 10px; padding: 8px 14px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(79,91,203,.15); }
.td-map-overlay-label { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #1C2340; }
.td-map-inner { border-radius: 12px; overflow: hidden; width: 100%; height: 100%; position: relative; z-index: 0; }
.td-chart-wrap { height: 200px; width: 100%; }
.td-toda-list { display: flex; flex-direction: column; gap: 10px; }
.td-toda-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(237,238,244,.5); border: 1px solid rgba(28,35,64,.07); border-radius: 11px; transition: background .15s, border-color .15s; }
.td-toda-row:hover { background: #FFFFFF; border-color: rgba(28,35,64,.12); }
.td-toda-left { display: flex; align-items: center; gap: 10px; }
.td-toda-pip { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.td-toda-name { font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #1C2340; }
.td-toda-right { display: flex; align-items: baseline; gap: 6px; }
.td-toda-count-ok    { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #1C2340; line-height: 1; }
.td-toda-count-alert { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #DC2626; line-height: 1; }
.td-toda-sub { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8A96BC; }
.td-feed { display: flex; flex-direction: column; gap: 16px; }
.td-feed-empty { padding: 40px 0; text-align: center; font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #8A96BC; line-height: 1.8; }
.td-incident { display: flex; gap: 12px; }
.td-incident-pip { margin-top: 5px; flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; background: #DC2626; animation: tdPulse 1.4s ease-in-out infinite; }
.td-incident-body { flex: 1; }
.td-incident-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
.td-incident-id { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: -.01em; color: #1C2340; line-height: 1; margin-bottom: 4px; }
.td-incident-driver { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5A6488; }
.td-incident-time { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #1C2340; flex-shrink: 0; }
.td-incident-msg { font-family: 'Inter', sans-serif; font-size: 10.5px; font-weight: 500; color: #5A6488; line-height: 1.5; border-left: 2px solid rgba(220,38,38,.15); padding-left: 8px; margin-top: 6px; text-transform: uppercase; letter-spacing: .04em; }
`;

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
    const [currentTime, setCurrentTime] = useState(new Date());
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

        // TODA Brgy. 14 (Green)
        { id: 'TRV-GPS-997', plate: 'EEE-7890', operator: 'Ramon Santos', toda: 'TODA Brgy. 14', routeKey: 'brgy14', status: 'compliant', speed_kmh: 31 },
        { id: 'TRV-GPS-909', plate: 'NSG-4001', operator: 'Joaquin Torres', toda: 'TODA Brgy. 14', routeKey: 'brgy14', status: 'compliant', speed_kmh: 26 },
        { id: 'TRV-GPS-910', plate: 'NSG-4002', operator: 'Lando Gutierrez', toda: 'TODA Brgy. 14', routeKey: 'brgy14', status: 'compliant', speed_kmh: 33 },
        { id: 'TRV-GPS-911', plate: 'NSG-4003', operator: 'Manuel Naval', toda: 'TODA Brgy. 14', routeKey: 'brgy14', status: 'compliant', speed_kmh: 24 },
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
        { name: 'TODA Brgy. 14', color: '#059669' }, // Green
    ];

    return (
        <TrivoraLayout title="Fleet Command" role="TMO Supervisor">
            <Head title="TMO Dashboard" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="td-root">
                {/* ── TOPBAR ── */}
                <div className="td-topbar">
                    <div>
                        <p className="td-eyebrow">
                            <span className="td-live-pip" />
                            Active Enforcement & Telematics Monitor
                        </p>
                        <h1 className="td-title">Coding & Route Monitor</h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="td-badge-dark">
                            <span className="td-badge-dark-sub">Restricted Plates</span>
                            <span className="td-badge-dark-val">{codingInfo.restricted}</span>
                        </div>
                        <div className="td-time-block">
                            <p className="td-time-val">
                                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                            </p>
                            <p className="td-time-day">{codingInfo.day}</p>
                        </div>
                    </div>
                </div>

                {/* ── SIMULATION & ROUTE VIOLATION CONTROL BAR ── */}
                <div className="td-sim-bar">
                    <div>
                        <div className="td-sim-title">
                            <Radio size={16} color="#059669" className="animate-pulse" />
                            TODA Route Telematics & 25m Buffer Simulator
                        </div>
                        <div className="td-sim-sub">
                            Live GPS monitoring with 25m tolerance corridor geofencing (Bucana, Brgy. 10, Brgy. 8, Brgy. 14).
                        </div>
                    </div>

                    <div className="td-sim-controls">
                        <button
                            type="button"
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`td-sim-btn ${isSimulating ? 'td-sim-btn-pause' : 'td-sim-btn-play'}`}
                        >
                            {isSimulating ? <><Pause size={14} /> Pause Sim</> : <><Play size={14} /> Resume Sim</>}
                        </button>

                        <div style={{ display: 'flex', background: 'rgba(255,255,255,.1)', padding: 3, borderRadius: 8, gap: 2 }}>
                            {[1, 2, 5].map(spd => (
                                <button
                                    key={spd}
                                    type="button"
                                    onClick={() => setSimSpeed(spd)}
                                    style={{
                                        border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                                        cursor: 'pointer',
                                        background: simSpeed === spd ? '#FFFFFF' : 'transparent',
                                        color: simSpeed === spd ? '#1C2340' : '#94A3B8',
                                    }}
                                >
                                    {spd}x
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleTriggerCodingViolation}
                            className="td-sim-btn td-sim-btn-trigger"
                        >
                            <AlertTriangle size={14} /> Coding Breach
                        </button>

                        <button
                            type="button"
                            onClick={handleTriggerRouteStray}
                            style={{ background: 'rgba(147,51,234,.18)', color: '#C084FC', border: '1px solid rgba(147,51,234,.35)' }}
                            className="td-sim-btn"
                        >
                            <Zap size={14} /> Route Stray (&gt;25m)
                        </button>
                    </div>
                </div>

                <div className="td-kpi-grid">
                    <KpiCard title="Tricycles on Road" value={tricycles.length} unit="Active" icon={Users} iconClass="td-kpi-icon-stone" trend="Live" />
                    <KpiCard title="Illegal Movement" value={violations.length} unit="Violators" icon={Ban} iconClass="td-kpi-icon-rose" trend="Detecting" unitAlert={violations.length > 0} />
                    <KpiCard title="Compliance Rate" value={`${complianceRate}%`} unit="Safe" icon={CheckCircle2} iconClass="td-kpi-icon-emerald" trend="Optimal" />
                    <KpiCard title="Active TODA Routes" value="4" unit="Groups" icon={Navigation} iconClass="td-kpi-icon-amber" trend="Synced" />
                </div>

                <div className="td-grid">
                    <div className="td-col-left">
                        <div className="td-map-card">
                            <div className="td-map-inner">
                                <TricycleMap tricycles={tricycles} routes={{ bucana: routeD, brgy10: routeC, brgy8: routeA, brgy14: routeB }} />
                            </div>
                        </div>

                        <div className="td-card">
                            <div className="td-card-body">
                                <div className="td-card-header">
                                    <div className="td-card-icon td-card-icon-muted">
                                        <BarChart3 size={16} strokeWidth={1.8} />
                                    </div>
                                    <span className="td-card-title">Peak Violation Periods</span>
                                </div>
                                <div className="td-chart-wrap">
                                    <ViolationTrendChart />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="td-col-right">
                        <div className="td-card">
                            <div className="td-card-body">
                                <div className="td-card-header">
                                    <div className="td-card-icon td-card-icon-dark">
                                        <Navigation size={16} />
                                    </div>
                                    <span className="td-card-title">TODA Compliance</span>
                                </div>
                                <div className="td-toda-list">
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
                        </div>

                        <div className="td-card" style={{ flex: 1 }}>
                            <div className="td-card-body">
                                <div className="td-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="td-card-icon td-card-icon-rose">
                                            <AlertCircle size={16} />
                                        </div>
                                        <span className="td-card-title">Violation Feed</span>
                                    </div>
                                    <Link
                                        href={route('tmo.violations')}
                                        style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#4F5BCB',
                                            textDecoration: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                            letterSpacing: '.04em'
                                        }}
                                    >
                                        See All <ChevronRight size={13} />
                                    </Link>
                                </div>
                                <div className="td-feed" style={{ overflowY: 'auto', maxHeight: 360 }}>
                                    {simViolations.length > 0 ? (
                                        simViolations.slice(0, 3).map((inc, i) => (
                                            <IncidentEntry
                                                key={i}
                                                id={inc.id}
                                                plate={inc.plate}
                                                operator={inc.operator}
                                                type={inc.type}
                                                message={inc.message}
                                                time={inc.time}
                                            />
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
                                        <div className="td-feed-empty">
                                            No Active Violations<br />Detected
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TrivoraLayout>
    );
}

function KpiCard({ title, value, unit, icon: Icon, iconClass, trend, unitAlert }) {
    const getTrendClass = (trendText) => {
        const lowerTrend = trendText.toLowerCase();
        if (lowerTrend === 'live') return 'td-kpi-trend-live';
        if (lowerTrend === 'detecting') return 'td-kpi-trend-detecting';
        if (lowerTrend === 'optimal') return 'td-kpi-trend-optimal';
        if (lowerTrend === 'synced') return 'td-kpi-trend-synced';
        return 'td-kpi-trend-live';
    };

    return (
        <div className="td-kpi">
            <div className="td-kpi-top">
                <div className={`td-kpi-icon ${iconClass}`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <span className={`td-kpi-trend ${getTrendClass(trend)}`}>{trend}</span>
            </div>
            <div className="td-kpi-val-row">
                <span className="td-kpi-val">{value}</span>
                <span className={`td-kpi-unit${unitAlert ? ' td-kpi-unit-alert' : ''}`}>{unit}</span>
            </div>
            <p className="td-kpi-lbl">{title}</p>
        </div>
    );
}

function TODARow({ name, color, count }) {
    const isAlert = count > 0;
    return (
        <div className="td-toda-row">
            <div className="td-toda-left">
                <span className="td-toda-pip" style={{ background: color || '#4F5BCB', width: 10, height: 10 }} />
                <span className="td-toda-name">{name}</span>
            </div>
            <div className="td-toda-right">
                <span className={isAlert ? 'td-toda-count-alert' : 'td-toda-count-ok'}>{count}</span>
                <span className="td-toda-sub">Violations</span>
            </div>
        </div>
    );
}

function IncidentEntry({ id, plate, operator, type, message, time }) {
    const isRoute = type === 'route';
    const pipColor = isRoute ? '#9333EA' : '#DC2626';

    return (
        <div className="td-incident">
            <span className="td-incident-pip" style={{ background: pipColor }} />
            <div className="td-incident-body">
                <div className="td-incident-top">
                    <div>
                        <p className="td-incident-id" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Plate: {plate}
                            <span style={{
                                fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: 4,
                                background: isRoute ? 'rgba(147,51,234,.12)' : 'rgba(220,38,38,.12)',
                                color: isRoute ? '#9333EA' : '#DC2626'
                            }}>
                                {isRoute ? 'Route Violation' : 'Coding Breach'}
                            </span>
                        </p>
                        <p className="td-incident-driver">{operator} • {id}</p>
                    </div>
                    <span className="td-incident-time">{time || 'Live'}</span>
                </div>
                <p className="td-incident-msg" style={{ borderLeftColor: pipColor }}>{message}</p>
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
                        <stop offset="5%"  stopColor="#4F5BCB" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#4F5BCB" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(28,35,64,.06)" />
                <XAxis dataKey="time" axisLine={true} axisLineStyle={{ stroke: 'rgba(28,35,64,.1)', strokeWidth: 1 }} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' }} label={{ value: 'Time', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                <YAxis axisLine={true} axisLineStyle={{ stroke: 'rgba(28,35,64,.1)', strokeWidth: 1 }} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' }} label={{ value: 'Violations', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(28,35,64,.08)', boxShadow: '0 10px 24px rgba(28,35,64,.1)', fontSize: 11, fontFamily: 'Inter', }} labelStyle={{ fontWeight: 700, color: '#1C2340', marginBottom: 4 }} />
                <Area type="monotone" dataKey="v" stroke="#4F5BCB" strokeWidth={2.5} fillOpacity={1} fill="url(#tdAreaFill)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}