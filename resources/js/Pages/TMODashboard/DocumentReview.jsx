import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    User, MapPin, Bike, Send, Smartphone, CheckCircle2, ClipboardList,
    RefreshCw, Check, X, MessageSquare, Clock, AlertTriangle, Eye, Gauge,
} from 'lucide-react';
import { BackLink, Modal, Button, Textarea } from '@/Components/TMO';

export default function DocumentReview({ application }) {
    const appData = application || {
        operator: 'Juan Dela Cruz',
        id: 'NSB-26-8812',
        make: 'Kawasaki Barako 175',
        engine_number: 'ENG-KAW-12345',
        chassis_number: 'CHAS-KAW-98765',
        plate: 'NSB-2024-ABC',
        toda: 'TODA A (Poblacion)',
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

    // Rejection modal state
    const [pendingRejectId, setPendingRejectId] = useState(null);
    const [draftReason, setDraftReason] = useState('');

    // Ensure all vehicle properties have values
    const vehicleData = {
        make: appData?.make || 'Kawasaki Barako 175',
        engine_number: appData?.engine_number || 'ENG-KAW-12345',
        chassis_number: appData?.chassis_number || 'CHAS-KAW-98765',
        plate: appData?.plate || 'NSB-2024-ABC',
        toda: appData?.toda || 'TODA A (Poblacion)',
    };

    const requirements = [
        { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)',                         mandatory: false },
        { id: 'orcr',      label: 'Xerox OR/CR',                                          mandatory: true  },
        { id: 'receipt',   label: 'Delivery Receipt (Kung walang OR/CR / New)',            mandatory: false },
        { id: 'license',   label: "Driver's License Back-to-back (Prof/Restriction 1/A1)", mandatory: true  },
        { id: 'brgy',      label: 'Barangay Clearance (Original)',                         mandatory: true  },
        { id: 'toda',      label: 'TODA/NAFTODA/ACTODAN Clearance (Original)',             mandatory: true  },
        { id: 'driver_id', label: "Driver's ID Issued by NAFTODA/ACTODAN",                mandatory: true  },
        { id: 'tariff',    label: 'List of Existing Tariff Fee (For sidecar)',             mandatory: true  },
        { id: 'auth',      label: "Authorization Letter & ID (Kung hindi may-ari)",       mandatory: false },
    ];

    const handleApprove = (id) => {
        setDocStatuses(prev => ({ ...prev, [id]: 'approved' }));
        setRejectionReasons(prev => { const n = { ...prev }; delete n[id]; return n; });
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

    const anyRejected        = Object.values(docStatuses).some(s => s === 'rejected');
    const allMandatoryApproved = requirements
        .filter(r => r.mandatory)
        .every(r => docStatuses[r.id] === 'approved');
    const canSchedule        = allMandatoryApproved && !anyRejected;

    const handleFinalAction = (type) => {
        const isApprove = type === 'approve';

        Swal.fire({
            title: isApprove ? 'Confirm Approval' : 'Confirm Rejection',
            html: isApprove
                ? `Are you sure you want to approve requirements for <b>${appData.reference}</b>? The unit will be endorsed for Physical Tricycle Inspection.`
                : `Are you sure you want to reject <b>${appData.reference}</b>? The operator will be notified to re-upload the rejected documents.`,
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
                            title: isApprove ? 'Requirements Approved!' : 'Rejection Sent',
                            text: isApprove
                                ? 'Application moved to Physical Inspection queue. Applicant notified.'
                                : 'Rejection report sent. Operator must re-upload files.',
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
            <Head title={`Review: ${appData.reference} | TRIVORA`} />

            {/* ── File Preview Modal ── */}
            <Modal
                show={activePreviewDoc !== null}
                onClose={() => setActivePreviewDoc(null)}
                maxWidth="3xl"
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
                title="Rejection Reason"
                description="Explain why this document failed verification"
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

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <BackLink href="/tmo/docs">Back to Document Queue</BackLink>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-800">
                    Reviewing {appData.reference}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">

                {/* ════ LEFT: Operator Profile + Vehicle Specs ════ */}
                <div className="overflow-hidden rounded-2xl border-[1.5px] border-tmo-primary/20 bg-tmo-primarySoft/40 shadow-sm">
                    <div className="p-7">
                        <div className="mb-6 flex flex-col items-center border-b border-tmo-primary/15 pb-6 text-center">
                            <div className="mb-4 flex h-[76px] w-[76px] items-center justify-center rounded-2xl border-[1.5px] border-tmo-primary/25 bg-tmo-primarySoft text-tmo-primary">
                                <User size={30} strokeWidth={1.6} />
                            </div>
                            <p className="mb-1.5 text-[17px] font-extrabold tracking-tight text-tmo-ink">{appData.operator}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-tmo-muted">{appData.toda}</p>
                        </div>

                        <div className="flex flex-col gap-5">
                            <ProfileField icon={Smartphone} label="Contact" value={appData.contact} />
                            <ProfileField icon={MapPin} label="Barangay" value={appData.barangay} />
                        </div>

                        <div className="my-6 border-t border-tmo-primary/15" />

                        <div className="flex flex-col gap-5">
                            <ProfileField icon={Bike} label="Make & Model" value={vehicleData.make} />
                            <ProfileField icon={Gauge} label="Engine Number" value={vehicleData.engine_number} />
                            <ProfileField icon={Gauge} label="Chassis Number" value={vehicleData.chassis_number} />
                            <ProfileField icon={Bike} label="Plate Number" value={vehicleData.plate} />
                            <ProfileField icon={MapPin} label="TODA Assignment" value={vehicleData.toda} />
                        </div>
                    </div>
                </div>

                {/* ════ RIGHT: Checklist + Action ════ */}
                <div className="overflow-hidden rounded-2xl border border-tmo-border bg-tmo-surface shadow-sm">
                    <div className="p-7">

                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-tmo-primary">Phase 1 · Document Verification</p>
                        <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-tmo-ink">Requirement Checklist</h2>

                        {/* Document rows */}
                        <div className="mb-7 flex flex-col gap-2.5">
                            {requirements.map((doc) => {
                                const status = docStatuses[doc.id];
                                const categoryDocs = appData.documents?.filter(d => d.category === doc.id) || [];
                                return (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center justify-between gap-3.5 rounded-xl border p-4 transition-colors ${
                                            status === 'approved'
                                                ? 'border-emerald-300 bg-emerald-50/60'
                                                : status === 'rejected'
                                                ? 'border-red-300 bg-red-50/60'
                                                : 'border-tmo-border bg-tmo-bg'
                                        }`}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                                                status === 'approved' ? 'border-emerald-300 bg-emerald-100 text-emerald-600'
                                                : status === 'rejected' ? 'border-red-300 bg-red-100 text-red-600'
                                                : 'border-tmo-border bg-white text-tmo-subtle'
                                            }`}>
                                                <ClipboardList size={17} strokeWidth={2} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="mb-1 text-[12.5px] font-semibold leading-tight text-tmo-ink">
                                                    {doc.label}
                                                    {doc.mandatory && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-600 align-middle" />}
                                                </p>
                                                {status === 'rejected' ? (
                                                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                                                        <MessageSquare size={9} strokeWidth={2.5} />
                                                        {rejectionReasons[doc.id]}
                                                    </p>
                                                ) : categoryDocs.length === 0 ? (
                                                    <span className="text-[10px] font-medium text-tmo-subtle">No file uploaded</span>
                                                ) : (
                                                    <button
                                                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-tmo-muted transition-colors hover:text-tmo-primary"
                                                        onClick={() => { setActivePreviewDoc(doc.id); setActiveSubDocIndex(0); }}
                                                    >
                                                        <Eye size={10} strokeWidth={2} />
                                                        {categoryDocs.length > 1 ? `Preview files (${categoryDocs.length})` : 'Preview file'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <button
                                                onClick={() => handleApprove(doc.id)}
                                                title="Approve"
                                                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                                    status === 'approved'
                                                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                                        : 'border-tmo-border bg-white text-tmo-subtle hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600'
                                                }`}
                                            >
                                                <Check size={16} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(doc.id)}
                                                title="Reject"
                                                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                                    status === 'rejected'
                                                        ? 'border-red-600 bg-red-600 text-white shadow-sm'
                                                        : 'border-tmo-border bg-white text-tmo-subtle hover:border-red-300 hover:bg-red-50 hover:text-red-600'
                                                }`}
                                            >
                                                <X size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Dynamic Action Zone ── */}
                        <div className="flex flex-col items-center rounded-xl border border-tmo-border bg-tmo-bg px-8 py-10 text-center">
                            {canSchedule ? (
                                <>
                                    <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-tmo-primary text-white shadow-lg">
                                        <CheckCircle2 size={28} strokeWidth={2} />
                                    </div>
                                    <p className="mb-2 text-xl font-extrabold tracking-tight text-tmo-ink">Online Requirements Cleared</p>
                                    <p className="mb-7 max-w-[280px] text-[11px] font-semibold uppercase leading-relaxed tracking-wide text-tmo-muted">
                                        All digital documents meet initial standards. Approve to instruct the applicant to present original physical documents at TMO.
                                    </p>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="w-full max-w-[340px]"
                                        icon={isProcessing ? undefined : Send}
                                        loading={isProcessing}
                                        onClick={() => handleFinalAction('approve')}
                                    >
                                        Approve Online Requirements &amp; Request Physical Documents
                                    </Button>
                                </>
                            ) : anyRejected ? (
                                <>
                                    <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600">
                                        <AlertTriangle size={28} strokeWidth={2} />
                                    </div>
                                    <p className="mb-2 text-xl font-extrabold tracking-tight text-red-600">Action Required</p>
                                    <p className="mb-7 max-w-[280px] text-[11px] font-semibold uppercase leading-relaxed tracking-wide text-tmo-muted">
                                        One or more documents failed review. Send a rejection notice so the operator can re-upload the corrected files.
                                    </p>
                                    <Button
                                        variant="dangerSolid"
                                        size="lg"
                                        className="w-full max-w-[340px]"
                                        icon={isProcessing ? undefined : RefreshCw}
                                        loading={isProcessing}
                                        onClick={() => handleFinalAction('reject')}
                                    >
                                        Send Rejection Notice
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl border border-tmo-border bg-white text-tmo-subtle">
                                        <Clock size={22} strokeWidth={1.8} />
                                    </div>
                                    <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-tmo-subtle">Awaiting Verification</p>
                                    <p className="text-[8.5px] font-semibold uppercase tracking-wide text-tmo-subtle">Review all mandatory items above</p>
                                </>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </TrivoraLayout>
    );
}

function ProfileField({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-3.5">
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-tmo-primary/20 bg-tmo-primarySoft text-tmo-primary">
                <Icon size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0">
                <p className="mb-0.5 text-[8.5px] font-bold uppercase tracking-widest text-tmo-muted">{label}</p>
                <p className="truncate text-[13px] font-semibold text-tmo-ink">{value}</p>
            </div>
        </div>
    );
}
