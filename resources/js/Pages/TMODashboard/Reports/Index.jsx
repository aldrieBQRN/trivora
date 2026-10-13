import React, { useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { DateRangeFilter } from '@/Components/TMO';
import { ShieldAlert, FileText, Bike, Download } from 'lucide-react';
import ExportDialog from '@/Components/ExportDialog';
import ViolationsTab from './ViolationsTab';
import ApplicationsTab from './ApplicationsTab';
import FleetTab from './FleetTab';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TABS = [
    { value: 'violations',   label: 'Violations & Compliance',   icon: ShieldAlert },
    { value: 'applications', label: 'Franchise & Applications',  icon: FileText },
    { value: 'fleet',        label: 'Fleet & Registry',          icon: Bike },
];

const EXPORT_LABELS = {
    violations:   'Violations & Compliance',
    applications: 'Franchise & Applications',
    fleet:        'Fleet & Registry',
};

/**
 * TMO Reports & Analytics — historical trends and municipal operations analytics
 * with responsive layout, Plus Jakarta Sans typography, and clean municipal phrasing.
 */
export default function ReportsIndex({ tab, from, to, filters, reportData }) {
    useBackgroundRefresh(['reportData']);
    const [exportOpen, setExportOpen] = useState(false);
    const tabsRef = useRef(null);

    // Slide the active tab to the center of the tab bar (only matters when it overflows).
    useEffect(() => {
        const container = tabsRef.current;
        const active = container?.querySelector('[aria-current="page"]');
        if (!container || !active) return;
        container.scrollTo({
            left: active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2,
            behavior: 'smooth',
        });
    }, [tab]);

    const visit = (params) => {
        router.get(route('tmo.reports'), { tab, from, to, ...filters, ...params }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleTabChange = (nextTab) => {
        if (nextTab === tab) return;
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

    const exportUrl =
        tab === 'applications'
            ? route('tmo.reports.export-applications-excel', { from, to, ...filters })
            : tab === 'fleet'
                ? route('tmo.reports.export-fleet-excel', { from, to, ...filters })
                : route('tmo.reports.export-violations-excel', { from, to, ...filters });

    return (
        <TrivoraLayout title="Reports & Analytics" role="TMO Officer">
            <Head title="Reports & Analytics | TRIVORA" />

            {/* ══════════════════════════════════════════════════════════════
                1. HEADER (Consistent with Registry & Violations)
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                <div>
                    <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                        Reports &amp; Analytics
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                        Official municipal intelligence, color coding enforcement trends, and tricycle franchise records in Nasugbu.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setExportOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <Download size={15} strokeWidth={2.2} className="text-white" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. SEGMENTED REPORT TABS
               ══════════════════════════════════════════════════════════════ */}
            <div ref={tabsRef} className="relative mb-5 flex w-fit max-w-full items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden print:hidden">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = t.value === tab;
                    return (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => handleTabChange(t.value)}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all shrink-0 font-['Plus_Jakarta_Sans',sans-serif] ${
                                active
                                    ? 'bg-[#182B62] text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <Icon size={15} strokeWidth={2.2} />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. FILTER TOOLBAR CARD
               ══════════════════════════════════════════════════════════════ */}
            <div className={`mb-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW} print:hidden`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 font-['Plus_Jakarta_Sans',sans-serif]">
                        {tab === 'violations' && (
                            <select
                                value={filters.violation_status || ''}
                                onChange={(e) => handleFilterChange('violation_status', e.target.value)}
                                className="h-10 w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                <option value="">All Settlement Statuses</option>
                                <option value="pending">Unsettled</option>
                                <option value="settled">Settled</option>
                            </select>
                        )}

                        {tab === 'applications' && (
                            <select
                                value={filters.application_type || ''}
                                onChange={(e) => handleFilterChange('application_type', e.target.value)}
                                className="h-10 w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                <option value="">All Application Types</option>
                                <option value="new">First-Time Franchise</option>
                                <option value="renewal">Franchise Renewal</option>
                            </select>
                        )}

                        {tab === 'fleet' && (
                            <select
                                value={filters.tricycle_status || ''}
                                onChange={(e) => handleFilterChange('tricycle_status', e.target.value)}
                                className="h-10 w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
                            >
                                <option value="">All Fleet Statuses</option>
                                <option value="active">Active Franchise</option>
                                <option value="suspended">Suspended</option>
                                <option value="revoked">Revoked</option>
                                <option value="unregistered">Unregistered</option>
                            </select>
                        )}

                        <DateRangeFilter from={from} to={to} onChange={handleDateChange} />
                    </div>

                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. ACTIVE REPORT CONTENT
               ══════════════════════════════════════════════════════════════ */}
            <div>
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
            <ExportDialog
                show={exportOpen}
                onClose={() => setExportOpen(false)}
                title={`Export ${EXPORT_LABELS[tab] || 'Report'}`}
                recordLabel={`${EXPORT_LABELS[tab] || 'report'} report`}
                scopeNote={from && to ? `${from} – ${to}` : 'All Recorded Dates'}
                exportUrl={exportUrl}
                fallbackName={`trivora_${tab}_report`}
            />
        </TrivoraLayout>
    );
}

