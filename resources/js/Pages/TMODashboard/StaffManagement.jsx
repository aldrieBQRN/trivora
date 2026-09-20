import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Users, UserPlus, ShieldCheck, CheckCircle2, XCircle, Clock,
    Edit2, Trash2, Search, X, RotateCcw,
} from 'lucide-react';
import { Modal, Button, Label, ErrorText, Input, Pagination } from '@/Components/TMO';

// Shared soft, layered shadow — same elevation token used across the redesigned TMO pages
// (Dashboard.jsx, Index.jsx) so every card in the panel reads as one consistent product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Staff' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

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

    // Form for Adding Staff (employee_id is system-generated, never entered here)
    const addForm = useForm({
        name: '',
        position: '',
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
        contact_number: '',
        address: '',
        email: '',
        password: '',
        is_active: true,
    });

    const handleSearch = (val) => {
        setSearch(val);
        router.get(
            route('tmo.users'),
            { search: val, status: filter },
            { preserveState: true, replace: true }
        );
    };

    const handleFilter = (status) => {
        setFilter(status);
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
        editForm.setData({
            name: user.name,
            position: user.position || '',
            contact_number: user.contact_number || '',
            address: user.address || '',
            email: user.email,
            password: '',
            is_active: user.is_active,
        });
        setEditModalOpen(true);
    };

    // Submit Add
    const handleAddSubmit = () => {
        addForm.post(route('tmo.users.store'), {
            onSuccess: () => {
                setAddModalOpen(false);
                addForm.reset();
                Swal.fire({
                    title: 'Account Created',
                    text: 'New TMO staff account created successfully.',
                    icon: 'success',
                    confirmButtonColor: '#1D2542',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });
    };

    // Submit Edit
    const handleEditSubmit = () => {
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
                    confirmButtonColor: '#1D2542',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });
    };

    // Toggle Active Status
    const handleToggleStatus = (user) => {
        if (user.is_current_user) {
            Swal.fire({
                title: 'Action Restricted',
                text: 'You cannot deactivate your own logged-in account.',
                icon: 'warning',
                confirmButtonColor: '#1D2542'
            });
            return;
        }

        const actionText = user.is_active ? 'deactivate' : 'activate';
        Swal.fire({
            title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Staff Account?`,
            text: `Are you sure you want to ${actionText} ${user.name}'s account access?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: user.is_active ? '#DC2626' : '#059669',
            cancelButtonColor: '#64748B',
            confirmButtonText: `Yes, ${actionText}`,
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
                confirmButtonColor: '#1D2542'
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
                router.delete(route('tmo.users.destroy', user.id), {
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

    const isFiltering = search.trim() !== '' || filter !== 'all';

    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const paginatedUsers = users.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <TrivoraLayout title="Staff Management" role="TMO Officer">
            <Head title="Staff Management | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. CLEAN HEADER (Consistent with Active Tricycle Registry)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Staff Management
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                        Manage TMO officer and inspector accounts
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setAddModalOpen(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1D2542] hover:bg-[#283256] px-3.5 text-xs font-semibold text-white shadow-sm transition-all self-start sm:self-center shrink-0 active:scale-[0.99]"
                >
                    <UserPlus size={14} strokeWidth={2.2} />
                    <span>Add Staff Member</span>
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. FLOATING MINIMAL METRIC CARDS
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                            <Users size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">All-Time</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.total}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Total TMO Staff</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Roster</span>
                        <span className="font-semibold text-slate-700">All Personnel</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600">
                            <CheckCircle2 size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                            Signed In
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.active}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Active Officers</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Access</span>
                        <span className="font-semibold text-emerald-700">Can Sign In</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/[0.14] to-rose-500/[0.02] text-rose-600">
                            <XCircle size={16} strokeWidth={2.2} />
                        </div>
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/70">
                            Disabled
                        </span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.inactive}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">Inactive Accounts</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Access</span>
                        <span className="font-semibold text-rose-700">Sign-In Blocked</span>
                    </div>
                </div>

                <div className={`group rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} transition-all hover:border-slate-300`}>
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/[0.14] to-indigo-500/[0.02] text-indigo-600">
                            <Clock size={16} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">This Month</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">
                            {stats.new_this_month}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">New Accounts</p>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <span className="text-slate-400">Onboarding</span>
                        <span className="font-semibold text-indigo-700">Joined Recently</span>
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
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-tmo-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-tmo-primary/10"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => handleSearch('')}
                                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={filter}
                            onChange={e => handleFilter(e.target.value)}
                            className="h-10 w-full sm:w-40 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/10 cursor-pointer"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. DATA DISPLAY
               ══════════════════════════════════════════════════════════════ */}
            {users.length === 0 ? (
                <div className={`rounded-2xl border border-slate-200/70 bg-white p-12 text-center ${CARD_SHADOW}`}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Users size={24} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        No staff accounts found
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                        {isFiltering
                            ? 'No accounts match your search or filters.'
                            : 'No staff accounts have been created yet.'}
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
                                            Staff Member
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Position &amp; ID
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Contact
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Status
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Joined
                                        </th>
                                        <th scope="col" className="py-3 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
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

                        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-5 py-3">
                            <p className="text-xs text-slate-500">
                                <span className="tabular-nums font-semibold text-slate-700">{users.length}</span> staff {users.length === 1 ? 'account' : 'accounts'}
                            </p>
                        </div>
                    </div>

                    {/* ── MOBILE PURPOSE-BUILT CARDS ── */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {paginatedUsers.map(u => (
                            <MobileStaffCard
                                key={u.id}
                                user={u}
                                onEdit={handleOpenEdit}
                                onToggleStatus={handleToggleStatus}
                                onDelete={handleDeleteUser}
                            />
                        ))}
                    </div>

                    <Pagination page={activePage} totalPages={totalPages} totalItems={users.length} pageSize={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
                </>
            )}

            {/* ══════════════ ADD STAFF MODAL ══════════════ */}
            <Modal
                show={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add TMO Staff Member"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            icon={addForm.processing ? undefined : UserPlus}
                            loading={addForm.processing}
                            onClick={handleAddSubmit}
                        >
                            Create Account
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <Label required>Full Name</Label>
                        <Input
                            type="text"
                            value={addForm.data.name}
                            error={addForm.errors.name}
                            onChange={(e) => addForm.setData('name', e.target.value)}
                            placeholder="e.g. Inspector Ricardo Santos"
                            required
                        />
                        <ErrorText>{addForm.errors.name}</ErrorText>
                        <p className="mt-1.5 text-[11px] text-tmo-subtle">Employee ID is generated automatically once the account is created.</p>
                    </div>

                    <div>
                        <Label>Position / Designation</Label>
                        <Input
                            type="text"
                            value={addForm.data.position}
                            error={addForm.errors.position}
                            onChange={(e) => addForm.setData('position', e.target.value)}
                            placeholder="e.g. TMO Inspector"
                        />
                        <ErrorText>{addForm.errors.position}</ErrorText>
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
                        <Label>Address</Label>
                        <Input
                            type="text"
                            value={addForm.data.address}
                            error={addForm.errors.address}
                            onChange={(e) => addForm.setData('address', e.target.value)}
                            placeholder="e.g. Barangay Poblacion 1, Nasugbu, Batangas"
                        />
                        <ErrorText>{addForm.errors.address}</ErrorText>
                    </div>

                    <div>
                        <Label required>Official Email Address</Label>
                        <Input
                            type="email"
                            value={addForm.data.email}
                            error={addForm.errors.email}
                            onChange={(e) => addForm.setData('email', e.target.value)}
                            placeholder="e.g. tmo.rsantos@trivora.gov.ph"
                            required
                        />
                        <ErrorText>{addForm.errors.email}</ErrorText>
                    </div>

                    <div>
                        <Label required>Initial Password</Label>
                        <Input
                            type="password"
                            value={addForm.data.password}
                            error={addForm.errors.password}
                            onChange={(e) => addForm.setData('password', e.target.value)}
                            placeholder="Enter secure initial password"
                            required
                        />
                        <ErrorText>{addForm.errors.password}</ErrorText>
                    </div>

                    <label className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                        <input
                            type="checkbox"
                            checked={addForm.data.is_active}
                            onChange={(e) => addForm.setData('is_active', e.target.checked)}
                            className="h-4 w-4 accent-[#1D2542]"
                        />
                        Activate account immediately upon creation
                    </label>
                </div>
            </Modal>

            {/* ══════════════ EDIT STAFF MODAL ══════════════ */}
            <Modal
                show={editModalOpen && !!editingUser}
                onClose={() => setEditModalOpen(false)}
                title="Edit TMO Staff Account"
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
                {editingUser && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <Label required>Full Name</Label>
                            <Input
                                type="text"
                                value={editForm.data.name}
                                error={editForm.errors.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                required
                            />
                            <ErrorText>{editForm.errors.name}</ErrorText>
                        </div>

                        <div>
                            <Label>Employee ID</Label>
                            <Input
                                type="text"
                                value={editingUser.employee_id || '— not yet assigned —'}
                                disabled
                                className="disabled:cursor-not-allowed disabled:bg-tmo-bg disabled:text-tmo-subtle"
                            />
                            <p className="mt-1.5 text-[11px] text-tmo-subtle">System-generated. Cannot be changed.</p>
                        </div>

                        <div>
                            <Label>Position / Designation</Label>
                            <Input
                                type="text"
                                value={editForm.data.position}
                                error={editForm.errors.position}
                                onChange={(e) => editForm.setData('position', e.target.value)}
                                placeholder="e.g. TMO Inspector"
                            />
                            <ErrorText>{editForm.errors.position}</ErrorText>
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
                            <Label>Address</Label>
                            <Input
                                type="text"
                                value={editForm.data.address}
                                error={editForm.errors.address}
                                onChange={(e) => editForm.setData('address', e.target.value)}
                                placeholder="e.g. Barangay Poblacion 1, Nasugbu, Batangas"
                            />
                            <ErrorText>{editForm.errors.address}</ErrorText>
                        </div>

                        <div>
                            <Label required>Official Email Address</Label>
                            <Input
                                type="email"
                                value={editForm.data.email}
                                error={editForm.errors.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                                required
                            />
                            <ErrorText>{editForm.errors.email}</ErrorText>
                        </div>

                        <div>
                            <Label>New Password (leave blank to keep unchanged)</Label>
                            <Input
                                type="password"
                                value={editForm.data.password}
                                error={editForm.errors.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                                placeholder="Optional: enter new password"
                            />
                            <ErrorText>{editForm.errors.password}</ErrorText>
                        </div>

                        {!editingUser.is_current_user && (
                            <label className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                                <input
                                    type="checkbox"
                                    checked={editForm.data.is_active}
                                    onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                    className="h-4 w-4 accent-[#1D2542]"
                                />
                                Account is active
                            </label>
                        )}
                    </div>
                )}
            </Modal>
        </TrivoraLayout>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBCOMPONENTS: Table Row, Mobile Card & Status Pill
───────────────────────────────────────────────────────────────────────── */

function getInitials(name) {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusPill({ user, onToggleStatus }) {
    const isActive = user.is_active;
    return (
        <button
            type="button"
            onClick={() => onToggleStatus(user)}
            title={user.is_current_user ? 'You cannot deactivate your own account' : 'Click to toggle status'}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs transition-colors ${
                isActive
                    ? 'border border-emerald-200/90 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                    : 'border border-rose-200/90 bg-rose-50 text-rose-700 hover:bg-rose-100/70'
            }`}
        >
            {isActive ? 'Active' : 'Inactive'}
        </button>
    );
}

function DesktopStaffRow({ user, onEdit, onToggleStatus, onDelete }) {
    const initials = getInitials(user.name);

    return (
        <tr className="group transition-colors hover:bg-slate-50/80">
            {/* Column 1: Staff Member */}
            <td className="py-3.5 pl-5 pr-3 align-middle">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D2542] text-[11px] font-bold text-white">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs sm:text-[13px] font-semibold text-slate-900 group-hover:text-slate-950">
                                {user.name}
                            </p>
                            {user.is_current_user && (
                                <span className="rounded bg-[#1D2542] px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wide text-white">
                                    You
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{user.email}</p>
                    </div>
                </div>
            </td>

            {/* Column 2: Position & Employee ID */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col gap-1">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        <ShieldCheck size={12} strokeWidth={2.2} className="text-slate-400" />
                        {user.position || user.role_label || 'TMO Personnel'}
                    </span>
                    {user.employee_id ? (
                        <span className="font-mono text-[10.5px] text-slate-400">ID: {user.employee_id}</span>
                    ) : (
                        <span className="text-[10.5px] text-slate-300">No employee ID</span>
                    )}
                </div>
            </td>

            {/* Column 3: Contact */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    {user.contact_number ? (
                        <a href={`tel:${user.contact_number}`} className="text-xs font-semibold text-slate-800 hover:text-[#1D2542]">
                            {user.contact_number}
                        </a>
                    ) : (
                        <span className="text-xs text-slate-300">No contact number</span>
                    )}
                    <span className="mt-0.5 truncate text-[11px] text-slate-400 max-w-[160px]">
                        {user.address || 'No address on file'}
                    </span>
                </div>
            </td>

            {/* Column 4: Status */}
            <td className="py-3.5 px-4 align-middle">
                <StatusPill user={user} onToggleStatus={onToggleStatus} />
            </td>

            {/* Column 5: Joined */}
            <td className="py-3.5 px-4 align-middle">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">{user.created_at}</span>
                    <span className="mt-0.5 text-[11px] text-slate-400">{user.created_ago}</span>
                </div>
            </td>

            {/* Column 6: Actions */}
            <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={() => onEdit(user)}
                        title="Edit staff account"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <Edit2 size={14} strokeWidth={2.2} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(user)}
                        disabled={user.is_current_user}
                        title={user.is_current_user ? 'You cannot delete your own account' : 'Delete staff account'}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-40"
                    >
                        <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function MobileStaffCard({ user, onEdit, onToggleStatus, onDelete }) {
    const initials = getInitials(user.name);

    return (
        <div className={`rounded-2xl border border-slate-200/70 bg-white p-3.5 transition-all hover:border-slate-300 ${CARD_SHADOW}`}>
            {/* Top Row: Staff & Status */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D2542] text-[10px] font-bold text-white">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
                            {user.is_current_user && (
                                <span className="rounded bg-[#1D2542] px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wide text-white shrink-0">
                                    You
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <StatusPill user={user} onToggleStatus={onToggleStatus} />
            </div>

            {/* Email & Position */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
                <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                    <ShieldCheck size={10} strokeWidth={2.2} className="text-slate-400" />
                    {user.position || 'TMO Personnel'}
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
                    <span className="font-mono text-[10.5px] text-slate-400">ID: {user.employee_id}</span>
                )}
            </div>

            {/* Joined Row */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <span className="text-[11px] font-medium text-slate-500">Joined {user.created_at}</span>
                <span className="text-[10px] text-slate-400">{user.created_ago}</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 active:scale-[0.98]"
                >
                    <Edit2 size={13} strokeWidth={2.2} />
                    <span>Edit</span>
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(user)}
                    disabled={user.is_current_user}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-semibold text-rose-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                >
                    <Trash2 size={13} strokeWidth={2.2} />
                    <span>Delete</span>
                </button>
            </div>
        </div>
    );
}
