import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ChevronLeft, Bike, MapPin, User, Phone,
    Calendar, AlertTriangle, CheckCircle2, Clock,
    FileCheck, AlertCircle, TrendingUp, Shield,
    Zap, Activity, CheckSquare, XSquare, Printer,
    FileText, Award, Cpu, ShieldCheck, Gauge, ArrowUpRight
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Tricycle Details Profile Page (Senior UI/UX Redesign)
   Executive dashboard layout with tabbed navigation & rich telemetry specs
   Prefix: td-*
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.td-root *, .td-root *::before, .td-root *::after { box-sizing: border-box; }

.td-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1440px;
  margin: 0 auto;
  padding-bottom: 48px;
}

/* ── Minimal Back nav ────────────────────────────────────────────────── */
.td-nav {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}
.td-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #8A96BC;
  text-decoration: none;
  transition: color .18s;
}
.td-back-link:hover { color: #1C2340; }

.td-action-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
}

.td-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #1C2340;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.14);
  padding: 9px 18px;
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s;
  box-shadow: 0 2px 8px rgba(28,35,64,.04);
}
.td-btn-secondary:hover {
  background: #F8FAFC;
  border-color: rgba(28,35,64,.25);
}

.td-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #FFFFFF;
  background: linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%);
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s;
  box-shadow: 0 4px 14px rgba(28,35,64,.2);
}
.td-btn-primary:hover {
  box-shadow: 0 6px 18px rgba(28,35,64,.3);
  transform: translateY(-1px);
}

/* ── Hero Profile Header Banner ────────────────────────────────────── */
.td-hero-card {
  background: linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%);
  border-radius: 20px;
  padding: 32px 36px;
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 36px rgba(28,35,64,.22);
}
.td-hero-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 85% 20%, rgba(255,255,255,.08) 0%, transparent 60%);
  pointer-events: none;
}
.td-hero-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: center;
}
@media (max-width: 868px) { .td-hero-grid { grid-template-columns: 1fr; } }

.td-hero-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: rgba(255,255,255,.75);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.td-hero-title-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.td-hero-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -.03em;
  color: #FFFFFF;
  line-height: 1;
}
.td-hero-badge-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(5,150,105,.25);
  color: #34D399;
  border: 1px solid rgba(52,211,153,.35);
}

.td-hero-pills {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.td-hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.15);
  padding: 6px 14px;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
}
.td-hero-pill span { color: rgba(255,255,255,.7); font-weight: 500; }

.td-hero-right {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  padding: 16px 20px;
}
.td-hero-logo {
  height: 56px;
  width: auto;
  object-fit: contain;
}

/* ── Modern Executive Tabs Bar ───────────────────────────────────────── */
.td-tabs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.1);
  border-radius: 14px;
  padding: 6px;
  margin-bottom: 28px;
  box-shadow: 0 4px 16px rgba(28,35,64,.04);
  overflow-x: auto;
}
.td-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 20px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #6B7280;
  cursor: pointer;
  transition: all .2s cubic-bezier(.2,0,.2,1);
  white-space: nowrap;
}
.td-tab-btn:hover {
  color: #1C2340;
  background: rgba(28,35,64,.04);
}
.td-tab-btn.active {
  background: #1C2340;
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(28,35,64,.2);
}

/* ── Section Label Header ───────────────────────────────────────────── */
.td-sec-header {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.td-sec-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -.02em;
  color: #1C2340;
  display: flex;
  align-items: center;
  gap: 10px;
}
.td-sec-title-icon {
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(79,91,203,.1); color: #4F5BCB;
  display: flex; align-items: center; justify-content: center;
}

/* ── Spec Box Card ──────────────────────────────────────────────────── */
.td-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(28,35,64,.04);
  margin-bottom: 24px;
}
.td-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 900px) { .td-grid-3 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .td-grid-3 { grid-template-columns: 1fr; } }

.td-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
@media (max-width: 1024px) { .td-grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .td-grid-4 { grid-template-columns: 1fr; } }

