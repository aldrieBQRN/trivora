import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ChevronLeft, User, MapPin, Bike, Send,
    Smartphone, CheckCircle2, ClipboardList,
    RefreshCw, Check, X, MessageSquare,
    Loader2, Clock, AlertTriangle, Eye,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Document Review page
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: dr-* (document-review)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.dr-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
}
.dr-root *, .dr-root *::before, .dr-root *::after { box-sizing: border-box; }

/* ── Back nav ────────────────────────────────────────────────────────── */
.dr-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 32px;
}
.dr-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  transition: color .18s;
}
.dr-back-link:hover { color: #1C2340; }
.dr-reviewing-badge {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #78350F;
  background: rgba(217,119,6,.09);
  border: 1px solid rgba(217,119,6,.22);
  border-radius: 50px; padding: 5px 14px;
}

/* ── Grid layout ─────────────────────────────────────────────────────── */
.dr-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 1024px) {
  .dr-grid { grid-template-columns: 320px 1fr; }
}

/* ── Cards ───────────────────────────────────────────────────────────── */
.dr-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
  overflow: hidden;
}
.dr-card-pad { padding: 32px; }

/* ── Operator profile ────────────────────────────────────────────────── */
.dr-profile-header {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding-bottom: 28px; margin-bottom: 28px;
  border-bottom: 1px solid rgba(28,35,64,.07);
}
.dr-avatar-wrap {
  width: 76px; height: 76px; border-radius: 18px;
  background: #EDEEF4;
  border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  color: #9AA3CC; margin-bottom: 16px;
}
.dr-op-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340;
  line-height: 1; margin-bottom: 6px;
}
.dr-op-toda {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #8A96BC;
}
.dr-profile-fields { display: flex; flex-direction: column; gap: 20px; }
.dr-field { display: flex; align-items: center; gap: 14px; }
.dr-field-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: #EDEEF4;
  border: 1px solid rgba(28,35,64,.07);
  display: flex; align-items: center; justify-content: center;
  color: #8A96BC;
}
.dr-field-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 3px;
}
.dr-field-value {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600;
  color: #1C2340; letter-spacing: -.01em;
}

/* ── Right panel heading ─────────────────────────────────────────────── */
.dr-panel-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.dr-panel-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.dr-panel-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px; font-weight: 800;
  letter-spacing: -.025em; color: #1C2340; line-height: 1;
  margin-bottom: 28px;
}

/* ── Document rows ───────────────────────────────────────────────────── */
.dr-doc-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }

.dr-doc-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(28,35,64,.08);
  background: #FAFAFA;
  transition: border-color .18s, background .18s;
}
.dr-doc-row.is-approved {
  border-color: rgba(5,150,105,.3);
  background: rgba(5,150,105,.04);
}
.dr-doc-row.is-rejected {
  border-color: rgba(220,38,38,.28);
  background: rgba(220,38,38,.03);
}

