import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    User, MapPin, Bike, Send, Smartphone, CheckCircle2, ClipboardList,
    RefreshCw, Check, X, MessageSquare, Clock, AlertTriangle, Eye, Gauge,
    ChevronLeft, FileText, Loader2, ShieldCheck, Copy, Pencil, CalendarDays,
} from 'lucide-react';
import { Modal, Button, Textarea } from '@/Components/TMO';
import { REGISTRATION_DOCUMENTS } from '@/data/registrationRequirements';

// Shared soft, layered shadow token — same elevation language used across the TMO panel (Dashboard.jsx,
// Index.jsx, DocumentQueue.jsx), so this page reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function DocumentReview({ application }) {
    const appData = application || {
        operator: 'Juan Dela Cruz',
        id: 'NSB-26-8812',
        make: 'Kawasaki Barako 175',
        engine_number: 'ENG-KAW-12345',
        chassis_number: 'CHAS-KAW-98765',
        plate: 'NSB-2024-ABC',
        contact: '09171234567',
        barangay: 'Poblacion 1',
        docStatuses: {},
        rejectionReasons: {},
    };

    const [isProcessing, setIsProcessing] = useState(false);
    const [docStatuses, setDocStatuses] = useState(appData.docStatuses || {});
    const [rejectionReasons, setRejectionReasons] = useState(appData.rejectionReasons || {});
    const [activePreviewDoc, setActivePreviewDoc] = useState(null);
    const [activeSubDocIndex, setActiveSubDocIndex] = useState(0);
    const [copiedField, setCopiedField] = useState(null);

    const handleCopy = (fieldKey, value) => {
        if (!value || value === '—' || value === 'N/A') return;
        navigator.clipboard?.writeText(value);
        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 1800);
    };

    // Rejection modal state
    const [pendingRejectId, setPendingRejectId] = useState(null);
    const [draftReason, setDraftReason] = useState('');

    // Background refresh of the record under review: a decision, payment or status change made by
    // another officer elsewhere updates this page without a manual reload. Paused while this
    // officer is working through a decision; the hook also catches an open SweetAlert / in-flight
    // request on its own, and never disturbs the rejection-reason draft above.
    useBackgroundRefresh(['application'], { paused: isProcessing });

    // Ensure all 10 registration vehicle properties have values
    const vehicleData = {
        make: appData?.make || 'Kawasaki Barako 175',
        engine_number: appData?.engine_number || '—',
        chassis_number: appData?.chassis_number || '—',
        plate: appData?.plate || '—',
        year_model: appData?.year_model || '—',
        body_color: appData?.body_color || '—',
        body_type: appData?.body_type || '—',
        or_number: appData?.or_number || '—',
        cr_number: appData?.cr_number || '—',
    };

    // Same canonical list Public Registration and the Driver Portal wizard use — including
    // Prangkisa, so a renewal application's Prangkisa upload is visible here too (as a
    // conditional/"Additional" document; TMO document review isn't application_type-aware, and
    // Prangkisa is never uploaded for a 'new' unit registration in the first place).
    const requirements = REGISTRATION_DOCUMENTS.map(d => ({ id: d.id, label: d.label, mandatory: d.required }));

    const handleApprove = (id) => {
        setDocStatuses(prev => {
            if (prev[id] === 'approved') {
                const next = { ...prev };
                delete next[id];
                return next;
            }
            return { ...prev, [id]: 'approved' };
        });
        setRejectionReasons(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const handleClearStatus = (id) => {
        setDocStatuses(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setRejectionReasons(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
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

    const mandatoryRequirements = requirements.filter(r => r.mandatory);
    const optionalRequirements = requirements.filter(r => !r.mandatory);
    // "Additional Documents" only ever shows conditional requirements the driver actually
    // uploaded a file for — never a placeholder row for one that was legitimately skipped.
    const uploadedOptionalRequirements = optionalRequirements.filter(
        r => (appData.documents || []).some(d => d.category === r.id)
    );

    const anyRejected        = Object.values(docStatuses).some(s => s === 'rejected');
    // Approval is gated on the ACTUAL document records the backend sent: every required
    // document must exist (properly uploaded) and be approved, and so must every
    // additional/resubmitted file the driver actually uploaded. Merely having an
    // "Additional Documents" record never enables the button on its own.
    const allMandatoryApproved = mandatoryRequirements.every(
        r => docStatuses[r.id] === 'approved'
            && (appData.documents || []).some(d => d.category === r.id)
    );
    const allAdditionalApproved = uploadedOptionalRequirements.every(
        r => docStatuses[r.id] === 'approved'
    );
    const canSchedule        = allMandatoryApproved && allAdditionalApproved && !anyRejected;

    const totalRequirements = requirements.length;
    const approvedCount = requirements.filter(r => docStatuses[r.id] === 'approved').length;
    const rejectedCount = requirements.filter(r => docStatuses[r.id] === 'rejected').length;
    const pendingCount = totalRequirements - approvedCount - rejectedCount;

    const mandatoryApprovedCount = mandatoryRequirements.filter(r => docStatuses[r.id] === 'approved').length;
    const mandatoryPct = mandatoryRequirements.length > 0 ? Math.round((mandatoryApprovedCount / mandatoryRequirements.length) * 100) : 0;

    const operatorInitials = (appData.operator || 'OP')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handleFinalAction = (type) => {
        const isApprove = type === 'approve';

        Swal.fire({
            title: isApprove ? 'Confirm Approval' : 'Confirm Rejection',
            html: isApprove
                ? `Are you sure you want to approve requirements for <b>${appData.reference || appData.id}</b>? The unit will be endorsed for Physical Tricycle Inspection.`
                : `Are you sure you want to reject <b>${appData.reference || appData.id}</b>? The operator will be notified to re-upload the rejected documents.`,
            icon: isApprove ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isApprove ? '#059669' : '#DC2626',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: isApprove ? 'Yes, Approve & Proceed to Inspection' : 'Yes, Send Rejection',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);

                router.post(`/tmo/review/docs/${appData.id}`, {
                    action: isApprove ? 'approve' : 'reject',
                    docStatuses: docStatuses,
                    rejectionReasons: rejectionReasons,
                }, {
                    onFinish: () => setIsProcessing(false),
                    onSuccess: () => {
                        Swal.fire({
                            title: isApprove ? 'Documents Approved!' : 'Notice Sent',
                            text: isApprove
                                ? 'Application moved to Physical Inspection. Applicant notified.'
                                : 'Notice sent. Applicant must re-upload corrected files.',
                            icon: 'success',
                            confirmButtonColor: '#1D2542',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    }
                });
            }
        });
    };

    const pendingDoc = requirements.find(r => r.id === pendingRejectId);
    const previewCategoryDocs = appData.documents?.filter(d => d.category === activePreviewDoc) || [];
    const currentSubDoc = previewCategoryDocs[activeSubDocIndex];
    const previewDocLabel = requirements.find(r => r.id === activePreviewDoc)?.label || 'Document';

    return (
        <TrivoraLayout title="Document Review" role="TMO Officer">
            <Head title={`Review: ${appData.reference || appData.id} | TRIVORA`} />

            {/* ── File Preview Modal ── */}
            <Modal
                show={activePreviewDoc !== null}
                onClose={() => setActivePreviewDoc(null)}
                maxWidth="4xl"
                title={`${previewDocLabel}${previewCategoryDocs.length > 1 ? ` (${activeSubDocIndex + 1} of ${previewCategoryDocs.length})` : ''}`}
            >

                {previewCategoryDocs.length > 1 && (
                    <div className="mb-4 flex gap-2 overflow-x-auto border-b border-tmo-border pb-4">
                        {previewCategoryDocs.map((doc, idx) => (
                            <button
                                key={doc.id}
                                onClick={() => setActiveSubDocIndex(idx)}
                                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                    idx === activeSubDocIndex
                                        ? 'border border-tmo-primary bg-tmo-primarySoft text-tmo-primary'
                                        : 'border border-tmo-border bg-white text-tmo-muted hover:bg-tmo-bg'
                                }`}
                            >
                                {doc.file_name.length > 25 ? doc.file_name.substring(0, 22) + '...' : doc.file_name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-center rounded-lg bg-tmo-bg p-4">
                    {currentSubDoc ? (
                        currentSubDoc.mime_type?.startsWith('image/') ? (
                            <img
                                src={currentSubDoc.file_path}
                                alt={currentSubDoc.file_name}
                                className="max-h-[60vh] max-w-full rounded-lg border border-tmo-border object-contain"
                            />
                        ) : (
                            <iframe
                                src={currentSubDoc.file_path}
                                title={currentSubDoc.file_name}
                                className="h-[60vh] w-full rounded-lg border-none bg-white"
                            />
                        )
                    ) : (
                        <p className="py-10 text-sm text-tmo-subtle">No file to display.</p>
                    )}
                </div>
            </Modal>

            {/* ── Rejection Reason Modal ── */}
            <Modal
                show={pendingRejectId !== null}
                onClose={cancelRejection}
                title="Reason for Correction"
                description="Explain why this document needs correction"
                footer={
                    <>
                        <Button variant="secondary" onClick={cancelRejection}>Cancel</Button>
                        <Button variant="dangerSolid" onClick={confirmRejection}>Confirm Rejection</Button>
                    </>
                }
            >
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-700">
                    {pendingDoc?.label}
                </p>
                <Textarea
                    rows={3}
                    placeholder="e.g., Blurry photo, document expired, wrong file uploaded…"
                    value={draftReason}
                    onChange={e => setDraftReason(e.target.value)}
                    autoFocus
                />
            </Modal>

            {/* ══════════════════════════════════════════════════════════════
                1. TOP NAVIGATION
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 flex items-center">
                <Link
                    href="/tmo/docs"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                    <span>Back to Document Review</span>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. CLEAN INTEGRATED HEADER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 border-b border-slate-200/80 pb-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Document Review</span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                    {appData.reference || appData.id}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Submitted by <strong className="font-semibold text-slate-700">{appData.operator}</strong>{appData.barangay ? ` · ${appData.barangay}` : ''}
                </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. BALANCED WORKSTATION (Left: Documents | Right: Sticky Action)
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

                {/* ── LEFT COLUMN: DOCUMENT WORKSPACE (8 cols) ── */}
                <div className="space-y-6 lg:col-span-8">

                    {/* Section 1: Required Documents */}
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <ClipboardList size={15} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Required Documents</h2>
                                    <p className="text-[11px] text-slate-500">Must all be approved before scheduling physical inspection</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-slate-500">
                                {mandatoryApprovedCount} of {mandatoryRequirements.length} Checked
                            </span>
                        </div>

                        <div className="p-4 sm:p-5 space-y-3">
                            {mandatoryRequirements.map((doc) => (
                                <DocumentRowItem
                                    key={doc.id}
                                    doc={doc}
                                    status={docStatuses[doc.id]}
                                    categoryDocs={appData.documents?.filter(d => d.category === doc.id) || []}
                                    rejectionReason={rejectionReasons[doc.id]}
                                    onApprove={() => handleApprove(doc.id)}
                                    onReject={() => openRejectModal(doc.id)}
                                    onClear={() => handleClearStatus(doc.id)}
                                    onPreview={() => { setActivePreviewDoc(doc.id); setActiveSubDocIndex(0); }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Section 2: Additional Documents — only rendered when the driver actually
                        uploaded at least one conditional file; never an empty placeholder. */}
                    {uploadedOptionalRequirements.length > 0 && (
                        <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                        <FileText size={15} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Additional Documents</h2>
                                        <p className="text-[11px] text-slate-500">Conditional files (Delivery Receipts, Authorization Letters)</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-slate-400">
                                    {uploadedOptionalRequirements.length} Uploaded
                                </span>
                            </div>

                            <div className="p-4 sm:p-5 space-y-3">
                                {uploadedOptionalRequirements.map((doc) => (
                                    <DocumentRowItem
                                        key={doc.id}
                                        doc={doc}
                                        status={docStatuses[doc.id]}
                                        categoryDocs={appData.documents?.filter(d => d.category === doc.id) || []}
                                        rejectionReason={rejectionReasons[doc.id]}
                                        onApprove={() => handleApprove(doc.id)}
                                        onReject={() => openRejectModal(doc.id)}
                                        onClear={() => handleClearStatus(doc.id)}
                                        onPreview={() => { setActivePreviewDoc(doc.id); setActiveSubDocIndex(0); }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* ── RIGHT COLUMN: STICKY CONTROL SIDEBAR (4 cols) ── */}
                <div className="space-y-5 lg:col-span-4 lg:sticky lg:top-6 self-start">

                    {/* Box 1: Sticky Review Decision Card */}
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Review Decision</h3>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                canSchedule
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : anyRejected
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                                {canSchedule ? 'Ready to Approve' : anyRejected ? 'Needs Correction' : 'In Progress'}
                            </span>
                        </div>

                        {/* Progress Meter */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                                <span className="text-slate-600">Required Documents</span>
                                <span className="tabular-nums text-slate-900 font-bold">{mandatoryApprovedCount} of {mandatoryRequirements.length}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full transition-all duration-300 rounded-full ${
                                        canSchedule ? 'bg-emerald-500' : anyRejected ? 'bg-amber-500' : 'bg-slate-700'
                                    }`}
                                    style={{ width: `${mandatoryPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Decision Status Prompt & Primary Action Button */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            {canSchedule ? (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                                        <div className="flex items-center gap-1.5 font-bold mb-1">
                                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                            <span>All Required Documents Cleared</span>
                                        </div>
                                        <p className="text-[11.5px] leading-relaxed text-emerald-700">
                                            All required documents are verified. Approve to ask the applicant to bring their original documents for physical inspection.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleFinalAction('approve')}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2.5 text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} strokeWidth={2.2} />}
                                        <span>Approve Documents &amp; Proceed</span>
                                    </button>
                                </div>
                            ) : anyRejected ? (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-800">
                                        <div className="flex items-center gap-1.5 font-bold mb-1">
                                            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                                            <span>Action Required</span>
                                        </div>
                                        <p className="text-[11.5px] leading-relaxed text-rose-700">
                                            {rejectedCount} document(s) need correction. Send a notice so the applicant can upload the corrected files.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleFinalAction('reject')}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2.2} />}
                                        <span>Send Correction Notice</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                        <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-800">
                                            <Clock size={14} className="text-amber-500 shrink-0" />
                                            <span>Review In Progress</span>
                                        </div>
                                        <p className="text-[11.5px] leading-relaxed text-slate-500">
                                            Check each required document on the left. Once all required documents are checked, the approval button will activate.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled
                                        className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                                    >
                                        <span>Check All Required Files to Continue</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Box 2: Applicant Details */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <User size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Applicant Details</h3>
                            </div>
                        </div>

                        {/* Tricycle Owner Summary — always the primary applicant/person */}
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-xs font-bold text-white shadow-2xs">
                                {operatorInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs sm:text-sm font-bold text-slate-900">{appData.operator}</p>
                                <p className="truncate text-xs text-slate-500 font-medium">Tricycle Owner</p>
                            </div>
                        </div>

                        {/* Owner Birthday, Contact & Location */}
                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <CalendarDays size={13} className="shrink-0" />
                                    Birthday
                                </span>
                                <span className="font-semibold text-slate-800">{appData.owner?.birthday || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <Smartphone size={13} className="shrink-0" />
                                    Contact
                                </span>
                                <span className="font-semibold text-slate-800">{appData.contact || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <MapPin size={13} className="shrink-0" />
                                    Barangay
                                </span>
                                <span className="font-semibold text-slate-800 truncate max-w-[180px] text-right">{appData.barangay}</span>
                            </div>
                        </div>

                        {/* Tricycle Driver — visually distinct; only a separate person when ownerIsDriver is false */}
                        <div className="mt-3.5 rounded-xl border border-dashed border-indigo-300/70 bg-indigo-50/50 p-3.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-600">Tricycle Driver</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${appData.ownerIsDriver ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {appData.ownerIsDriver ? 'Same as Owner' : 'Different Person'}
                                </span>
                            </div>
                            {appData.ownerIsDriver ? (
                                <p className="mt-2 text-xs text-slate-600">
                                    The Tricycle Owner drives their own unit — no separate driver on file.
                                </p>
                            ) : appData.tricycleDriver ? (
                                <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Name</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.full_name || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Birthday</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.birthday || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Mobile</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.contact_number || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span className="font-medium text-slate-400">Barangay</span>
                                        <span className="font-semibold text-slate-800">{appData.tricycleDriver.barangay || '—'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-2 text-xs text-slate-500">No separate driver provided.</p>
                            )}
                        </div>
                    </div>

                    {/* Box 3: Tricycle Registration & Unit Details */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 leading-snug">Tricycle Registration</h3>
                                    <p className="text-[11px] text-slate-500 leading-tight">Declared Unit Specifications</p>
                                </div>
                            </div>
                        </div>

                        {/* Subgroup A: Vehicle Specifications */}
                        <div className="space-y-2.5 text-xs">
                            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Vehicle Specifications
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">LTO Plate Number</span>
                                <span className="font-mono font-bold text-slate-900">
                                    {vehicleData.plate}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Make &amp; Model</span>
                                <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]">
                                    {vehicleData.make}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Year Model</span>
                                <span className="font-semibold text-slate-800">
                                    {vehicleData.year_model}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Body Color</span>
                                <span className="font-semibold text-slate-800">
                                    {vehicleData.body_color}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Body Type</span>
                                <span className="font-semibold text-slate-800">
                                    {vehicleData.body_type}
                                </span>
                            </div>
                        </div>

                        {/* Subgroup B: LTO Official Registration Numbers */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5 text-xs">
                            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                LTO Official Numbers
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Engine Number</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-slate-800 font-semibold text-xs">
                                        {vehicleData.engine_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy('engine', vehicleData.engine_number)}
                                        title="Copy Engine Number"
                                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                    >
                                        {copiedField === 'engine' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Chassis Number</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-slate-800 font-semibold text-xs">
                                        {vehicleData.chassis_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy('chassis', vehicleData.chassis_number)}
                                        title="Copy Chassis Number"
                                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                    >
                                        {copiedField === 'chassis' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">LTO OR Number</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-slate-800 font-semibold text-xs">
                                        {vehicleData.or_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy('or', vehicleData.or_number)}
                                        title="Copy OR Number"
                                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                    >
                                        {copiedField === 'or' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">LTO CR Number</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-slate-800 font-semibold text-xs">
                                        {vehicleData.cr_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy('cr', vehicleData.cr_number)}
                                        title="Copy CR Number"
                                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                    >
                                        {copiedField === 'cr' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   DOCUMENT ROW ITEM SUBCOMPONENT
───────────────────────────────────────────────────────────────────────── */
function DocumentRowItem({
    doc,
    status,
    categoryDocs,
    rejectionReason,
    onApprove,
    onReject,
    onClear,
    onPreview,
}) {
    const isApproved = status === 'approved';
    const isRejected = status === 'rejected';
    const hasFiles = categoryDocs.length > 0;

    return (
        <div className={`rounded-xl border transition-all p-4 ${
            isApproved
                ? 'border-emerald-200/90 bg-emerald-50/25 hover:bg-emerald-50/40 shadow-2xs'
                : isRejected
                ? 'border-rose-200 bg-rose-50/25 hover:bg-rose-50/40 shadow-2xs'
                : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
        }`}>
            {/* Top Row: Icon + Details & File Link + Action Buttons */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isApproved
                            ? 'bg-gradient-to-br from-emerald-500/[0.16] to-emerald-500/[0.03] text-emerald-700'
                            : isRejected
                            ? 'bg-gradient-to-br from-rose-500/[0.16] to-rose-500/[0.03] text-rose-700'
                            : 'bg-gradient-to-br from-slate-500/[0.10] to-slate-500/[0.02] text-slate-500'
                    }`}>
                        {isApproved ? (
                            <CheckCircle2 size={18} strokeWidth={2.2} />
                        ) : isRejected ? (
                            <AlertTriangle size={18} strokeWidth={2.2} />
                        ) : (
                            <FileText size={18} strokeWidth={2} />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            {doc.label}
                        </p>

                        {/* File preview link */}
                        <div className="mt-1 flex items-center gap-2 text-xs">
                            {hasFiles ? (
                                <button
                                    type="button"
                                    onClick={onPreview}
                                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                >
                                    <Eye size={12} strokeWidth={2.2} />
                                    <span>{categoryDocs.length > 1 ? `View ${categoryDocs.length} files` : 'View file'}</span>
                                </button>
                            ) : (
                                <span className="text-[11px] text-slate-400">
                                    No file uploaded
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Action buttons - Desktop (sm:flex) */}
                <div className="hidden sm:flex shrink-0 items-center gap-1.5 pt-0.5">
                    <button
                        type="button"
                        onClick={onReject}
                        title={isRejected ? 'Correction requested (Click to edit)' : 'Flag for correction'}
                        className={`inline-flex h-8 sm:h-9 items-center gap-1 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all cursor-pointer ${
                            isRejected
                                ? 'bg-rose-600 text-white shadow-2xs hover:bg-rose-700'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                    >
                        <X size={14} strokeWidth={2.5} />
                        <span>Need Fix</span>
                    </button>

                    <button
                        type="button"
                        onClick={onApprove}
                        title={isApproved ? 'Approved (Click to clear)' : 'Approve document'}
                        className={`inline-flex h-8 sm:h-9 items-center gap-1 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all cursor-pointer ${
                            isApproved
                                ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                    >
                        <Check size={14} strokeWidth={2.5} />
                        <span>Approve</span>
                    </button>
                </div>
            </div>

            {/* Mobile Action Buttons: Full-width 2 buttons in one row (sm:hidden) */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 sm:hidden">
                <button
                    type="button"
                    onClick={onReject}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                        isRejected
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                    }`}
                >
                    <X size={15} strokeWidth={2.5} />
                    <span>Need Fix</span>
                </button>

                <button
                    type="button"
                    onClick={onApprove}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                        isApproved
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                    }`}
                >
                    <Check size={15} strokeWidth={2.5} />
                    <span>Approve</span>
                </button>
            </div>

            {/* Dedicated Full-Width Correction Note Block */}
            {isRejected && (
                <div className="mt-3 pt-3 border-t border-rose-100">
                    <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-900">
                        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-rose-200/60">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                                <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                <span>Correction Note for Applicant</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={onReject}
                                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                    <Pencil size={11} />
                                    <span>Edit Note</span>
                                </button>
                                {onClear && (
                                    <button
                                        type="button"
                                        onClick={onClear}
                                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                        title="Clear correction"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed font-medium">
                            "{rejectionReason}"
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
