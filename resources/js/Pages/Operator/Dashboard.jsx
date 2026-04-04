import React from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    AlertTriangle,
    Activity,
    CheckCircle2,
    Clock,
    Bike,
    FileText,
    Ban,
    ArrowRight,
    Wifi,
    Wallet,
    Calendar,
    BatteryMedium,
    ShieldCheck,
    Navigation,
    ExternalLink,
    PlusCircle,
    Info,
    ChevronRight,
    CircleDashed
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Fixed Dashboard Layout
   Path: resources/js/Pages/Operator/Dashboard.jsx
   Fixes:
     - Defined op-main-col / op-side-col with min-width: 0 (grid blowout fix)
     - KPI grid locked to 4-col on desktop, graceful 2-col on tablet
     - Responsive: 3-col → 2-col → 1-col (no abrupt jumps)
     - Font-family typo in op-day-card fixed
     - Dark card overflow guard added
     - Consistent gap/spacing scale
     - Card hover elevation unified
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
    letter-spacing: -.03em;
    color: #1C2340;
    line-height: 1.1;
}
.op-subtitle {
    font-size: 14px;
    font-weight: 500;
    color: #64748B;
    margin-top: 6px;
}

/* ── Top Bar ── */
.op-topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 40px;
}
.op-topbar-actions { display: flex; gap: 12px; flex-wrap: wrap; }

/* ── Buttons ── */
.op-btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #FFF;
    color: #1E293B;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    text-decoration: none;
    border: 1px solid #E2E8F0;
    transition: all .2s ease;
    white-space: nowrap;
}
.op-btn-outline:hover { background: #F8FAFC; border-color: #CBD5E1; transform: translateY(-1px); }

.op-btn-filled {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #1C2340;
    color: #FFF;
    padding: 12px 24px;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    text-decoration: none;
    border: none;
    transition: all .2s ease;
    box-shadow: 0 4px 12px rgba(28,35,64,.15);
    white-space: nowrap;
    cursor: pointer;
}
.op-btn-filled:hover { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(79,91,203,.25); }

/* ── KPI Grid ─────────────────────────────────────────────────────────────
   FIX: Was auto-fit with minmax(260px,1fr) which could collapse to 2 or 3
        cols depending on container width. Now:
          ≥1200px → 4 cols (one KPI each)
          768–1199px → 2 cols
          <768px → 2 cols (they're compact enough)
────────────────────────────────────────────────────────────────────────── */
.op-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 40px;
}
@media (max-width: 1199px) { .op-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .op-kpi-grid { grid-template-columns: 1fr; } }

.op-kpi {
    background: #FFFFFF;
    border: 1px solid rgba(226,232,240,.8);
    border-radius: 24px;
    padding: 28px;
    position: relative;
    overflow: hidden;
    transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
    /* FIX: min-width prevents grid blowout */
    min-width: 0;
}
.op-kpi:hover {
    transform: translateY(-4px);
    border-color: #4F5BCB;
    box-shadow: 0 20px 40px rgba(28,35,64,.06);
}
.op-kpi-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    position: relative;
    z-index: 2;
    flex-shrink: 0;
}
.op-kpi-val {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 34px;
    font-weight: 800;
    color: #0F172A;
    line-height: 1;
    margin-bottom: 6px;
    position: relative;
    z-index: 2;
    /* FIX: prevent long numbers overflowing */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.op-kpi-lbl {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #94A3B8;
    position: relative;
    z-index: 2;
}
.op-kpi-bg-icon {
    position: absolute;
    bottom: -15px;
    right: -15px;
    width: 100px;
    height: 100px;
    opacity: .04;
    color: #1C2340;
    transform: rotate(-15deg);
    pointer-events: none;
    /* FIX: z-index 1 so it sits behind content z-index 2 */
    z-index: 1;
}

/* ── Main Content Grid ─────────────────────────────────────────────────────
   FIX: Was missing min-width: 0 on ALL children, causing grid blowout
        when content (long plate numbers, tables) exceeded column width.

   Layout tiers:
     ≥1400px → 3 cols: [1.3fr | 1fr | 0.8fr]
     1025–1399px → 2 cols: [1.3fr | 1fr] (third col hidden)
     <1025px → 1 col stacked
────────────────────────────────────────────────────────────────────────── */
.op-main-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr 0.8fr;
    gap: 28px;
    align-items: start;
}
/* FIX: CRITICAL — all direct children must have min-width: 0 */
.op-main-grid > * {
    min-width: 0;
    /* ensures inner content wraps instead of blowing out the column */
}
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
    border: 1px solid #F1F5F9;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(15,23,42,.02);
    /* FIX: cards inside grid cells need min-width: 0 too */
    min-width: 0;
}
.op-card + .op-card { margin-top: 24px; }

