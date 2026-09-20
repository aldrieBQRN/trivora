import React from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { BackLink, Button } from '@/Components/TMO';
import {
    FileText, CheckCircle2, Clock, AlertCircle,
    Bike, FileSearch, ClipboardCheck, Stamp, AlertTriangle,
    XCircle, Download, Wrench, Settings, RefreshCw,
    Wallet, Receipt, CreditCard, ArrowRight, Calendar, ShieldCheck, Check,
} from 'lucide-react';

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

const CompactChecklist = ({ title, icon: Icon, items }) => (
    <Card icon={Icon} title={title} headerTone={BRAND_ICON_CHIP}>
        <div className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            <CheckCircle2 size={13} className="text-emerald-600" />
            All {items.length} verified
        </div>
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <div key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11.5px] font-semibold text-slate-900">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {item.name}
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

const BPLOCard = ({ bplo, stickerNumber }) => {
    const restrictDaysStr = bplo.colorCoding?.restrictedDays?.join(', ') || 'N/A';

    return (
        <Card icon={Stamp} title="BPLO Issuance & Coding" headerTone={BRAND_ICON_CHIP}>
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-[#1D2542]/25 bg-[#1D2542]/[0.05] p-4">
                    <div>
                        <span className="block text-[10px] font-bold uppercase leading-tight text-[#1D2542]/70">
                            Assigned Tricycle Number<br />Coding Scheme
                        </span>
                        <span className="text-2xl font-black tracking-tight text-[#1D2542]">{bplo.assignedBody}</span>
                    </div>
                    {bplo.colorCoding && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-semibold uppercase text-slate-400">Coding Scheme</span>
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
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Franchise Sticker No.</p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-[#1D2542]">{stickerNumber}</p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

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
    'cashier-pay':       'Municipal Treasurer Payment',
    'tmo-payment':       'TMO Payment Verification',
    'bplo-release':      'BPLO Releasing',
    'tmo-final-confirm': 'Final Confirmation & GPS Setup',
    'completed':         'Franchise Status',
};

/**
 * Compact horizontal progress strip — replaces the old fixed-height vertical
 * tracker. Every phase now costs the same small amount of vertical space here,
 * so the page's height reflects the phase's actual content instead of a
 * constant tracker forcing every other region to look short by comparison.
 */
function HorizontalTracker({ steps, phaseIdx }) {
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

    const phaseOrder = ['tmo-docs', 'tmo-phys-inspect', 'cashier-pay', 'tmo-payment', 'bplo-release', 'tmo-final-confirm', 'completed'];
    const phaseIdx = Math.max(0, phaseOrder.indexOf(app.phase));

    const showDocsFull = phaseIdx === 0;
    const showDocsSummary = phaseIdx >= 1;
    const showPhysFull = phaseIdx === 1;
    const showPhysSummary = phaseIdx >= 2;

    const trackerSteps = [
        { id: 'tmo-docs', title: 'Document Review', icon: FileSearch },
        { id: 'tmo-phys-inspect', title: 'Vehicle Inspection', icon: ClipboardCheck },
        { id: 'cashier-pay', title: 'Municipal Treasurer', icon: Wallet },
        { id: 'tmo-payment', title: 'TMO Verification', icon: ShieldCheck },
        { id: 'bplo-release', title: 'Sticker Release', icon: Stamp },
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
                    <p className="mt-1 text-sm text-slate-500">Submitted on {app.date}</p>
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
                        tone="error" icon={Wrench} eyebrow={eyebrow} title="Vehicle Inspection Failed"
                        action={
                            <Button as={Link} href={route('operator.mtop.fix', { id: app.id })} variant="dangerSolid" size="md" icon={Wrench} className="whitespace-nowrap">
                                Request Re-inspection
                            </Button>
                        }
                    >
                        Defects were identified during the physical roadworthiness inspection. Repair the failing components below and coordinate with TMO for re-inspection.
                    </StatusHero>
                )}

                {app.status === 'in-progress' && app.phase === 'tmo-phys-inspect' && (
                    <StatusHero tone="info" icon={ClipboardCheck} eyebrow={eyebrow} title="Bring Tricycle for Inspection">
                        Application requirements approved! Please bring your tricycle unit to the TMO inspection compound for physical roadworthiness and safety inspection.
                    </StatusHero>
                )}

                {app.phase === 'cashier-pay' && (
                    <StatusHero tone="warn" icon={Wallet} eyebrow={eyebrow} title="Payment Ticket Issued">
                        <p>
                            Vehicle inspection passed! Your official municipal Payment Ticket of <strong>₱{app.payment_due.toFixed(2)}</strong> has been generated. Proceed to the <strong>Municipal Treasurer's cashier counter</strong> (Ground Floor) to settle in cash.
                        </p>
                        <Link
                            href={route('operator.mtop.ticket', { id: app.db_id || app.id })}
                            className="mt-4 flex items-center justify-between rounded-xl border-[1.5px] border-slate-200 bg-white p-4 text-slate-900 transition-colors hover:border-[#1D2542] hover:shadow-sm"
                        >
                            <span className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <FileText size={18} strokeWidth={2.5} />
                                </span>
                                <span className="text-left">
                                    <span className="block text-sm font-bold">View &amp; Print Payment Ticket</span>
                                    <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Order of Payment &bull; ₱750.00</span>
                                </span>
                            </span>
                            <ArrowRight size={16} strokeWidth={2.5} className="shrink-0 text-slate-400" />
                        </Link>
                    </StatusHero>
                )}

                {/* MTOPController::show() only ever sets phase 'tmo-payment' for raw_status
                    'payment_issue' — there is no separate "awaiting verification" phase, since
                    the driver isn't asked to self-report payment in-system. */}
                {app.phase === 'tmo-payment' && (
                    <StatusHero tone="error" icon={AlertCircle} eyebrow={eyebrow} title="Payment Issue Flagged by TMO">
                        TMO personnel found an issue with your payment ticket or Official Receipt. Please proceed to the TMO counter with your original receipt.
                    </StatusHero>
                )}

                {app.status === 'in-progress' && app.phase === 'bplo-release' && (
                    <StatusHero tone="info" icon={Stamp} eyebrow={eyebrow} title="Payment Verified &bull; Releasing">
                        Payment has been verified by TMO! Your Franchise Sticker and Coding Plate are being prepared for release at the BPLO counter.
                    </StatusHero>
                )}

                {app.phase === 'tmo-final-confirm' && (
                    <StatusHero tone="warn" icon={ShieldCheck} eyebrow={eyebrow} title="Sticker Released &bull; Return to TMO">
                        BPLO has officially released your franchise sticker and coding plate! Return to the <strong>Tricycle Management Office (TMO)</strong> counter with your signed Payment Ticket and tricycle unit to set up your tracking method (Mobile GPS or IoT Device) and receive final franchise permit activation.
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
                    <StatusHero
                        tone="success" icon={CheckCircle2} eyebrow={eyebrow} title="Franchise Active"
                        action={
                            <Button variant="secondary" size="md" icon={Download} className="whitespace-nowrap" disabled title="Digital certificate download is not yet available">
                                Download MTOP (Coming Soon)
                            </Button>
                        }
                    >
                        Your franchise is fully active — your sticker is in hand and your GPS tracking setup is complete. You're clear to operate.
                    </StatusHero>
                )}

                {/* ── PROCESS TRACKER — one compact strip for every phase ── */}
                <HorizontalTracker steps={trackerSteps} phaseIdx={phaseIdx} />

                {/* ── CONTENT ── */}
                <div className="space-y-5">

                    <Card icon={Bike} title="Tricycle Information">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                            <InfoItem label="Make & Model" value={app.make} />
                            <InfoItem label="Plate Number" value={app.plate} />
                            <InfoItem label="Engine Number" value={app.engine} />
                            <InfoItem label="Chassis Number" value={app.chassis} />
                            <InfoItem label="TODA Association" value={app.toda} />
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {app.inspections.map((item) => (
                                    <FullChecklistRow key={item.id} item={item} isPhys={true} />
                                ))}
                            </div>
                        </Card>
                    )}

                    {showDocsSummary && showPhysSummary && (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <CompactChecklist title="Document Verification" icon={FileText} items={app.documents} />
                            <CompactChecklist title="Physical Inspection" icon={Settings} items={app.inspections} />
                        </div>
                    )}

                    {app.payment && !app.bplo && <SettlementCard payment={app.payment} />}

                    {app.payment && app.bplo && (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <SettlementCard payment={app.payment} />
                            <BPLOCard bplo={app.bplo} stickerNumber={app.sticker_number} />
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
