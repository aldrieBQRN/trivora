import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { PageHeader, BackLink, Button, Label, Input, Select } from '@/Components/TMO';
import {
    ChevronRight,
    CheckCircle2,
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

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// and Operator panels, so this page reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
const BRAND_ICON_CHIP = 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]';

export default function MTOPWizard({ applicationType = 'new', tricycleUnit = null }) {
    const { auth } = usePage().props;
    const operatorName = auth?.user?.name || 'Driver';

    // 3 steps: 1. Vehicle, 2. Documents, 3. Success
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
        <OperatorLayout title={isRenewal ? "Franchise Renewal" : "New Unit Registration"} operatorName={operatorName}>
            <Head title={`${isRenewal ? "Franchise Renewal" : "New Unit Registration"} | TRIVORA`} />

            <div className="mx-auto max-w-[1100px] pb-10">

                {step < 3 && (
                    <>
                        <PageHeader
                            eyebrow="Franchise &amp; Compliance"
                            title={isRenewal ? 'Franchise Renewal Application' : 'New Unit Registration'}
                            subtitle={isRenewal
                                ? `Submit your application to renew the municipal MTOP franchise certificate for unit ${data.plate ? `(${data.plate})` : ''}.`
                                : 'Complete the steps below to submit your application for a new tricycle unit.'}
                            backLink={<BackLink href={route('operator.mtop')}>{`Cancel ${isRenewal ? 'Renewal' : 'Registration'}`}</BackLink>}
                        />

                        {/* Stepper */}
                        <div className="mb-8 flex items-center gap-4">
                            <StepNode num={1} label="Vehicle Details" active={step === 1} done={step > 1} />
                            <div className={`h-0.5 w-10 shrink-0 rounded-full ${step > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                            <StepNode num={2} label="Requirements" active={step === 2} done={step > 2} />
                        </div>
                    </>
                )}

                {/* ── STEP 1: VEHICLE ── */}
                {step === 1 && (
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-8 ${CARD_SHADOW}`}>
                        <div className="mb-7 flex items-center gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${BRAND_ICON_CHIP}`}>
                                <Bike size={22} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                                {isRenewal ? 'Verified Tricycle Specs (Renewal)' : 'Tricycle Specifications'}
                            </h2>
                        </div>

                        {isRenewal && (
                            <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#1D2542]/20 bg-[#1D2542]/[0.06] p-4">
                                <Info size={20} className="shrink-0 text-[#1D2542]" />
                                <div>
                                    <p className="text-[13px] font-bold text-slate-900">
                                        Pre-Filled Municipal Record {tricycleUnit?.plate_number ? `(${tricycleUnit.plate_number})` : ''}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Vehicle specs are pre-loaded from your registered unit archives for fast-track franchise renewal.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label>TODA Assignment</Label>
                                <Select value={data.toda} onChange={e => setData('toda', e.target.value)}>
                                    <option value="">Select TODA Assignment</option>
                                    <option value="TODA Bucana">TODA Bucana</option>
                                    <option value="TODA Brgy. 10">TODA Brgy. 10</option>
                                    <option value="TODA Brgy. 8">TODA Brgy. 8</option>
                                    <option value="TODA Brgy. 4">TODA Brgy. 4</option>
                                </Select>
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Motorcycle Make &amp; Model</Label>
                                <Input placeholder="e.g. Kawasaki Barako 175" value={data.make_model} onChange={e => setData('make_model', e.target.value)} />
                            </div>
                            <div>
                                <Label>LTO Plate / Body Number</Label>
                                <Input placeholder="e.g. 123-ABC or 0412" value={data.plate} onChange={e => setData('plate', e.target.value)} />
                            </div>
                            <div>
                                <Label>Engine Number</Label>
                                <Input placeholder="ENG-XXXXXX" value={data.engine_number} onChange={e => setData('engine_number', e.target.value)} />
                            </div>
                            <div>
                                <Label>Chassis Number</Label>
                                <Input placeholder="CHAS-XXXXXX" value={data.chassis_number} onChange={e => setData('chassis_number', e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-8 flex items-center justify-end border-t border-slate-200 pt-6">
                            <Button variant="primary" size="lg" disabled={!isStep1Valid} onClick={next} icon={ChevronRight} iconPosition="right">
                                Continue to Documents
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: DOCUMENTS ── */}
                {step === 2 && (
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-8 ${CARD_SHADOW}`}>
                        <div className="mb-3 flex items-center gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${BRAND_ICON_CHIP}`}>
                                <FileText size={22} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Required Documents</h2>
                        </div>
                        <p className="mb-6 text-sm text-slate-500">Please upload a clear scan or photo of the following municipal requirements.</p>

                        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                            <Button variant="secondary" size="lg" onClick={back} disabled={isSubmitting} icon={ArrowLeft}>
                                Back
                            </Button>
                            <Button
                                variant="success"
                                size="lg"
                                disabled={!isStep2Valid || isSubmitting}
                                loading={isSubmitting}
                                onClick={handleFinalSubmit}
                                icon={ShieldCheck}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: SUCCESS SUBMISSION ── */}
                {step === 3 && (
                    <div className={`rounded-2xl border border-slate-200/70 bg-white px-6 py-16 text-center sm:px-10 ${CARD_SHADOW}`}>
                        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={44} strokeWidth={2.5} />
                        </div>
                        <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">Application Submitted</h1>
                        <p className="mx-auto mb-10 max-w-lg text-[15px] leading-relaxed text-slate-500">
                            Your registration for the new unit has been successfully submitted.
                            The Nasugbu TMO team will begin document verification shortly.
                        </p>

                        <div className={`mx-auto mb-10 max-w-sm rounded-2xl border border-[#1D2542]/15 bg-gradient-to-br from-[#1D2542]/[0.06] to-[#1D2542]/[0.01] p-7 text-left ${CARD_SHADOW}`}>
                            <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#1D2542]/60">Tracking Number</span>
                            <p className="text-3xl font-bold tracking-wide text-[#1D2542]">NSB-2026-9812</p>
                        </div>

                        <div className="mx-auto mb-10 max-w-xl rounded-xl border border-slate-200/70 bg-slate-50 p-7 text-left">
                            <h4 className="mb-4 flex items-center gap-2.5 text-sm font-bold text-slate-900">
                                <Info size={17} className="text-[#1D2542]" /> What happens next?
                            </h4>
                            <ul className="flex flex-col gap-3">
                                <li className="flex gap-3 text-sm leading-relaxed text-slate-500">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D2542]" />
                                    <span><strong className="text-slate-900">Document Verification:</strong> TMO staff will review your uploads within 24-48 hours.</span>
                                </li>
                                <li className="flex gap-3 text-sm leading-relaxed text-slate-500">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D2542]" />
                                    <span><strong className="text-slate-900">Physical Inspection:</strong> You will be notified via SMS to schedule the vehicle's roadworthiness check.</span>
                                </li>
                                <li className="flex gap-3 text-sm leading-relaxed text-slate-500">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                    <span><strong className="text-slate-900">Payment &amp; Fees:</strong> Franchise and IoT installation fees will only be collected <em>after</em> your unit passes physical inspection.</span>
                                </li>
                            </ul>
                        </div>

                        <Button as={Link} href={route('operator.mtop')} variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                            Return to Application Tracker
                        </Button>
                    </div>
                )}

            </div>
        </OperatorLayout>
    );
}

/* ── UI Components ── */

function StepNode({ num, label, active, done }) {
    return (
        <div className="flex shrink-0 items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                done ? 'bg-emerald-600 text-white' :
                active ? 'border-2 border-[#1D2542] bg-white text-[#1D2542] ring-4 ring-[#1D2542]/10' :
                'bg-slate-50 text-slate-400'
            }`}>
                {done ? <Check size={16} strokeWidth={3} /> : num}
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${active ? 'text-slate-900' : done ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
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
        <div className={`flex min-h-[96px] flex-col items-start gap-2 rounded-xl border-[1.5px] border-dashed p-4 transition-colors ${isUploaded ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-300 bg-slate-50 hover:border-[#1D2542]/40 hover:bg-white'}`}>
            <div className="flex w-full items-center justify-between gap-2">
                <p className="truncate text-[13px] font-bold leading-snug text-slate-900" title={label}>{label}</p>
                <div className="flex shrink-0 gap-1.5">
                    {isUploaded
                        ? <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-[9px] font-extrabold uppercase text-emerald-700">✓ {files.length} File(s)</span>
                        : required
                            ? <span className="rounded-md bg-red-50 px-2.5 py-1 text-[9px] font-extrabold uppercase text-red-600">Required</span>
                            : conditional
                                ? <span className="text-[9px] font-extrabold uppercase text-slate-400">Optional</span>
                                : null
                    }
                </div>
            </div>

            <div className="mt-1 flex w-full items-center justify-between">
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        id={id}
                        accept="image/*,.pdf"
                        multiple
                        className="hidden"
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
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#1D2542]/20 bg-[#1D2542]/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1D2542] transition-colors hover:bg-[#1D2542]/10"
                    >
                        <Upload size={11} strokeWidth={2.5} />
                        Add Photo / PDF
                    </button>
                </div>

                {isUploaded && (
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-[#1D2542] transition-colors hover:bg-[#1D2542]/[0.06]"
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
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setShowChoiceModal(false)}
                >
                    <div
                        className="flex w-full max-w-[380px] flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="text-[15px] font-bold text-slate-900">Select Attachment Method</h4>
                            <button type="button" onClick={() => setShowChoiceModal(false)} className="text-slate-400 hover:text-slate-900">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-[12.5px] text-slate-500">
                            Choose how you would like to attach <strong className="text-slate-900">{label}</strong>:
                        </p>

                        <div className="mt-1 flex flex-col gap-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowChoiceModal(false);
                                    if (fileInputRef.current) fileInputRef.current.click();
                                }}
                                className="flex items-center gap-3 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:bg-[#1D2542]/[0.04]"
                            >
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${BRAND_ICON_CHIP}`}>
                                    <Upload size={18} />
                                </span>
                                <span>
                                    <span className="block text-[13px] font-bold text-slate-900">Upload File / Document</span>
                                    <span className="mt-0.5 block text-[11px] font-medium text-slate-400">Browse photo or PDF from device</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={startCamera}
                                className="flex items-center gap-3 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:bg-emerald-50"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                    <Camera size={18} />
                                </span>
                                <span>
                                    <span className="block text-[13px] font-bold text-slate-900">Take a Picture</span>
                                    <span className="mt-0.5 block text-[11px] font-medium text-slate-400">Snap photo directly using camera</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Live Camera Modal */}
            {showCameraModal && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4"
                    onClick={stopCamera}
                >
                    <div
                        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <Camera size={18} className="text-emerald-600" /> Capture Photo ({label})
                            </span>
                            <button type="button" onClick={stopCamera} className="text-slate-400 hover:text-slate-900">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="relative flex min-h-[300px] w-full items-center justify-center bg-black">
                            {cameraError ? (
                                <div className="p-8 text-center text-red-400">
                                    <p className="mb-4 text-sm font-semibold">{cameraError}</p>
                                    <label
                                        htmlFor={`cam_fallback_${id}`}
                                        className="inline-block cursor-pointer rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold text-white"
                                    >
                                        Open Device Camera App
                                    </label>
                                    <input
                                        type="file"
                                        id={`cam_fallback_${id}`}
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
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
                                    className="max-h-[420px] w-full object-cover"
                                />
                            )}
                        </div>

                        {!cameraError && (
                            <div className="flex items-center justify-between bg-slate-50 px-5 py-4">
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="rounded-lg bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-[13px] font-extrabold text-white shadow-sm"
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
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-6"
                    onClick={() => setShowGallery(false)}
                >
                    <div
                        className="flex max-h-[80vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <span className="text-[13px] font-bold text-slate-900">Uploaded Documents ({files.length})</span>
                            <button className="flex items-center text-slate-400 hover:text-slate-900" onClick={() => setShowGallery(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-5">
                            {files.map((file, idx) => {
                                const isImg = file.type?.startsWith('image/');
                                const thumb = previewUrls[idx];

                                return (
                                    <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                            {isImg && thumb ? (
                                                <img src={thumb} alt="Preview" className="h-9 w-9 rounded-md border border-black/10 object-cover" />
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                                                    <FileText size={16} />
                                                </div>
                                            )}
                                            <span className="truncate text-xs font-medium text-slate-500">{file.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="p-1 text-[#1D2542] hover:text-[#2A3454]"
                                                onClick={() => setActivePreviewUrl(thumb || previewUrls[idx])}
                                                title="View file"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1 text-red-600 hover:text-red-700"
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
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-6"
                    onClick={() => setActivePreviewUrl(null)}
                >
                    <div
                        className="flex max-h-[90vh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <span className="text-[13px] font-bold text-slate-900">Document Preview</span>
                            <button className="flex items-center text-slate-400 hover:text-slate-900" onClick={() => setActivePreviewUrl(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-slate-50 p-5">
                            {activePreviewUrl.includes('application/pdf') || files.find(f => previewUrls.indexOf(activePreviewUrl) !== -1)?.type === 'application/pdf' ? (
                                <iframe
                                    src={activePreviewUrl}
                                    className="h-[70vh] w-full rounded-lg border border-slate-200"
                                    title="PDF Preview"
                                />
                            ) : (
                                <img
                                    src={activePreviewUrl}
                                    alt="Preview"
                                    className="max-h-[70vh] max-w-full rounded-lg border border-slate-200 object-contain"
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
