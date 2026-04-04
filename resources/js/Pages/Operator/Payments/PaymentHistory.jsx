import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    Wallet,
    Search,
    Calendar,
    CheckCircle2,
    Receipt,
    FileText,
    ShieldAlert,
    Activity,
    ArrowDownToLine,
    X,
    Filter
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Payment History
   Path: resources/js/Pages/Operator/Payments/PaymentHistory.jsx
   Prefix: ph-*
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ph-root { font-family: 'Inter', sans-serif; color: #1C2340; padding-bottom: 64px; max-width: 1200px; margin: 0 auto; }
.ph-root *, .ph-root *::before, .ph-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.ph-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.ph-eyebrow::before {
  content: '';
  width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.ph-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.ph-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.ph-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 24px; flex-wrap: wrap;
}
.ph-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 50px; height: 42px; padding: 0 16px;
  width: 320px; transition: all .2s;
}
.ph-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  width: 360px;
}
.ph-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%;
}
.ph-search input::placeholder { color: #8A96BC; font-weight: 400; }
.ph-search-icon { color: #8A96BC; flex-shrink: 0; }
.ph-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #8A96BC; display: flex; padding: 0;
  transition: color .15s;
}
.ph-clear-btn:hover { color: #1C2340; }

.ph-toolbar-right { display: flex; align-items: center; gap: 10px; }
.ph-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.09);
  background: #FFFFFF; color: #5A6488;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.ph-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

.ph-count-badge {
  display: flex; align-items: center; gap: 7px;
  height: 42px; padding: 0 16px; border-radius: 50px;
  background: rgba(5,150,105,.08);
  border: 1px solid rgba(5,150,105,.15);
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #059669;
}

/* Stats Row */
.ph-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px; }
.ph-stat-card {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; padding: 24px;
    display: flex; align-items: center; gap: 20px; box-shadow: 0 1px 4px rgba(28,35,64,.04);
}
.ph-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.ph-stat-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8A96BC; margin-bottom: 4px; }
.ph-stat-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #1C2340; line-height: 1; }

