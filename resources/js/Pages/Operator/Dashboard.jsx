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

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OperatorDashboard({ operator, stats, tricycles, recentViolations, expiringRegistrations = [], applicationProgress, activeCodingSchemes = [] }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Background refresh of the driver's live counters/queues — an application moving stage or a
    // new violation showing up elsewhere updates this dashboard without a manual reload.
    useBackgroundRefresh(['stats', 'tricycles', 'recentViolations', 'expiringRegistrations', 'applicationProgress']);
    
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Derive authoritative 7-day schedule from database coding schemes
    const codingRules = useMemo(() => {
        return WEEKDAY_ORDER.map((day) => {
            const scheme = (activeCodingSchemes || []).find((s) =>
                Array.isArray(s.restricted_days) && s.restricted_days.includes(day) && s.restricted_digits?.length > 0
            );
            if (scheme) {
                return {
                    day,
                    color: scheme.name,
                    digits: scheme.restricted_digits.join(', '),
                    hex: scheme.color_hex,
                    badgeStyle: { backgroundColor: `${scheme.color_hex}15`, color: '#1e293b', borderColor: `${scheme.color_hex}40` },
                    dotStyle: { backgroundColor: scheme.color_hex },
                };
            }
            return {
                day,
                color: 'No Coding',
                digits: 'None',
                hex: '#94A3B8',
                badgeStyle: { backgroundColor: '#F8FAFC', color: '#64748B', borderColor: '#E2E8F0' },
                dotStyle: { backgroundColor: '#CBD5E1' },
            };
        });
    }, [activeCodingSchemes]);

    const todayRule = useMemo(() => {
        return codingRules.find((r) => r.day === todayName) || { day: todayName, digits: 'None' };
    }, [codingRules, todayName]);

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

    const scoreTone = complianceScore >= 80 ? '#182B62' : complianceScore >= 50 ? '#64748B' : '#DC2626';

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
                1. CLEAN NON-CARD HEADER
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between ${FADE}`} style={delay(0)}>
                <div>
                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                        {greeting} &bull; {heroMessage}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-2xs">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">{today}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-2xs">
                        <Clock size={14} className="text-[#182B62]" />
                        <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
                            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. FRANCHISE EXPIRED ALERT
               ══════════════════════════════════════════════════════════════ */}
            {expiredUnit && (
                <div className={`mb-6 flex flex-col gap-4 rounded-2xl border border-red-200/80 bg-red-50/80 p-4 sm:p-5 ${CARD_SHADOW} sm:flex-row sm:items-center sm:justify-between ${FADE}`} style={delay(50)}>
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
                            <AlertCircle size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-900">
                                Compliance Alert: Tricycle MTOP Franchise Permit Expired
                            </p>
                            <p className="mt-1 text-xs text-red-700 leading-relaxed">
                                {expiredUnit.has_pending_renewal
                                    ? `The franchise permit for Unit #${expiredUnit.coding_scheme_number} expired on ${expiredUnit.mtop_expiry}. Renewal application is currently in progress.`
                                    : `The franchise permit for Unit #${expiredUnit.coding_scheme_number || 'N/A'} expired on ${expiredUnit.mtop_expiry}. Check your application status in the Application Tracker.`}
                            </p>
                        </div>
                    </div>
                    <Link
                        href={route('operator.mtop')}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors"
                    >
                        <FileText size={14} />
                        Track Application
                    </Link>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                3. ACTION / KPI CARDS — Strict 1-col on mobile, 4-col on lg
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch ${FADE}`} style={delay(100)}>
                <ActionCard
                    href={route('operator.fleet')}
                    icon={Bike}
                    active
                    value={primaryUnit?.coding_scheme_number || 'No Unit'}
                    badge={primaryUnit ? 'Unit' : ''}
                    label="Registered Tricycle"
                    meta={primaryUnit ? `Plate ${primaryUnit.plate_number || 'N/A'}` : 'Register a unit to get started'}
                    footerLabel="Action:"
                    cta="Manage Unit"
                    colorTheme="indigo"
                />
                <ActionCard
                    href={route('operator.violations')}
                    icon={ShieldAlert}
                    active={violationCount > 0}
                    danger={violationCount > 0}
                    value={violationCount}
                    badge={violationCount === 1 ? 'Ticket' : 'Tickets'}
                    label="Active Violations"
                    meta={finesDue ? `₱${stats.pending_fine_amount} unsettled` : 'No unsettled fines'}
                    footerLabel="Settlement:"
                    cta={violationCount > 0 ? 'View Tickets' : 'View Records'}
                    colorTheme={violationCount > 0 ? 'red' : 'emerald'}
                />
                <ActionCard
                    href={route('operator.mtop')}
                    icon={FileText}
                    active={!!expiredUnit}
                    danger={!!expiredUnit}
                    value={expiredUnit ? (expiredUnit.has_pending_renewal ? 'Renewing' : 'Expired') : (primaryUnit ? 'Valid' : 'None')}
                    badge="Franchise"
                    label="MTOP Franchise"
                    meta={primaryUnit ? `Expires ${primaryUnit.mtop_expiry || 'N/A'}` : 'No franchise on record'}
                    footerLabel="Permit:"
                    cta="View Details"
                    colorTheme={expiredUnit ? 'red' : 'emerald'}
                />
                <ActionCard
                    href={route('operator.mtop')}
                    icon={Calendar}
                    active={expiringRegistrations.length > 0}
                    danger={!!soonestExpiring && soonestExpiring.days_left <= 30}
                    value={expiringRegistrations.length}
                    badge="Alerts"
                    label="Renewal Alerts"
                    meta={soonestExpiring && renewalCountdown ? `${soonestExpiring.coding_scheme_number} — renews ${renewalCountdown}` : 'No upcoming renewals'}
                    footerLabel="Schedule:"
                    cta="View Franchise"
                    colorTheme={soonestExpiring && soonestExpiring.days_left <= 30 ? 'amber' : 'blue'}
                />
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. STATUS & ORDINANCE — Coding Schedule + Compliance Ring
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6 items-stretch ${FADE}`} style={delay(150)}>
                {/* Left: 7-Day Coding Schedule Strip (2 Cols on lg) */}
                <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 ${CARD_SHADOW} lg:col-span-2`}>
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#182B62]/[0.08] text-[#182B62]">
                                    <Calendar size={16} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 leading-tight">Weekly Coding Schedule</h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Municipal Color Coding Ordinance schedule</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Restricted Today:</span>
                                <span className="font-mono text-xs font-black text-[#182B62]">{todayRule.digits}</span>
                            </div>
                        </div>

                        {/* 7 Day schedule cards */}
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
                            {codingRules.map((rule) => {
                                const isToday = rule.day === todayName;
                                return (
                                    <div
                                        key={rule.day}
                                        className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 lg:flex-col lg:justify-center lg:gap-1.5 lg:p-2 lg:text-center transition-all ${
                                            isToday
                                                ? 'border-[#182B62] bg-[#182B62]/[0.03] shadow-xs'
                                                : 'border-slate-200/70 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center gap-1.5 lg:gap-1">
                                            <span className="truncate text-xs font-bold text-slate-700 lg:text-[11px]">
                                                <span className="lg:hidden">{rule.day}</span>
                                                <span className="hidden lg:inline">{rule.day.slice(0, 3)}</span>
                                            </span>
                                            {isToday && (
                                                <span className="shrink-0 rounded-md bg-[#182B62] px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-white lg:hidden">
                                                    Today
                                                </span>
                                            )}
                                        </div>
                                        <span className="shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide lg:w-full lg:truncate lg:text-[9.5px]" style={rule.badgeStyle}>
                                            {rule.color}
                                        </span>
                                        {isToday && (
                                            <span className="hidden rounded-md bg-[#182B62] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white lg:block">
                                                Today
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3 text-slate-600">
                        <Info size={15} className="mt-0.5 shrink-0 text-[#182B62]" />
                        <p className="text-[11px] leading-relaxed">
                            Automated IoT enforcement is active across the municipal center. Ensure your unit is parked or off restricted corridors on designated coding days.
                        </p>
                    </div>
                </div>

                {/* Right: Compliance Score Card (1 Col on lg) */}
                <div className={`flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 ${CARD_SHADOW} text-center`}>
                    <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health & Compliance</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                            complianceScore >= 80 ? 'bg-emerald-50 text-emerald-700' : complianceScore >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {complianceScore >= 80 ? 'Optimal Standing' : complianceScore >= 50 ? 'Needs Attention' : 'Critical Standing'}
                        </span>
                    </div>

                    <div className="my-3 flex flex-col items-center">
                        <ScoreRing value={complianceScore} color={scoreTone} size={150} textClassName="text-slate-900" trackColor="#F1F5F9" />
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Calculated from active MTOP permit validity, scheduled inspections, and unsettled traffic citation records.
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                5. FRANCHISE APPLICATION PROGRESS (conditional)
               ══════════════════════════════════════════════════════════════ */}
            {applicationProgress && (
                <div className={`mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 ${CARD_SHADOW} ${FADE}`} style={delay(180)}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#182B62]/[0.08] text-[#182B62]">
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
                        <Link
                            href={route('operator.mtop.details', { id: applicationProgress.db_id })}
                            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                        >
                            View Application
                        </Link>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5">
                        {Array.from({ length: applicationProgress.totalSteps }).map((_, i) => {
                            const stepNum = i + 1;
                            const isDone = stepNum < applicationProgress.step;
                            const isCurrent = stepNum === applicationProgress.step;
                            return (
                                <div
                                    key={i}
                                    className={`h-2 flex-1 rounded-full ${
                                        isDone ? 'bg-[#182B62]' : isCurrent ? 'bg-[#182B62]/60' : 'bg-slate-100'
                                    }`}
                                />
                            );
                        })}
                    </div>

                    <p className={`mt-3 flex items-start gap-1.5 text-xs leading-relaxed ${applicationProgress.needsAction ? 'font-semibold text-[#182B62]' : 'text-slate-500'}`}>
                        {applicationProgress.needsAction && <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                        {applicationProgress.message}
                    </p>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                6. MAIN CONTENT — My Tricycle and Active Violations (paired)
               ══════════════════════════════════════════════════════════════ */}
            <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch ${FADE}`} style={delay(220)}>

                {/* My Tricycle */}
                <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#182B62]/[0.08] text-[#182B62]">
                                <Bike size={16} strokeWidth={2.2} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900">My Tricycle</h2>
                        </div>
                        <Link href={route('operator.fleet')} className="shrink-0 text-xs font-bold text-[#182B62] hover:text-[#25449B]">
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
                        <div key={trike.id} className="flex flex-1 flex-col gap-4 p-5">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#182B62]/[0.08] text-[#182B62]">
                                    <Bike size={22} strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-base font-bold leading-tight text-slate-900">{trike.coding_scheme_number || 'N/A'}</h3>
                                    <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-slate-600">
                                        {trike.plate_number || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    <FileText size={13} /> MTOP Franchise
                                </span>
                                <span className={`text-xs font-bold ${trike.is_expired ? 'text-red-600' : 'text-[#182B62]'}`}>
                                    {trike.mtop_status || 'Valid'} &bull; {trike.mtop_expiry || 'N/A'}
                                </span>
                            </div>

                            {trike.mtop_days_left !== null && trike.mtop_days_left <= 30 && (
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#182B62]">
                                    <Clock size={13} className="shrink-0" />
                                    {trike.mtop_days_left > 0
                                        ? `Expires in ${trike.mtop_days_left} day${trike.mtop_days_left !== 1 ? 's' : ''} — renew soon.`
                                        : 'Expires today — renew as soon as possible.'}
                                </p>
                            )}

                            <Link
                                href={route('operator.fleet')}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors lg:mt-auto shadow-2xs"
                            >
                                View Full Vehicle Details <ChevronRight size={13} />
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Active Violations */}
                <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                <AlertTriangle size={16} strokeWidth={2.2} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900">Active Violations</h2>
                        </div>
                        {violationCount > 0 && (
                            <Link href={route('operator.violations')} className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-700">
                                View all ({violationCount})
                            </Link>
                        )}
                    </div>
                    {recentViolations.length > 0 ? (
                        <div className="flex-1 divide-y divide-slate-100">
                            {recentViolations.slice(0, 3).map((v) => (
                                <div key={v.id} className="flex items-center justify-between gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50/60">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                            <Ban size={15} strokeWidth={2.4} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-bold text-slate-900">Color Coding Breach</p>
                                            <p className="truncate text-[11px] text-slate-500 mt-0.5">{v.date} &bull; Unit {v.coding_scheme_number}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={route('operator.violations.ticket', { id: v.id })}
                                        className="shrink-0 rounded-xl bg-[#182B62] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#25449B] transition-colors"
                                    >
                                        View Ticket
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#182B62]/[0.08]">
                                <ShieldCheck size={22} className="text-[#182B62]" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">No active violations</p>
                            <p className="mt-1 max-w-xs text-xs text-slate-500">You are fully compliant with the Color Coding Ordinance.</p>
                        </div>
                    )}
                </div>

            </div>
        </OperatorLayout>
    );
}

function ScoreRing({ value, max = 100, color, size = 140, label, textClassName = 'text-slate-900', trackColor = '#F1F5F9' }) {
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
                    <span className={`font-extrabold tabular-nums ${textClassName}`} style={{ fontSize: size * 0.2 }}>{value}%</span>
                </div>
            </div>
        </div>
    );
}

