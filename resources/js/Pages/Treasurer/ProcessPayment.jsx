import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import {
    ChevronLeft, Receipt, User, CheckCircle2,
    Banknote, Store, Loader2, AlertCircle
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Process Cash Payment (OTC POS)
   Path: resources/js/Pages/Treasurer/ProcessPayment.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&family=Courier+Prime:wght@400;700&display=swap');

.vp-root {
  font-family: 'Inter', sans-serif; color: #1C2340;
  max-width: 1000px; margin: 0 auto; padding-bottom: 64px;
}
.vp-root *, .vp-root *::before, .vp-root *::after { box-sizing: border-box; }

/* ── Back nav ── */
.vp-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.vp-back-link {
  display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none; transition: color .18s;
}
.vp-back-link:hover { color: #1C2340; }

.vp-status-badge {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase; border-radius: 50px; padding: 6px 16px;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(217,119,6,.1); color: #B45309; border: 1px solid rgba(217,119,6,.2);
}

/* ── Layout Grid ── */
.vp-grid { display: grid; grid-template-columns: 1fr 480px; gap: 24px; }
@media (max-width: 960px) { .vp-grid { grid-template-columns: 1fr; } }

/* ── Card ── */
.vp-card {
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 18px; box-shadow: 0 1px 6px rgba(28,35,64,.03);
}
.vp-card-pad { padding: 32px; }
.vp-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340; margin-bottom: 24px;
  display: flex; align-items: center; gap: 10px;
}

/* ── Cashier Info Section ── */
.vp-pos-box { background: #FAFAFC; border: 1px solid rgba(28,35,64,.06); border-radius: 14px; padding: 24px; }
.vp-pos-alert {
  background: rgba(79,91,203,.05); border: 1px solid rgba(79,91,203,.15);
  border-radius: 10px; padding: 14px 16px; margin-top: 20px;
  display: flex; gap: 12px; align-items: flex-start;
}
.vp-pos-alert-icon { color: #4F5BCB; flex-shrink: 0; margin-top: 2px; }
.vp-pos-alert-text { font-family: 'Inter', sans-serif; font-size: 12px; color: #3A4570; line-height: 1.5; font-weight: 500; }

/* ── Detailed Fee Breakdown ── */
.vp-fee-list { display: flex; flex-direction: column; border-top: 1px solid rgba(28,35,64,.08); margin-bottom: 24px; }
.vp-fee-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid rgba(28,35,64,.06); }
.vp-fee-info { display: flex; flex-direction: column; gap: 4px; }
.vp-fee-name { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600; color: #1C2340; }
.vp-fee-code { font-family: 'Courier Prime', monospace; font-size: 11px; font-weight: 700; color: #8A96BC; }
.vp-fee-amt { font-family: 'Courier Prime', monospace; font-size: 15px; font-weight: 700; color: #1C2340; text-align: right; }

.vp-fee-total { display: flex; justify-content: space-between; align-items: center; padding: 24px 0 10px; }
.vp-total-lbl { font-family: 'DM Sans', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #1C2340; }
.vp-total-amt { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 34px; font-weight: 800; color: #059669; letter-spacing: -.02em; }

/* ── Actions ── */
.vp-btn-approve {
  width: 100%; height: 58px; border-radius: 12px;
  border: none; background: #059669; color: #FFFFFF; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all .2s; box-shadow: 0 4px 14px rgba(5,150,105,.25);
}
.vp-btn-approve:hover:not(:disabled) { background: #047857; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(5,150,105,.3); }
.vp-btn-approve:disabled { opacity: .6; cursor: default; transform: none; box-shadow: none; }
`;

export default function ProcessPayment({ applicationId = 'APP-2026-0418' }) {
    const [isProcessing, setIsProcessing] = useState(false);

    // Synced with Receipt.jsx New Franchise Application mock data
    const transaction = {
        id: 'TXN-003',
        app_id: applicationId,
        operator: 'Ricardo Dalisay',
        toda: 'TODA D (Papaya)',
        type: 'New Franchise Application',
        ref_no: 'TRV-88210',
        fees: [
            { name: 'Application & Filing Fee', code: 'ACC-40201010', amt: 250.00 },
            { name: 'Police Clearance / OR from LGU', code: 'ACC-40201020', amt: 150.00 },
            { name: 'Health Certificate', code: 'ACC-40201030', amt: 55.00 },
            { name: 'Cedula', code: 'ACC-40201040', amt: 40.00 },
            { name: 'IoT Tracking Device (GPS Unit)', code: 'ACC-40201050', amt: 500.00 },
        ]
    };

    const total = transaction.fees.reduce((acc, curr) => acc + curr.amt, 0);

    const handleCashReceived = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            alert(`Payment of ₱${total.toFixed(2)} received successfully! System updated and e-OR generated.`);
            // Redirect to dashboard (or directly to the receipt view if preferred)
            window.location.href = '/treasurer/dashboard';
        }, 1500);
    };

    return (
        <TreasurerLayout title="Process OTC Payment">
            <Head title={`Process Payment | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="vp-root">

                <div className="vp-nav">
                    <Link href="/treasurer/dashboard" className="vp-back-link">
                        <ChevronLeft size={14} strokeWidth={3} />
                        Back to Queue
                    </Link>
                    <span className="vp-status-badge">
                        <AlertCircle size={11} strokeWidth={2.5}/> Awaiting Walk-in Cash
                    </span>
                </div>

                <div className="vp-grid">

                    {/* ════ LEFT: POS Information ════ */}
                    <div className="vp-card">
                        <div className="vp-card-pad">
                            <h2 className="vp-card-title">
                                <Store size={20} color="#4F5BCB" />
                                OTC Point of Sale
                            </h2>

                            <div className="vp-pos-box">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F5BCB', border: '1px solid rgba(28,35,64,.08)' }}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: '#1C2340', lineHeight: 1, marginBottom: 4 }}>{transaction.operator}</p>
                                        <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#8A96BC', textTransform: 'uppercase', letterSpacing: '.05em' }}>{transaction.app_id}</p>
                                    </div>
                                </div>
                                <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#5A6488', fontWeight: 500, lineHeight: 1.5 }}>
                                    This operator selected <strong>Walk-in (Cash)</strong> for their <strong>{transaction.type}</strong>. Verify the system reference number <strong>{transaction.ref_no}</strong> before accepting payment.
                                </p>
                            </div>

                            <div className="vp-pos-alert">
                                <CheckCircle2 size={16} className="vp-pos-alert-icon" />
                                <p className="vp-pos-alert-text">
                                    Clicking "Confirm Cash Received" will automatically generate the digital Official Receipt (e-OR) and forward the application to BPLO for releasing.
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* ════ RIGHT: Fee Breakdown & Checkout ════ */}
                    <div className="vp-card">
                        <div className="vp-card-pad" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                            <h2 className="vp-card-title">
                                <Receipt size={20} color="#1C2340" />
                                Payment Breakdown
                            </h2>

                            <div className="vp-fee-list">
                                {transaction.fees.map((fee, idx) => (
                                    <div className="vp-fee-row" key={idx}>
                                        <div className="vp-fee-info">
                                            <span className="vp-fee-name">{fee.name}</span>
                                            <span className="vp-fee-code">{fee.code}</span>
                                        </div>
                                        <span className="vp-fee-amt">₱{fee.amt.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="vp-fee-total">
                                    <span className="vp-total-lbl">Cash to Collect</span>
                                    <span className="vp-total-amt">₱{total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div style={{ marginTop: 'auto' }}>
                                <button
                                    className="vp-btn-approve"
                                    onClick={handleCashReceived}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={18} strokeWidth={2.5} />}
                                    Confirm Cash Received
                                </button>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </TreasurerLayout>
    );
}