/* Table Styling */
.ph-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(28,35,64,.03); }
.ph-table-wrap { overflow-x: auto; }
.ph-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 900px; }
.ph-thead { background: #FAFAFC; border-bottom: 1px solid rgba(28,35,64,.06); }
.ph-th { padding: 18px 24px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8A96BC; }
.ph-tr { border-bottom: 1px solid rgba(28,35,64,.04); transition: background .18s; }
.ph-tr:hover { background: #F8F9FC; }
.ph-td { padding: 20px 24px; vertical-align: middle; }

/* Type Tags */
.ph-tag {
    display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px;
    font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
}
.ph-tag-mtop { background: rgba(79,91,203,.1); color: #4F5BCB; }
.ph-tag-vio { background: rgba(220,38,38,.08); color: #DC2626; }
.ph-tag-iot { background: rgba(5,150,105,.08); color: #059669; }

/* Status Badges */
.ph-badge {
    display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px;
    font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
}
.ph-badge-paid { color: #059669; background: rgba(5,150,105,.08); }

.ph-receipt-btn {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.15); color: #5A6488;
    padding: 8px 12px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
    text-transform: uppercase; cursor: pointer; transition: all .18s; display: flex; align-items: center; justify-content: center; gap: 6px;
    text-decoration: none; width: fit-content;
}
.ph-receipt-btn:hover { border-color: #1C2340; color: #1C2340; background: #FAFAFC; box-shadow: 0 2px 4px rgba(28,35,64,.04); }

/* Empty state */
.ph-empty { padding: 64px 0; text-align: center; }
.ph-empty-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(28,35,64,.04); border: 1px solid rgba(28,35,64,.08); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #8A96BC; }
.ph-empty-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; color: #1C2340; margin-bottom: 6px; }
.ph-empty-sub { font-family: 'Inter', sans-serif; font-size: 13px; color: #5A6488; max-width: 400px; margin: 0 auto; }
`;

export default function PaymentHistory() {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock Payment Ledger Data (Fully settled transactions only)
    const ledger = [
        {
            id: 'TXN-99824',
            refNo: 'OR-TRV-99824',
            type: 'Violation',
            description: 'Color Coding: Restricted Day (VIO-2026-8750)',
            date: 'April 04, 2026',
            amount: 515.00,
            method: 'GCash',
            status: 'paid',
            link: route('operator.payments.receipt', { id: 'OR-TRV-99824' })
        },
        {
            id: 'TXN-99511',
            refNo: 'OR-TRV-99511',
            type: 'MTOP',
            description: 'New Franchise Application (NSB-123)',
            date: 'March 10, 2026',
            amount: 495.00,
            method: 'Maya',
            status: 'paid',
            link: route('operator.payments.receipt', { id: 'OR-TRV-99511' })
        },
        {
            id: 'TXN-99512',
            refNo: 'OR-TRV-99512',
            type: 'IoT',
            description: 'IoT Tracking Device (Required Hardware)',
            date: 'March 10, 2026',
            amount: 1200.00,
            method: 'Maya',
            status: 'paid',
            link: route('operator.payments.receipt', { id: 'OR-TRV-99512' })
        }
    ];

    const stats = [
        { label: 'Total Paid (2026)', value: '₱2,210.00', icon: Wallet, color: '#059669', bg: 'rgba(5,150,105,.08)' },
        { label: 'Total Transactions', value: '3', icon: Receipt, color: '#4F5BCB', bg: 'rgba(79,91,203,.08)' },
        { label: 'Cleared Violations', value: '1', icon: ShieldAlert, color: '#DC2626', bg: 'rgba(220,38,38,.08)' },
    ];

    // Filter Logic
    const filteredLedger = ledger.filter(txn =>
        txn.refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper to render the correct category tag
    const renderCategoryTag = (type) => {
        switch (type) {
            case 'MTOP': return <span className="ph-tag ph-tag-mtop"><FileText size={10} /> MTOP REGISTRATION</span>;
            case 'Violation': return <span className="ph-tag ph-tag-vio"><ShieldAlert size={10} /> VIOLATION FINE</span>;
            case 'IoT': return <span className="ph-tag ph-tag-iot"><Activity size={10} /> HARDWARE</span>;
            default: return null;
        }
    };

    return (
        <OperatorLayout title="Payment History" operatorName="Mario Dela Cruz">
            <Head title="Payment History | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="ph-root">

                {/* ── PAGE HEADING ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="ph-eyebrow">Financial Records</p>
                    <h1 className="ph-title">Payment History</h1>
                    <p className="ph-subtitle">A complete ledger of your settled MTOP fees, violations, and IoT subscriptions.</p>
                </div>

                {/* ── STATS ROW ── */}
                <div className="ph-stats-grid">
                    {stats.map((s, i) => (
                        <div key={i} className="ph-stat-card">
                            <div className="ph-stat-icon" style={{ background: s.bg, color: s.color }}>
                                <s.icon size={24} />
                            </div>
                            <div>
                                <p className="ph-stat-val" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 28, fontWeight: 800, color: '#1C2340', lineHeight: 1 }}>{s.value}</p>
                                <p className="ph-stat-lbl" style={{ fontFamily: 'DM Sans', fontSize: 9, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', color: '#8A96BC', marginTop: 5 }}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── TOOLBAR ── */}
                <div className="ph-toolbar">
                    <div className="ph-search">
                        <Search size={14} strokeWidth={2} className="ph-search-icon" />
                        <input
                            type="text"
                            placeholder="Search OR number or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="ph-clear-btn" onClick={() => setSearchTerm('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="ph-toolbar-right">
                        <button className="ph-filter-btn">
                            <ArrowDownToLine size={14} strokeWidth={2} />
                            Export
                        </button>
                        <button className="ph-filter-btn">
                            <Filter size={14} strokeWidth={2} />
                            Filter
                        </button>
                        <div className="ph-count-badge">
                            <Receipt size={13} strokeWidth={2} />
                            Transactions: {filteredLedger.length}
                        </div>
                    </div>
                </div>

                {/* ── LEDGER TABLE ── */}
                <div className="ph-card">
                    {filteredLedger.length > 0 ? (
                        <div className="ph-table-wrap">
                            <table className="ph-table">
                                <thead className="ph-thead">
                                    <tr>
                                        <th className="ph-th">Date & OR Number</th>
                                        <th className="ph-th">Category & Description</th>
                                        <th className="ph-th">Method</th>
                                        <th className="ph-th">Amount</th>
                                        <th className="ph-th">Status</th>
                                        <th className="ph-th">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLedger.map((txn, index) => (
                                        <tr key={index} className="ph-tr">
                                            <td className="ph-td">
                                                <p style={{ fontSize: 11, color: '#8A96BC', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                    <Calendar size={11} /> {txn.date}
                                                </p>
                                                <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13 }}>{txn.refNo}</p>
                                            </td>
                                            <td className="ph-td">
                                                <div style={{ marginBottom: 6 }}>{renderCategoryTag(txn.type)}</div>
                                                <p style={{ fontWeight: 600, fontSize: 12.5, color: '#1C2340' }}>{txn.description}</p>
                                            </td>
                                            <td className="ph-td">
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#5A6488' }}>{txn.method}</span>
                                            </td>
                                            <td className="ph-td">
                                                <span style={{ fontWeight: 800, fontSize: 14 }}>₱{txn.amount.toFixed(2)}</span>
                                            </td>
                                            <td className="ph-td">
                                                <span className="ph-badge ph-badge-paid">
                                                    <CheckCircle2 size={10} /> Paid
                                                </span>
                                            </td>
                                            <td className="ph-td">
                                                <Link href={txn.link} className="ph-receipt-btn">
                                                    <Receipt size={12} /> View OR
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="ph-empty">
                            <div className="ph-empty-icon">
                                <Receipt size={28} strokeWidth={1.8} />
                            </div>
                            <h3 className="ph-empty-title">{searchTerm ? 'No transactions found' : 'No Payment History'}</h3>
                            <p className="ph-empty-sub">
                                {searchTerm ? 'Try searching for a different OR number or category.' : 'You have not made any payments yet.'}
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </OperatorLayout>
    );
}