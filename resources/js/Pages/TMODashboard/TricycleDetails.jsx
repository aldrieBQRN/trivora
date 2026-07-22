import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ChevronLeft, Bike, MapPin, User, Phone,
    Calendar, AlertTriangle, CheckCircle2, Clock,
    FileCheck, AlertCircle, TrendingUp, Shield,
    Zap, Activity, CheckSquare, XSquare
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Tricycle Details Page
   Complete view of tricycle information: performance, documents, inspections
   Prefix: td-* (tricycle-details)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.td-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px; margin: 0 auto; padding-bottom: 48px;
}
.td-root *, .td-root *::before, .td-root *::after { box-sizing: border-box; }

/* ── Back nav ───────────────────────────────────────────────────────── */
.td-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 32px;
}
.td-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  transition: color .18s;
}
.td-back-link:hover { color: #1C2340; }

/* ── Hero section ───────────────────────────────────────────────────── */
.td-hero {
  background: linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%);
  border-radius: 20px;
  padding: 36px 40px;
  margin-bottom: 32px;
  position: relative; overflow: hidden;
  box-shadow: 0 8px 32px rgba(28,35,64,.2);
}
.td-hero-bg-icon {
  position: absolute; top: 50%; right: -24px;
  transform: translateY(-50%);
  color: #FFFFFF; opacity: .04; pointer-events: none;
}
.td-hero-inner {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 32px; align-items: center;
}
@media (max-width: 768px) {
  .td-hero-inner { grid-template-columns: 1fr; }
}

.td-hero-content { display: flex; flex-direction: column; }
.td-hero-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 10px;
}
.td-hero-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  letter-spacing: -.025em; color: #FFFFFF;
  line-height: 1; margin-bottom: 14px;
}
.td-hero-meta {
  display: flex; align-items: center; gap: 14px;
  flex-wrap: wrap;
}
.td-hero-meta-item {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC;
}
.td-hero-icon-wrap {
  width: 72px; height: 72px; border-radius: 18px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  color: #FFFFFF; flex-shrink: 0;
}

/* ── Grid layout ─────────────────────────────────────────────────────── */
.td-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
@media (max-width: 1024px) { .td-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .td-grid { grid-template-columns: 1fr; } }

/* ── Metric cards ───────────────────────────────────────────────────── */
.td-metric-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex; align-items: center; gap: 14px;
  transition: all .2s;
}
.td-metric-card:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 16px rgba(28,35,64,.06);
}
.td-metric-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.td-metric-indigo { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%); color: #FFFFFF; }
.td-metric-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; }
.td-metric-amber { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #FFFFFF; }
.td-metric-red { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #FFFFFF; }

.td-metric-content { flex: 1; }
.td-metric-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 4px;
}
.td-metric-value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px; font-weight: 800;
  color: #1C2340; line-height: 1;
}

/* ── Section cards ───────────────────────────────────────────────────── */
.td-section { margin-bottom: 28px; }
.td-section-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 16px;
}
.td-section-label::before {
  content: ''; width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}

.td-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}

/* ── Operator info card ────────────────────────────────────────────── */
.td-op-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 24px; }
.td-op-field {
  display: flex; align-items: center; gap: 14px;
}
.td-op-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(79,91,203,.08); color: #4F5BCB;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.td-op-text { flex: 1; }
.td-op-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 4px;
}
.td-op-value {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600;
  color: #1C2340;
}

/* ── Document items ────────────────────────────────────────────────── */
.td-doc-list { padding: 0; }
.td-doc-item {
  padding: 20px 24px; border-bottom: 1px solid rgba(28,35,64,.05);
  display: flex; align-items: center; justify-content: space-between;
  transition: background .15s;
}
.td-doc-item:last-child { border-bottom: none; }
.td-doc-item:hover { background: rgba(237,238,244,.5); }

