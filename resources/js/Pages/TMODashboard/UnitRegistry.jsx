import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { Bike, Phone, Search, X, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { PageHeader, EmptyState, Button } from '@/Components/TMO';

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
];

const DAY_NAMES = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday',
};

export default function TricycleRegistry({ initialUnits = [] }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Default Registry Data set (25 registered units with Tricycle Number Coding Scheme)
    const defaultUnits = [
        { id: 1,  coding_scheme_number: '0142', body_no: '0142', sticker_no: '0142', plate_no: 'AAA-1234', operator: 'Ricardo Dalisay', contact: '0917 123 4567', toda: 'TODA Bucana', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 2,  coding_scheme_number: '0089', body_no: '0089', sticker_no: '0089', plate_no: 'BBB-5678', operator: 'Cardo Santos', contact: '0918 555 1234', toda: 'TODA Brgy. 10', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 3,  coding_scheme_number: '0301', body_no: '0301', sticker_no: '0301', plate_no: 'CCC-9012', operator: 'Juan Dela Cruz', contact: '0919 888 9999', toda: 'TODA Brgy. 8', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'suspended' },
        { id: 4,  coding_scheme_number: '0012', body_no: '0012', sticker_no: '0012', plate_no: 'DDD-3456', operator: 'Maria Clara', contact: '0920 111 2222', toda: 'TODA Brgy. 4', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 5,  coding_scheme_number: '0204', body_no: '0204', sticker_no: '0204', plate_no: 'EEE-7890', operator: 'Emilio Aguinaldo', contact: '0921 333 4444', toda: 'TODA Bucana', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'active' },
        { id: 6,  coding_scheme_number: '0512', body_no: '0512', sticker_no: '0512', plate_no: 'FFF-2468', operator: 'Andres Bonifacio', contact: '0922 444 5555', toda: 'TODA Brgy. 10', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'suspended' },
        { id: 7,  coding_scheme_number: '0108', body_no: '0108', sticker_no: '0108', plate_no: 'GGG-1357', operator: 'Apolinario Mabini', contact: '0923 666 7777', toda: 'TODA Brgy. 8', coding_color: 'Green', coding_hex: '#10B981', coding_bg: 'rgba(16,185,129,.12)', coding_day: 'Thursday', status: 'active' },
        { id: 8,  coding_scheme_number: '0330', body_no: '0330', sticker_no: '0330', plate_no: 'HHH-9876', operator: 'Gabriela Silang', contact: '0924 777 8888', toda: 'TODA Brgy. 4', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 9,  coding_scheme_number: '0415', body_no: '0415', sticker_no: '0415', plate_no: 'JJJ-5432', operator: 'Melchora Aquino', contact: '0925 888 9990', toda: 'TODA Bucana', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'suspended' },
        { id: 10, coding_scheme_number: '0602', body_no: '0602', sticker_no: '0602', plate_no: 'KKK-1122', operator: 'Jose Rizal', contact: '0926 999 0011', toda: 'TODA Brgy. 10', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 11, coding_scheme_number: '0711', body_no: '0711', sticker_no: '0711', plate_no: 'LLL-3344', operator: 'Antonio Luna', contact: '0927 123 9988', toda: 'TODA Brgy. 8', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 12, coding_scheme_number: '0820', body_no: '0820', sticker_no: '0820', plate_no: 'MMM-5566', operator: 'Gregorio del Pilar', contact: '0928 234 8877', toda: 'TODA Brgy. 4', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 13, coding_scheme_number: '0935', body_no: '0935', sticker_no: '0935', plate_no: 'NNN-7788', operator: 'Marcelo H. del Pilar', contact: '0929 345 7766', toda: 'TODA Bucana', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'active' },
        { id: 14, coding_scheme_number: '0150', body_no: '0150', sticker_no: '0150', plate_no: 'PPP-9900', operator: 'Mariano Gomez', contact: '0930 456 6655', toda: 'TODA Brgy. 10', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'suspended' },
        { id: 15, coding_scheme_number: '0264', body_no: '0264', sticker_no: '0264', plate_no: 'QQQ-1230', operator: 'Jose Burgos', contact: '0931 567 5544', toda: 'TODA Brgy. 8', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'active' },
        { id: 16, coding_scheme_number: '0378', body_no: '0378', sticker_no: '0378', plate_no: 'RRR-4560', operator: 'Jacinto Zamora', contact: '0932 678 4433', toda: 'TODA Brgy. 4', coding_color: 'Green', coding_hex: '#10B981', coding_bg: 'rgba(16,185,129,.12)', coding_day: 'Thursday', status: 'active' },
        { id: 17, coding_scheme_number: '0489', body_no: '0489', sticker_no: '0489', plate_no: 'SSS-7890', operator: 'Graciano Lopez Jaena', contact: '0933 789 3322', toda: 'TODA Bucana', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 18, coding_scheme_number: '0590', body_no: '0590', sticker_no: '0590', plate_no: 'TTT-0123', operator: 'Juan Luna', contact: '0934 890 2211', toda: 'TODA Brgy. 10', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'suspended' },
        { id: 19, coding_scheme_number: '0611', body_no: '0611', sticker_no: '0611', plate_no: 'VVV-3456', operator: 'Felix Hidalgo', contact: '0935 901 1100', toda: 'TODA Brgy. 8', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 20, coding_scheme_number: '0722', body_no: '0722', sticker_no: '0722', plate_no: 'WWW-6789', operator: 'Fernando Amorsolo', contact: '0936 012 2299', toda: 'TODA Brgy. 4', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 21, coding_scheme_number: '0833', body_no: '0833', sticker_no: '0833', plate_no: 'XXX-9012', operator: 'Guillermo Tolentino', contact: '0937 123 3388', toda: 'TODA Bucana', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'active' },
        { id: 22, coding_scheme_number: '0944', body_no: '0944', sticker_no: '0944', plate_no: 'YYY-2345', operator: 'Vicente Manansala', contact: '0938 234 4477', toda: 'TODA Brgy. 10', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'suspended' },
        { id: 23, coding_scheme_number: '0055', body_no: '0055', sticker_no: '0055', plate_no: 'ZZZ-5678', operator: 'Carlos Francisco', contact: '0939 345 5566', toda: 'TODA Brgy. 8', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'active' },
        { id: 24, coding_scheme_number: '0166', body_no: '0166', sticker_no: '0166', plate_no: 'ABC-8901', operator: 'Nick Joaquin', contact: '0940 456 6677', toda: 'TODA Brgy. 4', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'active' },
        { id: 25, coding_scheme_number: '0277', body_no: '0277', sticker_no: '0277', plate_no: 'XYZ-2346', operator: 'Jose Garcia Villa', contact: '0941 567 7788', toda: 'TODA Bucana', coding_color: 'Green', coding_hex: '#10B981', coding_bg: 'rgba(16,185,129,.12)', coding_day: 'Thursday', status: 'active' },
    ];

    const units = initialUnits && initialUnits.length > 0 ? initialUnits : defaultUnits;

    // Filter Logic across all tricycle unit attributes
    const filtered = units.filter(u => {
        const q = query.trim().toLowerCase();
        const matchesQuery = !q || (
            (u.coding_scheme_number && String(u.coding_scheme_number).toLowerCase().includes(q)) ||
            (u.body_no && String(u.body_no).toLowerCase().includes(q)) ||
            (u.plate_no && String(u.plate_no).toLowerCase().includes(q)) ||
            (u.operator && String(u.operator).toLowerCase().includes(q)) ||
            (u.id && String(u.id).toLowerCase().includes(q)) ||
            (u.contact && String(u.contact).toLowerCase().includes(q)) ||
            (u.toda && String(u.toda).toLowerCase().includes(q)) ||
            (u.coding_day && String(u.coding_day).toLowerCase().includes(q))
        );
        const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    // Pagination Calculations
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const handleQueryChange = (val) => {
        setQuery(val);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (val) => {
        setStatusFilter(val);
        setCurrentPage(1);
    };

    // Export CSV Handler
    const handleExport = () => {
        const exportList = filtered.length > 0 ? filtered : units;

        const csvHeaders = ['Tricycle ID', 'Body Number', 'Plate Number', 'Operator', 'Contact', 'TODA Zone', 'Coding Day', 'Status'];
        const csvRows = exportList.map(u => [
            u.id,
            u.body_no,
            u.plate_no,
            u.operator,
            u.contact || 'N/A',
            u.toda,
            u.coding_day,
            u.status.toUpperCase()
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Trivora_Active_Tricycle_Registry_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalCount     = units.length;
    const activeCount    = units.filter(u => u.status === 'active').length;
    const suspendedCount = units.filter(u => u.status === 'suspended').length;
    const activePct      = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
    const suspendedPct   = totalCount > 0 ? 100 - activePct : 0;

    const isFiltering = query.trim() !== '' || statusFilter !== 'all';

    return (
        <TrivoraLayout title="Tricycle Registry" role="TMO Officer">
            <Head title="Tricycle Registry | TRIVORA" />

            <PageHeader
                eyebrow="Tricycle Management"
                title="Active Tricycle Registry"
                subtitle="Master record of all registered and operating tricycles in Nasugbu"
                actions={
                    <Button variant="secondary" icon={Download} onClick={handleExport}>
                        Export CSV
                    </Button>
                }
            />

            {/* ── Fleet summary ── */}
            <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-tmo-border bg-tmo-surface p-5 sm:p-6 lg:flex-row lg:items-center">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tmo-primarySoft text-tmo-primary">
                        <Bike size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[28px] font-bold leading-none tracking-tight tabular-nums text-tmo-ink">{totalCount}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-tmo-muted">Registered Units</p>
                    </div>
                </div>

                <div className="hidden h-12 w-px bg-tmo-border lg:block" />

                <div className="min-w-0 flex-1">
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        {activeCount > 0 && <div className="h-full bg-emerald-500" style={{ width: `${activePct}%` }} />}
                        {suspendedCount > 0 && <div className="h-full bg-amber-500" style={{ width: `${suspendedPct}%` }} />}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-tmo-ink">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {activeCount} Active
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-tmo-ink">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            {suspendedCount} Suspended
                        </span>
                    </div>
                </div>

                <div className="hidden h-12 w-px bg-tmo-border lg:block" />

                <div className="shrink-0">
                    <p className="text-[28px] font-bold leading-none tracking-tight tabular-nums text-tmo-ink">{activePct}%</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-tmo-muted">Fleet Active Rate</p>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                    <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tmo-subtle" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => handleQueryChange(e.target.value)}
                        placeholder="Search by plate, operator, or unit ID…"
                        className="h-11 w-full rounded-xl border border-tmo-border bg-white pl-10 pr-9 text-sm text-tmo-ink placeholder:text-tmo-subtle transition-shadow focus:border-tmo-primary focus:outline-none focus:ring-4 focus:ring-tmo-primary/10"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => handleQueryChange('')}
                            className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-tmo-subtle hover:bg-gray-100 hover:text-tmo-ink"
                        >
                            <X size={13} strokeWidth={2.5} />
                        </button>
                    )}
                </div>

                <div className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-tmo-border bg-white p-1">
                    {STATUS_FILTERS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleStatusFilterChange(opt.value)}
                            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                statusFilter === opt.value ? 'bg-tmo-primary text-white' : 'text-tmo-muted hover:text-tmo-ink'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <p className="mb-4 text-xs text-tmo-muted">
                <span className="font-semibold text-tmo-ink">{filtered.length}</span> of {totalCount} unit{totalCount === 1 ? '' : 's'}
                {isFiltering ? ' match your filters' : ' registered'}
            </p>

            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-tmo-border bg-tmo-surface">
                    <EmptyState
                        icon={Bike}
                        title={isFiltering ? 'No matching records found' : 'Registry is empty'}
                        description={isFiltering ? 'Try adjusting your search query or status filter.' : 'No registered tricycles yet.'}
                    />
                </div>
            ) : (
                <>
                    {/* ── Desktop / tablet table ── */}
                    <div className="hidden overflow-hidden rounded-2xl border border-tmo-border bg-tmo-surface md:block">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-tmo-border">
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-tmo-muted">Unit</th>
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-tmo-muted">Operator</th>
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-tmo-muted">TODA &amp; Coding</th>
                                    <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-tmo-muted">Status</th>
                                    <th className="w-12 px-4 py-3.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tmo-border">
                                {paginated.map(unit => <UnitRow key={unit.id} unit={unit} />)}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile cards ── */}
                    <div className="flex flex-col gap-3 md:hidden">
                        {paginated.map(unit => <UnitCard key={unit.id} unit={unit} />)}
                    </div>

                    {/* ── Pagination ── */}
                    {totalPages > 1 && (
                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-xs text-tmo-muted">
                                Page <span className="font-semibold text-tmo-ink">{activePage}</span> of{' '}
                                <span className="font-semibold text-tmo-ink">{totalPages}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="flex h-9 items-center gap-1.5 rounded-lg border border-tmo-border bg-white px-3 text-xs font-semibold text-tmo-ink transition-colors hover:bg-tmo-bg disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <ChevronLeft size={14} /> Previous
                                </button>
                                <button
                                    type="button"
                                    disabled={activePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="flex h-9 items-center gap-1.5 rounded-lg border border-tmo-border bg-white px-3 text-xs font-semibold text-tmo-ink transition-colors hover:bg-tmo-bg disabled:pointer-events-none disabled:opacity-40"
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </TrivoraLayout>
    );
}

function StatusDot({ status }) {
    const active = status === 'active';
    return (
        <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${active ? 'text-emerald-700' : 'text-amber-700'}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {active ? 'Active' : 'Suspended'}
        </span>
    );
}

function CodingLine({ unit }) {
    const codingHex = unit.coding_hex || '#4F5BCB';
    const dayLabel = unit.coding_day ? (DAY_NAMES[unit.coding_day.split(' ')[0]] || unit.coding_day) : 'Monday';
    return (
        <div className="flex items-center gap-1.5 text-xs text-tmo-muted">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: codingHex, boxShadow: `0 0 0 2px ${codingHex}25` }} />
            <span className="font-semibold text-tmo-ink">#{unit.coding_scheme_number || unit.body_no || unit.sticker_no}</span>
            <span>&middot; {dayLabel}</span>
        </div>
    );
}

function UnitRow({ unit }) {
    const unitIdCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;

    return (
        <tr className="group transition-colors hover:bg-tmo-bg/60">
            <td className="px-6 py-4">
                <p className="text-sm font-bold tracking-wide text-tmo-ink">{unit.plate_no}</p>
                <p className="mt-0.5 font-mono text-[11px] text-tmo-subtle">{unitIdCode}</p>
            </td>
            <td className="px-6 py-4">
                <p className="text-[13.5px] font-semibold text-tmo-ink">{unit.operator}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-tmo-muted">
                    <Phone size={11} strokeWidth={2.5} />
                    {unit.contact}
                </p>
            </td>
            <td className="px-6 py-4">
                <p className="mb-1 text-[13.5px] font-medium text-tmo-ink">{unit.toda}</p>
                <CodingLine unit={unit} />
            </td>
            <td className="px-6 py-4">
                <StatusDot status={unit.status} />
            </td>
            <td className="px-4 py-4 text-right">
                <Link
                    href={route('tricycle.details', unit.id)}
                    aria-label={`View details for ${unit.plate_no}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-tmo-subtle transition-colors group-hover:text-tmo-primary hover:bg-tmo-primarySoft"
                >
                    <ChevronRight size={16} strokeWidth={2.25} />
                </Link>
            </td>
        </tr>
    );
}

function UnitCard({ unit }) {
    const unitIdCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;

    return (
        <Link
            href={route('tricycle.details', unit.id)}
            className="block rounded-2xl border border-tmo-border bg-tmo-surface p-4 transition-colors active:bg-tmo-bg"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-base font-bold tracking-wide text-tmo-ink">{unit.plate_no}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-tmo-subtle">{unitIdCode}</p>
                </div>
                <StatusDot status={unit.status} />
            </div>

            <div className="mt-3.5 border-t border-tmo-border pt-3.5">
                <p className="text-sm font-semibold text-tmo-ink">{unit.operator}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-tmo-muted">
                    <Phone size={11} strokeWidth={2.5} />
                    {unit.contact}
                </p>
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-tmo-border pt-3.5">
                <div>
                    <p className="mb-1 text-xs font-medium text-tmo-ink">{unit.toda}</p>
                    <CodingLine unit={unit} />
                </div>
                <ChevronRight size={18} strokeWidth={2.25} className="shrink-0 text-tmo-subtle" />
            </div>
        </Link>
    );
}
