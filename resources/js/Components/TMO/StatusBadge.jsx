const VARIANTS = {
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
    danger: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

/**
 * Single canonical status indicator. A small color dot carries the meaning
 * instead of a heavy bordered all-caps pill — reads calmer at a glance and
 * scales better when a table has many rows. Pass `icon` to swap the dot for
 * a lucide icon when the status benefits from one (e.g. a clock for
 * "scheduled"). Pass `onClick` to render it as a clickable toggle.
 */
export default function StatusBadge({ children, variant = 'neutral', icon: Icon, className = '', onClick, ...props }) {
    const v = VARIANTS[variant] || VARIANTS.neutral;
    const classes = `inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium leading-none ${v.bg} ${v.text} ${onClick ? 'cursor-pointer transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40' : ''} ${className}`;
    const content = (
        <>
            {Icon ? <Icon size={12} strokeWidth={2.4} /> : <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${v.dot}`} />}
            {children}
        </>
    );

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={classes} {...props}>
                {content}
            </button>
        );
    }

    return <span className={classes} {...props}>{content}</span>;
}
