import { Loader2 } from 'lucide-react';

const VARIANTS = {
    primary:
        'bg-tmo-primary text-white shadow-sm shadow-tmo-primary/20 hover:bg-tmo-primaryHover hover:shadow-md hover:shadow-tmo-primary/25 focus-visible:ring-tmo-primary/40 active:shadow-sm',
    secondary:
        'bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-tmo-primary/30',
    danger:
        'bg-white text-red-600 border border-red-200 shadow-sm hover:bg-red-50 hover:border-red-300 focus-visible:ring-red-500/40',
    dangerSolid:
        'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 hover:shadow-md hover:shadow-red-600/25 focus-visible:ring-red-500/40',
    success:
        'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/25 focus-visible:ring-emerald-500/40',
    ghost:
        'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-tmo-primary/30',
};

const SIZES = {
    sm: 'h-8 px-3 text-[13px] gap-1.5',
    md: 'h-[38px] px-4 text-[13.5px] gap-2',
    lg: 'h-11 px-5 text-sm gap-2',
};

/**
 * Shared TMO Panel button. Variants map to the panel's status/brand tokens
 * so every action control across pages shares the same height/radius/weight.
 * Pass `as={Link}` (Inertia) to render a link styled identically to a button.
 */
export default function Button({
    as: Component = 'button',
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    children,
    type = 'button',
    ...props
}) {
    const classes = `inline-flex select-none items-center justify-center rounded-[9px] font-medium tracking-[-0.005em] whitespace-nowrap transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98] ${VARIANTS[variant] || VARIANTS.secondary} ${SIZES[size] || SIZES.md} ${className}`;

    const content = (
        <>
            {loading ? (
                <Loader2 size={15} className="animate-spin" />
            ) : (
                Icon && iconPosition === 'left' && <Icon size={15} strokeWidth={2.25} />
            )}
            {children}
            {!loading && Icon && iconPosition === 'right' && <Icon size={15} strokeWidth={2.25} />}
        </>
    );

    if (Component !== 'button') {
        return (
            <Component {...props} className={classes}>
                {content}
            </Component>
        );
    }

    return (
        <button {...props} type={type} disabled={disabled || loading} className={classes}>
            {content}
        </button>
    );
}

const ICON_VARIANTS = {
    default: 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300',
    primary: 'bg-tmo-primary text-white shadow-sm shadow-tmo-primary/20 hover:bg-tmo-primaryHover',
    success: 'bg-white text-emerald-600 border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200',
    danger: 'bg-white text-gray-400 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200',
};

/** Square icon-only button for row actions (edit / approve / reject / delete). */
export function IconButton({
    icon: Icon,
    variant = 'default',
    size = 'md',
    className = '',
    label,
    ...props
}) {
    const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
    return (
        <button
            {...props}
            type={props.type || 'button'}
            aria-label={label}
            title={label}
            className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-tmo-primary/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95 ${ICON_VARIANTS[variant] || ICON_VARIANTS.default} ${className}`}
        >
            <Icon size={15} strokeWidth={2.1} />
        </button>
    );
}
