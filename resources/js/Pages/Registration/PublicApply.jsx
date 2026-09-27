import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import {
    Upload, Info, CheckCircle2, MapPin, Check, Camera, Eye, X,
    FileText, User, Bike, Mail, Lock, Phone, Loader2, CalendarDays
} from 'lucide-react';
import { VEHICLE_DETAIL_FIELDS, getApplicableDocuments } from '@/data/registrationRequirements';
import { NASUGBU_BARANGAYS } from '@/data/nasugbuBarangays';
import {
    REGISTRATION_CSS as CSS, Field, FileUpload, todayIso, validateVehicleInfo, validateDriverInfo,
} from '@/Components/Registration/RegistrationUI';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Public Apply / MTOP Registration Wizard
   4-Step Flow: Agreement → Applicant → Vehicle → Documents → Success
   Matches Welcome.jsx design system: Plus Jakarta Sans · Inter · DM Sans
   Palette: Navy #1C2340 · Indigo accent #4F5BCB · Slate bg #EDEEF4
───────────────────────────────────────────────────────────────────────── */

// Mirrors RegistrationController::store()'s validation rules exactly, so what the user sees
// per-step is a preview of the same rules the backend enforces — not a separate, potentially
// looser set of client-only requirements. The backend remains the authoritative/final check.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


function validateApplicantInfo(data) {
    const errors = {};
    // Tricycle Owner (primary applicant)
    if (!data.first_name.trim()) errors.first_name = 'First name is required.';
    if (!data.last_name.trim()) errors.last_name = 'Last name is required.';
    if (!data.birthday) errors.birthday = 'Birthday is required.';
    else if (data.birthday > todayIso()) errors.birthday = 'Birthday cannot be in the future.';
    if (!data.contact.trim()) errors.contact = 'Mobile number is required.';
    if (!data.barangay) errors.barangay = 'Please select your barangay.';
    if (!data.email.trim()) errors.email = 'Email address is required.';
    else if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = 'Please enter a valid email address.';
    if (!data.password) errors.password = 'Password is required.';
    else if (data.password.length < 8) errors.password = 'Password must be at least 8 characters.';

    // Separate Tricycle Driver — only required when the owner is NOT the driver (shared with the
    // Driver Portal MTOP wizard).
    Object.assign(errors, validateDriverInfo(data));
    return errors;
}


const DRAFT_STORAGE_KEY = 'trivora_public_apply_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const loadSavedDraft = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.savedAt && (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS)) {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const clearSavedDraft = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
};

