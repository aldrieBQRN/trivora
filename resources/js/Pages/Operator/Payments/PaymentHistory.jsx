import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    Wallet,
    Calendar,
    Receipt,
    FileText,
    ShieldAlert,
    Activity,
    Download,
    Search,
    X,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 10;

// Shared soft, layered shadow token — same elevation language used across the TMO/Operator SaaS
// redesign, so every card on this page reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const CATEGORY_TAGS = {
    MTOP: { icon: FileText, className: 'bg-slate-100 text-[#1D2542]', label: 'MTOP Registration' },
    Violation: { icon: ShieldAlert, className: 'bg-red-50 text-red-600', label: 'Violation Fine' },
    IoT: { icon: Activity, className: 'bg-emerald-50 text-emerald-600', label: 'Hardware' },
};

function CategoryTag({ type }) {
    const tag = CATEGORY_TAGS[type];
    if (!tag) return null;
    const Icon = tag.icon;
    return (
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${tag.className}`}>
            <Icon size={10} /> {tag.label}
        </span>
    );
}

export default function PaymentHistory({ payments = [], auth }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const operatorName = auth?.user?.name || 'Driver';

    // The backend already returns the ledger fully shaped (MTOP fees + settled violation
    // fines merged and sorted) — just alias `reference` to the `refNo` name used below.
    const ledger = payments.map(p => ({ ...p, refNo: p.reference }));

    const categoryCounts = useMemo(() => ({
        all: ledger.length,
        MTOP: ledger.filter((t) => t.type === 'MTOP').length,
        Violation: ledger.filter((t) => t.type === 'Violation').length,
        IoT: ledger.filter((t) => t.type === 'IoT').length,
    }), [ledger]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return ledger.filter((txn) => {
            const matchesQuery = !q ||
                txn.refNo.toLowerCase().includes(q) ||
                txn.description.toLowerCase().includes(q) ||
                txn.type.toLowerCase().includes(q);
            const matchesCategory = category === 'all' || txn.type === category;
            return matchesQuery && matchesCategory;
        });
    }, [ledger, query, category]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * PAGE_SIZE;
    const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    const isFiltering = query.trim() !== '' || category !== 'all';

    const handleClearFilters = () => {
        setQuery('');
        setCategory('all');
        setCurrentPage(1);
    };

    const totalPaid = ledger.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = ledger.length;
    const clearedViolations = ledger.filter(t => t.type === 'Violation' && t.status === 'paid').length;

    const handleExport = () => {
        const exportList = filtered.length > 0 ? filtered : ledger;
        const csvContent = [
            ['OR Number', 'Date', 'Category', 'Description', 'Method', 'Amount (PHP)', 'Status'],
            ...exportList.map(t => [t.refNo, t.date, t.type, t.description, t.method, t.amount.toFixed(2), t.status.toUpperCase()]),
        ]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Trivora_Payment_History_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <OperatorLayout title="Payment History" operatorName={operatorName}>
            <Head title="Payment History | TRIVORA" />

            {/* 1. CLEAN HEADER */}
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
                        Payment History
                    </h1>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
                        A complete ledger of your settled MTOP fees, violations, and IoT subscriptions.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                    <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.99]"
                    >
                        <Download size={14} strokeWidth={2.2} className="text-slate-400" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* 2. KPI CARDS */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:border-slate-300 sm:p-5 ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600 transition-colors group-hover:from-emerald-500/[0.18]">
                            <Wallet size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">2026</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">
                            ₱{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Total Paid</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Status</span>
                        <span className="font-semibold text-emerald-700">All Settled</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:border-slate-300 sm:p-5 ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542] transition-colors group-hover:from-[#1D2542]/[0.16]">
                            <Receipt size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">All-Time</span>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">{totalTransactions}</span>
                            <span className="text-xs font-semibold text-slate-400">records</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Total Transactions</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Categories</span>
                        <span className="font-semibold text-slate-700">MTOP &bull; Violation &bull; IoT</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:border-slate-300 sm:p-5 ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/[0.12] to-red-500/[0.02] text-red-600 transition-colors group-hover:from-red-500/[0.18]">
                            <ShieldAlert size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Cleared
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">{clearedViolations}</span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Cleared Violations</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Compliance</span>
                        <span className="font-semibold text-emerald-700">In Good Standing</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:border-slate-300 sm:p-5 ${CARD_SHADOW}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/[0.10] to-slate-500/[0.02] text-slate-600 transition-colors group-hover:from-slate-500/[0.16]">
                            <FileText size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">Franchise</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-3xl">{categoryCounts.MTOP}</span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">MTOP Payments</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Category</span>
                        <span className="font-semibold text-slate-700">Franchise Fees</span>
                    </div>
                </div>
            </div>

            {/* 3. FILTER DECK */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                    <div className="relative min-w-[220px] flex-1">
                        <Search size={16} strokeWidth={2.2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search OR number or description…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:text-sm"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => { setQuery(''); setCurrentPage(1); }}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
                        className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:w-48"
                    >
                        <option value="all">All Categories ({categoryCounts.all})</option>
                        <option value="MTOP">MTOP ({categoryCounts.MTOP})</option>
                        <option value="Violation">Violation ({categoryCounts.Violation})</option>
                        <option value="IoT">IoT ({categoryCounts.IoT})</option>
                    </select>
                </div>
            </div>

            {/* 4. DATA DISPLAY */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Receipt size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {isFiltering ? 'No transactions found' : 'No Payment History'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                        {isFiltering ? 'Try searching for a different OR number or category.' : 'You have not made any payments yet.'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <RotateCcw size={13} strokeWidth={2.2} />
                            Clear Search &amp; Filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className={`hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW} md:block`}>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Date &amp; OR Number</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Category &amp; Description</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Method</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                                        <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {paginated.map((txn, index) => (
                                        <DesktopPaymentRow key={index} txn={txn} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <PaginationFooter activePage={activePage} totalPages={totalPages} totalItems={filtered.length} onPageChange={setCurrentPage} noun="records" />
                    </div>

                    {/* Mobile cards */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map((txn, index) => (
                            <MobilePaymentCard key={index} txn={txn} />
                        ))}

                        <div className={`mt-1 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-500">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-400">({filtered.length} transactions)</span>
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button type="button" disabled={activePage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40">
                                    <ChevronLeft size={13} strokeWidth={2.5} /><span>Prev</span>
                                </button>
                                <button type="button" disabled={activePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40">
                                    <span>Next</span><ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </OperatorLayout>
    );
}

function PaginationFooter({ activePage, totalPages, totalItems, onPageChange, noun }) {
    return (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <p className="text-xs text-slate-500">
                Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                <span className="mx-2 text-slate-300">&middot;</span>
                <span className="font-semibold text-slate-700 tabular-nums">{totalItems}</span> {noun}
            </p>
            <div className="flex items-center gap-1.5">
                <button type="button" disabled={activePage <= 1} onClick={() => onPageChange(p => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40">
                    <ChevronLeft size={13} strokeWidth={2.5} /><span>Prev</span>
                </button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => totalPages <= 5 || p === 1 || p === totalPages || Math.abs(p - activePage) <= 1)
                        .map((p, idx, arr) => {
                            const prev = arr[idx - 1];
                            const hasGap = prev && p - prev > 1;
                            return (
                                <React.Fragment key={p}>
                                    {hasGap && <span className="px-0.5 text-xs text-slate-400">&hellip;</span>}
                                    <button
                                        type="button"
                                        onClick={() => onPageChange(p)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all ${
                                            activePage === p ? 'bg-[#1D2542] text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                </div>
                <button type="button" disabled={activePage >= totalPages} onClick={() => onPageChange(p => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40">
                    <span>Next</span><ChevronRight size={13} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

function PaidPill() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 shadow-2xs">
            Paid
        </span>
    );
}

function DesktopPaymentRow({ txn }) {
    return (
        <tr className="group transition-colors hover:bg-slate-50/70">
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <p className="flex items-center gap-1 text-[11px] text-slate-400"><Calendar size={11} /> {txn.date}</p>
                <p className="mt-0.5 font-mono text-[13px] font-bold text-slate-900">{txn.refNo}</p>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <div className="mb-1.5"><CategoryTag type={txn.type} /></div>
                <p className="text-[12.5px] font-semibold text-slate-800">{txn.description}</p>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <span className="text-xs font-medium text-slate-600">{txn.method}</span>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <span className="text-[13px] font-bold tabular-nums text-slate-900">₱{txn.amount.toFixed(2)}</span>
            </td>
            <td className="px-4 py-3.5 align-middle">
                <PaidPill />
            </td>
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <Link
                    href={txn.link}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-[#283256] active:scale-[0.98]"
                >
                    <span>View OR</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </td>
        </tr>
    );
}

function MobilePaymentCard({ txn }) {
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 transition-all hover:border-slate-300 ${CARD_SHADOW}`}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-sm font-bold tracking-wide text-slate-900">{txn.refNo}</span>
                <PaidPill />
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{txn.description}</p>
                    <div className="mt-1"><CategoryTag type={txn.type} /></div>
                </div>
                <div className="shrink-0 text-right">
                    <span className="text-sm font-extrabold tabular-nums text-slate-900">₱{txn.amount.toFixed(2)}</span>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{txn.method}</p>
                </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <span className="flex items-center gap-1 text-[11px] text-slate-400"><Calendar size={11} /> {txn.date}</span>
            </div>

            <div className="mt-2.5 border-t border-slate-100 pt-2">
                <Link
                    href={txn.link}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-[#283256] active:scale-[0.98]"
                >
                    <span>View OR</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </Link>
            </div>
        </div>
    );
}