function ActionCard({ href, icon: Icon, active, danger, value, label, badge, meta, cta, footerLabel = 'Details:', colorTheme = 'default' }) {
    let iconWrapClass = 'bg-indigo-50 border-indigo-100 text-[#182B62]';
    let valueColorClass = 'text-slate-900';

    if (danger || colorTheme === 'red') {
        iconWrapClass = 'bg-red-50 border-red-100 text-red-600';
        valueColorClass = 'text-red-600';
    } else if (colorTheme === 'amber') {
        iconWrapClass = 'bg-amber-50 border-amber-100 text-amber-600';
        valueColorClass = 'text-amber-600';
    } else if (colorTheme === 'emerald') {
        iconWrapClass = 'bg-emerald-50 border-emerald-100 text-emerald-600';
        valueColorClass = 'text-emerald-600';
    } else if (colorTheme === 'blue') {
        iconWrapClass = 'bg-blue-50 border-blue-100 text-[#182B62]';
        valueColorClass = 'text-slate-900';
    }

    return (
        <Link
            href={href}
            className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)] ${danger ? 'hover:border-red-300' : ''}`}
        >
            <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                    </span>
                    <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border ${iconWrapClass}`}>
                        <Icon size={15} strokeWidth={2.2} />
                    </div>
                </div>
                <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                    <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${valueColorClass}`}>
                        {value}
                    </span>
                    {badge && (
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                    {meta}
                </p>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 truncate">{footerLabel}</span>
                <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold flex items-center gap-1 transition-colors shrink-0 ${danger ? 'text-red-600 group-hover:text-red-700' : 'text-[#182B62] group-hover:text-[#25449B]'}`}>
                    {cta} <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
            </div>
        </Link>
    );
}
