import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    Search,
    MapPin,
    User,
    Activity,
    Settings,
    Navigation2,
    Wifi,
    WifiOff,
    Bike,
    FileText,
    X,
    Filter
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — My Tricycles (Formerly Fleet)
   Path: resources/js/Pages/Operator/Fleet.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.f-root { font-family: 'Inter', sans-serif; color: #1C2340; padding-bottom: 64px; max-width: 1200px; margin: 0 auto; }
.f-root *, .f-root *::before, .f-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.f-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.f-eyebrow::before {
  content: '';
  width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.f-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.f-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.f-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 24px; flex-wrap: wrap;
}
.f-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.f-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.f-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.f-search input::placeholder { color: #8A96BC; font-weight: 400; }
.f-search-icon { color: #8A96BC; flex-shrink: 0; }
.f-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #8A96BC; display: flex; padding: 0;
  transition: color .15s;
}
.f-clear-btn:hover { color: #1C2340; }

.f-toolbar-right { display: flex; align-items: center; gap: 10px; }
.f-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.09);
  background: #FFFFFF; color: #5A6488;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.f-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

.f-count-badge {
  display: flex; align-items: center; gap: 7px;
  height: 42px; padding: 0 16px; border-radius: 50px;
  background: rgba(79,91,203,.08);
  border: 1px solid rgba(79,91,203,.15);
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #4F5BCB;
}

/* Stats Row */
.f-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px; }
.f-stat-card {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; padding: 24px;
    display: flex; align-items: center; gap: 20px; box-shadow: 0 1px 4px rgba(28,35,64,.04);
}
.f-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.f-stat-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8A96BC; margin-bottom: 4px; }
.f-stat-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #1C2340; line-height: 1; }

/* Fleet Grid */
.f-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }

/* Unit Card */
.f-card {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 20px;
    overflow: hidden; box-shadow: 0 4px 20px rgba(28,35,64,.03); transition: transform .2s, box-shadow .2s;
    display: flex; flex-direction: column;
}
.f-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(28,35,64,.06); border-color: rgba(79,91,203,.2); }

