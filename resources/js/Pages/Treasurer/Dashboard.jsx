import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import {
    Search, Wallet, CheckCircle2,
    Clock, Receipt, CreditCard, TrendingUp,
    FileText, ChevronRight, Banknote
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Collection Monitor & OTC Dashboard (All List)
   Path: resources/js/Pages/Treasurer/Dashboard.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.csh-root {
    font-family: 'Inter', sans-serif;
    color: #1C2340; width: 100%; padding-bottom: 64px;
    max-width: 1400px; margin: 0 auto;
}
.csh-root *, .csh-root *::before, .csh-root *::after { box-sizing: border-box; }

/* ── Page heading ── */
.csh-eyebrow {
    font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
    letter-spacing: .2em; text-transform: uppercase; color: #4F5BCB;
    display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
}
.csh-eyebrow::before { content: ''; width: 24px; height: 2px; background: #4F5BCB; border-radius: 4px; }
.csh-title {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800;
    letter-spacing: -.02em; color: #1C2340; line-height: 1.1; margin-bottom: 8px;
}
.csh-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; }

.csh-topbar { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }

/* ── KPI Cards ── */
.csh-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
.csh-kpi {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
    border-radius: 16px; padding: 24px; position: relative; overflow: hidden; transition: all .2s;
    display: flex; flex-direction: column; box-shadow: 0 1px 6px rgba(28,35,64,.03);
}
.csh-kpi:hover { border-color: rgba(79,91,203,.2); box-shadow: 0 8px 24px rgba(28,35,64,.06); transform: translateY(-2px); }
.csh-kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.csh-kpi-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.csh-kpi-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; color: #1C2340; line-height: 1; margin-bottom: 6px; }
.csh-kpi-lbl { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; }
.csh-kpi-trend { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 50px; }
.csh-kpi-trend.up { background: rgba(5,150,105,.1); color: #059669; }

/* ── Toolbar ── */
.csh-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.csh-toolbar-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #1C2340; }
.csh-search {
    display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.09);
    border-radius: 50px; height: 42px; padding: 0 16px; width: 340px; transition: all .2s;
}
.csh-search:focus-within { border-color: rgba(79,91,203,.45); box-shadow: 0 0 0 3px rgba(79,91,203,.1); width: 380px; }
.csh-search input { border: none; outline: none; background: transparent; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: #1C2340; width: 100%; }
.csh-search input::placeholder { color: #8A96BC; font-weight: 400; }

/* ── Ledger Table ── */
.csh-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(28,35,64,.03); }
.csh-table { width: 100%; border-collapse: collapse; text-align: left; }
.csh-th { padding: 18px 24px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: #8A96BC; background: #FAFAFC; border-bottom: 1px solid rgba(28,35,64,.06); }
.csh-tr { border-bottom: 1px solid rgba(28,35,64,.05); transition: background .15s; }
.csh-tr:last-child { border-bottom: none; }
.csh-tr:hover { background: rgba(237,238,244,.4); }
.csh-td { padding: 18px 24px; vertical-align: middle; }

.csh-td-primary { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #1C2340; margin-bottom: 4px; }
.csh-td-secondary { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500; color: #8A96BC; }
.csh-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14.5px; font-weight: 800; color: #1C2340; }
.csh-ref { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #5A6488; background: rgba(28,35,64,.04); padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 6px; }

/* ── Badges & Buttons ── */
.csh-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }
.csh-badge.pending_otc { background: rgba(217,119,6,.1); color: #D97706; border: 1px solid rgba(217,119,6,.2); }
.csh-badge.completed { background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2); }

.csh-process-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: #1C2340; color: #FFFFFF; padding: 10px 18px; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase; text-decoration: none;
    border: none; cursor: pointer; transition: all .2s; box-shadow: 0 4px 12px rgba(28,35,64,.2);
}
.csh-process-btn:hover { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79,91,203,.25); }

.csh-icon-btn {
    width: 34px; height: 34px; border-radius: 8px; background: #FFFFFF;
    border: 1px solid rgba(28,35,64,.1); display: flex; align-items: center; justify-content: center;
    color: #8A96BC; cursor: pointer; transition: all .2s;
}
.csh-icon-btn:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.2); }
`;

export default function TreasurerDashboard() {
    const [query, setQuery] = useState('');

    // Mock Data reflecting the Hybrid Setup
    const transactions = [
        {
            id: 'TXN-001', app_id: 'APP-2026-0622', operator: 'Mario Dela Cruz',
            type: 'New Franchise', amount: 515.00, method: 'PayMongo (GCash)', ref: 'pay_mc12345',
            date: 'Apr 04, 2026 - 08:30 AM', status: 'completed'
        },
        {
            id: 'TXN-002', app_id: 'APP-2026-0501', operator: 'Juanito Perez',
            type: 'Renewal', amount: 1695.00, method: 'PayMongo (Card)', ref: 'pay_xyz987',
            date: 'Apr 04, 2026 - 09:15 AM', status: 'completed'
        },
        {
            id: 'TXN-003', app_id: 'APP-2026-0418', operator: 'Ricardo Dalisay',
            type: 'Violation Fine', amount: 500.00, method: 'Walk-in (Cash)', ref: 'TRV-88210',
            date: 'Apr 04, 2026 - 10:05 AM', status: 'pending_otc'
        },
        {
            id: 'TXN-004', app_id: 'APP-2026-0399', operator: 'Antonio Luna',
            type: 'Renewal', amount: 495.00, method: 'Walk-in (Cash)', ref: 'TRV-11299',
            date: 'Apr 03, 2026 - 03:45 PM', status: 'completed'
        }
    ];

    // Simply filter by the text search query, ignore tabs
    const filteredTxns = transactions.filter(txn => {
        return txn.ref.toLowerCase().includes(query.toLowerCase()) ||
               txn.operator.toLowerCase().includes(query.toLowerCase()) ||
               txn.app_id.toLowerCase().includes(query.toLowerCase());
    });

    // KPI logic
    const pendingOtcCount = transactions.filter(t => t.status === 'pending_otc').length;
    const onlineTotal = transactions.filter(t => t.method.includes('PayMongo') && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
    const otcTotal = transactions.filter(t => t.method.includes('Walk-in') && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);

    return (
        <TreasurerLayout title="Collection Dashboard" treasurerName="Maria Santos">
            <Head title="Treasurer Portal | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="csh-root">
                {/* ── HEADER ── */}
                <div className="csh-topbar">
                    <div>
                        <p className="csh-eyebrow">Treasurer's Office</p>
                        <h1 className="csh-title">Collection Monitor</h1>
                        <p className="csh-subtitle">Monitor automated PayMongo collections and process walk-in cash payments.</p>
                    </div>
                </div>

                {/* ── KPI METRICS ── */}
                <div className="csh-kpi-grid">
                    <div className="csh-kpi" style={{ borderTop: '3.5px solid #D97706' }}>
                        <div className="csh-kpi-header">
                            <div className="csh-kpi-icon-wrap" style={{ background: 'rgba(217,119,6,.08)', color: '#D97706' }}>
                                <Clock size={20} strokeWidth={2.5} />
                            </div>
                        </div>
                        <p className="csh-kpi-val">{pendingOtcCount}</p>
                        <p className="csh-kpi-lbl">Pending Walk-ins (OTC)</p>
                    </div>

                    <div className="csh-kpi" style={{ borderTop: '3.5px solid #4F5BCB' }}>
                        <div className="csh-kpi-header">
                            <div className="csh-kpi-icon-wrap" style={{ background: 'rgba(79,91,203,.08)', color: '#4F5BCB' }}>
                                <CreditCard size={20} strokeWidth={2.5} />
                            </div>
                            <span className="csh-kpi-trend up"><TrendingUp size={12} /> Auto-Verified</span>
                        </div>
                        <p className="csh-kpi-val">₱{onlineTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                        <p className="csh-kpi-lbl">Online Collections (PayMongo)</p>
                    </div>

                    <div className="csh-kpi" style={{ borderTop: '3.5px solid #059669' }}>
                        <div className="csh-kpi-header">
                            <div className="csh-kpi-icon-wrap" style={{ background: 'rgba(5,150,105,.08)', color: '#059669' }}>
                                <Banknote size={20} strokeWidth={2.5} />
                            </div>
                        </div>
                        <p className="csh-kpi-val">₱{otcTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                        <p className="csh-kpi-lbl">OTC Collections (Cash)</p>
                    </div>
                </div>

                {/* ── TOOLBAR ── */}
                <div className="csh-toolbar">
                    <h2 className="csh-toolbar-title">All Transactions</h2>

                    <div className="csh-search">
                        <Search size={15} strokeWidth={2.5} color="#8A96BC" />
                        <input
                            type="text"
                            placeholder="Search by Ref #, Operator, or App ID..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* ── TRANSACTIONS TABLE ── */}
                <div className="csh-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="csh-table">
                            <thead>
                                <tr>
                                    <th className="csh-th">Transaction Details</th>
                                    <th className="csh-th">Payment Info</th>
                                    <th className="csh-th">Amount</th>
                                    <th className="csh-th">Status</th>
                                    <th className="csh-th" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTxns.map((txn) => (
                                    <tr key={txn.id} className="csh-tr">
                                        <td className="csh-td">
                                            <p className="csh-td-primary">{txn.operator}</p>
                                            <p className="csh-td-secondary">{txn.app_id} &bull; {txn.type}</p>
                                        </td>
                                        <td className="csh-td">
                                            <p className="csh-td-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {txn.method.includes('Cash') ? <Wallet size={12}/> : <CreditCard size={12}/>}
                                                {txn.method}
                                            </p>
                                            <span className="csh-ref">{txn.ref}</span>
                                        </td>
                                        <td className="csh-td">
                                            <p className="csh-amount">₱{txn.amount.toFixed(2)}</p>
                                            <p className="csh-td-secondary" style={{ fontSize: 10.5, marginTop: 4 }}>{txn.date}</p>
                                        </td>
                                        <td className="csh-td">
                                            <span className={`csh-badge ${txn.status}`}>
                                                {txn.status === 'pending_otc' ? <Clock size={10} strokeWidth={3}/> : <CheckCircle2 size={10} strokeWidth={3}/>}
                                                {txn.status === 'pending_otc' ? 'Awaiting Cash' : 'Paid & Verified'}
                                            </span>
                                        </td>
                                        <td className="csh-td" style={{ textAlign: 'right' }}>
                                            {txn.status === 'pending_otc' ? (
                                                <Link href={route('treasurer.verify', { id: txn.app_id })} className="csh-process-btn">
                                                    Process Cash <ChevronRight size={13} strokeWidth={2.5} />
                                                </Link>
                                            ) : (
                                                <Link
    href={route('treasurer.receipt', { id: txn.id })}
    className="csh-icon-btn"
    style={{ marginLeft: 'auto', textDecoration: 'none' }}
    title="View Digital Receipt"
>
    <Receipt size={15} strokeWidth={2.5} />
</Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {filteredTxns.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '64px 20px' }}>
                                            <FileText size={42} strokeWidth={1} style={{ margin: '0 auto 16px', color: '#8A96BC', opacity: 0.5 }} />
                                            <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 800, color: '#1C2340' }}>No transactions found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </TreasurerLayout>
    );
}