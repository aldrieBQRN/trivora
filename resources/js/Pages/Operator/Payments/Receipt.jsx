import React from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    ChevronLeft,
    Printer,
    Download,
    CheckCircle2,
    Building2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Official Receipt
   Path: resources/js/Pages/Operator/Payments/Receipt.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.rc-root { font-family: 'Inter', sans-serif; color: #1C2340; max-width: 680px; margin: 0 auto; padding-bottom: 64px; }
.rc-root *, .rc-root *::before, .rc-root *::after { box-sizing: border-box; }

.rc-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.rc-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: #8A96BC; text-decoration: none;
  transition: color .2s;
}
.rc-back-link:hover { color: #1C2340; }

.rc-actions { display: flex; gap: 12px; }
.rc-action-btn {
  display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px;
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.15); border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; color: #5A6488; cursor: pointer; transition: all .2s;
}
.rc-action-btn:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.3); }

/* The Paper Receipt */
.rc-paper {
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px; box-shadow: 0 12px 32px rgba(28,35,64,.04);
  padding: 48px; position: relative; overflow: hidden;
}

/* Watermark */
.rc-paper::before {
  content: ''; position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(79,91,203,.03) 2px, transparent 2px);
  background-size: 24px 24px; pointer-events: none; z-index: 0;
}

.rc-content { position: relative; z-index: 10; }

/* Municipal Header */
.rc-header { text-align: center; margin-bottom: 40px; }
.rc-muni-logo { width: 56px; height: 56px; background: #F2F4FA; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #4F5BCB; margin-bottom: 16px; }
.rc-repub { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #8A96BC; margin-bottom: 4px; }
.rc-muni { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #1C2340; text-transform: uppercase; letter-spacing: .05em; line-height: 1.2; }
.rc-office { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500; color: #5A6488; margin-bottom: 24px; }
.rc-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; color: #059669; letter-spacing: -.02em; display: flex; align-items: center; justify-content: center; gap: 8px; }

.rc-divider { height: 1px; background: repeating-linear-gradient(to right, rgba(28,35,64,.15) 0, rgba(28,35,64,.15) 6px, transparent 6px, transparent 12px); margin: 32px 0; }

/* Key Value Rows */
.rc-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.rc-row:last-child { margin-bottom: 0; }
.rc-label { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; }
.rc-value { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #1C2340; text-align: right; max-width: 60%; line-height: 1.5; }
.rc-value-lg { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #1C2340; }

/* Breakdown Area */
.rc-breakdown { background: #FAFAFC; border-radius: 12px; padding: 24px; border: 1px solid rgba(28,35,64,.05); margin-top: 32px; }
.rc-total-row { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(28,35,64,.1); }
.rc-total-label { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: #1C2340; }
.rc-total-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #059669; letter-spacing: -.02em; }

.rc-footer { text-align: center; margin-top: 40px; }
.rc-footer-text { font-family: 'Inter', sans-serif; font-size: 11px; color: #8A96BC; line-height: 1.6; }

/* Print Styles */
@media print {
  body * { visibility: hidden; }
  .rc-paper, .rc-paper * { visibility: visible; }
  .rc-paper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; padding: 0; }
  .rc-nav { display: none; }
}
`;

export default function Receipt({ receipt: payment, auth }) {
    const operatorName = auth?.user?.name || "Driver";

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
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="rc-root">
                {/* Top Navigation & Actions */}
                <div className="rc-nav">
                    {/* 👇 Updated Link to go to Payment History 👇 */}
                    <Link href={route('operator.payments')} className="rc-back-link">
                        <ChevronLeft size={14} strokeWidth={3} /> Back to Payment History
                    </Link>

                    <div className="rc-actions">
                        <button className="rc-action-btn" onClick={handlePrint}>
                            <Printer size={14} strokeWidth={2} /> Print
                        </button>
                        <button className="rc-action-btn">
                            <Download size={14} strokeWidth={2} /> PDF
                        </button>
                    </div>
                </div>

                {/* The Paper Receipt Component */}
                <div className="rc-paper">
                    <div className="rc-content">

                        {/* Header */}
                        <div className="rc-header">
                            <div className="rc-muni-logo">
                                <Building2 size={24} strokeWidth={1.5} />
                            </div>
                            <p className="rc-repub">Republika ng Pilipinas</p>
                            <h2 className="rc-muni">Municipality of Nasugbu</h2>
                            <p className="rc-office">Traffic Management Office (TMO)</p>

                            <h1 className="rc-title">
                                <CheckCircle2 size={24} strokeWidth={2.5} /> OFFICIAL E-RECEIPT
                            </h1>
                        </div>

                        {/* Transaction Info */}
                        <div className="rc-row">
                            <span className="rc-label">O.R. Number</span>
                            <span className="rc-value-lg">{receipt.orNumber}</span>
                        </div>
                        <div className="rc-row">
                            <span className="rc-label">Date Issued</span>
                            <span className="rc-value">{receipt.paymentDate} • {receipt.paymentTime}</span>
                        </div>
                        <div className="rc-row">
                            <span className="rc-label">Received From</span>
                            <span className="rc-value" style={{ textTransform: 'uppercase' }}>{receipt.operatorName}</span>
                        </div>

                        <div className="rc-divider" />

                        {/* Payment Description Info */}
                        <div className="rc-row">
                            <span className="rc-label">Reference ID</span>
                            <span className="rc-value" style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800 }}>{receipt.referenceId}</span>
                        </div>
                        <div className="rc-row">
                            <span className="rc-label">Unit Involved</span>
                            <span className="rc-value">{receipt.unit}</span>
                        </div>
                        <div className="rc-row">
                            <span className="rc-label">Description</span>
                            <span className="rc-value">{receipt.description}</span>
                        </div>

                        <div className="rc-divider" />

                        {/* Payment Breakdown */}
                        <div className="rc-row">
                            <span className="rc-label">Payment Method</span>
                            <span className="rc-value">{receipt.paymentMethod}</span>
                        </div>
                        <div className="rc-row">
                            <span className="rc-label">Gateway Ref No.</span>
                            <span className="rc-value" style={{ fontSize: 11, fontFamily: 'monospace' }}>{receipt.gatewayRef}</span>
                        </div>

                        <div className="rc-breakdown">
                            <div className="rc-row">
                                <span className="rc-label" style={{ color: '#5A6488' }}>Principal Amount</span>
                                <span className="rc-value">₱{receipt.amount.toFixed(2)}</span>
                            </div>
                            <div className="rc-row" style={{ marginTop: 12 }}>
                                <span className="rc-label" style={{ color: '#5A6488' }}>Convenience Fee</span>
                                <span className="rc-value">₱{receipt.processingFee.toFixed(2)}</span>
                            </div>

                            <div className="rc-total-row">
                                <span className="rc-total-label">Total Paid</span>
                                <span className="rc-total-value">₱{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="rc-footer">
                            <p className="rc-footer-text">
                                This is a system-generated electronic receipt.<br/>
                                TRIVORA Fleet Operations System • Valid for official municipal records.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </OperatorLayout>
    );
}