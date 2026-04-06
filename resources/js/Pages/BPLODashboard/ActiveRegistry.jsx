import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    Search, Award, Bike, Hash, Filter,
    CheckCircle2, Inbox, X, CalendarClock, ShieldAlert
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Civic Prestige — Active Registry (BPLO Masterlist)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ar-root { font-family: 'Inter', sans-serif; color: #1A3380; }
.ar-root *, .ar-root *::before, .ar-root *::after { box-sizing: border-box; }

.ar-eyebrow {
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: #4169E1;
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.ar-eyebrow::before { content: ''; width: 18px; height: 1.5px; background: #4169E1; border-radius: 2px; }
.ar-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800;
  letter-spacing: -.02em; color: #1A3380; line-height: 1;
}
.ar-subtitle {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase; color: #7A9BC8; margin-top: 6px;
}

.ar-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 32px; }
@media (max-width: 768px) { .ar-stats { grid-template-columns: 1fr; } }

.ar-stat {
  background: #fff; border: 1px solid rgba(26,51,128,.08); border-radius: 14px;
  padding: 20px 22px; display: flex; align-items: flex-start; gap: 16px;
  transition: box-shadow .2s, border-color .2s; position: relative; overflow: hidden;
}
.ar-stat:hover { border-color: rgba(26,51,128,.14); box-shadow: 0 4px 20px rgba(26,51,128,.07); }
.ar-stat-accent { border-top: 2.5px solid #4169E1; }
.ar-stat::after {
  content: ''; position: absolute; bottom: 0; right: 0; width: 80px; height: 80px;
  border-radius: 50%; background: radial-gradient(circle, rgba(65,105,225,.04) 0%, transparent 70%);
  pointer-events: none;
}
.ar-stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ar-stat-blue { background: rgba(65,105,225,.10); color: #1E3A8A; }
.ar-stat-teal { background: rgba(16,185,129,.09); color: #065F46; }
.ar-stat-amber { background: rgba(245,158,11,.09); color: #B45309; }
.ar-stat-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #1A3380; line-height: 1; }
.ar-stat-lbl { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #7A9BC8; margin-top: 5px; }

.ar-toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.ar-toolbar-right { display: flex; align-items: center; gap: 10px; }

.ar-search {
  display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid rgba(26,51,128,.09);
  border-radius: 50px; height: 42px; padding: 0 16px; width: 320px; transition: all .2s;
}
.ar-search:focus-within { border-color: rgba(65,105,225,.45); box-shadow: 0 0 0 3px rgba(65,105,225,.1); width: 360px; }
.ar-search input { border: none; outline: none; background: transparent; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: #1A3380; width: 100%; letter-spacing: .01em; }
.ar-search input::placeholder { color: #7A9BC8; font-weight: 400; }
.ar-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px; border: 1px solid rgba(26,51,128,.09);
  background: #fff; color: #4A6090; display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .18s;
}
.ar-filter-btn:hover { border-color: rgba(26,51,128,.18); color: #1A3380; }

.ar-card { background: #fff; border: 1px solid rgba(26,51,128,.08); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(26,51,128,.05); }
.ar-table { width: 100%; border-collapse: collapse; }
.ar-thead-row { border-bottom: 1px solid rgba(26,51,128,.07); }
.ar-th { padding: 14px 24px; font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #7A9BC8; text-align: left; white-space: nowrap; }

.ar-row { border-bottom: 1px solid rgba(26,51,128,.05); transition: background .15s; }
.ar-row:last-child { border-bottom: none; }
.ar-row:hover { background: rgba(238,243,255,.7); }
.ar-td { padding: 18px 24px; vertical-align: middle; }

/* Identifier */
.ar-body-no { font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: .08em; color: #1E3A8A; margin-bottom: 4px; }
.ar-plate-no { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #7A9BC8; background: rgba(26,51,128,.05); border: 1px solid rgba(26,51,128,.1); padding: 3px 8px; border-radius: 5px; display: inline-block; }

/* Operator */
.ar-op-name { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600; color: #1A3380; line-height: 1; margin-bottom: 6px; letter-spacing: -.01em; }
.ar-op-meta { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #7A9BC8; display: flex; align-items: center; gap: 5px; }

/* TODA */
.ar-toda-name { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600; color: #3A5080; line-height: 1; margin-bottom: 5px; }

/* Issue Date */
.ar-date { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: #1A3380; }

/* Status Badge */
.ar-status-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }
.ar-status-active { background: rgba(16,185,129,.1); color: #059669; border: 1px solid rgba(16,185,129,.2); }
.ar-status-revoked { background: rgba(220,38,38,.1); color: #DC2626; border: 1px solid rgba(220,38,38,.2); }

.ar-empty { padding: 64px 32px; text-align: center; }
.ar-empty-icon { width: 64px; height: 64px; border-radius: 16px; border: 1.5px dashed rgba(26,51,128,.15); display: flex; align-items: center; justify-content: center; color: rgba(26,51,128,.18); margin: 0 auto 20px; }
.ar-empty-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 700; color: #1A3380; margin-bottom: 6px; }
.ar-empty-sub { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #7A9BC8; }
`;

export default function ActiveRegistry() {
    const [query, setQuery] = useState('');

    const registryList = [
        {
            body_no: 'TRV-0842',
            plate_no: '8812',
            operator: 'Mario Dela Cruz',
            toda: 'TODA A (Poblacion)',
            make: 'Honda TMX 125',
            issue_date: 'April 5, 2026',
            status: 'active'
        },
        {
            body_no: 'TRV-0115',
            plate_no: '4491',
            operator: 'Juanito Perez',
            toda: 'TODA B (Wawa)',
            make: 'Kawasaki Barako 175',
            issue_date: 'Jan 10, 2026',
            status: 'active'
        },
        {
            body_no: 'TRV-0901',
            plate_no: '1100',
            operator: 'Antonio Luna',
            toda: 'TODA C (Bucana)',
            make: 'Yamaha YTX 125',
            issue_date: 'May 14, 2025',
            status: 'revoked'
        },
    ];

    const filtered = registryList.filter(a =>
        a.body_no.toLowerCase().includes(query.toLowerCase()) ||
        a.operator.toLowerCase().includes(query.toLowerCase()) ||
        a.plate_no.includes(query)
    );

    const activeCount = registryList.filter(r => r.status === 'active').length;
    const revokedCount = registryList.filter(r => r.status === 'revoked').length;

    return (
        <BPLOLayout title="Active Registry" role="BPLO Officer">
            <Head title="Active Registry | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="ar-root" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Page heading ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="ar-eyebrow">Registry Management</p>
                    <h1 className="ar-title">BPLO Active Registry</h1>
                    <p className="ar-subtitle">Masterlist of officially issued MTOP franchises</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="ar-stats">
                    <StatCard
                        count={registryList.length}
                        label="Total Issued Units"
                        icon={Hash}
                        iconClass="ar-stat-blue"
                        accent
                    />
                    <StatCard
                        count={activeCount}
                        label="Active Franchises"
                        icon={CheckCircle2}
                        iconClass="ar-stat-teal"
                    />
                    <StatCard
                        count={revokedCount}
                        label="Revoked / Suspended"
                        icon={ShieldAlert}
                        iconClass="ar-stat-amber"
                    />
                </div>

                {/* ── Toolbar ── */}
                <div className="ar-toolbar">
                    <div /> {/* Spacer */}
                    <div className="ar-toolbar-right">
                        <div className="ar-search">
                            <Search size={14} strokeWidth={2} style={{ color: '#7A9BC8' }} />
                            <input
                                type="text"
                                placeholder="Search Body No, Operator, Plate..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    style={{ background:'none', border:'none', cursor:'pointer', color:'#7A9BC8', display:'flex', padding:0 }}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <button className="ar-filter-btn">
                            <Filter size={14} strokeWidth={2} /> Filter
                        </button>
                    </div>
                </div>

                {/* ── Registry table ── */}
                <div className="ar-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ar-table">
                            <thead>
                                <tr className="ar-thead-row">
                                    <th className="ar-th">Body & Plate No.</th>
                                    <th className="ar-th">Operator</th>
                                    <th className="ar-th">TODA Association</th>
                                    <th className="ar-th">Issue Date</th>
                                    <th className="ar-th">Franchise Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5}>
                                            <EmptyState hasQuery={!!query} />
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item, idx) => (
                                        <RegistryRow key={idx} unit={item} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </BPLOLayout>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({ count, label, icon: Icon, iconClass, accent }) {
    return (
        <div className={`ar-stat${accent ? ' ar-stat-accent' : ''}`}>
            <div className={`ar-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div>
                <p className="ar-stat-val">{count}</p>
                <p className="ar-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function RegistryRow({ unit }) {
    return (
        <tr className="ar-row">
            {/* Identifier */}
            <td className="ar-td">
                <p className="ar-body-no">{unit.body_no}</p>
                <span className="ar-plate-no">PLT: {unit.plate_no}</span>
            </td>

            {/* Operator */}
            <td className="ar-td">
                <p className="ar-op-name">{unit.operator}</p>
                <p className="ar-op-meta">
                    <Bike size={12} strokeWidth={2} style={{ color: '#4169E1' }} />
                    {unit.make}
                </p>
            </td>

            {/* TODA */}
            <td className="ar-td">
                <p className="ar-toda-name">{unit.toda}</p>
            </td>

            {/* Date */}
            <td className="ar-td">
                <p className="ar-date">{unit.issue_date}</p>
            </td>

            {/* Status */}
            <td className="ar-td">
                {unit.status === 'active' ? (
                    <span className="ar-status-badge ar-status-active">
                        <CheckCircle2 size={11} strokeWidth={2.5} /> Active
                    </span>
                ) : (
                    <span className="ar-status-badge ar-status-revoked">
                        <ShieldAlert size={11} strokeWidth={2.5} /> Revoked
                    </span>
                )}
            </td>
        </tr>
    );
}

function EmptyState({ hasQuery }) {
    return (
        <div className="ar-empty">
            <div className="ar-empty-icon">
                <Inbox size={28} strokeWidth={1.4} />
            </div>
            <p className="ar-empty-title">
                {hasQuery ? 'No records found' : 'Registry is empty'}
            </p>
            <p className="ar-empty-sub">
                {hasQuery
                    ? 'Try adjusting your search filters'
                    : 'No finalized MTOP records exist in the system yet.'}
            </p>
        </div>
    );
}