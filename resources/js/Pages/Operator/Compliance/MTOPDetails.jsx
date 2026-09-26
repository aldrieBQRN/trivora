import React from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { BackLink, Button } from '@/Components/TMO';
import {
    FileText, CheckCircle2, Clock, AlertCircle,
    Bike, FileSearch, ClipboardCheck, Stamp, AlertTriangle,
    XCircle, Wrench, Settings, RefreshCw, RotateCcw,
    Wallet, Receipt, CreditCard, Calendar, ShieldCheck, Check, User,
} from 'lucide-react';
import { PHYSICAL_INSPECTION_ITEMS } from '@/data/physicalInspectionItems';

/* ─────────────────────── Sub-components ────────────────────────────── */

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// and Operator panels, so this page reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const DOC_STATUS_CLASSES = {
    approved: 'text-emerald-700 bg-emerald-50',
    pending: 'text-amber-700 bg-amber-50',
    rejected: 'text-red-700 bg-red-50',
    na: 'text-slate-500 bg-slate-50',
};

const BRAND_ICON_CHIP = 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]';

function Card({ icon: Icon, title, headerTone, children, className = '' }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW} ${className}`}>
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                {Icon && (
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${headerTone || 'bg-slate-100 text-slate-400'}`}>
                        <Icon size={16} />
                    </div>
                )}
                <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

const FullChecklistRow = ({ item, isPhys }) => (
    <div className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors ${item.status === 'rejected' ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-white hover:bg-slate-50/60'}`}>
        <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.status === 'rejected' ? 'bg-gradient-to-br from-red-500/[0.14] to-red-500/[0.02] text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                {item.status === 'rejected' ? <XCircle size={16} /> : isPhys ? <Wrench size={15} /> : <FileText size={16} />}
            </div>
            <div className="min-w-0">
                <p className="text-[13px] font-bold leading-snug text-slate-900">{item.name}</p>
                {/* Openable link — only for requirements with an actually-uploaded file */}
                {!isPhys && item.url && (
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                        <FileSearch size={13} className="shrink-0" />
                        <span className="truncate">{item.file_name || 'View uploaded file'}</span>
                    </a>
                )}
                {item.status === 'rejected' && (
                    <p className="mt-1 flex items-start gap-1.5 text-[11.5px] font-semibold leading-snug text-red-700">
                        <AlertCircle size={13} className="mt-0.5 shrink-0" />
                        <span>{isPhys ? `Defect: ${item.note}` : item.note}</span>
                    </p>
                )}
            </div>
        </div>
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${DOC_STATUS_CLASSES[item.status] || DOC_STATUS_CLASSES.na}`}>
            {item.status === 'na' ? 'N/A' : item.status}
        </span>
    </div>
);

// Shared compact card used by both Document Verification and Physical Inspection summaries:
// an overall status line (the single verdict — never a per-item one) followed by every
// checklist item rendered as a pill, so both cards list their items the same way.
// `itemLabel` lets callers read `name` (documents) or `label` (inspection items).
const CompactChecklist = ({ title, icon: Icon, items, statusLine, itemLabel = (item) => item.name }) => (
    <Card icon={Icon} title={title} headerTone={BRAND_ICON_CHIP}>
        <div className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            <CheckCircle2 size={13} className="text-emerald-600" />
            {statusLine || `All ${items.length} verified`}
        </div>
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <div key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11.5px] font-semibold text-slate-900">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {itemLabel(item)}
                    {/* Openable link for summary pills too — only when a file exists */}
                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Open ${item.file_name || item.name}`}
                            className="ml-0.5 text-indigo-500 hover:text-indigo-700"
                        >
                            <FileSearch size={12} className="shrink-0" />
                        </a>
                    )}
                </div>
            ))}
        </div>
    </Card>
);

