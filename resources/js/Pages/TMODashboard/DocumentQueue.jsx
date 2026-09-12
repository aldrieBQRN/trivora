import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    FileSearch, Clock, ChevronRight, AlertCircle, Inbox, FileText,
} from 'lucide-react';
import {
    PageHeader, KpiCard, KpiGrid, StatusBadge, SearchInput, FilterPills,
    Table, Thead, Tbody, Tr, Td, Pagination, EmptyState, Button,
} from '@/Components/TMO';

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Re-submission', label: 'Re-submission' },
];

const ITEMS_PER_PAGE = 8;

export default function DocumentQueue({
    applications = [],
    pendingCount = 0,
    reviewedTodayCount = 0,
    resubmissionCount = 0,
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const filtered = applications.filter(a => {
        const q = query.toLowerCase();
        const matchesQuery = !q ||
            String(a.id).toLowerCase().includes(q) ||
            (a.reference && a.reference.toLowerCase().includes(q)) ||
            a.operator.toLowerCase().includes(q) ||
            a.status.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleQueryChange = (val) => { setQuery(val); setCurrentPage(1); };
    const handleStatusChange = (val) => { setStatusFilter(val); setCurrentPage(1); };

    return (
        <TrivoraLayout title="Document Review Queue" role="TMO Officer">
            <Head title="Document Review | TRIVORA" />

            <PageHeader
                eyebrow="TMO Operations"
                title="Document Review"
                subtitle="Phase 1 · Review digital submissions and schedule physical testing"
            />

            <KpiGrid cols={3}>
                <KpiCard label="Pending Review" value={pendingCount} icon={FileSearch} tone="primary" />
                <KpiCard label="Reviewed Today" value={reviewedTodayCount} icon={FileText} tone="success" />
                <KpiCard label="Re-submission" value={resubmissionCount} icon={Clock} tone="warning" />
            </KpiGrid>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Search by name or reference number…"
                    className="w-full sm:w-80"
                />
                <FilterPills options={STATUS_FILTERS} value={statusFilter} onChange={handleStatusChange} />
            </div>

            <Table>
                <Thead>
                    <th>Reference Number</th>
                    <th>Tricycle Driver</th>
                    <th>Files</th>
                    <th>Submission</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                </Thead>
                <Tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={6}>
                                <EmptyState
                                    icon={Inbox}
                                    title={query || statusFilter !== 'all' ? 'No results found' : 'Queue is Empty'}
                                    description={query || statusFilter !== 'all' ? 'Try a different name, reference, or status filter.' : 'No applications are pending review.'}
                                />
                            </td>
                        </tr>
                    ) : (
                        paginated.map(app => <QueueRow key={app.id} app={app} />)
                    )}
                </Tbody>
            </Table>

            {filtered.length > 0 && (
                <div className="rounded-b-xl border border-t-0 border-tmo-border bg-tmo-surface">
                    <Pagination
                        page={activePage}
                        totalPages={totalPages}
                        totalItems={filtered.length}
                        pageSize={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            <div className="mt-6 flex items-start gap-4 rounded-xl border border-tmo-primary/15 bg-tmo-primarySoft p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-tmo-primary/20 bg-white text-tmo-primary">
                    <AlertCircle size={18} strokeWidth={1.8} />
                </div>
                <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-tmo-primary">Nasugbu TMO Policy</p>
                    <p className="text-xs leading-relaxed text-tmo-ink">
                        Verify OR/CR validity and Driver's License restriction (Code 1/A1) before scheduling.
                        Ensure all clearances are original and current.
                    </p>
                </div>
            </div>
        </TrivoraLayout>
    );
}

function QueueRow({ app }) {
    return (
        <Tr>
            <Td>
                <span className="inline-block rounded-md border border-tmo-primary/20 bg-tmo-primarySoft px-2.5 py-1 text-[11px] font-bold text-tmo-primary">
                    {app.reference}
                </span>
            </Td>
            <Td>
                <p className="text-[13.5px] font-semibold text-tmo-ink">{app.operator}</p>
                <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-tmo-muted">{app.toda}</p>
            </Td>
            <Td>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-tmo-border bg-tmo-bg px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-tmo-muted">
                    <FileText size={12} strokeWidth={2} />
                    {app.docs_count} Items
                </span>
            </Td>
            <Td>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wide text-tmo-ink">{app.submitted_at}</span>
                    <span className="text-[9.5px] font-medium text-tmo-subtle">{app.submitted_date}</span>
                </div>
            </Td>
            <Td>
                <StatusBadge variant={app.status === 'Pending' ? 'warning' : 'info'}>{app.status}</StatusBadge>
            </Td>
            <Td className="text-right">
                <Button as={Link} href={`/tmo/review/docs/${app.id}`} variant="primary" size="sm" icon={ChevronRight} iconPosition="right">
                    Start Review
                </Button>
            </Td>
        </Tr>
    );
}
