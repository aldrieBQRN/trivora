export const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TONES = {
    primary: { from: 'from-tmo-primary/[0.10]', icon: 'text-tmo-primary' },
    success: { from: 'from-emerald-500/[0.12]', icon: 'text-emerald-600' },
    warning: { from: 'from-amber-500/[0.12]', icon: 'text-amber-600' },
    danger: { from: 'from-red-500/[0.12]', icon: 'text-red-600' },
    info: { from: 'from-blue-500/[0.12]', icon: 'text-blue-600' },
    neutral: { from: 'from-gray-500/[0.10]', icon: 'text-gray-600' },
};

/** KPI/stat tile — soft layered shadow, gradient icon chip, single accent tint. */
export function KpiCard({ label, value, icon: Icon, tone = 'neutral', hint }) {
    const t = TONES[tone] || TONES.neutral;
    return (
        <div className={`flex items-start gap-3 rounded-2xl border border-tmo-border/70 bg-tmo-surface p-4 ${CARD_SHADOW}`}>
            {Icon && (
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.from} to-transparent`}>
                    <Icon size={18} strokeWidth={2} className={t.icon} />
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-tmo-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold leading-none text-tmo-ink">{value}</p>
                {hint && <p className="mt-1.5 text-xs text-tmo-subtle">{hint}</p>}
            </div>
        </div>
    );
}

export function KpiGrid({ children, cols = 4 }) {
    const colsClass = {
        2: 'sm:grid-cols-2',
        3: 'sm:grid-cols-2 lg:grid-cols-3',
        4: 'sm:grid-cols-2 lg:grid-cols-4',
    }[cols] || 'sm:grid-cols-2 lg:grid-cols-4';
    return <div className={`mb-6 grid grid-cols-1 gap-3.5 sm:gap-4 ${colsClass}`}>{children}</div>;
}
