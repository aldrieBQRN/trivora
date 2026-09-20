import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Bike, User, AlertTriangle, CheckCircle2, Clock, FileCheck, TrendingUp,
    Shield, Activity, CheckSquare, FileText, Award, Cpu, ShieldCheck,
    ChevronLeft, MapPin, Phone, Hash, Calendar, Radio, Check, ExternalLink,
    Navigation, Compass, Signal, BatteryCharging, Gauge, Printer, Download,
    Eye, Map, ShieldAlert, Filter, Sparkles,
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';


// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// pages (Dashboard.jsx, Index.jsx, UnitRegistry.jsx) so this page reads as part of one product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TABS = [
    { key: 'overview', label: 'Overview & Details', shortLabel: 'Overview', icon: FileText },
    { key: 'compliance', label: 'Roadworthiness & Documents', shortLabel: 'Compliance', icon: CheckSquare },
    { key: 'telematics', label: 'Smart Telematics & Charts', shortLabel: 'Telematics', icon: Cpu },
    { key: 'violations', label: 'Violations History', shortLabel: 'Violations', icon: AlertTriangle },
];

export default function TricycleDetails({
    tricycleId,
    initialTricycle = null,
    initialDocs = [],
    initialVios = [],
    violationStats = null,
    telematics = null,
    initialMetrics = []
}) {
    const [activeTab, setActiveTab] = useState('overview');
    const [telematicsRange, setTelematicsRange] = useState('7d');
    const [violationFilter, setViolationFilter] = useState('all');
    const [selectedCitation, setSelectedCitation] = useState(null);

    const tricycleMap = {
        'NSB-26-8812': {
            id: 'NSB-26-8812',
            unit_code: 'TRV-001',
            coding_scheme_number: '0142',
            sticker_number: '#0142',
            body_no: '0142',
            plate_no: 'AAA-1234',
            operator: 'Ricardo Dalisay',
            contact: '0917 123 4567',
            operator_address: 'Barangay Bucana, Nasugbu, Batangas',
            license_number: 'N02-18-001420',
            license_expiry: 'Oct 24, 2028',
            toda: 'TODA Bucana',
            coding_day: 'Monday',
            coding_color: 'Red',
            coding_hex: '#EF4444',
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
            cityOfRegistration: 'Nasugbu, Batangas',
            registrationDate: 'March 15, 2024'
        }
    };

    const tricycle = initialTricycle || tricycleMap[tricycleId] || tricycleMap['NSB-26-8812'];

    // Telematics hardware & location telemetry
    const telematicsInfo = telematics || {
        latitude: 14.0722,
        longitude: 120.6315,
        speed_kmh: 24.5,
        heading_deg: 18,
        heading_cardinal: 'NNE (North-Northeast)',
        address: 'J.P. Laurel St. cor. F. Alix St., Brgy. Poblacion 1, Nasugbu',
        geofence_status: 'Inside Assigned TODA Corridor',
        geofence_valid: true,
        signal_strength: '-78 dBm (4G LTE)',
        satellites: 18,
        voltage: '13.8V (Normal Alternator)',
        last_ping: 'Just now',
        firmware_version: 'TRV-FW-v2.4.1',
        max_speed_today: '38 km/h',
        speed_limit: '40 km/h (Municipal Limit)',
    };

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
        {
            id: 1,
            ticket_number: 'VIO-2026-00042',
            title: 'Coding Day Route Restriction',
            date: 'Jan 19, 2026 at 2:45 PM',
            paymentStatus: 'settled',
            codingDay: tricycle.coding_day || 'Monday',
            details: `Operated along J.P. Laurel St. on restricted ${tricycle.coding_day || 'Monday'} schedule.`,
            fine_amount: 500,
            fine_amount_formatted: '₱500.00',
            detection_method: 'Smart GPS Telematics',
            location: 'J.P. Laurel St. cor. F. Alix St., Nasugbu',
            or_receipt: 'OR-TMO-001042',
            paid_at: 'Jan 20, 2026',
        },
        {
            id: 2,
            ticket_number: 'VIO-2026-00018',
            title: 'Coding Day Route Restriction',
            date: 'Jan 05, 2026 at 9:15 AM',
            paymentStatus: 'settled',
            codingDay: tricycle.coding_day || 'Monday',
            details: 'Detected by Smart GPS outside assigned TODA zone during peak traffic hours.',
            fine_amount: 500,
            fine_amount_formatted: '₱500.00',
            detection_method: 'Smart GPS Telematics',
            location: 'Nasugbu-Palico National Hwy, Bucana',
            or_receipt: 'OR-TMO-000982',
            paid_at: 'Jan 07, 2026',
        }
    ];

    const vStats = violationStats || {
        total_count: violations.length,
        settled_count: violations.filter(v => v.paymentStatus === 'settled').length,
        unsettled_count: violations.filter(v => v.paymentStatus === 'unsettled').length,
        total_fines: `₱${(violations.reduce((acc, v) => acc + (v.fine_amount || 500), 0)).toFixed(2)}`,
        settled_fines: `₱${(violations.filter(v => v.paymentStatus === 'settled').reduce((acc, v) => acc + (v.fine_amount || 500), 0)).toFixed(2)}`,
        unsettled_fines: `₱${(violations.filter(v => v.paymentStatus === 'unsettled').reduce((acc, v) => acc + (v.fine_amount || 500), 0)).toFixed(2)}`,
        compliance_rate: violations.length > 0 ? '95.5%' : '100%',
    };

    // Filtered violations
    const filteredViolations = violations.filter(v => {
        if (violationFilter === 'settled') return v.paymentStatus === 'settled';
        if (violationFilter === 'unsettled') return v.paymentStatus === 'unsettled';
        if (violationFilter === 'automated') return v.detection_method?.toLowerCase().includes('gps');
        return true;
    });

    // Performance metrics
    const performanceData = [
        { label: 'Distance Traveled', value: '284 km', subtext: '+12.4 km today', icon: Activity, tone: 'primary' },
        { label: 'Violations (Month)', value: String(vStats.total_count), subtext: '0 unpaid citations', icon: AlertTriangle, tone: 'warning' },
        { label: 'Tracked Operating Hours', value: '58.4 hrs', subtext: 'Avg. 8.2 hrs / day', icon: Clock, tone: 'success' },
        { label: 'Route Compliance Score', value: '99.4%', subtext: 'Based on 420 pings', icon: TrendingUp, tone: 'success' }
    ];

    // Timeline
    const timeline = [
        { id: 1, title: 'Document Review', date: 'Jan 15, 2026' },
        { id: 2, title: 'Physical Inspection', date: 'Jan 18, 2026' },
        { id: 3, title: 'Payment Processing', date: 'Jan 20, 2026' },
        { id: 4, title: 'BPLO Release & Approval', date: 'Jan 22, 2026' }
    ];

    // Recharts Data based on Range
    const chartsByRange = {
        '7d': {
            trips: [
                { time: 'Mon', trips: 24, hours: 6.2, distance: 38.4 },
                { time: 'Tue', trips: 38, hours: 8.4, distance: 51.2 },
                { time: 'Wed', trips: 31, hours: 7.1, distance: 44.0 },
                { time: 'Thu', trips: 42, hours: 9.0, distance: 58.7 },
                { time: 'Fri', trips: 36, hours: 8.0, distance: 49.3 },
                { time: 'Sat', trips: 28, hours: 6.5, distance: 36.8 },
                { time: 'Sun', trips: 19, hours: 4.8, distance: 26.2 }
            ],
            compliance: [
                { time: 'Mon', rate: 100, speed_limit: 40, avg_speed: 23 },
                { time: 'Tue', rate: 99.2, speed_limit: 40, avg_speed: 25 },
                { time: 'Wed', rate: 98.8, speed_limit: 40, avg_speed: 24 },
                { time: 'Thu', rate: 100, speed_limit: 40, avg_speed: 26 },
                { time: 'Fri', rate: 99.5, speed_limit: 40, avg_speed: 25 },
                { time: 'Sat', rate: 100, speed_limit: 40, avg_speed: 22 },
                { time: 'Sun', rate: 100, speed_limit: 40, avg_speed: 20 }
            ]
        },
        '14d': {
            trips: [
                { time: 'Day 1', trips: 28, hours: 6.5, distance: 40.1 },
                { time: 'Day 3', trips: 34, hours: 7.8, distance: 48.0 },
                { time: 'Day 5', trips: 41, hours: 8.9, distance: 56.4 },
                { time: 'Day 7', trips: 36, hours: 8.1, distance: 50.0 },
                { time: 'Day 9', trips: 30, hours: 7.0, distance: 43.2 },
                { time: 'Day 11', trips: 44, hours: 9.2, distance: 60.5 },
                { time: 'Day 14', trips: 38, hours: 8.4, distance: 51.2 }
            ],
            compliance: [
                { time: 'Day 1', rate: 99.0, speed_limit: 40, avg_speed: 24 },
                { time: 'Day 3', rate: 99.5, speed_limit: 40, avg_speed: 23 },
                { time: 'Day 5', rate: 100, speed_limit: 40, avg_speed: 25 },
                { time: 'Day 7', rate: 98.5, speed_limit: 40, avg_speed: 27 },
                { time: 'Day 9', rate: 100, speed_limit: 40, avg_speed: 22 },
                { time: 'Day 11', rate: 99.4, speed_limit: 40, avg_speed: 25 },
                { time: 'Day 14', rate: 99.8, speed_limit: 40, avg_speed: 24 }
            ]
        },
        '30d': {
            trips: [
                { time: 'Wk 1', trips: 184, hours: 44.5, distance: 290.4 },
                { time: 'Wk 2', trips: 210, hours: 49.0, distance: 320.1 },
                { time: 'Wk 3', trips: 195, hours: 46.2, distance: 305.8 },
                { time: 'Wk 4', trips: 224, hours: 52.1, distance: 345.0 }
            ],
            compliance: [
                { time: 'Wk 1', rate: 98.2, speed_limit: 40, avg_speed: 24 },
                { time: 'Wk 2', rate: 99.0, speed_limit: 40, avg_speed: 23 },
                { time: 'Wk 3', rate: 99.4, speed_limit: 40, avg_speed: 25 },
                { time: 'Wk 4', rate: 99.6, speed_limit: 40, avg_speed: 24 }
            ]
        }
    };

    const activeChartData = chartsByRange[telematicsRange] || chartsByRange['7d'];

    // Recent waypoints breadcrumb log
    const recentWaypoints = [
        { time: '10:48 AM', street: 'J.P. Laurel St. cor. F. Alix St.', speed: '24 km/h', status: 'Normal In-Zone', color: 'emerald' },
        { time: '10:32 AM', street: 'P. Burgos St., Poblacion 2', speed: '29 km/h', status: 'Normal In-Zone', color: 'emerald' },
        { time: '10:17 AM', street: 'Nasugbu Public Market Perimeter', speed: '18 km/h', status: 'Normal In-Zone', color: 'emerald' },
        { time: '09:55 AM', street: 'Bucana TODA Terminal Bay', speed: '0 km/h (Idle)', status: 'Stationary / Terminal', color: 'slate' },
    ];

    const operatorInitials = (tricycle.operator || 'OP')
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handlePrintViolations = () => {
        window.print();
    };

    return (
        <TrivoraLayout title={`Unit ${tricycle.unit_code || tricycle.id}`} role="TMO Officer">
            <Head title={`Unit ${tricycle.unit_code || tricycle.id} Details | TRIVORA`} />

            {/* ── Back Navigation ── */}
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
                <Link
                    href={route('tmo.registry')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:scale-95"
                >
                    <ChevronLeft size={15} />
                    <span>Back to Registry</span>
                </Link>
                <div className="sm:hidden flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Online</span>
                </div>
            </div>

            {/* ── Hero Profile Header Card ── */}
            <div className={`relative mb-4 sm:mb-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-7 ${CARD_SHADOW}`}>
                {/* Barely-there ambient color — ties to the brand palette without ever reading as a
                    solid filled block. Ornamental only. */}
                <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-[#1D2542]/[0.07] to-transparent blur-3xl" aria-hidden="true" />

                <div className="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        {/* Top Subtitle */}
                        <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                            <span className="truncate">Tricycle Registry Profile · Nasugbu, Batangas</span>
                        </div>

                        {/* Title & Primary Badges */}
                        <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                {tricycle.unit_code || `TRV-${String(tricycle.id).padStart(3, '0')}`}
                            </span>

                            {/* LTO Plate Badge */}
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-slate-900 text-white font-mono text-xs sm:text-sm font-black tracking-wider shadow-2xs">
                                {tricycle.plate_no || 'NO PLATE'}
                            </span>

                            {/* Status Badge */}
                            {tricycle.status === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Active Franchise
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Suspended
                                </span>
                            )}

                            {/* Coded Today Alert */}
                            {tricycle.is_coded_today && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
                                    Coded Today
                                </span>
                            )}
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 sm:gap-y-2 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <Bike size={13} className="text-slate-400 shrink-0" />
                                <span>{tricycle.full_model || tricycle.model || 'Kawasaki Barako 175'}</span>
                            </div>

                            <span className="text-slate-300 hidden sm:inline">•</span>

                            <div className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-slate-400 shrink-0" />
                                <span>{tricycle.toda || 'Unassigned TODA'}</span>
                            </div>

                            <span className="text-slate-300 hidden sm:inline">•</span>

                            <div className="flex items-center gap-1.5">
                                <span
                                    className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-slate-200 shrink-0"
                                    style={{ backgroundColor: tricycle.coding_hex || '#EF4444' }}
                                ></span>
                                <span className="font-semibold text-slate-800">
                                    Scheme {tricycle.sticker_number || '#' + (tricycle.coding_scheme_number || '0142')} · {tricycle.coding_color || tricycle.color || 'Red'}
                                </span>
                                <span className="text-slate-400 text-[11px] sm:text-xs">
                                    (Restricted: <strong className="font-semibold text-slate-600">{tricycle.coding_day || 'Monday'}</strong>)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Telematics / IoT Indicator */}
                    <div className="flex items-center justify-between sm:justify-start lg:flex-col lg:items-end gap-2.5 pt-3 sm:pt-0 border-t border-slate-100 lg:border-t-0">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>GPS Live Connected</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                            Device: <strong className="text-slate-800 font-semibold">{tricycle.iot_device_id || 'TRV-GPS-991'}</strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Tabs Navigation Bar (App-Style Segmented on Mobile, Clean Pills on Desktop) ── */}
            <div className="sticky top-0 z-20 -mx-3.5 px-3.5 py-1.5 mb-4 bg-slate-50/95 backdrop-blur-md md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:mb-6">
                {/* Mobile App Segmented Tab Bar (< md) */}
                <div className={`grid grid-cols-4 gap-1 rounded-2xl border border-slate-200/70 bg-white p-1 ${CARD_SHADOW} md:hidden`}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all ${
                                    active
                                        ? 'bg-[#1D2542] text-white shadow-xs font-bold'
                                        : 'text-slate-500 hover:text-slate-900 active:scale-95'
                                }`}
                            >
                                <Icon size={17} strokeWidth={active ? 2.5 : 2} className="mb-1" />
                                <span className="text-[10px] leading-tight line-clamp-1 font-semibold">
                                    {tab.shortLabel}
                                </span>
                                {tab.key === 'violations' && violations.length > 0 && (
                                    <span className={`absolute top-1 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${
                                        active ? 'bg-amber-400 text-slate-950' : 'bg-red-500 text-white'
                                    }`}>
                                        {violations.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Desktop Horizontal Pills (>= md) */}
                <div className={`hidden md:flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 ${CARD_SHADOW}`}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                                    active
                                        ? 'bg-[#1D2542] text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                                {tab.key === 'violations' && (
                                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        {violations.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── TAB 1: OVERVIEW & SPECIFICATIONS ── */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
                    {/* Main Column (2/3 width) */}
                    <div className="space-y-4 sm:space-y-6 lg:col-span-8">
                        {/* Vehicle Specifications Card */}
                        <Card icon={Bike} title="Tricycle Details & Identification">
                            <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-3">
                                <SpecItem label="Make & Model" value={tricycle.full_model || tricycle.model} />
                                <SpecItem label="Year Model" value={tricycle.year_model || '2024'} />
                                <SpecItem label="Body Color" value={tricycle.body_color || 'Black/Red'} />
                                <SpecItem label="Body Type" value={tricycle.body_type || 'Pass-Thru Sidecar'} />
                                <SpecItem label="Engine Number" value={tricycle.engine_number || 'ENG-000142'} mono />
                                <SpecItem label="Chassis Number" value={tricycle.chassis_number || 'CHS-000142'} mono />
                            </div>
                        </Card>

                        {/* LTO Official Records Card */}
                        <Card icon={FileText} title="Land Transportation Office (LTO) Records">
                            <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-3">
                                <div>
                                    <span className="block mb-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">LTO Plate Number</span>
                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-slate-100 text-slate-900 font-mono text-xs font-black tracking-wider border border-slate-300">
                                        {tricycle.plate_no || 'NO PLATE'}
                                    </span>
                                </div>
                                <SpecItem label="Official Receipt (OR)" value={tricycle.or_number || 'OR-2026-00142'} mono />
                                <SpecItem label="Certificate of Reg (CR)" value={tricycle.cr_number || 'CR-2026-00142'} mono />
                                <SpecItem label="District Office" value={tricycle.cityOfRegistration || 'Nasugbu District Office'} />
                                <SpecItem label="Date of Registration" value={tricycle.registrationDate || 'March 15, 2024'} />
                                <SpecItem label="LTO Record Status" value="Active / Valid" badge="success" />
                            </div>
                        </Card>

                        {/* BPLO Franchise & Regulatory Details Card */}
                        <Card icon={Award} title="BPLO Municipal Franchise & MTOP Permit">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                                <SpecItem
                                    label="Permit Serial Number"
                                    value={`PERMIT-2026-${tricycle.coding_scheme_number || tricycle.body_no}`}
                                    mono
                                />
                                <SpecItem label="Franchise Classification" value="Motorized Tricycle Operator Permit (MTOP)" />
                                <SpecItem label="Issuing Authority" value="BPLO — Nasugbu Municipal Hall" />
                                <SpecItem label="Franchise Validity Period" value="Jan 1, 2026 – Dec 31, 2026" />
                                <SpecItem label="Annual Renewal Status" value="Renewed (Current Year)" badge="success" />
                                <SpecItem label="Operating Route Area" value={tricycle.toda ? `${tricycle.toda} Route` : 'Nasugbu Municipal Zone'} />
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar Column (1/3 width) */}
                    <div className="space-y-4 sm:space-y-6 lg:col-span-4">
                        {/* Operator & Driver Card */}
                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-slate-100">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Registered Operator</h3>
                                    <p className="text-[11px] text-slate-500">Franchise Holder Details</p>
                                </div>
                            </div>

                            <div className="mt-3 sm:mt-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-white font-bold text-sm">
                                    {operatorInitials}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 truncate">{tricycle.operator}</h4>
                                    <p className="text-xs text-slate-500 truncate">{tricycle.toda || 'Unassigned TODA'}</p>
                                </div>
                            </div>

                            <div className="mt-3 sm:mt-4 space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Contact Number:</span>
                                    <a
                                        href={`tel:${tricycle.contact}`}
                                        className="font-semibold text-[#1D2542] hover:underline flex items-center gap-1"
                                    >
                                        <Phone size={12} className="text-slate-400" />
                                        {tricycle.contact}
                                    </a>
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-slate-500 shrink-0">Address:</span>
                                    <span className="font-medium text-slate-700 text-right truncate max-w-[200px]">{tricycle.operator_address || 'Nasugbu, Batangas'}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Driver's License:</span>
                                    <span className="font-mono font-semibold text-slate-800">{tricycle.license_number || 'N02-18-001420'}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">License Expiry:</span>
                                    <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                        {tricycle.license_expiry || 'Valid'}
                                    </span>
                                </div>
                            </div>

                            {/* Mobile Quick Action: Call Button */}
                            <a
                                href={`tel:${tricycle.contact}`}
                                className="mt-3 flex sm:hidden items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs active:scale-95 transition-all"
                            >
                                <Phone size={13} />
                                <span>Call Operator ({tricycle.contact})</span>
                            </a>
                        </div>

                        {/* Color Coding Scheme Card */}
                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                        <Hash size={16} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Color Coding Scheme</h3>
                                </div>
                                <span className="font-mono text-xs font-bold text-slate-500">Ordinance Rule</span>
                            </div>

                            <div className="mt-3 sm:mt-4 rounded-xl bg-slate-50 p-3.5 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sticker Scheme No.</span>
                                        <div className="font-mono text-lg font-black text-slate-900">
                                            {tricycle.sticker_number || '#' + (tricycle.coding_scheme_number || '0142')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs">
                                        <span
                                            className="h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: tricycle.coding_hex || '#EF4444' }}
                                        ></span>
                                        <span className="text-xs font-bold text-slate-800">
                                            {tricycle.coding_color || tricycle.color || 'Red'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2 pt-3 border-t border-slate-200/60 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Restricted Day:</span>
                                        <span className="font-bold text-slate-900">{tricycle.coding_day || 'Monday'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Restriction Window:</span>
                                        <span className="font-medium text-slate-700">7:00 AM – 7:00 PM</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Today's Operation:</span>
                                        {tricycle.is_coded_today ? (
                                            <span className="font-bold text-red-600">Restricted Today</span>
                                        ) : (
                                            <span className="font-bold text-emerald-700">Operational Today</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* IoT Smart Telematics Device Card */}
                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                        <Cpu size={16} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Smart GPS Telematics</h3>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                    Online
                                </span>
                            </div>

                            <div className="mt-3 sm:mt-4 space-y-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Device Hardware ID:</span>
                                    <span className="font-mono font-bold text-slate-900">{tricycle.iot_device_id || 'TRV-GPS-991'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Network & Satellites:</span>
                                    <span className="font-medium text-slate-700">4G LTE · 18 Satellites</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Ping Interval:</span>
                                    <span className="font-medium text-slate-700">Real-time (15s)</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Battery Status:</span>
                                    <span className="font-medium text-emerald-700">100% (Bike Alternator)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 2: ROADWORTHINESS & DOCUMENTS ── */}
            {activeTab === 'compliance' && (
                <div className="space-y-4 sm:space-y-6">
                    {/* Verified Requirements Card */}
                    <Card icon={FileCheck} title="Verified Requirements & Clearances">
                        <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 sm:grid-cols-2">
                            {documents.map((doc, idx) => (
                                <div key={doc.id || idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 transition-colors hover:bg-white hover:border-slate-300">
                                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                            <FileCheck size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">{doc.name}</p>
                                            <p className="text-[11px] text-slate-500">Verified: {doc.date}</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                        <Check size={11} />
                                        Approved
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* TMO Roadworthiness Checklist */}
                    <Card icon={CheckSquare} title="TMO Physical Safety & Roadworthiness Inspection Checklist">
                        <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2">
                            {inspectionItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 sm:px-4 sm:py-3 shadow-2xs">
                                    <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 size={12} />
                                        Passed
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Milestone Timeline Card (Responsive: Vertical on Mobile, Horizontal on Desktop) */}
                    <Card icon={Clock} title="Franchise Application Process Milestone Timeline">
                        {/* Desktop Horizontal Timeline (>= sm) */}
                        <div className="hidden sm:flex relative items-center justify-between px-2 py-4">
                            <div className="absolute left-[12.5%] right-[12.5%] top-[24px] z-0 h-[2px] bg-emerald-500" />
                            {timeline.map((event) => (
                                <div key={event.id} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50">
                                        <CheckCircle2 size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-slate-900">{event.title}</p>
                                        <p className="text-[10px] text-slate-500">{event.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Mobile Vertical Connected Timeline (< sm) */}
                        <div className="sm:hidden relative pl-7 py-2 space-y-3">
                            <div className="absolute left-[14px] top-3 bottom-4 w-[2px] bg-emerald-400" />
                            {timeline.map((event) => (
                                <div key={event.id} className="relative flex items-start gap-2.5">
                                    <div className="absolute -left-7 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-100">
                                        <CheckCircle2 size={13} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                                        <p className="text-xs font-bold text-slate-900">{event.title}</p>
                                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">{event.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* ── TAB 3: SMART TELEMATICS & CHARTS (UPGRADED) ── */}
            {activeTab === 'telematics' && (
                <div className="space-y-4 sm:space-y-6">
                    {/* Live GPS & Geofence Intelligence Strip */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-100">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542] mt-0.5">
                                    <Navigation size={17} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Live GPS Telemetry & Active Position</h3>
                                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        <MapPin size={11} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{telematicsInfo.address}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Coordinates:</span>
                                <span className="font-mono font-bold text-slate-800 text-[11px] sm:text-xs">{telematicsInfo.latitude}° N, {telematicsInfo.longitude}° E</span>
                            </div>
                        </div>

                        {/* Live Telemetry Sensor Specs Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3 sm:pt-4">
                            <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3">
                                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                    <Gauge size={13} className="text-slate-600 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider truncate">Current Speed</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base sm:text-lg font-black text-slate-900">{telematicsInfo.speed_kmh}</span>
                                    <span className="text-xs text-slate-500 font-semibold">km/h</span>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block truncate">Within 40 km/h limit</span>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3">
                                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                    <Compass size={13} className="text-slate-600 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider truncate">Bearing & Heading</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base sm:text-lg font-black text-slate-900">{telematicsInfo.heading_deg}°</span>
                                    <span className="text-xs text-slate-500 font-semibold">NNE</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block truncate">Heading North</span>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3">
                                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                    <Signal size={13} className="text-slate-600 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider truncate">Cellular & GPS</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base sm:text-lg font-black text-slate-900">{telematicsInfo.satellites}</span>
                                    <span className="text-xs text-slate-500 font-semibold">Sats</span>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block truncate">{telematicsInfo.signal_strength}</span>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3">
                                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                    <BatteryCharging size={13} className="text-slate-600 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider truncate">Hardware Power</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base sm:text-lg font-black text-slate-900">13.8V</span>
                                    <span className="text-xs text-slate-500 font-semibold">DC</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block truncate">Alternator Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance Metric Cards (Responsive 2x2 on Mobile, 4-col on Desktop) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                        {performanceData.map((p, i) => (
                            <MetricCard key={i} {...p} />
                        ))}
                    </div>

                    {/* Chart Controls & Recharts */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-6 ${CARD_SHADOW}`}>
                        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Operational Trends & Compliance Analysis</h3>
                                <p className="text-[11px] sm:text-xs text-slate-500">Historical driving hours, travel distance, and municipal speed limits</p>
                            </div>

                            {/* Timeframe selector pills */}
                            <div className="grid grid-cols-3 sm:flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
                                {[
                                    { key: '7d', label: 'Last 7 Days' },
                                    { key: '14d', label: 'Last 14 Days' },
                                    { key: '30d', label: 'Last 30 Days' }
                                ].map((tf) => (
                                    <button
                                        key={tf.key}
                                        onClick={() => setTelematicsRange(tf.key)}
                                        className={`py-1.5 px-2 sm:px-3 text-center text-[11px] sm:text-xs font-bold rounded-lg transition-all ${
                                            telematicsRange === tf.key
                                                ? 'bg-white text-[#1D2542] shadow-2xs'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dual Expanded Charts */}
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                            {/* Chart 1: Driving Distance & Operating Hours */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <div className="min-w-0 pr-2">
                                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 truncate">Daily Distance & Hours</h4>
                                        <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">Total tracked road mileage & service duration</span>
                                    </div>
                                    <span className="shrink-0 text-[11px] sm:text-xs font-mono font-bold text-[#1D2542] bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200/80 shadow-2xs">Avg: 7.4 hrs/d</span>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={activeChartData.trips} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1D2542" stopOpacity={0.25}/>
                                                <stop offset="95%" stopColor="#1D2542" stopOpacity={0.01}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                        <XAxis dataKey="time" stroke="#94A3B8" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} style={{ fontSize: '10px', fontWeight: 500 }} />
                                        <YAxis yAxisId="dist" stroke="#94A3B8" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} unit="km" />
                                        <YAxis yAxisId="hrs" orientation="right" domain={[0, telematicsRange === '30d' ? 65 : 12]} stroke="#94A3B8" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} unit="h" />
                                        <Tooltip content={<CustomDistanceTooltip />} />
                                        <Area yAxisId="dist" type="monotone" dataKey="distance" name="Distance (km)" stroke="#1D2542" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDistance)" />
                                        <Line yAxisId="hrs" type="monotone" dataKey="hours" name="Operating Hours" stroke="#10B981" strokeWidth={2.2} dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-600 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-[#1D2542]" />
                                        <span>Travel Distance (km)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <span>Operating Time (hrs)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chart 2: Speed Adherence & Compliance */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <div className="min-w-0 pr-2">
                                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 truncate">Speed & Ordinance Profile</h4>
                                        <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">40 km/h municipal safety speed ceiling</span>
                                    </div>
                                    <span className="shrink-0 text-[11px] sm:text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-emerald-200 shadow-2xs">99.4% Adherence</span>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={activeChartData.compliance} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                        <XAxis dataKey="time" stroke="#94A3B8" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} style={{ fontSize: '10px', fontWeight: 500 }} />
                                        <YAxis yAxisId="spd" domain={[0, 48]} stroke="#94A3B8" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} unit="km/h" />
                                        <YAxis yAxisId="comp" orientation="right" domain={[85, 100]} stroke="#94A3B8" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} unit="%" />
                                        <ReferenceLine yAxisId="spd" y={40} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: '40 km/h Limit', position: 'insideTopRight', fill: '#D97706', fontSize: 9, fontWeight: 700 }} />
                                        <Tooltip content={<CustomSpeedTooltip />} />
                                        <Area yAxisId="spd" type="monotone" dataKey="avg_speed" name="Average Speed" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" />
                                        <Line yAxisId="comp" type="monotone" dataKey="rate" name="Compliance Rate" stroke="#10B981" strokeWidth={2.2} dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-600 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                        <span>Avg Speed (km/h)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <span>Route Compliance (%)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-medium text-amber-700">
                                        <span className="w-2.5 border-t-2 border-dashed border-amber-500" />
                                        <span>40 km/h Limit</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Waypoint Breadcrumb Feed */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2 sm:mb-3">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Recent GPS Waypoint Pings</h3>
                            <span className="text-[11px] sm:text-xs text-slate-500">Live 15s telemetry log</span>
                        </div>
                        <div className="divide-y divide-slate-100 text-xs">
                            {recentWaypoints.map((wp, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 sm:py-2.5 gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-mono text-slate-400 font-semibold text-[11px] shrink-0">{wp.time}</span>
                                        <span className="font-medium text-slate-800 truncate text-[11px] sm:text-xs">{wp.street}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-mono font-bold text-slate-700 text-[11px] sm:text-xs">{wp.speed}</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                            {wp.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 4: VIOLATIONS HISTORY (UPGRADED) ── */}
            {activeTab === 'violations' && (
                <div className="space-y-4 sm:space-y-6">
                    {/* Financial & Compliance Summary KPI Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Violations</span>
                                <AlertTriangle size={13} className="text-slate-400 shrink-0" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{vStats.total_count}</div>
                            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block truncate">Lifetime recorded</span>
                        </div>

                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Unsettled Fines</span>
                                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
                            </div>
                            <div className={`text-xl sm:text-2xl font-black leading-none ${vStats.unsettled_count > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                                {vStats.unsettled_fines}
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block truncate">{vStats.unsettled_count} awaiting payment</span>
                        </div>

                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Settled Collections</span>
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-emerald-700 leading-none">{vStats.settled_fines}</div>
                            <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1 block truncate">{vStats.settled_count} settled at Treasury</span>
                        </div>

                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Compliance Standing</span>
                                <Award size={13} className="text-slate-400 shrink-0" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{vStats.compliance_rate}</div>
                            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block truncate">Renewal Eligible</span>
                        </div>
                    </div>

                    {/* Filter & Action Controls Bar */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-4 ${CARD_SHADOW}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            {/* Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                                {[
                                    { key: 'all', label: `All (${vStats.total_count})` },
                                    { key: 'settled', label: `Settled (${vStats.settled_count})` },
                                    { key: 'unsettled', label: `Unsettled (${vStats.unsettled_count})` },
                                    { key: 'automated', label: 'GPS Detected' }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setViolationFilter(tab.key)}
                                        className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                                            violationFilter === tab.key
                                                ? 'bg-[#1D2542] text-white shadow-2xs'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Print / Export Actions */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    onClick={handlePrintViolations}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                                >
                                    <Printer size={13} />
                                    Print Summary
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Violations Cards Feed */}
                    <div className="space-y-3 sm:space-y-4">
                        {filteredViolations.length === 0 ? (
                            <div className={`rounded-2xl border border-slate-200/70 bg-white p-8 sm:p-12 text-center ${CARD_SHADOW}`}>
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2.5">
                                    <ShieldCheck size={22} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">No Matching Violations Found</h4>
                                <p className="text-xs text-slate-500 mt-1">There are no records matching your selected filter criteria.</p>
                            </div>
                        ) : (
                            filteredViolations.map((v) => (
                                <div
                                    key={v.id}
                                    className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}
                                >
                                    {/* Card Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-slate-100">
                                        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 mt-0.5 sm:mt-0">
                                                <AlertTriangle size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <span className="font-mono text-xs font-black text-slate-900">
                                                        {v.ticket_number || `#VIO-2026-${String(v.id).padStart(5, '0')}`}
                                                    </span>
                                                    <span className="text-xs text-slate-300">•</span>
                                                    <span className="text-xs font-bold text-slate-800 truncate">{v.title}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={11} className="text-slate-400" />
                                                        {v.date}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="text-slate-600">Restricted: <strong>{v.codingDay}</strong></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-100 sm:border-t-0">
                                            <span className="font-mono text-xs sm:text-sm font-black text-slate-900">
                                                {v.fine_amount_formatted || '₱500.00'}
                                            </span>
                                            {v.paymentStatus === 'settled' ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                                    <Check size={11} />
                                                    Settled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                                    Unsettled
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Incident Details & Audit Trail */}
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                                        <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Violation Details & Note</span>
                                            <p className="text-slate-700 font-medium text-[11px] sm:text-xs">{v.details}</p>
                                        </div>

                                        <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Location & Source</span>
                                            <p className="text-slate-800 font-semibold flex items-center gap-1 text-[11px] sm:text-xs">
                                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{v.location || 'J.P. Laurel St., Nasugbu'}</span>
                                            </p>
                                            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block truncate">Source: {v.detection_method || 'Smart GPS Telematics'}</span>
                                        </div>

                                        <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Treasury Settlement Audit</span>
                                            {v.paymentStatus === 'settled' ? (
                                                <div>
                                                    <p className="font-mono text-emerald-700 font-bold text-[11px] sm:text-xs">{v.or_receipt || 'OR-TMO-001042'}</p>
                                                    <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block truncate">Paid: {v.paid_at || 'Jan 20, 2026'} · Cashier</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-amber-700 font-semibold text-[11px] sm:text-xs">Payment Due: 14 Days Left</p>
                                                    <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block truncate">Pay at Counter or Online</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </TrivoraLayout>
    );
}

function Card({ icon: Icon, title, children }) {
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-6 ${CARD_SHADOW}`}>
            <div className="mb-4 sm:mb-5 flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 pb-2.5 sm:pb-3 border-b border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542] shrink-0">
                    <Icon size={16} />
                </div>
                <span className="truncate">{title}</span>
            </div>
            {children}
        </div>
    );
}

function SpecItem({ label, value, mono, badge, span2 }) {
    return (
        <div className={`flex flex-col min-w-0 ${span2 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <span className="mb-0.5 sm:mb-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</span>
            {badge === 'success' ? (
                <span className="inline-flex items-center w-fit gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <Check size={11} />
                    <span>{value}</span>
                </span>
            ) : (
                <span className={`text-xs sm:text-sm font-semibold text-slate-900 truncate ${mono ? 'font-mono text-[11px] sm:text-xs' : ''}`}>
                    {value || 'N/A'}
                </span>
            )}
        </div>
    );
}

function MetricCard({ label, value, subtext, icon: Icon, tone }) {
    const tones = {
        primary: 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-amber-50 text-amber-700',
    };
    return (
        <div className={`flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200/70 bg-white p-3.5 sm:p-5 ${CARD_SHADOW}`}>
            <div className={`flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.primary}`}>
                <Icon size={18} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
                <p className="text-lg sm:text-2xl font-black text-slate-900 leading-none truncate">{value}</p>
                {subtext && <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium truncate">{subtext}</p>}
            </div>
        </div>
    );
}

function ChartCard({ title, children }) {
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-6 ${CARD_SHADOW}`}>
            <h4 className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-wider text-slate-700 truncate">{title}</h4>
            {children}
        </div>
    );
}

function CustomDistanceTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        const dist = payload.find(p => p.dataKey === 'distance')?.value;
        const hrs = payload.find(p => p.dataKey === 'hours')?.value;
        const trips = payload[0]?.payload?.trips;
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[170px]">
                <p className="font-bold text-slate-900 mb-1.5 pb-1 border-b border-slate-100">{label}</p>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-slate-700">
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#1D2542]" />
                            Distance:
                        </span>
                        <span className="font-mono font-bold text-slate-900">{dist} km</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-700">
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Operating Time:
                        </span>
                        <span className="font-mono font-bold text-emerald-700">{hrs} hrs</span>
                    </div>
                    {trips && (
                        <div className="flex items-center justify-between gap-3 text-slate-500 pt-1 border-t border-slate-100 text-[11px]">
                            <span>Completed Trips:</span>
                            <span className="font-mono font-semibold text-slate-700">{trips} trips</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
}

function CustomSpeedTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        const speed = payload.find(p => p.dataKey === 'avg_speed')?.value;
        const rate = payload.find(p => p.dataKey === 'rate')?.value;
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[180px]">
                <p className="font-bold text-slate-900 mb-1.5 pb-1 border-b border-slate-100">{label}</p>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-slate-700">
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Average Speed:
                        </span>
                        <span className="font-mono font-bold text-blue-700">{speed} km/h</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-700">
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Route Adherence:
                        </span>
                        <span className="font-mono font-bold text-emerald-700">{rate}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-500 pt-1 border-t border-slate-100 text-[11px]">
                        <span>Municipal Limit:</span>
                        <span className="font-mono font-bold text-amber-600">40 km/h</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