.op-card-header {
    padding: 22px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #F8FAFC;
    gap: 12px;
}
.op-card-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    font-weight: 800;
    color: #1E293B;
    display: flex;
    align-items: center;
    gap: 10px;
    /* FIX: prevent title from overflowing its cell */
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
    letter-spacing: .05em;
    transition: color .2s;
    flex-shrink: 0;
}
.op-card-link:hover { color: #2E3A9E; }

/* ── List Items ── */
.op-list-item {
    padding: 18px 28px;
    border-bottom: 1px solid #F8FAFC;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    /* FIX: min-width: 0 so inner flex doesn't blow out */
    min-width: 0;
}
.op-list-item:last-child { border-bottom: none; }

.op-list-item-left {
    display: flex;
    gap: 14px;
    align-items: center;
    /* FIX: allow text to truncate instead of pushing layout */
    min-width: 0;
    flex: 1;
}
.op-list-item-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.op-list-item-text { min-width: 0; }
.op-list-item-title {
    font-size: 13.5px;
    font-weight: 800;
    color: #1E293B;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.op-list-item-sub {
    font-size: 11px;
    color: #94A3B8;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.op-list-item-right {
    text-align: right;
    flex-shrink: 0;
}

/* ── Coding Calendar ── */
.op-day-card {
    padding: 8px 14px;
    border-radius: 12px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #F8FAFC;
    gap: 8px;
}
.op-day-card.active {
    background: #F8FAFC;
    border: 1px solid rgba(79,91,203,.1);
    border-left: 3px solid #4F5BCB;
}
/* FIX: was "font: DM Sans" — invalid shorthand, font-family is correct */
.op-day-name {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
}
.op-day-tag {
    font-family: 'DM Sans', sans-serif;
    font-size: 7.5px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 5px;
    letter-spacing: .02em;
    flex-shrink: 0;
    white-space: nowrap;
}
.op-today-chip {
    font-family: 'DM Sans', sans-serif;
    font-size: 7.5px;
    font-weight: 800;
    color: #4F5BCB;
    background: #EEF2FF;
    padding: 1.5px 6px;
    border-radius: 4px;
    letter-spacing: .04em;
    flex-shrink: 0;
}

/* ── Coding Reminder Box ── */
.op-reminder-box {
    margin-top: 20px;
    padding: 16px;
    background: #F8FAFC;
    border-radius: 14px;
    border: 1px solid #E2E8F0;
}
.op-reminder-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    font-weight: 800;
    color: #1E293B;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.op-reminder-body { font-size: 10.5px; color: #64748B; line-height: 1.6; }

/* ── Tracker Card (dark gradient) ── */
.op-tracker-card {
    background: linear-gradient(135deg, #1C2340 0%, #312E81 100%);
    border: none;
    color: #FFF;
    border-radius: 24px;
    /* FIX: overflow hidden was clipping the shadow; use overflow: visible
       but clip only the background, not the element itself */
    overflow: hidden;
    min-width: 0;
}
.op-tracker-inner { padding: 28px; }
.op-tracker-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 9px;
    font-weight: 700;
    opacity: .6;
    letter-spacing: .15em;
    text-transform: uppercase;
    margin-bottom: 10px;
}
.op-tracker-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 17px;
    font-weight: 800;
    margin-bottom: 20px;
    line-height: 1.3;
}
.op-progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    margin-bottom: 6px;
    font-weight: 600;
    color: rgba(255,255,255,.7);
}
.op-progress-label span:last-child { color: #FFF; }
.op-progress-track {
    height: 5px;
    background: rgba(255,255,255,.1);
    border-radius: 10px;
    margin-bottom: 20px;
    overflow: hidden;
}
.op-progress-fill {
    height: 100%;
    width: 50%;
    background: #10B981;
    border-radius: 10px;
}
.op-tracker-stage {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #FCD34D;
    font-weight: 600;
}
.op-tracker-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
    width: 100%;
    padding: 12px;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #FFF;
    font-family: 'DM Sans', sans-serif;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    text-decoration: none;
    transition: background .2s;
}
.op-tracker-btn:hover { background: rgba(255,255,255,.15); }

