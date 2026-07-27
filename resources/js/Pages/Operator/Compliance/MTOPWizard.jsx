import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, useForm, router } from '@inertiajs/react';
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
    Info,
    Upload,
    Eye,
    X,
    Camera
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
.mw-btn-secondary { background: #FFFFFF; border: 1px solid #E2E8F0; color: #475569; box-shadow: none !important; }
.mw-btn-secondary:hover, .mw-btn-secondary:hover:not(:disabled) { background: #F8FAFC !important; color: #1E293B !important; border-color: #CBD5E1 !important; transform: none !important; box-shadow: none !important; }
`;

export default function MTOPWizard({ applicationType = 'new', tricycleUnit = null }) {
    // We only need 3 steps now: 1. Vehicle, 2. Documents, 3. Success
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isRenewal = applicationType === 'renewal';

    const { data, setData } = useForm({
        make_model: tricycleUnit?.make_model || '',
        engine_number: tricycleUnit?.engine_number || '',
        chassis_number: tricycleUnit?.chassis_number || '',
        plate: tricycleUnit?.plate_number || '',
        toda: tricycleUnit?.toda || '',
        documents: {},
    });

    const documentList = [
        { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)',                         conditional: isRenewal, required: isRenewal },
        { id: 'orcr',      label: 'Xerox OR/CR',                                          required: true },
        { id: 'receipt',   label: 'Delivery Receipt (Kung walang OR/CR / New)',            conditional: !isRenewal, required: !isRenewal },
        { id: 'license',   label: "Driver's License Back-to-back (Prof/Restriction 1/A1)", required: true },
        { id: 'brgy',      label: 'Barangay Clearance (Original)',                         required: true },
        { id: 'toda',      label: 'TODA/NAFTODA/ACTODAN Clearance (Original)',             required: true },
        { id: 'driver_id', label: "Driver's ID Issued by NAFTODA/ACTODAN",                required: true },
        { id: 'tariff',    label: 'List of Existing Tariff Fee (For sidecar)',             conditional: true },
        { id: 'auth',      label: "Authorization Letter & ID (Kung hindi may-ari)",       conditional: true },
    ];

    const handleFileUpload = (docId, fileOrFiles) => {
        const currentFiles = data.documents[docId] || [];
        const filesToAdd = fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)
            ? Array.from(fileOrFiles)
            : [fileOrFiles];

        const updated = [...currentFiles, ...filesToAdd];
        setData('documents', {
            ...data.documents,
            [docId]: updated
        });
    };

    const handleRemoveFile = (docId, indexToRemove) => {
        const currentFiles = data.documents[docId] || [];
        const updated = currentFiles.filter((_, i) => i !== indexToRemove);
        setData('documents', {
            ...data.documents,
            [docId]: updated.length > 0 ? updated : undefined
        });
    };

    const next = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
    const back = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };

    const handleFinalSubmit = () => {
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('application_type', isRenewal ? 'renewal' : 'new');
        if (tricycleUnit?.id) {
            formData.append('unit_id', tricycleUnit.id);
        }
        formData.append('make_model', data.make_model);
        formData.append('engine_number', data.engine_number);
        formData.append('chassis_number', data.chassis_number);
        formData.append('plate', data.plate);
        formData.append('toda', data.toda);

        if (data.documents) {
            Object.entries(data.documents).forEach(([key, fileList]) => {
                if (Array.isArray(fileList)) {
                    fileList.forEach(file => {
                        formData.append(`documents[${key}][]`, file);
                    });
                } else if (fileList) {
                    formData.append(`documents[${key}]`, fileList);
                }
            });
        }

        router.post(route('operator.mtop.store'), formData, {
            preserveScroll: true,
            onFinish: () => setIsSubmitting(false),
        });
    };

    const isStep1Valid = data.make_model && data.engine_number && data.chassis_number;
    const requiredDocsIds = documentList.filter(d => d.required).map(d => d.id);
    const isStep2Valid = requiredDocsIds.every(id => {
        const files = data.documents[id];
        return Array.isArray(files) && files.length > 0;
    });

    return (
        <OperatorLayout title={isRenewal ? "Franchise Renewal" : "New Unit Registration"} operatorName="Mario Dela Cruz">
            <Head title={`${isRenewal ? "Franchise Renewal" : "New Unit Registration"} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="mw-root">

                {step < 3 && (
                    <>
                        <div className="mw-nav">
                            <Link href={route('operator.mtop')} className="mw-back-link">
                                <ChevronLeft size={14} strokeWidth={3} /> Cancel {isRenewal ? "Renewal" : "Registration"}
                            </Link>
                        </div>

                        <div style={{ marginBottom: 40 }}>
                            <p className="mw-eyebrow">Franchise & Compliance</p>
                            <h1 className="mw-title">{isRenewal ? "Franchise Renewal Application" : "New Unit Registration"}</h1>
                            <p className="mw-subtitle">
                                {isRenewal
                                    ? `Submit your application to renew the municipal MTOP franchise certificate for unit ${data.plate ? `(${data.plate})` : ''}.`
                                    : "Complete the steps below to submit your application for a new tricycle unit."}
                            </p>
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
                            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 800 }}>
                                {isRenewal ? "Verified Tricycle Specs (Renewal)" : "Tricycle Specifications"}
                            </h2>
                        </div>

                        {isRenewal && (
                            <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(79,91,203,.08)', border: '1px solid rgba(79,91,203,.2)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Info size={20} color="#4F5BCB" style={{ flexShrink: 0 }} />
                                <div>
                                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 700, color: '#1C2340' }}>
                                        Pre-Filled Municipal Record {tricycleUnit?.plate_number ? `(${tricycleUnit.plate_number})` : ''}
                                    </p>
                                    <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#5A6488', marginTop: 2 }}>
                                        Vehicle specs are pre-loaded from your registered unit archives for fast-track franchise renewal.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mw-grid">
                            <div className="mw-input-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="mw-label">TODA Assignment</label>
                                <select className="mw-select" value={data.toda} onChange={e => setData('toda', e.target.value)}>
                                    <option value="">Select TODA Assignment</option>
                                    <option value="TODA Bucana">TODA Bucana</option>
                                    <option value="TODA Brgy. 10">TODA Brgy. 10</option>
                                    <option value="TODA Brgy. 8">TODA Brgy. 8</option>
                                    <option value="TODA Brgy. 4">TODA Brgy. 4</option>
                                </select>
                            </div>
                            <div className="mw-input-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="mw-label">Motorcycle Make & Model</label>
                                <input className="mw-input" placeholder="e.g. Kawasaki Barako 175" value={data.make_model} onChange={e => setData('make_model', e.target.value)} />
                            </div>
                            <div className="mw-input-group">
                                <label className="mw-label">LTO Plate / Body Number</label>
                                <input className="mw-input" placeholder="e.g. 123-ABC or 0412" value={data.plate} onChange={e => setData('plate', e.target.value)} />
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
                                    id={doc.id}
                                    label={doc.label}
                                    required={doc.required}
                                    conditional={doc.conditional}
                                    files={data.documents[doc.id] || []}
                                    onUpload={files => handleFileUpload(doc.id, files)}
                                    onRemove={index => handleRemoveFile(doc.id, index)}
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

function FileUploadTile({ id, label, required, conditional, files, onUpload, onRemove }) {
    const [previewUrls, setPreviewUrls] = useState([]);
    const [showGallery, setShowGallery] = useState(false);
    const [activePreviewUrl, setActivePreviewUrl] = useState(null);
    const [showChoiceModal, setShowChoiceModal] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!files || files.length === 0) {
            setPreviewUrls([]);
            return;
        }

        const urls = files.map(file => {
            if (file instanceof File || file instanceof Blob) {
                return URL.createObjectURL(file);
            }
            return file;
        });

        setPreviewUrls(urls);

        return () => {
            urls.forEach(url => {
                if (url && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [files]);

    useEffect(() => {
        if (showGallery || activePreviewUrl !== null || showChoiceModal || showCameraModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showGallery, activePreviewUrl, showChoiceModal, showCameraModal]);

    const startCamera = async () => {
        setCameraError(null);
        setShowChoiceModal(false);
        setShowCameraModal(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError("Camera access permission denied or camera not available on this device.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCameraModal(false);
        setCameraError(null);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const capturedFile = new File([blob], `captured_doc_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onUpload([capturedFile]);
                stopCamera();
            }
        }, 'image/jpeg', 0.9);
    };

    const isUploaded = files.length > 0;

    return (
        <div className={`mw-file-tile ${isUploaded ? 'done' : ''}`} style={{ flexDirection: 'column', alignItems: 'flex-start', minHeight: 96, padding: '16px 20px', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <p className="mw-file-name" title={label} style={{ margin: 0, fontSize: '13px' }}>{label}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                    {isUploaded
                        ? <span className="mw-tag-done">✓ {files.length} File(s)</span>
                        : required
                            ? <span className="mw-tag-req">Required</span>
                            : conditional
                                ? <span style={{ fontSize: '8.5px', color: '#8A96BC', textTransform: 'uppercase', fontWeight: 800 }}>Optional</span>
                                : null
                    }
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        id={id}
                        accept="image/*,.pdf"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                                onUpload(e.target.files);
                                e.target.value = '';
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowChoiceModal(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 8,
                            background: 'rgba(79,91,203,.08)', border: '1px solid rgba(79,91,203,.18)',
                            color: '#4F5BCB', fontFamily: "'DM Sans', sans-serif",
                            fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '.08em', cursor: 'pointer', transition: 'all .18s',
                        }}
                    >
                        <Upload size={11} strokeWidth={2.5} />
                        Add Photo / PDF
                    </button>
                </div>

                {isUploaded && (
                    <button
                        type="button"
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none', color: '#4F5BCB',
                            cursor: 'pointer', padding: '6px', borderRadius: '6px',
                            transition: 'color .18s',
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowGallery(true);
                        }}
                        title="View Uploaded Photos"
                    >
                        <Eye size={18} strokeWidth={2} />
                    </button>
                )}
            </div>

            {/* Choice Modal (Upload vs Take Picture) */}
            {showChoiceModal && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                    }}
                    onClick={() => setShowChoiceModal(false)}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '16px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px', fontWeight: 800, color: '#1C2340' }}>
                                Select Attachment Method
                            </h4>
                            <button type="button" onClick={() => setShowChoiceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <p style={{ margin: 0, fontSize: '12.5px', color: '#5A6488', fontFamily: "'Inter', sans-serif" }}>
                            Choose how you would like to attach <strong>{label}</strong>:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowChoiceModal(false);
                                    if (fileInputRef.current) fileInputRef.current.click();
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                    borderRadius: '12px', background: '#F8F9FC', border: '1.5px solid rgba(28,35,64,.08)',
                                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 700, color: '#1C2340',
                                    transition: 'all .15s'
                                }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(79,91,203,.1)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Upload size={18} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div>Upload File / Document</div>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A96BC', marginTop: '2px' }}>Browse photo or PDF from device</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={startCamera}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                    borderRadius: '12px', background: '#F8F9FC', border: '1.5px solid rgba(28,35,64,.08)',
                                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 700, color: '#1C2340',
                                    transition: 'all .15s'
                                }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5,150,105,.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={18} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div>Take a Picture</div>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A96BC', marginTop: '2px' }}>Snap photo directly using camera</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Live Camera Modal */}
            {showCameraModal && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                    }}
                    onClick={stopCamera}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '520px',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1C2340', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Camera size={18} color="#059669" /> Capture Photo ({label})
                            </span>
                            <button type="button" onClick={stopCamera} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ position: 'relative', background: '#000', width: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {cameraError ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#EF4444' }}>
                                    <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>{cameraError}</p>
                                    <label
                                        htmlFor={`cam_fallback_${id}`}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px', background: '#DC2626', color: '#FFF',
                                            fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-block'
                                        }}
                                    >
                                        Open Device Camera App
                                    </label>
                                    <input
                                        type="file"
                                        id={`cam_fallback_${id}`}
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                onUpload(e.target.files);
                                                stopCamera();
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }}
                                />
                            )}
                        </div>

                        {!cameraError && (
                            <div style={{ padding: '16px 20px', background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    style={{ padding: '10px 20px', borderRadius: '10px', background: '#E2E8F0', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    style={{
                                        padding: '12px 28px', borderRadius: '12px', background: '#059669', color: '#FFFFFF',
                                        border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px',
                                        display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(5,150,105,.3)'
                                    }}
                                >
                                    <Camera size={16} /> Snap Photo
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Gallery Modal overlay */}
            {showGallery && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
                    }}
                    onClick={() => setShowGallery(false)}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '500px',
                            maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1C2340', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Uploaded Documents ({files.length})
                            </span>
                            <button
                                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={() => setShowGallery(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#F9FAFB' }}>
                            {files.map((file, idx) => {
                                const isImg = file.type?.startsWith('image/');
                                const thumb = previewUrls[idx];

                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid rgba(28,35,64,.08)', borderRadius: '10px', padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                            {isImg && thumb ? (
                                                <img src={thumb} alt="Preview" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(0,0,0,.08)' }} />
                                            ) : (
                                                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(28,35,64,.05)', border: '1px solid rgba(28,35,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A96BC' }}>
                                                    <FileText size={16} />
                                                </div>
                                            )}
                                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#4A5070', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {file.name}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                type="button"
                                                style={{ background: 'none', border: 'none', color: '#4F5BCB', cursor: 'pointer', padding: '4px' }}
                                                onClick={() => setActivePreviewUrl(thumb || previewUrls[idx])}
                                                title="View file"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px' }}
                                                onClick={() => {
                                                    onRemove(idx);
                                                    if (files.length <= 1) {
                                                        setShowGallery(false);
                                                    }
                                                }}
                                                title="Remove file"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Fullscreen Document Preview Modal */}
            {activePreviewUrl !== null && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
                    }}
                    onClick={() => setActivePreviewUrl(null)}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '800px',
                            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1C2340', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Document Preview
                            </span>
                            <button
                                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={() => setActivePreviewUrl(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                            {activePreviewUrl.includes('application/pdf') || files.find(f => previewUrls.indexOf(activePreviewUrl) !== -1)?.type === 'application/pdf' ? (
                                <iframe
                                    src={activePreviewUrl}
                                    style={{ width: '100%', height: '70vh', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    title="PDF Preview"
                                />
                            ) : (
                                <img
                                    src={activePreviewUrl}
                                    alt="Preview"
                                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}