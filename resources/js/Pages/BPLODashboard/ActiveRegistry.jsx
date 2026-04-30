import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    Search, Award, Bike, Hash, Filter,
    CheckCircle2, Inbox, X, CalendarClock,
    ShieldAlert, Download
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Civic Prestige — Active Registry (BPLO Masterlist)
   Updated to Unified SaaS token system
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ar-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  padding-bottom: 48px;
  max-width: 1500px;
  margin: 0 auto;
}
.ar-root *, .ar-root *::before, .ar-root *::after { box-sizing: border-box; }

.ar-eyebrow {
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: #4F5BCB;
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.ar-eyebrow::before { content: ''; width: 18px; height: 1.5px; background: #4F5BCB; border-radius: 2px; }
.ar-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340; line-height: 1;
}
.ar-subtitle {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase; color: #8A96BC; margin-top: 6px;
}

.ar-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 32px; }
@media (max-width: 768px) { .ar-stats { grid-template-columns: 1fr; } }

.ar-stat {
  background: #fff; border: 1px solid rgba(28,35,64,.08); border-radius: 14px;
  padding: 20px 22px; display: flex; align-items: flex-start; gap: 16px;
  transition: box-shadow .2s, border-color .2s; position: relative; overflow: hidden;
}
.ar-stat:hover { border-color: rgba(28,35,64,.14); box-shadow: 0 4px 20px rgba(28,35,64,.07); }
.ar-stat-accent { border-top: 2.5px solid #4F5BCB; }
.ar-stat::after {
  content: ''; position: absolute; bottom: 0; right: 0; width: 80px; height: 80px;
  border-radius: 50%; background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}
.ar-stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ar-stat-blue { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.ar-stat-teal { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.ar-stat-amber { background: linear-gradient(135deg, #D97706 0%, #B45309 100%);  color: #FFFFFF; }
.ar-stat-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #1C2340; line-height: 1; }
.ar-stat-lbl { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #8A96BC; margin-top: 5px; }

.ar-toolbar { display: flex; align-items: flex-end; justify-content: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.ar-toolbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }

.ar-search {
  display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid rgba(28,35,64,.15);
  border-radius: 50px; height: 42px; padding: 0 16px; width: 320px; transition: all .2s;
}
.ar-search:focus-within { border-color: rgba(79,91,203,.45); box-shadow: 0 0 0 3px rgba(79,91,203,.1); width: 360px; }
.ar-search input { border: none; outline: none; background: transparent; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: #1C2340; width: 100%; letter-spacing: .01em; }
.ar-search input::placeholder { color: #8A96BC; font-weight: 400; }

/* ── Filter & Export Buttons (Matching Outlines) ── */
.ar-filter-btn, .ar-export-btn {
  height: 42px; padding: 0 16px; border-radius: 50px; border: 1px solid rgba(28,35,64,.15);
  background: #fff; color: #3A4570; display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .18s;
}
.ar-filter-btn:hover, .ar-export-btn:hover {
  border-color: rgba(28,35,64,.18); color: #1C2340; background: rgba(28,35,64,.03);
}
.ar-export-btn:disabled {
  opacity: 0.6; cursor: not-allowed;
}

.ar-card { background: #fff; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(28,35,64,.05); }
.ar-table { width: 100%; border-collapse: collapse; }
.ar-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.ar-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #4F5BCB; text-align: left; white-space: nowrap;
  background: rgba(79, 91, 203, 0.05);
}
.ar-th-right { text-align: right; }

.ar-row { border-bottom: 1px solid rgba(28,35,64,.05); transition: background .15s; }
.ar-row:last-child { border-bottom: none; }
.ar-row:hover { background: rgba(237,238,244,.7); }
.ar-td { padding: 18px 24px; vertical-align: middle; }
.ar-td-right { text-align: right; }

/* Identifier */
.ar-body-no { font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: .08em; color: #2E3A9E; margin-bottom: 4px; }
.ar-plate-no { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8A96BC; background: rgba(28,35,64,.05); border: 1px solid rgba(28,35,64,.1); padding: 3px 8px; border-radius: 5px; display: inline-block; }

/* Operator */
.ar-op-name { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600; color: #1C2340; line-height: 1; margin-bottom: 6px; letter-spacing: -.01em; }
.ar-op-meta { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #8A96BC; display: flex; align-items: center; gap: 5px; }

/* TODA */
.ar-toda-name { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600; color: #3A4570; line-height: 1; margin-bottom: 5px; }

/* Issue Date */
.ar-date { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: #1C2340; }

/* Status Badge */
.ar-status-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }
.ar-status-active { background: rgba(16,185,129,.1); color: #059669; border: 1px solid rgba(16,185,129,.2); }
.ar-status-revoked { background: rgba(220,38,38,.1); color: #DC2626; border: 1px solid rgba(220,38,38,.2); }

/* Action button */
.ar-view-btn {
    display: inline-flex; align-items: center; justify-content: center;
    height: 36px; padding: 0 14px;
    border-radius: 999px;
    background: #1C2340; color: #FFFFFF;
    border: 1px solid #1C2340;
    text-decoration: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 9px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    transition: all .18s;
    white-space: nowrap;
}
.ar-view-btn:hover {
    background: #2E3A9E;
    border-color: #2E3A9E;
    box-shadow: 0 4px 14px rgba(79,91,203,.25);
}

.ar-empty { padding: 64px 32px; text-align: center; }
.ar-empty-icon { width: 64px; height: 64px; border-radius: 16px; border: 1.5px dashed rgba(28,35,64,.15); display: flex; align-items: center; justify-content: center; color: rgba(28,35,64,.18); margin: 0 auto 20px; }
.ar-empty-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 700; color: #1C2340; margin-bottom: 6px; }
.ar-empty-sub { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #8A96BC; }
`;

export default function ActiveRegistry() {
    const [query, setQuery] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const registryList = [
        {
            plate_no: '8812',
            operator: 'Mario Dela Cruz',
            toda: 'TODA A (Poblacion)',
            make: 'Honda TMX 125',
            issue_date: 'April 5, 2026',
            status: 'active'
        },
        {
            plate_no: '4491',
            operator: 'Juanito Perez',
            toda: 'TODA B (Wawa)',
            make: 'Kawasaki Barako 175',
            issue_date: 'Jan 10, 2026',
            status: 'active'
        },
        {
            plate_no: '1100',
            operator: 'Antonio Luna',
            toda: 'TODA C (Bucana)',
            make: 'Yamaha YTX 125',
            issue_date: 'May 14, 2025',
            status: 'revoked'
        },
    ];

    const filtered = registryList.filter(a =>
        a.operator.toLowerCase().includes(query.toLowerCase()) ||
        a.plate_no.includes(query)
    );

    const activeCount = registryList.filter(r => r.status === 'active').length;
    const revokedCount = registryList.filter(r => r.status === 'revoked').length;

    const handleExport = () => {
        setIsExporting(true);
        // Simulate CSV generation/download delay
        setTimeout(() => {
            setIsExporting(false);
            alert("Registry data exported to CSV successfully.");
        }, 800);
    };

    return (
        <BPLOLayout title="Active Registry" role="BPLO Officer">
            <Head title="Active Registry | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="ar-root">

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
                    <div className="ar-search">
                        <Search size={14} strokeWidth={2} style={{ color: '#8A96BC' }} />
                        <input
                            type="text"
                            placeholder="Search Plate No or Operator..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                style={{ background:'none', border:'none', cursor:'pointer', color:'#8A96BC', display:'flex', padding:0 }}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="ar-toolbar-right">
                        <button className="ar-filter-btn">
                            <Filter size={14} strokeWidth={2} /> Filter
                        </button>

                        <button className="ar-export-btn" onClick={handleExport} disabled={isExporting}>
                            <Download size={14} strokeWidth={2} />
                            {isExporting ? 'Exporting...' : 'Export CSV'}
                        </button>
                    </div>
                </div>

                {/* ── Registry table ── */}
                <div className="ar-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ar-table">
                            <thead>
                                <tr className="ar-thead-row">
                                    <th className="ar-th">Plate No.</th>
                                    <th className="ar-th">Operator</th>
                                    <th className="ar-th">TODA Association</th>
                                    <th className="ar-th">Issue Date</th>
                                    <th className="ar-th">Franchise Status</th>
                                    <th className="ar-th ar-th-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
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
                <p className="ar-body-no">PLT-{unit.plate_no}</p>
            </td>

            {/* Operator */}
            <td className="ar-td">
                <p className="ar-op-name">{unit.operator}</p>
                <p className="ar-op-meta">
                    <Bike size={12} strokeWidth={2} style={{ color: '#4F5BCB' }} />
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

            {/* Action */}
            <td className="ar-td ar-td-right">
                <Link href={`/bplo/registry/${unit.plate_no}`} className="ar-view-btn">
                    View Details
                </Link>
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