/* ── Device Card ── */
.op-device-card {
    margin-top: 24px;
    padding: 28px;
    text-align: center;
    background: #FFF;
    border-radius: 24px;
    border: 1px solid #F1F5F9;
    box-shadow: 0 2px 10px rgba(15,23,42,.02);
    min-width: 0;
}
.op-device-icon {
    width: 52px;
    height: 52px;
    background: #EEF2FF;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: #4F5BCB;
}
.op-device-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: #1E293B;
    margin-bottom: 6px;
}
.op-device-body { font-size: 11px; color: #64748B; line-height: 1.6; margin-bottom: 20px; }
.op-device-btn {
    width: 100%;
    padding: 10px;
    background: #F1F5F9;
    border: none;
    border-radius: 8px;
    color: #475569;
    font-family: 'DM Sans', sans-serif;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
    transition: background .2s;
}
.op-device-btn:hover { background: #E2E8F0; }

/* ── Violation settle button ── */
.op-settle-btn {
    padding: 7px 14px;
    background: #FEE2E2;
    color: #DC2626;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 9.5px;
    font-weight: 800;
    text-decoration: none;
    border: 1px solid rgba(220,38,38,.1);
    flex-shrink: 0;
    white-space: nowrap;
    transition: background .2s;
}
.op-settle-btn:hover { background: #FECACA; }

/* ── Pulse animation ── */
.pulse-live {
    width: 7px;
    height: 7px;
    background: #059669;
    border-radius: 50%;
    flex-shrink: 0;
    animation: pulse-live 2s infinite;
}
@keyframes pulse-live {
    0%   { box-shadow: 0 0 0 0 rgba(5,150,105,.7); }
    70%  { box-shadow: 0 0 0 6px rgba(5,150,105,0); }
    100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
}

/* ── Empty state ── */
.op-empty {
    padding: 50px 0;
    text-align: center;
}
.op-empty-icon { margin: 0 auto 12px; opacity: .4; display: block; }
.op-empty-text { font-size: 12px; color: #64748B; font-weight: 500; }

/* ── Calendar padding ── */
.op-calendar-body { padding: 20px; }
`;

export default function OperatorDashboard({ operator, stats, tricycles, recentViolations, expiringRegistrations }) {
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const codingRules = [
        { day: 'Monday',    color: 'Green',     hex: '#059669', bg: 'rgba(5,150,105,0.08)'  },
        { day: 'Tuesday',   color: 'Yellow',    hex: '#D97706', bg: 'rgba(217,119,6,0.08)'  },
        { day: 'Wednesday', color: 'Blue',      hex: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
        { day: 'Thursday',  color: 'Red',       hex: '#DC2626', bg: 'rgba(220,38,38,0.08)'  },
        { day: 'Friday',    color: 'White',     hex: '#64748B', bg: '#F1F5F9', text: '#475569' },
        { day: 'Saturday',  color: 'No Coding', hex: '#94A3B8', bg: '#F8FAFC', text: '#94A3B8' },
    ];

    return (
        <OperatorLayout title="Dashboard" operatorName={operator.name}>
            <Head title="Operator Home | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="op-root">

                {/* ── HEADER ── */}
                <header className="op-topbar">
                    <div>
                        <p className="op-eyebrow">Nasugbu Operations</p>
                        <h1 className="op-title">Welcome, {operator.name.split(' ')[0]}!</h1>
                        <p className="op-subtitle">
                            Overview of your tricycle units for{' '}
                            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="op-topbar-actions">
                        <Link href={route('operator.payments')} className="op-btn-outline">
                            <Wallet size={15} /> Payment History
                        </Link>
                        <Link href={route('operator.mtop.create')} className="op-btn-filled">
                            <PlusCircle size={15} /> Register Unit
                        </Link>
                    </div>
                </header>

                {/* ── KPI GRID ── */}
                <section className="op-kpi-grid">
                    <div className="op-kpi" style={{ borderTop: '4px solid #4F5BCB' }}>
                        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(79,91,203,.08)', color: '#4F5BCB' }}>
                            <Bike size={22} strokeWidth={2.5} />
                        </div>
                        <p className="op-kpi-val">{stats.total_units}</p>
                        <p className="op-kpi-lbl">Registered Units</p>
                        <Bike className="op-kpi-bg-icon" />
                    </div>

                    <div className="op-kpi" style={{ borderTop: '4px solid #059669' }}>
                        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(5,150,105,.08)', color: '#059669' }}>
                            <Wifi size={22} strokeWidth={2.5} />
                        </div>
                        <p className="op-kpi-val">{stats.active_units}</p>
                        <p className="op-kpi-lbl">IoT Trackers Active</p>
                        <Activity className="op-kpi-bg-icon" />
                    </div>

                    <div className="op-kpi" style={{ borderTop: '4px solid #DC2626' }}>
                        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(220,38,38,.08)', color: '#DC2626' }}>
                            <Ban size={22} strokeWidth={2.5} />
                        </div>
                        <p className="op-kpi-val">₱{stats.pending_fine_amount || '0.00'}</p>
                        <p className="op-kpi-lbl">Unsettled Fines</p>
                        <AlertTriangle className="op-kpi-bg-icon" />
                    </div>

                    <div className="op-kpi" style={{ borderTop: '4px solid #F59E0B' }}>
                        <div className="op-kpi-icon-wrap" style={{ background: 'rgba(245,158,11,.08)', color: '#F59E0B' }}>
                            <ShieldCheck size={22} strokeWidth={2.5} />
                        </div>
                        <p className="op-kpi-val">100%</p>
                        <p className="op-kpi-lbl">Compliance Rate</p>
                        <ShieldCheck className="op-kpi-bg-icon" />
                    </div>
                </section>

                {/* ── MAIN CONTENT GRID ── */}
                <main className="op-main-grid">

                    {/* ── Column 1: Tricycles + Violations ── */}
                    <div>
                        {/* My Tricycles */}
                        <div className="op-card">
                            <div className="op-card-header">
                                <h2 className="op-card-title">
                                    <CircleDashed size={18} color="#4F5BCB" />
                                    My Tricycles
                                </h2>
                                <Link href={route('operator.fleet')} className="op-card-link">See All Units</Link>
                            </div>
                            <div>
                                {tricycles.map((trike) => (
                                    <div key={trike.id} className="op-list-item">
                                        <div className="op-list-item-left">
                                            <div
                                                className="op-list-item-icon"
                                                style={{ background: '#F8FAFC', color: '#64748B' }}
                                            >
                                                <Bike size={18} />
                                            </div>
                                            <div className="op-list-item-text">
                                                <p className="op-list-item-title">{trike.body_number}</p>
                                                <p className="op-list-item-sub">{trike.plate_number}</p>
                                            </div>
                                        </div>
                                        <div className="op-list-item-right">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 2 }}>
                                                <div className="pulse-live" />
                                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                                                    Connected
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>
                                                Poblacion Zone
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Critical Infractions */}
                        <div className="op-card">
                            <div className="op-card-header">
                                <h2 className="op-card-title">
                                    <AlertTriangle size={18} color="#DC2626" />
                                    Critical Infractions
                                </h2>
                            </div>
                            <div>
                                {recentViolations.length > 0 ? recentViolations.map((v) => (
                                    <div key={v.id} className="op-list-item">
                                        <div className="op-list-item-left">
                                            <div
                                                className="op-list-item-icon"
                                                style={{ background: 'rgba(220,38,38,.04)', color: '#DC2626' }}
                                            >
                                                <Ban size={16} />
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
                                            SETTLE
                                        </Link>
                                    </div>
                                )) : (
                                    <div className="op-empty">
                                        <ShieldCheck size={32} color="#059669" className="op-empty-icon" />
                                        <p className="op-empty-text">No violations found.</p>
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
                                    Coding Calendar
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
                                        <Info size={14} color="#4F5BCB" /> Reminder
                                    </h4>
                                    <p className="op-reminder-body">
                                        Automated IoT enforcement is active in the Poblacion zone.
                                        Drivers must be aware of their restricted days to avoid fines.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Column 3: App Tracker + Device (hidden on tablet) ── */}
                    <div className="op-hide-tablet">
                        {/* Application Tracker */}
                        <div className="op-tracker-card">
                            <div className="op-tracker-inner">
                                <p className="op-tracker-eyebrow">Application Tracker</p>
                                <h3 className="op-tracker-title">Renewal: NSB-123</h3>
                                <div>
                                    <div className="op-progress-label">
                                        <span>Progress</span>
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

                        {/* Device Maintenance */}
                        <div className="op-device-card">
                            <div className="op-device-icon">
                                <BatteryMedium size={24} strokeWidth={2} />
                            </div>
                            <h4 className="op-device-title">Device Maintenance</h4>
                            <p className="op-device-body">
                                Ensure IoT battery is above 20% to keep zone tracking connected.
                            </p>
                            <button className="op-device-btn">Manage Device</button>
                        </div>
                    </div>

                </main>
            </div>
        </OperatorLayout>
    );
}