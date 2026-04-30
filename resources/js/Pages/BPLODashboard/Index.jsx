import React from 'react';
import { Head, Link } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    FileText, CheckCircle2, TrendingUp,
    Clock, ChevronRight, Hash, ShieldAlert, Award,
    Activity
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ─────────────────────────────────────────────────────────────────────────
   BPLO PORTAL — Dashboard (Matching Treasurer UI System)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.bd-root {
    font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 64px;
    max-width: 1400px; margin: 0 auto;
}
.bd-root *, .bd-root *::before, .bd-root *::after { box-sizing: border-box; }

.bd-eyebrow { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #4F5BCB; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.bd-eyebrow::before { content: ''; width: 24px; height: 2px; background: #4F5BCB; border-radius: 4px; }
.bd-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; line-height: 1.1; margin-bottom: 8px; }
.bd-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; }
.bd-topbar { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }

/* ── PREMIUM KPI CARDS ── */
.bd-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 32px; }
@media (max-width: 1024px) { .bd-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .bd-kpi-grid { grid-template-columns: 1fr; } }

.bd-kpi {
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F9 100%);
  border: 1px solid rgba(79,91,203,.12);
  border-radius: 14px;
  padding: 20px 22px;
  transition: box-shadow .2s, border-color .2s, transform .2s;
  position: relative; overflow: hidden;
}
.bd-kpi:hover {
  border-color: rgba(79,91,203,.25);
  box-shadow: 0 8px 24px rgba(79,91,203,.12);
  transform: translateY(-2px);
}
.bd-kpi::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.08) 0%, transparent 70%);
  pointer-events: none;
}
.bd-kpi-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16px;
}
.bd-kpi-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bd-kpi-icon-blue    { background: linear-gradient(135deg, #4F5BCB 0%, #2E3A9E 100%);  color: #FFFFFF; }
.bd-kpi-icon-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.bd-kpi-icon-amber   { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }
.bd-kpi-icon-rose    { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);  color: #FFFFFF; }

.bd-kpi-trend {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  border-radius: 6px; padding: 4px 10px;
  transition: all .2s ease;
}
.bd-kpi-trend-live {
  color: #059669; background: linear-gradient(135deg, rgba(5,150,105,.1) 0%, rgba(5,150,105,.05) 100%); border: 1px solid rgba(5,150,105,.25);
}
.bd-kpi-trend-pending {
  color: #D97706; background: linear-gradient(135deg, rgba(217,119,6,.1) 0%, rgba(217,119,6,.05) 100%); border: 1px solid rgba(217,119,6,.25);
}
.bd-kpi-trend-alert {
  color: #DC2626; background: linear-gradient(135deg, rgba(220,38,38,.1) 0%, rgba(220,38,38,.05) 100%); border: 1px solid rgba(220,38,38,.25);
}
.bd-kpi-trend-synced {
  color: #4F5BCB; background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.05) 100%); border: 1px solid rgba(79,91,203,.25);
}

.bd-kpi-val-row {
  display: flex; align-items: baseline; gap: 6px;
  margin-bottom: 4px; line-height: 1;
}
.bd-kpi-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340;
}
.bd-kpi-unit {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #1C2340;
}
.bd-kpi-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #1C2340; line-height: 1;
}

