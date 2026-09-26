import React, { useMemo, useState } from 'react';
import { EmptyState } from '@/Components/TMO';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle2, XCircle, Clock, Layers, GitCompare, Hourglass } from 'lucide-react';
import ReportCard from './ReportCard';
import { KpiTile, ChartTooltip, ProfileRow, GranularityToggle, aggregateTrend, formatBucketLabel } from './Shared';

export default function ApplicationsTab({ from, to, data }) {
    const [granularity, setGranularity] = useState('day');

    const chartData = useMemo(
        () => aggregateTrend(data.trend, granularity).map((d) => ({ ...d, label: formatBucketLabel(d.date, granularity) })),
        [data.trend, granularity]
    );

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-tmo-subtle">Application Volume</p>
                <p className="text-[11px] font-semibold text-tmo-muted">{from} – {to}</p>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <KpiTile label="Submitted" value={data.kpis.submitted} hint="Total applications received in range" icon={FileText} />
                <KpiTile label="Completed" value={data.kpis.completed} hint="Reached Franchise Active in range" icon={CheckCircle2} />
                <KpiTile label="Rejection Rate" value={`${data.kpis.rejection_rate}%`} hint="Share of submissions rejected" icon={XCircle} />
                <KpiTile
                    label="Avg. Processing Time"
                    value={data.kpis.avg_processing_days !== null ? `${data.kpis.avg_processing_days}d` : 'N/A'}
                    hint="Submission to completion"
                    icon={Clock}
                />
            </div>

            {data.kpis.submitted === 0 ? (
                <EmptyState icon={FileText} title="No applications in this range" description="Try widening the date range or clearing the filters above." />
            ) : (
                <>
                    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <ReportCard
                            icon={FileText}
                            title="Application Processing Activity"
                            subtitle={`Applications submitted · ${from} – ${to}`}
                            className="lg:col-span-2"
                            action={<GranularityToggle value={granularity} onChange={setGranularity} />}
                        >
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Applications" fill="#1D2542" radius={[4, 4, 0, 0]} barSize={granularity === 'day' ? 16 : 32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>

                        <ReportCard icon={Layers} title="Application Status Breakdown" subtitle="Current stage of submissions in range">
                            <ProfileRow items={data.by_stage.map((s) => ({ name: s.stage, count: s.count }))} />
                        </ReportCard>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ReportCard icon={GitCompare} title="New vs Renewal" subtitle="Share of submissions by application type">
                            <div className="space-y-4">
                                <div>
                                    <div className="mb-1.5 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-tmo-ink">New Franchise</span>
                                        <span className="text-tmo-muted">{data.type_split.new}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-tmo-bg">
                                        <div
                                            className="h-full rounded-full bg-tmo-primary"
                                            style={{ width: `${data.kpis.submitted > 0 ? (data.type_split.new / data.kpis.submitted) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-tmo-subtle">
                                        {data.kpis.submitted > 0 ? Math.round((data.type_split.new / data.kpis.submitted) * 100) : 0}% of submissions in this range. First-time applicants registering a tricycle for the first time.
                                    </p>
                                </div>
                                <div>
                                    <div className="mb-1.5 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-tmo-ink">Renewal</span>
                                        <span className="text-tmo-muted">{data.type_split.renewal}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-tmo-bg">
                                        <div
                                            className="h-full rounded-full bg-slate-400"
                                            style={{ width: `${data.kpis.submitted > 0 ? (data.type_split.renewal / data.kpis.submitted) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-tmo-subtle">
                                        {data.kpis.submitted > 0 ? Math.round((data.type_split.renewal / data.kpis.submitted) * 100) : 0}% of submissions in this range. Existing operators renewing an active franchise.
                                    </p>
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
