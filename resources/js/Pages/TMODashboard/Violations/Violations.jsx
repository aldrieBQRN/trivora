import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, Filter, ShieldAlert,
    AlertCircle, CheckCircle2, Clock,
    ChevronRight, X, FileText, Download
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO COMMAND — Violation Records (Coding Only)
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: vr-* (violation-records)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.vr-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 48px;
}
.vr-root *, .vr-root *::before, .vr-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.vr-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #DC2626;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.vr-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #DC2626; border-radius: 2px;
}
.vr-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.vr-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Stat cards ─────────────────────────────────────────────────────── */
.vr-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
@media (max-width: 768px) { .vr-stats { grid-template-columns: 1fr; } }

.vr-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  position: relative; overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.vr-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.vr-stat-accent { border-top: 2.5px solid #4F5BCB; }
.vr-stat::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(220,38,38,.04) 0%, transparent 70%);
  pointer-events: none;
}
.vr-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.vr-stat-rose    { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);  color: #FFFFFF; }
.vr-stat-amber   { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }
.vr-stat-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.vr-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  color: #1C2340; line-height: 1;
}
.vr-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; margin-top: 5px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.vr-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
}
.vr-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.vr-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.vr-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.vr-search input::placeholder { color: #8A96BC; font-weight: 400; }
.vr-search-icon { color: #6B7280; flex-shrink: 0; }
.vr-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #8A96BC; display: flex; padding: 0;
  transition: color .15s;
}
.vr-clear-btn:hover { color: #1C2340; }

.vr-toolbar-right { display: flex; align-items: center; gap: 10px; }
.vr-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.15);
  background: #FFFFFF; color: #374151;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.vr-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

/* ── Table card ─────────────────────────────────────────────────────── */
.vr-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.vr-table { width: 100%; border-collapse: collapse; }

.vr-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.vr-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #4F5BCB; text-align: left; white-space: nowrap;
  background: rgba(79, 91, 203, 0.05);
}
.vr-th-right { text-align: right; }

.vr-row {
  border-bottom: 1px solid rgba(28,35,64,.05);
  transition: background .15s;
}
.vr-row:last-child { border-bottom: none; }
.vr-row:hover { background: rgba(237,238,244,.7); }
.vr-td { padding: 18px 24px; vertical-align: middle; }
.vr-td-right { text-align: right; }

/* ID & Date cell */
.vr-id-chip {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
  color: #1C2340;
  background: rgba(28,35,64,.06);
  border: 1px solid rgba(28,35,64,.12);
  border-radius: 7px; padding: 5px 11px;
  display: inline-block; margin-bottom: 6px;
}
.vr-date {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC; display: flex; align-items: center; gap: 5px;
}

/* Operator cell */
.vr-op-name {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 5px; letter-spacing: -.01em;
}
.vr-op-meta {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
}

/* Violation Type cell */
.vr-type-name {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #991B1B; line-height: 1; margin-bottom: 5px;
}
.vr-type-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
}

/* Fine & Status cell */
.vr-fine {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px; font-weight: 800;
  color: #1C2340; margin-bottom: 6px;
}
.vr-status-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase;
  padding: 4px 8px; border-radius: 5px;
}
.vr-status-unsettled { background: rgba(217,119,6,.1); color: #B45309; border: 1px solid rgba(217,119,6,.2); }
.vr-status-settled   { background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2); }

/* Action button */
.vr-action-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: #1C2340; color: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  padding: 9px 18px; border-radius: 50px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  text-decoration: none;
  transition: background .18s, box-shadow .18s, transform .18s;
  white-space: nowrap;
}
.vr-action-btn:hover {
  background: #2E3A9E;
  box-shadow: 0 4px 14px rgba(79,91,203,.28);
  transform: translateX(2px);
}

/* td right alignment */
.vr-td-right { text-align: right; }

