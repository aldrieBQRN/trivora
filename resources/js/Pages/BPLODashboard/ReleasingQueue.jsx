import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    Search, Award, ChevronRight, Bike,
    Hash, Filter, CheckCircle2, Inbox, Info, X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Civic Prestige — ReleasingQueue page
   Matches BPLOLayout's slate-indigo system (TMO color palette)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

/* ── Page-level tokens (mirror layout) ─────────────────────────────── */
.rq-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  padding-bottom: 48px;
}
.rq-root *, .rq-root *::before, .rq-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.rq-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.rq-eyebrow::before {
  content: '';
  width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.rq-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.02em;
  color: #1C2340; line-height: 1;
}
.rq-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Stat cards ─────────────────────────────────────────────────────── */
.rq-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 32px; }
@media (max-width: 768px) { .rq-stats { grid-template-columns: 1fr; } }

.rq-stat {
  background: #fff;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  transition: box-shadow .2s, border-color .2s;
  position: relative; overflow: hidden;
}
.rq-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.rq-stat-accent { border-top: 2.5px solid #4F5BCB; }
.rq-stat::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}
.rq-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.rq-stat-blue  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.rq-stat-teal  { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.rq-stat-navy  { background: linear-gradient(135deg, #1C2340 0%, #3A4570 100%);    color: #FFFFFF; }
.rq-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800; color: #1C2340;
  line-height: 1;
}
.rq-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; margin-top: 5px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.rq-toolbar {
  display: flex; align-items: flex-end; justify-content: flex-start;
  gap: 16px; margin-bottom: 20px;
  flex-wrap: wrap;
}
.rq-toolbar-left {}
.rq-toolbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }

.rq-search {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border: 1px solid rgba(28,35,64,.15);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 300px; transition: all .2s;
}
.rq-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 340px;
}
.rq-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500; color: #1C2340;
  width: 100%; letter-spacing: .01em;
}
.rq-search input::placeholder { color: #8A96BC; font-weight: 400; }
.rq-search-icon { color: #8A96BC; flex-shrink: 0; }

.rq-filter-btn {
  height: 42px; padding: 0 16px;
  border-radius: 50px;
  border: 1px solid rgba(28,35,64,.15);
  background: #fff; color: #3A4570;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.rq-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

/* ── Table card ─────────────────────────────────────────────────────── */
.rq-card {
  background: #fff;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.rq-table { width: 100%; border-collapse: collapse; }

/* Table head */
.rq-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.rq-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #4F5BCB; text-align: left; white-space: nowrap;
  background: rgba(79, 91, 203, 0.05);
}
.rq-th-right { text-align: right; }

/* Table rows */
.rq-row {
  border-bottom: 1px solid rgba(28,35,64,.05);
  transition: background .15s;
}
.rq-row:last-child { border-bottom: none; }
.rq-row:hover { background: rgba(237,238,244,.7); }
.rq-td { padding: 18px 24px; vertical-align: middle; }
.rq-td-right { text-align: right; }

/* Tracking ID chip */
.rq-id-chip {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
  color: #2E3A9E;
  background: rgba(79,91,203,.09);
  border: 1px solid rgba(79,91,203,.2);
  border-radius: 7px; padding: 5px 11px;
  display: inline-block;
}

/* Operator cell */
.rq-op-wrap { display: flex; align-items: center; gap: 14px; }
.rq-op-avatar {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(145deg, #2D3B6E 0%, #4F5BCB 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px; font-weight: 700; color: #F1F5FE;
  border: 1px solid rgba(79,91,203,.25);
}
.rq-op-name {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 600; color: #1C2340;
  line-height: 1; margin-bottom: 5px; letter-spacing: -.01em;
}
.rq-op-unit {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 500; color: #8A96BC;
}
.rq-op-unit-icon { color: #4F5BCB; }

/* TODA / TMO cell */
.rq-toda {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600; color: #1C2340;
  margin-bottom: 6px; line-height: 1;
}
.rq-tmo-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #065F46;
  background: rgba(16,185,129,.09);
  border: 1px solid rgba(16,185,129,.18);
  border-radius: 5px; padding: 4px 9px;
}

/* Action button */
.rq-issue-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 18px;
  background: #2D3B6E; color: #F1F5FE;
  border-radius: 50px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  text-decoration: none; border: none; cursor: pointer;
  transition: all .2s; white-space: nowrap;
}
.rq-issue-btn:hover {
  background: #4F5BCB;
  box-shadow: 0 4px 16px rgba(79,91,203,.3);
  transform: translateY(-1px);
}
.rq-issue-btn:active { transform: translateY(0); }

/* ── Empty state ────────────────────────────────────────────────────── */
.rq-empty { padding: 64px 32px; text-align: center; }
.rq-empty-icon {
  width: 64px; height: 64px; border-radius: 16px;
  border: 1.5px dashed rgba(28,35,64,.15);
  display: flex; align-items: center; justify-content: center;
  color: rgba(28,35,64,.18);
  margin: 0 auto 20px;
}
.rq-empty-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px; font-weight: 700; color: #1C2340; margin-bottom: 6px;
}
.rq-empty-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700; letter-spacing: .13em;
  text-transform: uppercase; color: #8A96BC;
}

/* ── Notice box ─────────────────────────────────────────────────────── */
.rq-notice {
  margin-top: 24px;
  background: #fff;
  border: 1px solid rgba(28,35,64,.08);
  border-left: 3px solid #4F5BCB;
  border-radius: 14px;
  padding: 22px 24px;
  display: flex; align-items: flex-start; gap: 16px;
  box-shadow: 0 1px 4px rgba(28,35,64,.04);
}
.rq-notice-icon {
  width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
  background: rgba(79,91,203,.09);
  display: flex; align-items: center; justify-content: center;
  color: #2E3A9E;
}
.rq-notice-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: #1C2340; margin-bottom: 7px;
}
.rq-notice-body {
  font-size: 12.5px; font-weight: 400; color: #3A4570;
  line-height: 1.65;
}

