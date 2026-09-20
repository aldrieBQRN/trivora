import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Hourglass, Timer, Clock3, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import ReportCard from './ReportCard';
import DateRangeFilter from './DateRangeFilter';

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-bold text-slate-900">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="text-xs text-slate-500">
                    {p.name}: <span className="font-bold text-slate-900">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

export default function TrendsTab({ from, to, data, onDateChange }) {
    const { trends, processing } = data;
    const exportUrl = route('bplo.reports.export-trends-excel', { from, to });

    // Merge received/released series into one dataset keyed by date, so both lines share one
    // chart's x-axis instead of two separate charts for two related counts.
    const trendData = useMemo(() => {
        const byDate = new Map();
        trends.received.forEach((r) => byDate.set(r.date, { date: r.date, received: r.count, released: 0 }));
        trends.released.forEach((r) => {
            const existing = byDate.get(r.date);
            if (existing) existing.released = r.count;
            else byDate.set(r.date, { date: r.date, received: 0, released: r.count });
        });
        return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [trends]);

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
                <DateRangeFilter from={from} to={to} onChange={onDateChange} />
                <a
                    href={exportUrl}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <FileSpreadsheet size={13} /> Export to Excel
                </a>
            </div>

            <div className="mb-6">
                <ReportCard icon={TrendingUp} title="Processing Trends" subtitle={`Applications received vs. released by BPLO · ${from} – ${to}`}>
                    {trendData.length === 0 ? (
                        <p className="text-xs text-slate-400">No activity in this range.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#1D2542" stopOpacity={0.22} />
                                        <stop offset="100%" stopColor="#1D2542" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="releasedFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#059669" stopOpacity={0.22} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="received" name="Received" stroke="#1D2542" strokeWidth={2} fill="url(#receivedFill)" />
                                <Area type="monotone" dataKey="released" name="Released" stroke="#059669" strokeWidth={2} fill="url(#releasedFill)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </ReportCard>
            </div>

            <ReportCard icon={Hourglass} title="Application Processing" subtitle="Submission to BPLO release — computed from real status-change records">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <Timer size={15} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-2xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                {processing.avg_days_to_release !== null ? `${processing.avg_days_to_release}d` : '—'}
                            </p>
                            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Avg. Days to Release</p>
                            <p className="mt-1 text-[10.5px] text-slate-400">
                                {processing.sample_size > 0 ? `Based on ${processing.sample_size} released application${processing.sample_size === 1 ? '' : 's'}` : 'No releases in range yet'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                            <Clock3 size={15} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{processing.waiting_for_bplo}</p>
                            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Waiting for BPLO</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <CheckCircle2 size={15} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{processing.completed}</p>
                            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Fully Completed</p>
                        </div>
                    </div>
                </div>
            </ReportCard>
        </div>
    );
}
