import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Check, X, CheckCircle2, Bike, Gauge, MessageSquare, AlertTriangle,
    RefreshCw, Search, MapPin,
} from 'lucide-react';
import { BackLink, Modal, Button, Textarea } from '@/Components/TMO';

export default function PhysicalInspection({ application }) {
    const appData = application || {
        operator: 'Juan Dela Cruz',
        id: 'NSB-26-8812',
        make: 'Kawasaki Barako 175',
        engine_number: 'ENG-KAW-12345',
        chassis_number: 'CHAS-KAW-98765',
        plate: 'NSB-2024-ABC',
        toda: 'TODA A (Poblacion)',
        inspectionStatuses: {},
        defectNotes: {},
    };

    const [isProcessing, setIsProcessing] = useState(false);
    const [inspectionStatuses, setInspectionStatuses] = useState(appData.inspectionStatuses || {});
    const [defectNotes, setDefectNotes] = useState(appData.defectNotes || {});

    // Defect note modal state
    const [pendingFailId, setPendingFailId] = useState(null);
    const [draftNote, setDraftNote] = useState('');

    // Ensure all properties have values
    const vehicleData = {
        make: appData?.make || 'Kawasaki Barako 175',
        engine_number: appData?.engine_number || 'ENG-KAW-12345',
        chassis_number: appData?.chassis_number || 'CHAS-KAW-98765',
        plate: appData?.plate || 'NSB-2024-ABC',
        toda: appData?.toda || 'TODA A (Poblacion)',
    };

    const items = [
        { id: 'headlights', label: 'Headlights (High/Low Beam)' },
        { id: 'taillights', label: 'Tail Lights & Brake Lights' },
        { id: 'signals',    label: 'Signal Lights (Left/Right)' },
        { id: 'horn',       label: 'Horn (Working/Loud)' },
        { id: 'mirrors',    label: 'Side Mirrors (Complete Pair)' },
        { id: 'brakes',     label: 'Brakes & Drive Chain' },
        { id: 'plate',      label: 'Body Plate Attachment' },
        { id: 'sidecar',    label: 'Sidecar Structural Integrity' },
    ];

    const handlePass = (id) => {
        setInspectionStatuses(prev => ({ ...prev, [id]: 'passed' }));
        setDefectNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const openFailModal = (id) => {
        setPendingFailId(id);
        setDraftNote(defectNotes[id] || '');
    };

    const confirmFail = () => {
        const note = draftNote.trim() || 'Defective';
        setInspectionStatuses(prev => ({ ...prev, [pendingFailId]: 'failed' }));
        setDefectNotes(prev => ({ ...prev, [pendingFailId]: note }));
        setPendingFailId(null);
        setDraftNote('');
    };

    const cancelFail = () => {
        setPendingFailId(null);
        setDraftNote('');
    };

    const anyFailed = Object.values(inspectionStatuses).some(s => s === 'failed');
    const allPassed = items.every(item => inspectionStatuses[item.id] === 'passed');

    const handleFinalAction = (type) => {
        const isPass = type === 'pass';

        Swal.fire({
            title: isPass ? 'Confirm Passed Inspection' : 'Confirm Failed Inspection',
            html: isPass
                ? `Are you sure you want to mark <b>${appData.reference}</b> as passed? An official Municipal Payment Ticket will be generated for Cashier payment.`
                : `Are you sure you want to fail <b>${appData.reference}</b>? The operator will be notified to repair the defects.`,
            icon: isPass ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isPass ? '#059669' : '#DC2626',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: isPass ? 'Yes, Pass & Issue Payment Ticket' : 'Yes, Send for Re-inspection',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);

                router.post(`/tmo/review/physical/${appData.id}`, {
                    action: isPass ? 'pass' : 'fail',
                    inspectionStatuses: inspectionStatuses,
                    defectNotes: defectNotes,
                }, {
                    onFinish: () => setIsProcessing(false),
                });
            }
        });
    };

    const pendingItem = items.find(i => i.id === pendingFailId);

    return (
        <TrivoraLayout title="Physical Inspection" role="TMO Officer">
            <Head title={`Physical Test: ${appData.reference} | TRIVORA`} />

            {/* ── Defect Note Modal ── */}
            <Modal
                show={pendingFailId !== null}
                onClose={cancelFail}
                title="Defect Note"
                description="Describe what failed during inspection"
                footer={
                    <>
                        <Button variant="secondary" onClick={cancelFail}>Cancel</Button>
                        <Button variant="dangerSolid" onClick={confirmFail}>Confirm Failure</Button>
                    </>
                }
            >
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-700">
                    {pendingItem?.label}
                </p>
                <Textarea
                    rows={3}
                    placeholder="e.g., Busted bulb, loose brakes, cracked mirror…"
                    value={draftNote}
                    onChange={e => setDraftNote(e.target.value)}
                    autoFocus
                />
            </Modal>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <BackLink href="/tmo/physical">Cancel &amp; Return to Queue</BackLink>
                <span className="rounded-full border border-tmo-primary/20 bg-tmo-primarySoft px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-tmo-primary">
                    Inspecting: {appData.reference}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">

                {/* ════ LEFT: Vehicle Specs ════ */}
                <div className="overflow-hidden rounded-2xl border-[1.5px] border-tmo-primary/20 bg-tmo-primarySoft/40 shadow-sm">
                    <div className="p-7">
                        <div className="mb-6 flex flex-col items-center border-b border-tmo-primary/15 pb-6 text-center">
                            <div className="mb-4 flex h-[76px] w-[76px] items-center justify-center rounded-2xl border-[1.5px] border-tmo-primary/25 bg-tmo-primarySoft text-tmo-primary">
                                <Bike size={30} strokeWidth={1.6} />
                            </div>
                            <p className="mb-1.5 text-[17px] font-extrabold tracking-tight text-tmo-ink">{vehicleData.make}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-tmo-muted">Vehicle Specs</p>
                        </div>

                        <div className="flex flex-col gap-5">
                            <ProfileField icon={Bike} label="Make & Model" value={vehicleData.make} />
                            <ProfileField icon={Gauge} label="Engine Number" value={vehicleData.engine_number} />
                            <ProfileField icon={Gauge} label="Chassis Number" value={vehicleData.chassis_number} />
                            <ProfileField icon={Bike} label="Plate Number" value={vehicleData.plate} />
                            <ProfileField icon={MapPin} label="TODA Assignment" value={vehicleData.toda} />
                        </div>
                    </div>
                </div>

                {/* ════ RIGHT: Checklist ════ */}
                <div className="overflow-hidden rounded-2xl border border-tmo-border bg-tmo-surface shadow-sm">
                    <div className="p-7">

                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-tmo-primary">Phase 2 · Physical Inspection</p>
                        <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-tmo-ink">Inspection Checklist</h2>

                        {/* Inspection items */}
                        <div className="mb-7 flex flex-col gap-2.5">
                            {items.map((item) => {
                                const status = inspectionStatuses[item.id];
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between gap-3.5 rounded-xl border p-4 transition-colors ${
                                            status === 'passed'
                                                ? 'border-emerald-300 bg-emerald-50/60'
                                                : status === 'failed'
                                                ? 'border-red-300 bg-red-50/60'
                                                : 'border-tmo-border bg-tmo-bg'
                                        }`}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                                                status === 'passed' ? 'border-emerald-300 bg-emerald-100 text-emerald-600'
                                                : status === 'failed' ? 'border-red-300 bg-red-100 text-red-600'
                                                : 'border-tmo-border bg-white text-tmo-subtle'
                                            }`}>
                                                <Gauge size={17} strokeWidth={2} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`mb-1 text-[12.5px] font-semibold leading-tight ${
                                                    status === 'passed' ? 'text-emerald-900' : status === 'failed' ? 'text-red-900' : 'text-tmo-ink'
                                                }`}>
                                                    {item.label}
                                                </p>
                                                {status === 'failed' && (
                                                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                                                        <MessageSquare size={9} strokeWidth={2.5} />
                                                        {defectNotes[item.id]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <button
                                                onClick={() => handlePass(item.id)}
                                                title="Pass"
                                                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                                    status === 'passed'
                                                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                                        : 'border-tmo-border bg-white text-tmo-subtle hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600'
                                                }`}
                                            >
                                                <Check size={16} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => openFailModal(item.id)}
                                                title="Fail"
                                                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                                    status === 'failed'
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
                        <div className="mb-1 flex flex-col items-center rounded-xl border border-tmo-border bg-tmo-bg px-8 py-10 text-center">
                            {allPassed ? (
                                <>
                                    <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-tmo-primary text-white shadow-lg">
                                        <CheckCircle2 size={28} strokeWidth={2} />
                                    </div>
                                    <p className="mb-2 text-xl font-extrabold tracking-tight text-tmo-ink">Inspection Passed</p>
                                    <p className="mb-7 max-w-[280px] text-[11px] font-semibold uppercase leading-relaxed tracking-wide text-tmo-muted">
                                        All safety and roadworthiness components passed. Issue official Municipal Payment Ticket for Cashier OTC settlement.
                                    </p>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="w-full max-w-[340px]"
                                        icon={isProcessing ? undefined : CheckCircle2}
                                        loading={isProcessing}
                                        onClick={() => handleFinalAction('pass')}
                                    >
                                        Pass Inspection &amp; Issue Payment Ticket
                                    </Button>
                                </>
                            ) : anyFailed ? (
                                <>
                                    <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600">
                                        <AlertTriangle size={28} strokeWidth={2} />
                                    </div>
                                    <p className="mb-2 text-xl font-extrabold tracking-tight text-red-600">Inspection Failed</p>
                                    <p className="mb-7 max-w-[280px] text-[11px] font-semibold uppercase leading-relaxed tracking-wide text-tmo-muted">
                                        Unit has defects. Notify operator to repair and return.
                                    </p>
                                    <Button
                                        variant="dangerSolid"
                                        size="lg"
                                        className="w-full max-w-[340px]"
                                        icon={isProcessing ? undefined : RefreshCw}
                                        loading={isProcessing}
                                        onClick={() => handleFinalAction('fail')}
                                    >
                                        Send for Re-inspection
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl border border-tmo-border bg-white text-tmo-subtle">
                                        <Search size={22} strokeWidth={1.8} />
                                    </div>
                                    <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-tmo-subtle">Awaiting Field Check</p>
                                    <p className="max-w-[260px] text-[8.5px] font-semibold uppercase leading-relaxed tracking-wide text-tmo-subtle">
                                        Perform physical check on the unit. Mark each item as Passed or Failed.
                                    </p>
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
