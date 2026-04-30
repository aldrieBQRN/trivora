import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Bike,
    Ban,
    Wifi,
    Wallet,
    Calendar,
    BatteryMedium,
    ShieldCheck,
    ExternalLink,
    Info,
    CircleDashed,
    FileText,
    MapPin,
    Wrench,
    ClipboardCheck
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   DRIVER PORTAL — Unified Dashboard Layout
   Matches TMO / Treasurer / BPLO Enterprise Token System
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

/* ── Reset & Root ── */
.op-root { font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 80px; max-width: 1440px; margin: 0 auto; }
.op-root *, .op-root *::before, .op-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Page Heading ── */
.op-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: #4F5BCB;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}
.op-eyebrow::before {
    content: '';
    width: 24px;
    height: 2px;
    background: #4F5BCB;
    border-radius: 4px;
    flex-shrink: 0;
}
.op-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -.02em;
    color: #1C2340;
    line-height: 1.1;
}
.op-subtitle {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #5A6488;
    margin-top: 6px;
}

/* ── Top Bar ── */
.op-topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 32px;
}
.op-topbar-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

/* ── Time & Coding Badges (From TMO) ── */
.op-badge-dark {
  background: #1C2340; color: #FFFFFF;
  padding: 12px 20px; border-radius: 14px;
  display: flex; flex-direction: column; align-items: center;
  min-width: 140px;
  box-shadow: 0 4px 18px rgba(28,35,64,.18);
}
.op-badge-dark-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #FFFFFF; margin-bottom: 5px;
}
.op-badge-dark-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px; font-weight: 800; letter-spacing: .06em;
  color: #FFFFFF; line-height: 1;
}
.op-time-block {
  text-align: right;
  padding: 0 16px;
  border-left: 1px solid rgba(28,35,64,.1);
}
.op-time-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px; font-weight: 700; letter-spacing: -.01em;
  color: #1C2340; line-height: 1; margin-bottom: 5px;
  font-variant-numeric: tabular-nums;
}
.op-time-day {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #1C2340;
}

/* ── TMO-Style Premium KPI Grid ── */
.op-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 32px;
}
@media (max-width: 1199px) { .op-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .op-kpi-grid { grid-template-columns: 1fr; } }

.op-kpi {
    background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F9 100%);
    border: 1px solid rgba(79,91,203,.12);
    border-radius: 16px;
    padding: 20px 22px;
    position: relative;
    overflow: hidden;
    transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    min-width: 0;
}
.op-kpi:hover {
    transform: translateY(-2px);
    border-color: rgba(79,91,203,.25);
    box-shadow: 0 8px 24px rgba(79,91,203,.12);
}
.op-kpi::after {
    content: '';
    position: absolute; bottom: 0; right: 0;
    width: 80px; height: 80px; border-radius: 50%;
    background: radial-gradient(circle, rgba(79,91,203,.08) 0%, transparent 70%);
    pointer-events: none;
}
.op-kpi-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 16px;
}
.op-kpi-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.op-kpi-icon-stone  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.op-kpi-icon-rose   { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);  color: #FFFFFF; }
.op-kpi-icon-emerald{ background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.op-kpi-icon-amber  { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }

.op-kpi-trend {
    font-family: 'DM Sans', sans-serif;
    font-size: 8.5px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase;
    border-radius: 6px; padding: 4px 10px;
    transition: all .2s ease;
}
.op-kpi-trend-live {
    color: #059669;
    background: linear-gradient(135deg, rgba(5,150,105,.1) 0%, rgba(5,150,105,.05) 100%);
    border: 1px solid rgba(5,150,105,.25);
}
.op-kpi-trend-synced {
    color: #4F5BCB;
    background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.05) 100%);
    border: 1px solid rgba(79,91,203,.25);
}
.op-kpi-trend-detecting {
    color: #F59E0B;
    background: linear-gradient(135deg, rgba(245,158,11,.1) 0%, rgba(245,158,11,.05) 100%);
    border: 1px solid rgba(245,158,11,.25);
}
.op-kpi-trend-alert {
    color: #DC2626;
    background: linear-gradient(135deg, rgba(220,38,38,.1) 0%, rgba(220,38,38,.05) 100%);
    border: 1px solid rgba(220,38,38,.25);
}

