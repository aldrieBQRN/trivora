import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import Swal from 'sweetalert2';
import {
    ChevronLeft,
    AlertTriangle,
    UploadCloud,
    FileText,
    CheckCircle2,
    XCircle,
    Info,
    Loader2,
    Check,
    Wrench,
    Settings,
    Clock
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — Fix Application
   Matches TMO Dashboard's exact slate/indigo token system
   Path: resources/js/Pages/Operator/Compliance/MTOPFix.jsx
   Prefix: mf-* (mtop-fix)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.mf-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  width: 100%;
  padding-bottom: 64px;
}
.mf-root *, .mf-root *::before, .mf-root *::after { box-sizing: border-box; }

/* ── Nav & Header ────────────────────────────────────────────────────── */
.mf-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 32px;
}
.mf-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none; transition: color .18s;
}
.mf-back-link:hover { color: #1C2340; }
.mf-id-badge {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; color: #DC2626;
  background: rgba(220,38,38,.09); border: 1px solid rgba(220,38,38,.2);
  border-radius: 6px; padding: 5px 12px; display: flex; align-items: center; gap: 6px;
}

.mf-header { margin-bottom: 32px; }
.mf-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1; margin-bottom: 8px;
}
.mf-subtitle {
  font-family: 'Inter', sans-serif; font-size: 13.5px;
  font-weight: 500; color: #5A6488;
}

/* ── Alert Banner ───────────────────────────────────────────────────── */
.mf-alert {
  background: rgba(220,38,38,.04); border: 1px solid rgba(220,38,38,.2);
  border-radius: 14px; padding: 20px 24px;
  display: flex; align-items: flex-start; gap: 16px; margin-bottom: 32px;
}
.mf-alert-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: #FFFFFF; border: 1px solid rgba(220,38,38,.2);
  display: flex; align-items: center; justify-content: center; color: #DC2626;
}
.mf-alert-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px;
  font-weight: 800; color: #B91C1C; margin-bottom: 4px;
}
.mf-alert-desc {
  font-family: 'Inter', sans-serif; font-size: 13px;
  color: #7F1D1D; line-height: 1.6;
}

/* ── Cards & Grids ──────────────────────────────────────────────────── */
.mf-card {
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px; box-shadow: 0 1px 6px rgba(28,35,64,.05);
  overflow: hidden; margin-bottom: 32px;
}
.mf-card-header {
  padding: 20px 24px; border-bottom: 1px solid rgba(28,35,64,.06);
  background: #FAFAFC; display: flex; align-items: center; gap: 10px;
}
.mf-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px;
  font-weight: 800; color: #1C2340;
}
.mf-card-body { padding: 32px; }

/* 2-Column Grid for OK items */
.mf-doc-grid {
  display: grid; grid-template-columns: 1fr; gap: 20px;
}
@media (min-width: 1024px) {
  .mf-doc-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Upload Row (Rejected) - Spans full width for better focus */
.mf-row-rejected {
  border: 1.5px solid rgba(220,38,38,.2); border-radius: 16px;
  background: #FFFFFF; overflow: hidden; margin-bottom: 8px;
}
.mf-row-rejected-header {
  padding: 20px 24px; background: rgba(220,38,38,.03);
  border-bottom: 1px solid rgba(220,38,38,.1);
  display: flex; align-items: flex-start; justify-content: space-between;
}
.mf-doc-name-err {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px;
  font-weight: 700; color: #1C2340; margin-bottom: 6px; line-height: 1.4;
}
.mf-tmo-note {
  font-family: 'Inter', sans-serif; font-size: 12.5px;
  font-weight: 500; color: #DC2626; display: flex; align-items: flex-start; gap: 8px;
}
.mf-dropzone {
  display: block; /* Required for label to act as a container */
  padding: 40px 24px; text-align: center;
  background: #FAFAFC; border: 2px dashed rgba(79,91,203,.2);
  margin: 24px; border-radius: 12px; cursor: pointer;
  transition: all .2s;
}
.mf-dropzone:hover {
  background: rgba(79,91,203,.03); border-color: rgba(79,91,203,.5);
}
.mf-dropzone.has-file {
  background: rgba(5,150,105,.04); border: 2.5px solid rgba(5,150,105,.3);
}
.mf-drop-icon {
  width: 48px; height: 48px; border-radius: 12px;
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.1);
  color: #4F5BCB; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px; box-shadow: 0 2px 8px rgba(28,35,64,.04);
}
.mf-drop-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px;
  font-weight: 700; color: #1C2340; margin-bottom: 4px;
}
.mf-drop-sub {
  font-family: 'Inter', sans-serif; font-size: 12px;
  color: #8A96BC;
}

