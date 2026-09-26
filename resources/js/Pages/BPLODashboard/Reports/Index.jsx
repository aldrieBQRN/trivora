import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import {
    FileSpreadsheet, Tag, ClipboardList, Timer, Hourglass, TrendingUp, PackageCheck,
} from 'lucide-react';
import ReportCard from './ReportCard';
import DateRangeFilter from './DateRangeFilter';

const STATUS_COLORS = { pending: '#CBD5E1', released: '#1D2542' };
const GRANULARITIES = ['day', 'week', 'month'];
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

function KpiTile({ label, value, hint, icon: Icon }) {
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                {Icon && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-[#1D2542]">
                        <Icon size={14} />
                    </span>
                )}
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">{value}</p>
            {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
        </div>
    );
}

function StatBlock({ icon: Icon, value, label }) {
    return (
        <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D2542]">
                <Icon size={15} />
            </span>
            <div className="min-w-0">
                <p className="text-2xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">{value}</p>
                <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            </div>
        </div>
    );
}

// Backend always returns daily buckets for the selected range — rolling those up into ISO weeks
// or calendar months is a pure display concern, so it happens here instead of round-tripping to
// the server for the same underlying data every time the toggle changes.
function aggregateTrend(daily, granularity) {
    if (granularity === 'day' || daily.length === 0) return daily;

    const buckets = new Map();
    daily.forEach(({ date, count }) => {
        const d = new Date(`${date}T00:00:00`);
        let key;
        if (granularity === 'week') {
            const isoDay = (d.getDay() + 6) % 7; // 0 = Monday
            const monday = new Date(d);
            monday.setDate(d.getDate() - isoDay);
            key = monday.toISOString().slice(0, 10);
        } else {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        }
        buckets.set(key, (buckets.get(key) || 0) + count);
    });

    return Array.from(buckets.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

function formatBucketLabel(dateStr, granularity) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (granularity === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BPLOReportsIndex({ from, to, filters, reportData }) {
    const [granularity, setGranularity] = useState('day');

    // Background refresh of the summary/counters only. `from`/`to`/`filters` are read from the
    // URL, which a partial reload re-reads unchanged, so the selected date range and granularity
    // never shift under the user.
    useBackgroundRefresh(['reportData']);
    const { overview, statusBreakdown, activityTrend, stickerPlate, processing, recentActivity } = reportData;

    const visit = (params) => {
        router.get(route('bplo.reports'), { from, to, ...filters, ...params }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleDateChange = ({ from: nextFrom, to: nextTo }) => visit({ from: nextFrom, to: nextTo });
    const handleStatusChange = (value) => visit({ status: value || undefined });

    const exportUrl = route('bplo.reports.export-excel', { from, to, status: filters.status || undefined });

    const chartData = useMemo(
        () => aggregateTrend(activityTrend, granularity).map((d) => ({ ...d, label: formatBucketLabel(d.date, granularity) })),
        [activityTrend, granularity]
    );

    const totalInPipeline = overview.pending_release + overview.released;
    const pieData = statusBreakdown.map((s) => ({
        ...s,
        pct: totalInPipeline > 0 ? Math.round((s.count / totalInPipeline) * 100) : 0,
    }));

    return (
        <BPLOLayout title="Reports & Analytics" role="BPLO Officer">
            <Head title="Reports & Analytics | TRIVORA" />

            <div className="mb-5 border-b border-slate-200/80 pb-5">
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                    Reports &amp; Analytics
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                    Overview of sticker and plate releases, activity, and processing time.
                </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Filter toolbar — Quick Range | From | To | Status | Export, one compact row. */}
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3.5 print:hidden sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex flex-1 flex-wrap items-center gap-2.5">
                        <DateRangeFilter from={from} to={to} onChange={handleDateChange} />
                        <select
                            value={filters.status || ''}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="h-9 w-full shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:w-44"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending Release</option>
                            <option value="released">Released</option>
                        </select>
                    </div>

                    <a
                        href={exportUrl}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <FileSpreadsheet size={13} /> Export to Excel
                    </a>
                </div>

                <div className="p-4 sm:p-6">
                    {/* 1. Releasing Overview */}
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Releasing Overview</p>
                        <p className="text-[11px] font-semibold text-slate-500">{from} – {to}</p>
                    </div>
                    <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiTile
                            label="Total for BPLO Release"
                            value={overview.total_for_bplo}
                            hint="Ever reached BPLO's stage"
                            icon={ClipboardList}
                        />
                        <KpiTile
                            label="Pending Release"
                            value={overview.pending_release}
                            hint="Awaiting sticker/plate release"
                            icon={Hourglass}
                        />
                        <KpiTile
                            label="Released"
                            value={overview.released}
                            hint="Sticker/plate already released"
                            icon={PackageCheck}
                        />
                        <KpiTile
                            label="Released in Period"
                            value={overview.activity_in_period}
                            hint="Within the selected range"
                            icon={TrendingUp}
                        />
                    </div>

                    {/* 2 + 3. Releasing Activity + Release Status Breakdown */}
                    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <ReportCard
                            icon={TrendingUp}
                            title="Releasing Activity"
                            subtitle={`Sticker/plate releases · ${from} – ${to}`}
                            className="lg:col-span-2"
                            action={(
                                <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5">
                                    {GRANULARITIES.map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setGranularity(g)}
                                            className={`rounded-md px-2 py-1 text-[11px] font-semibold capitalize transition-colors ${
                                                granularity === g ? 'bg-[#1D2542] text-white' : 'text-slate-500 hover:text-slate-900'
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            )}
                        >
                            {chartData.length === 0 ? (
                                <p className="text-xs text-slate-400">No releasing activity in this range.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="count" name="Releases" fill="#1D2542" radius={[4, 4, 0, 0]} barSize={granularity === 'day' ? 16 : 32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ReportCard>

                        <ReportCard icon={Tag} title="Release Status Breakdown" subtitle="Current BPLO pipeline">
                            {totalInPipeline === 0 ? (
                                <p className="text-xs text-slate-400">No applications in the BPLO pipeline yet.</p>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={150}>
                                        <PieChart>
                                            <Pie data={pieData} dataKey="count" nameKey="label" innerRadius={44} outerRadius={66} paddingAngle={2} stroke="none">
                                                {pieData.map((s) => (
                                                    <Cell key={s.status} fill={STATUS_COLORS[s.status]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="mt-2 space-y-1.5">
                                        {pieData.map((s) => (
                                            <div key={s.status} className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLORS[s.status] }} />
                                                    {s.label}
                                                </span>
                                                <span className="text-slate-500">{s.count} ({s.pct}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </ReportCard>
                    </div>

                    {/* 4. Sticker & Plate Release */}
                    <div className="mb-6">
                        <ReportCard icon={Tag} title="Sticker &amp; Plate Release" subtitle="From the actual release ledger — one record per sticker/plate ever issued">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <StatBlock icon={PackageCheck} value={stickerPlate.total_releases} label="Total Sticker/Plate Releases" />
                                <StatBlock icon={TrendingUp} value={stickerPlate.released_in_period} label="Released in Period" />
                                <StatBlock icon={Hourglass} value={stickerPlate.pending_release} label="Pending Release" />
                            </div>
                        </ReportCard>
                    </div>

                    {/* 5. Release Processing Summary */}
                    <ReportCard icon={Timer} title="Release Processing Summary" subtitle="Operational picture of the BPLO releasing queue">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D2542]">
                                        <Timer size={15} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-2xl font-extrabold tracking-tight tabular-nums text-[#1D2542]">
                                            {processing.avg_days_to_release !== null ? `${processing.avg_days_to_release}d` : '—'}
                                        </p>
                                        <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Avg. Processing Time</p>
                                        <p className="mt-1 text-[10.5px] text-slate-400">
                                            {processing.sample_size > 0
                                                ? `From ${processing.sample_size} release${processing.sample_size === 1 ? '' : 's'} in this period`
                                                : 'No releases with complete timing data in this range'}
                                        </p>
                                    </div>
                                </div>

                                {processing.oldest_pending ? (
                                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600">
                                            <Hourglass size={15} />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900">{processing.oldest_pending.reference}</p>
                                            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Oldest Pending Release</p>
                                            <p className="mt-1 text-[10.5px] text-slate-400">
                                                {processing.oldest_pending.operator} · waiting {processing.oldest_pending.days_ago} day{processing.oldest_pending.days_ago === 1 ? '' : 's'} (since {processing.oldest_pending.since})
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
                                            <PackageCheck size={15} />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900">Nothing waiting</p>
                                            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Oldest Pending Release</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Recent Release Activity</p>
                                {recentActivity.length === 0 ? (
                                    <p className="text-xs text-slate-400">No release activity in this range yet.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {recentActivity.map((r, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-800">{r.reference} · {r.plate}</p>
                                                    <p className="truncate text-[10.5px] text-slate-400">{r.operator}</p>
                                                </div>
                                                <span className="shrink-0 text-[10.5px] text-slate-500">{r.release_date}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ReportCard>
                </div>
            </div>
        </BPLOLayout>
    );
}
