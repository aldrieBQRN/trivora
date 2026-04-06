import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    UploadCloud,
    FileText,
    Bike,
    Check,
    Loader2,
    ShieldCheck,
    ArrowLeft,
    ArrowRight,
    Info
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — New Unit Registration Wizard
   Path: resources/js/Pages/Operator/Compliance/MTOPWizard.jsx
   Prefix: mw-* (mtop-wizard)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.mw-root { font-family: 'Inter', sans-serif; color: #1C2340; width: 100%; padding-bottom: 64px; max-width: 1200px; margin: 0 auto; }
.mw-root *, .mw-root *::before, .mw-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.mw-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.mw-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.mw-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.mw-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  color: #8A96BC; margin-top: 6px;
}

.mw-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.mw-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: #8A96BC; text-decoration: none;
  transition: color .2s;
}
.mw-back-link:hover { color: #1C2340; }

/* ── Stepper ── */
.mw-stepper { display: flex; align-items: center; justify-content: flex-start; gap: 16px; margin-bottom: 40px; overflow-x: auto; padding-bottom: 10px; }
.mw-step { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.mw-step-circle {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700;
  background: #F2F4FA; color: #8A96BC; border: 2px solid transparent; transition: all .3s;
}
.mw-step.active .mw-step-circle { background: #FFFFFF; color: #4F5BCB; border-color: #4F5BCB; box-shadow: 0 0 0 4px rgba(79,91,203,.1); }
.mw-step.done .mw-step-circle { background: #059669; color: #FFFFFF; border-color: #059669; }
.mw-step-label { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; }
.mw-step.active .mw-step-label { color: #1C2340; }
.mw-step.done .mw-step-label { color: #059669; }
.mw-stepper-line { width: 40px; height: 2px; background: #E2E8F0; border-radius: 2px; flex-shrink: 0; }
.mw-stepper-line.filled { background: #059669; }

.mw-form-card {
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 20px; box-shadow: 0 4px 20px rgba(28,35,64,.03);
  padding: 40px; margin-bottom: 24px;
}

.mw-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.mw-input-group { display: flex; flex-direction: column; gap: 8px; }
.mw-label { font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #5A6488; }
.mw-input, .mw-select {
  height: 52px; border: 1.5px solid rgba(28,35,64,.12); border-radius: 12px;
  padding: 0 18px; font-family: 'Inter', sans-serif; font-size: 14px; color: #1C2340;
  transition: all .2s; outline: none; background: #FAFAFA;
}
.mw-input:focus, .mw-select:focus { border-color: #4F5BCB; box-shadow: 0 0 0 3px rgba(79,91,203,.1); background: #FFF; }

/* ── Document Tiles ── */
.mw-docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; margin-bottom: 32px; }
.mw-file-tile {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 20px; border-radius: 16px; border: 1.5px dashed rgba(28,35,64,.12);
  background: #FAFAFA; cursor: pointer; transition: all .18s;
}
.mw-file-tile:hover { border-color: rgba(79,91,203,.4); background: #FFF; }
.mw-file-tile.done { border-style: solid; border-color: rgba(5,150,105,.25); background: rgba(5,150,105,.03); }
.mw-file-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; color: #1C2340; line-height: 1.4; margin-bottom: 4px; }
.mw-tag-req { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; color: #DC2626; background: rgba(220,38,38,.07); padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
.mw-tag-done { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 800; color: #059669; background: rgba(5,150,105,.08); padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
.mw-file-thumb { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(5,150,105,.2); }
.mw-file-icon-wrap { width: 44px; height: 44px; border-radius: 10px; background: #FFF; border: 1px solid rgba(28,35,64,.08); display: flex; align-items: center; justify-content: center; color: #8A96BC; }

/* ── Success Page ── */
.mw-success-card { text-align: center; padding: 80px 40px; animation: mwFadeUp 0.6s ease both; }
@keyframes mwFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.mw-success-icon { width: 96px; height: 96px; border-radius: 50%; background: rgba(5,150,105,.08); border: 2px solid rgba(5,150,105,.2); display: flex; align-items: center; justify-content: center; color: #059669; margin: 0 auto 32px; }
.mw-tracking-card {
  background: #1C2340; border-radius: 20px; padding: 32px 48px; max-width: 440px; margin: 0 auto 40px;
  color: #FFF; position: relative; overflow: hidden; text-align: left;
  box-shadow: 0 20px 40px rgba(28,35,64, 0.2);
}
.mw-tracking-card::after {
  content: ''; position: absolute; top: -50px; right: -50px; width: 150px; height: 150px;
  background: rgba(79,91,203, 0.15); border-radius: 50%;
}
.mw-tracking-label { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 12px; display: block; }
.mw-tracking-id { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 40px; font-weight: 800; letter-spacing: .05em; line-height: 1; }

.mw-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; border-top: 1px solid rgba(28,35,64, .08); padding-top: 32px; }
.mw-btn-primary {
  height: 56px; padding: 0 40px; border-radius: 12px; background: #1C2340; color: #FFFFFF;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; border: none;
  cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(28,35,64,.2);
}
.mw-btn-primary:hover:not(:disabled) { background: #2E3A9E; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,91,203, .25); }
.mw-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.mw-btn-secondary { background: #FFF; border: 1.5px solid rgba(28,35,64,.12); color: #5A6488; }
.mw-btn-secondary:hover { background: #F8F9FC; color: #1C2340; border-color: rgba(28,35,64,.3); }
`;

export default function MTOPWizard() {
    // We only need 3 steps now: 1. Vehicle, 2. Documents, 3. Success
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data, setData } = useForm({
        make_model: '',
        engine_number: '',
        chassis_number: '',
        plate: '',
        toda: 'A (Poblacion)',
        documents: {},
    });

    const documentList = [
        { id: 'receipt',   label: 'Delivery Receipt (New)', required: true },
        { id: 'police',    label: 'Police Clearance', required: true },
        { id: 'health',    label: 'Health Certificate', required: true },
        { id: 'orcr',      label: 'Xerox OR/CR', required: false },
        { id: 'license',   label: "Driver's License", required: true },
        { id: 'brgy',      label: 'Barangay Clearance', required: true },
        { id: 'toda',      label: 'TODA/Association Clearance', required: true },
        { id: 'cedula',    label: 'Cedula (Municipal)', required: true },
        { id: 'driver_id', label: "Driver's ID (Association)", required: true },
        { id: 'tariff',    label: 'Existing Tariff Fee', required: true },
        { id: 'auth',      label: "Authorization Letter", optional: true },
    ];

    const handleFileUpload = (docId, file) => setData('documents', { ...data.documents, [docId]: file });
    const next = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
    const back = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };

    const handleFinalSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setStep(3); // Move to Success Page
        }, 2000);
    };

    const isStep1Valid = data.make_model && data.engine_number && data.chassis_number;
    const isStep2Valid = documentList.filter(d => d.required).every(d => data.documents[d.id]);

    return (
        <OperatorLayout title="New Unit Registration" operatorName="Mario Dela Cruz">
            <Head title="New Unit Registration | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="mw-root">

                {step < 3 && (
                    <>
                        <div className="mw-nav">
                            <Link href={route('operator.mtop')} className="mw-back-link">
                                <ChevronLeft size={14} strokeWidth={3} /> Cancel Registration
                            </Link>
                        </div>

                        <div style={{ marginBottom: 40 }}>
                            <p className="mw-eyebrow">Franchise & Compliance</p>
                            <h1 className="mw-title">New Unit Registration</h1>
                            <p className="mw-subtitle">Complete the steps below to submit your application for a new tricycle unit.</p>
                        </div>

                        {/* ── Progress Tracker ── */}
                        <div className="mw-stepper">
                            <StepNode num={1} label="Vehicle Details" active={step === 1} done={step > 1} />
                            <div className={`mw-stepper-line ${step > 1 ? 'filled' : ''}`} />
                            <StepNode num={2} label="Requirements" active={step === 2} done={step > 2} />
                        </div>
                    </>
                )}

                {/* ── STEP 1: VEHICLE ── */}
                {step === 1 && (
                    <div className="mw-form-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                            <div style={{ padding: 12, background: 'rgba(79,91,203,.1)', borderRadius: 12, color: '#4F5BCB' }}><Bike size={24} /></div>
                            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 800 }}>Tricycle Specifications</h2>
                        </div>
                        <div className="mw-grid">
                            <div className="mw-input-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="mw-label">TODA Assignment</label>
                                <select className="mw-select" value={data.toda} onChange={e => setData('toda', e.target.value)}>
                                    <option>A (Poblacion)</option>
                                    <option>B (Wawa)</option>
                                    <option>C (Bucana)</option>
                                </select>
                            </div>
                            <div className="mw-input-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="mw-label">Motorcycle Make & Model</label>
                                <input className="mw-input" placeholder="e.g. Kawasaki Barako 175" value={data.make_model} onChange={e => setData('make_model', e.target.value)} />
                            </div>
                            <div className="mw-input-group">
                                <label className="mw-label">Engine Number</label>
                                <input className="mw-input" placeholder="ENG-XXXXXX" value={data.engine_number} onChange={e => setData('engine_number', e.target.value)} />
                            </div>
                            <div className="mw-input-group">
                                <label className="mw-label">Chassis Number</label>
                                <input className="mw-input" placeholder="CHAS-XXXXXX" value={data.chassis_number} onChange={e => setData('chassis_number', e.target.value)} />
                            </div>
                        </div>
                        <div className="mw-footer">
                            <div />
                            <button className="mw-btn-primary" disabled={!isStep1Valid} onClick={next}>
                                Continue to Documents <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: DOCUMENTS ── */}
                {step === 2 && (
                    <div className="mw-form-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                            <div style={{ padding: 12, background: 'rgba(79,91,203,.1)', borderRadius: 12, color: '#4F5BCB' }}><FileText size={24} /></div>
                            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 800 }}>Required Documents</h2>
                        </div>
                        <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#5A6488', marginBottom: 32 }}>Please upload a clear scan or photo of the following municipal requirements.</p>

                        <div className="mw-docs-grid">
                            {documentList.map(doc => (
                                <FileUploadTile
                                    key={doc.id}
                                    doc={doc}
                                    file={data.documents[doc.id]}
                                    onUpload={file => handleFileUpload(doc.id, file)}
                                />
                            ))}
                        </div>
                        <div className="mw-footer">
                            <button className="mw-btn-primary mw-btn-secondary" onClick={back} disabled={isSubmitting}>
                                <ArrowLeft size={16}/> Back
                            </button>
                            <button
                                className="mw-btn-primary"
                                style={{ background: '#059669' }}
                                disabled={!isStep2Valid || isSubmitting}
                                onClick={handleFinalSubmit}
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: SUCCESS SUBMISSION ── */}
                {step === 3 && (
                    <div className="mw-form-card mw-success-card">
                        <div className="mw-success-icon">
                            <CheckCircle2 size={48} strokeWidth={2.5} />
                        </div>
                        <h1 className="mw-title" style={{ fontSize: 36, marginBottom: 16 }}>Application Submitted</h1>
                        <p className="mw-subtitle" style={{ maxWidth: 520, margin: '0 auto 40px', fontSize: 16, lineHeight: 1.6 }}>
                            Your registration for the new unit has been successfully submitted.
                            The Nasugbu TMO team will begin document verification shortly.
                        </p>

                        <div className="mw-tracking-card">
                            <span className="mw-tracking-label">Tracking Number</span>
                            <p className="mw-tracking-id">NSB-2026-9812</p>
                        </div>

                        <div style={{ background: '#FAFAFC', border: '1px solid rgba(28,35,64,.06)', borderRadius: 20, padding: 32, textAlign: 'left', maxWidth: 600, margin: '0 auto 48px' }}>
                            <h4 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 800, color: '#1C2340', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Info size={18} color="#4F5BCB" /> What happens next?
                            </h4>
                            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <li style={{ fontSize: 14, color: '#5A6488', lineHeight: 1.5, display: 'flex', gap: 12 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F5BCB', marginTop: 8, flexShrink: 0 }} />
                                    <span><strong>Document Verification:</strong> TMO staff will review your uploads within 24-48 hours.</span>
                                </li>
                                <li style={{ fontSize: 14, color: '#5A6488', lineHeight: 1.5, display: 'flex', gap: 12 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F5BCB', marginTop: 8, flexShrink: 0 }} />
                                    <span><strong>Physical Inspection:</strong> You will be notified via SMS to schedule the vehicle's roadworthiness check.</span>
                                </li>
                                <li style={{ fontSize: 14, color: '#5A6488', lineHeight: 1.5, display: 'flex', gap: 12 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706', marginTop: 8, flexShrink: 0 }} />
                                    <span><strong>Payment & Fees:</strong> Franchise and IoT installation fees will only be collected <em>after</em> your unit passes physical inspection.</span>
                                </li>
                            </ul>
                        </div>

                        <Link href={route('operator.mtop')} className="mw-btn-primary">
                            Return to Application Tracker <ArrowRight size={16} />
                        </Link>
                    </div>
                )}

            </div>
        </OperatorLayout>
    );
}

/* ── UI Components ── */

function StepNode({ num, label, active, done }) {
    return (
        <div className="mw-step">
            <div className={`mw-step-circle ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                {done ? <Check size={18} strokeWidth={3} /> : num}
            </div>
            <span className={`mw-step-label ${active ? 'active' : ''}`}>{label}</span>
        </div>
    );
}

function FileUploadTile({ doc, file, onUpload }) {
    const [preview, setPreview] = useState(null);
    useEffect(() => {
        if (!file) { setPreview(null); return; }
        if (file.type?.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    return (
        <label className={`mw-file-tile ${file ? 'done' : ''}`}>
            <input type="file" style={{ display: 'none' }} onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p className="mw-file-name" title={doc.label}>{doc.label}</p>
                <div style={{display:'flex', gap: 6}}>
                    {file ? <span className="mw-tag-done">✓ Attached</span> : doc.required ? <span className="mw-tag-req">Required</span> : <span style={{fontSize: '8.5px', color: '#8A96BC', textTransform:'uppercase', fontWeight: 800}}>Optional</span>}
                </div>
            </div>
            {preview ? <img src={preview} className="mw-file-thumb" /> : <div className="mw-file-icon-wrap">{file ? <Check size={18} color="#059669" /> : <UploadCloud size={18} />}</div>}
        </label>
    );
}