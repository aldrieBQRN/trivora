import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import Swal from 'sweetalert2';
import {
    ArrowLeft, Hash, ShieldCheck,
    Printer, Loader2,
    CheckCircle2, ClipboardList, Info, Lock,
    Wifi, ScanLine
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Civic Prestige — IssueBodyNumber page
   Matches BPLOLayout's slate-indigo system (TMO color palette)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ibn-root *, .ibn-root *::before, .ibn-root *::after { box-sizing: border-box; }
.ibn-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  padding-bottom: 64px;
}

/* ── Back nav ───────────────────────────────────────────────────────── */
.ibn-back {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  margin-bottom: 40px;
  transition: color .18s;
}
.ibn-back:hover { color: #1C2340; }

/* ── Two-column grid ────────────────────────────────────────────────── */
.ibn-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}
@media (min-width: 1024px) {
  .ibn-grid { grid-template-columns: 340px 1fr; }
}

/* ── Shared right card base ─────────────────────────────────────────── */
.ibn-card {
  background: #fff;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}

/* ── LEFT: Unit Summary card (SaaS Theme) ───────────────────────────── */
.ibn-side-card {
  background: linear-gradient(135deg, #FFFFFF 0%, rgba(79,91,203,.04) 100%);
  border: 1.5px solid rgba(79, 91, 203, 0.35) !important;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(79, 91, 203, 0.12), 0 1px 3px rgba(28, 35, 64, 0.05);
  overflow: hidden;
}
.ibn-summary-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 28px;
  border-bottom: 1px solid rgba(79,91,203,.15);
  background: rgba(236,242,255,.4);
}
.ibn-summary-head-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #1C2340;
}
.ibn-summary-body { padding: 32px 28px; }
.ibn-data-row { margin-bottom: 28px; }
.ibn-data-row:last-of-type { margin-bottom: 0; }
.ibn-data-label {
  display: block;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 6px;
}
.ibn-data-value {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 15px; font-weight: 700;
  color: #1C2340; letter-spacing: -.01em; line-height: 1;
}
.ibn-data-value.mono {
  font-family: 'Inter', monospace;
  color: #4F5BCB; font-size: 13px; letter-spacing: .08em;
}
.ibn-verified {
  display: flex; align-items: center; gap: 14px;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid rgba(28,35,64,.06);
  color: #065F46;
}
.ibn-verified-text { font-size: 11px; font-weight: 700; text-transform: uppercase; line-height: 1; }
.ibn-verified-sub  { font-size: 9.5px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-top: 4px; }

/* ── RIGHT: Issuance Terminal ───────────────────────────────────────── */
.ibn-terminal {
  border-radius: 24px;
  position: relative;
}
.ibn-terminal-stripe {
  position: absolute; top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4F5BCB 0%, #8A96BC 100%);
  border-radius: 24px 24px 0 0;
}
.ibn-terminal-inner { padding: 44px 44px 40px; }

/* Terminal header */
.ibn-terminal-head {
  display: flex; align-items: center; gap: 18px;
  padding-bottom: 28px;
  margin-bottom: 28px;
  border-bottom: 1px solid rgba(28,35,64,.06);
}
.ibn-terminal-icon {
  width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
  background: #1C2340;
  display: flex; align-items: center; justify-content: center;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(28,35,64,.15);
}
.ibn-terminal-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px; font-weight: 800;
  color: #1C2340; line-height: 1;
  letter-spacing: -.01em;
}
.ibn-terminal-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* Number display zone */
.ibn-number-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 32px;
  background: rgba(236,242,255,.5);
  border: 1.5px dashed rgba(79,91,203,.2);
  border-radius: 20px;
  margin-bottom: 28px;
}
.ibn-number-label {
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .22em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 20px;
}
.ibn-number-display {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 64px; font-weight: 800;
  color: #1C2340;
  letter-spacing: .15em;
  line-height: 1;
  background: #F4F6FF;
  padding: 24px 54px;
  border-radius: 16px;
  border: 1px solid rgba(79,91,203,.2);
  box-shadow: inset 0 3px 6px rgba(28,35,64,.06), 0 4px 16px rgba(79,91,203,.08);
  user-select: none;
}
.ibn-number-hint {
  margin-top: 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; text-align: center; line-height: 1.8;
}

