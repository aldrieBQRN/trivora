import React from 'react';
import { DateRangeFilter, EmptyState } from '@/Components/TMO';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle2, XCircle, Clock, FileSpreadsheet, Layers, GitCompare, Hourglass } from 'lucide-react';
import ReportCard from './ReportCard';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="rounded-lg border border-tmo-border bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-bold text-tmo-ink">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="text-xs text-tmo-muted">
                    {p.name}: <span className="font-bold text-tmo-ink">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

export default function ApplicationsTab({ from, to, filters, data, onDateChange, onFilterChange }) {
    const exportUrl = route('tmo.reports.export-applications-excel', { from, to, ...filters });

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 print:hidden lg:flex-row lg:items-center lg:justify-between">
                <DateRangeFilter from={from} to={to} onChange={onDateChange} />
                <div className="flex items-center gap-2">
                    <select
                        value={filters.application_type || ''}
                        onChange={(e) => onFilterChange('application_type', e.target.value)}
                        className="h-9 w-full shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs font-semibold text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:w-44"
                    >
                        <option value="">New &amp; Renewal</option>
                        <option value="new">New Franchise</option>
                        <option value="renewal">Renewal</option>
                    </select>
                    <a
                        href={exportUrl}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-tmo-borderStrong bg-white px-3 text-xs font-semibold text-tmo-ink hover:bg-tmo-bg"
                    >
                        <FileSpreadsheet size={13} /> Export to Excel
                    </a>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Card 1: Submitted */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Submitted</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/[0.10] to-slate-500/[0.02] text-slate-600">
                                <FileText size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {data.kpis.submitted}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Total applications received in range</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 2: Completed */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Completed</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                <CheckCircle2 size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {data.kpis.completed}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Reached Franchise Active in range</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 3: Rejection Rate */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Rejection Rate</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                                <XCircle size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {data.kpis.rejection_rate}%
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Share of submissions rejected</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 4: Avg. Processing Time */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Avg. Processing Time</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-tmo-primary/[0.10] to-tmo-primary/[0.02] text-tmo-primary">
                                <Clock size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-primary">
                                {data.kpis.avg_processing_days !== null ? `${data.kpis.avg_processing_days}d` : '—'}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Submission to completion</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>
            </div>

            {data.kpis.submitted === 0 ? (
                <EmptyState icon={FileText} title="No applications in this range" description="Try widening the date range or clearing the filters above." />
            ) : (
                <>
                    <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ReportCard icon={FileText} title="Applications Submitted Over Time" subtitle="Daily count across the selected range">
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={data.trend}>
                                    <defs>
                                        <linearGradient id="appsFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#1D2542" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#1D2542" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="count" name="Applications" stroke="#1D2542" strokeWidth={2} fill="url(#appsFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ReportCard>

                        <ReportCard icon={Layers} title="Current Stage" subtitle="Of applications submitted in this range">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={data.by_stage} layout="vertical" margin={{ left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF0F5" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={150} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Applications" fill="#1D2542" radius={[0, 4, 4, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ReportCard icon={GitCompare} title="New vs Renewal" subtitle="Share of submissions by application type">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-tmo-ink">New Franchise</span>
                                        <span className="text-tmo-muted">{data.type_split.new}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-tmo-bg">
                                        <div
                                            className="h-full rounded-full bg-tmo-primary"
                                            style={{ width: `${data.kpis.submitted > 0 ? (data.type_split.new / data.kpis.submitted) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-tmo-ink">Renewal</span>
                                        <span className="text-tmo-muted">{data.type_split.renewal}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-tmo-bg">
                                        <div
                                            className="h-full rounded-full bg-slate-400"
                                            style={{ width: `${data.kpis.submitted > 0 ? (data.type_split.renewal / data.kpis.submitted) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </ReportCard>

                        <ReportCard icon={Hourglass} title="Average Time in Each Stage" subtitle="From completed transitions in this range">
                            {data.avg_time_in_stage.length === 0 ? (
                                <p className="text-xs text-tmo-subtle">Not enough completed transitions in this range yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {data.avg_time_in_stage.map((row) => (
                                        <div key={row.status} className="flex items-center justify-between text-xs">
                                            <span className="text-tmo-ink">{row.status}</span>
                                            <span className="font-semibold text-tmo-muted">
                                                {row.avg_hours >= 24 ? `${(row.avg_hours / 24).toFixed(1)}d` : `${row.avg_hours}h`} avg.
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ReportCard>
                    </div>
                </>
            )}
        </div>
    );
}
