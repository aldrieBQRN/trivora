import React from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    FileText, CheckCircle2, TrendingUp,
    Clock, ChevronRight, Hash, ShieldAlert, Award,
    Activity, ArrowUpRight, Users, Bike, Calendar
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Shared soft, layered shadow token — matches the elevation language used across the TMO panel
// pages so every dashboard in the product reads as one consistent system.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function BPLODashboard({ stats }) {
    const activeRegistry = stats?.totalRegistriesCount || 0;
    const activeFranchises = stats?.activeFranchisesCount || 0;
    const pendingReleasing = stats?.pendingReleasingCount || 0;

    // Silent background refresh so these counts stay current without a manual reload.
    useBackgroundRefresh(['stats']);

    // MTOP Issuance Trend data
    const chartData = [
        { day: 'Mon', issued: 12 },
        { day: 'Tue', issued: 19 },
        { day: 'Wed', issued: 15 },
        { day: 'Thu', issued: 22 },
        { day: 'Fri', issued: 28 },
        { day: 'Sat', issued: 8 },
        { day: 'Sun', issued: 4 },
    ];

    const todayDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <BPLOLayout title="Dashboard" role="BPLO Officer">
            <Head title="Dashboard | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with TMO Standard)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Municipal Tricycle Operator's Permit (MTOP) licensing, issuance &amp; fleet registry status
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Today: {todayDate}</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. PREMIUM KPI CARD DECK (TMO Operations style)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Card 1: Active Registry */}
                <Link
                    href="/bplo/registry"
                    className={`group flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Active Registry
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <Hash size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                {activeRegistry}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Live Fleet
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            All permitted units on record
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Registry:</span>
                        <span className="text-xs font-bold text-[#1D2542] group-hover:text-indigo-600 flex items-center gap-0.5 transition-colors">
                            View <ArrowUpRight size={12} />
                        </span>
                    </div>
                </Link>

                {/* Card 2: Pending Releasing */}
                <Link
                    href="/bplo/releasing"
                    className={`group flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-amber-300`}
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Pending Releasing
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                                <Clock size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {pendingReleasing}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {pendingReleasing > 0 ? 'Action Needed' : 'Cleared'}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Cleared inspection, awaiting sticker
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Queue:</span>
                        <span className="text-xs font-bold text-amber-700 group-hover:text-amber-800 flex items-center gap-0.5 transition-colors">
                            Open <ArrowUpRight size={12} />
                        </span>
                    </div>
                </Link>

                {/* Card 3: Active Franchises */}
                <Link
                    href="/bplo/registry"
                    className={`group flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-emerald-300`}
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Active Franchises
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                <Award size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {activeFranchises}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Compliant
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            In good civic standing
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Masterlist:</span>
                        <span className="text-xs font-bold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-0.5 transition-colors">
                            View <ArrowUpRight size={12} />
                        </span>
                    </div>
                </Link>

                {/* Card 4: Revoked Franchises */}
                <Link
                    href="/bplo/registry"
                    className={`group flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-rose-300`}
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Revoked / Suspended
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                                <ShieldAlert size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                0
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Revoked
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Franchises pulled from circulation
                        </p>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Review:</span>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-rose-600 flex items-center gap-0.5 transition-colors">
                            Open <ArrowUpRight size={12} />
                        </span>
                    </div>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. CHARTS & ACTIVITY GRID
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* Left: Recharts Area Chart */}
                <div className={`lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <TrendingUp size={16} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">MTOP Issuance Trend</h3>
                                <p className="text-[11px] text-slate-500">Daily released plates and franchise approvals this week</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">Weekly Cycle</span>
                    </div>

                    <div className="h-[260px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1D2542" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#1D2542" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                                    dy={8}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '10px',
                                        border: '1px solid #E2E8F0',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: '#0F172A', fontWeight: 700 }}
                                    labelStyle={{ color: '#64748B', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="issued"
                                    name="MTOPs Issued"
                                    stroke="#1D2542"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorIssued)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Recent Issuances & Quick Actions */}
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 ${CARD_SHADOW} flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600">
                                    <Activity size={16} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Recent Issuances</h3>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700">Live feed</span>
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                                    <CheckCircle2 size={14} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate">Plate #8812 Issued</div>
                                    <div className="text-[11px] text-slate-500 truncate">Mario Dela Cruz • Brgy. Bucana</div>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">10m ago</span>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                                    <CheckCircle2 size={14} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate">Plate #4491 Issued</div>
                                    <div className="text-[11px] text-slate-500 truncate">Ricardo Dalisay • Brgy. 8</div>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">1h ago</span>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/60">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                                    <Clock size={14} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate">Awaiting Plate Number</div>
                                    <div className="text-[11px] text-amber-700 truncate">Arnaldo Baquiran (Inspection Passed)</div>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">2h ago</span>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/bplo/releasing"
                        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                        Open Releasing Queue <ChevronRight size={14} />
                    </Link>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. QUICK ACTION WORKFLOW DOCK
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/bplo/users"
                    className={`group rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW} hover:border-slate-300 transition-all flex items-center gap-3.5`}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/[0.12] to-amber-500/[0.02] text-amber-600 group-hover:scale-105 transition-transform">
                        <Users size={18} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            Staff Management
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                            Manage BPLO staff accounts &amp; access
                        </p>
                    </div>
                    <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                    href="/bplo/releasing"
                    className={`group rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW} hover:border-slate-300 transition-all flex items-center gap-3.5`}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542] group-hover:scale-105 transition-transform">
                        <Bike size={18} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            Plate &amp; Sticker Releasing
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                            Assign the Sticker Number &amp; release permits
                        </p>
                    </div>
                    <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                    href="/bplo/registry"
                    className={`group rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW} hover:border-slate-300 transition-all flex items-center gap-3.5`}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600 group-hover:scale-105 transition-transform">
                        <Hash size={18} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            Franchise Masterlist
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                            Search active units, export CSV &amp; inspect records
                        </p>
                    </div>
                    <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </BPLOLayout>
    );
}