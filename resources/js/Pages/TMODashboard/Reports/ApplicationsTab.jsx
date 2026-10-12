import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { EmptyState } from '@/Components/TMO';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    FileText, CheckCircle2, XCircle, Clock, Layers, GitCompare, Hourglass,
    ArrowUpRight, ChevronLeft, ChevronRight
} from 'lucide-react';
import ReportCard from './ReportCard';
import {
    KpiTile, ChartTooltip, ProfileRow, GranularityToggle,
    aggregateTrend, formatBucketLabel, CARD_SHADOW
} from './Shared';

const STAGE_BADGES = {
    draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    pending_review: { label: 'Document Review', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    under_review: { label: 'Under Review', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    rejected: { label: 'Re-submission Needed', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    pending_inspection: { label: 'Physical Inspection', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    under_inspection: { label: 'Under Inspection', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    failed_inspection: { label: 'Re-inspection Needed', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    pending_bplo_release: { label: 'Pending BPLO Release', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    awaiting_tmo_confirmation: { label: 'Final Confirmation', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    completed: { label: 'Franchise Issued', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function getStageBadge(status, label) {
    if (STAGE_BADGES[status]) return STAGE_BADGES[status];
    return {
        label: label || status?.replace(/_/g, ' ') || 'Processing',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
    };
}

export default function ApplicationsTab({ from, to, data }) {
    const [granularity, setGranularity] = useState('day');
    const [page, setPage] = useState(1);
    const pageSize = 8;

    const chartData = useMemo(
        () => aggregateTrend(data.trend || [], granularity).map((d) => ({ ...d, label: formatBucketLabel(d.date, granularity) })),
        [data.trend, granularity]
    );

    const records = data.records || [];
    const totalPages = Math.ceil(records.length / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedRecords = records.slice(startIndex, startIndex + pageSize);

    return (
        <div className="font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Context Header */}
            <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Franchise Application Activity</p>
                <p className="text-xs font-semibold text-slate-500 font-mono">{from} – {to}</p>
            </div>

            {/* 4 Overview KPI Cards: 1 per row on mobile, 2 on tablet, 4 on desktop */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                <KpiTile label="Submitted Applications" value={data.kpis.submitted} hint="Total applications received in period" icon={FileText} />
                <KpiTile label="Completed &amp; Approved" value={data.kpis.completed} hint="Franchises successfully issued in period" icon={CheckCircle2} />
                <KpiTile label="Application Rejection Rate" value={`${data.kpis.rejection_rate}%`} hint="Share of submissions needing revision" icon={XCircle} />
                <KpiTile
                    label="Average Processing Time"
                    value={data.kpis.avg_processing_days !== null ? `${data.kpis.avg_processing_days} days` : 'N/A'}
                    hint="From submission to franchise release"
                    icon={Clock}
                />
            </div>

            {data.kpis.submitted === 0 ? (
                <EmptyState icon={FileText} title="No applications in this period" description="Try selecting a wider date range or clearing the active filters above." />
            ) : (
                <>
                    {/* Trend & Stage Progress */}
                    <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <ReportCard
                            icon={FileText}
                            title="Application Submission Trend"
                            subtitle={`Applications submitted · ${from} – ${to}`}
                            className="lg:col-span-2"
                            action={<GranularityToggle value={granularity} onChange={setGranularity} />}
                        >
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Applications" fill="#182B62" radius={[6, 6, 0, 0]} barSize={granularity === 'day' ? 18 : 34} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>

                        <ReportCard icon={Layers} title="Applications by Current Stage" subtitle="Active stage of submissions in period">
                            <ProfileRow items={data.by_stage.map((s) => ({ name: s.stage, count: s.count }))} />
                        </ReportCard>
                    </div>

                    {/* Breakdown & Stage Duration Cards */}
                    <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <ReportCard icon={GitCompare} title="New Franchise vs Renewal Applications" subtitle="Share of submissions by application type">
                            <div className="space-y-4">
                                <div>
                                    <div className="mb-1.5 flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-800">New Franchise</span>
                                        <span className="font-bold text-[#182B62] tabular-nums">{data.type_split.new}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-[#182B62] transition-all duration-500"
                                            style={{ width: `${data.kpis.submitted > 0 ? (data.type_split.new / data.kpis.submitted) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500">
                                        {data.kpis.submitted > 0 ? Math.round((data.type_split.new / data.kpis.submitted) * 100) : 0}% of submissions. First-time applicants registering a new tricycle unit.
                                    </p>
                                </div>
                                <div>
                                    <div className="mb-1.5 flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-800">Renewal</span>
                                        <span className="font-bold text-slate-600 tabular-nums">{data.type_split.renewal}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-400 transition-all duration-500"
                                            style={{ width: `${data.kpis.submitted > 0 ? (data.type_split.renewal / data.kpis.submitted) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500">
                                        {data.kpis.submitted > 0 ? Math.round((data.type_split.renewal / data.kpis.submitted) * 100) : 0}% of submissions. Existing operators renewing their valid franchise.
                                    </p>
                                </div>
                            </div>
                        </ReportCard>

                        <ReportCard icon={Hourglass} title="Average Processing Time per Stage" subtitle="Based on completed stage approvals in period">
                            {data.avg_time_in_stage.length === 0 ? (
                                <p className="text-xs text-slate-400 py-4 text-center">Not enough completed stage evaluations recorded in this period yet.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {data.avg_time_in_stage.map((row) => (
                                        <div key={row.status} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2 text-xs">
                                            <span className="font-bold text-slate-800">{row.status}</span>
                                            <span className="font-mono font-bold text-[#182B62] bg-white border border-slate-200/90 rounded-md px-2 py-0.5 shadow-2xs">
                                                {row.avg_hours >= 24 ? `${(row.avg_hours / 24).toFixed(1)} days` : `${row.avg_hours} hrs`} avg.
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ReportCard>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════
                        OFFICIAL APPLICATIONS SUBMISSION LOG TABLE (Fully Responsive)
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
                                            Official Applications Submission Log
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Application records filed within the selected reporting period
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg w-fit">
                                    {records.length} Submissions
                                </span>
                            </div>

                            {/* Desktop Table View (>= 768px) */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[740px] text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-3 pl-5 pr-3">Reference No. &amp; Date</th>
                                            <th className="py-3 px-3">Applicant Operator</th>
                                            <th className="py-3 px-3">Application Type</th>
                                            <th className="py-3 px-3">Tricycle Plate</th>
                                            <th className="py-3 px-3">Current Stage</th>
                                            <th className="py-3 pr-5 pl-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {paginatedRecords.map((r) => {
                                            const badge = getStageBadge(r.status, r.status_label);
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3.5 pl-5 pr-3 align-middle">
                                                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md shadow-2xs">
                                                            {r.id}
                                                        </span>
                                                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                                                            {r.date} {r.time ? `· ${r.time}` : ''}
                                                        </p>
                                                    </td>
                                                    <td className="py-3.5 px-3 align-middle font-bold text-slate-800">
                                                        {r.operator}
                                                    </td>
                                                    <td className="py-3.5 px-3 align-middle">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                                                            r.type === 'New Franchise'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
                                                            {r.type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-3 align-middle">
                                                        <span className="font-mono font-bold text-slate-700 text-xs bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                                            {r.plate}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-3 align-middle">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${badge.bg}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 pr-5 pl-3 text-right align-middle">
                                                        <Link
                                                            href={`/tmo/review/docs/${r.db_id}`}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
                                                        >
                                                            <span>Review</span>
                                                            <ArrowUpRight size={11} strokeWidth={2.5} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card Deck (< 768px) */}
                            <div className="md:hidden divide-y divide-slate-100 p-3 sm:p-4 space-y-3">
                                {paginatedRecords.map((r) => {
                                    const badge = getStageBadge(r.status, r.status_label);
                                    return (
                                        <div key={`mob-${r.id}`} className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                    {r.id}
                                                </span>
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${badge.bg}`}>
                                                    {badge.label}
                                                </span>
                                            </div>

                                            <div className="mt-2.5 flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-900">{r.operator}</p>
                                                    <span className="font-mono text-[11px] font-bold text-slate-500">Plate: {r.plate}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">{r.type}</span>
                                                    <p className="text-[10px] text-slate-400 mt-1">{r.date}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                                                <Link
                                                    href={`/tmo/review/docs/${r.db_id}`}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-[#182B62] px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs"
                                                >
                                                    <span>Review</span>
                                                    <ArrowUpRight size={11} strokeWidth={2.5} />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                                    <p className="text-xs text-slate-500">
                                        Showing <strong className="text-slate-900">{startIndex + 1}–{Math.min(startIndex + pageSize, records.length)}</strong> of <strong className="text-slate-900">{records.length}</strong>
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs disabled:opacity-40"
                                        >
                                            <ChevronLeft size={13} />
                                            <span>Prev</span>
                                        </button>
                                        <span className="text-xs font-bold text-slate-600 px-2 font-mono">{page} / {totalPages}</span>
                                        <button
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
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
