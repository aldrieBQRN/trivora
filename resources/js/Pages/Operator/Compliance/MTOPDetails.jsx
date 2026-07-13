import React from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    ChevronLeft, FileText, CheckCircle2, Clock, AlertCircle,
    Bike, FileSearch, ClipboardCheck, Stamp, AlertTriangle,
    UploadCloud, XCircle, Info, Download, Wrench, Settings,
    Wallet, Receipt, CreditCard, ArrowRight
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Application Details
   Path: resources/js/Pages/Operator/Compliance/MTOPDetails.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ad-root { font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 64px; max-width: 1400px; margin: 0 auto; }
.ad-root *, .ad-root *::before, .ad-root *::after { box-sizing: border-box; }

/* ── Nav & Header ────────────────────────────────────────────────────── */
.ad-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.ad-back-link { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #8A96BC; text-decoration: none; transition: color .18s; }
.ad-back-link:hover { color: #1C2340; }
.ad-id-badge { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #4F5BCB; background: rgba(79,91,203,.09); border: 1px solid rgba(79,91,203,.2); border-radius: 6px; padding: 5px 12px; }

.ad-header { margin-bottom: 32px; }
.ad-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -.025em; color: #1C2340; line-height: 1; margin-bottom: 8px; }
.ad-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; }

/* ── Two-column layout ───────────────────────────────────────────────── */
.ad-grid { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: start; }
@media (min-width: 1280px) { .ad-grid { grid-template-columns: 360px 1fr; } }

.ad-side-col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.ad-main-col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }

/* ── Cards ───────────────────────────────────────────────────────────── */
.ad-card { background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 16px; box-shadow: 0 4px 12px rgba(28,35,64,.02); overflow: hidden; }
.ad-card-header { padding: 20px 24px; border-bottom: 1px solid rgba(28,35,64,.06); background: #FAFAFC; display: flex; align-items: center; gap: 12px; }
.ad-card-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(28,35,64,.06); color: #5A6488; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ad-card-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #1C2340; letter-spacing: -.01em; }
.ad-card-body { padding: 24px; }

/* ── Info grid (vehicle details) ─────────────────────────────────────── */
.ad-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; }
.ad-info-item { display: flex; flex-direction: column; gap: 6px; }
.ad-info-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: #8A96BC; }
.ad-info-value { font-family: 'Inter', sans-serif; font-size: 14.5px; font-weight: 600; color: #1C2340; }

/* ── Split grid ──────────────────────────────────────────────────────── */
.ad-split-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }

/* ── Full document / inspection grid ────────────────────────────────── */
.ad-doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

.ad-doc-row { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px; border-radius: 12px; border: 1px solid rgba(28,35,64,.08); background: #FFFFFF; transition: all .2s; }
.ad-doc-row:hover { border-color: rgba(79,91,203,.2); background: #F8F9FC; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(28,35,64,.03); }
.ad-doc-row.rejected { border-color: rgba(220,38,38,.3); background: rgba(220,38,38,.03); }
.ad-doc-left { display: flex; gap: 12px; flex: 1; min-width: 0; }
.ad-doc-icon-wrap { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #F2F4FA; color: #8A96BC; }
.ad-doc-row.rejected .ad-doc-icon-wrap { background: rgba(220,38,38,.08); color: #DC2626; }
.ad-doc-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700; color: #1C2340; margin-bottom: 3px; line-height: 1.4; }
.ad-doc-rejection { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 600; color: #DC2626; margin-top: 5px; display: flex; align-items: flex-start; gap: 5px; line-height: 1.4; }
.ad-doc-status { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 10px; border-radius: 8px; white-space: nowrap; flex-shrink: 0; height: fit-content; }
.ad-doc-status.approved { color: #059669; background: rgba(5,150,105,.1); }
.ad-doc-status.pending  { color: #D97706; background: rgba(217,119,6,.1); }
.ad-doc-status.rejected { color: #DC2626; background: rgba(220,38,38,.1); }
.ad-doc-status.na       { color: #8A96BC; background: rgba(28,35,64,.06); }

/* ── Compact checklist summary (chip-based) ──────────────────────────── */
.ad-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.ad-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 99px; background: rgba(5,150,105,.07); border: 1px solid rgba(5,150,105,.18); font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 600; color: #065F46; white-space: nowrap; }
.ad-chip svg { flex-shrink: 0; }
.ad-summary-badge { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #059669; background: rgba(5,150,105,.1); padding: 5px 12px; border-radius: 8px; white-space: nowrap; }

/* ── Process Tracker ─────────────────────────────────────────────────── */
.ad-tracker { display: flex; flex-direction: column; gap: 0; position: relative; }
.ad-tracker::before { content: ''; position: absolute; left: 17px; top: 15px; bottom: 20px; width: 2px; background: rgba(28,35,64,.08); z-index: 1; }
.ad-track-step { display: flex; gap: 16px; position: relative; z-index: 2; padding-bottom: 32px; }
.ad-track-step:last-child { padding-bottom: 0; }
.ad-track-icon { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #FFFFFF; border: 2px solid rgba(28,35,64,.15); color: #8A96BC; transition: all .2s; }
.ad-track-step.done   .ad-track-icon { border-color: #059669; background: #059669; color: #FFFFFF; }
.ad-track-step.active .ad-track-icon { border-color: #4F5BCB; background: #FFFFFF; color: #4F5BCB; box-shadow: 0 0 0 5px rgba(79,91,203,.15); }
.ad-track-step.error  .ad-track-icon { border-color: #D97706; background: #D97706; color: #FFFFFF; box-shadow: 0 0 0 5px rgba(217,119,6,.15); }
.ad-track-content { padding-top: 8px; }
.ad-track-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #1C2340; margin-bottom: 4px; }
.ad-track-desc  { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500; color: #5A6488; line-height: 1.5; }

/* ── Action boxes ────────────────────────────────────────────────────── */
.ad-action-box { border-radius: 16px; padding: 24px; text-align: left; border: 1px solid transparent; }
.ad-action-box.error   { background: rgba(220,38,38,.04); border-color: rgba(220,38,38,.2); }
.ad-action-box.warn    { background: rgba(217,119,6,.04); border-color: rgba(217,119,6,.2); }
.ad-action-box.info    { background: rgba(79,91,203,.04); border-color: rgba(79,91,203,.2); }
.ad-action-box.success { background: rgba(5,150,105,.04); border-color: rgba(5,150,105,.2); }

.ad-action-icon { width: 44px; height: 44px; border-radius: 13px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,.05); }
.ad-action-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 17px; font-weight: 800; margin-bottom: 8px; }
.ad-action-box.error   .ad-action-title { color: #B91C1C; }
.ad-action-box.warn    .ad-action-title { color: #B45309; }
.ad-action-box.info    .ad-action-title { color: #2E3A9E; }
.ad-action-box.success .ad-action-title { color: #047857; }

.ad-action-desc { font-family: 'Inter', sans-serif; font-size: 13px; margin-bottom: 20px; line-height: 1.6; }
.ad-action-box.error   .ad-action-desc { color: #7F1D1D; }
.ad-action-box.warn    .ad-action-desc { color: #78350F; }
.ad-action-box.info    .ad-action-desc { color: #3A4570; }
.ad-action-box.success .ad-action-desc { color: #065F46; }

.ad-primary-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 50px; border-radius: 12px; background: #1C2340; color: #FFFFFF; text-decoration: none; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; transition: all .2s; box-shadow: 0 4px 14px rgba(28,35,64,.2); border: none; cursor: pointer; }
.ad-primary-btn:hover { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,91,203,.25); }
.ad-primary-btn.success-btn { background: #059669; box-shadow: 0 4px 14px rgba(5,150,105,.25); }
.ad-primary-btn.success-btn:hover { background: #047857; box-shadow: 0 8px 24px rgba(5,150,105,.3); }

/* ── Payment Options ───────────────────────────────────── */
.ad-pay-options { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.ad-pay-btn {
  display: flex; align-items: center; justify-content: space-between; padding: 14px 16px;
  background: #FFFFFF; border: 1.5px solid rgba(28,35,64,.1); border-radius: 12px;
  cursor: pointer; transition: all .2s; color: #1C2340; text-decoration: none;
}
.ad-pay-btn:hover { border-color: #4F5BCB; box-shadow: 0 4px 12px rgba(79,91,203,.08); transform: translateY(-1px); }
.ad-pay-btn-left { display: flex; align-items: center; gap: 12px; }
.ad-pay-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ad-pay-btn.online .ad-pay-icon { background: rgba(79,91,203,.1); color: #4F5BCB; }
.ad-pay-lbl { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #1C2340; line-height: 1.2; text-align: left; }
.ad-pay-sub { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600; color: #8A96BC; margin-top: 3px; text-transform: uppercase; letter-spacing: .05em; text-align: left; }
.ad-pay-chev { color: #8A96BC; transition: transform .2s; }
.ad-pay-btn:hover .ad-pay-chev { transform: translateX(3px); color: #4F5BCB; }

/* ── Payment rows ────────────────────────────────────────────────────── */
.ad-pay-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed rgba(28,35,64,.08); gap: 16px; }
.ad-pay-row:last-child { border-bottom: none; padding-bottom: 0; }
`;

/* ─────────────────────────── Data ─────────────────────────────────── */
const documentList = [
    { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)' },
    { id: 'orcr',      label: 'Xerox OR/CR' },
    { id: 'receipt',   label: 'Delivery Receipt (New)' },
    { id: 'license',   label: "Driver's License (Prof/1/A1)" },
    { id: 'brgy',      label: 'Barangay Clearance' },
    { id: 'toda',      label: 'TODA/ACTODAN Clearance' },
    { id: 'driver_id', label: "Driver's ID" },
    { id: 'tariff',    label: 'Existing Tariff Fee' },
    { id: 'auth',      label: 'Authorization Letter' },
];

const inspectionList = [
    { id: 'headlight', label: 'Headlight' },
    { id: 'taillight', label: 'Taillight / Brake light' },
    { id: 'interior',  label: 'Interior Light' },
    { id: 'horn',      label: 'Horn' },
    { id: 'mirrors',   label: 'Side Mirrors' },
    { id: 'battery',   label: 'Battery Health' },
    { id: 'plates',    label: 'LTO & GSO Plates' },
    { id: 'muffler',   label: 'Muffler / Noise Level' },
    { id: 'sidecar',   label: 'Sidecar Integrity' },
];

const generateItems = (list, statusMap, defaultStatus) =>
    list.map(req => ({
        id:     req.id,
        name:   req.label,
        status: statusMap[req.id] || defaultStatus,
        note:   statusMap[`${req.id}_note`] || '',
    }));

const mockApplicationsData = {
    /* 1 ── TMO DOCUMENT PHASE (action-req) */
    'APP-2026-0812': {
        id: 'APP-2026-0812', type: 'Renewal', status: 'action-req', phase: 'tmo-docs',
        date: 'March 28, 2026', toda: 'TODA A (Poblacion)',
        make: 'Honda TMX 125', plate: '123 ABC', engine: 'ENG-987', chassis: 'CHS-123',
        operatorName: 'Mario Dela Cruz',
        documents: generateItems(documentList, { orcr: 'rejected', orcr_note: 'The OR/CR scan is unreadable. Please upload a high-resolution photo.' }, 'approved'),
        inspections: generateItems(inspectionList, {}, 'pending'),
    },
    /* 2 ── TMO PHYSICAL PHASE (action-req) */
    'APP-2026-0900': {
        id: 'APP-2026-0900', type: 'Renewal', status: 'action-req', phase: 'tmo-phys',
        date: 'March 30, 2026', toda: 'TODA A (Poblacion)',
        make: 'Honda TMX 125', plate: '789 GHI', engine: 'ENG-554', chassis: 'CHS-112',
        operatorName: 'Mario Dela Cruz',
        documents: generateItems(documentList, {}, 'approved'),
        inspections: generateItems(inspectionList, { mirrors: 'rejected', mirrors_note: 'Missing right side mirror', horn: 'rejected', horn_note: 'Horn is not working' }, 'approved'),
    },
    /* 3 ── CASHIER PAYMENT PHASE (Online Flow Only) */
    'APP-2026-0622': {
        id: 'APP-2026-0622', type: 'New Franchise', status: 'action-req', phase: 'cashier-pay',
        date: 'April 02, 2026', toda: 'TODA B (Wawa)',
        make: 'TVS Max 125', plate: 'Pending (New)', engine: 'ENG-622', chassis: 'CHS-622',
        operatorName: 'Mario Dela Cruz',
        documents: generateItems(documentList, {}, 'approved'),
        inspections: generateItems(inspectionList, {}, 'approved'),
        payment_due: 995.00,
    },
    /* 4 ── BPLO RELEASE PHASE */
    'APP-2026-0501': {
        id: 'APP-2026-0501', type: 'New Franchise', status: 'in-progress', phase: 'bplo-release',
        date: 'March 15, 2026', toda: 'TODA B (Wawa)',
        make: 'Kawasaki Barako 175', plate: 'Pending (New)', engine: 'ENG-501', chassis: 'CHS-501',
        operatorName: 'Mario Dela Cruz',
        documents: generateItems(documentList, {}, 'approved'),
        inspections: generateItems(inspectionList, {}, 'approved'),
        payment: { method: 'PayMongo (Maya)', ref: 'MY-88210-TRV', amount: 1695.00, date: 'March 20, 2026' },
        bplo: { assignedBody: 'PENDING ASSIGNMENT' },
    },
    /* 5 ── COMPLETED */
    'APP-2025-1102': {
        id: 'APP-2025-1102', type: 'Renewal', status: 'completed', phase: 'completed',
        date: 'Feb 10, 2025', toda: 'TODA C (Bucana)',
        make: 'Yamaha YTX 125', plate: 'DEF 456', engine: 'ENG-110', chassis: 'CHS-110',
        operatorName: 'Mario Dela Cruz',
        documents: generateItems(documentList, {}, 'approved'),
        inspections: generateItems(inspectionList, {}, 'approved'),
        payment: { method: 'Online (GCash)', ref: 'OR-77210-LGU', amount: 495.00, date: 'Feb 12, 2025' },
        bplo: { assignedBody: 'MTOP-2025-019' },
    },
};

/* ─────────────────────── Sub-components ────────────────────────────── */

const FullChecklistRow = ({ item, isPhys }) => (
    <div className={`ad-doc-row ${item.status === 'rejected' ? 'rejected' : ''}`}>
        <div className="ad-doc-left">
            <div className="ad-doc-icon-wrap">
                {item.status === 'rejected'
                    ? <XCircle size={16} />
                    : isPhys ? <Wrench size={15} /> : <FileText size={16} />}
            </div>
            <div style={{ minWidth: 0 }}>
                <p className="ad-doc-name">{item.name}</p>
                {item.status === 'rejected' && (
                    <p className="ad-doc-rejection">
                        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{isPhys ? `Defect: ${item.note}` : item.note}</span>
                    </p>
                )}
            </div>
        </div>
        <span className={`ad-doc-status ${item.status}`}>
            {item.status === 'na' ? 'N/A' : item.status}
        </span>
    </div>
);

const CompactChecklist = ({ title, icon: Icon, items, accentColor = '#059669' }) => (
    <div className="ad-card" style={{ border: `1px solid ${accentColor}22` }}>
        <div className="ad-card-header" style={{ background: `${accentColor}06` }}>
            <div className="ad-card-icon" style={{ background: `${accentColor}14`, color: accentColor }}>
                <Icon size={17} />
            </div>
            <h2 className="ad-card-title">{title}</h2>
            <span className="ad-summary-badge" style={{ color: accentColor, background: `${accentColor}14` }}>
                <CheckCircle2 size={11} />
                All {items.length} approved
            </span>
        </div>
        <div className="ad-card-body" style={{ paddingTop: 18, paddingBottom: 18 }}>
            <div className="ad-chip-grid">
                {items.map(item => (
                    <div key={item.id} className="ad-chip">
                        <CheckCircle2 size={12} color={accentColor} />
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const SettlementCard = ({ payment }) => (
    <div className="ad-card" style={{ background: 'linear-gradient(to right, #FFFFFF, #FAFAFC)' }}>
        <div className="ad-card-header">
            <div className="ad-card-icon" style={{ background: 'rgba(79,91,203,.1)', color: '#4F5BCB' }}>
                <Receipt size={17} />
            </div>
            <h2 className="ad-card-title">Settlement Details</h2>
        </div>
        <div className="ad-card-body">
            <div className="ad-pay-row">
                <span className="ad-info-label">Payment Method</span>
                <span className="ad-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {payment.method.includes('Cash') ? <Wallet size={14} color="#8A96BC" /> : <CreditCard size={14} color="#8A96BC" />}
                    {payment.method}
                </span>
            </div>
            <div className="ad-pay-row">
                <span className="ad-info-label">Reference Number</span>
                <span className="ad-info-value" style={{ fontFamily: 'monospace', letterSpacing: '1px', fontSize: 13 }}>
                    {payment.ref}
                </span>
            </div>
            <div className="ad-pay-row">
                <span className="ad-info-label">Amount Paid</span>
                <span className="ad-info-value" style={{ fontWeight: 800 }}>₱{payment.amount.toFixed(2)}</span>
            </div>
            <div className="ad-pay-row">
                <span className="ad-info-label">Payment Date</span>
                <span className="ad-info-value">{payment.date}</span>
            </div>
        </div>
    </div>
);

const BPLOCard = ({ bplo }) => (
    <div className="ad-card" style={{ border: '1px solid rgba(5,150,105,.2)' }}>
        <div className="ad-card-header" style={{ background: 'rgba(5,150,105,.04)' }}>
            <div className="ad-card-icon" style={{ background: 'rgba(5,150,105,.1)', color: '#059669' }}>
                <Stamp size={17} />
            </div>
            <h2 className="ad-card-title" style={{ color: '#059669' }}>BPLO Issuance</h2>
        </div>
        <div className="ad-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="ad-info-label" style={{ color: '#059669' }}>Assigned Body Number</span>
                <span className="ad-info-value" style={{ fontSize: 22, fontWeight: 800, color: '#059669', letterSpacing: '-.01em' }}>
                    {bplo.assignedBody}
                </span>
            </div>
        </div>
    </div>
);

export default function MTOPDetails({ application }) {
    const app = application;

    const phaseOrder = ['tmo-docs', 'tmo-phys', 'cashier-pay', 'bplo-release', 'completed'];
    const phaseIdx   = phaseOrder.indexOf(app.phase);

    const showDocsFull    = phaseIdx === 0;
    const showDocsSummary = phaseIdx >= 1;
    const showPhysFull    = phaseIdx === 1;
    const showPhysSummary = phaseIdx >= 2;

    const trackerSteps = [
        { id: 'tmo-docs',      title: 'Document Verification', desc: 'TMO review of requirements.',    icon: FileSearch    },
        { id: 'tmo-phys',      title: 'Physical Inspection',   desc: 'Unit roadworthiness check.',     icon: ClipboardCheck },
        { id: 'cashier-pay',   title: 'Payment Processing',    desc: 'Municipal fee settlement.',      icon: Wallet        },
        { id: 'bplo-release',  title: 'BPLO Processing',       desc: 'Issuance of Body Number.',       icon: Stamp         },
    ];

    const getStepStatus = (index) => {
        if (index < phaseIdx)  return 'done';
        if (index === phaseIdx) return app.status === 'action-req' ? 'error' : 'active';
        return 'waiting';
    };

    return (
        <OperatorLayout title={`Application ${app.id}`} operatorName={app.operatorName}>
            <Head title={`View ${app.id} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="ad-root">

                <div className="ad-nav">
                    <Link href={route('operator.mtop')} className="ad-back-link">
                        <ChevronLeft size={14} strokeWidth={3} /> Back to Applications
                    </Link>
                    <span className="ad-id-badge">{app.id}</span>
                </div>

                <div className="ad-header">
                    <h1 className="ad-title">{app.type} Application</h1>
                    <p className="ad-subtitle">Submitted on {app.date}</p>
                </div>

                <div className="ad-grid">

                    {/* ════════════════════════════ LEFT SIDEBAR ════════════════════════════ */}
                    <div className="ad-side-col">

                        {app.status === 'action-req' && app.phase === 'tmo-docs' && (
                            <div className="ad-action-box error">
                                <div className="ad-action-icon"><AlertTriangle size={22} color="#DC2626" /></div>
                                <h3 className="ad-action-title">Action Required</h3>
                                <p className="ad-action-desc">TMO has rejected one or more of your documents due to clarity or validity issues. Check the notes in the checklist below and upload replacement files.</p>
                                <Link href={route('operator.mtop.fix', { id: app.id })} className="ad-primary-btn">
                                    <UploadCloud size={15} /> Re-upload Documents
                                </Link>
                            </div>
                        )}

                        {app.status === 'action-req' && app.phase === 'tmo-phys' && (
                            <div className="ad-action-box error">
                                <div className="ad-action-icon"><Wrench size={22} color="#DC2626" /></div>
                                <h3 className="ad-action-title">Inspection Failed</h3>
                                <p className="ad-action-desc">Mechanical defects were found during the physical roadworthiness test. Repair all failing items before requesting a re-inspection date.</p>
                                <Link href={route('operator.mtop.fix', { id: app.id })} className="ad-primary-btn">
                                    <Wrench size={15} /> Request Re-inspection
                                </Link>
                            </div>
                        )}

                        {/* 🔴 PAYMENT PHASE (Online Only) 🔴 */}
                        {app.status === 'action-req' && app.phase === 'cashier-pay' && (
                            <div className="ad-action-box warn">
                                <div className="ad-action-icon"><Wallet size={22} color="#D97706" /></div>
                                <h3 className="ad-action-title">Payment Required</h3>
                                <p className="ad-action-desc" style={{ marginBottom: 12 }}>Your inspections are cleared. Please settle the <strong>₱{app.payment_due.toFixed(2)}</strong> franchise fee online to proceed to BPLO.</p>

                                <div className="ad-pay-options">
                                    <Link href={`/operator/mtop/${app.id}/pay`} className="ad-pay-btn online">
                                        <div className="ad-pay-btn-left">
                                            <div className="ad-pay-icon"><CreditCard size={18} strokeWidth={2.5}/></div>
                                            <div>
                                                <p className="ad-pay-lbl">Pay Online Now</p>
                                                <p className="ad-pay-sub">GCash, Maya, or Bank Card</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} strokeWidth={2.5} className="ad-pay-chev" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {app.status === 'in-progress' && app.phase === 'bplo-release' && (
                            <div className="ad-action-box info">
                                <div className="ad-action-icon"><Stamp size={22} color="#4F5BCB" /></div>
                                <h3 className="ad-action-title">BPLO Final Processing</h3>
                                <p className="ad-action-desc">Application approved and payment verified! The BPLO is issuing your franchise certificate and assigning your official tricycle Body Number sticker.</p>
                            </div>
                        )}

                        {app.status === 'completed' && (
                            <div className="ad-action-box success">
                                <div className="ad-action-icon"><CheckCircle2 size={22} color="#059669" /></div>
                                <h3 className="ad-action-title">Franchise Active</h3>
                                <p className="ad-action-desc">Your franchise is fully active. Download your digital MTOP certificate below or visit the TMO office to claim your official sticker.</p>
                                <button className="ad-primary-btn success-btn">
                                    <Download size={15} /> Download MTOP
                                </button>
                            </div>
                        )}

                        {/* Process Tracker */}
                        <div className="ad-card">
                            <div className="ad-card-header">
                                <h2 className="ad-card-title">Process Tracker</h2>
                            </div>
                            <div className="ad-card-body">
                                <div className="ad-tracker">
                                    {trackerSteps.map((step, idx) => {
                                        const status = getStepStatus(idx);
                                        const Icon   = step.icon;
                                        return (
                                            <div key={step.id} className={`ad-track-step ${status}`}>
                                                <div className="ad-track-icon">
                                                    {status === 'done'  ? <CheckCircle2 size={15} /> :
                                                     status === 'error' ? <AlertCircle size={15} />  :
                                                     <Icon size={14} />}
                                                </div>
                                                <div className="ad-track-content">
                                                    <p className="ad-track-title">{step.title}</p>
                                                    <p className="ad-track-desc">{step.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ════════════════════════════ MAIN COLUMN ════════════════════════════ */}
                    <div className="ad-main-col">

                        <div className="ad-card">
                            <div className="ad-card-header">
                                <div className="ad-card-icon"><Bike size={17} /></div>
                                <h2 className="ad-card-title">Tricycle Information</h2>
                            </div>
                            <div className="ad-card-body">
                                <div className="ad-info-grid">
                                    <div className="ad-info-item">
                                        <span className="ad-info-label">Make & Model</span>
                                        <span className="ad-info-value">{app.make}</span>
                                    </div>
                                    <div className="ad-info-item">
                                        <span className="ad-info-label">Plate Number</span>
                                        <span className="ad-info-value">{app.plate}</span>
                                    </div>
                                    <div className="ad-info-item">
                                        <span className="ad-info-label">Engine Number</span>
                                        <span className="ad-info-value">{app.engine}</span>
                                    </div>
                                    <div className="ad-info-item">
                                        <span className="ad-info-label">Chassis Number</span>
                                        <span className="ad-info-value">{app.chassis}</span>
                                    </div>
                                    <div className="ad-info-item">
                                        <span className="ad-info-label">TODA Association</span>
                                        <span className="ad-info-value">{app.toda}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {showDocsFull && (
                            <div className="ad-card">
                                <div className="ad-card-header">
                                    <div className="ad-card-icon"><FileText size={17} /></div>
                                    <h2 className="ad-card-title">Document Verification</h2>
                                </div>
                                <div className="ad-card-body">
                                    <div className="ad-doc-grid">
                                        {app.documents.map(doc => (
                                            <FullChecklistRow key={doc.id} item={doc} isPhys={false} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {showDocsSummary && !showPhysSummary && (
                            <CompactChecklist title="Document Verification" icon={FileText} items={app.documents} />
                        )}

                        {showPhysFull && (
                            <div className="ad-card">
                                <div className="ad-card-header">
                                    <div className="ad-card-icon"><Settings size={17} /></div>
                                    <h2 className="ad-card-title">Physical Inspection</h2>
                                </div>
                                <div className="ad-card-body">
                                    <div className="ad-doc-grid">
                                        {app.inspections.map(item => (
                                            <FullChecklistRow key={item.id} item={item} isPhys={true} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Shows Completed Payment Card */}
                        {app.payment && !app.bplo && (
                            <SettlementCard payment={app.payment} />
                        )}

                        {app.payment && app.bplo && (
                            <div className="ad-split-grid">
                                <SettlementCard payment={app.payment} />
                                <BPLOCard bplo={app.bplo} />
                            </div>
                        )}

                        {showDocsSummary && showPhysSummary && (
                            <div className="ad-split-grid">
                                <CompactChecklist title="Document Verification" icon={FileText} items={app.documents} />
                                <CompactChecklist title="Physical Inspection" icon={Settings} items={app.inspections} />
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </OperatorLayout>
    );
}   