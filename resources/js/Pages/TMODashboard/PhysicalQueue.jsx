import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, ClipboardCheck, Bike,
    ChevronRight, Clock, Gauge,
    Inbox, X, Calendar, Filter,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Physical Inspection Queue
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: pq-* (physical-queue)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.pq-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 48px;
}
.pq-root *, .pq-root *::before, .pq-root *::after { box-sizing: border-box; }

/* ── Page heading ────────────────────────────────────────────────────── */
.pq-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.pq-eyebrow::before {
  content: '';
  width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.pq-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.pq-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Stat cards ─────────────────────────────────────────────────────── */
.pq-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
@media (max-width: 768px) { .pq-stats { grid-template-columns: 1fr; } }

.pq-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  position: relative; overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.pq-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.pq-stat-accent { border-top: 2.5px solid #4F5BCB; }
.pq-stat::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}
.pq-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pq-stat-indigo { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.pq-stat-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; }
.pq-stat-amber  { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }
.pq-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  color: #1C2340; line-height: 1;
}
.pq-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; margin-top: 5px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.pq-toolbar {
  display: flex; align-items: center; justify-content: flex-start;
  gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
}
.pq-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.pq-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.pq-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.pq-search input::placeholder { color: #8A96BC; font-weight: 400; }
.pq-search-icon { color: #6B7280; flex-shrink: 0; }
.pq-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #8A96BC; display: flex; padding: 0;
  transition: color .15s;
}
.pq-clear-btn:hover { color: #1C2340; }

.pq-toolbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.pq-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.15);
  background: #FFFFFF; color: #374151;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.pq-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

.pq-toolbar-right { display: flex; align-items: center; gap: 10px; }
.pq-count-badge {
  display: flex; align-items: center; gap: 7px;
  height: 42px; padding: 0 16px; border-radius: 50px;
  background: rgba(79,91,203,.08);
  border: 1px solid rgba(79,91,203,.15);
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #4F5BCB;
}

/* ── Table card ─────────────────────────────────────────────────────── */
.pq-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.pq-table { width: 100%; border-collapse: collapse; }

.pq-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.pq-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #4F5BCB; text-align: left; white-space: nowrap;
  background: rgba(79, 91, 203, 0.05);
}
.pq-th-right { text-align: right; }

.pq-row {
  border-bottom: 1px solid rgba(28,35,64,.05);
  transition: background .15s;
}
.pq-row:last-child { border-bottom: none; }
.pq-row:hover { background: rgba(237,238,244,.7); }
.pq-td { padding: 18px 24px; vertical-align: middle; }
.pq-td-right { text-align: right; }

/* ID chip */
.pq-id-chip {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
  color: #2E3A9E;
  background: rgba(79,91,203,.09);
  border: 1px solid rgba(79,91,203,.2);
  border-radius: 7px; padding: 5px 11px;
  display: inline-block;
}

/* Operator cell */
.pq-op-name {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 5px; letter-spacing: -.01em;
}
.pq-op-meta {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
  display: flex; align-items: center; gap: 5px;
}

/* Schedule cell */
.pq-sched-date {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #1C2340; line-height: 1; margin-bottom: 5px;
}
.pq-sched-time {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
  display: flex; align-items: center; gap: 5px;
}

/* Status badge */
.pq-status {
  display: inline-flex; align-items: center;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .11em; text-transform: uppercase;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid transparent;
}
.pq-status-scheduled {
  color: #065F46;
  background: rgba(16, 185, 129, .14);
  border-color: rgba(5, 150, 105, .35);
}
.pq-status-reinspection {
  color: #92400E;
  background: rgba(245, 158, 11, .14);
  border-color: rgba(245, 158, 11, .35);
}

/* Action button */
.pq-action-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: #1C2340; color: #FFFFFF;
  padding: 9px 18px; border-radius: 50px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  text-decoration: none;
  transition: background .18s, box-shadow .18s, transform .18s;
  white-space: nowrap;
}
.pq-action-btn:hover {
  background: #2E3A9E;
  box-shadow: 0 4px 14px rgba(79,91,203,.28);
  transform: translateX(2px);
}

/* Empty state */
.pq-empty {
  padding: 64px 24px;
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
}
.pq-empty-icon {
  width: 52px; height: 52px; border-radius: 14px;
  background: #EDEEF4;
  display: flex; align-items: center; justify-content: center;
  color: #8A96BC; margin: 0 auto 16px;
}
.pq-empty-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #3A4570; margin-bottom: 6px;
}
.pq-empty-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}

