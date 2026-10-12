import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { SearchInput, StatusBadge, EmptyState } from '@/Components/TMO';
import {
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    FileSearch,
    ClipboardCheck,
    Stamp,
    ShieldCheck,
    Plus,
    RotateCcw,
    Search,
    X,
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// and Operator panels, so this page reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

// Mirrors the exact phase keys emitted by MTOPController::index() — must stay in sync.
// Finalized workflow: Requirements -> Physical Inspection -> BPLO Release: Sticker & Plate
// for Coding (payment happens offline at the Municipal Treasurer's Office; the system
// never verifies it) -> TMO Final Confirmation & GPS Setup -> Franchise Active ('completed',
// not part of this in-progress strip).
const PIPELINE_STEPS = [
    { id: 'tmo-docs', label: 'Requirements', icon: FileSearch },
    { id: 'tmo-phys-inspect', label: 'Physical Inspection', icon: ClipboardCheck },
    { id: 'bplo-release', label: 'BPLO Release', icon: Stamp },
    { id: 'tmo-final-confirm', label: 'Final Confirmation', icon: ShieldCheck },
];

// Per-phase driver-facing label for an "action-req" application — each phase only ever
// reaches action-req for one specific reason (see MTOPController::index()'s switch), so
// this is a direct mapping rather than a guessed binary fallback.
const ACTION_REQUIRED_LABELS = {
    'tmo-docs': 'Re-submission',
    'tmo-phys-inspect': 'Reinspection Required',
    'bplo-release': 'Pay & Proceed to BPLO',
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
                    toneClass = status === 'action-req' ? 'rounded-full bg-amber-50 px-2.5 py-1 text-amber-700' : 'rounded-full bg-[#182B62]/[0.08] px-2.5 py-1 text-[#182B62]';
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

    // Background refresh of the application tracker: a TMO/BPLO decision made elsewhere updates
    // this list without a manual reload. Search and status filter above are local state and are
    // untouched by the refreshed props.
    useBackgroundRefresh(['applications']);
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
                <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Application Tracker
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                            Monitor and manage your municipal tricycle franchise applications and compliance status.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('operator.mtop.create')}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#182B62] px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-[#25449B] transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>New Unit Registration</span>
                        </Link>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                    {/* ─ Card 1: Total Applications ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Filings
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <FileText size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {filterCounts.all}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Filings
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Applications registered in municipal system
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 truncate">Records:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-900 tabular-nums shrink-0">{filterCounts.all} Tracked</span>
                        </div>
                    </div>

                    {/* ─ Card 2: Under Evaluation ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Under Evaluation
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-[#182B62]">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-[#182B62] leading-none">
                                    {filterCounts['in-progress']}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    In Review
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Moving through municipal review pipeline
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 truncate">Pipeline:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 tabular-nums shrink-0">{filterCounts['in-progress']} In Progress</span>
                        </div>
                    </div>

                    {/* ─ Card 3: Action Required ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Action Required
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                    <AlertCircle size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                    (filterCounts['action-req'] + filterCounts.expired) > 0 ? 'text-amber-600' : 'text-slate-900'
                                }`}>
                                    {filterCounts['action-req'] + filterCounts.expired}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Attention
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Awaiting driver correction or action
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 truncate">Attention:</span>
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold tabular-nums shrink-0 ${(filterCounts['action-req'] + filterCounts.expired) > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                                {filterCounts['action-req']} Fixes · {filterCounts.expired} Expired
                            </span>
                        </div>
                    </div>

                    {/* ─ Card 4: Approved & Active ─ */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Approved & Active
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {filterCounts.completed}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Completed
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Franchises officially issued and active
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 truncate">Issuance:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-900 tabular-nums shrink-0">
                                {filterCounts.all > 0 ? Math.round((filterCounts.completed / filterCounts.all) * 100) : 0}% of Filings
                            </span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. MULTI-DIMENSIONAL COMMAND & FILTER TOOLBAR
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                        {/* Primary Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search
                                size={14}
                                strokeWidth={2.2}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by Tracking ID, plate number, or unit model..."
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Filter Controls Row */}
                        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                aria-label="Filter by status"
                                className="h-10 w-full sm:w-auto sm:min-w-[170px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                <option value="all">All Statuses ({filterCounts.all})</option>
                                <option value="in-progress">In Progress ({filterCounts['in-progress']})</option>
                                <option value="action-req">Action Required ({filterCounts['action-req']})</option>
                                <option value="completed">Completed ({filterCounts.completed})</option>
                                <option value="expired">Expired ({filterCounts.expired})</option>
                            </select>
                        </div>
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
                                        : 'bg-gradient-to-br from-[#182B62]/[0.10] to-[#182B62]/[0.02] text-[#182B62]';

                        const badgeVariant = isRedCard ? 'danger' : isYellowCard ? 'warning' : app.status === 'completed' ? 'success' : app.status === 'action-req' ? 'warning' : 'info';
                        const badgeLabel = app.status === 'completed'
                            ? 'Approved'
                            : isRedCard
                                ? 'Expired'
                                : isYellowCard
                                    ? 'Expired (Renewed)'
                                    : app.status === 'action-req'
                                        ? (ACTION_REQUIRED_LABELS[app.phase] || 'Action Required')
                                        : app.is_ready_for_reinspection
                                            ? 'Ready for Reinspection'
                                            : 'In Progress';
                        const BadgeIcon = app.status === 'completed' ? CheckCircle2 : (isRedCard || isYellowCard || app.status === 'action-req') ? AlertCircle : app.is_ready_for_reinspection ? RotateCcw : Clock;

                        return (
                            <Link
                                key={app.id}
                                href={route('operator.mtop.details', { id: app.id })}
                                className={`group flex min-h-[165px] sm:min-h-[185px] flex-col justify-between gap-5 rounded-2xl sm:rounded-3xl border p-6 sm:p-7 lg:p-8 transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)] sm:flex-row sm:items-center sm:justify-between ${cardTone} ${CARD_SHADOW}`}
                            >
                                <div className="flex flex-1 items-start gap-4 sm:gap-6">
                                    <div className={`flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl shadow-2xs ${iconTone}`}>
                                        <FileText size={26} strokeWidth={2.2} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-lg font-bold text-slate-900 leading-tight">
                                            {app.type}: {app.unit}
                                        </h3>
                                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            <span>Tracking ID <span className="font-mono font-bold text-slate-600">{app.id}</span></span>
                                            <span>Submitted <span className="font-bold text-slate-600">{app.date}</span></span>
                                            {app.last_updated && (
                                                <span>Status Updated <span className="font-bold text-slate-600">{app.last_updated}</span></span>
                                            )}
                                        </div>

                                        {app.status !== 'completed' && !isRedCard && !isYellowCard && (
                                            <div className="my-2.5">
                                                <Pipeline phase={app.phase} status={app.status} />
                                            </div>
                                        )}

                                        <p className={`mt-2.5 text-xs sm:text-[13px] leading-relaxed ${isRedCard ? 'font-semibold text-red-700' : isYellowCard ? 'font-semibold text-amber-800' : app.status === 'action-req' ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                                            {app.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:min-w-[190px] sm:flex-col sm:items-end sm:justify-center sm:gap-4">
                                    <StatusBadge variant={badgeVariant} icon={BadgeIcon}>{badgeLabel}</StatusBadge>
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#182B62] transition-colors">
                                        Track Status <ChevronRight size={14} strokeWidth={2.5} />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${CARD_SHADOW}`}>
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
