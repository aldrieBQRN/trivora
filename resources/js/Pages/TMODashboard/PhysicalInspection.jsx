import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    ChevronLeft, Check, X, CheckCircle2, Bike,
    Loader2, Gauge, XCircle, MessageSquare,
    AlertTriangle, RefreshCw, Search, MapPin,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Physical Inspection page
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: pi-* (physical-inspection)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.pi-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 48px;
}
.pi-root *, .pi-root *::before, .pi-root *::after { box-sizing: border-box; }

/* ── Back nav ────────────────────────────────────────────────────────── */
.pi-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 32px;
}
.pi-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  transition: color .18s;
}
.pi-back-link:hover { color: #1C2340; }
.pi-phase-badge {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #2E3A9E;
  background: rgba(79,91,203,.09);
  border: 1px solid rgba(79,91,203,.22);
  border-radius: 50px; padding: 5px 14px;
}

/* ── Grid layout ─────────────────────────────────────────────────────── */
.pi-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 1024px) {
  .pi-grid { grid-template-columns: 320px 1fr; }
}

/* ── Cards ───────────────────────────────────────────────────────────── */
.pi-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
  overflow: hidden;
}.pi-grid > div:first-child .pi-card {
  background: linear-gradient(135deg, #FFFFFF 0%, rgba(79,91,203,.03) 100%);
  border: 1.5px solid rgba(79,91,203,.2);
  box-shadow: 0 4px 16px rgba(79,91,203,.08), 0 1px 3px rgba(28,35,64,.05);
}.pi-card-pad { padding: 32px; }

/* ── Unit info profile ───────────────────────────────────────────────── */
.pi-profile-header {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding-bottom: 28px; margin-bottom: 28px;
  border-bottom: 1px solid rgba(79,91,203,.15);
}
.pi-avatar-wrap {
  width: 76px; height: 76px; border-radius: 18px;
  background: linear-gradient(135deg, rgba(79,91,203,.12) 0%, rgba(79,91,203,.06) 100%);
  border: 1.5px solid rgba(79,91,203,.25);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB; margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(79,91,203,.1);
}
.pi-op-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340;
  line-height: 1; margin-bottom: 6px;
}
.pi-op-unit {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #8A96BC;
}
.pi-profile-fields { display: flex; flex-direction: column; gap: 20px; }
.pi-field { display: flex; align-items: center; gap: 14px; }
.pi-field-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.04) 100%);
  border: 1px solid rgba(79,91,203,.2);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB;
}
.pi-field-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 3px;
}
.pi-field-value {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600;
  color: #1C2340; letter-spacing: -.01em;
}

/* ── Checklist section ───────────────────────────────────────────────── */
.pi-panel-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.pi-panel-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.pi-panel-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px; font-weight: 800;
  letter-spacing: -.025em; color: #1C2340; line-height: 1;
  margin-bottom: 28px;
}

.pi-checklist {
  display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px;
}

.pi-item {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(28,35,64,.08);
  background: #FAFAFA;
  transition: border-color .18s, background .18s;
}
.pi-item.is-passed {
  border-color: rgba(5,150,105,.3);
  background: rgba(5,150,105,.04);
}
.pi-item.is-failed {
  border-color: rgba(220,38,38,.28);
  background: rgba(220,38,38,.03);
}

.pi-item-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.pi-item-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  color: #9AA3CC;
  transition: all .18s;
}
.pi-item.is-passed .pi-item-icon {
  background: rgba(5,150,105,.1);
  border-color: rgba(5,150,105,.25);
  color: #059669;
}
.pi-item.is-failed .pi-item-icon {
  background: rgba(220,38,38,.08);
  border-color: rgba(220,38,38,.22);
  color: #DC2626;
}

