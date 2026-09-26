import React, { useMemo, useState } from 'react';
import { EmptyState } from '@/Components/TMO';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ShieldAlert, Wallet, TrendingUp, Scale, Radio, Layers, CalendarDays } from 'lucide-react';
import ReportCard from './ReportCard';
import { KpiTile, ChartTooltip, StatusDonut, ProfileRow, GranularityToggle, aggregateTrend, formatBucketLabel } from './Shared';

// Deliberately grayscale + one navy accent (resolved) — five real statuses would read as a
// "rainbow" pie otherwise; this keeps the chart restrained while still showing every status.
const STATUS_COLORS = {
    open: '#CBD5E1',
    acknowledged: '#94A3B8',
    contested: '#64748B',
    resolved: '#1D2542',
    dismissed: '#E2E8F0',
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
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-tmo-subtle">Violation Overview</p>
                <p className="text-[11px] font-semibold text-tmo-muted">{from} – {to}</p>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <KpiTile label="Total Violations" value={data.kpis.total_violations} hint="Recorded in range" icon={ShieldAlert} />
                <KpiTile label="Fines Assessed" value={peso(data.kpis.fines_assessed)} hint="Total fines issued in range" icon={Wallet} />
                <KpiTile
                    label="Fines Collected"
                    value={peso(data.kpis.fines_collected)}
                    hint={`${data.kpis.collection_rate}% collection rate`}
                    icon={Wallet}
                />
                <KpiTile
                    label="Appeals Filed"
                    value={data.kpis.appeals_filed}
                    hint={data.kpis.appeal_approval_rate !== null ? `${data.kpis.appeal_approval_rate}% approved` : 'None decided yet'}
                    icon={Scale}
                />
            </div>

            {data.kpis.total_violations === 0 ? (
                <EmptyState
                    icon={ShieldAlert}
                    title="No violations in this range"
                    description="Try widening the date range or clearing the filters above."
                />
            ) : (
                <>
                    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <ReportCard
                            icon={TrendingUp}
                            title="Violation Activity"
                            subtitle={`Citations recorded · ${from} – ${to}`}
                            className="lg:col-span-2"
                            action={<GranularityToggle value={granularity} onChange={setGranularity} />}
                        >
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Violations" fill="#1D2542" radius={[4, 4, 0, 0]} barSize={granularity === 'day' ? 16 : 32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>

                        <ReportCard icon={Layers} title="Violation Status Breakdown" subtitle="Every recorded status in range">
                            <StatusDonut data={data.by_status} colors={STATUS_COLORS} />
                        </ReportCard>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ReportCard icon={ShieldAlert} title="By Violation Type" subtitle="Which ordinance is cited most">
                            <ProfileRow items={(data.by_type || []).map((t) => ({ name: t.type, count: t.count }))} />
                        </ReportCard>

                        <ReportCard icon={Radio} title="Detection Method" subtitle="How the violation was recorded">
                            <ProfileRow
                                items={[
                                    { name: 'Automated', count: data.detection_split.automated || 0, color: '#1D2542' },
                                    { name: 'Manual', count: data.detection_split.manual || 0, color: '#94A3B8' },
                                ]}
                            />
                        </ReportCard>
                    </div>

                    <ReportCard icon={CalendarDays} title="By Day of Week" subtitle="Which restricted days draw the most citations">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.by_day_of_week}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                <XAxis dataKey="day" tickFormatter={(d) => d.slice(0, 3)} tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" name="Violations" fill="#64748B" radius={[4, 4, 0, 0]} barSize={26} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ReportCard>
                </>
            )}
        </div>
    );
}
