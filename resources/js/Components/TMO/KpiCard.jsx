import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Neutral/primary metrics stay calm (white surface); status-toned metrics
// (warning/danger/success) get a soft tint so the ones needing attention
// visually surface themselves instead of every card looking identical.
const TONES = {
    neutral: { card: 'bg-white border-gray-200', icon: 'bg-gray-100 text-gray-500', value: 'text-gray-900' },
    primary: { card: 'bg-white border-gray-200', icon: 'bg-tmo-primarySoft text-tmo-primary', value: 'text-gray-900' },
    success: { card: 'bg-emerald-50/60 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-900' },
    warning: { card: 'bg-amber-50/60 border-amber-100', icon: 'bg-amber-100 text-amber-600', value: 'text-amber-900' },
    danger: { card: 'bg-red-50/50 border-red-100', icon: 'bg-red-100 text-red-600', value: 'text-red-900' },
    info: { card: 'bg-blue-50/50 border-blue-100', icon: 'bg-blue-100 text-blue-600', value: 'text-blue-900' },
};

/**
 * KPI/stat tile with real hierarchy between value, label, and supporting
 * context — not four identical icon+number boxes. `tone` drives both the
 * icon accent and (for status tones) a soft background tint so cards that
 * need attention read differently from calm totals. `trend` is optional —
 * pass it only where the data actually supports a comparison.
 */
export function KpiCard({ label, value, icon: Icon, tone = 'neutral', hint, trend }) {
    const t = TONES[tone] || TONES.neutral;
    const trendUp = trend?.direction === 'up';
    const trendDown = trend?.direction === 'down';

    return (
        <div className={`group relative rounded-xl border p-[18px] transition-all duration-150 hover:shadow-sm ${t.card}`}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-gray-500">{label}</p>
                {Icon && (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${t.icon}`}>
                        <Icon size={16} strokeWidth={2} />
                    </div>
                )}
            </div>

            <div className="mt-2.5 flex items-end justify-between gap-2">
                <p className={`text-[28px] font-bold leading-none tracking-tight tabular-nums ${t.value}`}>{value}</p>

                {trend && (
                    <span
                        className={`mb-0.5 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                            trendUp ? 'bg-emerald-100 text-emerald-700' : trendDown ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {trendUp && <ArrowUpRight size={11} strokeWidth={2.5} />}
                        {trendDown && <ArrowDownRight size={11} strokeWidth={2.5} />}
                        {trend.label}
                    </span>
                )}
            </div>

            {hint && <p className="mt-1.5 text-[11.5px] leading-snug text-gray-400">{hint}</p>}
        </div>
    );
}

export function KpiGrid({ children, cols = 4 }) {
    const colsClass = {
        2: 'sm:grid-cols-2',
        3: 'sm:grid-cols-2 lg:grid-cols-3',
        4: 'sm:grid-cols-2 lg:grid-cols-4',
    }[cols] || 'sm:grid-cols-2 lg:grid-cols-4';
    return <div className={`mb-7 grid grid-cols-1 gap-3.5 ${colsClass}`}>{children}</div>;
}
