import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { EmptyState } from '@/Components/TMO';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ShieldAlert, Wallet, TrendingUp, Scale, Radio, Layers, CalendarDays, FileText, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ReportCard from './ReportCard';
import { KpiTile, ChartTooltip, StatusDonut, ProfileRow, GranularityToggle, aggregateTrend, formatBucketLabel, CARD_SHADOW } from './Shared';

const STATUS_COLORS = {
    open: '#F59E0B',
    acknowledged: '#3B82F6',
    contested: '#8B5CF6',
    resolved: '#10B981',
    dismissed: '#94A3B8',
};

function peso(n) {
    return `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ViolationsTab({ from, to, data }) {
    const [granularity, setGranularity] = useState('day');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const chartData = useMemo(
        () => aggregateTrend(data.trend, granularity).map((d) => ({ ...d, label: formatBucketLabel(d.date, granularity) })),
        [data.trend, granularity]
    );

    const records = data.records || [];
    const totalPages = Math.ceil(records.length / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedRecords = records.slice(startIndex, startIndex + pageSize);

    return (
        <div className="font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Violation &amp; Compliance Analytics</p>
                <p className="text-xs font-semibold text-slate-500 font-mono">{from} – {to}</p>
            </div>

            {/* 4 Overview KPI Cards: 1 per row on mobile, 2 on tablet, 4 on desktop */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                <KpiTile label="Total Citations" value={data.kpis.total_violations} hint="Recorded in selected period" icon={ShieldAlert} />
                <KpiTile label="Penalties Assessed" value={peso(data.kpis.fines_assessed)} hint="Total fines issued in period" icon={Wallet} />
                <KpiTile
                    label="Penalties Collected"
                    value={peso(data.kpis.fines_collected)}
                    hint={`${data.kpis.collection_rate}% collection rate to date`}
                    icon={Wallet}
                />
                <KpiTile
                    label="Contested Appeals"
                    value={data.kpis.appeals_filed}
                    hint={data.kpis.appeal_approval_rate !== null ? `${data.kpis.appeal_approval_rate}% approved by TMO` : 'No decided appeals yet'}
                    icon={Scale}
                />
            </div>

            {data.kpis.total_violations === 0 ? (
                <EmptyState
                    icon={ShieldAlert}
                    title="No violations in this period"
                    description="Try selecting a wider date range or clearing the active filters above."
                />
            ) : (
                <>
                    <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <ReportCard
                            icon={TrendingUp}
                            title="Citation Activity Trend"
                            subtitle={`Recorded municipal citations · ${from} – ${to}`}
                            className="lg:col-span-2"
                            action={<GranularityToggle value={granularity} onChange={setGranularity} />}
                        >
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Citations" fill="#182B62" radius={[6, 6, 0, 0]} barSize={granularity === 'day' ? 18 : 34} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>

                        <ReportCard icon={Layers} title="Citation Settlement Status" subtitle="Resolution state of citations in period">
                            <StatusDonut data={data.by_status} colors={STATUS_COLORS} />
                        </ReportCard>
                    </div>

                    <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <ReportCard icon={ShieldAlert} title="Citations by Ordinance" subtitle="Municipal violation categories">
                            <ProfileRow items={(data.by_type || []).map((t) => ({ name: t.type, count: t.count }))} />
                        </ReportCard>

                        <ReportCard icon={Radio} title="Enforcement Verification Method" subtitle="Source of citation verification">
                            <ProfileRow
                                items={[
                                    { name: 'GPS Route Verification', count: data.detection_split.automated || 0, color: '#182B62' },
                                    { name: 'Field Officer Apprehension', count: data.detection_split.manual || 0, color: '#64748B' },
                                ]}
                            />
                        </ReportCard>
                    </div>

                    <div className="mb-6">
                        <ReportCard icon={CalendarDays} title="Citations by Day of Week" subtitle="Analysis of color coding restriction days">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={data.by_day_of_week}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="day" tickFormatter={(d) => d.slice(0, 3)} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Citations" fill="#25449B" radius={[6, 6, 0, 0]} barSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════
                        OFFICIAL CITATION LOG TABLE (Fully responsive)
                       ══════════════════════════════════════════════════════════════ */}
                    {records.length > 0 && (
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <FileText size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                                            Official Citation Log
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Records corresponding to the selected reporting period and filter
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg w-fit">
                                    {records.length} Recorded Citations
                                </span>
                            </div>

                            {/* Desktop Table View (>= 768px) */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[760px] text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-3 pl-5 pr-3">Ticket No. &amp; Date</th>
                                            <th className="py-3 px-3">Tricycle &amp; Operator</th>
                                            <th className="py-3 px-3">Ordinance Citation</th>
                                            <th className="py-3 px-3">Penalty Fine</th>
                                            <th className="py-3 px-3">Payment Status</th>
                                            <th className="py-3 pr-5 pl-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {paginatedRecords.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 pl-5 pr-3 align-middle">
                                                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md shadow-2xs">
                                                        {r.id}
                                                    </span>
                                                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                                                        {r.date} · {r.time}
                                                    </p>
                                                </td>
                                                <td className="py-3.5 px-3 align-middle">
                                                    <span className="font-mono font-bold text-slate-900 text-xs bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                                        {r.plate}
                                                    </span>
                                                    <p className="text-xs font-bold text-slate-700 truncate mt-0.5 max-w-[180px]">
                                                        {r.operator}
                                                    </p>
                                                </td>
                                                <td className="py-3.5 px-3 align-middle">
                                                    <span className="font-bold text-slate-800 text-xs">
                                                        {r.type}
                                                    </span>
                                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                        {r.detection_method === 'Automated' ? 'GPS Route Verification' : 'Field Apprehension'}
                                                    </p>
                                                </td>
                                                <td className="py-3.5 px-3 align-middle">
                                                    <span className="font-mono font-black text-slate-900 tabular-nums text-xs">
                                                        ₱{Number(r.fine).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 align-middle">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                                                        r.is_paid
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {r.is_paid ? 'Settled' : 'Unpaid'}
                                                    </span>
                                                    {r.appeal_status && (
                                                        <span className="block mt-1 text-[10px] font-bold text-blue-700">
                                                            Appeal: {r.appeal_status === 'under_review' ? 'Pending Review' : r.appeal_status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 pr-5 pl-3 text-right align-middle">
                                                    <Link
                                                        href={`/violations/${r.db_id}`}
                                                        className="inline-flex items-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
                                                    >
                                                        <span>Details</span>
                                                        <ArrowUpRight size={11} strokeWidth={2.5} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card Deck (< 768px) */}
                            <div className="md:hidden divide-y divide-slate-100 p-3 sm:p-4 space-y-3">
                                {paginatedRecords.map((r) => (
                                    <div key={r.id} className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                {r.id}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                                r.is_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {r.is_paid ? 'Settled' : 'Unpaid'}
                                            </span>
                                        </div>

                                        <div className="mt-2.5 flex items-center justify-between text-xs">
                                            <div>
                                                <p className="font-bold text-slate-900">{r.operator}</p>
                                                <span className="font-mono text-[11px] font-bold text-slate-500">Plate: {r.plate}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-black text-slate-900 text-sm">₱{Number(r.fine).toFixed(2)}</span>
                                                <p className="text-[10px] font-semibold text-slate-400">{r.type}</p>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] text-slate-400 font-medium">{r.date} · {r.time}</span>
                                            <Link
                                                href={`/violations/${r.db_id}`}
                                                className="inline-flex items-center gap-1 rounded-lg bg-[#182B62] px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs"
                                            >
                                                <span>View Details</span>
                                                <ArrowUpRight size={11} strokeWidth={2.2} />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Table Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                                    <p className="text-xs text-slate-500">
                                        Showing <strong className="text-slate-900">{startIndex + 1}–{Math.min(startIndex + pageSize, records.length)}</strong> of <strong className="text-slate-900">{records.length}</strong>
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs disabled:opacity-40"
                                        >
                                            <ChevronLeft size={13} />
                                            <span>Prev</span>
                                        </button>
                                        <span className="text-xs font-bold text-slate-600 px-2 font-mono">{page} / {totalPages}</span>
                                        <button
                                            type="button"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs disabled:opacity-40"
                                        >
                                            <span>Next</span>
                                            <ChevronRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


