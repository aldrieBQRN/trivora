import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, FileSearch, Clock,
    ChevronRight, AlertCircle, Inbox, FileText, X, Filter,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO COMMAND — Document Review Queue page
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: dq-* (document-queue)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.dq-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
}
.dq-root *, .dq-root *::before, .dq-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.dq-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.dq-eyebrow::before {
  content: '';
  width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.dq-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.dq-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Stat cards ─────────────────────────────────────────────────────── */
.dq-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
@media (max-width: 768px) { .dq-stats { grid-template-columns: 1fr; } }

.dq-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  position: relative; overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.dq-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.dq-stat-accent { border-top: 2.5px solid #4F5BCB; }
.dq-stat::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}
.dq-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.dq-stat-indigo  { background: rgba(79,91,203,.10);  color: #2E3A9E; }
.dq-stat-amber   { background: rgba(217,119,6,.09);   color: #78350F; }
.dq-stat-slate   { background: rgba(28,35,64,.06);    color: #3A4570; }
.dq-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  color: #1C2340; line-height: 1;
}
.dq-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; margin-top: 5px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.dq-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
}
.dq-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.dq-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.dq-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.dq-search input::placeholder { color: #8A96BC; font-weight: 400; }
.dq-search-icon { color: #8A96BC; flex-shrink: 0; }
.dq-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #8A96BC; display: flex; padding: 0;
  transition: color .15s;
}
.dq-clear-btn:hover { color: #1C2340; }

.dq-toolbar-right { display: flex; align-items: center; gap: 10px; }
.dq-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.09);
  background: #FFFFFF; color: #5A6488;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.dq-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

.dq-count-badge {
  display: flex; align-items: center; gap: 7px;
  height: 42px; padding: 0 16px; border-radius: 50px;
  background: rgba(79,91,203,.08);
  border: 1px solid rgba(79,91,203,.15);
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #4F5BCB;
}

/* ── Table card ─────────────────────────────────────────────────────── */
.dq-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.dq-table { width: 100%; border-collapse: collapse; }

.dq-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.dq-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-align: left; white-space: nowrap;
}
.dq-th-right { text-align: right; }

.dq-row {
  border-bottom: 1px solid rgba(28,35,64,.05);
  transition: background .15s;
}
.dq-row:last-child { border-bottom: none; }
.dq-row:hover { background: rgba(237,238,244,.7); }
.dq-td { padding: 18px 24px; vertical-align: middle; }
.dq-td-right { text-align: right; }

/* ID chip */
.dq-id-chip {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
  color: #2E3A9E;
  background: rgba(79,91,203,.09);
  border: 1px solid rgba(79,91,203,.2);
  border-radius: 7px; padding: 5px 11px;
  display: inline-block;
}

/* Operator cell */
.dq-op-name {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 5px; letter-spacing: -.01em;
}
.dq-op-toda {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
}

/* Files cell */
.dq-files-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: #5A6488;
  background: rgba(28,35,64,.04);
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 7px; padding: 5px 10px;
}

/* Time cell */
.dq-time {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}

/* Action button */
.dq-action-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: #1C2340; color: #FFFFFF;
  padding: 9px 18px; border-radius: 50px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  text-decoration: none;
  transition: background .18s, box-shadow .18s, transform .18s;
  white-space: nowrap;
}
.dq-action-btn:hover {
  background: #2E3A9E;
  box-shadow: 0 4px 14px rgba(79,91,203,.28);
  transform: translateX(2px);
}

/* Empty state */
.dq-empty {
  padding: 64px 0; text-align: center;
}
.dq-empty-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(28,35,64,.04);
  border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; color: #8A96BC;
}
.dq-empty-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #3A4570; margin-bottom: 6px;
}
.dq-empty-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}