export default function PublicApply() {
    const { url } = usePage();
    const savedDraftRef = useRef(loadSavedDraft());
    const initialDraft = savedDraftRef.current;

    const [step, setStep] = useState(() => {
        if (initialDraft?.step && initialDraft.step >= 1 && initialDraft.step <= 4) {
            return initialDraft.step;
        }
        return 1;
    });
    const [agreed, setAgreed] = useState(() => {
        return initialDraft ? Boolean(initialDraft.agreed) : false;
    });
    const [scrolledTerms, setScrolledTerms] = useState(() => {
        return initialDraft ? Boolean(initialDraft.scrolledTerms) : false;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Field-level errors only render once a field has been touched (blurred), so an empty step
    // doesn't greet the user with a wall of red text before they've typed anything.
    const [touched, setTouched] = useState({});
    const markTouched = (field) => setTouched(t => (t[field] ? t : { ...t, [field]: true }));

    // All 42 official barangays of Nasugbu, Batangas — canonical shared list
    // (resources/js/data/nasugbuBarangays.js), also used by the Driver Portal wizard.
    const nasugbuBarangays = NASUGBU_BARANGAYS;

    // Public Registration always submits application_type 'new' — Prangkisa (renewal-only) is
    // therefore never applicable here.
    const documentList = getApplicableDocuments('new');
    const requiredDocs = documentList.filter(d => d.required);
    const applicableConditionalDocs = documentList.filter(d => !d.required);

    const initialFormData = initialDraft?.formData || {};

    const { data, setData, post, processing, errors } = useForm({
        // Applicant (tricycle OWNER) info — first/last/birthday/mobile/barangay, plus the
        // owner's login credentials. owner_is_driver defaults to Yes: the owner drives
        // their own unit unless they explicitly say otherwise (the separate Tricycle
        // Driver block below is then filled and persisted with the application).
        first_name: initialFormData.first_name || '',
        last_name: initialFormData.last_name || '',
        birthday: initialFormData.birthday || '',
        contact: initialFormData.contact || '',
        barangay: initialFormData.barangay || '',
        owner_is_driver: initialFormData.owner_is_driver !== undefined ? initialFormData.owner_is_driver : true,
        driver_first_name: initialFormData.driver_first_name || '',
        driver_last_name: initialFormData.driver_last_name || '',
        driver_birthday: initialFormData.driver_birthday || '',
        driver_contact: initialFormData.driver_contact || '',
        driver_barangay: initialFormData.driver_barangay || '',
        email: initialFormData.email || '',
        password: initialFormData.password || '',
        plate_number: initialFormData.plate_number || '',
        make_model: initialFormData.make_model || '',
        year_model: initialFormData.year_model || '',
        body_color: initialFormData.body_color || '',
        body_type: initialFormData.body_type || '',
        engine_number: initialFormData.engine_number || '',
        chassis_number: initialFormData.chassis_number || '',
        or_number: initialFormData.or_number || '',
        cr_number: initialFormData.cr_number || '',
        terms_accepted: initialDraft?.agreed ?? false,
        privacy_policy_accepted: initialDraft?.agreed ?? false,
        documents: {},
    });

    const [submittedReference, setSubmittedReference] = useState('');

    // Persist draft on every step or field change so a browser refresh preserves progress
    useEffect(() => {
        if (step >= 5) {
            clearSavedDraft();
            return;
        }

        try {
            const { documents, ...serializableData } = data;
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
                step,
                agreed,
                scrolledTerms,
                formData: serializableData,
                savedAt: Date.now(),
            }));
        } catch {}
    }, [step, agreed, scrolledTerms, data]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('reference');
        if (params.get('success') === '1' && ref) {
            clearSavedDraft();
            setSubmittedReference(ref);
            setStep(5);
            // Clear query parameters from URL
            if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [url]);

    const getReferenceNo = () => {
        return submittedReference || (new URLSearchParams(window.location.search)).get('reference') || 'NSB-26-8812';
    };

    const applicantInfoErrors = validateApplicantInfo(data);
    const vehicleInfoErrors = validateVehicleInfo(data);
    const isStep2Valid = Object.keys(applicantInfoErrors).length === 0;
    const isStep3Valid = Object.keys(vehicleInfoErrors).length === 0;
    const fieldError = (field, errors) => (touched[field] ? errors[field] : undefined);

    // Keeps `agreed` (drives the checkbox's own UI state/animation) and useForm's `data` (what
    // actually gets sent to the backend) as a single source of truth, instead of two variables
    // that can silently drift apart — which is exactly how the previous "terms accepted field is
    // required" bug happened: `agreed` was toggled correctly, but nothing wrote it into `data`.
    const toggleAgreed = () => {
        if (!scrolledTerms) return;
        setAgreed(prev => {
            const next = !prev;
            setData(current => ({ ...current, terms_accepted: next, privacy_policy_accepted: next }));
            return next;
        });
    };

    const handleNext = () => {
        if (step === 1) {
            if (!scrolledTerms || !agreed) return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setStep(s => s + 1);
    };

    const back = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };

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

    const missingRequiredDocs = requiredDocs.filter(d => {
        const files = data.documents[d.id];
        return !(Array.isArray(files) && files.length > 0);
    });
    const hasAllRequired = missingRequiredDocs.length === 0;
    const uploadedRequiredCount = requiredDocs.length - missingRequiredDocs.length;

    const handleTermsScroll = (e) => {
        const el = e.target;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
            setScrolledTerms(true);
        }
    };

    const submitApplication = (e) => {
        if (e) e.preventDefault();
        
        if (!hasAllRequired) {
            Swal.fire({
                title: 'Missing Requirements',
                html: 'Pakisumite ang lahat ng required na dokumento bago magpatuloy:<br/><br/>'
                    + missingRequiredDocs.map(d => `&bull; ${d.label}`).join('<br/>'),
                icon: 'warning',
                confirmButtonColor: '#1C2340'
            });
            return;
        }

        if (!agreed) {
            Swal.fire({
                title: 'Agreement Required',
                text: 'Please go back to Step 1 and agree to the Terms & Conditions and Data Privacy Consent before submitting.',
                icon: 'warning',
                confirmButtonColor: '#1C2340'
            });
            return;
        }

        setIsSubmitting(true);
        post('/register-mtop', {
            forceFormData: true,
            onFinish: () => setIsSubmitting(false),
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                Swal.fire({
                    title: 'Submission Failed',
                    text: firstErr || 'Please check your inputs and try again.',
                    icon: 'error',
                    confirmButtonColor: '#1C2340'
                });
            }
        });
    };

    const steps = ['Agreement', 'Applicant', 'Vehicle', 'Documents'];
    const stepDescriptions = [
        'Review terms, data privacy consent, and ordinance compliance.',
        'Tricycle Owner details, driver setup & account credentials.',
        'LTO registration and unit specifications.',
        'Upload required clearances and IDs.',
    ];

    return (
        <div className="pa-root">
            <Head title="Franchise Registration | TRIVORA Nasugbu" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── SPLIT LEFT: branding + vertical step tracker (hidden once submitted) ── */}
            {step < 5 && (
                <aside className="pa-side">
                    <div className="pa-hero-glow pa-hero-glow--1" aria-hidden="true" />
                    <div className="pa-hero-glow pa-hero-glow--2" aria-hidden="true" />

                    <div className="pa-side-top">
                        <Link href="/" className="pa-logo">
                            <div className="pa-logo-img-wrap">
                                <img src="/images/logo.png" alt="TRIVORA" className="pa-logo-img" />
                            </div>
                        </Link>
                        <h1 className="pa-page-title">Register Your Tricycle Unit</h1>
                        <p className="pa-page-sub">Complete all steps to submit your franchise application to the Nasugbu TMO.</p>
                    </div>

                    <div className="pa-side-mid">
                        <div className="pa-step-v-list">
                            {steps.map((label, i) => {
                                const num      = i + 1;
                                const isDone   = step > num;
                                const isActive = step === num;
                                return (
                                    <div key={label} className="pa-step-v">
                                        <div className="pa-step-v-rail">
                                            <div className={`pa-step-v-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                                                {isDone ? <Check size={14} strokeWidth={3} /> : num}
                                            </div>
                                            {i < steps.length - 1 && (
                                                <div className={`pa-step-v-line ${isDone ? 'done' : ''}`} />
                                            )}
                                        </div>
                                        <div className="pa-step-v-text">
                                            <p className={`pa-step-v-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>{label}</p>
                                            <p className="pa-step-v-desc">{stepDescriptions[i]}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pa-side-bottom">
                        <p className="pa-side-note">Authorized LGU Franchise Portal &bull; Nasugbu, Batangas</p>
                    </div>
                </aside>
            )}

            {/* ── SPLIT RIGHT: active step content ── */}
            <main className="pa-content">
                {step < 5 && (
                    <div className="pa-content-topbar">
                        <Link href="/" className="pa-back-link" onClick={() => clearSavedDraft()}>
                            Cancel &amp; Return Home
                        </Link>
                    </div>
                )}

                <div className="pa-content-center">
                <div className="pa-content-inner">

                    {/* ── STEP 1: AGREEMENT ── */}
                    {step === 1 && (
                        <div className="pa-card">
                            <div className="pa-card-top">
                                <div className="pa-card-top-text">
                                    <div className="pa-card-icon"><FileText size={20} strokeWidth={1.8} /></div>
                                    <div>
                                        <h2 className="pa-card-title">Terms & Agreement</h2>
                                        <p className="pa-card-sub">Read the full policy before proceeding with your application</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pa-agree-scroll" onScroll={handleTermsScroll}>
                                <h3 className="pa-agree-h">1. Purpose and Scope</h3>
                                <p className="pa-agree-p">
                                    This online application system is operated by the Traffic Management Office (TMO) of the
                                    Municipality of Nasugbu, Batangas. It facilitates the electronic submission of Motorized
                                    Tricycle Operator Permit (MTOP) applications for new franchises and renewals within the
                                    territorial jurisdiction of Nasugbu.
                                </p>

                                <h3 className="pa-agree-h">2. Eligibility Requirements</h3>
                                <ol className="pa-agree-ol">
                                    <li>Applicant must be a registered resident of Nasugbu, Batangas.</li>
                                    <li>The tricycle unit must be duly registered with the Land Transportation Office (LTO).</li>
                                    <li>The operator must be a member in good standing of a recognized TODA, NAFTODA, or ACTODAN association.</li>
                                    <li>Applicant must not have any pending violations or unresolved cases with the TMO.</li>
                                </ol>

                                <h3 className="pa-agree-h">3. Document Authenticity</h3>
                                <p className="pa-agree-p">
                                    By submitting this application, the applicant certifies that all uploaded documents are genuine,
                                    unaltered, and legally obtained. Any falsification or submission of fraudulent documents is
                                    punishable under existing national and local ordinances and shall result in immediate revocation
                                    of any issued permit.
                                </p>

                                <h3 className="pa-agree-h">4. Tricycle Inspection & GPS Installation</h3>
                                <p className="pa-agree-p">
                                    Submission of this application does not guarantee approval. Units must pass a physical roadworthiness inspection.
                                    Upon approval, the TMO will install an LGU-provided Smart GPS Tracker on the unit for safety and traffic monitoring.
                                    Tampering with or removing this device is a severe violation.
                                </p>

                                <h3 className="pa-agree-h">5. Compliance with Local Ordinances</h3>
                                <p className="pa-agree-p">
                                    The operator agrees to strictly abide by the Nasugbu Traffic Code, including the Color Coding Scheme and designated TODA routing.
                                    Violations detected manually or via the Smart GPS system may result in fines or franchise revocation.
                                </p>

                                <h3 className="pa-agree-h">6. Fees and Payment</h3>
                                <p className="pa-agree-p">
                                    All franchise and regulatory fees are subject to current municipal ordinances. Payments are collected only after the unit passes physical inspection.
                                    The Smart GPS Tracker is provided by the Municipal Government at no hardware cost to the operator.
                                </p>

                                <h3 className="pa-agree-h">7. Data Privacy and Consent</h3>
                                <p className="pa-agree-p">
                                    By applying, you consent to the collection and processing of your personal data and real-time GPS location data in accordance with the Data Privacy Act of 2012 (R.A. 10173).
                                    Data will be used exclusively for franchise administration, traffic management, and public safety.
                                </p>
                            </div>

                            {!scrolledTerms && (
                                <p className="pa-scroll-hint">
                                    Scroll down to read the full terms
                                </p>
                            )}

                            <div
                                className={`pa-checkbox-row${agreed ? ' checked' : ''}${!scrolledTerms ? ' locked' : ''}`}
                                onClick={toggleAgreed}
                            >
                                <div className={`pa-checkbox${agreed ? ' checked' : ''}`}>
                                    {agreed && <Check size={11} strokeWidth={3} color="#FFFFFF" />}
                                </div>
                                <p className="pa-checkbox-text">
                                    I have read, understood, and agree to the <span>Terms & Conditions</span>,
                                    including the <span>Data Privacy Consent</span> and compliance with traffic ordinances.
                                </p>
                            </div>

                            <div className="pa-actions">
                                <Link href="/" className="pa-btn-ghost">
                                    Cancel
                                </Link>
                                <button
                                    className="pa-btn-primary"
                                    onClick={handleNext}
                                    disabled={!scrolledTerms || !agreed}
                                    style={{ opacity: (!scrolledTerms || !agreed) ? 0.45 : 1, cursor: (!scrolledTerms || !agreed) ? 'not-allowed' : 'pointer' }}
                                >
                                    {!scrolledTerms ? 'Scroll to Read' : !agreed ? 'Agree to Continue' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: APPLICANT (TRICYCLE OWNER) INFO ── */}
                    {step === 2 && (
                        <div className="pa-card">
                            <div className="pa-card-top">
                                <div className="pa-card-top-text">
                                    <div className="pa-card-icon"><User size={20} strokeWidth={1.8} /></div>
                                    <div>
                                        <h2 className="pa-card-title">Applicant Information</h2>
                                        <p className="pa-card-sub">Tricycle Owner details — the applicant of this franchise</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pa-fields">
                                <Field label="First Name" error={fieldError('first_name', applicantInfoErrors)}>
                                    <div className="pa-input-wrap">
                                        <span className="pa-input-wrap-icon"><User size={15} strokeWidth={2} /></span>
                                        <input className={`pa-input${fieldError('first_name', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            placeholder="e.g. Juan" autoComplete="off"
                                            value={data.first_name || ''} onChange={e => setData('first_name', e.target.value)}
                                            onBlur={() => markTouched('first_name')} />
                                    </div>
                                </Field>
                                <Field label="Last Name" error={fieldError('last_name', applicantInfoErrors)}>
                                    <div className="pa-input-wrap">
                                        <span className="pa-input-wrap-icon"><User size={15} strokeWidth={2} /></span>
                                        <input className={`pa-input${fieldError('last_name', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            placeholder="e.g. Dela Cruz" autoComplete="off"
                                            value={data.last_name || ''} onChange={e => setData('last_name', e.target.value)}
                                            onBlur={() => markTouched('last_name')} />
                                    </div>
                                </Field>
                                <Field label="Birthday" error={fieldError('birthday', applicantInfoErrors)}>
                                    <div className="pa-input-wrap">
                                        <span className="pa-input-wrap-icon"><CalendarDays size={15} strokeWidth={2} /></span>
                                        <input className={`pa-input${fieldError('birthday', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            type="date" max={todayIso()} autoComplete="off"
                                            value={data.birthday || ''} onChange={e => setData('birthday', e.target.value)}
                                            onBlur={() => markTouched('birthday')} />
                                    </div>
                                </Field>
                                <Field label="Mobile Number" error={fieldError('contact', applicantInfoErrors)}>
                                    <div className="pa-input-wrap">
                                        <span className="pa-input-wrap-icon"><Phone size={15} strokeWidth={2} /></span>
                                        <input className={`pa-input${fieldError('contact', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            placeholder="e.g. 0917 123 4567" autoComplete="off"
                                            value={data.contact || ''} onChange={e => setData('contact', e.target.value)}
                                            onBlur={() => markTouched('contact')} />
                                    </div>
                                </Field>
                                <Field label="Barangay (Nasugbu)" error={fieldError('barangay', applicantInfoErrors)}>
                                    <div className="pa-select-wrap">
                                        <select className={`pa-select${fieldError('barangay', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            value={data.barangay || ''}
                                            onChange={e => setData('barangay', e.target.value)}
                                            onBlur={() => markTouched('barangay')}>
                                            <option value="">Select Barangay</option>
                                            {nasugbuBarangays.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                        </select>
                                        <MapPin size={15} strokeWidth={2} />
                                    </div>
                                </Field>
                                <Field label="Email Address" error={fieldError('email', applicantInfoErrors)}>
                                    <div className="pa-input-wrap">
                                        <span className="pa-input-wrap-icon"><Mail size={15} strokeWidth={2} /></span>
                                        <input className={`pa-input${fieldError('email', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            type="email" placeholder="e.g. juan@example.com" autoComplete="off"
                                            value={data.email || ''} onChange={e => setData('email', e.target.value)}
                                            onBlur={() => markTouched('email')} />
                                    </div>
                                </Field>
                                <Field label="Account Password" error={fieldError('password', applicantInfoErrors)}>
                                    <div className="pa-input-wrap">
                                        <span className="pa-input-wrap-icon"><Lock size={15} strokeWidth={2} /></span>
                                        <input className={`pa-input${fieldError('password', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            type="password" placeholder="Min. 8 characters" autoComplete="new-password"
                                            value={data.password || ''} onChange={e => setData('password', e.target.value)}
                                            onBlur={() => markTouched('password')} />
                                    </div>
                                </Field>
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
                                        <Field label="First Name" error={fieldError('driver_first_name', applicantInfoErrors)}>
                                            <div className="pa-input-wrap">
                                                <span className="pa-input-wrap-icon"><User size={15} strokeWidth={2} /></span>
                                                <input className={`pa-input${fieldError('driver_first_name', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                                    placeholder="e.g. Pedro" autoComplete="off"
                                                    value={data.driver_first_name || ''} onChange={e => setData('driver_first_name', e.target.value)}
                                                    onBlur={() => markTouched('driver_first_name')} />
                                            </div>
                                        </Field>
                                        <Field label="Last Name" error={fieldError('driver_last_name', applicantInfoErrors)}>
                                            <div className="pa-input-wrap">
                                                <span className="pa-input-wrap-icon"><User size={15} strokeWidth={2} /></span>
                                                <input className={`pa-input${fieldError('driver_last_name', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                                    placeholder="e.g. Santos" autoComplete="off"
                                                    value={data.driver_last_name || ''} onChange={e => setData('driver_last_name', e.target.value)}
                                                    onBlur={() => markTouched('driver_last_name')} />
                                            </div>
                                        </Field>
                                        <Field label="Birthday" error={fieldError('driver_birthday', applicantInfoErrors)}>
                                            <div className="pa-input-wrap">
                                                <span className="pa-input-wrap-icon"><CalendarDays size={15} strokeWidth={2} /></span>
                                                <input className={`pa-input${fieldError('driver_birthday', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                                    type="date" max={todayIso()} autoComplete="off"
                                                    value={data.driver_birthday || ''} onChange={e => setData('driver_birthday', e.target.value)}
                                                    onBlur={() => markTouched('driver_birthday')} />
                                            </div>
                                        </Field>
                                        <Field label="Mobile Number" error={fieldError('driver_contact', applicantInfoErrors)}>
                                            <div className="pa-input-wrap">
                                                <span className="pa-input-wrap-icon"><Phone size={15} strokeWidth={2} /></span>
                                                <input className={`pa-input${fieldError('driver_contact', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                                    placeholder="e.g. 0917 123 4567" autoComplete="off"
                                                    value={data.driver_contact || ''} onChange={e => setData('driver_contact', e.target.value)}
                                                    onBlur={() => markTouched('driver_contact')} />
                                            </div>
                                        </Field>
                                        <Field label="Barangay (Nasugbu)" error={fieldError('driver_barangay', applicantInfoErrors)}>
                                            <div className="pa-select-wrap">
                                                <select className={`pa-select${fieldError('driver_barangay', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                                    value={data.driver_barangay || ''}
                                                    onChange={e => setData('driver_barangay', e.target.value)}
                                                    onBlur={() => markTouched('driver_barangay')}>
                                                    <option value="">Select Barangay</option>
                                                    {nasugbuBarangays.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                                </select>
                                                <MapPin size={15} strokeWidth={2} />
                                            </div>
                                        </Field>
                                    </div>
                                </div>
                            )}

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    Back
                                </button>
                                <button
                                    className="pa-btn-primary"
                                    onClick={() => {
                                        if (!isStep2Valid) {
                                            // Mark exactly the fields that are currently in error as touched,
                                            // so every blocking problem (owner and driver alike) becomes visible.
                                            setTouched(t => ({
                                                ...t,
                                                ...Object.fromEntries(Object.keys(applicantInfoErrors).map(k => [k, true])),
                                            }));
                                            return;
                                        }
                                        handleNext();
                                    }}
                                    style={{ opacity: isStep2Valid ? 1 : 0.55, cursor: 'pointer' }}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: VEHICLE ── */}
                    {step === 3 && (
                        <div className="pa-card">
                            <div className="pa-card-top">
                                <div className="pa-card-top-text">
                                    <div className="pa-card-icon"><Bike size={20} strokeWidth={1.8} /></div>
                                    <div>
                                        <h2 className="pa-card-title">Vehicle Specs</h2>
                                        <p className="pa-card-sub">Tricycle Registration & Unit Details</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pa-fields">
                                {VEHICLE_DETAIL_FIELDS.map(f => (
                                    <Field key={f.id} label={f.label} error={fieldError(f.id, vehicleInfoErrors)}>
                                        <input className={`pa-input${fieldError(f.id, vehicleInfoErrors) ? ' pa-input-error' : ''}`}
                                            placeholder={f.placeholder} autoComplete="off"
                                            value={data[f.id] || ''} onChange={e => setData(f.id, e.target.value)}
                                            onBlur={() => markTouched(f.id)} />
                                    </Field>
                                ))}
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    Back
                                </button>
                                <button
                                    className="pa-btn-primary"
                                    onClick={() => {
                                        if (!isStep3Valid) {
                                            setTouched(t => ({
                                                ...t, plate_number: true, make_model: true, year_model: true,
                                                body_color: true, body_type: true, engine_number: true, chassis_number: true,
                                                or_number: true, cr_number: true,
                                            }));
                                            return;
                                        }
                                        handleNext();
                                    }}
                                    style={{ opacity: isStep3Valid ? 1 : 0.55, cursor: 'pointer' }}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: DOCUMENTS & SUBMIT ── */}
                    {step === 4 && (
                        <div className="pa-card" style={{ maxWidth: 900 }}>
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
                                        required={doc.required}
                                        conditional={!doc.required}
                                        files={data.documents[doc.id] || []}
                                        onUpload={files => handleFileUpload(doc.id, files)}
                                        onRemove={idx => handleRemoveFile(doc.id, idx)}
                                    />
                                ))}
                            </div>

                            {applicableConditionalDocs.length > 0 && (
                                <>
                                    <p className="pa-docs-subhead">You may also need to attach</p>
                                    <div className="pa-docs-grid">
                                        {applicableConditionalDocs.map(doc => (
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
                                <button className="pa-btn-ghost" onClick={back}>
                                    Back
                                </button>
                                <button className="pa-btn-success" onClick={submitApplication} disabled={isSubmitting} style={{ opacity: isSubmitting ? .75 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                                    {isSubmitting ? <Loader2 size={15} strokeWidth={2.5} style={{ animation: 'paSpin .8s linear infinite' }} /> : null}
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 5: SUCCESS ── */}
                    {step === 5 && (
                        <div className="pa-card pa-card--elevated" style={{ textAlign: 'center' }}>
                            <div className="pa-success-icon">
                                <CheckCircle2 size={38} strokeWidth={2} />
                            </div>

                            <h2 className="pa-card-title" style={{ marginBottom: 6 }}>Application Submitted</h2>
                            <p className="pa-card-sub" style={{ marginBottom: 32 }}>Your documents have been received</p>

                            <div className="pa-tracking-box">
                                <p className="pa-tracking-eyebrow">Your Tracking Number</p>
                                <p className="pa-tracking-number">{getReferenceNo()}</p>
                            </div>

                            <p className="pa-success-desc">
                                Your application has been submitted and is now <span>pending TMO Requirements Review.</span> You
                                can monitor the progress of your application through the <span>Driver Portal.</span>
                            </p>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                                <Link href="/operator/dashboard"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 9,
                                        height: 52, padding: '0 36px', borderRadius: 12,
                                        background: '#1C2340', color: '#FFFFFF', textDecoration: 'none',
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
                                        letterSpacing: '.15em', textTransform: 'uppercase',
                                        boxShadow: '0 4px 14px rgba(28,35,64,.25)',
                                    }}
                                >
                                    Go to Driver Portal
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearSavedDraft();
                                        window.location.href = '/register-mtop';
                                    }}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 9,
                                        height: 52, padding: '0 28px', borderRadius: 12,
                                        background: '#F1F3F9', color: '#1C2340', border: '1px solid #D5DAE7',
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
                                        letterSpacing: '.15em', textTransform: 'uppercase', cursor: 'pointer',
                                    }}
                                >
                                    Start New Application
                                </button>
                            </div>
                        </div>
                    )}

                </div>
                </div>

                {/* Footer sits in its own grid row, so it never fights the
                    centered content above it for vertical space. */}
                <footer className="pa-footer">
                    <p className="pa-footer-copy">&copy; 2026 TRIVORA Fleet Operations &bull; Nasugbu Batangas</p>
                </footer>
            </main>
        </div>
    );
}
