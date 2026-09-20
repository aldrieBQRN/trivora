import React from 'react';
import { DateRangeFilter, EmptyState } from '@/Components/TMO';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Wallet, Landmark, ShieldAlert, FileSpreadsheet } from 'lucide-react';
import ReportCard from './ReportCard';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

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
                    {p.name}: <span className="font-bold text-tmo-ink">{peso(p.value)}</span>
                </p>
            ))}
        </div>
    );
}

export default function CollectionsTab({ from, to, data, onDateChange }) {
    const hasData = data.kpis.combined_total > 0;
    const exportUrl = route('tmo.reports.export-collections-excel', { from, to });

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 print:hidden lg:flex-row lg:items-center lg:justify-between">
                <DateRangeFilter from={from} to={to} onChange={onDateChange} />
                <a
                    href={exportUrl}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-tmo-borderStrong bg-white px-3 text-xs font-semibold text-tmo-ink hover:bg-tmo-bg"
                >
                    <FileSpreadsheet size={13} /> Export to Excel
                </a>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-3">
                {/* Card 1: MTOP Franchise Fees */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">MTOP Franchise Fees</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-tmo-primary/[0.10] to-tmo-primary/[0.02] text-tmo-primary">
                                <Landmark size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-primary">
                                {peso(data.kpis.fees_collected)}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Franchise fees collected in range</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 2: Violation Fines */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Violation Fines</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                                <ShieldAlert size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {peso(data.kpis.fines_collected)}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Fines collected in range</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>

                {/* Card 3: Combined Total */}
                <div className={`flex flex-col justify-between rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">Combined Total</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                                <Wallet size={14} />
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">
                                {peso(data.kpis.combined_total)}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-tmo-muted">Fees plus fines, combined</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-tmo-bg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-tmo-muted">Period:</span>
                        <span className="text-xs font-bold text-tmo-ink">{from} – {to}</span>
                    </div>
                </div>
            </div>

            {!hasData ? (
                <EmptyState icon={Wallet} title="No collections recorded in this range" description="Try widening the date range." />
            ) : (
                <ReportCard icon={Wallet} title="Collections Over Time" subtitle="Franchise fees vs. violation fines, by day">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.trend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F5" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#EEF0F5' }} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="fees" name="Franchise Fees" fill="#1D2542" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="fines" name="Violation Fines" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>
            )}
        </div>
    );
}
