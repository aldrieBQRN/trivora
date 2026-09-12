import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    ShieldCheck, CheckCircle2, User, Smartphone, Cpu, CheckSquare, Square,
} from 'lucide-react';
import { BackLink, StatusBadge, Button, Textarea, Label } from '@/Components/TMO';

export default function FinalConfirmationDetail({ application }) {
    const isAlreadyCompleted = application.status === 'completed';

    const { data, setData, post, processing } = useForm({
        signed_ticket_verified: isAlreadyCompleted,
        bplo_approval_confirmed: isAlreadyCompleted,
        sticker_possession_confirmed: isAlreadyCompleted,
        tracking_method: application.tracking_method || 'mobile_gps',
        iot_device_id: application.iot_device_id || (application.suggested_iot_id || ''),
        officer_notes: '',
    });

    const allChecked =
        data.signed_ticket_verified &&
        data.bplo_approval_confirmed &&
        data.sticker_possession_confirmed;

    const canSubmit = allChecked && (
        data.tracking_method === 'mobile_gps' ||
        (data.tracking_method === 'iot_device' && data.iot_device_id.trim() !== '')
    );

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
            : `<b>Mobile GPS Tracking</b> (Trivora Driver App)`;

        Swal.fire({
            title: 'Confirm Franchise Activation',
            html: `Are you sure you want to mark this franchise as <b>COMPLETED / ACTIVE</b>?<br/><br/>
                   Driver: <b>${application.operator_name}</b><br/>
                   Franchise Sticker: <b>${application.sticker_number}</b><br/>
                   Body Number: <b>${application.body_number}</b><br/>
                   Tracking Method: ${methodText}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Activate Franchise',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                post(`/tmo/final-confirmation/${application.id}`, {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Franchise Activated!',
                            text: `The franchise registration process is complete. Unit is now active in the registry.`,
                            icon: 'success',
                            confirmButtonColor: '#059669',
                            timer: 2500,
                            showConfirmButton: false,
                        });
                    }
                });
            }
        });
    };

    return (
        <TrivoraLayout title="Final Confirmation" role="TMO Officer">
            <Head title={`Final Confirmation: ${application.reference} | TRIVORA`} />

            {/* Top Action Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <BackLink href="/tmo/final-confirmation">Back to Final Confirmation Queue</BackLink>

                <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-gray-100 px-2.5 py-1.5 font-mono text-xs font-bold text-tmo-ink">
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
                    {/* Driver & Vehicle */}
                    <div className="rounded-2xl border border-tmo-border bg-tmo-surface p-6">
                        <div className="mb-4 flex items-center justify-between border-b border-tmo-border pb-3.5">
                            <h3 className="flex items-center gap-2 text-sm font-extrabold text-tmo-ink">
                                <User size={18} className="text-tmo-primary" />
                                Applicant &amp; Vehicle Registration
                            </h3>
                            <span className="text-[11px] font-bold text-tmo-muted">{application.application_type} Franchise</span>
                        </div>

                        <DetailRow label="Operator / Driver" value={application.operator_name} />
                        <DetailRow label="Contact Number" value={application.contact_number} />
                        <DetailRow label="TODA Zone Assignment" value={application.toda_zone} />
                        <DetailRow label="Plate / Temp Number" value={application.plate_number} mono />
                        <DetailRow label="Make &amp; Model" value={application.make_model} />
                        <DetailRow
                            label="Engine / Chassis Serial"
                            value={`${application.engine_number} / ${application.chassis_number}`}
                            mono
                            last
                        />
                    </div>

                    {/* Clearances: BPLO Sticker Release & Cashier Payment */}
                    <div className="rounded-2xl border border-tmo-border bg-tmo-surface p-6">
                        <div className="mb-4 flex items-center justify-between border-b border-tmo-border pb-3.5">
                            <h3 className="flex items-center gap-2 text-sm font-extrabold text-tmo-ink">
                                <ShieldCheck size={18} className="text-emerald-600" />
                                Prerequisite Approvals &amp; Clearances
                            </h3>
                            <span className="text-[11px] font-bold text-emerald-600">Verified</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
                                <div className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-tmo-muted">BPLO Released Sticker</div>
                                <div className="font-mono text-[13px] font-extrabold text-emerald-700">{application.sticker_number}</div>
                                <div className="mt-0.5 text-[10px] text-emerald-600">Body #{application.body_number}</div>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
                                <div className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-tmo-muted">Municipal Cashier OR</div>
                                <div className="font-mono text-[13px] font-extrabold text-emerald-700">{application.payment?.or_number || 'OR-VERIFIED'}</div>
                                <div className="mt-0.5 text-[10px] text-emerald-600">₱750.00 Paid OTC</div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <DetailRow
                                label="Assigned Color-Coding"
                                value={
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: application.color_hex }} />
                                        {application.color_scheme} Scheme
                                    </span>
                                }
                            />
                            <DetailRow label="Order of Payment Ticket" value={application.ticket_number} mono last />
                        </div>
                    </div>
                </div>

                {/* ══════════════ RIGHT COLUMN: TMO Verification & GPS Tracking ══════════════ */}
                <div>
                    <div className="rounded-2xl border-[1.5px] border-tmo-borderStrong bg-tmo-surface p-7 shadow-sm">
                        <h2 className="mb-1.5 text-lg font-extrabold text-tmo-ink">TMO Final Verification</h2>
                        <p className="mb-6 text-[12.5px] leading-relaxed text-tmo-muted">
                            Confirm the driver's signed documents and physical sticker possession, then select the GPS tracking method to activate the franchise permit.
                        </p>

                        {/* Checklist */}
                        <div className="mb-6 flex flex-col gap-2.5">
                            <CheckItem
                                checked={data.signed_ticket_verified}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('signed_ticket_verified', !data.signed_ticket_verified)}
                            >
                                Driver presented the <strong>signed &amp; validated Municipal Payment Ticket</strong> from Cashier.
                            </CheckItem>
                            <CheckItem
                                checked={data.bplo_approval_confirmed}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('bplo_approval_confirmed', !data.bplo_approval_confirmed)}
                            >
                                Confirmed <strong>BPLO payment verification</strong> and official franchise approval.
                            </CheckItem>
                            <CheckItem
                                checked={data.sticker_possession_confirmed}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('sticker_possession_confirmed', !data.sticker_possession_confirmed)}
                            >
                                Confirmed physical possession of <strong>Franchise Sticker #{application.sticker_number}</strong> and plate for coding.
                            </CheckItem>
                        </div>

                        {/* GPS Tracking Method Selection */}
                        <p className="mb-2 text-[13.5px] font-extrabold text-tmo-ink">Select GPS Tracking Method:</p>

                        <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <MethodCard
                                icon={Smartphone}
                                iconTone="bg-emerald-100 text-emerald-700"
                                title="Mobile GPS"
                                badge="Driver App"
                                badgeTone="bg-indigo-100 text-indigo-800"
                                description="Driver will broadcast GPS locations using the Trivora Driver app. No physical IoT hardware is issued."
                                selected={data.tracking_method === 'mobile_gps'}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('tracking_method', 'mobile_gps')}
                            />
                            <MethodCard
                                icon={Cpu}
                                iconTone="bg-tmo-primarySoft text-tmo-primary"
                                title="IoT Device"
                                badge="Hardware Unit"
                                badgeTone="bg-amber-100 text-amber-800"
                                description="Driver uses an onboard IoT tracking device. TMO is responsible for issuing and recording the device."
                                selected={data.tracking_method === 'iot_device'}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('tracking_method', 'iot_device')}
                            />
                        </div>

                        {/* IoT Device Serial Input */}
                        {data.tracking_method === 'iot_device' && (
                            <div className="mb-6 rounded-lg border border-tmo-borderStrong bg-tmo-bg p-4">
                                <Label>IoT Device Hardware ID / Serial Number:</Label>
                                <input
                                    type="text"
                                    className="mt-1.5 w-full rounded-lg border-[1.5px] border-tmo-borderStrong bg-white px-3.5 py-2.5 font-mono text-sm font-bold text-tmo-ink outline-none transition-colors focus:border-tmo-primary focus:ring-2 focus:ring-tmo-primary/15"
                                    placeholder="e.g. TRV-IOT-2026-0042"
                                    value={data.iot_device_id}
                                    onChange={(e) => setData('iot_device_id', e.target.value)}
                                    disabled={isAlreadyCompleted}
                                    required
                                />
                                <p className="mt-1.5 text-[11px] text-tmo-muted">
                                    Record the unique hardware serial printed on the physical tracker issued to the driver.
                                </p>
                            </div>
                        )}

                        {/* Officer Notes */}
                        {!isAlreadyCompleted && (
                            <div className="mb-5">
                                <Label>Officer Notes (Optional):</Label>
                                <Textarea
                                    rows={2}
                                    className="mt-1.5"
                                    placeholder="Any additional remarks regarding document verification or device issuance..."
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
                            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                                <CheckCircle2 size={20} className="text-emerald-600" />
                                <div>
                                    <p className="text-[13px] font-bold text-emerald-800">Franchise is Active</p>
                                    <p className="text-[11px] text-emerald-700">
                                        Tracking Mode: {application.tracking_method === 'iot_device' ? `IoT Hardware (${application.iot_device_id})` : 'Mobile App GPS'}
                                    </p>
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
        <div className={`flex items-center justify-between py-1.5 text-[12.5px] ${last ? '' : 'border-b border-tmo-bg'}`}>
            <span className="font-medium text-tmo-muted">{label}</span>
            <span className={`text-right font-bold text-tmo-ink ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

function CheckItem({ checked, disabled, onClick, children }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`flex items-start gap-3 rounded-lg border-[1.5px] p-3.5 transition-colors ${
                disabled ? 'cursor-default opacity-70' : 'cursor-pointer'
            } ${checked ? 'border-emerald-300 bg-emerald-50' : 'border-tmo-border bg-tmo-bg hover:border-tmo-borderStrong'}`}
        >
            <div className={`mt-0.5 shrink-0 ${checked ? 'text-emerald-600' : 'text-gray-400'}`}>
                {checked ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2} />}
            </div>
            <div className="text-[12.5px] font-medium leading-relaxed text-tmo-ink">{children}</div>
        </div>
    );
}

function MethodCard({ icon: Icon, iconTone, title, badge, badgeTone, description, selected, disabled, onClick }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`rounded-xl border-2 p-4 transition-colors ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'} ${
                selected ? 'border-tmo-primary bg-tmo-primarySoft' : 'border-tmo-border bg-white hover:border-tmo-borderStrong'
            }`}
        >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${iconTone}`}>
                <Icon size={20} />
            </div>
            <h4 className="mb-1 text-[13.5px] font-bold text-tmo-ink">{title}</h4>
            <span className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${badgeTone}`}>{badge}</span>
            <p className="text-[11px] leading-relaxed text-tmo-muted">{description}</p>
        </div>
    );
}
