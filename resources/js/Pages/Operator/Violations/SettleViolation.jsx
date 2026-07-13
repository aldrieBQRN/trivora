import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    ChevronLeft,
    CheckCircle2,
    Wallet,
    Smartphone,
    CreditCard,
    ShieldCheck,
    Loader2,
    Calendar,
    MapPin,
    Bike,
    Activity,
    ArrowRight
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Settle Violation
   Path: resources/js/Pages/Operator/Violations/SettleViolation.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.sv-root { font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 64px; }
.sv-root *, .sv-root *::before, .sv-root *::after { box-sizing: border-box; }

.sv-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.sv-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: #8A96BC; text-decoration: none;
  transition: color .2s;
}
.sv-back-link:hover { color: #1C2340; }

.sv-header { margin-bottom: 32px; }
.sv-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; margin-bottom: 8px; }
.sv-subtitle { font-family: 'Inter', sans-serif; font-size: 13.5px; color: #5A6488; }

.sv-card {
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 20px; box-shadow: 0 4px 20px rgba(28,35,64,.03);
  padding: 40px; margin-bottom: 24px;
}

/* ── Two Column Desktop Layout ── */
.sv-split-layout { display: flex; flex-direction: column; gap: 40px; }
@media (min-width: 1024px) {
  .sv-split-layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 56px; align-items: start; }
}

