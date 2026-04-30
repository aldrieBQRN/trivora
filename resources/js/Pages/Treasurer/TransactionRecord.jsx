import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TreasurerLayout from '@/Layouts/TreasurerLayout';
import {
    Search, CreditCard, CheckCircle2, Receipt,
    FileText, Download, Filter, X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Master Transaction Ledger
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.tr-root { font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 64px; max-width: 1400px; margin: 0 auto; }
.tr-root *, .tr-root *::before, .tr-root *::after { box-sizing: border-box; }

.tr-eyebrow { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #4F5BCB; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.tr-eyebrow::before { content: ''; width: 24px; height: 2px; background: #4F5BCB; border-radius: 4px; }
.tr-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; line-height: 1.1; margin-bottom: 8px; }
.tr-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; }
.tr-topbar { margin-bottom: 32px; }

.tr-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.tr-toolbar-left { display: flex; gap: 12px; flex: 1; }
.tr-toolbar-right { display: flex; gap: 12px; }

.tr-search { display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid rgba(28,35,64,.15); border-radius: 50px; height: 44px; padding: 0 18px; width: 380px; transition: all .2s; }
.tr-search:focus-within { border-color: #4F5BCB; box-shadow: 0 0 0 3px rgba(79,91,203,.1); width: 420px; }
.tr-search input { border: none; outline: none; background: transparent; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: #1C2340; width: 100%; }

.tr-btn-outline { height: 44px; padding: 0 18px; border-radius: 50px; border: 1px solid rgba(28,35,64,.15); background: #fff; color: #3A4570; display: flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .2s; }
.tr-btn-outline:hover { border-color: rgba(28,35,64,.3); color: #1C2340; background: rgba(28,35,64,.02); }

.tr-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(28,35,64,.03); }
.tr-table { width: 100%; border-collapse: collapse; text-align: left; }
.tr-th { padding: 18px 24px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: #8A96BC; background: rgba(79,91,203,.03); border-bottom: 1px solid rgba(28,35,64,.06); }
.tr-tr { border-bottom: 1px solid rgba(28,35,64,.05); transition: background .15s; }
.tr-tr:last-child { border-bottom: none; }
.tr-tr:hover { background: rgba(237,238,244,.4); }
.tr-td { padding: 18px 24px; vertical-align: middle; }

.tr-td-primary { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #1C2340; margin-bottom: 4px; }
.tr-td-secondary { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500; color: #8A96BC; }
.tr-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14.5px; font-weight: 800; color: #1C2340; }
.tr-ref { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .05em; color: #5A6488; background: rgba(28,35,64,.04); padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 6px; }
.tr-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 10px; border-radius: 6px; }
.tr-badge.verified { background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2); }

.tr-view-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #FFFFFF; color: #1C2340; padding: 8px 16px; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; text-decoration: none; border: 1px solid rgba(28,35,64,.15); cursor: pointer; transition: all .2s; }
.tr-view-btn:hover { background: #1C2340; color: #FFFFFF; border-color: #1C2340; box-shadow: 0 4px 12px rgba(28,35,64,.15); }
`;

export default function TransactionRecord() {
    const [query, setQuery] = useState('');

    const transactions = [
        { id: 'TXN-001', app_id: 'APP-2026-0622', operator: 'Mario Dela Cruz', type: 'New Franchise', amount: 515.00, method: 'PayMongo (GCash)', ref: 'pay_mc12345', date: 'Apr 04, 2026 - 08:30 AM', status: 'verified' },
        { id: 'TXN-002', app_id: 'APP-2026-0501', operator: 'Juanito Perez', type: 'Renewal', amount: 1695.00, method: 'PayMongo (Card)', ref: 'pay_xyz987', date: 'Apr 04, 2026 - 09:15 AM', status: 'verified' },
        { id: 'TXN-003', app_id: 'APP-2026-0418', operator: 'Ricardo Dalisay', type: 'Violation Fine', amount: 500.00, method: 'PayMongo (Maya)', ref: 'pay_maya810', date: 'Apr 04, 2026 - 10:05 AM', status: 'verified' },
        { id: 'TXN-004', app_id: 'APP-2026-0399', operator: 'Antonio Luna', type: 'Renewal', amount: 495.00, method: 'PayMongo (GCash)', ref: 'pay_gc11299', date: 'Apr 03, 2026 - 03:45 PM', status: 'verified' },
        { id: 'TXN-005', app_id: 'APP-2026-0210', operator: 'Leonor Rivera', type: 'Violation Fine', amount: 1000.00, method: 'PayMongo (Card)', ref: 'pay_card001', date: 'Apr 02, 2026 - 11:20 AM', status: 'verified' }
    ];

    const filteredTxns = transactions.filter(txn => {
        return txn.ref.toLowerCase().includes(query.toLowerCase()) ||
               txn.operator.toLowerCase().includes(query.toLowerCase()) ||
               txn.app_id.toLowerCase().includes(query.toLowerCase());
    });

    return (
        <TreasurerLayout title="Transaction Record" treasurerName="Maria Santos">
            <Head title="Transaction Ledger | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="tr-root">
                <div className="tr-topbar">
                    <p className="tr-eyebrow">Financial Records</p>
                    <h1 className="tr-title">Payment Records</h1>
                    <p className="tr-subtitle">Search, filter, and export all digital transactions.</p>
                </div>

                <div className="tr-toolbar">
                    <div className="tr-toolbar-left">
                        <div className="tr-search">
                            <Search size={16} strokeWidth={2.5} color="#8A96BC" />
                            <input
                                type="text"
                                placeholder="Search by PayMongo Ref, Operator, or ID..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            {query && <X size={14} color="#8A96BC" style={{ cursor: 'pointer' }} onClick={() => setQuery('')} />}
                        </div>
                    </div>

                    <div className="tr-toolbar-right">
                        <button className="tr-btn-outline"><Filter size={14} strokeWidth={2} /> Filter</button>
                        <button className="tr-btn-outline"><Download size={14} strokeWidth={2} /> Export CSV</button>
                    </div>
                </div>

                <div className="tr-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tr-table">
                            <thead>
                                <tr>
                                    <th className="tr-th">Transaction Details</th>
                                    <th className="tr-th">Digital Payment Info</th>
                                    <th className="tr-th">Amount</th>
                                    <th className="tr-th">System Status</th>
                                    <th className="tr-th" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTxns.map((txn) => (
                                    <tr key={txn.id} className="tr-tr">
                                        <td className="tr-td">
                                            <p className="tr-td-primary">{txn.operator}</p>
                                            <p className="tr-td-secondary">{txn.app_id} &bull; {txn.type}</p>
                                        </td>
                                        <td className="tr-td">
                                            <p className="tr-td-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={12}/> {txn.method}</p>
                                            <span className="tr-ref">{txn.ref}</span>
                                        </td>
                                        <td className="tr-td">
                                            <p className="tr-amount">₱{txn.amount.toFixed(2)}</p>
                                            <p className="tr-td-secondary" style={{ fontSize: 10.5, marginTop: 4 }}>{txn.date}</p>
                                        </td>
                                        <td className="tr-td">
                                            <span className="tr-badge verified"><CheckCircle2 size={10} strokeWidth={3}/> Verified</span>
                                        </td>
                                        <td className="tr-td" style={{ textAlign: 'right' }}>
                                            <Link href={`/treasurer/receipt/${txn.id}`} className="tr-view-btn">
                                                <Receipt size={13} strokeWidth={2} /> View e-OR
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTxns.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '64px 20px' }}>
                                            <FileText size={42} strokeWidth={1} style={{ margin: '0 auto 16px', color: '#8A96BC', opacity: 0.5 }} />
                                            <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 800, color: '#1C2340' }}>No matching records found.</p>
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