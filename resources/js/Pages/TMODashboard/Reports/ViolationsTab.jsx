import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { EmptyState } from '@/Components/TMO';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ShieldAlert, Wallet, TrendingUp, Scale, Layers, CalendarDays, FileText, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ReportCard from './ReportCard';
import { KpiTile, ChartTooltip, StatusDonut, GranularityToggle, aggregateTrend, formatBucketLabel, CARD_SHADOW } from './Shared';

// Settlement buckets from ReportController::violationsReport() (same terms as Violation Records).
const STATUS_COLORS = {
    unsettled: '#F59E0B',
    under_appeal: '#8B5CF6',
    settled: '#10B981',
    dismissed: '#94A3B8',
};

function peso(n) {
    return `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ViolationsTab({ from, to, data }) {
    const [granularity, setGranularity] = useState('day');

    const chartData = useMemo(
        () => aggregateTrend(data.trend, granularity).map((d) => ({ ...d, label: formatBucketLabel(d.date, granularity) })),
        [data.trend, granularity]
    );

    return (
        <div className="font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Violation &amp; Compliance Analytics</p>
                <p className="text-xs font-semibold text-slate-600 font-mono">{from} – {to}</p>
            </div>

            {/* 4 Overview KPI Cards: 1 per row on mobile, 2 on tablet, 4 on desktop */}
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
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

                        <ReportCard icon={Layers} title="Citation Settlement Status" subtitle="Unsettled, under appeal, settled, or dismissed in period">
                            <StatusDonut data={data.by_status} colors={STATUS_COLORS} />
                        </ReportCard>
                    </div>

                    {/* No "Citations by Ordinance" / "Enforcement Verification Method" cards: every
                        citation is a color-coding violation detected automatically by GPS, so both
                        would only ever show a single 100% slice. */}
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
                </>
            )}
        </div>
    );
}


