import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Same soft, layered shadow token as ReportCard.jsx/@/Components/TMO/KpiCard.jsx — every card
// on this page (KPI tiles, chart cards, breakdown donuts) shares the one elevation language.
export const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

/** Flat KPI/stat tile — single-tone icon chip, no gradient, no per-status color — deliberately
 * restrained (see BPLO Reports & Analytics' own KpiTile, the pattern this mirrors) rather than
 * the multi-tone gradient KpiCard used on TMO's operational queue pages. */
export function KpiTile({ label, value, hint, icon: Icon }) {
    return (
        <div className={`rounded-2xl border border-tmo-border/70 bg-white p-4 sm:p-5 ${CARD_SHADOW}`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-tmo-subtle">{label}</span>
                {Icon && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-tmo-bg text-tmo-primary">
                        <Icon size={14} />
                    </span>
                )}
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-tmo-ink">{value}</p>
            {hint && <p className="mt-1 text-[11px] text-tmo-muted">{hint}</p>}
        </div>
    );
}

export function ChartTooltip({ active, payload, label }) {
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

/** Donut + legend breakdown — mirrors BPLO Reports & Analytics' "Release Status Breakdown"
 * chart exactly (same innerRadius/outerRadius/paddingAngle, same legend-row shape), so a status
 * distribution reads the same way across both offices' report pages. Zero-count entries still
 * render as an (invisible) 0° slice, matching BPLO's own behavior — no special-casing needed. */
export function StatusDonut({ data, colors, emptyText }) {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const pieData = data.map((d) => ({ ...d, pct: total > 0 ? Math.round((d.count / total) * 100) : 0 }));

    if (total === 0) {
        return <p className="text-xs text-tmo-subtle">{emptyText || 'No data in this range.'}</p>;
    }

    return (
        <>
            <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="label" innerRadius={44} outerRadius={66} paddingAngle={2} stroke="none">
                        {pieData.map((d) => (
                            <Cell key={d.status} fill={colors[d.status] || '#94A3B8'} />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
                {pieData.map((d) => (
                    <div key={d.status} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-tmo-ink">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[d.status] || '#94A3B8' }} />
                            {d.label}
                        </span>
                        <span className="text-tmo-muted">{d.count} ({d.pct}%)</span>
                    </div>
                ))}
            </div>
        </>
    );
}

/** Proportional-bar breakdown for a small set of categories — a single-tone bar per row rather
 * than a multi-slice donut, since several of these lists run past 4-5 categories (by_stage,
 * TODA zones) where a "rainbow" pie stops being readable. Renders a compact "100%" badge instead
 * of a one-bar comparison when only one category actually has data. */
export function ProfileRow({ icon: Icon, label, items }) {
    const total = items.reduce((sum, i) => sum + i.count, 0);
    const nonZero = items.filter((i) => i.count > 0);

    return (
        <div>
            {label && (
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-tmo-muted">
                    {Icon && <Icon size={13} />} {label}
                </p>
            )}
            {total === 0 ? (
                <p className="text-xs text-tmo-subtle">No data in this range.</p>
            ) : nonZero.length === 1 ? (
                <div className="flex items-center justify-between rounded-lg bg-tmo-bg px-3 py-2.5">
                    <span className="text-sm font-bold text-tmo-ink">{nonZero[0].name}</span>
                    <span className="text-sm font-bold text-tmo-primary">100% · {nonZero[0].count}</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {nonZero.map((i) => {
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

// Backend always returns daily buckets — rolling those up into ISO weeks or calendar months is a
// pure display concern (same reasoning/implementation as BPLO Reports & Analytics' own helper),
// so it happens here instead of round-tripping to the server for the same data every toggle.
export function aggregateTrend(daily, granularity) {
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

export function formatBucketLabel(dateStr, granularity) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (granularity === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const GRANULARITIES = ['day', 'week', 'month'];

/** Day/Week/Month toggle for a trend chart's header action slot — same control BPLO Reports &
 * Analytics uses for its Releasing Activity chart. */
export function GranularityToggle({ value, onChange }) {
    return (
        <div className="flex items-center gap-0.5 rounded-lg border border-tmo-border p-0.5">
            {GRANULARITIES.map((g) => (
                <button
                    key={g}
                    type="button"
                    onClick={() => onChange(g)}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold capitalize transition-colors ${
                        value === g ? 'bg-tmo-primary text-white' : 'text-tmo-muted hover:text-tmo-ink'
                    }`}
                >
                    {g}
                </button>
            ))}
        </div>
    );
}
