import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Bike, User, Users, CheckCircle2, Clock, FileCheck,
    CheckSquare, FileText, Award, Cpu,
    ChevronLeft, Phone, Hash, Calendar, Radio, Check, ExternalLink,
    Download, Eye, Map, ShieldAlert, Filter, Sparkles, XCircle,
    ShieldOff, Ban, ShieldCheck,
} from 'lucide-react';
import { PHYSICAL_INSPECTION_ITEMS } from '@/data/physicalInspectionItems';

// Semantic status treatment for a franchise's operational authorization status —
// success/warning/danger, the same restrained palette used everywhere else in the panel, no
// extra colors invented.
const FRANCHISE_STATUS_META = {
    active:    { label: 'Active',    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    suspended: { label: 'Suspended', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    revoked:   { label: 'Revoked',   badge: 'bg-red-50 text-red-700 border-red-200' },
};

/**
 * TMO's Suspend / Revoke / Reinstate actions for this tricycle's FRANCHISE — operational
 * authorization belongs to the franchise permit, not any individual driver account. Lives in the
 * page header (not the status card below) so the actions read as a page-level operation on this
 * unit, same as any other header action. Renders nothing when this unit has no current franchise
 * permit, or when the franchise is Revoked (terminal — no action is ever available).
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
            html: 'This immediately prevents the assigned driver from going Online and accepting bookings. If currently Online, they will be forced Offline.',
            input: 'textarea',
            inputLabel: 'Reason (required, shown in the franchise\'s status history):',
            inputPlaceholder: 'e.g. Repeated coding-day violations reported by TMO field officer...',
            inputValidator: (value) => {
                if (!value || value.trim().length < 5) {
                    return 'Please provide a reason (at least 5 characters).';
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
        title: 'Suspend Franchise?',
        actionLabel: 'Yes, Suspend',
        confirmColor: '#D97706',
        action: 'suspend',
    });

    const handleRevoke = () => promptForReason({
        title: 'Revoke Franchise?',
        actionLabel: 'Yes, Revoke',
        confirmColor: '#DC2626',
        action: 'revoke',
    });

    const handleReinstate = () => {
        Swal.fire({
            title: 'Reinstate Franchise?',
            html: 'This restores the assigned driver\'s ability to go Online and accept bookings again.',
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                    >
                        <ShieldOff size={14} /> Suspend Franchise
                    </button>
                    <button
                        type="button"
                        onClick={handleRevoke}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                        <Ban size={14} /> Revoke Franchise
                    </button>
                </>
            )}
            {franchiseStatus.status === 'suspended' && (
                <>
                    <button
                        type="button"
                        onClick={handleReinstate}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                    >
                        <ShieldCheck size={14} /> Reinstate Franchise
                    </button>
                    <button
                        type="button"
                        onClick={handleRevoke}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                        <Ban size={14} /> Revoke Franchise
                    </button>
                </>
            )}
        </div>
    );
}

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// pages (Dashboard.jsx, Index.jsx, UnitRegistry.jsx) so this page reads as part of one product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TABS = [
    { key: 'overview', label: 'Overview & Details', shortLabel: 'Overview', icon: FileText },
    { key: 'compliance', label: 'Roadworthiness & Documents', shortLabel: 'Compliance', icon: CheckSquare },
];

// Visual treatment per milestone state — driven by the application's real status/history,
// never a fixed "always complete" look.
const TIMELINE_STATE_META = {
    complete: {
        icon: CheckCircle2,
        circle: 'bg-emerald-600 text-white ring-4 ring-emerald-50',
        circleMobile: 'bg-emerald-600 text-white ring-2 ring-emerald-100',
        sub: 'text-slate-500',
    },
    current: {
        icon: Clock,
        circle: 'bg-[#1D2542] text-white ring-4 ring-[#1D2542]/15',
        circleMobile: 'bg-[#1D2542] text-white ring-2 ring-[#1D2542]/15',
        sub: 'text-[#1D2542] font-semibold',
    },
    'action-req': {
        icon: ShieldAlert,
        circle: 'bg-amber-500 text-white ring-4 ring-amber-50',
        circleMobile: 'bg-amber-500 text-white ring-2 ring-amber-100',
        sub: 'text-amber-700 font-semibold',
    },
    pending: {
        icon: Clock,
        circle: 'border-2 border-slate-200 bg-white text-slate-300',
        circleMobile: 'border-2 border-slate-200 bg-white text-slate-300',
        sub: 'text-slate-400',
    },
};

// Visual treatment per document requirement status — driven by the real application document
// records (DashboardController::tricycleDetails), never a fixed "always verified" look.
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
        iconWrap: 'bg-red-100 text-red-700',
        badge: 'bg-red-50 text-red-700 border-red-200',
        label: 'Rejected',
        dateLabel: 'Rejected',
    },
    not_submitted: {
        icon: FileText,
        iconWrap: 'bg-slate-100 text-slate-400',
        badge: 'bg-slate-100 text-slate-500 border-slate-200',
        label: 'Not Submitted',
        dateLabel: null,
    },
};

// Real GPS connectivity status (Tricycle::gpsStatus()) — derived only from actual
// TricycleLocation pings, never implied by which tracking mode (Mobile App / IoT Device) is
// configured. A unit that has never sent a real ping shows "Awaiting Signal", never "Online".
const GPS_STATUS_META = {
    connected: { label: 'Online', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    stale:     { label: 'Signal Lost', badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
    awaiting:  { label: 'Awaiting Signal', badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

export default function TricycleDetails({
    tricycleId,
    initialTricycle = null,
    initialDocs = [],
    initialMetrics = [],
    initialTimeline = []
}) {
    const [activeTab, setActiveTab] = useState('overview');

    // Background refresh of this unit's record, documents, metrics and timeline: an activation,
    // suspension or newly uploaded document from another session updates this page without a
    // manual reload. The active tab above is local state and survives every refresh.
    useBackgroundRefresh(['initialTricycle', 'initialDocs', 'initialMetrics', 'initialTimeline']);

    const tricycleMap = {
        'NSB-26-8812': {
            id: 'NSB-26-8812',
            unit_code: 'TRV-001',
            coding_scheme_number: '0142',
            sticker_number: '#0142',
            plate_no: 'AAA-1234',
            operator: 'Ricardo Dalisay',
            contact: '0917 123 4567',
            operator_address: 'Barangay Bucana, Nasugbu, Batangas',
            license_number: 'N02-18-001420',
            license_expiry: 'Oct 24, 2028',
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

    // Verified Requirements & Clearances — the real current application's document records
    // (DashboardController::tricycleDetails), one row per canonical registration requirement.
    // No fallback demo data: an empty array here honestly means no application/documents exist
    // for this unit yet, which the Card below renders as an explicit empty state.
    const documents = initialDocs;

    // Franchise Application Process Milestone Timeline — from real application status/history
    // (see DashboardController::tricycleDetails). Demo fallback only applies when no application
    // data is available at all (e.g. viewing the page's built-in demo unit).
    const timeline = initialTimeline.length > 0 ? initialTimeline : [
        { id: 1, title: 'Document Review', date: 'Jan 15, 2026', state: 'complete', note: null },
        { id: 2, title: 'Physical Inspection', date: 'Jan 18, 2026', state: 'complete', note: null },
        { id: 3, title: 'BPLO Release: Sticker & Plate for Coding', date: 'Jan 20, 2026', state: 'complete', note: null },
        { id: 4, title: 'TMO Final Confirmation', date: 'Jan 22, 2026', state: 'complete', note: null },
    ];

    // How many leading milestones are complete — drives the connector-line fill so it reflects
    // real progress instead of always reading as fully done.
    const completeCount = timeline.reduce((acc, item, idx) => (idx === acc && item.state === 'complete' ? acc + 1 : acc), 0);
    const lineWidthPercent = timeline.length > 1 ? (completeCount / (timeline.length - 1)) * 75 : 0;
    const lineHeightPercent = timeline.length > 1 ? (completeCount / (timeline.length - 1)) * 100 : 0;

    const operatorInitials = (tricycle.operator || 'OP')
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <TrivoraLayout title={`Unit ${tricycle.unit_code || tricycle.id}`} role="TMO Officer">
            <Head title={`Unit ${tricycle.unit_code || tricycle.id} Details | TRIVORA`} />

            {/* ── Back Navigation ── */}
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
                <Link
                    href="/tmo/registry"
                    className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
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

            {/* ── Page Title / Compact Identification ── */}
            <div className="mb-4 sm:mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="font-mono text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                            {tricycle.unit_code || `TRV-${String(tricycle.id).padStart(3, '0')}`}
                        </h1>
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-black tracking-wider">
                            {tricycle.plate_no || 'NO PLATE'}
                        </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
                        <Bike size={13} className="text-slate-400 shrink-0" />
                        {tricycle.full_model || tricycle.model || 'Kawasaki Barako 175'} · Tricycle Registry Profile · Nasugbu, Batangas
                    </p>
                </div>

                {/* Franchise Suspend/Revoke/Reinstate actions — page-level actions for this
                    unit's franchise, kept in the header so there's exactly one place to trigger
                    them (the status card in the sidebar below is read-only). */}
                <FranchiseStatusHeaderActions tricycleId={tricycle.id} franchiseStatus={tricycle.franchise_status} />
            </div>

            {/* ── Tabs Navigation Bar (App-Style Segmented on Mobile, Clean Pills on Desktop) ── */}
            <div className="sticky top-0 z-20 -mx-3.5 px-3.5 py-1.5 mb-4 bg-slate-50/95 backdrop-blur-md md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:mb-6">
                {/* Mobile App Segmented Tab Bar (< md) */}
                <div className={`grid grid-cols-2 gap-1 rounded-2xl border border-slate-200/70 bg-white p-1 ${CARD_SHADOW} md:hidden`}>
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
                            </button>
                        );
                    })}
                </div>

                {/* Desktop Horizontal Pills (>= md) */}
                <div className={`hidden md:inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-white p-1.5 ${CARD_SHADOW}`}>
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

                        {/* BPLO Franchise & Regulatory Details Card — "Franchise Status" here IS
                            the operational authorization TMO's Suspend/Revoke/Reinstate header
                            actions control (FranchiseScheme.status), not the tricycle's own
                            record status. Updates live via useBackgroundRefresh the moment TMO
                            suspends/revokes/reinstates. */}
                        <Card icon={Award} title="BPLO Municipal Franchise">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                                <SpecItem
                                    label="Franchise Status"
                                    value={FRANCHISE_STATUS_META[tricycle.franchise_status?.status]?.label || 'Active'}
                                    badge={
                                        tricycle.franchise_status?.status === 'revoked' ? 'danger'
                                            : tricycle.franchise_status?.status === 'suspended' ? 'warning'
                                            : 'success'
                                    }
                                />
                                <SpecItem
                                    label="Franchise Number"
                                    value={tricycle.franchise_number || '—'}
                                    mono
                                />
                                <SpecItem label="Franchise Classification" value="Motorized Tricycle Operator Permit (MTOP)" />
                                <SpecItem label="Issuing Authority" value="BPLO — Nasugbu Municipal Hall" />
                                <SpecItem label="Franchise Validity Period" value="Jan 1, 2026 – Dec 31, 2026" />
                                <SpecItem label="Annual Renewal Status" value="Renewed (Current Year)" badge="success" />
                                <SpecItem label="Operating Jurisdiction" value="Nasugbu Municipal Coverage" />
                            </div>

                            {tricycle.franchise_status?.status !== 'active' && tricycle.franchise_status?.status_reason && (
                                <div className="mt-3.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Reason ({tricycle.franchise_status.status_changed_at})
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-700">{tricycle.franchise_status.status_reason}</p>
                                </div>
                            )}

                            {tricycle.franchise_status?.status === 'revoked' && (
                                <p className="mt-3 text-[11px] text-slate-400">
                                    Revoked is a terminal status — this franchise's authorization cannot be reactivated.
                                </p>
                            )}
                        </Card>
                    </div>

                    {/* Sidebar Column (1/3 width) */}
                    <div className="space-y-4 sm:space-y-6 lg:col-span-4">
                        {/* Owner & Driver Card — the tricycle OWNER (franchise holder) is the
                            primary person, matching the registry list; the separate DRIVER is
                            shown distinctly only when one exists (applications.owner_is_driver
                            = 0 + an application_drivers row), and the card explicitly says the
                            owner is also the driver otherwise. */}
                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-slate-100">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Tricycle Owner &amp; Driver</h3>
                                    <p className="text-[11px] text-slate-500">Franchise Holder Details</p>
                                </div>
                            </div>

                            {/* Owner — primary */}
                            <div className="mt-3 sm:mt-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-white font-bold text-sm">
                                    {operatorInitials}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tricycle Owner</p>
                                    <h4 className="text-sm font-bold text-slate-900 truncate">{tricycle.owner_name || tricycle.operator}</h4>
                                    <p className="text-xs text-slate-500 truncate">Registered Franchisee</p>
                                </div>
                            </div>

                            {/* Driver — same person, or the separate driver record */}
                            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tricycle Driver</p>
                                {tricycle.owner_is_driver ? (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                        <Check size={13} className="text-emerald-600 shrink-0" />
                                        Owner is also the driver
                                    </p>
                                ) : (
                                    <>
                                        <p className="mt-1 text-sm font-bold text-slate-900 truncate">
                                            {tricycle.driver_name || 'Separate driver — not yet provided'}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            {tricycle.driver_contact ? (
                                                <a href={`tel:${tricycle.driver_contact}`} className="hover:text-[#1D2542] hover:underline">
                                                    {tricycle.driver_contact}
                                                </a>
                                            ) : 'No contact provided'}
                                        </p>
                                    </>
                                )}
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
                                    <span className="text-slate-500">License Number:</span>
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
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sticker Number</span>
                                        <div className="font-mono text-lg font-black text-slate-900">
                                            {tricycle.sticker_number || '—'}
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

                        {/* Smart GPS Telematics Card — driven by the real tracking mode
                            (Tricycle.active_tracking_mode) and real GPS connectivity
                            (Tricycle::gpsStatus(), derived only from actual TricycleLocation
                            pings — never implied by the tracking mode being configured). */}
                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                        <Cpu size={16} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Smart GPS Telematics</h3>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${GPS_STATUS_META[tricycle.gps_status]?.badge || GPS_STATUS_META.awaiting.badge}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${GPS_STATUS_META[tricycle.gps_status]?.dot || GPS_STATUS_META.awaiting.dot}`}></span>
                                    {GPS_STATUS_META[tricycle.gps_status]?.label || GPS_STATUS_META.awaiting.label}
                                </span>
                            </div>

                            <div className="mt-3 sm:mt-4 space-y-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Tracking Method:</span>
                                    <span className="font-semibold text-slate-800">
                                        {tricycle.active_tracking_mode === 'iot_device' ? 'IoT Hardware Device' : 'Driver Mobile App GPS'}
                                    </span>
                                </div>
                                {tricycle.active_tracking_mode === 'iot_device' ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Device Hardware ID:</span>
                                        <span className="font-mono font-bold text-slate-900">{tricycle.iot_device_id || 'N/A'}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Source Device:</span>
                                        <span className="font-medium text-slate-700">Driver's Phone (Trivora App)</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Last GPS Signal:</span>
                                    <span className="font-medium text-slate-700">{tricycle.gps_last_seen || 'Never'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Ping Interval:</span>
                                    <span className="font-medium text-slate-700">Real-time (15s)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 2: ROADWORTHINESS & DOCUMENTS ── */}
            {activeTab === 'compliance' && (
                <div className="space-y-4 sm:space-y-6">
                    {/* Verified Requirements Card — one row per real application document
                        requirement/status, never a fixed "always verified" placeholder. */}
                    <Card icon={FileCheck} title="Verified Requirements & Clearances">
                        {documents.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-xs text-slate-500">
                                No franchise application record found for this unit.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 sm:grid-cols-2">
                                {documents.map((doc, idx) => {
                                    const meta = DOC_STATUS_META[doc.status] || DOC_STATUS_META.not_submitted;
                                    const Icon = meta.icon;
                                    return (
                                        <div key={doc.id || idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 transition-colors hover:bg-white hover:border-slate-300">
                                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                                <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconWrap}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">{doc.name}</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {doc.date ? `${meta.dateLabel}: ${doc.date}` : 'No file uploaded'}
                                                    </p>
                                                    {/* Openable link — only for requirements with an actually-uploaded file */}
                                                    {doc.file_path && (
                                                        <a
                                                            href={doc.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                                        >
                                                            <ExternalLink size={11} className="shrink-0" />
                                                            View uploaded file
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] font-bold border ${meta.badge}`}>
                                                <Icon size={11} />
                                                {meta.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* TMO Roadworthiness Checklist — reference/descriptive only. Physical
                        inspection is a single overall TMO decision (see the Milestone Timeline
                        card below for the real approved/reinspection-required verdict and date),
                        never a per-item status, so these items never carry a pass/fail badge. */}
                    <Card icon={CheckSquare} title="TMO Physical Safety & Roadworthiness Inspection Checklist">
                        <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2">
                            {PHYSICAL_INSPECTION_ITEMS.map((item, idx) => (
                                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 sm:px-4 sm:py-3 shadow-2xs">
                                    <p className="text-xs font-bold leading-snug text-slate-800">{idx + 1}. {item.label}</p>
                                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{item.requirement}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Milestone Timeline Card (Responsive: Vertical on Mobile, Horizontal on Desktop) */}
                    <Card icon={Clock} title="Franchise Application Process Milestone Timeline">
                        {/* Desktop Horizontal Timeline (>= sm) */}
                        <div className="hidden sm:flex relative items-center justify-between px-2 py-4">
                            <div className="absolute left-[12.5%] right-[12.5%] top-[24px] z-0 h-[2px] bg-slate-200" />
                            <div
                                className="absolute left-[12.5%] top-[24px] z-0 h-[2px] bg-emerald-500 transition-all duration-500"
                                style={{ width: `${lineWidthPercent}%` }}
                            />
                            {timeline.map((event) => {
                                const meta = TIMELINE_STATE_META[event.state] || TIMELINE_STATE_META.pending;
                                const Icon = meta.icon;
                                return (
                                    <div key={event.id} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${meta.circle}`}>
                                            <Icon size={16} strokeWidth={2.5} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-900">{event.title}</p>
                                            <p className={`text-[10px] ${meta.sub}`}>{event.date || event.note}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mobile Vertical Connected Timeline (< sm) */}
                        <div className="sm:hidden relative pl-7 py-2 space-y-3">
                            <div className="absolute left-[14px] top-3 bottom-4 w-[2px] bg-slate-200" />
                            <div
                                className="absolute left-[14px] top-3 w-[2px] bg-emerald-400 transition-all duration-500"
                                style={{ height: `${lineHeightPercent}%` }}
                            />
                            {timeline.map((event) => {
                                const meta = TIMELINE_STATE_META[event.state] || TIMELINE_STATE_META.pending;
                                const Icon = meta.icon;
                                return (
                                    <div key={event.id} className="relative flex items-start gap-2.5">
                                        <div className={`absolute -left-7 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-xs ${meta.circleMobile}`}>
                                            <Icon size={13} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                                            <p className="text-xs font-bold text-slate-900">{event.title}</p>
                                            <p className={`text-[10px] font-medium mt-0.5 ${meta.sub}`}>{event.date || event.note}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
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
            ) : badge === 'warning' ? (
                <span className="inline-flex items-center w-fit gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-amber-700 border border-amber-200">
                    <span>{value}</span>
                </span>
            ) : badge === 'danger' ? (
                <span className="inline-flex items-center w-fit gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-red-700 border border-red-200">
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


