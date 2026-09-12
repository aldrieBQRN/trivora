const TONES = {
    primary: { bg: 'bg-tmo-primarySoft', icon: 'text-tmo-primary' },
    success: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    warning: { bg: 'bg-amber-50', icon: 'text-amber-600' },
    danger: { bg: 'bg-red-50', icon: 'text-red-600' },
    info: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    neutral: { bg: 'bg-gray-100', icon: 'text-gray-600' },
};

/** Flat KPI/stat tile — no gradients, no decorative blobs, capped at one accent tint. */
export function KpiCard({ label, value, icon: Icon, tone = 'neutral', hint }) {
    const t = TONES[tone] || TONES.neutral;
    return (
        <div className="flex items-start gap-3 rounded-xl border border-tmo-border bg-tmo-surface p-4">
            {Icon && (
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.bg}`}>
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
    return <div className={`mb-6 grid grid-cols-1 gap-4 ${colsClass}`}>{children}</div>;
}
