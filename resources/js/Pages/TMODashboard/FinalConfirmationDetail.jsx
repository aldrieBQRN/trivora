import React, { useState, useMemo } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    ShieldCheck, CheckCircle2, Smartphone, Cpu, CheckSquare, Square,
    Bike, Check, ChevronLeft, Phone, CalendarDays, MapPin, Copy,
    Loader2, FileText,
} from 'lucide-react';
import { Textarea, Label } from '@/Components/TMO';

import Avatar from '@/Components/Avatar';
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

// Reflects only what the backend has actually received (Tricycle::gpsStatus())
function GpsStatusBadge({ status, lastSeenAt }) {
    if (status === 'connected') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                Connected{lastSeenAt ? ` · last signal ${lastSeenAt}` : ''}
            </span>
        );
    }
    if (status === 'stale') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                Signal lost{lastSeenAt ? ` · last seen ${lastSeenAt}` : ''}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            Awaiting first signal
        </span>
    );
}

export default function FinalConfirmationDetail({ application }) {
    const isAlreadyCompleted = application.status === 'completed';
    const [copiedField, setCopiedField] = useState(null);

    const vehicleData = useMemo(() => ({
        plate: application.plate_number || application.plate || '—',
        make: application.make_model || application.make || '—',
        year_model: application.year_model && application.year_model !== '—' ? application.year_model : '—',
        body_color: application.body_color && application.body_color !== '—' ? application.body_color : 'Standard',
        body_type: application.body_type && application.body_type !== '—' ? application.body_type : 'Tricycle',
        engine_number: application.engine_number && application.engine_number !== '—' ? application.engine_number : '—',
        chassis_number: application.chassis_number && application.chassis_number !== '—' ? application.chassis_number : '—',
        or_number: application.or_number && application.or_number !== '—' ? application.or_number : '—',
        cr_number: application.cr_number && application.cr_number !== '—' ? application.cr_number : '—',
    }), [application]);

    const { data, setData, post, processing } = useForm({
        signed_ticket_verified: isAlreadyCompleted,
        bplo_approval_confirmed: isAlreadyCompleted,
        sticker_possession_confirmed: isAlreadyCompleted,
        tracking_method: application.tracking_method || 'mobile_gps',
        iot_device_id: application.iot_device_id || '',
        reassign_confirmed: false,
        officer_notes: '',
    });

    // Background refresh of the record being confirmed
    useBackgroundRefresh(['application'], { paused: processing });

    const handleCopy = (field, text) => {
        if (!text || text === '—' || text === 'N/A') return;
        navigator.clipboard?.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1800);
    };

    const allChecked =
        data.signed_ticket_verified &&
        data.bplo_approval_confirmed &&
        data.sticker_possession_confirmed;

    const canSubmit = allChecked && (
        data.tracking_method === 'mobile_gps' ||
        (data.tracking_method === 'iot_device' && data.iot_device_id.trim() !== '')
    );

    const handleToggleAllChecks = () => {
        if (isAlreadyCompleted) return;
        setData({
            ...data,
            signed_ticket_verified: !allChecked,
            bplo_approval_confirmed: !allChecked,
            sticker_possession_confirmed: !allChecked,
        });
    };

    const handleSubmit = () => {
        if (!canSubmit) {
            Swal.fire({
                title: 'Checklist Incomplete',
                text: 'Please verify all confirmation checkboxes and provide the IoT Device ID if applicable.',
                icon: 'warning',
                confirmButtonColor: '#182B62'
            });
            return;
        }

        const methodText = data.tracking_method === 'iot_device'
            ? `IoT Hardware Device <b>#${data.iot_device_id}</b> (Hardware Installed)`
            : `<b>Mobile Device GPS</b> (Driver Smartphone App)`;

        Swal.fire({
            title: 'Confirm Activation?',
            html: `Mark franchise permit for <b>${application.reference}</b> as active?<br/><br/>
                   <div style="text-align: left; background: #F8FAFC; padding: 14px 16px; border-radius: 12px; font-size: 12px; line-height: 1.6; border: 1px solid #E2E8F0;">
                     Tricycle Owner: <b>${application.operator_name}</b><br/>
                     Tricycle Unit: <b>${application.make_model} (${application.plate_number})</b><br/>
                     Sticker Number: <b>#${application.coding_number} (${application.color_scheme} Scheme)</b><br/>
                     Tracking Mode: ${methodText}
                   </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#182B62',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                submitConfirmation();
            }
        });
    };

    const submitConfirmation = () => {
        post(`/tmo/final-confirmation/${application.id}`, {
            onSuccess: () => {
                Swal.fire({
                    title: 'Franchise Activated!',
                    text: 'Franchise registration complete. Unit is now active in the municipal registry.',
                    icon: 'success',
                    confirmButtonColor: '#182B62',
                    timer: 2500,
                    showConfirmButton: false,
                });
            },
            onError: (errors) => {
                if (errors.iot_device_id && errors.iot_device_id.includes('already paired')) {
                    Swal.fire({
                        title: 'Tracker Already Paired Elsewhere',
                        html: errors.iot_device_id,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#182B62',
                        cancelButtonColor: '#64748B',
                        confirmButtonText: 'Reassign',
                        cancelButtonText: 'Cancel',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            router.post(`/tmo/final-confirmation/${application.id}`, {
                                ...data,
                                reassign_confirmed: true,
                            }, {
                                onSuccess: () => {
                                    Swal.fire({
                                        title: 'Franchise Activated!',
                                        text: 'Franchise registration complete. Unit is now active in the municipal registry.',
                                        icon: 'success',
                                        confirmButtonColor: '#182B62',
                                        timer: 2500,
                                        showConfirmButton: false,
                                    });
                                },
                            });
                        }
                    });
                }
            },
        });
    };


    return (
        <TrivoraLayout title="Final Confirmation" role="TMO Officer">
            <Head title={`Final Confirmation: ${application.reference} | TRIVORA`} />

            <div className="font-['Plus_Jakarta_Sans',sans-serif] pb-24 lg:pb-8">
                {/* ══════════════════════════════════════════════════════════════
                    1. TOP NAVIGATION / BREADCRUMB
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-4">
                    <Link
                        href="/tmo/final-confirmation"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group"
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                        <span>Back to Final Confirmation Queue</span>
                    </Link>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. APPLICATION HEADER CARD
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 border-b border-slate-200/80 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-baseline gap-2 sm:gap-2.5">
                                <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                                    {application.reference}
                                </h1>
                                <span className="text-xs sm:text-sm font-semibold text-slate-500">
                                    · Final Confirmation &amp; GPS Setup
                                </span>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
                                Applicant: <strong className="font-bold text-slate-900">{application.owner?.full_name || application.operator_name}</strong>
                            </p>
                        </div>

                        <div>
                            {isAlreadyCompleted ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                                    <CheckCircle2 size={13} strokeWidth={2.5} />
                                    <span>Completed / Active</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 shadow-2xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span>Awaiting Confirmation</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. WORKSPACE GRID: Verification (Left) | Specs & Info (Right)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

                    {/* ── LEFT COLUMN: VERIFICATION WORKBENCH (7 cols) ── */}
                    <div className="space-y-6 lg:col-span-7">

                        {/* Box 1: Completed Clearances & Handouts */}
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                        <ShieldCheck size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">
                                            Clearances &amp; Receipts
                                        </h2>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Prerequisite clearances verified prior to final activation
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg w-fit">
                                    Cleared &amp; Released
                                </span>
                            </div>

                            <div className="p-4 sm:p-5 space-y-4">
                                <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                            Official Sticker &amp; Coding Plate
                                        </div>
                                        <div className="mt-1 font-mono text-2xl sm:text-3xl font-black text-emerald-950">
                                            #{application.coding_number}
                                        </div>
                                        <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                                                style={{ backgroundColor: application.color_hex || '#3B82F6' }}
                                            />
                                            <span>{application.color_scheme} Scheme</span>
                                        </div>
                                    </div>
                                    <div className="sm:text-right">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 border border-emerald-200">
                                            Released by BPLO
                                        </span>
                                        <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                                            Authorized for municipal road operation
                                        </p>
                                    </div>
                                </div>

                                {/* Step Progress Summary */}
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-500">1. Document Review</span>
                                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                                            <Check size={12} strokeWidth={2.5} /> Passed
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-500">2. Physical Roadworthiness</span>
                                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                                            <Check size={12} strokeWidth={2.5} /> Passed
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-500">3. BPLO Sticker Release</span>
                                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                                            <Check size={12} strokeWidth={2.5} /> Released
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: Verification Checklist & GPS Setup */}
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <CheckCircle2 size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">
                                            TMO Final Verification
                                        </h2>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Confirm presented clearances and assign GPS tracking
                                        </p>
                                    </div>
                                </div>

                                {!isAlreadyCompleted && (
                                    <button
                                        type="button"
                                        onClick={handleToggleAllChecks}
                                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 transition-colors cursor-pointer w-fit"
                                    >
                                        <Check size={13} strokeWidth={2.5} />
                                        <span>{allChecked ? 'Clear Checks' : 'Check All'}</span>
                                    </button>
                                )}
                            </div>

                            <div className="p-4 sm:p-5 space-y-5">
                                {/* Checklist Items */}
                                <div className="space-y-2.5">
                                    <CheckItem
                                        checked={data.signed_ticket_verified}
                                        disabled={isAlreadyCompleted}
                                        onClick={() => setData('signed_ticket_verified', !data.signed_ticket_verified)}
                                    >
                                        Driver presented the signed &amp; validated <strong>Municipal Payment Ticket</strong> from Municipal Treasury.
                                    </CheckItem>
                                    <CheckItem
                                        checked={data.bplo_approval_confirmed}
                                        disabled={isAlreadyCompleted}
                                        onClick={() => setData('bplo_approval_confirmed', !data.bplo_approval_confirmed)}
                                    >
                                        Confirmed <strong>BPLO signed off and released</strong> the Franchise Number for this unit.
                                    </CheckItem>
                                    <CheckItem
                                        checked={data.sticker_possession_confirmed}
                                        disabled={isAlreadyCompleted}
                                        onClick={() => setData('sticker_possession_confirmed', !data.sticker_possession_confirmed)}
                                    >
                                        Confirmed physical possession of <strong>Coding Plate #{application.coding_number}</strong> ({application.color_scheme} Scheme).
                                    </CheckItem>
                                </div>

                                {/* GPS Tracking Method Selection */}
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                                        Select GPS Tracking Method
                                    </label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <MethodCard
                                            icon={Cpu}
                                            iconTone="bg-amber-100 text-amber-700"
                                            title="GPS Tracker Device"
                                            badge="Hardware Installed"
                                            badgeTone="bg-amber-100 text-amber-800"
                                            description="Dedicated GPS tracker wired into the tricycle battery. Automatically updates location without needing a phone."
                                            selected={data.tracking_method === 'iot_device'}
                                            disabled={isAlreadyCompleted}
                                            onClick={() => setData('tracking_method', 'iot_device')}
                                        />
                                        <MethodCard
                                            icon={Smartphone}
                                            iconTone="bg-indigo-100 text-indigo-700"
                                            title="Driver Smartphone"
                                            badge="Driver Phone App"
                                            badgeTone="bg-indigo-100 text-indigo-800"
                                            description="The driver uses their personal smartphone and the Trivora Driver App to share live location while active."
                                            selected={data.tracking_method === 'mobile_gps'}
                                            disabled={isAlreadyCompleted}
                                            onClick={() => setData('tracking_method', 'mobile_gps')}
                                        />
                                    </div>
                                </div>

                                {/* Option Details: Hardware IoT Device */}
                                {data.tracking_method === 'iot_device' && (
                                    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-amber-950">
                                                Tracker Device ID <span className="text-rose-600">*</span>
                                            </span>
                                            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
                                                Required
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs sm:text-sm font-bold text-slate-900 outline-none transition-colors focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10"
                                            placeholder="e.g. 1011 or SinoTrack Device Serial"
                                            value={data.iot_device_id}
                                            onChange={(e) => setData('iot_device_id', e.target.value)}
                                            disabled={isAlreadyCompleted}
                                            required
                                        />
                                        {!data.iot_device_id && !isAlreadyCompleted && (
                                            <p className="text-[11px] text-amber-800 font-medium">
                                                Please input the assigned hardware identifier for this tricycle unit.
                                            </p>
                                        )}
                                        <div className="rounded-xl bg-white border border-amber-200/80 p-3 text-[11px] leading-relaxed text-amber-900">
                                            <strong>Wiring Guide:</strong> Red wire to battery (+), Black to ground (-), and Yellow to ignition key.
                                        </div>
                                    </div>
                                )}

                                {/* Option Details: Driver Smartphone App */}
                                {data.tracking_method === 'mobile_gps' && (
                                    <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                                                <Smartphone size={18} strokeWidth={2.2} />
                                            </div>
                                            <div className="flex-1 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                                        Driver Smartphone App
                                                    </span>
                                                    <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[10.5px] font-bold text-indigo-800">
                                                        Mobile GPS
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-slate-600 leading-relaxed font-medium">
                                                    The driver shares coordinates live through the Trivora Driver mobile application.
                                                </p>
                                                <div className="mt-2.5 rounded-xl border border-indigo-200/80 bg-white p-3 space-y-1">
                                                    <p className="text-[11px] text-slate-600 font-medium">
                                                        Driver login mobile: <strong className="font-mono text-slate-800">{application.contact_number}</strong>
                                                    </p>
                                                    <p className="text-[10.5px] text-slate-500">
                                                        Driver account activates automatically once this final confirmation is completed.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Officer Notes */}
                                {!isAlreadyCompleted && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <Label className="text-xs font-bold text-slate-900">
                                            Officer Remarks (Optional)
                                        </Label>
                                        <Textarea
                                            rows={2}
                                            className="mt-1.5 text-xs sm:text-sm"
                                            placeholder="Add any internal clearance notes or dispatch observations…"
                                            value={data.officer_notes}
                                            onChange={(e) => setData('officer_notes', e.target.value)}
                                        />
                                    </div>
                                )}

                                {/* Desktop Action Button (Single Word) */}
                                <div className="pt-2 border-t border-slate-100">
                                    {!isAlreadyCompleted ? (
                                        <button
                                            type="button"
                                            disabled={!canSubmit || processing}
                                            onClick={handleSubmit}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] active:bg-[#122048] text-white py-3 px-4 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <CheckCircle2 size={16} strokeWidth={2.2} />
                                            )}
                                            <span>Confirm</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                            <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                                            <div>
                                                <p className="text-xs sm:text-sm font-bold text-emerald-900">Franchise Permit is Active</p>
                                                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                                                    Tracking Mode: {application.tracking_method === 'iot_device' ? `GPS Tracker (${application.iot_device_id || 'Configured'})` : 'Driver Smartphone App'}
                                                </p>
                                                <div className="mt-2">
                                                    <GpsStatusBadge status={application.gps_status} lastSeenAt={application.gps_last_seen_at} />
                                                </div>
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
                                <Avatar name={application.owner?.full_name || application.operator_name} src={application.operator_photo} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-xs font-black text-white shadow-2xs" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                                        {application.owner?.full_name || application.operator_name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500 font-medium">Tricycle Owner (Applicant)</p>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                        <CalendarDays size={13} className="shrink-0" />
                                        Birthday
                                    </span>
                                    <span className="font-bold text-slate-800">{application.owner?.birthday || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                        <Phone size={13} className="shrink-0" />
                                        Contact
                                    </span>
                                    <span className="font-bold text-slate-800">{application.owner?.contact_number || application.contact_number || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                        <MapPin size={13} className="shrink-0" />
                                        Barangay
                                    </span>
                                    <span className="font-bold text-slate-800 truncate max-w-[180px] text-right">{application.owner?.barangay || application.barangay || '—'}</span>
                                </div>
                            </div>

                            {/* Driver Information */}
                            <div className="mt-3.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-700">Tricycle Driver</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${application.ownerIsDriver ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {application.ownerIsDriver ? 'Same as Owner' : 'Designated Driver'}
                                    </span>
                                </div>
                                {application.ownerIsDriver ? (
                                    <p className="mt-2 text-xs text-slate-600 font-medium">
                                        The Tricycle Owner drives their own unit — no separate driver assigned.
                                    </p>
                                ) : application.tricycleDriver ? (
                                    <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-400">Driver Name</span>
                                            <span className="font-bold text-slate-800">{application.tricycleDriver.full_name || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-400">Mobile</span>
                                            <span className="font-bold text-slate-800">{application.tricycleDriver.contact_number || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-400">Barangay</span>
                                            <span className="font-bold text-slate-800">{application.tricycleDriver.barangay || '—'}</span>
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
                {!isAlreadyCompleted && (
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 sm:p-4 shadow-xl">
                        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</p>
                                <p className="text-xs font-black text-slate-900">
                                    {canSubmit ? 'Ready to Activate' : 'Checklist Pending'}
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={!canSubmit || processing}
                                onClick={handleSubmit}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2.5 px-5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                            >
                                {processing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                <span>Confirm</span>
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </TrivoraLayout>
    );
}

function CheckItem({ checked, disabled, onClick, children }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`flex items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                disabled ? 'cursor-default opacity-70' : 'cursor-pointer'
            } ${checked ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}
        >
            <div className={`mt-0.5 shrink-0 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
                {checked ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2} />}
            </div>
            <div className="text-xs font-medium leading-relaxed text-slate-800">{children}</div>
        </div>
    );
}

function MethodCard({ icon: Icon, iconTone, title, badge, badgeTone, description, selected, disabled, onClick }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`rounded-2xl border-2 p-4 transition-all ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'} ${
                selected ? 'border-[#182B62] bg-slate-50/80 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
            }`}
        >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${iconTone}`}>
                <Icon size={18} strokeWidth={2.2} />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h4>
            <span className={`mt-1 mb-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeTone}`}>
                {badge}
            </span>
            <p className="text-[11px] font-medium leading-relaxed text-slate-500">{description}</p>
        </div>
    );
}
