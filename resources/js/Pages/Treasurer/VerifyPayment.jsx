import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
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

export default function VerifyPayment({ paymentId, record }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        action: 'verify',
        official_receipt_number: 'OR-2026-' + Math.floor(100000 + Math.random() * 900000),
        amount: record.amount || 750.00,
        payment_method: 'cash',
        notes: 'Over-the-counter payment received.',
    });

    const handleVerify = (e) => {
        if (e) e.preventDefault();

        if (!data.official_receipt_number) {
            Swal.fire({
                title: 'O.R. Number Required',
                text: 'Please input the physical booklet O.R. Number to confirm payment.',
                icon: 'warning',
                confirmButtonColor: '#1C2340'
            });
            return;
        }

        Swal.fire({
            title: 'Confirm Cash Collection',
            html: `Confirm receipt of <b>₱${Number(data.amount).toFixed(2)}</b>? This will record O.R. Number <b>${data.official_receipt_number}</b> in the database.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Confirm & Issue Receipt',
            customClass: { title: 'font-jakarta', popup: 'font-inter' }
        }).then((result) => {
            if (result.isConfirmed) {
                // Ensure action is verify
                setData('action', 'verify');
                post(`/treasurer/verify/${record.id}`, {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Payment Verified!',
                            text: 'Official Receipt has been recorded.',
                            icon: 'success',
                            confirmButtonColor: '#1C2340',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    const handleReject = () => {
        Swal.fire({
            title: 'Void Payment Request',
            text: "Are you sure you want to void this collection request? The application status will be reset, requiring the operator to re-submit payment details.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Void Collection',
            customClass: { title: 'font-jakarta', popup: 'font-inter' },
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(`/treasurer/verify/${record.id}`, {
                    action: 'reject',
                    amount: data.amount,
                    payment_method: data.payment_method,
                }, {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Collection Voided',
                            text: 'Application returned to pending payment queue.',
                            icon: 'info',
                            confirmButtonColor: '#1C2340',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                });
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
                                <ShieldCheck size={18} color="#4F5BCB" /> Cashier Collection Entry
                            </h3>

                            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8A96BC', marginBottom: 6 }}>Official Receipt (O.R.) Number</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', height: 44, borderRadius: 10, border: '1px solid rgba(28,35,64,.15)', padding: '0 14px', fontSize: 13.5, fontWeight: 600, color: '#1C2340' }}
                                        placeholder="e.g. OR-2026-123456"
                                        value={data.official_receipt_number}
                                        onChange={e => setData('official_receipt_number', e.target.value)}
                                        required
                                    />
                                    {errors.official_receipt_number && (
                                        <p style={{ color: '#DC2626', fontSize: 11, marginTop: 4, fontWeight: 500 }}>{errors.official_receipt_number}</p>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8A96BC', marginBottom: 6 }}>Payment Method</label>
                                        <select
                                            style={{ width: '100%', height: 44, borderRadius: 10, border: '1px solid rgba(28,35,64,.15)', padding: '0 14px', fontSize: 13.5, fontWeight: 600, color: '#1C2340', backgroundColor: '#FFF' }}
                                            value={data.payment_method}
                                            onChange={e => setData('payment_method', e.target.value)}
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="check">Check</option>
                                            <option value="gcash">GCash</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8A96BC', marginBottom: 6 }}>Amount Collected (₱)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            style={{ width: '100%', height: 44, borderRadius: 10, border: '1px solid rgba(28,35,64,.15)', padding: '0 14px', fontSize: 13.5, fontWeight: 600, color: '#1C2340' }}
                                            value={data.amount}
                                            onChange={e => setData('amount', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8A96BC', marginBottom: 6 }}>Collector Remarks</label>
                                    <textarea
                                        rows={3}
                                        style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(28,35,64,.15)', padding: '12px 14px', fontSize: 13.5, fontWeight: 500, color: '#1C2340' }}
                                        placeholder="Add check number, bank details, or counter notes..."
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                    />
                                </div>
                            </form>

                            <div style={{ marginTop: 'auto' }}>
                                <div className="vp-action-zone">
                                    <Link
                                        href="/treasurer/pending"
                                        className="vp-btn vp-btn-reject"
                                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <XCircle size={16} strokeWidth={2.5} />
                                        Cancel
                                    </Link>

                                    <button
                                        type="button"
                                        className="vp-btn vp-btn-approve"
                                        onClick={handleVerify}
                                        disabled={processing}
                                    >
                                        {processing
                                            ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                                            : <CheckCircle2 size={16} strokeWidth={2.5} />
                                        }
                                        Confirm & Issue OR
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