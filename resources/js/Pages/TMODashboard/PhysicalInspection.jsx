import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Check, X, CheckCircle2, Bike, AlertTriangle,
    RotateCcw, ChevronLeft, ShieldCheck, Clock,
    Smartphone, MapPin, Copy, Gauge,
    Wrench, AlertCircle, Edit3, Trash2,
    Lightbulb, Volume2, ShieldAlert,
} from 'lucide-react';
import { Modal, Button, Textarea } from '@/Components/TMO';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const CHECKLIST_ITEMS = [
    {
        id: 'headlights',
        label: 'Headlights (High / Low Beam)',
        criteria: 'Bulbs intact, toggle switch operational, high and low beams functional without glare.',
        icon: Lightbulb,
        presets: ['Busted headlight bulb', 'High beam toggle not working', 'Loose headlight wiring', 'Cracked light casing'],
    },
    {
        id: 'taillights',
        label: 'Tail Lights & Brake Lights',
        criteria: 'Rear red light illuminates with ignition; brake lights brighten immediately upon brake actuation.',
        icon: Lightbulb,
        presets: ['Brake light not responding', 'Tail light bulb busted', 'Damaged red reflector lens', 'Loose rear wire connection'],
    },
    {
        id: 'signals',
        label: 'Signal Lights & Hazard Flashers',
        criteria: 'Amber directional blinkers functional on both front and rear for left and right turns.',
        icon: AlertCircle,
        presets: ['Left flasher not blinking', 'Right flasher not blinking', 'Flasher relay failure', 'Missing front indicator lens'],
    },
    {
        id: 'horn',
        label: 'Horn & Audible Warning',
        criteria: 'Horn emits audible, loud, and steady warning sound when pressed.',
        icon: Volume2,
        presets: ['Horn completely non-functional', 'Weak or muffled sound', 'Stuck horn button', 'Disconnected horn wire'],
    },
    {
        id: 'mirrors',
        label: 'Dual Rearview Side Mirrors',
        criteria: 'Both left and right rearview mirrors present, crack-free, and adjustable for blind-spot viewing.',
        icon: ShieldCheck,
        presets: ['Missing right side mirror', 'Missing left side mirror', 'Cracked/shattered mirror glass', 'Loose mirror ball joint'],
    },
    {
        id: 'brakes',
        label: 'Brakes & Drive Chain Guard',
        criteria: 'Firm brake lever/pedal feel, prompt stopping distance, chain tension within tolerance with guard installed.',
        icon: Gauge,
        presets: ['Spongy or weak brake pedal', 'Missing chain guard cover', 'Excessively loose drive chain', 'Front brake lever stuck'],
    },
    {
        id: 'plate',
        label: 'Body Plate & Markings',
        criteria: 'LTO plate securely fastened, unobstructed, clearly visible, and matches declared credentials.',
        icon: Bike,
        presets: ['Plate number loose or hanging', 'Plate obstructed or unreadable', 'Missing mounting screws', 'Plate details do not match'],
    },
    {
        id: 'sidecar',
        label: 'Sidecar Structural Integrity',
        criteria: 'Welded chassis joints solid, passenger canopy secure, clean floorboard, and handrails intact.',
        icon: Wrench,
        presets: ['Cracked frame weld joint', 'Loose passenger canopy/roof', 'Rusted floorboard with holes', 'Missing passenger handrail'],
    },
];

