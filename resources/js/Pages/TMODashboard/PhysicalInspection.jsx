import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Check, X, CheckCircle2, Bike, AlertTriangle,
    RotateCcw, ChevronLeft, ShieldCheck, Clock,
    Smartphone, MapPin, Copy, CalendarDays,
    AlertCircle, XCircle, FileText, Loader2, Send
} from 'lucide-react';
import { Textarea } from '@/Components/TMO';
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

    // Background refresh paused while in-flight or decision pending
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
        navigator.clipboard?.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1800);
    };

    // Approve Inspection Flow
    const handleApprove = () => {
        Swal.fire({
            title: 'Approve Inspection?',
            html: `Mark <b>${appData.reference || appData.id}</b> as roadworthy and passed?<br/><span class="text-xs text-slate-500 mt-1 block">The physical roadworthiness inspection will be cleared and the application will be forwarded to BPLO.</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#182B62',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Approve',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);
                router.post(`/tmo/review/physical/${appData.id}`, {
                    action: 'approve',
                }, {
                    onFinish: () => setIsProcessing(false),
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Inspection Approved!',
                            text: 'Unit passed roadworthiness inspection. Forwarded to BPLO.',
                            icon: 'success',
                            confirmButtonColor: '#182B62',
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
            setRejectionError('Please describe the defects or roadworthiness issues to be fixed.');
            return;
        }

        Swal.fire({
            title: 'Confirm Rejection?',
            html: `Flag <b>${appData.reference || appData.id}</b> for defect repairs?<br/><span class="text-xs text-slate-500 mt-1 block">The operator will be notified of the required fixes and scheduled for re-inspection.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
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

            <div className="font-['Plus_Jakarta_Sans',sans-serif] pb-24 lg:pb-8">
                {/* ══════════════════════════════════════════════════════════════
                    1. TOP NAVIGATION / BREADCRUMB
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-4">
                    <Link
                        href="/tmo/physical"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group"
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                        <span>Back to Physical Inspection Queue</span>
                    </Link>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. APPLICATION HEADER CARD
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 border-b border-slate-200/80 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="flex flex-wrap items-baseline gap-2 sm:gap-2.5">
                                <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                                    {appData.reference || appData.id}
                                </h1>
                                <span className="text-xs sm:text-sm font-semibold text-slate-500">
                                    · {appData.is_reinspection ? 'Re-inspection' : 'Roadworthiness Inspection'}
                                </span>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
                                Applicant: <strong className="font-bold text-slate-900">{appData.operator}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. WORKSPACE GRID: Inspection (Left) | Specs & Info (Right)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

                    {/* ── LEFT COLUMN: INSPECTION WORKBENCH (7 cols) ── */}
                    <div className="space-y-6 lg:col-span-7">

                        {/* Re-inspection Notification Banner (if applicable) */}
                        {appData.is_reinspection && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 shadow-2xs">
                                <div className="flex items-start gap-3.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 border border-amber-200">
                                        <RotateCcw size={18} strokeWidth={2.2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-bold text-amber-900">
                                                Re-inspection Attempt #{appData.attempt_count + 1}
                                            </h3>
                                            <span className="text-[11px] font-bold text-amber-700 bg-white border border-amber-200 px-2 py-0.5 rounded-lg">
                                                Repairs Submitted
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-amber-800 font-medium">
                                            The operator has reported defect repairs complete and requested on-site re-testing.
                                        </p>
                                        {appData.previous_rejection_reason && (
                                            <div className="mt-2.5 rounded-xl border border-amber-200/80 bg-white/80 p-3 text-xs text-amber-950 font-medium">
                                                <span className="font-bold text-amber-900 block mb-0.5">Previous Defect Notes:</span>
                                                "{appData.previous_rejection_reason}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Inspection Checklist Card */}
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <ShieldCheck size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">
                                            Roadworthiness Inspection Checklist
                                        </h2>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Physical safety, mechanical parts, and passenger security requirements
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg w-fit">
                                    {PHYSICAL_INSPECTION_ITEMS.length} Items to Inspect
                                </span>
                            </div>

                            <div className="p-4 sm:p-5 space-y-4">
                                {/* Inspection Items Table */}
                                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th scope="col" className="py-3 px-4 w-5/12">Component</th>
                                                <th scope="col" className="py-3 px-4 w-7/12">Official Requirement</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {PHYSICAL_INSPECTION_ITEMS.map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 px-4 align-top">
                                                        <div className="flex items-start gap-2">
                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10.5px] font-bold text-slate-700 mt-0.5">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="font-bold text-slate-900 leading-snug">
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 leading-relaxed align-top font-medium">
                                                        {item.requirement}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Decision Section */}
                                <div className="border-t border-slate-100 pt-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Inspection Finding
                                            </h3>
                                            <p className="text-xs text-slate-600 mt-0.5 font-medium">
                                                Confirm if unit meets all municipal road safety standards.
                                            </p>
                                        </div>
                                    </div>

                                    {decisionMode !== 'reject' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <button
                                                type="button"
                                                disabled={isProcessing}
                                                onClick={handleStartReject}
                                                className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 py-3 px-4 text-xs sm:text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                <XCircle size={16} strokeWidth={2.2} />
                                                <span>Reject</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isProcessing}
                                                onClick={handleApprove}
                                                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3 px-4 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} strokeWidth={2.2} />}
                                                <span>Approve</span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Rejection / Defect Notes Form */
                                        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5 space-y-3.5">
                                            <div className="flex items-start justify-between gap-2 border-b border-rose-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                                                    <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                                                        Defect Repair Instructions
                                                    </h4>
                                                </div>
                                                <span className="text-[10.5px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                                    Required
                                                </span>
                                            </div>

                                            {/* Quick preset chips */}
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
                                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900 transition-colors cursor-pointer text-left"
                                                        >
                                                            + {preset}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Defect details textarea */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-900 mb-1">
                                                    Specific Instructions for Operator <span className="text-rose-600">*</span>
                                                </label>
                                                <Textarea
                                                    rows={3}
                                                    placeholder="Specify the exact defects or parts requiring repair before re-inspection…"
                                                    value={rejectionReason}
                                                    onChange={(e) => {
                                                        setRejectionReason(e.target.value);
                                                        if (rejectionError) setRejectionError(null);
                                                    }}
                                                    className={`w-full text-xs sm:text-sm ${rejectionError ? 'border-rose-500 ring-rose-200' : ''}`}
                                                    autoFocus
                                                />
                                                {rejectionError && (
                                                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600">
                                                        <AlertCircle size={13} className="shrink-0" />
                                                        <span>{rejectionError}</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* Form action buttons */}
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-100">
                                                <button
                                                    type="button"
                                                    disabled={isProcessing}
                                                    onClick={handleCancelReject}
                                                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isProcessing}
                                                    onClick={handleConfirmReject}
                                                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-4 py-2 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                    <span>Reject</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── RIGHT COLUMN: APPLICANT & VEHICLE SPECS (5 cols) ── */}
                    <div className="space-y-5 lg:col-span-5 lg:sticky lg:top-6 self-start">

                        {/* Box 1: Applicant & Driver Details */}
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <Bike size={16} strokeWidth={2.2} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Applicant &amp; Driver
                                    </h3>
                                </div>
                            </div>

                            {/* Owner Summary */}
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-xs font-black text-white shadow-2xs">
                                    {operatorInitials}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs sm:text-sm font-bold text-slate-900">{appData.operator || 'N/A'}</p>
                                    <p className="truncate text-xs text-slate-500 font-medium">Tricycle Owner (Applicant)</p>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                        <CalendarDays size={13} className="shrink-0" />
                                        Birthday
                                    </span>
                                    <span className="font-bold text-slate-800">{appData.owner?.birthday || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                        <Smartphone size={13} className="shrink-0" />
                                        Contact
                                    </span>
                                    <span className="font-bold text-slate-800">{appData.contact || 'No phone provided'}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                        <MapPin size={13} className="shrink-0" />
                                        Barangay
                                    </span>
                                    <span className="font-bold text-slate-800 truncate max-w-[180px] text-right">{appData.barangay || '—'}</span>
                                </div>
                            </div>

                            {/* Driver Information */}
                            <div className="mt-3.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-700">Tricycle Driver</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${appData.ownerIsDriver ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {appData.ownerIsDriver ? 'Same as Owner' : 'Designated Driver'}
                                    </span>
                                </div>
                                {appData.ownerIsDriver ? (
                                    <p className="mt-2 text-xs text-slate-600 font-medium">
                                        The Tricycle Owner drives their own unit — no separate driver assigned.
                                    </p>
                                ) : appData.tricycleDriver ? (
                                    <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-400">Driver Name</span>
                                            <span className="font-bold text-slate-800">{appData.tricycleDriver.full_name || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-400">Birthday</span>
                                            <span className="font-bold text-slate-800">{appData.tricycleDriver.birthday || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-400">Mobile Number</span>
                                            <span className="font-bold text-slate-800">{appData.tricycleDriver.contact_number || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-400">Barangay</span>
                                            <span className="font-bold text-slate-800">{appData.tricycleDriver.barangay || '—'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-xs text-slate-500 font-medium">No designated driver recorded.</p>
                                )}
                            </div>
                        </div>

                        {/* Box 2: Vehicle Registration Specifications */}
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <FileText size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 leading-snug">Unit Registration</h3>
                                        <p className="text-[11px] text-slate-500 font-medium">Declared Specifications</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Specifications */}
                            <div className="space-y-2.5 text-xs">
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Vehicle Attributes
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">LTO Plate Number</span>
                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                        {vehicleData.plate}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Make &amp; Model</span>
                                    <span className="font-bold text-slate-800 text-right truncate max-w-[170px]">
                                        {vehicleData.make}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Year Model</span>
                                    <span className="font-bold text-slate-800">
                                        {vehicleData.year_model}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Body Color</span>
                                    <span className="font-bold text-slate-800">
                                        {vehicleData.body_color}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Body Type</span>
                                    <span className="font-bold text-slate-800">
                                        {vehicleData.body_type}
                                    </span>
                                </div>
                            </div>

                            {/* LTO Official Numbers with one-click copy buttons */}
                            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5 text-xs">
                                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    LTO Official Identifiers
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Engine Number</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-slate-800 font-bold text-xs">
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
                                        <span className="font-mono text-slate-800 font-bold text-xs">
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
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-slate-800 font-bold text-xs">
                                            {vehicleData.or_number}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy('or', vehicleData.or_number)}
                                            title="Copy OR Number"
                                            className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                        >
                                            {copiedField === 'or' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">LTO CR Number</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-slate-800 font-bold text-xs">
                                            {vehicleData.cr_number}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy('cr', vehicleData.cr_number)}
                                            title="Copy CR Number"
                                            className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                        >
                                            {copiedField === 'cr' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. MOBILE STICKY BOTTOM ACTION BAR (Touch access for field tests)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 sm:p-4 shadow-xl">
                    <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Finding</p>
                            <p className="text-xs font-black text-slate-900">
                                {decisionMode === 'reject' ? 'Repair Notes' : 'Ready to Decide'}
                            </p>
                        </div>

                        {decisionMode !== 'reject' ? (
                            <div className="flex items-center gap-2 flex-1 max-w-[240px]">
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handleStartReject}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 py-2.5 px-3 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <XCircle size={14} />
                                    <span>Reject</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handleApprove}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 text-white py-2.5 px-3 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    <span>Approve</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1 max-w-[240px]">
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handleCancelReject}
                                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 py-2.5 px-3 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={handleConfirmReject}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 text-white py-2.5 px-3 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                    <span>Reject</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}