const SettlementCard = ({ payment }) => (
    <Card icon={Receipt} title="Settlement Details" headerTone={BRAND_ICON_CHIP}>
        <div className="divide-y divide-dashed divide-slate-200">
            <PayRow label="Payment Method">
                <span className="flex items-center gap-1.5">
                    {payment.method.includes('Cash') ? <Wallet size={14} className="text-slate-400" /> : <CreditCard size={14} className="text-slate-400" />}
                    {payment.method}
                </span>
            </PayRow>
            <PayRow label="Reference Number"><span className="font-mono text-[13px] tracking-wide">{payment.ref}</span></PayRow>
            <PayRow label="Amount Paid"><span className="font-bold">₱{payment.amount.toFixed(2)}</span></PayRow>
            <PayRow label="Payment Date">{payment.date}</PayRow>
        </div>
    </Card>
);

function PayRow({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
            <span className="text-sm font-semibold text-slate-900">{children}</span>
        </div>
    );
}

// fullWidth: rendered with no Settlement card beside it, this card spans the entire
// content width — so its details spread into columns and fill it instead of stacking
// down the left edge and leaving the right side empty. Beside a Settlement card it
// stays half width and keeps the original stacked rhythm.
const BPLOCard = ({ bplo, stickerNumber, fullWidth = false }) => {
    const restrictDaysStr = bplo.colorCoding?.restrictedDays?.join(', ') || 'N/A';

    return (
        <Card icon={Stamp} title="BPLO Issuance & Coding" headerTone={BRAND_ICON_CHIP}>
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-[#1D2542]/25 bg-[#1D2542]/[0.05] p-4">
                    <div>
                        <span className="block text-[10px] font-bold uppercase leading-tight text-[#1D2542]/70">
                            Assigned Sticker<br />Number
                        </span>
                        <span className="text-2xl font-black tracking-tight text-[#1D2542]">{bplo.assignedStickerNumber}</span>
                    </div>
                    {bplo.colorCoding && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-semibold uppercase text-slate-400">Color Coding Scheme</span>
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                                style={{ backgroundColor: `${bplo.colorCoding.colorHex}15`, color: bplo.colorCoding.colorHex }}
                            >
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bplo.colorCoding.colorHex }} />
                                {bplo.colorCoding.name}
                            </span>
                        </div>
                    )}
                </div>

                <div className={fullWidth ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-5'}>
                    <div className="flex items-start gap-3">
                        <Calendar size={16} className="mt-0.5 shrink-0 text-slate-400" />
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Validity Period</p>
                            <p className="mt-0.5 text-[13px] font-medium text-slate-900">{bplo.issueDate} &mdash; {bplo.expiryDate}</p>
                        </div>
                    </div>

                    {bplo.colorCoding && (
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-slate-400" />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Restricted Travel Day</p>
                                <p className="mt-0.5 text-[13px] font-semibold text-slate-900">No Travel on <span className="underline">{restrictDaysStr}s</span></p>
                            </div>
                        </div>
                    )}

                    {stickerNumber && (
                        <div className="flex items-start gap-3">
                            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#1D2542]" />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Franchise Number</p>
                                <p className="mt-0.5 font-mono text-sm font-bold text-[#1D2542]">{stickerNumber}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

// Empty counterpart to BPLOCard: an approved/active application whose Sticker Number
// has not been issued yet states that plainly instead of inventing a colour, number,
// or restricted day (the assigned scheme always comes from the backend — app.bplo).
const CodingSchemeEmptyState = () => (
    <Card icon={Stamp} title="Sticker Number & Color Coding" headerTone={BRAND_ICON_CHIP}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-9 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Stamp size={20} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">Not yet assigned</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                No Sticker Number has been assigned to this application yet.
                Your assigned color scheme, Sticker Number, and restricted travel days will
                appear here once BPLO issues them.
            </p>
        </div>
    </Card>
);

const HERO_TONES = {
    error:   { border: 'border-red-200',        bg: 'bg-red-50',           iconBg: 'bg-white',  iconColor: 'text-red-600',     title: 'text-red-900' },
    warn:    { border: 'border-amber-200',      bg: 'bg-amber-50',         iconBg: 'bg-white',  iconColor: 'text-amber-700',   title: 'text-amber-900' },
    info:    { border: 'border-[#1D2542]/20',   bg: 'bg-[#1D2542]/[0.06]', iconBg: 'bg-white',  iconColor: 'text-[#1D2542]',   title: 'text-[#1D2542]' },
    success: { border: 'border-emerald-200',    bg: 'bg-emerald-50',       iconBg: 'bg-white',  iconColor: 'text-emerald-700', title: 'text-emerald-900' },
};

/**
 * Full-width status hero — the single always-present focal point of the page.
 * Same 4 tones/copy as the workflow states below; the primary action (when one
 * exists) sits top-right where users expect the main call to action, instead of
 * being buried in a narrow sidebar under a paragraph.
 */
function StatusHero({ tone, icon: Icon, eyebrow, title, children, action }) {
    const t = HERO_TONES[tone] || HERO_TONES.info;
    return (
        <div className={`mb-5 rounded-2xl border ${t.border} ${t.bg} p-6 sm:p-7`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.iconBg} ${t.iconColor} shadow-2xs`}>
                        <Icon size={22} />
                    </div>
                    <div className="min-w-0">
                        {eyebrow && (
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${t.iconColor}`}>{eyebrow}</p>
                        )}
                        <h1 className={`mt-0.5 text-lg font-bold leading-tight sm:text-xl ${t.title}`}>{title}</h1>
                        <div className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-700">{children}</div>
                    </div>
                </div>
                {action && <div className="shrink-0 sm:pl-2">{action}</div>}
            </div>
        </div>
    );
}

