import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import Swal from 'sweetalert2';
import { BackLink, Button, StatusBadge } from '@/Components/TMO';
import {
    AlertTriangle,
    UploadCloud,
    FileText,
    CheckCircle2,
    XCircle,
    Info,
    Loader2,
    Check,
    Wrench,
    Settings,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// and Operator panels, so this page reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const documentList = [
    { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)' },
    { id: 'orcr',       label: 'Xerox OR/CR' },
    { id: 'receipt',    label: 'Delivery Receipt (Kung walang OR/CR / New)' },
    { id: 'license',    label: "Driver's License Back-to-back (Prof/Restriction 1/A1)" },
    { id: 'brgy',       label: 'Barangay Clearance (Original)' },
    { id: 'toda',       label: 'TODA/NAFTODA/ACTODAN Clearance (Original)' },
    { id: 'driver_id', label: "Driver's ID Issued by NAFTODA/ACTODAN" },
    { id: 'tariff',    label: 'List of Existing Tariff Fee (For sidecar)' },
    { id: 'auth',      label: "Authorization Letter & ID (Kung hindi may-ari)" },
];

const inspectionList = [
    { id: 'headlight', label: 'Ilaw sa harap (Headlight)' },
    { id: 'taillight', label: 'Ilaw sa likod (Taillight / Brake light)' },
    { id: 'interior',  label: 'Ilaw sa loob (Interior Light)' },
    { id: 'horn',      label: 'Busina (Horn)' },
    { id: 'mirrors',   label: 'Side Mirrors' },
    { id: 'battery',   label: 'Baterya (Battery)' },
    { id: 'plates',    label: 'Plaka (LTO & GSO Plates)' },
    { id: 'muffler',   label: 'Muffler / Tambutso' },
    { id: 'sidecar',   label: 'Sidecar / Floorboard Integrity' }
];

const generateItems = (list, statusMap, defaultStatus) => {
    return list.map(req => ({
        id: req.id, name: req.label,
        status: statusMap[req.id] || defaultStatus, note: statusMap[`${req.id}_note`] || ''
    }));
};

const mockApplicationsData = {
    'APP-2026-0812': {
        id: 'APP-2026-0812', operatorName: 'Mario Dela Cruz', phase: 'tmo-docs',
        documents: generateItems(documentList, {
            'prangkisa': 'approved',
            'orcr': 'rejected', 'orcr_note': 'OR/CR image is blurred and unreadable. Please re-upload a clear copy.',
            'receipt': 'na', 'license': 'approved', 'brgy': 'approved', 'toda': 'approved',
            'driver_id': 'approved', 'tariff': 'pending', 'auth': 'na'
        }, 'pending'),
        inspections: []
    },
    'APP-2026-0900': {
        id: 'APP-2026-0900', operatorName: 'Mario Dela Cruz', phase: 'tmo-phys',
        documents: generateItems(documentList, { 'receipt': 'na', 'auth': 'na' }, 'approved'),
        inspections: generateItems(inspectionList, {
            'mirrors': 'rejected', 'mirrors_note': 'Missing right side mirror',
            'muffler': 'rejected', 'muffler_note': 'Excessive muffler noise (Above 90dB)',
            'sidecar': 'rejected', 'sidecar_note': 'Severe floorboard rust / structural weakness'
        }, 'approved')
    }
};

