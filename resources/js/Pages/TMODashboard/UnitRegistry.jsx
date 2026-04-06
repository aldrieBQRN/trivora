import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, Filter, Bike,
    AlertTriangle, CheckCircle2,
    X, MapPin, Calendar
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO COMMAND — Unit Registry
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: ur-* (unit-registry)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ur-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
}
.ur-root *, .ur-root *::before, .ur-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.ur-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.ur-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.ur-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.ur-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Stat cards ─────────────────────────────────────────────────────── */
.ur-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
@media (max-width: 768px) { .ur-stats { grid-template-columns: 1fr; } }

.ur-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  position: relative; overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.ur-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.ur-stat-accent { border-top: 2.5px solid #4F5BCB; }
.ur-stat::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}
.ur-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ur-stat-indigo  { background: rgba(79,91,203,.10);  color: #2E3A9E; }
.ur-stat-emerald { background: rgba(5,150,105,.09);  color: #065F46; }
.ur-stat-amber   { background: rgba(217,119,6,.09);  color: #78350F; }
.ur-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  color: #1C2340; line-height: 1;
}
.ur-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; margin-top: 5px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.ur-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
}
.ur-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.ur-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.ur-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.ur-search input::placeholder { color: #8A96BC; font-weight: 400; }
.ur-search-icon { color: #8A96BC; flex-shrink: 0; }
.ur-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #8A96BC; display: flex; padding: 0;
  transition: color .15s;
}
.ur-clear-btn:hover { color: #1C2340; }

.ur-toolbar-right { display: flex; align-items: center; gap: 10px; }
.ur-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.09);
  background: #FFFFFF; color: #5A6488;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.ur-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

/* ── Table card ─────────────────────────────────────────────────────── */
.ur-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.ur-table { width: 100%; border-collapse: collapse; }

.ur-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.ur-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-align: left; white-space: nowrap;
}

.ur-row {
  border-bottom: 1px solid rgba(28,35,64,.05);
  transition: background .15s;
}
.ur-row:last-child { border-bottom: none; }
.ur-row:hover { background: rgba(237,238,244,.7); }
.ur-td { padding: 18px 24px; vertical-align: middle; }

/* Unit ID cell */
.ur-body-no {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 800;
  color: #1C2340; line-height: 1; margin-bottom: 4px;
}
.ur-plate-no {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
  background: rgba(28,35,64,.05);
  border: 1px solid rgba(28,35,64,.1);
  padding: 3px 8px; border-radius: 5px;
  display: inline-block;
}

/* Operator cell */
.ur-op-name {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 6px; letter-spacing: -.01em;
}
.ur-op-meta {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
  display: flex; align-items: center; gap: 5px;
}

/* TODA & Coding cell */
.ur-toda-name {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #3A4570; line-height: 1; margin-bottom: 5px;
}
.ur-coding-day {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #4F5BCB; display: flex; align-items: center; gap: 4px;
}

/* Status cell */
.ur-status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 6px;
}
.ur-status-active    { background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2); }
.ur-status-suspended { background: rgba(217,119,6,.1); color: #B45309; border: 1px solid rgba(217,119,6,.2); }

/* Empty state */
.ur-empty { padding: 64px 0; text-align: center; }
.ur-empty-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(28,35,64,.04);
  border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; color: #8A96BC;
}
.ur-empty-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #3A4570; margin-bottom: 6px;
}
.ur-empty-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}
`;

export default function UnitRegistry() {
    const [query, setQuery] = useState('');

    // Mock Registry Data (Strictly Active or Suspended)
    const units = [
        {
            id: 'NSB-26-8812',
            body_no: 'N-142',
            plate_no: '8812',
            operator: 'Ricardo Dalisay',
            contact: '0917 123 4567',
            toda: 'TODA D (Papaya)',
            coding_day: 'Monday',
            status: 'active'
        },
        {
            id: 'NSB-26-5521',
            body_no: 'N-089',
            plate_no: '4491',
            operator: 'Cardo Santos',
            contact: '0918 555 1234',
            toda: 'TODA A (Poblacion)',
            coding_day: 'Tuesday',
            status: 'active'
        },
        {
            id: 'NSB-26-1123',
            body_no: 'N-301',
            plate_no: '2245',
            operator: 'Juan Dela Cruz',
            contact: '0919 888 9999',
            toda: 'TODA B (Wawa)',
            coding_day: 'Wednesday',
            status: 'suspended'
        },
        {
            id: 'NSB-26-9988',
            body_no: 'N-012',
            plate_no: '1100',
            operator: 'Maria Clara',
            contact: '0920 111 2222',
            toda: 'TODA C (Bucana)',
            coding_day: 'Friday',
            status: 'active'
        },
    ];

    const filtered = units.filter(u =>
        u.body_no.toLowerCase().includes(query.toLowerCase()) ||
        u.operator.toLowerCase().includes(query.toLowerCase()) ||
        u.plate_no.includes(query)
    );

    const totalCount     = units.length;
    const activeCount    = units.filter(u => u.status === 'active').length;
    const suspendedCount = units.filter(u => u.status === 'suspended').length;

    return (
        <TrivoraLayout title="Unit Registry" role="TMO Officer">
            <Head title="Unit Registry | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="ur-root" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Page heading ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="ur-eyebrow">Unit Management</p>
                    <h1 className="ur-title">Active Unit Registry</h1>
                    <p className="ur-subtitle">Master record of all registered and operating tricycles in Nasugbu</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="ur-stats">
                    <StatCard count={totalCount}     label="Total Registered" icon={Bike}          iconClass="ur-stat-indigo" accent />
                    <StatCard count={activeCount}    label="Active Units"     icon={CheckCircle2}  iconClass="ur-stat-emerald" />
                    <StatCard count={suspendedCount} label="Suspended Units"  icon={AlertTriangle} iconClass="ur-stat-amber" />
                </div>

                {/* ── Toolbar ── */}
                <div className="ur-toolbar">
                    <div className="ur-search">
                        <Search size={14} strokeWidth={2} className="ur-search-icon" />
                        <input
                            type="text"
                            placeholder="Search Body No, Plate, or Operator…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="ur-clear-btn" onClick={() => setQuery('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="ur-toolbar-right">
                        <button className="ur-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter Status
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="ur-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ur-table">
                            <thead>
                                <tr className="ur-thead-row">
                                    <th className="ur-th">Unit Details</th>
                                    <th className="ur-th">Operator</th>
                                    <th className="ur-th">Route & Coding</th>
                                    <th className="ur-th">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="ur-empty">
                                                <div className="ur-empty-icon">
                                                    <Bike size={26} strokeWidth={1.4} />
                                                </div>
                                                <p className="ur-empty-title">
                                                    {query ? 'No records found' : 'Registry is empty'}
                                                </p>
                                                <p className="ur-empty-sub">
                                                    {query ? 'Try searching a different keyword' : 'No registered tricycles yet.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(unit => (
                                        <UnitRow key={unit.id} unit={unit} />
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
        <div className={`ur-stat${accent ? ' ur-stat-accent' : ''}`}>
            <div className={`ur-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2} />
            </div>
            <div>
                <p className="ur-stat-val">{count}</p>
                <p className="ur-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function UnitRow({ unit }) {
    const getStatusDetails = (status) => {
        switch (status) {
            case 'active':    return { label: 'Active',    class: 'ur-status-active',    icon: CheckCircle2 };
            case 'suspended': return { label: 'Suspended', class: 'ur-status-suspended', icon: AlertTriangle };
            default:          return { label: 'Active',    class: 'ur-status-active',    icon: CheckCircle2 };
        }
    };

    const statusInfo = getStatusDetails(unit.status);
    const StatusIcon = statusInfo.icon;

    return (
        <tr className="ur-row">
            <td className="ur-td">
                <p className="ur-body-no">{unit.body_no}</p>
                <span className="ur-plate-no">Plate: {unit.plate_no}</span>
            </td>
            <td className="ur-td">
                <p className="ur-op-name">{unit.operator}</p>
                <p className="ur-op-meta">
                    <MapPin size={10} strokeWidth={2.5} />
                    {unit.contact}
                </p>
            </td>
            <td className="ur-td">
                <p className="ur-toda-name">{unit.toda}</p>
                <p className="ur-coding-day">
                    <Calendar size={10} strokeWidth={2.5} />
                    Coding: {unit.coding_day}
                </p>
            </td>
            <td className="ur-td">
                <span className={`ur-status-badge ${statusInfo.class}`}>
                    <StatusIcon size={10} strokeWidth={3} /> {statusInfo.label}
                </span>
            </td>
        </tr>
    );
}