const PHASE_EYEBROWS = {
    'tmo-docs':          'Document Review',
    'tmo-phys-inspect':  'Physical Inspection',
    'bplo-release':      'BPLO Release: Sticker & Plate for Coding',
    'tmo-final-confirm': 'Final Confirmation & GPS Setup',
    'completed':         'Franchise Status',
};

/**
 * Compact horizontal progress strip — replaces the old fixed-height vertical
 * tracker. Every phase now costs the same small amount of vertical space here,
 * so the page's height reflects the phase's actual content instead of a
 * constant tracker forcing every other region to look short by comparison.
 */
function HorizontalTracker({ steps, phaseIdx, stepDates = {} }) {
    const getStepState = (index) => {
        if (index < phaseIdx) return 'done';
        if (index === phaseIdx) return 'current';
        return 'waiting';
    };

    const isComplete = phaseIdx >= steps.length;
    const current = steps[Math.min(phaseIdx, steps.length - 1)];

    return (
        <div className="mb-6">
            <div className="flex items-center">
                {steps.map((step, idx) => {
                    const state = getStepState(idx);
                    const Icon = step.icon;
                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-1.5">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors ${
                                    state === 'done' ? 'border-emerald-600 text-emerald-600' :
                                    state === 'current' ? 'border-[#1D2542] text-[#1D2542] ring-4 ring-[#1D2542]/15' :
                                    'border-slate-200 text-slate-400'
                                }`}>
                                    {state === 'done' ? <Check size={14} strokeWidth={3} /> : <Icon size={12} />}
                                </div>
                                <span
                                    className={`hidden text-center text-[10px] font-semibold leading-tight sm:block ${state === 'waiting' ? 'text-slate-400' : 'text-slate-900'}`}
                                    style={{ maxWidth: 78 }}
                                >
                                    {step.title}
                                </span>
                                {/* Real completion date for a cleared step, straight from the
                                    application's status history — never a hardcoded demo date. */}
                                {state === 'done' && stepDates[step.id] && (
                                    <span
                                        className="hidden text-center text-[9px] font-semibold leading-tight text-emerald-600 sm:block"
                                        style={{ maxWidth: 78 }}
                                    >
                                        {stepDates[step.id]}
                                    </span>
                                )}
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`mx-1 h-0.5 flex-1 rounded-full ${idx < phaseIdx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            <p className="mt-2.5 text-[11px] font-semibold text-slate-500 sm:hidden">
                {isComplete ? 'All steps completed' : `Step ${phaseIdx + 1} of ${steps.length} • ${current?.title}`}
            </p>
        </div>
    );
}

export default function MTOPDetails({ application }) {
    const app = application;

    // Background refresh of this MTOP application: a TMO/BPLO decision made elsewhere advances
    // the tracker without a manual reload. Display-only page — no form or modal state to disturb.
    useBackgroundRefresh(['application']);

    const phaseOrder = ['tmo-docs', 'tmo-phys-inspect', 'bplo-release', 'tmo-final-confirm', 'completed'];
    const phaseIdx = Math.max(0, phaseOrder.indexOf(app.phase));

    const showDocsFull = phaseIdx === 0;
    const showDocsSummary = phaseIdx >= 1;
    const showPhysFull = phaseIdx === 1;
    const showPhysSummary = phaseIdx >= 2;

    // ── Coding Scheme visibility ─────────────────────────────────────────────
    // Keyed to the application having REACHED approved/active (phase 'completed'),
    // never to a verified Payment row. The in-system payment-verification step was
    // retired, so no Payment row is ever created anymore — keying the Coding Scheme
    // block to app.payment silently hid it for every approved/active application.
    // Settlement, by contrast, genuinely needs a real payment row to show anything.
    const showCodingScheme = app.phase === 'completed';
    const showSettlement = Boolean(app.payment);

    const trackerSteps = [
        { id: 'tmo-docs', title: 'Document Review', icon: FileSearch },
        { id: 'tmo-phys-inspect', title: 'Vehicle Inspection', icon: ClipboardCheck },
        { id: 'bplo-release', title: 'BPLO Release', icon: Stamp },
        { id: 'tmo-final-confirm', title: 'Final Confirmation', icon: CheckCircle2 },
    ];

    const isExpiredState = app.status === 'expired' || app.status === 'expired-unrenewed' || app.status === 'expired-renewed';
    const isRenewedExpired = app.status === 'expired-renewed' || app.has_pending_renewal;

    const eyebrow = PHASE_EYEBROWS[app.phase];

    return (
        <OperatorLayout title={`Application ${app.id}`} operatorName={app.operatorName}>
            <Head title={`View ${app.id} | TRIVORA`} />

            <div className="mx-auto max-w-[1400px] pb-10">
                <div className="mb-2 flex items-center justify-between">
                    <BackLink href={route('operator.mtop')}>Back to Applications</BackLink>
                    <span className="rounded-md border border-[#1D2542]/20 bg-[#1D2542]/[0.06] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-[#1D2542]">
                        {app.id}
                    </span>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{app.type} Application</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Submitted on {app.date}
                        {app.last_updated && <> &bull; Status updated {app.last_updated}</>}
                    </p>
                </div>

                {/* ── STATUS HERO — one always-present focal point per phase ── */}

                {app.status === 'action-req' && app.phase === 'tmo-docs' && (
                    <StatusHero
                        tone="error" icon={AlertCircle} eyebrow={eyebrow} title="Documents Rejected"
                        action={
                            <Button as={Link} href={route('operator.mtop.fix', { id: app.id })} variant="dangerSolid" size="md" icon={FileText} className="whitespace-nowrap">
                                Re-upload Documents
                            </Button>
                        }
                    >
                        One or more uploaded documents were rejected by TMO. Review the deficiency notes below and re-upload valid files to proceed.
                    </StatusHero>
                )}

                {app.status === 'in-progress' && app.phase === 'tmo-docs' && (
                    <StatusHero tone="info" icon={FileSearch} eyebrow={eyebrow} title="Documents Under Review">
                        Your uploaded requirements are currently being evaluated by TMO personnel. Once approved, you will be instructed to bring your tricycle for physical inspection.
                    </StatusHero>
                )}

                {app.status === 'action-req' && app.phase === 'tmo-phys-inspect' && (
                    <StatusHero
                        tone="error"
                        icon={Wrench}
                        eyebrow="Physical Inspection"
                        title="Reinspection Required"
                        action={
                            <Button as={Link} href={route('operator.mtop.fix', { id: app.id })} variant="dangerSolid" size="md" icon={Wrench} className="whitespace-nowrap">
                                Confirm Ready for Reinspection
                            </Button>
                        }
                    >
                        <p>
                            The physical inspection was not approved and reinspection is required. Please address the issues listed below and confirm when the vehicle is ready for reinspection.
                        </p>
                        {app.rejection_reason && (
                            <div className="mt-3.5 rounded-xl border border-red-200 bg-white/90 p-3.5 text-xs text-red-950 font-medium shadow-2xs">
                                <span className="font-bold text-red-900 block mb-1 text-[11px] uppercase tracking-wider">
                                    Reason for Reinspection:
                                </span>
                                <blockquote className="border-l-2 border-red-500 pl-2.5 italic text-slate-800">
                                    {app.rejection_reason}
                                </blockquote>
                            </div>
                        )}
                    </StatusHero>
                )}

                {app.status === 'in-progress' && app.phase === 'tmo-phys-inspect' && (
                    app.is_ready_for_reinspection ? (
                        <StatusHero tone="info" icon={RotateCcw} eyebrow="Physical Inspection" title="Ready for Reinspection">
                            You have confirmed that the vehicle is ready for reinspection. Please bring your tricycle unit to the TMO inspection compound for physical re-inspection.
                        </StatusHero>
                    ) : (
                        <StatusHero tone="info" icon={ClipboardCheck} eyebrow={eyebrow} title="Bring Tricycle for Inspection">
                            Application requirements approved! Please bring your tricycle unit to the TMO inspection compound for physical roadworthiness and safety inspection.
                        </StatusHero>
                    )
                )}

                {/* The system never verifies payment — this single phase covers the whole window
                    from "inspection passed" through "pay at the Treasurer's Office" to "go to
                    BPLO for release." There's no separate in-system verification step to report
                    an issue with. */}
                {app.phase === 'bplo-release' && (
                    <StatusHero tone="warn" icon={Wallet} eyebrow={eyebrow} title="Proceed to Municipal Treasurer's Office">
                        <p>
                            Physical inspection passed! Please proceed to the <strong>Municipal Treasurer's Office</strong> to complete the required cashier payment, then proceed to <strong>BPLO</strong> for sticker and plate release.
                        </p>
                    </StatusHero>
                )}

                {app.phase === 'tmo-final-confirm' && (
                    <StatusHero tone="warn" icon={ShieldCheck} eyebrow={eyebrow} title="Sticker Released &bull; Return to TMO">
                        BPLO has officially released your franchise sticker and coding plate! Return to the <strong>Tricycle Management Office (TMO)</strong> counter with your tricycle unit to set up your tracking method (Mobile GPS or IoT Device) and receive final franchise permit activation.
                    </StatusHero>
                )}

                {isExpiredState && (
                    <StatusHero
                        tone={isRenewedExpired ? 'warn' : 'error'}
                        icon={isRenewedExpired ? Clock : AlertCircle}
                        eyebrow={eyebrow}
                        title={isRenewedExpired ? 'Franchise Expired (Renewal In Progress)' : 'Franchise Expired'}
                        action={app.can_renew ? (
                            <Button as={Link} href={route('operator.mtop.create', { type: 'renewal', unit_id: app.tricycle_id })} variant="dangerSolid" size="md" icon={RefreshCw} className="whitespace-nowrap">
                                Renew Expired Franchise
                            </Button>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                                <Clock size={14} /> Renewal In Progress
                            </span>
                        )}
                    >
                        {isRenewedExpired
                            ? 'Your MTOP Franchise Permit has expired. A renewal application has already been submitted and is currently undergoing review.'
                            : 'Your MTOP Franchise Permit for this tricycle unit has expired. Submit a renewal application to maintain compliance and keep operating legally.'}
                    </StatusHero>
                )}

                {app.status === 'completed' && !app.is_expired && (
                    <StatusHero tone="success" icon={CheckCircle2} eyebrow={eyebrow} title="Franchise Active">
                        Your franchise is fully active — your sticker is in hand and your GPS tracking setup is complete. You're clear to operate.
                    </StatusHero>
                )}

                {/* ── PROCESS TRACKER — one compact strip for every phase ── */}
                <HorizontalTracker steps={trackerSteps} phaseIdx={phaseIdx} stepDates={app.step_dates} />

                {/* ── CONTENT ── */}
                <div className="space-y-5">

                    <Card icon={User} title="Applicant Information — Tricycle Owner">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            <InfoItem label="Full Name" value={app.owner?.full_name || app.operatorName || '—'} />
                            <InfoItem label="Birthday" value={app.owner?.birthday || '—'} />
                            <InfoItem label="Mobile Number" value={app.owner?.contact_number || '—'} />
                            <InfoItem label="Barangay" value={app.owner?.barangay || '—'} />
                        </div>
                        <div className="mt-4 rounded-xl border border-dashed border-indigo-300/70 bg-indigo-50/50 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-600">Tricycle Driver</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${app.ownerIsDriver ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {app.ownerIsDriver ? 'Same as Owner' : 'Different Person'}
                                </span>
                            </div>
                            {app.ownerIsDriver ? (
                                <p className="mt-2 text-xs text-slate-600">The Tricycle Owner drives their own unit — no separate driver on file.</p>
                            ) : app.tricycleDriver ? (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</span>
                                        <span className="font-semibold text-slate-800">{app.tricycleDriver.full_name || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Birthday</span>
                                        <span className="font-semibold text-slate-800">{app.tricycleDriver.birthday || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile</span>
                                        <span className="font-semibold text-slate-800">{app.tricycleDriver.contact_number || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Barangay</span>
                                        <span className="font-semibold text-slate-800">{app.tricycleDriver.barangay || '—'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-2 text-xs text-slate-500">No separate driver provided.</p>
                            )}
                        </div>
                    </Card>

                    <Card icon={Bike} title="Tricycle Information">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            <InfoItem label="Make & Model" value={app.make} />
                            <InfoItem label="Plate Number" value={app.plate} />
                            <InfoItem label="Engine Number" value={app.engine} />
                            <InfoItem label="Chassis Number" value={app.chassis} />
                        </div>
                    </Card>

                    {showDocsFull && (
                        <Card icon={FileText} title="Document Verification">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {app.documents.map((doc) => (
                                    <FullChecklistRow key={doc.id} item={doc} isPhys={false} />
                                ))}
                            </div>
                        </Card>
                    )}

                    {showDocsSummary && !showPhysSummary && (
                        <CompactChecklist title="Document Verification" icon={FileText} items={app.documents} />
                    )}

                    {showPhysFull && (
                        <Card icon={Settings} title="Physical Inspection">
                            {app.status === 'action-req' && (
                                <div className="mb-5 rounded-xl border border-red-200 bg-red-50/70 p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-2 border-b border-red-100 pb-2.5 mb-2.5">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={17} className="text-red-600 shrink-0" />
                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">Physical Inspection</p>
                                                <h3 className="text-sm font-bold text-red-900 leading-tight">Reinspection Required</h3>
                                            </div>
                                        </div>
                                        <span className="rounded-md bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-800">
                                            Action Required
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        The physical inspection was not approved. The vehicle must be reinspected after the defects are corrected.
                                    </p>
                                    {app.rejection_reason && (
                                        <div className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-xs">
                                            <span className="font-bold text-red-900 block mb-1 text-[11px] uppercase tracking-wider">
                                                Reason for Reinspection:
                                            </span>
                                            <blockquote className="border-l-2 border-red-500 pl-2.5 italic text-slate-800">
                                                {app.rejection_reason}
                                            </blockquote>
                                        </div>
                                    )}
                                </div>
                            )}

                            {app.is_ready_for_reinspection && (
                                <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-2 border-b border-sky-100 pb-2.5 mb-2.5">
                                        <div className="flex items-center gap-2">
                                            <RotateCcw size={17} className="text-sky-600 shrink-0" />
                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">Physical Inspection</p>
                                                <h3 className="text-sm font-bold text-sky-900 leading-tight">Ready for Reinspection</h3>
                                            </div>
                                        </div>
                                        <span className="rounded-md bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                                            Awaiting Inspection
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        You confirmed that vehicle defects have been addressed. Please present your tricycle unit at the TMO inspection compound for physical re-inspection.
                                    </p>
                                </div>
                            )}

                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Inspection Reference Checklist
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                    {PHYSICAL_INSPECTION_ITEMS.length} Items Reviewed by TMO
                                </span>
                            </div>

                            {/* Same row/list treatment as Document Verification's FullChecklistRow
                                (rounded-xl border, icon chip, text hierarchy) — but reference/
                                descriptive only. TMO makes one overall pass/fail decision for the
                                whole inspection, never a per-item verdict, so these rows never
                                carry a status badge. */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {PHYSICAL_INSPECTION_ITEMS.map((item, idx) => (
                                    <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50/60">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                            <Wrench size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold leading-snug text-slate-900">
                                                {idx + 1}. {item.label}
                                            </p>
                                            <p className="mt-1 text-[11.5px] leading-snug text-slate-500">
                                                {item.requirement}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {showDocsSummary && showPhysSummary && (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <CompactChecklist title="Document Verification" icon={FileText} items={app.documents} />
                            {/* Same pill/chip item treatment as the Document Verification card
                                beside it — the 13 official inspection items are reference only,
                                so the single overall "Approved" line remains the only verdict. */}
                            <CompactChecklist
                                title="Physical Inspection"
                                icon={Settings}
                                items={PHYSICAL_INSPECTION_ITEMS}
                                statusLine="Approved — All roadworthiness requirements passed"
                                itemLabel={(item) => item.label}
                            />
                        </div>
                    )}

                    {/* Settlement still needs a real verified payment row — nothing to settle otherwise. */}
                    {showSettlement && !showCodingScheme && <SettlementCard payment={app.payment} />}

                    {/* ── Coding Scheme — restored for approved/active applications ──
                        This block previously sat behind `app.payment && app.bplo`. When the
                        in-system payment-verification workflow was retired, app.payment became
                        null for every application and the whole Coding Scheme section vanished
                        with it. It is now keyed to the application having reached
                        approved/active instead; the assigned scheme itself still comes
                        straight from the backend (app.bplo → franchiseScheme.colorCodingScheme). */}
                    {showCodingScheme && (
                        <div className={`grid grid-cols-1 gap-5 ${showSettlement ? 'lg:grid-cols-2' : ''}`}>
                            {showSettlement && <SettlementCard payment={app.payment} />}
                            {app.bplo ? (
                                <BPLOCard bplo={app.bplo} stickerNumber={app.sticker_number} fullWidth={!showSettlement} />
                            ) : (
                                <CodingSchemeEmptyState />
                            )}
                        </div>
                    )}

                </div>
            </div>
        </OperatorLayout>
    );
}

function InfoItem({ label, value }) {
    return (
        <div>
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
            <span className="mt-1 block text-sm font-semibold text-slate-900">{value}</span>
        </div>
    );
}
