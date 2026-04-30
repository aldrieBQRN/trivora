import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import Swal from 'sweetalert2';
import {
    ChevronLeft, CheckCircle2, XCircle, CreditCard,
    User, Hash, MapPin, Receipt, Clock,
    Loader2, ShieldCheck, Activity
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Verify Pending Online Payment
   Prefix: vp-* (verify-payment)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.vp-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 52px;
}
.vp-root *, .vp-root *::before, .vp-root *::after { box-sizing: border-box; }

/* ── Back Nav ── */
.vp-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 32px;
}
.vp-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  transition: color .18s;
}
.vp-back-link:hover { color: #1C2340; }
.vp-status-badge {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 800;
  letter-spacing: .13em; text-transform: uppercase;
  color: #D97706; background: rgba(245,158,11,.1);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 50px; padding: 5px 14px;
  display: inline-flex; align-items: center; gap: 6px;
}

/* ── Header ── */
.vp-header { margin-bottom: 32px; }
.vp-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #059669; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.vp-eyebrow::before {
  content: ''; width: 18px; height: 1.5px; background: #059669; border-radius: 2px;
}
.vp-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1; margin-bottom: 8px;
}
.vp-subtitle { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: #5A6488; }

/* ── Grid ── */
.vp-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
@media (min-width: 1024px) { .vp-grid { grid-template-columns: 360px 1fr; } }

/* ── Shared Card ── */
.vp-card {
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 18px; box-shadow: 0 1px 6px rgba(28,35,64,.05);
  overflow: hidden; display: flex; flex-direction: column;
}
.vp-card-pad { padding: 32px; }

/* ── Details Panel (Left) ── */
.vp-detail-group { margin-bottom: 32px; }
.vp-detail-group:last-child { margin-bottom: 0; }
.vp-group-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800;
  color: #1C2340; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
}
.vp-detail-row {
  display: flex; align-items: flex-start; gap: 16px;
  padding-bottom: 16px; margin-bottom: 16px;
  border-bottom: 1px solid rgba(28,35,64,.05);
}
.vp-detail-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.vp-detail-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(28,35,64,.03); border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  color: #5A6488; flex-shrink: 0;
}
.vp-detail-lbl {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #8A96BC;
  margin-bottom: 4px;
}
.vp-detail-val {
  font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1.4;
}
.vp-amount {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 800;
  letter-spacing: -.02em; color: #059669;
}
.vp-ref-badge {
  display: inline-block; background: rgba(79,91,203,.08); color: #4F5BCB;
  padding: 4px 10px; border-radius: 6px; font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 800; letter-spacing: .1em; margin-top: 6px;
}

/* ── Gateway Status Panel (Right) ── */
.vp-gateway-box {
  background: #F8F9FC; border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px; padding: 32px; margin-bottom: 24px;
}
.vp-gw-head {
  display: flex; align-items: center; gap: 14px; margin-bottom: 24px;
  padding-bottom: 24px; border-bottom: 1px solid rgba(28,35,64,.08);
}
.vp-gw-icon {
  width: 48px; height: 48px; border-radius: 12px; background: #1C2340; color: #FFFFFF;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(28,35,64,.15);
}
.vp-gw-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #1C2340; }
.vp-gw-sub { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-top: 4px; }

