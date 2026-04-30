import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, Filter, Bike,
    AlertTriangle, CheckCircle2,
    X, MapPin, Calendar, Download, ChevronRight
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO COMMAND — Tricycle Registry
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: tr-* (tricycle-registry)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.tr-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 48px;
}
.tr-root *, .tr-root *::before, .tr-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.tr-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.tr-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.tr-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.tr-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Stat cards ─────────────────────────────────────────────────────── */
.tr-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
@media (max-width: 768px) { .tr-stats { grid-template-columns: 1fr; } }

.tr-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  position: relative; overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.tr-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.tr-stat-accent { border-top: 2.5px solid #4F5BCB; }
.tr-stat::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}
.tr-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tr-stat-indigo  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; border-radius: 10px; }
.tr-stat-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; border-radius: 10px; }
.tr-stat-amber   { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; border-radius: 10px; }
.tr-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  color: #1C2340; line-height: 1;
}
.tr-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; margin-top: 5px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.tr-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
}
.tr-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.tr-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.tr-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.tr-search input::placeholder { color: #8A96BC; font-weight: 400; }
.tr-search-icon { color: #6B7280; flex-shrink: 0; }
.tr-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #6B7280; display: flex; padding: 0;
  transition: color .15s;
}
.tr-clear-btn:hover { color: #1C2340; }

.tr-toolbar-right { display: flex; align-items: center; gap: 10px; }
.tr-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.15);
  background: #FFFFFF; color: #374151;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.tr-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

/* ── Table card ─────────────────────────────────────────────────────── */
.tr-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.tr-table { width: 100%; border-collapse: collapse; }

.tr-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.tr-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #4F5BCB; text-align: left; white-space: nowrap;
  background: rgba(79, 91, 203, 0.05);
}

.tr-row {
  border-bottom: 1px solid rgba(28,35,64,.05);
  transition: background .15s;
}
.tr-row:last-child { border-bottom: none; }
.tr-row:hover { background: rgba(237,238,244,.7); }
.tr-td { padding: 18px 24px; vertical-align: middle; }

/* Tricycle ID cell */
.tr-body-no {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 800;
  color: #1C2340; line-height: 1; margin-bottom: 4px;
}
.tr-plate-no {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: #4F5BCB;
  background: rgba(79,91,203,.1);
  border: 1px solid rgba(79,91,203,.25);
  padding: 3px 8px; border-radius: 5px;
  display: inline-block;
}

/* Operator cell */
.tr-op-name {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 6px; letter-spacing: -.01em;
}
.tr-op-meta {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #6B7280;
  display: flex; align-items: center; gap: 5px;
}

/* TODA & Coding cell */
.tr-toda-name {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #3A4570; line-height: 1; margin-bottom: 5px;
}
.tr-coding-day {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #4F5BCB; display: flex; align-items: center; gap: 4px;
}

