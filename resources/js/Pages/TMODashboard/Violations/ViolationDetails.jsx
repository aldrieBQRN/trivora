import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, AlertCircle, Map, User, Bike, CheckCircle2,
    MessageSquareText, ThumbsUp, ThumbsDown, Clock, ImageOff, ArrowUpRight,
    Phone, ShieldAlert, Scale, ChevronLeft, FileText, Wallet, Gavel, AlertTriangle,
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
// Custom Pulsing Pin for the Violation Location
const createViolationIcon = () => {
    return L.divIcon({
        className: 'vd-custom-pin',
        html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
                <div class="animate-ping" style="position: absolute; inset: 0; border-radius: 50%; opacity: 0.35; background-color: #EF4444;"></div>
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #DC2626; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.15); z-index: 10;"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10]
    });
};

const LEAFLET_POPUP_CSS = `
.vd-popup .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,.15); padding: 0; }
.vd-popup .leaflet-popup-content { margin: 10px 14px; font-family: 'Figtree', sans-serif; }
`;

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// pages/shared components, so this page reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

function getInitials(name) {
    if (!name || name === 'N/A') return 'DR';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ViolationDetails({ violationId = 'VIO-26-0001', initialRecord = null }) {
    const record = initialRecord || {
        id: violationId,
        date: 'March 15, 2026',
        time: '08:45 AM',
        lat: 14.0725,
        lng: 120.6321,
        speed_kmh: 22.0,
        operator: 'Pedro Ramos',
        operator_contact: '0917-555-0192',
        coding_scheme_number: '0142',
        plate_no: 'AAA-1234',
        make_model: 'Kawasaki Barako II 175',
        color_scheme: 'Red',
        color_hex: '#EF4444',
        restricted_day: 'Monday',
        type: 'Color Coding',
        source: 'Mobile GPS',
        fine: 500,
        status: 'unsettled',
        notes: 'Red-coded tricycle verified operating along municipal route on restricted Monday.',
        appeal: null,
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Background refresh of this violation record — an appeal decision or settlement made in the
    // TMO panel elsewhere appears here without a manual reload. Paused while an action on this
    // record is being submitted; the appeal sheet is driven by `record`, and any appeal text the
    // officer has typed lives in local state this hook never touches.
    useBackgroundRefresh(['violationId', 'initialRecord'], { paused: isSubmitting });
    const appeal = record.appeal;
    const isSettled = record.status === 'settled';
    const isAppealed = appeal && appeal.status === 'under_review';

    // Plain confirmation only — no receipt/OR details are captured here. The cashier's
    // official receipt stays a physical, offline record; this just marks the fine settled.
    const handleConfirmPayment = () => {
        Swal.fire({
            title: 'Confirm Payment',
            text: 'Confirm that this violation has been paid?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#64748B',
        }).then((result) => {
            if (!result.isConfirmed) return;

            setIsSubmitting(true);
            router.post(`/tmo/violations/${record.db_id}/confirm-payment`, {}, {
                preserveScroll: true,
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => {
                    Swal.fire({
                        title: 'Payment Confirmed',
                        text: 'This violation has been marked as Settled.',
                        icon: 'success',
                        confirmButtonColor: '#059669',
                        timer: 2200,
                        showConfirmButton: false,
                    });
                },
            });
        });
    };

    const handleApprove = () => {
        Swal.fire({
            title: 'Approve this appeal?',
            text: 'The violation will be marked as Resolved and the fine will be cleared.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Approve Appeal',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#64748B',
        }).then((result) => {
            if (!result.isConfirmed) return;
            setIsSubmitting(true);
            router.post(`/tmo/appeals/${appeal.id}/approve`, {}, {
                onFinish: () => setIsSubmitting(false),
            });
        });
    };

    const handleReject = () => {
        Swal.fire({
            title: 'Reject this appeal?',
            input: 'textarea',
            inputLabel: 'Reason for rejection (shown to the driver):',
            inputPlaceholder: 'e.g. GPS records confirm vehicle was operating outside assigned route...',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Please provide a reason so the driver knows why the appeal was rejected.';
                }
            },
            showCancelButton: true,
            confirmButtonText: 'Reject Appeal',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#64748B',
        }).then((result) => {
            if (!result.isConfirmed) return;
            setIsSubmitting(true);
            router.post(`/tmo/appeals/${appeal.id}/reject`, { review_notes: result.value.trim() }, {
                onFinish: () => setIsSubmitting(false),
            });
        });
    };

    const handleConfirmEnforcement = () => {
        const isThird = record.offense_number === 3;
        const actionTitle = isThird
            ? 'Confirm 3rd Offense Enforcement'
            : `Confirm ${record.offense_label || '4th Offense'} Revocation`;
        const actionDesc = isThird
            ? 'This action confirms the ₱2,500 fine, mandates tricycle impoundment, and transitions the franchise to Suspended.'
            : 'This action confirms permanent franchise cancellation (Revoked) under the municipal traffic ordinance.';

        Swal.fire({
            title: actionTitle,
            html: `
                <div class="text-left text-xs text-slate-600 space-y-2.5 mt-2">
                    <p class="font-medium text-slate-700">${actionDesc}</p>
                    <div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900">
                        <strong class="font-bold text-amber-950 block mb-1">Mandatory Ordinance Requirements:</strong>
                        <ul class="list-disc list-inside space-y-1 font-medium">
                            ${isThird
                                ? '<li>₱2,500 Municipal Fine Penalty</li><li>Physical Tricycle Unit Impoundment</li><li>Franchise Permit Suspended (Drivers forced Offline)</li>'
                                : '<li>Permanent Franchise Cancellation (Status: Revoked)</li><li>Drivers forced Offline</li><li>No fine amount assessed for 4th offense</li>'
                            }
                        </ul>
                    </div>
                </div>
            `,
            input: 'textarea',
            inputLabel: 'Officer remarks / impoundment notes (optional):',
            inputPlaceholder: 'e.g. Unit impounded at Municipal Compound, Memo #2026-081...',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: isThird ? 'Confirm Impoundment & Suspension' : 'Confirm Franchise Revocation',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#64748B',
        }).then((result) => {
            if (!result.isConfirmed) return;

            setIsSubmitting(true);
            router.post(`/tmo/violations/${record.db_id}/confirm-enforcement`, {
                notes: result.value ? result.value.trim() : '',
            }, {
                preserveScroll: true,
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => {
                    Swal.fire({
                        title: 'Enforcement Action Confirmed',
                        text: isThird
                            ? 'Franchise suspended and tricycle unit flagged for impoundment.'
                            : 'Franchise has been permanently revoked and cancelled.',
                        icon: 'success',
                        confirmButtonColor: '#059669',
                    });
                },
            });
        });
    };

    return (
        <TrivoraLayout title="Violation Record" role="TMO Officer">
            <Head title={`Citation ${record.id} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: LEAFLET_POPUP_CSS }} />

            {/* ══════════════════════════════════════════════════════════════
                1. TOP ACTION & NAVIGATION BAR
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 flex items-center print:hidden border-b border-slate-200/80 pb-4">
                <Link
                    href="/violations"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors group font-['Plus_Jakarta_Sans',sans-serif]"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                    <span>Back to Violation Records</span>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. HEADER BANNER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            {record.id}
                        </h1>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-black tracking-wider">
                            {record.plate_no || 'NO PLATE'}
                        </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                        Recorded in Nasugbu on {record.date} at {record.time}
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm font-['Plus_Jakarta_Sans',sans-serif]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Penalty &amp; Offense:</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] tabular-nums">
                        {record.penalty_display || (record.fine ? `₱${Number(record.fine).toFixed(2)}` : 'N/A')}
                    </span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. FOUR COMPACT OVERVIEW CARDS (1 per row on mobile)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                {/* Metric 1: Violation */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                                Citation Category
                            </span>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                                <ShieldAlert size={14} />
                            </div>
                        </div>
                        <p className="mt-2 text-[13.5px] sm:text-lg leading-snug font-black text-slate-900 max-sm:line-clamp-2 max-sm:break-words sm:truncate font-['Plus_Jakarta_Sans',sans-serif]">
                            {record.type}
                        </p>
                    </div>
                    <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 text-xs">
                        <span className="text-slate-600 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Source:</span>
                        <span className="font-bold text-slate-800 text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">{record.source}</span>
                    </div>
                </div>

                {/* Metric 2: Color Coding Scheme */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                                Color Coding Scheme
                            </span>
                            <span
                                className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                                style={{ backgroundColor: record.color_hex || '#EF4444' }}
                            />
                        </div>
                        <p className="mt-2 text-[13.5px] sm:text-lg leading-snug font-black text-slate-900 max-sm:line-clamp-2 max-sm:break-words sm:truncate font-['Plus_Jakarta_Sans',sans-serif]">
                            {record.color_scheme || 'Standard Scheme'}
                        </p>
                    </div>
                    <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 text-xs">
                        <span className="text-slate-600 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Sticker:</span>
                        <span className="font-bold font-mono text-slate-800 text-xs">#{record.coding_scheme_number || 'N/A'}</span>
                    </div>
                </div>

                {/* Metric 3: Detection Location */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                                Location of Infraction
                            </span>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#182B62] border border-indigo-100">
                                <MapPin size={14} />
                            </div>
                        </div>
                        <p className="mt-2 text-[13.5px] sm:text-lg leading-snug font-black text-slate-900 max-sm:line-clamp-2 max-sm:break-words sm:truncate font-['Plus_Jakarta_Sans',sans-serif]" title={record.location_desc || record.toda || undefined}>
                            Nasugbu, Batangas
                        </p>
                    </div>
                    <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 text-xs font-mono">
                        <span className="text-slate-600 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Coordinates:</span>
                        <span className="font-bold text-slate-800 text-[11px] max-w-full truncate max-sm:whitespace-normal max-sm:break-words">
                            {record.lat && record.lng ? `${Number(record.lat).toFixed(4)}° N, ${Number(record.lng).toFixed(4)}° E` : 'Logged Zone'}
                        </span>
                    </div>
                </div>

                {/* Metric 4: Settlement Status */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                                Payment Clearance
                            </span>
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${isSettled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                {isSettled ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            </div>
                        </div>
                        <p className={`mt-2 text-[13.5px] sm:text-lg leading-snug font-black max-sm:line-clamp-2 max-sm:break-words sm:truncate font-['Plus_Jakarta_Sans',sans-serif] ${isSettled ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isSettled ? 'Cleared & Settled' : 'Awaiting Payment'}
                        </p>
                    </div>
                    <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 text-xs">
                        <span className="text-slate-600 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Status:</span>
                        <span className={`font-bold text-[11px] font-['Plus_Jakarta_Sans',sans-serif] ${isSettled ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isSettled ? (record.paid_at || 'Paid') : 'Due at Cashier'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. MAIN 2-COLUMN LAYOUT
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

                {/* ── LEFT COLUMN: GPS MAP & EVIDENCE (7 cols) ── */}
                <div className="flex flex-col gap-6 lg:col-span-7">
                    <div className={`flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <Map size={15} strokeWidth={2.2} />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                    GPS Location Verification
                                </h2>
                            </div>
                            {record.lat != null && record.lng != null && (
                                <span className="text-[11px] font-bold text-slate-500 font-mono">
                                    {Number(record.lat).toFixed(5)}° N, {Number(record.lng).toFixed(5)}° E
                                </span>
                            )}
                        </div>

                        {/* Interactive Leaflet Map */}
                        {record.lat != null && record.lng != null ? (
                            <div className="relative z-[1] h-[280px] sm:h-[320px] md:h-[340px] w-full bg-slate-100">
                                <MapContainer
                                    center={[record.lat, record.lng]}
                                    zoom={16}
                                    zoomControl={false}
                                    scrollWheelZoom={true}
                                    style={{ height: '100%', width: '100%', backgroundColor: '#E5E7EB', zIndex: 1 }}
                                >
                                    <TileLayer
                                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                        attribution="&copy; Google Maps"
                                    />

                                    <Marker position={[record.lat, record.lng]} icon={createViolationIcon()}>
                                        <Popup className="vd-popup">
                                            <div className="py-0.5">
                                                <p className="m-0 text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                                    {record.id}
                                                </p>
                                                <p className="m-0 text-[10px] font-semibold text-slate-600">
                                                    {record.type} · {record.time}
                                                </p>
                                            </div>
                                        </Popup>
                                    </Marker>

                                    <ZoomControl position="bottomright" />
                                </MapContainer>

                                {/* Floating Location Overlay */}
                                <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 text-xs font-bold text-white shadow-md font-['Plus_Jakarta_Sans',sans-serif]">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Location recorded</span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-[1] flex h-[280px] sm:h-[320px] md:h-[340px] w-full flex-col items-center justify-center gap-2 bg-slate-50 text-center">
                                <MapPin className="text-slate-400" size={28} />
                                <p className="text-xs font-semibold text-slate-600 font-['Plus_Jakarta_Sans',sans-serif]">
                                    No GPS location recorded for this violation
                                </p>
                            </div>
                        )}

                        {/* Officer Citation Notes */}
                        <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                            <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                                Officer Citation Notes
                            </p>
                            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                                {record.notes}
                            </p>
                        </div>
                    </div>

                    {/* Municipal Ordinance Enforcement Card */}
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                        <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                                    record.enforcement_status === 'action_required'
                                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                                        : record.enforcement_status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : record.enforcement_status === 'pending_confirmation'
                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                        : 'bg-indigo-50 text-[#182B62] border-indigo-100'
                                }`}>
                                    <Gavel size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                        Ordinance Enforcement
                                    </h3>
                                    <span className="block text-[11px] leading-snug text-slate-500 font-medium">
                                        {record.offense_label || '1st Offense'} · {record.sanctions_summary || 'Fine penalty'}
                                    </span>
                                </div>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-xs font-bold border sm:self-auto font-['Plus_Jakarta_Sans',sans-serif] ${
                                record.enforcement_status === 'action_required'
                                    ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-sm'
                                    : record.enforcement_status === 'completed'
                                    ? 'border-emerald-200/90 bg-emerald-50 text-emerald-700 shadow-sm'
                                    : record.enforcement_status === 'pending_confirmation'
                                    ? 'border-amber-200/90 bg-amber-50 text-amber-800 shadow-sm'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}>
                                {record.enforcement_status === 'action_required' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
                                {record.enforcement_status === 'completed' && <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />}
                                {record.enforcement_status === 'pending_confirmation' && <Clock size={11} className="text-amber-600 shrink-0" />}
                                <span>{record.enforcement_label || 'No Action Required'}</span>
                            </span>
                        </div>

                        <div className="mt-4">
                            {/* State A: Action Completed */}
                            {record.enforcement_status === 'completed' && (
                                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 sm:p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <div className="flex items-start gap-1.5 leading-snug font-bold text-emerald-900">
                                        <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-600" />
                                        <span>Enforcement Action Completed</span>
                                    </div>
                                    <div className="mt-2 space-y-1.5 text-emerald-800">
                                        <p className="font-semibold">
                                            Action: <span className="font-black text-slate-900">{record.offense_number === 3 ? 'Tricycle Impoundment & Franchise Suspension' : 'Franchise Cancellation (Revoked)'}</span>
                                        </p>
                                        <p>
                                            Current Franchise Status: <span className="font-bold text-slate-900 uppercase">{record.franchise_status || 'SUSPENDED'}</span>
                                        </p>
                                        {record.enforcement?.confirmed_by && (
                                            <p className="text-[11px] text-emerald-700">
                                                Confirmed by: <strong className="text-slate-900">{record.enforcement.confirmed_by}</strong> on {record.enforcement.confirmed_at}
                                            </p>
                                        )}
                                        {record.enforcement?.notes && (
                                            <p className="mt-1 border-t border-emerald-200/60 pt-1.5 text-[11px] italic text-slate-600">
                                                "{record.enforcement.notes}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* State B: Third Offense Action Required */}
                            {record.enforcement_status === 'action_required' && record.offense_number === 3 && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 sm:p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <div className="flex items-start gap-1.5 leading-snug font-bold text-rose-900">
                                        <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                                        <span>3rd Offense Mandatory Enforcement Required</span>
                                    </div>
                                    <p className="mt-1 text-rose-800 leading-relaxed font-medium">
                                        Under municipal ordinance, a 3rd confirmed color-coding violation requires official impoundment and franchise suspension:
                                    </p>
                                    <div className="mt-2.5 rounded-lg bg-white/80 border border-rose-200/80 p-2.5 space-y-1 text-[11.5px] text-slate-800">
                                        <div className="flex items-start gap-1.5 leading-snug font-bold text-rose-900">
                                            <span>1. ₱2,500 Fine Penalty</span>
                                        </div>
                                        <div className="flex items-start gap-1.5 leading-snug font-bold text-rose-900">
                                            <span>2. Physical Tricycle Impoundment</span>
                                        </div>
                                        <div className="flex items-start gap-1.5 leading-snug font-bold text-rose-900">
                                            <span>3. Franchise Suspension (Assigned driver forced Offline)</span>
                                        </div>
                                    </div>

                                    {isAppealed ? (
                                        <p className="mt-3 flex items-start gap-1.5 border-t border-rose-200/70 pt-2.5 leading-snug font-bold text-amber-800">
                                            <Scale size={13} className="mt-px shrink-0" /> Driver appeal pending. Decide appeal before confirming enforcement.
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleConfirmEnforcement}
                                            disabled={isSubmitting}
                                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                                        >
                                            <Gavel size={14} strokeWidth={2.2} />
                                            <span>Confirm Impoundment &amp; Suspension</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* State C: Fourth Offense Action Required */}
                            {record.enforcement_status === 'action_required' && record.offense_number >= 4 && (
                                <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-3 sm:p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <div className="flex items-start gap-1.5 leading-snug font-bold text-rose-950">
                                        <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                                        <span>{record.offense_label || '4th Offense'} Franchise Cancellation Required</span>
                                    </div>
                                    <p className="mt-1 text-rose-800 leading-relaxed font-medium">
                                        Under municipal ordinance, this citation incurs immediate franchise cancellation:
                                    </p>
                                    <div className="mt-2.5 rounded-lg bg-white/80 border border-rose-200/80 p-2.5 space-y-1 text-[11.5px] text-slate-800">
                                        <div className="flex items-start gap-1.5 leading-snug font-bold text-rose-900">
                                            <span>1. Franchise Status transition to 'Revoked' (Terminal)</span>
                                        </div>
                                        <div className="flex items-start gap-1.5 leading-snug font-bold text-rose-900">
                                            <span>2. Drivers forced permanently Offline</span>
                                        </div>
                                        <div className="flex items-start gap-1.5 leading-snug font-bold text-slate-600">
                                            <span>3. No fine amount assessed under 4th offense ordinance policy</span>
                                        </div>
                                    </div>

                                    {isAppealed ? (
                                        <p className="mt-3 flex items-start gap-1.5 border-t border-rose-200/70 pt-2.5 leading-snug font-bold text-amber-800">
                                            <Scale size={13} className="mt-px shrink-0" /> Driver appeal pending. Decide appeal before confirming revocation.
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleConfirmEnforcement}
                                            disabled={isSubmitting}
                                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                                        >
                                            <Gavel size={14} strokeWidth={2.2} />
                                            <span>Confirm Franchise Revocation</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* State D: Pending Confirmation (Appeal under review) */}
                            {record.enforcement_status === 'pending_confirmation' && (
                                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 sm:p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <div className="flex items-start gap-1.5 leading-snug font-bold text-amber-900">
                                        <Clock size={14} className="mt-px shrink-0 text-amber-600" />
                                        <span>Enforcement Pending Appeal Determination</span>
                                    </div>
                                    <p className="mt-1 text-amber-800 leading-relaxed font-medium">
                                        The designated driver has contested this citation. Administrative enforcement actions are held in abeyance pending official TMO review.
                                    </p>
                                </div>
                            )}

                            {/* State E: No Action Required (Offenses 1 & 2 or dismissed) */}
                            {record.enforcement_status === 'no_action_required' && (
                                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <p className="font-semibold text-slate-800">
                                        {record.offense_number === 1 && '1st Offense · ₱500 Municipal Fine Penalty'}
                                        {record.offense_number === 2 && '2nd Offense · ₱1,000 Municipal Fine Penalty'}
                                        {record.offense_number > 2 && 'Citation Exonerated or Dismissed'}
                                    </p>
                                    <p className="mt-1 text-slate-600 leading-relaxed">
                                        Administrative sanctions (tricycle impoundment and franchise suspension) take effect upon the 3rd confirmed offense under municipal ordinance.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN: VEHICLE, DRIVER & PAYMENT (5 cols) ── */}
                <div className="flex flex-col gap-6 lg:col-span-5">

                    {/* Registered Tricycle & Driver Card */}
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <Bike size={16} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                    Tricycle &amp; Driver
                                </h3>
                            </div>
                            {record.tricycle_id && (
                                <Link
                                    href={route('tricycle.details', record.tricycle_id)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#182B62] hover:text-[#25449B] font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <span>View Profile</span>
                                    <ArrowUpRight size={12} strokeWidth={2.5} />
                                </Link>
                            )}
                        </div>

                        {/* Tricycle Unit Plate & Specs */}
                        <div className="mt-4 flex items-center justify-between">
                            <div>
                                <span className="font-mono text-base font-black text-slate-900">
                                    {record.plate_no}
                                </span>
                                <p className="text-xs text-slate-600 mt-0.5 font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                                    {record.make_model}
                                </p>
                            </div>
                            <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 font-['Plus_Jakarta_Sans',sans-serif]">
                                Registered Unit
                            </span>
                        </div>

                        {/* Sticker Number & Coding Scheme */}
                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium font-['Plus_Jakarta_Sans',sans-serif]">Sticker Number</span>
                                <span className="font-mono font-bold text-slate-900">
                                    #{record.coding_scheme_number || 'N/A'}
                                </span>
                            </div>

                            {record.color_scheme && (
                                <div className="mt-2 flex items-center justify-between text-xs border-t border-slate-200/60 pt-2 font-['Plus_Jakarta_Sans',sans-serif]">
                                    <span className="text-slate-500 font-medium">Color Coding</span>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                        <span
                                            className="h-2 w-2 rounded-full ring-1 ring-black/10 shrink-0"
                                            style={{ backgroundColor: record.color_hex || '#EF4444' }}
                                        />
                                        <span>{record.color_scheme}</span>
                                        <span className="text-slate-500 font-normal">· {record.restricted_day} restricted</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Owner & Driver */}
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="space-y-3.5">
                                {/* Tricycle Owner */}
                                <div>
                                    <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                                        Tricycle Owner
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={record.owner_name || record.operator} src={record.operator_photo} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#182B62] text-xs font-black text-white shadow-sm font-['Plus_Jakarta_Sans',sans-serif]" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                                {record.owner_name || record.operator}
                                            </p>
                                            {record.operator_contact ? (
                                                <a
                                                    href={`tel:${record.operator_contact}`}
                                                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-mono font-medium"
                                                >
                                                    <Phone size={11} className="text-slate-500" />
                                                    <span>{record.operator_contact}</span>
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-500 font-medium">No contact provided</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tricycle Driver */}
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                                        Designated Driver
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm ${record.owner_is_driver ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-[#182B62] text-white'}`}>
                                            {record.owner_is_driver ? <User size={15} strokeWidth={2.2} /> : getInitials(record.driver_name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                                {record.owner_is_driver
                                                    ? (record.owner_name || record.operator)
                                                    : (record.driver_name || 'No separate driver on record')}
                                            </p>
                                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 font-['Plus_Jakarta_Sans',sans-serif]">
                                                {record.owner_is_driver
                                                    ? 'Owner personally drives this unit'
                                                    : 'Assigned Driver'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settlement & Payment Card */}
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <FileText size={16} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                    Payment &amp; Clearance
                                </h3>
                            </div>
                            <span className="text-xs font-black text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                {record.offense_number >= 4 ? 'No Fine' : `₱${Number(record.fine || 0).toFixed(2)}`}
                            </span>
                        </div>

                        <div className="mt-4">
                            {record.offense_number >= 4 ? (
                                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <p className="font-bold text-slate-800">Franchise Cancellation Case</p>
                                    <p className="mt-1 text-slate-600 leading-relaxed">
                                        Under the municipal traffic ordinance, 4th offense sanctions are immediate franchise revocation rather than monetary fine collection.
                                    </p>
                                </div>
                            ) : isSettled ? (
                                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span>Fine Settled &amp; Cleared</span>
                                    </div>
                                    <p className="mt-1 text-emerald-700 leading-relaxed font-medium">
                                        Payment confirmed on {record.paid_at || record.date}. This violation is resolved and does not hold any franchise restrictions.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                                        <AlertCircle size={14} className="text-amber-600" />
                                        <span>Payment Due at Municipal Cashier</span>
                                    </div>
                                    <p className="mt-1 text-amber-700 leading-relaxed font-medium">
                                        Please settle this penalty at the Municipal Treasury Cashier before the next quarterly MTOP franchise verification.
                                    </p>
                                    {isAppealed ? (
                                        <p className="mt-3 flex items-center gap-1.5 border-t border-amber-200/70 pt-3 font-bold text-amber-800">
                                            <Scale size={13} /> Resolve the pending appeal before confirming payment.
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleConfirmPayment}
                                            disabled={isSubmitting}
                                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                                        >
                                            <Wallet size={14} strokeWidth={2.2} />
                                            <span>Confirm Official Payment</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>


                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                5. DRIVER APPEAL REVIEW
               ══════════════════════════════════════════════════════════════ */}
            {appeal && (
                <div className={`mt-6 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                <MessageSquareText size={16} strokeWidth={2.2} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                Driver Appeal Review
                            </h3>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border font-['Plus_Jakarta_Sans',sans-serif] ${
                            appeal.status === 'under_review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : appeal.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                            {appeal.status === 'under_review' ? 'Pending Review' : appeal.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                    </div>

                    <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600 mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
                            <span>Submitted by: <strong className="text-slate-800">{appeal.driver_name}</strong></span>
                            <span>{appeal.submitted_at}</span>
                        </div>

                        {/* Statement & evidence */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed italic h-full font-['Plus_Jakarta_Sans',sans-serif]">
                                "{appeal.reason}"
                            </div>

                            {appeal.evidence_url ? (
                                <div>
                                    <p className="text-xs font-bold text-slate-600 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Attached Photo Evidence:</p>
                                    <a href={appeal.evidence_url} target="_blank" rel="noopener noreferrer" className="block group">
                                        <img
                                            src={appeal.evidence_url}
                                            alt="Appeal evidence"
                                            className="max-h-56 w-full rounded-xl border border-slate-200 object-cover shadow-sm transition-transform group-hover:scale-[1.01]"
                                        />
                                    </a>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3.5 py-4 text-xs text-slate-500 h-full font-['Plus_Jakarta_Sans',sans-serif]">
                                    <ImageOff size={13} />
                                    <span>No supporting image was attached with this appeal.</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {appeal.status === 'under_review' ? (
                            <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={isSubmitting}
                                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <ThumbsUp size={14} strokeWidth={2.2} />
                                    <span>Approve Appeal</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={isSubmitting}
                                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <ThumbsDown size={14} strokeWidth={2.2} />
                                    <span>Reject Appeal</span>
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-600 font-['Plus_Jakarta_Sans',sans-serif]">
                                <p className="font-semibold">
                                    Reviewed by: {appeal.reviewer_name || 'TMO Review Officer'} on {appeal.reviewed_at}
                                </p>
                                {appeal.review_notes && (
                                    <p className="mt-1 text-slate-600 italic">"{appeal.review_notes}"</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </TrivoraLayout>
    );
}