.pi-item-label {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 5px; letter-spacing: -.01em;
}
.pi-item.is-passed .pi-item-label { color: #064E3B; }
.pi-item.is-failed .pi-item-label { color: #7F1D1D; }

.pi-item-note {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #DC2626;
  display: flex; align-items: center; gap: 5px;
}

.pi-item-actions { display: flex; gap: 6px; flex-shrink: 0; }
.pi-action-btn {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(28,35,64,.1);
  background: #FFFFFF; cursor: pointer;
  color: #9AA3CC; transition: all .18s;
}
.pi-action-btn:hover.pass-btn  { border-color: rgba(5,150,105,.4);  color: #059669; background: rgba(5,150,105,.05); }
.pi-action-btn:hover.fail-btn  { border-color: rgba(220,38,38,.35); color: #DC2626; background: rgba(220,38,38,.05); }
.pi-action-btn.active.pass-btn { background: #059669; border-color: #059669; color: #FFFFFF; box-shadow: 0 3px 10px rgba(5,150,105,.3); }
.pi-action-btn.active.fail-btn { background: #DC2626; border-color: #DC2626; color: #FFFFFF; box-shadow: 0 3px 10px rgba(220,38,38,.25); }

/* ── Defect note modal ───────────────────────────────────────────────── */
.pi-modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(10,14,50,.4);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.pi-modal {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(28,35,64,.2);
  width: 100%; max-width: 420px;
  padding: 32px;
  animation: piModalIn .22s cubic-bezier(.2,0,.2,1) both;
}
@keyframes piModalIn {
  from { opacity: 0; transform: translateY(12px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.pi-modal-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 800;
  color: #1C2340; letter-spacing: -.02em; margin-bottom: 6px;
}
.pi-modal-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 20px;
}
.pi-modal-item-label {
  font-family: 'Inter', sans-serif;
  font-size: 11.5px; font-weight: 600;
  color: #DC2626; background: rgba(220,38,38,.07);
  border: 1px solid rgba(220,38,38,.18);
  border-radius: 8px; padding: 8px 12px;
  margin-bottom: 20px;
}
.pi-modal-textarea {
  width: 100%; resize: none;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  color: #1C2340;
  border: 1px solid rgba(28,35,64,.12);
  border-radius: 10px; padding: 12px 14px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  margin-bottom: 20px;
}
.pi-modal-textarea:focus {
  border-color: rgba(220,38,38,.4);
  box-shadow: 0 0 0 3px rgba(220,38,38,.09);
}
.pi-modal-textarea::placeholder { color: #AAACB4; }
.pi-modal-actions { display: flex; gap: 10px; }
.pi-modal-cancel {
  flex: 1; height: 42px; border-radius: 10px;
  border: 1px solid rgba(28,35,64,.1);
  background: #FFFFFF; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #5A6488; transition: all .18s;
}
.pi-modal-cancel:hover { border-color: rgba(28,35,64,.2); color: #1C2340; }
.pi-modal-confirm {
  flex: 1; height: 42px; border-radius: 10px;
  border: none; background: #DC2626; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #FFFFFF; transition: background .18s;
}
.pi-modal-confirm:hover { background: #B91C1C; }

/* ── Action zone ─────────────────────────────────────────────────────── */
.pi-action-zone {
  background: #FAFAFA;
  border: 1px solid rgba(28,35,64,.07);
  border-radius: 14px;
  padding: 40px 32px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  margin-bottom: 20px;
}

/* Passed */
.pi-zone-ok-icon {
  width: 60px; height: 60px; border-radius: 16px;
  background: #1C2340; color: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(28,35,64,.3);
}
.pi-zone-ok-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340; margin-bottom: 8px;
}
.pi-zone-ok-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 28px;
  max-width: 280px; line-height: 1.7;
}
.pi-pass-btn {
  width: 100%; max-width: 300px; height: 50px; border-radius: 11px;
  border: none; background: #1C2340; color: #FFFFFF; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .18s, box-shadow .18s;
  box-shadow: 0 4px 14px rgba(28,35,64,.25);
}
.pi-pass-btn:hover:not(:disabled) { background: #2E3A9E; }
.pi-pass-btn:disabled { opacity: .6; cursor: default; }

/* Failed */
.pi-zone-err-icon {
  width: 60px; height: 60px; border-radius: 16px;
  background: rgba(220,38,38,.08); color: #DC2626;
  border: 1px solid rgba(220,38,38,.2);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}
.pi-zone-err-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px; font-weight: 800;
  letter-spacing: -.02em; color: #DC2626; margin-bottom: 8px;
}
.pi-zone-err-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 28px;
  max-width: 280px; line-height: 1.7;
}
.pi-fail-btn {
  width: 100%; max-width: 300px; height: 50px; border-radius: 11px;
  border: none; background: #DC2626; color: #FFFFFF; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .18s;
  box-shadow: 0 4px 14px rgba(220,38,38,.25);
}
.pi-fail-btn:hover:not(:disabled) { background: #B91C1C; }
.pi-fail-btn:disabled { opacity: .6; cursor: default; }

/* Waiting */
.pi-zone-wait-icon {
  width: 44px; height: 44px; border-radius: 11px;
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.09);
  display: flex; align-items: center; justify-content: center;
  color: #C5CBE5; margin-bottom: 14px;
}
.pi-zone-wait-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #C5CBE5; margin-bottom: 4px;
}
.pi-zone-wait-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 600;
  letter-spacing: .12em; text-transform: uppercase;
  color: #C5CBE5; max-width: 260px; line-height: 1.8; text-align: center;
}`;

export default function PhysicalInspection({ application }) {
    const appData = application || {
        operator: 'Juan Dela Cruz',
        id: 'NSB-26-8812',
        make: 'Kawasaki Barako 175',
        engine_number: 'ENG-KAW-12345',
        chassis_number: 'CHAS-KAW-98765',
        plate: 'NSB-2024-ABC',
        toda: 'TODA A (Poblacion)',
        inspectionStatuses: {},
        defectNotes: {},
    };

    const [isProcessing, setIsProcessing] = useState(false);
    const [inspectionStatuses, setInspectionStatuses] = useState(appData.inspectionStatuses || {});
    const [defectNotes, setDefectNotes] = useState(appData.defectNotes || {});

    // Defect note modal state
    const [pendingFailId, setPendingFailId] = useState(null);
    const [draftNote, setDraftNote] = useState('');

    // Ensure all properties have values
    const vehicleData = {
        make: appData?.make || 'Kawasaki Barako 175',
        engine_number: appData?.engine_number || 'ENG-KAW-12345',
        chassis_number: appData?.chassis_number || 'CHAS-KAW-98765',
        plate: appData?.plate || 'NSB-2024-ABC',
        toda: appData?.toda || 'TODA A (Poblacion)',
    };

    const items = [
        { id: 'headlights', label: 'Headlights (High/Low Beam)' },
        { id: 'taillights', label: 'Tail Lights & Brake Lights' },
        { id: 'signals',    label: 'Signal Lights (Left/Right)' },
        { id: 'horn',       label: 'Horn (Working/Loud)' },
        { id: 'mirrors',    label: 'Side Mirrors (Complete Pair)' },
        { id: 'brakes',     label: 'Brakes & Drive Chain' },
        { id: 'plate',      label: 'Body Plate Attachment' },
        { id: 'sidecar',    label: 'Sidecar Structural Integrity' },
    ];

    const handlePass = (id) => {
        setInspectionStatuses(prev => ({ ...prev, [id]: 'passed' }));
        setDefectNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const openFailModal = (id) => {
        setPendingFailId(id);
        setDraftNote(defectNotes[id] || '');
    };

    const confirmFail = () => {
        const note = draftNote.trim() || 'Defective';
        setInspectionStatuses(prev => ({ ...prev, [pendingFailId]: 'failed' }));
        setDefectNotes(prev => ({ ...prev, [pendingFailId]: note }));
        setPendingFailId(null);
        setDraftNote('');
    };

    const cancelFail = () => {
        setPendingFailId(null);
        setDraftNote('');
    };

    const allItemsChecked = items.every(item => inspectionStatuses[item.id] !== undefined);
    const anyFailed       = Object.values(inspectionStatuses).some(s => s === 'failed');
    const allPassed       = items.every(item => inspectionStatuses[item.id] === 'passed');

    const handleFinalAction = (type) => {
        const isPass = type === 'pass';

        Swal.fire({
            title: isPass ? 'Confirm Passed Inspection' : 'Confirm Failed Inspection',
            html: isPass
                ? `Are you sure you want to mark <b>${appData.id}</b> as passed? It will be forwarded to the Cashier.`
                : `Are you sure you want to fail <b>${appData.id}</b>? The operator will be notified to repair the defects.`,
            icon: isPass ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isPass ? '#059669' : '#DC2626',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: isPass ? 'Yes, Mark as Passed' : 'Yes, Send for Re-inspection',
            customClass: {
                title: 'font-jakarta',
                popup: 'font-inter'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);

                router.post(`/tmo/review/physical/${appData.id}`, {
                    action: isPass ? 'pass' : 'fail',
                    inspectionStatuses: inspectionStatuses,
                    defectNotes: defectNotes,
                }, {
                    onFinish: () => setIsProcessing(false),
                    onSuccess: () => {
                        Swal.fire({
                            title: isPass ? 'Inspection Passed!' : 'Sent for Repair',
                            text: isPass
                                ? 'Unit passed physical inspection. Forwarded for payment.'
                                : 'Unit failed inspection. Notice sent to operator.',
                            icon: 'success',
                            confirmButtonColor: '#1C2340',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    }
                });
            }
        });
    };

    const pendingItem = items.find(i => i.id === pendingFailId);

    return (
        <TrivoraLayout title="Physical Inspection" role="TMO Officer">
            <Head title={`Physical Test: ${appData.operator} | TRIVORA`} />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── Defect Note Modal (Portaled to body) ── */}
            {pendingFailId && createPortal(
                <div className="pi-modal-overlay" onClick={cancelFail}>
                    <div className="pi-modal" onClick={e => e.stopPropagation()}>
                        <p className="pi-modal-title">Defect Note</p>
                        <p className="pi-modal-sub">Describe what failed during inspection</p>
                        <p className="pi-modal-item-label">{pendingItem?.label}</p>
                        <textarea
                            className="pi-modal-textarea"
                            rows={3}
                            placeholder="e.g., Busted bulb, loose brakes, cracked mirror…"
                            value={draftNote}
                            onChange={e => setDraftNote(e.target.value)}
                            autoFocus
                        />
                        <div className="pi-modal-actions">
                            <button className="pi-modal-cancel" onClick={cancelFail}>Cancel</button>
                            <button className="pi-modal-confirm" onClick={confirmFail}>Confirm Failure</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="pi-root" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 52 }}>

                {/* ── Back nav ── */}
                <div className="pi-nav">
                    <Link href="/tmo/physical" className="pi-back-link">
                        <ChevronLeft size={14} strokeWidth={3} />
                        Cancel & Return to Queue
                    </Link>
                    <span className="pi-phase-badge">Inspecting: {appData.id}</span>
                </div>

                <div className="pi-grid">

                    {/* ════ LEFT: Vehicle Specs ════ */}
                    <div>
                        <div className="pi-card">
                            <div className="pi-card-pad">
                                <div className="pi-profile-header">
                                    <div className="pi-avatar-wrap">
                                        <Bike size={30} strokeWidth={1.6} />
                                    </div>
                                    <p className="pi-op-name">{vehicleData.make}</p>
                                    <p className="pi-op-unit">Vehicle Specs</p>
                                </div>

                                <div className="pi-profile-fields">
                                    <ProfileField icon={Bike}   label="Make & Model"    value={vehicleData.make}            />
                                    <ProfileField icon={Gauge}  label="Engine Number"   value={vehicleData.engine_number}  />
                                    <ProfileField icon={Gauge}  label="Chassis Number"  value={vehicleData.chassis_number} />
                                    <ProfileField icon={Bike}   label="Plate Number"    value={vehicleData.plate}           />
                                    <ProfileField icon={MapPin} label="TODA Assignment" value={vehicleData.toda}            />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════ RIGHT: Checklist ════ */}
                    <div>
                        <div className="pi-card">
                            <div className="pi-card-pad">

                                <p className="pi-panel-eyebrow">Phase 2 · Physical Inspection</p>
                                <h2 className="pi-panel-title">Inspection Checklist</h2>

                                {/* Inspection items */}
                                <div className="pi-checklist">
                                    {items.map((item) => {
                                        const status = inspectionStatuses[item.id];
                                        return (
                                            <div
                                                key={item.id}
                                                className={`pi-item${status === 'passed' ? ' is-passed' : status === 'failed' ? ' is-failed' : ''}`}
                                            >
                                                <div className="pi-item-left">
                                                    <div className="pi-item-icon">
                                                        <Gauge size={17} strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <p className="pi-item-label">{item.label}</p>
                                                        {status === 'failed' && (
                                                            <p className="pi-item-note">
                                                                <MessageSquare size={9} strokeWidth={2.5} />
                                                                {defectNotes[item.id]}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="pi-item-actions">
                                                    <button
                                                        onClick={() => handlePass(item.id)}
                                                        className={`pi-action-btn pass-btn${status === 'passed' ? ' active' : ''}`}
                                                        title="Pass"
                                                    >
                                                        <Check size={16} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => openFailModal(item.id)}
                                                        className={`pi-action-btn fail-btn${status === 'failed' ? ' active' : ''}`}
                                                        title="Fail"
                                                    >
                                                        <X size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Dynamic Action Zone ── */}
                                <div className="pi-action-zone">
                                    {allPassed ? (
                                        <>
                                            <div className="pi-zone-ok-icon">
                                                <CheckCircle2 size={28} strokeWidth={2} />
                                            </div>
                                            <p className="pi-zone-ok-title">Inspection Passed</p>
                                            <p className="pi-zone-ok-sub">
                                                Everything checked out. Forward to Cashier for payment processing.
                                            </p>
                                            <button
                                                className="pi-pass-btn"
                                                onClick={() => handleFinalAction('pass')}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing
                                                    ? <Loader2 size={15} className="animate-spin" />
                                                    : <CheckCircle2 size={15} strokeWidth={2} />}
                                                Complete
                                            </button>
                                        </>
                                    ) : anyFailed ? (
                                        <>
                                            <div className="pi-zone-err-icon">
                                                <AlertTriangle size={28} strokeWidth={2} />
                                            </div>
                                            <p className="pi-zone-err-title">Inspection Failed</p>
                                            <p className="pi-zone-err-sub">
                                                Unit has defects. Notify operator to repair and return.
                                            </p>
                                            <button
                                                className="pi-fail-btn"
                                                onClick={() => handleFinalAction('fail')}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing
                                                    ? <Loader2 size={15} className="animate-spin" />
                                                    : <RefreshCw size={15} strokeWidth={2} />}
                                                Send for Re-inspection
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="pi-zone-wait-icon">
                                                <Search size={22} strokeWidth={1.8} />
                                            </div>
                                            <p className="pi-zone-wait-title">Awaiting Field Check</p>
                                            <p className="pi-zone-wait-sub">
                                                Perform physical check on the unit. Mark each item as Passed or Failed.
                                            </p>
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
        <div className="pi-field">
            <div className="pi-field-icon">
                <Icon size={16} strokeWidth={2} />
            </div>
            <div>
                <p className="pi-field-label">{label}</p>
                <p className="pi-field-value">{value}</p>
            </div>
        </div>
    );
}