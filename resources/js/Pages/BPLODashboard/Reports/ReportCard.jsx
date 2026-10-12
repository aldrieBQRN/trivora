// Same soft, layered shadow token used across every other BPLO page (see ActiveRegistry.jsx's
// own CARD_SHADOW) — kept identical here so the Reports page's cards match that elevation
// language instead of introducing a flatter, page-specific look.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

/**
 * Shared chart/section card for BPLO Reports & Analytics — icon badge + title (+ optional
 * subtitle) header over a consistent card shell. Mirrors TMODashboard/Reports/ReportCard.jsx's
 * structure and styling exactly so both panels' report cards look the same.
 */
export default function ReportCard({ icon: Icon, title, subtitle, action, children, className = '' }) {
    return (
        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} ${className}`}>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {Icon && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                            <Icon size={15} strokeWidth={2.2} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] truncate">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="mt-0.5 text-[11px] text-slate-500 font-medium font-['Plus_Jakarta_Sans',sans-serif] truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
            </div>
            {children}
        </div>
    );
}

