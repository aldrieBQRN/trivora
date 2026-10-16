import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Bike, Users, CheckCircle2, Clock, FileCheck,
    CheckSquare, FileText, Award, Cpu,
    ChevronLeft, Phone, Hash, Check, ExternalLink,
    MapPin, ShieldAlert, ShieldOff, Ban, ShieldCheck, XCircle,
    Radio, AlertTriangle, TrendingUp, Mail, Calendar, User
} from 'lucide-react';
import { PHYSICAL_INSPECTION_ITEMS } from '@/data/physicalInspectionItems';

import Avatar from '@/Components/Avatar';
// Semantic status treatment for a franchise's operational authorization status
const FRANCHISE_STATUS_META = {
    active:    { label: 'Active',    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90', dot: 'bg-emerald-500' },
    suspended: { label: 'Suspended', badge: 'bg-amber-50 text-amber-800 border-amber-200/90', dot: 'bg-amber-500' },
    revoked:   { label: 'Revoked',   badge: 'bg-rose-50 text-rose-700 border-rose-200/90', dot: 'bg-rose-500' },
};

/**
 * TMO's Suspend / Revoke / Reinstate actions for this tricycle's FRANCHISE
 */
function FranchiseStatusHeaderActions({ tricycleId, franchiseStatus }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!franchiseStatus || franchiseStatus.status === 'revoked') return null;

    const postAction = (action, data = {}) => {
        setIsSubmitting(true);
        router.post(route(`tmo.franchise.${action}`, tricycleId), data, {
            preserveScroll: true,
            onFinish: () => setIsSubmitting(false),
        });
    };

    const promptForReason = ({ title, actionLabel, confirmColor, action }) => {
        Swal.fire({
            title,
            html: 'This immediately prevents the assigned driver from operating and taking bookings in Nasugbu.',
            input: 'textarea',
            inputLabel: 'Reason (required for municipality records):',
            inputPlaceholder: 'e.g. Traffic violation reported or safety inspection pending...',
            inputValidator: (value) => {
                if (!value || value.trim().length < 5) {
                    return 'Please provide a valid reason (at least 5 characters).';
                }
            },
            showCancelButton: true,
            confirmButtonText: actionLabel,
            confirmButtonColor: confirmColor,
            cancelButtonColor: '#64748B',
        }).then((result) => {
            if (!result.isConfirmed) return;
            postAction(action, { reason: result.value.trim() });
        });
    };

    const handleSuspend = () => promptForReason({
        title: 'Suspend Franchise Permit?',
        actionLabel: 'Yes, Suspend',
        confirmColor: '#D97706',
        action: 'suspend',
    });

    const handleRevoke = () => promptForReason({
        title: 'Revoke Franchise Permit?',
        actionLabel: 'Yes, Revoke',
        confirmColor: '#DC2626',
        action: 'revoke',
    });

    const handleReinstate = () => {
        Swal.fire({
            title: 'Reinstate Franchise Permit?',
            html: 'This restores the franchise permit to active status, allowing this tricycle to operate in Nasugbu.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reinstate',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#64748B',
        }).then((result) => {
            if (result.isConfirmed) postAction('reinstate');
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {franchiseStatus.status === 'active' && (
                <>
                    <button
                        type="button"
                        onClick={handleSuspend}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                    >
                        <ShieldOff size={13} />
                        <span>Suspend</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleRevoke}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                    >
                        <Ban size={13} />
                        <span>Revoke</span>
                    </button>
                </>
            )}
            {franchiseStatus.status === 'suspended' && (
                <>
                    <button
                        type="button"
                        onClick={handleReinstate}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                    >
                        <ShieldCheck size={13} />
                        <span>Reinstate</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleRevoke}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                    >
                        <Ban size={13} />
                        <span>Revoke</span>
                    </button>
                </>
            )}
        </div>
    );
}

// Layered soft shadow token
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

const TABS = [
    { key: 'overview', label: 'Overview & Details', shortLabel: 'Overview', icon: FileText },
    { key: 'compliance', label: 'Roadworthiness & Clearances', shortLabel: 'Clearances', icon: CheckSquare },
    { key: 'violations', label: 'Violations & Citations', shortLabel: 'Violations', icon: ShieldAlert },
];