/* ── CHARTS & ACTIVITY GRID ── */
.bd-charts-grid { display: grid; grid-template-columns: 2fr 1.2fr; gap: 24px; margin-bottom: 32px; }
@media (max-width: 1024px) { .bd-charts-grid { grid-template-columns: 1fr; } }
.bd-chart-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; padding: 24px; box-shadow: 0 1px 6px rgba(28,35,64,.03); display: flex; flex-direction: column; }
.bd-chart-header { display: flex; align-items: center; gap: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #1C2340; margin-bottom: 24px; }

/* ── AXIS TITLES (New Fix) ── */
.bd-chart-outer { display: flex; gap: 8px; height: 280px; margin-top: 4px; }
.bd-y-title-wrap { display: flex; align-items: center; justify-content: center; padding-bottom: 24px; }
.bd-y-title { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: #8A96BC; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; }
.bd-chart-inner { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.bd-x-title { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: #8A96BC; text-align: center; margin-top: 12px; padding-left: 20px; }

/* Activity List */
.bd-activity { display: flex; flex-direction: column; gap: 20px; flex: 1; }
.bd-act-item { display: flex; gap: 16px; align-items: flex-start; }
.bd-act-icon {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: rgba(16,185,129,.1); color: #059669; border: 1px solid rgba(16,185,129,.2);
  display: flex; align-items: center; justify-content: center;
}
.bd-act-icon.pending { background: rgba(217,119,6,.1); color: #D97706; border-color: rgba(217,119,6,.2); }
.bd-act-content { flex: 1; padding-top: 2px; }
.bd-act-title { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600; color: #1C2340; margin-bottom: 3px; letter-spacing: -.01em; }
.bd-act-sub { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #8A96BC; }
.bd-act-time { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8A96BC; flex-shrink: 0; margin-top: 4px; }

/* View All Link */
.bd-view-all {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 20px; padding: 12px; background: rgba(79,91,203,.04); border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase; color: #4F5BCB;
  text-decoration: none; transition: background .2s, color .2s;
}
.bd-view-all:hover { background: rgba(79,91,203,.1); color: #2E3A9E; }

/* Animations */
.bd-fade { animation: bdFadeUp .4s cubic-bezier(.2,0,.2,1) both; }
.bd-d1 { animation-delay: .05s; }
.bd-d2 { animation-delay: .1s; }
.bd-d3 { animation-delay: .15s; }
@keyframes bdFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
`;

export default function BPLODashboard() {
    // Mock Chart Data for MTOP Issuance Trend
    const chartData = [
        { day: 'Mon', issued: 12 }, { day: 'Tue', issued: 19 },
        { day: 'Wed', issued: 15 }, { day: 'Thu', issued: 22 },
        { day: 'Fri', issued: 28 }, { day: 'Sat', issued: 8 },
        { day: 'Sun', issued: 4 },
    ];

    return (
        <BPLOLayout title="Dashboard" role="BPLO Officer">
            <Head title="BPLO Dashboard | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="bd-root">

                {/* ── TOPBAR & HEADER ── */}
                <div className="bd-topbar bd-fade">
                    <div>
                        <p className="bd-eyebrow">Overview</p>
                        <h1 className="bd-title">BPLO Dashboard</h1>
                        <p className="bd-subtitle">Municipal Tricycle Operator's Permit Management</p>
                    </div>
                </div>

                {/* ── PREMIUM KPI METRICS ── */}
                <div className="bd-kpi-grid">
                    <KpiCard
                        title="Active Registry" value="842" unit="UNITS"
                        icon={Hash} iconClass="bd-kpi-icon-blue"
                        trend="Live Data" trendClass="bd-kpi-trend-synced" delay="bd-d1"
                    />
                    <KpiCard
                        title="Pending Releasing" value="14" unit="QUEUED"
                        icon={Clock} iconClass="bd-kpi-icon-amber"
                        trend="Action Needed" trendClass="bd-kpi-trend-pending" delay="bd-d1"
                    />
                    <KpiCard
                        title="Issued This Week" value="28" unit="APPROVED"
                        icon={Award} iconClass="bd-kpi-icon-emerald"
                        trend="On Track" trendClass="bd-kpi-trend-live" delay="bd-d2"
                    />
                    <KpiCard
                        title="Revoked Franchises" value="3" unit="SUSPENDED"
                        icon={ShieldAlert} iconClass="bd-kpi-icon-rose"
                        trend="Alert" trendClass="bd-kpi-trend-alert" delay="bd-d2"
                    />
                </div>

                {/* ── CHARTS & ACTIVITY SECTION ── */}
                <div className="bd-charts-grid">

                    {/* Left: Recharts Area Chart with Explicit Axis Titles */}
                    <div className="bd-chart-card bd-fade bd-d2">
                        <p className="bd-chart-header">
                            <TrendingUp size={18} color="#4F5BCB" />
                            MTOP Issuance Trend
                        </p>

                        <div className="bd-chart-outer">
                            {/* Left Y-Axis Title */}
                            <div className="bd-y-title-wrap">
                                <span className="bd-y-title">Issuance Count</span>
                            </div>

                            <div className="bd-chart-inner">
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4F5BCB" stopOpacity={0.15}/>
                                                    <stop offset="95%" stopColor="#4F5BCB" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(28,35,64,.06)" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#8A96BC', fontSize: 11, fontFamily: 'Inter', fontWeight: 600}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#8A96BC', fontSize: 11, fontFamily: 'Inter', fontWeight: 600}} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(28,35,64,.1)' }}
                                                itemStyle={{ color: '#1C2340', fontWeight: 600, fontFamily: 'Inter' }}
                                                labelStyle={{ color: '#8A96BC', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, fontFamily: 'DM Sans', marginBottom: '4px' }}
                                            />
                                            <Area type="monotone" dataKey="issued" stroke="#4F5BCB" strokeWidth={3} fillOpacity={1} fill="url(#colorIssued)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Bottom X-Axis Title */}
                                <div className="bd-x-title">Days of the Week</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Recent Activity Panel */}
                    <div className="bd-chart-card bd-fade bd-d3" style={{ paddingBottom: '16px' }}>
                        <p className="bd-chart-header">
                            <Activity size={18} color="#059669" />
                            Recent Issuances
                        </p>
                        <div className="bd-activity">
                            <div className="bd-act-item">
                                <div className="bd-act-icon"><CheckCircle2 size={18} strokeWidth={2.5} /></div>
                                <div className="bd-act-content">
                                    <p className="bd-act-title">Plate #8812 Assigned</p>
                                    <p className="bd-act-sub">Mario Dela Cruz • TODA A</p>
                                </div>
                                <span className="bd-act-time">10m ago</span>
                            </div>
                            <div className="bd-act-item">
                                <div className="bd-act-icon"><CheckCircle2 size={18} strokeWidth={2.5} /></div>
                                <div className="bd-act-content">
                                    <p className="bd-act-title">Plate #4491 Assigned</p>
                                    <p className="bd-act-sub">Ricardo Dalisay • TODA D</p>
                                </div>
                                <span className="bd-act-time">1h ago</span>
                            </div>
                            <div className="bd-act-item">
                                <div className="bd-act-icon pending"><Clock size={18} strokeWidth={2.5} /></div>
                                <div className="bd-act-content">
                                    <p className="bd-act-title">Awaiting Plate Number</p>
                                    <p className="bd-act-sub">Arnaldo Baquiran (Pending)</p>
                                </div>
                                <span className="bd-act-time">2h ago</span>
                            </div>
                        </div>
                        <Link href="/bplo/releasing" className="bd-view-all">
                            Open Releasing Queue <ChevronRight size={14} strokeWidth={2.5} />
                        </Link>
                    </div>

                </div>
            </div>
        </BPLOLayout>
    );
}

/* ── SUB-COMPONENT: PREMIUM KPI CARD ── */
function KpiCard({ title, value, unit, icon: Icon, iconClass, trend, trendClass, delay }) {
    return (
        <div className={`bd-kpi bd-fade ${delay}`}>
            <div className="bd-kpi-top">
                <div className={`bd-kpi-icon ${iconClass}`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <span className={`bd-kpi-trend ${trendClass}`}>{trend}</span>
            </div>
            <div className="bd-kpi-val-row">
                <span className="bd-kpi-val">{value}</span>
                <span className="bd-kpi-unit">{unit}</span>
            </div>
            <p className="bd-kpi-lbl">{title}</p>
        </div>
    );
}