.td-spec-item {
  display: flex;
  flex-direction: column;
}
.td-spec-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #8A96BC;
  margin-bottom: 6px;
}
.td-spec-val {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1C2340;
}
.td-spec-val-code {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #1C2340;
  letter-spacing: .02em;
}
.td-spec-val-emerald {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #059669;
}
.td-spec-val-indigo {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #4F5BCB;
}

/* ── Metric Box Card ───────────────────────────────────────────────── */
.td-metric-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all .2s;
  box-shadow: 0 2px 10px rgba(28,35,64,.03);
}
.td-metric-card:hover {
  border-color: rgba(79,91,203,.2);
  box-shadow: 0 6px 20px rgba(28,35,64,.08);
  transform: translateY(-2px);
}
.td-metric-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.td-metric-indigo { background: linear-gradient(135deg, #4F5BCB 0%, #3B46A3 100%); color: #FFFFFF; }
.td-metric-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; }
.td-metric-amber { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #FFFFFF; }

.td-metric-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 4px;
}
.td-metric-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px; font-weight: 800;
  color: #1C2340; line-height: 1;
}

/* ── Documents list ──────────────────────────────────────────────────── */
.td-doc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid rgba(28,35,64,.07);
  transition: all .18s;
}
.td-doc-item:hover {
  background: #FFFFFF;
  border-color: rgba(79,91,203,.2);
  box-shadow: 0 4px 14px rgba(28,35,64,.06);
}

/* ── Timeline ───────────────────────────────────────────────────────── */
.td-timeline {
  padding: 10px 24px 20px;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0;
}
.td-timeline::before {
  content: '';
  position: absolute;
  left: calc(12.5% + 21px);
  right: calc(12.5% + 21px);
  top: 31px;
  height: 3px;
  background: #059669;
  z-index: 0;
}
.td-timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex: 1;
  position: relative;
  z-index: 1;
}
.td-timeline-dot {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: #059669;
  color: #FFFFFF;
  border: 4px solid #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(5,150,105,.3);
}

