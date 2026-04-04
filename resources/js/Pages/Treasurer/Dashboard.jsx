import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import {
    Search,
    Filter,
    Wallet,
    CheckCircle2,
    Clock,
    XCircle,
    Receipt,
    CreditCard,
    TrendingUp,
    FileText,
    ChevronRight
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Payment Verification Dashboard
   Matches the Indigo/Slate Enterprise Theme
   Path: resources/js/Pages/Treasurer/Dashboard.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.csh-root {
    font-family: 'Inter', sans-serif;
    color: #1C2340;
    width: 100%;
    padding-bottom: 64px;
    max-width: 1400px;
    margin: 0 auto;
}
.csh-root *, .csh-root *::before, .csh-root *::after { box-sizing: border-box; }

/* ── Page heading ── */
.csh-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .2em; text-transform: uppercase;
    color: #4F5BCB;
    display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
}
.csh-eyebrow::before { content: ''; width: 24px; height: 2px; background: #4F5BCB; border-radius: 4px; }
.csh-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 32px; font-weight: 800; letter-spacing: -.02em;
    color: #1C2340; line-height: 1.1; margin-bottom: 8px;
}
.csh-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; }

.csh-topbar { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }

/* ── KPI Cards ── */
.csh-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
.csh-kpi {
    background: #FFFFFF;
    border: 1px solid rgba(28,35,64,.08);
    border-radius: 16px; padding: 24px;
    position: relative; overflow: hidden; transition: all .2s;
    display: flex; flex-direction: column;
    box-shadow: 0 1px 6px rgba(28,35,64,.03);
}
.csh-kpi:hover { border-color: rgba(79,91,203,.2); box-shadow: 0 8px 24px rgba(28,35,64,.06); transform: translateY(-2px); }

