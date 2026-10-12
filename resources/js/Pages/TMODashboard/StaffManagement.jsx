import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Users, UserPlus, ShieldCheck, CheckCircle2, XCircle, Clock,
    Edit2, Trash2, Search, X, RotateCcw, ChevronLeft, ChevronRight,
    Phone, MapPin, CalendarDays, Mail, Lock, Loader2, AlertCircle,
} from 'lucide-react';
import { Modal } from '@/Components/TMO';

import Avatar from '@/Components/Avatar';
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Staff' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

function StatusPill({ user, onToggleStatus }) {
    const isActive = user.is_active;
    return (
        <button
            type="button"
            onClick={() => onToggleStatus(user)}
            title={user.is_current_user ? 'You cannot deactivate your own account' : 'Click to toggle status'}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                isActive
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80'
                    : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/80'
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
        </button>
    );
}

export default function StaffManagement({
    users = [],
    searchTerm = '',
    statusFilter = 'all',
    stats = { total: 0, active: 0, inactive: 0, new_this_month: 0 },
    currentUserId = null,
}) {
    const [search, setSearch] = useState(searchTerm);
    const [filter, setFilter] = useState(statusFilter);
    const [currentPage, setCurrentPage] = useState(1);

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form for Adding Staff
    const addForm = useForm({
        name: '',
        position: '',
        birthday: '',
        contact_number: '',
        address: '',
        email: '',
        password: '',
        is_active: true,
    });

    // Form for Editing Staff
    const editForm = useForm({
        name: '',
        position: '',
        birthday: '',
        contact_number: '',
        address: '',
        email: '',
        password: '',
        is_active: true,
    });

    // Background refresh
    useBackgroundRefresh(['users', 'stats'], {
        paused: addModalOpen || editModalOpen || addForm.processing || editForm.processing,
    });

    const handleSearch = (val) => {
        setSearch(val);
        setCurrentPage(1);
        router.get(
            route('tmo.users'),
            { search: val, status: filter },
            { preserveState: true, replace: true }
        );
    };

    const handleFilter = (status) => {
        setFilter(status);
        setCurrentPage(1);
        router.get(
            route('tmo.users'),
            { search, status },
            { preserveState: true, replace: true }
        );
    };

    const handleClearAll = () => {
        setSearch('');
        setFilter('all');
        setCurrentPage(1);
        router.get(route('tmo.users'), { search: '', status: 'all' }, { preserveState: true, replace: true });
    };

    // Open Edit Modal
    const handleOpenEdit = (user) => {
        setEditingUser(user);
        editForm.clearErrors();
        editForm.setData({
            name: user.name,
            position: user.position || '',
            birthday: user.birthday || '',
            contact_number: user.contact_number || '',
            address: user.address || '',
            email: user.email,
            password: '',
            is_active: user.is_active,
        });
        setEditModalOpen(true);
    };

    // Open Add Modal
    const handleOpenAdd = () => {
        addForm.reset();
        addForm.clearErrors();
        setAddModalOpen(true);
    };

    // Submit Add
    const handleAddSubmit = (e) => {
        if (e) e.preventDefault();
        addForm.post(route('tmo.users.store'), {
            onSuccess: () => {
                setAddModalOpen(false);
                addForm.reset();
                Swal.fire({
                    title: 'Account Created',
                    text: 'New TMO staff account created successfully.',
                    icon: 'success',
                    confirmButtonColor: '#182B62',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    // Submit Edit
    const handleEditSubmit = (e) => {
        if (e) e.preventDefault();
        if (!editingUser) return;

        editForm.put(route('tmo.users.update', editingUser.id), {
            onSuccess: () => {
                setEditModalOpen(false);
                setEditingUser(null);
                editForm.reset();
                Swal.fire({
                    title: 'Account Updated',
                    text: 'Staff profile updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#182B62',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    // Toggle Active Status
    const handleToggleStatus = (user) => {
        if (user.is_current_user) {
            Swal.fire({
                title: 'Action Restricted',
                text: 'You cannot deactivate your own logged-in account.',
                icon: 'warning',
                confirmButtonColor: '#182B62',
            });
            return;
        }

        const actionText = user.is_active ? 'deactivate' : 'activate';
        Swal.fire({
            title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Staff Account?`,
            text: `Are you sure you want to ${actionText} ${user.name}'s account access?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: user.is_active ? '#DC2626' : '#182B62',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('tmo.users.toggle-status', user.id), {}, {
                    preserveScroll: true,
                });
            }
        });
    };

    // Delete Staff Member
    const handleDeleteUser = (user) => {
        if (user.is_current_user) {
            Swal.fire({
                title: 'Action Restricted',
                text: 'You cannot delete your own logged-in account.',
                icon: 'warning',
                confirmButtonColor: '#182B62',
            });
            return;
        }

        Swal.fire({
            title: 'Delete Staff Member?',
            text: `Are you sure you want to permanently remove ${user.name}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('tmo.users.destroy', user.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Deleted',
                            text: 'Staff account removed.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    const isFiltering = search.trim() !== '' || filter !== 'all';

    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, users.length);
    const paginatedUsers = users.slice(startIndex, endIndex);

    return (
        <TrivoraLayout title="Staff Management" role="TMO Officer">
            <Head title="Staff Management | TRIVORA" />

            <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                {/* ══════════════════════════════════════════════════════════════
                    1. CLEAN HEADER (Consistent with other TMO modules)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            Staff Management
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                            Manage municipal Traffic Management Office staff, inspectors, and access permissions.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] self-start sm:self-center shrink-0 cursor-pointer"
                    >
                        <UserPlus size={15} strokeWidth={2.2} />
                        <span>Add Staff</span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                    {/* Card 1: Total Staff */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Staff
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <Users size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {stats.total}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {stats.total === 1 ? 'Officer' : 'Personnel'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Authorized municipal TMO staff
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Roster:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0">
                                All Officers
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Active Officers */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Active Officers
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <CheckCircle2 size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {stats.active}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {stats.active === 1 ? 'Active' : 'Active'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Personnel with sign-in access
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Access:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-emerald-700 shrink-0">
                                Can Sign In
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Inactive Accounts */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Inactive Accounts
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                                    <XCircle size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                    stats.inactive > 0 ? 'text-rose-600' : 'text-slate-900'
                                }`}>
                                    {stats.inactive}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {stats.inactive === 1 ? 'Disabled' : 'Disabled'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Suspended or revoked access
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Access:</span>
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold shrink-0 ${
                                stats.inactive > 0 ? 'text-rose-700' : 'text-slate-600'
                            }`}>
                                Sign-In Blocked
                            </span>
                        </div>
                    </div>

                    {/* Card 4: New This Month */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-8px_rgba(15,23,42,0.14)]`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    New This Month
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {stats.new_this_month}
                                </span>
                                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {stats.new_this_month === 1 ? 'Account' : 'Accounts'}
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                                Joined municipal roster recently
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:p-2.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-400 shrink-0">Onboarding:</span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0">
                                Joined Recently
                            </span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. SEARCH & FILTER TOOLBAR
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW}`}>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="relative flex-1 min-w-0">
                            <Search
                                size={14}
                                strokeWidth={2.2}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={e => handleSearch(e.target.value)}
                                placeholder="Search by staff name, employee ID, or email…"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => handleSearch('')}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={filter}
                                onChange={e => handleFilter(e.target.value)}
                                aria-label="Filter staff by account status"
                                className="h-10 w-full sm:w-auto sm:min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. APPLICATION DATA TABLE / CARDS
                   ══════════════════════════════════════════════════════════════ */}
                {users.length === 0 ? (
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-10 sm:p-14 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/70">
                            <Users size={22} strokeWidth={1.8} />
                        </div>
                        <h3 className="mt-3.5 text-base font-bold text-slate-900">
                            No staff accounts found
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                            {isFiltering
                                ? 'No accounts match your search query or filter selection.'
                                : 'No staff personnel have been registered in the system yet.'}
                        </p>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <RotateCcw size={12} strokeWidth={2.2} />
                                <span>Clear filter</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── DESKTOP & TABLET TABLE (>= 768px) ── */}
                        <div className={`hidden md:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[760px] text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/75">
                                            <th scope="col" className="py-3 pl-5 pr-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Staff Member
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Position &amp; ID
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Contact Info
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Status
                                            </th>
                                            <th scope="col" className="py-3 px-4 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Date Joined
                                            </th>
                                            <th scope="col" className="py-3 pl-3 pr-6 text-right text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {paginatedUsers.map(u => (
                                            <DesktopStaffRow
                                                key={u.id}
                                                user={u}
                                                onEdit={handleOpenEdit}
                                                onToggleStatus={handleToggleStatus}
                                                onDelete={handleDeleteUser}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Integrated Table Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
                                <p className="text-xs text-slate-500 font-medium">
                                    Showing <span className="font-bold text-slate-900 tabular-nums">{users.length > 0 ? startIndex + 1 : 0}</span> to{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{endIndex}</span> of{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{users.length}</span> staff accounts
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
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
                                                            <span className="px-1 text-xs text-slate-400 font-medium">…</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                                activePage === p
                                                                    ? 'bg-[#182B62] text-white shadow-2xs'
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
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE PURPOSE-BUILT CARDS (< 768px) ── */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {paginatedUsers.map(u => (
                                <MobileStaffCard
                                    key={u.id}
                                    user={u}
                                    onEdit={handleOpenEdit}
                                    onToggleStatus={handleToggleStatus}
                                    onDelete={handleDeleteUser}
                                />
                            ))}

                            <div className={`flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                                <p className="text-xs text-slate-500 font-medium">
                                    Page <span className="font-bold text-slate-900 tabular-nums">{activePage}</span> of{' '}
                                    <span className="font-bold text-slate-900 tabular-nums">{totalPages}</span>
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={activePage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                    >
                                        <ChevronLeft size={13} strokeWidth={2.5} />
                                        <span>Prev</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={activePage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={13} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                5. ADD STAFF MODAL
               ══════════════════════════════════════════════════════════════ */}
            <Modal
                show={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add TMO Staff Member"
                description="Create a new officer or inspector account with system credentials"
                maxWidth="2xl"
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
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                            {addForm.processing ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                            <span>Create</span>
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Full Name <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="text"
                            value={addForm.data.name}
                            onChange={(e) => addForm.setData('name', e.target.value)}
                            placeholder="e.g. Inspector Ricardo Santos"
                            className={`w-full rounded-xl border bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                addForm.errors.name ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                            }`}
                            required
                        />
                        {addForm.errors.name ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.name}
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-slate-400">Employee ID will be generated automatically upon account creation.</p>
                        )}
                    </div>

                    {/* Position */}
                    <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Position / Designation
                        </label>
                        <input
                            type="text"
                            value={addForm.data.position}
                            onChange={(e) => addForm.setData('position', e.target.value)}
                            placeholder="e.g. TMO Inspector"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                        />
                        {addForm.errors.position && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.position}
                            </p>
                        )}
                    </div>

                    {/* Contact Number */}
                    <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Contact Number
                        </label>
                        <input
                            type="text"
                            value={addForm.data.contact_number}
                            onChange={(e) => addForm.setData('contact_number', e.target.value)}
                            placeholder="e.g. 0917 123 4567"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                        />
                        {addForm.errors.contact_number && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.contact_number}
                            </p>
                        )}
                    </div>

                    {/* Birthday */}
                    <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Birthday
                        </label>
                        <input
                            type="date"
                            max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
                            value={addForm.data.birthday}
                            onChange={(e) => addForm.setData('birthday', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                        />
                        {addForm.errors.birthday && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.birthday}
                            </p>
                        )}
                    </div>

                    {/* Official Email */}
                    <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Official Email <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="email"
                            value={addForm.data.email}
                            onChange={(e) => addForm.setData('email', e.target.value)}
                            placeholder="e.g. tmo.rsantos@trivora.gov.ph"
                            className={`w-full rounded-xl border bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                addForm.errors.email ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                            }`}
                            required
                        />
                        {addForm.errors.email && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.email}
                            </p>
                        )}
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Residential Address
                        </label>
                        <input
                            type="text"
                            value={addForm.data.address}
                            onChange={(e) => addForm.setData('address', e.target.value)}
                            placeholder="e.g. Barangay Poblacion 1, Nasugbu, Batangas"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                        />
                        {addForm.errors.address && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.address}
                            </p>
                        )}
                    </div>

                    {/* Initial Password */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                            Initial Password <span className="text-rose-600">*</span>
                        </label>
                        <input
                            type="password"
                            value={addForm.data.password}
                            onChange={(e) => addForm.setData('password', e.target.value)}
                            placeholder="Enter secure initial password"
                            className={`w-full rounded-xl border bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                addForm.errors.password ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                            }`}
                            required
                        />
                        {addForm.errors.password && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <AlertCircle size={12} /> {addForm.errors.password}
                            </p>
                        )}
                    </div>

                    {/* Active Checkbox */}
                    <div className="sm:col-span-2 pt-1">
                        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={addForm.data.is_active}
                                onChange={(e) => addForm.setData('is_active', e.target.checked)}
                                className="h-4 w-4 rounded text-[#182B62] focus:ring-[#182B62] accent-[#182B62]"
                            />
                            <span>Activate account immediately upon creation</span>
                        </label>
                    </div>
                </form>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════
                6. EDIT STAFF MODAL
               ══════════════════════════════════════════════════════════════ */}
            <Modal
                show={editModalOpen && !!editingUser}
                onClose={() => setEditModalOpen(false)}
                title="Edit Staff Account"
                description={editingUser ? `Update profile and permissions for ${editingUser.name}` : ''}
                maxWidth="2xl"
                footer={
                    <div className="flex items-center justify-end gap-2.5 w-full">
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={editForm.processing}
                            onClick={handleEditSubmit}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                            {editForm.processing ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
                            <span>Save</span>
                        </button>
                    </div>
                }
            >
                {editingUser && (
                    <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Employee ID (Read-only banner) */}
                        <div className="sm:col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Official Employee ID
                                </span>
                                <span className="font-mono text-sm font-bold text-slate-900">
                                    {editingUser.employee_id || '— not yet assigned —'}
                                </span>
                            </div>
                            <span className="text-[10.5px] font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                System Identifier
                            </span>
                        </div>

                        {/* Full Name */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-900 mb-1">
                                Full Name <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className={`w-full rounded-xl border bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                    editForm.errors.name ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                                }`}
                                required
                            />
                            {editForm.errors.name && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                    <AlertCircle size={12} /> {editForm.errors.name}
                                </p>
                            )}
                        </div>

                        {/* Position */}
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-900 mb-1">
                                Position / Designation
                            </label>
                            <input
                                type="text"
                                value={editForm.data.position}
                                onChange={(e) => editForm.setData('position', e.target.value)}
                                placeholder="e.g. TMO Inspector"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                            />
                            {editForm.errors.position && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                    <AlertCircle size={12} /> {editForm.errors.position}
                                </p>
                            )}
                        </div>

                        {/* Contact Number */}
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-900 mb-1">
                                Contact Number
                            </label>
                            <input
                                type="text"
                                value={editForm.data.contact_number}
                                onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                placeholder="e.g. 0917 123 4567"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                            />
                            {editForm.errors.contact_number && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                    <AlertCircle size={12} /> {editForm.errors.contact_number}
                                </p>
                            )}
                        </div>

                        {/* Birthday */}
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-900 mb-1">
                                Birthday
                            </label>
                            <input
                                type="date"
                                max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
                                value={editForm.data.birthday}
                                onChange={(e) => editForm.setData('birthday', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                            />
                            {editForm.errors.birthday && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                    <AlertCircle size={12} /> {editForm.errors.birthday}
                                </p>
                            )}
                        </div>

                        {/* Official Email */}
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-900 mb-1">
                                Official Email <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="email"
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                                className={`w-full rounded-xl border bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                    editForm.errors.email ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                                }`}
                                required
                            />
                            {editForm.errors.email && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                    <AlertCircle size={12} /> {editForm.errors.email}
                                </p>
                            )}
                        </div>

                        {/* Address */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-900 mb-1">
                                Residential Address
                            </label>
                            <input
                                type="text"
                                value={editForm.data.address}
                                onChange={(e) => editForm.setData('address', e.target.value)}
                                placeholder="e.g. Barangay Poblacion 1, Nasugbu, Batangas"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                            />
                            {editForm.errors.address && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                    <AlertCircle size={12} /> {editForm.errors.address}
                                </p>
                            )}
                        </div>

                        {/* Password (Optional on Edit) */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-900 mb-1">
                                Update Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                            </label>
                            <input
                                type="password"
                                value={editForm.data.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                                placeholder="Enter new password if updating"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#182B62] focus:ring-2 focus:ring-[#182B62]/10 transition-all"
                            />
                            {editForm.errors.password && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                    <AlertCircle size={12} /> {editForm.errors.password}
                                </p>
                            )}
                        </div>

                        {/* Active Checkbox (Only if not current logged-in user) */}
                        {!editingUser.is_current_user && (
                            <div className="sm:col-span-2 pt-1">
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.data.is_active}
                                        onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                        className="h-4 w-4 rounded text-[#182B62] focus:ring-[#182B62] accent-[#182B62]"
                                    />
                                    <span>Account is active with system sign-in enabled</span>
                                </label>
                            </div>
                        )}
                    </form>
                )}
            </Modal>
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row & Mobile Card
───────────────────────────────────────────────────────────────────────── */

function DesktopStaffRow({ user, onEdit, onToggleStatus, onDelete }) {

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Staff Member */}
            <td className="py-4 pl-5 pr-3 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={user.name} src={user.profile_photo_url} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-xs font-black text-white shadow-2xs" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                                {user.name}
                            </p>
                            {user.is_current_user && (
                                <span className="rounded-md bg-indigo-50 border border-indigo-200 text-[#182B62] px-1.5 py-0.2 text-[9.5px] font-bold uppercase tracking-wider shrink-0">
                                    You
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 font-medium">
                            {user.email}
                        </p>
                    </div>
                </div>
            </td>

            {/* Column 2: Position & Employee ID */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col gap-1">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        <ShieldCheck size={12} strokeWidth={2.2} className="text-[#182B62]" />
                        {user.position || user.role_label || 'TMO Personnel'}
                    </span>
                    {user.employee_id ? (
                        <span className="font-mono text-[10.5px] text-slate-500 font-semibold">
                            ID: {user.employee_id}
                        </span>
                    ) : (
                        <span className="text-[10.5px] text-slate-300">No employee ID</span>
                    )}
                </div>
            </td>

            {/* Column 3: Contact */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    {user.contact_number ? (
                        <a href={`tel:${user.contact_number}`} className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-[#182B62] transition-colors">
                            <Phone size={10} className="text-slate-400 shrink-0" />
                            {user.contact_number}
                        </a>
                    ) : (
                        <span className="text-xs text-slate-400 font-medium">No contact number</span>
                    )}
                    <span className="mt-0.5 truncate text-[11px] text-slate-500 font-medium max-w-[170px]">
                        {user.address || 'No address on file'}
                    </span>
                    {user.birthday_label && (
                        <span className="mt-0.5 text-[10.5px] text-slate-400 font-medium">
                            Birthday: {user.birthday_label}
                        </span>
                    )}
                </div>
            </td>

            {/* Column 4: Status */}
            <td className="py-4 px-4 align-middle">
                <StatusPill user={user} onToggleStatus={onToggleStatus} />
            </td>

            {/* Column 5: Joined */}
            <td className="py-4 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 tabular-nums">{user.created_at}</span>
                    <span className="mt-0.5 text-[11px] text-slate-400 font-medium">{user.created_ago}</span>
                </div>
            </td>

            {/* Column 6: Actions */}
            <td className="py-4 pl-3 pr-6 text-right align-middle">
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={() => onEdit(user)}
                        title="Edit staff account"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
                    >
                        <Edit2 size={13} strokeWidth={2.2} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(user)}
                        disabled={user.is_current_user}
                        title={user.is_current_user ? 'You cannot delete your own account' : 'Delete staff account'}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-2xs transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-30"
                    >
                        <Trash2 size={13} strokeWidth={2.2} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function MobileStaffCard({ user, onEdit, onToggleStatus, onDelete }) {

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 transition-all ${CARD_SHADOW}`}>
            {/* Top Row: Staff & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={user.name} src={user.profile_photo_url} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-black text-white shadow-2xs" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
                            {user.is_current_user && (
                                <span className="rounded-md bg-indigo-50 border border-indigo-200 text-[#182B62] px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                    You
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 font-medium">{user.email}</p>
                    </div>
                </div>
                <StatusPill user={user} onToggleStatus={onToggleStatus} />
            </div>

            {/* Position & Employee ID */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    <ShieldCheck size={11} strokeWidth={2.2} className="text-[#182B62]" />
                    {user.position || 'TMO Personnel'}
                </span>
                {user.employee_id && (
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        ID: {user.employee_id}
                    </span>
                )}
            </div>

            {/* Contact & Birthday */}
            <div className="mt-2.5 flex flex-col gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium text-[11px]">Contact:</span>
                    <span className="font-bold text-slate-800">{user.contact_number || 'No contact number'}</span>
                </div>
                {user.address && (
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium text-[11px]">Address:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[190px]">{user.address}</span>
                    </div>
                )}
                {user.birthday_label && (
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium text-[11px]">Birthday:</span>
                        <span className="font-bold text-slate-800">{user.birthday_label}</span>
                    </div>
                )}
            </div>

            {/* Joined Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                <span>Joined {user.created_at}</span>
                <span className="text-[11px] text-slate-400">{user.created_ago}</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                >
                    <Edit2 size={13} strokeWidth={2.2} />
                    <span>Edit</span>
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(user)}
                    disabled={user.is_current_user}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 py-2 text-xs font-bold text-rose-700 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                    <Trash2 size={13} strokeWidth={2.2} />
                    <span>Delete</span>
                </button>
            </div>
        </div>
    );
}
