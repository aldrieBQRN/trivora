import { Loader2 } from 'lucide-react';

const VARIANTS = {
    primary: 'bg-tmo-primary text-white border border-tmo-primary hover:bg-tmo-primaryHover focus-visible:ring-tmo-primary',
    secondary: 'bg-white text-tmo-ink border border-tmo-borderStrong hover:bg-gray-50 focus-visible:ring-tmo-primary',
    danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50 focus-visible:ring-red-600',
    dangerSolid: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 focus-visible:ring-red-600',
    success: 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600',
    ghost: 'bg-transparent text-tmo-muted border border-transparent hover:bg-gray-100 hover:text-tmo-ink focus-visible:ring-tmo-primary',
};

const SIZES = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
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
    const classes = `inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.secondary} ${SIZES[size] || SIZES.md} ${className}`;

    const content = (
        <>
            {loading ? (
                <Loader2 size={15} className="animate-spin" />
            ) : (
                Icon && iconPosition === 'left' && <Icon size={15} strokeWidth={2} />
            )}
            {children}
            {!loading && Icon && iconPosition === 'right' && <Icon size={15} strokeWidth={2} />}
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
    default: 'bg-white text-tmo-muted border border-tmo-border hover:bg-gray-50 hover:text-tmo-ink',
    primary: 'bg-tmo-primary text-white border border-tmo-primary hover:bg-tmo-primaryHover',
    success: 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
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
            className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-tmo-primary disabled:opacity-40 disabled:cursor-not-allowed ${ICON_VARIANTS[variant] || ICON_VARIANTS.default} ${className}`}
        >
            <Icon size={15} strokeWidth={2} />
        </button>
    );
}