/* Locked Row (Approved/Pending/NA) */
.mf-row-ok {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-radius: 14px;
  border: 1px solid rgba(28,35,64,.08); background: #FAFAFC;
}
.mf-doc-name-ok {
  font-family: 'Inter', sans-serif; font-size: 13.5px;
  font-weight: 600; color: #5A6488; margin-bottom: 2px; line-height: 1.4; padding-right: 12px;
}
.mf-doc-meta-ok {
  font-family: 'Inter', sans-serif; font-size: 11px; color: #8A96BC;
}
.mf-status-ok {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif; font-size: 9px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  padding: 6px 14px; border-radius: 8px; white-space: nowrap;
}
.mf-status-ok.approved { color: #059669; background: rgba(5,150,105,.1); }
.mf-status-ok.pending  { color: #D97706; background: rgba(217,119,6,.1); }
.mf-status-ok.na       { color: #8A96BC; background: rgba(28,35,64,.08); }

/* Repair Confirmation Box */
.mf-confirm-box {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px; border-radius: 16px;
  background: rgba(79,91,203,.05); border: 1px solid rgba(79,91,203,.2);
  margin-top: 32px; cursor: pointer; transition: all .2s;
}
.mf-confirm-box:hover { background: rgba(79,91,203,.08); border-color: rgba(79,91,203,.4); }
.mf-confirm-box input[type="checkbox"] {
  width: 20px; height: 20px; cursor: pointer;
  accent-color: #4F5BCB;
}
.mf-confirm-label {
  font-family: 'Inter', sans-serif; font-size: 14px;
  font-weight: 600; color: #1C2340; cursor: pointer; user-select: none; line-height: 1.5;
}

/* ── Footer Action ──────────────────────────────────────────────────── */
.mf-footer {
  display: flex; justify-content: flex-end; gap: 16px;
  padding-top: 32px; border-top: 1px solid rgba(28,35,64,.08); margin-top: 16px;
}
.mf-cancel-btn {
  height: 52px; padding: 0 32px; border-radius: 12px;
  border: 1px solid rgba(28,35,64,.12); background: #FFFFFF;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #5A6488;
  cursor: pointer; transition: all .18s; text-decoration: none; display: flex; align-items: center;
}
.mf-cancel-btn:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.3); }

.mf-submit-btn {
  height: 52px; padding: 0 40px; border-radius: 12px;
  background: #1C2340; color: #FFFFFF; border: none;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  transition: all .2s; box-shadow: 0 4px 14px rgba(28,35,64,.25);
}
.mf-submit-btn:hover:not(:disabled) { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,91,203,.3); }
.mf-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const documentList = [
    { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)' },
    { id: 'orcr',       label: 'Xerox OR/CR' },
    { id: 'receipt',    label: 'Delivery Receipt (Kung walang OR/CR / New)' },
    { id: 'license',    label: "Driver's License Back-to-back (Prof/Restriction 1/A1)" },
    { id: 'brgy',       label: 'Barangay Clearance (Original)' },
    { id: 'toda',       label: 'TODA/NAFTODA/ACTODAN Clearance (Original)' },
    { id: 'driver_id', label: "Driver's ID Issued by NAFTODA/ACTODAN" },
    { id: 'tariff',    label: 'List of Existing Tariff Fee (For sidecar)' },
    { id: 'auth',      label: "Authorization Letter & ID (Kung hindi may-ari)" },
];

const inspectionList = [
    { id: 'headlight', label: 'Ilaw sa harap (Headlight)' },
    { id: 'taillight', label: 'Ilaw sa likod (Taillight / Brake light)' },
    { id: 'interior',  label: 'Ilaw sa loob (Interior Light)' },
    { id: 'horn',      label: 'Busina (Horn)' },
    { id: 'mirrors',   label: 'Side Mirrors' },
    { id: 'battery',   label: 'Baterya (Battery)' },
    { id: 'plates',    label: 'Plaka (LTO & GSO Plates)' },
    { id: 'muffler',   label: 'Muffler / Tambutso' },
    { id: 'sidecar',   label: 'Sidecar / Floorboard Integrity' }
];

const generateItems = (list, statusMap, defaultStatus) => {
    return list.map(req => ({
        id: req.id, name: req.label,
        status: statusMap[req.id] || defaultStatus, note: statusMap[`${req.id}_note`] || ''
    }));
};

