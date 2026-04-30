import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import {
    CreditCard, CheckCircle2, Filter,
    Clock, Search, ShieldAlert, ArrowRight, X
} from 'lucide-react';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.pp-root {
    font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 64px;
    max-width: 1400px; margin: 0 auto;
}
.pp-root *, .pp-root *::before, .pp-root *::after { box-sizing: border-box; }

.pp-eyebrow { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #D97706; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.pp-eyebrow::before { content: ''; width: 24px; height: 2px; background: #D97706; border-radius: 4px; }
.pp-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -.025em; color: #1C2340; line-height: 1.1; margin-bottom: 8px; }
.pp-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; margin-bottom: 32px; }

/* Toolbar & Controls */
.pp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.pp-toolbar-left { display: flex; gap: 12px; flex: 1; }
.pp-toolbar-right { display: flex; gap: 12px; }

.pp-search { display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.15); border-radius: 50px; height: 44px; padding: 0 18px; width: 380px; transition: all .2s; }
.pp-search:focus-within { border-color: #4F5BCB; box-shadow: 0 0 0 3px rgba(79,91,203,.1); width: 420px; }
.pp-search input { border: none; outline: none; background: transparent; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: #1C2340; width: 100%; }
.pp-search input::placeholder { color: #9AA3CC; font-weight: 400; }

.pp-btn-outline { height: 44px; padding: 0 18px; border-radius: 50px; border: 1px solid rgba(28,35,64,.15); background: #fff; color: #3A4570; display: flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .2s; }
.pp-btn-outline:hover { border-color: rgba(28,35,64,.3); color: #1C2340; background: rgba(28,35,64,.02); }

/* Table Card */
.pp-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(28,35,64,.03); }
.pp-table { width: 100%; border-collapse: collapse; text-align: left; }
.pp-th { padding: 18px 24px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: #8A96BC; background: rgba(79,91,203,.03); border-bottom: 1px solid rgba(28,35,64,.06); }
.pp-tr { border-bottom: 1px solid rgba(28,35,64,.05); transition: background .15s; }
.pp-tr:last-child { border-bottom: none; }
.pp-tr:hover { background: rgba(237,238,244,.4); }
.pp-td { padding: 18px 24px; vertical-align: middle; }

.pp-td-primary { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #1C2340; margin-bottom: 4px; }
.pp-td-secondary { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500; color: #8A96BC; }
.pp-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14.5px; font-weight: 800; color: #059669; }
.pp-ref { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #5A6488; background: rgba(28,35,64,.04); padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 6px; }

.pp-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }
.pp-badge.pending { background: rgba(217,119,6,.1); color: #B45309; border: 1px solid rgba(217,119,6,.2); }

.pp-action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #1C2340; color: #FFFFFF; padding: 8px 20px; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; text-decoration: none; border: none; cursor: pointer; transition: all .2s; box-shadow: 0 3px 10px rgba(28,35,64,.2); }
.pp-action-btn:hover { background: #2E3A9E; box-shadow: 0 4px 14px rgba(79,91,203,.3); transform: translateY(-1px); }

/* Empty state */
.pp-empty { padding: 48px 24px; text-align: center; }
.pp-empty p { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-top: 12px; }
`;

export default function PendingPayments() {
    const [searchTerm, setSearchTerm] = useState('');

    const rawTransactions = [
        { id: 'TXN-2026-0994', app_id: 'APP-2026-0622', operator: 'Mario Dela Cruz', type: 'New Franchise Fee', amount: 515.00, method: 'GCash WebPay', ref: 'pay_mc12345', date: 'Apr 06, 2026 - 10:15 AM' },
        { id: 'TXN-2026-0995', app_id: 'APP-2026-0625', operator: 'Julio Reyes', type: 'MTOP Renewal Fee', amount: 1695.00, method: 'Maya Gateway', ref: 'pay_xyz987', date: 'Apr 06, 2026 - 11:30 AM' },
        { id: 'TXN-2026-0996', app_id: 'TRV-88210', operator: 'Ricardo Dalisay', type: 'Traffic Violation Fine', amount: 500.00, method: 'BPI Online', ref: 'pay_bpi810', date: 'Apr 06, 2026 - 01:05 PM' },
        { id: 'TXN-2026-0997', app_id: 'APP-2026-0628', operator: 'Lito Fernandez', type: 'MTOP Renewal Fee', amount: 1695.00, method: 'GCash WebPay', ref: 'pay_gc99123', date: 'Apr 06, 2026 - 02:40 PM' },
    ];

    // Filter logic
    const transactions = rawTransactions.filter(txn => {
        return txn.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
               txn.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
               txn.app_id.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <TreasurerLayout title="Pending Payments" treasurerName="Maria Santos">
            <Head title="Pending Payments | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="pp-root">
                <p className="pp-eyebrow">Action Required</p>
                <h1 className="pp-title">Pending Online Payments</h1>
                <p className="pp-subtitle">Review and confirm payments made via online gateways before generating official receipts.</p>

                {/* ── Search & Filter Controls ── */}
                <div className="pp-toolbar">
                    <div className="pp-toolbar-left">
                        <div className="pp-search">
                            <Search size={16} strokeWidth={2.5} color="#8A96BC" />
                            <input
                                type="text"
                                placeholder="Search by Gateway Ref, Driver, or Application ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && <X size={14} color="#8A96BC" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
                        </div>
                    </div>

                    <div className="pp-toolbar-right">
                        <button className="pp-btn-outline">
                            <Filter size={14} strokeWidth={2} /> Filter
                        </button>
                    </div>
                </div>

                <div className="pp-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="pp-table">
                            <thead>
                                <tr>
                                    <th className="pp-th">Driver & Payment Type</th>
                                    <th className="pp-th">Payment Gateway</th>
                                    <th className="pp-th">Amount & Date</th>
                                    <th className="pp-th">Status</th>
                                    <th className="pp-th" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length > 0 ? (
                                    transactions.map((txn) => (
                                        <tr key={txn.id} className="pp-tr">
                                            <td className="pp-td">
                                                <p className="pp-td-primary">{txn.operator}</p>
                                                <p className="pp-td-secondary">{txn.type} &bull; {txn.app_id}</p>
                                            </td>
                                            <td className="pp-td">
                                                <p className="pp-td-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1C2340', fontWeight: 600 }}>
                                                    <CreditCard size={13} color="#4F5BCB"/> {txn.method}
                                                </p>
                                                <span className="pp-ref">Ref: {txn.ref}</span>
                                            </td>
                                            <td className="pp-td">
                                                <p className="pp-amount">₱{txn.amount.toFixed(2)}</p>
                                                <p className="pp-td-secondary" style={{ fontSize: 10.5, marginTop: 4 }}>{txn.date}</p>
                                            </td>
                                            <td className="pp-td">
                                                <span className="pp-badge pending"><Clock size={10} strokeWidth={3}/> Pending Approval</span>
                                            </td>
                                            <td className="pp-td" style={{ textAlign: 'right' }}>
                                                <Link href={`/treasurer/verify/${txn.id}`} className="pp-action-btn">
                                                    Verify
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="pp-empty">
                                            <ShieldAlert size={32} color="#C5CBE5" strokeWidth={1.5} style={{ margin: '0 auto' }}/>
                                            <p>No pending payments match your search</p>
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