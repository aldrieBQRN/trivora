import React from 'react';
import { Head, Link } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import {
    CreditCard, CheckCircle2, Receipt, TrendingUp,
    Calendar, ChevronRight, FileText, PieChart, Wallet, BarChart3
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Dashboard with TMO-style KPI Cards
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.csh-root {
    font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 64px;
    max-width: 1400px; margin: 0 auto;
}
.csh-root *, .csh-root *::before, .csh-root *::after { box-sizing: border-box; }

.csh-eyebrow { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #4F5BCB; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.csh-eyebrow::before { content: ''; width: 24px; height: 2px; background: #4F5BCB; border-radius: 4px; }
.csh-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; line-height: 1.1; margin-bottom: 8px; }
.csh-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; }
.csh-topbar { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }

/* ── TMO-Style KPI Cards ── */
.csh-kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 32px; }
@media (max-width: 1024px) { .csh-kpi-grid { grid-template-columns: 1fr; } }

.csh-kpi {
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F9 100%);
  border: 1px solid rgba(79,91,203,.12);
  border-radius: 14px;
  padding: 20px 22px;
  transition: box-shadow .2s, border-color .2s, transform .2s;
  position: relative; overflow: hidden;
}
.csh-kpi:hover {
  border-color: rgba(79,91,203,.25);
  box-shadow: 0 8px 24px rgba(79,91,203,.12);
  transform: translateY(-2px);
}
.csh-kpi::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.08) 0%, transparent 70%);
  pointer-events: none;
}
.csh-kpi-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16px;
}
.csh-kpi-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.csh-kpi-icon-stone  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.csh-kpi-icon-rose   { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);  color: #FFFFFF; }
.csh-kpi-icon-emerald{ background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.csh-kpi-icon-amber  { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }

.csh-kpi-trend {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  border-radius: 6px; padding: 4px 10px;
  transition: all .2s ease;
}
.csh-kpi-trend-live {
  color: #059669;
  background: linear-gradient(135deg, rgba(5,150,105,.1) 0%, rgba(5,150,105,.05) 100%);
  border: 1px solid rgba(5,150,105,.25);
}
.csh-kpi-trend-synced {
  color: #4F5BCB;
  background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.05) 100%);
  border: 1px solid rgba(79,91,203,.25);
}
.csh-kpi-trend-detecting {
  color: #F59E0B;
  background: linear-gradient(135deg, rgba(245,158,11,.1) 0%, rgba(245,158,11,.05) 100%);
  border: 1px solid rgba(245,158,11,.25);
}

.csh-kpi-val-row {
  display: flex; align-items: baseline; gap: 6px;
  margin-bottom: 4px; line-height: 1;
}
.csh-kpi-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340;
}
.csh-kpi-unit {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #1C2340;
}
.csh-kpi-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #1C2340; line-height: 1;
}