.csh-kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.csh-kpi-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.csh-kpi-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; color: #1C2340; line-height: 1; margin-bottom: 6px; }
.csh-kpi-lbl { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; }
.csh-kpi-trend { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 50px; }
.csh-kpi-trend.up { background: rgba(5,150,105,.1); color: #059669; }

/* ── Toolbar ── */
.csh-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
}
.csh-search {
    display: flex; align-items: center; gap: 10px;
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.09);
    border-radius: 50px; height: 42px; padding: 0 16px;
    width: 340px; transition: all .2s;
}
.csh-search:focus-within { border-color: rgba(79,91,203,.45); box-shadow: 0 0 0 3px rgba(79,91,203,.1); width: 380px; }
.csh-search input { border: none; outline: none; background: transparent; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: #1C2340; width: 100%; }
.csh-search input::placeholder { color: #8A96BC; font-weight: 400; }

.csh-tabs { display: flex; gap: 6px; background: #FFFFFF; padding: 4px; border-radius: 12px; border: 1px solid rgba(28,35,64,.08); }
.csh-tab {
    padding: 8px 16px; border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    cursor: pointer; border: none; background: transparent; color: #8A96BC; transition: all .2s;
}
.csh-tab:hover { color: #1C2340; }
.csh-tab.active { background: #1C2340; color: #FFFFFF; box-shadow: 0 2px 8px rgba(28,35,64,.15); }

.csh-filter-btn {
    height: 42px; padding: 0 16px; border-radius: 50px;
    border: 1px solid rgba(28,35,64,.09); background: #FFFFFF; color: #5A6488;
    display: flex; align-items: center; gap: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .18s;
}
.csh-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

/* ── Ledger Table ── */
.csh-card {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
    border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(28,35,64,.03);
}
.csh-table { width: 100%; border-collapse: collapse; text-align: left; }
.csh-th {
    padding: 18px 24px; font-family: 'DM Sans', sans-serif; font-size: 9px;
    font-weight: 800; letter-spacing: .15em; text-transform: uppercase;
    color: #8A96BC; background: #FAFAFC; border-bottom: 1px solid rgba(28,35,64,.06);
}
.csh-tr { border-bottom: 1px solid rgba(28,35,64,.05); transition: background .15s; }
.csh-tr:last-child { border-bottom: none; }
.csh-tr:hover { background: rgba(237,238,244,.4); }
.csh-td { padding: 18px 24px; vertical-align: middle; }

.csh-td-primary { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #1C2340; margin-bottom: 4px; }
.csh-td-secondary { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500; color: #8A96BC; }
.csh-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14.5px; font-weight: 800; color: #1C2340; }
.csh-ref {
    font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .05em;
    color: #5A6488; background: rgba(28,35,64,.04); padding: 4px 8px; border-radius: 6px;
    display: inline-block; margin-top: 6px;
}

/* ── Badges & Buttons ── */
.csh-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }
.csh-badge.pending { background: rgba(217,119,6,.1); color: #D97706; border: 1px solid rgba(217,119,6,.2); }
.csh-badge.verified { background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2); }

.csh-verify-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: #1C2340; color: #FFFFFF; padding: 10px 18px; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase; text-decoration: none;
    border: none; cursor: pointer; transition: all .2s; box-shadow: 0 4px 12px rgba(28,35,64,.2);
}
.csh-verify-btn:hover { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79,91,203,.25); }

.csh-icon-btn {
    width: 34px; height: 34px; border-radius: 8px; background: #FFFFFF;
    border: 1px solid rgba(28,35,64,.1); display: flex; align-items: center; justify-content: center;
    color: #8A96BC; cursor: pointer; transition: all .2s;
}
.csh-icon-btn:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.2); }
`;

export default function TreasurerDashboard() {
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Pending Verification');

    // Mock Data for Transactions (Aligned with April 4, 2026)
    const transactions = [
        {
            id: 'TXN-001', app_id: 'APP-2026-0622', operator: 'Mario Dela Cruz',
            type: 'New Franchise', amount: 515.00, method: 'GCash', ref: 'GC-99210-TRV',
            date: 'Apr 04, 2026 - 08:30 AM', status: 'pending'
        },
        {
            id: 'TXN-002', app_id: 'APP-2026-0501', operator: 'Juanito Perez',
            type: 'Renewal', amount: 1695.00, method: 'Maya', ref: 'MY-88210-TRV',
            date: 'Apr 04, 2026 - 09:15 AM', status: 'pending'
        },
        {
            id: 'TXN-003', app_id: 'APP-2026-0418', operator: 'Ricardo Dalisay',
            type: 'Violation Fine', amount: 500.00, method: 'Cashier (OTC)', ref: 'OR-77210-LGU',
            date: 'Apr 04, 2026 - 10:05 AM', status: 'verified'
        },
        {
            id: 'TXN-004', app_id: 'APP-2026-0399', operator: 'Antonio Luna',
            type: 'Renewal', amount: 495.00, method: 'Bank Transfer', ref: 'BPI-44119-TRV',
            date: 'Apr 03, 2026 - 03:45 PM', status: 'verified'
        },
        {
            id: 'TXN-005', app_id: 'APP-2026-0350', operator: 'Cardo Dalisay',
            type: 'New Franchise', amount: 1695.00, method: 'GCash', ref: 'GC-11223-TRV',
            date: 'Apr 03, 2026 - 04:20 PM', status: 'verified'
        }
    ];

    const filteredTxns = transactions.filter(txn => {
        const matchesQuery = txn.ref.toLowerCase().includes(query.toLowerCase()) ||
                             txn.operator.toLowerCase().includes(query.toLowerCase()) ||
                             txn.app_id.toLowerCase().includes(query.toLowerCase());

        if (activeTab === 'All Transactions') return matchesQuery;
        if (activeTab === 'Pending Verification') return matchesQuery && txn.status === 'pending';
        if (activeTab === 'Verified') return matchesQuery && txn.status === 'verified';
        return matchesQuery;
    });

    return (
        <TreasurerLayout title="Payment Dashboard" treasurerName="Maria Santos">
            <Head title="Treasurer Portal | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="csh-root">
                {/* ── HEADER ── */}
                <div className="csh-topbar">
                    <div>
                        <p className="csh-eyebrow">Treasurer's Office</p>
                        <h1 className="csh-title">Payment Verification</h1>
                        <p className="csh-subtitle">Cross-check operator payments and issue Official Receipts.</p>
                    </div>
                    <div>
                        <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 700, color: '#8A96BC', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right', marginBottom: 4 }}>Date Today</p>
                        <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 800, color: '#1C2340' }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
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
                        <p className="csh-kpi-val">24</p>
                        <p className="csh-kpi-lbl">Pending Verification</p>
                    </div>

                    <div className="csh-kpi" style={{ borderTop: '3.5px solid #059669' }}>
                        <div className="csh-kpi-header">
                            <div className="csh-kpi-icon-wrap" style={{ background: 'rgba(5,150,105,.08)', color: '#059669' }}>
                                <CheckCircle2 size={20} strokeWidth={2.5} />
                            </div>
                            <span className="csh-kpi-trend up"><TrendingUp size={12} /> +12%</span>
                        </div>
                        <p className="csh-kpi-val">156</p>
                        <p className="csh-kpi-lbl">Processed Today</p>
                    </div>

                    <div className="csh-kpi" style={{ borderTop: '3.5px solid #4F5BCB' }}>
                        <div className="csh-kpi-header">
                            <div className="csh-kpi-icon-wrap" style={{ background: 'rgba(79,91,203,.08)', color: '#4F5BCB' }}>
                                <Wallet size={20} strokeWidth={2.5} />
                            </div>
                        </div>
                        <p className="csh-kpi-val">₱45,250.00</p>
                        <p className="csh-kpi-lbl">Online Collections</p>
                    </div>
                </div>

                {/* ── TOOLBAR ── */}
                <div className="csh-toolbar">
                    <div className="csh-tabs">
                        {['Pending Verification', 'Verified', 'All Transactions'].map(tab => (
                            <button
                                key={tab}
                                className={`csh-tab ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="csh-search">
                            <Search size={15} strokeWidth={2.5} className="csh-search-icon" />
                            <input
                                type="text"
                                placeholder="Search by Ref #, Operator, or App ID..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </div>
                        <button className="csh-filter-btn" title="Filter Options">
                            <Filter size={14} strokeWidth={2.5} /> Filters
                        </button>
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
                                                {txn.status === 'pending' ? <Clock size={10} strokeWidth={3}/> : <CheckCircle2 size={10} strokeWidth={3}/>}
                                                {txn.status}
                                            </span>
                                        </td>
                                        <td className="csh-td" style={{ textAlign: 'right' }}>
                                            {txn.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <button className="csh-icon-btn" style={{ color: '#DC2626' }} title="Reject Payment">
                                                        <XCircle size={15} strokeWidth={2.5} />
                                                    </button>
                                                    {/* Proper link mapping to web.php treasurer.verify route */}
                                                    <Link href={route('treasurer.verify', { id: txn.app_id })} className="csh-verify-btn">
                                                        Review & Verify <ChevronRight size={13} strokeWidth={2.5} />
                                                    </Link>
                                                </div>
                                            ) : (
                                                <button className="csh-icon-btn" style={{ marginLeft: 'auto' }} title="View Receipt">
                                                    <Receipt size={15} strokeWidth={2.5} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {filteredTxns.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '64px 20px' }}>
                                            <FileText size={42} strokeWidth={1} style={{ margin: '0 auto 16px', color: '#8A96BC', opacity: 0.5 }} />
                                            <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 800, color: '#1C2340' }}>No transactions found</p>
                                            <p style={{ fontFamily: 'Inter', fontSize: 12.5, color: '#8A96BC', marginTop: 4 }}>Try adjusting your search filters or tabs.</p>
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