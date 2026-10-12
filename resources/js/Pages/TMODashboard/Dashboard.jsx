import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    FileSearch, ClipboardCheck, ShieldCheck, Bike,
    ChevronRight, Landmark, CheckCircle2, Clock, Inbox, ArrowUpRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

const STAGE_META = {
    document_review:    { label: 'Document Review',      hex: '#F59E0B' },
    physical:            { label: 'Physical Inspection',  hex: '#6366F1' },
    bplo:                { label: 'BPLO Sticker Release', hex: '#A855F7' },
    final_confirmation: { label: 'Final Confirmation',    hex: '#10B981' },
};

// A soft, layered shadow (subtle contact shadow + a wider ambient falloff) reads as far more
// premium than Tailwind's flat shadow-sm/md utilities alone — this is the one shadow token every
// card on this page shares, so elevation stays consistent throughout.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
const CARD_SHADOW_HOVER = 'hover:shadow-[0_2px_4px_0_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.16)]';

const FADE = 'dash-fade';
const delay = (ms) => ({ animationDelay: `${ms}ms` });

// Every number this page renders arrives as a raw Inertia prop. Coerce each one at its point of
// use so a missing/renamed field can never reach the DOM as `NaN`: a non-numeric value becomes 0
// — the same "nothing here yet" this page already shows for an empty queue — while a real number
// is passed through untouched. Nothing is computed, estimated or fabricated here.
const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

