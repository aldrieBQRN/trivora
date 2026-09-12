/** Row of toggleable filter pills with optional counts (e.g. All / Active / Inactive). */
export default function FilterPills({ options, value, onChange, className = '' }) {
    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                            active
                                ? 'bg-tmo-primary text-white'
                                : 'border border-tmo-border bg-white text-tmo-muted hover:bg-tmo-bg'
                        }`}
                    >
                        {opt.label}
                        {opt.count !== undefined && (
                            <span className={active ? 'text-white/70' : 'text-tmo-subtle'}>{opt.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
