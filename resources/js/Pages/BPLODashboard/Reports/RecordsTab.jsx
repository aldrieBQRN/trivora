import React, { useMemo, useState } from 'react';
import { Search, X, Inbox, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
const ITEMS_PER_PAGE = 10;

export default function RecordsTab({ filters, todaZones, statusOptions, data, onFilterChange, onClearFilters }) {
    const records = data.records;
    const exportUrl = route('bplo.reports.export-records-excel', {
        status: filters.status || undefined,
        toda_zone_id: filters.toda_zone_id || undefined,
        search: filters.search || undefined,
    });
    const [search, setSearch] = useState(filters.search || '');
    const [currentPage, setCurrentPage] = useState(1);
    const searchDebounceRef = React.useRef(null);

    const handleSearchChange = (value) => {
        setSearch(value);
        setCurrentPage(1);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            onFilterChange('search', value);
        }, 400);
    };

    const handleFilterChange = (key, value) => {
        setCurrentPage(1);
        onFilterChange(key, value);
    };

    const isFiltering = !!(filters.search || filters.status || filters.toda_zone_id);

    const handleClearAll = () => {
        setSearch('');
        setCurrentPage(1);
        onClearFilters();
    };

    const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const paginated = useMemo(
        () => records.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE),
        [records, activePage]
    );

    return (
        <div>
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={16} strokeWidth={2.2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search by reference no., driver, or plate…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={filters.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="h-10 w-full sm:w-56 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.toda_zone_id || ''}
                            onChange={(e) => handleFilterChange('toda_zone_id', e.target.value)}
                            className="h-10 w-full sm:w-44 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 cursor-pointer truncate"
                        >
                            <option value="">All TODAs</option>
                            {todaZones.map((z) => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                        </select>

                        <a
                            href={exportUrl}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <FileSpreadsheet size={13} /> Export to Excel
                        </a>
                    </div>
                </div>
            </div>

            {records.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Inbox size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">No matching applications</h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering ? 'No records match your search or filters.' : 'No franchise applications have been submitted yet.'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                            <span>Clear all filters</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th scope="col" className="py-3 pl-5 pr-3">Reference</th>
                                    <th scope="col" className="py-3 px-3">Driver</th>
                                    <th scope="col" className="py-3 px-3">TODA</th>
                                    <th scope="col" className="py-3 px-3">Plate</th>
                                    <th scope="col" className="py-3 px-3">Status</th>
                                    <th scope="col" className="py-3 px-3">Submitted</th>
                                    <th scope="col" className="py-3 pl-3 pr-5">Released</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {paginated.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80">
                                        <td className="py-3 pl-5 pr-3 font-mono text-[11px] font-bold text-slate-900">{r.reference}</td>
                                        <td className="py-3 px-3 font-semibold text-slate-800">{r.driver}</td>
                                        <td className="py-3 px-3 text-slate-600">{r.toda}</td>
                                        <td className="py-3 px-3 text-slate-600">{r.plate}</td>
                                        <td className="py-3 px-3">
                                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-500">{r.submitted_at}</td>
                                        <td className="py-3 pl-3 pr-5 text-slate-500">{r.release_date || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3">
                        <p className="text-xs text-slate-500">
                            Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                            <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                            <span className="mx-2 text-slate-300">·</span>
                            <span className="tabular-nums font-semibold text-slate-700">{records.length}</span> record{records.length === 1 ? '' : 's'}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={activePage <= 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                <ChevronLeft size={13} strokeWidth={2.5} />
                                <span>Prev</span>
                            </button>
                            <button
                                type="button"
                                disabled={activePage >= totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                <span>Next</span>
                                <ChevronRight size={13} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
