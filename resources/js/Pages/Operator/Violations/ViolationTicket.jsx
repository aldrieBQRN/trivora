import React, { useRef, useState } from 'react';
import { Head, usePage, useForm } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { BackLink, Button, Label, ErrorText, Textarea, Modal } from '@/Components/TMO';
import {
    Printer,
    Ticket,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Building2,
    User,
    Bike,
    MapPin,
    Clock,
    Landmark,
    Scale,
    Camera,
    ImagePlus,
    X,
} from 'lucide-react';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  .vt-paper, .vt-paper * { visibility: visible; }
  .vt-paper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; padding: 0; }
}
`;

// Shared soft, layered shadow token — same elevation language used across the TMO/Operator SaaS
// redesign, so this page's screen chrome reads as one consistent product. Only used on chrome
// (cards/headers/buttons) — never inside .vt-paper, which is the preserved printable ticket.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

function Row({ label, children, valueClassName = '' }) {
    return (
        <div className="mb-3.5 flex items-start justify-between gap-4 last:mb-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-tmo-subtle">{label}</span>
            <span className={`max-w-[60%] text-right text-[13px] font-semibold leading-relaxed text-tmo-ink ${valueClassName}`}>{children}</span>
        </div>
    );
}

const Divider = () => (
    <div className="my-6 h-px" style={{ backgroundImage: 'repeating-linear-gradient(to right, rgba(28,35,64,.15) 0, rgba(28,35,64,.15) 6px, transparent 6px, transparent 12px)' }} />
);

function Card({ icon: Icon, title, children }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                    <Icon size={16} />
                </div>
                <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function InfoItem({ label, value, mono = false, className = '' }) {
    return (
        <div className={className}>
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
            <span className={`mt-1 block text-sm font-semibold leading-relaxed text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

/* ─────────────────────── Appeal: status panel ────────────────────────── */

const APPEAL_STATUS_META = {
    under_review: {
        tone: 'border-amber-200/70 bg-amber-50/60',
        iconBg: 'bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600',
        icon: Clock,
        title: 'Appeal Under Review',
        titleClass: 'text-amber-900',
        bodyClass: 'text-amber-800',
        message: 'TMO is reviewing your submitted explanation and proof. You will see a decision here once it’s reviewed.',
    },
    approved: {
        tone: 'border-emerald-200/70 bg-emerald-50/60',
        iconBg: 'bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600',
        icon: CheckCircle2,
        title: 'Appeal Approved',
        titleClass: 'text-emerald-900',
        bodyClass: 'text-emerald-800',
        message: 'Your appeal was approved. This violation has been resolved — no payment is required.',
    },
    rejected: {
        tone: 'border-red-200/70 bg-red-50/60',
        iconBg: 'bg-gradient-to-br from-red-500/[0.14] to-red-500/[0.02] text-red-600',
        icon: XCircle,
        title: 'Appeal Rejected',
        titleClass: 'text-red-900',
        bodyClass: 'text-red-800',
        message: 'Your appeal was not approved. The fine remains due — please settle it at the Municipal Treasurer’s Office.',
    },
};