.op-kpi-val-row {
    display: flex; align-items: baseline; gap: 6px;
    margin-bottom: 4px; line-height: 1;
}
.op-kpi-val {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 30px; font-weight: 800; letter-spacing: -.025em;
    color: #1C2340;
}
.op-kpi-unit {
    font-family: 'DM Sans', sans-serif;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: #1C2340;
}
.op-kpi-lbl {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: #8A96BC;
}

/* ── Main Content Grid ── */
.op-main-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr 0.8fr;
    gap: 24px;
    align-items: start;
}
.op-main-grid > * { min-width: 0; }
@media (max-width: 1399px) {
    .op-main-grid { grid-template-columns: 1.4fr 1fr; }
    .op-hide-tablet { display: none !important; }
}
@media (max-width: 1024px) {
    .op-main-grid { grid-template-columns: 1fr; }
}

/* ── Generic Cards ── */
.op-card {
    background: #FFFFFF;
    border: 1px solid rgba(28,35,64,.08);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 6px rgba(28,35,64,.03);
    min-width: 0;
    transition: box-shadow .2s, border-color .2s;
}
.op-card:hover {
    border-color: rgba(28,35,64,.14);
    box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.op-card + .op-card { margin-top: 24px; }

.op-card-header {
    padding: 18px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(28,35,64,.06);
    gap: 12px;
    background: rgba(79,91,203,.03);
}
.op-card-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    font-weight: 800;
    color: #1C2340;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.op-card-link {
    font-family: 'DM Sans', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: #4F5BCB;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: .1em;
    transition: color .2s;
    flex-shrink: 0;
}
.op-card-link:hover { color: #1C2340; }

/* ── Detailed Tricycle Profile ── */
.op-trike-profile { padding: 24px; }
.op-trike-header {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 24px; padding-bottom: 24px;
    border-bottom: 1px dashed rgba(28,35,64,.1);
}
.op-trike-avatar {
    width: 56px; height: 56px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.05) 100%);
    color: #4F5BCB;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(79,91,203,.15);
}
.op-trike-body-no { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #1C2340; line-height: 1; margin-bottom: 6px; }
.op-trike-plate { font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 700; color: #5A6488; text-transform: uppercase; letter-spacing: .08em; background: rgba(28,35,64,.04); padding: 4px 8px; border-radius: 6px; display: inline-block; }
.op-trike-status {
    margin-left: auto; display: flex; align-items: center; gap: 6px;
    font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800;
    color: #059669; text-transform: uppercase; letter-spacing: .05em;
    background: rgba(5,150,105,.1); padding: 6px 12px; border-radius: 50px;
    border: 1px solid rgba(5,150,105,.2);
}
.op-trike-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.op-trike-data { display: flex; flex-direction: column; gap: 6px; }
.op-trike-lbl { display: flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; color: #8A96BC; text-transform: uppercase; letter-spacing: .08em; }
.op-trike-val { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600; color: #1C2340; }

/* ── List Items (For Violations) ── */
.op-list-item {
    padding: 16px 24px;
    border-bottom: 1px solid rgba(28,35,64,.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-width: 0;
    transition: background .15s;
}
.op-list-item:last-child { border-bottom: none; }
.op-list-item:hover { background: rgba(237,238,244,.4); }

.op-list-item-left { display: flex; gap: 14px; align-items: center; min-width: 0; flex: 1; }
.op-list-item-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.op-list-item-text { min-width: 0; }
.op-list-item-title { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 700; color: #1C2340; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.op-list-item-sub { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500; color: #8A96BC; margin-top: 2px; }

/* ── Coding Calendar ── */
.op-day-card {
    padding: 10px 14px;
    border-radius: 12px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid rgba(28,35,64,.05);
    background: #FFFFFF;
    gap: 8px;
    transition: all .2s;
}
.op-day-card.active {
    background: rgba(79,91,203,.02);
    border: 1px solid rgba(79,91,203,.2);
    border-left: 3px solid #4F5BCB;
    box-shadow: 0 2px 8px rgba(79,91,203,.08);
}
.op-day-name { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600; color: #3A4570; }
.op-day-tag { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; letter-spacing: .1em; flex-shrink: 0; }
.op-today-chip { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 800; color: #FFFFFF; background: #4F5BCB; padding: 3px 8px; border-radius: 4px; letter-spacing: .1em; flex-shrink: 0; }

/* ── Coding Reminder Box ── */
.op-reminder-box {
    margin-top: 14px;
    padding: 14px 16px;
    background: rgba(217,119,6,.05);
    border-radius: 14px;
    border: 1px solid rgba(217,119,6,.15);
    border-left: 3px solid #D97706;
}
.op-reminder-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 800; color: #92400E; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.op-reminder-body { font-size: 11px; font-weight: 500; color: #78350F; line-height: 1.5; }

/* ── Tracker Card (dark gradient) ── */
.op-tracker-card {
    background: linear-gradient(135deg, #1C2340 0%, #2A3B5C 100%);
    border: none; color: #FFFFFF; border-radius: 16px; overflow: hidden; min-width: 0; box-shadow: 0 8px 24px rgba(28,35,64,.15);
}
.op-tracker-inner { padding: 28px; }
.op-tracker-eyebrow { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; opacity: .7; letter-spacing: .15em; text-transform: uppercase; margin-bottom: 10px; }
.op-tracker-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 20px; line-height: 1.3; }
.op-progress-label { display: flex; justify-content: space-between; font-family: 'Inter', sans-serif; font-size: 10.5px; margin-bottom: 8px; font-weight: 600; color: rgba(255,255,255,.8); }
.op-progress-label span:last-child { color: #FFFFFF; font-weight: 700; }
.op-progress-track { height: 6px; background: rgba(255,255,255,.15); border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
.op-progress-fill { height: 100%; width: 50%; background: #059669; border-radius: 10px; }
.op-tracker-stage { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #FCD34D; font-weight: 600; }
.op-tracker-btn { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; width: 100%; padding: 12px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); border-radius: 12px; color: #FFFFFF; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; transition: background .2s; }
.op-tracker-btn:hover { background: rgba(255,255,255,.2); }

/* ── Device Card ── */
.op-device-card {
    margin-top: 24px; padding: 28px; text-align: center; background: #FFFFFF; border-radius: 16px; border: 1px solid rgba(28,35,64,.08); box-shadow: 0 1px 6px rgba(28,35,64,.03); min-width: 0;
}
.op-device-icon { width: 52px; height: 52px; background: rgba(79,91,203,.08); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #4F5BCB; }
.op-device-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 800; color: #1C2340; margin-bottom: 6px; }
.op-device-body { font-size: 11.5px; font-weight: 500; color: #5A6488; line-height: 1.6; margin-bottom: 20px; }
.op-device-btn { width: 100%; padding: 12px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.15); border-radius: 12px; color: #1C2340; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .2s; }
.op-device-btn:hover { background: rgba(28,35,64,.04); border-color: #1C2340; }

/* ── Violation settle button ── */
.op-settle-btn {
    padding: 8px 16px; background: rgba(220,38,38,.08); color: #DC2626; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; border: 1px solid rgba(220,38,38,.15); flex-shrink: 0; white-space: nowrap; transition: all .2s;
}
.op-settle-btn:hover { background: #DC2626; color: #FFFFFF; }

/* ── Pulse animation ── */
.pulse-live { width: 7px; height: 7px; background: #059669; border-radius: 50%; flex-shrink: 0; animation: pulse-live 2s infinite; }
@keyframes pulse-live { 0% { box-shadow: 0 0 0 0 rgba(5,150,105,.7); } 70% { box-shadow: 0 0 0 6px rgba(5,150,105,0); } 100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); } }

/* ── Empty state ── */
.op-empty { padding: 40px 0; text-align: center; }
.op-empty-icon { margin: 0 auto 12px; opacity: .8; display: block; }
.op-empty-text { font-family: 'Inter', sans-serif; font-size: 12.5px; color: #8A96BC; font-weight: 500; }
.op-calendar-body { padding: 20px 24px; }
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

export default function OperatorDashboard({ operator, stats, tricycles, recentViolations }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const codingInfo = getCodingDetails();

    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const codingRules = [
        { day: 'Monday',    color: 'Green',     hex: '#059669', bg: 'rgba(5,150,105,0.1)'  },
        { day: 'Tuesday',   color: 'Yellow',    hex: '#D97706', bg: 'rgba(217,119,6,0.1)'  },
        { day: 'Wednesday', color: 'Blue',      hex: '#2563EB', bg: 'rgba(37,99,235,0.1)'  },
        { day: 'Thursday',  color: 'Red',       hex: '#DC2626', bg: 'rgba(220,38,38,0.1)'  },
        { day: 'Friday',    color: 'White',     hex: '#5A6488', bg: 'rgba(28,35,64,0.05)', text: '#5A6488' },
        { day: 'Saturday',  color: 'No Coding', hex: '#8A96BC', bg: '#FFFFFF', text: '#8A96BC' },
        { day: 'Sunday',    color: 'No Coding', hex: '#8A96BC', bg: '#FFFFFF', text: '#8A96BC' },
    ];

    return (
        <OperatorLayout title="Dashboard" operatorName={operator.name}>
            <Head title="Driver Dashboard | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="op-root">

                {/* ── HEADER ── */}
                <header className="op-topbar">
                    <div>
                        <p className="op-eyebrow">Driver Portal</p>
                        <h1 className="op-title">Welcome, {operator.name.split(' ')[0]}!</h1>
                        <p className="op-subtitle">
                            Overview of your tricycle for{' '}
                            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="op-topbar-actions">
                        <div className="op-badge-dark">
                            <span className="op-badge-dark-sub">Restricted Plates</span>
                            <span className="op-badge-dark-val">{codingInfo.restricted}</span>
                        </div>
                        <div className="op-time-block">
                            <p className="op-time-val">
                                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                            </p>
                            <p className="op-time-day">{codingInfo.day}</p>
                        </div>
                    </div>
                </header>

                {/* ── KPI GRID ── */}
                <section className="op-kpi-grid">
                    <KpiCard title="Assigned Unit" value="1" unit="Unit" icon={Bike} iconClass="op-kpi-icon-stone" trend="Synced" trendClass="op-kpi-trend-synced" />
                    <KpiCard title="IoT Tracker Status" value="1" unit="Online" icon={Wifi} iconClass="op-kpi-icon-emerald" trend="Live" trendClass="op-kpi-trend-live" />
                    <KpiCard title="Unsettled Fines" value={`₱${stats.pending_fine_amount || '0.00'}`} unit="PHP" icon={Ban} iconClass="op-kpi-icon-rose" trend="Action Needed" trendClass="op-kpi-trend-alert" />
                    <KpiCard title="Compliance Rate" value="100%" unit="Rate" icon={ShieldCheck} iconClass="op-kpi-icon-amber" trend="Optimal" trendClass="op-kpi-trend-live" />
                </section>

                {/* ── MAIN CONTENT GRID ── */}
                <main className="op-main-grid">

                    {/* ── Column 1: Detailed Tricycle Profile & Violations ── */}
                    <div>
                        {/* Enhanced Tricycle Profile Card */}
                        <div className="op-card">
                            <div className="op-card-header">
                                <h2 className="op-card-title">
                                    <CircleDashed size={18} color="#4F5BCB" />
                                    My Tricycle Profile
                                </h2>
                                <Link href={route('operator.fleet')} className="op-card-link">Manage Unit</Link>
                            </div>

                            {tricycles.slice(0, 1).map((trike) => (
                                <div key={trike.id} className="op-trike-profile">
                                    <div className="op-trike-header">
                                        <div className="op-trike-avatar">
                                            <Bike size={28} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="op-trike-body-no">{trike.body_number || 'N/A'}</h3>
                                            <span className="op-trike-plate">{trike.plate_number || 'N/A'}</span>
                                        </div>
                                        <div className="op-trike-status">
                                            <div className="pulse-live" /> Connected
                                        </div>
                                    </div>

                                    <div className="op-trike-grid">
                                        <div className="op-trike-data">
                                            <span className="op-trike-lbl"><Wrench size={10} /> Make & Model</span>
                                            <span className="op-trike-val">Honda TMX 125 Alpha</span>
                                        </div>
                                        <div className="op-trike-data">
                                            <span className="op-trike-lbl"><MapPin size={10} /> Route / Zone</span>
                                            <span className="op-trike-val">Poblacion Zone (TODA A)</span>
                                        </div>
                                        <div className="op-trike-data">
                                            <span className="op-trike-lbl"><FileText size={10} /> MTOP Franchise</span>
                                            <span className="op-trike-val" style={{ color: '#059669' }}>Valid (Oct 12, 2026)</span>
                                        </div>
                                        <div className="op-trike-data">
                                            <span className="op-trike-lbl"><ClipboardCheck size={10} /> TMO Application</span>
                                            <span className="op-trike-val" style={{ color: '#059669' }}>Approved</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Active Violations */}
                        <div className="op-card">
                            <div className="op-card-header">
                                <h2 className="op-card-title">
                                    <AlertTriangle size={18} color="#DC2626" />
                                    Active Violations
                                </h2>
                            </div>
                            <div>
                                {recentViolations.length > 0 ? recentViolations.map((v) => (
                                    <div key={v.id} className="op-list-item">
                                        <div className="op-list-item-left">
                                            <div
                                                className="op-list-item-icon"
                                                style={{ background: 'rgba(220,38,38,.08)', color: '#DC2626' }}
                                            >
                                                <Ban size={16} strokeWidth={2.5} />
                                            </div>
                                            <div className="op-list-item-text">
                                                <p className="op-list-item-title">Color Coding Breach</p>
                                                <p className="op-list-item-sub">{v.date} &bull; Unit {v.body_number}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={route('operator.violations.pay', { id: v.id })}
                                            className="op-settle-btn"
                                        >
                                            SETTLE NOW
                                        </Link>
                                    </div>
                                )) : (
                                    <div className="op-empty">
                                        <ShieldCheck size={36} color="#059669" className="op-empty-icon" />
                                        <p className="op-empty-text">Excellent! You have no active violations.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Column 2: Coding Calendar ── */}
                    <div>
                        <div className="op-card">
                            <div className="op-card-header">
                                <h2 className="op-card-title">
                                    <Calendar size={18} color="#F59E0B" />
                                    Coding Schedule
                                </h2>
                            </div>
                            <div className="op-calendar-body">
                                {codingRules.map((rule) => (
                                    <div
                                        key={rule.day}
                                        className={`op-day-card${rule.day === todayName ? ' active' : ''}`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                            <span className="op-day-name">{rule.day}</span>
                                            {rule.day === todayName && (
                                                <span className="op-today-chip">TODAY</span>
                                            )}
                                        </div>
                                        <span
                                            className="op-day-tag"
                                            style={{ background: rule.bg, color: rule.text || rule.hex }}
                                        >
                                            {rule.color}
                                        </span>
                                    </div>
                                ))}
                                <div className="op-reminder-box">
                                    <h4 className="op-reminder-title">
                                        <Info size={14} color="#D97706" /> System Notice
                                    </h4>
                                    <p className="op-reminder-body">
                                        Automated IoT enforcement is active in the Poblacion zone.
                                        Please be aware of your restricted days to avoid digital fines.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Column 3: App Tracker + Device ── */}
                    <div className="op-hide-tablet">
                        <div className="op-tracker-card">
                            <div className="op-tracker-inner">
                                <p className="op-tracker-eyebrow">Franchise Tracker</p>
                                <h3 className="op-tracker-title">Renewal: NSB-123</h3>
                                <div>
                                    <div className="op-progress-label">
                                        <span>Approval Progress</span>
                                        <span>50%</span>
                                    </div>
                                    <div className="op-progress-track">
                                        <div className="op-progress-fill" />
                                    </div>
                                </div>
                                <div className="op-tracker-stage">
                                    <Clock size={14} /> Physical Inspection Stage
                                </div>
                                <Link href={route('operator.mtop')} className="op-tracker-btn">
                                    TRACK STATUS <ExternalLink size={12} />
                                </Link>
                            </div>
                        </div>

                        <div className="op-device-card">
                            <div className="op-device-icon">
                                <BatteryMedium size={24} strokeWidth={2} />
                            </div>
                            <h4 className="op-device-title">GPS / IoT Device</h4>
                            <p className="op-device-body">
                                Ensure your IoT module battery is above 20% to keep zone tracking active.
                            </p>
                            <button className="op-device-btn">Manage Connectivity</button>
                        </div>
                    </div>

                </main>
            </div>
        </OperatorLayout>
    );
}

/* ── SUB-COMPONENT: KPI CARD ── */
function KpiCard({ title, value, unit, icon: Icon, iconClass, trend, trendClass }) {
    return (
        <div className="op-kpi">
            <div className="op-kpi-top">
                <div className={`op-kpi-icon ${iconClass}`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <span className={`op-kpi-trend ${trendClass}`}>{trend}</span>
            </div>
            <div className="op-kpi-val-row">
                <span className="op-kpi-val">{value}</span>
                <span className="op-kpi-unit">{unit}</span>
            </div>
            <p className="op-kpi-lbl">{title}</p>
        </div>
    );
}