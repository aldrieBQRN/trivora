import React from 'react';
import { Head, router } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { PageHeader } from '@/Components/TMO';
import { ShieldAlert, FileText, Bike, Wallet } from 'lucide-react';
import ViolationsTab from './ViolationsTab';
import ApplicationsTab from './ApplicationsTab';
import FleetTab from './FleetTab';
import CollectionsTab from './CollectionsTab';

// Shared soft, layered shadow — same elevation token used across the redesigned TMO pages.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TABS = [
    { value: 'violations',   label: 'Violations & Compliance',   icon: ShieldAlert },
    { value: 'applications', label: 'Franchise & Applications',  icon: FileText },
    { value: 'fleet',        label: 'Fleet & Registry',          icon: Bike },
    { value: 'collections',  label: 'Collections',               icon: Wallet },
];

export default function ReportsIndex({ tab, from, to, filters, todaZones, reportData }) {
    const visit = (params) => {
        router.get(route('tmo.reports'), { tab, from, to, ...filters, ...params }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleTabChange = (nextTab) => {
        // Filters are tab-specific — don't carry a violation-only filter into the fleet tab, etc.
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

    return (
        <TrivoraLayout title="Reports & Analytics" role="TMO Officer">
            <Head title="Reports & Analytics | TRIVORA" />

            <PageHeader
                title="Reports & Analytics"
                subtitle="Historical trends and municipal operations analytics — not a live snapshot."
            />

            <div className={`mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-tmo-border/70 bg-tmo-bg p-1.5 print:hidden ${CARD_SHADOW}`}>
                {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = t.value === tab;
                    return (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => handleTabChange(t.value)}
                            className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors sm:flex-none ${
                                active
                                    ? 'bg-tmo-primary text-white shadow-sm'
                                    : 'text-tmo-muted hover:bg-white hover:text-tmo-ink'
                            }`}
                        >
                            <Icon size={15} strokeWidth={2.2} />
                            <span className="whitespace-nowrap">{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {tab === 'violations' && (
                <ViolationsTab
                    from={from}
                    to={to}
                    filters={filters}
                    todaZones={todaZones}
                    data={reportData}
                    onDateChange={handleDateChange}
                    onFilterChange={handleFilterChange}
                />
            )}

            {tab === 'applications' && (
                <ApplicationsTab
                    from={from}
                    to={to}
                    filters={filters}
                    data={reportData}
                    onDateChange={handleDateChange}
                    onFilterChange={handleFilterChange}
                />
            )}

            {tab === 'fleet' && (
                <FleetTab
                    filters={filters}
                    todaZones={todaZones}
                    data={reportData}
                    onFilterChange={handleFilterChange}
                />
            )}

            {tab === 'collections' && (
                <CollectionsTab
                    from={from}
                    to={to}
                    data={reportData}
                    onDateChange={handleDateChange}
                />
            )}
        </TrivoraLayout>
    );
}
