import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import {
    Upload, Info, CheckCircle2, MapPin, Check, Camera, Eye, EyeOff, X,
    FileText, User, Mail, Lock, Phone, Loader2, CalendarDays,
    ShieldCheck, ArrowLeft, LogIn, Copy, ArrowRight
} from 'lucide-react';
import { VEHICLE_DETAIL_FIELDS, getApplicableDocuments } from '@/data/registrationRequirements';
import { NASUGBU_BARANGAYS } from '@/data/nasugbuBarangays';
import {
    REGISTRATION_CSS as CSS, Field, FileUpload, todayIso, validateVehicleInfo, validateDriverInfo,
    handleMobileKeyDown, sanitizeMobileNumber, handleMobilePaste, PasswordStrengthMeter, VehicleSpecsFields,
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
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validateApplicantInfo(data) {
    const errors = {};
    // Tricycle Owner (primary applicant)
    if (!String(data.first_name || '').trim()) errors.first_name = 'First name is required.';
    if (!String(data.last_name || '').trim()) errors.last_name = 'Last name is required.';
    if (!data.birthday) errors.birthday = 'Birthday is required.';
    else if (data.birthday > todayIso()) errors.birthday = 'Birthday cannot be in the future.';

    // Mobile Number
    const contact = String(data.contact || '').trim();
    if (!contact) {
        errors.contact = 'Mobile number is required.';
    } else if (!/^09\d{9}$/.test(contact)) {
        errors.contact = 'Mobile number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).';
    }

    if (!data.barangay) errors.barangay = 'Please select your barangay.';

    // Email Address
    const email = String(data.email || '').trim();
    if (!email) {
        errors.email = 'Email address is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }

    // Account Password
    if (!data.password) {
        errors.password = 'Password is required.';
    } else if (data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters.';
    }

    // Confirm Password
    if (!data.password_confirmation) {
        errors.password_confirmation = 'Please confirm your password.';
    } else if (data.password !== data.password_confirmation) {
        errors.password_confirmation = 'Passwords do not match.';
    }

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

// The real franchise pipeline after submission (see trivora/CLAUDE.md → Franchise workflow).
const NEXT_STEPS = [
    { name: 'Document Review', desc: 'The TMO reviews the documents you uploaded.' },
    { name: 'Physical Inspection', desc: 'Bring your tricycle to the TMO for inspection when notified.' },
    { name: 'Sticker & Franchise Release', desc: 'The BPLO releases your Sticker Number and Franchise Number.' },
    { name: 'Final Confirmation', desc: 'The TMO activates your franchise and GPS tracking.' },
];

const clearSavedDraft = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
};

export default function PublicApply() {
    const { url, props: pageProps } = usePage();
    const [copied, setCopied] = useState(false);
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
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
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
        driver_email: initialFormData.driver_email || '',
        driver_barangay: initialFormData.driver_barangay || '',
        email: initialFormData.email || '',
        password: initialFormData.password || '',
        password_confirmation: initialFormData.password_confirmation || '',
        plate_number: initialFormData.plate_number || '',
        make_model: initialFormData.make_model || '',
        year_model: initialFormData.year_model ? String(initialFormData.year_model) : '',
        body_color: initialFormData.body_color || '',
        body_color_other: initialFormData.body_color_other || '',
        body_type: initialFormData.body_type || '',
        body_type_other: initialFormData.body_type_other || '',
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

    // ── Email verification: Applicant Information → Continue sends a 6-digit code to the
    // applicant's email; a correct code in the modal moves on to Vehicle Specs. The server
    // also refuses the final submission for an unverified email.
    const normalizedEmail = String(data.email || '').trim().toLowerCase();
    const [verifiedEmail, setVerifiedEmail] = useState(pageProps?.verifiedEmail || null);
    const [otpOpen, setOtpOpen] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpError, setOtpError] = useState(null);
    const [otpInfo, setOtpInfo] = useState(null);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [otpSentFor, setOtpSentFor] = useState(null);
    const [otpResendIn, setOtpResendIn] = useState(0);

    useEffect(() => {
        if (otpResendIn <= 0) return;
        const timer = setTimeout(() => setOtpResendIn(s => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [otpResendIn]);

    const apiErrorMessage = (err, fallback) => {
        const errors = err?.response?.data?.errors;
        return (errors && Object.values(errors).flat()[0]) || err?.response?.data?.message || fallback;
    };

    const sendEmailCode = async (isResend = false) => {
        setOtpSending(true);
        setOtpError(null);
        setOtpInfo(null);
        try {
            const res = await window.axios.post(route('register.public.email.send'), { email: normalizedEmail });
            setOtpSentFor(normalizedEmail);
            setOtpResendIn(res.data?.resend_after_seconds ?? 60);
            setOtpCode('');
            setOtpInfo(isResend ? 'A new code has been sent to your email.' : null);
            setOtpOpen(true);
        } catch (err) {
            const message = apiErrorMessage(err, 'We could not send the code. Please try again.');
            if (isResend) {
                setOtpError(message);
            } else {
                Swal.fire({ title: 'Email Verification', text: message, icon: 'warning', confirmButtonColor: '#25449B' });
            }
        } finally {
            setOtpSending(false);
        }
    };

    const verifyEmailCode = async () => {
        if (!/^\d{6}$/.test(otpCode)) {
            setOtpError('Enter the 6-digit code from your email.');
            return;
        }
        setOtpVerifying(true);
        setOtpError(null);
        try {
            await window.axios.post(route('register.public.email.verify'), { email: normalizedEmail, code: otpCode });
            setVerifiedEmail(normalizedEmail);
            setOtpOpen(false);
            handleNext();
        } catch (err) {
            setOtpError(apiErrorMessage(err, 'We could not verify the code. Please try again.'));
        } finally {
            setOtpVerifying(false);
        }
    };

    const continueFromApplicant = () => {
        if (verifiedEmail && verifiedEmail === normalizedEmail) {
            handleNext();
            return;
        }
        // A code for this same email is still fresh: just reopen the modal.
        if (otpSentFor === normalizedEmail && otpResendIn > 0) {
            setOtpError(null);
            setOtpOpen(true);
            return;
        }
        sendEmailCode();
    };

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
                confirmButtonColor: '#25449B'
            });
            return;
        }

        if (!agreed) {
            Swal.fire({
                title: 'Agreement Required',
                text: 'Please go back to Step 1 and agree to the Terms & Conditions and Data Privacy Consent before submitting.',
                icon: 'warning',
                confirmButtonColor: '#25449B'
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
                    confirmButtonColor: '#25449B'
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
                    <div className="pa-side-top">
                        <div className="pa-side-badge">
                            <ShieldCheck size={13} strokeWidth={2.4} />
                            Nasugbu, Batangas
                        </div>
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
                        <p className="pa-side-note">&copy; 2026 TRIVORA Fleet Operations &bull; Nasugbu, Batangas</p>
                    </div>
                </aside>
            )}

            {/* ── SPLIT RIGHT: active step content ── */}
            <main className="pa-content">
                {step < 5 && (
                    <div className="pa-content-topbar">
                        <Link href="/" className="pa-topbar-logo">
                            <img src="/images/logo.png" alt="TRIVORA" className="pa-topbar-logo-img" />
                        </Link>
                        <Link href="/" className="pa-back-link" onClick={() => clearSavedDraft()}>
                            <ArrowLeft size={16} strokeWidth={2.4} />
                            Back to Home
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
                                <Link href={route('login')} className="pa-btn-ghost">
                                    <LogIn size={15} strokeWidth={2.2} />
                                    Log In
                                </Link>
                                <button
                                    className="pa-btn-primary"
                                    onClick={handleNext}
                                    disabled={!scrolledTerms || !agreed}
                                    style={{ opacity: (!scrolledTerms || !agreed) ? 0.45 : 1, cursor: (!scrolledTerms || !agreed) ? 'not-allowed' : 'pointer' }}
                                >
                                    Agree to Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: APPLICANT (TRICYCLE OWNER) INFO ── */}
                    {step === 2 && (
                        <div className="pa-card">
                            <div className="pa-card-top">
                                <div className="pa-card-top-text">
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
                                        <input
                                            className={`pa-input${fieldError('contact', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={11}
                                            placeholder="09171234567"
                                            autoComplete="tel"
                                            value={data.contact || ''}
                                            onChange={e => setData('contact', sanitizeMobileNumber(e.target.value))}
                                            onKeyDown={handleMobileKeyDown}
                                            onPaste={e => handleMobilePaste(e, clean => setData('contact', clean))}
                                            onBlur={() => markTouched('contact')}
                                        />
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
                                            type="email" placeholder="e.g. juan@example.com" autoComplete="email"
                                            value={data.email || ''} onChange={e => setData('email', e.target.value)}
                                            onBlur={() => markTouched('email')} />
                                    </div>
                                </Field>
                                <div>
                                    <Field label="Account Password" error={fieldError('password', applicantInfoErrors)}>
                                        <div className="pa-input-wrap">
                                            <span className="pa-input-wrap-icon"><Lock size={15} strokeWidth={2} /></span>
                                            <input className={`pa-input pa-input--password${fieldError('password', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                                type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" autoComplete="new-password"
                                                value={data.password || ''} onChange={e => setData('password', e.target.value)}
                                                onBlur={() => markTouched('password')} />
                                            <button type="button" className="pa-input-toggle" tabIndex={-1}
                                                onClick={() => setShowPassword(v => !v)}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                                {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                            </button>
                                        </div>
                                    </Field>
                                    <PasswordStrengthMeter password={data.password} />
                                </div>
                                <Field label="Confirm Password" error={fieldError('password_confirmation', applicantInfoErrors)}>
                                    <div className="pa-input-wrap">
                                        <span className="pa-input-wrap-icon"><Lock size={15} strokeWidth={2} /></span>
                                        <input className={`pa-input pa-input--password${fieldError('password_confirmation', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                            type={showPasswordConfirmation ? 'text' : 'password'} placeholder="Re-enter your password" autoComplete="new-password"
                                            value={data.password_confirmation || ''} onChange={e => setData('password_confirmation', e.target.value)}
                                            onBlur={() => markTouched('password_confirmation')} />
                                        <button type="button" className="pa-input-toggle" tabIndex={-1}
                                            onClick={() => setShowPasswordConfirmation(v => !v)}
                                            aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}>
                                            {showPasswordConfirmation ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                        </button>
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
                                                    type="tel"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={11}
                                                    placeholder="09171234567"
                                                    autoComplete="tel"
                                                    value={data.driver_contact || ''}
                                                    onChange={e => setData('driver_contact', sanitizeMobileNumber(e.target.value))}
                                                    onKeyDown={handleMobileKeyDown}
                                                    onPaste={e => handleMobilePaste(e, clean => setData('driver_contact', clean))}
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
                                        <Field label="Email Address" error={fieldError('driver_email', applicantInfoErrors)}>
                                            <div className="pa-input-wrap">
                                                <span className="pa-input-wrap-icon"><Mail size={15} strokeWidth={2} /></span>
                                                <input className={`pa-input${fieldError('driver_email', applicantInfoErrors) ? ' pa-input-error' : ''}`}
                                                    type="email" placeholder="e.g. pedro@example.com" autoComplete="off"
                                                    value={data.driver_email || ''} onChange={e => setData('driver_email', e.target.value)}
                                                    onBlur={() => markTouched('driver_email')} />
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
                                        continueFromApplicant();
                                    }}
                                    disabled={otpSending}
                                    style={{ opacity: isStep2Valid && !otpSending ? 1 : 0.55, cursor: 'pointer' }}
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
                                    <div>
                                        <h2 className="pa-card-title">Vehicle Specs</h2>
                                        <p className="pa-card-sub">Tricycle Registration & Unit Details</p>
                                    </div>
                                </div>
                            </div>

                            <VehicleSpecsFields
                                data={data}
                                setData={(f, v) => {
                                    if (typeof f === 'object' && f !== null) {
                                        setData(current => ({ ...current, ...f }));
                                    } else {
                                        setData(f, v);
                                    }
                                }}
                                fieldError={f => fieldError(f, vehicleInfoErrors)}
                                markTouched={markTouched}
                            />

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    Back
                                </button>
                                <button
                                    className="pa-btn-primary"
                                    onClick={() => {
                                        if (!isStep3Valid) {
                                            setTouched(t => ({
                                                ...t,
                                                plate_number: true,
                                                make_model: true,
                                                year_model: true,
                                                body_color: true,
                                                body_color_other: true,
                                                body_type: true,
                                                body_type_other: true,
                                                engine_number: true,
                                                chassis_number: true,
                                                or_number: true,
                                                cr_number: true,
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
                        <div className="pa-card" style={{ maxWidth: 880 }}>
                            <div className="pa-card-top">
                                <div className="pa-card-top-text">
                                    <div>
                                        <h2 className="pa-card-title">Requirements</h2>
                                        <p className="pa-card-sub">Take a clear photo or upload scanned copies of each document</p>
                                    </div>
                                </div>
                            </div>

                            {/* Live Requirements Progress Card */}
                            <div className="pa-req-progress-card">
                                <div className="pa-req-progress-info">
                                    <div>
                                        <span className="pa-req-progress-title">Mandatory Requirements</span>
                                        <span className="pa-req-progress-sub">
                                            {uploadedRequiredCount} of {requiredDocs.length} mandatory documents attached
                                        </span>
                                    </div>
                                    <div className="pa-req-progress-badge">
                                        {hasAllRequired ? (
                                            <span className="pa-req-badge pa-req-badge--ready">
                                                <Check size={13} strokeWidth={3} /> Ready to Submit
                                            </span>
                                        ) : (
                                            <span className="pa-req-badge pa-req-badge--pending">
                                                {missingRequiredDocs.length} Remaining
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="pa-req-progress-bar">
                                    <div
                                        className="pa-req-progress-fill"
                                        style={{ width: `${requiredDocs.length > 0 ? (uploadedRequiredCount / requiredDocs.length) * 100 : 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Section 1: Mandatory Requirements */}
                            <div className="pa-docs-section">
                                <div className="pa-docs-section-header">
                                    <div className="pa-docs-section-title">
                                        <ShieldCheck size={16} strokeWidth={2.4} className="pa-docs-section-icon" />
                                        <span>Mandatory Documents</span>
                                        <span className="pa-docs-count-pill">{requiredDocs.length} required</span>
                                    </div>
                                    <p className="pa-docs-section-sub">Required by Nasugbu TMO for official permit evaluation</p>
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
                            </div>

                            {/* Section 2: Conditional / Supporting Documents */}
                            {applicableConditionalDocs.length > 0 && (
                                <div className="pa-docs-section" style={{ marginTop: 24 }}>
                                    <div className="pa-docs-section-header">
                                        <div className="pa-docs-section-title">
                                            <FileText size={16} strokeWidth={2.4} className="pa-docs-section-icon" />
                                            <span>Supporting Documents</span>
                                            <span className="pa-docs-count-pill pa-docs-count-pill--opt">Optional</span>
                                        </div>
                                        <p className="pa-docs-section-sub">Attach only if applicable to your application type or vehicle status</p>
                                    </div>
                                    <div className="pa-docs-grid">
                                        {applicableConditionalDocs.map(doc => (
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
                                </div>
                            )}

                            {/* Physical Inspection Notice */}
                            <div className="pa-notice">
                                <Info size={18} className="pa-notice-icon" />
                                <div>
                                    <strong className="pa-notice-title">Paalala sa Physical Inspection</strong>
                                    <p className="pa-notice-text">
                                        Bago isumite ang mga dokumento, siguraduhing maayos ang ilaw, busina,
                                        side mirrors, baterya, at plaka (LTO/GSO) para sa nakatakdang physical inspection ng TMO.
                                    </p>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="pa-actions">
                                <button type="button" className="pa-btn-ghost" onClick={back}>
                                    <ArrowLeft size={16} strokeWidth={2.2} />
                                    Back
                                </button>
                                <button
                                    type="button"
                                    className="pa-btn-submit"
                                    onClick={submitApplication}
                                    disabled={isSubmitting}
                                    style={{ opacity: isSubmitting ? .8 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={16} strokeWidth={2.4} style={{ animation: 'paSpin .8s linear infinite' }} />
                                    ) : (
                                        <ShieldCheck size={18} strokeWidth={2.4} />
                                    )}
                                    <span>{isSubmitting ? 'Submitting Application...' : 'Submit Application'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 5: SUCCESS ── */}
                    {step === 5 && (
                        <div className="pa-card pa-card--elevated pa-success">
                            <div className="pa-success-icon">
                                <CheckCircle2 size={36} strokeWidth={2.2} />
                            </div>

                            <h2 className="pa-success-title">Application Submitted</h2>
                            <p className="pa-success-lead">
                                Your documents have been received. Your application is now waiting for the TMO's requirements review.
                            </p>

                            <div className="pa-tracking-box">
                                <div>
                                    <p className="pa-tracking-eyebrow">Application Number</p>
                                    <p className="pa-tracking-number">{getReferenceNo()}</p>
                                </div>
                                <button
                                    type="button"
                                    className={`pa-copy-btn${copied ? ' is-copied' : ''}`}
                                    onClick={() => {
                                        try {
                                            navigator.clipboard.writeText(getReferenceNo()).then(() => {
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }).catch(() => {});
                                        } catch {}
                                    }}
                                >
                                    {copied ? <Check size={14} strokeWidth={2.6} /> : <Copy size={14} strokeWidth={2.2} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <p className="pa-tracking-hint">Keep your application number for any follow-up with the TMO.</p>

                            <div className="pa-next">
                                <p className="pa-next-title">What happens next</p>
                                <ol className="pa-next-list">
                                    {NEXT_STEPS.map((nextStep, index) => (
                                        <li key={nextStep.name} className={`pa-next-item${index === 0 ? ' is-current' : ''}`}>
                                            <span className="pa-next-dot">{index + 1}</span>
                                            <div className="pa-next-body">
                                                <div className="pa-next-head">
                                                    <span className="pa-next-name">{nextStep.name}</span>
                                                    {index === 0 && <span className="pa-next-badge">In progress</span>}
                                                </div>
                                                <p className="pa-next-desc">{nextStep.desc}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <div className="pa-success-note">
                                <Info size={15} strokeWidth={2.2} />
                                <span>
                                    {pageProps?.auth?.user?.email
                                        ? <>You're signed in as <strong>{pageProps.auth.user.email}</strong>. </>
                                        : null}
                                    Track this application anytime in the Driver Portal.
                                </span>
                            </div>

                            <div className="pa-success-actions">
                                <button
                                    type="button"
                                    className="pa-btn-ghost"
                                    onClick={() => {
                                        clearSavedDraft();
                                        window.location.href = '/register-mtop';
                                    }}
                                >
                                    New Application
                                </button>
                                <Link href="/operator/dashboard" className="pa-btn-primary">
                                    Go to Driver Portal
                                    <ArrowRight size={16} strokeWidth={2.4} />
                                </Link>
                            </div>
                        </div>
                    )}

                </div>
                </div>
            </main>

            {/* Sending-code modal (shown while the first code is being sent) */}
            {otpSending && !otpOpen && (
                <div className="pa-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pa-otp-sending-title" aria-busy="true">
                    <div className="pa-modal">
                        <div className="pa-modal-icon">
                            <Loader2 size={22} strokeWidth={2.4} style={{ animation: 'paSpin .8s linear infinite' }} />
                        </div>
                        <h3 id="pa-otp-sending-title" className="pa-modal-title">Sending verification code</h3>
                        <p className="pa-modal-sub">
                            Please wait while we send a 6-digit code to <strong>{normalizedEmail}</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Email verification modal (Applicant Information → Continue) */}
            {otpOpen && (
                <div className="pa-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pa-otp-title">
                    <div className="pa-modal">
                        <button type="button" className="pa-modal-close" onClick={() => setOtpOpen(false)} aria-label="Close">
                            <X size={18} strokeWidth={2.2} />
                        </button>
                        <div className="pa-modal-icon">
                            <Mail size={22} strokeWidth={2.2} />
                        </div>
                        <h3 id="pa-otp-title" className="pa-modal-title">Verify your email</h3>
                        <p className="pa-modal-sub">
                            Enter the 6-digit code we sent to <strong>{normalizedEmail}</strong>.
                        </p>

                        {otpInfo && !otpError && <p className="pa-modal-info">{otpInfo}</p>}

                        <input
                            className={`pa-input pa-otp-input${otpError ? ' pa-input-error' : ''}`}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="000000"
                            value={otpCode}
                            onChange={e => {
                                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                if (otpError) setOtpError(null);
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') verifyEmailCode(); }}
                            autoFocus
                        />
                        {otpError && <p className="pa-field-error">{otpError}</p>}

                        <button
                            type="button"
                            className="pa-btn-primary pa-modal-btn"
                            onClick={verifyEmailCode}
                            disabled={otpVerifying || otpCode.length !== 6}
                        >
                            {otpVerifying
                                ? <><Loader2 size={16} strokeWidth={2.4} style={{ animation: 'paSpin .8s linear infinite' }} /> Verifying...</>
                                : 'Verify & Continue'}
                        </button>

                        <p className="pa-modal-foot">
                            Didn't get the code?{' '}
                            {otpResendIn > 0 ? (
                                <span>Resend in {otpResendIn}s</span>
                            ) : (
                                <button type="button" className="pa-link-btn" onClick={() => sendEmailCode(true)} disabled={otpSending}>
                                    {otpSending ? 'Sending...' : 'Resend code'}
                                </button>
                            )}
                        </p>
                        <button type="button" className="pa-link-btn pa-modal-change" onClick={() => setOtpOpen(false)}>
                            Change email address
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
