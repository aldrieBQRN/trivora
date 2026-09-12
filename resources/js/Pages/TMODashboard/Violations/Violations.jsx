import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ShieldAlert, AlertCircle, CheckCircle2, Clock, ChevronRight, FileText, Download,
} from 'lucide-react';
import {
    PageHeader, KpiCard, KpiGrid, StatusBadge, SearchInput, FilterPills,
    Table, Thead, Tbody, Tr, Td, EmptyState, Button,
} from '@/Components/TMO';

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'unsettled', label: 'Unsettled' },
    { value: 'settled', label: 'Settled' },
];

export default function Violations({ initialViolations = [] }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Export handler
    const handleExport = () => {
        const csvContent = [
            ['Incident ID', 'Date', 'Time', 'Operator', 'Plate No', 'TODA', 'Type', 'Source', 'Fine', 'Status'],
            ...violations.map(v => [v.id, v.date, v.time, v.operator, v.plate_no, v.toda, v.type, v.source, v.fine, v.status])
        ]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `Violation_Records_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Violations Data (Dynamic with Mock fallback)
    const violations = initialViolations.length > 0 ? initialViolations : [
        {
            id: 'VIO-26-8841',
            date: '2026-04-05',
            time: '08:45 AM',
            operator: 'Ricardo Dalisay',
            plate_no: '8812',
            toda: 'TODA BUCANA',
            type: 'Coding Violation',
            source: 'Location Tracker',
            fine: 500,
            status: 'unsettled'
        },
        {
            id: 'VIO-26-8839',
            date: '2026-04-04',
            time: '02:15 PM',
            operator: 'Juan Dela Cruz',
            plate_no: '4491',
            toda: 'TODA BRGY. 6',
            type: 'Coding Violation',
            source: 'Location Tracker',
            fine: 500,
            status: 'unsettled'
        },
        {
            id: 'VIO-26-8710',
            date: '2026-04-01',
            time: '11:20 AM',
            operator: 'Mario Santos',
            plate_no: '2245',
            toda: 'TODA BRGY 11',
            type: 'Coding Violation',
            source: 'Location Tracker',
            fine: 500,
            status: 'settled'
        },
    ];

    const filtered = violations.filter(v => {
        const q = query.toLowerCase();
        const matchesQuery = !q ||
            v.id.toLowerCase().includes(q) ||
            v.operator.toLowerCase().includes(q) ||
            v.plate_no.includes(query);
        const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    const unsettledCount = violations.filter(v => v.status === 'unsettled').length;
    const settledCount = violations.filter(v => v.status === 'settled').length;

    return (
        <TrivoraLayout title="Violation Records" role="TMO Officer">
            <Head title="Violation Records | TRIVORA" />

            <PageHeader
                eyebrow="Enforcement Records"
                title="Coding Violations"
                subtitle="Database of detected coding scheme violations"
                actions={
                    <Button as={Link} href={route('tmo.violations.create')} variant="dangerSolid" icon={ShieldAlert}>
                        File Violation Ticket
                    </Button>
                }
            />

            <KpiGrid cols={3}>
                <KpiCard label="Total Records" value={violations.length} icon={ShieldAlert} tone="danger" />
                <KpiCard label="Unsettled Fines" value={unsettledCount} icon={AlertCircle} tone="warning" />
                <KpiCard label="Settled & Cleared" value={settledCount} icon={CheckCircle2} tone="success" />
            </KpiGrid>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Search by ID, Operator, or Plate No…"
                    className="w-full sm:w-80"
                />
                <div className="flex flex-wrap items-center gap-2">
                    <FilterPills options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
                    <Button variant="secondary" icon={Download} onClick={handleExport}>
                        Export CSV
                    </Button>
                </div>
            </div>

            <Table>
                <Thead>
                    <th>Incident / Date</th>
                    <th>Plate Number</th>
                    <th>Tricycle Driver &amp; TODA</th>
                    <th>Violation</th>
                    <th>Fine &amp; Status</th>
                    <th className="text-right">Action</th>
                </Thead>
                <Tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={6}>
                                <EmptyState
                                    icon={FileText}
                                    title={query || statusFilter !== 'all' ? 'No records found' : 'No Violations Recorded'}
                                    description={query || statusFilter !== 'all' ? 'Try a different keyword or status filter.' : 'All clear for now.'}
                                />
                            </td>
                        </tr>
                    ) : (
                        filtered.map(v => <ViolationRow key={v.id} record={v} />)
                    )}
                </Tbody>
            </Table>
        </TrivoraLayout>
    );
}

function ViolationRow({ record }) {
    return (
        <Tr>
            <Td>
                <span className="mb-1.5 inline-block rounded-md border border-tmo-border bg-tmo-bg px-2.5 py-1 text-[11px] font-bold text-tmo-ink">
                    {record.id}
                </span>
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-tmo-muted">
                    <Clock size={10} strokeWidth={2.5} />
                    {record.date} • {record.time}
                </p>
            </Td>
            <Td>
                <span className="inline-block rounded-md border border-tmo-border bg-tmo-bg px-2.5 py-1 text-[11px] font-bold text-tmo-ink">
                    {record.plate_no}
                </span>
            </Td>
            <Td>
                <p className="text-[13.5px] font-semibold text-tmo-ink">{record.operator}</p>
                <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-tmo-muted">{record.toda}</p>
            </Td>
            <Td>
                <p className="text-[12.5px] font-semibold text-red-800">{record.type}</p>
                <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-tmo-muted">{record.source}</p>
            </Td>
            <Td>
                <p className="mb-1.5 text-[15px] font-bold text-tmo-ink">₱{record.fine.toFixed(2)}</p>
                {record.status === 'unsettled' ? (
                    <StatusBadge variant="warning" icon={AlertCircle}>Unsettled</StatusBadge>
                ) : (
                    <StatusBadge variant="success" icon={CheckCircle2}>Settled</StatusBadge>
                )}
            </Td>
            <Td className="text-right">
                <Button as={Link} href={`/violations/${record.db_id}`} variant="primary" size="sm" icon={ChevronRight} iconPosition="right">
                    View Details
                </Button>
            </Td>
        </Tr>
    );
}