export default function Dashboard({
    pipeline = { document_review: 0, physical: 0, final_confirmation: 0 },
    pipelineBreakdown = {
        document_review: { new: 0, resubmission: 0, oldest: null },
        physical: { scheduled: 0, reinspection: 0, oldest: null },
        final_confirmation: { oldest: null },
    },
    // Shape matches TMO\DashboardController::index(), which sends exactly one BPLO count:
    // `pending_release` (status `pending_bplo_release`). The old default advertised two other
    // fields the backend never sends, and summing those `undefined` values is what produced the
    // `NaN` rendered in the hero stage chip and the "In Pipeline" total.
    bplo = { pending_release: 0 },
    myActivityToday = { docs_reviewed: 0, inspections_completed: 0, confirmations_completed: 0 },
    fleet = { active_fleet: 0, violations_today: 0, open_violations: 0 },
    recentActivity = [],
}) {
    const { props } = usePage();
    const userName = props?.auth?.user?.name || 'Officer';
    const firstName = userName.split(' ')[0];
    const initials = userName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'TO';

    // Silent background refresh so a workflow change made by another TMO/BPLO user shows up here
    // without a manual reload — only re-requests the counts/lists this page actually renders.
    useBackgroundRefresh(['pipeline', 'pipelineBreakdown', 'bplo', 'myActivityToday', 'fleet', 'recentActivity']);

    const [hoveredStage, setHoveredStage] = useState(null);

    const { greeting, today } = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        return {
            greeting: `Good ${timeOfDay}, ${firstName}`,
            today: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        };
    }, [firstName]);

    const stages = useMemo(() => ([
        { key: 'document_review', count: toCount(pipeline.document_review), ...STAGE_META.document_review },
        { key: 'physical', count: toCount(pipeline.physical), ...STAGE_META.physical },
        // BPLO stage = applications sitting in the sticker-release queue. The backend sends that
        // as `pending_release` (TMO\DashboardController::index()), the exact same count the Quick
        // Facts card below already shows as "Pending BPLO Release".
        { key: 'bplo', count: toCount(bplo.pending_release), ...STAGE_META.bplo },
        { key: 'final_confirmation', count: toCount(pipeline.final_confirmation), ...STAGE_META.final_confirmation },
    ]), [pipeline, bplo]);

    const totalInFlight = stages.reduce((sum, s) => sum + s.count, 0);
    const activityMax = Math.max(
        toCount(myActivityToday.docs_reviewed),
        toCount(myActivityToday.inspections_completed),
        toCount(myActivityToday.confirmations_completed),
        1
    );
    const actionableTotal = toCount(pipeline.document_review) + toCount(pipeline.physical) + toCount(pipeline.final_confirmation);
    const totalActionsToday = toCount(myActivityToday.docs_reviewed) + toCount(myActivityToday.inspections_completed) + toCount(myActivityToday.confirmations_completed);

    const donutData = stages.filter(s => s.count > 0).map(s => ({ key: s.key, name: s.label, value: s.count, color: s.hex }));

    return (
        <TrivoraLayout title="Dashboard" role="TMO Officer">
            <Head title="Dashboard | TRIVORA" />

            <style>{`
                @keyframes dashFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .${FADE} { animation: dashFadeUp .5s cubic-bezier(.16,1,.3,1) both; }
                @media (prefers-reduced-motion: reduce) { .${FADE} { animation: none; } }
            `}</style>

            {/* ══════════════════════════════════════════════════════════════
                1. HERO SUMMARY — greeting + live pipeline composition
               ══════════════════════════════════════════════════════════════ */}
            <div className={`relative mb-6 sm:mb-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:px-7 sm:py-5 lg:px-8 lg:py-6 ${CARD_SHADOW} ${FADE}`} style={delay(0)}>
                {/* Subtle, refined ambient gradient accents */}
                <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-[#25449B]/10 to-indigo-500/5 blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-400/[0.07] to-transparent blur-3xl" aria-hidden="true" />

                <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
                    <div className="lg:col-span-7 xl:col-span-7">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-xs font-black text-white shadow-sm ring-2 ring-white">
                                {initials}
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[11.5px] sm:text-[12px] font-bold text-slate-800 leading-tight">
                                    {today}
                                </span>
                                <LiveClock />
                            </div>
                        </div>

                        <h1 className="mt-3 sm:mt-3.5 font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[26px] lg:text-[30px] font-black tracking-tight leading-[1.15] text-slate-900">
                            {greeting}
                        </h1>
                        <p className="mt-1.5 sm:mt-2 text-[12.5px] sm:text-[13.5px] text-slate-600 leading-relaxed font-normal max-w-lg">
                            {actionableTotal > 0 ? (
                                <>You have <strong className="font-extrabold text-[#182B62]">{actionableTotal}</strong> application{actionableTotal === 1 ? '' : 's'} waiting for your review today.</>
                            ) : (
                                "You're all caught up — no applications are currently pending your review."
                            )}
                        </p>
                    </div>

                    <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end">
                        <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 p-3 sm:p-4 shadow-2xs w-full sm:w-auto">
                            <div className="relative h-[140px] w-[140px] sm:h-[155px] sm:w-[155px] shrink-0 p-1 rounded-full bg-white border border-slate-200/60 shadow-2xs">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 150, height: 150 }}>
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={48}
                                            outerRadius={65}
                                            paddingAngle={donutData.length > 1 ? 4 : 0}
                                            cornerRadius={6}
                                            stroke="#FFFFFF"
                                            strokeWidth={2}
                                            isAnimationActive
                                            animationDuration={900}
                                            animationEasing="ease-out"
                                        >
                                            {donutData.map((d) => (
                                                <Cell
                                                    key={d.key}
                                                    fill={d.color}
                                                    opacity={hoveredStage && hoveredStage !== d.key ? 0.35 : 1}
                                                    style={{ transition: 'opacity 200ms' }}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<DonutTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tabular-nums text-slate-900 leading-none tracking-tight">{totalInFlight}</span>
                                    <span className="mt-1 font-['Plus_Jakarta_Sans',sans-serif] text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-widest text-slate-400">In Progress</span>
                                </div>
                            </div>

                            {/* Clean full-height vertical divider */}
                            <div className="hidden sm:block w-px self-stretch bg-slate-200/80 my-1.5" aria-hidden="true" />
                            <div className="sm:hidden w-full h-px bg-slate-200/80" aria-hidden="true" />

                            <div className="flex flex-col justify-center gap-1.5 sm:gap-2 min-w-0 sm:min-w-[170px] w-full sm:w-auto">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-['Plus_Jakarta_Sans',sans-serif]">Application Status</span>
                                {stages.map(s => {
                                    const isHovered = hoveredStage === s.key;
                                    return (
                                        <div
                                            key={s.key}
                                            onMouseEnter={() => setHoveredStage(s.key)}
                                            onMouseLeave={() => setHoveredStage(null)}
                                            className={`flex items-center justify-between gap-3 text-xs px-2 py-0.5 -mx-2 rounded-lg transition-all cursor-default ${
                                                isHovered ? 'bg-white shadow-xs' : 'hover:bg-white/60'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 font-medium text-slate-600 truncate">
                                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.hex }} />
                                                <span className="truncate text-[11.5px] sm:text-[12px]">{s.label}</span>
                                            </span>
                                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold tabular-nums text-slate-900 text-[11.5px] sm:text-[12px]">{s.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PROCESSING QUEUES — links straight into each queue
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-3.5 sm:mb-4 flex flex-wrap items-baseline justify-between gap-2 ${FADE}`} style={delay(100)}>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[12.5px] sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-800">Processing Queues</h2>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[11px] sm:text-[11.5px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200/50 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">{actionableTotal} pending review</span>
            </div>
            <div className={`mb-5 sm:mb-6 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5 ${FADE}`} style={delay(120)}>
                <PipelineCard
                    href="/tmo/docs" icon={FileSearch} count={toCount(pipeline.document_review)} label="Document Review"
                    themeColor="#182B62"
                    total={actionableTotal}
                    segments={[
                        { label: 'New', value: toCount(pipelineBreakdown.document_review.new), color: '#182B62' },
                        { label: 'Resubmission', value: toCount(pipelineBreakdown.document_review.resubmission), color: '#F43F5E' },
                    ]}
                    oldest={pipelineBreakdown.document_review.oldest}
                />
                <PipelineCard
                    href="/tmo/physical" icon={ClipboardCheck} count={toCount(pipeline.physical)} label="Physical Inspection"
                    themeColor="#6366F1"
                    total={actionableTotal}
                    segments={[
                        { label: 'Scheduled', value: toCount(pipelineBreakdown.physical.scheduled), color: '#182B62' },
                        { label: 'Re-inspection', value: toCount(pipelineBreakdown.physical.reinspection), color: '#F43F5E' },
                    ]}
                    oldest={pipelineBreakdown.physical.oldest}
                />
                <PipelineCard
                    href="/tmo/final-confirmation" icon={ShieldCheck} count={toCount(pipeline.final_confirmation)} label="Final Confirmation"
                    themeColor="#10B981"
                    total={actionableTotal}
                    segments={[
                        { label: 'Awaiting Approval', value: toCount(pipeline.final_confirmation), color: '#10B981' },
                        { label: 'Confirmed Today', value: toCount(myActivityToday.confirmations_completed), color: '#182B62' },
                    ]}
                    oldest={pipelineBreakdown.final_confirmation.oldest}
                />
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. QUICK FACTS — BPLO visibility + Fleet & Violations
                ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-3.5 sm:mb-4 flex items-center ${FADE}`} style={delay(200)}>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[12.5px] sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-800">
                    Quick Facts &amp; Registry
                </h2>
            </div>
            <div className={`mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 ${FADE}`} style={delay(200)}>
                {/* Sticker Release (BPLO) Card - balanced 3-tile structure matching Fleet & Violations */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 lg:p-7 ${CARD_SHADOW} transition-all ${CARD_SHADOW_HOVER}`}>
                    <div>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5 sm:pb-4">
                            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
                                    <Landmark size={19} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-[14px] sm:text-[15px] font-bold text-slate-900">Sticker Release (BPLO)</h3>
                                    <p className="truncate text-[11px] sm:text-[11.5px] text-slate-500">Business Permits &amp; Licensing Office</p>
                                </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-purple-50 border border-purple-200/60 px-2.5 sm:px-3 py-0.5 sm:py-1 font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                                BPLO Partner
                            </span>
                        </div>

                        <div className="mt-5 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3 lg:gap-3.5">
                            <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-xl bg-purple-50/70 border border-purple-100/90 flex flex-col justify-center">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight tabular-nums text-purple-900 leading-none">
                                    {toCount(bplo.pending_release)}
                                </span>
                                <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] lg:text-[11.5px] font-bold text-purple-700 font-['Plus_Jakarta_Sans',sans-serif] truncate">Awaiting Release</p>
                            </div>
                            <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-center">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[12.5px] sm:text-[13.5px] lg:text-[14.5px] font-extrabold tracking-tight text-slate-800 leading-tight truncate">
                                    BPLO Office
                                </span>
                                <p className="mt-1 text-[10px] sm:text-[11px] lg:text-[11.5px] font-bold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] truncate">Municipal Hall</p>
                            </div>
                            <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-center">
                                <span className="inline-flex items-center font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[11px] lg:text-[11.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md w-fit">
                                    <span className="truncate">Active</span>
                                </span>
                                <p className="mt-1 text-[10px] sm:text-[11px] lg:text-[11.5px] font-bold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] truncate">Queue Status</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-5 pt-3 sm:pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium text-slate-500 truncate">
                            <Clock size={13} className="text-purple-500 shrink-0" />
                            <span className="truncate">Units awaiting municipal fee clearance and sticker issuance</span>
                        </span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-purple-700 text-[10.5px] sm:text-[11px] uppercase tracking-wider shrink-0">
                            View Only
                        </span>
                    </div>
                </div>

                {/* Fleet & Violations Card */}
                <Link href="/violations" className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 lg:p-7 ${CARD_SHADOW} transition-all hover:-translate-y-0.5 hover:border-slate-300 ${CARD_SHADOW_HOVER}`}>
                    <div>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5 sm:pb-4">
                            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
                                    <Bike size={19} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-[14px] sm:text-[15px] font-bold text-slate-900">Fleet &amp; Violations</h3>
                                    <p className="truncate text-[11px] sm:text-[11.5px] text-slate-500">Live Municipal Fleet Overview</p>
                                </div>
                            </div>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover:bg-[#182B62] group-hover:text-white">
                                <ArrowUpRight size={15} strokeWidth={2.4} />
                            </span>
                        </div>
                        <div className="mt-5 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3 lg:gap-3.5">
                            <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-center">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight tabular-nums text-slate-900 leading-none">{toCount(fleet.active_fleet)}</span>
                                <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] lg:text-[11.5px] font-bold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] truncate">Active Fleet</p>
                            </div>
                            <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-center">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight tabular-nums text-slate-900 leading-none">{toCount(fleet.violations_today)}</span>
                                <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] lg:text-[11.5px] font-bold text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] truncate">Today</p>
                            </div>
                            <div className={`p-2.5 sm:p-3 lg:p-3.5 rounded-xl border flex flex-col justify-center ${toCount(fleet.open_violations) > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-slate-50/80 border-slate-100'}`}>
                                <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight tabular-nums leading-none ${toCount(fleet.open_violations) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{toCount(fleet.open_violations)}</span>
                                <p className={`mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] lg:text-[11.5px] font-bold font-['Plus_Jakarta_Sans',sans-serif] truncate ${toCount(fleet.open_violations) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Open Cases</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-5 pt-3 sm:pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="text-[11px] sm:text-[11.5px] font-medium text-slate-500 truncate pr-2">Live Registry &amp; Citation Records</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#182B62] group-hover:text-[#25449B] flex items-center gap-1 shrink-0">
                            View Records &rarr;
                        </span>
                    </div>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. RECENT ACTIVITY + YOUR ACTIVITY TODAY — 7/5 split
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-3.5 sm:mb-4 flex items-center ${FADE}`} style={delay(280)}>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[12.5px] sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-800">
                    Activity &amp; Duty Log
                </h2>
            </div>
            <div className={`mb-6 sm:mb-8 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6 ${FADE}`} style={delay(280)}>
                <div className={`lg:col-span-7 flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-3.5">
                            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#182B62]">
                                    <Clock size={16} strokeWidth={2.2} />
                                </div>
                                <h3 className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-[14px] sm:text-[14.5px] font-bold text-slate-900">Recent Activity</h3>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 border border-slate-200/50 px-2.5 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold text-slate-500">Last {recentActivity.length}</span>
                        </div>

                        {recentActivity.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <Inbox size={22} strokeWidth={1.8} />
                                </div>
                                <p className="text-center text-xs font-medium text-slate-400">No activity recorded yet today.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100/90">
                                {recentActivity.map(item => (
                                    <div key={item.id} className="group px-4 sm:px-6 py-2.5 sm:py-3 transition-colors hover:bg-slate-50/80">
                                        {/* Mobile view (< sm): Structured 2-row layout */}
                                        <div className="flex flex-col gap-1.5 sm:hidden">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/90">
                                                        <CheckCircle2 size={11} strokeWidth={2.4} />
                                                    </div>
                                                    <span
                                                        title={item.operator && item.operator !== 'N/A' ? `Operator: ${item.operator} • Processed by: ${item.changed_by}` : `Processed by: ${item.changed_by}`}
                                                        className="font-mono text-[11.5px] font-bold text-[#182B62] bg-indigo-50/80 border border-indigo-100/80 px-2 py-0.5 rounded-md tracking-tight"
                                                    >
                                                        {item.reference}
                                                    </span>
                                                </div>
                                                <span className="text-[10.5px] font-medium text-slate-400 shrink-0 tabular-nums">
                                                    {item.when}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 pl-7 text-[10.5px]">
                                                <span className="rounded bg-slate-100 border border-slate-200/50 px-2 py-0.5 font-medium text-slate-600 truncate max-w-[130px]">
                                                    {formatStatus(item.from_status)}
                                                </span>
                                                <ChevronRight size={11} className="shrink-0 text-slate-400" />
                                                <span className="rounded bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 font-bold text-emerald-700 truncate max-w-[140px]">
                                                    {formatStatus(item.to_status)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Tablet & Desktop view (sm: and up): Sleek single-row layout */}
                                        <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/90 text-[10px] font-bold">
                                                    <CheckCircle2 size={12} strokeWidth={2.4} />
                                                </div>
                                                <span
                                                    title={item.operator && item.operator !== 'N/A' ? `Operator: ${item.operator} • Processed by: ${item.changed_by}` : `Processed by: ${item.changed_by}`}
                                                    className="font-mono text-xs font-bold text-[#182B62] bg-indigo-50/80 border border-indigo-100/80 px-2.5 py-0.5 rounded-md shrink-0 cursor-default"
                                                >
                                                    {item.reference}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                                                    <span className="rounded bg-slate-100 border border-slate-200/50 px-2 py-0.5 font-medium text-slate-600">
                                                        {formatStatus(item.from_status)}
                                                    </span>
                                                    <ChevronRight size={12} className="shrink-0 text-slate-400" />
                                                    <span className="rounded bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 font-bold text-emerald-700">
                                                        {formatStatus(item.to_status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-right shrink-0">
                                                <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                                                    {item.when}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Your activity today: recharts radial gauges ── */}
                <div className={`lg:col-span-5 flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <CheckCircle2 size={16} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[14px] sm:text-[14.5px] font-bold text-slate-900 leading-tight">Your Activity Today</h3>
                                    <p className="text-[10px] sm:text-[10.5px] text-slate-400">Daily Summary</p>
                                </div>
                            </div>
                            <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/50">Personal</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 my-3 sm:my-3.5">
                            <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-100/90 p-2 sm:p-3 transition-all hover:bg-white hover:shadow-xs">
                                <ActivityRadial value={toCount(myActivityToday.docs_reviewed)} max={activityMax} label="Docs Reviewed" color={STAGE_META.document_review.hex} size={64} />
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-100/90 p-2 sm:p-3 transition-all hover:bg-white hover:shadow-xs">
                                <ActivityRadial value={toCount(myActivityToday.inspections_completed)} max={activityMax} label="Inspections" color={STAGE_META.physical.hex} size={64} />
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-100/90 p-2 sm:p-3 transition-all hover:bg-white hover:shadow-xs">
                                <ActivityRadial value={toCount(myActivityToday.confirmations_completed)} max={activityMax} label="Confirmations" color={STAGE_META.final_confirmation.hex} size={64} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#182B62] to-[#25449B] p-3 sm:p-3.5 text-white shadow-sm mt-1">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-400 backdrop-blur-xs">
                                <CheckCircle2 size={15} strokeWidth={2.4} />
                            </div>
                            <div>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-white/70 block">
                                    Total Completed
                                </span>
                                <span className="text-[10.5px] sm:text-[11px] font-medium text-white/90">
                                    Tasks completed today
                                </span>
                            </div>
                        </div>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-lg sm:text-xl font-black tabular-nums text-white">
                            {totalActionsToday}
                        </span>
                    </div>
                </div>
            </div>
        </TrivoraLayout>
    );
}

function formatStatus(status) {
    if (!status) return '—';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function DonutTooltip({ active, payload }) {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0];
    return (
        <div className="rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 shadow-[0_2px_4px_0_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: d.payload.color }} />
                <span className="text-[11px] font-bold text-slate-800">{d.name}</span>
            </div>
            <span className="mt-0.5 block text-sm font-extrabold tabular-nums text-slate-900">{toCount(d.value)} applications</span>
        </div>
    );
}

function PipelineCard({ href, icon: Icon, count, label, segments, oldest, note, total = 0, themeColor = '#182B62' }) {
    const safeCount = toCount(count);
    const active = safeCount > 0;
    const segTotal = segments ? segments.reduce((sum, s) => sum + toCount(s.value), 0) : 0;
    const shareOfQueue = total > 0 ? Math.round((safeCount / total) * 100) : 0;

    return (
        <Link
            href={href}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-5 ${CARD_SHADOW} transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 ${CARD_SHADOW_HOVER}`}
        >
            <div>
                <div className="flex items-center justify-between">
                    <div
                        className="flex h-9.5 w-9.5 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-all duration-200 shadow-2xs"
                        style={{
                            background: active ? `${themeColor}15` : '#F1F5F9',
                            color: active ? themeColor : '#94A3B8',
                            border: `1px solid ${active ? `${themeColor}30` : '#E2E8F0'}`
                        }}
                    >
                        <Icon size={19} strokeWidth={2.2} />
                    </div>
                    <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-all group-hover:bg-[#182B62] group-hover:text-white group-hover:shadow-xs"
                    >
                        <ChevronRight size={15} strokeWidth={2.4} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>

                <div className="mt-3.5 sm:mt-4">
                    <div className="flex items-baseline gap-2">
                        <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[30px] lg:text-[32px] font-black tracking-tight tabular-nums leading-none ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                            {safeCount}
                        </span>
                        {active && total > 0 && (
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200/50 px-2 py-0.5 rounded-full">
                                {shareOfQueue}% of total
                            </span>
                        )}
                    </div>
                    <p className="mt-1 font-['Plus_Jakarta_Sans',sans-serif] text-[13.5px] sm:text-[14px] font-bold text-slate-800">{label}</p>
                </div>

                <div className="mt-3 min-h-[34px] sm:min-h-[36px]">
                    {segTotal > 0 ? (
                        <>
                            <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full bg-slate-100 p-0.5">
                                {segments.filter(s => toCount(s.value) > 0).map(s => (
                                    <div key={s.label} className="h-full rounded-full shadow-2xs" style={{ background: s.color, flexGrow: toCount(s.value), flexBasis: 0 }} />
                                ))}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-[10.5px] sm:text-[11px]">
                                {segments.map(s => (
                                    <span key={s.label} className="flex items-center gap-1.5 font-bold text-slate-600">
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                                        {toCount(s.value)} {s.label}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : note ? (
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[11px] sm:text-[11.5px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">{note}</p>
                    ) : null}
                </div>
            </div>

            <div className="mt-3.5 sm:mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 sm:pt-3 text-[11px] sm:text-[11.5px]">
                <span className="text-slate-400 font-medium flex items-center gap-1.5 truncate pr-2">
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{oldest ? `Oldest: ${oldest} waiting` : 'All caught up'}</span>
                </span>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#182B62] transition-colors group-hover:text-[#25449B] flex items-center gap-1 shrink-0">
                    Open queue &rarr;
                </span>
            </div>
        </Link>
    );
}

function ActivityRadial({ value, max, label, color, size = 64 }) {
    const data = [{ name: label, value }];
    const barSize = Math.max(5, Math.round(size * 0.1));
    return (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
            <div className="relative mx-auto w-full p-1 rounded-full bg-slate-50/70 border border-slate-100/70" style={{ maxWidth: size, aspectRatio: '1 / 1' }}>
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: size, height: size }}>
                    <RadialBarChart
                        innerRadius="72%"
                        outerRadius="100%"
                        data={data}
                        startAngle={90}
                        endAngle={-270}
                        barSize={barSize}
                    >
                        <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
                        <RadialBar
                            dataKey="value"
                            cornerRadius={barSize}
                            fill={color}
                            background={{ fill: '#E2E8F0' }}
                            isAnimationActive
                            animationDuration={700}
                            animationEasing="ease-out"
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-base sm:text-xl font-black tabular-nums text-slate-900">{value}</span>
                </div>
            </div>
            <span className="text-center font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[11px] font-bold leading-tight text-slate-600 truncate max-w-full">{label}</span>
        </div>
    );
}

function LiveClock() {
    const [time, setTime] = useState(() =>
        new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    );

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <span className="flex items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-semibold text-slate-500 tabular-nums leading-tight mt-0.5">
            <Clock size={11.5} strokeWidth={2.2} className="text-slate-400 shrink-0" />
            {time}
        </span>
    );
}
