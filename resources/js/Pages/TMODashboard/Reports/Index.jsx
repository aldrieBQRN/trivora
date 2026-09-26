import React from 'react';
import { Head, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { PageHeader, DateRangeFilter } from '@/Components/TMO';
import { ShieldAlert, FileText, Bike, FileSpreadsheet } from 'lucide-react';
import ViolationsTab from './ViolationsTab';
import ApplicationsTab from './ApplicationsTab';
import FleetTab from './FleetTab';

const TABS = [
    { value: 'violations',   label: 'Violations & Compliance',   icon: ShieldAlert },
    { value: 'applications', label: 'Franchise & Applications',  icon: FileText },
    { value: 'fleet',        label: 'Fleet & Registry',          icon: Bike },
];

/**
 * TMO Reports & Analytics — one report per tab (Violations / Franchise Applications /
 * Fleet & Registry), switched the same way as the BPLO Reports page: the active tab's
 * data is the only thing computed server-side, so the officer reviews one report at a
 * time instead of scrolling a single long page.
 */
export default function ReportsIndex({ tab, from, to, filters, reportData }) {
    // Background refresh of the summary/counters only. The active tab, date range and filters are
    // all read from the URL, which a partial reload re-reads unchanged, so the selected view never
    // shifts under the user; the detailed Excel exports stay on their own routes.
    useBackgroundRefresh(['reportData']);

    const visit = (params) => {
        router.get(route('tmo.reports'), { tab, from, to, ...filters, ...params }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleTabChange = (nextTab) => {
        if (nextTab === tab) return;
        // Filters are tab-specific — don't carry a violations-only or fleet-only filter
        // into another report's tab.
        router.get(route('tmo.reports'), { tab: nextTab, from, to }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleDateChange = ({ from: nextFrom, to: nextTo }) => {
        visit({ from: nextFrom, to: nextTo });
    };

    const handleFilterChange = (key, value) => {
        visit({ [key]: value || undefined });
    };

    // The export button lives in the shared toolbar row above the tab content, so its
    // URL follows the active tab (each report has its own Excel export route).
    const exportUrl =
        tab === 'applications'
            ? route('tmo.reports.export-applications-excel', { from, to, ...filters })
            : tab === 'fleet'
                ? route('tmo.reports.export-fleet-excel', { from, to, ...filters })
                : route('tmo.reports.export-violations-excel', { from, to, ...filters });

    return (
        <TrivoraLayout title="Reports & Analytics" role="TMO Officer">
            <Head title="Reports & Analytics | TRIVORA" />

            <PageHeader
                title="Reports & Analytics"
                subtitle="Historical trends and municipal operations analytics."
            />

            {/* One connected panel: tab strip, filter toolbar, and the active report all share
                a single bordered shell instead of a floating pill bar sitting above a separate
                card. The active tab's white fill + primary underline is what visually ties it
                into the content beneath — no gap, no second card boundary to cross. */}
            <div className="overflow-hidden rounded-2xl border border-tmo-border bg-white shadow-sm">
                <div className="flex items-stretch overflow-x-auto bg-tmo-bg/70 print:hidden">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = t.value === tab;
                        return (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => handleTabChange(t.value)}
                                aria-current={active ? 'page' : undefined}
                                className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors sm:px-5 ${
                                    active
                                        ? 'border-tmo-primary bg-white text-tmo-primary'
                                        : 'border-transparent text-tmo-muted hover:bg-white/60 hover:text-tmo-ink'
                                }`}
                            >
                                <Icon size={15} strokeWidth={2.2} />
                                <span className="whitespace-nowrap">{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Filter toolbar — Status (or the tab's equivalent filter) | Quick Range | From
                    | To | Export, all in one compact row that wraps on narrow screens instead of
                    stacking into tall separate blocks. A hairline separates it from the report
                    below so the panel reads as controls-then-content, not one undifferentiated
                    block. */}
                <div className="flex flex-col gap-3 border-b border-tmo-border px-4 py-3.5 print:hidden sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {tab === 'violations' && (
                            <select
                                value={filters.violation_status || ''}
                                onChange={(e) => handleFilterChange('violation_status', e.target.value)}
                                className="h-9 w-full shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs font-semibold text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:w-40"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="settled">Settled/Paid</option>
                            </select>
                        )}

                        {tab === 'applications' && (
                            <select
                                value={filters.application_type || ''}
                                onChange={(e) => handleFilterChange('application_type', e.target.value)}
                                className="h-9 w-full shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs font-semibold text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:w-44"
                            >
                                <option value="">New &amp; Renewal</option>
                                <option value="new">New Franchise</option>
                                <option value="renewal">Renewal</option>
                            </select>
                        )}

                        {tab === 'fleet' && (
                            <select
                                value={filters.tricycle_status || ''}
                                onChange={(e) => handleFilterChange('tricycle_status', e.target.value)}
                                className="h-9 w-full shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs font-semibold text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:w-40"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="revoked">Revoked</option>
                                <option value="unregistered">Unregistered</option>
                            </select>
                        )}

                        <DateRangeFilter from={from} to={to} onChange={handleDateChange} />
                    </div>

                    <a
                        href={exportUrl}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-tmo-borderStrong bg-white px-3 text-xs font-semibold text-tmo-ink hover:bg-tmo-bg"
                    >
                        <FileSpreadsheet size={13} /> Export to Excel
                    </a>
                </div>

                <div className="p-4 sm:p-6">
                    {tab === 'violations' && (
                        <ViolationsTab
                            from={from}
                            to={to}
                            data={reportData.violations}
                        />
                    )}

                    {tab === 'applications' && (
                        <ApplicationsTab
                            from={from}
                            to={to}
                            data={reportData.applications}
                        />
                    )}

                    {tab === 'fleet' && (
                        <FleetTab from={from} to={to} data={reportData.fleet} />
                    )}
                </div>
            </div>
        </TrivoraLayout>
    );
}
