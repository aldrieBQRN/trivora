import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
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

export default function Dashboard({
    pipeline = { document_review: 0, physical: 0, final_confirmation: 0 },
    pipelineBreakdown = {
        document_review: { new: 0, resubmission: 0, oldest: null },
        physical: { scheduled: 0, reinspection: 0, oldest: null },
        final_confirmation: { oldest: null },
    },
    bplo = { pending_verification: 0, verified_awaiting_release: 0 },
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
    useEffect(() => {
        const { stop } = router.poll(15000, {
            only: ['pipeline', 'pipelineBreakdown', 'bplo', 'myActivityToday', 'fleet', 'recentActivity'],
        });
        return () => stop();
    }, []);

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
        { key: 'document_review', count: pipeline.document_review, ...STAGE_META.document_review },
        { key: 'physical', count: pipeline.physical, ...STAGE_META.physical },
        { key: 'bplo', count: bplo.pending_verification + bplo.verified_awaiting_release, ...STAGE_META.bplo },
        { key: 'final_confirmation', count: pipeline.final_confirmation, ...STAGE_META.final_confirmation },
    ]), [pipeline, bplo]);

    const totalInFlight = stages.reduce((sum, s) => sum + s.count, 0);
    const activityMax = Math.max(myActivityToday.docs_reviewed, myActivityToday.inspections_completed, myActivityToday.confirmations_completed, 1);
    const actionableTotal = pipeline.document_review + pipeline.physical + pipeline.final_confirmation;
    const totalActionsToday = myActivityToday.docs_reviewed + myActivityToday.inspections_completed + myActivityToday.confirmations_completed;

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
            <div className={`relative mb-7 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-9 ${CARD_SHADOW} ${FADE}`} style={delay(0)}>
                {/* Barely-there ambient color — ties to the pipeline palette without ever reading
                    as a solid block. Ornamental only; ignored by everything but sighted users. */}
                <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/[0.07] to-transparent blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-400/[0.06] to-transparent blur-3xl" aria-hidden="true" />

                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-lg">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-[11px] font-bold text-white shadow-sm">
                                {initials}
                            </div>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-widest text-slate-500">
                                {today}
                            </span>
                        </div>

                        <h1 className="mt-4 text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-[1.1] text-slate-900">
                            {greeting}
                        </h1>
                        <p className="mt-2.5 text-[13px] sm:text-sm text-slate-500 leading-relaxed">
                            {actionableTotal > 0 ? (
                                <>You have <strong className="font-bold text-[#1D2542]">{actionableTotal}</strong> application{actionableTotal === 1 ? '' : 's'} across the pipeline waiting on your review.</>
                            ) : (
                                "You're all caught up — nothing is waiting on your review right now."
                            )}
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:max-w-sm">
                            {stages.map(s => {
                                const isHovered = hoveredStage === s.key;
                                return (
                                    <div
                                        key={s.key}
                                        onMouseEnter={() => setHoveredStage(s.key)}
                                        onMouseLeave={() => setHoveredStage(null)}
                                        className={`flex cursor-default items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                                            isHovered ? 'border-slate-200 bg-white shadow-sm' : 'border-transparent bg-slate-50'
                                        }`}
                                    >
                                        <span
                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold"
                                            style={{ background: `${s.hex}1A`, color: s.hex }}
                                        >
                                            {s.count > 99 ? '99+' : s.count}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-600">{s.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="hidden shrink-0 self-stretch border-l border-slate-100 lg:block" />

                    <div className="flex shrink-0 flex-col items-center gap-3">
                        <div className="relative h-[188px] w-[188px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={66}
                                        outerRadius={88}
                                        paddingAngle={donutData.length > 1 ? 3 : 0}
                                        cornerRadius={6}
                                        stroke="none"
                                        isAnimationActive
                                        animationDuration={900}
                                        animationEasing="ease-out"
                                    >
                                        {donutData.map((d) => (
                                            <Cell
                                                key={d.key}
                                                fill={d.color}
                                                opacity={hoveredStage && hoveredStage !== d.key ? 0.3 : 1}
                                                style={{ transition: 'opacity 200ms' }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<DonutTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[34px] font-extrabold tabular-nums text-slate-900 leading-none">{totalInFlight}</span>
                                <span className="mt-1.5 text-[9.5px] font-bold uppercase tracking-widest text-slate-400">In Pipeline</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PIPELINE ACTIONS — links straight into each queue
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-3 flex items-baseline justify-between ${FADE}`} style={delay(100)}>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pipeline Actions</h2>
                <span className="text-[11px] font-medium text-slate-400">{actionableTotal} total in queue</span>
            </div>
            <div className={`mb-7 grid grid-cols-1 gap-3.5 sm:grid-cols-3 sm:gap-5 ${FADE}`} style={delay(120)}>
                <PipelineCard
                    href="/tmo/docs" icon={FileSearch} count={pipeline.document_review} label="Document Review"
                    total={actionableTotal}
                    segments={[
                        { label: 'New', value: pipelineBreakdown.document_review.new, color: '#1D2542' },
                        { label: 'Resubmission', value: pipelineBreakdown.document_review.resubmission, color: '#F43F5E' },
                    ]}
                    oldest={pipelineBreakdown.document_review.oldest}
                />
                <PipelineCard
                    href="/tmo/physical" icon={ClipboardCheck} count={pipeline.physical} label="Physical Inspection"
                    total={actionableTotal}
                    segments={[
                        { label: 'Scheduled', value: pipelineBreakdown.physical.scheduled, color: '#1D2542' },
                        { label: 'Re-inspection', value: pipelineBreakdown.physical.reinspection, color: '#F43F5E' },
                    ]}
                    oldest={pipelineBreakdown.physical.oldest}
                />
                <PipelineCard
                    href="/tmo/final-confirmation" icon={ShieldCheck} count={pipeline.final_confirmation} label="Final Confirmation"
                    total={actionableTotal}
                    note={`${myActivityToday.confirmations_completed} confirmed today`}
                    oldest={pipelineBreakdown.final_confirmation.oldest}
                />
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. QUICK FACTS — BPLO visibility + Fleet & Violations
               ══════════════════════════════════════════════════════════════ */}
            <h2 className={`mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 ${FADE}`} style={delay(200)}>
                Quick Facts
            </h2>
            <div className={`mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 ${FADE}`} style={delay(200)}>
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} transition-shadow ${CARD_SHADOW_HOVER}`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.09] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Landmark size={16} strokeWidth={2.2} />
                            </div>
                            <h3 className="text-[13.5px] font-bold text-slate-900">Sticker Release (BPLO)</h3>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Read-only</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[26px] font-extrabold tracking-tight tabular-nums text-slate-900">{bplo.pending_verification}</span>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">Pending Payment Verification</p>
                        </div>
                        <div>
                            <span className="text-[26px] font-extrabold tracking-tight tabular-nums text-slate-900">{bplo.verified_awaiting_release}</span>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">Awaiting Sticker Release</p>
                        </div>
                    </div>
                </div>

                <Link href="/violations" className={`group rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} transition-all hover:-translate-y-0.5 hover:border-slate-300 ${CARD_SHADOW_HOVER}`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.09] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Bike size={16} strokeWidth={2.2} />
                            </div>
                            <h3 className="text-[13.5px] font-bold text-slate-900">Fleet &amp; Violations</h3>
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover:bg-[#1D2542] group-hover:text-white">
                            <ArrowUpRight size={13} strokeWidth={2.4} />
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div>
                            <span className="text-[26px] font-extrabold tracking-tight tabular-nums text-slate-900">{fleet.active_fleet}</span>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Active Fleet</p>
                        </div>
                        <div>
                            <span className="text-[26px] font-extrabold tracking-tight tabular-nums text-slate-900">{fleet.violations_today}</span>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Today</p>
                        </div>
                        <div>
                            <span className={`text-[26px] font-extrabold tracking-tight tabular-nums ${fleet.open_violations > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fleet.open_violations}</span>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Open</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. RECENT ACTIVITY + YOUR ACTIVITY TODAY — 7/5 split
               ══════════════════════════════════════════════════════════════ */}
            <h2 className={`mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 ${FADE}`} style={delay(280)}>
                Activity
            </h2>
            <div className={`grid grid-cols-1 gap-4 lg:grid-cols-12 ${FADE}`} style={delay(280)}>
                <div className={`lg:col-span-7 flex flex-col rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.09] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Clock size={15} strokeWidth={2.2} />
                            </div>
                            <h3 className="text-[13.5px] font-bold text-slate-900">Recent Activity</h3>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">Last {recentActivity.length}</span>
                    </div>

                    {recentActivity.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-12">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Inbox size={20} strokeWidth={1.8} />
                            </div>
                            <p className="text-center text-xs text-slate-400">No pipeline activity recorded yet.</p>
                        </div>
                    ) : (
                        <div className="flex-1 divide-y divide-slate-100">
                            {recentActivity.map(item => (
                                <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                    <div className="min-w-0 flex flex-1 items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-slate-900">{item.reference}</span>
                                                <span className="text-[11px] text-slate-400">{item.operator}</span>
                                            </div>
                                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{formatStatus(item.from_status)}</span>
                                                <ChevronRight size={11} className="text-slate-300" />
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{formatStatus(item.to_status)}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-[11px] font-semibold text-slate-600">{item.changed_by}</p>
                                            <p className="text-[10px] text-slate-400">{item.when}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Your activity today: recharts radial gauges ── */}
                <div className={`lg:col-span-5 flex flex-col rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.09] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <CheckCircle2 size={15} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[13.5px] font-bold text-slate-900">Your Activity Today</h3>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-2 py-2">
                        <div className="grid grid-cols-3 gap-2">
                            <ActivityRadial value={myActivityToday.docs_reviewed} max={activityMax} label="Docs Reviewed" color={STAGE_META.document_review.hex} size={92} />
                            <ActivityRadial value={myActivityToday.inspections_completed} max={activityMax} label="Inspections" color={STAGE_META.physical.hex} size={92} />
                            <ActivityRadial value={myActivityToday.confirmations_completed} max={activityMax} label="Confirmations" color={STAGE_META.final_confirmation.hex} size={92} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <span className="text-[11px] font-medium text-slate-500">Total actions today</span>
                        <span className="text-lg font-extrabold tabular-nums text-slate-900">
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
            <span className="mt-0.5 block text-sm font-extrabold tabular-nums text-slate-900">{d.value} applications</span>
        </div>
    );
}

function PipelineCard({ href, icon: Icon, count, label, segments, oldest, note, total = 0 }) {
    const active = count > 0;
    const segTotal = segments ? segments.reduce((sum, s) => sum + s.value, 0) : 0;
    const shareOfQueue = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
        <Link
            href={href}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW} transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/50 ${CARD_SHADOW_HOVER}`}
        >
            <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    active
                        ? 'bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]'
                        : 'bg-slate-100 text-slate-400'
                }`}>
                    <Icon size={18} strokeWidth={2.2} />
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-all group-hover:bg-[#1D2542] group-hover:text-white">
                    <ChevronRight size={15} strokeWidth={2.4} className="transition-transform group-hover:translate-x-0.5" />
                </span>
            </div>

            <div className="mt-4">
                <div className="flex items-baseline gap-2">
                    <span className={`text-[32px] font-extrabold tracking-tight tabular-nums leading-none ${active ? 'text-[#1D2542]' : 'text-slate-900'}`}>
                        {count}
                    </span>
                    {active && total > 0 && (
                        <span className="text-[11px] font-bold text-slate-400">{shareOfQueue}% of queue</span>
                    )}
                </div>
                <p className="mt-1.5 text-[13px] font-semibold text-slate-700">{label}</p>
            </div>

            <div className="mt-4 min-h-[40px]">
                {segTotal > 0 ? (
                    <>
                        <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
                            {segments.filter(s => s.value > 0).map(s => (
                                <div key={s.label} className="h-full rounded-full" style={{ background: s.color, flexGrow: s.value, flexBasis: 0 }} />
                            ))}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]">
                            {segments.map(s => (
                                <span key={s.label} className="flex items-center gap-1 font-semibold text-slate-500">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                                    {s.value} {s.label}
                                </span>
                            ))}
                        </div>
                    </>
                ) : note ? (
                    <p className="text-[11px] font-medium text-slate-500">{note}</p>
                ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                <span className="text-slate-400">{oldest ? `Oldest: ${oldest} waiting` : 'All clear'}</span>
                <span className="font-semibold text-[#1D2542]">Review Now</span>
            </div>
        </Link>
    );
}

function ActivityRadial({ value, max, label, color, size = 76 }) {
    const data = [{ name: label, value }];
    const barSize = Math.max(6, Math.round(size * 0.1));
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative" style={{ height: size, width: size }}>
                <ResponsiveContainer width="100%" height="100%">
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
                            background={{ fill: '#F1F5F9' }}
                            isAnimationActive
                            animationDuration={700}
                            animationEasing="ease-out"
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-extrabold tabular-nums text-slate-900">{value}</span>
                </div>
            </div>
            <span className="text-center text-[10px] font-semibold leading-tight text-slate-500">{label}</span>
        </div>
    );
}
