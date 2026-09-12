import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Client-side numbered pager — extracted from UnitRegistry.jsx's original pattern. */
export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
    if (totalPages <= 1) return null;

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/50 px-5 py-3 text-[12.5px] text-gray-500 sm:flex-row">
            <p>
                Showing <span className="font-semibold text-gray-800">{start}</span>–
                <span className="font-semibold text-gray-800">{end}</span> of{' '}
                <span className="font-semibold text-gray-800">{totalItems}</span>
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white hover:text-gray-700 hover:shadow-sm disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onPageChange(p)}
                        className={`flex h-7 w-7 items-center justify-center rounded-md text-[12.5px] font-medium transition-colors ${
                            p === page ? 'bg-tmo-primary text-white' : 'text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm'
                        }`}
                    >
                        {p}
                    </button>
                ))}
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white hover:text-gray-700 hover:shadow-sm disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