.f-card-header { padding: 24px 24px 16px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed rgba(28,35,64,.08); }
.f-unit-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: rgba(79,91,203,.08); color: #4F5BCB; border-radius: 12px; margin-bottom: 12px; }
.f-unit-id { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #1C2340; line-height: 1; margin-bottom: 4px; }
.f-unit-model { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: #5A6488; }

.f-status-pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 50px;
    font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
}
.f-status-online { background: rgba(5,150,105,.1); color: #059669; }
.f-status-offline { background: rgba(220,38,38,.08); color: #DC2626; }

.f-card-body { padding: 20px 24px; flex: 1; display: flex; flex-direction: column; gap: 16px; }

.f-info-row { display: flex; align-items: center; gap: 12px; }
.f-info-icon { width: 32px; height: 32px; border-radius: 8px; background: #F8F9FC; color: #8A96BC; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.f-info-text { flex: 1; }
.f-info-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-bottom: 2px; }
.f-info-value { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #1C2340; display: flex; align-items: center; gap: 6px; }

.f-color-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

.f-card-footer { padding: 16px 24px; background: #FAFAFC; border-top: 1px solid rgba(28,35,64,.05); display: flex; gap: 12px; }
.f-btn-primary {
    flex: 1; height: 40px; border-radius: 10px; background: #1C2340; color: #FFFFFF;
    font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: all .2s;
    text-decoration: none;
}
.f-btn-primary:hover { background: #2E3A9E; }
.f-btn-secondary {
    width: 40px; height: 40px; border-radius: 10px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.15);
    color: #5A6488; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s;
}
.f-btn-secondary:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.3); }

/* Empty state */
.f-empty { padding: 64px 0; text-align: center; grid-column: 1 / -1; }
.f-empty-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(28,35,64,.04); border: 1px solid rgba(28,35,64,.08); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #8A96BC; }
.f-empty-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #3A4570; margin-bottom: 6px; }
.f-empty-sub { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; }
`;

export default function Tricycles() {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock Tricycle Data
    const tricycles = [
        {
            id: 'NSB-123',
            makeModel: 'Honda TMX 125 Alpha',
            plateNo: '123-ABC',
            driver: 'Mario Dela Cruz (Self)',
            zone: 'Wawa / Barangay 1-4',
            colorCode: 'Green',
            colorHex: '#059669',
            status: 'online',
            lastPing: 'Just now',
            iotBattery: '89%'
        },
        {
            id: 'NSB-456',
            makeModel: 'Kawasaki Barako 175',
            plateNo: '456-DEF',
            driver: 'Luigi Dela Cruz',
            zone: 'Poblacion Proper',
            colorCode: 'Yellow',
            colorHex: '#D97706',
            status: 'offline',
            lastPing: '2 hours ago',
            iotBattery: '12%'
        },
        {
            id: 'NSB-789',
            makeModel: 'Yamaha SZ 150',
            plateNo: '789-GHI',
            driver: 'Pedro Penduko',
            zone: 'Lumbangan / Bucana',
            colorCode: 'Blue',
            colorHex: '#2563EB',
            status: 'online',
            lastPing: '5 mins ago',
            iotBattery: '74%'
        }
    ];

    const stats = [
        { label: 'Total Tricycles', value: '3', icon: Bike, color: '#4F5BCB', bg: 'rgba(79,91,203,.08)' },
        { label: 'IoT Online', value: '2', icon: Wifi, color: '#059669', bg: 'rgba(5,150,105,.08)' },
        { label: 'IoT Offline', value: '1', icon: WifiOff, color: '#DC2626', bg: 'rgba(220,38,38,.08)' },
    ];

    // Filter logic
    const filteredTricycles = tricycles.filter(unit =>
        unit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.plateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.makeModel.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <OperatorLayout title="My Tricycles" operatorName="Mario Dela Cruz">
            <Head title="My Tricycles | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="f-root">

                {/* ── PAGE HEADING ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="f-eyebrow">Tricycle Management</p>
                    <h1 className="f-title">My Tricycles</h1>
                    <p className="f-subtitle">Manage your registered tricycles, assigned drivers, and IoT trackers.</p>
                </div>

                {/* ── STATS ROW ── */}
                <div className="f-stats-grid">
                    {stats.map((s, i) => (
                        <div key={i} className="f-stat-card">
                            <div className="f-stat-icon" style={{ background: s.bg, color: s.color }}>
                                <s.icon size={24} />
                            </div>
                            <div>
                                <p className="f-stat-val" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 28, fontWeight: 800, color: '#1C2340', lineHeight: 1 }}>{s.value}</p>
                                <p className="f-stat-lbl" style={{ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', color: '#8A96BC', marginTop: 5 }}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── TOOLBAR ── */}
                <div className="f-toolbar">
                    <div className="f-search">
                        <Search size={14} strokeWidth={2} className="f-search-icon" />
                        <input
                            type="text"
                            placeholder="Search tricycle or plate number…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="f-clear-btn" onClick={() => setSearchTerm('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="f-toolbar-right">
                        <button className="f-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter
                        </button>
                        <div className="f-count-badge">
                            <Bike size={13} strokeWidth={2} />
                            Units: {filteredTricycles.length}
                        </div>
                    </div>
                </div>

                {/* ── TRICYCLE GRID ── */}
                <div className="f-grid">
                    {filteredTricycles.length === 0 ? (
                        <div className="f-empty">
                            <div className="f-empty-icon">
                                <Bike size={26} strokeWidth={1.4} />
                            </div>
                            <p className="f-empty-title">No tricycles found</p>
                            <p className="f-empty-sub">Try searching for a different ID or plate number</p>
                        </div>
                    ) : (
                        filteredTricycles.map((unit, index) => (
                            <div key={index} className="f-card">

                                {/* Card Header */}
                                <div className="f-card-header">
                                    <div>
                                        <div className="f-unit-badge">
                                            <Bike size={20} strokeWidth={2} />
                                        </div>
                                        <h2 className="f-unit-id">{unit.id}</h2>
                                        <p className="f-unit-model">{unit.makeModel} • {unit.plateNo}</p>
                                    </div>
                                    <div>
                                        {unit.status === 'online' ? (
                                            <div className="f-status-pill f-status-online">
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'block', animation: 'pulse 2s infinite' }} />
                                                Online
                                            </div>
                                        ) : (
                                            <div className="f-status-pill f-status-offline">
                                                <WifiOff size={10} strokeWidth={3} />
                                                Offline
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="f-card-body">

                                    <div className="f-info-row">
                                        <div className="f-info-icon"><User size={14} /></div>
                                        <div className="f-info-text">
                                            <p className="f-info-label">Assigned Driver</p>
                                            <p className="f-info-value">{unit.driver}</p>
                                        </div>
                                    </div>

                                    <div className="f-info-row">
                                        <div className="f-info-icon"><MapPin size={14} /></div>
                                        <div className="f-info-text">
                                            <p className="f-info-label">Color Code & Zone</p>
                                            <p className="f-info-value">
                                                <span className="f-color-dot" style={{ background: unit.colorHex }}></span>
                                                {unit.colorCode} ({unit.zone})
                                            </p>
                                        </div>
                                    </div>

                                    <div className="f-info-row">
                                        <div className="f-info-icon"><Activity size={14} /></div>
                                        <div className="f-info-text">
                                            <p className="f-info-label">IoT Tracker Data</p>
                                            <p className="f-info-value">
                                                <span style={{ color: unit.status === 'online' ? '#059669' : '#8A96BC' }}>
                                                    Last Sync: {unit.lastPing}
                                                </span>
                                                <span style={{ color: '#8A96BC', padding: '0 4px' }}>•</span>
                                                <span style={{ color: unit.status === 'online' ? '#1C2340' : '#8A96BC' }}>
                                                    Batt: {unit.iotBattery}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                </div>

                                {/* Card Footer Actions */}
                                <div className="f-card-footer">
                                    <button className="f-btn-primary">
                                        <Navigation2 size={14} /> Track Location
                                    </button>
                                    <button className="f-btn-secondary" title="View MTOP Documents">
                                        <FileText size={16} />
                                    </button>
                                    <button className="f-btn-secondary" title="Unit Settings">
                                        <Settings size={16} />
                                    </button>
                                </div>

                            </div>
                        ))
                    )}
                </div>

            </div>
        </OperatorLayout>
    );
}