.vp-gw-log { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 10px; padding: 16px; }
.vp-log-item { display: flex; justify-content: space-between; font-family: 'Inter', monospace; font-size: 12px; color: #5A6488; margin-bottom: 12px; }
.vp-log-item:last-child { margin-bottom: 0; }
.vp-log-item span:last-child { font-weight: 600; color: #1C2340; text-align: right; }
.vp-log-success { color: #059669 !important; }

/* ── Action Buttons ── */
.vp-action-zone {
  display: grid; grid-template-columns: 1fr 1.5fr; gap: 16px;
  padding-top: 24px; border-top: 1px solid rgba(28,35,64,.08);
}
@media (max-width: 640px) { .vp-action-zone { grid-template-columns: 1fr; } }
.vp-btn {
  height: 54px; border-radius: 12px; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all .2s;
}
.vp-btn-reject {
  background: #FFFFFF; border: 1.5px solid rgba(220,38,38,.25); color: #DC2626;
}
.vp-btn-reject:hover:not(:disabled) {
  background: rgba(220,38,38,.05); border-color: #DC2626;
}
.vp-btn-approve {
  background: #059669; color: #FFFFFF; box-shadow: 0 4px 14px rgba(5,150,105,.25);
}
.vp-btn-approve:hover:not(:disabled) {
  background: #047857; box-shadow: 0 6px 20px rgba(5,150,105,.3); transform: translateY(-1px);
}
.vp-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
`;

export default function VerifyPayment({ paymentId = 'TXN-2026-0994' }) {
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock data for the online payment
    const record = {
        id: paymentId,
        appId: 'APP-2026-0622',
        driver: 'Mario Dela Cruz',
        toda: 'TODA A (Poblacion)',
        type: 'New Franchise Application Fee',
        amount: 515.00,
        method: 'GCash WebPay API',
        refNo: 'pay_mc12345_auth',
        date: 'April 6, 2026 - 10:15 AM',
        gatewayStatus: 'AUTHORIZED'
    };

    const handleVerify = () => {
        Swal.fire({
            title: 'Confirm Payment',
            html: `Capture funds and confirm <b>₱${record.amount.toFixed(2)}</b> for reference <b>${record.refNo}</b>? This will generate the Official Receipt.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Confirm & Issue Receipt',
            customClass: { title: 'font-jakarta', popup: 'font-inter' }
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);
                setTimeout(() => {
                    setIsProcessing(false);
                    Swal.fire({
                        title: 'Payment Verified!',
                        text: 'Official Receipt has been generated and sent to the driver.',
                        icon: 'success',
                        confirmButtonColor: '#1C2340',
                        timer: 2500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = '/treasurer/pending'; // Route back to pending list
                    });
                }, 1500);
            }
        });
    };

    const handleReject = () => {
        Swal.fire({
            title: 'Reject Payment',
            text: "Are you sure you want to reject this online payment? The authorization will be voided.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Void Payment',
            customClass: { title: 'font-jakarta', popup: 'font-inter' },
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);
                setTimeout(() => {
                    setIsProcessing(false);
                    Swal.fire({
                        title: 'Payment Voided',
                        text: 'The transaction has been cancelled. The driver has been notified.',
                        icon: 'info',
                        confirmButtonColor: '#1C2340',
                        timer: 2500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = '/treasurer/pending';
                    });
                }, 1200);
            }
        });
    };

    return (
        <TreasurerLayout title="Verify Payment" treasurerName="Maria Santos">
            <Head title={`Verify ${record.id} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="vp-root">
                {/* ── Nav ── */}
                <div className="vp-nav">
                    <Link href="/treasurer/pending" className="vp-back-link">
                        <ChevronLeft size={14} strokeWidth={3} />
                        Back to Pending Queue
                    </Link>
                    <span className="vp-status-badge">
                        <Clock size={11} strokeWidth={2.5}/> Requires Action
                    </span>
                </div>

                {/* ── Header ── */}
                <div className="vp-header">
                    <p className="vp-eyebrow">Payment Verification</p>
                    <h1 className="vp-title">Transaction {record.id}</h1>
                    <p className="vp-subtitle">Review the online payment gateway authorization before finalizing the transaction.</p>
                </div>

                <div className="vp-grid">
                    {/* ════ LEFT: Payment & Applicant Details ════ */}
                    <div className="vp-card">
                        <div className="vp-card-pad">

                            <div className="vp-detail-group">
                                <h3 className="vp-group-title"><Receipt size={18} color="#4F5BCB" /> Payment Details</h3>

                                <div className="vp-detail-row">
                                    <div className="vp-detail-icon"><CreditCard size={18} /></div>
                                    <div>
                                        <p className="vp-detail-lbl">Amount & Method</p>
                                        <p className="vp-amount">₱{record.amount.toFixed(2)}</p>
                                        <p className="vp-detail-val" style={{ marginTop: 4, color: '#5A6488' }}>{record.method}</p>
                                    </div>
                                </div>

                                <div className="vp-detail-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                    <div className="vp-detail-icon"><Clock size={18} /></div>
                                    <div>
                                        <p className="vp-detail-lbl">Date Authorized</p>
                                        <p className="vp-detail-val">{record.date}</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'rgba(28,35,64,.08)', margin: '32px 0' }} />

                            <div className="vp-detail-group" style={{ marginBottom: 0 }}>
                                <h3 className="vp-group-title"><User size={18} color="#4F5BCB" /> Payer Information</h3>

                                <div className="vp-detail-row">
                                    <div className="vp-detail-icon"><User size={18} /></div>
                                    <div>
                                        <p className="vp-detail-lbl">Tricycle Driver</p>
                                        <p className="vp-detail-val">{record.driver}</p>
                                    </div>
                                </div>

                                <div className="vp-detail-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                    <div className="vp-detail-icon"><MapPin size={18} /></div>
                                    <div>
                                        <p className="vp-detail-lbl">Application / TODA</p>
                                        <p className="vp-detail-val">{record.appId}</p>
                                        <p className="vp-detail-val" style={{ fontSize: 11, color: '#8A96BC', marginTop: 4 }}>{record.toda}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ════ RIGHT: Gateway Verifier & Actions ════ */}
                    <div className="vp-card">
                        <div className="vp-card-pad" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                            <h3 className="vp-group-title" style={{ marginBottom: 16 }}>
                                <ShieldCheck size={18} color="#4F5BCB" /> Online Gateway Verification
                            </h3>

                            <div className="vp-gateway-box">
                                <div className="vp-gw-head">
                                    <div className="vp-gw-icon"><Activity size={24} /></div>
                                    <div>
                                        <p className="vp-gw-title">Gateway API Response</p>
                                        <p className="vp-gw-sub">Real-time webhook data</p>
                                    </div>
                                </div>

                                <div className="vp-gw-log">
                                    <div className="vp-log-item">
                                        <span>Reference No.</span>
                                        <span>{record.refNo}</span>
                                    </div>
                                    <div className="vp-log-item">
                                        <span>Authorization</span>
                                        <span className="vp-log-success">SUCCESS</span>
                                    </div>
                                    <div className="vp-log-item">
                                        <span>Amount Held</span>
                                        <span>PHP {record.amount.toFixed(2)}</span>
                                    </div>
                                    <div className="vp-log-item">
                                        <span>Current Status</span>
                                        <span className="vp-log-success">{record.gatewayStatus}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto' }}>
                                <div className="vp-action-zone">
                                    <button
                                        className="vp-btn vp-btn-reject"
                                        onClick={handleReject}
                                        disabled={isProcessing}
                                    >
                                        <XCircle size={16} strokeWidth={2.5} />
                                        Void Request
                                    </button>

                                    <button
                                        className="vp-btn vp-btn-approve"
                                        onClick={handleVerify}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing
                                            ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                                            : <CheckCircle2 size={16} strokeWidth={2.5} />
                                        }
                                        Confirm & Issue Receipt
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </TreasurerLayout>
    );
}