import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tag, PackageCheck, Hourglass, FileSpreadsheet } from 'lucide-react';
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

export default function ReleasingTab({ from, to, data, onDateChange }) {
    const exportUrl = route('bplo.reports.export-releasing-excel', { from, to });

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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReportCard icon={Tag} title="Sticker / Plate Releasing" subtitle="Current standing of released franchises">
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                <PackageCheck size={15} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-2xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">{data.total_released}</p>
                                <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Total Released</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                                <Hourglass size={15} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{data.pending_release}</p>
                                <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Pending Release</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {data.by_status.map((row) => {
                            const pct = data.total_released > 0 ? Math.round((row.count / data.total_released) * 100) : 0;
                            return (
                                <div key={row.label}>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-700">{row.label}</span>
                                        <span className="text-slate-400">{row.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-[#1D2542]" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ReportCard>

                <ReportCard icon={Tag} title="Releasing Activity" subtitle={`Franchise releases by day · ${from} – ${to}`}>
                    {data.activity.length === 0 ? (
                        <p className="text-xs text-slate-400">No releasing activity in this range.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.activity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={24} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" name="Released" fill="#1D2542" radius={[4, 4, 0, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ReportCard>
            </div>
        </div>
    );
}
