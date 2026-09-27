import React, { useState } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { PageHeader, BackLink, Button } from '@/Components/TMO';
import {
    CheckCircle2,
    Bike,
    Check,
    Loader2,
    ArrowRight,
    Info,
    Upload,
    User,
    Phone,
    CalendarDays,
    MapPin,
    Mail
} from 'lucide-react';
import { VEHICLE_DETAIL_FIELDS, getApplicableDocuments } from '@/data/registrationRequirements';
import { NASUGBU_BARANGAYS } from '@/data/nasugbuBarangays';
// Same form design, upload tiles and validation as Public Registration (PublicApply.jsx).
import {
    REGISTRATION_CSS, Field, FileUpload, todayIso, validateVehicleInfo, validateDriverInfo,
} from '@/Components/Registration/RegistrationUI';

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// and Operator panels, so this page reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function MTOPWizard({ applicationType = 'new', tricycleUnit = null, owner = null }) {
    const { auth } = usePage().props;
    const operatorName = auth?.user?.name || 'Driver';

    // 3 steps: 1. Vehicle, 2. Documents, 3. Success
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isRenewal = applicationType === 'renewal';

    // Same field set/order as Public Registration (resources/js/data/registrationRequirements.js)
    // — pre-filled from the tricycle's municipal record for a renewal. The owner/driver split
    // uses the exact same backend data model as Public Registration: `owner_is_driver` on the
    // application plus an ApplicationDriver row when the owner is NOT the driver.
    const { data, setData } = useForm({
        plate_number: tricycleUnit?.plate_number || '',
        make_model: tricycleUnit?.make_model || '',
        year_model: tricycleUnit?.year_model || '',
        body_color: tricycleUnit?.body_color || '',
        body_type: tricycleUnit?.body_type || '',
        engine_number: tricycleUnit?.engine_number || '',
        chassis_number: tricycleUnit?.chassis_number || '',
        or_number: tricycleUnit?.or_number || '',
        cr_number: tricycleUnit?.cr_number || '',
        owner_is_driver: true,
        driver_first_name: '',
        driver_last_name: '',
        driver_birthday: '',
        driver_contact: '',
        driver_barangay: '',
        documents: {},
    });

    // Same canonical requirement list as Public Registration — Prangkisa only applies (and is
    // only required) for a renewal application. Split into required vs conditional exactly like
    // Public Registration's Requirements step.
    const documentList = getApplicableDocuments(isRenewal ? 'renewal' : 'new');
    const requiredDocs = documentList.filter(d => d.required);
    const conditionalDocs = documentList.filter(d => !d.required);
    const uploadedRequiredCount = requiredDocs.filter(d => {
        const files = data.documents[d.id];
        return Array.isArray(files) && files.length > 0;
    }).length;

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
        const missingRequiredDocs = requiredDocs.filter(d => !(Array.isArray(data.documents[d.id]) && data.documents[d.id].length > 0));
        if (missingRequiredDocs.length > 0) {
            Swal.fire({
                title: 'Missing Requirements',
                html: 'Pakisumite ang lahat ng required na dokumento bago magpatuloy:<br/><br/>'
                    + missingRequiredDocs.map(d => `&bull; ${d.label}`).join('<br/>'),
                icon: 'warning',
                confirmButtonColor: '#1C2340'
            });
            return;
        }
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('application_type', isRenewal ? 'renewal' : 'new');
        if (tricycleUnit?.id) {
            formData.append('unit_id', tricycleUnit.id);
        }
        VEHICLE_DETAIL_FIELDS.forEach(f => formData.append(f.id, data[f.id] || ''));

        // Owner/driver split — same payload keys as Public Registration's RegistrationController
        formData.append('owner_is_driver', data.owner_is_driver ? '1' : '0');
        if (!data.owner_is_driver) {
            formData.append('driver_first_name', data.driver_first_name || '');
            formData.append('driver_last_name', data.driver_last_name || '');
            formData.append('driver_birthday', data.driver_birthday || '');
            formData.append('driver_contact', data.driver_contact || '');
            formData.append('driver_barangay', data.driver_barangay || '');
        }

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
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                Swal.fire({
                    title: 'Submission Failed',
                    text: firstErr || 'Please check your inputs and try again.',
                    icon: 'error',
                    confirmButtonColor: '#1C2340'
                });
            },
        });
    };

    // Same rules and messages as Public Registration (shared validateVehicleInfo / validateDriverInfo);
    // the separate Tricycle Driver is only required when the owner is NOT the driver.
    const [touched, setTouched] = useState({});
    const markTouched = (field) => setTouched(t => (t[field] ? t : { ...t, [field]: true }));
    const step1Errors = { ...validateVehicleInfo(data), ...validateDriverInfo(data) };
    const fieldError = (field) => (touched[field] ? step1Errors[field] : undefined);
    const isStep1Valid = Object.keys(step1Errors).length === 0;

    return (
        <OperatorLayout title={isRenewal ? "Franchise Renewal" : "New Unit Registration"} operatorName={operatorName}>
            <Head title={`${isRenewal ? "Franchise Renewal" : "New Unit Registration"} | TRIVORA`} />

            <style dangerouslySetInnerHTML={{ __html: REGISTRATION_CSS }} />
            <div className="pa-embed mx-auto max-w-[1100px] pb-10">

                {step < 3 && (
                    <>
                        <PageHeader
                            eyebrow="Franchise &amp; Compliance"
                            title={isRenewal ? 'Franchise Renewal Application' : 'New Unit Registration'}
                            subtitle={isRenewal
                                ? `Submit your application to renew the municipal MTOP franchise certificate for unit ${data.plate_number ? `(${data.plate_number})` : ''}.`
                                : 'Complete the steps below to submit your application for a new tricycle unit.'}
                            backLink={<BackLink href={route('operator.mtop')}>{`Cancel ${isRenewal ? 'Renewal' : 'Registration'}`}</BackLink>}
                        />

                        {/* Stepper — Public Registration's step style, light version */}
                        <div className="pa-hstep-list">
                            <StepNode num={1} label="Vehicle" active={step === 1} done={step > 1} />
                            <span className={`pa-hstep-line${step > 1 ? ' done' : ''}`} />
                            <StepNode num={2} label="Documents" active={step === 2} done={step > 2} />
                        </div>
                    </>
                )}

                {/* ── STEP 1: VEHICLE (+ owner/driver) ── */}
                {step === 1 && (
                    <div className="pa-panel">
                        <div className="pa-panel-inner">
                            <div className="pa-card">
                                <div className="pa-card-top">
                                    <div className="pa-card-top-text">
                                        <div className="pa-card-icon"><Bike size={20} strokeWidth={1.8} /></div>
                                        <div>
                                            <h2 className="pa-card-title">{isRenewal ? 'Verified Vehicle Specs' : 'Vehicle Specs'}</h2>
                                            <p className="pa-card-sub">Tricycle Registration & Unit Details</p>
                                        </div>
                                    </div>
                                </div>

                                {isRenewal && (
                                    <div className="pa-notice" style={{ marginTop: 0, marginBottom: 24 }}>
                                        <Info size={17} className="pa-notice-icon" />
                                        <p className="pa-notice-text">
                                            Pre-filled from your registered unit {tricycleUnit?.plate_number ? `(${tricycleUnit.plate_number})` : ''} for
                                            a fast-track franchise renewal. Update any detail that has changed.
                                        </p>
                                    </div>
                                )}

                                {/* Same 9 fields, labels, and order as Public Registration
                                    (resources/js/data/registrationRequirements.js). */}
                                <div className="pa-fields">
                                    {VEHICLE_DETAIL_FIELDS.map(f => (
                                        <Field key={f.id} label={f.label} error={fieldError(f.id)}>
                                            <input className={`pa-input${fieldError(f.id) ? ' pa-input-error' : ''}`}
                                                placeholder={f.placeholder} autoComplete="off"
                                                value={data[f.id] || ''} onChange={e => setData(f.id, e.target.value)}
                                                onBlur={() => markTouched(f.id)} />
                                        </Field>
                                    ))}
                                </div>

                                {/* ── Owner / Driver — same structure, wording, and backend data model
                                    (owner_is_driver + ApplicationDriver) as Public Registration ── */}
                                <div className="pa-owner-card">
                                    <div className="pa-card-icon" style={{ width: 42, height: 42, borderRadius: 12 }}>
                                        <User size={18} strokeWidth={1.8} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p className="pa-owner-eyebrow">Tricycle Owner</p>
                                        <p className="pa-owner-name">{owner?.full_name || operatorName}</p>
                                        {owner?.contact_number && (
                                            <p className="pa-owner-meta"><Phone size={11} /> {owner.contact_number}</p>
                                        )}
                                        {owner?.birthday && (
                                            <p className="pa-owner-meta"><CalendarDays size={11} /> {owner.birthday}</p>
                                        )}
                                        {owner?.email && (
                                            <p className="pa-owner-meta"><Mail size={11} /> {owner.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Owner vs driver — persisted with the application (owner_is_driver),
                                    never frontend-only state. Defaults to Yes (owner drives). */}
                                <div className="pa-toggle-row">
                                    <div>
                                        <p className="pa-toggle-label">Is the owner also the tricycle driver?</p>
                                        <p className="pa-toggle-hint">
                                            Choose <strong>No</strong> if someone else will drive this tricycle unit —
                                            you will provide that driver's details below.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={data.owner_is_driver ? 'true' : 'false'}
                                        aria-label="Is the owner also the tricycle driver?"
                                        className={`pa-toggle${data.owner_is_driver ? ' on' : ''}`}
                                        onClick={() => setData('owner_is_driver', !data.owner_is_driver)}
                                    >
                                        <span className="pa-toggle-track"><span className="pa-toggle-knob" /></span>
                                        <span className="pa-toggle-answer">{data.owner_is_driver ? 'Yes' : 'No'}</span>
                                    </button>
                                </div>

                                {/* Separate Tricycle Driver — hidden entirely while the owner is the driver */}
                                {!data.owner_is_driver && (
                                    <div className="pa-subsection">
                                        <div className="pa-subsection-head">
                                            <h3 className="pa-subsection-title">Tricycle Driver</h3>
                                            <p className="pa-subsection-sub">
                                                The person who will actually drive this unit, when different from the
                                                Tricycle Owner above.
                                            </p>
                                        </div>
                                        <div className="pa-fields">
                                            <Field label="First Name" error={fieldError('driver_first_name')}>
                                                <div className="pa-input-wrap">
                                                    <span className="pa-input-wrap-icon"><User size={15} strokeWidth={2} /></span>
                                                    <input className={`pa-input${fieldError('driver_first_name') ? ' pa-input-error' : ''}`}
                                                        placeholder="e.g. Pedro" autoComplete="off"
                                                        value={data.driver_first_name || ''} onChange={e => setData('driver_first_name', e.target.value)}
                                                        onBlur={() => markTouched('driver_first_name')} />
                                                </div>
                                            </Field>
                                            <Field label="Last Name" error={fieldError('driver_last_name')}>
                                                <div className="pa-input-wrap">
                                                    <span className="pa-input-wrap-icon"><User size={15} strokeWidth={2} /></span>
                                                    <input className={`pa-input${fieldError('driver_last_name') ? ' pa-input-error' : ''}`}
                                                        placeholder="e.g. Santos" autoComplete="off"
                                                        value={data.driver_last_name || ''} onChange={e => setData('driver_last_name', e.target.value)}
                                                        onBlur={() => markTouched('driver_last_name')} />
                                                </div>
                                            </Field>
                                            <Field label="Birthday" error={fieldError('driver_birthday')}>
                                                <div className="pa-input-wrap">
                                                    <span className="pa-input-wrap-icon"><CalendarDays size={15} strokeWidth={2} /></span>
                                                    <input className={`pa-input${fieldError('driver_birthday') ? ' pa-input-error' : ''}`}
                                                        type="date" max={todayIso()} autoComplete="off"
                                                        value={data.driver_birthday || ''} onChange={e => setData('driver_birthday', e.target.value)}
                                                        onBlur={() => markTouched('driver_birthday')} />
                                                </div>
                                            </Field>
                                            <Field label="Mobile Number" error={fieldError('driver_contact')}>
                                                <div className="pa-input-wrap">
                                                    <span className="pa-input-wrap-icon"><Phone size={15} strokeWidth={2} /></span>
                                                    <input className={`pa-input${fieldError('driver_contact') ? ' pa-input-error' : ''}`}
                                                        placeholder="e.g. 0917 123 4567" autoComplete="off"
                                                        value={data.driver_contact || ''} onChange={e => setData('driver_contact', e.target.value)}
                                                        onBlur={() => markTouched('driver_contact')} />
                                                </div>
                                            </Field>
                                            <Field label="Barangay (Nasugbu)" error={fieldError('driver_barangay')}>
                                                <div className="pa-select-wrap">
                                                    <select className={`pa-select${fieldError('driver_barangay') ? ' pa-input-error' : ''}`}
                                                        value={data.driver_barangay || ''}
                                                        onChange={e => setData('driver_barangay', e.target.value)}
                                                        onBlur={() => markTouched('driver_barangay')}>
                                                        <option value="">Select Barangay</option>
                                                        {NASUGBU_BARANGAYS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                                    </select>
                                                    <MapPin size={15} strokeWidth={2} />
                                                </div>
                                            </Field>
                                        </div>
                                    </div>
                                )}

                                <div className="pa-actions">
                                    <Link href={route('operator.mtop')} className="pa-btn-ghost" style={{ textDecoration: 'none' }}>
                                        Cancel
                                    </Link>
                                    <button
                                        type="button"
                                        className="pa-btn-primary"
                                        onClick={() => {
                                            if (!isStep1Valid) {
                                                // Reveal every blocking field, exactly like Public Registration.
                                                setTouched(t => ({
                                                    ...t,
                                                    ...Object.fromEntries(Object.keys(step1Errors).map(k => [k, true])),
                                                }));
                                                return;
                                            }
                                            next();
                                        }}
                                        style={{ opacity: isStep1Valid ? 1 : 0.55, cursor: 'pointer' }}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: DOCUMENTS & SUBMIT ── */}
                {step === 2 && (
                    <div className="pa-panel">
                        <div className="pa-panel-inner">
                            <div className="pa-card">
                                <div className="pa-card-top">
                                    <div className="pa-card-top-text">
                                        <div className="pa-card-icon"><Upload size={20} strokeWidth={1.8} /></div>
                                        <div>
                                            <h2 className="pa-card-title">Requirements</h2>
                                            <p className="pa-card-sub">Take a clear photo or upload scanned copies of each document</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Live progress instead of only finding out what's missing on Submit. */}
                                <div className="pa-req-progress">
                                    <div className="pa-req-progress-bar">
                                        <div
                                            className="pa-req-progress-fill"
                                            style={{ width: `${requiredDocs.length > 0 ? (uploadedRequiredCount / requiredDocs.length) * 100 : 100}%` }}
                                        />
                                    </div>
                                    <span className="pa-req-progress-text">{uploadedRequiredCount} of {requiredDocs.length} required uploaded</span>
                                </div>

                                <div className="pa-docs-grid">
                                    {requiredDocs.map(doc => (
                                        <FileUpload
                                            key={doc.id}
                                            id={doc.id}
                                            label={doc.label}
                                            hint={doc.hint}
                                            required={doc.required}
                                            conditional={!doc.required}
                                            files={data.documents[doc.id] || []}
                                            onUpload={files => handleFileUpload(doc.id, files)}
                                            onRemove={idx => handleRemoveFile(doc.id, idx)}
                                        />
                                    ))}
                                </div>

                                {conditionalDocs.length > 0 && (
                                    <>
                                        <p className="pa-docs-subhead">You may also need to attach</p>
                                        <div className="pa-docs-grid">
                                            {conditionalDocs.map(doc => (
                                                <FileUpload
                                                    key={doc.id}
                                                    id={doc.id}
                                                    label={doc.label}
                                                    hint={doc.hint}
                                                    required={doc.required}
                                                    conditional={!doc.required}
                                                    files={data.documents[doc.id] || []}
                                                    onUpload={files => handleFileUpload(doc.id, files)}
                                                    onRemove={idx => handleRemoveFile(doc.id, idx)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div className="pa-notice">
                                    <Info size={17} className="pa-notice-icon" />
                                    <p className="pa-notice-text">
                                        Bago isumite ang mga dokumento, siguraduhing maayos ang ilaw, busina,
                                        side mirrors, baterya, at plaka (LTO/GSO) para sa physical inspection ng TMO.
                                    </p>
                                </div>

                                <div className="pa-actions">
                                    <button type="button" className="pa-btn-ghost" onClick={back} disabled={isSubmitting}>
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        className="pa-btn-success"
                                        onClick={handleFinalSubmit}
                                        disabled={isSubmitting}
                                        style={{ opacity: isSubmitting ? .75 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isSubmitting ? <Loader2 size={15} strokeWidth={2.5} style={{ animation: 'paSpin .8s linear infinite' }} /> : null}
                                        {isSubmitting ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                            </div>
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
                            Your application has been submitted and is now pending TMO Requirements Review.
                            You can monitor the progress of your application through the Driver Portal.
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
                                    <span><strong className="text-slate-900">Physical Inspection:</strong> Once approved, you'll be instructed to bring your tricycle in for a roadworthiness check — track your status anytime in the Application Tracker below.</span>
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
        <div className="pa-hstep">
            <span className={`pa-hstep-dot${active ? ' active' : done ? ' done' : ''}`}>
                {done ? <Check size={14} strokeWidth={3} /> : num}
            </span>
            <span className={`pa-hstep-label${active ? ' active' : done ? ' done' : ''}`}>{label}</span>
        </div>
    );
}
