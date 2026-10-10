import React, { useState, useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Plus, Eye, Banknote, Calendar,
    Navigation, Users, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    Modal, Button, StatusBadge,
    EmptyState, Label, ErrorText, Input
} from '@/Components/TMO';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
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

    const getStatusVariant = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'scheduled':
                return 'info';
            case 'historical':
            default:
                return 'neutral';
        }
    };

    const minDateToday = useMemo(() => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        return `${yyyy}-${mm}-${dd}T00:00`;
    }, []);

    return (
        <TrivoraLayout title="Fare Management" role="TMO Personnel">
            <Head title="Fare Management | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. PAGE HEADER (Clean, no jargon, no eyebrow tag)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Fare Management
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Manage tricycle fare rates, view previous rates, and set new rates.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setAddModalOpen(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#182B62] hover:bg-[#25449B] px-3.5 text-xs font-semibold text-white shadow-sm transition-all self-start sm:self-center shrink-0 active:scale-[0.99] cursor-pointer"
                >
                    <Plus size={15} strokeWidth={2.2} />
                    <span>Add New Fare</span>
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. CURRENT ACTIVE FARE (With Effective Date and Time)
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-6 rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 ${CARD_SHADOW}`}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-base font-bold text-slate-900">Current Active Fare</h2>
                            <StatusBadge variant="success">Active</StatusBadge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Current rates applied to all passenger bookings and tricycle rides.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Effective since: <strong className="font-semibold text-slate-800">{currentFare.effective_datetime_label || `${currentFare.effective_date_label || 'Jan 01, 2026'} • 12:00 AM`}</strong></span>
                    </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-4 transition-all hover:bg-slate-50/80">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Base Fare</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/60 text-slate-700">
                                <Users size={14} strokeWidth={2.2} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                            ₱{Number(currentFare.base_fare || 0).toFixed(2)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">For 1 passenger</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-4 transition-all hover:bg-slate-50/80">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">2+ Passengers Rate</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/60 text-slate-700">
                                <Users size={14} strokeWidth={2.2} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                            ₱{Number(currentFare.base_fare_per_passenger || 0).toFixed(2)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">Per passenger (2 or more)</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-4 transition-all hover:bg-slate-50/80">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Included Distance</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/60 text-slate-700">
                                <Navigation size={14} strokeWidth={2.2} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                            {Number(currentFare.included_distance_km || 0).toFixed(1)} km
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">Covered by base fare</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-4 transition-all hover:bg-slate-50/80">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Additional Rate</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/60 text-slate-700">
                                <Banknote size={14} strokeWidth={2.2} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                            ₱{Number(currentFare.rate_per_km || 0).toFixed(2)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">Per extra km per passenger</p>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. FARE HISTORY TABLE (With Effective Date and Time)
               ══════════════════════════════════════════════════════════════ */}
            <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                <div className="border-b border-slate-200/80 bg-slate-50/50 px-5 py-3.5 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Fare History</h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                List of current and previous fare rates.
                            </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                            {fareHistory.length} {fareHistory.length === 1 ? 'record' : 'records'}
                        </span>
                    </div>
                </div>

                {fareHistory.length === 0 ? (
                    <div className="p-10 text-center">
                        <EmptyState
                            title="No Fare Records Found"
                            description="No fare records have been added yet."
                        />
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75">
                                        <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Effective Date &amp; Time
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Base Fare (1 Pax)
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            2+ Passengers Rate
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Included Dist.
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Additional Rate
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
                                    {paginatedHistory.map((fare) => (
                                        <tr key={fare.id} className="transition-colors hover:bg-slate-50/75">
                                            <td className="py-3.5 pl-5 pr-3 align-middle">
                                                <div className="font-semibold text-slate-900">{fare.effective_date_label}</div>
                                                <div className="text-[11px] text-slate-500 font-medium">
                                                    {fare.effective_time_label || '12:00 AM'}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 align-middle font-bold text-slate-900 tabular-nums">
                                                ₱{Number(fare.base_fare).toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-slate-700 tabular-nums">
                                                ₱{Number(fare.base_fare_per_passenger).toFixed(2)} <span className="text-xs text-slate-400">/ passenger</span>
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-slate-700 tabular-nums">
                                                {Number(fare.included_distance_km).toFixed(1)} km
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-slate-700 tabular-nums">
                                                ₱{Number(fare.rate_per_km).toFixed(2)} <span className="text-xs text-slate-400">/ km</span>
                                            </td>
                                            <td className="py-3.5 px-4 align-middle">
                                                <StatusBadge variant={getStatusVariant(fare.status)}>
                                                    {fare.status_label}
                                                </StatusBadge>
                                            </td>
                                            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenView(fare)}
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                                                >
                                                    <Eye size={13} className="text-slate-400" />
                                                    <span>View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="p-3.5 space-y-2.5 md:hidden">
                            {paginatedHistory.map((fare) => (
                                <div
                                    key={fare.id}
                                    className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-3.5 transition-all"
                                >
                                    <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{fare.effective_date_label}</div>
                                            <div className="text-[11px] text-slate-500 font-medium">
                                                {fare.effective_time_label || '12:00 AM'}
                                            </div>
                                        </div>
                                        <StatusBadge variant={getStatusVariant(fare.status)}>
                                            {fare.status_label}
                                        </StatusBadge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 py-2.5 text-xs">
                                        <div className="rounded-lg bg-white border border-slate-200/70 p-2">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Base Fare (1 Pax)</span>
                                            <span className="mt-0.5 block font-extrabold text-slate-900 text-sm tabular-nums">₱{Number(fare.base_fare).toFixed(2)}</span>
                                        </div>
                                        <div className="rounded-lg bg-white border border-slate-200/70 p-2">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">2+ Pax Rate</span>
                                            <span className="mt-0.5 block font-extrabold text-slate-900 text-sm tabular-nums">₱{Number(fare.base_fare_per_passenger).toFixed(2)}/pax</span>
                                        </div>
                                        <div className="rounded-lg bg-white border border-slate-200/70 p-2">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Dist.</span>
                                            <span className="mt-0.5 block font-bold text-slate-800 text-xs tabular-nums">{Number(fare.included_distance_km).toFixed(1)} km</span>
                                        </div>
                                        <div className="rounded-lg bg-white border border-slate-200/70 p-2">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Addtl. Rate</span>
                                            <span className="mt-0.5 block font-bold text-slate-800 text-xs tabular-nums">₱{Number(fare.rate_per_km).toFixed(2)}/km</span>
                                        </div>
                                    </div>

                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenView(fare)}
                                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            <Eye size={13} className="text-slate-400" />
                                            <span>View Details</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3 text-xs sm:flex-row">
                            <p className="text-slate-500">
                                Showing <span className="font-bold text-slate-800 tabular-nums">{startIndex + 1}</span>–
                                <span className="font-bold text-slate-800 tabular-nums">{Math.min(startIndex + PAGE_SIZE, fareHistory.length)}</span> of{' '}
                                <span className="font-bold text-slate-800 tabular-nums">{fareHistory.length}</span> records
                            </p>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
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
                                            className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${
                                                activePage === p
                                                    ? 'bg-tmo-primary text-white shadow-xs'
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
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ══════════════ ADD NEW FARE MODAL ══════════════ */}
            <Modal
                show={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add New Fare Rates"
                description="Set new tricycle fare rates. Past fare records will be kept for reference."
                maxWidth="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setAddModalOpen(false)}
                            disabled={addForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAddSubmit}
                            loading={addForm.processing}
                        >
                            Save Rates
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label required>Base Fare (1 Passenger)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="50.00"
                                value={addForm.data.base_fare}
                                onChange={(e) => addForm.setData('base_fare', e.target.value)}
                                error={addForm.errors.base_fare}
                            />
                            <ErrorText>{addForm.errors.base_fare}</ErrorText>
                            <p className="mt-1 text-[11px] text-slate-500">Base fare in PHP for 1 passenger</p>
                        </div>

                        <div>
                            <Label required>2+ Passengers Rate</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="25.00"
                                value={addForm.data.base_fare_per_passenger}
                                onChange={(e) => addForm.setData('base_fare_per_passenger', e.target.value)}
                                error={addForm.errors.base_fare_per_passenger}
                            />
                            <ErrorText>{addForm.errors.base_fare_per_passenger}</ErrorText>
                            <p className="mt-1 text-[11px] text-slate-500">Rate per passenger when 2 or more ride</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label required>Included Distance (km)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="4.00"
                                value={addForm.data.included_distance_km}
                                onChange={(e) => addForm.setData('included_distance_km', e.target.value)}
                                error={addForm.errors.included_distance_km}
                            />
                            <ErrorText>{addForm.errors.included_distance_km}</ErrorText>
                            <p className="mt-1 text-[11px] text-slate-500">Kilometers included in base fare</p>
                        </div>

                        <div>
                            <Label required>Additional Distance Rate</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="5.00"
                                value={addForm.data.rate_per_km}
                                onChange={(e) => addForm.setData('rate_per_km', e.target.value)}
                                error={addForm.errors.rate_per_km}
                            />
                            <ErrorText>{addForm.errors.rate_per_km}</ErrorText>
                            <p className="mt-1 text-[11px] text-slate-500">PHP per extra km per passenger</p>
                        </div>
                    </div>

                    {/* Effective Date & Time (Configurable / Scheduled) */}
                    <div>
                        <Label required>Effective Date &amp; Time</Label>
                        <Input
                            type="datetime-local"
                            min={minDateToday}
                            value={addForm.data.effective_date}
                            onChange={(e) => addForm.setData('effective_date', e.target.value)}
                            error={addForm.errors.effective_date}
                        />
                        <ErrorText>{addForm.errors.effective_date}</ErrorText>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Choose when these rates will take effect so passengers and drivers have advance notice.
                        </p>
                    </div>
                </form>
            </Modal>

            {/* ══════════════ VIEW FARE MODAL (Read-Only, No Recorded On, No Jargon) ══════════════ */}
            <Modal
                show={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                title="Fare Details"
                description="Details of this fare rate record."
                maxWidth="md"
                footer={
                    <Button variant="secondary" onClick={() => setViewModalOpen(false)}>
                        Close
                    </Button>
                }
            >
                {selectedFare && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                            <span className="text-xs font-semibold text-slate-500">Status</span>
                            <StatusBadge variant={getStatusVariant(selectedFare.status)}>
                                {selectedFare.status_label}
                            </StatusBadge>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Base Fare (1 Pax)
                                </span>
                                <span className="mt-1 block text-lg font-extrabold text-slate-900 tabular-nums">
                                    ₱{Number(selectedFare.base_fare).toFixed(2)}
                                </span>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    2+ Passengers Rate
                                </span>
                                <span className="mt-1 block text-lg font-extrabold text-slate-900 tabular-nums">
                                    ₱{Number(selectedFare.base_fare_per_passenger).toFixed(2)}
                                </span>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Included Distance
                                </span>
                                <span className="mt-1 block text-lg font-extrabold text-slate-900 tabular-nums">
                                    {Number(selectedFare.included_distance_km).toFixed(1)} km
                                </span>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Additional Rate
                                </span>
                                <span className="mt-1 block text-lg font-extrabold text-slate-900 tabular-nums">
                                    ₱{Number(selectedFare.rate_per_km).toFixed(2)} / km
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Effective Date &amp; Time:</span>
                                <span className="font-semibold text-slate-900">
                                    {selectedFare.effective_datetime_label || `${selectedFare.effective_date_label} • ${selectedFare.effective_time_label || '12:00 AM'}`}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Created At:</span>
                                <span className="font-semibold text-slate-900">
                                    {selectedFare.created_at_label || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Set By:</span>
                                <span className="font-semibold text-slate-900">{selectedFare.created_by}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </TrivoraLayout>
    );
}
