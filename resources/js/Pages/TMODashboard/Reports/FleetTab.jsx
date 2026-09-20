import React, { useState } from 'react';
import { Table, Thead, Tbody, Tr, Td, Pagination, EmptyState, StatusBadge } from '@/Components/TMO';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bike, ShieldCheck, ShieldOff, Ban, Satellite, FileSpreadsheet, Clock, MapPin, Palette } from 'lucide-react';
import ReportCard from './ReportCard';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const PAGE_SIZE = 5;

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

export default function FleetTab({ filters, todaZones, data, onFilterChange }) {
    const excelExportUrl = route('tmo.reports.export-fleet-excel', filters);

    const [page, setPage] = useState(1);
    const expiring = data.expiring || [];
    const totalPages = Math.ceil(expiring.length / PAGE_SIZE) || 1;
    const activePage = Math.min(page, totalPages);
    const paginatedExpiring = expiring.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
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
                    <select
                        value={filters.tricycle_status || ''}
                        onChange={(e) => onFilterChange('tricycle_status', e.target.value)}
                        className="h-9 w-full shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs font-semibold text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:w-40"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="revoked">Revoked</option>
                        <option value="unregistered">Unregistered</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={excelExportUrl}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-tmo-borderStrong bg-white px-3 text-xs font-semibold text-tmo-ink hover:bg-tmo-bg"
                    >
                        <FileSpreadsheet size={13} /> Export to Excel
                    </a>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Card 1: Total Registered */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Total Registered</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-tmo-primary/[0.10] to-tmo-primary/[0.02] text-tmo-primary">
                                <Bike size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-primary">
                                {data.kpis.total}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">All tricycles ever registered</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Registry:</span>
                        <span className="text-xs font-bold text-tmo-ink">Live Snapshot</span>
                    </div>
                </div>

                {/* Card 2: Active */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Active</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                <ShieldCheck size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {data.kpis.active}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Franchise currently active</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Registry:</span>
                        <span className="text-xs font-bold text-tmo-ink">Live Snapshot</span>
                    </div>
                </div>

                {/* Card 3: Suspended */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Suspended</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                                <ShieldOff size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {data.kpis.suspended}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Temporarily suspended franchises</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Registry:</span>
                        <span className="text-xs font-bold text-tmo-ink">Live Snapshot</span>
                    </div>
                </div>

                {/* Card 4: Revoked */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Revoked</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                                <Ban size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {data.kpis.revoked}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Permanently revoked franchises</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Registry:</span>
                        <span className="text-xs font-bold text-tmo-ink">Live Snapshot</span>
                    </div>
                </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReportCard icon={MapPin} title="Fleet by TODA Zone" subtitle="Registered units per zone">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.by_toda}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                            <XAxis dataKey="zone" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" name="Units" fill="#1D2542" radius={[4, 4, 0, 0]} barSize={26} />
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>

                <ReportCard icon={Palette} title="Fleet by Color Coding Scheme" subtitle="Active franchises per ordinance color">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.by_color_scheme}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                            <XAxis dataKey="scheme" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" name="Units" radius={[4, 4, 0, 0]} barSize={26}>
                                {data.by_color_scheme.map((entry, i) => (
                                    <Cell key={i} fill={entry.color || '#94A3B8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>
            </div>

            <ReportCard icon={Satellite} title="Tracking Method Adoption" subtitle="How active units report their location" className="mb-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-tmo-ink">IoT GPS Device</span>
                            <span className="text-tmo-muted">{data.tracking_split.iot} units ({data.kpis.iot_pct}%)</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-tmo-bg">
                            <div className="h-full rounded-full bg-tmo-primary" style={{ width: `${data.kpis.iot_pct}%` }} />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-tmo-ink">Mobile Driver App</span>
                            <span className="text-tmo-muted">{data.tracking_split.mobile} units ({data.kpis.mobile_pct}%)</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-tmo-bg">
                            <div className="h-full rounded-full bg-slate-400" style={{ width: `${data.kpis.mobile_pct}%` }} />
                        </div>
                    </div>
                </div>
            </ReportCard>

            <div>
                <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tmo-primary/[0.10] to-tmo-primary/[0.02] text-tmo-primary">
                        <Clock size={14} strokeWidth={2.2} />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wide text-tmo-ink">
                        Franchises Expiring Within 90 Days
                        <span className="ml-1.5 font-semibold normal-case text-tmo-subtle">({expiring.length})</span>
                    </p>
                </div>
                {expiring.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title="No franchises expiring soon" description="Nothing due for renewal in the next 90 days." />
                ) : (
                    <Table>
                        <Thead>
                            <th>Franchise No.</th>
                            <th>Operator</th>
                            <th>Plate No.</th>
                            <th>Expiry Date</th>
                            <th>Days Left</th>
                        </Thead>
                        <Tbody>
                            {paginatedExpiring.map((r, i) => (
                                <Tr key={i}>
                                    <Td className="font-mono text-xs">{r.franchise_number}</Td>
                                    <Td>{r.operator}</Td>
                                    <Td className="font-mono text-xs">{r.plate}</Td>
                                    <Td>{r.expiry_date}</Td>
                                    <Td>
                                        <StatusBadge variant={r.days_left <= 30 ? 'danger' : r.days_left <= 60 ? 'warning' : 'neutral'}>
                                            {r.days_left} days
                                        </StatusBadge>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
                {expiring.length > 0 && (
                    <Pagination page={activePage} totalPages={totalPages} totalItems={expiring.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
                )}
            </div>
        </div>
    );
}
