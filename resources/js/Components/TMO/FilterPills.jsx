/** Segmented filter control with optional counts (e.g. All / Active / Inactive). */
export default function FilterPills({ options, value, onChange, className = '' }) {
    return (
        <div className={`inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100/70 p-0.5 ${className}`}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`inline-flex h-[30px] items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium transition-all ${
                            active
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {opt.label}
                        {opt.count !== undefined && (
                            <span className={`text-[11px] tabular-nums ${active ? 'text-gray-400' : 'text-gray-400'}`}>{opt.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