/* Status cell */
.tr-status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 6px;
}
.tr-status-active    { background: rgba(5,150,105,.15); color: #059669; border: 1px solid rgba(5,150,105,.35); }
.tr-status-suspended { background: rgba(249,115,22,.15); color: #D97706; border: 1px solid rgba(249,115,22,.35); }

/* Action button */
.tr-action-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: #1C2340; color: #FFFFFF;
  padding: 9px 18px; border-radius: 50px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  text-decoration: none;
  transition: background .18s, box-shadow .18s, transform .18s;
  white-space: nowrap;
}
.tr-action-btn:hover {
  background: #2E3A9E;
  box-shadow: 0 4px 14px rgba(79,91,203,.28);
  transform: translateX(2px);
}

/* td right alignment */
.tr-td-right { text-align: right; }

/* Empty state */
.tr-empty { padding: 64px 0; text-align: center; }
.tr-empty-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(79,91,203,.1);
  border: 1px solid rgba(79,91,203,.2);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; color: #4F5BCB;
}
.tr-empty-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #3A4570; margin-bottom: 6px;
}
.tr-empty-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}
`;

export default function TricycleRegistry() {
    const [query, setQuery] = useState('');

    // Export handler
    const handleExport = () => {
        const csvContent = [
            ['Unit ID', 'Plate No', 'Operator', 'Contact', 'TODA', 'Coding Day', 'Status'],
            ...units.map(u => [u.body_no, u.plate_no, u.operator, u.contact, u.toda, u.coding_day, u.status])
        ]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `Tricycle_Registry_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
        <TrivoraLayout title="Tricycle Registry" role="TMO Officer">
            <Head title="Tricycle Registry | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="tr-root" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Page heading ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="tr-eyebrow">Tricycle Management</p>
                    <h1 className="tr-title">Active Tricycle Registry</h1>
                    <p className="tr-subtitle">Master record of all registered and operating tricycles in Nasugbu</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="tr-stats">
                    <StatCard count={totalCount}     label="Total Registered" icon={Bike}          iconClass="tr-stat-indigo" accent />
                    <StatCard count={activeCount}    label="Active Tricycles"     icon={CheckCircle2}  iconClass="tr-stat-emerald" />
                    <StatCard count={suspendedCount} label="Suspended Tricycles"  icon={AlertTriangle} iconClass="tr-stat-amber" />
                </div>

                {/* ── Toolbar ── */}
                <div className="tr-toolbar">
                    <div className="tr-search">
                        <Search size={14} strokeWidth={2} className="tr-search-icon" />
                        <input
                            type="text"
                            placeholder="Search Unit ID, Plate, or Operator…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="tr-clear-btn" onClick={() => setQuery('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="tr-toolbar-right">
                        <button className="tr-filter-btn" onClick={handleExport}>
                            <Download size={14} strokeWidth={2} />
                            Export CSV
                        </button>
                        <button className="tr-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter Status
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="tr-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tr-table">
                            <thead>
                                <tr className="tr-thead-row">
                                    <th className="tr-th">Tricycle ID</th>
                                    <th className="tr-th">Plate Number</th>
                                    <th className="tr-th">Trycicle Driver</th>
                                    <th className="tr-th">TODA & Coding</th>
                                    <th className="tr-th">Status</th>
                                    <th className="tr-th">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="tr-empty">
                                                <div className="tr-empty-icon">
                                                    <Bike size={26} strokeWidth={1.4} color="#8A96BC" />
                                                </div>
                                                <p className="tr-empty-title">
                                                    {query ? 'No records found' : 'Registry is empty'}
                                                </p>
                                                <p className="tr-empty-sub">
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
    const iconColors = {
        'tr-stat-indigo': '#FFFFFF',
        'tr-stat-emerald': '#FFFFFF',
        'tr-stat-amber': '#FFFFFF'
    };
    return (
        <div className={`tr-stat${accent ? ' tr-stat-accent' : ''}`}>
            <div className={`tr-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2.5} color={iconColors[iconClass]} />
            </div>
            <div>
                <p className="tr-stat-val">{count}</p>
                <p className="tr-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function UnitRow({ unit }) {
    const getStatusDetails = (status) => {
        switch (status) {
            case 'active':    return { label: 'Active',    class: 'tr-status-active',    icon: CheckCircle2 };
            case 'suspended': return { label: 'Suspended', class: 'tr-status-suspended', icon: AlertTriangle };
            default:          return { label: 'Active',    class: 'tr-status-active',    icon: CheckCircle2 };
        }
    };

    const statusInfo = getStatusDetails(unit.status);
    const StatusIcon = statusInfo.icon;

    return (
        <tr className="tr-row">
            <td className="tr-td">
                <p className="tr-body-no">{unit.body_no}</p>
            </td>
            <td className="tr-td">
                <span className="tr-plate-no">{unit.plate_no}</span>
            </td>
            <td className="tr-td">
                <p className="tr-op-name">{unit.operator}</p>
                <p className="tr-op-meta">
                    <MapPin size={10} strokeWidth={2.5} color="#8A96BC" />
                    {unit.contact}
                </p>
            </td>
            <td className="tr-td">
                <p className="tr-toda-name">{unit.toda}</p>
                <p className="tr-coding-day">
                    <Calendar size={10} strokeWidth={2.5} color="#4F5BCB" />
                    Coding: {unit.coding_day}
                </p>
            </td>
            <td className="tr-td">
                <span className={`tr-status-badge ${statusInfo.class}`}>
                    <StatusIcon size={10} strokeWidth={3} color={statusInfo.class === 'tr-status-active' ? '#059669' : '#B45309'} /> {statusInfo.label}
                </span>
            </td>
            <td className="tr-td tr-td-right">
                <Link href={route('tricycle.details', unit.id)} className="tr-action-btn">
                    View Details
                    <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
            </td>
        </tr>
    );
}