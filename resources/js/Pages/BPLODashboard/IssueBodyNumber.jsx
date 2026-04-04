import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    ChevronLeft, Hash, ShieldCheck,
    Printer, Loader2,
    CheckCircle2, Fingerprint, Info, Lock
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Civic Prestige — IssueBodyNumber page
   Matches BPLOLayout's cool blue-white / royal blue system
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ibn-root *, .ibn-root *::before, .ibn-root *::after { box-sizing: border-box; }
.ibn-root {
  font-family: 'Inter', sans-serif;
  color: #1A3380;
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 64px;
}

/* ── Back nav ───────────────────────────────────────────────────────── */
.ibn-back {
  display: inline-flex; align-items: center; gap: 12px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .2em; text-transform: uppercase;
  color: #7A9BC8; text-decoration: none;
  margin-bottom: 40px;
  transition: color .18s;
}
.ibn-back:hover { color: #1A3380; }
.ibn-back-icon {
  width: 38px; height: 38px; border-radius: 11px;
  border: 1px solid rgba(26,51,128,.1);
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  color: #4A6090;
  transition: background .18s, border-color .18s;
}
.ibn-back:hover .ibn-back-icon {
  background: rgba(65,105,225,.06);
  border-color: rgba(65,105,225,.2);
  color: #1A3380;
}

/* ── Two-column grid ────────────────────────────────────────────────── */
.ibn-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}
@media (min-width: 1024px) {
  .ibn-grid { grid-template-columns: 340px 1fr; }
}

/* ── Shared card base ───────────────────────────────────────────────── */
.ibn-card {
  background: #fff;
  border: 1px solid rgba(26,51,128,.08);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(26,51,128,.05);
}

/* ── LEFT: Unit Summary card ────────────────────────────────────────── */
.ibn-summary-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 28px;
  border-bottom: 1px solid rgba(26,51,128,.06);
  background: rgba(238,243,255,.4);
}
.ibn-summary-head-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #1A3380;
}
.ibn-summary-body { padding: 32px 28px; }
.ibn-data-row { margin-bottom: 28px; }
.ibn-data-row:last-of-type { margin-bottom: 0; }
.ibn-data-label {
  display: block;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #7A9BC8; margin-bottom: 6px;
}
.ibn-data-value {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 15px; font-weight: 700;
  color: #1A3380; letter-spacing: -.01em; line-height: 1;
}
.ibn-data-value.mono {
  font-family: 'Inter', monospace;
  color: #4169E1; font-size: 13px; letter-spacing: .08em;
}
.ibn-verified {
  display: flex; align-items: center; gap: 14px;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid rgba(26,51,128,.06);
  color: #065F46;
}
.ibn-verified-text { font-size: 11px; font-weight: 700; text-transform: uppercase; line-height: 1; }
.ibn-verified-sub  { font-size: 9.5px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #7A9BC8; margin-top: 4px; }

/* ── RIGHT: Issuance Terminal ───────────────────────────────────────── */
.ibn-terminal {
  border-radius: 24px;
  position: relative;
}
.ibn-terminal-stripe {
  position: absolute; top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4169E1 0%, #5B88F0 100%);
  border-radius: 24px 24px 0 0;
}
.ibn-terminal-inner { padding: 44px 44px 40px; }

/* Terminal header */
.ibn-terminal-head {
  display: flex; align-items: center; gap: 18px;
  padding-bottom: 28px;
  margin-bottom: 28px;
  border-bottom: 1px solid rgba(26,51,128,.06);
}
.ibn-terminal-icon {
  width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
  background: #1E3A8A;
  display: flex; align-items: center; justify-content: center;
  color: #BFDBFE;
}
.ibn-terminal-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px; font-weight: 800;
  color: #1A3380; line-height: 1;
  letter-spacing: -.01em;
}
.ibn-terminal-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #7A9BC8; margin-top: 6px;
}

