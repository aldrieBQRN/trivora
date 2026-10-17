import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import Swal from 'sweetalert2';
import {
    Users, UserPlus, Search, ShieldCheck, CheckCircle2,
    XCircle, Clock, Edit2, Trash2, Key, Mail,
    User, Lock, X, AlertCircle, RotateCcw,
    ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Send,
} from 'lucide-react';
import { Modal } from '@/Components/TMO';

import Avatar from '@/Components/Avatar';
// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// panel pages, so BPLO cards read as part of the same product.
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Staff' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

// Credential-email outcome is reported by the server's flash message — the UI never assumes
// the email went out.
function showCredentialsResult(page, successTitle) {
    const { success, warning, error } = page.props.flash || {};
    if (warning || error) {
        Swal.fire({
            title: warning ? 'Email Not Sent' : 'Action Not Available',
            text: warning || error,
            icon: warning ? 'warning' : 'error',
            confirmButtonColor: '#182B62',
        });
        return;
    }
    Swal.fire({
        title: successTitle,
        text: success,
        icon: 'success',
        confirmButtonColor: '#182B62',
        timer: 2500,
        showConfirmButton: false,
    });
}

// Temporary-password state for accounts that haven't set their own password yet.
const CREDENTIAL_BADGES = {
    not_sent: { label: 'Credentials email not sent', className: 'border-rose-200 bg-rose-50 text-rose-700' },
    pending: { label: 'Awaiting first sign-in', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    expired: { label: 'Temporary password expired', className: 'border-slate-200 bg-slate-100 text-slate-600' },
};

function CredentialsBadge({ status }) {
    const badge = CREDENTIAL_BADGES[status];
    if (!badge) return null;
    return (
        <span className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
            {badge.label}
        </span>
    );
}

export default function StaffManagement({
    users = [],
    searchTerm = '',
    statusFilter = 'all',
    stats = { total: 0, active: 0, inactive: 0, new_this_month: 0 },
    currentUserId = null
}) {
    const [search, setSearch] = useState(searchTerm);
    const [filter, setFilter] = useState(statusFilter);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Add Form (employee_id is system-generated, never entered here)
    const addForm = useForm({
        name: '',
        position: '',
        birthday: '',
        contact_number: '',
        address: '',
        email: '',
        is_active: true
    });

    // Edit Form
    const editForm = useForm({
        name: '',
        position: '',
        birthday: '',
        contact_number: '',
        address: '',
        email: '',
        password: '',
        is_active: true
    });

    // Background refresh of the staff list + counts: an account created, disabled or edited from
    // another session shows up without a manual reload. Paused while either modal is open or
    // either form is submitting, so it can never swap the list out from under a live edit.
    useBackgroundRefresh(['users', 'stats'], {
        paused: addModalOpen || editModalOpen || addForm.processing || editForm.processing,
    });

    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const paginatedUsers = users.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

    // Live search / filter handler
    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
        router.get(
            route('bplo.users'),
            { search: val, status: filter },
            { preserveState: true, replace: true }
        );
    };

    const handleFilter = (status) => {
        setFilter(status);
        router.get(
            route('bplo.users'),
            { search, status },
            { preserveState: true, replace: true }
        );
    };

    const handleClearSearch = () => {
        setSearch('');
        router.get(
            route('bplo.users'),
            { search: '', status: filter },
            { preserveState: true, replace: true }
        );
    };

    // Open Edit Modal
    const handleOpenEdit = (user) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
            position: user.position || '',
            birthday: user.birthday || '',
            contact_number: user.contact_number || '',
            address: user.address || '',
            email: user.email,
            password: '',
            is_active: !!user.is_active
        });
        editForm.clearErrors();
        setEditModalOpen(true);
    };

    // Submit Add
    const handleAddSubmit = () => {
        addForm.post(route('bplo.users.store'), {
            onSuccess: (page) => {
                setAddModalOpen(false);
                addForm.reset();
                showCredentialsResult(page, 'Account Created');
            }
        });
    };

    // Submit Edit
    const handleEditSubmit = () => {
        if (!editingUser) return;

        editForm.put(route('bplo.users.update', editingUser.id), {
            onSuccess: () => {
                setEditModalOpen(false);
                setEditingUser(null);
                editForm.reset();
                Swal.fire({
                    title: 'Updated',
                    text: 'BPLO staff account details updated.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });
    };

    // Generate and email a NEW temporary password (failed delivery or expired before first sign-in)
    const handleResendCredentials = (user) => {
        Swal.fire({
            title: 'Resend Credentials?',
            text: `A new temporary password will be generated and emailed to ${user.email}. Any previous temporary password will stop working.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#182B62',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Resend',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (!result.isConfirmed) return;
            router.post(route('bplo.users.resend-credentials', user.id), {}, {
                preserveScroll: true,
                onSuccess: (page) => showCredentialsResult(page, 'Credentials Sent'),
            });
        });
    };

    // Toggle Active Status
    const handleToggleStatus = (user) => {
        if (user.is_current_user) {
            Swal.fire({
                title: 'Action Restricted',
                text: 'You cannot deactivate your own logged-in account.',
                icon: 'warning',
                confirmButtonColor: '#182B62'
            });
            return;
        }

        const actionText = user.is_active ? 'deactivate' : 'activate';
        Swal.fire({
            title: `${user.is_active ? 'Deactivate' : 'Activate'} Staff Account?`,
            text: `Are you sure you want to ${actionText} ${user.name}'s account?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: user.is_active ? '#DC2626' : '#182B62',
            cancelButtonColor: '#64748B',
            confirmButtonText: `Yes, ${actionText}`
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('bplo.users.toggle-status', user.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Status Updated',
                            text: `Account has been ${user.is_active ? 'deactivated' : 'activated'}.`,
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
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
                confirmButtonColor: '#182B62'
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
            confirmButtonText: 'Yes, delete',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('bplo.users.destroy', user.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Deleted',
                            text: 'Staff account removed.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    return (
        <BPLOLayout title="Staff Management" role="BPLO Officer">
            <Head title="BPLO Staff Management | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with TMO Standard)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        BPLO Staff Management
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                        Manage Business Permit &amp; Licensing Office personnel, payment verifiers, and plate issuing officers
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setAddModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <UserPlus size={15} strokeWidth={2.2} />
                        <span>Add BPLO Staff</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                {/* Card 1: Total Staff */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Total Staff
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                <Users size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                {stats.total}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {stats.total === 1 ? 'Officer' : 'Personnel'}
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Authorized municipal BPLO staff
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Roster:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-slate-800 shrink-0">
                            All Officers
                        </span>
                    </div>
                </div>

                {/* Card 2: Active Officers */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Active Officers
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                <CheckCircle2 size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                {stats.active}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {stats.active === 1 ? 'Active' : 'Active'}
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Personnel with sign-in access
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Access:</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-emerald-700 shrink-0">
                            Can Sign In
                        </span>
                    </div>
                </div>

                {/* Card 3: Inactive Accounts */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                Inactive Accounts
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600">
                                <XCircle size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className={`font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums leading-none ${
                                stats.inactive > 0 ? 'text-rose-600' : 'text-slate-900'
                            }`}>
                                {stats.inactive}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {stats.inactive === 1 ? 'Disabled' : 'Disabled'}
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Suspended or revoked access
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Access:</span>
                        <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-bold shrink-0 ${
                            stats.inactive > 0 ? 'text-rose-700' : 'text-slate-600'
                        }`}>
                            Sign-In Blocked
                        </span>
                    </div>
                </div>

                {/* Card 4: New This Month */}
                <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                New This Month
                            </span>
                            <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                <Clock size={15} strokeWidth={2.2} />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                {stats.new_this_month}
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                {stats.new_this_month === 1 ? 'Account' : 'Accounts'}
                            </span>
                        </div>
                        <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
                            Joined municipal roster recently
                        </p>
                    </div>

                    <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 flex items-center justify-between text-[10.5px] sm:text-xs">
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-slate-500 shrink-0">Onboarding:</span>
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
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={handleSearch}
                            placeholder="Search by staff name, employee ID, or email…"
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
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
                            className="h-10 w-full sm:w-auto sm:flex-1 lg:flex-none sm:min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. STAFF DATA TABLE & MOBILE CARDS
               ══════════════════════════════════════════════════════════════ */}
            {users.length === 0 ? (
                <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-3">
                        <AlertCircle size={24} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No staff accounts found</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                        {search
                            ? `No staff records match the query "${search}".`
                            : 'No staff personnel currently recorded under this filter status.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* ── DESKTOP & TABLET DATA TABLE (md: 768px and up) ── */}
                    <div className={`hidden lg:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[900px] whitespace-nowrap border-collapse text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                        <th scope="col" className="py-3 pl-5 pr-3">Staff Member</th>
                                        <th scope="col" className="py-3 px-4">Position & Employee ID</th>
                                        <th scope="col" className="py-3 px-4">Contact</th>
                                        <th scope="col" className="py-3 px-4">Birthday</th>
                                        <th scope="col" className="py-3 px-4">Status</th>
                                        <th scope="col" className="py-3 px-4">Joined Date</th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {paginatedUsers.map((u) => (
                                        <DesktopStaffRow
                                            key={u.id}
                                            u={u}
                                            onEdit={handleOpenEdit}
                                            onToggleStatus={handleToggleStatus}
                                            onDelete={handleDeleteUser}
                                            onResend={handleResendCredentials}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Integrated Table Footer */}
                        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3">
                            <p className="text-xs text-slate-600">
                                Page <span className="font-bold text-slate-800 tabular-nums">{activePage}</span> of{' '}
                                <span className="font-bold text-slate-800 tabular-nums">{totalPages}</span>
                                <span className="mx-2 text-slate-300">·</span>
                                <span className="tabular-nums font-semibold text-slate-700">{users.length}</span> staff {users.length === 1 ? 'account' : 'accounts'}
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
                                                        <span className="px-0.5 text-xs text-slate-500">…</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all ${
                                                            activePage === p
                                                                ? 'bg-[#182B62] text-white shadow-sm'
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

                    {/* ── MOBILE PURPOSE-BUILT CARDS (under 768px) ── */}
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:hidden">
                        {paginatedUsers.map((u) => (
                            <MobileStaffCard
                                key={u.id}
                                u={u}
                                onEdit={handleOpenEdit}
                                onToggleStatus={handleToggleStatus}
                                onDelete={handleDeleteUser}
                                onResend={handleResendCredentials}
                            />
                        ))}

                        <div className={`md:col-span-2 mt-1 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 ${CARD_SHADOW}`}>
                            <p className="text-xs text-slate-600">
                                <span className="font-bold text-slate-800">{activePage}</span> of {totalPages}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={activePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm disabled:opacity-40"
                                >
                                    <ChevronLeft size={13} strokeWidth={2.5} />
                                </button>
                                <button
                                    type="button"
                                    disabled={activePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm disabled:opacity-40"
                                >
                                    <ChevronRight size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                5. ADD STAFF MODAL
               ══════════════════════════════════════════════════════════════ */}
            <Modal
                show={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add BPLO Staff Member"
                description="Create a licensing officer account with system sign-in credentials"
                maxWidth="2xl"
                footer={
                    <ModalFooter
                        onCancel={() => setAddModalOpen(false)}
                        onSubmit={handleAddSubmit}
                        processing={addForm.processing}
                        icon={UserPlus}
                        label="Create Account"
                    />
                }
            >
                <form
                    onSubmit={(e) => { e.preventDefault(); handleAddSubmit(); }}
                    className="space-y-5"
                >
                    <ModalSection icon={User} title="Personal Information">
                        <FormField label="Full Name" required error={addForm.errors.name} hint="Employee ID is generated automatically once the account is created." className="sm:col-span-2">
                            <input
                                type="text"
                                value={addForm.data.name}
                                onChange={(e) => addForm.setData('name', e.target.value)}
                                placeholder="e.g. Officer Maria Clara"
                                className={fieldClass(addForm.errors.name)}
                                autoFocus
                                required
                            />
                        </FormField>

                        <FormField label="Position / Designation" error={addForm.errors.position}>
                            <input
                                type="text"
                                value={addForm.data.position}
                                onChange={(e) => addForm.setData('position', e.target.value)}
                                placeholder="e.g. Licensing Officer"
                                className={fieldClass(addForm.errors.position)}
                            />
                        </FormField>

                        <FormField label="Contact Number" error={addForm.errors.contact_number}>
                            <input
                                type="tel"
                                value={addForm.data.contact_number}
                                onChange={(e) => addForm.setData('contact_number', e.target.value)}
                                placeholder="e.g. 0917 123 4567"
                                className={fieldClass(addForm.errors.contact_number)}
                            />
                        </FormField>

                        <FormField label="Birthday" error={addForm.errors.birthday}>
                            <input
                                type="date"
                                max={MAX_BIRTHDAY}
                                value={addForm.data.birthday}
                                onChange={(e) => addForm.setData('birthday', e.target.value)}
                                className={fieldClass(addForm.errors.birthday)}
                            />
                        </FormField>

                        <FormField label="Residential Address" error={addForm.errors.address}>
                            <input
                                type="text"
                                value={addForm.data.address}
                                onChange={(e) => addForm.setData('address', e.target.value)}
                                placeholder="e.g. Poblacion 1, Nasugbu"
                                className={fieldClass(addForm.errors.address)}
                            />
                        </FormField>
                    </ModalSection>

                    <ModalSection icon={Key} title="Account Access">
                        <FormField label="Official Email" required error={addForm.errors.email} className="sm:col-span-2">
                            <input
                                type="email"
                                value={addForm.data.email}
                                onChange={(e) => addForm.setData('email', e.target.value)}
                                placeholder="e.g. bplo.mclara@trivora.gov.ph"
                                className={fieldClass(addForm.errors.email)}
                                required
                            />
                        </FormField>

                        {/* Sign-in credentials are generated and emailed by the server */}
                        <div className="sm:col-span-2 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                            <Lock size={14} className="mt-0.5 shrink-0 text-[#182B62]" />
                            <p className="text-[11.5px] leading-relaxed text-slate-600">
                                A secure temporary password will be generated and emailed to this address. The staff member must change it the first time they sign in, within 24 hours.
                            </p>
                        </div>

                        <ActiveToggle
                            checked={addForm.data.is_active}
                            onChange={(checked) => addForm.setData('is_active', checked)}
                            label="Activate account immediately"
                            hint="The officer can sign in as soon as the account is created."
                        />
                    </ModalSection>
                </form>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════
                6. EDIT STAFF MODAL
               ══════════════════════════════════════════════════════════════ */}
            <Modal
                show={editModalOpen && !!editingUser}
                onClose={() => setEditModalOpen(false)}
                title="Edit BPLO Staff Account"
                description={editingUser ? `Update profile and access for ${editingUser.name}` : ''}
                maxWidth="2xl"
                footer={
                    <ModalFooter
                        onCancel={() => setEditModalOpen(false)}
                        onSubmit={handleEditSubmit}
                        processing={editForm.processing}
                        icon={Edit2}
                        label="Save Changes"
                    />
                }
            >
                {editingUser && (
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleEditSubmit(); }}
                        className="space-y-5"
                    >
                        {/* Employee ID (read-only, system-generated) */}
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar name={editingUser.name} src={editingUser.profile_photo_url} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-bold text-white shadow-sm" />
                                <div className="min-w-0">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Official Employee ID
                                    </span>
                                    <span className="block truncate font-mono text-sm font-bold text-slate-900">
                                        {editingUser.employee_id || '— not yet assigned —'}
                                    </span>
                                </div>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
                                <Lock size={10} /> System Generated
                            </span>
                        </div>

                        <ModalSection icon={User} title="Personal Information">
                            <FormField label="Full Name" required error={editForm.errors.name} className="sm:col-span-2">
                                <input
                                    type="text"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className={fieldClass(editForm.errors.name)}
                                    required
                                />
                            </FormField>

                            <FormField label="Position / Designation" error={editForm.errors.position}>
                                <input
                                    type="text"
                                    value={editForm.data.position}
                                    onChange={(e) => editForm.setData('position', e.target.value)}
                                    placeholder="e.g. Licensing Officer"
                                    className={fieldClass(editForm.errors.position)}
                                />
                            </FormField>

                            <FormField label="Contact Number" error={editForm.errors.contact_number}>
                                <input
                                    type="tel"
                                    value={editForm.data.contact_number}
                                    onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                    placeholder="e.g. 0917 123 4567"
                                    className={fieldClass(editForm.errors.contact_number)}
                                />
                            </FormField>

                            <FormField label="Birthday" error={editForm.errors.birthday}>
                                <input
                                    type="date"
                                    max={MAX_BIRTHDAY}
                                    value={editForm.data.birthday}
                                    onChange={(e) => editForm.setData('birthday', e.target.value)}
                                    className={fieldClass(editForm.errors.birthday)}
                                />
                            </FormField>

                            <FormField label="Residential Address" error={editForm.errors.address}>
                                <input
                                    type="text"
                                    value={editForm.data.address}
                                    onChange={(e) => editForm.setData('address', e.target.value)}
                                    placeholder="e.g. Poblacion 1, Nasugbu"
                                    className={fieldClass(editForm.errors.address)}
                                />
                            </FormField>
                        </ModalSection>

                        <ModalSection icon={Key} title="Account Access">
                            <FormField label="Official Email" required error={editForm.errors.email} className="sm:col-span-2">
                                <input
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                    className={fieldClass(editForm.errors.email)}
                                    required
                                />
                            </FormField>

                            <FormField label="New Password" optionalNote="Leave blank to keep unchanged" error={editForm.errors.password} className="sm:col-span-2">
                                <PasswordInput
                                    value={editForm.data.password}
                                    onChange={(e) => editForm.setData('password', e.target.value)}
                                    placeholder="Enter a new password only if updating"
                                    error={editForm.errors.password}
                                />
                            </FormField>

                            {!editingUser.is_current_user && (
                                <ActiveToggle
                                    checked={editForm.data.is_active}
                                    onChange={(checked) => editForm.setData('is_active', checked)}
                                    label="Account is active"
                                    hint="Turn off to block this officer from signing in."
                                />
                            )}
                        </ModalSection>
                    </form>
                )}
            </Modal>
        </BPLOLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: StatusPill, DesktopStaffRow, MobileStaffCard
   ───────────────────────────────────────────────────────────────────────── */

function StatusPill({ user, onToggleStatus }) {
    const isActive = !!user.is_active;
    return (
        <button
            type="button"
            onClick={() => onToggleStatus(user)}
            title={user.is_current_user ? 'You cannot deactivate your own account' : 'Click to toggle status'}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase shadow-sm transition-colors ${
                isActive
                    ? 'border border-emerald-200/90 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                    : 'border border-rose-200/90 bg-rose-50 text-rose-700 hover:bg-rose-100/70'
            }`}
        >
            {isActive ? 'Active' : 'Inactive'}
        </button>
    );
}

function DesktopStaffRow({ u, user: userProp, onEdit, onToggleStatus, onDelete, onResend }) {
    const user = u || userProp;

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Staff Member */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex items-center gap-2.5">
                    <Avatar name={user.name} src={user.profile_photo_url} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-bold text-white shadow-sm" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                                {user.name}
                            </p>
                            {user.is_current_user && (
                                <span className="rounded bg-[#182B62] px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wide text-white">
                                    You
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-600">{user.email}</p>
                    </div>
                </div>
            </td>

            {/* Column 2: Position & Employee ID */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col gap-1">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        <ShieldCheck size={12} strokeWidth={2.2} className="text-slate-500" />
                        {user.position || user.role_label || 'BPLO Personnel'}
                    </span>
                    {user.employee_id ? (
                        <span className="font-mono text-[10.5px] text-slate-500">ID: {user.employee_id}</span>
                    ) : (
                        <span className="text-[10.5px] text-slate-300">No employee ID</span>
                    )}
                </div>
            </td>

            {/* Column 3: Contact */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    {user.contact_number ? (
                        <a href={`tel:${user.contact_number}`} className="text-xs font-semibold text-slate-800 hover:text-[#182B62]">
                            {user.contact_number}
                        </a>
                    ) : (
                        <span className="text-xs text-slate-300">No contact number</span>
                    )}
                    <span className="mt-0.5 truncate text-[11px] text-slate-500 max-w-[160px]">
                        {user.address || 'No address on file'}
                    </span>
                </div>
            </td>

            {/* Column 4: Birthday */}
            <td className="py-3.5 px-4 align-middle">
                {user.birthday_label ? (
                    <span className="text-xs font-semibold text-slate-800">{user.birthday_label}</span>
                ) : (
                    <span className="text-xs text-slate-300">Not on file</span>
                )}
            </td>

            {/* Column 5: Status */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col items-start">
                    <StatusPill user={user} onToggleStatus={onToggleStatus} />
                    <CredentialsBadge status={user.credentials_status} />
                </div>
            </td>

            {/* Column 6: Joined Date */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">{user.created_at}</span>
                    {user.created_ago && (
                        <span className="mt-0.5 text-[11px] text-slate-500">{user.created_ago}</span>
                    )}
                </div>
            </td>

            {/* Column 7: Actions */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <div className="flex items-center justify-end gap-1.5">
                    {user.credentials_status && (
                        <button
                            type="button"
                            onClick={() => onResend(user)}
                            title="Resend sign-in credentials"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <Send size={14} strokeWidth={2.2} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onEdit(user)}
                        title="Edit staff account"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <Edit2 size={14} strokeWidth={2.2} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(user)}
                        disabled={user.is_current_user}
                        title={user.is_current_user ? 'You cannot delete your own account' : 'Delete staff account'}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-40"
                    >
                        <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function MobileStaffCard({ u, user: userProp, onEdit, onToggleStatus, onDelete, onResend }) {
    const user = u || userProp;

    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-all hover:border-slate-300 ${CARD_SHADOW}`}>
            {/* Top Row: Staff & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={user.name} src={user.profile_photo_url} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-[10px] font-bold text-white shadow-sm" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
                            {user.is_current_user && (
                                <span className="rounded bg-[#182B62] px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wide text-white shrink-0">
                                    You
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <StatusPill user={user} onToggleStatus={onToggleStatus} />
                    <CredentialsBadge status={user.credentials_status} />
                </div>
            </div>

            {/* Email & Position */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <p className="truncate text-[11px] text-slate-600">{user.email}</p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                    <ShieldCheck size={10} strokeWidth={2.2} className="text-slate-500" />
                    {user.position || user.role_label || 'BPLO Personnel'}
                </span>
            </div>

            {/* Contact & Employee ID */}
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                {user.contact_number ? (
                    <a href={`tel:${user.contact_number}`} className="font-medium text-slate-600">{user.contact_number}</a>
                ) : (
                    <span className="text-slate-300">No contact number</span>
                )}
                {user.employee_id && (
                    <span className="font-mono text-[10.5px] text-slate-500">ID: {user.employee_id}</span>
                )}
            </div>
            {user.birthday_label && (
                <p className="mt-1 text-[11px] text-slate-500">Birthday: {user.birthday_label}</p>
            )}

            {/* Joined Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <span className="text-[11px] font-medium text-slate-600">Joined {user.created_at}</span>
                {user.created_ago && (
                    <span className="text-[10px] text-slate-500">{user.created_ago}</span>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                {user.credentials_status && (
                    <button
                        type="button"
                        onClick={() => onResend(user)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                    >
                        <Send size={13} strokeWidth={2.2} />
                        <span>Resend</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                    <Edit2 size={13} strokeWidth={2.2} />
                    <span>Edit</span>
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(user)}
                    disabled={user.is_current_user}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-semibold text-rose-700 shadow-sm active:scale-[0.98] transition-all disabled:pointer-events-none disabled:opacity-40"
                >
                    <Trash2 size={13} strokeWidth={2.2} />
                    <span>Delete</span>
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Add / Edit Staff modal form pieces
───────────────────────────────────────────────────────────────────────── */

// Latest allowed birthday (yesterday) for the date pickers.
const MAX_BIRTHDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

function fieldClass(error) {
    return `w-full rounded-xl border bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
        error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
    }`;
}

function ModalSection({ icon: Icon, title, children }) {
    return (
        <section>
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-[#182B62]">
                    <Icon size={12} strokeWidth={2.4} />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
        </section>
    );
}

function FormField({ label, required = false, optionalNote, hint, error, className = '', children }) {
    return (
        <div className={className}>
            <label className="mb-1 block text-xs font-bold text-slate-900">
                {label} {required && <span className="text-rose-600">*</span>}
                {optionalNote && <span className="font-normal text-slate-500"> ({optionalNote})</span>}
            </label>
            {children}
            {error ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                    <AlertCircle size={12} /> {error}
                </p>
            ) : hint ? (
                <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}

function PasswordInput({ error, ...props }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={visible ? 'text' : 'password'} className={`${fieldClass(error)} pr-10`} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
                {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    );
}

function ActiveToggle({ checked, onChange, label, hint }) {
    return (
        <label className="sm:col-span-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 transition-colors hover:border-slate-300">
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">{label}</p>
                <p className="mt-0.5 text-[11px] text-slate-600">{hint}</p>
            </div>
            <span className="relative inline-flex shrink-0 items-center">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="peer sr-only"
                />
                <span className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-[#182B62]/30" />
                <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
            </span>
        </label>
    );
}

function ModalFooter({ onCancel, onSubmit, processing, icon: Icon, label }) {
    return (
        <div className="flex w-full items-center justify-end gap-2.5">
            <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
                Cancel
            </button>
            <button
                type="button"
                disabled={processing}
                onClick={onSubmit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#25449B] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                <span>{label}</span>
            </button>
        </div>
    );
}
