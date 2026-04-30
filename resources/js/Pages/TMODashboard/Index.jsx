import React, { useState, useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import TricycleMap from '@/Components/TricycleMap';
import {
    ShieldAlert, Users, Navigation, Ban,
    AlertCircle, CheckCircle2, BarChart3,
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
.td-live-pip { width: 7px; height: 7px; border-radius: 50%; background: #DC2626; animation: tdPulse 1.4s ease-in-out infinite; flex-shrink: 0; }
@keyframes tdPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.8); } }
.td-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800; letter-spacing: -.025em; color: #1C2340; line-height: 1; }
.td-topbar { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
.td-badge-dark { background: #1C2340; color: #FFFFFF; padding: 12px 20px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; min-width: 140px; box-shadow: 0 4px 18px rgba(28,35,64,.18); }
.td-badge-dark-sub { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #FFFFFF; margin-bottom: 5px; }
.td-badge-dark-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: .06em; color: #FFFFFF; line-height: 1; }
.td-time-block { text-align: right; padding: 0 16px; border-left: 1px solid rgba(28,35,64,.1); }
.td-time-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -.01em; color: #1C2340; line-height: 1; margin-bottom: 5px; font-variant-numeric: tabular-nums; }
.td-time-day { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #1C2340; }
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
.td-toda-pip-ok      { background: #059669; }
.td-toda-pip-alert   { background: #DC2626; }
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
    const geoJsonRoutes = { A: routeA, B: routeB, C: routeC, D: routeD };

    const paths = useMemo(() => ({
        A: extractRouteCoordinates(routeA),
        B: extractRouteCoordinates(routeB),
        C: extractRouteCoordinates(routeC),
        D: extractRouteCoordinates(routeD),
    }), []);

    const [tricycles, setTricycles] = useState(() => {
        return initialTricycles.map((trike, index) => {
            const todaLetter = trike.toda.match(/TODA ([A-D])/)?.[1] || 'A';
            const myPath = paths[todaLetter] || [];
            const startIdx = myPath.length > 0 ? (index * 37) % myPath.length : 0;
            return {
                ...trike,
                todaLetter,
                routeIndex: startIdx,
                lat: myPath.length > 0 ? myPath[startIdx][0] : trike.lat,
                lng: myPath.length > 0 ? myPath[startIdx][1] : trike.lng,
            };
        });
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setTricycles(curr =>
                curr.map(trike => {
                    if (trike.status === 'coding_no_operation') return trike;
                    const myPath = paths[trike.todaLetter] || [];
                    if (myPath.length === 0) return trike;
                    const nextIndex = (trike.routeIndex + 1) % myPath.length;
                    return {
                        ...trike,
                        routeIndex: nextIndex,
                        lat: myPath[nextIndex][0],
                        lng: myPath[nextIndex][1],
                    };
                })
            );
        }, 1000);
        return () => clearInterval(interval);
    }, [paths]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const violations = tricycles.filter(t => t.status === 'violator');
    const complianceRate = tricycles.length > 0
        ? Math.round(((tricycles.length - violations.length) / tricycles.length) * 100)
        : 100;

    // We map letters to actual Barangay labels for the UI
    const todaGroups = [
        { letter: 'A', label: 'Brgy. 2' },
        { letter: 'B', label: 'Brgy. 10' },
        { letter: 'C', label: 'Brgy. 11' },
        { letter: 'D', label: 'Bucana' }
    ];

    return (
        <TrivoraLayout title="Fleet Command" role="TMO Supervisor">
            <Head title="TMO Dashboard" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="td-root">
                <div className="td-topbar">
                    <div>
                        <p className="td-eyebrow">
                            <span className="td-live-pip" />
                            Active Enforcement Mode
                        </p>
                        <h1 className="td-title">Coding Monitor</h1>
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

                <div className="td-kpi-grid">
                    <KpiCard title="Tricycles on Road" value={tricycles.length} unit="Active" icon={Users} iconClass="td-kpi-icon-stone" trend="Live" />
                    <KpiCard title="Illegal Movement" value={violations.length} unit="Violators" icon={Ban} iconClass="td-kpi-icon-rose" trend="Detecting" unitAlert={violations.length > 0} />
                    <KpiCard title="Compliance Rate" value={`${complianceRate}%`} unit="Safe" icon={CheckCircle2} iconClass="td-kpi-icon-emerald" trend="Optimal" />
                    <KpiCard title="Active TODA Routes" value="4" unit="Groups" icon={Navigation} iconClass="td-kpi-icon-amber" trend="Synced" />
                </div>

                <div className="td-grid">
                    <div className="td-col-left">
                        <div className="td-map-card">
                            <div className="td-map-overlay">
                                <ShieldAlert size={13} color="#DC2626" />
                                <span className="td-map-overlay-label">Enforcement Tracker</span>
                            </div>
                            <div className="td-map-inner">
                                <TricycleMap tricycles={tricycles} routes={geoJsonRoutes} />
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
                                            key={g.letter}
                                            name={`TODA ${g.label}`}
                                            count={tricycles.filter(t => t.todaLetter === g.letter && t.status === 'violator').length}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="td-card" style={{ flex: 1 }}>
                            <div className="td-card-body">
                                <div className="td-card-header">
                                    <div className="td-card-icon td-card-icon-rose">
                                        <AlertCircle size={16} />
                                    </div>
                                    <span className="td-card-title">Violation Feed</span>
                                </div>
                                <div className="td-feed" style={{ overflowY: 'auto', maxHeight: 360 }}>
                                    {violations.length > 0 ? violations.map(trike => (
                                        <IncidentEntry
                                            key={trike.id}
                                            id={trike.id}
                                            plate={trike.plate}
                                            operator={trike.operator}
                                            message={`Coding restriction breach. Restricted plate ending in ${String(trike.plate).slice(-1)}.`}
                                        />
                                    )) : (
                                        <div className="td-feed-empty">
                                            No Coding Violations<br />Detected
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

function TODARow({ name, count }) {
    const isAlert = count > 0;
    return (
        <div className="td-toda-row">
            <div className="td-toda-left">
                <span className={`td-toda-pip ${isAlert ? 'td-toda-pip-alert' : 'td-toda-pip-ok'}`} />
                <span className="td-toda-name">{name}</span>
            </div>
            <div className="td-toda-right">
                <span className={isAlert ? 'td-toda-count-alert' : 'td-toda-count-ok'}>{count}</span>
                <span className="td-toda-sub">Violations</span>
            </div>
        </div>
    );
}

function IncidentEntry({ id, plate, operator, message }) {
    return (
        <div className="td-incident">
            <span className="td-incident-pip" />
            <div className="td-incident-body">
                <div className="td-incident-top">
                    <div>
                        <p className="td-incident-id">Plate: {plate}</p>
                        <p className="td-incident-driver">{operator} • {id}</p>
                    </div>
                    <span className="td-incident-time">Now</span>
                </div>
                <p className="td-incident-msg">{message}</p>
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