/* ── Stagger animation ──────────────────────────────────────────────── */
.rq-stat  { animation: rqFadeUp .4s cubic-bezier(.2,0,.2,1) both; }
.rq-stat:nth-child(1) { animation-delay: .05s; }
.rq-stat:nth-child(2) { animation-delay: .10s; }
.rq-stat:nth-child(3) { animation-delay: .15s; }
.rq-card  { animation: rqFadeUp .4s .2s cubic-bezier(.2,0,.2,1) both; }
.rq-notice{ animation: rqFadeUp .4s .3s cubic-bezier(.2,0,.2,1) both; }

@keyframes rqFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Responsive table */
@media (max-width: 768px) {
  .rq-search { width: 100%; }
  .rq-toolbar { flex-direction: column; align-items: stretch; }
  .rq-toolbar-right { width: 100%; }
  .rq-th:nth-child(3), .rq-td:nth-child(3) { display: none; }
}
`;

export default function ReleasingQueue() {
    const [query, setQuery] = useState('');

    const readyToRelease = [
        {
            id: 'NSB-26-8812',
            operator: 'Juan Dela Cruz',
            toda: 'TODA A (Poblacion)',
            make: 'Honda TMX 125',
            tmo_passed_at: '15 mins ago',
        },
        {
            id: 'NSB-26-4491',
            operator: 'Ricardo Dalisay',
            toda: 'TODA D (Papaya)',
            make: 'Kawasaki Barako 175',
            tmo_passed_at: '1 hour ago',
        },
    ];

    const filtered = readyToRelease.filter(a =>
        a.id.toLowerCase().includes(query.toLowerCase()) ||
        a.operator.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <BPLOLayout title="Releasing Hub" role="BPLO Officer">
            <Head title="BPLO Releasing | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="rq-root">

                {/* ── Page heading ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="rq-eyebrow">Issuance Hub</p>
                    <h1 className="rq-title">Releasing Queue</h1>
                    <p className="rq-subtitle">Final phase · Body number assignment</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="rq-stats">
                    <StatCard
                        count={readyToRelease.length}
                        label="Pending Issuance"
                        icon={Award}
                        iconClass="rq-stat-blue"
                        accent
                    />
                    <StatCard
                        count="12"
                        label="Issued Today"
                        icon={CheckCircle2}
                        iconClass="rq-stat-teal"
                    />
                    <StatCard
                        count="841"
                        label="Active Registry"
                        icon={Hash}
                        iconClass="rq-stat-navy"
                    />
                </div>

                {/* ── Toolbar ── */}
                <div className="rq-toolbar">
                  <div className="rq-search">
                    <Search size={14} strokeWidth={2} className="rq-search-icon" />
                    <input
                      type="text"
                      placeholder="Search ID or operator…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        style={{ background:'none', border:'none', cursor:'pointer',
                             color:'#8A96BC', display:'flex', padding:0 }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="rq-toolbar-right">
                        <button className="rq-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter
                        </button>
                    </div>
                </div>

                {/* ── Queue table ── */}
                <div className="rq-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="rq-table">
                            <thead>
                                <tr className="rq-thead-row">
                                    <th className="rq-th">Application ID</th>
                                    <th className="rq-th">Operator &amp; Unit</th>
                                    <th className="rq-th">TMO Verification</th>
                                    <th className="rq-th rq-th-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <EmptyState hasQuery={!!query} />
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

                {/* ── Administrative notice ── */}
                <div className="rq-notice">
                    <div className="rq-notice-icon">
                        <Info size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                        <p className="rq-notice-title">Administrative Notice</p>
                        <p className="rq-notice-body">
                            Only units that have successfully completed TMO Phase 2 Inspection
                            will appear here. Finalizing the issuance activates GPS telemetry
                            and initiates automated billing for the current fiscal year.
                        </p>
                    </div>
                </div>

            </div>
        </BPLOLayout>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({ count, label, icon: Icon, iconClass, accent }) {
    return (
        <div className={`rq-stat${accent ? ' rq-stat-accent' : ''}`}>
            <div className={`rq-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div>
                <p className="rq-stat-val">{count}</p>
                <p className="rq-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function QueueRow({ app }) {
    const initial = app.operator.charAt(0);
    return (
        <tr className="rq-row">
            {/* Tracking ID */}
            <td className="rq-td">
                <span className="rq-id-chip">{app.id}</span>
            </td>

            {/* Operator & Unit */}
            <td className="rq-td">
                <div className="rq-op-wrap">
                    <div className="rq-op-avatar">{initial}</div>
                    <div>
                        <p className="rq-op-name">{app.operator}</p>
                        <p className="rq-op-unit">
                            <Bike size={12} strokeWidth={2} className="rq-op-unit-icon" />
                            {app.make}
                        </p>
                    </div>
                </div>
            </td>

            {/* TMO */}
            <td className="rq-td">
                <p className="rq-toda">{app.toda}</p>
                <span className="rq-tmo-badge">
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    TMO Passed · {app.tmo_passed_at}
                </span>
            </td>

            {/* Action */}
            <td className="rq-td rq-td-right">
                <Link href={`/bplo/issue/${app.id}`} className="rq-issue-btn">
                    Issue ID
                    <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
            </td>
        </tr>
    );
}

function EmptyState({ hasQuery }) {
    return (
        <div className="rq-empty">
            <div className="rq-empty-icon">
                <Inbox size={28} strokeWidth={1.4} />
            </div>
            <p className="rq-empty-title">
                {hasQuery ? 'No results found' : 'Queue is clear'}
            </p>
            <p className="rq-empty-sub">
                {hasQuery
                    ? 'Try a different ID or operator name'
                    : 'No units are currently awaiting issuance'}
            </p>
        </div>
    );
}