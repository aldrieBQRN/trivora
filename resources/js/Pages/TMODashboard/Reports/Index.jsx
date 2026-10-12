import React from 'react';
import { Head, router } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { DateRangeFilter } from '@/Components/TMO';
import { ShieldAlert, FileText, Bike, FileSpreadsheet } from 'lucide-react';
import ViolationsTab from './ViolationsTab';
import ApplicationsTab from './ApplicationsTab';
import FleetTab from './FleetTab';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TABS = [
    { value: 'violations',   label: 'Violations & Compliance',   icon: ShieldAlert },
    { value: 'applications', label: 'Franchise & Applications',  icon: FileText },
    { value: 'fleet',        label: 'Fleet & Registry',          icon: Bike },
];

/**
 * TMO Reports & Analytics — historical trends and municipal operations analytics
 * with responsive layout, Plus Jakarta Sans typography, and clean municipal phrasing.
 */
export default function ReportsIndex({ tab, from, to, filters, reportData }) {
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
                    <a
                        href={exportUrl}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
                    >
                        <FileSpreadsheet size={14} className="text-emerald-600" />
                        <span>Export to Excel</span>
                    </a>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. SEGMENTED REPORT TABS
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-5 flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 custom-scrollbar print:hidden">
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
                                <option value="pending">Pending Payment</option>
                                <option value="settled">Settled / Paid</option>
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

                    <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                        <a
                            href={exportUrl}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
                        >
                            <FileSpreadsheet size={14} className="text-emerald-600" />
                            <span>Download Report Excel</span>
                        </a>
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
        </TrivoraLayout>
    );
}