const TIMELINE_STATE_META = {
    complete: {
        icon: CheckCircle2,
        circle: 'bg-emerald-600 text-white ring-4 ring-emerald-50',
        circleMobile: 'bg-emerald-600 text-white ring-2 ring-emerald-100',
        sub: 'text-slate-600',
    },
    current: {
        icon: Clock,
        circle: 'bg-[#182B62] text-white ring-4 ring-[#182B62]/15',
        circleMobile: 'bg-[#182B62] text-white ring-2 ring-[#182B62]/15',
        sub: 'text-[#182B62] font-semibold',
    },
    'action-req': {
        icon: ShieldAlert,
        circle: 'bg-amber-500 text-white ring-4 ring-amber-50',
        circleMobile: 'bg-amber-500 text-white ring-2 ring-amber-100',
        sub: 'text-amber-700 font-semibold',
    },
    pending: {
        icon: Clock,
        circle: 'border-2 border-slate-200 bg-white text-slate-400',
        circleMobile: 'border-2 border-slate-200 bg-white text-slate-400',
        sub: 'text-slate-500',
    },
};

const DOC_STATUS_META = {
    verified: {
        icon: Check,
        iconWrap: 'bg-emerald-100 text-emerald-700',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Verified',
        dateLabel: 'Verified',
    },
    pending: {
        icon: Clock,
        iconWrap: 'bg-amber-100 text-amber-700',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Pending Review',
        dateLabel: 'Submitted',
    },
    rejected: {
        icon: XCircle,
        iconWrap: 'bg-rose-100 text-rose-700',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        label: 'Rejected',
        dateLabel: 'Rejected',
    },
    not_submitted: {
        icon: FileText,
        iconWrap: 'bg-slate-100 text-slate-500',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        label: 'Not Submitted',
        dateLabel: null,
    },
};

