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
    Phone, ShieldAlert, Scale, ChevronLeft, FileText, Wallet,
} from 'lucide-react';

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
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

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
        location_desc: 'Nasugbu Highway, Zone 1',
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
        notes: 'System detected Red-coded tricycle operating on a restricted Monday.',
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
    const initials = getInitials(record.owner_name || record.operator);

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

    return (
        <TrivoraLayout title="Violation Record" role="TMO Officer">
            <Head title={`Ticket ${record.id} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: LEAFLET_POPUP_CSS }} />

            {/* ══════════════════════════════════════════════════════════════
                1. TOP ACTION & NAVIGATION BAR
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 flex items-center print:hidden">
                <Link
                    href="/violations"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                    <span>Back to Violations</span>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. HEADER BANNER (Clean #1D2542 Brand Language)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        {record.id}
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                        Detected in Nasugbu on {record.date} at {record.time}
                    </p>
                </div>

                <div className="flex items-baseline gap-1 self-start sm:self-center shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-400">Fine:</span>
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                        ₱{record.fine.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. FOUR MINIMAL OVERVIEW CARDS
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Metric 1: Violation */}
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW}`}>
                    <p className="text-[11px] font-semibold text-slate-400">Violation Type</p>
                    <p className="mt-1.5 text-base sm:text-lg font-bold text-slate-900 truncate">
                        {record.type}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <ShieldAlert size={12} className="text-amber-500" />
                        <span>{record.source}</span>
                    </div>
                </div>

                {/* Metric 2: Color Coding Scheme */}
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW}`}>
                    <p className="text-[11px] font-semibold text-slate-400">Color Coding Scheme</p>
                    <p className="mt-1.5 text-base sm:text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: record.color_hex || '#EF4444' }} />
                        {record.color_scheme || 'Standard'}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <span>Sticker Number #{record.coding_scheme_number || 'N/A'}</span>
                    </div>
                </div>

                {/* Metric 3: Detection Location */}
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW}`}>
                    <p className="text-[11px] font-semibold text-slate-400">Location Area</p>
                    <p className="mt-1.5 text-base sm:text-lg font-bold text-slate-900 truncate" title={record.location_desc}>
                        {record.location_desc}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{record.lat && record.lng ? `${Number(record.lat).toFixed(4)}° N, ${Number(record.lng).toFixed(4)}° E` : (record.toda || 'Nasugbu Zone')}</span>
                    </div>
                </div>

                {/* Metric 4: Settlement Status */}
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW}`}>
                    <p className="text-[11px] font-semibold text-slate-400">Payment Status</p>
                    <p className={`mt-1.5 text-base sm:text-lg font-bold ${isSettled ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isSettled ? 'Cleared & Settled' : 'Awaiting Payment'}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock size={12} className="text-slate-400" />
                        <span>{isSettled ? (record.paid_at || 'Paid') : 'Due at Cashier'}</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. MAIN 2-COLUMN LAYOUT
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                {/* ── LEFT COLUMN: GPS MAP & APPEAL (7 cols) ── */}
                <div className="flex flex-col gap-6 lg:col-span-7">

                    {/* GPS Map Evidence Card — stretched to fill the column's full height (the
                        grid row is already as tall as the right column's two stacked cards; this
                        card just needs to grow into that space instead of sitting at its natural
                        content height with empty space left below it) so both columns align at
                        the top and bottom. The map section grows with it (flex-1, min-height kept
                        at the original size so it's never smaller/less usable than before); the
                        header and notes footer keep their natural height. */}
                    <div className={`flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Map size={15} strokeWidth={2.2} />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900">
                                    GPS Location Map
                                </h2>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400 font-mono">
                                {record.lat.toFixed(5)}° N, {record.lng.toFixed(5)}° E
                            </span>
                        </div>

                        {/* Interactive Leaflet Map */}
                        <div className="relative z-[1] min-h-[340px] sm:min-h-[380px] w-full flex-1 bg-slate-100">
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
                                            <p className="m-0 text-xs font-bold text-slate-900">
                                                {record.id}
                                            </p>
                                            <p className="m-0 text-[10px] font-semibold text-slate-500">
                                                {record.type} · {record.time}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>

                                <ZoomControl position="bottomright" />
                            </MapContainer>

                            {/* Floating Location Overlay */}
                            <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-lg bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 text-xs font-semibold text-white shadow-md">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{record.location_desc}</span>
                            </div>
                        </div>

                        {/* Detection Notes & Telematics Strip */}
                        <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Detection Notes
                            </p>
                            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                                {record.notes}
                            </p>
                        </div>
                    </div>

                </div>

                {/* ── RIGHT COLUMN: VEHICLE, DRIVER & PAYMENT (5 cols) ── */}
                <div className="flex flex-col gap-6 lg:col-span-5">

                    {/* Registered Tricycle Unit & Driver Card */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Tricycle &amp; Driver
                                </h3>
                            </div>
                            {record.tricycle_id && (
                                <Link
                                    href={route('tricycle.details', record.tricycle_id)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                                >
                                    <span>Profile</span>
                                    <ArrowUpRight size={12} strokeWidth={2.5} />
                                </Link>
                            )}
                        </div>

                        {/* Tricycle Unit Plate & Specs */}
                        <div className="mt-4 flex items-center justify-between">
                            <div>
                                <span className="font-mono text-base font-extrabold text-slate-900">
                                    {record.plate_no}
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {record.make_model}
                                </p>
                            </div>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                                Standard Unit
                            </span>
                        </div>

                        {/* Sticker Number */}
                        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Scheme Number</span>
                                <span className="font-mono font-bold text-slate-900">
                                    #{record.coding_scheme_number || 'N/A'}
                                </span>
                            </div>

                            {record.color_scheme && (
                                <div className="mt-2 flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
                                    <span className="text-slate-400">Color Coding</span>
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                        <span
                                            className="h-2 w-2 rounded-full ring-1 ring-black/10"
                                            style={{ backgroundColor: record.color_hex || '#EF4444' }}
                                        />
                                        <span>{record.color_scheme}</span>
                                        <span className="text-slate-400">· {record.restricted_day} restricted</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Owner & Driver — both people on record for this unit */}
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="space-y-3.5">
                                {/* Tricycle Owner (the operators record — primary person on the unit) */}
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                                        Tricycle Owner
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D2542] text-xs font-bold text-white shadow-2xs">
                                            {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                                                {record.owner_name || record.operator}
                                            </p>
                                            {record.operator_contact ? (
                                                <a
                                                    href={`tel:${record.operator_contact}`}
                                                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                                                >
                                                    <Phone size={11} className="text-slate-400" />
                                                    <span>{record.operator_contact}</span>
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400">No contact provided</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tricycle Driver — the actual person driving, or the owner again */}
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                                        Tricycle Driver
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs ${record.owner_is_driver ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'}`}>
                                            {record.owner_is_driver ? <User size={15} strokeWidth={2.2} /> : getInitials(record.driver_name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                                                {record.owner_is_driver
                                                    ? (record.owner_name || record.operator)
                                                    : (record.driver_name || 'No separate driver on record')}
                                            </p>
                                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                {record.owner_is_driver
                                                    ? 'Owner is also the driver'
                                                    : 'Separate from the owner'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settlement & Payment Card */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <FileText size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Payment &amp; Clearance
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                                ₱{record.fine.toFixed(2)}
                            </span>
                        </div>

                        <div className="mt-4">
                            {isSettled ? (
                                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span>Fine Settled &amp; Cleared</span>
                                    </div>
                                    <p className="mt-1 text-emerald-700 leading-relaxed">
                                        Payment confirmed on {record.paid_at || record.date}. This violation is resolved and does not hold any franchise restrictions.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                                        <AlertCircle size={14} className="text-amber-600" />
                                        <span>Payment Due at Municipal Cashier</span>
                                    </div>
                                    <p className="mt-1 text-amber-700 leading-relaxed">
                                        The driver or operator must settle this penalty at the Municipal Treasury Cashier before the next quarterly MTOP franchise verification.
                                    </p>
                                    {isAppealed ? (
                                        <p className="mt-3 flex items-center gap-1.5 border-t border-amber-200/70 pt-3 font-semibold text-amber-800">
                                            <Scale size={13} /> Resolve the pending appeal before confirming payment.
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleConfirmPayment}
                                            disabled={isSubmitting}
                                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50"
                                        >
                                            <Wallet size={14} strokeWidth={2.2} />
                                            <span>Confirm Payment</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                5. DRIVER APPEAL REVIEW — full-width row so it balances both
                   columns above instead of stretching only the left one
               ══════════════════════════════════════════════════════════════ */}
            {appeal && (
                <div className={`mt-6 overflow-hidden rounded-2xl border border-indigo-200/70 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/50 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/[0.16] to-indigo-500/[0.02] text-indigo-700">
                                <MessageSquareText size={15} strokeWidth={2.2} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Driver Appeal Review
                            </h3>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                            appeal.status === 'under_review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : appeal.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                            {appeal.status === 'under_review' ? 'Pending Review' : appeal.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                            <span>Submitted by: <strong className="text-slate-800">{appeal.driver_name}</strong></span>
                            <span>{appeal.submitted_at}</span>
                        </div>

                        {/* Statement & evidence side-by-side on wide screens */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed italic h-full">
                                "{appeal.reason}"
                            </div>

                            {appeal.evidence_url ? (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-2">Attached Photo Evidence:</p>
                                    <a href={appeal.evidence_url} target="_blank" rel="noopener noreferrer" className="block group">
                                        <img
                                            src={appeal.evidence_url}
                                            alt="Appeal evidence"
                                            className="max-h-56 w-full rounded-lg border border-slate-200 object-cover shadow-2xs transition-transform group-hover:scale-[1.01]"
                                        />
                                    </a>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-3.5 py-4 text-xs text-slate-400 h-full">
                                    <ImageOff size={13} />
                                    <span>No supporting image was attached with this appeal.</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons or Adjudication History */}
                        {appeal.status === 'under_review' ? (
                            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    <ThumbsUp size={14} strokeWidth={2.2} />
                                    <span>Approve Appeal</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    <ThumbsDown size={14} strokeWidth={2.2} />
                                    <span>Reject Appeal</span>
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-600">
                                <p className="font-semibold">
                                    Reviewed by: {appeal.reviewer_name || 'TMO Review Officer'} on {appeal.reviewed_at}
                                </p>
                                {appeal.review_notes && (
                                    <p className="mt-1 text-slate-500 italic">"{appeal.review_notes}"</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </TrivoraLayout>
    );
}
