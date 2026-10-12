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
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group font-['Plus_Jakarta_Sans',sans-serif]"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
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
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                        Recorded in Nasugbu on {record.date} at {record.time}
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-2xs font-['Plus_Jakarta_Sans',sans-serif]">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penalty Fine:</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums">
                        ₱{record.fine.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. FOUR COMPACT OVERVIEW CARDS (1 per row on mobile)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                {/* Metric 1: Violation */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-['Plus_Jakarta_Sans',sans-serif]">
                                Citation Category
                            </span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                                <ShieldAlert size={14} />
                            </div>
                        </div>
                        <p className="mt-2 text-base sm:text-lg font-black text-slate-900 truncate font-['Plus_Jakarta_Sans',sans-serif]">
                            {record.type}
                        </p>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Source:</span>
                        <span className="font-bold text-slate-800 text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">{record.source}</span>
                    </div>
                </div>

                {/* Metric 2: Color Coding Scheme */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-['Plus_Jakarta_Sans',sans-serif]">
                                Color Coding Scheme
                            </span>
                            <span
                                className="h-4 w-4 rounded-full ring-2 ring-white shadow-xs"
                                style={{ backgroundColor: record.color_hex || '#EF4444' }}
                            />
                        </div>
                        <p className="mt-2 text-base sm:text-lg font-black text-slate-900 truncate font-['Plus_Jakarta_Sans',sans-serif]">
                            {record.color_scheme || 'Standard Scheme'}
                        </p>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Sticker:</span>
                        <span className="font-bold font-mono text-slate-800 text-xs">#{record.coding_scheme_number || 'N/A'}</span>
                    </div>
                </div>

                {/* Metric 3: Detection Location */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-['Plus_Jakarta_Sans',sans-serif]">
                                Location of Infraction
                            </span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-[#182B62] border border-indigo-100">
                                <MapPin size={14} />
                            </div>
                        </div>
                        <p className="mt-2 text-base sm:text-lg font-black text-slate-900 truncate font-['Plus_Jakarta_Sans',sans-serif]" title={record.location_desc || record.toda || undefined}>
                            Nasugbu, Batangas
                        </p>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Coordinates:</span>
                        <span className="font-bold text-slate-800 text-[11px] truncate">
                            {record.lat && record.lng ? `${Number(record.lat).toFixed(4)}° N, ${Number(record.lng).toFixed(4)}° E` : 'Logged Zone'}
                        </span>
                    </div>
                </div>

                {/* Metric 4: Settlement Status */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-['Plus_Jakarta_Sans',sans-serif]">
                                Payment Clearance
                            </span>
                            <div className={`flex h-7 w-7 items-center justify-center rounded-xl border ${isSettled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                {isSettled ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            </div>
                        </div>
                        <p className={`mt-2 text-base sm:text-lg font-black truncate font-['Plus_Jakarta_Sans',sans-serif] ${isSettled ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isSettled ? 'Cleared & Settled' : 'Awaiting Payment'}
                        </p>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium text-[11px] font-['Plus_Jakarta_Sans',sans-serif]">Status:</span>
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
                                <span className="text-[11px] font-bold text-slate-400 font-mono">
                                    {Number(record.lat).toFixed(5)}° N, {Number(record.lng).toFixed(5)}° E
                                </span>
                            )}
                        </div>

                        {/* Interactive Leaflet Map */}
                        {record.lat != null && record.lng != null ? (
                            <div className="relative z-[1] h-[300px] sm:h-[360px] md:h-[400px] w-full bg-slate-100">
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
                                                <p className="m-0 text-[10px] font-semibold text-slate-500">
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
                            <div className="relative z-[1] flex h-[300px] sm:h-[360px] md:h-[400px] w-full flex-col items-center justify-center gap-2 bg-slate-50 text-center">
                                <MapPin className="text-slate-300" size={28} />
                                <p className="text-xs font-semibold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
                                    No GPS location recorded for this violation
                                </p>
                            </div>
                        )}

                        {/* Officer Citation Notes */}
                        <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                            <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-['Plus_Jakarta_Sans',sans-serif]">
                                Officer Citation Notes
                            </p>
                            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                                {record.notes}
                            </p>
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
                                <p className="text-xs text-slate-500 mt-0.5 font-medium font-['Plus_Jakarta_Sans',sans-serif]">
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
                                <span className="text-slate-400 font-medium font-['Plus_Jakarta_Sans',sans-serif]">Sticker Number</span>
                                <span className="font-mono font-bold text-slate-900">
                                    #{record.coding_scheme_number || 'N/A'}
                                </span>
                            </div>

                            {record.color_scheme && (
                                <div className="mt-2 flex items-center justify-between text-xs border-t border-slate-200/60 pt-2 font-['Plus_Jakarta_Sans',sans-serif]">
                                    <span className="text-slate-400 font-medium">Color Coding</span>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                        <span
                                            className="h-2 w-2 rounded-full ring-1 ring-black/10 shrink-0"
                                            style={{ backgroundColor: record.color_hex || '#EF4444' }}
                                        />
                                        <span>{record.color_scheme}</span>
                                        <span className="text-slate-400 font-normal">· {record.restricted_day} restricted</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Owner & Driver */}
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="space-y-3.5">
                                {/* Tricycle Owner */}
                                <div>
                                    <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                                        Tricycle Owner
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={record.owner_name || record.operator} src={record.operator_photo} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#182B62] text-xs font-black text-white shadow-2xs font-['Plus_Jakarta_Sans',sans-serif]" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                                {record.owner_name || record.operator}
                                            </p>
                                            {record.operator_contact ? (
                                                <a
                                                    href={`tel:${record.operator_contact}`}
                                                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-mono font-medium"
                                                >
                                                    <Phone size={11} className="text-slate-400" />
                                                    <span>{record.operator_contact}</span>
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium">No contact provided</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tricycle Driver */}
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                                        Designated Driver
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs ${record.owner_is_driver ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-[#182B62] text-white'}`}>
                                            {record.owner_is_driver ? <User size={15} strokeWidth={2.2} /> : getInitials(record.driver_name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                                {record.owner_is_driver
                                                    ? (record.owner_name || record.operator)
                                                    : (record.driver_name || 'No separate driver on record')}
                                            </p>
                                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif]">
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
                            <span className="text-xs font-black text-slate-900 font-mono tabular-nums">
                                ₱{record.fine.toFixed(2)}
                            </span>
                        </div>

                        <div className="mt-4">
                            {isSettled ? (
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
                                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500 mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
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
                                    <p className="text-xs font-bold text-slate-500 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Attached Photo Evidence:</p>
                                    <a href={appeal.evidence_url} target="_blank" rel="noopener noreferrer" className="block group">
                                        <img
                                            src={appeal.evidence_url}
                                            alt="Appeal evidence"
                                            className="max-h-56 w-full rounded-xl border border-slate-200 object-cover shadow-2xs transition-transform group-hover:scale-[1.01]"
                                        />
                                    </a>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3.5 py-4 text-xs text-slate-400 h-full font-['Plus_Jakarta_Sans',sans-serif]">
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
                                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
                                >
                                    <ThumbsUp size={14} strokeWidth={2.2} />
                                    <span>Approve Appeal</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={isSubmitting}
                                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 font-['Plus_Jakarta_Sans',sans-serif]"
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
