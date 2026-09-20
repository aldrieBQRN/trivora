import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ChevronLeft, CheckCircle2, AlertTriangle, Receipt,
    Bike, User, Phone, MapPin, ShieldCheck, AlertCircle,
    Loader2, Calendar, DollarSign, FileText, Info, Hash,
    ArrowRight
} from 'lucide-react';
import Swal from 'sweetalert2';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function VerifyPayment({ application }) {
    const app = application || {};
    const payment = app.payment || {};

    const [orNumber, setOrNumber] = useState(payment.or_number || '');
    const [amountPaid, setAmountPaid] = useState(payment.amount || app.total_amount || 750.00);
    const [paymentDate, setPaymentDate] = useState(payment.payment_date || new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState(payment.notes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleVerify = (e) => {
        e.preventDefault();

        if (!orNumber.trim()) {
            Swal.fire({
                title: 'Official Receipt Required',
                text: 'Please input the Official Receipt (OR) Number issued by the Municipal Treasurer.',
                icon: 'warning',
                confirmButtonColor: '#1D2542',
            });
            return;
        }

        Swal.fire({
            title: 'Confirm Payment Verification',
            html: `Verify Official Receipt <b>${orNumber}</b> of amount <b>₱${Number(amountPaid).toFixed(2)}</b> for applicant <b>${app.operator}</b>?<br/><br/><span class="text-xs text-slate-500">This will forward the franchise to <b>BPLO</b> for Sticker &amp; Coding Release.</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Verify & Forward to BPLO',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsSubmitting(true);
                // Field names must match PaymentVerificationController::verify()'s validation
                // exactly (official_receipt_number/amount/notes) — this previously sent
                // or_number/amount_paid/remarks, which don't exist on the backend, so the
                // required official_receipt_number check always failed silently (no onError
                // handler existed to surface it).
                router.post(`/tmo/verify-payment/${app.id}`, {
                    action: 'verify',
                    official_receipt_number: orNumber.trim(),
                    amount: amountPaid,
                    payment_date: paymentDate,
                    notes: remarks.trim(),
                }, {
                    onFinish: () => setIsSubmitting(false),
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Payment Verified!',
                            text: 'Application has been forwarded to the BPLO Releasing queue.',
                            icon: 'success',
                            confirmButtonColor: '#1D2542',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                    onError: (errs) => {
                        const firstErr = Object.values(errs)[0];
                        Swal.fire({
                            title: 'Verification Failed',
                            text: firstErr || 'Please check your inputs and try again.',
                            icon: 'error',
                            confirmButtonColor: '#1D2542',
                        });
                    },
                });
            }
        });
    };

    const handleFlagIssue = () => {
        Swal.fire({
            title: 'Flag Payment Issue',
            input: 'textarea',
            inputLabel: 'Specify the issue with the Official Receipt or Payment Ticket:',
            inputPlaceholder: 'e.g. Official Receipt number does not match treasury records; discrepancy in amount paid...',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Please describe the payment issue.';
                }
            },
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Flag Issue & Notify Applicant',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsSubmitting(true);
                router.post(`/tmo/verify-payment/${app.id}`, {
                    action: 'flag_issue',
                    issue_notes: result.value.trim(),
                }, {
                    onFinish: () => setIsSubmitting(false),
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Issue Flagged',
                            text: 'Application marked with a payment issue. Applicant notified to report back to TMO.',
                            icon: 'info',
                            confirmButtonColor: '#1D2542',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                    onError: (errs) => {
                        const firstErr = Object.values(errs)[0];
                        Swal.fire({
                            title: 'Could Not Flag Issue',
                            text: firstErr || 'Please check your inputs and try again.',
                            icon: 'error',
                            confirmButtonColor: '#1D2542',
                        });
                    },
                });
            }
        });
    };

    return (
        <TrivoraLayout title="Verify Treasurer Payment" role="TMO Officer">
            <Head title={`Verify Payment: ${app.reference || 'Record'} | TRIVORA`} />

            {/* ══════════════════════════════════════════════════════════════
                1. TOP NAVIGATION
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 flex items-center justify-between">
                <Link
                    href="/tmo/payments"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                    <span>Back to Payment Queue</span>
                </Link>

                <div className="flex items-center gap-2">
                    {app.ticket_number && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200/80 text-[#1D2542] rounded-lg text-xs font-mono font-bold shadow-2xs">
                            <Receipt size={12} className="text-slate-500" />
                            {app.ticket_number}
                        </span>
                    )}
                    {app.reference && (
                        <span className="px-2.5 py-1 bg-slate-100/80 border border-slate-200/60 text-slate-600 rounded-lg text-xs font-mono font-medium">
                            {app.reference}
                        </span>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. CLEAN INTEGRATED HEADER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 border-b border-slate-200/80 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            TMO Payment Verification
                        </div>
                        <h1 className="mt-0.5 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                            Verify Municipal Treasurer Payment
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                            Inspect and record the physical Official Receipt (OR) presented by the applicant to forward the franchise to BPLO releasing
                        </p>
                    </div>

                    {app.status === 'payment_issue' ? (
                        <span className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                            <AlertCircle size={13} strokeWidth={2.5} />
                            Payment Issue Flagged
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            <Receipt size={13} strokeWidth={2.2} />
                            Waiting for Official Receipt
                        </span>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. PREVIOUSLY FLAGGED ISSUE BANNER (Conditional)
               ══════════════════════════════════════════════════════════════ */}
            {app.last_issue && (
                <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-2xs flex items-start gap-3.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                        <AlertCircle size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-900">
                            Previously Flagged Discrepancy
                        </p>
                        <p className="mt-1 text-xs text-rose-800 leading-relaxed font-medium">
                            {app.last_issue}
                        </p>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                4. TWO-COLUMN WORKSTATION
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── LEFT COLUMN: APPLICANT & ORDER OF PAYMENT (5 cols) ── */}
                <div className="space-y-6 lg:col-span-5">

                    {/* Applicant & Vehicle Summary Card */}
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <User size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Applicant &amp; Vehicle Unit</h3>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400 font-mono">
                                ID: #{app.id}
                            </span>
                        </div>

                        <div className="p-5 divide-y divide-slate-100 text-xs">
                            <div className="pb-3 flex items-start justify-between gap-2">
                                <div>
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">Operator Name</span>
                                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">{app.operator || '—'}</span>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                                    {app.operator ? app.operator.charAt(0).toUpperCase() : 'O'}
                                </div>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                    <Phone size={13} className="text-slate-400" />
                                    Contact Number
                                </span>
                                <span className="font-semibold text-slate-800 font-mono">{app.contact || '—'}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                    <MapPin size={13} className="text-slate-400" />
                                    TODA Association
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-[#1D2542] border border-indigo-100">
                                    {app.toda || 'Unassigned'}
                                </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                    <Hash size={13} className="text-slate-400" />
                                    Plate / Temp Number
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 font-mono border border-slate-200/60">
                                    {app.plate || '—'}
                                </span>
                            </div>

                            <div className="pt-2.5 flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                    <Bike size={13} className="text-slate-400" />
                                    Vehicle Make &amp; Model
                                </span>
                                <span className="font-semibold text-slate-800">{app.make || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Order of Payment Assessment Breakdown */}
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-700">
                                    <Receipt size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Order of Payment Assessment</h3>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                Municipal Fees
                            </span>
                        </div>

                        <div className="p-5">
                            <div className="space-y-2 mb-4">
                                {(app.fees_breakdown && app.fees_breakdown.length > 0) ? (
                                    app.fees_breakdown.map((fee, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-0">
                                            <span className="text-slate-600 font-medium">{fee.description}</span>
                                            <span className="font-mono font-semibold text-slate-900">₱{Number(fee.amount).toFixed(2)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                                            <span className="text-slate-600 font-medium">MTOP Filing &amp; Processing Fee</span>
                                            <span className="font-mono font-semibold text-slate-900">₱350.00</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                                            <span className="text-slate-600 font-medium">Franchise Sticker &amp; Plate Seal</span>
                                            <span className="font-mono font-semibold text-slate-900">₱250.00</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs py-1.5">
                                            <span className="text-slate-600 font-medium">Supervision &amp; Regulatory Inspection</span>
                                            <span className="font-mono font-semibold text-slate-900">₱150.00</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Total Payable Box */}
                            <div className="rounded-xl bg-slate-50 p-3.5 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Assessed Payable</span>
                                    <span className="text-xs text-slate-400">Municipal Treasurer Target</span>
                                </div>
                                <span className="font-mono font-extrabold text-emerald-700 text-lg sm:text-xl">
                                    ₱{Number(app.total_amount || 750).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── RIGHT COLUMN: OFFICIAL RECEIPT VERIFICATION FORM (7 cols) ── */}
                <div className="lg:col-span-7">
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 sm:px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-700">
                                    <ShieldCheck size={16} strokeWidth={2.4} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Municipal Treasurer Receipt Verification</h2>
                                    <p className="text-[11px] text-slate-500">Record and validate the physical Official Receipt presented by the driver</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6">
                            {/* Explanatory callout */}
                            <div className="mb-5 rounded-xl bg-indigo-50/60 border border-indigo-100 p-3.5 text-xs text-slate-700 flex items-start gap-2.5 leading-relaxed">
                                <Info size={16} className="text-[#1D2542] shrink-0 mt-0.5" />
                                <div>
                                    Inspect the physical <strong>Official Receipt (OR)</strong> and validated <strong>Municipal Payment Ticket</strong> submitted by the applicant. Confirm that the treasurer's stamp, date, and collected amount match municipal treasury records before proceeding.
                                </div>
                            </div>

                            <form onSubmit={handleVerify} className="space-y-4">
                                {/* Official Receipt (OR) Number */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Official Receipt (OR) Number <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={orNumber}
                                            onChange={(e) => setOrNumber(e.target.value)}
                                            placeholder="e.g. OR-2026-98124"
                                            required
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 transition-colors"
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Printed at top-right corner of the official municipal government receipt.
                                    </p>
                                </div>

                                {/* Amount Paid & Date */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                            Amount Paid (PHP) <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">₱</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={amountPaid}
                                                onChange={(e) => setAmountPaid(e.target.value)}
                                                required
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                            Date on Treasurer Receipt <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="date"
                                                value={paymentDate}
                                                onChange={(e) => setPaymentDate(e.target.value)}
                                                required
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Treasurer Counter Remarks */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                        Treasurer Counter Remarks <span className="font-normal text-slate-400 lowercase">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="e.g. Counter 2 OTC validated; paid in cash; original copy verified"
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 transition-colors"
                                    />
                                </div>

                                {/* Action Buttons Group */}
                                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={16} strokeWidth={2.5} />
                                        )}
                                        <span>Confirm Official Receipt &amp; Forward to BPLO</span>
                                        <ArrowRight size={14} className="ml-1 opacity-70" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleFlagIssue}
                                        disabled={isSubmitting}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-50 disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        <AlertTriangle size={15} strokeWidth={2.2} />
                                        <span>Flag Receipt Discrepancy / Payment Issue</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}
