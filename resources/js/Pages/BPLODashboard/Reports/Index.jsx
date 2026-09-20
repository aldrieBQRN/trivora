import React from 'react';
import { Head, router } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import { LayoutDashboard, TrendingUp, Tag, FileText } from 'lucide-react';
import OverviewTab from './OverviewTab';
import TrendsTab from './TrendsTab';
import ReleasingTab from './ReleasingTab';
import RecordsTab from './RecordsTab';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const TABS = [
    { value: 'overview',  label: 'Overview',               icon: LayoutDashboard },
    { value: 'trends',    label: 'Processing Trends',       icon: TrendingUp },
    { value: 'releasing', label: 'Sticker / Plate Releasing', icon: Tag },
    { value: 'records',   label: 'Detailed Records',        icon: FileText },
];

export default function BPLOReportsIndex({ tab, from, to, filters, todaZones, statusOptions, reportData }) {
    const visit = (params) => {
        router.get(route('bplo.reports'), { tab, from, to, ...filters, ...params }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleTabChange = (nextTab) => {
        // Filters are tab-specific — don't carry a records-only search/status filter into the
        // trends or releasing tabs, etc.
        router.get(route('bplo.reports'), { tab: nextTab, from, to }, {
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

    const handleClearFilters = () => {
        router.get(route('bplo.reports'), { tab, from, to }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <BPLOLayout title="Reports & Analytics" role="BPLO Officer">
            <Head title="Reports & Analytics | TRIVORA" />

            <div className="mb-6 border-b border-slate-200/80 pb-5">
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                    Reports &amp; Analytics
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                    Franchise application pipeline, sticker/plate releasing, and processing trends — historical view, not a live snapshot.
                </p>
            </div>

            <div className={`mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-1.5 print:hidden ${CARD_SHADOW}`}>
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
                                    ? 'bg-[#1D2542] text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                            }`}
                        >
                            <Icon size={15} strokeWidth={2.2} />
                            <span className="whitespace-nowrap">{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {tab === 'overview' && <OverviewTab data={reportData} />}

            {tab === 'trends' && (
                <TrendsTab from={from} to={to} data={reportData} onDateChange={handleDateChange} />
            )}

            {tab === 'releasing' && (
                <ReleasingTab from={from} to={to} data={reportData} onDateChange={handleDateChange} />
            )}

            {tab === 'records' && (
                <RecordsTab
                    filters={filters}
                    todaZones={todaZones}
                    statusOptions={statusOptions}
                    data={reportData}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                />
            )}
        </BPLOLayout>
    );
}
