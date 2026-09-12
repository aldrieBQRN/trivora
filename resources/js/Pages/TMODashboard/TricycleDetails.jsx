import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Bike, User, AlertTriangle, CheckCircle2, Clock, FileCheck, TrendingUp,
    Shield, Activity, CheckSquare, FileText, Award, Cpu, ShieldCheck,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BackLink, EmptyState, StatusBadge } from '@/Components/TMO';

const TABS = [
    { key: 'overview', label: 'Overview & Specifications', icon: FileText },
    { key: 'compliance', label: 'Roadworthiness & Documents', icon: CheckSquare },
    { key: 'telematics', label: 'Smart Telematics & Charts', icon: Cpu },
    { key: 'violations', label: 'Violations History', icon: AlertTriangle },
];

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
        { label: 'Distance Traveled', value: '284 km', icon: Activity, tone: 'primary' },
        { label: 'Violations (This Month)', value: String(violations.length), icon: AlertTriangle, tone: 'warning' },
        { label: 'Tracked Operating Hours', value: '58.4 hrs', icon: Clock, tone: 'success' },
        { label: 'Compliance Score', value: '99.4%', icon: TrendingUp, tone: 'success' }
    ];

    // Timeline
    const timeline = [
        { id: 1, title: 'Document Review', date: 'Jan 15, 2026' },
        { id: 2, title: 'Physical Inspection', date: 'Jan 18, 2026' },
        { id: 3, title: 'Payment Processing', date: 'Jan 20, 2026' },
        { id: 4, title: 'BPLO Release & Approval', date: 'Jan 22, 2026' }
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

            <BackLink href={route('tmo.registry')}>Back to Registry</BackLink>

            {/* ── Hero Profile Card ── */}
            <div className="mb-6 mt-4 rounded-2xl bg-tmo-primary p-8">
                <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-[1fr_auto]">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-widest text-white/70">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            Municipal Tricycle Registry Profile
                        </div>
                        <div className="mb-4 flex flex-wrap items-baseline gap-4">
                            <h1 className="text-[32px] font-extrabold tracking-tight text-white">
                                Coding Scheme No. #{tricycle.coding_scheme_number || tricycle.body_no}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/20 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300">
                                ✓ Active Franchise
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <HeroPill label="Unit ID" value={tricycle.unit_code || `TRV-${String(tricycle.id).padStart(3, '0')}`} />
                            <HeroPill label="LTO Plate" value={tricycle.plate_no} />
                            <HeroPill label="Model" value={tricycle.full_model || tricycle.model} />
                            <HeroPill label="TODA" value={tricycle.toda} />
                            <HeroPill label="Restricted Day" value={tricycle.coding_day} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <img src="/images/logo.png" alt="Municipality Logo" className="h-14 w-auto object-contain" />
                    </div>
                </div>
            </div>

            {/* ── Tabs Navigation Bar ── */}
            <div className="mb-6 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-tmo-border bg-white p-1.5">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                                active ? 'bg-tmo-primary text-white' : 'text-tmo-muted hover:bg-tmo-bg hover:text-tmo-ink'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                            {tab.key === 'violations' && ` (${violations.length})`}
                        </button>
                    );
                })}
            </div>

            {/* ── TAB 1: OVERVIEW & SPECIFICATIONS ── */}
            {activeTab === 'overview' && (
                <div className="flex flex-col gap-5">
                    <Card icon={User} title="Owner & Operator Credentials">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <Spec label="Full Name" value={tricycle.operator} />
                            <Spec label="Contact Number" value={tricycle.contact} />
                            <Spec label="TODA Assignment" value={tricycle.toda} />
                            <Spec label="Restricted Coding Day" value={tricycle.coding_day} tone="primary" />
                        </div>
                    </Card>

                    <Card icon={Bike} title="Vehicle Specifications & LTO Records">
                        <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            <Spec label="Make & Model" value={tricycle.full_model || tricycle.model} />
                            <Spec label="Year Model" value={tricycle.year_model || '2024'} />
                            <Spec label="Body Color" value={tricycle.body_color || 'Black/Red'} />
                            <Spec label="Body Type" value={tricycle.body_type || 'Pass-Thru Sidecar'} />
                            <Spec label="Engine Number" value={tricycle.engine_number || 'ENG-000142'} mono />
                            <Spec label="Chassis Number" value={tricycle.chassis_number || 'CHS-000142'} mono />
                            <Spec label="LTO OR Number" value={tricycle.or_number || 'OR-2026-00142'} tone="success" />
                            <Spec label="LTO CR Number" value={tricycle.cr_number || 'CR-2026-00142'} tone="success" />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tmo-primary/15 bg-tmo-primarySoft px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tmo-primary text-white">
                                    <Cpu size={18} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-tmo-muted">Smart GPS Tracker Telematics Device ID</p>
                                    <p className="text-sm font-extrabold text-tmo-ink">{tricycle.iot_device_id || 'TRV-GPS-991'}</p>
                                </div>
                            </div>
                            <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">● Live Connected</span>
                        </div>
                    </Card>

                    <Card icon={Award} title="BPLO Franchise & Regulatory Details">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <Spec label="Permit Serial Number" value={`PERMIT-2026-${tricycle.coding_scheme_number || tricycle.body_no}`} mono />
                            <Spec label="Franchise Type" value="Motorized Tricycle Operator Permit (MTOP)" />
                            <Spec label="Issuing Office" value="BPLO — Nasugbu Municipal Hall" />
                            <Spec label="Validity Period" value="Jan 1, 2026 – Dec 31, 2026" tone="success" />
                        </div>
                    </Card>
                </div>
            )}

            {/* ── TAB 2: ROADWORTHINESS & DOCUMENTS ── */}
            {activeTab === 'compliance' && (
                <div className="flex flex-col gap-5">
                    <Card icon={FileCheck} title="Verified Requirements & Clearances">
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            {documents.map((doc, idx) => (
                                <div key={doc.id || idx} className="flex items-center justify-between gap-3 rounded-xl border border-tmo-border bg-tmo-bg p-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                            <FileCheck size={18} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-tmo-ink">{doc.name}</p>
                                            <p className="text-[9px] font-bold text-tmo-muted">Verified: {doc.date}</p>
                                        </div>
                                    </div>
                                    <StatusBadge variant="success">Approved</StatusBadge>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card icon={CheckSquare} title="TMO Roadworthiness Inspection Checklist">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {inspectionItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between rounded-lg border border-emerald-200 bg-tmo-bg px-4 py-3">
                                    <span className="text-[13px] font-semibold text-tmo-ink">{item.name}</span>
                                    <StatusBadge variant="success" icon={CheckCircle2}>Passed</StatusBadge>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card icon={Clock} title="Franchise Application Process Milestone Timeline">
                        <div className="relative flex items-start justify-between gap-0 px-2 py-2.5">
                            <div className="absolute left-[12.5%] right-[12.5%] top-[21px] z-0 h-[3px] bg-emerald-600" />
                            {timeline.map((event) => (
                                <div key={event.id} className="relative z-10 flex flex-1 flex-col items-center gap-3">
                                    <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                                        <CheckCircle2 size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="text-center">
                                        <p className="mb-0.5 text-[13px] font-bold text-tmo-ink">{event.title}</p>
                                        <p className="text-[9px] font-bold text-tmo-muted">{event.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* ── TAB 3: SMART TELEMATICS & CHARTS ── */}
            {activeTab === 'telematics' && (
                <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {performanceData.map((p, i) => (
                            <MetricCard key={i} {...p} />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                        <ChartCard title="Daily Trips (Last 7 Days)">
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={dailyTripsData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                    <XAxis dataKey="day" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                    <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                    <Tooltip contentStyle={{ background: '#FFF', borderRadius: 8, border: '1px solid rgba(28,35,64,.1)' }} />
                                    <Line type="monotone" dataKey="trips" stroke="#1D2542" strokeWidth={2.5} dot={{ fill: '#1D2542', r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Weekly Operating Hours">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={weeklyHoursData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                    <XAxis dataKey="week" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                    <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                    <Tooltip contentStyle={{ background: '#FFF', borderRadius: 8, border: '1px solid rgba(28,35,64,.1)' }} />
                                    <Bar dataKey="hours" fill="#059669" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Coding Compliance Trend (%)">
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={complianceRateData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,35,64,.08)" />
                                    <XAxis dataKey="week" stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                    <YAxis domain={[95, 100]} stroke="#9CA3AF" style={{ fontSize: '11px' }} />
                                    <Tooltip contentStyle={{ background: '#FFF', borderRadius: 8, border: '1px solid rgba(28,35,64,.1)' }} />
                                    <Line type="monotone" dataKey="compliance" stroke="#059669" strokeWidth={2.5} dot={{ fill: '#059669', r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </div>
            )}

            {/* ── TAB 4: VIOLATIONS HISTORY ── */}
            {activeTab === 'violations' && (
                <Card icon={AlertTriangle} iconTone="danger" title="Coding Restriction & Traffic Violations History">
                    {violations.length === 0 ? (
                        <EmptyState icon={Shield} title="Clean Traffic Record" description="No recorded violations for this tricycle unit." />
                    ) : (
                        <div className="-mx-6 -mb-6">
                            {violations.map((v) => (
                                <div key={v.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-tmo-border px-6 py-4 last:border-b-0">
                                    <div className="flex items-center gap-3.5">
                                        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                            <AlertTriangle size={18} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <p className="mb-0.5 text-[13px] font-bold text-tmo-ink">{v.title}</p>
                                            <p className="text-[9px] font-bold text-tmo-muted">{v.date}</p>
                                            <p className="mt-1 text-xs text-gray-600">{v.details}</p>
                                        </div>
                                    </div>
                                    <StatusBadge variant={v.paymentStatus === 'settled' ? 'success' : 'warning'}>
                                        {v.paymentStatus === 'settled' ? 'Settled' : 'Unsettled'}
                                    </StatusBadge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}
        </TrivoraLayout>
    );
}

function HeroPill({ label, value }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white">
            <span className="font-medium text-white/70">{label}:</span> {value}
        </div>
    );
}

function Card({ icon: Icon, iconTone = 'primary', title, children }) {
    const tones = { primary: 'bg-tmo-primarySoft text-tmo-primary', danger: 'bg-red-50 text-red-600' };
    return (
        <div className="rounded-2xl border border-tmo-border bg-tmo-surface p-6">
            <div className="mb-5 flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight text-tmo-ink">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[iconTone] || tones.primary}`}>
                    <Icon size={16} />
                </div>
                {title}
            </div>
            {children}
        </div>
    );
}

function Spec({ label, value, mono, tone }) {
    const toneClass = tone === 'primary' ? 'text-tmo-primary' : tone === 'success' ? 'text-emerald-700' : 'text-tmo-ink';
    return (
        <div className="flex flex-col">
            <span className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-tmo-muted">{label}</span>
            <span className={`text-sm font-bold ${toneClass} ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</span>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, tone }) {
    const tones = {
        primary: 'bg-tmo-primarySoft text-tmo-primary',
        success: 'bg-emerald-50 text-emerald-600',
        warning: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="flex items-center gap-4 rounded-xl border border-tmo-border bg-tmo-surface p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.primary}`}>
                <Icon size={20} strokeWidth={2.2} />
            </div>
            <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-tmo-muted">{label}</p>
                <p className="text-2xl font-extrabold leading-none text-tmo-ink">{value}</p>
            </div>
        </div>
    );
}

function ChartCard({ title, children }) {
    return (
        <div className="rounded-2xl border border-tmo-border bg-tmo-surface p-6">
            <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-tmo-primary">{title}</p>
            {children}
        </div>
    );
}