/* Number display zone */
.ibn-number-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 52px 32px;
  background: rgba(238,243,255,.5);
  border: 1.5px dashed rgba(65,105,225,.2);
  border-radius: 20px;
  margin-bottom: 28px;
}
.ibn-number-label {
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .22em; text-transform: uppercase;
  color: #7A9BC8; margin-bottom: 24px;
}
.ibn-number-display {
  font-family: 'DM Sans', sans-serif;
  font-size: 60px; font-weight: 800;
  color: #4169E1;
  letter-spacing: .2em;
  line-height: 1;
  background: #fff;
  padding: 20px 48px;
  border-radius: 16px;
  border: 1px solid rgba(65,105,225,.12);
  box-shadow: 0 2px 12px rgba(65,105,225,.08);
  user-select: none;
}
.ibn-number-hint {
  margin-top: 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #7A9BC8; text-align: center; line-height: 1.8;
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
  background: rgba(26,51,128,.05);
  color: #4A6090;
  border: 1px solid rgba(26,51,128,.1);
}
.ibn-btn-secondary:hover {
  background: rgba(26,51,128,.09);
  color: #1A3380;
  border-color: rgba(26,51,128,.18);
}
.ibn-btn-primary {
  background: #1E3A8A;
  color: #BFDBFE;
}
.ibn-btn-primary:hover {
  background: #2E57C8;
  box-shadow: 0 4px 18px rgba(65,105,225,.3);
  transform: translateY(-1px);
}
.ibn-btn-primary:active { transform: translateY(0); }
.ibn-btn-primary:disabled {
  background: rgba(26,51,128,.1);
  color: #7A9BC8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ── Notice panel ───────────────────────────────────────────────────── */
.ibn-notice {
  margin-top: 16px;
  background: #fff;
  border: 1px solid rgba(26,51,128,.08);
  border-left: 3px solid #4169E1;
  border-radius: 20px;
  padding: 24px 28px;
  display: flex; align-items: flex-start; gap: 18px;
  box-shadow: 0 1px 4px rgba(26,51,128,.04);
}
.ibn-notice-icon {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  background: rgba(65,105,225,.08);
  display: flex; align-items: center; justify-content: center;
  color: #1E3A8A;
}
.ibn-notice-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #1A3380; margin-bottom: 8px;
}
.ibn-notice-body {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #7A9BC8; line-height: 1.9;
}

/* ── Animations ─────────────────────────────────────────────────────── */
.ibn-card     { animation: ibnFadeUp .4s .05s cubic-bezier(.2,0,.2,1) both; }
.ibn-terminal { animation: ibnFadeUp .4s .12s cubic-bezier(.2,0,.2,1) both; }
.ibn-notice   { animation: ibnFadeUp .4s .20s cubic-bezier(.2,0,.2,1) both; }
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
    const [isFinishing, setIsFinishing] = useState(false);

    const autoGeneratedBodyNumber = application.suggested_body_no || "0842";

    const handleFinalize = () => {
        setIsFinishing(true);
        setTimeout(() => {
            setIsFinishing(false);
            window.location.href = '/bplo/releasing';
        }, 1500);
    };

    return (
        <BPLOLayout title="Final Issuance" role="BPLO Officer">
            <Head title={`Finalize | ${application.id}`} />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="ibn-root">

                {/* ── Back nav ── */}
                <Link href="/bplo/releasing" className="ibn-back">
                    <span className="ibn-back-icon">
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </span>
                    Return to Queue
                </Link>

                <div className="ibn-grid">

                    {/* ── LEFT: Unit Summary ── */}
                    <div className="ibn-card">
                        <div className="ibn-summary-head">
                            <span className="ibn-summary-head-title">Unit Summary</span>
                            <Fingerprint size={17} strokeWidth={1.8} style={{ color: '#8AAAD4' }} />
                        </div>
                        <div className="ibn-summary-body">
                            <DataRow label="Tracking ID"           value={application.id}       mono />
                            <DataRow label="Owner Name"            value={application.operator} />
                            <DataRow label="Route / TODA"          value={application.toda}     />
                            <DataRow label="Vehicle Specification" value={application.make}     />

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
                                        <p className="ibn-terminal-title">Body Number Issuance</p>
                                        <p className="ibn-terminal-sub">Nasugbu Municipal Licensing</p>
                                    </div>
                                </div>

                                {/* Number display */}
                                <div className="ibn-number-zone">
                                    <div className="ibn-number-label">
                                        <Lock size={13} strokeWidth={2} />
                                        Static System Sequence
                                    </div>
                                    <div className="ibn-number-display">
                                        {autoGeneratedBodyNumber}
                                    </div>
                                    <p className="ibn-number-hint">
                                        This ID is automatically assigned to prevent<br />
                                        duplication in the {application.toda} registry.
                                    </p>
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
                                    Confirmation activates GPS telemetry and initiates the automated
                                    billing record for the current fiscal year. Final activation is permanent.
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