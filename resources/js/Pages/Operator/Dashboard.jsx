import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { Button } from '@/Components/TMO';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import {
    AlertTriangle,
    AlertCircle,
    ShieldCheck,
    ShieldAlert,
    Clock,
    Bike,
    Ban,
    Calendar,
    Info,
    FileText,
    ChevronRight,
    ClipboardCheck,
} from 'lucide-react';

const FADE = 'op-dash-fade';
const delay = (ms) => ({ animationDelay: `${ms}ms` });

// Shared soft, layered shadow token — same elevation language used across TMODashboard, so this
// panel reads as one consistent product rather than a different template.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const getCodingDetails = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const schedule = {
        'Monday': '1, 2', 'Tuesday': '3, 4', 'Wednesday': '5, 6',
        'Thursday': '7, 8', 'Friday': '9, 0', 'Saturday': 'None', 'Sunday': 'None',
    };
    return { day: today, restricted: schedule[today] || 'None' };
};

const CODING_RULES = [
    { day: 'Monday', color: 'Green', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' },
    { day: 'Tuesday', color: 'Yellow', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' },
    { day: 'Wednesday', color: 'Blue', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-500' },
    { day: 'Thursday', color: 'Red', badgeClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500' },
    { day: 'Friday', color: 'White', badgeClass: 'bg-gray-100 text-slate-500 border-slate-200', dotClass: 'bg-gray-400' },
    { day: 'Saturday', color: 'No Coding', badgeClass: 'bg-gray-50 text-slate-400 border-slate-200', dotClass: 'bg-gray-300' },
    { day: 'Sunday', color: 'No Coding', badgeClass: 'bg-gray-50 text-slate-400 border-slate-200', dotClass: 'bg-gray-300' },
];

export default function OperatorDashboard({ operator, stats, tricycles, recentViolations, expiringRegistrations = [], applicationProgress }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Background refresh of the driver's live counters/queues — an application moving stage or a
    // new violation showing up elsewhere updates this dashboard without a manual reload.
    useBackgroundRefresh(['stats', 'tricycles', 'recentViolations', 'expiringRegistrations', 'applicationProgress']);
    const codingInfo = getCodingDetails();
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const expiredUnit = tricycles.find((t) => t.is_expired);
    const finesDue = Number(stats.pending_fine_amount) > 0;
    const violationCount = recentViolations.length;
    const primaryUnit = tricycles[0];
    const soonestExpiring = expiringRegistrations.length > 0
        ? [...expiringRegistrations].sort((a, b) => a.days_left - b.days_left)[0]
        : null;
    // Human-readable renewal countdown — rounds defensively so a raw float can never
    // leak into the card, and switches to months/years for long-dated franchises.
    const renewalCountdown = (() => {
        if (!soonestExpiring) return null;
        const days = Math.round(Number(soonestExpiring.days_left));
        if (!Number.isFinite(days)) return null;
        if (days <= 0) return 'due today';
        if (days < 30) return `in ${days} day${days === 1 ? '' : 's'}`;
        if (days < 365) {
            const months = Math.max(1, Math.round(days / 30));
            return `in ~${months} month${months === 1 ? '' : 's'}`;
        }
        const years = (days / 365).toFixed(1).replace(/\.0$/, '');
        return `in ~${years} year${years === '1' ? '' : 's'}`;
    })();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { greeting, today } = useMemo(() => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        return {
            greeting: `Good ${timeOfDay}, ${operator.name.split(' ')[0]}`,
            today: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        };
    }, [operator.name]);

    const complianceScore = useMemo(() => {
        let score = 100;
        if (expiredUnit && !expiredUnit.has_pending_renewal) score -= 40;
        else if (expiredUnit) score -= 15;
        score -= violationCount * 15;
        return Math.max(10, Math.min(100, score));
    }, [expiredUnit, violationCount]);

    const scoreTone = complianceScore >= 80 ? '#1D2542' : complianceScore >= 50 ? '#64748B' : '#DC2626';

    const heroMessage = expiredUnit
        ? `Your MTOP franchise permit needs attention — ${expiredUnit.has_pending_renewal ? 'renewal is in progress.' : 'submit a renewal to stay compliant.'}`
        : violationCount > 0
            ? `You have ${violationCount} active violation${violationCount === 1 ? '' : 's'} awaiting settlement.`
            : "You're all caught up — your unit is compliant and active.";

    return (
        <OperatorLayout title="Dashboard" operatorName={operator.name}>
            <Head title="Driver Dashboard | TRIVORA" />

            <style>{`
                @keyframes opDashFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .${FADE} { animation: opDashFadeUp .5s cubic-bezier(.16,1,.3,1) both; }
                @media (prefers-reduced-motion: reduce) { .${FADE} { animation: none; } }
            `}</style>

            {/* ══════════════════════════════════════════════════════════════
                1. DARK HERO BANNER — greeting + compliance ring
               ══════════════════════════════════════════════════════════════ */}
            <div className={`relative mb-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-8 ${CARD_SHADOW} ${FADE}`} style={delay(0)}>
                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-lg">
                        <div className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">{today}</div>
                        <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-[#1D2542] sm:text-[32px]">
                            {greeting}
                        </h1>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                            {heroMessage}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2.5">
                            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Calendar size={14} />
                                </span>
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Restricted Today</p>
                                    <p className="font-mono text-xs font-bold text-slate-900">{codingInfo.restricted}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                    <Clock size={14} />
                                </span>
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{codingInfo.day}</p>
                                    <p className="font-mono text-xs font-bold tabular-nums text-slate-900">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-center">
                        <ScoreRing value={complianceScore} color={scoreTone} size={168} label="Compliance Score" textClassName="text-slate-900" trackColor="#F1F5F9" labelClassName="text-slate-400" />
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. FRANCHISE EXPIRED ALERT
               ══════════════════════════════════════════════════════════════ */}
            {expiredUnit && (
                <div className={`mb-5 flex flex-col gap-4 rounded-2xl border border-red-200/70 bg-red-50 p-5 ${CARD_SHADOW} sm:flex-row sm:items-center sm:justify-between ${FADE}`} style={delay(80)}>
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white">
                            <AlertCircle size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-800">
                                Compliance Alert: Tricycle MTOP Franchise Permit Expired
                            </p>
                            <p className="mt-1 text-xs text-red-700">
                                {expiredUnit.has_pending_renewal
                                    ? `The franchise permit for Unit #${expiredUnit.coding_scheme_number} expired on ${expiredUnit.mtop_expiry}. Renewal application is currently in progress.`
                                    : `The franchise permit for Unit #${expiredUnit.coding_scheme_number || 'N/A'} expired on ${expiredUnit.mtop_expiry}. Check your application status in the Application Tracker.`}
                            </p>
                        </div>
                    </div>
                    <Button as={Link} href={route('operator.mtop')} variant="dangerSolid" icon={FileText} className="shrink-0">
                        Track Application
                    </Button>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                3. ACTION CARDS — quick links into each area
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 ${FADE}`} style={delay(140)}>
                <ActionCard
                    href={route('operator.fleet')}
                    icon={Bike}
                    active
                    value={primaryUnit?.coding_scheme_number || 'No Unit'}
                    label="Registered Tricycle"
                    meta={primaryUnit ? `Plate ${primaryUnit.plate_number || 'N/A'}` : 'Register a unit to get started'}
                    cta="Manage Unit"
                />
                <ActionCard
                    href={route('operator.violations')}
                    icon={ShieldAlert}
                    active={violationCount > 0}
                    danger={violationCount > 0}
                    value={violationCount}
                    label="Active Violations"
                    meta={finesDue ? `₱${stats.pending_fine_amount} unsettled` : 'No unsettled fines'}
                    cta={violationCount > 0 ? 'View Tickets' : 'View Records'}
                />
                <ActionCard
                    href={route('operator.mtop')}
                    icon={FileText}
                    active={!!expiredUnit}
                    danger={!!expiredUnit}
                    value={expiredUnit ? (expiredUnit.has_pending_renewal ? 'Renewing' : 'Expired') : 'Valid'}
                    label="MTOP Franchise"
                    meta={primaryUnit ? `Expires ${primaryUnit.mtop_expiry || 'N/A'}` : 'No franchise on record'}
                    cta="View Application"
                />
                <ActionCard
                    href={route('operator.mtop')}
                    icon={Calendar}
                    active={expiringRegistrations.length > 0}
                    danger={!!soonestExpiring && soonestExpiring.days_left <= 30}
                    value={expiringRegistrations.length}
                    label="Renewal Alerts"
                    meta={soonestExpiring && renewalCountdown ? `${soonestExpiring.coding_scheme_number} — renews ${renewalCountdown}` : 'No upcoming renewals'}
                    cta="View Franchise"
                />
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. FRANCHISE APPLICATION PROGRESS — real tracking (from the
                operator's actual in-progress MTOP application), only shown
                when one exists. Light neutral card, not another navy block.
               ══════════════════════════════════════════════════════════════ */}
            {applicationProgress && (
                <div className={`mb-5 rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} sm:p-6 ${FADE}`} style={delay(180)}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <ClipboardCheck size={18} strokeWidth={2.2} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">
                                    {applicationProgress.type} in Progress &bull; Unit {applicationProgress.unit}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Ref: {applicationProgress.reference} &bull; Stage: {applicationProgress.stepLabel}
                                </p>
                            </div>
                        </div>
                        <Button as={Link} href={route('operator.mtop.details', { id: applicationProgress.db_id })} variant="secondary" size="sm" className="shrink-0">
                            View Application
                        </Button>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5">
                        {Array.from({ length: applicationProgress.totalSteps }).map((_, i) => {
                            const stepNum = i + 1;
                            const isDone = stepNum < applicationProgress.step;
                            const isCurrent = stepNum === applicationProgress.step;
                            return (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full ${
                                        isDone ? 'bg-[#1D2542]' : isCurrent ? 'bg-[#1D2542]/50' : 'bg-slate-100'
                                    }`}
                                />
                            );
                        })}
                    </div>

                    <p className={`mt-3 flex items-start gap-1.5 text-xs leading-relaxed ${applicationProgress.needsAction ? 'font-semibold text-[#1D2542]' : 'text-slate-500'}`}>
                        {applicationProgress.needsAction && <AlertCircle size={12} className="mt-0.5 shrink-0" />}
                        {applicationProgress.message}
                    </p>
                </div>
            )}

            {/* ── Coding Schedule — full-width horizontal "week at a glance"
                strip, sitting right under the application-progress card so
                it reads as ordinance reference info up top, ahead of the
                unit/violations detail below. ── */}
            <div className={`mb-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW} ${FADE}`} style={delay(200)}>
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <Calendar size={15} strokeWidth={2.2} />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900">Coding Schedule</h2>
                    </div>
                    <span className="text-[11px] text-slate-400">Color Coding Ordinance &bull; weekly restriction by plate ending</span>
                </div>
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                    <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
                        {CODING_RULES.map((rule) => (
                            <div
                                key={rule.day}
                                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 lg:flex-col lg:justify-center lg:gap-1.5 lg:px-2 lg:py-2.5 lg:text-center ${
                                    rule.day === todayName ? 'border-[#1D2542]/20 bg-slate-50' : 'border-slate-100 bg-white'
                                }`}
                            >
                                <div className="flex min-w-0 items-center gap-1.5 lg:gap-1">
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${rule.dotClass}`} />
                                    <span className="truncate text-[12.5px] font-bold text-slate-700 lg:text-[11px]">
                                        <span className="lg:hidden">{rule.day}</span>
                                        <span className="hidden lg:inline">{rule.day.slice(0, 3)}</span>
                                    </span>
                                    {rule.day === todayName && (
                                        <span className="shrink-0 rounded bg-[#1D2542] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white lg:hidden">
                                            Today
                                        </span>
                                    )}
                                </div>
                                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide lg:w-full lg:truncate lg:text-[9.5px] ${rule.badgeClass}`}>
                                    {rule.color}
                                </span>
                                {rule.day === todayName && (
                                    <span className="hidden rounded bg-[#1D2542] px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-white lg:block">
                                        Today
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-start gap-1.5 rounded-xl bg-slate-50 p-3 lg:w-72 lg:shrink-0">
                        <Info size={13} className="mt-0.5 shrink-0 text-[#1D2542]" />
                        <p className="text-[10.5px] leading-relaxed text-slate-600">
                            Automated IoT enforcement is active in the Poblacion zone. Be aware of your restricted days to avoid digital fines.
                        </p>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                5. MAIN CONTENT — My Tricycle and Active Violations, matched
                to equal height (items-stretch) since Active Violations is
                now capped at 3 recent entries, keeping both cards in the
                same size range as a genuine paired row.
               ══════════════════════════════════════════════════════════════ */}
            <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch ${FADE}`} style={delay(220)}>

                {/* My Tricycle */}
                <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Bike size={15} strokeWidth={2.2} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900">My Tricycle</h2>
                        </div>
                        <Link href={route('operator.fleet')} className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[#1D2542] hover:text-[#283256]">
                            Manage
                        </Link>
                    </div>

                    {tricycles.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
                            <Bike size={28} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-800">No tricycle registered yet</p>
                            <p className="mt-1 text-xs text-slate-500">Register a unit to start tracking compliance.</p>
                        </div>
                    ) : tricycles.slice(0, 1).map((trike) => (
                        <div key={trike.id} className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542] sm:h-12 sm:w-12">
                                    <Bike size={20} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-base font-bold leading-tight text-slate-900">{trike.coding_scheme_number || 'N/A'}</h3>
                                    <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                        {trike.plate_number || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    <FileText size={12} /> MTOP Franchise
                                </span>
                                <span className={`text-[13px] font-bold ${trike.is_expired ? 'text-red-600' : 'text-[#1D2542]'}`}>
                                    {trike.mtop_status || 'Valid'} &bull; {trike.mtop_expiry || 'N/A'}
                                </span>
                            </div>

                            {trike.mtop_days_left !== null && trike.mtop_days_left <= 30 && (
                                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1D2542]">
                                    <Clock size={11} className="shrink-0" />
                                    {trike.mtop_days_left > 0
                                        ? `Expires in ${trike.mtop_days_left} day${trike.mtop_days_left !== 1 ? 's' : ''} — renew soon.`
                                        : 'Expires today — renew as soon as possible.'}
                                </p>
                            )}

                            <Link
                                href={route('operator.fleet')}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50 lg:mt-auto"
                            >
                                View Full Vehicle Details <ChevronRight size={12} />
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Active Violations — capped at 3 most recent to keep this
                    card's height in the same range as My Tricycle. */}
                <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.02] text-red-600">
                                <AlertTriangle size={15} strokeWidth={2.2} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900">Active Violations</h2>
                        </div>
                        {violationCount > 0 && (
                            <Link href={route('operator.violations')} className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-slate-700">
                                View all
                            </Link>
                        )}
                    </div>
                    {recentViolations.length > 0 ? (
                        <div className="flex-1 divide-y divide-slate-100">
                            {recentViolations.slice(0, 3).map((v) => (
                                <div key={v.id} className="flex items-center justify-between gap-2 px-4 py-3.5 transition-colors hover:bg-slate-50/60 sm:px-5">
                                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.02] text-red-600">
                                            <Ban size={15} strokeWidth={2.5} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-[13px] font-bold text-slate-900">Color Coding Breach</p>
                                            <p className="truncate text-[11px] text-slate-500">{v.date} &bull; Unit {v.coding_scheme_number}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={route('operator.violations.ticket', { id: v.id })}
                                        className="shrink-0 whitespace-nowrap rounded-full bg-[#1D2542] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-2xs transition-all hover:bg-[#283256] active:scale-[0.98]"
                                    >
                                        View
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02]">
                                <ShieldCheck size={22} className="text-[#1D2542]" />
                            </div>
                            <p className="text-sm font-semibold text-slate-800">No active violations.</p>
                            <p className="mt-1 max-w-xs text-xs text-slate-500">You're compliant with the Color Coding Ordinance.</p>
                        </div>
                    )}
                </div>

            </div>
        </OperatorLayout>
    );
}

function ScoreRing({ value, max = 100, color, size = 140, label, textClassName = 'text-slate-900', trackColor = '#F1F5F9', labelClassName = 'text-slate-400' }) {
    const data = [{ name: label || 'Score', value }];
    const barSize = Math.max(8, Math.round(size * 0.09));
    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ height: size, width: size }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="76%" outerRadius="100%" data={data} startAngle={90} endAngle={-270} barSize={barSize}>
                        <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
                        <RadialBar
                            dataKey="value"
                            cornerRadius={barSize}
                            fill={color}
                            background={{ fill: trackColor }}
                            isAnimationActive
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-extrabold tabular-nums ${textClassName}`} style={{ fontSize: size * 0.19 }}>{value}%</span>
                </div>
            </div>
            {label && <span className={`mt-2.5 text-[10px] font-bold uppercase tracking-widest ${labelClassName}`}>{label}</span>}
        </div>
    );
}

function ActionCard({ href, icon: Icon, active, danger, value, label, meta, cta }) {
    return (
        <Link
            href={href}
            className={`group flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all ${danger ? 'hover:border-red-300' : 'hover:border-slate-300'}`}
        >
            <div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                    </span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        danger
                            ? 'bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.02] text-red-600'
                            : active
                                ? 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]'
                                : 'bg-slate-100 text-slate-400'
                    }`}>
                        <Icon size={14} />
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${danger ? 'text-red-600' : 'text-slate-900'}`}>
                        {value}
                    </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                    {meta}
                </p>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-slate-500">Details:</span>
                <span className={`text-xs font-bold flex items-center gap-0.5 transition-colors ${danger ? 'text-red-600 group-hover:text-red-700' : 'text-[#1D2542] group-hover:text-indigo-600'}`}>
                    {cta} <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
            </div>
        </Link>
    );
}
