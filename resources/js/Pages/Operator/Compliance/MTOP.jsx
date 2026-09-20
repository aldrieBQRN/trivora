import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { PageHeader, Button, SearchInput, StatusBadge, EmptyState } from '@/Components/TMO';
import {
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    FileSearch,
    ClipboardCheck,
    Stamp,
    Wallet,
    Receipt,
    ShieldCheck,
    Plus,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// and Operator panels, so this page reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

// Mirrors the exact phase keys emitted by MTOPController::index() — must stay in sync.
// Finalized workflow: Requirements -> Physical Inspection -> Municipal Treasurer Payment
// (offline/in-person) -> TMO Payment Verification -> BPLO Releasing -> TMO Final
// Confirmation & GPS Setup -> Franchise Active ('completed', not part of this in-progress strip).
const PIPELINE_STEPS = [
    { id: 'tmo-docs', label: 'Requirements', icon: FileSearch },
    { id: 'tmo-phys-inspect', label: 'Physical Inspection', icon: ClipboardCheck },
    { id: 'cashier-pay', label: 'Treasurer Payment', icon: Wallet },
    { id: 'tmo-payment', label: 'TMO Verification', icon: Receipt },
    { id: 'bplo-release', label: 'BPLO Releasing', icon: Stamp },
    { id: 'tmo-final-confirm', label: 'Final Confirmation', icon: ShieldCheck },
];

// Per-phase driver-facing label for an "action-req" application — each phase only ever
// reaches action-req for one specific reason (see MTOPController::index()'s switch), so
// this is a direct mapping rather than a guessed binary fallback.
const ACTION_REQUIRED_LABELS = {
    'tmo-docs': 'Re-submission',
    'tmo-phys-inspect': 'Re-inspection',
    'cashier-pay': 'Payment Due',
    'tmo-payment': 'Payment Issue',
    'tmo-final-confirm': 'Return to TMO',
};

function Pipeline({ phase, status }) {
    // Look up the real position instead of a hand-maintained if-chain, so an unmatched
    // phase can never silently fall through to "fully complete."
    const matchedIndex = PIPELINE_STEPS.findIndex((step) => step.id === phase);
    const currentIndex = matchedIndex === -1 ? PIPELINE_STEPS.length : matchedIndex;

    return (
        <div className="mt-4 flex flex-wrap items-center gap-2">
            {PIPELINE_STEPS.map((step, index) => {
                const Icon = step.icon;
                let toneClass = 'text-slate-400';
                let isFilled = false;

                if (index < currentIndex) {
                    toneClass = 'text-emerald-600';
                    isFilled = true;
                } else if (index === currentIndex) {
                    toneClass = status === 'action-req' ? 'rounded-full bg-amber-50 px-2.5 py-1 text-amber-700' : 'rounded-full bg-[#1D2542]/[0.08] px-2.5 py-1 text-[#1D2542]';
                }

                return (
                    <React.Fragment key={step.id}>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${toneClass}`}>
                            <Icon size={12} strokeWidth={2.5} />
                            {step.label}
                        </span>
                        {index < PIPELINE_STEPS.length - 1 && (
                            <span className={`h-0.5 w-6 rounded-full ${isFilled ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default function MTOPTracker({ applications = [], auth }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const operatorName = auth?.user?.name || 'Driver';

    const enriched = useMemo(() => applications.map((app) => {
        const isRedCard = app.card_color === 'red' || (app.is_expired && !app.has_pending_renewal && !app.has_active_valid);
        const isYellowCard = app.card_color === 'yellow' || (app.is_expired && (app.has_pending_renewal || app.has_active_valid));
        const derivedStatus = (isRedCard || isYellowCard) ? 'expired' : app.status;
        return { ...app, isRedCard, isYellowCard, derivedStatus };
    }), [applications]);

    const filterCounts = useMemo(() => ({
        all: enriched.length,
        'in-progress': enriched.filter((a) => a.derivedStatus === 'in-progress').length,
        'action-req': enriched.filter((a) => a.derivedStatus === 'action-req').length,
        completed: enriched.filter((a) => a.derivedStatus === 'completed').length,
        expired: enriched.filter((a) => a.derivedStatus === 'expired').length,
    }), [enriched]);

    const filtered = enriched.filter((a) => {
        const matchesQuery = a.id.toLowerCase().includes(query.toLowerCase()) || a.unit.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = statusFilter === 'all' || a.derivedStatus === statusFilter;
        return matchesQuery && matchesStatus;
    });

    return (
        <OperatorLayout title="MTOP Applications" operatorName={operatorName}>
            <Head title="MTOP Tracker | TRIVORA" />

            <div className="mx-auto max-w-[1400px] pb-10">
                <PageHeader
                    eyebrow="Franchise &amp; Compliance"
                    title="Application Tracker"
                    subtitle="Monitor and manage your municipal franchise records."
                    actions={
                        <Button as={Link} href={route('operator.mtop.create')} variant="primary" icon={Plus}>
                            New Unit Registration
                        </Button>
                    }
                />

                <div className={`mb-5 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                        <SearchInput value={query} onChange={setQuery} placeholder="Search by ID or unit model…" className="flex-1" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 pr-8 text-xs font-semibold text-slate-900 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:w-56"
                        >
                            <option value="all">All Statuses ({filterCounts.all})</option>
                            <option value="in-progress">In Progress ({filterCounts['in-progress']})</option>
                            <option value="action-req">Action Required ({filterCounts['action-req']})</option>
                            <option value="completed">Completed ({filterCounts.completed})</option>
                            <option value="expired">Expired ({filterCounts.expired})</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    {filtered.map((app) => {
                        const { isRedCard, isYellowCard } = app;
                        const cardTone = isRedCard
                            ? 'border-red-200 bg-red-50/60'
                            : isYellowCard
                                ? 'border-amber-200 bg-amber-50/60'
                                : 'border-slate-200/70 bg-white';
                        const iconTone = isRedCard
                            ? 'bg-gradient-to-br from-red-500/[0.14] to-red-500/[0.02] text-red-600'
                            : isYellowCard
                                ? 'bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600'
                                : app.status === 'completed'
                                    ? 'bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600'
                                    : app.status === 'action-req'
                                        ? 'bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600'
                                        : 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]';

                        const badgeVariant = isRedCard ? 'danger' : isYellowCard ? 'warning' : app.status === 'completed' ? 'success' : app.status === 'action-req' ? 'warning' : 'info';
                        const badgeLabel = app.status === 'completed'
                            ? 'Approved'
                            : isRedCard
                                ? 'Expired'
                                : isYellowCard
                                    ? 'Expired (Renewed)'
                                    : app.status === 'action-req'
                                        ? (ACTION_REQUIRED_LABELS[app.phase] || 'Action Required')
                                        : 'In Progress';
                        const BadgeIcon = app.status === 'completed' ? CheckCircle2 : (isRedCard || isYellowCard || app.status === 'action-req') ? AlertCircle : Clock;

                        return (
                            <Link
                                key={app.id}
                                href={route('operator.mtop.details', { id: app.id })}
                                className={`group flex flex-col gap-4 rounded-2xl border p-5 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6 ${cardTone} ${CARD_SHADOW}`}
                            >
                                <div className="flex flex-1 items-start gap-4">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                                        <FileText size={22} strokeWidth={2} />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-[15px] font-bold text-slate-900">{app.type}: {app.unit}</h3>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            <span>Tracking ID <span className="text-slate-500">{app.id}</span></span>
                                            <span>Submitted <span className="text-slate-500">{app.date}</span></span>
                                        </div>

                                        {app.status !== 'completed' && !isRedCard && !isYellowCard && <Pipeline phase={app.phase} status={app.status} />}

                                        <p className={`mt-2 text-[13px] ${isRedCard ? 'font-semibold text-red-700' : isYellowCard ? 'font-semibold text-amber-800' : app.status === 'action-req' ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                                            {app.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:min-w-[180px] sm:flex-col sm:items-end">
                                    <StatusBadge variant={badgeVariant} icon={BadgeIcon}>{badgeLabel}</StatusBadge>
                                    <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 group-hover:text-[#1D2542]">
                                        Track Status <ChevronRight size={13} strokeWidth={3} />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
                            <EmptyState
                                icon={FileText}
                                title="No applications found"
                                description="We couldn't find any records matching your search or filter."
                            />
                        </div>
                    )}
                </div>
            </div>
        </OperatorLayout>
    );
}