function getInitials(name) {
    if (!name || name === 'N/A') return 'TD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PhysicalInspection({ application }) {
    const appData = application || {};

    const [isProcessing, setIsProcessing] = useState(false);
    const [inspectionStatuses, setInspectionStatuses] = useState(appData.inspectionStatuses || {});
    const [defectNotes, setDefectNotes] = useState(appData.defectNotes || {});
    const [copiedField, setCopiedField] = useState(null);

    // Defect Modal State
    const [activeDefectItemId, setActiveDefectItemId] = useState(null);
    const [draftNote, setDraftNote] = useState('');

    const activeItem = CHECKLIST_ITEMS.find(item => item.id === activeDefectItemId);

    // Vehicle specifications with clean fallbacks
    const vehicleData = useMemo(() => ({
        toda: appData.toda || 'Unassigned TODA',
        plate: appData.plate && appData.plate !== '—' ? appData.plate : 'UNREGISTERED',
        make: appData.make && appData.make !== 'N/A' ? appData.make : 'Declared Unit',
        year_model: appData.year_model && appData.year_model !== '—' ? appData.year_model : 'Standard',
        body_color: appData.body_color && appData.body_color !== '—' ? appData.body_color : 'Standard',
        body_type: appData.body_type && appData.body_type !== '—' ? appData.body_type : 'Tricycle',
        engine_number: appData.engine_number && appData.engine_number !== '—' ? appData.engine_number : '—',
        chassis_number: appData.chassis_number && appData.chassis_number !== '—' ? appData.chassis_number : '—',
        or_number: appData.or_number && appData.or_number !== '—' ? appData.or_number : '—',
        cr_number: appData.cr_number && appData.cr_number !== '—' ? appData.cr_number : '—',
    }), [appData]);

    // Metrics
    const totalItems = CHECKLIST_ITEMS.length;
    const passedCount = useMemo(() => {
        return CHECKLIST_ITEMS.filter(item => inspectionStatuses[item.id] === 'passed').length;
    }, [inspectionStatuses]);

    const defectCount = useMemo(() => {
        return CHECKLIST_ITEMS.filter(item => inspectionStatuses[item.id] === 'failed').length;
    }, [inspectionStatuses]);

    const checkedCount = passedCount + defectCount;
    const isAllPassed = passedCount === totalItems;
    const hasDefects = defectCount > 0;
    const progressPct = Math.round((checkedCount / totalItems) * 100);

    // Toggle or set Pass
    const handlePassItem = (id) => {
        setInspectionStatuses(prev => {
            if (prev[id] === 'passed') {
                const next = { ...prev };
                delete next[id];
                return next;
            }
            return { ...prev, [id]: 'passed' };
        });
        setDefectNotes(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    // Open Defect Modal
    const openDefectModal = (id) => {
        setActiveDefectItemId(id);
        setDraftNote(defectNotes[id] || '');
    };

    // Save Defect from Modal
    const handleSaveDefect = () => {
        if (!activeDefectItemId) return;
        const note = draftNote.trim() || 'Defect noted during on-site physical inspection.';
        setInspectionStatuses(prev => ({ ...prev, [activeDefectItemId]: 'failed' }));
        setDefectNotes(prev => ({ ...prev, [activeDefectItemId]: note }));
        setActiveDefectItemId(null);
        setDraftNote('');
    };

    // Cancel Defect Modal
    const cancelDefectModal = () => {
        setActiveDefectItemId(null);
        setDraftNote('');
    };

    // Clear an item's status
    const handleClearStatus = (id) => {
        setInspectionStatuses(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setDefectNotes(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    // Copy to clipboard
    const handleCopy = (field, text) => {
        if (!text || text === '—') return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Submit Final Action
    const handleFinalAction = (type) => {
        const isPass = type === 'pass';

        Swal.fire({
            title: isPass ? 'Confirm Passed Inspection' : 'Confirm Failed Inspection',
            html: isPass
                ? `Are you sure you want to mark <b>${appData.reference}</b> as passed? An official Municipal Payment Ticket will be issued for Cashier settlement.`
                : `Are you sure you want to record <b>${defectCount} defect(s)</b> for <b>${appData.reference}</b>? The unit will be logged for repair and re-inspection.`,
            icon: isPass ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isPass ? '#059669' : '#DC2626',
            cancelButtonColor: '#94A3B8',
            confirmButtonText: isPass ? 'Yes, Pass & Issue Payment Ticket' : 'Yes, Send for Re-inspection',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsProcessing(true);

                router.post(`/tmo/review/physical/${appData.id}`, {
                    action: isPass ? 'pass' : 'fail',
                    inspectionStatuses,
                    defectNotes,
                }, {
                    onFinish: () => setIsProcessing(false),
                });
            }
        });
    };

    const operatorInitials = getInitials(appData.operator);

    return (
        <TrivoraLayout title="Physical Inspection" role="TMO Officer">
            <Head title={`Physical Test: ${appData.reference} | TRIVORA`} />

            {/* ══════════════════════════════════════════════════════════════
                1. TOP NAVIGATION (Identical to Document Review)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 flex items-center">
                <Link
                    href="/tmo/physical"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                    <span>Back to Physical Inspection</span>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. CLEAN INTEGRATED HEADER (Identical to Document Review)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 border-b border-slate-200/80 pb-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Physical Inspection</span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                    {appData.reference || appData.id}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Submitted by <strong className="font-semibold text-slate-700">{appData.operator}</strong> · {appData.barangay ? `${appData.barangay}, ` : ''}{vehicleData.toda}
                </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. BALANCED WORKSTATION (Left: Checklist | Right: Sticky Action)
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

                {/* ── LEFT WORKING CANVAS: CHECKLIST (7 cols) ── */}
                <div className="space-y-4 lg:col-span-7">

                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        {/* Checklist Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-4 sm:px-5 py-3 sm:py-3.5 gap-3">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542] shrink-0">
                                    <ShieldCheck size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                                        Roadworthiness &amp; Safety Checklist
                                    </h2>
                                    <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                                        8 vehicle testing points. Mark each component as Passed or Defect.
                                    </p>
                                </div>
                            </div>

                            <span className="shrink-0 text-xs font-semibold text-slate-400 pt-0.5 whitespace-nowrap tabular-nums">
                                {totalItems} Items
                            </span>
                        </div>

                        {/* Checklist Items List */}
                        <div className="p-3.5 sm:p-5 space-y-3">
                            {CHECKLIST_ITEMS.map((item) => {
                                const status = inspectionStatuses[item.id];
                                const isPassed = status === 'passed';
                                const isFailed = status === 'failed';
                                const note = defectNotes[item.id];
                                const ItemIcon = item.icon;

                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-xl border transition-all p-4 ${
                                            isPassed
                                                ? 'border-emerald-200/90 bg-emerald-50/25 hover:bg-emerald-50/40 shadow-2xs'
                                                : isFailed
                                                ? 'border-rose-200 bg-rose-50/25 hover:bg-rose-50/40 shadow-2xs'
                                                : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
                                        }`}
                                    >
                                        {/* Top Row: Icon + Title/Criteria + Action Buttons */}
                                        <div className="flex items-start justify-between gap-3">
                                            {/* Left: Icon & Text */}
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                                    isPassed
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : isFailed
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {isPassed ? (
                                                        <CheckCircle2 size={18} strokeWidth={2.2} />
                                                    ) : isFailed ? (
                                                        <AlertTriangle size={18} strokeWidth={2.2} />
                                                    ) : (
                                                        <ItemIcon size={18} strokeWidth={2} />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                                        {item.label}
                                                    </p>
                                                    <p className="mt-1 text-[11.5px] sm:text-xs text-slate-500 leading-relaxed">
                                                        {item.criteria}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right Action buttons - Desktop (sm:flex) */}
                                            <div className="hidden sm:flex shrink-0 items-center gap-1.5 pt-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openDefectModal(item.id)}
                                                    title={isFailed ? 'Defect recorded (Click to edit)' : 'Flag as defect'}
                                                    className={`inline-flex h-8 sm:h-9 items-center gap-1 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all cursor-pointer ${
                                                        isFailed
                                                            ? 'bg-rose-600 text-white shadow-2xs hover:bg-rose-700'
                                                            : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
                                                    }`}
                                                >
                                                    <X size={14} strokeWidth={2.5} />
                                                    <span>Defect</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handlePassItem(item.id)}
                                                    title={isPassed ? 'Passed (Click to clear)' : 'Mark as passed'}
                                                    className={`inline-flex h-8 sm:h-9 items-center gap-1 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all cursor-pointer ${
                                                        isPassed
                                                            ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                                            : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                                                    }`}
                                                >
                                                    <Check size={14} strokeWidth={2.5} />
                                                    <span>Pass</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mobile Action Buttons: Full-width 2 buttons in one row (sm:hidden) */}
                                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 sm:hidden">
                                            <button
                                                type="button"
                                                onClick={() => openDefectModal(item.id)}
                                                className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                                                    isFailed
                                                        ? 'bg-rose-600 text-white shadow-2xs'
                                                        : 'border border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                                                }`}
                                            >
                                                <X size={15} strokeWidth={2.5} />
                                                <span>Defect</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handlePassItem(item.id)}
                                                className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] ${
                                                    isPassed
                                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                                        : 'border border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                                                }`}
                                            >
                                                <Check size={15} strokeWidth={2.5} />
                                                <span>Pass</span>
                                            </button>
                                        </div>

                                        {/* Dedicated Full-Width Defect Note Block */}
                                        {isFailed && (
                                            <div className="mt-3 pt-3 border-t border-rose-100">
                                                <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-900">
                                                    <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-rose-200/60">
                                                        <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                                                            <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                                            <span>Defect Note</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openDefectModal(item.id)}
                                                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                                                            >
                                                                <Edit3 size={11} />
                                                                <span>Edit Note</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleClearStatus(item.id)}
                                                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                                                                title="Clear defect"
                                                            >
                                                                <Trash2 size={11} />
                                                                <span>Clear</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-rose-950 font-medium leading-relaxed">
                                                        {note || 'Defect noted during physical inspection.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* TMO Field Note Box */}
                    <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                <Gauge size={17} strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                    Roadworthiness Standards &amp; Ordinances
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                    Units failing any safety-critical components (such as brakes, headlights, or frame integrity) cannot be issued a payment ticket.
                                    The tricycle driver will be directed to repair the noted defects before re-inspection.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── RIGHT STICKY CONTROL SIDEBAR: (5 cols) ── */}
                <div className="space-y-5 lg:col-span-5 lg:sticky lg:top-6 self-start">

                    {/* Box 1: Sticky Inspection Decision Card */}
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <ShieldAlert size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Inspection Decision</h3>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                isAllPassed
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : hasDefects
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                                {isAllPassed ? 'Passed (Ready)' : hasDefects ? 'Needs Repair' : 'In Progress'}
                            </span>
                        </div>

                        {/* Progress Meter */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                                <span className="text-slate-600">Checklist Progress</span>
                                <span className="tabular-nums text-slate-900 font-bold">
                                    {checkedCount} of {totalItems} Tested
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full transition-all duration-300 rounded-full ${
                                        isAllPassed ? 'bg-emerald-500' : hasDefects ? 'bg-rose-500' : 'bg-slate-700'
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Status Counter Deck */}
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2">
                                <span className="block text-base font-extrabold text-emerald-700 tabular-nums">{passedCount}</span>
                                <span className="block text-[10px] font-semibold text-emerald-800">Passed</span>
                            </div>
                            <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-2">
                                <span className="block text-base font-extrabold text-rose-700 tabular-nums">{defectCount}</span>
                                <span className="block text-[10px] font-semibold text-rose-800">Defects</span>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                <span className="block text-base font-extrabold text-slate-700 tabular-nums">{totalItems - checkedCount}</span>
                                <span className="block text-[10px] font-semibold text-slate-500">Remaining</span>
                            </div>
                        </div>

                        {/* Decision Prompt & Action Buttons */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            {isAllPassed ? (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                                        <div className="flex items-center gap-1.5 font-bold mb-1">
                                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                            <span>All 8 Checks Passed</span>
                                        </div>
                                        <p className="text-[11.5px] leading-relaxed text-emerald-700">
                                            The vehicle complies with all roadworthiness requirements. Submit to generate the official Municipal Payment Ticket.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleFinalAction('pass')}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                    >
                                        <CheckCircle2 size={15} strokeWidth={2.2} />
                                        <span>Pass Inspection &amp; Issue Payment Ticket</span>
                                    </button>
                                </div>
                            ) : hasDefects ? (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-800">
                                        <div className="flex items-center gap-1.5 font-bold mb-1">
                                            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                                            <span>{defectCount} Defect(s) Identified</span>
                                        </div>
                                        <p className="text-[11.5px] leading-relaxed text-rose-700">
                                            The vehicle has recorded defects. Log the failure so the operator can complete repairs and schedule re-inspection.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleFinalAction('fail')}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                    >
                                        <RotateCcw size={15} strokeWidth={2.2} />
                                        <span>Record Defects &amp; Send for Re-inspection</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                        <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-800">
                                            <Clock size={14} className="text-amber-500 shrink-0" />
                                            <span>Testing In Progress</span>
                                        </div>
                                        <p className="text-[11.5px] leading-relaxed text-slate-500">
                                            Test each of the 8 roadworthiness items on the left. The decision button will activate when all items are reviewed.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled
                                        className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                                    >
                                        <span>Check All 8 Items to Continue</span>
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
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Applicant Details</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-xs font-bold text-white shadow-2xs">
                                {operatorInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs sm:text-sm font-bold text-slate-900">{appData.operator || 'N/A'}</p>
                                <p className="truncate text-xs text-slate-500 font-medium">Registered Operator</p>
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
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
                                <span className="font-semibold text-slate-800 truncate max-w-[180px] text-right">{appData.barangay || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Box 3: Tricycle Registration & Unit Details (All 10 Declared Specifications) */}
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
                                <span className="text-slate-500 font-medium">TODA Assignment</span>
                                <span className="font-semibold text-slate-800 truncate max-w-[180px] text-right">
                                    {vehicleData.toda}
                                </span>
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
                                <span className="font-mono text-slate-800 font-semibold text-xs">
                                    {vehicleData.or_number}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">LTO CR Number</span>
                                <span className="font-mono text-slate-800 font-semibold text-xs">
                                    {vehicleData.cr_number}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* ── Defect Note Modal (Using Standard TMO Modal Component) ── */}
            <Modal
                show={activeDefectItemId !== null}
                onClose={cancelDefectModal}
                title={`Defect Report: ${activeItem?.label || 'Component'}`}
                description="Describe what failed during physical inspection"
                footer={
                    <>
                        <Button variant="secondary" onClick={cancelDefectModal}>Cancel</Button>
                        <Button variant="dangerSolid" onClick={handleSaveDefect}>Confirm Defect</Button>
                    </>
                }
            >
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-700">
                    {activeItem?.label}
                </p>

                {/* Quick preset chips */}
                {activeItem?.presets && activeItem.presets.length > 0 && (
                    <div className="mb-3">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Reasons</p>
                        <div className="flex flex-wrap gap-1.5">
                            {activeItem.presets.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setDraftNote(preset)}
                                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                                        draftNote === preset
                                            ? 'border-rose-300 bg-rose-50 text-rose-800 font-semibold'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Inspector Observations</p>
                <Textarea
                    rows={3}
                    placeholder="e.g., Busted bulb, loose brakes, cracked mirror…"
                    value={draftNote}
                    onChange={e => setDraftNote(e.target.value)}
                    autoFocus
                />
            </Modal>
        </TrivoraLayout>
    );
}
