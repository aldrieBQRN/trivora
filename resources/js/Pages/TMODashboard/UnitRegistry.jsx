import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Bike, Phone, Search, X, ChevronRight, ChevronLeft, Download,
    RotateCcw, MapPin, Calendar, ShieldCheck, AlertTriangle,
    SlidersHorizontal, CheckCircle2, FileSpreadsheet, ArrowUpRight,
    Sparkles, Info, Shield, Layers, Hash
} from 'lucide-react';

const STATUS_FILTERS = [
    { value: 'all', label: 'All Fleet' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
];

const CODING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const CODING_SCHEDULE = {
    Monday:    { color: 'Red',    hex: '#EF4444', digits: '1, 2',  bg: '#FEF2F2', border: '#FECACA' },
    Tuesday:   { color: 'Blue',   hex: '#3B82F6', digits: '3, 4',  bg: '#EFF6FF', border: '#BFDBFE' },
    Wednesday: { color: 'Yellow', hex: '#D97706', digits: '5, 6',  bg: '#FFFBEB', border: '#FDE68A' },
    Thursday:  { color: 'Green',  hex: '#10B981', digits: '7, 8',  bg: '#ECFDF5', border: '#A7F3D0' },
    Friday:    { color: 'White',  hex: '#64748B', digits: '9, 0',  bg: '#F8FAFC', border: '#E2E8F0' },
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TricycleRegistry({ initialUnits = [] }) {
    // 25 fallback units if initialUnits is empty
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

    // Filters state
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [todaFilter, setTodaFilter] = useState('all');
    const [codingDayFilter, setCodingDayFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Today's municipal context
    const todayName = useMemo(() => {
        const dayIdx = new Date().getDay();
        return WEEKDAY_NAMES[dayIdx] || 'Monday';
    }, []);

    const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';
    const todayCodingRule = !isWeekend ? CODING_SCHEDULE[todayName] : null;

    // Dynamic TODA list
    const todaList = useMemo(() => {
        const set = new Set();
        units.forEach(u => {
            if (u.toda) set.add(u.toda);
        });
        return Array.from(set).sort();
    }, [units]);

    // Filter computation
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return units.filter(u => {
            const matchesQuery = !q || (
                (u.coding_scheme_number && String(u.coding_scheme_number).toLowerCase().includes(q)) ||
                (u.body_no && String(u.body_no).toLowerCase().includes(q)) ||
                (u.plate_no && String(u.plate_no).toLowerCase().includes(q)) ||
                (u.operator && String(u.operator).toLowerCase().includes(q)) ||
                (u.id && String(u.id).toLowerCase().includes(q)) ||
                (u.unit_code && String(u.unit_code).toLowerCase().includes(q)) ||
                (u.contact && String(u.contact).toLowerCase().includes(q)) ||
                (u.toda && String(u.toda).toLowerCase().includes(q)) ||
                (u.coding_day && String(u.coding_day).toLowerCase().includes(q)) ||
                (u.coding_color && String(u.coding_color).toLowerCase().includes(q))
            );

            const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
            const matchesToda = todaFilter === 'all' || u.toda === todaFilter;
            const matchesCoding = codingDayFilter === 'all' || (
                u.coding_day && u.coding_day.toLowerCase().includes(codingDayFilter.toLowerCase())
            );

            return matchesQuery && matchesStatus && matchesToda && matchesCoding;
        });
    }, [units, query, statusFilter, todaFilter, codingDayFilter]);

    // KPI Metrics
    const totalCount = units.length;
    const activeCount = units.filter(u => u.status === 'active').length;
    const suspendedCount = units.filter(u => u.status === 'suspended').length;
    const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
    const suspendedPct = totalCount > 0 ? 100 - activePct : 0;

    // Units restricted under today's ordinance
    const codedTodayCount = useMemo(() => {
        if (isWeekend) return 0;
        return units.filter(u => u.coding_day && u.coding_day.toLowerCase().includes(todayName.toLowerCase())).length;
    }, [units, todayName, isWeekend]);

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || todaFilter !== 'all' || codingDayFilter !== 'all';

    const handleResetFilters = () => {
        setQuery('');
        setStatusFilter('all');
        setTodaFilter('all');
        setCodingDayFilter('all');
        setCurrentPage(1);
    };

    // Export CSV
    const handleExport = () => {
        const exportList = filtered.length > 0 ? filtered : units;
        const csvHeaders = ['Tricycle ID', 'Body / Sticker No', 'Plate Number', 'Operator', 'Contact', 'TODA Zone', 'Coding Scheme Color', 'Coding Day', 'Compliance Status'];
        const csvRows = exportList.map(u => [
            u.unit_code || `TRV-${String(u.id).padStart(3, '0')}`,
            u.coding_scheme_number || u.body_no || u.sticker_no,
            u.plate_no,
            u.operator,
            u.contact || 'N/A',
            u.toda,
            u.coding_color || 'N/A',
            u.coding_day || 'N/A',
            u.status ? u.status.toUpperCase() : 'UNKNOWN'
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Trivora_Municipal_Tricycle_Registry_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <TrivoraLayout title="Active Tricycle Registry" role="TMO Officer">
            <Head title="Active Tricycle Registry | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. EXECUTIVE OPERATIONS HEADER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Active Tricycle Registry
                    </h1>
                    <p className="mt-0.5 text-xs sm:text-[13px] text-slate-500 max-w-2xl leading-relaxed">
                        Compliance ledger of franchised tricycles and designated color coding in Nasugbu.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                            <RotateCcw size={13} strokeWidth={2.2} />
                            <span>Reset View</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.99]"
                    >
                        <Download size={14} strokeWidth={2.2} className="text-slate-500" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. RESPONSIVE OPERATIONAL STAT DECK
                   (High-density desktop, ultra-compact tablet & mobile)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-12">
                {/* ─ Primary Anchor: Fleet Volume & Operational Breakdown ─ */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm md:col-span-12 xl:col-span-6">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tmo-primary text-white shadow-sm">
                                <Bike size={20} strokeWidth={2.2} />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                        {totalCount}
                                    </span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Total Units
                                    </span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-500">
                                    Franchised Fleet
                                </p>
                            </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {activePct}% Road-Ready
                        </span>
                    </div>

                    {/* Proportional Segmented Meter */}
                    <div className="pt-3">
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 ring-1 ring-slate-200/60">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${activePct}%` }}
                            />
                            <div
                                className="h-full rounded-full bg-amber-500 transition-all duration-500 ml-0.5"
                                style={{ width: `${suspendedPct}%` }}
                            />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-bold text-slate-900 tabular-nums">{activeCount}</span>
                                <span className="text-slate-600">Active</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                <span className="font-bold text-slate-900 tabular-nums">{suspendedCount}</span>
                                <span className="text-slate-600">Suspended</span>
                            </div>

                            <span className="text-[11px] text-slate-400 font-medium">
                                Compliance: <strong className="text-slate-700">{activePct}%</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─ Secondary Metric: Today's Color Coding Compliance ─ */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm md:col-span-6 xl:col-span-3">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Ordinance Enforcement
                            </span>
                            <Calendar size={14} className="text-slate-400" />
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-base sm:text-lg font-extrabold text-slate-900">{todayName}</span>
                            {!isWeekend && todayCodingRule && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-slate-800"
                                    style={{ backgroundColor: todayCodingRule.bg, borderColor: todayCodingRule.border, borderWidth: 1 }}
                                >
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: todayCodingRule.hex }} />
                                    {todayCodingRule.color}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {!isWeekend && todayCodingRule ? (
                                <>Restricted digits: <strong className="text-slate-800">{todayCodingRule.digits}</strong></>
                            ) : (
                                <>Weekend rule: All schemes operating</>
                            )}
                        </p>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 p-2 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">Restricted Today:</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                            {codedTodayCount} units
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({totalCount > 0 ? Math.round((codedTodayCount / totalCount) * 100) : 0}%)
                            </span>
                        </span>
                    </div>
                </div>

                {/* ─ Tertiary Metric: Route & TODA Coverage ─ */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm md:col-span-6 xl:col-span-3">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Franchise Zones
                            </span>
                            <MapPin size={14} className="text-slate-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {todaList.length}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Active TODAs
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Franchise zones registered
                        </p>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 p-2 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">LGU District:</span>
                        <span className="text-xs font-bold text-slate-800">Nasugbu Central</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. INTEGRATED COMMAND & FILTER TOOLBAR (RESPONSIVE)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-sm">
                <div className="flex flex-col gap-2.5">
                    {/* Top Row: Search Input */}
                    <div className="relative w-full">
                        <Search
                            size={16}
                            strokeWidth={2.2}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={e => {
                                setQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search plate, operator, or TODA…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-tmo-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-tmo-primary/10"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setCurrentPage(1);
                                }}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    {/* Bottom Row: Status Switcher & Dropdown Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
                        {/* Status Switcher (Full width on mobile, auto on desktop) */}
                        <div className="grid grid-cols-3 sm:inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
                            {STATUS_FILTERS.map(opt => {
                                const count = opt.value === 'all'
                                    ? totalCount
                                    : opt.value === 'active'
                                        ? activeCount
                                        : suspendedCount;
                                const isSelected = statusFilter === opt.value;

                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            setStatusFilter(opt.value);
                                            setCurrentPage(1);
                                        }}
                                        className={`flex items-center justify-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all ${
                                            isSelected
                                                ? 'bg-white text-slate-900 shadow-sm font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-bold ${
                                            isSelected
                                                ? 'bg-tmo-primary text-white'
                                                : 'bg-slate-200/80 text-slate-600'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Dropdown Filters (2 Columns on mobile, inline on desktop) */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                            {/* TODA Dropdown */}
                            <select
                                value={todaFilter}
                                onChange={e => {
                                    setTodaFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 truncate"
                            >
                                <option value="all">All TODAs ({todaList.length})</option>
                                {todaList.map(toda => (
                                    <option key={toda} value={toda}>{toda}</option>
                                ))}
                            </select>

                            {/* Coding Day Dropdown */}
                            <select
                                value={codingDayFilter}
                                onChange={e => {
                                    setCodingDayFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 truncate"
                            >
                                <option value="all">All Coding Days</option>
                                {CODING_DAYS.map(day => (
                                    <option key={day} value={day}>{day} ({CODING_SCHEDULE[day]?.color})</option>
                                ))}
                            </select>

                            {/* Density Rows Per Page */}
                            <div className="hidden xl:flex items-center gap-1 pl-1 text-xs text-slate-500 font-medium">
                                <span className="text-slate-400">Rows:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={e => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-bar: Active Filter Chips & Match Count */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-800">
                            {filtered.length} {filtered.length === 1 ? 'unit' : 'units'}
                        </span>
                        <span>matching criteria</span>
                        {isFiltering && (
                            <>
                                <span className="text-slate-300 font-bold">·</span>
                                {query && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                                        "{query}"
                                        <button onClick={() => setQuery('')} className="hover:text-rose-600"><X size={10} /></button>
                                    </span>
                                )}
                                {statusFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800 capitalize">
                                        {statusFilter}
                                        <button onClick={() => setStatusFilter('all')} className="hover:text-rose-600"><X size={10} /></button>
                                    </span>
                                )}
                                {todaFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                                        {todaFilter}
                                        <button onClick={() => setTodaFilter('all')} className="hover:text-rose-600"><X size={10} /></button>
                                    </span>
                                )}
                                {codingDayFilter !== 'all' && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                                        {codingDayFilter}
                                        <button onClick={() => setCodingDayFilter('all')} className="hover:text-rose-600"><X size={10} /></button>
                                    </span>
                                )}
                                <button
                                    onClick={handleResetFilters}
                                    className="ml-1 text-[11px] font-bold text-tmo-primary hover:underline"
                                >
                                    Reset
                                </button>
                            </>
                        )}
                    </div>

                    <div className="text-[11px] text-slate-400 tabular-nums self-end sm:self-center">
                        Showing {filtered.length > 0 ? startIndex + 1 : 0}–{endIndex} of {filtered.length} units
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY: DESKTOP/TABLET TABLE + MOBILE CARD SYSTEM
               ══════════════════════════════════════════════════════════════ */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200/90 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Bike size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {isFiltering ? 'No matching tricycles found' : 'Registry is currently empty'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No records match your selected search or filters. Try adjusting your query or resetting all filters.'
                            : 'No tricycle records are currently registered in the database.'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                            <RotateCcw size={12} strokeWidth={2.2} />
                            <span>Clear all filters</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── DESKTOP & TABLET DATA TABLE (md: 768px and up) ── */}
                    <div className="hidden xl:block overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Operator &amp; Contact
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            TODA Route
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Color Coding Scheme
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Status
                                        </th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {paginated.map(unit => (
                                        <DesktopTableRow
                                            key={unit.id}
                                            unit={unit}
                                            todayName={todayName}
                                            isWeekend={isWeekend}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── MOBILE PURPOSE-BUILT CARDS (< md: 768px) ── */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:hidden">
                        {paginated.map(unit => (
                            <MobileUnitCard
                                key={unit.id}
                                unit={unit}
                                todayName={todayName}
                                isWeekend={isWeekend}
                            />
                        ))}
                    </div>

                    {/* ── PAGINATION CONTROLS ── */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Page</span>
                            <span className="font-bold text-slate-800 tabular-nums">{activePage}</span>
                            <span>of</span>
                            <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                            <span className="text-slate-300 font-bold">·</span>
                            <span className="tabular-nums">({filtered.length} units total)</span>
                        </div>

                        <div className="flex items-center gap-1.5 self-center sm:self-auto">
                            <button
                                type="button"
                                disabled={activePage <= 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                <ChevronLeft size={13} strokeWidth={2.5} />
                                <span>Prev</span>
                            </button>

                            {/* Numeric page pills */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => {
                                        if (totalPages <= 5) return true;
                                        if (p === 1 || p === totalPages) return true;
                                        return Math.abs(p - activePage) <= 1;
                                    })
                                    .map((p, idx, arr) => {
                                        const prev = arr[idx - 1];
                                        const hasGap = prev && p - prev > 1;

                                        return (
                                            <React.Fragment key={p}>
                                                {hasGap && (
                                                    <span className="px-0.5 text-xs text-slate-400">…</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all ${
                                                        activePage === p
                                                            ? 'bg-tmo-primary text-white shadow-sm'
                                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                            </div>

                            <button
                                type="button"
                                disabled={activePage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                <span>Next</span>
                                <ChevronRight size={13} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

function getInitials(name) {
    if (!name || name === 'N/A') return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusPill({ status }) {
    const isActive = status === 'active';
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm transition-colors ${
                isActive
                    ? 'border border-emerald-200/90 bg-emerald-50 text-emerald-700'
                    : 'border border-amber-200/90 bg-amber-50 text-amber-800'
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isActive ? 'Active' : 'Suspended'}
        </span>
    );
}

function DesktopTableRow({ unit, todayName, isWeekend }) {
    const unitCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;
    const bodyNumber = unit.coding_scheme_number || unit.body_no || unit.sticker_no;
    const isCodedToday = !isWeekend && unit.coding_day && unit.coding_day.toLowerCase().includes(todayName.toLowerCase());
    const initials = getInitials(unit.operator);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Tricycle Unit Credentials */}
            <td className="py-3 pl-5 pr-3 align-middle">
                <div className="flex items-center gap-2.5">
                    {/* Official License Plate */}
                    <div className="inline-flex items-center rounded-md border border-slate-300/80 bg-slate-100/90 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-slate-900 shadow-sm">
                        {unit.plate_no}
                    </div>

                    {/* Body Number & Unit Code */}
                    <div className="flex flex-col">
                        <span className="font-mono text-xs font-extrabold text-slate-800">
                            #{bodyNumber}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                            {unitCode}
                        </span>
                    </div>
                </div>
            </td>

            {/* Column 2: Operator & Contact */}
            <td className="py-3 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                            {unit.operator}
                        </p>
                        {unit.contact && unit.contact !== 'N/A' ? (
                            <a
                                href={`tel:${unit.contact}`}
                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                            >
                                <Phone size={10} strokeWidth={2.2} className="text-slate-400" />
                                {unit.contact}
                            </a>
                        ) : (
                            <span className="text-[11px] text-slate-400">No contact provided</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Column 3: TODA Franchise Route */}
            <td className="py-3 px-4 align-middle">
                <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        unit.toda === 'Unassigned'
                            ? 'border border-amber-200/70 bg-amber-50 text-amber-700'
                            : 'border border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                >
                    <MapPin size={11} className={unit.toda === 'Unassigned' ? 'text-amber-500' : 'text-slate-400'} />
                    {unit.toda}
                </span>
            </td>

            {/* Column 4: Color Coding Scheme */}
            <td className="py-3 px-4 align-middle">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                            style={{ backgroundColor: unit.coding_hex || '#4F5BCB' }}
                        />
                        <span className="font-semibold text-slate-900">{unit.coding_color}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">{unit.coding_day}</span>
                    </div>

                    {isCodedToday && (
                        <span className="inline-flex items-center rounded bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                            Coded Today
                        </span>
                    )}
                </div>
            </td>

            {/* Column 5: Compliance Status */}
            <td className="py-3 px-4 align-middle">
                <StatusPill status={unit.status} />
            </td>

            {/* Column 6: Actions */}
            <td className="py-3 pl-3 pr-5 text-right align-middle">
                <Link
                    href={route('tricycle.details', unit.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 group-hover:border-slate-300"
                >
                    <span>Profile</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </Link>
            </td>
        </tr>
    );
}

function MobileUnitCard({ unit, todayName, isWeekend }) {
    const unitCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;
    const bodyNumber = unit.coding_scheme_number || unit.body_no || unit.sticker_no;
    const isCodedToday = !isWeekend && unit.coding_day && unit.coding_day.toLowerCase().includes(todayName.toLowerCase());
    const initials = getInitials(unit.operator);

    return (
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300">
            {/* Top Row: Vehicle Credentials & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-md border border-slate-300/80 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-slate-900 shadow-sm">
                        {unit.plate_no}
                    </div>
                    <span className="font-mono text-xs font-extrabold text-slate-800">#{bodyNumber}</span>
                    <span className="font-mono text-[10px] text-slate-400">({unitCode})</span>
                </div>

                <StatusPill status={unit.status} />
            </div>

            {/* Operator Information */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{unit.operator}</p>
                        <p className="text-[10px] text-slate-400">Franchise Operator</p>
                    </div>
                </div>

                {unit.contact && unit.contact !== 'N/A' && (
                    <a
                        href={`tel:${unit.contact}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                    >
                        <Phone size={10} strokeWidth={2.2} className="text-slate-400" />
                        <span>{unit.contact}</span>
                    </a>
                )}
            </div>

            {/* Route & Color Coding Metadata Badges */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2.5 text-xs">
                <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                        unit.toda === 'Unassigned'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                >
                    <MapPin size={10} className={unit.toda === 'Unassigned' ? 'text-amber-500' : 'text-slate-400'} />
                    <span className="truncate">{unit.toda}</span>
                </span>

                <div className="flex items-center gap-1.5">
                    <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: unit.coding_hex || '#4F5BCB' }}
                    />
                    <span className="text-[11px] font-bold text-slate-800">{unit.coding_color}</span>
                    <span className="text-slate-400 text-[10px]">({unit.coding_day.slice(0, 3)})</span>
                    {isCodedToday && (
                        <span className="rounded bg-rose-50 border border-rose-200 px-1 text-[9px] font-bold uppercase text-rose-700">
                            Coded
                        </span>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                    href={route('tricycle.details', unit.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-100 active:bg-slate-200"
                >
                    <span>View Profile</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-400" />
                </Link>
            </div>
        </div>
    );
}
