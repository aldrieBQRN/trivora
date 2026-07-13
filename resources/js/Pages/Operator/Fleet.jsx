import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    MapPin,
    User,
    Activity,
    Settings,
    Navigation2,
    Wifi,
    Bike,
    FileText,
    BatteryMedium,
    ShieldCheck,
    Wrench
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   DRIVER PORTAL — My Tricycle (Full-Width Enterprise View)
   Path: resources/js/Pages/Operator/Fleet.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.f-root { font-family: 'Inter', sans-serif; color: #1C2340; padding-bottom: 64px; max-width: 1440px; margin: 0 auto; }
.f-root *, .f-root *::before, .f-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.f-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.f-eyebrow::before {
  content: '';
  width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.f-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px; font-weight: 800; letter-spacing: -.02em;
  color: #1C2340; line-height: 1.1;
}
.f-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500;
  color: #5A6488; margin-top: 6px;
}

/* ── TMO Document Queue-Style Stats Grid ── */
.f-stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 16px; margin-top: 32px; margin-bottom: 32px;
}
@media (max-width: 1024px) { .f-stats-grid { grid-template-columns: 1fr; } }

.f-stat {
    background: #fff; border: 1px solid rgba(28,35,64,.08); border-radius: 14px;
    padding: 20px 22px; display: flex; align-items: flex-start; gap: 16px;
    transition: box-shadow .2s, border-color .2s; position: relative; overflow: hidden;
}
.f-stat:hover { border-color: rgba(28,35,64,.14); box-shadow: 0 4px 20px rgba(28,35,64,.07); }
.f-stat::after {
    content: ''; position: absolute; bottom: 0; right: 0; width: 80px; height: 80px;
    border-radius: 50%; background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
    pointer-events: none;
}
.f-stat-icon {
    width: 42px; height: 42px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.f-stat-teal { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; }
.f-stat-blue { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%); color: #FFFFFF; }
.f-stat-amber { background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: #FFFFFF; }

.f-stat-val {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px;
    font-weight: 800; color: #1C2340; line-height: 1;
}
.f-stat-lbl {
    font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
    letter-spacing: .13em; text-transform: uppercase; color: #8A96BC; margin-top: 6px;
}

/* ── Full-Width Single Unit Card ────────────────────────────────────── */
.f-card {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 20px;
    overflow: hidden; box-shadow: 0 4px 20px rgba(28,35,64,.03); transition: transform .2s, box-shadow .2s;
    display: flex; flex-direction: column;
}
.f-card:hover { border-color: rgba(79,91,203,.15); box-shadow: 0 8px 30px rgba(28,35,64,.05); }

.f-card-header { padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed rgba(28,35,64,.08); background: rgba(79,91,203,.02); }
.f-unit-badge { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.05) 100%); color: #4F5BCB; border-radius: 16px; margin-bottom: 16px; border: 1px solid rgba(79,91,203,.15); }
.f-unit-id { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #1C2340; line-height: 1; margin-bottom: 8px; }
.f-unit-model { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500; color: #5A6488; }

.f-status-pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 50px;
    font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
    background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2);
}

/* Changed to 4 columns for full-width monitors */
.f-card-body { padding: 40px; flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
@media (max-width: 1024px) { .f-card-body { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .f-card-body { grid-template-columns: 1fr; } }

.f-info-row { display: flex; align-items: center; gap: 16px; padding: 20px; background: #FFFFFF; border-radius: 14px; border: 1px solid rgba(28,35,64,.08); transition: background .2s, border-color .2s; }
.f-info-row:hover { background: #F9FAFB; border-color: rgba(79,91,203,.2); }

.f-info-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(79,91,203,.08); color: #4F5BCB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.f-info-icon.emerald { background: rgba(5,150,105,.08); color: #059669; }
.f-info-icon.amber { background: rgba(245,158,11,.08); color: #D97706; }

.f-info-text { flex: 1; }
.f-info-label { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-bottom: 6px; }
.f-info-value { font-family: 'Inter', sans-serif; font-size: 14.5px; font-weight: 600; color: #1C2340; display: flex; align-items: center; gap: 8px; }

.f-color-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }

.f-card-footer { padding: 24px 40px; background: #FAFAFC; border-top: 1px solid rgba(28,35,64,.05); display: flex; gap: 16px; }
.f-btn-primary {
    flex: 1; height: 48px; padding: 0 32px; border-radius: 12px; background: #1C2340; color: #FFFFFF;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 10px; border: none; cursor: pointer; transition: all .2s;
    text-decoration: none; box-shadow: 0 4px 14px rgba(28,35,64,.25);
}
.f-btn-primary:hover { background: #2E3A9E; box-shadow: 0 6px 20px rgba(79,91,203,.3); transform: translateY(-1px); color: #FFFFFF; }
.f-btn-secondary {
    height: 48px; padding: 0 24px; border-radius: 12px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.15);
    color: #1C2340; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all .2s; text-decoration: none;
}
.f-btn-secondary:hover { background: #F8F9FC; border-color: rgba(28,35,64,.3); color: #1C2340; }

/* ── Pulse animation ── */
@keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(5,150,105,.7); }
    70%  { box-shadow: 0 0 0 6px rgba(5,150,105,0); }
    100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
}
`;

export default function MyTricycle({ tricycle, auth }) {
    const operatorName = auth?.user?.name || "Driver";

    if (!tricycle) {
        return (
            <OperatorLayout title="My Tricycle" operatorName={operatorName}>
                <Head title="My Tricycle | TRIVORA" />
                <style dangerouslySetInnerHTML={{ __html: CSS }} />
                <div className="f-root">
                    <div>
                        <p className="f-eyebrow">Unit Management</p>
                        <h1 className="f-title">My Tricycle</h1>
                        <p className="f-subtitle">View your assigned tricycle unit details and real-time IoT tracker status.</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '80px 0', background: '#FFF', borderRadius: '24px', border: '1px dashed #E2E8F0', marginTop: 32 }}>
                        <Bike size={48} strokeWidth={1} style={{ margin: '0 auto 16px', color: '#94A3B8', opacity: 0.5 }} />
                        <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: 800, color: '#1E293B' }}>No registered tricycle</p>
                        <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#64748B', marginTop: 4 }}>You don't have an active tricycle unit linked to your account yet.</p>
                        <Link href={route('operator.mtop')} className="f-btn-primary" style={{ display: 'inline-flex', maxWidth: 240, margin: '24px auto 0' }}>
                            View Permit Status
                        </Link>
                    </div>
                </div>
            </OperatorLayout>
        );
    }

    return (
        <OperatorLayout title="My Tricycle" operatorName={operatorName}>
            <Head title="My Tricycle | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="f-root">

                {/* ── PAGE HEADING ── */}
                <div>
                    <p className="f-eyebrow">Unit Management</p>
                    <h1 className="f-title">My Tricycle</h1>
                    <p className="f-subtitle">View your assigned tricycle unit details and real-time IoT tracker status.</p>
                </div>

                {/* ── TMO DOCUMENT QUEUE-STYLE STATS GRID ── */}
                <div className="f-stats-grid">
                    <StatCard
                        value="Online" label="IoT Connection Status"
                        icon={Wifi} iconClass="f-stat-teal" accentColor="#059669"
                    />
                    <StatCard
                        value={tricycle.iotBattery} label="Tracker Battery Level"
                        icon={BatteryMedium} iconClass="f-stat-blue"
                    />
                    <StatCard
                        value={tricycle.mtopStatus} label="Franchise Validity"
                        icon={ShieldCheck} iconClass="f-stat-amber"
                    />
                </div>

                {/* ── FULL-WIDTH TRICYCLE CARD ── */}
                <div className="f-card">

                    {/* Card Header */}
                    <div className="f-card-header">
                        <div>
                            <div className="f-unit-badge">
                                <Bike size={32} strokeWidth={2.5} />
                            </div>
                            <h2 className="f-unit-id">{tricycle.id}</h2>
                            <p className="f-unit-model">{tricycle.makeModel} • Plate: {tricycle.plateNo}</p>
                        </div>
                        <div>
                            <div className="f-status-pill">
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'block', animation: 'pulse 2s infinite' }} />
                                Connected
                            </div>
                        </div>
                    </div>

                    {/* 4-Column Card Body Grid */}
                    <div className="f-card-body">

                        <div className="f-info-row">
                            <div className="f-info-icon"><User size={20} /></div>
                            <div className="f-info-text">
                                <p className="f-info-label">Assigned Driver</p>
                                <p className="f-info-value">{tricycle.driver}</p>
                            </div>
                        </div>

                        <div className="f-info-row">
                            <div className="f-info-icon amber"><MapPin size={20} /></div>
                            <div className="f-info-text">
                                <p className="f-info-label">Color Code & Zone</p>
                                <p className="f-info-value">
                                    <span className="f-color-dot" style={{ background: tricycle.colorHex }}></span>
                                    {tricycle.colorCode} ({tricycle.zone})
                                </p>
                            </div>
                        </div>

                        <div className="f-info-row">
                            <div className="f-info-icon emerald"><FileText size={20} /></div>
                            <div className="f-info-text">
                                <p className="f-info-label">MTOP Franchise Expiry</p>
                                <p className="f-info-value" style={{ color: '#059669' }}>
                                    {tricycle.mtopExpiry}
                                </p>
                            </div>
                        </div>

                        <div className="f-info-row">
                            <div className="f-info-icon"><Activity size={20} /></div>
                            <div className="f-info-text">
                                <p className="f-info-label">IoT Sync Status</p>
                                <p className="f-info-value">
                                    Last synced: {tricycle.lastPing}
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Card Footer Actions */}
                    <div className="f-card-footer">
                        <Link href={route('operator.tracking')} className="f-btn-primary">
                            <Navigation2 size={16} /> Open Live GPS Tracking
                        </Link>
                        <Link href={route('operator.settings')} className="f-btn-secondary" title="Unit Settings">
                            <Settings size={16} /> Unit Settings
                        </Link>
                    </div>

                </div>
            </div>
        </OperatorLayout>
    );
}

/* ── SUB-COMPONENT: STAT CARD ── */
function StatCard({ value, label, icon: Icon, iconClass, accentColor }) {
    const cardStyle = accentColor ? { borderTop: `2.5px solid ${accentColor}` } : {};

    return (
        <div className="f-stat" style={cardStyle}>
            <div className={`f-stat-icon ${iconClass}`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <div>
                <p className="f-stat-val">{value}</p>
                <p className="f-stat-lbl">{label}</p>
            </div>
        </div>
    );
}