/* Empty state */
.vr-empty { padding: 64px 0; text-align: center; }
.vr-empty-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(28,35,64,.04);
  border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; color: #8A96BC;
}
.vr-empty-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #3A4570; margin-bottom: 6px;
}
.vr-empty-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}
.vr-file-btn:hover { background: #B91C1C !important; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(220,38,38,.28); }
`;

export default function Violations({ initialViolations = [] }) {
    const [query, setQuery] = useState('');

    // Export handler
    const handleExport = () => {
        const csvContent = [
            ['Incident ID', 'Date', 'Time', 'Operator', 'Plate No', 'TODA', 'Type', 'Source', 'Fine', 'Status'],
            ...violations.map(v => [v.id, v.date, v.time, v.operator, v.plate_no, v.toda, v.type, v.source, v.fine, v.status])
        ]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `Violation_Records_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Violations Data (Dynamic with Mock fallback)
    const violations = initialViolations.length > 0 ? initialViolations : [
        {
            id: 'VIO-26-8841',
            date: '2026-04-05',
            time: '08:45 AM',
            operator: 'Ricardo Dalisay',
            plate_no: '8812',
            toda: 'TODA BUCANA',
            type: 'Coding Violation',
            source: 'Location Tracker',
            fine: 500,
            status: 'unsettled'
        },
        {
            id: 'VIO-26-8839',
            date: '2026-04-04',
            time: '02:15 PM',
            operator: 'Juan Dela Cruz',
            plate_no: '4491',
            toda: 'TODA BRGY. 6',
            type: 'Coding Violation',
            source: 'Location Tracker',
            fine: 500,
            status: 'unsettled'
        },
        {
            id: 'VIO-26-8710',
            date: '2026-04-01',
            time: '11:20 AM',
            operator: 'Mario Santos',
            plate_no: '2245',
            toda: 'TODA BRGY 11',
            type: 'Coding Violation',
            source: 'Location Tracker',
            fine: 500,
            status: 'settled'
        },
    ];

    const filtered = violations.filter(v =>
        v.id.toLowerCase().includes(query.toLowerCase()) ||
        v.operator.toLowerCase().includes(query.toLowerCase()) ||
        v.plate_no.includes(query)
    );

    const unsettledCount = violations.filter(v => v.status === 'unsettled').length;
    const settledCount = violations.filter(v => v.status === 'settled').length;

    return (
        <TrivoraLayout title="Violation Records" role="TMO Officer">
            <Head title="Violation Records | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="vr-root" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Page heading ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                    <div>
                        <p className="vr-eyebrow">Enforcement Records</p>
                        <h1 className="vr-title">Coding Violations</h1>
                        <p className="vr-subtitle">Database of detected coding scheme violations</p>
                    </div>
                    <Link href={route('tmo.violations.create')} className="vr-file-btn" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: '#DC2626', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'none', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,.2)', transition: 'all .2s' }}>
                        <ShieldAlert size={14} /> File Violation Ticket
                    </Link>
                </div>

                {/* ── Stat cards ── */}
                <div className="vr-stats">
                    <StatCard count={violations.length} label="Total Records" icon={ShieldAlert} iconClass="vr-stat-rose" accent />
                    <StatCard count={unsettledCount}    label="Unsettled Fines" icon={AlertCircle} iconClass="vr-stat-amber" />
                    <StatCard count={settledCount}      label="Settled & Cleared" icon={CheckCircle2} iconClass="vr-stat-emerald" />
                </div>

                {/* ── Toolbar ── */}
                <div className="vr-toolbar">
                    <div className="vr-search">
                        <Search size={14} strokeWidth={2} className="vr-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by ID, Operator, or Plate No…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="vr-clear-btn" onClick={() => setQuery('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="vr-toolbar-right">
                        <button className="vr-filter-btn" onClick={handleExport}>
                            <Download size={14} strokeWidth={2} />
                            Export CSV
                        </button>
                        <button className="vr-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter Status
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="vr-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="vr-table">
                            <thead>
                                <tr className="vr-thead-row">
                                    <th className="vr-th">Incident / Date</th>
                                <th className="vr-th">Plate Number</th>
                                <th className="vr-th">Trycicle Driver & TODA</th>
                                <th className="vr-th">Violation</th>
                                    <th className="vr-th">Fine & Status</th>
                                    <th className="vr-th vr-th-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                  <td colSpan={6}>
                                            <div className="vr-empty">
                                                <div className="vr-empty-icon">
                                                    <FileText size={26} strokeWidth={1.4} />
                                                </div>
                                                <p className="vr-empty-title">
                                                    {query ? 'No records found' : 'No Violations Recorded'}
                                                </p>
                                                <p className="vr-empty-sub">
                                                    {query ? 'Try searching a different keyword' : 'All clear for now'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(v => (
                                        <ViolationRow key={v.id} record={v} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({ count, label, icon: Icon, iconClass, accent }) {
    return (
        <div className={`vr-stat${accent ? ' vr-stat-accent' : ''}`}>
            <div className={`vr-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div>
                <p className="vr-stat-val">{count}</p>
                <p className="vr-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function ViolationRow({ record }) {
    return (
        <tr className="vr-row">
            <td className="vr-td">
                <span className="vr-id-chip">{record.id}</span>
                <p className="vr-date">
                    <Clock size={10} strokeWidth={2.5} />
                    {record.date} • {record.time}
                </p>
            </td>
            <td className="vr-td">
        <span className="vr-id-chip">{record.plate_no}</span>
            </td>
            <td className="vr-td">
        <p className="vr-op-name">{record.operator}</p>
              <p className="vr-op-meta">{record.toda}</p>
            </td>
            <td className="vr-td">
        <p className="vr-type-name">{record.type}</p>
        <p className="vr-type-sub">{record.source}</p>
      </td>
      <td className="vr-td">
                <p className="vr-fine">₱{record.fine.toFixed(2)}</p>
                {record.status === 'unsettled' ? (
                    <span className="vr-status-badge vr-status-unsettled">
                        <AlertCircle size={9} strokeWidth={3} /> Unsettled
                    </span>
                ) : (
                    <span className="vr-status-badge vr-status-settled">
                        <CheckCircle2 size={9} strokeWidth={3} /> Settled
                    </span>
                )}
            </td>
            <td className="vr-td vr-td-right">
                <Link href={`/violations/${record.db_id}`} className="vr-action-btn">
                    View Details
                    <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
            </td>
        </tr>
    );
}