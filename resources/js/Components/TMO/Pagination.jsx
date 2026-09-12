import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Client-side numbered pager — extracted from UnitRegistry.jsx's original pattern. */
export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
    if (totalPages <= 1) return null;

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-tmo-border px-5 py-3 text-xs text-tmo-muted sm:flex-row">
            <p>
                Showing <span className="font-semibold text-tmo-ink">{start}</span>–
                <span className="font-semibold text-tmo-ink">{end}</span> of{' '}
                <span className="font-semibold text-tmo-ink">{totalItems}</span>
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-tmo-border text-tmo-muted hover:bg-tmo-bg disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onPageChange(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                            p === page ? 'bg-tmo-primary text-white' : 'text-tmo-muted hover:bg-tmo-bg'
                        }`}
                    >
                        {p}
                    </button>
                ))}
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-tmo-border text-tmo-muted hover:bg-tmo-bg disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
