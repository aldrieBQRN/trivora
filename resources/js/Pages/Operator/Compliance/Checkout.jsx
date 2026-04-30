import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import Swal from 'sweetalert2';
import {
    ChevronLeft, ShieldCheck, CreditCard,
    Smartphone, Lock, ArrowRight, Loader2,
    Receipt
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Secure Checkout
   Path: resources/js/Pages/Operator/Compliance/Checkout.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.co-root { font-family: 'Inter', sans-serif; color: #1C2340; max-width: 1500px; margin: 0 auto; padding-bottom: 64px; }
.co-root *, .co-root *::before, .co-root *::after { box-sizing: border-box; }

/* ── Nav ── */
.co-nav { display: flex; align-items: center; margin-bottom: 32px; }
.co-back-link { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #8A96BC; text-decoration: none; transition: color .18s; }
.co-back-link:hover { color: #1C2340; }

/* ── Header ── */
.co-header { text-align: center; margin-bottom: 40px; }
.co-security-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(5,150,105,.08); color: #059669; padding: 6px 14px; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 16px; border: 1px solid rgba(5,150,105,.2); }
.co-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; margin-bottom: 8px; }
.co-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; color: #5A6488; }

/* ── Grid ── */
.co-grid { display: grid; grid-template-columns: 1fr 450px; gap: 32px; align-items: start; }
@media (max-width: 1024px) { .co-grid { grid-template-columns: 1fr; } }

/* ── Cards ── */
.co-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; box-shadow: 0 4px 12px rgba(28,35,64,.02); padding: 32px; }
.co-card-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #1C2340; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }

/* ── Payment Methods ── */
.co-methods { display: flex; flex-direction: column; gap: 12px; }
.co-method { display: flex; align-items: center; padding: 16px 20px; border: 1.5px solid rgba(28,35,64,.1); border-radius: 12px; cursor: pointer; transition: all .2s; position: relative; }
.co-method:hover { border-color: rgba(79,91,203,.4); background: #F8F9FC; }
.co-method.active { border-color: #4F5BCB; background: rgba(79,91,203,.04); box-shadow: 0 4px 14px rgba(79,91,203,.1); }
.co-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(28,35,64,.2); margin-right: 16px; display: flex; align-items: center; justify-content: center; transition: all .2s; flex-shrink: 0; }
.co-method.active .co-radio { border-color: #4F5BCB; }
.co-radio-inner { width: 10px; height: 10px; border-radius: 50%; background: #4F5BCB; opacity: 0; transform: scale(0.5); transition: all .2s; }
.co-method.active .co-radio-inner { opacity: 1; transform: scale(1); }

.co-method-icon { width: 40px; height: 40px; border-radius: 8px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
.co-method-info { flex: 1; }
.co-method-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #1C2340; line-height: 1.2; }
.co-method-desc { font-family: 'Inter', sans-serif; font-size: 12px; color: #8A96BC; margin-top: 4px; }

/* ── Order Summary ── */
.co-summary-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed rgba(28,35,64,.08); }
.co-summary-row.total { border-bottom: none; padding-top: 24px; padding-bottom: 0; margin-top: 8px; border-top: 1px solid rgba(28,35,64,.1); align-items: center; }
.co-lbl { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 500; color: #5A6488; }
.co-val { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600; color: #1C2340; }
.co-total-lbl { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #1C2340; }
.co-total-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #4F5BCB; letter-spacing: -.02em; }

/* ── Action Button ── */
.co-pay-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 56px; border-radius: 12px; background: #1C2340; color: #FFFFFF; border: none; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; transition: all .2s; margin-top: 32px; box-shadow: 0 4px 14px rgba(28,35,64,.2); }
.co-pay-btn:hover:not(:disabled) { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,91,203,.25); }
.co-pay-btn:disabled { opacity: 0.7; cursor: default; }

.co-disclaimer { display: flex; align-items: center; justify-content: center; gap: 6px; font-family: 'Inter', sans-serif; font-size: 11px; color: #8A96BC; margin-top: 16px; text-align: center; }
`;

export default function Checkout({ applicationId = 'APP-2026-0622' }) {
    const [method, setMethod] = useState('gcash');
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock Data based on the application
    const order = {
        app_id: applicationId,
        type: 'New Franchise Application',
        operator: 'Mario Dela Cruz',
        fees: [
            { name: 'Application & Filing Fee', amt: 250.00 },
            { name: 'Police Clearance / LGU OR', amt: 150.00 },
            { name: 'Health Certificate', amt: 55.00 },
            { name: 'Cedula', amt: 40.00 }
            // Note: IoT Tracking Device fee removed
        ]
    };

    const subtotal = order.fees.reduce((acc, curr) => acc + curr.amt, 0);
    const convenienceFee = method === 'card' ? 25.00 : 15.00;
    const total = subtotal + convenienceFee;

    const handlePayment = () => {
        const methodNames = {
            gcash: 'GCash',
            maya: 'Maya',
            card: 'Credit/Debit Card'
        };

        Swal.fire({
            title: 'Proceed to Payment?',
            text: `You are about to securely pay ₱${total.toFixed(2)} via ${methodNames[method]}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1C2340',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Proceed',
            customClass: { title: 'font-jakarta', popup: 'font-inter' }
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);
                // Simulate processing delay
                setTimeout(() => {
                    setIsProcessing(false);
                    Swal.fire({
                        title: 'Payment Successful!',
                        text: 'Your application fee has been settled and sent to the Treasurer.',
                        icon: 'success',
                        confirmButtonColor: '#059669',
                        timer: 2500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = '/operator/mtop'; // Routes back to tracker
                    });
                }, 1500);
            }
        });
    };

    return (
        <OperatorLayout title="Secure Checkout" operatorName={order.operator}>
            <Head title="Secure Checkout | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="co-root">
                <div className="co-nav">
                    <Link href={`/operator/mtop/${applicationId}`} className="co-back-link">
                        <ChevronLeft size={14} strokeWidth={3} /> Cancel & Return
                    </Link>
                </div>

                <div className="co-header">
                    <div className="co-security-badge">
                        <ShieldCheck size={12} strokeWidth={2.5} /> Secured by PayMongo
                    </div>
                    <h1 className="co-title">Select Payment Method</h1>
                    <p className="co-subtitle">Choose how you want to settle your franchise fee.</p>
                </div>

                <div className="co-grid">
                    {/* LEFT: Payment Options */}
                    <div className="co-card">
                        <h2 className="co-card-title">
                            <Lock size={18} color="#4F5BCB" />
                            Payment Options
                        </h2>

                        <div className="co-methods">
                            {/* GCash */}
                            <div className={`co-method ${method === 'gcash' ? 'active' : ''}`} onClick={() => setMethod('gcash')}>
                                <div className="co-radio"><div className="co-radio-inner" /></div>
                                <div className="co-method-icon" style={{ color: '#007DFE' }}>
                                    <Smartphone size={20} />
                                </div>
                                <div className="co-method-info">
                                    <p className="co-method-name">GCash</p>
                                    <p className="co-method-desc">Pay instantly using your GCash app.</p>
                                </div>
                            </div>

                            {/* Maya */}
                            <div className={`co-method ${method === 'maya' ? 'active' : ''}`} onClick={() => setMethod('maya')}>
                                <div className="co-radio"><div className="co-radio-inner" /></div>
                                <div className="co-method-icon" style={{ color: '#1B1C1E' }}>
                                    <Smartphone size={20} />
                                </div>
                                <div className="co-method-info">
                                    <p className="co-method-name">Maya</p>
                                    <p className="co-method-desc">Pay using your Maya wallet.</p>
                                </div>
                            </div>

                            {/* Card */}
                            <div className={`co-method ${method === 'card' ? 'active' : ''}`} onClick={() => setMethod('card')}>
                                <div className="co-radio"><div className="co-radio-inner" /></div>
                                <div className="co-method-icon" style={{ color: '#4F5BCB' }}>
                                    <CreditCard size={20} />
                                </div>
                                <div className="co-method-info">
                                    <p className="co-method-name">Credit or Debit Card</p>
                                    <p className="co-method-desc">Visa, Mastercard, or JCB.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Summary */}
                    <div className="co-card" style={{ background: '#FAFAFC' }}>
                        <h2 className="co-card-title">
                            <Receipt size={18} color="#1C2340" />
                            Order Summary
                        </h2>

                        <div style={{ marginBottom: 24 }}>
                            <p className="co-lbl" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Reference</p>
                            <p className="co-val">{order.app_id} - {order.type}</p>
                        </div>

                        <div>
                            {order.fees.map((fee, idx) => (
                                <div key={idx} className="co-summary-row">
                                    <span className="co-lbl">{fee.name}</span>
                                    <span className="co-val">₱{fee.amt.toFixed(2)}</span>
                                </div>
                            ))}

                            <div className="co-summary-row">
                                <span className="co-lbl">Gateway Convenience Fee</span>
                                <span className="co-val">₱{convenienceFee.toFixed(2)}</span>
                            </div>

                            <div className="co-summary-row total">
                                <span className="co-total-lbl">Total to Pay</span>
                                <span className="co-total-val">₱{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            className="co-pay-btn"
                            onClick={handlePayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    Proceed to Secure Payment <ArrowRight size={14} strokeWidth={2.5} />
                                </>
                            )}
                        </button>
                        <p className="co-disclaimer">
                            <Lock size={10} /> Payments are securely processed by PayMongo.
                        </p>
                    </div>
                </div>
            </div>
        </OperatorLayout>
    );
}