const GPS_STATUS_META = {
    connected: { label: 'Online', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    stale:     { label: 'Signal Lost', badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
    awaiting:  { label: 'Awaiting Signal', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

export default function TricycleDetails({
    tricycleId,
    initialTricycle = null,
    initialDocs = [],
    initialVios = [],
    violationStats = null,
    initialMetrics = [],
    initialTimeline = []
}) {
    const [activeTab, setActiveTab] = useState('overview');

    // Silent background refresh
    useBackgroundRefresh(['initialTricycle', 'initialDocs', 'initialVios', 'violationStats', 'initialMetrics', 'initialTimeline']);

    const tricycleMap = {
        'NSB-26-8812': {
            id: 'NSB-26-8812',
            unit_code: 'TRV-001',
            coding_scheme_number: '0142',
            sticker_number: '#0142',
            plate_no: 'AAA-1234',
            operator: 'Ricardo Dalisay',
            contact: '09171234567',
            operator_address: 'Barangay Bucana, Nasugbu, Batangas',
            owner: {
                first_name: 'Ricardo',
                last_name: 'Dalisay',
                full_name: 'Ricardo Dalisay',
                birthday: '08/25/1985',
                contact_number: '09171234567',
                barangay: 'Barangay Bucana',
                email: 'ricardo.dalisay@example.com'
            },
            owner_name: 'Ricardo Dalisay',
            owner_is_driver: true,
            driver: null,
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
            gps_interval_seconds: 5,
            cityOfRegistration: 'Nasugbu, Batangas',
            registrationDate: 'March 15, 2024',
            validity_term: 'Mar 15, 2024 – Mar 15, 2025',
            renewal_status: 'Renewed (Current Year)',
            renewal_badge: 'success'
        }
    };

    const tricycle = initialTricycle || tricycleMap[tricycleId] || tricycleMap['NSB-26-8812'];
    const documents = initialDocs || [];
    const violations = initialVios || [];

    const timeline = initialTimeline.length > 0 ? initialTimeline : [
        { id: 1, title: 'Document Review', date: 'Jan 15, 2026', state: 'complete', note: null },
        { id: 2, title: 'Physical Inspection', date: 'Jan 18, 2026', state: 'complete', note: null },
        { id: 3, title: 'BPLO Release: Sticker & Plate for Coding', date: 'Jan 20, 2026', state: 'complete', note: null },
        { id: 4, title: 'TMO Final Confirmation', date: 'Jan 22, 2026', state: 'complete', note: null },
    ];

    const completeCount = timeline.reduce((acc, item, idx) => (idx === acc && item.state === 'complete' ? acc + 1 : acc), 0);
    const completedSegments = Math.max(0, completeCount - 1);
    const totalSegments = Math.max(1, timeline.length - 1);
    const lineHeightPercent = Math.min(100, (completedSegments / totalSegments) * 100);

    const owner = tricycle.owner || {
        first_name: tricycle.operator ? tricycle.operator.split(' ')[0] : null,
        last_name: tricycle.operator ? tricycle.operator.split(' ').slice(1).join(' ') : null,
        full_name: tricycle.owner_name || tricycle.operator || 'Unassigned Owner',
        birthday: null,
        contact_number: tricycle.contact || null,
        barangay: tricycle.operator_address || null,
        email: null,
    };
    const driver = tricycle.driver || null;
    const isOwnerDriver = tricycle.owner_is_driver ?? (!driver);

    const operatorName = owner.full_name || tricycle.owner_name || tricycle.operator || 'OP';

    const gpsStatus = GPS_STATUS_META[tricycle.gps_status] || GPS_STATUS_META.awaiting;

    return (
        <TrivoraLayout title={`Tricycle ${tricycle.unit_code || tricycle.plate_no || tricycle.id}`} role="TMO Officer">
            <Head title={`Tricycle ${tricycle.unit_code || tricycle.plate_no || tricycle.id} Details | TRIVORA`} />

            {/* ── Top Bar: Navigation ── */}
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <Link
                    href="/tmo/registry"
                    className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                    <span>Back to Registry</span>
                </Link>
            </div>

            {/* ── Page Hero: Unit Identification & Actions ── */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            {tricycle.unit_code || `TRV-${String(tricycle.id).padStart(3, '0')}`}
                        </h1>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-black tracking-wider">
                            {tricycle.plate_no || 'NO PLATE'}
                        </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                        {tricycle.full_model || tricycle.model || 'Tricycle'} · Official Profile · Nasugbu, Batangas
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Franchise status lifecycle operations */}
                    <FranchiseStatusHeaderActions tricycleId={tricycle.id} franchiseStatus={tricycle.franchise_status} />
                </div>
            </div>

            {/* ── Segmented Navigation Tabs ── */}
            <div className="mb-6">
                <div className={`grid grid-cols-3 gap-1 rounded-2xl border border-slate-200/80 bg-white p-1.5 ${CARD_SHADOW} sm:inline-flex sm:w-auto`}>
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all font-['Plus_Jakarta_Sans',sans-serif] ${
                                    active
                                        ? 'bg-[#182B62] text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <Icon size={14} className={active ? 'text-white' : 'text-slate-500'} />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.shortLabel}</span>
                                {tab.key === 'violations' && violations.length > 0 && (
                                    <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                                        active ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
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
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
                    {/* Main Dossier Column (8 cols) */}
                    <div className="space-y-5 lg:col-span-8">
                        {/* 1. Tricycle Owner & Driver Card */}
                        <Card icon={Users} title="Owner & Driver Information">
                            {/* Owner profile header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Avatar name={operatorName} src={tricycle.operator_photo} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-white font-bold text-sm shadow-sm" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Tricycle Owner</p>
                                        <h4 className="text-base font-bold text-slate-900 truncate font-['Plus_Jakarta_Sans',sans-serif]">
                                            {owner.full_name || '—'}
                                        </h4>
                                    </div>
                                </div>
                            </div>

                            {/* Owner Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5 text-xs">
                                <SpecItem label="First Name" value={owner.first_name || '—'} />
                                <SpecItem label="Last Name" value={owner.last_name || '—'} />
                                <div>
                                    <span className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate block font-['Plus_Jakarta_Sans',sans-serif]">
                                        Birthday
                                    </span>
                                    <span className="text-xs sm:text-sm font-semibold font-mono text-slate-900">
                                        {owner.birthday || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate block font-['Plus_Jakarta_Sans',sans-serif]">
                                        Mobile Number
                                    </span>
                                    {owner.contact_number ? (
                                        <a
                                            href={`tel:${owner.contact_number}`}
                                            className="text-xs sm:text-sm font-bold font-mono text-[#182B62] hover:underline"
                                        >
                                            {owner.contact_number}
                                        </a>
                                    ) : (
                                        <span className="text-xs sm:text-sm font-semibold text-slate-500">—</span>
                                    )}
                                </div>
                                <SpecItem label="Barangay (Nasugbu)" value={owner.barangay || '—'} />
                                <div>
                                    <span className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate block font-['Plus_Jakarta_Sans',sans-serif]">
                                        Email Address
                                    </span>
                                    {owner.email ? (
                                        <a
                                            href={`mailto:${owner.email}`}
                                            className="text-xs sm:text-sm font-medium text-[#182B62] hover:underline truncate block"
                                            title={owner.email}
                                        >
                                            {owner.email}
                                        </a>
                                    ) : (
                                        <span className="text-xs sm:text-sm font-semibold text-slate-500">—</span>
                                    )}
                                </div>
                            </div>

                            {/* Driver Section */}
                            <div className="mt-5 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <User size={15} className="text-slate-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-['Plus_Jakarta_Sans',sans-serif]">
                                            Tricycle Driver
                                        </span>
                                    </div>
                                </div>

                                {isOwnerDriver ? (
                                    <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3.5">
                                        <div className="flex items-start gap-2.5">
                                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <p className="font-bold text-emerald-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                                    Owner is the Driver
                                                </p>
                                                <p className="text-[11.5px] text-emerald-700 mt-0.5 leading-relaxed">
                                                    The registered owner ({owner.full_name || 'Owner'}) personally drives this tricycle.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : driver ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 text-xs">
                                        <SpecItem label="First Name" value={driver.first_name || '—'} />
                                        <SpecItem label="Last Name" value={driver.last_name || '—'} />
                                        <div>
                                            <span className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate block font-['Plus_Jakarta_Sans',sans-serif]">
                                                Birthday
                                            </span>
                                            <span className="text-xs sm:text-sm font-semibold font-mono text-slate-900">
                                                {driver.birthday || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate block font-['Plus_Jakarta_Sans',sans-serif]">
                                                Mobile Number
                                            </span>
                                            {driver.contact_number ? (
                                                <a
                                                    href={`tel:${driver.contact_number}`}
                                                    className="text-xs sm:text-sm font-bold font-mono text-[#182B62] hover:underline"
                                                >
                                                    {driver.contact_number}
                                                </a>
                                            ) : (
                                                <span className="text-xs sm:text-sm font-semibold text-slate-500">—</span>
                                            )}
                                        </div>
                                        <SpecItem label="Barangay (Nasugbu)" value={driver.barangay || '—'} />
                                        <div>
                                            <span className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate block font-['Plus_Jakarta_Sans',sans-serif]">
                                                Email Address
                                            </span>
                                            {driver.email ? (
                                                <a
                                                    href={`mailto:${driver.email}`}
                                                    className="text-xs sm:text-sm font-medium text-[#182B62] hover:underline truncate block"
                                                    title={driver.email}
                                                >
                                                    {driver.email}
                                                </a>
                                            ) : (
                                                <span className="text-xs sm:text-sm font-semibold text-slate-500">—</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600">
                                        No separate driver registered for this tricycle.
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Vehicle Specifications Card */}
                        <Card icon={Bike} title="Vehicle Specifications">
                            <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-3">
                                <SpecItem label="Make & Model" value={tricycle.full_model || tricycle.model || '—'} />
                                <SpecItem label="Year Model" value={tricycle.year_model || '—'} />
                                <SpecItem label="Body Color" value={tricycle.body_color || '—'} />
                                <SpecItem label="Body Type" value={tricycle.body_type || '—'} />
                                <SpecItem label="Engine Number" value={tricycle.engine_number || '—'} mono />
                                <SpecItem label="Chassis Number" value={tricycle.chassis_number || '—'} mono />
                            </div>
                        </Card>

                        {/* LTO Official Records Card */}
                        <Card icon={FileText} title="LTO Registration & Documents">
                            <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-3">
                                <div>
                                    <span className="block mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">LTO Plate Number</span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-900 font-mono text-xs font-black tracking-wider border border-slate-300 shadow-sm">
                                        {tricycle.plate_no || 'NO PLATE'}
                                    </span>
                                </div>
                                <SpecItem label="Official Receipt (OR)" value={tricycle.or_number || '—'} mono />
                                <SpecItem label="Certificate of Reg (CR)" value={tricycle.cr_number || '—'} mono />
                                <SpecItem label="District Office" value={tricycle.cityOfRegistration || 'Nasugbu District Office'} />
                                <SpecItem label="Date of Registration" value={tricycle.registrationDate || '—'} />
                                <SpecItem label="LTO Record Status" value="Registered" badge="success" />
                            </div>
                        </Card>
                    </div>

                    {/* Right Operational Sidebar Column (4 cols) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5 lg:col-span-4">

                        {/* BPLO Municipal Franchise Permit Card */}
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <Award size={16} strokeWidth={2.2} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">BPLO Franchise Permit</h3>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border font-['Plus_Jakarta_Sans',sans-serif] ${
                                    tricycle.franchise_status?.status === 'revoked'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : tricycle.franchise_status?.status === 'suspended'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                    {FRANCHISE_STATUS_META[tricycle.franchise_status?.status]?.label || 'Active'}
                                </span>
                            </div>

                            <div className="mt-3.5 space-y-3 text-xs">
                                <div className="rounded-xl bg-slate-50 border border-slate-100 shadow-sm p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] block mb-0.5">
                                        Franchise Number (MTOP)
                                    </span>
                                    <div className="font-mono text-lg font-black text-slate-900">
                                        {tricycle.franchise_number || '—'}
                                    </div>
                                </div>

                                <div className="space-y-2.5 text-xs pt-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Franchise Type:</span>
                                        <span className="font-bold text-slate-800">Motorized Tricycle (MTOP)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Issuing Office:</span>
                                        <span className="font-semibold text-slate-700">BPLO Nasugbu</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Validity Term:</span>
                                        <span className="font-bold text-slate-900 font-mono text-xs">
                                            {tricycle.validity_term
                                                || tricycle.franchise_status?.validity_term
                                                || (tricycle.franchise_issue_date && tricycle.franchise_expiry_date
                                                    ? `${tricycle.franchise_issue_date} – ${tricycle.franchise_expiry_date}`
                                                    : (tricycle.registrationDate ? `${tricycle.registrationDate} – 1 Year` : '—'))}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Renewal Status:</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border font-['Plus_Jakarta_Sans',sans-serif] ${
                                            (tricycle.renewal_badge || tricycle.franchise_status?.renewal_badge) === 'danger'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : (tricycle.renewal_badge || tricycle.franchise_status?.renewal_badge) === 'warning'
                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}>
                                            {tricycle.renewal_status
                                                || tricycle.franchise_status?.renewal_status
                                                || (tricycle.franchise_status?.status === 'active' ? 'Renewed (Current Year)' : 'Renewal Pending')}
                                        </span>
                                    </div>
                                </div>

                                {tricycle.franchise_status?.status !== 'active' && tricycle.franchise_status?.status_reason && (
                                    <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-['Plus_Jakarta_Sans',sans-serif]">
                                            Remarks ({tricycle.franchise_status.status_changed_at})
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-800 font-medium">
                                            {tricycle.franchise_status.status_reason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Color Coding Scheme Card */}
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <Hash size={16} strokeWidth={2.2} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">Color Coding Scheme</h3>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">Ordinance</span>
                            </div>

                            <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-100 shadow-sm p-3.5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Sticker Number</span>
                                        <div className="font-mono text-xl font-black text-slate-900">
                                            {tricycle.sticker_number || '—'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: tricycle.coding_hex || '#EF4444' }}
                                        />
                                        <span className="text-xs font-bold text-slate-800">
                                            {tricycle.coding_color || tricycle.color || 'Red'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2 pt-3 border-t border-slate-200/70 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Coding Day:</span>
                                        <span className="font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">{tricycle.coding_day || 'Monday'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Status Today:</span>
                                        {tricycle.is_coded_today ? (
                                            <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
                                                Coded Today (Not Allowed)
                                            </span>
                                        ) : (
                                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                                                Allowed to Operate
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live GPS Tracking Card */}
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW} md:col-span-2 lg:col-span-1`}>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <Cpu size={16} strokeWidth={2.2} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">Live GPS Tracking</h3>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${gpsStatus.badge} font-['Plus_Jakarta_Sans',sans-serif]`}>
                                    {gpsStatus.label}
                                </span>
                            </div>

                            <div className="mt-3.5 space-y-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Tracking Type:</span>
                                    <span className="font-bold text-slate-800">
                                        {tricycle.active_tracking_mode === 'iot_device' ? 'Installed GPS Device' : "Driver's Mobile Phone"}
                                    </span>
                                </div>
                                {tricycle.active_tracking_mode === 'iot_device' ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Device ID:</span>
                                        <span className="font-mono font-bold text-slate-900">{tricycle.iot_device_id || 'N/A'}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-medium">Signal Source:</span>
                                        <span className="font-semibold text-slate-700">Driver's Mobile App</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Last Signal:</span>
                                    <span className="font-semibold text-slate-700">{tricycle.gps_last_seen || 'Never'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Update Interval:</span>
                                    <span className="font-semibold text-slate-700">Every {tricycle.gps_interval_seconds}s</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100">
                                <Link
                                    href={`/tmo/live?unit=${tricycle.id}`}
                                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-[#182B62] transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <Radio size={13} />
                                    <span>View on Live Map</span>
                                </Link>
                            </div>
                        </div>


                    </div>
                </div>
            )}

            {/* ── TAB 2: ROADWORTHINESS & DOCUMENTS ── */}
            {activeTab === 'compliance' && (
                <div className="space-y-5">
                    {/* Milestone Timeline Card */}
                    <Card icon={Clock} title="Franchise Application Timeline">
                        {/* Desktop Horizontal Timeline (>= sm) */}
                        <div className="hidden sm:flex relative items-start justify-between px-2 py-4 overflow-hidden">
                            {timeline.map((event, idx) => {
                                const meta = TIMELINE_STATE_META[event.state] || TIMELINE_STATE_META.pending;
                                const Icon = meta.icon;
                                const isLast = idx === timeline.length - 1;
                                const nextEvent = timeline[idx + 1];
                                const isSegmentDone = event.state === 'complete' && nextEvent && (nextEvent.state === 'complete' || nextEvent.state === 'current');

                                return (
                                    <div key={event.id} className="relative flex flex-col items-center flex-1">
                                        {/* Connecting horizontal track to the next milestone */}
                                        {!isLast && (
                                            <div className="absolute top-[18px] left-1/2 w-full h-[2px] -translate-y-1/2 z-0">
                                                <div className="w-full h-full bg-slate-200" />
                                                {isSegmentDone && (
                                                    <div className="absolute inset-0 bg-emerald-500 transition-all duration-500" />
                                                )}
                                            </div>
                                        )}

                                        {/* Milestone Node Circle */}
                                        <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${meta.circle}`}>
                                            <Icon size={16} strokeWidth={2.5} />
                                        </div>

                                        {/* Milestone Label */}
                                        <div className="text-center mt-2 px-1">
                                            <p className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">{event.title}</p>
                                            <p className={`text-[10px] mt-0.5 ${meta.sub}`}>{event.date || event.note}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mobile Vertical Connected Timeline (< sm) */}
                        <div className="sm:hidden relative pl-8 py-1 space-y-3">
                            {timeline.map((event, idx) => {
                                const meta = TIMELINE_STATE_META[event.state] || TIMELINE_STATE_META.pending;
                                const Icon = meta.icon;
                                const isLast = idx === timeline.length - 1;
                                const nextEvent = timeline[idx + 1];
                                const isSegmentDone = event.state === 'complete' && nextEvent && (nextEvent.state === 'complete' || nextEvent.state === 'current');

                                return (
                                    <div key={event.id} className="relative flex items-start gap-2.5">
                                        {!isLast && (
                                            <div
                                                className={`absolute -left-[19px] top-6 bottom-[-14px] w-[2px] ${
                                                    isSegmentDone ? 'bg-emerald-500' : 'bg-slate-200'
                                                }`}
                                            />
                                        )}

                                        <div className={`absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm z-10 ${meta.circleMobile}`}>
                                            <Icon size={13} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                                            <p className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">{event.title}</p>
                                            <p className={`text-[10px] font-medium mt-0.5 ${meta.sub}`}>{event.date || event.note}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Compact Badge Cards: Requirements & Roadworthiness Side-by-Side */}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* Submitted Requirements & Clearances as Badges */}
                        <Card icon={FileCheck} title="Submitted Requirements & Clearances">
                            {documents.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center text-xs text-slate-600">
                                    No submitted documents found for this tricycle.
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 font-['Plus_Jakarta_Sans',sans-serif]">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span>
                                            {documents.filter(d => d.status === 'verified').length === documents.length
                                                ? `All ${documents.length} requirements verified`
                                                : `${documents.filter(d => d.status === 'verified').length} of ${documents.length} verified`}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {documents.map((doc, idx) => {
                                            const isVerified = doc.status === 'verified';
                                            const isPending = doc.status === 'pending';
                                            const isRejected = doc.status === 'rejected';

                                            return (
                                                <div
                                                    key={doc.id || idx}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]"
                                                >
                                                    {isRejected ? (
                                                        <XCircle size={13} className="text-rose-600 shrink-0" />
                                                    ) : isPending ? (
                                                        <Clock size={13} className="text-amber-600 shrink-0" />
                                                    ) : (
                                                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                                    )}
                                                    <span>{doc.name}</span>
                                                    {doc.file_path && (
                                                        <a
                                                            href={doc.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={`View ${doc.name}`}
                                                            className="ml-0.5 text-[#182B62] hover:text-[#25449B] transition-colors"
                                                        >
                                                            <ExternalLink size={12} className="shrink-0" />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </Card>

                        {/* Physical Roadworthiness Checklist as Badges */}
                        <Card icon={CheckSquare} title="Physical Roadworthiness Checklist">
                            <div className="mb-3.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 font-['Plus_Jakarta_Sans',sans-serif]">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <span>Approved — All {PHYSICAL_INSPECTION_ITEMS.length} requirements passed</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {PHYSICAL_INSPECTION_ITEMS.map((item) => (
                                    <div
                                        key={item.id}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]"
                                    >
                                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── TAB 3: VIOLATIONS & CITATIONS HISTORY ── */}
            {activeTab === 'violations' && (
                <div className="space-y-5">
                    {/* KPI Summary Deck */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Total Violations</span>
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[#182B62]">
                                    <ShieldAlert size={14} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {violationStats?.total_count ?? violations.length}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</span>
                            </div>
                            <p className="mt-1 text-[10.5px] sm:text-[11px] leading-snug text-slate-600 font-medium font-['Plus_Jakarta_Sans',sans-serif]">All recorded violations</p>
                        </div>

                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Settled Fines</span>
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 size={14} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {violationStats?.settled_count ?? violations.filter(v => v.paymentStatus === 'settled').length}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Settled</span>
                            </div>
                            <p className="mt-1 text-[10.5px] sm:text-[11px] leading-snug text-slate-600 font-medium font-['Plus_Jakarta_Sans',sans-serif]">{violationStats?.settled_fines ?? '₱0.00'} paid</p>
                        </div>

                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Pending Fines</span>
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                                    <AlertTriangle size={14} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                    (violationStats?.unsettled_count ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'
                                }`}>
                                    {violationStats?.unsettled_count ?? violations.filter(v => v.paymentStatus === 'unsettled').length}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unsettled</span>
                            </div>
                            <p className="mt-1 text-[10.5px] sm:text-[11px] leading-snug text-slate-600 font-medium font-['Plus_Jakarta_Sans',sans-serif]">{violationStats?.unsettled_fines ?? '₱0.00'} due</p>
                        </div>

                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">Compliance Score</span>
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#182B62]">
                                    <TrendingUp size={14} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {violationStats?.compliance_rate ?? '100%'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10.5px] sm:text-[11px] leading-snug text-slate-600 font-medium font-['Plus_Jakarta_Sans',sans-serif]">Clean ordinance record rate</p>
                        </div>
                    </div>

                    {/* Violations Incident Table */}
                    <Card icon={ShieldAlert} title="Traffic & Ordinance Violations">
                        {violations.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <ShieldCheck size={22} strokeWidth={2.2} />
                                </div>
                                <h4 className="mt-3 font-['Plus_Jakarta_Sans',sans-serif] text-sm font-bold text-slate-900">
                                    No Recorded Violations
                                </h4>
                                <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                                    This tricycle has a clean record with no traffic or color coding violations.
                                </p>
                            </div>
                        ) : (
                            <>
                            {/* Desktop table (lg+) — scrolls sideways on narrow laptops */}
                            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                                            <th className="py-3 px-3.5 whitespace-nowrap">Date & Time</th>
                                            <th className="py-3 px-3.5 w-[260px]">Violation Details</th>
                                            <th className="py-3 px-3.5 min-w-[160px]">Location</th>
                                            <th className="py-3 px-3.5 whitespace-nowrap">Detection</th>
                                            <th className="py-3 px-3.5 whitespace-nowrap">Fine Amount</th>
                                            <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {violations.map((v) => (
                                            <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-3.5 whitespace-nowrap align-top">
                                                    <div className="font-semibold text-slate-900">{splitDateTime(v.date).date}</div>
                                                    {splitDateTime(v.date).time && (
                                                        <div className="mt-0.5 text-[11px] font-medium text-slate-500">{splitDateTime(v.date).time}</div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3.5 w-[260px] max-w-[260px] whitespace-normal align-top font-semibold text-slate-800">
                                                    <div className="line-clamp-2 leading-snug" title={v.details}>{v.details}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">#{v.violation_code || v.id}</div>
                                                </td>
                                                <td className="py-3.5 px-3.5 text-slate-600">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={11} className="text-slate-500 shrink-0" />
                                                        <span>{v.location}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3.5 text-slate-600 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold border border-slate-200">
                                                        {v.detection_method || 'GPS Detection'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                    {v.fine_amount_formatted || `₱${v.fine_amount}`}
                                                </td>
                                                <td className="py-3.5 px-3.5 whitespace-nowrap">
                                                    <ViolationPaymentPill settled={v.paymentStatus === 'settled'} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Phones: 1 column · tablets: 2 columns */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                                {violations.map((v) => {
                                    const when = splitDateTime(v.date);
                                    return (
                                        <div key={v.id} className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
                                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900">{when.date}</p>
                                                    {when.time && <p className="mt-0.5 text-[11px] font-medium text-slate-500">{when.time}</p>}
                                                </div>
                                                <ViolationPaymentPill settled={v.paymentStatus === 'settled'} />
                                            </div>

                                            <p className="mt-2.5 text-xs font-semibold leading-snug text-slate-800 line-clamp-3">{v.details}</p>
                                            <p className="mt-0.5 font-mono text-[10px] text-slate-500">#{v.violation_code || v.id}</p>

                                            <div className="mt-2.5 flex items-start gap-1 text-[11px] text-slate-600">
                                                <MapPin size={11} className="mt-0.5 shrink-0 text-slate-500" />
                                                <span className="leading-snug">{v.location}</span>
                                            </div>

                                            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold border border-slate-200">
                                                    {v.detection_method || 'GPS Detection'}
                                                </span>
                                                <span className="font-mono text-sm font-bold text-slate-900">
                                                    {v.fine_amount_formatted || `₱${v.fine_amount}`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </>
                        )}
                    </Card>
                </div>
            )}
        </TrivoraLayout>
    );
}



function Card({ icon: Icon, title, children }) {
    return (
        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW}`}>
            <div className="mb-4 sm:mb-5 flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100/80 text-[#182B62] shrink-0">
                    <Icon size={16} strokeWidth={2.2} />
                </div>
                <span className="truncate font-['Plus_Jakarta_Sans',sans-serif]">{title}</span>
            </div>
            {children}
        </div>
    );
}

function SpecItem({ label, value, mono, badge, span2 }) {
    return (
        <div className={`flex flex-col min-w-0 ${span2 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <span className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate font-['Plus_Jakarta_Sans',sans-serif]">{label}</span>
            {badge === 'success' ? (
                <span className="inline-flex items-center w-fit gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/90 font-['Plus_Jakarta_Sans',sans-serif]">
                    <Check size={11} strokeWidth={2.5} />
                    <span>{value}</span>
                </span>
            ) : badge === 'warning' ? (
                <span className="inline-flex items-center w-fit gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/90 font-['Plus_Jakarta_Sans',sans-serif]">
                    <span>{value}</span>
                </span>
            ) : badge === 'danger' ? (
                <span className="inline-flex items-center w-fit gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200/90 font-['Plus_Jakarta_Sans',sans-serif]">
                    <span>{value}</span>
                </span>
            ) : (
                <span className={`text-xs sm:text-sm font-semibold text-slate-900 truncate ${mono ? 'font-mono text-xs font-bold' : ''}`}>
                    {value || 'N/A'}
                </span>
            )}
        </div>
    );
}

// "Oct 16, 2026 at 09:41 PM" → { date: 'Oct 16, 2026', time: '09:41 PM' }; any other format stays on one line.
function splitDateTime(value) {
    if (!value) return { date: '—', time: null };
    const [date, time] = String(value).split(' at ');
    return { date, time: time || null };
}

function ViolationPaymentPill({ settled }) {
    return settled ? (
        <span className="inline-flex shrink-0 items-center w-fit gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 font-['Plus_Jakarta_Sans',sans-serif]">
            <Check size={11} /> Settled
        </span>
    ) : (
        <span className="inline-flex shrink-0 items-center w-fit gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-700 font-['Plus_Jakarta_Sans',sans-serif]">
            <Clock size={11} /> Unsettled
        </span>
    );
}
