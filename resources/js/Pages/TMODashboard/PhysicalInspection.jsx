import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Check, X, CheckCircle2, Bike, AlertTriangle,
    RotateCcw, ChevronLeft, ShieldCheck, Clock,
    Smartphone, MapPin, Copy,
    Wrench, AlertCircle, XCircle, Info, FileText, CalendarDays
} from 'lucide-react';
import { Button, Textarea } from '@/Components/TMO';
import { PHYSICAL_INSPECTION_ITEMS } from '@/data/physicalInspectionItems';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const QUICK_REJECTION_REASONS = [
    'Braking system defect or insufficient stopping distance',
    'Busted headlights, tail lights, or non-functional turn signals',
    'Missing or broken dual side rearview mirrors',
    'Sidecar chassis structural frame damage or loose welds',
    'Defective horn or audible warning device',
    'Excessive smoke emissions / roadworthiness failure',
];

function getInitials(name) {
    if (!name || name === 'N/A') return 'TD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PhysicalInspection({ application }) {
    const appData = application || {};

    const [isProcessing, setIsProcessing] = useState(false);
    const [decisionMode, setDecisionMode] = useState(null); // null | 'reject'
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionError, setRejectionError] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Background refresh of the record under inspection — a status change made by another officer
    // elsewhere updates this page without a manual reload. Paused while this officer is deciding;
    // local decision mode, typed rejection reason and copy feedback are never touched.
    useBackgroundRefresh(['application'], { paused: isProcessing });

    // Vehicle specifications with clean fallbacks
    const vehicleData = useMemo(() => ({
        plate: appData.plate && appData.plate !== '—' ? appData.plate : 'UNREGISTERED',
        make: appData.make && appData.make !== 'N/A' ? appData.make : 'Declared Unit',
        year_model: appData.year_model && appData.year_model !== '—' ? appData.year_model : 'Standard',
        body_color: appData.body_color && appData.body_color !== '—' ? appData.body_color : 'Standard',
        body_type: appData.body_type && appData.body_type !== '—' ? appData.body_type : 'Tricycle',
        engine_number: appData.engine_number && appData.engine_number !== '—' ? appData.engine_number : '—',
        chassis_number: appData.chassis_number && appData.chassis_number !== '—' ? appData.chassis_number : '—',
        or_number: appData.or_number && appData.or_number !== '—' ? appData.or_number : '—',
        cr_number: appData.cr_number && appData.cr_number !== '—' ? appData.cr_number : '—',
    }), [appData]);

    // Copy to clipboard helper
    const handleCopy = (field, text) => {
        if (!text || text === '—') return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Approve Inspection Flow
    const handleApprove = () => {
        Swal.fire({
            title: 'Approve Physical Inspection?',
            html: `Are you sure you want to mark <b>${appData.reference || appData.id}</b> as passed?<br/><span class="text-xs text-slate-500 mt-1 block">The inspection will be marked as passed and the application will advance to BPLO Releasing.</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#94A3B8',
            confirmButtonText: 'Yes, Approve Inspection',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);
                router.post(`/tmo/review/physical/${appData.id}`, {
                    action: 'approve',
                }, {
                    onFinish: () => setIsProcessing(false),
                    // Same success-alert pattern DocumentReview uses after its post: the
                    // backend already redirects back to the Physical Inspection queue (so
                    // the approved application is gone from the pending list), and this
                    // fires once that redirect's page has landed.
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Inspection Approved!',
                            text: 'Physical inspection passed. Application moved to BPLO Releasing. Applicant notified.',
                            icon: 'success',
                            confirmButtonColor: '#1D2542',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    // Trigger Reject Mode
    const handleStartReject = () => {
        setDecisionMode('reject');
        setRejectionError(null);
    };

    // Cancel Reject Mode
    const handleCancelReject = () => {
        setDecisionMode(null);
        setRejectionReason('');
        setRejectionError(null);
    };

    // Confirm Reject Inspection Flow
    const handleConfirmReject = () => {
        const trimmedReason = rejectionReason.trim();
        if (!trimmedReason) {
            setRejectionError('Rejection comments are required. Please describe the defects or failure reason.');
            return;
        }

        Swal.fire({
            title: 'Confirm Inspection Rejection',
            html: `Reject physical inspection for <b>${appData.reference || appData.id}</b>?<br/><span class="text-xs text-slate-500 mt-1 block">The vehicle will be flagged for repair and the operator will be notified with your comments.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#94A3B8',
            confirmButtonText: 'Yes, Reject Inspection',
            cancelButtonText: 'Back',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);
                router.post(`/tmo/review/physical/${appData.id}`, {
                    action: 'reject',
                    rejection_reason: trimmedReason,
                }, {
                    onFinish: () => setIsProcessing(false),
                    onError: (errors) => {
                        if (errors.rejection_reason) {
                            setRejectionError(errors.rejection_reason);
                        }
                    }
                });
            }
        });
    };

    const operatorInitials = getInitials(appData.operator);

    return (
        <TrivoraLayout title="Physical Inspection" role="TMO Officer">
            <Head title={`Physical Inspection: ${appData.reference || appData.id} | TRIVORA`} />

            {/* ══════════════════════════════════════════════════════════════
                1. TOP NAVIGATION
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 flex items-center">
                <Link
                    href="/tmo/physical"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                    <span>Back to Physical Inspection Queue</span>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. INTEGRATED HEADER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 border-b border-slate-200/80 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Physical Inspection</span>
                    {appData.is_reinspection && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <RotateCcw size={10} /> Re-inspection
                        </span>
                    )}
                </div>
                <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                    {appData.reference || appData.id}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Applicant: <strong className="font-semibold text-slate-700">{appData.operator}</strong>
                    {appData.barangay && appData.barangay !== '—' ? ` · Barangay ${appData.barangay}` : ''}
                </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. MAIN WORKSTATION GRID (Left: Decision | Right: Specs)
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

                {/* ── LEFT CANVAS: SINGLE DECISION WORKFLOW (7 cols) ── */}
                <div className="space-y-5 lg:col-span-7">

                    {/* Re-inspection Notification Banner (if applicable) */}
                    {appData.is_reinspection && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
                            <div className="flex items-start gap-3.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                                    <RotateCcw size={18} strokeWidth={2.2} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold text-amber-900">
                                            Re-inspection Attempt #{appData.attempt_count + 1}
                                        </h3>
                                        <span className="text-[11px] font-semibold text-amber-700">Repairs Submitted</span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                                        The operator fixed the flagged items and requested re-inspection.
                                    </p>
                                    {appData.previous_rejection_reason && (
                                        <div className="mt-2.5 rounded-xl border border-amber-200/80 bg-white/70 p-3 text-xs text-amber-950 font-medium">
                                            <span className="font-bold text-amber-900 block mb-0.5">Previous Rejection Reason:</span>
                                            {appData.previous_rejection_reason}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Decision Card */}
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <ShieldCheck size={18} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                                        Physical Inspection
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Roadworthiness, vehicle safety, and physical compliance assessment
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-6">
                            {/* 1. Informational Inspection List / Table */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Inspection Checklist
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Review the vehicle condition and safety compliance requirements:
                                        </p>
                                    </div>
                                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                        {PHYSICAL_INSPECTION_ITEMS.length} Items for Review
                                    </span>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th scope="col" className="py-3 px-4 w-5/12">Inspection Item</th>
                                                <th scope="col" className="py-3 px-4 w-7/12">Details / Requirement</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {PHYSICAL_INSPECTION_ITEMS.map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 px-4 align-top">
                                                        <div className="flex items-start gap-2.5">
                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10.5px] font-bold text-slate-600 mt-0.5">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="font-bold text-slate-900 leading-snug">
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 leading-relaxed align-top">
                                                        {item.requirement}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 2. Overall Inspection Decision */}
                            <div className="border-t border-slate-200/80 pt-5 space-y-4">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Overall Inspection Decision
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                        Make one overall decision for the entire physical inspection. Approving passes the unit to BPLO release. Rejecting flags defects and returns the application for operator repairs.
                                    </p>
                                </div>

                                {/* Decision Controls */}
                                {decisionMode !== 'reject' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={handleApprove}
                                            className="flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3.5 px-5 text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={18} strokeWidth={2.2} />
                                            <span>Approve Inspection</span>
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={handleStartReject}
                                            className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-rose-300 hover:border-rose-400 bg-white hover:bg-rose-50/70 active:bg-rose-100 text-rose-700 py-3.5 px-5 text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            <XCircle size={18} strokeWidth={2.2} />
                                            <span>Reject Inspection</span>
                                        </button>
                                    </div>
                                ) : (
                                    /* Rejection Form */
                                    <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 sm:p-5 space-y-4">
                                        <div className="flex items-start justify-between gap-2 border-b border-rose-100 pb-3">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={17} className="text-rose-600 shrink-0" />
                                                <h4 className="text-sm font-bold text-rose-950">
                                                    Overall Inspection Rejection
                                                </h4>
                                            </div>
                                            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                                Reason Required
                                            </span>
                                        </div>

                                        {/* Quick helper preset chips */}
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                                Common Defects (Click to add)
                                            </label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {QUICK_REJECTION_REASONS.map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setRejectionReason(prev => prev ? `${prev}; ${preset}` : preset);
                                                            setRejectionError(null);
                                                        }}
                                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-rose-300 hover:bg-rose-50/60 hover:text-rose-900 transition-colors cursor-pointer text-left"
                                                    >
                                                        + {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Rejection Comments Textarea */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-900 mb-1.5">
                                                Reinspection / Rejection Details <span className="text-rose-600">*</span>
                                            </label>
                                            <Textarea
                                                rows={4}
                                                placeholder="Enter the reason why the vehicle did not pass the physical inspection..."
                                                value={rejectionReason}
                                                onChange={(e) => {
                                                    setRejectionReason(e.target.value);
                                                    if (rejectionError) setRejectionError(null);
                                                }}
                                                className={`w-full text-xs sm:text-sm ${rejectionError ? 'border-rose-500 ring-rose-200' : ''}`}
                                                autoFocus
                                            />
                                            {rejectionError && (
                                                <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-rose-600">
                                                    <AlertCircle size={13} className="shrink-0" />
                                                    <span>{rejectionError}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-rose-100">
                                            <button
                                                type="button"
                                                disabled={isProcessing}
                                                onClick={handleCancelReject}
                                                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isProcessing}
                                                onClick={handleConfirmReject}
                                                className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                <XCircle size={16} />
                                                <span>Confirm Rejection</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                </div>

                {/* ── RIGHT SIDEBAR: APPLICANT & VEHICLE SPECS (5 cols) ── */}
                <div className="space-y-5 lg:col-span-5 lg:sticky lg:top-6 self-start">

                    {/* Applicant Details */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Applicant Details</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-xs font-bold text-white shadow-2xs">
                                {operatorInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs sm:text-sm font-bold text-slate-900">{appData.operator || 'N/A'}</p>
                                <p className="truncate text-xs text-slate-500 font-medium">Tricycle Owner</p>
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <CalendarDays size={13} className="shrink-0" />
                                    Birthday
                                </span>
                                <span className="font-semibold text-slate-800">{appData.owner?.birthday || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <Smartphone size={13} className="shrink-0" />
                                    Contact
                                </span>
                                <span className="font-semibold text-slate-800">{appData.contact || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <MapPin size={13} className="shrink-0" />
                                    Barangay
                                </span>
                                <span className="font-semibold text-slate-800 truncate max-w-[180px] text-right">{appData.barangay || '—'}</span>
                            </div>
                        </div>

                        {/* Tricycle Driver — visually distinct; only a separate person when ownerIsDriver is false */}
                        <div className="mt-3.5 rounded-xl border border-dashed border-indigo-300/70 bg-indigo-50/50 p-3.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-600">Tricycle Driver</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${appData.ownerIsDriver ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {appData.ownerIsDriver ? 'Same as Owner' : 'Different Person'}
                                </span>
                            </div>
                            {appData.ownerIsDriver ? (
                                <p className="mt-2 text-xs text-slate-600">
                                    The Tricycle Owner drives their own unit — no separate driver on file.
                                </p>
                            ) : appData.tricycleDriver ? (
                                <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Name</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.full_name || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Birthday</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.birthday || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Mobile</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.contact_number || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Barangay</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.barangay || '—'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-2 text-xs text-slate-500">No separate driver provided.</p>
                            )}
                        </div>
                    </div>

                    {/* Tricycle Registration Details */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 leading-snug">Tricycle Registration</h3>
                                    <p className="text-[11px] text-slate-500 leading-tight">Declared Unit Specifications</p>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Specifications */}
                        <div className="space-y-2.5 text-xs">
                            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Vehicle Specifications
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">LTO Plate Number</span>
                                <span className="font-mono font-bold text-slate-900">
                                    {vehicleData.plate}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Make &amp; Model</span>
                                <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]">
                                    {vehicleData.make}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Year Model</span>
                                <span className="font-semibold text-slate-800">
                                    {vehicleData.year_model}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Body Color</span>
                                <span className="font-semibold text-slate-800">
                                    {vehicleData.body_color}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Body Type</span>
                                <span className="font-semibold text-slate-800">
                                    {vehicleData.body_type}
                                </span>
                            </div>
                        </div>

                        {/* LTO Official Registration Numbers */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5 text-xs">
                            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                LTO Official Numbers
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Engine Number</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-slate-800 font-semibold text-xs">
                                        {vehicleData.engine_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy('engine', vehicleData.engine_number)}
                                        title="Copy Engine Number"
                                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                    >
                                        {copiedField === 'engine' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Chassis Number</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-slate-800 font-semibold text-xs">
                                        {vehicleData.chassis_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy('chassis', vehicleData.chassis_number)}
                                        title="Copy Chassis Number"
                                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                    >
                                        {copiedField === 'chassis' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">LTO OR Number</span>
                                <span className="font-mono text-slate-800 font-semibold text-xs">
                                    {vehicleData.or_number}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">LTO CR Number</span>
                                <span className="font-mono text-slate-800 font-semibold text-xs">
                                    {vehicleData.cr_number}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </TrivoraLayout>
    );
}
