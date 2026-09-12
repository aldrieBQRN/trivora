import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Calendar, MapPin, AlertTriangle, Map, User, Bike, Printer, CheckCircle2,
    MessageSquareText, ThumbsUp, ThumbsDown, Clock, ImageOff,
} from 'lucide-react';
import { BackLink, PageHeader, StatusBadge, Button } from '@/Components/TMO';

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

// Leaflet renders its own popup wrapper markup outside React's control, so this
// small override can't be expressed as Tailwind utility classes.
const LEAFLET_POPUP_CSS = `
.vd-popup .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,.15); padding: 0; }
.vd-popup .leaflet-popup-content { margin: 10px 14px; font-family: 'Figtree', sans-serif; }
`;

export default function ViolationDetails({ violationId = 'VIO-26-8841', initialRecord = null }) {
    // Simulated Mock Data for the specific violation
    const record = initialRecord || {
        id: violationId,
        date: 'April 5, 2026',
        time: '08:45 AM',
        lat: 14.0725,  // Exact Nasugbu Latitude
        lng: 120.6321, // Exact Nasugbu Longitude
        location_desc: 'Nasugbu Highway, Zone 1',
        operator: 'Ricardo Dalisay',
        toda: 'TODA D (Papaya)',
        plate_no: '8812',
        type: 'Coding Scheme Violation',
        source: 'Location Tracker',
        fine: 500,
        status: 'unsettled', // 'unsettled' | 'settled'
        notes: 'Tracker detected movement during a restricted operational day based on plate ending (2).',
        appeal: null,
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const appeal = record.appeal;
    const isSettled = record.status === 'settled';

    const handleApprove = () => {
        Swal.fire({
            title: 'Approve this appeal?',
            text: 'The violation will be marked as Resolved and the driver will owe no fine.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Approve Appeal',
            confirmButtonColor: '#059669',
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
            inputLabel: 'Reason (optional, shown to the driver)',
            inputPlaceholder: 'e.g. Evidence does not support the claim...',
            showCancelButton: true,
            confirmButtonText: 'Reject Appeal',
            confirmButtonColor: '#DC2626',
        }).then((result) => {
            if (!result.isConfirmed) return;
            setIsSubmitting(true);
            router.post(`/tmo/appeals/${appeal.id}/reject`, { review_notes: result.value || null }, {
                onFinish: () => setIsSubmitting(false),
            });
        });
    };

    return (
        <TrivoraLayout title="Violation Details" role="TMO Officer">
            <Head title={`Ticket ${record.id} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: LEAFLET_POPUP_CSS }} />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <BackLink href="/violations">Back to Records</BackLink>
                {isSettled ? (
                    <StatusBadge variant="success" icon={CheckCircle2}>Settled &amp; Cleared</StatusBadge>
                ) : (
                    <StatusBadge variant="warning" icon={AlertTriangle}>Unsettled Fine</StatusBadge>
                )}
            </div>

            <PageHeader eyebrow="Apprehension Ticket" title={`Incident ${record.id}`} subtitle="Recorded via TRIVORA" />

            <div className="grid grid-cols-1 gap-6 print:grid-cols-1 lg:grid-cols-[1fr_380px]">

                {/* ════ LEFT: Evidence ════ */}
                <div className="overflow-hidden rounded-2xl border border-tmo-border bg-tmo-surface shadow-sm print:shadow-none">
                    <div className="p-7">
                        <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold text-tmo-ink">
                            <Map size={20} className="text-tmo-primary" />
                            GPS Tracking Data
                        </h2>

                        {/* REAL Interactive Map Evidence */}
                        <div className="relative z-[1] mb-5 h-[340px] overflow-hidden rounded-xl border border-tmo-border bg-gray-200">
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
                                            <p className="m-0 mb-0.5 text-[11.5px] font-extrabold uppercase tracking-tight text-tmo-ink">
                                                {record.id}
                                            </p>
                                            <p className="m-0 text-[9px] font-bold uppercase tracking-wider text-red-600">
                                                Coding Alert
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>

                                <ZoomControl position="bottomright" />
                            </MapContainer>

                            <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 rounded-lg bg-tmo-primary/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-lg">
                                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                                GPS Lock: Accurate
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-tmo-border bg-tmo-bg p-5">
                                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-tmo-muted">
                                    <Calendar size={13} /> Detection Time
                                </p>
                                <p className="text-sm font-semibold leading-relaxed text-tmo-ink">
                                    {record.date}<br /><span className="text-xs font-medium text-tmo-muted">{record.time}</span>
                                </p>
                            </div>
                            <div className="rounded-xl border border-tmo-border bg-tmo-bg p-5">
                                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-tmo-muted">
                                    <MapPin size={13} /> Coordinates
                                </p>
                                <p className="text-sm font-semibold leading-relaxed text-tmo-ink">
                                    {record.lat}° N, {record.lng}° E<br /><span className="text-xs font-medium text-tmo-muted">{record.location_desc}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════ RIGHT: Details & Fine ════ */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-tmo-border bg-tmo-surface shadow-sm print:shadow-none print:break-inside-avoid">
                    <div className={`flex flex-col items-center px-6 py-7 text-center text-white [print-color-adjust:exact] ${isSettled ? 'bg-emerald-600' : 'bg-red-600'}`}>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/70">Assessed Penalty</p>
                        <p className="text-4xl font-extrabold tracking-tight">₱{record.fine.toFixed(2)}</p>
                    </div>

                    <div className="flex-1 p-7">
                        <DetailRow
                            icon={AlertTriangle}
                            tone="danger"
                            label="Infraction Details"
                            value={<span className="text-red-600">{record.type}</span>}
                            sub={record.notes}
                        />
                        <DetailRow
                            icon={User}
                            label="Registered Operator"
                            value={record.operator}
                            sub={record.toda}
                        />
                        <DetailRow
                            icon={Bike}
                            label="Vehicle Specs"
                            value={`Plate No: ${record.plate_no}`}
                            last
                        />

                        {appeal && (
                            <div className="mb-6 rounded-xl border border-tmo-border bg-tmo-bg p-5">
                                <div className="mb-3.5 flex items-center justify-between">
                                    <p className="flex items-center gap-2 text-sm font-extrabold text-tmo-ink">
                                        <MessageSquareText size={16} className="text-tmo-primary" />
                                        Driver Appeal
                                    </p>
                                    {appeal.status === 'under_review' ? (
                                        <StatusBadge variant="warning">Under Review</StatusBadge>
                                    ) : appeal.status === 'approved' ? (
                                        <StatusBadge variant="success">Approved</StatusBadge>
                                    ) : (
                                        <StatusBadge variant="danger">Not Approved</StatusBadge>
                                    )}
                                </div>

                                <p className="mb-2.5 text-[10px] text-tmo-subtle">
                                    Filed by {appeal.driver_name} on {appeal.submitted_at}
                                </p>

                                <p className="mb-3.5 text-[12.5px] leading-relaxed text-tmo-ink">"{appeal.reason}"</p>

                                {appeal.evidence_url ? (
                                    <img src={appeal.evidence_url} alt="Appeal evidence" className="mb-3.5 block max-h-[220px] max-w-full rounded-lg border border-tmo-border" />
                                ) : (
                                    <p className="mb-3.5 flex items-center gap-2 text-[11.5px] text-tmo-subtle">
                                        <ImageOff size={14} />
                                        No evidence photo was attached.
                                    </p>
                                )}

                                {appeal.status === 'under_review' ? (
                                    <div className="flex gap-2.5">
                                        <Button variant="success" className="flex-1" icon={ThumbsUp} onClick={handleApprove} disabled={isSubmitting}>
                                            Approve
                                        </Button>
                                        <Button variant="dangerSolid" className="flex-1" icon={ThumbsDown} onClick={handleReject} disabled={isSubmitting}>
                                            Reject
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-tmo-muted">
                                        <Clock size={12} className="mt-0.5 shrink-0" />
                                        Reviewed by {appeal.reviewer_name || 'N/A'} on {appeal.reviewed_at}
                                        {appeal.review_notes ? ` — "${appeal.review_notes}"` : ''}
                                    </p>
                                )}
                            </div>
                        )}

                        {appeal?.status === 'rejected' && (
                            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-xs font-semibold text-red-800">
                                Fine Payment Required — the driver has been instructed to pay ₱{record.fine.toFixed(2)} at the cashier.
                            </div>
                        )}

                        <Button variant="secondary" size="lg" className="mt-6 w-full print:hidden" icon={Printer} onClick={() => window.print()}>
                            Print Ticket Notice
                        </Button>
                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}

function DetailRow({ icon: Icon, label, value, sub, tone, last }) {
    return (
        <div className={`flex items-start gap-4 ${last ? '' : 'mb-5 border-b border-tmo-border pb-5'}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-600' : 'border-tmo-border bg-tmo-bg text-tmo-muted'}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-tmo-muted">{label}</p>
                <p className="text-[13.5px] font-semibold leading-relaxed text-tmo-ink">{value}</p>
                {sub && <p className="mt-1 text-[11px] leading-relaxed text-tmo-muted">{sub}</p>}
            </div>
        </div>
    );
}