const mockApplicationsData = {
    'APP-2026-0812': {
        id: 'APP-2026-0812', operatorName: 'Mario Dela Cruz', phase: 'tmo-docs',
        documents: generateItems(documentList, {
            'prangkisa': 'approved',
            'orcr': 'rejected', 'orcr_note': 'OR/CR image is blurred and unreadable. Please re-upload a clear copy.',
            'receipt': 'na', 'license': 'approved', 'brgy': 'approved', 'toda': 'approved',
            'driver_id': 'approved', 'tariff': 'pending', 'auth': 'na'
        }, 'pending'),
        inspections: []
    },
    'APP-2026-0900': {
        id: 'APP-2026-0900', operatorName: 'Mario Dela Cruz', phase: 'tmo-phys',
        documents: generateItems(documentList, { 'receipt': 'na', 'auth': 'na' }, 'approved'),
        inspections: generateItems(inspectionList, {
            'mirrors': 'rejected', 'mirrors_note': 'Missing right side mirror',
            'muffler': 'rejected', 'muffler_note': 'Excessive muffler noise (Above 90dB)',
            'sidecar': 'rejected', 'sidecar_note': 'Severe floorboard rust / structural weakness'
        }, 'approved')
    }
};

export default function MTOPFix({ application }) {
    const app = application || mockApplicationsData['APP-2026-0812'];

    const isPhysFix = app.phase === 'tmo-phys';
    const rejectedDocs = app.documents ? app.documents.filter(d => d.status === 'rejected') : [];
    const rejectedInspections = app.inspections ? app.inspections.filter(i => i.status === 'rejected') : [];

    const [newFiles, setNewFiles] = useState({});
    const [repairsConfirmed, setRepairsConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Capture the files selected by the user
    const handleFileSelect = (docId, files) => {
        setNewFiles(prev => ({
            ...prev,
            [docId]: files
        }));
    };

    const handleSubmit = () => {
        Swal.fire({
            title: isPhysFix ? 'Request Re-inspection?' : 'Submit Corrections?',
            text: isPhysFix
                ? 'Confirm that all defects have been repaired. Your tricycle will be scheduled for another physical inspection.'
                : 'Confirm that you have uploaded the correct replacement documents.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1C2340',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Submit',
            customClass: { title: 'font-jakarta', popup: 'font-inter' }
        }).then((result) => {
            if (result.isConfirmed) {
                if (isPhysFix) {
                    router.post(`/operator/mtop/${app.id}/fix`, {
                        repairs_confirmed: true,
                    }, {
                        onStart: () => setIsSubmitting(true),
                        onFinish: () => setIsSubmitting(false),
                        onSuccess: () => {
                            Swal.fire({
                                title: 'Submitted Successfully!',
                                text: 'Your re-inspection request has been sent to the TMO.',
                                icon: 'success',
                                confirmButtonColor: '#059669',
                                timer: 2500,
                                showConfirmButton: false
                            });
                        }
                    });
                } else {
                    router.post(`/operator/mtop/${app.id}/fix`, {
                        documents: newFiles,
                    }, {
                        forceFormData: true,
                        onStart: () => setIsSubmitting(true),
                        onFinish: () => setIsSubmitting(false),
                        onSuccess: () => {
                            Swal.fire({
                                title: 'Submitted Successfully!',
                                text: 'Your updated documents have been sent to the TMO for review.',
                                icon: 'success',
                                confirmButtonColor: '#059669',
                                timer: 2500,
                                showConfirmButton: false
                            });
                        }
                    });
                }
            }
        });
    };

    const isSubmitDisabled = isSubmitting || (!isPhysFix && rejectedDocs.length > 0 && !rejectedDocs.every(d => newFiles[d.id] && newFiles[d.id].length > 0)) || (isPhysFix && !repairsConfirmed);

    return (
        <OperatorLayout title={isPhysFix ? "Request Re-inspection" : "Fix Application"} operatorName={app.operatorName}>
            <Head title={isPhysFix ? "Request Re-inspection | TRIVORA" : "Fix Application | TRIVORA"} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="mf-root">
                <div className="mf-nav">
                    <Link href={route('operator.mtop.details', { id: app.id })} className="mf-back-link">
                        <ChevronLeft size={14} strokeWidth={3} /> Back to Details
                    </Link>
                    <span className="mf-id-badge">
                        <AlertTriangle size={12} strokeWidth={2.5}/> Action Required
                    </span>
                </div>

                <div className="mf-header">
                    <h1 className="mf-title">
                        {isPhysFix ? 'Request Re-inspection' : 'Submit Corrections'}
                    </h1>
                    <p className="mf-subtitle">
                        {isPhysFix
                            ? 'Review the defects found during inspection and confirm repairs.'
                            : 'Review the TMO notes below and upload the correct documents.'}
                    </p>
                </div>

                <div className="mf-alert">
                    <div className="mf-alert-icon"><AlertTriangle size={24} strokeWidth={2.5} /></div>
                    <div>
                        <h2 className="mf-alert-title">Your application is currently paused.</h2>
                        <p className="mf-alert-desc">
                            {isPhysFix
                                ? `The TMO team found ${rejectedInspections.length} defects. Please ensure all items are repaired before requesting re-inspection.`
                                : `The TMO team found issues with ${rejectedDocs.length} requirements. Please provide updated files to resume processing.`}
                        </p>
                    </div>
                </div>

                <div className="mf-card">
                    <div className="mf-card-header">
                        {isPhysFix ? <Settings size={16} strokeWidth={2}/> : <FileText size={16} strokeWidth={2}/>}
                        <h2 className="mf-card-title">{isPhysFix ? 'Physical Repair Checklist' : 'Document Submission'}</h2>
                    </div>
                    <div className="mf-card-body">
                        <div className="mf-doc-grid">
                            {(isPhysFix ? app.inspections : app.documents).map((item) => {
                                if (item.status === 'rejected') {
                                    const hasFiles = newFiles[item.id];
                                    return (
                                        <div key={item.id} className="mf-row-rejected">
                                            <div className="mf-row-rejected-header">
                                                <div>
                                                    <p className="mf-doc-name-err">{item.name}</p>
                                                    <div className="mf-tmo-note">
                                                        {isPhysFix ? <Wrench size={14} /> : <Info size={14} />}
                                                        <span>{isPhysFix ? 'Defect' : 'TMO Note'}: {item.note}</span>
                                                    </div>
                                                </div>
                                                <XCircle size={22} color="#DC2626" strokeWidth={2} />
                                            </div>

                                            {!isPhysFix && (
                                                <label className={`mf-dropzone ${hasFiles ? 'has-file' : ''}`}>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*,.pdf"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            if (e.target.files?.length > 0) {
                                                                handleFileSelect(item.id, Array.from(e.target.files));
                                                            }
                                                        }}
                                                    />
                                                    <div className="mf-drop-icon">
                                                        {hasFiles ? <Check size={22} /> : <UploadCloud size={22} />}
                                                    </div>
                                                    <p className="mf-drop-title">
                                                        {hasFiles 
                                                            ? `${hasFiles.length} file(s) selected: ${hasFiles.map(f => f.name).join(', ')}`
                                                            : 'Click to upload replacement file(s)'
                                                        }
                                                    </p>
                                                    <p className="mf-drop-sub">{hasFiles ? 'Files ready' : 'PDF, JPG, or PNG (Max 5MB)'}</p>
                                                </label>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div key={item.id} className="mf-row-ok">
                                        <div>
                                            <p className="mf-doc-name-ok">{item.name}</p>
                                            <p className="mf-doc-meta-ok">Approved & Verified</p>
                                        </div>
                                        <span className={`mf-status-ok ${item.status}`}>
                                            <CheckCircle2 size={10} strokeWidth={3} /> Verified
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {isPhysFix && (
                            <label className="mf-confirm-box">
                                <input type="checkbox" checked={repairsConfirmed} onChange={(e) => setRepairsConfirmed(e.target.checked)} />
                                <span className="mf-confirm-label">
                                    I confirm that all defects listed above have been repaired and my tricycle is ready for physical re-inspection.
                                </span>
                            </label>
                        )}
                    </div>
                </div>

                <div className="mf-footer">
                    <Link href={route('operator.mtop.details', { id: app.id })} className="mf-cancel-btn">
                        Cancel
                    </Link>
                    <button className="mf-submit-btn" onClick={handleSubmit} disabled={isSubmitDisabled}>
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isPhysFix ? <Check size={16} strokeWidth={2.5} /> : <UploadCloud size={16} strokeWidth={2.5} />)}
                        {isSubmitting ? 'Processing...' : (isPhysFix ? 'Request Re-inspection' : 'Submit Corrections')}
                    </button>
                </div>
            </div>
        </OperatorLayout>
    );
}