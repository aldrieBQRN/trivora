import React from 'react';
import { Head, Link } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import { ChevronLeft, Printer, CheckCircle2, Download } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Digital Official Receipt
   Path: resources/js/Pages/Treasurer/Receipt.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&family=Courier+Prime:wght@400;700&display=swap');

.rcpt-root {
  font-family: 'Inter', sans-serif; color: #1C2340;
  max-width: 800px; margin: 0 auto; padding-bottom: 64px;
}
.rcpt-root *, .rcpt-root *::before, .rcpt-root *::after { box-sizing: border-box; }

/* ── Back nav ── */
.rcpt-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.rcpt-back-link {
  display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none; transition: color .18s;
}
.rcpt-back-link:hover { color: #1C2340; }

.rcpt-actions { display: flex; gap: 12px; }
.rcpt-action-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.15);
  color: #1C2340; height: 38px; padding: 0 16px; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; cursor: pointer;
  transition: all .2s; box-shadow: 0 2px 6px rgba(28,35,64,.04);
}
.rcpt-action-btn:hover { background: #FAFAFC; border-color: #1C2340; transform: translateY(-1px); }
.rcpt-action-btn.primary { background: #1C2340; color: #FFFFFF; border: none; }
.rcpt-action-btn.primary:hover { background: #2E3A9E; }

/* ── The Receipt Paper ── */
.rcpt-paper {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 12px;
  padding: 48px;
  box-shadow: 0 12px 40px rgba(28,35,64,.08);
  position: relative;
  overflow: hidden;
}
/* Watermark logo */
.rcpt-paper::before {
  content: ''; position: absolute; inset: 0;
  background-image: url('/images/logo.png'); /* Ensure your logo path is correct */
  background-position: center; background-repeat: no-repeat;
  background-size: 300px; opacity: 0.03; pointer-events: none;
}

/* ── Receipt Header ── */
.rcpt-header { text-align: center; margin-bottom: 40px; border-bottom: 2px dashed rgba(28,35,64,.15); padding-bottom: 32px; }
.rcpt-gov-text { font-family: 'Times New Roman', serif; font-size: 13px; color: #1C2340; margin-bottom: 2px; }
.rcpt-gov-bold { font-family: 'Times New Roman', serif; font-size: 14px; font-weight: bold; color: #1C2340; margin-bottom: 16px; text-transform: uppercase; }
.rcpt-or-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 800; letter-spacing: .05em; color: #1C2340; margin-bottom: 8px; }
.rcpt-or-number { font-family: 'Courier Prime', monospace; font-size: 18px; font-weight: 700; color: #DC2626; }

/* ── Receipt Details ── */
.rcpt-details { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
.rcpt-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: #8A96BC; margin-bottom: 4px; }
.rcpt-value { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; color: #1C2340; }
.rcpt-value.mono { font-family: 'Courier Prime', monospace; font-size: 14px; }

/* ── Fee Breakdown Table ── */
.rcpt-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
.rcpt-th { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #1C2340; padding: 12px 0; border-bottom: 2px solid #1C2340; text-align: left; }
.rcpt-td { padding: 14px 0; border-bottom: 1px solid rgba(28,35,64,.1); font-family: 'Inter', sans-serif; font-size: 13px; color: #3A4570; }
.rcpt-td.amount { font-family: 'Courier Prime', monospace; font-weight: 700; color: #1C2340; text-align: right; }
.rcpt-total-row td { padding-top: 24px; border-bottom: none; }
.rcpt-total-lbl { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #1C2340; text-align: right; padding-right: 24px; }
.rcpt-total-val { font-family: 'Courier Prime', monospace; font-size: 20px; font-weight: 700; color: #1C2340; text-align: right; }

/* ── Receipt Footer ── */
.rcpt-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 64px; }
.rcpt-status { display: inline-flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #059669; background: rgba(5,150,105,.1); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(5,150,105,.2); }
.rcpt-sign-box { text-align: center; width: 220px; }
.rcpt-sign-line { border-bottom: 1px solid #1C2340; margin-bottom: 8px; height: 30px; }
.rcpt-sign-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700; color: #1C2340; }
.rcpt-sign-title { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-top: 2px; }

/* ── Print Styles ── */
@media print {
  body * { visibility: hidden; }
  .rcpt-paper, .rcpt-paper * { visibility: visible; }
  .rcpt-paper { position: absolute; left: 0; top: 0; box-shadow: none; border: none; padding: 0; }
  .rcpt-nav, .rcpt-actions { display: none !important; }
}
`;

export default function Receipt({ receipt }) {
    const activeReceipt = receipt || {
        receipt_number: 'OR-2026-99999',
        payment_date: 'April 4, 2026',
        operator: 'Ricardo Dalisay',
        reference_no: 'APP-2026-0418',
        payment_method: 'Cash',
        amount: 750.00,
        processed_by: 'Maria Santos'
    };

    const fees = [
        { desc: 'Franchise Application & Filing Fee', code: '40201010', amount: activeReceipt.amount }
    ];

    const total = activeReceipt.amount;

    return (
        <TreasurerLayout title="Official Receipt">
            <Head title={`Receipt ${receipt.or_number} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="rcpt-root">

                {/* ── Top Navigation & Actions ── */}
                <div className="rcpt-nav">
                    <Link href="/treasurer/dashboard" className="rcpt-back-link">
                        <ChevronLeft size={16} strokeWidth={2.5} />
                        Back to Transactions
                    </Link>

                    <div className="rcpt-actions">
                        <button className="rcpt-action-btn" onClick={() => window.print()}>
                            <Printer size={14} strokeWidth={2.5} /> Print O.R.
                        </button>
                        <button className="rcpt-action-btn primary">
                            <Download size={14} strokeWidth={2.5} /> Download PDF
                        </button>
                    </div>
                </div>

                {/* ── Printable Paper ── */}
                <div className="rcpt-paper">

                    <div className="rcpt-header">
                        <p className="rcpt-gov-text">Republic of the Philippines</p>
                        <p className="rcpt-gov-text">Province of Batangas</p>
                        <p className="rcpt-gov-bold">Municipality of Nasugbu</p>
                        <h1 className="rcpt-or-title">OFFICIAL RECEIPT</h1>
                        <p className="rcpt-or-number">No. {activeReceipt.receipt_number}</p>
                    </div>

                    <div className="rcpt-details">
                        <div>
                            <p className="rcpt-label">Date</p>
                            <p className="rcpt-value">{activeReceipt.payment_date} {activeReceipt.payment_time && <span style={{ fontSize: 11, color: '#8A96BC' }}>at {activeReceipt.payment_time}</span>}</p>
                        </div>
                        <div>
                            <p className="rcpt-label">Application / Reference ID</p>
                            <p className="rcpt-value mono">{activeReceipt.reference_no}</p>
                        </div>
                        <div>
                            <p className="rcpt-label">Payor</p>
                            <p className="rcpt-value" style={{ fontSize: 16, fontWeight: 700 }}>{activeReceipt.operator}</p>
                        </div>
                        <div>
                            <p className="rcpt-label">Payment Method</p>
                            <p className="rcpt-value">{activeReceipt.payment_method}</p>
                        </div>
                    </div>

                    <table className="rcpt-table">
                        <thead>
                            <tr>
                                <th className="rcpt-th">Nature of Collection</th>
                                <th className="rcpt-th" style={{ textAlign: 'center' }}>Account Code</th>
                                <th className="rcpt-th" style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fees.map((fee, idx) => (
                                <tr key={idx}>
                                    <td className="rcpt-td">{fee.desc}</td>
                                    <td className="rcpt-td mono" style={{ textAlign: 'center', color: '#8A96BC' }}>{fee.code}</td>
                                    <td className="rcpt-td amount">₱ {fee.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr className="rcpt-total-row">
                                <td colSpan={2} className="rcpt-total-lbl">Total Amount Paid</td>
                                <td className="rcpt-total-val">₱ {total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="rcpt-footer">
                        <div className="rcpt-status">
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                            Payment Verified
                        </div>
                        <div className="rcpt-sign-box">
                            <div className="rcpt-sign-line"></div>
                            <p className="rcpt-sign-name">{activeReceipt.processed_by}</p>
                            <p className="rcpt-sign-title">Municipal Treasurer / Cashier</p>
                        </div>
                    </div>

                </div>
            </div>
        </TreasurerLayout>
    );
}