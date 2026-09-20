import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Clock, ChevronRight, ChevronLeft, Inbox, Bike,
    Search, X, RotateCcw, CheckCircle2, ShieldCheck,
    AlertTriangle, Cpu, Smartphone, Receipt, Tag,
    CheckSquare, Square, Eye, Phone, Check,
} from 'lucide-react';
import { Button, Modal, Input, StatusBadge } from '@/Components/TMO';

const ITEMS_PER_PAGE = 10;

// Shared soft, layered shadow token — same elevation language used across the TMO panel (Index.jsx,
// Dashboard.jsx, KpiCard.jsx) so this queue page reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

function getInitials(name) {
    if (!name || name === 'N/A') return 'TD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Reflects only what the backend has actually received (Tricycle::gpsStatus()) — never implies
// "Connected" just because a tracking method was selected. Mirrors FinalConfirmationDetail.jsx's
// GpsStatusBadge so both surfaces describe device connectivity identically.
function GpsStatusBadge({ status, lastSeenAt }) {
    if (status === 'connected') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Connected{lastSeenAt ? ` · last signal ${lastSeenAt}` : ''}
            </span>
        );
    }
    if (status === 'stale') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Signal lost{lastSeenAt ? ` · last seen ${lastSeenAt}` : ''}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            Awaiting first signal
        </span>
    );
}

function StatusPill({ status }) {
    if (status === 'Awaiting Final Confirmation' || status === 'awaiting_tmo_confirmation' || status === 'Pending') {
        return <StatusBadge variant="warning">Pending</StatusBadge>;
    }

    return <StatusBadge variant="success">Active</StatusBadge>;
}

