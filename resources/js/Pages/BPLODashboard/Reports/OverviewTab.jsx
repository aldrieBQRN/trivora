import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, Award, XCircle, CheckCircle2, Layers, MapPin, FileSpreadsheet } from 'lucide-react';
import ReportCard from './ReportCard';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

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

const TONES = {
    neutral: { bg: 'from-slate-500/[0.10] to-slate-500/[0.02]', icon: 'text-slate-600', value: 'text-slate-900' },
    primary: { bg: 'from-[#1D2542]/[0.10] to-[#1D2542]/[0.02]', icon: 'text-[#1D2542]', value: 'text-[#1D2542]' },
    amber: { bg: 'from-amber-500/[0.14] to-amber-500/[0.02]', icon: 'text-amber-600', value: 'text-slate-900' },
    emerald: { bg: 'from-emerald-500/[0.14] to-emerald-500/[0.02]', icon: 'text-emerald-600', value: 'text-slate-900' },
    rose: { bg: 'from-rose-500/[0.14] to-rose-500/[0.02]', icon: 'text-rose-600', value: 'text-slate-900' },
};

function KpiCard({ icon: Icon, label, value, caption, tone = 'neutral' }) {
    const t = TONES[tone];
    return (
        <div className={`flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
            <div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${t.bg} ${t.icon}`}>
                        <Icon size={14} />
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${t.value}`}>{value}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{caption}</p>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-slate-500">Registry:</span>
                <span className="text-xs font-bold text-slate-800">Live Snapshot</span>
            </div>
        </div>
    );
}

export default function OverviewTab({ data }) {
    const { overview, statusBreakdown, todaBreakdown } = data;
    const exportUrl = route('bplo.reports.export-overview-excel');

    return (
        <div>
            <div className="mb-5 flex justify-end print:hidden">
                <a
                    href={exportUrl}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <FileSpreadsheet size={13} /> Export to Excel
                </a>
            </div>

            {/* Overview — one KPI card per figure, matching the TMO Reports KPI deck */}
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <KpiCard icon={FileText} label="Total Applications" value={overview.total_applications} caption="All franchise applications on record" tone="neutral" />
                <KpiCard icon={Clock} label="Pending BPLO Action" value={overview.pending_bplo_action} caption="Payment verified, awaiting your review" tone="amber" />
                <KpiCard icon={Award} label="Released" value={overview.released} caption="Sticker / plate released by BPLO" tone="emerald" />
                <KpiCard icon={XCircle} label="Rejected" value={overview.rejected} caption="Applications rejected in review" tone="rose" />
                <KpiCard icon={CheckCircle2} label="Active Franchises" value={overview.active_franchises} caption="Currently active tricycle franchises" tone="primary" />
            </div>

            {/* Application Status Analysis — one chart, not a card per status */}
            <div className="mb-6">
                <ReportCard icon={Layers} title="Application Status Analysis" subtitle="All applications currently on record, by current status">
                    {statusBreakdown.length === 0 ? (
                        <p className="text-xs text-slate-400">No applications on record yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(180, statusBreakdown.length * 34)}>
                            <BarChart data={statusBreakdown} layout="vertical" margin={{ left: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF0F5" />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <YAxis dataKey="status" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={190} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" name="Applications" fill="#1D2542" radius={[0, 4, 4, 0]} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ReportCard>
            </div>

            {/* TODA / Area Breakdown */}
            <ReportCard icon={MapPin} title="TODA / Area Breakdown" subtitle="Applications and active franchises by TODA zone">
                {todaBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400">No TODA zones configured.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    <th scope="col" className="py-2 pr-3">TODA Zone</th>
                                    <th scope="col" className="py-2 px-3 text-right">Applications</th>
                                    <th scope="col" className="py-2 pl-3 text-right">Active Franchises</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {todaBreakdown.map((row) => (
                                    <tr key={row.toda}>
                                        <td className="py-2.5 pr-3 font-semibold text-slate-800">{row.toda}</td>
                                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">{row.application_count}</td>
                                        <td className="py-2.5 pl-3 text-right tabular-nums text-slate-600">{row.active_franchise_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </ReportCard>
        </div>
    );
}
