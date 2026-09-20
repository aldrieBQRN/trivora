import React, { useState } from 'react';
import { DateRangeFilter, Table, Thead, Tbody, Tr, Td, Pagination, EmptyState, StatusBadge } from '@/Components/TMO';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ShieldAlert, Wallet, TrendingUp, Scale, FileSpreadsheet, Radio, MapPin, Layers, ClipboardList } from 'lucide-react';
import ReportCard from './ReportCard';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const PAGE_SIZE = 5;

function peso(n) {
    return `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

// Adaptively renders a breakdown as a single "100%" badge when only one category
// has data, or as comparison bars once there's actually more than one to compare —
// avoids dedicating chart space to a contrast that doesn't exist yet.
function ProfileRow({ icon: Icon, label, items }) {
    const total = items.reduce((sum, i) => sum + i.count, 0);
    const nonZero = items.filter((i) => i.count > 0);

    return (
        <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tmo-muted">
                <Icon size={13} /> {label}
            </p>
            {total === 0 ? (
                <p className="text-xs text-tmo-subtle">No data in this range.</p>
            ) : nonZero.length === 1 ? (
                <div className="flex items-center justify-between rounded-lg bg-tmo-bg px-3 py-2.5">
                    <span className="text-sm font-bold text-tmo-ink">{nonZero[0].name}</span>
                    <span className="text-sm font-bold text-tmo-primary">100% · {nonZero[0].count}</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.filter((i) => i.count > 0).map((i) => {
                        const pct = total > 0 ? Math.round((i.count / total) * 100) : 0;
                        return (
                            <div key={i.name}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-tmo-ink">{i.name}</span>
                                    <span className="text-tmo-muted">{i.count} ({pct}%)</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-tmo-bg">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i.color || '#1D2542' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ViolationsTab({ from, to, filters, todaZones, data, onDateChange, onFilterChange }) {
    const [page, setPage] = useState(1);
    const records = data.records || [];
    const totalPages = Math.ceil(records.length / PAGE_SIZE) || 1;
    const activePage = Math.min(page, totalPages);
    const paginated = records.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

    const exportUrl = route('tmo.reports.export-violations-excel', { from, to, ...filters });

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 print:hidden lg:flex-row lg:items-center lg:justify-between">
                <DateRangeFilter from={from} to={to} onChange={onDateChange} />
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={filters.toda_zone_id || ''}
                        onChange={(e) => onFilterChange('toda_zone_id', e.target.value)}
                        className="h-9 w-full shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs font-semibold text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:w-44"
                    >
                        <option value="">All TODA Zones</option>
                        {todaZones.map((z) => (
                            <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
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
                {/* Card 1: Total Violations */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Total Violations</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                                <ShieldAlert size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {data.kpis.total_violations}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Violations recorded in range</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 2: Fines Assessed */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Fines Assessed</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/[0.10] to-slate-500/[0.02] text-slate-600">
                                <Wallet size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {peso(data.kpis.fines_assessed)}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Total fines issued in range</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 3: Fines Collected */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Fines Collected</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                <Wallet size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {peso(data.kpis.fines_collected)}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">{data.kpis.collection_rate}% collection rate</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 4: Appeals Filed */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Appeals Filed</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-tmo-primary/[0.10] to-tmo-primary/[0.02] text-tmo-primary">
                                <Scale size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-primary">
                                {data.kpis.appeals_filed}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">
                            {data.kpis.appeal_approval_rate !== null ? `${data.kpis.appeal_approval_rate}% approved` : 'None decided yet'}
                        </p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>
            </div>

            {data.kpis.total_violations === 0 ? (
                <EmptyState
                    icon={ShieldAlert}
                    title="No violations in this range"
                    description="Try widening the date range or clearing the filters above."
                />
            ) : (
                <>
                    <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ReportCard icon={TrendingUp} title="Violations Over Time" subtitle="Daily count across the selected range">
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={data.trend}>
                                    <defs>
                                        <linearGradient id="violationsFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#1D2542" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#1D2542" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="count" name="Violations" stroke="#1D2542" strokeWidth={2} fill="url(#violationsFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ReportCard>

                        <ReportCard icon={Layers} title="Violation Profile" subtitle="Breakdown by type and how it was detected">
                            <div className="space-y-4">
                                <ProfileRow
                                    icon={ShieldAlert}
                                    label="By Type"
                                    items={(data.by_type || []).map((t) => ({ name: t.type, count: t.count }))}
                                />
                                <div className="border-t border-tmo-border" />
                                <ProfileRow
                                    icon={Radio}
                                    label="Detection Method"
                                    items={[
                                        { name: 'Automated', count: data.detection_split.automated || 0, color: '#1D2542' },
                                        { name: 'Manual', count: data.detection_split.manual || 0, color: '#94A3B8' },
                                    ]}
                                />
                            </div>
                        </ReportCard>

                        <ReportCard icon={Radio} title="By Day of Week" subtitle="Which restricted days draw the most citations">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={data.by_day_of_week}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                    <XAxis dataKey="day" tickFormatter={(d) => d.slice(0, 3)} tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Violations" fill="#64748B" radius={[4, 4, 0, 0]} barSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>

                        <ReportCard icon={MapPin} title="By TODA Zone" subtitle="Where enforcement activity is concentrated">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={data.by_toda}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                                    <XAxis dataKey="zone" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Violations" fill="#1D2542" radius={[4, 4, 0, 0]} barSize={26} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportCard>
                    </div>

                    <div className="print:hidden">
                        <div className="mb-3 flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tmo-primary/[0.10] to-tmo-primary/[0.02] text-tmo-primary">
                                <ClipboardList size={14} strokeWidth={2.2} />
                            </span>
                            <p className="text-xs font-bold uppercase tracking-wide text-tmo-ink">
                                Violation Log <span className="font-semibold normal-case text-tmo-subtle">({records.length})</span>
                            </p>
                        </div>
                        <Table>
                            <Thead>
                                <th>Ticket No.</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Operator</th>
                                <th>TODA</th>
                                <th className="text-right">Fine</th>
                                <th>Status</th>
                            </Thead>
                            <Tbody>
                                {paginated.map((r) => (
                                    <Tr key={r.db_id}>
                                        <Td className="font-mono text-xs">{r.id}</Td>
                                        <Td>{r.date} &bull; {r.time}</Td>
                                        <Td>{r.type}</Td>
                                        <Td>{r.operator}</Td>
                                        <Td>{r.toda}</Td>
                                        <Td className="text-right font-semibold">{peso(r.fine)}</Td>
                                        <Td>
                                            {r.appeal_status === 'under_review' ? (
                                                <StatusBadge variant="warning">Appeal Pending</StatusBadge>
                                            ) : r.appeal_status === 'rejected' ? (
                                                <StatusBadge variant="danger">Appeal Rejected</StatusBadge>
                                            ) : r.appeal_status === 'approved' ? (
                                                <StatusBadge variant="success">Appeal Approved</StatusBadge>
                                            ) : r.is_paid ? (
                                                <StatusBadge variant="success">Settled</StatusBadge>
                                            ) : (
                                                <StatusBadge variant="danger">Unpaid</StatusBadge>
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                        <Pagination page={activePage} totalPages={totalPages} totalItems={records.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
                    </div>
                </>
            )}
        </div>
    );
}