/* ── Notice banner ──────────────────────────────────────────────────── */
.pq-notice {
  margin-top: 24px;
  display: flex; align-items: flex-start; gap: 16px;
  padding: 20px 24px;
  background: rgba(79,91,203,.05);
  border: 1px solid rgba(79,91,203,.15);
  border-radius: 14px;
}
.pq-notice-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: #FFFFFF;
  border: 1px solid rgba(79,91,203,.2);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB;
}
.pq-notice-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #4F5BCB; margin-bottom: 6px;
}
.pq-notice-body {
  font-family: 'Inter', sans-serif;
  font-size: 12px; font-weight: 500;
  color: #3A4570; line-height: 1.6;
}
`;

export default function PhysicalQueue() {
    const [query, setQuery] = useState('');

    const applications = [
        {
            id: 'NSB-26-4491',
            operator: 'Ricardo Dalisay',
            toda: 'TODA D (Papaya)',
            make: 'Honda TMX 125',
            scheduled_date: '2026-04-05',
            time_slot: '09:00 AM',
        status: 'Scheduled',
        },
        {
            id: 'NSB-26-5521',
            operator: 'Cardo Santos',
            toda: 'TODA A (Poblacion)',
            make: 'Kawasaki Barako 175',
            scheduled_date: '2026-04-05',
            time_slot: '10:30 AM',
        status: 'Scheduled',
      },
      {
        id: 'NSB-26-5884',
        operator: 'Elena Dela Fuente',
        toda: 'TODA C (Banilad)',
        make: 'Yamaha YTX 125',
        scheduled_date: '2026-04-06',
        time_slot: '01:00 PM',
        status: 'Re-inspection',
      },
      {
        id: 'NSB-26-5927',
        operator: 'Marco Villanueva',
        toda: 'TODA B (Wawa)',
        make: 'Rusi TC 125',
        scheduled_date: '2026-04-06',
        time_slot: '02:30 PM',
        status: 'Re-inspection',
        },
    ];

    const scheduledCount = applications.filter(a => a.status === 'Scheduled').length;
    const reinspectionCount = applications.filter(a => a.status === 'Re-inspection').length;

    const filtered = applications.filter(a =>
        a.id.toLowerCase().includes(query.toLowerCase()) ||
      a.operator.toLowerCase().includes(query.toLowerCase()) ||
      a.status.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <TrivoraLayout title="Physical Inspection Queue" role="TMO Officer">
            <Head title="Physical Inspection | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="pq-root" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Page heading ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="pq-eyebrow">TMO Operations</p>
                    <h1 className="pq-title">Physical Inspection</h1>
                    <p className="pq-subtitle">Phase 2 · On-site testing and Trycicle verification</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="pq-stats">
                  <StatCard count={scheduledCount}   label="Scheduled Today" icon={ClipboardCheck} iconClass="pq-stat-indigo" accent />
                  <StatCard count="5"               label="Completed Today" icon={ClipboardCheck} iconClass="pq-stat-emerald" />
                  <StatCard count={reinspectionCount} label="Re-inspection"  icon={Clock}         iconClass="pq-stat-amber" />
                </div>

                {/* ── Toolbar ── */}
                <div className="pq-toolbar">
                    <div className="pq-search">
                        <Search size={14} strokeWidth={2} className="pq-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name or ID…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="pq-clear-btn" onClick={() => setQuery('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="pq-toolbar-right">
                        <button className="pq-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter
                        </button>
                        <div className="pq-count-badge">
                            <Clock size={13} strokeWidth={2} />
                          Scheduled: {scheduledCount}
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="pq-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="pq-table">
                            <thead>
                                <tr className="pq-thead-row">
                                    <th className="pq-th">Application ID</th>
                                    <th className="pq-th">Trycicle Driver</th>
                                    <th className="pq-th">Schedule</th>
                                    <th className="pq-th">Status</th>
                                    <th className="pq-th pq-th-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                      <td colSpan={5}>
                                            <div className="pq-empty">
                                                <div className="pq-empty-icon">
                                                    <Inbox size={24} strokeWidth={1.4} />
                                                </div>
                                                <p className="pq-empty-title">
                                                    {query ? 'No results found' : 'No Scheduled Inspections'}
                                                </p>
                                                <p className="pq-empty-sub">
                                                    {query ? 'Try a different name or ID' : 'Queue is currently empty'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(app => (
                                        <QueueRow key={app.id} app={app} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Field protocol notice ── */}
                <div className="pq-notice">
                    <div className="pq-notice-icon">
                        <Gauge size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                        <p className="pq-notice-title">TMO Field Protocol</p>
                        <p className="pq-notice-body">
                            Inspect units only when the Trycicle Driver is physically present.
                            Ensure safety gear is also verified during the road test.
                        </p>
                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({ count, label, icon: Icon, iconClass, accent }) {
    return (
        <div className={`pq-stat${accent ? ' pq-stat-accent' : ''}`}>
            <div className={`pq-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div>
                <p className="pq-stat-val">{count}</p>
                <p className="pq-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function QueueRow({ app }) {
    return (
        <tr className="pq-row">
            <td className="pq-td">
                <span className="pq-id-chip">{app.id}</span>
            </td>
            <td className="pq-td">
                <p className="pq-op-name">{app.operator}</p>
                <p className="pq-op-meta">
                    <Bike size={11} strokeWidth={2} />
                    {app.make}
                </p>
            </td>
            <td className="pq-td">
                <p className="pq-sched-date">{app.scheduled_date}</p>
                <p className="pq-sched-time">
                    <Clock size={10} strokeWidth={2} />
                    {app.time_slot}
                </p>
            </td>
            <td className="pq-td">
              <span className={`pq-status ${app.status === 'Scheduled' ? 'pq-status-scheduled' : 'pq-status-reinspection'}`}>
                {app.status}
              </span>
            </td>
            <td className="pq-td pq-td-right">
                <Link href={`/tmo/review/physical/${app.id}`} className="pq-action-btn">
                    Start Inspection
                    <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
            </td>
        </tr>
    );
}