function AppealStatusPanel({ appeal }) {
    const meta = APPEAL_STATUS_META[appeal.status] || APPEAL_STATUS_META.under_review;
    const Icon = meta.icon;

    return (
        <div className={`mb-6 rounded-2xl border p-5 ${meta.tone} ${CARD_SHADOW}`}>
            <div className="flex items-start gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${meta.titleClass}`}>{meta.title}</p>
                    <p className={`mt-0.5 text-xs leading-relaxed ${meta.bodyClass}`}>{meta.message}</p>

                    {appeal.status === 'rejected' && appeal.reviewNotes && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-white p-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">TMO's Reason</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-900">{appeal.reviewNotes}</p>
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/70 bg-white/70 p-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Your Explanation</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-900">{appeal.reason}</p>
                            <p className="mt-2 text-[10px] text-slate-400">Submitted {appeal.submittedAt}</p>
                        </div>
                        {appeal.evidenceUrl ? (
                            <a href={appeal.evidenceUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-white/70 transition-opacity hover:opacity-90">
                                <img src={appeal.evidenceUrl} alt="Appeal proof" className="h-32 w-full object-cover" />
                            </a>
                        ) : (
                            <div className="flex items-center justify-center rounded-xl border border-dashed border-white/70 bg-white/40 p-3.5 text-center text-[11px] text-slate-400">
                                No photo was attached
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────── Appeal: submission form ──────────────────────── */

function AppealForm({ appealUrl }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [preview, setPreview] = useState(null);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        reason: '',
        proof: null,
    });

    const handleFile = (file) => {
        if (!file) return;
        setData('proof', file);
        setPreview(URL.createObjectURL(file));
    };

    const removePhoto = () => {
        setData('proof', null);
        setPreview(null);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    const closeAndReset = () => {
        setOpen(false);
        setStep(1);
        reset();
        clearErrors();
        setPreview(null);
    };

    const canContinue = data.reason.trim().length >= 10;

    const handleSubmit = () => {
        post(appealUrl, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => closeAndReset(),
        });
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-[#1D2542] decoration-[#1D2542]/40 underline-offset-2 hover:underline"
            >
                <Scale size={13} /> Appeal this violation
            </button>
        );
    }

    return (
        <div className={`mb-6 rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 ${CARD_SHADOW}`}>
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                        <Scale size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">
                            {step === 1 ? 'File an Appeal' : 'Review Your Appeal'}
                        </h3>
                        <p className="text-[11px] text-slate-400">Step {step} of 2</p>
                    </div>
                </div>
                <button type="button" onClick={closeAndReset} className="text-slate-400 hover:text-slate-700" disabled={processing}>
                    <X size={18} />
                </button>
            </div>

            {step === 1 && (
                <>
                    <Label required>Reason / Explanation</Label>
                    <Textarea
                        value={data.reason}
                        onChange={(e) => setData('reason', e.target.value)}
                        placeholder="Explain why you believe this violation should be reconsidered..."
                        maxLength={2000}
                        error={errors.reason}
                    />
                    <div className="mt-1 flex items-center justify-between">
                        <ErrorText>{errors.reason}</ErrorText>
                        <span className="ml-auto text-[10px] text-slate-400">{data.reason.trim().length}/2000 (min. 10)</span>
                    </div>

                    <div className="mt-4">
                        <Label>Proof (Optional)</Label>
                        {preview ? (
                            <div className="relative w-fit">
                                <img src={preview} alt="Proof preview" className="h-32 w-32 rounded-lg border border-slate-200 object-cover" />
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[#1D2542] hover:text-[#1D2542]"
                                >
                                    <Camera size={14} /> Take Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[#1D2542] hover:text-[#1D2542]"
                                >
                                    <ImagePlus size={14} /> Upload Photo
                                </button>
                            </div>
                        )}
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
                        <input ref={galleryInputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
                        <ErrorText>{errors.proof}</ErrorText>
                    </div>

                    <Button variant="primary" size="md" className="mt-5 w-full" disabled={!canContinue} onClick={() => setStep(2)}>
                        Continue to Review
                    </Button>
                </>
            )}

            {step === 2 && (
                <>
                    <div className="space-y-4 rounded-xl bg-slate-50 p-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Your Explanation</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-slate-900">{data.reason}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Proof</p>
                            {preview ? (
                                <img src={preview} alt="Proof preview" className="mt-1.5 h-28 w-28 rounded-lg border border-slate-200 object-cover" />
                            ) : (
                                <p className="mt-1 text-xs text-slate-400">No photo attached.</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 flex gap-2.5">
                        <Button variant="secondary" size="md" className="flex-1" onClick={() => setStep(1)} disabled={processing}>
                            Edit
                        </Button>
                        <Button variant="primary" size="md" className="flex-1" loading={processing} onClick={handleSubmit}>
                            {processing ? 'Submitting...' : 'Submit Appeal'}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

/* ───────────────────────────── Page ────────────────────────────────── */

export default function ViolationTicket({ violation }) {
    const { auth } = usePage().props;
    const operatorName = auth?.user?.name || 'Driver';
    const [showTicket, setShowTicket] = useState(false);
    const handlePrint = () => window.print();

    return (
        <OperatorLayout title="Violation Details" operatorName={operatorName}>
            <Head title={`Violation ${violation.id} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

            <div className="mx-auto max-w-[1400px] pb-10">
                <div className="mb-2 flex items-center justify-between">
                    <BackLink href={route('operator.violations')}>Back to Active Violations</BackLink>
                    <span className="rounded-md border border-[#1D2542]/20 bg-[#1D2542]/[0.06] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-[#1D2542]">
                        {violation.id}
                    </span>
                </div>

                <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <span className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Violation Record</span>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Violation Details</h1>
                        <p className="mt-1 text-sm text-slate-500">{violation.type} &bull; {violation.date}</p>
                    </div>
                    <Button variant="primary" size="md" icon={Ticket} onClick={() => setShowTicket(true)} className="shrink-0">
                        View Ticket
                    </Button>
                </div>

                {violation.isPaid ? (
                    <div className={`mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-5 ${CARD_SHADOW}`}>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <CheckCircle2 size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-emerald-800">Fine Settled</p>
                            <p className="mt-0.5 text-xs text-emerald-700">
                                This violation was paid at the Municipal Treasurer's Office and confirmed by TMO on {violation.paidAt}.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-5 ${CARD_SHADOW}`}>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                            <Landmark size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900">Present this ticket at the Municipal Treasurer's Office</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                                Pay the fine amount in cash at the Treasurer's cashier. Keep the official receipt they give you — you'll need to present it to TMO afterwards to confirm settlement.
                            </p>
                        </div>
                    </div>
                )}

                {violation.appeal ? (
                    <AppealStatusPanel appeal={violation.appeal} />
                ) : violation.canAppeal ? (
                    <AppealForm appealUrl={route('operator.violations.appeal', { id: violation.db_id })} />
                ) : null}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">

                    {/* Left column: about the violation itself */}
                    <div className="space-y-5">
                        <Card icon={AlertCircle} title="Violation Information">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                <InfoItem label="Violation Type" value={violation.type} />
                                <InfoItem label="Date &amp; Time" value={`${violation.date} • ${violation.time}`} />
                                <InfoItem label="Location" value={violation.location} className="sm:col-span-2" />
                                <InfoItem label="Detection Method" value={violation.detectionMethod} />
                                {violation.notes && <InfoItem label="Remarks" value={violation.notes} className="sm:col-span-2" />}
                            </div>
                        </Card>

                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-6 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-900">
                                    Fine Amount {violation.isPaid ? 'Paid' : 'Due'}
                                </span>
                                <span className={`text-2xl font-extrabold tracking-tight ${violation.isPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                                    ₱{violation.fine.toFixed(2)}
                                </span>
                            </div>

                            {violation.isPaid && (
                                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-dashed border-slate-200 pt-5 sm:grid-cols-2">
                                    <InfoItem label="Official Receipt No." value={violation.officialReceiptNumber} mono />
                                    <InfoItem label="Amount Paid" value={`₱${Number(violation.amountPaid ?? violation.fine).toFixed(2)}`} />
                                    <InfoItem label="Payment Date" value={violation.paidAt} />
                                    <InfoItem label="Confirmed By" value={violation.confirmedByName || 'TMO Personnel'} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right column: about the unit & driver */}
                    <div className="space-y-5">
                        <Card icon={Bike} title="Tricycle Information">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                <InfoItem label="Unit / Body No." value={violation.unit} />
                                <InfoItem label="Plate Number" value={violation.plateNumber} mono />
                                <InfoItem label="Make &amp; Model" value={violation.makeModel} />
                                <InfoItem label="Coding Scheme" value={violation.colorScheme} />
                            </div>
                        </Card>

                        <Card icon={User} title="Driver Information">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                <InfoItem label="Name" value={violation.driverName} />
                                <InfoItem label="Contact Number" value={violation.contactNumber || 'N/A'} />
                                <InfoItem label="License Number" value={violation.licenseNumber || 'N/A'} className="sm:col-span-2" />
                            </div>
                        </Card>
                    </div>

                </div>

                <Modal
                    show={showTicket}
                    onClose={() => setShowTicket(false)}
                    title="Violation Ticket"
                    description="Present or print this official ticket at the Municipal Treasurer's Office."
                    maxWidth="2xl"
                    footer={
                        <>
                            <Button variant="secondary" size="sm" onClick={() => setShowTicket(false)}>Close</Button>
                            <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint}>Print</Button>
                        </>
                    }
                >
                    <div className="vt-paper relative overflow-hidden rounded-xl border border-tmo-border bg-white p-6 sm:p-8">
                        <div className="mb-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tmo-primarySoft text-tmo-primary">
                                <Building2 size={24} strokeWidth={1.5} />
                            </div>
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-tmo-subtle">Republika ng Pilipinas &bull; Province of Batangas</p>
                            <h2 className="text-base font-extrabold uppercase tracking-wide text-tmo-ink">Municipality of Nasugbu</h2>
                            <p className="mb-6 text-[11px] text-tmo-muted">Traffic Management Office (TMO)</p>

                            <h1 className="flex items-center justify-center gap-2 text-xl font-extrabold tracking-tight text-red-600">
                                <AlertCircle size={22} strokeWidth={2.5} /> Violation Ticket
                            </h1>
                            <p className="mt-2 font-mono text-2xl font-extrabold tracking-wide text-tmo-ink">{violation.id}</p>
                            <div className="mt-3 flex justify-center">
                                <StatusBadgeInline violation={violation} />
                            </div>
                        </div>

                        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-tmo-muted"><User size={12} /> Driver Information</p>
                        <Row label="Name">{violation.driverName}</Row>
                        <Row label="Contact Number">{violation.contactNumber || 'N/A'}</Row>
                        <Row label="License Number">{violation.licenseNumber || 'N/A'}</Row>

                        <Divider />

                        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-tmo-muted"><Bike size={12} /> Tricycle Information</p>
                        <Row label="Unit / Body No.">{violation.unit}</Row>
                        <Row label="Plate Number" valueClassName="font-mono">{violation.plateNumber}</Row>
                        <Row label="Make &amp; Model">{violation.makeModel}</Row>
                        <Row label="Coding Scheme">{violation.colorScheme}</Row>

                        <Divider />

                        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-tmo-muted"><MapPin size={12} /> Violation Details</p>
                        <Row label="Violation Type">{violation.type}</Row>
                        <Row label="Date &amp; Time">{violation.date} &bull; {violation.time}</Row>
                        <Row label="Location">{violation.location}</Row>
                        <Row label="Detection Method">{violation.detectionMethod}</Row>
                        {violation.notes && <Row label="Remarks">{violation.notes}</Row>}

                        <div className="mt-8 rounded-xl border border-tmo-border bg-tmo-bg p-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-tmo-ink">Fine Amount Due</span>
                                <span className="text-2xl font-extrabold tracking-tight text-red-600">₱{violation.fine.toFixed(2)}</span>
                            </div>

                            {violation.isPaid && (
                                <div className="mt-5 space-y-3 border-t border-dashed border-tmo-border pt-5">
                                    <Row label="Official Receipt No." valueClassName="font-mono">{violation.officialReceiptNumber}</Row>
                                    <Row label="Amount Paid">₱{Number(violation.amountPaid ?? violation.fine).toFixed(2)}</Row>
                                    <Row label="Payment Date">{violation.paidAt}</Row>
                                    <Row label="Confirmed By">{violation.confirmedByName || 'TMO Personnel'}</Row>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-[11px] leading-relaxed text-tmo-subtle">
                                This is a system-generated violation ticket.<br />
                                TRIVORA Fleet Operations System &bull; Nasugbu Traffic Management Office
                            </p>
                        </div>
                    </div>
                </Modal>
            </div>
        </OperatorLayout>
    );
}

function StatusBadgeInline({ violation }) {
    if (violation.isPaid) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Settled
            </span>
        );
    }
    if (violation.appeal?.status === 'under_review') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                Appeal Under Review
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            Unpaid
        </span>
    );
}
