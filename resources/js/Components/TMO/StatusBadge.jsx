const VARIANTS = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
};

/**
 * Single canonical status-pill component. `variant` is the only thing that
 * should ever change per status — keeps every badge in the panel visually
 * identical instead of each page re-deriving its own shade of green/red/amber.
 */
export default function StatusBadge({ children, variant = 'neutral', icon: Icon, className = '' }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${VARIANTS[variant] || VARIANTS.neutral} ${className}`}
        >
            {Icon && <Icon size={11} strokeWidth={3} />}
            {children}
        </span>
    );
}
