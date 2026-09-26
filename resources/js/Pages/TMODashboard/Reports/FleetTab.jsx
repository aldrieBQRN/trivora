import React, { useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bike, ShieldCheck, ShieldOff, Ban, Satellite, Clock, Palette, TrendingUp } from 'lucide-react';
import ReportCard from './ReportCard';
import { KpiTile, ChartTooltip, StatusDonut, ProfileRow, GranularityToggle, aggregateTrend, formatBucketLabel } from './Shared';

// Active gets the primary navy (the "in good standing" state); suspended/revoked get restrained
// semantic amber/red (real compliance signals, not decoration); unregistered — the pre-franchise
// holding status most tricycles sit in while an application is mid-pipeline — stays neutral gray.
const STATUS_COLORS = {
    active: '#1D2542',
    unregistered: '#94A3B8',
    suspended: '#D97706',
    revoked: '#DC2626',
};

export default function FleetTab({ from, to, data }) {
    const [granularity, setGranularity] = useState('day');
    const expiring = data.expiring || [];
    const nearestExpiring = expiring[0] || null;
    const hasDateFilter = Boolean(data.has_date_filter);

    const chartData = useMemo(
        () => aggregateTrend(data.registration_trend || [], granularity).map((d) => ({ ...d, label: formatBucketLabel(d.date, granularity) })),
        [data.registration_trend, granularity]
    );

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-tmo-subtle">Active Registry Overview</p>
                <p className="text-[11px] font-semibold text-tmo-muted">
                    {hasDateFilter ? `Registered ${from} – ${to}` : 'Live Snapshot · All Time'}
                </p>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <KpiTile
                    label="Registered Tricycles"
                    value={data.kpis.total}
                    hint={hasDateFilter ? 'Registered in this period' : 'All tricycles ever registered'}
                    icon={Bike}
                />
                <KpiTile label="Active Tricycles" value={data.kpis.active} hint="Franchise currently active" icon={ShieldCheck} />
                <KpiTile label="Suspended Tricycles" value={data.kpis.suspended} hint="Temporarily suspended franchises" icon={ShieldOff} />
                <KpiTile label="Revoked Tricycles" value={data.kpis.revoked} hint="Permanently revoked franchises" icon={Ban} />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ReportCard
                    icon={TrendingUp}
                    title="Registry Activity"
                    subtitle={hasDateFilter ? `New registrations · ${from} – ${to}` : 'New registrations · All time'}
                    className="lg:col-span-2"
                    action={<GranularityToggle value={granularity} onChange={setGranularity} />}
                >
                    {chartData.length === 0 ? (
                        <p className="text-xs text-tmo-subtle">No registrations in this range.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" name="Registrations" fill="#1D2542" radius={[4, 4, 0, 0]} barSize={granularity === 'day' ? 16 : 32} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ReportCard>

                <ReportCard icon={ShieldCheck} title="Fleet Status Breakdown" subtitle="Every registry status, including unregistered">
                    <StatusDonut data={data.by_status} colors={STATUS_COLORS} />
                </ReportCard>
            </div>

            <div className="mb-4">
                <ReportCard icon={Palette} title="Fleet by Color Coding Scheme" subtitle="Active franchises per ordinance color">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.by_color_scheme}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                            <XAxis dataKey="scheme" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" name="Units" radius={[4, 4, 0, 0]} barSize={32}>
                                {data.by_color_scheme.map((entry, i) => (
                                    <Cell key={i} fill={entry.color || '#94A3B8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReportCard icon={Satellite} title="Tracking Method Adoption" subtitle="How active units report their location">
                    <ProfileRow
                        items={[
                            { name: 'IoT GPS Device', count: data.tracking_split.iot, color: '#1D2542' },
                            { name: 'Mobile Driver App', count: data.tracking_split.mobile, color: '#94A3B8' },
                        ]}
                    />
                </ReportCard>

                <ReportCard icon={Clock} title="Renewals Due Soon" subtitle="Franchises expiring within 90 days">
                    {expiring.length === 0 ? (
                        <p className="text-xs text-tmo-subtle">Nothing due for renewal in the next 90 days.</p>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="text-2xl font-extrabold tabular-nums text-tmo-ink">{expiring.length}</p>
                                <p className="text-[11px] text-tmo-muted">
                                    franchise{expiring.length === 1 ? '' : 's'} due soon
                                </p>
                            </div>
                            <div className="h-9 w-px shrink-0 bg-tmo-border" />
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-tmo-subtle">Nearest</p>
                                <p className="truncate text-sm font-bold text-tmo-ink">{nearestExpiring.franchise_number}</p>
                                <p className="text-[11px] text-tmo-muted">
                                    {nearestExpiring.operator} · {nearestExpiring.days_left} day{nearestExpiring.days_left === 1 ? '' : 's'} left
                                </p>
                            </div>
                        </div>
                    )}
                </ReportCard>
            </div>
        </div>
    );
}
