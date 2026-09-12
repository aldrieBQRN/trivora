/**
 * Standard page header for TMO Panel pages: eyebrow + title + subtitle on the
 * left, primary/secondary actions on the right. Used in place of each page's
 * previously bespoke header markup.
 */
export default function PageHeader({ eyebrow, title, subtitle, badge, actions, backLink }) {
    return (
        <div className="mb-6">
            {backLink}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    {eyebrow && (
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-tmo-primary">
                            {eyebrow}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-tmo-ink">{title}</h1>
                        {badge}
                    </div>
                    {subtitle && <p className="mt-1.5 text-sm text-tmo-muted">{subtitle}</p>}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}
