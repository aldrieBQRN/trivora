// Shared soft, layered shadow — same elevation token used across every redesigned BPLO/TMO page.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

/**
 * Shared chart/section card for BPLO Reports & Analytics — icon badge + title (+ optional
 * subtitle) header over a consistent card shell. Mirrors TMODashboard/Reports/ReportCard.jsx's
 * structure exactly, restyled with BPLO's own slate/#1D2542 convention instead of the TMO-only
 * `tmo-*` Tailwind tokens (see trivora/CLAUDE.md — that namespace is TMO Panel only).
 */
export default function ReportCard({ icon: Icon, title, subtitle, action, children, className = '' }) {
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} ${className}`}>
            <div className="mb-3.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {Icon && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <Icon size={14} strokeWidth={2.2} />
                        </span>
                    )}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-900">{title}</p>
                        {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </div>
    );
}