/* ── Left Column: Violation Summary ── */
.sv-summary { background: #FAFAFC; border: 1px solid rgba(28,35,64,.06); border-radius: 16px; padding: 32px; height: 100%; }
.sv-summary-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px dashed rgba(28,35,64,.1); }
.sv-iot-tag { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; background: #EEF2FF; color: #4F5BCB; border-radius: 6px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
.sv-summary-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
@media (min-width: 640px) { .sv-summary-grid { grid-template-columns: 1fr 1fr; } }
.sv-summary-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8A96BC; margin-bottom: 6px; }
.sv-summary-value { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; color: #1C2340; display: flex; align-items: center; gap: 8px; }
.sv-summary-icon { padding: 8px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.05); border-radius: 8px; color: #4F5BCB; display: flex; align-items: center; justify-content: center; }

/* ── Right Column: Payment & Fees ── */
.sv-section-title { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #5A6488; margin-bottom: 16px; }

.sv-fee-box { background: #FFFFFF; border: 1.5px solid rgba(28,35,64,.1); border-radius: 14px; overflow: hidden; margin-bottom: 32px; }
.sv-fee-row { display: flex; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid rgba(28,35,64,.06); }
.sv-fee-total { background: #1C2340; display: flex; justify-content: space-between; padding: 24px; color: #FFFFFF; align-items: center; }

.sv-pay-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 40px; }
.sv-pay-method {
  display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px 12px;
  border-radius: 14px; border: 1.5px solid rgba(28,35,64,.12); background: #FFFFFF; cursor: pointer; transition: all .18s;
}
.sv-pay-method:hover { border-color: rgba(79,91,203,.4); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(28,35,64,.05); }
.sv-pay-method.active { border-color: #1C2340; background: #F8F9FC; box-shadow: 0 4px 16px rgba(28,35,64,.1); transform: translateY(-2px); }

/* Buttons */
.sv-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(28,35,64,.08); padding-top: 32px; margin-top: 24px; }
.sv-btn-primary {
  height: 56px; padding: 0 40px; border-radius: 12px; background: #059669; color: #FFFFFF;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; border: none;
  cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(5,150,105,.25);
}
.sv-btn-primary:hover:not(:disabled) { background: #047857; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(5,150,105,.3); }
.sv-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
.sv-btn-secondary {
  height: 56px; padding: 0 32px; border-radius: 12px; border: 1.5px solid rgba(28,35,64,.15); background: #FFFFFF;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: #5A6488; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; transition: all .2s;
}
.sv-btn-secondary:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.3); }

/* Success State */
.sv-success-card { text-align: center; padding: 80px 40px; animation: svFadeUp 0.6s ease both; display: flex; flex-direction: column; align-items: center; }
@keyframes svFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.sv-success-icon { width: 96px; height: 96px; border-radius: 50%; background: rgba(5,150,105,.08); border: 2px solid rgba(5,150,105,.2); display: flex; align-items: center; justify-content: center; color: #059669; margin: 0 auto 32px; }
`;

export default function SettleViolation({ violation, auth }) {
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const operatorName = auth?.user?.name || "Driver";

    const totalAmount = violation.fine + violation.processingFee;

    const handlePayment = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
        }, 2000);
    };

    return (
        <OperatorLayout title="Settle Fine" operatorName={operatorName}>
            <Head title="Settle Violation | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="sv-root">
                {!isSuccess && (
                    <>
                        <div className="sv-nav">
                            <Link href={route('operator.violations')} className="sv-back-link">
                                <ChevronLeft size={14} strokeWidth={3} /> Back to Records
                            </Link>
                        </div>
                        <div className="sv-header">
                            <h1 className="sv-title">Settle Violation Fine</h1>
                            <p className="sv-subtitle">Review the details of your offense and select a payment method to clear this record instantly.</p>
                        </div>
                    </>
                )}

                {!isSuccess ? (
                    <div className="sv-card">
                        <div className="sv-split-layout">

                            {/* ── LEFT COLUMN: VIOLATION DETAILS ── */}
                            <div>
                                <div className="sv-summary">
                                    <div className="sv-summary-header">
                                        <div>
                                            <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#8A96BC', letterSpacing: '.1em', marginBottom: 6 }}>TICKET ID: <span style={{color: '#1C2340'}}>{violation.id}</span></p>
                                            <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 800, color: '#1C2340', lineHeight: 1.2 }}>{violation.type}</p>
                                        </div>
                                        <span className="sv-iot-tag"><Activity size={12} strokeWidth={2.5}/> IoT Detected</span>
                                    </div>

                                    <div className="sv-summary-grid">
                                        <div>
                                            <p className="sv-summary-label">Date & Time</p>
                                            <div className="sv-summary-value">
                                                <div className="sv-summary-icon"><Calendar size={16}/></div>
                                                <div>
                                                    <span style={{display: 'block'}}>{violation.date}</span>
                                                    <span style={{fontSize: 12, color: '#5A6488', fontWeight: 500}}>{violation.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="sv-summary-label">Detected Location</p>
                                            <div className="sv-summary-value">
                                                <div className="sv-summary-icon"><MapPin size={16}/></div>
                                                <span>{violation.location}</span>
                                            </div>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p className="sv-summary-label">Tricycle Unit Involved</p>
                                            <div className="sv-summary-value">
                                                <div className="sv-summary-icon"><Bike size={16}/></div>
                                                <span style={{ fontSize: 16, fontWeight: 700 }}>{violation.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── RIGHT COLUMN: PAYMENT & FEES ── */}
                            <div>
                                <p className="sv-section-title">Payment Breakdown</p>
                                <div className="sv-fee-box">
                                    <div className="sv-fee-row">
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#5A6488' }}>Standard Municipal Penalty</span>
                                        <span style={{ fontSize: 14, fontWeight: 700 }}>₱{violation.fine.toFixed(2)}</span>
                                    </div>
                                    <div className="sv-fee-row">
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#5A6488' }}>Online Processing Fee</span>
                                        <span style={{ fontSize: 14, fontWeight: 700 }}>₱{violation.processingFee.toFixed(2)}</span>
                                    </div>
                                    <div className="sv-fee-total">
                                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.7 }}>Total Due</span>
                                        <span style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 32, fontWeight: 800, letterSpacing: '-.02em' }}>₱{totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <p className="sv-section-title">Select Payment Method</p>
                                <div className="sv-pay-grid">
                                    <div className={`sv-pay-method ${paymentMethod === 'gcash' ? 'active' : ''}`} onClick={() => setPaymentMethod('gcash')}>
                                        <Smartphone size={28} strokeWidth={1.5} color={paymentMethod === 'gcash' ? '#1C2340' : '#8A96BC'} />
                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: paymentMethod === 'gcash' ? '#1C2340' : '#8A96BC' }}>GCash</span>
                                    </div>
                                    <div className={`sv-pay-method ${paymentMethod === 'maya' ? 'active' : ''}`} onClick={() => setPaymentMethod('maya')}>
                                        <Wallet size={28} strokeWidth={1.5} color={paymentMethod === 'maya' ? '#1C2340' : '#8A96BC'} />
                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: paymentMethod === 'maya' ? '#1C2340' : '#8A96BC' }}>Maya</span>
                                    </div>
                                    <div className={`sv-pay-method ${paymentMethod === 'bank' ? 'active' : ''}`} onClick={() => setPaymentMethod('bank')}>
                                        <CreditCard size={28} strokeWidth={1.5} color={paymentMethod === 'bank' ? '#1C2340' : '#8A96BC'} />
                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: paymentMethod === 'bank' ? '#1C2340' : '#8A96BC' }}>Bank Transfer</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── FULL WIDTH FOOTER ACTIONS ── */}
                        <div className="sv-footer">
                            <Link href={route('operator.violations')} className="sv-btn-secondary" style={{ pointerEvents: isProcessing ? 'none' : 'auto' }}>
                                Cancel Process
                            </Link>
                            <button className="sv-btn-primary" disabled={!paymentMethod || isProcessing} onClick={handlePayment}>
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                {isProcessing ? 'Processing Payment...' : `Pay & Clear Record`}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── SUCCESS STATE ── */
                    <div className="sv-card sv-success-card">
                        <div className="sv-success-icon">
                            <CheckCircle2 size={48} strokeWidth={2.5} />
                        </div>
                        <h1 className="sv-title" style={{ fontSize: 36, marginBottom: 16 }}>Payment Successful!</h1>
                        <p className="sv-subtitle" style={{ maxWidth: 480, margin: '0 auto 36px', fontSize: 15, lineHeight: 1.6 }}>
                            Your penalty for ticket <strong>{violation.id}</strong> has been fully settled and cleared from your municipal record. Thank you for your compliance.
                        </p>

                        <div style={{ background: '#FAFAFC', border: '1px dashed rgba(28,35,64,.2)', borderRadius: 16, padding: '24px 48px', margin: '0 auto 48px' }}>
                            <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: 8 }}>Official Receipt No.</p>
                            <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: 800, color: '#1C2340', letterSpacing: '.05em' }}>OR-TRV-99824</p>
                        </div>

                        {/* Directs the user to the Payment History page instead of the active violations page */}
                        <Link href={route('operator.payments')} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 10, height: 56, padding: '0 36px',
                            background: '#1C2340', color: '#FFF', borderRadius: 12, textDecoration: 'none',
                            fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
                            boxShadow: '0 4px 14px rgba(28,35,64,.25)', transition: 'all .2s'
                        }}>
                            View Payment History <ArrowRight size={16} />
                        </Link>
                    </div>
                )}
            </div>
        </OperatorLayout>
    );
}