/* Device Assignment Zone */
.ibn-device-zone {
  margin-bottom: 32px;
}
.ibn-device-header {
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #1C2340; margin-bottom: 12px;
}
.ibn-device-input-wrap {
  position: relative;
}
.ibn-device-input {
  width: 100%; height: 52px; border-radius: 12px;
  border: 1.5px solid rgba(28,35,64,.15);
  background: #FAFAFC; padding: 0 16px 0 44px;
  font-family: 'Inter', monospace; font-size: 14px; font-weight: 600; letter-spacing: 1px;
  color: #1C2340; transition: all .2s; outline: none;
}
.ibn-device-input:focus {
  border-color: #4F5BCB; background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
}
.ibn-device-input::placeholder { color: #8A96BC; font-family: 'Inter', sans-serif; font-weight: 500; letter-spacing: normal; }
.ibn-device-icon {
  position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
  color: #4F5BCB; pointer-events: none;
}
.ibn-device-scan {
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
  color: #8A96BC; pointer-events: none;
}

/* Action buttons */
.ibn-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 480px) { .ibn-actions { grid-template-columns: 1fr; } }

.ibn-btn {
  height: 52px; border-radius: 14px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  cursor: pointer; border: none; transition: all .2s;
}
.ibn-btn-secondary {
  background: rgba(28,35,64,.05);
  color: #3A4570;
  border: 1px solid rgba(28,35,64,.1);
}
.ibn-btn-secondary:hover {
  background: rgba(28,35,64,.09);
  color: #1C2340;
  border-color: rgba(28,35,64,.18);
}
.ibn-btn-primary {
  background: #1C2340;
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(28,35,64,.25);
}
.ibn-btn-primary:hover:not(:disabled) {
  background: #2E3A9E;
  box-shadow: 0 6px 20px rgba(79,91,203,.3);
  transform: translateY(-1px);
}
.ibn-btn-primary:active:not(:disabled) { transform: translateY(0); }
.ibn-btn-primary:disabled {
  background: rgba(28,35,64,.08);
  color: rgba(28,35,64,.3);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ── Warning Notice panel ──────────────────────────────────── */
.ibn-notice {
  margin-top: 16px;
  background: rgba(217,119,6,.03);
  border: 1px solid rgba(217,119,6,.15);
  border-left: 3px solid #D97706;
  border-radius: 20px;
  padding: 24px 28px;
  display: flex; align-items: flex-start; gap: 18px;
}
.ibn-notice-icon {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  background: rgba(217,119,6,.1);
  display: flex; align-items: center; justify-content: center;
  color: #D97706;
}
.ibn-notice-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #92400E; margin-bottom: 8px;
}
.ibn-notice-body {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #78350F; opacity: 0.8; line-height: 1.9;
}

