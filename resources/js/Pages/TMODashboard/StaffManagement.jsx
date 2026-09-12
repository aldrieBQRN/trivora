import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    Users, UserPlus, ShieldCheck, CheckCircle2, XCircle, Clock,
    Edit2, Trash2, AlertCircle,
} from 'lucide-react';
import {
    PageHeader, KpiCard, KpiGrid, StatusBadge, SearchInput, FilterPills,
    Table, Thead, Tbody, Tr, Td, EmptyState, Button, IconButton,
    Modal, Label, ErrorText, Input,
} from '@/Components/TMO';

const STATUS_FILTERS = (stats) => [
    { value: 'all', label: 'All Staff', count: stats.total },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'inactive', label: 'Inactive', count: stats.inactive },
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

    // Form for Adding Staff
    const addForm = useForm({
        name: '',
        email: '',
        password: '',
        is_active: true,
    });

    // Form for Editing Staff
    const editForm = useForm({
        name: '',
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

    // Open Edit Modal
    const handleOpenEdit = (user) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
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

    return (
        <TrivoraLayout title="Staff Management" role="TMO Officer">
            <Head title="TMO Staff Management | TRIVORA" />

            <PageHeader
                eyebrow="TMO Administration"
                title="TMO Staff Management"
                subtitle="Manage Traffic Management Office personnel, inspectors, and desk review staff accounts."
                actions={
                    <Button variant="primary" icon={UserPlus} onClick={() => setAddModalOpen(true)}>
                        Add TMO Staff Member
                    </Button>
                }
            />

            <KpiGrid cols={4}>
                <KpiCard label="Total TMO Staff" value={stats.total} icon={Users} tone="primary" />
                <KpiCard label="Active Officers" value={stats.active} icon={CheckCircle2} tone="success" />
                <KpiCard label="Inactive Accounts" value={stats.inactive} icon={XCircle} tone="danger" />
                <KpiCard label="Joined This Month" value={stats.new_this_month} icon={Clock} tone="warning" />
            </KpiGrid>

            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-tmo-border bg-tmo-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <FilterPills options={STATUS_FILTERS(stats)} value={filter} onChange={handleFilter} />
                <SearchInput value={search} onChange={handleSearch} placeholder="Search by name or email..." className="w-full sm:w-72" />
            </div>

            {users.length === 0 ? (
                <div className="rounded-xl border border-tmo-border bg-tmo-surface">
                    <EmptyState
                        icon={AlertCircle}
                        title="No Staff Accounts Found"
                        description={search ? `No accounts match the search term "${search}".` : 'No staff accounts currently recorded.'}
                    />
                </div>
            ) : (
                <Table>
                    <Thead>
                        <th>Staff Member</th>
                        <th>Department Role</th>
                        <th>Status</th>
                        <th>Joined Date</th>
                        <th className="text-right">Actions</th>
                    </Thead>
                    <Tbody>
                        {users.map((u) => (
                                <Tr key={u.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tmo-primary text-sm font-bold text-white">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13.5px] font-bold text-tmo-ink">{u.name}</span>
                                                    {u.is_current_user && (
                                                        <span className="rounded bg-tmo-primarySoft px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-tmo-primary">You</span>
                                                    )}
                                                </div>
                                                <div className="mt-0.5 text-xs text-tmo-muted">{u.email}</div>
                                            </div>
                                        </div>
                                    </Td>

                                    <Td>
                                        <span className="inline-flex items-center gap-1.5 rounded-md border border-tmo-border bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-gray-700">
                                            <ShieldCheck size={12} className="text-tmo-primary" />
                                            TMO Personnel
                                        </span>
                                    </Td>

                                    <Td>
                                        <StatusBadge
                                            variant={u.is_active ? 'success' : 'danger'}
                                            icon={u.is_active ? CheckCircle2 : XCircle}
                                            onClick={() => handleToggleStatus(u)}
                                            title={u.is_current_user ? 'Cannot deactivate self' : 'Click to toggle status'}
                                        >
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </StatusBadge>
                                    </Td>

                                    <Td>
                                        <div className="text-xs text-tmo-muted">{u.created_at}</div>
                                        <div className="text-[11px] text-tmo-subtle">{u.created_ago}</div>
                                    </Td>

                                    <Td className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <IconButton icon={Edit2} label="Edit Staff Account" onClick={() => handleOpenEdit(u)} />
                                            <IconButton
                                                icon={Trash2}
                                                variant="danger"
                                                label={u.is_current_user ? 'Cannot delete self' : 'Delete Staff Account'}
                                                disabled={u.is_current_user}
                                                onClick={() => handleDeleteUser(u)}
                                            />
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                    </Tbody>
                </Table>
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

                    <label className="flex items-center gap-2.5 text-[13px] font-semibold text-tmo-ink">
                        <input
                            type="checkbox"
                            checked={addForm.data.is_active}
                            onChange={(e) => addForm.setData('is_active', e.target.checked)}
                            className="h-4 w-4 accent-tmo-primary"
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
                            <Label>New Password (Leave blank to keep unchanged)</Label>
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
                            <label className="flex items-center gap-2.5 text-[13px] font-semibold text-tmo-ink">
                                <input
                                    type="checkbox"
                                    checked={editForm.data.is_active}
                                    onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                    className="h-4 w-4 accent-tmo-primary"
                                />
                                Account is Active
                            </label>
                        )}
                    </div>
                )}
            </Modal>
        </TrivoraLayout>
    );
}
