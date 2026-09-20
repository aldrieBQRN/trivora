// Shared soft, layered shadow — same elevation token used across the redesigned TMO pages
// (Dashboard.jsx, Index.jsx) so every card in the panel reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

/**
 * Shared chart/section card for Reports & Analytics — icon badge + title (+ optional
 * subtitle/action) header over a consistent card shell. Scoped to this feature only;
 * not added to the shared TMO component library since no other page uses this pattern.
 */
export default function ReportCard({ icon: Icon, title, subtitle, action, children, className = '' }) {
    return (
        <div className={`rounded-2xl border border-tmo-border/70 bg-tmo-surface p-4 sm:p-5 ${CARD_SHADOW} ${className}`}>
            <div className="mb-3.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {Icon && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tmo-primary/[0.10] to-tmo-primary/[0.02] text-tmo-primary">
                            <Icon size={14} strokeWidth={2.2} />
                        </span>
                    )}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-tmo-ink">{title}</p>
                        {subtitle && <p className="mt-0.5 text-[11px] text-tmo-subtle">{subtitle}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </div>
    );
}
