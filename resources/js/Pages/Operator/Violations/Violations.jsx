import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    AlertOctagon,
    Calendar,
    MapPin,
    Search,
    CreditCard,
    Clock,
    Bike,
    FileText,
    ShieldAlert,
    Activity,
    ArrowRight,
    X,
    Filter
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Active Violation Records (Color Coding)
   Path: resources/js/Pages/Operator/Violations/Violations.jsx
   Prefix: v-*
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.v-root { font-family: 'Inter', sans-serif; color: #1C2340; padding-bottom: 64px; max-width: 1440px; margin: 0 auto; }
.v-root *, .v-root *::before, .v-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.v-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.v-eyebrow::before {
  content: '';
  width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.v-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px; font-weight: 800; letter-spacing: -.02em;
  color: #1C2340; line-height: 1.1;
}
.v-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500;
  color: #5A6488; margin-top: 6px;
}

/* ── Fleet-Style Horizontal KPI Grid ── */
.v-stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 16px; margin-top: 32px; margin-bottom: 32px;
}
@media (max-width: 1024px) { .v-stats-grid { grid-template-columns: 1fr; } }

.v-stat {
    background: #fff; border: 1px solid rgba(28,35,64,.08); border-radius: 14px;
    padding: 20px 22px; display: flex; align-items: flex-start; gap: 16px;
    transition: box-shadow .2s, border-color .2s; position: relative; overflow: hidden;
}
.v-stat:hover { border-color: rgba(28,35,64,.14); box-shadow: 0 4px 20px rgba(28,35,64,.07); }
.v-stat::after {
    content: ''; position: absolute; bottom: 0; right: 0; width: 80px; height: 80px;
    border-radius: 50%; background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
    pointer-events: none;
}
.v-stat-icon {
    width: 42px; height: 42px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.v-stat-rose { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #FFFFFF; }
.v-stat-amber { background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: #FFFFFF; }
.v-stat-blue { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%); color: #FFFFFF; }

.v-stat-val {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px;
    font-weight: 800; color: #1C2340; line-height: 1;
}
.v-stat-lbl {
    font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
    letter-spacing: .13em; text-transform: uppercase; color: #8A96BC; margin-top: 6px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.v-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 24px; flex-wrap: wrap;
}
.v-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.v-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.v-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.v-search input::placeholder { color: #8A96BC; font-weight: 400; }
.v-search-icon { color: #8A96BC; flex-shrink: 0; }
.v-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #8A96BC; display: flex; padding: 0;
  transition: color .15s;
}
.v-clear-btn:hover { color: #1C2340; }

.v-toolbar-right { display: flex; align-items: center; gap: 10px; }
.v-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.09);
  background: #FFFFFF; color: #5A6488;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.v-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

.v-count-badge {
  display: flex; align-items: center; gap: 7px;
  height: 42px; padding: 0 16px; border-radius: 50px;
  background: rgba(220,38,38,.08);
  border: 1px solid rgba(220,38,38,.15);
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #DC2626;
}

.v-history-link {
    display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
    color: #4F5BCB; text-decoration: none; padding: 0 16px; height: 42px; background: rgba(79,91,203,.08);
    border-radius: 50px; transition: all .2s; border: 1px solid rgba(79,91,203,.15);
}
.v-history-link:hover { background: rgba(79,91,203,.15); color: #2E3A9E; border-color: rgba(79,91,203,.3); }

/* Table Container */
.v-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(28,35,64,.03); }
.v-table-wrap { overflow-x: auto; }
.v-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 900px; }
.v-thead { background: #FAFAFC; border-bottom: 1px solid rgba(28,35,64,.06); }
.v-th { padding: 18px 24px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8A96BC; }
.v-tr { border-bottom: 1px solid rgba(28,35,64,.04); transition: background .18s; }
.v-tr:hover { background: #F8F9FC; }
.v-td { padding: 20px 24px; vertical-align: middle; }

/* Status Badges */
.v-badge {
    display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px;
    font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
}
.v-badge-unpaid { color: #DC2626; background: rgba(220,38,38,.08); }

.v-iot-tag {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px;
    background: #EEF2FF; color: #4F5BCB; border-radius: 4px;
    font-size: 8px; font-weight: 800; text-transform: uppercase;
}

.v-pay-btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px;
    background: #1C2340; color: #FFF; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .1em; border: none; cursor: pointer; transition: all .2s;
    text-decoration: none;
}
.v-pay-btn:hover { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(28,35,64,0.2); }

.v-color-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

/* Empty state */
.v-empty { padding: 64px 0; text-align: center; }
.v-empty-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(5,150,105,.08); border: 1px solid rgba(5,150,105,.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #059669; }
.v-empty-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; color: #1C2340; margin-bottom: 6px; }
.v-empty-sub { font-family: 'Inter', sans-serif; font-size: 13px; color: #5A6488; max-width: 400px; margin: 0 auto; }
`;

export default function Violations() {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock IoT-detected Color Coding violations data (ONLY UNPAID)
    const activeViolations = [
        {
            id: 'VIO-2026-8812',
            type: 'Color Coding: Operating on Restricted Day',
            isIot: true,
            date: 'April 02, 2026',
            time: '10:45 AM',
            location: 'Poblacion Boundary',
            unit: 'NSB-123',
            colorCode: 'Green (Wawa)',
            colorHex: '#059669',
            fine: 500.00,
            status: 'unpaid'
        },
        {
            id: 'VIO-2026-8621',
            type: 'Color Coding: Operating on Restricted Day',
            isIot: true,
            date: 'March 15, 2026',
            time: '09:00 AM',
            location: 'Lumbangan Intersection',
            unit: 'NSB-456',
            colorCode: 'Yellow (Poblacion)',
            colorHex: '#D97706',
            fine: 500.00,
            status: 'unpaid'
        }
    ];

    // Filter Logic
    const filteredViolations = activeViolations.filter(v =>
        v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <OperatorLayout title="Active Violations" operatorName="Mario Dela Cruz">
            <Head title="Active Violations | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="v-root">

                {/* ── PAGE HEADING ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="v-eyebrow">Compliance Management</p>
                    <h1 className="v-title">Active Violations</h1>
                    <p className="v-subtitle">Real-time IoT detection logs for the Color Coding Ordinance.</p>
                </div>

                {/* ── FLEET-STYLE HORIZONTAL KPI GRID ── */}
                <div className="v-stats-grid">
                    <StatCard
                        value="₱1,000.00" label="Total Unsettled Fines"
                        icon={ShieldAlert} iconClass="v-stat-rose" accentColor="#DC2626"
                    />
                    <StatCard
                        value="2" label="Active Violations"
                        icon={FileText} iconClass="v-stat-amber"
                    />
                    <StatCard
                        value="2 Units" label="Units Flagged"
                        icon={Bike} iconClass="v-stat-blue"
                    />
                </div>

                {/* ── TOOLBAR ── */}
                <div className="v-toolbar">
                    <div className="v-search">
                        <Search size={14} strokeWidth={2} className="v-search-icon" />
                        <input
                            type="text"
                            placeholder="Search unit, ID, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="v-clear-btn" onClick={() => setSearchTerm('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="v-toolbar-right">
                        <Link href={route('operator.payments')} className="v-history-link">
                            View Settled Records <ArrowRight size={14} />
                        </Link>
                        <button className="v-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter
                        </button>
                        <div className="v-count-badge">
                            <ShieldAlert size={13} strokeWidth={2} />
                            Pending: {filteredViolations.length}
                        </div>
                    </div>
                </div>

                {/* ── RECORDS TABLE ── */}
                <div className="v-card">
                    {filteredViolations.length > 0 ? (
                        <div className="v-table-wrap">
                            <table className="v-table">
                                <thead className="v-thead">
                                    <tr>
                                        <th className="v-th">Offense Details</th>
                                        <th className="v-th">Tricycle Unit & Zone</th>
                                        <th className="v-th">Detected Location</th>
                                        <th className="v-th">Fine</th>
                                        <th className="v-th">Status</th>
                                        <th className="v-th">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredViolations.map((v) => (
                                        <tr key={v.id} className="v-tr">
                                            <td className="v-td">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <p style={{ fontWeight: 700, fontSize: 13.5 }}>{v.type}</p>
                                                    {v.isIot && <span className="v-iot-tag"><Activity size={8}/> IoT Detected</span>}
                                                </div>
                                                <p style={{ fontSize: 11, color: '#8A96BC', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Calendar size={11} /> {v.date} • {v.time}
                                                </p>
                                            </td>
                                            <td className="v-td">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <div style={{ padding: 6, background: '#F2F4FA', borderRadius: 8, color: '#4F5BCB' }}>
                                                        <Bike size={14} />
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{v.unit}</span>
                                                </div>
                                                <p style={{ fontSize: 11, color: '#5A6488', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span className="v-color-dot" style={{ background: v.colorHex }}></span>
                                                    {v.colorCode}
                                                </p>
                                            </td>
                                            <td className="v-td">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#5A6488' }}>
                                                    <MapPin size={11} /> {v.location}
                                                </div>
                                            </td>
                                            <td className="v-td">
                                                <span style={{ fontWeight: 800, fontSize: 14 }}>₱{v.fine.toFixed(2)}</span>
                                            </td>
                                            <td className="v-td">
                                                <span className="v-badge v-badge-unpaid">
                                                    <Clock size={10} /> Pending
                                                </span>
                                            </td>
                                            <td className="v-td">
                                                <Link href={route('operator.violations.pay', { id: v.id })} className="v-pay-btn">
                                                    <CreditCard size={12} /> Pay Now
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="v-empty">
                            <div className="v-empty-icon">
                                <ShieldAlert size={28} strokeWidth={1.8} />
                            </div>
                            <h3 className="v-empty-title">{searchTerm ? 'No results found' : 'No Active Violations'}</h3>
                            <p className="v-empty-sub">
                                {searchTerm ? 'Try searching for a different ID or unit.' : 'Your tricycles currently have no active color coding offenses. Keep up the good work!'}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── SYSTEM NOTICE ── */}
                <div style={{
                    marginTop: 32,
                    display: 'flex',
                    gap: 16,
                    padding: '20px 24px',
                    background: 'rgba(245,158,11,.04)',
                    border: '1px solid rgba(245,158,11,.2)',
                    borderRadius: 16
                }}>
                    <AlertOctagon size={22} color="#D97706" style={{ flexShrink: 0 }} />
                    <div>
                        <p style={{ fontSize: '13px', color: '#92400E', fontWeight: '700', marginBottom: 4 }}>Color Coding Policy Reminder</p>
                        <p style={{ fontSize: '12px', color: '#B45309', lineHeight: 1.6 }}>
                            Violations flagged with the <strong>IoT Detected</strong> tag indicate that your tricycle operated on a restricted coding day based on its assigned color zone. Unpaid fines after 30 days will result in an automatic suspension of MTOP renewal privileges. Settled violations are automatically moved to your Payment History.
                        </p>
                    </div>
                </div>
            </div>
        </OperatorLayout>
    );
}

/* ── SUB-COMPONENT: STAT CARD ── */
function StatCard({ value, label, icon: Icon, iconClass, accentColor }) {
    // Only apply top border if an accentColor is provided
    const cardStyle = accentColor ? { borderTop: `2.5px solid ${accentColor}` } : {};

    return (
        <div className="v-stat" style={cardStyle}>
            <div className={`v-stat-icon ${iconClass}`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <div>
                <p className="v-stat-val">{value}</p>
                <p className="v-stat-lbl">{label}</p>
            </div>
        </div>
    );
}