export default function MTOPFix({ application }) {
    const app = application || mockApplicationsData['APP-2026-0812'];

    const isPhysFix = app.phase === 'tmo-phys';
    const rejectedDocs = app.documents ? app.documents.filter(d => d.status === 'rejected') : [];
    const rejectedInspections = app.inspections ? app.inspections.filter(i => i.status === 'rejected') : [];

    const [newFiles, setNewFiles] = useState({});
    const [repairsConfirmed, setRepairsConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileSelect = (docId, files) => {
        setNewFiles(prev => ({
            ...prev,
            [docId]: files
        }));
    };

    const handleSubmit = () => {
        Swal.fire({
            title: isPhysFix ? 'Request Re-inspection?' : 'Submit Corrections?',
            text: isPhysFix
                ? 'Confirm that all defects have been repaired. Your tricycle will be scheduled for another physical inspection.'
                : 'Confirm that you have uploaded the correct replacement documents.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1D2542',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, Submit',
        }).then((result) => {
            if (result.isConfirmed) {
                if (isPhysFix) {
                    router.post(`/operator/mtop/${app.id}/fix`, {
                        repairs_confirmed: true,
                    }, {
                        onStart: () => setIsSubmitting(true),
                        onFinish: () => setIsSubmitting(false),
                        onSuccess: () => {
                            Swal.fire({
                                title: 'Submitted Successfully!',
                                text: 'Your re-inspection request has been sent to the TMO.',
                                icon: 'success',
                                confirmButtonColor: '#059669',
                                timer: 2500,
                                showConfirmButton: false
                            });
                        }
                    });
                } else {
                    router.post(`/operator/mtop/${app.id}/fix`, {
                        documents: newFiles,
                    }, {
                        forceFormData: true,
                        onStart: () => setIsSubmitting(true),
                        onFinish: () => setIsSubmitting(false),
                        onSuccess: () => {
                            Swal.fire({
                                title: 'Submitted Successfully!',
                                text: 'Your updated documents have been sent to the TMO for review.',
                                icon: 'success',
                                confirmButtonColor: '#059669',
                                timer: 2500,
                                showConfirmButton: false
                            });
                        }
                    });
                }
            }
        });
    };

    const isSubmitDisabled = isSubmitting || (!isPhysFix && rejectedDocs.length > 0 && !rejectedDocs.every(d => newFiles[d.id] && newFiles[d.id].length > 0)) || (isPhysFix && !repairsConfirmed);

    return (
        <OperatorLayout title={isPhysFix ? "Request Re-inspection" : "Fix Application"} operatorName={app.operatorName}>
            <Head title={isPhysFix ? "Request Re-inspection | TRIVORA" : "Fix Application | TRIVORA"} />

            <div className="mx-auto max-w-[1100px] pb-10">
                <div className="mb-6 flex items-center justify-between">
                    <BackLink href={route('operator.mtop.details', { id: app.id })}>Back to Details</BackLink>
                    <StatusBadge variant="danger" icon={AlertTriangle}>Action Required</StatusBadge>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">
                        {isPhysFix ? 'Request Re-inspection' : 'Submit Corrections'}
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-500">
                        {isPhysFix
                            ? 'Review the defects found during inspection and confirm repairs.'
                            : 'Review the TMO notes below and upload the correct documents.'}
                    </p>
                </div>

                <div className={`mb-6 flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 ${CARD_SHADOW}`}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/[0.16] to-red-500/[0.04] text-red-600">
                        <AlertTriangle size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-red-800">Your application is currently paused.</h2>
                        <p className="mt-1 text-[13px] leading-relaxed text-red-700">
                            {isPhysFix
                                ? `The TMO team found ${rejectedInspections.length} defects. Please ensure all items are repaired before requesting re-inspection.`
                                : `The TMO team found issues with ${rejectedDocs.length} requirements. Please provide updated files to resume processing.`}
                        </p>
                    </div>
                </div>

                <div className={`mb-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                        {isPhysFix ? <Settings size={16} className="text-slate-400" /> : <FileText size={16} className="text-slate-400" />}
                        <h2 className="text-[15px] font-bold text-slate-900">{isPhysFix ? 'Physical Repair Checklist' : 'Document Submission'}</h2>
                    </div>
                    <div className="p-6 sm:p-8">
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {(isPhysFix ? app.inspections : app.documents).map((item) => {
                                if (item.status === 'rejected') {
                                    const hasFiles = newFiles[item.id];
                                    return (
                                        <div key={item.id} className="overflow-hidden rounded-2xl border-[1.5px] border-red-200 bg-white">
                                            <div className="flex items-start justify-between gap-3 border-b border-red-100 bg-red-50/60 p-5">
                                                <div>
                                                    <p className="mb-1.5 text-[15px] font-bold leading-snug text-slate-900">{item.name}</p>
                                                    <div className="flex items-start gap-2 text-[12.5px] font-medium text-red-700">
                                                        {isPhysFix ? <Wrench size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
                                                        <span>{isPhysFix ? 'Defect' : 'TMO Note'}: {item.note}</span>
                                                    </div>
                                                </div>
                                                <XCircle size={22} className="shrink-0 text-red-600" strokeWidth={2} />
                                            </div>

                                            {!isPhysFix && (
                                                <label className={`m-6 block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${hasFiles ? 'border-emerald-300 bg-emerald-50/60' : 'border-[#1D2542]/25 bg-slate-50 hover:border-[#1D2542]/50 hover:bg-[#1D2542]/[0.04]'}`}>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*,.pdf"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files?.length > 0) {
                                                                handleFileSelect(item.id, Array.from(e.target.files));
                                                            }
                                                        }}
                                                    />
                                                    <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                                        {hasFiles ? <Check size={22} /> : <UploadCloud size={22} />}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {hasFiles
                                                            ? `${hasFiles.length} file(s) selected: ${hasFiles.map(f => f.name).join(', ')}`
                                                            : 'Click to upload replacement file(s)'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">{hasFiles ? 'Files ready' : 'PDF, JPG, or PNG (Max 5MB)'}</p>
                                                </label>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div>
                                            <p className="pr-3 text-[13.5px] font-semibold leading-snug text-slate-500">{item.name}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">Approved &amp; Verified</p>
                                        </div>
                                        <StatusBadge variant="success" icon={CheckCircle2} className="shrink-0">Verified</StatusBadge>
                                    </div>
                                );
                            })}
                        </div>

                        {isPhysFix && (
                            <label className="mt-8 flex cursor-pointer items-center gap-3.5 rounded-xl border border-[#1D2542]/20 bg-[#1D2542]/[0.06] p-5 transition-colors hover:border-[#1D2542]/40">
                                <input type="checkbox" checked={repairsConfirmed} onChange={(e) => setRepairsConfirmed(e.target.checked)} className="h-5 w-5 cursor-pointer accent-[#1D2542]" />
                                <span className="cursor-pointer select-none text-sm font-semibold leading-relaxed text-slate-900">
                                    I confirm that all defects listed above have been repaired and my tricycle is ready for physical re-inspection.
                                </span>
                            </label>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4 border-t border-slate-200 pt-6">
                    <Button as={Link} href={route('operator.mtop.details', { id: app.id })} variant="secondary" size="lg">
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        loading={isSubmitting}
                        icon={isPhysFix ? Check : UploadCloud}
                    >
                        {isSubmitting ? 'Processing...' : (isPhysFix ? 'Request Re-inspection' : 'Submit Corrections')}
                    </Button>
                </div>
            </div>
        </OperatorLayout>
    );
}
