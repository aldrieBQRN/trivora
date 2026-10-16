import React, { useState, useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Plus, Eye, Banknote, Calendar,
    Navigation, Users, ChevronLeft, ChevronRight,
    Calculator, Clock, ShieldCheck, AlertCircle,
    Loader2, CheckCircle2, Info, ArrowUpRight
} from 'lucide-react';
import { Modal, EmptyState } from '@/Components/TMO';

const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';
const PAGE_SIZE = 5;

export default function FareManagement({ currentFare = {}, fareHistory = [] }) {
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedFare, setSelectedFare] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Form for Adding New Fare Rates
    const addForm = useForm({
        base_fare: '',
        base_fare_per_passenger: '',
        included_distance_km: '',
        rate_per_km: '',
        effective_date: '',
    });

    // Background refresh pause guards
    useBackgroundRefresh(['currentFare', 'fareHistory'], {
        paused: addModalOpen || viewModalOpen || addForm.processing,
    });

    // Pagination calculations
    const totalPages = Math.ceil(fareHistory.length / PAGE_SIZE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * PAGE_SIZE;
    const paginatedHistory = useMemo(() => {
        return fareHistory.slice(startIndex, startIndex + PAGE_SIZE);
    }, [fareHistory, startIndex]);

    // Open Read-Only View Modal
    const handleOpenView = (fare) => {
        setSelectedFare(fare);
        setViewModalOpen(true);
    };

    // Open Add Modal
    const handleOpenAdd = () => {
        addForm.reset();
        addForm.clearErrors();
        setAddModalOpen(true);
    };

    // Submit Add New Fare
    const handleAddSubmit = (e) => {
        e.preventDefault();
        addForm.post(route('tmo.fares.store'), {
            onSuccess: () => {
                setAddModalOpen(false);
                addForm.reset();
                setCurrentPage(1);
                Swal.fire({
                    title: 'New Rates Saved',
                    text: 'New fare rates have been saved and scheduled.',
                    icon: 'success',
                    confirmButtonColor: '#182B62',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    const minDateToday = useMemo(() => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const min = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }, []);

    // Live Simulator values for Add Modal
    const simulatedTariff = useMemo(() => {
        const base = parseFloat(addForm.data.base_fare) || 0;
        const paxRate = parseFloat(addForm.data.base_fare_per_passenger) || 0;
        const incDist = parseFloat(addForm.data.included_distance_km) || 0;
        const perKm = parseFloat(addForm.data.rate_per_km) || 0;

        const soloWithin = base;
        const soloExtra2km = base + (2 * perKm);
        const groupExtra2km = (2 * paxRate) + (2 * 2 * perKm);

        return {
            base,
            paxRate,
            incDist,
            perKm,
            soloWithin: soloWithin.toFixed(2),
            soloExtra2km: soloExtra2km.toFixed(2),
            groupExtra2km: groupExtra2km.toFixed(2),
        };
    }, [
        addForm.data.base_fare,
        addForm.data.base_fare_per_passenger,
        addForm.data.included_distance_km,
        addForm.data.rate_per_km,
    ]);

    return (
        <TrivoraLayout title="Fare Management" role="TMO Personnel">
            <Head title="Fare Management | TRIVORA" />

            <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                {/* ══════════════════════════════════════════════════════════════
                    1. CLEAN HEADER (Consistent with other TMO modules)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Fare Management
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                            Manage municipal tricycle fare rates, schedule adjustments, and review historical tariff schedules.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] self-start sm:self-center shrink-0 cursor-pointer"
                    >
                        <Plus size={15} strokeWidth={2.2} />
                        <span>Add Fare Rate</span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. CURRENT ACTIVE FARE SECTION
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6">
                    {/* Section Header */}
                    <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">Current Active Fare</h2>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm self-start sm:self-auto">
                            <Calendar size={13} className="text-[#182B62]" />
                            <span>
                                Effective since: <strong className="font-bold text-slate-900">{currentFare.effective_datetime_label || `${currentFare.effective_date_label || 'Jan 01, 2026'} • 12:00 AM`}</strong>
                            </span>
                        </div>
                    </div>

                    {/* 4 Compact Operational KPI Cards (1 card per row on mobile < 640px) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch mb-3.5">
                        {/* Card 1: Base Fare (1 Passenger) */}
                        <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                            <div>
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                    <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                        Base Fare (1 Pax)
                                    </span>
                                    <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                        <Users size={15} strokeWidth={2.2} />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                    <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                        ₱{Number(currentFare.base_fare || 0).toFixed(2)}
                                    </span>
                                    <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                        PHP
                                    </span>
                                </div>
                                <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                    Standard rate for 1 passenger
                                </p>
                            </div>

                            <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                                <span className="font-semibold text-slate-500 shrink-0">Coverage:</span>
                                <span className="font-bold text-slate-800 shrink-0">
                                    First {Number(currentFare.included_distance_km || 0).toFixed(1)} km
                                </span>
                            </div>
                        </div>

                        {/* Card 2: 2+ Passengers Rate */}
                        <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                            <div>
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                    <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                        2+ Passengers Rate
                                    </span>
                                    <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                                        <Users size={15} strokeWidth={2.2} />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                    <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                        ₱{Number(currentFare.base_fare_per_passenger || 0).toFixed(2)}
                                    </span>
                                    <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                        / Passenger
                                    </span>
                                </div>
                                <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                    Rate per passenger for group rides
                                </p>
                            </div>

                            <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                                <span className="font-semibold text-slate-500 shrink-0">Group Booking:</span>
                                <span className="font-bold text-slate-800 shrink-0">
                                    2 or More Pax
                                </span>
                            </div>
                        </div>

                        {/* Card 3: Included Distance */}
                        <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                            <div>
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                    <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                        Included Distance
                                    </span>
                                    <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                                        <Navigation size={15} strokeWidth={2.2} />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                    <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                        {Number(currentFare.included_distance_km || 0).toFixed(1)}
                                    </span>
                                    <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                        Kilometers
                                    </span>
                                </div>
                                <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                    Distance covered by base fare
                                </p>
                            </div>

                            <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                                <span className="font-semibold text-slate-500 shrink-0">Allowance:</span>
                                <span className="font-bold text-slate-800 shrink-0">
                                    No Extra Charge
                                </span>
                            </div>
                        </div>

                        {/* Card 4: Additional Distance Rate */}
                        <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                            <div>
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                    <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                        Additional Rate
                                    </span>
                                    <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                        <Banknote size={15} strokeWidth={2.2} />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                    <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                        ₱{Number(currentFare.rate_per_km || 0).toFixed(2)}
                                    </span>
                                    <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                        / Extra KM
                                    </span>
                                </div>
                                <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                    Surcharge per excess km per passenger
                                </p>
                            </div>

                            <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                                <span className="font-semibold text-slate-500 shrink-0">Excess Distance:</span>
                                <span className="font-bold text-slate-800 shrink-0">
                                    Beyond {Number(currentFare.included_distance_km || 0).toFixed(1)} km
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. FARE HISTORY TABLE & MOBILE CARDS DECK
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                    {/* Header bar */}
                    <div className="border-b border-slate-200/80 bg-slate-50/50 px-5 py-4 sm:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-slate-900">Fare Rate History</h2>
                                <p className="mt-0.5 text-xs text-slate-600">
                                    Complete record of municipal tricycle fare schedules, revisions, and status.
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-100 border border-slate-200/60 px-3 py-1 text-xs font-bold text-slate-700 tabular-nums shrink-0">
                                {fareHistory.length} {fareHistory.length === 1 ? 'record' : 'records'}
                            </span>
                        </div>
                    </div>

                    {fareHistory.length === 0 ? (
                        <div className="p-12 text-center">
                            <EmptyState
                                title="No Fare Records Found"
                                description="No fare records have been added yet."
                            />
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/75">
                                            <th scope="col" className="py-3.5 pl-6 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                Effective Schedule
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                Base Fare (1 Pax)
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                2+ Passengers Rate
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                Included Dist.
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                Additional Rate
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                Status
                                            </th>
                                            <th scope="col" className="py-3.5 pl-3 pr-6 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {paginatedHistory.map((fare) => (
                                            <tr key={fare.id} className="transition-colors hover:bg-slate-50/75">
                                                <td className="py-3.5 pl-6 pr-3 align-middle">
                                                    <div className="font-bold text-slate-900">{fare.effective_date_label}</div>
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium mt-0.5">
                                                        <Clock size={11} className="text-slate-500" />
                                                        <span>{fare.effective_time_label || '12:00 AM'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 align-middle font-black text-slate-900 tabular-nums">
                                                    ₱{Number(fare.base_fare).toFixed(2)}
                                                </td>
                                                <td className="py-3.5 px-4 align-middle font-bold text-slate-800 tabular-nums">
                                                    ₱{Number(fare.base_fare_per_passenger).toFixed(2)} <span className="text-xs font-normal text-slate-500">/ pax</span>
                                                </td>
                                                <td className="py-3.5 px-4 align-middle font-bold text-slate-800 tabular-nums">
                                                    {Number(fare.included_distance_km).toFixed(1)} km
                                                </td>
                                                <td className="py-3.5 px-4 align-middle font-bold text-slate-800 tabular-nums">
                                                    ₱{Number(fare.rate_per_km).toFixed(2)} <span className="text-xs font-normal text-slate-500">/ km</span>
                                                </td>
                                                <td className="py-3.5 px-4 align-middle">
                                                    <FareStatusPill status={fare.status} label={fare.status_label} />
                                                </td>
                                                <td className="py-3.5 pl-3 pr-6 text-right align-middle">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenView(fare)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-[#182B62] transition-all active:scale-[0.98] cursor-pointer"
                                                        aria-label="View fare details"
                                                        title="View fare details"
                                                    >
                                                        <Eye size={15} strokeWidth={2.2} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards View (< 768px) */}
                            <div className="grid grid-cols-1 gap-3 p-3.5 md:grid-cols-2 lg:hidden">
                                {paginatedHistory.map((fare) => (
                                    <div
                                        key={fare.id}
                                        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{fare.effective_date_label}</div>
                                                <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium mt-0.5">
                                                    <Clock size={11} className="text-slate-500" />
                                                    <span>{fare.effective_time_label || '12:00 AM'}</span>
                                                </div>
                                            </div>
                                            <FareStatusPill status={fare.status} label={fare.status_label} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-2.5">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Base Fare (1 Pax)</span>
                                                <span className="mt-0.5 block font-black text-slate-900 text-sm tabular-nums">₱{Number(fare.base_fare).toFixed(2)}</span>
                                            </div>
                                            <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-2.5">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">2+ Pax Rate</span>
                                                <span className="mt-0.5 block font-black text-slate-900 text-sm tabular-nums">₱{Number(fare.base_fare_per_passenger).toFixed(2)} <span className="text-[10px] font-normal text-slate-500">/pax</span></span>
                                            </div>
                                            <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-2.5">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Included Dist.</span>
                                                <span className="mt-0.5 block font-bold text-slate-800 text-xs tabular-nums">{Number(fare.included_distance_km).toFixed(1)} km</span>
                                            </div>
                                            <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-2.5">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Addtl. Rate</span>
                                                <span className="mt-0.5 block font-bold text-slate-800 text-xs tabular-nums">₱{Number(fare.rate_per_km).toFixed(2)} <span className="text-[10px] font-normal text-slate-500">/km</span></span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenView(fare)}
                                            className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 py-2 text-slate-600 hover:text-[#182B62] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                                            aria-label="View fare details"
                                            title="View fare details"
                                        >
                                            <Eye size={15} strokeWidth={2.2} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5 text-xs sm:flex-row">
                                <p className="text-slate-600">
                                    Showing <span className="font-bold text-slate-800 tabular-nums">{startIndex + 1}</span>–
                                    <span className="font-bold text-slate-800 tabular-nums">{Math.min(startIndex + PAGE_SIZE, fareHistory.length)}</span> of{' '}
                                    <span className="font-bold text-slate-800 tabular-nums">{fareHistory.length}</span> records
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                    >
                                        <ChevronLeft size={13} strokeWidth={2.5} />
                                        <span>Prev</span>
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setCurrentPage(p)}
                                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                    activePage === p
                                                        ? 'bg-[#182B62] text-white shadow-sm'
                                                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={activePage >= totalPages}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. ADD NEW FARE MODAL (With Live Simulator & Clean Validation)
               ══════════════════════════════════════════════════════════════ */}
            <Modal
                show={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add New Fare Rates"
                description="Set and schedule new municipal tricycle fare rates. Existing rates will be preserved in history."
                maxWidth="lg"
                footer={
                    <div className="flex items-center justify-end gap-2.5 w-full">
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={addForm.processing}
                            onClick={handleAddSubmit}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-5 py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                            {addForm.processing ? <Loader2 size={14} className="animate-spin" /> : null}
                            <span>Save</span>
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-['Plus_Jakarta_Sans',sans-serif]">
                    {/* Base Fare (1 Passenger) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Base Fare (1 Passenger) <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₱</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="50.00"
                                value={addForm.data.base_fare}
                                onChange={(e) => addForm.setData('base_fare', e.target.value)}
                                className={`w-full rounded-xl border bg-slate-50/50 pl-8 pr-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                    addForm.errors.base_fare
                                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                                        : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                                }`}
                                required
                            />
                        </div>
                        {addForm.errors.base_fare ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.base_fare}
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-slate-500">Base fare in PHP for 1 passenger.</p>
                        )}
                    </div>

                    {/* 2+ Passengers Rate */}
                    <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            2+ Passengers Rate <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₱</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="25.00"
                                value={addForm.data.base_fare_per_passenger}
                                onChange={(e) => addForm.setData('base_fare_per_passenger', e.target.value)}
                                className={`w-full rounded-xl border bg-slate-50/50 pl-8 pr-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                    addForm.errors.base_fare_per_passenger
                                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                                        : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                                }`}
                                required
                            />
                        </div>
                        {addForm.errors.base_fare_per_passenger ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.base_fare_per_passenger}
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-slate-500">Per passenger when 2 or more ride.</p>
                        )}
                    </div>

                    {/* Included Distance (km) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Included Distance <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="4.0"
                                value={addForm.data.included_distance_km}
                                onChange={(e) => addForm.setData('included_distance_km', e.target.value)}
                                className={`w-full rounded-xl border bg-slate-50/50 px-3.5 pr-10 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                    addForm.errors.included_distance_km
                                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                                        : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                                }`}
                                required
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">km</span>
                        </div>
                        {addForm.errors.included_distance_km ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.included_distance_km}
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-slate-500">Kilometers included in the base fare.</p>
                        )}
                    </div>

                    {/* Additional Distance Rate */}
                    <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Additional Rate <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₱</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="5.00"
                                value={addForm.data.rate_per_km}
                                onChange={(e) => addForm.setData('rate_per_km', e.target.value)}
                                className={`w-full rounded-xl border bg-slate-50/50 pl-8 pr-12 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                    addForm.errors.rate_per_km
                                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                                        : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                                }`}
                                required
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">/km</span>
                        </div>
                        {addForm.errors.rate_per_km ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.rate_per_km}
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-slate-500">PHP per extra km per passenger.</p>
                        )}
                    </div>

                    {/* Effective Date & Time */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Effective Date &amp; Time <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            min={minDateToday}
                            value={addForm.data.effective_date}
                            onChange={(e) => addForm.setData('effective_date', e.target.value)}
                            className={`w-full rounded-xl border bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                addForm.errors.effective_date
                                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                                    : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                            }`}
                            required
                        />
                        {addForm.errors.effective_date ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.effective_date}
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-slate-500">
                                Select when these rates will officially take effect across the municipality.
                            </p>
                        )}
                    </div>

                    {/* Live Tariff Simulation Card */}
                    <div className="sm:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-[#182B62]">
                                <Calculator size={14} strokeWidth={2.2} />
                                <span>Live Tariff Preview</span>
                            </div>
                            <span className="text-[10.5px] font-semibold text-slate-600">Based on values above</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="rounded-xl bg-white border border-slate-200/70 p-2.5">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Solo Ride (Within Dist.)</span>
                                <span className="mt-0.5 block font-black text-slate-900 text-sm tabular-nums">₱{simulatedTariff.soloWithin}</span>
                                <span className="text-[10px] text-slate-600">1 pax · ≤{simulatedTariff.incDist} km</span>
                            </div>
                            <div className="rounded-xl bg-white border border-slate-200/70 p-2.5">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Solo Ride (+2 Extra KM)</span>
                                <span className="mt-0.5 block font-black text-slate-900 text-sm tabular-nums">₱{simulatedTariff.soloExtra2km}</span>
                                <span className="text-[10px] text-slate-600">1 pax · {simulatedTariff.incDist + 2} km</span>
                            </div>
                            <div className="rounded-xl bg-white border border-slate-200/70 p-2.5">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">2 Passengers (+2 Extra KM)</span>
                                <span className="mt-0.5 block font-black text-slate-900 text-sm tabular-nums">₱{simulatedTariff.groupExtra2km}</span>
                                <span className="text-[10px] text-slate-600">2 pax · {simulatedTariff.incDist + 2} km</span>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════
                5. VIEW FARE DETAILS MODAL (Read-Only Official Schedule)
               ══════════════════════════════════════════════════════════════ */}
            <Modal
                show={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                title="Fare Rate Details"
                description="Official municipal tariff schedule information."
                maxWidth="md"
                footer={
                    <div className="flex items-center justify-end w-full">
                        <button
                            type="button"
                            onClick={() => setViewModalOpen(false)}
                            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                }
            >
                {selectedFare && (
                    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
                        {/* Status Header Banner */}
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tariff Status</span>
                                <span className="text-xs font-semibold text-slate-700">Official Municipal Schedule</span>
                            </div>
                            <FareStatusPill status={selectedFare.status} label={selectedFare.status_label} />
                        </div>

                        {/* 4 Metric Highlight Cards (2x2 Grid) */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                    Base Fare (1 Pax)
                                </span>
                                <span className="mt-1 block text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                                    ₱{Number(selectedFare.base_fare).toFixed(2)}
                                </span>
                                <span className="mt-0.5 block text-[10.5px] text-slate-600 font-medium">Standard 1 passenger rate</span>
                            </div>

                            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                    2+ Passengers Rate
                                </span>
                                <span className="mt-1 block text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                                    ₱{Number(selectedFare.base_fare_per_passenger).toFixed(2)}
                                </span>
                                <span className="mt-0.5 block text-[10.5px] text-slate-600 font-medium">Per passenger for group rides</span>
                            </div>

                            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                    Included Distance
                                </span>
                                <span className="mt-1 block text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                                    {Number(selectedFare.included_distance_km).toFixed(1)} km
                                </span>
                                <span className="mt-0.5 block text-[10.5px] text-slate-600 font-medium">Included within base fare</span>
                            </div>

                            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                                    Additional Rate
                                </span>
                                <span className="mt-1 block text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                                    ₱{Number(selectedFare.rate_per_km).toFixed(2)}
                                </span>
                                <span className="mt-0.5 block text-[10.5px] text-slate-600 font-medium">Per extra km per passenger</span>
                            </div>
                        </div>

                        {/* Audit and Schedule Information Box */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-xs shadow-sm space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-medium">Effective Schedule:</span>
                                <span className="font-bold text-slate-900">
                                    {selectedFare.effective_datetime_label || `${selectedFare.effective_date_label} • ${selectedFare.effective_time_label || '12:00 AM'}`}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-medium">Configured By:</span>
                                <span className="font-bold text-slate-900">{selectedFare.created_by}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Recorded At:</span>
                                <span className="font-semibold text-slate-700">
                                    {selectedFare.created_at_label || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Formula Guidance for this tariff */}
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 text-xs flex items-start gap-2">
                            <Info size={14} className="text-[#182B62] shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                Under this tariff schedule, any distance beyond <strong className="font-bold text-slate-800">{Number(selectedFare.included_distance_km).toFixed(1)} km</strong> is billed at <strong className="font-bold text-slate-800">₱{Number(selectedFare.rate_per_km).toFixed(2)}</strong> per kilometer per passenger.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </TrivoraLayout>
    );
}

/**
 * Status Pill with proper municipal visual language (text-only, no bullets)
 */
function FareStatusPill({ status, label }) {
    if (status === 'active') {
        return (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-sm">
                <span>{label || 'Active'}</span>
            </span>
        );
    }

    if (status === 'scheduled') {
        return (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 shadow-sm">
                <span>{label || 'Scheduled'}</span>
            </span>
        );
    }

    return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            <span>{label || 'Historical'}</span>
        </span>
    );
}
