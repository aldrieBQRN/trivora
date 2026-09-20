import React from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { BackLink, Button } from '@/Components/TMO';
import {
    Printer,
    Download,
    CheckCircle2,
    Building2
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across TMODashboard, so this
// panel reads as one consistent product rather than a different template. The print stylesheet
// below already strips box-shadow/border from .rc-paper on print, so this only affects screen view.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  .rc-paper, .rc-paper * { visibility: visible; }
  .rc-paper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; padding: 0; }
  .rc-nav { display: none; }
}
`;

function Row({ label, children, valueClassName = '' }) {
    return (
        <div className="mb-4 flex items-start justify-between gap-4 last:mb-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
            <span className={`max-w-[60%] text-right text-[13px] font-semibold leading-relaxed text-slate-900 ${valueClassName}`}>{children}</span>
        </div>
    );
}

const Divider = () => (
    <div className="my-8 h-px" style={{ backgroundImage: 'repeating-linear-gradient(to right, rgba(28,35,64,.15) 0, rgba(28,35,64,.15) 6px, transparent 6px, transparent 12px)' }} />
);

export default function Receipt({ receipt: payment, auth }) {
    const operatorName = auth?.user?.name || 'Driver';

    const receipt = {
        orNumber: payment.or_number,
        paymentDate: payment.date,
        paymentTime: payment.time,
        referenceId: payment.id,
        operatorName: payment.operator,
        unit: `${payment.unit} (${payment.plate_no})`,
        description: payment.notes,
        paymentMethod: payment.method,
        gatewayRef: payment.or_number,
        amount: payment.amount,
        processingFee: 0.00
    };

    const totalAmount = receipt.amount + receipt.processingFee;

    const handlePrint = () => {
        window.print();
    };

    return (
        <OperatorLayout title="Official Receipt" operatorName={operatorName}>
            <Head title={`Receipt ${receipt.orNumber} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

            <div className="mx-auto max-w-[680px] pb-10">
                <div className="rc-nav mb-6 flex items-center justify-between">
                    <BackLink href={route('operator.payments')}>Back to Payment History</BackLink>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" icon={Printer} onClick={handlePrint}>Print</Button>
                        <Button variant="secondary" size="sm" icon={Download}>PDF</Button>
                    </div>
                </div>

                <div className={`rc-paper relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-8 ${CARD_SHADOW} sm:p-12`}>
                    <div
                        className="pointer-events-none absolute inset-0 opacity-60"
                        style={{ backgroundImage: 'radial-gradient(circle, rgba(29,37,66,.04) 2px, transparent 2px)', backgroundSize: '24px 24px' }}
                    />

                    <div className="relative z-10">
                        <div className="mb-10 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Building2 size={24} strokeWidth={1.5} />
                            </div>
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Republika ng Pilipinas</p>
                            <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">Municipality of Nasugbu</h2>
                            <p className="mb-6 text-[11px] text-slate-500">Traffic Management Office (TMO)</p>

                            <h1 className="flex items-center justify-center gap-2 text-xl font-extrabold tracking-tight text-emerald-600">
                                <CheckCircle2 size={22} strokeWidth={2.5} /> Official E-Receipt
                            </h1>
                        </div>

                        <Row label="O.R. Number" valueClassName="text-base font-extrabold">{receipt.orNumber}</Row>
                        <Row label="Date Issued">{receipt.paymentDate} &bull; {receipt.paymentTime}</Row>
                        <Row label="Received From" valueClassName="uppercase">{receipt.operatorName}</Row>

                        <Divider />

                        <Row label="Reference ID" valueClassName="font-extrabold">{receipt.referenceId}</Row>
                        <Row label="Unit Involved">{receipt.unit}</Row>
                        <Row label="Description">{receipt.description}</Row>

                        <Divider />

                        <Row label="Payment Method">{receipt.paymentMethod}</Row>
                        <Row label="Gateway Ref No." valueClassName="font-mono text-[11px]">{receipt.gatewayRef}</Row>

                        <div className="mt-8 rounded-xl bg-slate-50 p-6">
                            <Row label="Principal Amount">₱{receipt.amount.toFixed(2)}</Row>
                            <div className="mt-3">
                                <Row label="Convenience Fee">₱{receipt.processingFee.toFixed(2)}</Row>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-900">Total Paid</span>
                                <span className="text-2xl font-extrabold tracking-tight text-emerald-600">₱{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-10 text-center">
                            <p className="text-[11px] leading-relaxed text-slate-400">
                                This is a system-generated electronic receipt.<br />
                                TRIVORA Fleet Operations System &bull; Valid for official municipal records.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </OperatorLayout>
    );
}