/* ── Violation item ──────────────────────────────────────────────────── */
.td-viol-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(28,35,64,.06);
  gap: 16px;
  flex-wrap: wrap;
}
.td-viol-row:last-child { border-bottom: none; }
`;

export default function TricycleDetails({ tricycleId, initialTricycle = null, initialDocs = [], initialVios = [], initialMetrics = [] }) {
    const [activeTab, setActiveTab] = useState('overview');

    const tricycleMap = {
        'NSB-26-8812': {
            id: 'NSB-26-8812',
            unit_code: 'TRV-001',
            coding_scheme_number: '0142',
            body_no: '0142',
            plate_no: 'AAA-1234',
            operator: 'Ricardo Dalisay',
            contact: '0917 123 4567',
            toda: 'TODA Bucana',
            coding_day: 'Monday',
            status: 'active',
            full_model: 'Kawasaki Barako 175',
            year_model: '2024',
            body_color: 'Black/Red',
            body_type: 'Pass-Thru Sidecar',
            engine_number: 'ENG-000142',
            chassis_number: 'CHS-000142',
            or_number: 'OR-2026-00142',
            cr_number: 'CR-2026-00142',
            iot_device_id: 'TRV-GPS-991',
            cityOfRegistration: 'Nasugbu',
            registrationDate: 'March 15, 2024'
        }
    };

    const tricycle = initialTricycle || tricycleMap[tricycleId] || tricycleMap['NSB-26-8812'];

    // Documents
    const documents = initialDocs.length > 0 ? initialDocs : [
        { id: 1, name: 'Certificate of Registration (LTO Xerox OR/CR)', status: 'verified', date: 'Jan 15, 2026' },
        { id: 2, name: 'Barangay Clearance (Original)', status: 'verified', date: 'Jan 14, 2026' },
        { id: 3, name: 'TODA / NAFTODA Clearance', status: 'verified', date: 'Jan 12, 2026' },
        { id: 4, name: "Driver's License Back-to-back (Prof)", status: 'verified', date: 'Jan 10, 2026' },
        { id: 5, name: "NAFTODA Official Driver's ID", status: 'verified', date: 'Jan 10, 2026' }
    ];

    // Inspection Checklist
    const inspectionItems = [
        { id: 1, name: 'Frame & Sidecar Structure', status: 'passed' },
        { id: 2, name: 'Engine & Transmission System', status: 'passed' },
        { id: 3, name: 'Hydraulic Brake System', status: 'passed' },
        { id: 4, name: 'Tire Tread & Wheel Alignment', status: 'passed' },
        { id: 5, name: 'Headlight, Tail Light & Turn Signals', status: 'passed' },
        { id: 6, name: 'Electric Horn & Warning Beeper', status: 'passed' },
        { id: 7, name: 'Side Mirrors & Safety Reflectors', status: 'passed' },
        { id: 8, name: 'Exhaust Silencer & Emission', status: 'passed' }
    ];

    // Violations
    const violations = initialVios.length > 0 ? initialVios : [
        { id: 1, title: 'Coding Day Route Restriction', date: 'Jan 19, 2026 at 2:45 PM', paymentStatus: 'settled', codingDay: 'Monday', details: 'Operated along J.P. Laurel St. on restricted Monday schedule.' },
        { id: 2, title: 'Coding Day Route Restriction', date: 'Jan 05, 2026 at 9:15 AM', paymentStatus: 'settled', codingDay: 'Monday', details: 'Detected by Smart GPS outside assigned TODA zone.' }
    ];

    // Metrics & Telematics
    const performanceData = [
        { label: 'Distance Traveled', value: '284 km', iconType: Activity, color: 'td-metric-indigo' },
        { label: 'Violations (This Month)', value: String(violations.length), iconType: AlertTriangle, color: 'td-metric-amber' },
        { label: 'Tracked Operating Hours', value: '58.4 hrs', iconType: Clock, color: 'td-metric-emerald' },
        { label: 'Compliance Score', value: '99.4%', iconType: TrendingUp, color: 'td-metric-emerald' }
    ];

    // Timeline
    const timeline = [
        { id: 1, title: 'Document Review', date: 'Jan 15, 2026', status: 'success' },
        { id: 2, title: 'Physical Inspection', date: 'Jan 18, 2026', status: 'success' },
        { id: 3, title: 'Payment Processing', date: 'Jan 20, 2026', status: 'success' },
        { id: 4, title: 'BPLO Release & Approval', date: 'Jan 22, 2026', status: 'success' }
    ];

    // Recharts Data
    const dailyTripsData = [
        { day: 'Mon', trips: 24 }, { day: 'Tue', trips: 38 },
        { day: 'Wed', trips: 31 }, { day: 'Thu', trips: 42 },
        { day: 'Fri', trips: 36 }, { day: 'Sat', trips: 28 }, { day: 'Sun', trips: 19 }
    ];

    const weeklyHoursData = [
        { week: 'Wk 1', hours: 38 }, { week: 'Wk 2', hours: 44 },
        { week: 'Wk 3', hours: 52 }, { week: 'Wk 4', hours: 41 }
    ];

    const complianceRateData = [
        { week: 'Wk 1', compliance: 98.2 }, { week: 'Wk 2', compliance: 99.0 },
        { week: 'Wk 3', compliance: 99.4 }, { week: 'Wk 4', compliance: 99.6 }
    ];

    return (
        <TrivoraLayout title={`Tricycle #${tricycle.coding_scheme_number || tricycle.body_no}`} role="TMO Officer">
            <Head title={`Unit ${tricycle.unit_code || tricycle.id} Details | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="td-root">
                {/* ── Minimal Back Navigation ── */}
                <div className="td-nav" style={{ marginBottom: 24 }}>
                    <Link href={route('tmo.registry')} className="td-back-link">
                        <ChevronLeft size={14} strokeWidth={2.5} />
                        Back to Registry
                    </Link>
                </div>

                {/* ── Hero Profile Card ── */}
                <div className="td-hero-card">
                    <div className="td-hero-grid">
                        <div>
                            <div className="td-hero-eyebrow">
                                <ShieldCheck size={14} color="#34D399" />
                                Municipal Tricycle Registry Profile
                            </div>
                            <div className="td-hero-title-row">
                                <h1 className="td-hero-title">
                                    Coding Scheme No. #{tricycle.coding_scheme_number || tricycle.body_no}
                                </h1>
                                <span className="td-hero-badge-status">
                                    ✓ Active Franchise
                                </span>
                            </div>

                            <div className="td-hero-pills">
                                <div className="td-hero-pill">
                                    <span>Unit ID:</span> {tricycle.unit_code || `TRV-${String(tricycle.id).padStart(3, '0')}`}
                                </div>
                                <div className="td-hero-pill">
                                    <span>LTO Plate:</span> {tricycle.plate_no}
                                </div>
                                <div className="td-hero-pill">
                                    <span>Model:</span> {tricycle.full_model || tricycle.model}
                                </div>
                                <div className="td-hero-pill">
                                    <span>TODA:</span> {tricycle.toda}
                                </div>
                                <div className="td-hero-pill">
                                    <span>Restricted Day:</span> {tricycle.coding_day}
                                </div>
                            </div>
                        </div>

                        <div className="td-hero-right">
                            <img src="/images/logo.png" alt="Municipality Logo" className="td-hero-logo" />
                        </div>
                    </div>
                </div>

                {/* ── Tabs Navigation Bar ── */}
                <div className="td-tabs-bar">
                    <button
                        className={`td-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <FileText size={16} /> Overview & Specifications
                    </button>
                    <button
                        className={`td-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('compliance')}
                    >
                        <CheckSquare size={16} /> Roadworthiness & Documents
                    </button>
                    <button
                        className={`td-tab-btn ${activeTab === 'telematics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('telematics')}
                    >
                        <Cpu size={16} /> Smart Telematics & Charts
                    </button>
                    <button
                        className={`td-tab-btn ${activeTab === 'violations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('violations')}
                    >
                        <AlertTriangle size={16} /> Violations History ({violations.length})
                    </button>
                </div>

                {/* ── TAB 1: OVERVIEW & SPECIFICATIONS ── */}
                {activeTab === 'overview' && (
                    <div>
                        {/* Operator Info Card */}
                        <div className="td-card">
                            <div className="td-sec-title" style={{ marginBottom: 18 }}>
                                <div className="td-sec-title-icon"><User size={16} /></div>
                                Owner & Operator Credentials
                            </div>

                            <div className="td-grid-4">
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Full Name</span>
                                    <span className="td-spec-val">{tricycle.operator}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Contact Number</span>
                                    <span className="td-spec-val">{tricycle.contact}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">TODA Assignment</span>
                                    <span className="td-spec-val">{tricycle.toda}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Restricted Coding Day</span>
                                    <span className="td-spec-val-indigo">{tricycle.coding_day}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Specs & LTO Records */}
                        <div className="td-card">
                            <div className="td-sec-title" style={{ marginBottom: 20 }}>
                                <div className="td-sec-title-icon"><Bike size={16} /></div>
                                Vehicle Specifications & LTO Records
                            </div>

                            <div className="td-grid-3" style={{ marginBottom: 20 }}>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Make & Model</span>
                                    <span className="td-spec-val">{tricycle.full_model || tricycle.model}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Year Model</span>
                                    <span className="td-spec-val">{tricycle.year_model || '2024'}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Body Color</span>
                                    <span className="td-spec-val">{tricycle.body_color || 'Black/Red'}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Body Type</span>
                                    <span className="td-spec-val">{tricycle.body_type || 'Pass-Thru Sidecar'}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Engine Number</span>
                                    <span className="td-spec-val-code">{tricycle.engine_number || 'ENG-000142'}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Chassis Number</span>
                                    <span className="td-spec-val-code">{tricycle.chassis_number || 'CHS-000142'}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">LTO OR Number</span>
                                    <span className="td-spec-val-emerald">{tricycle.or_number || 'OR-2026-00142'}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">LTO CR Number</span>
                                    <span className="td-spec-val-emerald">{tricycle.cr_number || 'CR-2026-00142'}</span>
                                </div>
                            </div>

                            <div style={{ background: '#F8FAFC', border: '1px solid rgba(79,91,203,.15)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4F5BCB', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Cpu size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8A96BC', margin: 0 }}>Smart GPS Tracker Telematics Device ID</p>
                                        <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 800, color: '#1C2340', margin: 0 }}>{tricycle.iot_device_id || 'TRV-GPS-991'}</p>
                                    </div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: 'rgba(5,150,105,.12)', padding: '4px 10px', borderRadius: 6 }}>● Live Connected</span>
                            </div>
                        </div>

                        {/* Franchise Permit Details */}
                        <div className="td-card">
                            <div className="td-sec-title" style={{ marginBottom: 18 }}>
                                <div className="td-sec-title-icon"><Award size={16} /></div>
                                BPLO Franchise & Regulatory Details
                            </div>

                            <div className="td-grid-4">
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Permit Serial Number</span>
                                    <span className="td-spec-val-code">PERMIT-2026-{tricycle.coding_scheme_number || tricycle.body_no}</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Franchise Type</span>
                                    <span className="td-spec-val">Motorized Tricycle Operator Permit (MTOP)</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Issuing Office</span>
                                    <span className="td-spec-val">BPLO — Nasugbu Municipal Hall</span>
                                </div>
                                <div className="td-spec-item">
                                    <span className="td-spec-lbl">Validity Period</span>
                                    <span className="td-spec-val-emerald">Jan 1, 2026 – Dec 31, 2026</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 2: ROADWORTHINESS & DOCUMENTS ── */}
                {activeTab === 'compliance' && (
                    <div>
                        {/* Verified Documents */}
                        <div className="td-card">
                            <div className="td-sec-title" style={{ marginBottom: 20 }}>
                                <div className="td-sec-title-icon"><FileCheck size={16} /></div>
                                Verified Requirements & Clearances
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                                {documents.map((doc, idx) => (
                                    <div key={doc.id || idx} className="td-doc-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(5,150,105,.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <FileCheck size={18} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#1C2340', margin: 0 }}>{doc.name}</p>
                                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 700, color: '#8A96BC', margin: 0 }}>Verified: {doc.date}</p>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: 'rgba(5,150,105,.1)', padding: '4px 10px', borderRadius: 6 }}>✓ Approved</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Physical Inspection Checklist */}
                        <div className="td-card">
                            <div className="td-sec-title" style={{ marginBottom: 20 }}>
                                <div className="td-sec-title-icon"><CheckSquare size={16} /></div>
                                TMO Roadworthiness Inspection Checklist
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                                {inspectionItems.map(item => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid rgba(5,150,105,.2)' }}>
                                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#1C2340' }}>{item.name}</span>
                                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(5,150,105,.12)', padding: '3px 8px', borderRadius: 6 }}>
                                            <CheckCircle2 size={12} strokeWidth={3} /> PASSED
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Application Process Timeline */}
                        <div className="td-card">
                            <div className="td-sec-title" style={{ marginBottom: 24 }}>
                                <div className="td-sec-title-icon"><Clock size={16} /></div>
                                Franchise Application Process Milestone Timeline
                            </div>

                            <div className="td-timeline">
                                {timeline.map((event) => (
                                    <div key={event.id} className="td-timeline-item">
                                        <div className="td-timeline-dot">
                                            <CheckCircle2 size={18} strokeWidth={2.5} />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#1C2340', margin: '0 0 2px' }}>{event.title}</p>
                                            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 700, color: '#8A96BC', margin: 0 }}>{event.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 3: SMART TELEMATICS & CHARTS ── */}
                {activeTab === 'telematics' && (
                    <div>
                        {/* Metrics Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                            {performanceData.map((p, i) => {
                                const IconComp = p.iconType;
                                return (
                                    <div key={i} className="td-metric-card">
                                        <div className={`td-metric-icon ${p.color}`}>
                                            <IconComp size={20} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <p className="td-metric-lbl">{p.label}</p>
                                            <p className="td-metric-val">{p.value}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Telematics Charts */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
                            <div className="td-card">
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4F5BCB', marginBottom: 16 }}>
                                    Daily Trips (Last 7 Days)
                                </p>
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart data={dailyTripsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                        <XAxis dataKey="day" stroke="#8A96BC" style={{ fontSize: '11px' }} />
                                        <YAxis stroke="#8A96BC" style={{ fontSize: '11px' }} />
                                        <Tooltip contentStyle={{ background: '#FFF', borderRadius: 8, border: '1px solid rgba(28,35,64,.1)' }} />
                                        <Line type="monotone" dataKey="trips" stroke="#4F5BCB" strokeWidth={2.5} dot={{ fill: '#4F5BCB', r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="td-card">
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#059669', marginBottom: 16 }}>
                                    Weekly Operating Hours
                                </p>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={weeklyHoursData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                        <XAxis dataKey="week" stroke="#8A96BC" style={{ fontSize: '11px' }} />
                                        <YAxis stroke="#8A96BC" style={{ fontSize: '11px' }} />
                                        <Tooltip contentStyle={{ background: '#FFF', borderRadius: 8, border: '1px solid rgba(28,35,64,.1)' }} />
                                        <Bar dataKey="hours" fill="#059669" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="td-card">
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#059669', marginBottom: 16 }}>
                                    Coding Compliance Trend (%)
                                </p>
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart data={complianceRateData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                        <XAxis dataKey="week" stroke="#8A96BC" style={{ fontSize: '11px' }} />
                                        <YAxis domain={[95, 100]} stroke="#8A96BC" style={{ fontSize: '11px' }} />
                                        <Tooltip contentStyle={{ background: '#FFF', borderRadius: 8, border: '1px solid rgba(28,35,64,.1)' }} />
                                        <Line type="monotone" dataKey="compliance" stroke="#059669" strokeWidth={2.5} dot={{ fill: '#059669', r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 4: VIOLATIONS HISTORY ── */}
                {activeTab === 'violations' && (
                    <div className="td-card">
                        <div className="td-sec-title" style={{ marginBottom: 20 }}>
                            <div className="td-sec-title-icon" style={{ background: 'rgba(220,38,38,.1)', color: '#DC2626' }}>
                                <AlertTriangle size={16} />
                            </div>
                            Coding Restriction & Traffic Violations History
                        </div>

                        {violations.length === 0 ? (
                            <div style={{ padding: 48, textCenter: 'center' }}>
                                <Shield size={36} color="#059669" style={{ margin: '0 auto 12px', display: 'block' }} />
                                <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 700, color: '#1C2340' }}>Clean Traffic Record</p>
                                <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#8A96BC', textTransform: 'uppercase' }}>No recorded violations for this tricycle unit.</p>
                            </div>
                        ) : (
                            <div>
                                {violations.map((v) => (
                                    <div key={v.id} className="td-viol-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(220,38,38,.1)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <AlertTriangle size={18} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#1C2340', margin: '0 0 2px' }}>{v.title}</p>
                                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 700, color: '#8A96BC', margin: 0 }}>{v.date}</p>
                                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#4B5563', margin: '4px 0 0' }}>{v.details}</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                fontSize: 10, fontWeight: 800,
                                                padding: '4px 10px', borderRadius: 6,
                                                background: v.paymentStatus === 'settled' ? 'rgba(5,150,105,.12)' : 'rgba(245,158,11,.12)',
                                                color: v.paymentStatus === 'settled' ? '#059669' : '#D97706',
                                                border: v.paymentStatus === 'settled' ? '1px solid rgba(5,150,105,.25)' : '1px solid rgba(245,158,11,.25)'
                                            }}>
                                                {v.paymentStatus === 'settled' ? 'Settled' : 'Unsettled'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </TrivoraLayout>
    );
}