/* ── Notice banner ──────────────────────────────────────────────────── */
.dq-notice {
  margin-top: 24px;
  display: flex; align-items: flex-start; gap: 16px;
  padding: 20px 24px;
  background: rgba(79,91,203,.05);
  border: 1px solid rgba(79,91,203,.15);
  border-radius: 14px;
}
.dq-notice-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: #FFFFFF;
  border: 1px solid rgba(79,91,203,.2);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB;
}
.dq-notice-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #4F5BCB; margin-bottom: 6px;
}
.dq-notice-body {
  font-family: 'Inter', sans-serif;
  font-size: 12px; font-weight: 500;
  color: #3A4570; line-height: 1.6;
}
`;

export default function DocumentQueue() {
    const [query, setQuery] = useState('');

    const applications = [
        { id: 'NSB-26-8812', operator: 'Juan Dela Cruz',  toda: 'TODA A (Poblacion)', submitted_at: '2 hours ago', docs_count: 5 },
        { id: 'NSB-26-9012', operator: 'Maria Clara',     toda: 'TODA B (Wawa)',       submitted_at: '5 hours ago', docs_count: 4 },
    ];

    const filtered = applications.filter(a =>
        a.id.toLowerCase().includes(query.toLowerCase()) ||
        a.operator.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <TrivoraLayout title="Document Review Queue" role="TMO Officer">
            <Head title="Document Review | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="dq-root" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Page heading ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="dq-eyebrow">TMO Operations</p>
                    <h1 className="dq-title">Document Review</h1>
                    <p className="dq-subtitle">Phase 1 · Review digital submissions and schedule physical testing</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="dq-stats">
                    <StatCard count={applications.length} label="Pending Review"    icon={FileSearch} iconClass="dq-stat-indigo" accent />
                    <StatCard count="8"                   label="Reviewed Today"    icon={FileText}   iconClass="dq-stat-amber"  />
                    <StatCard count="3"                   label="Awaiting Callback" icon={Clock}      iconClass="dq-stat-slate"  />
                </div>

                {/* ── Toolbar ── */}
                <div className="dq-toolbar">
                    <div className="dq-search">
                        <Search size={14} strokeWidth={2} className="dq-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name or ID…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="dq-clear-btn" onClick={() => setQuery('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="dq-toolbar-right">
                        <button className="dq-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter
                        </button>
                        <div className="dq-count-badge">
                            <Clock size={13} strokeWidth={2} />
                            Pending: {applications.length}
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="dq-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="dq-table">
                            <thead>
                                <tr className="dq-thead-row">
                                    <th className="dq-th">Application ID</th>
                                    <th className="dq-th">Applicant</th>
                                    <th className="dq-th">Files</th>
                                    <th className="dq-th">Submission</th>
                                    <th className="dq-th dq-th-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5}>
                                            <div className="dq-empty">
                                                <div className="dq-empty-icon">
                                                    <Inbox size={26} strokeWidth={1.4} />
                                                </div>
                                                <p className="dq-empty-title">
                                                    {query ? 'No results found' : 'Queue is Empty'}
                                                </p>
                                                <p className="dq-empty-sub">
                                                    {query ? 'Try a different name or ID' : 'No applications are pending review'}
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

                {/* ── Policy notice ── */}
                <div className="dq-notice">
                    <div className="dq-notice-icon">
                        <AlertCircle size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                        <p className="dq-notice-title">Nasugbu TMO Policy</p>
                        <p className="dq-notice-body">
                            Verify OR/CR validity and Driver's License restriction (Code 1/A1) before scheduling.
                            Ensure all clearances are original and current.
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
        <div className={`dq-stat${accent ? ' dq-stat-accent' : ''}`}>
            <div className={`dq-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div>
                <p className="dq-stat-val">{count}</p>
                <p className="dq-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function QueueRow({ app }) {
    return (
        <tr className="dq-row">
            <td className="dq-td">
                <span className="dq-id-chip">{app.id}</span>
            </td>
            <td className="dq-td">
                <p className="dq-op-name">{app.operator}</p>
                <p className="dq-op-toda">{app.toda}</p>
            </td>
            <td className="dq-td">
                <span className="dq-files-badge">
                    <FileText size={12} strokeWidth={2} />
                    {app.docs_count} Items
                </span>
            </td>
            <td className="dq-td">
                <span className="dq-time">{app.submitted_at}</span>
            </td>
            <td className="dq-td dq-td-right">
                <Link href={`/tmo/review/docs/${app.id}`} className="dq-action-btn">
                    Start Review
                    <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
            </td>
        </tr>
    );
}