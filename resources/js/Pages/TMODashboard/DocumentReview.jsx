import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    User, MapPin, Bike, Send, Smartphone, Mail, CheckCircle2, ClipboardList,
    RefreshCw, Check, X, Clock, AlertTriangle, Eye, ChevronLeft,
    FileText, Loader2, ShieldCheck, Copy, Pencil, CalendarDays, ArrowUpRight
} from 'lucide-react';
import { Modal, Button, Textarea } from '@/Components/TMO';
import { getApplicableDocuments } from '@/data/registrationRequirements';

import Avatar from '@/Components/Avatar';
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

const QUICK_CORRECTION_REASONS = [
    'Blurry or unreadable image',
    'Expired document or clearance',
    'Wrong file uploaded',
    'Incomplete or missing pages',
    'Name or plate number mismatch',
];

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

    // Rejection modal state
    const [pendingRejectId, setPendingRejectId] = useState(null);
    const [draftReason, setDraftReason] = useState('');

    const handleCopy = (fieldKey, value) => {
        if (!value || value === '—' || value === 'N/A') return;
        navigator.clipboard?.writeText(value);
        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 1800);
    };

    // Background refresh paused while in-flight or decision pending
    useBackgroundRefresh(['application'], { paused: isProcessing });

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

    const isRenewal = (appData.application_type || '').toLowerCase() === 'renewal'
        || (appData.documents || []).some(d => d.category === 'prangkisa');

    const applicableDocs = getApplicableDocuments(isRenewal ? 'renewal' : 'new');
    const requirements = applicableDocs.map(d => ({
        id: d.id,
        label: d.label,
        mandatory: d.required,
    }));

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
        const reason = draftReason.trim() || 'Document requires correction or re-upload';
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
    const uploadedOptionalRequirements = optionalRequirements.filter(
        r => (appData.documents || []).some(d => d.category === r.id)
    );

    const anyRejected = Object.values(docStatuses).some(s => s === 'rejected');
    const allMandatoryApproved = mandatoryRequirements.every(
        r => docStatuses[r.id] === 'approved'
            && (appData.documents || []).some(d => d.category === r.id)
    );
    const allAdditionalApproved = uploadedOptionalRequirements.every(
        r => docStatuses[r.id] === 'approved'
    );
    const canSchedule = allMandatoryApproved && allAdditionalApproved && !anyRejected;

    const approvedCount = requirements.filter(r => docStatuses[r.id] === 'approved').length;
    const rejectedCount = requirements.filter(r => docStatuses[r.id] === 'rejected').length;

    const mandatoryApprovedCount = mandatoryRequirements.filter(r => docStatuses[r.id] === 'approved').length;

    // Bulk-approve every mandatory requirement, clearing any correction flags on them.
    const handleApproveAllMandatory = () => {
        const ids = mandatoryRequirements.map(r => r.id);
        setDocStatuses(prev => {
            const next = { ...prev };
            ids.forEach(id => { next[id] = 'approved'; });
            return next;
        });
        setRejectionReasons(prev => {
            const next = { ...prev };
            ids.forEach(id => { delete next[id]; });
            return next;
        });
    };
    const mandatoryPct = mandatoryRequirements.length > 0 ? Math.round((mandatoryApprovedCount / mandatoryRequirements.length) * 100) : 0;


    const handleFinalAction = (type) => {
        const isApprove = type === 'approve';

        Swal.fire({
            title: isApprove ? 'Approve Requirements?' : 'Send Correction Notice?',
            html: isApprove
                ? `Proceed <b>${appData.reference || appData.id}</b> to Physical Tricycle Roadworthiness Inspection? All verified requirements will be locked.`
                : `Return <b>${appData.reference || appData.id}</b> to applicant? They will receive a notification to re-upload the flagged documents.`,
            icon: isApprove ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isApprove ? '#182B62' : '#DC2626',
            cancelButtonColor: '#64748B',
            confirmButtonText: isApprove ? 'Proceed to Inspection' : 'Return',
            cancelButtonText: 'Cancel',
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
                            title: isApprove ? 'Requirements Approved!' : 'Notice Dispatched',
                            text: isApprove
                                ? 'Application moved to Physical Inspection. Applicant has been notified.'
                                : 'Correction notice sent to applicant with your feedback.',
                            icon: 'success',
                            confirmButtonColor: '#182B62',
                            timer: 2200,
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

            <div className="font-['Plus_Jakarta_Sans',sans-serif] pb-24 lg:pb-8">
                {/* ── File Preview Modal ── */}
                <Modal
                    show={activePreviewDoc !== null}
                    onClose={() => setActivePreviewDoc(null)}
                    maxWidth="4xl"
                    title={`${previewDocLabel}${previewCategoryDocs.length > 1 ? ` (${activeSubDocIndex + 1} of ${previewCategoryDocs.length})` : ''}`}
                    footer={
                        <>
                            <Button
                                variant="danger"
                                icon={X}
                                onClick={() => { const id = activePreviewDoc; setActivePreviewDoc(null); openRejectModal(id); }}
                            >
                                {docStatuses[activePreviewDoc] === 'rejected' ? 'Edit Correction' : 'Reject'}
                            </Button>
                            <Button
                                variant="success"
                                icon={Check}
                                disabled={docStatuses[activePreviewDoc] === 'approved'}
                                onClick={() => { if (docStatuses[activePreviewDoc] !== 'approved') handleApprove(activePreviewDoc); setActivePreviewDoc(null); }}
                            >
                                {docStatuses[activePreviewDoc] === 'approved' ? 'Verified' : 'Approve'}
                            </Button>
                        </>
                    }
                >
                    {previewCategoryDocs.length > 1 && (
                        <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 custom-scrollbar">
                            {previewCategoryDocs.map((doc, idx) => (
                                <button
                                    key={doc.id}
                                    onClick={() => setActiveSubDocIndex(idx)}
                                    className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                        idx === activeSubDocIndex
                                            ? 'border border-[#182B62] bg-[#182B62] text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {doc.file_name.length > 25 ? doc.file_name.substring(0, 22) + '...' : doc.file_name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-4">
                        {currentSubDoc ? (
                            currentSubDoc.mime_type?.startsWith('image/') ? (
                                <img
                                    src={currentSubDoc.file_path}
                                    alt={currentSubDoc.file_name}
                                    className="max-h-[65vh] max-w-full rounded-xl border border-slate-200/80 object-contain shadow-sm"
                                />
                            ) : (
                                <iframe
                                    src={currentSubDoc.file_path}
                                    title={currentSubDoc.file_name}
                                    className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
                                />
                            )
                        ) : (
                            <p className="py-10 text-xs font-semibold text-slate-500">No file available for preview.</p>
                        )}
                    </div>
                </Modal>

                {/* ── Rejection Reason Modal with Quick Tags ── */}
                <Modal
                    show={pendingRejectId !== null}
                    onClose={cancelRejection}
                    title="Request Document Correction"
                    description="Provide clear instructions for the applicant on what needs to be fixed"
                    footer={
                        <>
                            <Button variant="secondary" onClick={cancelRejection}>Cancel</Button>
                            <Button variant="dangerSolid" onClick={confirmRejection}>Save</Button>
                        </>
                    }
                >
                    <div className="mb-3.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Requirement</p>
                        <p className="text-xs font-bold text-rose-900 mt-0.5">{pendingDoc?.label}</p>
                    </div>

                    <div className="mb-3">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                            Quick Feedback Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_CORRECTION_REASONS.map((reason) => (
                                <button
                                    key={reason}
                                    type="button"
                                    onClick={() => setDraftReason(reason)}
                                    className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                                >
                                    + {reason}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                            Specific Instructions for Applicant
                        </label>
                        <Textarea
                            rows={3}
                            placeholder="e.g., Please re-upload a clear, uncropped photo showing all 4 corners and valid expiry date…"
                            value={draftReason}
                            onChange={e => setDraftReason(e.target.value)}
                            autoFocus
                        />
                    </div>
                </Modal>

                {/* ══════════════════════════════════════════════════════════════
                    1. TOP BREADCRUMB / BACK LINK
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-4">
                    <Link
                        href="/tmo/docs"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors group"
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                        <span>Back to Document Review Queue</span>
                    </Link>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. APPLICATION HEADER CARD
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 border-b border-slate-200/80 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="flex flex-wrap items-baseline gap-2 sm:gap-2.5">
                                <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                                    {appData.reference || appData.id}
                                </h1>
                                <span className="text-xs sm:text-sm font-semibold text-slate-600">
                                    · {isRenewal ? 'Franchise Renewal' : 'New Franchise Application'}
                                </span>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                                Applicant: <strong className="font-bold text-slate-900">{appData.operator}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. WORKSPACE GRID: Documents (Left) | Controls & Info (Right)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

                    {/* ── LEFT COLUMN: DOCUMENT WORKSPACE (8 cols) ── */}
                    <div className="space-y-6 lg:col-span-8">

                        {/* Section 1: Required Documents */}
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <ClipboardList size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                            Required Requirements &amp; Clearances
                                        </h2>
                                        <p className="text-[11px] text-slate-600 font-medium">
                                            All mandatory documents must be verified prior to roadworthiness inspection
                                        </p>
                                    </div>
                                </div>
                                {mandatoryApprovedCount === mandatoryRequirements.length ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg w-fit">
                                        <CheckCircle2 size={13} strokeWidth={2.4} />
                                        All Verified
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleApproveAllMandatory}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#182B62] px-3 text-xs font-bold text-white shadow-sm hover:bg-[#25449B] transition-colors w-fit cursor-pointer"
                                    >
                                        <Check size={13} strokeWidth={2.6} />
                                        Approve All
                                    </button>
                                )}
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

                        {/* Section 2: Additional Documents (Conditional) */}
                        {uploadedOptionalRequirements.length > 0 && (
                            <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                            <FileText size={16} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                                Additional Supporting Documents
                                            </h2>
                                            <p className="text-[11px] text-slate-600 font-medium">
                                                Conditional files (Delivery Receipts, Special Authorizations)
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg w-fit">
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

                    {/* ── RIGHT COLUMN: CONTROL SIDEBAR (4 cols) ── */}
                    <div className="space-y-5 lg:col-span-4 lg:sticky lg:top-6 self-start">

                        {/* Box 1: Official Review Decision Card — desktop only; on mobile/tablet the
                            same actions live in the sticky bottom bar (lg:hidden) below. */}
                        <div className={`hidden lg:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <ShieldCheck size={16} strokeWidth={2.2} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                        Official Decision
                                    </h3>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                    canSchedule
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : anyRejected
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                    {canSchedule ? 'Ready for Inspection' : anyRejected ? 'Needs Correction' : 'In Progress'}
                                </span>
                            </div>

                            {/* Progress Meter */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                    <span className="text-slate-600">Verification Progress</span>
                                    <span className="tabular-nums text-slate-900">{mandatoryApprovedCount} of {mandatoryRequirements.length}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full transition-all duration-300 rounded-full ${
                                            canSchedule ? 'bg-emerald-500' : anyRejected ? 'bg-amber-500' : 'bg-[#182B62]'
                                        }`}
                                        style={{ width: `${mandatoryPct}%` }}
                                    />
                                </div>
                            </div>

                            {/* Decision Status Prompt & Primary Action Button */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                {canSchedule ? (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                                            <div className="flex items-center gap-1.5 font-bold mb-1">
                                                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                <span>All Requirements Cleared</span>
                                            </div>
                                            <p className="text-[11.5px] leading-relaxed text-emerald-700 font-medium">
                                                All documents are verified. Click below to proceed to the physical tricycle inspection.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={() => handleFinalAction('approve')}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                        >
                                            {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} strokeWidth={2.2} />}
                                            <span>Proceed to Inspection</span>
                                        </button>
                                    </div>
                                ) : anyRejected ? (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-800">
                                            <div className="flex items-center gap-1.5 font-bold mb-1">
                                                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                                                <span>Correction Required</span>
                                            </div>
                                            <p className="text-[11.5px] leading-relaxed text-rose-700 font-medium">
                                                {rejectedCount} document(s) flagged for correction. Send a notice so the applicant can re-upload corrected files.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={() => handleFinalAction('reject')}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                        >
                                            {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2.2} />}
                                            <span>Return</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-800">
                                                <Clock size={14} className="text-amber-500 shrink-0" />
                                                <span>Review in Progress</span>
                                            </div>
                                            <p className="text-[11.5px] leading-relaxed text-slate-600 font-medium">
                                                Verify each uploaded requirement on the left. The Proceed to Inspection button will activate once all items are confirmed.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                                        >
                                            <span>Review All Required Documents to Proceed</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Box 2: Applicant Operator & Driver Details */}
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <User size={16} strokeWidth={2.2} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                        Applicant &amp; Driver
                                    </h3>
                                </div>
                            </div>

                            {/* Owner Summary */}
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <Avatar name={appData.operator} src={appData.operator_photo} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#182B62] text-xs font-bold text-white shadow-sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs sm:text-sm font-bold text-slate-900">{appData.operator}</p>
                                    <p className="truncate text-xs text-slate-600 font-medium">Tricycle Owner (Applicant)</p>
                                </div>
                            </div>

                            {/* Birthday, Contact & Location */}
                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                        <CalendarDays size={13} className="shrink-0" />
                                        Birthday
                                    </span>
                                    <span className="font-bold text-slate-800">{appData.owner?.birthday || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                        <Smartphone size={13} className="shrink-0" />
                                        Contact
                                    </span>
                                    <span className="font-bold text-slate-800 font-mono">{appData.contact || 'No phone provided'}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                        <Mail size={13} className="shrink-0" />
                                        Email
                                    </span>
                                    <span className="font-bold text-slate-800 break-all text-right">{appData.owner?.email || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                        <MapPin size={13} className="shrink-0" />
                                        Barangay
                                    </span>
                                    <span className="font-bold text-slate-800 truncate max-w-[180px] text-right">{appData.barangay}</span>
                                </div>
                            </div>

                            {/* Tricycle Driver Details */}
                            <div className="mt-3.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#182B62]">Designated Driver</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${appData.ownerIsDriver ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}`}>
                                        {appData.ownerIsDriver ? 'Owner is Driver' : 'Separate Driver'}
                                    </span>
                                </div>
                                {appData.ownerIsDriver ? (
                                    <p className="mt-2 text-xs text-slate-600 font-medium">
                                        The tricycle owner drives their own unit.
                                    </p>
                                ) : appData.tricycleDriver ? (
                                    <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-500">Driver Name</span>
                                            <span className="font-bold text-slate-800">{appData.tricycleDriver.full_name || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-500">Birthday</span>
                                            <span className="font-bold text-slate-800">{appData.tricycleDriver.birthday || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-500">Mobile</span>
                                            <span className="font-bold text-slate-800 font-mono">{appData.tricycleDriver.contact_number || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-slate-600">
                                            <span className="font-medium text-slate-500">Email</span>
                                            <span className="font-bold text-slate-800 break-all text-right">{appData.tricycleDriver.email || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span className="font-medium text-slate-500">Barangay</span>
                                            <span className="font-bold text-slate-800">{appData.tricycleDriver.barangay || '—'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-xs text-slate-600 font-medium">No separate driver registered.</p>
                                )}
                            </div>
                        </div>

                        {/* Box 3: Declared Tricycle Specifications */}
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <Bike size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                            Tricycle Unit Specifications
                                        </h3>
                                        <p className="text-[11px] text-slate-600 font-medium">Official declared records</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Specs */}
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Plate Number</span>
                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                        {vehicleData.plate}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Make &amp; Model</span>
                                    <span className="font-bold text-slate-800 text-right truncate max-w-[170px]">
                                        {vehicleData.make}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Year Model</span>
                                    <span className="font-bold text-slate-800">
                                        {vehicleData.year_model}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Body Color</span>
                                    <span className="font-bold text-slate-800">
                                        {vehicleData.body_color}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Body Type</span>
                                    <span className="font-bold text-slate-800">
                                        {vehicleData.body_type}
                                    </span>
                                </div>
                            </div>

                            {/* LTO Official Numbers */}
                            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5 text-xs">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    LTO Official Documentation
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Engine Number</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-slate-800 font-bold text-xs">
                                            {vehicleData.engine_number}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy('engine', vehicleData.engine_number)}
                                            title="Copy Engine Number"
                                            className="text-slate-500 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                        >
                                            {copiedField === 'engine' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">Chassis Number</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-slate-800 font-bold text-xs">
                                            {vehicleData.chassis_number}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy('chassis', vehicleData.chassis_number)}
                                            title="Copy Chassis Number"
                                            className="text-slate-500 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                        >
                                            {copiedField === 'chassis' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">LTO OR Number</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-slate-800 font-bold text-xs">
                                            {vehicleData.or_number}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy('or', vehicleData.or_number)}
                                            title="Copy OR Number"
                                            className="text-slate-500 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                        >
                                            {copiedField === 'or' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">LTO CR Number</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-slate-800 font-bold text-xs">
                                            {vehicleData.cr_number}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy('cr', vehicleData.cr_number)}
                                            title="Copy CR Number"
                                            className="text-slate-500 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                                        >
                                            {copiedField === 'cr' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. MOBILE STICKY BOTTOM ACTION BAR (Smooth touch access)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 sm:p-4 shadow-xl">
                    <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Progress</p>
                            <p className="text-xs font-black text-slate-900 tabular-nums">
                                {mandatoryApprovedCount} / {mandatoryRequirements.length} Verified
                            </p>
                        </div>

                        {canSchedule ? (
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleFinalAction('approve')}
                                className="flex-1 max-w-[240px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#182B62] text-white py-2.5 px-3 text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                            >
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} strokeWidth={2.2} />}
                                <span>Proceed to Inspection</span>
                            </button>
                        ) : anyRejected ? (
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleFinalAction('reject')}
                                className="flex-1 max-w-[240px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 text-white py-2.5 px-3 text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                            >
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={13} strokeWidth={2.2} />}
                                <span>Return</span>
                            </button>
                        ) : (
                            <span className="text-xs font-semibold text-slate-500 text-right">
                                Verify all files to proceed
                            </span>
                        )}
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
        <div className={`rounded-2xl border transition-all p-3.5 sm:p-4 ${
            isApproved
                ? 'border-emerald-200/90 bg-emerald-50/25 shadow-sm'
                : isRejected
                ? 'border-rose-200 bg-rose-50/25 shadow-sm'
                : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-sm'
        }`}>
            {/* Top Row: Icon + Details & File Link + Action Buttons */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl ${
                        isApproved
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : isRejected
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                        {isApproved ? (
                            <CheckCircle2 size={17} strokeWidth={2.4} />
                        ) : isRejected ? (
                            <AlertTriangle size={17} strokeWidth={2.4} />
                        ) : (
                            <FileText size={17} strokeWidth={2} />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {doc.label}
                            </p>
                            {isApproved && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                    Verified
                                </span>
                            )}
                            {isRejected && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                    Needs Fix
                                </span>
                            )}
                        </div>

                        {/* File preview link */}
                        <div className="mt-1 flex items-center gap-2 text-xs">
                            {hasFiles ? (
                                <button
                                    type="button"
                                    onClick={onPreview}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#182B62] hover:text-[#25449B] transition-colors cursor-pointer"
                                >
                                    <Eye size={12} strokeWidth={2.4} />
                                    <span>{categoryDocs.length > 1 ? `View ${categoryDocs.length} files` : 'View uploaded file'}</span>
                                </button>
                            ) : (
                                <span className="text-[11px] font-medium text-slate-500">
                                    No file uploaded yet
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
                        className={`inline-flex h-8 sm:h-9 items-center gap-1 rounded-xl px-2.5 sm:px-3 text-xs font-bold transition-all cursor-pointer ${
                            isRejected
                                ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                    >
                        <X size={13} strokeWidth={2.5} />
                        <span>Reject</span>
                    </button>

                    <button
                        type="button"
                        onClick={onApprove}
                        title={isApproved ? 'Approved (Click to clear)' : 'Approve document'}
                        className={`inline-flex h-8 sm:h-9 items-center gap-1 rounded-xl px-2.5 sm:px-3 text-xs font-bold transition-all cursor-pointer ${
                            isApproved
                                ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                    >
                        <Check size={13} strokeWidth={2.5} />
                        <span>Approve</span>
                    </button>
                </div>
            </div>

            {/* Mobile Action Buttons: Full-width 2 buttons in one row (sm:hidden) */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 sm:hidden">
                <button
                    type="button"
                    onClick={onReject}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                        isRejected
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                    }`}
                >
                    <X size={14} strokeWidth={2.5} />
                    <span>Reject</span>
                </button>

                <button
                    type="button"
                    onClick={onApprove}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                        isApproved
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                    }`}
                >
                    <Check size={14} strokeWidth={2.5} />
                    <span>Approve</span>
                </button>
            </div>

            {/* Correction Note Display */}
            {isRejected && (
                <div className="mt-3 pt-2.5 border-t border-rose-100">
                    <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-900">
                        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-rose-200/60">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                                <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                <span>Feedback for Applicant</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={onReject}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                    <Pencil size={11} />
                                    <span>Edit</span>
                                </button>
                                {onClear && (
                                    <button
                                        type="button"
                                        onClick={onClear}
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
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