export default function FinalConfirmationQueue({
    applications = [],
    searchTerm = '',
    awaitingCount = 0,
    confirmedTodayCount = 0,
    iotActiveCount = 0,
    mobileActiveCount = 0,
    todaZones = [],
}) {
    const [query, setQuery] = useState(searchTerm);
    // Defaults to only the actionable queue — an application that already finished Final
    // Confirmation is settled, not something waiting on TMO, so it shouldn't be what a TMO
    // officer sees by default when opening this page. The "Active" tab (statusFilter='completed')
    // and "All" option remain, unchanged, for reviewing what was already confirmed.
    const [statusFilter, setStatusFilter] = useState('awaiting');
    const [todaFilter, setTodaFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const [selectedApp, setSelectedApp] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Silent background refresh — a BPLO release elsewhere feeds new units into this queue, and a
    // just-confirmed application moves out of "Pending" here, without a manual reload. Does not
    // disturb an already-open confirmation modal — selectedApp is a snapshot taken at click time.
    useEffect(() => {
        const { stop } = router.poll(15000, {
            only: ['applications', 'awaitingCount', 'confirmedTodayCount', 'iotActiveCount', 'mobileActiveCount'],
        });
        return () => stop();
    }, []);

    const { data, setData, post, processing, reset } = useForm({
        signed_ticket_verified: false,
        bplo_approval_confirmed: false,
        sticker_possession_confirmed: false,
        tracking_method: 'mobile_gps',
        iot_device_id: '',
        imei: '',
        sim_number: '',
        reassign_confirmed: false,
        officer_notes: '',
    });

    // Official TODA list with counts
    const todaOptions = useMemo(() => {
        const countMap = {};
        applications.forEach(a => {
            const t = a.toda_zone || 'Unassigned';
            countMap[t] = (countMap[t] || 0) + 1;
        });

        const dbNames = (todaZones && todaZones.length > 0)
            ? todaZones.map(z => z.name)
            : ['TODA Brgy. 10', 'TODA Brgy. 4', 'TODA Brgy. 8', 'TODA Bucana'];

        const list = dbNames.map(name => ({
            name,
            count: countMap[name] || 0,
        }));

        Object.keys(countMap).forEach(name => {
            if (!dbNames.includes(name)) {
                list.push({
                    name,
                    count: countMap[name],
                });
            }
        });

        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [applications, todaZones]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applications.filter(a => {
            const matchesQuery = !q ||
                String(a.id).toLowerCase().includes(q) ||
                (a.reference && a.reference.toLowerCase().includes(q)) ||
                (a.operator_name && a.operator_name.toLowerCase().includes(q)) ||
                (a.plate_number && a.plate_number.toLowerCase().includes(q)) ||
                (a.sticker_number && a.sticker_number.toLowerCase().includes(q)) ||
                (a.toda_zone && a.toda_zone.toLowerCase().includes(q));

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'awaiting' && a.raw_status === 'awaiting_tmo_confirmation') ||
                (statusFilter === 'completed' && a.raw_status === 'completed');

            const matchesToda = todaFilter === 'all' || a.toda_zone === todaFilter;

            return matchesQuery && matchesStatus && matchesToda;
        });
    }, [applications, query, statusFilter, todaFilter]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const isFiltering = query.trim() !== '' || statusFilter !== 'all' || todaFilter !== 'all';

    const handleClearAll = () => {
        setQuery('');
        setStatusFilter('all');
        setTodaFilter('all');
        setCurrentPage(1);
    };

    const handleShowDetails = (app) => {
        setSelectedApp(app);
        const isCompleted = app.raw_status === 'completed';
        setData({
            signed_ticket_verified: isCompleted,
            bplo_approval_confirmed: isCompleted,
            sticker_possession_confirmed: isCompleted,
            tracking_method: app.tracking_method || 'mobile_gps',
            iot_device_id: app.iot_device_id || app.suggested_iot_id || '',
            imei: app.device_imei || '',
            sim_number: app.device_sim_number || '',
            reassign_confirmed: false,
            officer_notes: '',
        });
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedApp(null);
        reset();
    };

    const handleToggleAllChecks = () => {
        if (isAlreadyCompleted) return;
        const allCurrent = data.signed_ticket_verified && data.bplo_approval_confirmed && data.sticker_possession_confirmed;
        setData({
            ...data,
            signed_ticket_verified: !allCurrent,
            bplo_approval_confirmed: !allCurrent,
            sticker_possession_confirmed: !allCurrent,
        });
    };

    const handleConfirmActivation = () => {
        if (!selectedApp) return;

        if (!data.signed_ticket_verified || !data.bplo_approval_confirmed || !data.sticker_possession_confirmed) {
            Swal.fire({
                title: 'Clearance Incomplete',
                text: 'Please confirm that the payment ticket, BPLO release, and coding clearance are all verified.',
                icon: 'warning',
                confirmButtonColor: '#1D2542'
            });
            return;
        }

        if (data.tracking_method === 'iot_device' && !data.iot_device_id.trim()) {
            Swal.fire({
                title: 'IoT Serial Number Required',
                text: 'Please enter the physical IoT device serial number before completing activation.',
                icon: 'warning',
                confirmButtonColor: '#1D2542'
            });
            return;
        }

        const methodDesc = data.tracking_method === 'iot_device'
            ? `Physical IoT Hardware Tracker <b>(#${data.iot_device_id})</b>`
            : `Mobile Device (Driver Smartphone GPS)`;

        Swal.fire({
            title: 'Confirm Franchise Activation',
            html: `Are you sure you want to mark this franchise permit as <b>ACTIVATED &amp; COMPLETED</b>?<br/><br/>
                   <div style="text-align: left; background: #F8FAFC; padding: 14px 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; border: 1px solid #E2E8F0;">
                     Operator: <b>${selectedApp.operator_name}</b><br/>
                     TODA Zone: <b>${selectedApp.toda_zone}</b><br/>
                     Tricycle Unit: <b>${selectedApp.make_model} (${selectedApp.plate_number})</b><br/>
                     Coding Scheme: <b>#${selectedApp.coding_number || selectedApp.body_number} (${selectedApp.color_scheme} Scheme)</b><br/>
                     Tracking Mode: ${methodDesc}
                   </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Activate Permit',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                submitActivation();
            }
        });
    };

    const submitActivation = () => {
        post(`/tmo/final-confirmation/${selectedApp.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setModalOpen(false);
                Swal.fire({
                    title: 'Franchise Activated!',
                    text: `Permit for ${selectedApp.operator_name} is now active in the municipal registry.`,
                    icon: 'success',
                    confirmButtonColor: '#059669',
                    timer: 2500,
                    showConfirmButton: false,
                });
            },
            onError: (errors) => {
                // The backend refuses to silently move a tracker that's already paired to a
                // different tricycle — surface that as an explicit choice instead of a generic
                // validation failure.
                if (errors.iot_device_id && errors.iot_device_id.includes('already paired')) {
                    Swal.fire({
                        title: 'Tracker Already Paired Elsewhere',
                        html: errors.iot_device_id,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#D97706',
                        cancelButtonColor: '#8A96BC',
                        confirmButtonText: 'Reassign to This Tricycle',
                        cancelButtonText: 'Cancel',
                    }).then((confirmResult) => {
                        if (confirmResult.isConfirmed) {
                            // useForm's post() always submits its own (async) data state, which
                            // wouldn't yet reflect a setData() called this tick — router.post()
                            // with an explicit payload submits the override immediately instead.
                            router.post(`/tmo/final-confirmation/${selectedApp.id}`, {
                                ...data,
                                reassign_confirmed: true,
                            }, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setModalOpen(false);
                                    Swal.fire({
                                        title: 'Franchise Activated!',
                                        text: `Permit for ${selectedApp.operator_name} is now active in the municipal registry.`,
                                        icon: 'success',
                                        confirmButtonColor: '#059669',
                                        timer: 2500,
                                        showConfirmButton: false,
                                    });
                                },
                            });
                        }
                    });
                }
            },
        });
    };

    const isAlreadyCompleted = selectedApp?.raw_status === 'completed';
    const allChecksDone = data.signed_ticket_verified && data.bplo_approval_confirmed && data.sticker_possession_confirmed;

    const queueTotal = applications.length;
    const pct = (n) => queueTotal > 0 ? Math.round((n / queueTotal) * 100) : 0;

    return (
        <TrivoraLayout title="Final Confirmation & GPS Setup" role="TMO Officer">
            <Head title="Final Confirmation & GPS Setup | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with Physical Inspection)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Final Confirmation &amp; GPS Setup
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Step 5: Check the driver's payment ticket and coding number, then set up GPS tracking to activate their tricycle franchise.
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. STAT CARDS
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Card 1: Pending Confirmation */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600">
                            <Clock size={16} strokeWidth={2.2} />
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            awaitingCount > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                                : 'bg-slate-100 text-slate-600 border-slate-200/70'
                        }`}>
                            {awaitingCount > 0 && <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />}
                            {awaitingCount > 0 ? 'Needs Review' : 'All Clear'}
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {awaitingCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">{pct(awaitingCount)}% of queue</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Pending Confirmation
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Status</span>
                        <span className={`font-semibold ${awaitingCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {awaitingCount > 0 ? 'Needs Review' : 'All Clear'}
                        </span>
                    </div>
                </div>

                {/* Card 2: GPS Tracker Devices */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/[0.14] to-indigo-500/[0.02] text-indigo-600">
                            <Cpu size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Installed
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {iotActiveCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">active units</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            GPS Tracker Devices
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Mode</span>
                        <span className="font-semibold text-indigo-700">Always On</span>
                    </div>
                </div>

                {/* Card 3: Driver Smartphone GPS */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <Smartphone size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Driver App
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {mobileActiveCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">app users</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Driver Smartphone GPS
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Mode</span>
                        <span className="font-semibold text-emerald-700">Driver App</span>
                    </div>
                </div>

                {/* Card 4: Confirmed Today */}
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <CheckCircle2 size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Today
                        </span>
                    </div>

                    <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                                {confirmedTodayCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">permits activated</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            Confirmed Today
                        </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Period</span>
                        <span className="font-semibold text-slate-700">Today</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. SEARCH & FILTER DECK
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-4 rounded-2xl border border-slate-200/70 bg-white p-3 sm:p-3.5 ${CARD_SHADOW}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                    <div className="relative flex-1 min-w-[220px]">
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
                            placeholder="Search by driver, reference number, plate, or TODA…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-tmo-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-tmo-primary/10"
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

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={e => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-10 w-full sm:w-48 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer"
                        >
                            <option value="all">All Statuses ({applications.length})</option>
                            <option value="awaiting">Pending ({applications.filter(a => a.raw_status === 'awaiting_tmo_confirmation').length})</option>
                            <option value="completed">Active ({applications.filter(a => a.raw_status === 'completed').length})</option>
                        </select>

                        {/* TODA Zone Filter */}
                        <select
                            value={todaFilter}
                            onChange={e => {
                                setTodaFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-10 w-full sm:w-48 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer truncate"
                        >
                            <option value="all">All TODAs ({applications.length})</option>
                            {todaOptions.map(opt => (
                                <option key={opt.name} value={opt.name}>
                                    {opt.name} ({opt.count})
                                </option>
                            ))}
                        </select>

                        {/* Reset Filter Button */}
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                                title="Reset all filters"
                            >
                                <RotateCcw size={13} strokeWidth={2.2} className="text-slate-400" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY: TABLE WITH INTEGRATED FOOTER PAGINATION
               ══════════════════════════════════════════════════════════════ */}
            {filtered.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Inbox size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {isFiltering ? 'No results found' : 'No applications awaiting confirmation'}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No applications match your search or filters.'
                            : 'Tricycles that completed inspection and payment will appear here for final GPS setup.'}
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
                    {/* ── DESKTOP & TABLET DATA TABLE ── */}
                    <div className={`hidden md:block overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Reference No.
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Driver
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Tricycle Unit
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Coding Scheme
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
                                    {paginated.map(app => (
                                        <DesktopConfirmationRow
                                            key={app.id}
                                            app={app}
                                            onConfirm={() => handleShowDetails(app)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Integrated Table Footer: Pagination Visually Connected */}
                        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3">
                            <p className="text-xs text-slate-500">
                                Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                                <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                                <span className="mx-2 text-slate-300">·</span>
                                <span className="tabular-nums font-semibold text-slate-700">{filtered.length}</span> units
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

                    {/* ── MOBILE PURPOSE-BUILT CARDS ── */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginated.map(app => (
                            <MobileConfirmationCard
                                key={app.id}
                                app={app}
                                onConfirm={() => handleShowDetails(app)}
                            />
                        ))}

                        <div className={`mt-1 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-500">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                                <span className="ml-1 text-[11px] text-slate-400">({filtered.length} units)</span>
                            </p>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <ChevronLeft size={13} strokeWidth={2.5} />
                                    <span>Prev</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={activePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                5. TMO FIELD PROTOCOL BANNER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mt-6 flex items-start gap-4 rounded-2xl bg-slate-50 p-4 sm:p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                    <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-800">TMO Final Confirmation &amp; Tracking Protocol</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        Verify that the driver holds the official BPLO Franchise Sticker, Coding Plate, and validated Municipal Payment Ticket.
                        Select the designated tracking mode: issue an onboard IoT hardware tracker, or approve Smartphone GPS tracking (the driver will only be authorized to register in the Trivora Driver App once this franchise is officially activated).
                    </p>
                </div>
            </div>

            {/* ══════════════ SHOW DETAILS & CONFIGURATION MODAL ══════════════ */}
            {selectedApp && (
                <Modal
                    show={modalOpen}
                    onClose={handleCloseModal}
                    maxWidth="4xl"
                    title="Step 5: Final Confirmation & GPS Tracking Setup"
                    description={
                        <span className="mt-1 flex items-center gap-2">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-extrabold text-slate-800">{selectedApp.reference}</span>
                            {isAlreadyCompleted ? (
                                <StatusBadge variant="success">Active &amp; Completed</StatusBadge>
                            ) : (
                                <StatusBadge variant="warning">Awaiting Final Verification</StatusBadge>
                            )}
                        </span>
                    }
                    footer={
                        <div className="flex w-full items-center justify-between">
                            <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
                            {isAlreadyCompleted ? (
                                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-600">
                                    <CheckCircle2 size={16} />
                                    Franchise Permit Activated &amp; Active
                                </div>
                            ) : (
                                <Button
                                    variant="success"
                                    icon={processing ? undefined : ShieldCheck}
                                    loading={processing}
                                    onClick={handleConfirmActivation}
                                >
                                    Activate Franchise Permit &amp; Complete
                                </Button>
                            )}
                        </div>
                    }
                >
                    <div className="flex flex-col gap-6">

                        {/* ── STEP 1: REVIEW APPLICATION & INSPECTION ── */}
                        <StepBox num={1} title="Application & Inspection Details">
                            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <InfoPanel title="Applicant Information">
                                    <InfoRow label="Operator / Driver:" value={selectedApp.operator_name} strong />
                                    <InfoRow label="Contact Number:" value={selectedApp.contact_number} />
                                    <InfoRow label="TODA Zone:" value={selectedApp.toda_zone} accent />
                                    <InfoRow label="Barangay:" value={selectedApp.barangay || 'Nasugbu'} />
                                </InfoPanel>
                                <InfoPanel title="Tricycle Unit Specifications">
                                    <InfoRow label="Plate Number:" value={selectedApp.plate_number} mono strong />
                                    <InfoRow label="Make & Model:" value={selectedApp.make_model} />
                                    <InfoRow label="Engine Serial:" value={selectedApp.engine_number} mono />
                                    <InfoRow label="Chassis Serial:" value={selectedApp.chassis_number} mono />
                                </InfoPanel>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                <ApprovalItem title="Document Review" icon={CheckCircle2} value="Approved" sub="Documents verified" />
                                <ApprovalItem title="Physical Inspection" icon={CheckCircle2} value="Roadworthy" sub={selectedApp.inspection_date || 'Inspection cleared'} />
                                <ApprovalItem title="Coding Scheme" icon={Tag} value={`#${selectedApp.coding_number || selectedApp.body_number}`} sub={`${selectedApp.color_scheme} Scheme`} />
                            </div>
                        </StepBox>

                        {/* ── STEP 2: CONFIRM PHYSICAL CLEARANCES ── */}
                        <StepBox num={2} title="Verify Clearances & Payment">
                            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-slate-500">
                                    Cross-check the driver's payment ticket and assigned coding number before activating the franchise.
                                </p>
                                {!isAlreadyCompleted && (
                                    <button
                                        type="button"
                                        onClick={handleToggleAllChecks}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 transition hover:bg-emerald-200"
                                    >
                                        <Check size={12} strokeWidth={3} />
                                        {allChecksDone ? 'Clear Checks' : 'Check All Clearances'}
                                    </button>
                                )}
                            </div>

                            <CheckRow
                                checked={data.signed_ticket_verified}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('signed_ticket_verified', !data.signed_ticket_verified)}
                            >
                                <strong>Municipal Payment Ticket:</strong> Driver presented the stamped Payment Ticket from the Municipal Cashier (Window 2 OTC).
                            </CheckRow>

                            <CheckRow
                                checked={data.bplo_approval_confirmed}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('bplo_approval_confirmed', !data.bplo_approval_confirmed)}
                            >
                                <strong>BPLO Release:</strong> Confirmed BPLO signed off and released the Franchise Sticker/Body Number for this unit.
                            </CheckRow>

                            <CheckRow
                                checked={data.sticker_possession_confirmed}
                                disabled={isAlreadyCompleted}
                                last
                                onClick={() => setData('sticker_possession_confirmed', !data.sticker_possession_confirmed)}
                            >
                                <strong>Coding Scheme:</strong> Confirmed driver has Coding Number <strong>#{selectedApp.coding_number || selectedApp.body_number}</strong> ({selectedApp.color_scheme} Scheme).
                            </CheckRow>
                        </StepBox>

                        {/* ── STEP 3: CONFIGURE GPS TRACKING (DEVICE VS PHONE) ── */}
                        <StepBox num={3} title="GPS Setup & Tracking Method">
                            <p className="mb-3 text-xs text-slate-500">
                                Choose how this tricycle will be tracked: using a dedicated <strong>GPS Tracker Device</strong> installed on the tricycle, or using the <strong>Driver's Smartphone</strong> with the Trivora Driver App.
                            </p>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                <GpsCard
                                    icon={Cpu}
                                    name="GPS Tracker Device"
                                    badge="Installed on Tricycle"
                                    badgeTone="bg-amber-100 text-amber-800"
                                    description="A dedicated GPS tracker wired directly to the tricycle's 12V battery. Automatically updates location without needing a phone."
                                    selected={data.tracking_method === 'iot_device'}
                                    disabled={isAlreadyCompleted}
                                    onClick={() => setData('tracking_method', 'iot_device')}
                                />
                                <GpsCard
                                    icon={Smartphone}
                                    name="Driver Smartphone"
                                    badge="Driver Phone App"
                                    badgeTone="bg-indigo-100 text-indigo-800"
                                    description="The driver uses their own smartphone and the Trivora Driver App to share their location while driving."
                                    selected={data.tracking_method === 'mobile_gps'}
                                    disabled={isAlreadyCompleted}
                                    onClick={() => setData('tracking_method', 'mobile_gps')}
                                />
                            </div>

                            {/* ── OPTION A: GPS TRACKER DEVICE ── */}
                            {data.tracking_method === 'iot_device' && (
                                <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-800">
                                            <Cpu size={15} className="text-amber-600" />
                                            Tracker ID / Device ID:
                                        </label>
                                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                            Required
                                        </span>
                                    </div>

                                    <Input
                                        type="text"
                                        value={data.iot_device_id}
                                        onChange={(e) => setData('iot_device_id', e.target.value)}
                                        placeholder="e.g. TRV-GPS-1011"
                                        disabled={isAlreadyCompleted}
                                        className="mt-1 font-mono text-sm font-bold text-slate-900"
                                    />

                                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <span>Suggested ID:</span>
                                            <code className="rounded border border-amber-200 bg-white px-1.5 py-0.5 font-mono font-bold text-slate-800">
                                                {selectedApp.suggested_iot_id}
                                            </code>
                                        </div>
                                        {!isAlreadyCompleted && (
                                            <button
                                                type="button"
                                                onClick={() => setData('iot_device_id', selectedApp.suggested_iot_id)}
                                                className="inline-flex items-center gap-1 font-bold text-[#1D2542] hover:underline"
                                            >
                                                <CheckCircle2 size={13} /> Use Suggested ID
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                                                IMEI (Optional):
                                            </label>
                                            <Input
                                                type="text"
                                                value={data.imei}
                                                onChange={(e) => setData('imei', e.target.value)}
                                                placeholder="15-digit device IMEI, if known"
                                                disabled={isAlreadyCompleted}
                                                className="font-mono text-xs font-semibold text-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                                                SIM Number (Optional):
                                            </label>
                                            <Input
                                                type="text"
                                                value={data.sim_number}
                                                onChange={(e) => setData('sim_number', e.target.value)}
                                                placeholder="SIM used for 4G connectivity"
                                                disabled={isAlreadyCompleted}
                                                className="font-mono text-xs font-semibold text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-700">
                                        <span className="font-semibold">Device Status:</span>
                                        <GpsStatusBadge status={selectedApp.gps_status || 'awaiting'} lastSeenAt={selectedApp.gps_last_seen_at} />
                                    </div>
                                    {!isAlreadyCompleted && (
                                        <p className="mt-1.5 text-[10.5px] leading-relaxed text-amber-900">
                                            Pairing only registers this tracker to the tricycle — it will show <strong>Awaiting First Signal</strong> until the physical device is installed and sends its first real GPS transmission.
                                        </p>
                                    )}

                                    <div className="mt-2 rounded-md bg-amber-100/60 px-3 py-2 text-[10.5px] leading-relaxed text-amber-900">
                                        <strong>Wiring:</strong> Connect Red wire to battery (+), Black to ground (-), and Yellow to ignition key.
                                    </div>
                                </div>
                            )}

                            {/* ── OPTION B: DRIVER SMARTPHONE APP ── */}
                            {data.tracking_method === 'mobile_gps' && (
                                <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                                            <Smartphone size={18} strokeWidth={2.2} />
                                        </div>
                                        <div className="flex-1 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-extrabold text-slate-900 text-[13px]">
                                                    Driver Smartphone App
                                                </span>
                                                <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                                                    Uses Driver Phone
                                                </span>
                                            </div>
                                            <p className="mt-1 text-slate-600 leading-relaxed">
                                                The driver shares their location through the Trivora Driver App on their phone.
                                            </p>

                                            <div className="mt-3 rounded-lg border border-indigo-200/80 bg-white p-3.5 shadow-2xs">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                    App Account Activation:
                                                </div>
                                                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                                                    The driver <strong>cannot log in</strong> to the Trivora Driver App until this application is approved and activated here by TMO.
                                                </p>
                                                <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600">
                                                    Once activated, driver <strong>{selectedApp.operator_name}</strong> can log in using their registered contact number <strong className="font-mono text-slate-800">{selectedApp.contact_number}</strong> and tap <strong>"Go Online"</strong> to start driving.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Officer Notes */}
                            {!isAlreadyCompleted && (
                                <div className="mt-4">
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                        Officer Notes / Remarks (Optional):
                                    </label>
                                    <textarea
                                        rows={2}
                                        className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-tmo-primary focus:ring-1 focus:ring-tmo-primary"
                                        placeholder="Any additional notes or remarks..."
                                        value={data.officer_notes}
                                        onChange={(e) => setData('officer_notes', e.target.value)}
                                    />
                                </div>
                            )}
                        </StepBox>

                    </div>
                </Modal>
            )}
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

function DesktopConfirmationRow({ app, onConfirm }) {
    const isAwaiting = app.raw_status === 'awaiting_tmo_confirmation';
    const initials = getInitials(app.operator_name);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Reference Number */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        {app.reference}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                        {app.application_type || 'Franchise'} Unit
                    </span>
                </div>
            </td>

            {/* Column 2: Tricycle Driver */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                            {app.operator_name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                            <Phone size={10} className="text-slate-400" />
                            {app.contact_number || 'No contact'}
                        </p>
                    </div>
                </div>
            </td>

            {/* Column 3: Tricycle Unit */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <Bike size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
                        <span className="truncate text-xs sm:text-[13px] font-semibold text-slate-800">
                            {app.make_model}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Plate: <strong className="text-slate-700 font-semibold">{app.plate_number}</strong></span>
                        <span className="text-slate-300">·</span>
                        <span className="truncate font-medium text-slate-600">{app.toda_zone}</span>
                    </div>
                </div>
            </td>

            {/* Column 4: Coding Scheme */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="font-mono text-xs sm:text-[13px] font-bold tracking-wide text-slate-900">
                        #{app.coding_number || app.body_number}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: app.color_hex || '#3B82F6' }}
                        />
                        {app.color_scheme} Scheme
                    </span>
                </div>
            </td>

            {/* Column 5: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill status={app.raw_status} />
            </td>

            {/* Column 6: Action */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <button
                    type="button"
                    onClick={onConfirm}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{isAwaiting ? 'Confirm' : 'View'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </button>
            </td>
        </tr>
    );
}

function MobileConfirmationCard({ app, onConfirm }) {
    const isAwaiting = app.raw_status === 'awaiting_tmo_confirmation';
    const initials = getInitials(app.operator_name);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
            {/* Top Row: Reference & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-sm font-bold tracking-wide text-slate-900">
                    {app.reference}
                </span>
                <StatusPill status={app.raw_status} />
            </div>

            {/* Driver & TODA */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{app.operator_name}</p>
                        <p className="truncate text-[11px] text-slate-400">{app.toda_zone}</p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {app.plate_number}
                </span>
            </div>

            {/* Vehicle Info */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                <Bike size={12} className="text-slate-400" />
                <span className="truncate font-medium">{app.make_model}</span>
            </div>

            {/* Coding Scheme Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <span className="font-mono font-bold text-slate-800">
                    Coding #{app.coding_number || app.body_number}
                </span>
                <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                    <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: app.color_hex || '#3B82F6' }}
                    />
                    {app.color_scheme} Scheme
                </span>
            </div>

            {/* Action Button */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onConfirm}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1D2542] hover:bg-[#283256] text-white py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                >
                    <span>{isAwaiting ? 'Confirm' : 'View'}</span>
                    <ChevronRight size={13} strokeWidth={2.5} className="text-slate-300" />
                </button>
            </div>
        </div>
    );
}

function StepBox({ num, title, children }) {
    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 ${CARD_SHADOW}`}>
            <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#1D2542] text-[11px] font-extrabold text-white">
                    {num}
                </div>
                <div className="text-sm font-extrabold text-slate-900">{title}</div>
            </div>
            {children}
        </div>
    );
}

function InfoPanel({ title, children }) {
    return (
        <div className="rounded-xl bg-slate-50 p-3.5 text-[12.5px]">
            <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{title}</div>
            {children}
        </div>
    );
}

function InfoRow({ label, value, mono, strong, accent }) {
    return (
        <div className="flex justify-between py-0.5">
            <span className="text-slate-500">{label}</span>
            <span className={`${mono ? 'font-mono' : ''} ${strong || accent ? 'font-bold' : 'font-semibold'} ${accent ? 'text-indigo-600' : 'text-slate-800'}`}>
                {value}
            </span>
        </div>
    );
}

function ApprovalItem({ title, icon: Icon, value, sub }) {
    return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
            <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-emerald-800">{title}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-slate-900">
                <Icon size={12} className="text-emerald-700" /> {value}
            </div>
            <div className="mt-0.5 text-[10.5px] text-slate-500">{sub}</div>
        </div>
    );
}

function CheckRow({ checked, disabled, last, onClick, children }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`flex items-start gap-3 rounded-lg border-[1.5px] p-3.5 transition-colors ${last ? '' : 'mb-2.5'} ${
                disabled ? 'cursor-default opacity-70' : 'cursor-pointer'
            } ${checked ? 'border-emerald-600 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/70'}`}
        >
            <div className={`mt-0.5 shrink-0 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
                {checked ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2} />}
            </div>
            <div className="text-[12.5px] leading-relaxed text-slate-800">{children}</div>
        </div>
    );
}

function GpsCard({ icon: Icon, name, badge, badgeTone, description, selected, disabled, onClick }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`rounded-xl border-2 p-4 transition-all ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'} ${
                selected ? 'border-[#1D2542] bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
        >
            <div className="mb-2.5 flex items-center justify-between">
                <div className={`flex h-[38px] w-[38px] items-center justify-center rounded-lg transition-colors ${selected ? 'bg-[#1D2542] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon size={20} strokeWidth={2.2} />
                </div>
                {selected && <CheckCircle2 size={18} className="text-[#1D2542]" />}
            </div>
            <div className="mb-1 text-[13.5px] font-extrabold text-slate-900">{name}</div>
            {badge && (
                <span className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${badgeTone}`}>
                    {badge}
                </span>
            )}
            <div className="text-[11.5px] leading-relaxed text-slate-500">{description}</div>
        </div>
    );
}