/* ── Animations ─────────────────────────────────────────────────────── */
.ibn-side-card { animation: ibnFadeUp .4s .05s cubic-bezier(.2,0,.2,1) both; }
.ibn-terminal  { animation: ibnFadeUp .4s .12s cubic-bezier(.2,0,.2,1) both; }
.ibn-notice    { animation: ibnFadeUp .4s .20s cubic-bezier(.2,0,.2,1) both; }
@keyframes ibnFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ibnSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.ibn-spin { animation: ibnSpin 1s linear infinite; }
`;

export default function IssueBodyNumber({ application }) {
    const [trackerId, setTrackerId] = useState('');
    const [isFinishing, setIsFinishing] = useState(false);

    const autoGeneratedPlateNumber = application.suggested_body_no || "0842";

    const handleFinalize = () => {
        // Step 1: Confirmation Alert
        Swal.fire({
            title: 'Confirm Issuance',
            html: `Are you sure you want to finalize the registration and assign Smart GPS Tracker <b>${trackerId || 'None'}</b> to Plate <b>${autoGeneratedPlateNumber}</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1C2340',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Finalize Registration',
            cancelButtonText: 'Cancel',
            customClass: {
                title: 'font-jakarta',
                popup: 'font-inter'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Set loading state on the button
                setIsFinishing(true);

                // Simulate API Call delay
                setTimeout(() => {
                    setIsFinishing(false);

                    // Step 2: Success Alert
                    Swal.fire({
                        title: 'Registration Finalized!',
                        text: `Plate Number ${autoGeneratedPlateNumber} is now active.`,
                        icon: 'success',
                        confirmButtonColor: '#059669',
                        timer: 2500,
                        showConfirmButton: false
                    }).then(() => {
                        // Redirect to the Releasing Queue after the success alert closes
                        window.location.href = '/bplo/releasing';
                    });

                }, 1200);
            }
        });
    };

    return (
        <BPLOLayout title="Final Issuance" role="BPLO Officer">
            <Head title={`Finalize | ${application.id}`} />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="ibn-root">

                {/* ── Back nav ── */}
                <Link href="/bplo/releasing" className="ibn-back">
                    <ArrowLeft size={14} strokeWidth={3} />
                    Return to Queue
                </Link>

                <div className="ibn-grid">

                    {/* ── LEFT: Unit Summary (SaaS Theme) ── */}
                    <div className="ibn-side-card">
                        <div className="ibn-summary-head">
                            <span className="ibn-summary-head-title">Trycicle Unit Summary</span>
                            <ClipboardList size={17} strokeWidth={1.8} style={{ color: '#4F5BCB' }} />
                        </div>
                        <div className="ibn-summary-body">
                            <DataRow label="Application ID"           value={application.id}       mono />
                            <DataRow label="Driver Name"            value={application.operator} />
                            <DataRow label="Route / TODA"          value={application.toda}     />
                            <DataRow label="Vehicle Make"          value={application.make}     />
                            <DataRow label="Engine Number"         value={application.engine_number || 'N/A'} />
                            <DataRow label="Chassis Number"        value={application.chassis_number || 'N/A'} />

                            <div className="ibn-verified">
                                <CheckCircle2 size={22} strokeWidth={2.5} />
                                <div>
                                    <p className="ibn-verified-text">TMO Verified</p>
                                    <p className="ibn-verified-sub">Ready for Issuance</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Issuance Terminal + Notice ── */}
                    <div>
                        <div className="ibn-card ibn-terminal">
                            <div className="ibn-terminal-stripe" />
                            <div className="ibn-terminal-inner">

                                {/* Header */}
                                <div className="ibn-terminal-head">
                                    <div className="ibn-terminal-icon">
                                        <Hash size={24} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="ibn-terminal-title">Plate Number Issuance</p>
                                        <p className="ibn-terminal-sub">Nasugbu Municipal Licensing</p>
                                    </div>
                                </div>

                                {/* Number display */}
                                <div className="ibn-number-zone">
                                    <div className="ibn-number-label">
                                        <Lock size={13} strokeWidth={2} />
                                        Official Plate Number
                                    </div>
                                    <div className="ibn-number-display">
                                        {autoGeneratedPlateNumber}
                                    </div>
                                    <p className="ibn-number-hint">
                                        This plate number is automatically assigned to prevent<br />
                                        duplication in the {application.toda} registry.
                                    </p>
                                </div>

                                {/* Device Assignment Zone */}
                                <div className="ibn-device-zone">
                                    <div className="ibn-device-header">
                                        Assign Smart GPS Tracker
                                    </div>
                                    <div className="ibn-device-input-wrap">
                                        <div className="ibn-device-icon">
                                            <Wifi size={18} strokeWidth={2.5} />
                                        </div>
                                        <input
                                            type="text"
                                            className="ibn-device-input"
                                            placeholder="Scan or enter Device ID (e.g. TRV-992)"
                                            value={trackerId}
                                            onChange={e => setTrackerId(e.target.value.toUpperCase())}
                                        />
                                        <div className="ibn-device-scan">
                                            <ScanLine size={18} strokeWidth={2} />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="ibn-actions">
                                    <button className="ibn-btn ibn-btn-secondary">
                                        <Printer size={16} strokeWidth={2} />
                                        Print Plate Copy
                                    </button>
                                    <button
                                        className="ibn-btn ibn-btn-primary"
                                        onClick={handleFinalize}
                                        disabled={isFinishing}
                                    >
                                        {isFinishing
                                            ? <Loader2 size={16} strokeWidth={2} className="ibn-spin" />
                                            : <ShieldCheck size={16} strokeWidth={2} />
                                        }
                                        Finalize Registration
                                    </button>
                                </div>

                            </div>
                        </div>

                        {/* Notice */}
                        <div className="ibn-notice">
                            <div className="ibn-notice-icon">
                                <Info size={20} strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="ibn-notice-title">Administrative Notice</p>
                                <p className="ibn-notice-body">
                                    Linking the Smart GPS Tracker is required. Confirmation activates the
                                    device's telemetry and initiates the automated billing record for the
                                    current fiscal year. Final activation is permanent.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </BPLOLayout>
    );
}

/* ── Sub-component ───────────────────────────────────────────────────── */
function DataRow({ label, value, mono = false }) {
    return (
        <div className="ibn-data-row">
            <span className="ibn-data-label">{label}</span>
            <span className={`ibn-data-value${mono ? ' mono' : ''}`}>{value}</span>
        </div>
    );
}