/* ── CHARTS GRID ── */
.csh-charts-grid { display: grid; grid-template-columns: 2fr 1.2fr; gap: 24px; margin-bottom: 32px; }
@media (max-width: 1024px) { .csh-charts-grid { grid-template-columns: 1fr; } }
.csh-chart-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; padding: 24px; box-shadow: 0 1px 6px rgba(28,35,64,.03); display: flex; flex-direction: column; }
.csh-chart-header { display: flex; align-items: center; gap: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #1C2340; margin-bottom: 24px; }

/* ── EXPLICIT X/Y AXIS BAR CHART ── */
.csh-chart-outer { display: flex; gap: 8px; height: 250px; margin-top: 10px; }
.csh-y-title-wrap { display: flex; align-items: center; justify-content: center; padding-bottom: 36px; }
.csh-y-title { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: #8A96BC; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; }

.csh-chart-inner { flex: 1; display: flex; flex-direction: column; }
.csh-chart-container { display: flex; flex: 1; gap: 12px; }

.csh-y-axis { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-bottom: 24px; font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; color: #8A96BC; min-width: 24px; }
.csh-chart-body { flex: 1; position: relative; display: flex; flex-direction: column; }

.csh-grid-lines { position: absolute; top: 0; left: 0; right: 0; bottom: 24px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; z-index: 0; }
.csh-grid-line { width: 100%; border-top: 1px dashed rgba(28,35,64,.08); }

.csh-bar-chart { flex: 1; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(28,35,64,.2); position: relative; z-index: 1; }
.csh-bar-col { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; flex: 1; height: 100%; position: relative; }
.csh-bar-track { width: 100%; max-width: 44px; background: rgba(79,91,203,.05); border-radius: 6px 6px 0 0; display: flex; align-items: flex-end; height: 100%; position: relative; }
.csh-bar-fill { width: 100%; background: linear-gradient(180deg, #4F5BCB 0%, #2E3A9E 100%); border-radius: 6px 6px 0 0; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 12px rgba(79,91,203,.2); }
.csh-bar-fill:hover { background: linear-gradient(180deg, #60A5FA 0%, #4F5BCB 100%); cursor: pointer; }

.csh-bar-tooltip { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #1C2340; color: #FFF; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; opacity: 0; pointer-events: none; transition: opacity .2s, top .2s; white-space: nowrap; }
.csh-bar-track:hover .csh-bar-tooltip { opacity: 1; top: -38px; }

.csh-x-axis { display: flex; justify-content: space-between; padding-top: 10px; height: 24px; align-items: center; }
.csh-x-label { flex: 1; text-align: center; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; color: #8A96BC; text-transform: uppercase; }
.csh-x-title { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; color: #8A96BC; text-align: center; margin-top: 8px; padding-left: 36px; }


/* ── Revenue Breakdown Chart ── */
.csh-bd-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.csh-bd-bar-container { height: 24px; width: 100%; border-radius: 50px; display: flex; overflow: hidden; margin-bottom: 24px; background: #EDEEF4; box-shadow: inset 0 2px 4px rgba(28,35,64,.06); }
.csh-bd-segment { height: 100%; transition: width 1s ease-in-out; }
.csh-bd-legend { display: flex; flex-direction: column; gap: 16px; }
.csh-bd-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(28,35,64,.02); border-radius: 10px; border: 1px solid rgba(28,35,64,.05); }
.csh-bd-label-wrap { display: flex; align-items: center; gap: 10px; }
.csh-bd-dot { width: 12px; height: 12px; border-radius: 4px; }
.csh-bd-text { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #1C2340; }
.csh-bd-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 800; color: #1C2340; }
.csh-bd-pct { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; color: #8A96BC; text-align: right; }

/* ── Table Layout ── */
.csh-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.csh-toolbar-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #1C2340; }
.csh-view-all { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #4F5BCB; text-decoration: none; transition: color .2s; }
.csh-view-all:hover { color: #1C2340; }

.csh-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(28,35,64,.03); }
.csh-table { width: 100%; border-collapse: collapse; text-align: left; }
.csh-th { padding: 18px 24px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: #8A96BC; background: rgba(79,91,203,.03); border-bottom: 1px solid rgba(28,35,64,.06); }
.csh-tr { border-bottom: 1px solid rgba(28,35,64,.05); transition: background .15s; }
.csh-tr:last-child { border-bottom: none; }
.csh-tr:hover { background: rgba(237,238,244,.4); }
.csh-td { padding: 18px 24px; vertical-align: middle; }

.csh-td-primary { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #1C2340; margin-bottom: 4px; }
.csh-td-secondary { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500; color: #8A96BC; }
.csh-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14.5px; font-weight: 800; color: #059669; }
.csh-ref { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #5A6488; background: rgba(28,35,64,.04); padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 6px; }

.csh-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }
.csh-badge.verified { background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2); }
.csh-view-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #FFFFFF; color: #1C2340; padding: 8px 16px; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; text-decoration: none; border: 1px solid rgba(28,35,64,.15); cursor: pointer; transition: all .2s; }
.csh-view-btn:hover { background: #1C2340; color: #FFFFFF; border-color: #1C2340; box-shadow: 0 4px 12px rgba(28,35,64,.15); }
`;

export default function TreasurerDashboard() {
    const transactions = [
        { id: 'TXN-001', app_id: 'APP-2026-0622', operator: 'Mario Dela Cruz', type: 'New Franchise Fee', amount: 515.00, method: 'GCash', ref: 'pay_mc12345', date: 'Apr 04, 2026 - 08:30 AM', status: 'verified' },
        { id: 'TXN-002', app_id: 'APP-2026-0501', operator: 'Juanito Perez', type: 'MTOP Renewal Fee', amount: 1695.00, method: 'Credit Card', ref: 'pay_xyz987', date: 'Apr 04, 2026 - 09:15 AM', status: 'verified' },
        { id: 'TXN-003', app_id: 'TRV-88210', operator: 'Ricardo Dalisay', type: 'Traffic Violation Fine', amount: 500.00, method: 'Maya', ref: 'pay_maya810', date: 'Apr 04, 2026 - 10:05 AM', status: 'verified' },
    ];

    const weeklyData = [
        { day: 'Mon', amount: 3200 },
        { day: 'Tue', amount: 4100 },
        { day: 'Wed', amount: 2800 },
        { day: 'Thu', amount: 5500 },
        { day: 'Fri', amount: 3900 },
        { day: 'Sat', amount: 1500 },
        { day: 'Sun', amount: 800  },
    ];

    const maxVal = Math.max(...weeklyData.map(d => d.amount));
    const yMax = Math.ceil(maxVal / 2000) * 2000;
    const ySteps = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0];

    const breakdown = {
        renewals: { val: 28500.00, color: '#4F5BCB', label: 'MTOP Renewals' },
        new: { val: 12500.00, color: '#059669', label: 'New Franchises' },
        fines: { val: 4000.00, color: '#D97706', label: 'Violation Fines' }
    };
    const totalBd = breakdown.renewals.val + breakdown.new.val + breakdown.fines.val;

    return (
        <TreasurerLayout title="Collection Dashboard" treasurerName="Maria Santos">
            <Head title="Treasurer Portal | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="csh-root">
                <div className="csh-topbar">
                    <div>
                        <p className="csh-eyebrow">Treasurer's Office</p>
                        <h1 className="csh-title">Collection Dashboard</h1>
                        <p className="csh-subtitle">Overview of all verified online payments and revenue distribution.</p>
                    </div>
                </div>

                {/* ── TMO-STYLE KPI METRICS ── */}
                <div className="csh-kpi-grid">
                    <KpiCard
                        title="Today's Total Collection" value="₱2,710.00" unit="PHP"
                        icon={Wallet} iconClass="csh-kpi-icon-emerald" trend="Live" trendClass="csh-kpi-trend-live"
                    />
                    <KpiCard
                        title="This Month's Collection" value="₱45,000.00" unit="PHP"
                        icon={Calendar} iconClass="csh-kpi-icon-stone" trend="On Track" trendClass="csh-kpi-trend-synced"
                    />
                    <KpiCard
                        title="Total Payments Processed" value="142" unit="Verified"
                        icon={Receipt} iconClass="csh-kpi-icon-amber" trend="Synced" trendClass="csh-kpi-trend-detecting"
                    />
                </div>

                {/* ── CHARTS SECTION ── */}
                <div className="csh-charts-grid">

                    {/* LEFT: Weekly Bar Chart with X and Y Axis Titles */}
                    <div className="csh-chart-card">
                        <p className="csh-chart-header"><BarChart3 size={18} color="#4F5BCB"/> Revenue Trend (Last 7 Days)</p>

                        <div className="csh-chart-outer">
                            <div className="csh-y-title-wrap">
                                <span className="csh-y-title">Revenue Amount (₱)</span>
                            </div>

                            <div className="csh-chart-inner">
                                <div className="csh-chart-container">

                                    <div className="csh-y-axis">
                                        {ySteps.map((step, i) => (
                                            <span key={i}>{step >= 1000 ? `${step/1000}k` : step}</span>
                                        ))}
                                    </div>

                                    <div className="csh-chart-body">
                                        <div className="csh-grid-lines">
                                            <div className="csh-grid-line"></div>
                                            <div className="csh-grid-line"></div>
                                            <div className="csh-grid-line"></div>
                                            <div className="csh-grid-line"></div>
                                            <div className="csh-grid-line" style={{ borderTop: '1px solid rgba(28,35,64,.15)' }}></div>
                                        </div>

                                        <div className="csh-bar-chart">
                                            {weeklyData.map((data, idx) => {
                                                const heightPct = (data.amount / yMax) * 100;
                                                return (
                                                    <div className="csh-bar-col" key={idx}>
                                                        <div className="csh-bar-track">
                                                            <div className="csh-bar-tooltip">₱{data.amount.toLocaleString()}</div>
                                                            <div className="csh-bar-fill" style={{ height: `${heightPct}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="csh-x-axis">
                                            {weeklyData.map((data, idx) => (
                                                <div className="csh-x-label" key={idx}>{data.day}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="csh-x-title">Days of the Week</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Revenue Category Breakdown */}
                    <div className="csh-chart-card">
                        <p className="csh-chart-header"><PieChart size={18} color="#059669"/> Revenue by Category</p>
                        <div className="csh-bd-wrap">
                            <div className="csh-bd-bar-container">
                                <div className="csh-bd-segment" style={{ width: `${(breakdown.renewals.val / totalBd) * 100}%`, background: breakdown.renewals.color }}></div>
                                <div className="csh-bd-segment" style={{ width: `${(breakdown.new.val / totalBd) * 100}%`, background: breakdown.new.color }}></div>
                                <div className="csh-bd-segment" style={{ width: `${(breakdown.fines.val / totalBd) * 100}%`, background: breakdown.fines.color }}></div>
                            </div>

                            <div className="csh-bd-legend">
                                {Object.values(breakdown).map((item, idx) => (
                                    <div className="csh-bd-item" key={idx}>
                                        <div className="csh-bd-label-wrap">
                                            <div className="csh-bd-dot" style={{ background: item.color }}></div>
                                            <p className="csh-bd-text">{item.label}</p>
                                        </div>
                                        <div>
                                            <p className="csh-bd-val">₱{item.val.toLocaleString('en-US')}</p>
                                            <p className="csh-bd-pct">{(item.val / totalBd * 100).toFixed(0)}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── RECENT TRANSACTIONS TABLE ── */}
                <div className="csh-toolbar">
                    <h2 className="csh-toolbar-title">Latest Payments Received</h2>
                    <Link href="/treasurer/transactions" className="csh-view-all">
                        View All Payment Records <ChevronRight size={13} strokeWidth={2.5} />
                    </Link>
                </div>

                <div className="csh-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="csh-table">
                            <thead>
                                <tr>
                                    <th className="csh-th">Driver & Payment Type</th>
                                    <th className="csh-th">Payment Method</th>
                                    <th className="csh-th">Amount Paid</th>
                                    <th className="csh-th">Status</th>
                                    <th className="csh-th" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr key={txn.id} className="csh-tr">
                                        <td className="csh-td">
                                            <p className="csh-td-primary">{txn.operator}</p>
                                            <p className="csh-td-secondary">{txn.type} &bull; {txn.app_id}</p>
                                        </td>
                                        <td className="csh-td">
                                            <p className="csh-td-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <CreditCard size={12}/> {txn.method}
                                            </p>
                                            <span className="csh-ref">Ref: {txn.ref}</span>
                                        </td>
                                        <td className="csh-td">
                                            <p className="csh-amount">₱{txn.amount.toFixed(2)}</p>
                                            <p className="csh-td-secondary" style={{ fontSize: 10.5, marginTop: 4 }}>{txn.date}</p>
                                        </td>
                                        <td className="csh-td">
                                            <span className="csh-badge verified"><CheckCircle2 size={10} strokeWidth={3}/> Payment Verified</span>
                                        </td>
                                        <td className="csh-td" style={{ textAlign: 'right' }}>
                                            <Link href={`/treasurer/receipt/${txn.id}`} className="csh-view-btn">
                                                <Receipt size={13} strokeWidth={2} /> View Receipt
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </TreasurerLayout>
    );
}

/* ── SUB-COMPONENT: KPI CARD ── */
function KpiCard({ title, value, unit, icon: Icon, iconClass, trend, trendClass }) {
    return (
        <div className="csh-kpi">
            <div className="csh-kpi-top">
                <div className={`csh-kpi-icon ${iconClass}`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <span className={`csh-kpi-trend ${trendClass}`}>{trend}</span>
            </div>
            <div className="csh-kpi-val-row">
                <span className="csh-kpi-val">{value}</span>
                <span className="csh-kpi-unit">{unit}</span>
            </div>
            <p className="csh-kpi-lbl">{title}</p>
        </div>
    );
}