.dr-doc-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.dr-doc-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  color: #9AA3CC;
  transition: all .18s;
}
.dr-doc-row.is-approved .dr-doc-icon {
  background: rgba(5,150,105,.1);
  border-color: rgba(5,150,105,.25);
  color: #059669;
}
.dr-doc-row.is-rejected .dr-doc-icon {
  background: rgba(220,38,38,.08);
  border-color: rgba(220,38,38,.22);
  color: #DC2626;
}
.dr-doc-name {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 5px; letter-spacing: -.01em;
}
.dr-doc-name span.mandatory-dot {
  display: inline-block; width: 5px; height: 5px; border-radius: 50%;
  background: #DC2626; margin-left: 6px; margin-bottom: 1px; vertical-align: middle;
}
.dr-doc-meta {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
  display: flex; align-items: center; gap: 5px;
}
.dr-doc-meta.rejection-note { color: #DC2626; }
.dr-doc-preview-btn {
  background: none; border: none; cursor: pointer; padding: 0;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
  display: inline-flex; align-items: center; gap: 5px;
  transition: color .15s;
}
.dr-doc-preview-btn:hover { color: #4F5BCB; }

.dr-doc-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.dr-action-btn {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(28,35,64,.1);
  background: #FFFFFF; cursor: pointer;
  color: #9AA3CC;
  transition: all .18s;
}
.dr-action-btn:hover.approve-btn  { border-color: rgba(5,150,105,.4);  color: #059669; background: rgba(5,150,105,.05); }
.dr-action-btn:hover.reject-btn   { border-color: rgba(220,38,38,.35); color: #DC2626; background: rgba(220,38,38,.05); }
.dr-action-btn.active.approve-btn { background: #059669; border-color: #059669; color: #FFFFFF; box-shadow: 0 3px 10px rgba(5,150,105,.3); }
.dr-action-btn.active.reject-btn  { background: #DC2626; border-color: #DC2626; color: #FFFFFF; box-shadow: 0 3px 10px rgba(220,38,38,.25); }

/* ── Rejection reason modal ──────────────────────────────────────────── */
.dr-modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(10,14,50,.4);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.dr-modal {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(28,35,64,.2);
  width: 100%; max-width: 420px;
  padding: 32px;
  animation: drModalIn .22s cubic-bezier(.2,0,.2,1) both;
}
@keyframes drModalIn {
  from { opacity: 0; transform: translateY(12px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.dr-modal-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 800;
  color: #1C2340; letter-spacing: -.02em; margin-bottom: 6px;
}
.dr-modal-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 20px;
}
.dr-modal-doc-label {
  font-family: 'Inter', sans-serif;
  font-size: 11.5px; font-weight: 600;
  color: #DC2626; background: rgba(220,38,38,.07);
  border: 1px solid rgba(220,38,38,.18);
  border-radius: 8px; padding: 8px 12px;
  margin-bottom: 20px;
}
.dr-modal-textarea {
  width: 100%; resize: none;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  color: #1C2340;
  border: 1px solid rgba(28,35,64,.12);
  border-radius: 10px; padding: 12px 14px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  margin-bottom: 20px;
}
.dr-modal-textarea:focus {
  border-color: rgba(220,38,38,.4);
  box-shadow: 0 0 0 3px rgba(220,38,38,.09);
}
.dr-modal-textarea::placeholder { color: #9AA3CC; }
.dr-modal-actions { display: flex; gap: 10px; }
.dr-modal-cancel {
  flex: 1; height: 42px; border-radius: 10px;
  border: 1px solid rgba(28,35,64,.1);
  background: #FFFFFF; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #5A6488;
  transition: all .18s;
}
.dr-modal-cancel:hover { border-color: rgba(28,35,64,.2); color: #1C2340; }
.dr-modal-confirm {
  flex: 1; height: 42px; border-radius: 10px;
  border: none; background: #DC2626; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #FFFFFF;
  transition: background .18s;
}
.dr-modal-confirm:hover { background: #B91C1C; }

/* ── Action zone ─────────────────────────────────────────────────────── */
.dr-action-zone {
  background: #FAFAFA;
  border: 1px solid rgba(28,35,64,.07);
  border-radius: 14px;
  padding: 40px 32px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}

/* Waiting */
.dr-zone-wait-icon {
  width: 44px; height: 44px; border-radius: 11px;
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.09);
  display: flex; align-items: center; justify-content: center;
  color: #C5CBE5; margin-bottom: 14px;
}
.dr-zone-wait-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #C5CBE5; margin-bottom: 4px;
}
.dr-zone-wait-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 600;
  letter-spacing: .12em; text-transform: uppercase;
  color: #C5CBE5;
}

/* Approved */
.dr-zone-ok-icon {
  width: 60px; height: 60px; border-radius: 16px;
  background: #1C2340; color: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(28,35,64,.3);
}
.dr-zone-ok-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340; margin-bottom: 8px;
}
.dr-zone-ok-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 28px;
  max-width: 280px; line-height: 1.7;
}
.dr-submit-btn {
  width: 100%; max-width: 300px; height: 50px; border-radius: 11px;
  border: none; background: #1C2340; color: #FFFFFF; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .18s, box-shadow .18s;
  box-shadow: 0 4px 14px rgba(28,35,64,.25);
}
.dr-submit-btn:hover:not(:disabled) { background: #2E3A9E; }
.dr-submit-btn:disabled { opacity: .6; cursor: default; }

/* Rejected */
.dr-zone-err-icon {
  width: 60px; height: 60px; border-radius: 16px;
  background: rgba(220,38,38,.08); color: #DC2626;
  border: 1px solid rgba(220,38,38,.2);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}
.dr-zone-err-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px; font-weight: 800;
  letter-spacing: -.02em; color: #DC2626; margin-bottom: 8px;
}
.dr-zone-err-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 28px;
  max-width: 280px; line-height: 1.7;
}
.dr-reject-btn {
  width: 100%; max-width: 300px; height: 50px; border-radius: 11px;
  border: none; background: #DC2626; color: #FFFFFF; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .18s;
  box-shadow: 0 4px 14px rgba(220,38,38,.25);
}
.dr-reject-btn:hover:not(:disabled) { background: #B91C1C; }
.dr-reject-btn:disabled { opacity: .6; cursor: default; }
`;

export default function DocumentReview({ application }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [docStatuses, setDocStatuses] = useState({});
    const [rejectionReasons, setRejectionReasons] = useState({});

    // Rejection modal state
    const [pendingRejectId, setPendingRejectId] = useState(null);
    const [draftReason, setDraftReason] = useState('');

    const requirements = [
        { id: 'orcr',     label: 'Xerox OR/CR (Motorcycle)',            mandatory: true  },
        { id: 'license',  label: "Driver's License (Back-to-back)",      mandatory: true  },
        { id: 'brgy',     label: 'Barangay Clearance (Original)',        mandatory: true  },
        { id: 'toda',     label: 'TODA/NAFTODA/ACTODAN Clearance',       mandatory: true  },
        { id: 'prangkisa',label: 'Xerox Prangkisa (Renewal)',            mandatory: false },
        { id: 'tariff',   label: 'List of Existing Tariff Fee',          mandatory: false },
    ];

    const handleApprove = (id) => {
        setDocStatuses(prev => ({ ...prev, [id]: 'approved' }));
        setRejectionReasons(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const openRejectModal = (id) => {
        setPendingRejectId(id);
        setDraftReason(rejectionReasons[id] || '');
    };

    const confirmRejection = () => {
        const reason = draftReason.trim() || 'Document is invalid or unreadable';
        setDocStatuses(prev => ({ ...prev, [pendingRejectId]: 'rejected' }));
        setRejectionReasons(prev => ({ ...prev, [pendingRejectId]: reason }));
        setPendingRejectId(null);
        setDraftReason('');
    };

    const cancelRejection = () => {
        setPendingRejectId(null);
        setDraftReason('');
    };

    const anyRejected        = Object.values(docStatuses).some(s => s === 'rejected');
    const allMandatoryApproved = requirements
        .filter(r => r.mandatory)
        .every(r => docStatuses[r.id] === 'approved');
    const canSchedule        = allMandatoryApproved && !anyRejected;

    const handleFinalAction = (type) => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            if (type === 'approve') {
                alert(`SUCCESS: ${application.id} moved to Phase 2. Operator notified via SMS.`);
            } else {
                alert(`NOTICE: Rejection report sent. Operator must re-upload specific files.`);
            }
            window.location.href = '/tmo/docs';
        }, 1500);
    };

    const pendingDoc = requirements.find(r => r.id === pendingRejectId);

    return (
        <TrivoraLayout title="Document Review" role="TMO Officer">
            <Head title={`Review: ${application.id} | TRIVORA`} />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── Rejection Reason Modal ── */}
            {pendingRejectId && (
                <div className="dr-modal-overlay" onClick={cancelRejection}>
                    <div className="dr-modal" onClick={e => e.stopPropagation()}>
                        <p className="dr-modal-title">Rejection Reason</p>
                        <p className="dr-modal-sub">Explain why this document failed verification</p>
                        <p className="dr-modal-doc-label">{pendingDoc?.label}</p>
                        <textarea
                            className="dr-modal-textarea"
                            rows={3}
                            placeholder="e.g., Blurry photo, document expired, wrong file uploaded…"
                            value={draftReason}
                            onChange={e => setDraftReason(e.target.value)}
                            autoFocus
                        />
                        <div className="dr-modal-actions">
                            <button className="dr-modal-cancel" onClick={cancelRejection}>Cancel</button>
                            <button className="dr-modal-confirm" onClick={confirmRejection}>Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="dr-root" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 52 }}>

                {/* ── Back nav ── */}
                <div className="dr-nav">
                    <Link href="/tmo/docs" className="dr-back-link">
                        <ChevronLeft size={14} strokeWidth={3} />
                        Back to Document Queue
                    </Link>
                    <span className="dr-reviewing-badge">Reviewing {application.id}</span>
                </div>

                <div className="dr-grid">

                    {/* ════ LEFT: Operator Profile ════ */}
                    <div>
                        <div className="dr-card">
                            <div className="dr-card-pad">
                                <div className="dr-profile-header">
                                    <div className="dr-avatar-wrap">
                                        <User size={30} strokeWidth={1.6} />
                                    </div>
                                    <p className="dr-op-name">{application.operator}</p>
                                    <p className="dr-op-toda">{application.toda}</p>
                                </div>

                                <div className="dr-profile-fields">
                                    <ProfileField icon={Smartphone} label="Contact"  value={application.contact}  />
                                    <ProfileField icon={MapPin}      label="Barangay" value={application.barangay} />
                                    <ProfileField icon={Bike}        label="Vehicle"  value={application.make}     />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════ RIGHT: Checklist + Action ════ */}
                    <div>
                        <div className="dr-card">
                            <div className="dr-card-pad">

                                <p className="dr-panel-eyebrow">Phase 1 · Document Verification</p>
                                <h2 className="dr-panel-title">Requirement Checklist</h2>

                                {/* Document rows */}
                                <div className="dr-doc-list">
                                    {requirements.map((doc) => {
                                        const status = docStatuses[doc.id];
                                        return (
                                            <div
                                                key={doc.id}
                                                className={`dr-doc-row${status === 'approved' ? ' is-approved' : status === 'rejected' ? ' is-rejected' : ''}`}
                                            >
                                                <div className="dr-doc-left">
                                                    <div className="dr-doc-icon">
                                                        <ClipboardList size={17} strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <p className="dr-doc-name">
                                                            {doc.label}
                                                            {doc.mandatory && <span className="mandatory-dot" />}
                                                        </p>
                                                        {status === 'rejected' ? (
                                                            <p className="dr-doc-meta rejection-note">
                                                                <MessageSquare size={9} strokeWidth={2.5} />
                                                                {rejectionReasons[doc.id]}
                                                            </p>
                                                        ) : (
                                                            <button className="dr-doc-preview-btn">
                                                                <Eye size={10} strokeWidth={2} />
                                                                Preview file
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="dr-doc-actions">
                                                    <button
                                                        onClick={() => handleApprove(doc.id)}
                                                        className={`dr-action-btn approve-btn${status === 'approved' ? ' active' : ''}`}
                                                        title="Approve"
                                                    >
                                                        <Check size={16} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => openRejectModal(doc.id)}
                                                        className={`dr-action-btn reject-btn${status === 'rejected' ? ' active' : ''}`}
                                                        title="Reject"
                                                    >
                                                        <X size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Dynamic Action Zone ── */}
                                <div className="dr-action-zone">
                                    {canSchedule ? (
                                        <>
                                            <div className="dr-zone-ok-icon">
                                                <CheckCircle2 size={28} strokeWidth={2} />
                                            </div>
                                            <p className="dr-zone-ok-title">Verification Passed</p>
                                            <p className="dr-zone-ok-sub">
                                                All mandatory documents are valid. You may now
                                                schedule the on-site physical inspection.
                                            </p>
                                            <button
                                                className="dr-submit-btn"
                                                onClick={() => handleFinalAction('approve')}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing
                                                    ? <Loader2 size={15} className="animate-spin" />
                                                    : <Send size={15} strokeWidth={2} />}
                                                Schedule Physical Test
                                            </button>
                                        </>
                                    ) : anyRejected ? (
                                        <>
                                            <div className="dr-zone-err-icon">
                                                <AlertTriangle size={28} strokeWidth={2} />
                                            </div>
                                            <p className="dr-zone-err-title">Action Required</p>
                                            <p className="dr-zone-err-sub">
                                                One or more documents failed review. Send a
                                                rejection notice so the operator can re-upload
                                                the corrected files.
                                            </p>
                                            <button
                                                className="dr-reject-btn"
                                                onClick={() => handleFinalAction('reject')}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing
                                                    ? <Loader2 size={15} className="animate-spin" />
                                                    : <RefreshCw size={15} strokeWidth={2} />}
                                                Send Rejection Notice
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="dr-zone-wait-icon">
                                                <Clock size={22} strokeWidth={1.8} />
                                            </div>
                                            <p className="dr-zone-wait-title">Awaiting Verification</p>
                                            <p className="dr-zone-wait-sub">Review all mandatory items above</p>
                                        </>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </TrivoraLayout>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function ProfileField({ icon: Icon, label, value }) {
    return (
        <div className="dr-field">
            <div className="dr-field-icon">
                <Icon size={16} strokeWidth={2} />
            </div>
            <div>
                <p className="dr-field-label">{label}</p>
                <p className="dr-field-value">{value}</p>
            </div>
        </div>
    );
}