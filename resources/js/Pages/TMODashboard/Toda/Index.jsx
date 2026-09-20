import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import {
    MapPin, Search, Plus, Edit2, CheckCircle2,
    XCircle, ChevronRight, ChevronLeft, X, AlertTriangle,
    Building2, Bike, Compass, RotateCcw, Navigation,
    Inbox
} from 'lucide-react';
import { Modal, Button, Label, ErrorText, Input, Textarea } from '@/Components/TMO';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
const NASUGBU_CENTER = [14.0733, 120.6320];
const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active Only' },
    { value: 'inactive', label: 'Inactive Only' },
    { value: 'configured', label: 'Location Configured' },
    { value: 'unconfigured', label: 'Needs Location Setup' },
];

// Custom pin icon matching Live Monitoring TODA terminal marker
const terminalPinIcon = L.divIcon({
    className: 'custom-toda-marker',
    html: `
        <div class="relative flex items-center justify-center cursor-pointer" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.28));">
            <div style="
                background: #1D2542;
                color: #FFFFFF;
                width: 28px;
                height: 28px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #FFFFFF;
            ">
                <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                </div>
            </div>
        </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26]
});

// Map click handler component for Leaflet
function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// Map size invalidator for Leaflet inside modal
function MapInvalidator() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 250);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

export default function TodaIndex({ todas = [], filters = {}, stats = {}, next_code = 'TODA-05' }) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [currentPage, setCurrentPage] = useState(1);

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingToda, setEditingToda] = useState(null);

    // Form for Adding TODA (TODA Code is auto-generated)
    const addForm = useForm({
        code: next_code,
        name: '',
        barangay: '',
        terminal_name: '',
        address: '',
        latitude: '',
        longitude: '',
        president_name: '',
        contact_number: '',
        description: '',
        is_active: true,
    });

    const handleOpenAdd = () => {
        addForm.setData(prev => ({
            ...prev,
            code: next_code,
        }));
        setAddModalOpen(true);
    };

    // Form for Editing TODA
    const editForm = useForm({
        name: '',
        code: '',
        barangay: '',
        terminal_name: '',
        address: '',
        latitude: '',
        longitude: '',
        president_name: '',
        contact_number: '',
        description: '',
        is_active: true,
    });

    // Filter todas locally for instant responsiveness
    const filteredTodas = useMemo(() => {
        return todas.filter(t => {
            const matchesSearch = searchQuery.trim() === '' || (
                (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.barangay || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.terminal_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.president_name || '').toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (!matchesSearch) return false;

            if (statusFilter === 'active') return t.is_active;
            if (statusFilter === 'inactive') return !t.is_active;
            if (statusFilter === 'configured') return t.is_configured;
            if (statusFilter === 'unconfigured') return !t.is_configured;
            return true;
        });
    }, [todas, searchQuery, statusFilter]);

    const isFiltering = searchQuery.trim() !== '' || statusFilter !== 'all';

    const handleClearAll = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const handleSearchChange = (val) => {
        setSearchQuery(val);
    };

    const handleStatusFilterChange = (val) => {
        setStatusFilter(val);
    };

    // Open Edit Modal
    const handleOpenEdit = (toda) => {
        setEditingToda(toda);
        editForm.setData({
            name: toda.name || '',
            code: toda.code || '',
            barangay: toda.barangay || '',
            terminal_name: toda.terminal_name || '',
            address: toda.address || '',
            latitude: toda.latitude !== null && toda.latitude !== undefined ? toda.latitude : '',
            longitude: toda.longitude !== null && toda.longitude !== undefined ? toda.longitude : '',
            president_name: toda.president_name || '',
            contact_number: toda.contact_number || '',
            description: toda.description || '',
            is_active: toda.is_active ?? true,
        });
        setEditModalOpen(true);
    };

    // Submit Add
    const handleAddSubmit = () => {
        addForm.post('/tmo/toda', {
            preserveScroll: true,
            onSuccess: () => {
                setAddModalOpen(false);
                addForm.reset();
                Swal.fire({
                    icon: 'success',
                    title: 'TODA Created',
                    text: 'New TODA registered successfully.',
                    timer: 1800,
                    showConfirmButton: false,
                });
            },
        });
    };

    // Submit Edit
    const handleEditSubmit = () => {
        if (!editingToda) return;

        editForm.put(`/tmo/toda/${editingToda.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditModalOpen(false);
                setEditingToda(null);
                editForm.reset();
                Swal.fire({
                    icon: 'success',
                    title: 'TODA Updated',
                    text: 'TODA and location details saved successfully.',
                    timer: 1800,
                    showConfirmButton: false,
                });
            },
        });
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredTodas.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredTodas.length);
    const paginatedTodas = filteredTodas.slice(startIndex, endIndex);

    const handleToggleStatus = (toda) => {
        const action = toda.is_active ? 'deactivate' : 'activate';
        Swal.fire({
            title: `${action === 'activate' ? 'Activate' : 'Deactivate'} ${toda.name}?`,
            text: action === 'deactivate'
                ? 'Deactivating will hide its terminal marker from Live Monitoring.'
                : 'Activating will enable this TODA in the system.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: toda.is_active ? '#DC2626' : '#059669',
            cancelButtonColor: '#64748B',
            confirmButtonText: `Yes, ${action}`,
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(`/tmo/toda/${toda.id}/toggle-status`, {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Status Updated',
                            text: `${toda.name} is now ${action === 'activate' ? 'active' : 'inactive'}.`,
                            timer: 1500,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    return (
        <TrivoraLayout title="TODA Management" role="TMO Officer">
            <Head title="TODA Management | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with Staff Management)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        TODA Management
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Configure municipal TODA zones, terminal locations, leadership, and view assigned tricycles
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1D2542] hover:bg-[#283256] px-3.5 text-xs font-semibold text-white shadow-sm transition-all self-start sm:self-center shrink-0 active:scale-[0.99]"
                >
                    <Plus size={14} strokeWidth={2.2} />
                    <span>Add TODA</span>
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. FLOATING MINIMAL METRIC CARDS (Consistent with Staff Management)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Metric 1: Total TODAs */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <Building2 size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">All-Time</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.total_todas ?? todas.length}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Total TODAs</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Roster</span>
                        <span className="font-semibold text-slate-700">All Associations</span>
                    </div>
                </div>

                {/* Metric 2: Active TODAs */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <CheckCircle2 size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                            Operating
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.active_todas ?? 0}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Active Associations</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Status</span>
                        <span className="font-semibold text-emerald-700">Operational</span>
                    </div>
                </div>

                {/* Metric 3: Configured Terminal Locations */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/[0.14] to-indigo-500/[0.02] text-indigo-600">
                            <Navigation size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">Map Ready</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.configured_locations ?? 0}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Configured Terminals</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Live Map</span>
                        <span className="font-semibold text-indigo-700">Pinned Locations</span>
                    </div>
                </div>

                {/* Metric 4: Assigned Fleet */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                            <Bike size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">Fleet</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.assigned_tricycles ?? 0}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Active Tricycles</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Authorized Units</span>
                        <span className="font-semibold text-slate-700">In Service</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. SEARCH & FILTER DECK (Consistent with Staff Management / Document Review)
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search
                            size={16}
                            strokeWidth={2.2}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search by TODA name, code, barangay, terminal, or president…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-[#1D2542] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10"
                        />
                        {searchQuery && (
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
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => handleStatusFilterChange(e.target.value)}
                            className="h-10 w-full sm:w-48 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 cursor-pointer"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY: TABLE LIKE IN DOCUMENT REVIEW
               ══════════════════════════════════════════════════════════════ */}
            {filteredTodas.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Inbox size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {isFiltering ? 'No results found' : 'No TODAs registered yet'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No TODAs match your search or status filter.'
                            : 'No TODAs have been added yet. Click "Add TODA" above to register one.'}
                    </p>
                    {isFiltering && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                            <RotateCcw size={12} strokeWidth={2.2} />
                            <span>Clear all filters</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── DESKTOP & TABLET DATA TABLE (Document Review Style) ── */}
                    <div className={`hidden md:block overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            TODA &amp; Code
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Official Terminal
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Barangay
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Assigned Fleet
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
                                    {paginatedTodas.map((toda) => (
                                        <tr key={toda.id} className="group transition-colors hover:bg-slate-50/75">
                                            {/* Column 1: TODA Name & Code */}
                                            <td className="py-3.5 pl-5 pr-3 align-middle">
                                                <div className="flex flex-col">
                                                    <Link
                                                        href={`/tmo/toda/${toda.id}`}
                                                        className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-xs sm:text-[13px]"
                                                    >
                                                        {toda.name}
                                                    </Link>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="font-mono text-[11px] font-semibold text-slate-500">
                                                            {toda.code}
                                                        </span>
                                                        {toda.president_name && (
                                                            <>
                                                                <span className="text-slate-300">·</span>
                                                                <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                                                    Pres: {toda.president_name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Official Terminal */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex flex-col">
                                                    {toda.terminal_name ? (
                                                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-400 shrink-0" />
                                                            <span>{toda.terminal_name}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">
                                                            No terminal name
                                                        </span>
                                                    )}

                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        {toda.is_configured ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2 py-0.2">
                                                                <MapPin size={10} />
                                                                <span>Pinned ({toda.latitude.toFixed(4)}, {toda.longitude.toFixed(4)})</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-full px-2 py-0.2">
                                                                <AlertTriangle size={10} />
                                                                <span>Location Not Set</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 3: Barangay */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <span className="text-xs font-medium text-slate-700">
                                                    {toda.barangay}
                                                </span>
                                            </td>

                                            {/* Column 4: Assigned Fleet */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-[13px]">
                                                        {toda.tricycles_count}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">units</span>
                                                </div>
                                            </td>

                                            {/* Column 5: Status */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(toda)}
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-colors cursor-pointer ${
                                                        toda.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                    }`}
                                                    title="Click to toggle status"
                                                >
                                                    <span>{toda.is_active ? 'Active' : 'Inactive'}</span>
                                                </button>
                                            </td>

                                            {/* Column 6: Action */}
                                            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(toda)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-colors"
                                                        title="Edit TODA & Location"
                                                    >
                                                        <Edit2 size={13} strokeWidth={2.2} />
                                                    </button>

                                                    <Link
                                                        href={`/tmo/toda/${toda.id}`}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-[#1D2542] hover:bg-[#283256] text-white px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                                                        title="View TODA Details"
                                                    >
                                                        <span>Details</span>
                                                        <ChevronRight size={12} strokeWidth={2.5} className="text-slate-300" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Integrated Table Footer: Pagination Visually Connected (from Document Review) */}
                        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3">
                            <p className="text-xs text-slate-500">
                                Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                                <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                                <span className="mx-2 text-slate-300">·</span>
                                <span className="tabular-nums font-semibold text-slate-700">{filteredTodas.length}</span> TODAs
                            </p>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <ChevronLeft size={13} strokeWidth={2.5} />
                                    <span>Prev</span>
                                </button>

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
                                                                ? 'bg-[#1D2542] text-white shadow-sm'
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
                    </div>

                    {/* ── MOBILE CARD VIEW (Document Review Style) ── */}
                    <div className="md:hidden space-y-3">
                        {paginatedTodas.map((toda) => (
                            <div
                                key={toda.id}
                                className={`rounded-2xl border border-slate-200/70 bg-white p-4 ${CARD_SHADOW}`}
                            >
                                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                    <div>
                                        <Link
                                            href={`/tmo/toda/${toda.id}`}
                                            className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                                        >
                                            {toda.name}
                                        </Link>
                                        <p className="font-mono text-xs text-slate-400 mt-0.5">{toda.code}</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleToggleStatus(toda)}
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-colors ${
                                            toda.is_active
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        <span>{toda.is_active ? 'Active' : 'Inactive'}</span>
                                    </button>
                                </div>

                                <div className="py-3 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Terminal:</span>
                                        <span className="font-semibold text-slate-800">{toda.terminal_name || 'Not Configured'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Barangay:</span>
                                        <span className="font-medium text-slate-700">{toda.barangay}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Assigned Fleet:</span>
                                        <span className="font-mono font-bold text-slate-900">{toda.tricycles_count} units</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Map Pin:</span>
                                        {toda.is_configured ? (
                                            <span className="text-[10.5px] font-bold text-emerald-700">Set ({toda.latitude.toFixed(4)}, {toda.longitude.toFixed(4)})</span>
                                        ) : (
                                            <span className="text-[10.5px] font-bold text-amber-700">Needs Pin</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEdit(toda)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                                    >
                                        <Edit2 size={12} strokeWidth={2.2} />
                                        <span>Edit</span>
                                    </button>

                                    <Link
                                        href={`/tmo/toda/${toda.id}`}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#1D2542] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#283256]"
                                    >
                                        <span>Details</span>
                                        <ChevronRight size={12} strokeWidth={2.5} />
                                    </Link>
                                </div>
                            </div>
                        ))}

                        {/* Mobile pagination */}
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-slate-500">
                                Page {activePage} of {totalPages}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={activePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════ ADD TODA MODAL ══════════════ */}
            <Modal
                show={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add TODA Association"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            icon={addForm.processing ? undefined : Plus}
                            loading={addForm.processing}
                            onClick={handleAddSubmit}
                        >
                            Register TODA
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <Label>TODA Code</Label>
                        <Input
                            type="text"
                            value={addForm.data.code || next_code}
                            disabled
                            className="disabled:cursor-not-allowed disabled:bg-tmo-bg disabled:text-tmo-subtle font-mono text-xs"
                        />
                        <p className="mt-1.5 text-[11px] text-tmo-subtle">
                            System-generated unique identifier for this association.
                        </p>
                    </div>

                    <div>
                        <Label required>TODA Name</Label>
                        <Input
                            type="text"
                            value={addForm.data.name}
                            error={addForm.errors.name}
                            onChange={(e) => addForm.setData('name', e.target.value)}
                            placeholder="e.g. TODA Bucana"
                            required
                        />
                        <ErrorText>{addForm.errors.name}</ErrorText>
                    </div>

                    <div>
                        <Label required>Barangay</Label>
                        <Input
                            type="text"
                            value={addForm.data.barangay}
                            error={addForm.errors.barangay}
                            onChange={(e) => addForm.setData('barangay', e.target.value)}
                            placeholder="e.g. Bucana"
                            required
                        />
                        <ErrorText>{addForm.errors.barangay}</ErrorText>
                    </div>

                    <div>
                        <Label>Terminal / Station Name</Label>
                        <Input
                            type="text"
                            value={addForm.data.terminal_name}
                            error={addForm.errors.terminal_name}
                            onChange={(e) => addForm.setData('terminal_name', e.target.value)}
                            placeholder="e.g. Bucana Main Terminal"
                        />
                        <ErrorText>{addForm.errors.terminal_name}</ErrorText>
                    </div>

                    <div>
                        <Label>Address / Landmark</Label>
                        <Input
                            type="text"
                            value={addForm.data.address}
                            error={addForm.errors.address}
                            onChange={(e) => addForm.setData('address', e.target.value)}
                            placeholder="e.g. Near Bucana Elementary School, Nasugbu Batangas"
                        />
                        <ErrorText>{addForm.errors.address}</ErrorText>
                    </div>

                    {/* Terminal Map Location Picker */}
                    <div>
                        <Label>Terminal Map Location</Label>
                        <p className="mb-2 text-[11px] text-tmo-subtle">Click anywhere on the map or drag the pin to set the official terminal coordinates.</p>
                        <div className="relative h-56 w-full rounded-lg overflow-hidden border border-tmo-borderStrong bg-slate-100 z-0">
                            <MapContainer
                                center={NASUGBU_CENTER}
                                zoom={15}
                                scrollWheelZoom={true}
                                className="h-full w-full"
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_3qo7_1_ac41fdc9883213d666d06544"
                                    attribution='&copy; CARTO'
                                />
                                <MapInvalidator />
                                <MapClickHandler onLocationSelect={(lat, lng) => {
                                    addForm.setData(prev => ({
                                        ...prev,
                                        latitude: Number(lat.toFixed(7)),
                                        longitude: Number(lng.toFixed(7)),
                                    }));
                                }} />
                                {addForm.data.latitude && addForm.data.longitude && (
                                    <Marker
                                        position={[Number(addForm.data.latitude), Number(addForm.data.longitude)]}
                                        icon={terminalPinIcon}
                                        draggable={true}
                                        eventHandlers={{
                                            dragend: (e) => {
                                                const pos = e.target.getLatLng();
                                                addForm.setData(prev => ({
                                                    ...prev,
                                                    latitude: Number(pos.lat.toFixed(7)),
                                                    longitude: Number(pos.lng.toFixed(7)),
                                                }));
                                            }
                                        }}
                                    />
                                )}
                            </MapContainer>

                            {(!addForm.data.latitude || !addForm.data.longitude) && (
                                <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center bg-slate-900/10">
                                    <span className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md border border-slate-200">
                                        Click on the map to place the terminal pin
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-2.5 grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] normal-case tracking-normal">Latitude</Label>
                                <Input
                                    type="number"
                                    step="0.000001"
                                    value={addForm.data.latitude}
                                    onChange={(e) => addForm.setData('latitude', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="e.g. 14.0733"
                                    className="font-mono text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] normal-case tracking-normal">Longitude</Label>
                                <Input
                                    type="number"
                                    step="0.000001"
                                    value={addForm.data.longitude}
                                    onChange={(e) => addForm.setData('longitude', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="e.g. 120.6320"
                                    className="font-mono text-xs"
                                />
                            </div>
                        </div>
                        <ErrorText>{addForm.errors.latitude || addForm.errors.longitude}</ErrorText>
                    </div>

                    <div>
                        <Label>TODA President / Head</Label>
                        <Input
                            type="text"
                            value={addForm.data.president_name}
                            error={addForm.errors.president_name}
                            onChange={(e) => addForm.setData('president_name', e.target.value)}
                            placeholder="e.g. Juan Dela Cruz"
                        />
                        <ErrorText>{addForm.errors.president_name}</ErrorText>
                    </div>

                    <div>
                        <Label>Contact Number</Label>
                        <Input
                            type="text"
                            value={addForm.data.contact_number}
                            error={addForm.errors.contact_number}
                            onChange={(e) => addForm.setData('contact_number', e.target.value)}
                            placeholder="e.g. 0917 123 4567"
                        />
                        <ErrorText>{addForm.errors.contact_number}</ErrorText>
                    </div>

                    <div>
                        <Label>Notes / Description</Label>
                        <Textarea
                            rows={2}
                            value={addForm.data.description}
                            error={addForm.errors.description}
                            onChange={(e) => addForm.setData('description', e.target.value)}
                            placeholder="Additional operational details or coverage notes..."
                        />
                        <ErrorText>{addForm.errors.description}</ErrorText>
                    </div>

                    <label className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                        <input
                            type="checkbox"
                            checked={addForm.data.is_active}
                            onChange={(e) => addForm.setData('is_active', e.target.checked)}
                            className="h-4 w-4 accent-[#1D2542]"
                        />
                        Activate TODA immediately upon creation
                    </label>
                </div>
            </Modal>

            {/* ══════════════ EDIT TODA MODAL ══════════════ */}
            <Modal
                show={editModalOpen && !!editingToda}
                onClose={() => setEditModalOpen(false)}
                title="Edit TODA Association"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            icon={editForm.processing ? undefined : Edit2}
                            loading={editForm.processing}
                            onClick={handleEditSubmit}
                        >
                            Save Changes
                        </Button>
                    </>
                }
            >
                {editingToda && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <Label>TODA Code</Label>
                            <Input
                                type="text"
                                value={editingToda.code || '— not yet assigned —'}
                                disabled
                                className="disabled:cursor-not-allowed disabled:bg-tmo-bg disabled:text-tmo-subtle font-mono text-xs"
                            />
                            <p className="mt-1.5 text-[11px] text-tmo-subtle">System-generated. Cannot be changed.</p>
                        </div>

                        <div>
                            <Label required>TODA Name</Label>
                            <Input
                                type="text"
                                value={editForm.data.name}
                                error={editForm.errors.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                placeholder="e.g. TODA Bucana"
                                required
                            />
                            <ErrorText>{editForm.errors.name}</ErrorText>
                        </div>

                        <div>
                            <Label required>Barangay</Label>
                            <Input
                                type="text"
                                value={editForm.data.barangay}
                                error={editForm.errors.barangay}
                                onChange={(e) => editForm.setData('barangay', e.target.value)}
                                placeholder="e.g. Bucana"
                                required
                            />
                            <ErrorText>{editForm.errors.barangay}</ErrorText>
                        </div>

                        <div>
                            <Label>Terminal / Station Name</Label>
                            <Input
                                type="text"
                                value={editForm.data.terminal_name}
                                error={editForm.errors.terminal_name}
                                onChange={(e) => editForm.setData('terminal_name', e.target.value)}
                                placeholder="e.g. Bucana Main Terminal"
                            />
                            <ErrorText>{editForm.errors.terminal_name}</ErrorText>
                        </div>

                        <div>
                            <Label>Address / Landmark</Label>
                            <Input
                                type="text"
                                value={editForm.data.address}
                                error={editForm.errors.address}
                                onChange={(e) => editForm.setData('address', e.target.value)}
                                placeholder="e.g. Near Bucana Elementary School, Nasugbu Batangas"
                            />
                            <ErrorText>{editForm.errors.address}</ErrorText>
                        </div>

                        {/* Terminal Map Location Picker */}
                        <div>
                            <Label>Terminal Map Location</Label>
                            <p className="mb-2 text-[11px] text-tmo-subtle">Click anywhere on the map or drag the pin to set the official terminal coordinates.</p>
                            <div className="relative h-56 w-full rounded-lg overflow-hidden border border-tmo-borderStrong bg-slate-100 z-0">
                                <MapContainer
                                    center={
                                        editForm.data.latitude && editForm.data.longitude
                                            ? [Number(editForm.data.latitude), Number(editForm.data.longitude)]
                                            : NASUGBU_CENTER
                                    }
                                    zoom={15}
                                    scrollWheelZoom={true}
                                    className="h-full w-full"
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_3qo7_1_ac41fdc9883213d666d06544"
                                        attribution='&copy; CARTO'
                                    />
                                    <MapInvalidator />
                                    <MapClickHandler onLocationSelect={(lat, lng) => {
                                        editForm.setData(prev => ({
                                            ...prev,
                                            latitude: Number(lat.toFixed(7)),
                                            longitude: Number(lng.toFixed(7)),
                                        }));
                                    }} />
                                    {editForm.data.latitude && editForm.data.longitude && (
                                        <Marker
                                            position={[Number(editForm.data.latitude), Number(editForm.data.longitude)]}
                                            icon={terminalPinIcon}
                                            draggable={true}
                                            eventHandlers={{
                                                dragend: (e) => {
                                                    const pos = e.target.getLatLng();
                                                    editForm.setData(prev => ({
                                                        ...prev,
                                                        latitude: Number(pos.lat.toFixed(7)),
                                                        longitude: Number(pos.lng.toFixed(7)),
                                                    }));
                                                }
                                            }}
                                        />
                                    )}
                                </MapContainer>

                                {(!editForm.data.latitude || !editForm.data.longitude) && (
                                    <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center bg-slate-900/10">
                                        <span className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md border border-slate-200">
                                            Click on the map to place the terminal pin
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[11px] normal-case tracking-normal">Latitude</Label>
                                    <Input
                                        type="number"
                                        step="0.000001"
                                        value={editForm.data.latitude}
                                        onChange={(e) => editForm.setData('latitude', e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="e.g. 14.0733"
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] normal-case tracking-normal">Longitude</Label>
                                    <Input
                                        type="number"
                                        step="0.000001"
                                        value={editForm.data.longitude}
                                        onChange={(e) => editForm.setData('longitude', e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="e.g. 120.6320"
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <ErrorText>{editForm.errors.latitude || editForm.errors.longitude}</ErrorText>
                        </div>

                        <div>
                            <Label>TODA President / Head</Label>
                            <Input
                                type="text"
                                value={editForm.data.president_name}
                                error={editForm.errors.president_name}
                                onChange={(e) => editForm.setData('president_name', e.target.value)}
                                placeholder="e.g. Juan Dela Cruz"
                            />
                            <ErrorText>{editForm.errors.president_name}</ErrorText>
                        </div>

                        <div>
                            <Label>Contact Number</Label>
                            <Input
                                type="text"
                                value={editForm.data.contact_number}
                                error={editForm.errors.contact_number}
                                onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                placeholder="e.g. 0917 123 4567"
                            />
                            <ErrorText>{editForm.errors.contact_number}</ErrorText>
                        </div>

                        <div>
                            <Label>Notes / Description</Label>
                            <Textarea
                                rows={2}
                                value={editForm.data.description}
                                error={editForm.errors.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                placeholder="Additional operational details or coverage notes..."
                            />
                            <ErrorText>{editForm.errors.description}</ErrorText>
                        </div>

                        <label className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                            <input
                                type="checkbox"
                                checked={editForm.data.is_active}
                                onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                className="h-4 w-4 accent-[#1D2542]"
                            />
                            TODA association is active
                        </label>
                    </div>
                )}
            </Modal>
        </TrivoraLayout>
    );
}
