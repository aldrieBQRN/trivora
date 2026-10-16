import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Bike, ShieldCheck, ShieldOff, Ban, Satellite, Clock, Palette, TrendingUp,
    ArrowUpRight, ChevronLeft, ChevronRight, AlertCircle, FileText
} from 'lucide-react';
import ReportCard from './ReportCard';
import {
    KpiTile, ChartTooltip, StatusDonut, ProfileRow, GranularityToggle,
    aggregateTrend, formatBucketLabel, CARD_SHADOW
} from './Shared';

const STATUS_COLORS = {
    active: '#10B981',
    unregistered: '#94A3B8',
    suspended: '#F59E0B',
    revoked: '#EF4444',
};

const STATUS_BADGES = {
    active: { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    unregistered: { label: 'Unregistered', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    suspended: { label: 'Suspended', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    revoked: { label: 'Revoked', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function FleetTab({ from, to, data }) {
    const [granularity, setGranularity] = useState('day');
    const [renewalPage, setRenewalPage] = useState(1);
    const pageSize = 8;

    const expiring = data.expiring || [];
    const nearestExpiring = expiring[0] || null;
    const hasDateFilter = Boolean(data.has_date_filter);

    const chartData = useMemo(
        () => aggregateTrend(data.registration_trend || [], granularity).map((d) => ({ ...d, label: formatBucketLabel(d.date, granularity) })),
        [data.registration_trend, granularity]
    );

    // Renewal table pagination
    const totalRenewalPages = Math.ceil(expiring.length / pageSize) || 1;
    const renewalStart = (renewalPage - 1) * pageSize;
    const paginatedExpiring = expiring.slice(renewalStart, renewalStart + pageSize);

    return (
        <div className="font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Context Header */}
            <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Franchise Fleet Registry Analytics</p>
                <p className="text-xs font-semibold text-slate-600 font-mono">
                    {hasDateFilter ? `Registered: ${from} – ${to}` : 'Live Municipal Registry · All Units'}
                </p>
            </div>

            {/* 4 Overview KPI Cards: 1 per row on mobile, 2 on tablet, 4 on desktop */}
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                <KpiTile
                    label="Registered Units"
                    value={data.kpis.total}
                    hint={hasDateFilter ? 'Registered in selected period' : 'Total tricycles on official record'}
                    icon={Bike}
                />
                <KpiTile label="Active Franchises" value={data.kpis.active} hint="Franchise currently active & compliant" icon={ShieldCheck} />
                <KpiTile label="Suspended Franchises" value={data.kpis.suspended} hint="Temporarily suspended by TMO/BPLO" icon={ShieldOff} />
                <KpiTile label="Revoked Franchises" value={data.kpis.revoked} hint="Permanently revoked franchises" icon={Ban} />
            </div>

            {/* Growth Trend & Status Overview */}
            <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <ReportCard
                    icon={TrendingUp}
                    title="Registration Growth Trend"
                    subtitle={hasDateFilter ? `New unit registrations · ${from} – ${to}` : 'New unit registrations · All time'}
                    className="lg:col-span-2"
                    action={<GranularityToggle value={granularity} onChange={setGranularity} />}
                >
                    {chartData.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No registrations recorded in this period.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={28} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" name="Registrations" fill="#182B62" radius={[6, 6, 0, 0]} barSize={granularity === 'day' ? 18 : 34} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ReportCard>

                <ReportCard icon={ShieldCheck} title="Franchise Standing Overview" subtitle="Every registry status in municipality">
                    <StatusDonut data={data.by_status} colors={STATUS_COLORS} />
                </ReportCard>
            </div>

            {/* Color Coding Scheme Bar Chart */}
            <div className="mb-6">
                <ReportCard icon={Palette} title="Tricycle Units by Color Coding Scheme" subtitle="Active franchises per municipal scheme color">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.by_color_scheme}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="scheme" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={28} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" name="Units" radius={[6, 6, 0, 0]} barSize={34}>
                                {data.by_color_scheme.map((entry, i) => (
                                    <Cell key={i} fill={entry.color || '#94A3B8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>
            </div>

            {/* Positioning Technology & Renewals Quick Summary */}
            <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ReportCard icon={Satellite} title="GPS Positioning Technology" subtitle="How active units broadcast live location">
                    <ProfileRow
                        items={[
                            { name: 'Installed GPS Tracker', count: data.tracking_split.iot, color: '#182B62' },
                            { name: 'Driver Mobile GPS', count: data.tracking_split.mobile, color: '#64748B' },
                        ]}
                    />
                </ReportCard>

                <ReportCard icon={Clock} title="Franchise Renewals Due Soon" subtitle="Franchises expiring within next 90 days">
                    {expiring.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No franchises due for renewal in the next 90 days.</p>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm p-4">
                            <div>
                                <p className="text-2xl sm:text-3xl font-black tabular-nums text-slate-900 leading-none">{expiring.length}</p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-600">
                                    franchise{expiring.length === 1 ? '' : 's'} expiring soon
                                </p>
                            </div>
                            <div className="hidden sm:block h-10 w-px shrink-0 bg-slate-200" />
                            <div className="min-w-0 border-t border-slate-200 sm:border-t-0 pt-3 sm:pt-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nearest Expiry</p>
                                <p className="truncate text-sm font-black text-slate-900 font-mono mt-0.5">{nearestExpiring.franchise_number}</p>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                    {nearestExpiring.operator} · <strong className="text-amber-700">{nearestExpiring.days_left} day{nearestExpiring.days_left === 1 ? '' : 's'} remaining</strong>
                                </p>
                            </div>
                        </div>
                    )}
                </ReportCard>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                FRANCHISES DUE FOR RENEWAL TABLE (Fully Responsive)
               ══════════════════════════════════════════════════════════════ */}
            {expiring.length > 0 && (
                <div className={`mb-6 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                                <Clock size={16} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                    Franchises Due for Renewal
                                </h3>
                                <p className="text-[11px] text-slate-600 font-medium">
                                    Units expiring within 90 days requiring renewal inspection and permit validation
                                </p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-2.5 py-1 rounded-lg w-fit">
                            {expiring.length} Due for Renewal
                        </span>
                    </div>

                    {/* Desktop Table View (>= 768px) */}
                    <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="py-3 pl-5 pr-3">Franchise No.</th>
                                    <th className="py-3 px-3">Tricycle Operator</th>
                                    <th className="py-3 px-3">Plate No.</th>
                                    <th className="py-3 px-3">Expiry Date</th>
                                    <th className="py-3 px-3">Validity Window</th>
                                    <th className="py-3 pr-5 pl-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {paginatedExpiring.map((e, idx) => (
                                    <tr key={`${e.franchise_number}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3.5 pl-5 pr-3 align-middle">
                                            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md shadow-sm">
                                                {e.franchise_number}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 align-middle font-bold text-slate-800">
                                            {e.operator}
                                        </td>
                                        <td className="py-3.5 px-3 align-middle">
                                            <span className="font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                                {e.plate}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 align-middle font-medium text-slate-600">
                                            {e.expiry_date}
                                        </td>
                                        <td className="py-3.5 px-3 align-middle">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                                                e.days_left <= 30
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                <AlertCircle size={11} strokeWidth={2.5} />
                                                <span>{e.days_left} {e.days_left === 1 ? 'day' : 'days'} left</span>
                                            </span>
                                        </td>
                                        <td className="py-3.5 pr-5 pl-3 text-right align-middle">
                                            <Link
                                                href={e.tricycle_id ? `/tmo/tricycle/${e.tricycle_id}` : '/tmo/registry'}
                                                className="inline-flex items-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all active:scale-[0.98]"
                                            >
                                                <span>View Unit</span>
                                                <ArrowUpRight size={11} strokeWidth={2.5} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Deck (< 768px) */}
                    <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-2 lg:hidden">
                        {paginatedExpiring.map((e, idx) => (
                            <div key={`${e.franchise_number}-mob-${idx}`} className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                        {e.franchise_number}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                        e.days_left <= 30
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        <AlertCircle size={10} strokeWidth={2.5} />
                                        <span>{e.days_left}d left</span>
                                    </span>
                                </div>

                                <div className="mt-2.5 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-slate-900">{e.operator}</p>
                                        <span className="font-mono text-[11px] font-bold text-slate-600">Plate: {e.plate}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[11px] font-medium text-slate-600">Expires</span>
                                        <p className="text-xs font-bold text-slate-800">{e.expiry_date}</p>
                                    </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                                    <Link
                                        href={e.tricycle_id ? `/tmo/tricycle/${e.tricycle_id}` : '/tmo/registry'}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#182B62] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm"
                                    >
                                        <span>View Unit</span>
                                        <ArrowUpRight size={11} strokeWidth={2.5} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalRenewalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                            <p className="text-xs text-slate-600">
                                Showing <strong className="text-slate-900">{renewalStart + 1}–{Math.min(renewalStart + pageSize, expiring.length)}</strong> of <strong className="text-slate-900">{expiring.length}</strong>
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setRenewalPage((p) => Math.max(1, p - 1))}
                                    disabled={renewalPage === 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-40"
                                >
                                    <ChevronLeft size={13} />
                                    <span>Prev</span>
                                </button>
                                <span className="text-xs font-bold text-slate-600 px-2 font-mono">{renewalPage} / {totalRenewalPages}</span>
                                <button
                                    onClick={() => setRenewalPage((p) => Math.min(totalRenewalPages, p + 1))}
                                    disabled={renewalPage === totalRenewalPages}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-40"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
