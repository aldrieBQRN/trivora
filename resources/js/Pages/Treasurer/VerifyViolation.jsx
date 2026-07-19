import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import Swal from 'sweetalert2';
import {
    ChevronLeft, CheckCircle2, CreditCard,
    User, Hash, MapPin, Receipt, Clock,
    Loader2, ShieldCheck, Activity, Phone, Navigation
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Verify & Settle Violation Fine (Over the Counter)
   Prefix: vv-* (verify-violation)
   Fonts: Plus Jakarta Sans (titles) · Inter (UI) · DM Sans (labels)
 ───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.vv-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 52px;
}
.vv-root *, .vv-root *::before, .vv-root *::after { box-sizing: border-box; }

/* ── Back Nav ── */
.vv-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 32px;
}
.vv-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  transition: color .18s;
}
.vv-back-link:hover { color: #1C2340; }
.vv-status-badge {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 800;
  letter-spacing: .13em; text-transform: uppercase;
  color: #DC2626; background: rgba(220,38,38,.08);
  border: 1px solid rgba(220,38,38,.15);
  border-radius: 50px; padding: 5px 14px;
  display: inline-flex; align-items: center; gap: 6px;
}

/* ── Header ── */
.vv-header { margin-bottom: 32px; }
.vv-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #DC2626; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.vv-eyebrow::before {
  content: ''; width: 18px; height: 1.5px; background: #DC2626; border-radius: 2px;
}
.vv-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1; margin-bottom: 8px;
}
.vv-subtitle { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: #5A6488; }

/* ── Grid ── */
.vv-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
@media (min-width: 1024px) { .vv-grid { grid-template-columns: 380px 1fr; } }

/* ── Shared Card ── */
.vv-card {
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 18px; box-shadow: 0 1px 6px rgba(28,35,64,.05);
  overflow: hidden; display: flex; flex-direction: column;
}
.vv-card-pad { padding: 32px; }

/* ── Details Panel (Left) ── */
.vv-detail-group { margin-bottom: 32px; }
.vv-detail-group:last-child { margin-bottom: 0; }
.vv-group-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800;
  color: #1C2340; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
}
.vv-detail-row {
  display: flex; align-items: flex-start; gap: 16px;
  padding-bottom: 16px; margin-bottom: 16px;
  border-bottom: 1px solid rgba(28,35,64,.05);
}
.vv-detail-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.vv-detail-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(28,35,64,.03); border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  color: #5A6488; flex-shrink: 0;
}
.vv-detail-lbl {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase; color: #8A96BC;
  margin-bottom: 4px;
}
.vv-detail-val {
  font-size: 13px; font-weight: 600; color: #1C2340; line-height: 1.4;
}

/* ── Right Panel: Payment verification ── */
.vv-section-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800;
  color: #1C2340; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;
}
.vv-fee-summary {
  background: #F8F9FC; border: 1px solid rgba(28,35,64,.06);
  border-radius: 14px; padding: 24px; display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 32px;
}
.vv-fee-lbl {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #5A6488;
}
.vv-fee-amount {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800;
  color: #DC2626;
}

/* Form Styles */
.vv-form-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 32px; }
@media (min-width: 640px) { .vv-form-grid { grid-template-columns: 1fr 1fr; } }
.vv-field { display: flex; flex-direction: column; gap: 8px; }
.vv-lbl {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase; color: #5A6488;
}
.vv-input {
  height: 48px; border-radius: 10px; border: 1.5px solid rgba(28,35,64,.15);
  padding: 0 16px; font-family: 'Inter', sans-serif; font-size: 13.5px;
  font-weight: 500; color: #1C2340; background: #FFFFFF; transition: all .2s;
}
.vv-input:focus {
  outline: none; border-color: #4F5BCB; box-shadow: 0 0 0 3px rgba(79,91,203,.1);
}
.vv-select {
  height: 48px; border-radius: 10px; border: 1.5px solid rgba(28,35,64,.15);
  padding: 0 16px; font-family: 'Inter', sans-serif; font-size: 13.5px;
  font-weight: 500; color: #1C2340; background: #FFFFFF; transition: all .2s;
  cursor: pointer;
}
.vv-select:focus {
  outline: none; border-color: #4F5BCB; box-shadow: 0 0 0 3px rgba(79,91,203,.1);
}
.vv-textarea {
  border-radius: 10px; border: 1.5px solid rgba(28,35,64,.15);
  padding: 12px 16px; font-family: 'Inter', sans-serif; font-size: 13.5px;
  font-weight: 500; color: #1C2340; min-height: 100px; resize: vertical; transition: all .2s;
}
.vv-textarea:focus {
  outline: none; border-color: #4F5BCB; box-shadow: 0 0 0 3px rgba(79,91,203,.1);
}

