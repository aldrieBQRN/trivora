import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

/**
 * Premium KPI Card for Reports & Analytics — matches the visual fidelity,
 * typography, and elevation of the TMO Operational pages.
 */
export function KpiTile({ label, value, hint, icon: Icon }) {
    return (
        <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
            <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                    </span>
                    {Icon && (
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                            <Icon size={15} strokeWidth={2.2} />
                        </div>
                    )}
                </div>
                <div className="mt-2.5 sm:mt-3">
                    <p className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                        {value}
                    </p>
                </div>
            </div>
            {hint && (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-slate-500 font-medium truncate">
                        {hint}
                    </span>
                </div>
            )}
        </div>
    );
}

export function ChartTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 shadow-xl font-['Plus_Jakarta_Sans',sans-serif]">
            <p className="text-xs font-black text-slate-900 border-b border-slate-100 pb-1 mb-1.5">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} className="text-xs text-slate-500 font-medium flex items-center justify-between gap-3">
                    <span>{p.name}:</span>
                    <span className="font-bold text-slate-900 tabular-nums">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

export function StatusDonut({ data, colors, emptyText }) {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const pieData = data.map((d) => ({ ...d, pct: total > 0 ? Math.round((d.count / total) * 100) : 0 }));

    if (total === 0) {
        return <p className="text-xs text-slate-400 font-['Plus_Jakarta_Sans',sans-serif] py-4 text-center">{emptyText || 'No data in this period.'}</p>;
    }

    return (
        <div className="font-['Plus_Jakarta_Sans',sans-serif]">
            <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="label" innerRadius={46} outerRadius={70} paddingAngle={2} stroke="none">
                        {pieData.map((d) => (
                            <Cell key={d.status} fill={colors[d.status] || '#94A3B8'} />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
                {pieData.map((d) => (
                    <div key={d.status} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold text-slate-800">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[d.status] || '#94A3B8' }} />
                            {d.label}
                        </span>
                        <span className="font-bold text-slate-500 tabular-nums">{d.count} <span className="font-normal text-slate-400">({d.pct}%)</span></span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ProfileRow({ icon: Icon, label, items }) {
    const total = items.reduce((sum, i) => sum + i.count, 0);
    const nonZero = items.filter((i) => i.count > 0);

    return (
        <div className="font-['Plus_Jakarta_Sans',sans-serif]">
            {label && (
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {Icon && <Icon size={13} />} {label}
                </p>
            )}
            {total === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No records in this period.</p>
            ) : nonZero.length === 1 ? (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{nonZero[0].name}</span>
                    <span className="text-xs sm:text-sm font-black text-[#182B62]">100% · {nonZero[0].count}</span>
                </div>
            ) : (
                <div className="space-y-3">
                    {nonZero.map((i) => {
                        const pct = total > 0 ? Math.round((i.count / total) * 100) : 0;
                        return (
                            <div key={i.name}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-800">{i.name}</span>
                                    <span className="font-semibold text-slate-500 tabular-nums">{i.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: i.color || '#182B62' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function aggregateTrend(daily, granularity) {
    if (granularity === 'day' || daily.length === 0) return daily;

    const buckets = new Map();
    daily.forEach(({ date, count }) => {
        const d = new Date(`${date}T00:00:00`);
        let key;
        if (granularity === 'week') {
            const isoDay = (d.getDay() + 6) % 7;
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

export function formatBucketLabel(dateStr, granularity) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (granularity === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const GRANULARITIES = ['day', 'week', 'month'];

export function GranularityToggle({ value, onChange }) {
    return (
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1 font-['Plus_Jakarta_Sans',sans-serif]">
            {GRANULARITIES.map((g) => (
                <button
                    key={g}
                    type="button"
                    onClick={() => onChange(g)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${
                        value === g ? 'bg-[#182B62] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    }`}
                >
                    {g}
                </button>
            ))}
        </div>
    );
}

