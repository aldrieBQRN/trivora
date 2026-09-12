import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ClipboardCheck, Bike, ChevronRight, Clock, Gauge, Inbox, Printer,
} from 'lucide-react';
import {
    PageHeader, KpiCard, KpiGrid, StatusBadge, SearchInput, FilterPills,
    Table, Thead, Tbody, Tr, Td, EmptyState, Button,
} from '@/Components/TMO';

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Reinspection', label: 'Re-inspection' },
    { value: 'Passed', label: 'Passed' },
];

function bucketOf(app) {
    const isPassed = app.status === 'Passed' || app.raw_status === 'pending_payment';
    if (isPassed) return 'Passed';
    if (app.status === 'Scheduled') return 'Scheduled';
    return 'Reinspection';
}

export default function PhysicalQueue({
    applications = [],
    scheduledCount = 0,
    reinspectionCount = 0,
    passedCount = 0,
    completedTodayCount = 0,
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = applications.filter(a => {
        const q = query.toLowerCase();
        const matchesQuery = !q ||
            String(a.id).toLowerCase().includes(q) ||
            (a.reference && a.reference.toLowerCase().includes(q)) ||
            a.operator.toLowerCase().includes(q) ||
            a.status.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'all' || bucketOf(a) === statusFilter;
        return matchesQuery && matchesStatus;
    });

    return (
        <TrivoraLayout title="Physical Inspection Queue" role="TMO Officer">
            <Head title="Physical Inspection | TRIVORA" />

            <PageHeader
                eyebrow="TMO Operations"
                title="Physical Inspection"
                subtitle="Phase 2 · On-site testing, vehicle verification & payment ticket issuance"
            />

            <KpiGrid cols={4}>
                <KpiCard label="Scheduled" value={scheduledCount} icon={ClipboardCheck} tone="primary" />
                <KpiCard label="Payment Tickets Ready" value={passedCount} icon={Printer} tone="success" />
                <KpiCard label="Inspected Today" value={completedTodayCount} icon={ClipboardCheck} tone="info" />
                <KpiCard label="Re-inspection" value={reinspectionCount} icon={Clock} tone="warning" />
            </KpiGrid>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Search by name or reference number…"
                    className="w-full sm:w-80"
                />
                <FilterPills options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
            </div>

            <Table>
                <Thead>
                    <th>Reference Number</th>
                    <th>Tricycle Driver</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                </Thead>
                <Tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={5}>
                                <EmptyState
                                    icon={Inbox}
                                    title={query || statusFilter !== 'all' ? 'No results found' : 'No Scheduled Inspections'}
                                    description={query || statusFilter !== 'all' ? 'Try a different name, reference, or status filter.' : 'Queue is currently empty.'}
                                />
                            </td>
                        </tr>
                    ) : (
                        filtered.map(app => <QueueRow key={app.id} app={app} />)
                    )}
                </Tbody>
            </Table>

            <div className="mt-6 flex items-start gap-4 rounded-xl border border-tmo-primary/15 bg-tmo-primarySoft p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-tmo-primary/20 bg-white text-tmo-primary">
                    <Gauge size={18} strokeWidth={1.8} />
                </div>
                <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-tmo-primary">TMO Field Protocol</p>
                    <p className="text-xs leading-relaxed text-tmo-ink">
                        Inspect units only when the Tricycle Driver is physically present.
                        Ensure safety gear is also verified during the road test.
                    </p>
                </div>
            </div>
        </TrivoraLayout>
    );
}

function QueueRow({ app }) {
    const bucket = bucketOf(app);
    const isPassed = bucket === 'Passed';

    return (
        <Tr>
            <Td>
                <span className="inline-block rounded-md border border-tmo-primary/20 bg-tmo-primarySoft px-2.5 py-1 text-[11px] font-bold text-tmo-primary">
                    {app.reference}
                </span>
            </Td>
            <Td>
                <p className="text-[13.5px] font-semibold text-tmo-ink">{app.operator}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tmo-muted">
                    <Bike size={11} strokeWidth={2} />
                    {app.make}
                </p>
            </Td>
            <Td>
                <p className="text-[12.5px] font-semibold text-tmo-ink">{app.scheduled_date}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tmo-muted">
                    <Clock size={10} strokeWidth={2} />
                    {app.time_slot}
                </p>
            </Td>
            <Td>
                {isPassed ? (
                    <StatusBadge variant="success">Passed (Ticket Issued)</StatusBadge>
                ) : bucket === 'Scheduled' ? (
                    <StatusBadge variant="info">{app.status}</StatusBadge>
                ) : (
                    <StatusBadge variant="warning">{app.status}</StatusBadge>
                )}
            </Td>
            <Td className="text-right">
                {isPassed ? (
                    <Button as={Link} href={`/tmo/ticket/${app.id}`} variant="success" size="sm" icon={Printer}>
                        Print Ticket
                    </Button>
                ) : (
                    <Button as={Link} href={`/tmo/review/physical/${app.id}`} variant="primary" size="sm" icon={ChevronRight} iconPosition="right">
                        Start Inspection
                    </Button>
                )}
            </Td>
        </Tr>
    );
}
