/**
 * Standard page header: eyebrow (optional, use only when it adds real
 * category context) + title + description on the left, actions on the
 * right, with a hairline rule to give the page a clear starting point.
 */
export default function PageHeader({ eyebrow, title, subtitle, badge, actions, backLink }) {
    return (
        <div className="mb-7">
            {backLink}
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    {eyebrow && (
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-tmo-primary">
                            {eyebrow}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[26px]">{title}</h1>
                        {badge}
                    </div>
                    {subtitle && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-gray-500">{subtitle}</p>}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
            </div>
        </div>
    );
}