/* Action Buttons */
.vv-actions {
  display: flex; align-items: center; justify-content: space-between;
  border-top: 1px solid rgba(28,35,64,.08); padding-top: 28px;
}
.vv-btn-primary {
  height: 52px; padding: 0 36px; border-radius: 12px;
  background: #059669; color: #FFFFFF; border: none;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  transition: all .2s; box-shadow: 0 4px 12px rgba(5,150,105,.2);
}
.vv-btn-primary:hover:not(:disabled) {
  background: #047857; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(5,150,105,.28);
}
.vv-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.vv-btn-cancel {
  height: 52px; padding: 0 28px; border-radius: 12px;
  border: 1.5px solid rgba(28,35,64,.15); background: #FFFFFF;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #5A6488;
  display: inline-flex; align-items: center; gap: 6px;
  text-decoration: none; transition: all .2s;
}
.vv-btn-cancel:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.3); }

/* Change Alert */
.vv-change-box {
  background: #ECFDF5; border: 1px solid #A7F3D0;
  border-radius: 10px; padding: 14px 16px;
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 14px;
}
.vv-change-lbl { font-size: 12px; font-weight: 600; color: #047857; }
.vv-change-val { font-size: 16px; font-weight: 800; color: #065F46; }
`;

export default function VerifyViolation({ violationId, record }) {
    const { data, setData, post, processing, errors } = useForm({
        official_receipt_number: `OR-VIO-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: record.amount,
        payment_method: 'cash',
        notes: '',
    });



    const handleSubmit = (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Confirm Fine Settlement',
            text: `Confirm counter collection of ₱${record.amount.toFixed(2)} and resolution of ticket ${record.ticket}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Settle & Clear Ticket',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                post(route('treasurer.verify-violation.submit', violationId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Fine Resolved',
                            text: 'Violation ticket status has been successfully updated to Resolved.',
                            icon: 'success',
                            confirmButtonColor: '#4F5BCB'
                        });
                    }
                });
            }
        });
    };

    return (
        <TreasurerLayout title="Settle Violation Ticket" treasurerName="Maria Santos">
            <Head title={`Settle Ticket ${record.ticket} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="vv-root">
                {/* ── BACK NAV ── */}
                <div className="vv-nav">
                    <Link href={route('treasurer.pending')} className="vv-back-link">
                        <ChevronLeft size={14} strokeWidth={3} />
                        Back to Queue
                    </Link>
                    <span className="vv-status-badge">
                        <Clock size={11} strokeWidth={2.5} />
                        Awaiting Payment
                    </span>
                </div>

                {/* ── HEADER ── */}
                <div className="vv-header">
                    <p className="vv-eyebrow">Counter Fine Collection</p>
                    <h1 className="vv-title">Ticket Settle: {record.ticket}</h1>
                    <p className="vv-subtitle">Verify payment and register the official receipt to resolve this color coding offense.</p>
                </div>

                <div className="vv-grid">
                    {/* ════ LEFT: Ticket & Vehicle details ════ */}
                    <div className="vv-card">
                        <div className="vv-card-pad">
                            <div className="vv-detail-group">
                                <h3 className="vv-group-title">
                                    <Activity size={16} color="#DC2626" />
                                    Offense Summary
                                </h3>
                                <div className="vv-detail-row">
                                    <div className="vv-detail-icon"><Hash size={15} /></div>
                                    <div>
                                        <p className="vv-detail-lbl">Infraction Type</p>
                                        <p className="vv-detail-val">{record.type}</p>
                                    </div>
                                </div>
                                <div className="vv-detail-row">
                                    <div className="vv-detail-icon"><Clock size={15} /></div>
                                    <div>
                                        <p className="vv-detail-lbl">Detected On</p>
                                        <p className="vv-detail-val">{record.date}</p>
                                    </div>
                                </div>
                                <div className="vv-detail-row">
                                    <div className="vv-detail-icon"><MapPin size={15} /></div>
                                    <div>
                                        <p className="vv-detail-lbl">Detected Location</p>
                                        <p className="vv-detail-val">{record.location_desc}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="vv-detail-group">
                                <h3 className="vv-group-title">
                                    <User size={16} color="#4F5BCB" />
                                    Operator & Unit
                                </h3>
                                <div className="vv-detail-row">
                                    <div className="vv-detail-icon"><User size={15} /></div>
                                    <div>
                                        <p className="vv-detail-lbl">Operator Name</p>
                                        <p className="vv-detail-val">{record.operator}</p>
                                    </div>
                                </div>
                                <div className="vv-detail-row">
                                    <div className="vv-detail-icon"><Phone size={15} /></div>
                                    <div>
                                        <p className="vv-detail-lbl">Contact Number</p>
                                        <p className="vv-detail-val">{record.contact}</p>
                                    </div>
                                </div>
                                <div className="vv-detail-row">
                                    <div className="vv-detail-icon"><Navigation size={15} /></div>
                                    <div>
                                        <p className="vv-detail-lbl">Toda & Plate</p>
                                        <p className="vv-detail-val">{record.toda} &bull; Unit {record.unit} (Plate: {record.plate_no})</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════ RIGHT: cashier entry form ════ */}
                    <div className="vv-card">
                        <form onSubmit={handleSubmit} className="vv-card-pad" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 className="vv-section-title">
                                <Receipt size={20} color="#059669" />
                                Settle Violation Fine
                            </h3>

                            <div className="vv-fee-summary">
                                <span className="vv-fee-lbl">Total Penalty Fine Due</span>
                                <span className="vv-fee-amount">₱{record.amount.toFixed(2)}</span>
                            </div>

                            <div className="vv-form-grid">
                                <div className="vv-field">
                                    <label className="vv-lbl">Official Receipt (O.R.) Number</label>
                                    <input
                                        type="text"
                                        className="vv-input"
                                        value={data.official_receipt_number}
                                        onChange={e => setData('official_receipt_number', e.target.value)}
                                        required
                                    />
                                    {errors.official_receipt_number && <span style={{ color: '#DC2626', fontSize: 11 }}>{errors.official_receipt_number}</span>}
                                </div>

                                <div className="vv-field">
                                    <label className="vv-lbl">Payment Method</label>
                                    <select
                                        className="vv-select"
                                        value={data.payment_method}
                                        onChange={e => setData('payment_method', e.target.value)}
                                        required
                                    >
                                        <option value="cash">Cash (Walk-in)</option>
                                        <option value="gcash">GCash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                    </select>
                                </div>
                            </div>

                            <div className="vv-field" style={{ marginBottom: 32 }}>
                                <label className="vv-lbl">Cashier Remarks / Notes</label>
                                <textarea
                                    className="vv-textarea"
                                    placeholder="Add any specific counter logs (optional)..."
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="vv-actions" style={{ marginTop: 'auto' }}>
                                <Link href={route('treasurer.pending')} className="vv-btn-cancel">
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    className="vv-btn-primary"
                                    disabled={processing}
                                >
                                    {processing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                    Resolve Ticket & Clear
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </TreasurerLayout>
    );
}
