import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    FileText, CheckCircle2, TrendingUp,
    Clock, ChevronRight, Hash, ShieldAlert, Award,
    Activity, ArrowUpRight, Users, Bike, Calendar,
    FolderCheck, ShieldCheck, Inbox
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

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
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 tabular-nums">
            <Clock size={13} className="text-slate-400 shrink-0" />
            <span>{time}</span>
        </span>
    );
}

export default function BPLODashboard({
    stats = {},
    weeklyIssuanceTrend = [],
    recentReleases = [],
}) {
    // Silent background refresh so numbers stay accurate in real-time
    useBackgroundRefresh(['stats', 'weeklyIssuanceTrend', 'recentReleases']);

    const totalRegistries = Number(stats?.totalRegistriesCount || 0);
    const activeFranchises = Number(stats?.activeFranchisesCount || 0);
    const pendingReleasing = Number(stats?.pendingReleasingCount || 0);
    const releasedToday = Number(stats?.releasedTodayCount || 0);
    const suspendedCount = Number(stats?.suspendedCount || 0);

    const activePct = totalRegistries > 0
        ? Math.round((activeFranchises / totalRegistries) * 100)
        : 100;

    // Format current date
    const todayDate = useMemo(() => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }, []);

    // Format chart data: use server data or fallback to 7 days
    const chartData = useMemo(() => {
        if (weeklyIssuanceTrend && weeklyIssuanceTrend.length > 0) {
            return weeklyIssuanceTrend;
        }
        return [
            { day: 'Mon', issued: 0 },
            { day: 'Tue', issued: 0 },
            { day: 'Wed', issued: 0 },
            { day: 'Thu', issued: 0 },
            { day: 'Fri', issued: 0 },
            { day: 'Sat', issued: 0 },
            { day: 'Sun', issued: 0 },
        ];
    }, [weeklyIssuanceTrend]);

    const weeklyTotalIssued = chartData.reduce((acc, curr) => acc + (curr.issued || 0), 0);

    return (
        <BPLOLayout title="Dashboard" role="BPLO Officer">
            <Head title="Dashboard | TRIVORA" />

            <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                {/* ══════════════════════════════════════════════════════════════
                    1. CLEAN HEADER (Dashboard Title, Subtitle & Live Date/Time)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed font-medium">
                            Municipal Tricycle Operator's Permit (MTOP) licensing, issuance &amp; fleet registry status
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <div className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 shadow-2xs">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <Calendar size={13} className="text-[#182B62] shrink-0" />
                                <span>{todayDate}</span>
                            </div>
                            <div className="h-3.5 w-px bg-slate-200" aria-hidden="true" />
                            <LiveClock />
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. OPERATIONAL KPI DECK (Strict 1-per-row on Mobile < 640px)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                    {/* Card 1: Active Registry */}
                    <Link
                        href="/bplo/registry"
                        className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 active:scale-[0.99]`}
                    >
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Active Registry
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <Hash size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {totalRegistries}
                                </span>
                                <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Tricycles
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 line-clamp-1">
                                Recorded municipal units on file
                            </p>
                        </div>

                        <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-100/90 px-3 py-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-400 text-[11px]">Masterlist:</span>
                            <span className="font-bold text-[#182B62] group-hover:text-indigo-600 flex items-center gap-1 transition-colors text-xs">
                                View <ArrowUpRight size={13} />
                            </span>
                        </div>
                    </Link>

                    {/* Card 2: Pending Releasing */}
                    <Link
                        href="/bplo/releasing"
                        className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-amber-300 active:scale-[0.99]`}
                    >
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Pending Releasing
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-amber-600 leading-none">
                                    {pendingReleasing}
                                </span>
                                <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {pendingReleasing > 0 ? 'Awaiting Sticker' : 'Cleared'}
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 line-clamp-1">
                                Cleared inspection, pending issuance
                            </p>
                        </div>

                        <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-100/90 px-3 py-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-400 text-[11px]">Queue:</span>
                            <span className="font-bold text-amber-700 group-hover:text-amber-800 flex items-center gap-1 transition-colors text-xs">
                                Process <ArrowUpRight size={13} />
                            </span>
                        </div>
                    </Link>

                    {/* Card 3: Issued Today */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW}`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Issued Today
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                                    <Award size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-blue-600 leading-none">
                                    {releasedToday}
                                </span>
                                <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Released
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 line-clamp-1">
                                Stickers signed off in current shift
                            </p>
                        </div>

                        <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-100/90 px-3 py-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-400 text-[11px]">Cycle:</span>
                            <span className="font-bold text-slate-800 text-xs">
                                Daily Output
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Active Franchises */}
                    <Link
                        href="/bplo/registry"
                        className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-emerald-300 active:scale-[0.99]`}
                    >
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Active Franchises
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2.5 flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {activeFranchises}
                                </span>
                                <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {activePct}% Rate
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 line-clamp-1">
                                In good standing ({suspendedCount} suspended)
                            </p>
                        </div>

                        <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-100/90 px-3 py-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-400 text-[11px]">Status:</span>
                            <span className="font-bold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1 transition-colors text-xs">
                                Compliant <ArrowUpRight size={13} />
                            </span>
                        </div>
                    </Link>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. ANALYTICS & RECENT ISSUANCES (Full Tablet & Mobile Support)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* Left: MTOP Issuance Trend AreaChart */}
                    <div className={`lg:col-span-7 xl:col-span-8 flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 ${CARD_SHADOW}`}>
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-2">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <TrendingUp size={16} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                                        MTOP Issuance Trend
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Daily released franchise stickers &amp; permits · last 7 days
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-700">
                                    Weekly: {weeklyTotalIssued} Units
                                </span>
                            </div>
                        </div>

                        {/* Chart Container matches right card height */}
                        <div className="flex-1 w-full min-h-[210px] pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#182B62" stopOpacity={0.22} />
                                            <stop offset="95%" stopColor="#182B62" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                                        dy={4}
                                        height={22}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '12px',
                                            border: '1px solid #E2E8F0',
                                            boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                                            fontSize: '12px',
                                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                                        }}
                                        itemStyle={{ color: '#0F172A', fontWeight: 700 }}
                                        labelStyle={{ color: '#64748B', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="issued"
                                        name="MTOPs Released"
                                        stroke="#182B62"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#colorIssued)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Recent Issuances Feed */}
                    <div className={`lg:col-span-5 xl:col-span-4 flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 ${CARD_SHADOW}`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                        <Activity size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                                            Recent Releases
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Latest processed franchise stickers
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Feed Items */}
                            {recentReleases.length === 0 ? (
                                <div className="py-7 text-center">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                        <Inbox size={20} strokeWidth={1.8} />
                                    </div>
                                    <p className="mt-2 text-xs font-semibold text-slate-700">No releases logged today</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Cleared applications ready for sticker issuance will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentReleases.slice(0, 3).map((rel) => (
                                        <div
                                            key={rel.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition-colors hover:bg-slate-50"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                                                    <CheckCircle2 size={13} strokeWidth={2.5} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-xs font-bold text-slate-900 truncate">
                                                            {rel.sticker_number || 'Sticker Issued'}
                                                        </span>
                                                        {rel.plate_number && rel.plate_number !== 'N/A' && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                • {rel.plate_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                                                        {rel.operator_name}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
                                                {rel.released_at}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Link
                            href="/bplo/releasing"
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 px-3 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98]"
                        >
                            <span>Open Releasing Queue</span>
                            <ChevronRight size={14} strokeWidth={2.2} />
                        </Link>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. QUICK WORKFLOW ACTIONS DECK
                   ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    {/* Action 1: Releasing Queue */}
                    <Link
                        href="/bplo/releasing"
                        className={`group rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW} hover:border-slate-300 transition-all flex items-center gap-3.5 active:scale-[0.99]`}
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-[#182B62] group-hover:scale-105 transition-transform">
                            <Bike size={20} strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#182B62] transition-colors leading-tight">
                                Releasing Queue
                            </h4>
                            <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                Assign Sticker Number &amp; release permits
                            </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </Link>

                    {/* Action 2: Franchise Masterlist */}
                    <Link
                        href="/bplo/registry"
                        className={`group rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW} hover:border-slate-300 transition-all flex items-center gap-3.5 active:scale-[0.99]`}
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 group-hover:scale-105 transition-transform">
                            <FolderCheck size={20} strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">
                                Active Registry
                            </h4>
                            <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                Search active units &amp; inspect records
                            </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </Link>

                    {/* Action 3: Staff Management */}
                    <Link
                        href="/bplo/users"
                        className={`group rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 ${CARD_SHADOW} hover:border-slate-300 transition-all flex items-center gap-3.5 active:scale-[0.99]`}
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 group-hover:scale-105 transition-transform">
                            <Users size={20} strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-tight">
                                Staff Directory
                            </h4>
                            <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                Manage BPLO personnel &amp; credentials
                            </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </Link>
                </div>
            </div>
        </BPLOLayout>
    );
}
