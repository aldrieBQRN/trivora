import React from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    ShieldCheck, CheckCircle2, User, Smartphone, Cpu, CheckSquare, Square,
    Receipt, Tag, Bike, Check, ChevronLeft, Phone,
} from 'lucide-react';
import { Button, Textarea, Label, StatusBadge } from '@/Components/TMO';

// Shared soft, layered shadow token — same elevation language used across the TMO panel (Index.jsx,
// Dashboard.jsx, KpiCard.jsx) so this detail page reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

// Reflects only what the backend has actually received (Tricycle::gpsStatus()) — never implies
// "Connected" just because a tracking method was selected at activation.
function GpsStatusBadge({ status, lastSeenAt }) {
    if (status === 'connected') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Connected{lastSeenAt ? ` · last signal ${lastSeenAt}` : ''}
            </span>
        );
    }
    if (status === 'stale') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Signal lost{lastSeenAt ? ` · last seen ${lastSeenAt}` : ''}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            Awaiting first signal
        </span>
    );
}

export default function FinalConfirmationDetail({ application }) {
    const isAlreadyCompleted = application.status === 'completed';

    const { data, setData, post, processing } = useForm({
        signed_ticket_verified: isAlreadyCompleted,
        bplo_approval_confirmed: isAlreadyCompleted,
        sticker_possession_confirmed: isAlreadyCompleted,
        tracking_method: application.tracking_method || 'mobile_gps',
        iot_device_id: application.iot_device_id || '',
        reassign_confirmed: false,
        officer_notes: '',
    });

    // Background refresh of the record being confirmed (payment verification / GPS setup status
    // is confirmed on this page): a change made elsewhere updates it without a manual reload.
    // Paused while submitting. useForm is initialised once from the first `application` prop, so
    // a refreshed record never re-seeds or clears the officer's checkbox/notes state.
    useBackgroundRefresh(['application'], { paused: processing });

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
                confirmButtonColor: '#1D2542'
            });
            return;
        }

        const methodText = data.tracking_method === 'iot_device'
            ? `IoT Hardware Device <b>#${data.iot_device_id}</b> (Hardware Issued)`
            : `<b>Mobile Device GPS</b> (Driver Smartphone)`;

        Swal.fire({
            title: 'Confirm Franchise Activation',
            html: `Are you sure you want to mark this franchise permit as <b>COMPLETED / ACTIVE</b>?<br/><br/>
                   <div style="text-align: left; background: #F8FAFC; padding: 14px 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; border: 1px solid #E2E8F0;">
                     Tricycle Owner: <b>${application.operator_name}</b><br/>
                     Tricycle Unit: <b>${application.make_model} (${application.plate_number})</b><br/>
                     Sticker Number: <b>#${application.coding_number} (${application.color_scheme} Scheme)</b><br/>
                     Tracking Method: ${methodText}
                   </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Activate Franchise',
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
                    text: `The franchise registration process is complete. Unit is now active in the municipal registry.`,
                    icon: 'success',
                    confirmButtonColor: '#059669',
                    timer: 2500,
                    showConfirmButton: false,
                });
            },
            onError: (errors) => {
                // The backend refuses to silently move a tracker that's already paired to a
                // different tricycle — surface that as an explicit choice rather than a generic
                // validation failure, so the officer can knowingly confirm the reassignment.
                if (errors.iot_device_id && errors.iot_device_id.includes('already paired')) {
                    Swal.fire({
                        title: 'Tracker Already Paired Elsewhere',
                        html: errors.iot_device_id,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#D97706',
                        cancelButtonColor: '#8A96BC',
                        confirmButtonText: 'Reassign to This Tricycle',
                        cancelButtonText: 'Cancel',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // useForm's post() always submits its own (async) `data` state, which
                            // wouldn't yet reflect a setData() called this tick — router.post()
                            // with an explicit payload submits the override immediately instead.
                            router.post(`/tmo/final-confirmation/${application.id}`, {
                                ...data,
                                reassign_confirmed: true,
                            }, {
                                onSuccess: () => {
                                    Swal.fire({
                                        title: 'Franchise Activated!',
                                        text: 'The franchise registration process is complete. Unit is now active in the municipal registry.',
                                        icon: 'success',
                                        confirmButtonColor: '#059669',
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

            {/* Top Action Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <Link
                    href="/tmo/final-confirmation"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                    <span>Back to Final Confirmation Queue</span>
                </Link>

                <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800 border border-slate-200">
                        {application.reference}
                    </span>
                    {isAlreadyCompleted ? (
                        <StatusBadge variant="success">Completed / Active</StatusBadge>
                    ) : (
                        <StatusBadge variant="warning">Awaiting Final TMO Verification</StatusBadge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">

                {/* ══════════════ LEFT COLUMN: Application Profile & Clearances ══════════════ */}
                <div className="flex flex-col gap-5">
                    {/* Tricycle Owner/Driver & Vehicle */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-6 ${CARD_SHADOW}`}>
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
                            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <User size={16} strokeWidth={2.2} />
                                </span>
                                Applicant &amp; Vehicle Registration
                            </h3>
                            <span className="text-[11px] font-bold text-slate-400">{application.application_type} Franchise</span>
                        </div>

                        {/* Tricycle Owner — always the primary person; driver only below when different */}
                        <DetailRow
                            label="Tricycle Owner"
                            value={application.owner?.full_name || application.operator_name}
                        />
                        <DetailRow label="Owner's Birthday" value={application.owner?.birthday || '—'} />
                        <DetailRow label="Owner's Mobile" value={application.owner?.contact_number || application.contact_number} />
                        <DetailRow label="Owner's Barangay" value={application.owner?.barangay || application.barangay} />
                        <DetailRow
                            label="Tricycle Driver"
                            value={
                                application.ownerIsDriver
                                    ? 'Same as Tricycle Owner'
                                    : (application.tricycleDriver?.full_name || 'Not provided')
                            }
                        />
                        {!application.ownerIsDriver && application.tricycleDriver && (
                            <>
                                <DetailRow label="Driver's Birthday" value={application.tricycleDriver.birthday || '—'} />
                                <DetailRow label="Driver's Mobile" value={application.tricycleDriver.contact_number || '—'} />
                                <DetailRow label="Driver's Barangay" value={application.tricycleDriver.barangay || '—'} />
                            </>
                        )}
                        <DetailRow label="Plate / Temp Number" value={application.plate_number} mono />
                        <DetailRow label="Make &amp; Model" value={application.make_model} />
                        <DetailRow
                            label="Engine / Chassis Serial"
                            value={`${application.engine_number} / ${application.chassis_number}`}
                            mono
                            last
                        />
                    </div>

                    {/* Clearances: Sticker Number & Payment Ticket */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-6 ${CARD_SHADOW}`}>
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
                            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                    <ShieldCheck size={16} strokeWidth={2.2} />
                                </span>
                                Completed Steps
                            </h3>
                            <span className="text-[11px] font-bold text-emerald-600">Passed</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5">
                                <div className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">Sticker Number</div>
                                <div className="font-mono text-[14px] font-extrabold text-emerald-700">#{application.coding_number}</div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: application.color_hex }} />
                                    {application.color_scheme} Scheme
                                </div>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5">
                                <div className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">Order of Payment Ticket</div>
                                <div className="font-mono text-[13px] font-extrabold text-emerald-700">{application.ticket_number}</div>
                                <div className="mt-0.5 text-[10px] font-medium text-emerald-600">Municipal Cashier OTC Handout</div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <DetailRow label="Document Review" value="Verified & Passed" />
                            <DetailRow label="Physical Inspection" value="Passed (Handout Issued)" last />
                        </div>
                    </div>
                </div>

                {/* ══════════════ RIGHT COLUMN: TMO Verification & GPS Tracking ══════════════ */}
                <div>
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-7 ${CARD_SHADOW}`}>
                        <div className="mb-1.5 flex items-center justify-between">
                            <h2 className="text-lg font-extrabold text-slate-900">TMO Final Verification</h2>
                            {!isAlreadyCompleted && (
                                <button
                                    type="button"
                                    onClick={handleToggleAllChecks}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 transition hover:bg-emerald-200"
                                >
                                    <Check size={12} strokeWidth={3} />
                                    {allChecked ? 'Clear Checks' : 'Check All Clearances'}
                                </button>
                            )}
                        </div>
                        <p className="mb-6 text-[12.5px] leading-relaxed text-slate-500">
                            Check the driver's payment ticket and Sticker Number, then select GPS tracking to activate this tricycle franchise.
                        </p>

                        {/* Checklist */}
                        <div className="mb-6 flex flex-col gap-2.5">
                            <CheckItem
                                checked={data.signed_ticket_verified}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('signed_ticket_verified', !data.signed_ticket_verified)}
                            >
                                Driver presented the <strong>signed &amp; validated Municipal Payment Ticket</strong> from the Municipal Treasurer (OTC).
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
                        <p className="mb-2 text-[13.5px] font-extrabold text-slate-900">Select GPS Tracking:</p>

                        <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <MethodCard
                                icon={Cpu}
                                iconTone="bg-amber-100 text-amber-700"
                                title="GPS Tracker Device"
                                badge="Installed on Tricycle"
                                badgeTone="bg-amber-100 text-amber-800"
                                description="A dedicated GPS tracker wired into the tricycle battery. Automatically updates location without needing a phone."
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
                                description="The driver uses their personal smartphone and the Trivora Driver App to share location while driving."
                                selected={data.tracking_method === 'mobile_gps'}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('tracking_method', 'mobile_gps')}
                            />
                        </div>

                        {/* ── OPTION A: GPS TRACKER DEVICE ── */}
                        {data.tracking_method === 'iot_device' && (
                            <div className="mb-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
                                <div className="mb-1 flex items-center justify-between">
                                    <Label>Tracker ID / Device ID:</Label>
                                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        Required
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    className="mt-1.5 w-full rounded-lg border-[1.5px] border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 outline-none transition-colors focus:border-[#1D2542] focus:ring-2 focus:ring-[#1D2542]/10"
                                    placeholder="e.g. 1011 or SinoTrack Tracker ID"
                                    value={data.iot_device_id}
                                    onChange={(e) => setData('iot_device_id', e.target.value)}
                                    disabled={isAlreadyCompleted}
                                    required
                                />
                                {!data.iot_device_id && !isAlreadyCompleted && (
                                    <p className="mt-2 text-[11px] text-slate-500">
                                        No tracker ID configured yet. Enter the actual device ID configured for this tricycle.
                                    </p>
                                )}

                                <div className="mt-3 rounded-md bg-amber-100/60 px-3 py-2 text-[10.5px] leading-relaxed text-amber-900">
                                    <strong>Wiring:</strong> Connect Red wire to battery (+), Black to ground (-), and Yellow to ignition key.
                                </div>
                            </div>
                        )}

                        {/* ── OPTION B: DRIVER SMARTPHONE APP ── */}
                        {data.tracking_method === 'mobile_gps' && (
                            <div className="mb-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                                        <Smartphone size={18} strokeWidth={2.2} />
                                    </div>
                                    <div className="flex-1 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-extrabold text-slate-900 text-[13px]">
                                                Driver Smartphone App
                                            </span>
                                            <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                                                Uses Driver Phone
                                            </span>
                                        </div>
                                        <p className="mt-1 text-slate-600 leading-relaxed">
                                            The driver shares their location through the Trivora Driver App on their phone.
                                        </p>

                                        <div className="mt-3 rounded-lg border border-indigo-200/80 bg-white p-3.5 shadow-2xs">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                App Account Activation:
                                            </div>
                                            <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                                                The driver <strong>cannot log in</strong> to the Trivora Driver App until this application is approved and activated here by TMO.
                                            </p>
                                            <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600">
                                                Once activated, driver <strong>{application.operator_name}</strong> can log in with contact number <strong className="font-mono text-slate-800">{application.contact_number}</strong> and tap <strong>"Go Online"</strong> to start driving.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Officer Notes */}
                        {!isAlreadyCompleted && (
                            <div className="mb-5">
                                <Label>Officer Notes / Remarks (Optional):</Label>
                                <Textarea
                                    rows={2}
                                    className="mt-1.5"
                                    placeholder="Any additional notes or remarks..."
                                    value={data.officer_notes}
                                    onChange={(e) => setData('officer_notes', e.target.value)}
                                />
                            </div>
                        )}

                        {/* Action Button */}
                        {!isAlreadyCompleted ? (
                            <Button
                                variant="success"
                                size="lg"
                                className="w-full"
                                icon={processing ? undefined : CheckCircle2}
                                loading={processing}
                                disabled={!canSubmit}
                                onClick={handleSubmit}
                            >
                                {processing ? 'Activating Franchise...' : 'Confirm & Activate Franchise'}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                                <CheckCircle2 size={20} className="text-emerald-600" />
                                <div>
                                    <p className="text-[13px] font-bold text-emerald-800">Franchise Permit is Active</p>
                                    <p className="text-[11px] text-emerald-700">
                                        Tracking Mode: {application.tracking_method === 'iot_device' ? `GPS Tracker (${application.iot_device_id || 'Configured'})` : 'Driver Smartphone App'}
                                    </p>
                                    <div className="mt-1.5">
                                        <GpsStatusBadge status={application.gps_status} lastSeenAt={application.gps_last_seen_at} />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}

function DetailRow({ label, value, mono, last }) {
    return (
        <div className={`flex items-center justify-between py-1.5 text-[12.5px] ${last ? '' : 'border-b border-slate-50'}`}>
            <span className="font-medium text-slate-500">{label}</span>
            <span className={`text-right font-bold text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

function CheckItem({ checked, disabled, onClick, children }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`flex items-start gap-3 rounded-lg border-[1.5px] p-3.5 transition-colors ${
                disabled ? 'cursor-default opacity-70' : 'cursor-pointer'
            } ${checked ? 'border-emerald-300 bg-emerald-50/80' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'}`}
        >
            <div className={`mt-0.5 shrink-0 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
                {checked ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2} />}
            </div>
            <div className="text-[12.5px] font-medium leading-relaxed text-slate-800">{children}</div>
        </div>
    );
}

function MethodCard({ icon: Icon, iconTone, title, badge, badgeTone, description, selected, disabled, onClick }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`rounded-xl border-2 p-4 transition-all ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'} ${
                selected ? 'border-[#1D2542] bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
        >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${iconTone}`}>
                <Icon size={20} />
            </div>
            <h4 className="mb-1 text-[13.5px] font-bold text-slate-900">{title}</h4>
            <span className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${badgeTone}`}>{badge}</span>
            <p className="text-[11px] leading-relaxed text-slate-500">{description}</p>
        </div>
    );
}