.td-doc-info { display: flex; align-items: center; gap: 16px; flex: 1; }
.td-doc-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.td-doc-pending { background: rgba(249,115,22,.1); color: #F59E0B; }
.td-doc-verified { background: rgba(5,150,105,.1); color: #059669; }
.td-doc-rejected { background: rgba(220,38,38,.1); color: #DC2626; }

.td-doc-details { flex: 1; }
.td-doc-name {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600;
  color: #1C2340; margin-bottom: 4px;
}
.td-doc-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
}
.td-doc-status {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 800;
  letter-spacing: .12em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 6px;
}
.td-doc-pending-badge { background: rgba(249,115,22,.15); color: #F59E0B; border: 1px solid rgba(249,115,22,.3); }
.td-doc-verified-badge { background: rgba(5,150,105,.15); color: #059669; border: 1px solid rgba(5,150,105,.3); }
.td-doc-rejected-badge { background: rgba(220,38,38,.15); color: #DC2626; border: 1px solid rgba(220,38,38,.3); }

/* ── Inspection items ───────────────────────────────────────────────── */
.td-inspect-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 24px;
}
@media (max-width: 700px) { .td-inspect-grid { grid-template-columns: 1fr; } }

.td-inspect-item {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(28,35,64,.08);
  background: #FFFFFF;
  transition: all .18s;
}
.td-inspect-item.is-passed {
  border-color: rgba(5,150,105,.3);
  background: rgba(5,150,105,.04);
}
.td-inspect-item.is-failed {
  border-color: rgba(220,38,38,.3);
  background: rgba(220,38,38,.04);
}

.td-inspect-label {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600;
  color: #1C2340; line-height: 1; margin-bottom: 5px;
}
.td-inspect-item.is-passed .td-inspect-label { color: #064E3B; }
.td-inspect-item.is-failed .td-inspect-label { color: #7F1D1D; }

.td-inspect-note {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
}

.td-inspect-status {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.td-inspect-passed { background: rgba(5,150,105,.15); color: #059669; }
.td-inspect-failed { background: rgba(220,38,38,.15); color: #DC2626; }

/* ── Violations section ────────────────────────────────────────────── */
.td-viol-list { padding: 0; }
.td-viol-item {
  padding: 20px 24px; border-bottom: 1px solid rgba(28,35,64,.05);
  display: flex; align-items: flex-start; gap: 16px;
}
.td-viol-item:last-child { border-bottom: none; }

.td-viol-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(220,38,38,.1); color: #DC2626;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 2px;
}

.td-viol-content { flex: 1; }
.td-viol-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600;
  color: #1C2340; margin-bottom: 4px;
}
.td-viol-time {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #8A96BC;
}

/* ── Timeline ───────────────────────────────────────────────────────── */
.td-timeline {
  padding: 0 24px;
  margin: 32px 0;
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
  top: 21px;
  height: 3px;
  background: #059669;
  z-index: 0;
}

.td-timeline-item {
  display: grid;
  grid-template-rows: 42px auto;
  grid-template-columns: 1fr;
  gap: 14px;
  flex: 1;
  position: relative;
  z-index: 1;
  justify-items: center;
}

.td-timeline-dot {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 4px solid rgba(79,91,203,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #4F5BCB;
  position: relative;
  z-index: 20;
}
.td-timeline-dot.success {
  background: #059669;
  color: #FFFFFF;
  border-color: #059669;
}
.td-timeline-dot.warning {
  border-color: rgba(249,115,22,.4);
  background: rgba(249,115,22,.08);
  color: #F59E0B;
}
.td-timeline-dot.error {
  border-color: rgba(220,38,38,.4);
  background: rgba(220,38,38,.08);
  color: #DC2626;
}

.td-timeline-content {
  text-align: center;
}
.td-timeline-title {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #1C2340;
  margin-bottom: 4px;
  white-space: nowrap;
}
.td-timeline-time {
  font-family: 'DM Sans', sans-serif;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #8A96BC;
  white-space: nowrap;
}

/* ── No data state ─────────────────────────────────────────────────── */
.td-no-data {
  padding: 48px 24px;
  text-align: center;
}
.td-no-data-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(79,91,203,.1); color: #4F5BCB;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.td-no-data-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #3A4570; margin-bottom: 6px;
}
.td-no-data-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}

/* ── Charts ─────────────────────────────────────────────────────── */
.td-chart-container {
  padding: 18px 18px 0 10px;
  background: #FAFAFA;
  border-radius: 12px;
  margin-bottom: 0;
}
.td-chart-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #4F5BCB;
  margin-bottom: 12px;
  display: flex; align-items: center; gap: 8px;
}
.td-charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}
@media (max-width: 1024px) { .td-charts-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .td-charts-grid { grid-template-columns: 1fr; } }
`;

export default function TricycleDetails({ tricycleId, initialTricycle = null, initialDocs = [], initialVios = [], initialMetrics = [] }) {
    // Mock data for the selected tricycle
    const tricycleMap = {
        'NSB-26-8812': {
            id: 'NSB-26-8812',
            body_no: 'N-142',
            plate_no: '8812',
            operator: 'Ricardo Dalisay',
            contact: '0917 123 4567',
            toda: 'TODA D (Papaya)',
            coding_day: 'Monday',
            status: 'active',
            model: 'Honda TMX 125 Alpha',
            color: 'Yellow',
            cityOfRegistration: 'Nasugbu',
            registrationDate: 'March 15, 2023'
        },
        'NSB-26-5521': {
            id: 'NSB-26-5521',
            body_no: 'N-089',
            plate_no: '4491',
            operator: 'Cardo Santos',
            contact: '0918 555 1234',
            toda: 'TODA A (Poblacion)',
            coding_day: 'Tuesday',
            status: 'active',
            model: 'Kawasaki Barako 175',
            color: 'Blue',
            cityOfRegistration: 'Nasugbu',
            registrationDate: 'June 22, 2022'
        },
        'NSB-26-1123': {
            id: 'NSB-26-1123',
            body_no: 'N-301',
            plate_no: '2245',
            operator: 'Juan Dela Cruz',
            contact: '0919 888 9999',
            toda: 'TODA B (Wawa)',
            coding_day: 'Wednesday',
            status: 'suspended',
            model: 'Yamaha SZ 150',
            color: 'Green',
            cityOfRegistration: 'Nasugbu',
            registrationDate: 'January 8, 2023'
        },
        'NSB-26-9988': {
            id: 'NSB-26-9988',
            body_no: 'N-012',
            plate_no: '1100',
            operator: 'Maria Clara',
            contact: '0920 111 2222',
            toda: 'TODA C (Bucana)',
            coding_day: 'Friday',
            status: 'active',
            model: 'Honda Click 125i',
            color: 'Red',
            cityOfRegistration: 'Nasugbu',
            registrationDate: 'November 3, 2023'
        }
    };

    const tricycle = initialTricycle || tricycleMap[tricycleId] || tricycleMap['NSB-26-8812'];

    // Dynamic metrics
    const metrics = initialMetrics.length > 0 ? initialMetrics.map(m => {
        const iconMap = {
            'AlertTriangle': AlertTriangle,
            'TrendingUp': TrendingUp,
            'FileCheck': FileCheck,
            'CheckCircle2': CheckCircle2
        };
        return {
            ...m,
            icon: iconMap[m.icon] || FileCheck
        };
    }) : [
        { label: 'Violations Today', value: '0', icon: AlertTriangle, color: 'td-metric-indigo' },
        { label: 'Compliance Score', value: '95%', icon: TrendingUp, color: 'td-metric-emerald' },
        { label: 'Documents', value: '4/5', icon: FileCheck, color: 'td-metric-indigo' },
        { label: 'Inspections Pass', value: '18/20', icon: CheckCircle2, color: 'td-metric-emerald' }
    ];

    // Dynamic documents
    const documents = initialDocs.length > 0 ? initialDocs : [
        { id: 1, name: 'Certificate of Registration', status: 'verified', date: 'OCT 22, 2023' },
        { id: 2, name: 'Barangay Clearance', status: 'verified', date: 'OCT 21, 2023' },
        { id: 3, name: 'Proof of Billing', status: 'verified', date: 'OCT 20, 2023' },
        { id: 4, name: 'Single Entry Permit', status: 'verified', date: 'OCT 19, 2023' },
        { id: 5, name: 'Driver\'s License (Operator)', status: 'pending', date: 'Waiting for submission' }
    ];

    // Mock inspection items
    const inspectionItems = [
        { id: 1, name: 'Frame & Body', status: 'passed' },
        { id: 2, name: 'Engine Condition', status: 'passed' },
        { id: 3, name: 'Brake System', status: 'passed' },
        { id: 4, name: 'Tire Condition', status: 'passed' },
        { id: 5, name: 'Light & Indicators', status: 'passed' },
        { id: 6, name: 'Horn Functionality', status: 'passed' },
        { id: 7, name: 'Mirror Condition', status: 'passed' },
        { id: 8, name: 'Exhaust System', status: 'passed' }
    ];

    // Dynamic coding violations
    const violations = initialVios.length > 0 ? initialVios : [
        { id: 1, title: 'Coding Day Violation', date: 'DEC 10, 2023 at 2:45 PM', paymentStatus: 'unsettled', codingDay: 'Monday', details: 'Operated on coding day' },
        { id: 2, title: 'Coding Day Violation', date: 'NOV 28, 2023 at 8:30 PM', paymentStatus: 'settled', codingDay: 'Tuesday', details: 'Operated on coding day' }
    ];

    // Mock performance data (based on location tracking)
    const performanceData = [
        { label: 'Distance Traveled', value: '250', iconType: Activity, color: 'td-metric-indigo', unit: 'km this month' },
        { label: 'Coding Violations', value: '2', iconType: AlertTriangle, color: 'td-metric-amber', unit: 'this month' },
        { label: 'Active Hours', value: '42', iconType: CheckCircle2, color: 'td-metric-emerald', unit: 'tracked hours' },
        { label: 'Compliance Rate', value: '99.2%', iconType: TrendingUp, color: 'td-metric-emerald', unit: 'coding compliance' }
    ];

    // MTOP Certification Process Timeline (based on real process)
    const timeline = [
        { id: 1, title: 'Document Review', date: 'OCT 22, 2023', status: 'success' },
        { id: 2, title: 'Physical Inspection', date: 'OCT 24, 2023', status: 'success' },
        { id: 3, title: 'Payment Processing', date: 'OCT 25, 2023', status: 'success' },
        { id: 4, title: 'BPLO Release & Approval', date: 'OCT 26, 2023', status: 'success' }
    ];

    // Mock daily trips chart data
    const dailyTripsData = [
        { day: 'Mon', trips: 24, avgSpeed: 35 },
        { day: 'Tue', trips: 28, avgSpeed: 38 },
        { day: 'Wed', trips: 22, avgSpeed: 32 },
        { day: 'Thu', trips: 31, avgSpeed: 40 },
        { day: 'Fri', trips: 29, avgSpeed: 36 },
        { day: 'Sat', trips: 26, avgSpeed: 34 },
        { day: 'Sun', trips: 18, avgSpeed: 30 }
    ];

    // Mock operating hours by week (based on location tracking)
    const weeklyHoursData = [
        { week: 'Week 1', hours: 35, target: 40 },
        { week: 'Week 2', hours: 42, target: 40 },
        { week: 'Week 3', hours: 48, target: 40 },
        { week: 'Week 4', hours: 38, target: 40 }
    ];

    // Mock compliance rate by week
    const complianceRateData = [
        { week: 'Week 1', compliance: 97.5, violations: 1 },
        { week: 'Week 2', compliance: 98.8, violations: 0 },
        { week: 'Week 3', compliance: 99.2, violations: 1 },
        { week: 'Week 4', compliance: 99.2, violations: 0 }
    ];

    return (
        <TrivoraLayout title={`Tricycle ${tricycle.body_no}`} role="TMO Officer">
            <Head title={`${tricycle.body_no} - Tricycle Details | TRIVORA`} />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="td-root" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Back Navigation ── */}
                <div className="td-nav">
                    <Link href={route('tmo.registry')} className="td-back-link">
                        <ChevronLeft size={14} strokeWidth={3} />
                        Back to Registry
                    </Link>
                </div>

                {/* ── Hero Section + Operator Info ── */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(28,35,64,.12)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(28,35,64,.15)', marginBottom: '40px' }}>
                    <div className="td-hero" style={{ background: 'linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%)', borderRadius: '20px 20px 0 0', marginBottom: 0 }}>
                        <Bike size={64} className="td-hero-bg-icon" style={{ opacity: 0.08, color: '#1C2340' }} />
                        <div className="td-hero-inner">
                            <div className="td-hero-content">
                                <p className="td-hero-label" style={{ color: '#FFFFFF' }}>Tricycle Unit ID</p>
                                <h1 className="td-hero-title" style={{ color: '#FFFFFF' }}>{tricycle.body_no}</h1>
                                <div className="td-hero-meta">
                                    <span className="td-hero-meta-item" style={{ color: '#FFFFFF' }}>
                                        <span>Plate: {tricycle.plate_no}</span>
                                    </span>
                                    <span className="td-hero-meta-item" style={{ color: '#FFFFFF' }}>
                                        <span>{tricycle.model}</span>
                                    </span>
                                    <span className="td-hero-meta-item" style={{ color: '#FFFFFF' }}>
                                        <span>{tricycle.status === 'active' ? '✓ Active' : '⊗ Suspended'}</span>
                                    </span>
                                </div>
                            </div>
                            <img src="/images/logo.png" alt="Logo" style={{ maxWidth: '120px', height: 'auto', objectFit: 'contain', borderRadius: '12px' }} />
                        </div>
                    </div>

                    {/* Operator info inside same card */}
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <User size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Owner/Operator</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{tricycle.operator}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Phone size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Contact</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{tricycle.contact}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>TODA/Route</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{tricycle.toda}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Calendar size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Coding Day</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{tricycle.coding_day}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Operating Performance ── */}
                <div className="td-section" style={{ marginBottom: '40px' }}>
                    <p className="td-section-label">Operating Performance</p>
                    <div className="td-grid">
                        {performanceData.map((p, i) => {
                            const IconComponent = p.iconType;
                            return (
                                <div key={i} className="td-metric-card">
                                    <div className={`td-metric-icon ${p.color}`}>
                                        <IconComponent size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="td-metric-content">
                                        <p className="td-metric-label">{p.label}</p>
                                        <p className="td-metric-value">{p.value}</p>
                                        <p style={{ fontSize: '8px', color: '#8A96BC', fontWeight: 500, marginTop: '2px' }}>{p.unit}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Performance Charts */}
                    <div className="td-charts-grid" style={{ marginTop: '24px' }}>
                        {/* Daily Trips Chart */}
                        <div className="td-card">
                            <div className="td-chart-container">
                                <p className="td-chart-label">Daily Trips (Last 7 Days)</p>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={dailyTripsData} margin={{ top: 5, right: 30, left: 5, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                        <XAxis dataKey="day" stroke="#8A96BC" style={{ fontSize: '11px' }} label={{ value: 'Day', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                                        <YAxis stroke="#8A96BC" style={{ fontSize: '11px' }} label={{ value: 'Trips', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                                        <Tooltip
                                            contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(28,35,64,.1)', borderRadius: '8px' }}
                                            labelStyle={{ color: '#1C2340' }}
                                        />
                                        <Line type="monotone" dataKey="trips" stroke="#4F5BCB" strokeWidth={2.5} dot={{ fill: '#4F5BCB', r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Weekly Operating Hours Chart */}
                        <div className="td-card">
                            <div className="td-chart-container">
                                <p className="td-chart-label">Weekly Operating Hours</p>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={weeklyHoursData} margin={{ top: 5, right: 30, left: 5, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                        <XAxis dataKey="week" stroke="#8A96BC" style={{ fontSize: '11px' }} label={{ value: 'Week', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                                        <YAxis stroke="#8A96BC" style={{ fontSize: '11px' }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                                        <Tooltip
                                            contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(28,35,64,.1)', borderRadius: '8px' }}
                                            labelStyle={{ color: '#1C2340' }}
                                            formatter={(value) => `${value}h`}
                                        />
                                        <Bar dataKey="hours" fill="#059669" radius={[8, 8, 0, 0]} name="Operating Hours" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Compliance Rate Chart */}
                        <div className="td-card">
                            <div className="td-chart-container">
                                <p className="td-chart-label">Coding Compliance Rate Trend</p>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={complianceRateData} margin={{ top: 5, right: 30, left: 5, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                        <XAxis dataKey="week" stroke="#8A96BC" style={{ fontSize: '11px' }} label={{ value: 'Week', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                                        <YAxis stroke="#8A96BC" style={{ fontSize: '11px' }} domain={[95, 100]} label={{ value: 'Percent (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 700, fill: '#1C2340', fontFamily: 'DM Sans' }} />
                                        <Tooltip
                                            contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(28,35,64,.1)', borderRadius: '8px' }}
                                            labelStyle={{ color: '#1C2340' }}
                                            formatter={(value) => `${value}%`}
                                        />
                                        <Line type="monotone" dataKey="compliance" stroke="#059669" strokeWidth={2.5} dot={{ fill: '#059669', r: 4 }} activeDot={{ r: 6 }} name="Compliance %" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Coding Violations ── */}
                <div className="td-section">
                    <p className="td-section-label">Coding Violations</p>
                    <div className="td-card">
                        {violations.length === 0 ? (
                            <div className="td-no-data">
                                <div className="td-no-data-icon">
                                    <Shield size={28} strokeWidth={1.5} />
                                </div>
                                <p className="td-no-data-title">No Coding Violations</p>
                                <p className="td-no-data-sub">This tricycle has no recorded coding violations</p>
                            </div>
                        ) : (
                            <div className="td-viol-list">
                                {violations.map((violation) => (
                                    <div key={violation.id} className="td-viol-item" style={{ flexWrap: 'wrap', gap: '12px' }}>
                                        <div className="td-viol-icon">
                                            <AlertTriangle size={20} strokeWidth={2} />
                                        </div>
                                        <div className="td-viol-content" style={{ flex: 1, minWidth: '200px' }}>
                                            <p className="td-viol-title">{violation.title}</p>
                                            <p className="td-viol-time">{violation.date}</p>
                                            <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontFamily: 'Inter, sans-serif' }}>{violation.details}</p>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <p style={{ fontSize: '8px', fontWeight: 700, color: '#8A96BC', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', letterSpacing: '.08em', margin: 0 }}>Status</p>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '8px',
                                                fontWeight: 700,
                                                background: violation.paymentStatus === 'settled' ? 'rgba(5,150,105,.15)' : 'rgba(249,115,22,.15)',
                                                color: violation.paymentStatus === 'settled' ? '#059669' : '#F59E0B',
                                                textTransform: 'uppercase',
                                                fontFamily: 'DM Sans, sans-serif',
                                                letterSpacing: '.1em',
                                                whiteSpace: 'nowrap',
                                                border: violation.paymentStatus === 'settled' ? '1px solid rgba(5,150,105,.3)' : '1px solid rgba(249,115,22,.3)'
                                            }}>
                                                {violation.paymentStatus === 'settled' ? 'Settled' : 'Unsettled'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Activity Timeline ── */}
                <div className="td-section">
                    <p className="td-section-label">Franchise Application Timeline</p>
                    <div className="td-card">
                        <div className="td-timeline">
                            {timeline.map((event, i) => (
                                <div key={event.id} className="td-timeline-item">
                                    <div className={`td-timeline-dot ${event.status}`}>
                                        <CheckCircle2 size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="td-timeline-content">
                                        <p className="td-timeline-title">{event.title}</p>
                                        <p className="td-timeline-time">{event.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}
