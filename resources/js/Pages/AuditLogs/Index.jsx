import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import BPLOLayout from '@/Layouts/BPLOLayout';
import { Modal } from '@/Components/TMO';
import ExportDialog from '@/Components/ExportDialog';
import {
    ScrollText, Search, X, RotateCcw, Eye, ShieldCheck,
    Users, Clock, Activity, ArrowRight,
    ChevronLeft, ChevronRight,
    Download
} from 'lucide-react';

const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

export default function Index({
    logs = { data: [], current_page: 1, last_page: 1, total: 0, per_page: 10 },
    stats = { total: 0, today: 0, staff: 0, driver: 0 },
    filters = {},
    availableModules = [],
    availableRoles = [],
    exportUrl,
    office = 'tmo',
}) {
    const { auth } = usePage().props;
    const user = auth?.user || {};

    // TMO sees its personnel and driver activity; BPLO sees only its own staff.
    const isBplo = office === 'bplo';
    const Layout = isBplo ? BPLOLayout : TrivoraLayout;
    const layoutProps = { title: 'System Activity Logs', role: isBplo ? 'BPLO Officer' : 'TMO Personnel' };

    // Cards 3 & 4: TMO splits staff vs driver activity; BPLO (staff-only log) splits by kind of work.
    const card3 = isBplo
        ? { label: 'Franchise Actions', value: stats.franchise, caption: 'Releasing & franchise issuance', metaLabel: 'Module:', meta: 'Franchise' }
        : { label: 'Staff Actions', value: stats.staff, caption: 'TMO personnel', metaLabel: 'Offices:', meta: 'TMO' };
    const card4 = isBplo
        ? { label: 'Account Activity', value: stats.account, caption: 'Sign-ins, staff & profile changes', metaLabel: 'Module:', meta: 'Access & Accounts' }
        : { label: 'Driver Actions', value: stats.driver, caption: 'Driver portal transactions', metaLabel: 'Portal:', meta: 'Driver Web App' };

    const [selectedLog, setSelectedLog] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);

    // Background refresh
    useBackgroundRefresh(['logs', 'stats'], {
        paused: Boolean(selectedLog) || exportOpen,
    });

    // Filters state
    const [search, setSearch] = useState(filters.search || '');
    const [module, setModule] = useState(filters.module || '');
    const [role, setRole] = useState(filters.role || '');
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');

    const applyFilters = (newFilters) => {
        const merged = {
            search,
            module,
            role,
            from,
            to,
            ...newFilters,
        };

        const params = {};
        Object.keys(merged).forEach((k) => {
            if (merged[k]) params[k] = merged[k];
        });

        router.get(window.location.pathname, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchChange = (val) => {
        setSearch(val);
        applyFilters({ search: val });
    };

    const handleModuleChange = (e) => {
        const val = e.target.value;
        setModule(val);
        applyFilters({ module: val });
    };

    const handleRoleChange = (e) => {
        const val = e.target.value;
        setRole(val);
        applyFilters({ role: val });
    };

    const handleDateChange = (fromVal, toVal) => {
        setFrom(fromVal);
        setTo(toVal);
        applyFilters({ from: fromVal, to: toVal });
    };

    const handleReset = () => {
        setSearch('');
        setModule('');
        setRole('');
        setFrom('');
        setTo('');
        router.get(window.location.pathname, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handlePageChange = (newPage) => {
        const params = { ...filters, page: newPage };
        router.get(window.location.pathname, params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Export endpoint carrying the current filters; the ExportDialog appends ?format=excel|pdf.
    const filteredExportUrl = (() => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (module) params.set('module', module);
        if (role) params.set('role', role);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const query = params.toString();
        return query ? `${exportUrl}?${query}` : exportUrl;
    })();

    const isFiltering = Boolean(search || module || role || from || to);

    const getRoleBadge = (r) => {
        switch (r) {
            case 'tmo_personnel':
                return {
                    label: 'TMO Personnel',
                    className: 'bg-sky-50 text-sky-700 border-sky-200/70',
                };
            case 'bplo_staff':
                return {
                    label: 'BPLO Staff',
                    className: 'bg-amber-50 text-amber-700 border-amber-200/70',
                };
            case 'admin':
                return {
                    label: 'Administrator',
                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
                };
            case 'tricycle_driver':
                return {
                    label: 'Driver / Operator',
                    className: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
                };
            default:
                return {
                    label: r || 'User',
                    className: 'bg-slate-100 text-slate-700 border-slate-200',
                };
        }
    };

    const formatModuleLabel = (m) => {
        switch (m) {
            case 'auth':            return 'Authentication & Access';
            case 'document_review': return 'Document Review';
            case 'inspection':
            case 'physical_inspection': return 'Physical Inspection';
            case 'franchise':       return 'Franchise & Releasing';
            case 'violation':       return 'Violations & Appeals';
            case 'fare':            return 'Fare Management';
            case 'user_management': return 'Staff Management';
            case 'application':     return 'Driver Application';
            case 'profile':         return 'Account Settings';
            case 'reports':         return 'Reports & Analytics';
            default:                return m ? m.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'General';
        }
    };

    const formatActionLabel = (action) => {
        if (!action) return '—';
        const labels = {
            'auth.login': 'User Login',
            'auth.logout': 'User Logout',
            'inspection.passed': 'Physical Inspection Passed',
            'inspection.failed': 'Physical Inspection Failed',
            'document.approved': 'Document Approved',
            'document.resubmission_requested': 'Resubmission Requested',
            'fare.updated': 'Fare Rates Updated',
            'franchise.released': 'Franchise Permit Released',
            'franchise.renewed': 'Franchise Renewed',
            'franchise.revoked': 'Franchise Revoked',
            'violation.issued': 'Violation Ticket Issued',
            'violation.payment_recorded': 'Violation Penalty Settled',
            'appeal.resolved': 'Appeal Resolved',
            'staff.created': 'Staff Account Created',
            'staff.updated': 'Staff Account Updated',
            'staff.status_toggled': 'Staff Account Status Changed',
            'staff.deleted': 'Staff Account Deleted',
            'application.submitted': 'Application Submitted',
            'application.verified': 'Application Verified',
            'application.approved': 'Application Approved',
            'profile.updated': 'Profile Updated',
            'profile.password_updated': 'Password Changed',
            'profile.photo_updated': 'Profile Photo Updated',
            'profile.photo_removed': 'Profile Photo Removed',
            'report.exported_excel': 'Excel Report Exported',
            'report.exported_pdf': 'PDF Report Exported',
            'report.exported_csv': 'CSV Report Exported',
            'report.exported_json': 'JSON Report Exported',
        };
        if (labels[action]) return labels[action];
        if (action.startsWith('report.exported_')) {
            const fmt = action.replace('report.exported_', '').toUpperCase();
            return `${fmt} Report Exported`;
        }
        return action.replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const formatFieldLabel = (key) => {
        const labels = {
            status: 'Status',
            current_step: 'Current Step',
            result: 'Result',
            base_fare: 'Base Fare (₱)',
            base_fare_per_passenger: 'Extra Passenger Rate (₱)',
            included_distance_km: 'Included Distance (km)',
            rate_per_km: 'Additional Rate per km (₱)',
            night_diff_rate: 'Night Rate (₱ / %)',
            night_diff_start: 'Night Rate Starts',
            night_diff_end: 'Night Rate Ends',
            min_night_diff_fare: 'Minimum Night Fare (₱)',
            is_active: 'Account Status',
            name: 'Full Name',
            email: 'Email Address',
            role: 'Role',
            contact_number: 'Contact Number',
            address: 'Address',
            position: 'Job Position',
            birthday: 'Date of Birth',
            inspection_status: 'Inspection Status',
            franchise_status: 'Franchise Status',
            sticker_issued: 'Sticker Issued',
            valid_until: 'Expiration Date',
            violation_code: 'Violation Type',
            penalty_fee: 'Penalty Fee (₱)',
            paid_at: 'Date Paid',
            fine_paid_at: 'Date Fine Settled',
            released_at: 'Date Released',
            inspected_at: 'Date Inspected',
            reviewed_at: 'Date Reviewed',
            submitted_at: 'Date Submitted',
            tracking_method: 'Tracking Method',
            iot_device_id: 'IoT Device ID',
            documents_verified: 'Documents Checked',
            application_type: 'Application Type',
            reference_number: 'Reference Number',
            attempt_number: 'Attempt Number',
            inspector_notes: 'Inspector Remarks',
            rejection_reason: 'Reason for Rejection',
            notes: 'Remarks',
            updated_at: 'Last Updated',
        };
        if (labels[key]) return labels[key];
        return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const formatFieldValue = (val, key = '') => {
        if (val === null || val === undefined || val === '') {
            return <span className="text-slate-500 italic">None</span>;
        }
        if (typeof val === 'boolean') {
            return <span>{val ? 'Yes' : 'No'}</span>;
        }
        if (typeof val === 'number') {
            if (key && (key.includes('fare') || key.includes('rate') || key.includes('fee') || key.includes('amount'))) {
                return <span className="font-mono font-semibold text-slate-900">₱{Number(val).toFixed(2)}</span>;
            }
            if (key === 'current_step') {
                return <span>Step {val}</span>;
            }
            return <span className="font-mono font-semibold text-slate-900">{val}</span>;
        }

        // Format ISO timestamps (e.g. 2026-10-09T13:42:57.000000Z) or MySQL datetimes (2026-10-09 13:42:57)
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(val)) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                const datePart = d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                });
                const timePart = d.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
                return <span className="font-semibold text-slate-900">{datePart} {timePart}</span>;
            }
        }

        // Format standard YYYY-MM-DD date strings (e.g. 2026-10-09)
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const parts = val.split('-');
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(d.getTime())) {
                return (
                    <span className="font-semibold text-slate-900">
                        {d.toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                        })}
                    </span>
                );
            }
        }

        if (typeof val === 'object') {
            if (Array.isArray(val)) {
                const cleanedArr = val.filter((item) => typeof item !== 'string' || !item.toLowerCase().includes('toda'));
                return <span className="font-medium text-slate-800">{cleanedArr.join(', ')}</span>;
            }
            const entries = Object.entries(val).filter(([k]) => !k.toLowerCase().includes('toda'));
            return (
                <span className="font-medium text-slate-800">
                    {entries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join('; ')}
                </span>
            );
        }

        if (key === 'tracking_method') {
            if (val === 'mobile_app') return <span className="font-semibold text-slate-900">Mobile App GPS</span>;
            if (val === 'iot_device') return <span className="font-semibold text-slate-900">IoT Hardware Device</span>;
        }
        if (key === 'iot_device_id') {
            return <span className="font-semibold text-slate-900">{String(val).startsWith('#') || String(val).toLowerCase().startsWith('iot') ? val : `IoT Device #${val}`}</span>;
        }

        const str = String(val).replace(/\bTODA\b/gi, '').trim();
        if (str.includes('_') || /^[a-z]+$/.test(str)) {
            let human = str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            human = human
                .replace(/\bBplo\b/g, 'BPLO')
                .replace(/\bTmo\b/g, 'TMO')
                .replace(/\bLto\b/g, 'LTO')
                .replace(/\bMtop\b/g, 'MTOP');
            return <span className="font-semibold text-slate-900">{human}</span>;
        }
        return <span className="font-medium text-slate-900">{str}</span>;
    };

    return (
        <Layout {...layoutProps}>
            <Head title="System Activity Logs | TRIVORA" />

            <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                {/* ══════════════════════════════════════════════════════════════
                    1. CLEAN HEADER (Consistent with other TMO modules)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                            System Activity Logs
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                            {isBplo
                                ? 'Audit trail of BPLO staff actions, franchise releasing, and account activity.'
                                : 'Audit trail of TMO staff actions, inspections, violations, and driver portal activity.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setExportOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] hover:bg-[#25449B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] self-start sm:self-center shrink-0 cursor-pointer"
                        title="Export activity logs"
                    >
                        <Download size={15} strokeWidth={2.2} className="text-white" />
                        <span>Export</span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile < 640px)
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch print:hidden`}>
                    {/* Card 1: Total Activities */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Total Activities
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <ScrollText size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {stats.total}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Logs
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                Recorded system-wide activity
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 sm:px-3 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-500 shrink-0">Scope:</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                All Portals
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Today's Activity */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    Today's Activity
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-blue-600 leading-none">
                                    {stats.today}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Today
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                Activities in the last 24 hours
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 sm:px-3 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-500 shrink-0">Window:</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                Past 24 Hours
                            </span>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    {card3.label}
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {card3.value ?? 0}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Actions
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                {card3.caption}
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 sm:px-3 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-500 shrink-0">{card3.metaLabel}</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                {card3.meta}
                            </span>
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 ${CARD_SHADOW} transition-all hover:border-slate-300 hover:shadow-[0_2px_6px_0_rgba(15,23,42,0.08),0_18px_36px_-12px_rgba(15,23,42,0.20)]`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight text-slate-500">
                                    {card4.label}
                                </span>
                                <div className="flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                                    <Users size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
                                <span className="text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-sky-600 leading-none">
                                    {card4.value ?? 0}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Actions
                                </span>
                            </div>
                            <p className="mt-1 max-sm:hidden text-[10px] sm:text-[11px] font-medium text-slate-600 line-clamp-1">
                                {card4.caption}
                            </p>
                        </div>

                        <div className="mt-2.5 max-sm:hidden rounded-xl bg-slate-50 border border-slate-100/90 shadow-sm px-2.5 py-1.5 sm:px-3 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-500 shrink-0">{card4.metaLabel}</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                {card4.meta}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. COMMAND & FILTER DECK
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW} print:hidden`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                        {/* Primary Search Bar */}
                        <div className="relative flex-1 min-w-[220px]">
                            <Search
                                size={14}
                                strokeWidth={2.2}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search by name, reference number, action, or details…"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => handleSearchChange('')}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Filter Controls Row */}
                        <div className="grid grid-cols-2 sm:flex items-center gap-2">
                            {/* Module Dropdown */}
                            <div className={`${isBplo ? 'col-span-2' : 'col-span-1'} sm:flex-1 lg:flex-none`}>
                                <select
                                    value={module}
                                    onChange={handleModuleChange}
                                    className="h-10 w-full lg:w-44 rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer truncate"
                                >
                                    <option value="">All Sections</option>
                                    {availableModules.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Actor Role Dropdown (TMO only — the BPLO log has a single role) */}
                            {!isBplo && (
                            <div className="col-span-1 sm:flex-1 lg:flex-none">
                                <select
                                    value={role}
                                    onChange={handleRoleChange}
                                    className="h-10 w-full lg:w-40 rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer truncate"
                                >
                                    <option value="">All Roles</option>
                                    {availableRoles.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            )}

                            {/* Date From & To */}
                            <div className="col-span-2 sm:col-span-auto sm:flex-[2] lg:flex-none flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => handleDateChange(e.target.value, to)}
                                    className="h-10 min-w-0 flex-1 lg:flex-none rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                                    title="Date from"
                                />
                                <span className="text-slate-500 text-xs">to</span>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => handleDateChange(from, e.target.value)}
                                    className="h-10 min-w-0 flex-1 lg:flex-none rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                                    title="Date to"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. DATA DISPLAY: DESKTOP TABLE + DEDICATED MOBILE CARDS
                   ══════════════════════════════════════════════════════════════ */}
                {logs.data.length === 0 ? (
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-12 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <ScrollText size={24} strokeWidth={1.8} />
                        </div>
                        <h3 className="mt-3.5 text-base font-bold text-slate-900">
                            No activities found
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-600 leading-relaxed">
                            No logs match your current search or date filters.
                        </p>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 cursor-pointer"
                            >
                                <RotateCcw size={12} strokeWidth={2.2} />
                                <span>Clear all filters</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop & Tablet Data Table with Integrated Modern Footer (>= md) */}
                        <div className={`hidden lg:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 bg-slate-50/80">
                                            <th scope="col" className="py-3.5 pl-6 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Date &amp; Time
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                User &amp; Role
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Action &amp; Section
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Record Reference
                                            </th>
                                            <th scope="col" className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Summary
                                            </th>
                                            <th scope="col" className="py-3.5 pr-6 pl-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 print:hidden">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {logs.data.map((log) => {
                                            const roleMeta = getRoleBadge(log.actor_role);
                                            return (
                                                <tr key={log.id} className="transition-colors hover:bg-slate-50/80">
                                                    {/* Date & Time */}
                                                    <td className="py-3.5 pl-6 pr-3 whitespace-nowrap align-middle">
                                                        <div className="font-bold text-slate-900">{log.created_at}</div>
                                                        <div className="text-[11px] text-slate-500 font-medium">{log.created_at_human}</div>
                                                    </td>

                                                    {/* User & Role */}
                                                    <td className="py-3.5 px-4 align-middle">
                                                        <div className="font-bold text-slate-900">{log.actor_name}</div>
                                                        <div className="text-[11px] font-medium text-slate-600">
                                                            {roleMeta.label}
                                                        </div>
                                                    </td>

                                                    {/* Action & Module */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                                                        <div className="text-xs font-bold text-slate-900">
                                                            {formatActionLabel(log.action)}
                                                        </div>
                                                        <div className="text-[11px] font-medium text-slate-600">
                                                            {formatModuleLabel(log.module)}
                                                        </div>
                                                    </td>

                                                    {/* Record Reference */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                                                        <span className="font-mono text-xs font-bold text-slate-900">
                                                            {log.action?.startsWith('report.exported')
                                                                ? (log.actor_email || (log.target_reference && log.target_reference.includes('@') ? log.target_reference : (log.actor_email || '—')))
                                                                : (log.target_reference || '—')}
                                                        </span>
                                                        <div className="text-[10.5px] text-slate-500">
                                                            {log.target_type || null}
                                                        </div>
                                                    </td>

                                                    {/* Summary */}
                                                    <td className="py-3.5 px-4 min-w-[240px] max-w-sm whitespace-normal align-middle">
                                                        <p className="line-clamp-2 leading-relaxed text-slate-600 font-medium">
                                                            {log.description || '—'}
                                                        </p>
                                                    </td>

                                                    {/* View Details Button */}
                                                    <td className="py-3.5 pr-6 pl-3 text-right whitespace-nowrap align-middle print:hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLog(log)}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-[#182B62] transition-all active:scale-[0.98] cursor-pointer"
                                                            aria-label="View log details"
                                                            title="View log details"
                                                        >
                                                            <Eye size={15} strokeWidth={2.2} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Desktop Pagination Footer */}
                            {logs.total > 0 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5 text-xs sm:flex-row print:hidden">
                                    <p className="text-slate-600 font-medium">
                                        Showing <span className="font-bold text-slate-800 tabular-nums">{(logs.current_page - 1) * logs.per_page + 1}</span>–
                                        <span className="font-bold text-slate-800 tabular-nums">{Math.min(logs.current_page * logs.per_page, logs.total)}</span> of{' '}
                                        <span className="font-bold text-slate-800 tabular-nums">{logs.total}</span> records
                                    </p>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={logs.current_page <= 1}
                                            onClick={() => handlePageChange(logs.current_page - 1)}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                        >
                                            <ChevronLeft size={13} strokeWidth={2.5} />
                                            <span>Prev</span>
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: logs.last_page }, (_, i) => i + 1)
                                                .filter((p) => {
                                                    if (logs.last_page <= 5) return true;
                                                    if (p === 1 || p === logs.last_page) return true;
                                                    return Math.abs(p - logs.current_page) <= 1;
                                                })
                                                .map((p, idx, arr) => {
                                                    const prev = arr[idx - 1];
                                                    const hasGap = prev && p - prev > 1;

                                                    return (
                                                        <React.Fragment key={p}>
                                                            {hasGap && (
                                                                <span className="px-1 text-xs text-slate-500 font-medium">…</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePageChange(p)}
                                                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                                    logs.current_page === p
                                                                        ? 'bg-[#182B62] text-white shadow-sm'
                                                                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                {p}
                                                            </button>
                                                        </React.Fragment>
                                                    );
                                                })}
                                        </div>

                                        <button
                                            type="button"
                                            disabled={logs.current_page >= logs.last_page}
                                            onClick={() => handlePageChange(logs.current_page + 1)}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                        >
                                            <span>Next</span>
                                            <ChevronRight size={13} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dedicated Mobile Cards Deck (< md) */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                            {logs.data.map((log) => {
                                const roleMeta = getRoleBadge(log.actor_role);
                                return (
                                    <div
                                        key={log.id}
                                        className={`rounded-2xl border border-slate-200/80 bg-white p-4 ${CARD_SHADOW} space-y-3`}
                                    >
                                        {/* Header: User & Role + Timestamp */}
                                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 text-sm truncate">{log.actor_name}</div>
                                                <div className="text-[11px] font-medium text-slate-600">
                                                    {roleMeta.label}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs font-bold text-slate-900">{log.created_at}</div>
                                                <div className="text-[10.5px] text-slate-500 font-medium">{log.created_at_human}</div>
                                            </div>
                                        </div>

                                        {/* Action & Module */}
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Action</span>
                                                <span className="font-bold text-slate-900">{formatActionLabel(log.action)}</span>
                                            </div>
                                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700">
                                                {formatModuleLabel(log.module)}
                                            </span>
                                        </div>

                                        {/* Record Reference */}
                                        <div className="rounded-xl bg-slate-50 border border-slate-200/60 shadow-sm p-2.5 text-xs flex items-center justify-between gap-2">
                                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Reference</span>
                                            <span className="font-mono font-bold text-slate-900 truncate">
                                                {log.action?.startsWith('report.exported')
                                                    ? (log.actor_email || (log.target_reference && log.target_reference.includes('@') ? log.target_reference : (log.actor_email || '—')))
                                                    : (log.target_reference || '—')}
                                            </span>
                                        </div>

                                        {/* Summary */}
                                        {log.description && (
                                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                                {log.description}
                                            </p>
                                        )}

                                        {/* View Details Button */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedLog(log)}
                                            className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 py-2 text-slate-600 hover:text-[#182B62] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                                            aria-label="View log details"
                                            title="View log details"
                                        >
                                            <Eye size={15} strokeWidth={2.2} />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Mobile Pagination Card */}
                            {logs.total > 0 && (
                                <div className={`md:col-span-2 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 ${CARD_SHADOW} print:hidden`}>
                                    <p className="text-xs text-slate-600 font-medium">
                                        Page <span className="font-bold text-slate-900 tabular-nums">{logs.current_page}</span> of{' '}
                                        <span className="font-bold text-slate-900 tabular-nums">{logs.last_page}</span>
                                        <span className="ml-1 text-[11px] text-slate-500">({logs.total} logs)</span>
                                    </p>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={logs.current_page <= 1}
                                            onClick={() => handlePageChange(logs.current_page - 1)}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                        >
                                            <ChevronLeft size={13} strokeWidth={2.5} />
                                            <span>Prev</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={logs.current_page >= logs.last_page}
                                            onClick={() => handlePageChange(logs.current_page + 1)}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                        >
                                            <span>Next</span>
                                            <ChevronRight size={13} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    5. DETAIL / STATE-DIFF MODAL
                   ══════════════════════════════════════════════════════════════ */}
                <Modal
                    show={Boolean(selectedLog)}
                    onClose={() => setSelectedLog(null)}
                    title="Activity Details"
                    description={selectedLog ? `Activity #${selectedLog.id} • ${formatActionLabel(selectedLog.action)}` : ''}
                    maxWidth="2xl"
                    footer={
                        <div className="flex w-full justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    }
                >
                    {selectedLog && (() => {
                        const isNonMutation = (act) => {
                            if (!act) return false;
                            return act.startsWith('auth.') || act.startsWith('report.');
                        };

                        const BLOCKED_KEYS = [
                            'ip_address', 'ip', 'user_agent', 'device', 'browser',
                            'current_step', 'step', 'password', 'remember_token', 'token',
                            'id', 'created_at', 'updated_at', 'email_verified_at', 'deleted_at',
                            'reviewed_at', 'reviewed_by', 'franchise_active', 'tricycle_status',
                        ];

                        const isAllowedKey = (k) => {
                            if (typeof k !== 'string') return false;
                            const lower = k.toLowerCase();
                            if (lower.includes('toda')) return false;
                            if (BLOCKED_KEYS.includes(lower)) return false;
                            if (lower.endsWith('_by')) return false;
                            if (['user_id', 'operator_id', 'driver_id', 'tricycle_id', 'application_id', 'violation_id', 'appeal_id'].includes(lower)) return false;
                            return true;
                        };

                        const valuesAreEqual = (a, b) => {
                            if (a === b) return true;
                            if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) {
                                return true;
                            }
                            return JSON.stringify(a) === JSON.stringify(b);
                        };

                        const oldObj = (selectedLog.old_values && typeof selectedLog.old_values === 'object') ? selectedLog.old_values : {};
                        const newObj = (selectedLog.new_values && typeof selectedLog.new_values === 'object') ? selectedLog.new_values : {};
                        const hasOld = Object.keys(oldObj).length > 0;
                        const hasNew = Object.keys(newObj).length > 0;

                        let stateMode = null; // 'update' | 'create' | 'delete'
                        let displayKeys = [];

                        if (!isNonMutation(selectedLog.action)) {
                            if (hasOld && hasNew) {
                                const allCandidateKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).filter(isAllowedKey);
                                displayKeys = allCandidateKeys.filter((key) => {
                                    const inOld = Object.prototype.hasOwnProperty.call(oldObj, key);
                                    const inNew = Object.prototype.hasOwnProperty.call(newObj, key);
                                    if (inOld && inNew) {
                                        return !valuesAreEqual(oldObj[key], newObj[key]);
                                    }
                                    if (!inOld && inNew) {
                                        return newObj[key] !== null && newObj[key] !== undefined && newObj[key] !== '';
                                    }
                                    if (inOld && !inNew) {
                                        return oldObj[key] !== null && oldObj[key] !== undefined && oldObj[key] !== '';
                                    }
                                    return false;
                                });
                                if (displayKeys.length > 0) {
                                    stateMode = 'update';
                                }
                            } else if (!hasOld && hasNew) {
                                displayKeys = Object.keys(newObj)
                                    .filter(isAllowedKey)
                                    .filter((key) => newObj[key] !== null && newObj[key] !== undefined && newObj[key] !== '');
                                if (displayKeys.length > 0) {
                                    stateMode = 'create';
                                }
                            } else if (hasOld && !hasNew) {
                                displayKeys = Object.keys(oldObj)
                                    .filter(isAllowedKey)
                                    .filter((key) => oldObj[key] !== null && oldObj[key] !== undefined && oldObj[key] !== '');
                                if (displayKeys.length > 0) {
                                    stateMode = 'delete';
                                }
                            }
                        }

                        const hasStateData = stateMode !== null && displayKeys.length > 0;

                        return (
                            <div className="space-y-4 text-xs text-slate-700 font-['Plus_Jakarta_Sans',sans-serif]">
                                {/* Summary Callout */}
                                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                        <Activity size={13} className="text-slate-600" />
                                        <span>Activity Summary</span>
                                    </div>
                                    <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-900">
                                        {selectedLog.description}
                                    </p>
                                </div>

                                {/* Core Info 4-Box Grid (2 columns x 2 rows) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Performed By</span>
                                        <div className="mt-1 font-bold text-slate-900 truncate" title={selectedLog.actor_name}>
                                            {selectedLog.actor_name}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-600">
                                            {getRoleBadge(selectedLog.actor_role).label}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {selectedLog.action.startsWith('auth.')
                                                ? 'User Account'
                                                : selectedLog.action === 'report.exported_excel'
                                                ? 'User Email'
                                                : 'Record'}
                                        </span>
                                        <div className="mt-1 font-mono font-bold text-slate-900 truncate" title={
                                            selectedLog.action.startsWith('auth.')
                                                ? (selectedLog.actor_email || (selectedLog.target_reference && selectedLog.target_reference.includes('@') ? selectedLog.target_reference : null) || selectedLog.actor_name || 'N/A')
                                                : selectedLog.action === 'report.exported_excel'
                                                ? (selectedLog.actor_email || (selectedLog.target_reference && selectedLog.target_reference.includes('@') ? selectedLog.target_reference : null) || selectedLog.actor_name || 'N/A')
                                                : (selectedLog.target_reference || 'N/A')
                                        }>
                                            {selectedLog.action.startsWith('auth.')
                                                ? (selectedLog.actor_email || (selectedLog.target_reference && selectedLog.target_reference.includes('@') ? selectedLog.target_reference : null) || selectedLog.actor_name || '—')
                                                : selectedLog.action === 'report.exported_excel'
                                                ? (selectedLog.actor_email || (selectedLog.target_reference && selectedLog.target_reference.includes('@') ? selectedLog.target_reference : null) || selectedLog.actor_name || '—')
                                                : (selectedLog.target_reference || '—')}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-600">
                                            {selectedLog.action.startsWith('auth.')
                                                ? 'Web Session'
                                                : selectedLog.action === 'report.exported_excel'
                                                ? 'Excel Report'
                                                : (selectedLog.target_type || 'General')}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</span>
                                        <div className="mt-1 font-bold text-slate-900 truncate" title={formatActionLabel(selectedLog.action)}>
                                            {formatActionLabel(selectedLog.action)}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-600">
                                            {formatModuleLabel(selectedLog.module)}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date &amp; Time</span>
                                        <div className="mt-1 font-bold text-slate-900">
                                            {selectedLog.created_at}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-600">
                                            {selectedLog.created_at_human}
                                        </div>
                                    </div>
                                </div>

                                {/* Intelligent State Details Section */}
                                {hasStateData && (
                                    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                                        {stateMode === 'update' && (
                                            <>
                                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                        Updated Details
                                                    </span>
                                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                                        {displayKeys.length} {displayKeys.length === 1 ? 'change' : 'changes'}
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {displayKeys.map((key) => {
                                                        const hasOldVal = Object.prototype.hasOwnProperty.call(oldObj, key);
                                                        const hasNewVal = Object.prototype.hasOwnProperty.call(newObj, key);
                                                        const oldVal = oldObj[key];
                                                        const newVal = newObj[key];
                                                        const isChanged = hasOldVal && hasNewVal;
                                                        const isAdded = !hasOldVal && hasNewVal;
                                                        const isRemoved = hasOldVal && !hasNewVal;

                                                        return (
                                                            <div key={key} className="p-3.5 hover:bg-slate-50/50 transition-colors">
                                                                <div className="text-xs font-bold text-slate-900 mb-1.5">
                                                                    {formatFieldLabel(key)}
                                                                </div>

                                                                {isChanged && (
                                                                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                                                                        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 line-through">
                                                                            {formatFieldValue(oldVal, key)}
                                                                        </div>
                                                                        <ArrowRight size={13} className="text-slate-500 shrink-0" />
                                                                        <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 font-semibold text-emerald-900">
                                                                            {formatFieldValue(newVal, key)}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {isAdded && (
                                                                    <div className="pt-0.5 text-xs">
                                                                        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-900">
                                                                            {formatFieldValue(newVal, key)}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {isRemoved && (
                                                                    <div className="pt-0.5 text-xs">
                                                                        <div className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 line-through">
                                                                            {formatFieldValue(oldVal, key)}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}

                                        {stateMode === 'create' && (
                                            <>
                                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                        Record Details
                                                    </span>
                                                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                                        {displayKeys.length} {displayKeys.length === 1 ? 'item' : 'items'}
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {displayKeys.map((key) => (
                                                        <div key={key} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 transition-colors">
                                                            <span className="text-xs font-semibold text-slate-600">
                                                                {formatFieldLabel(key)}
                                                            </span>
                                                            <div className="text-xs font-semibold text-slate-900 text-right">
                                                                {formatFieldValue(newObj[key], key)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {stateMode === 'delete' && (
                                            <>
                                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                        Previous Record Details
                                                    </span>
                                                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                                        {displayKeys.length} {displayKeys.length === 1 ? 'item' : 'items'}
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {displayKeys.map((key) => (
                                                        <div key={key} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 transition-colors">
                                                            <span className="text-xs font-semibold text-slate-600">
                                                                {formatFieldLabel(key)}
                                                            </span>
                                                            <div className="text-xs font-medium text-rose-700 line-through text-right">
                                                                {formatFieldValue(oldObj[key], key)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </Modal>

                {/* ══════════════════════════════════════════════════════════════
                    6. EXPORT DIALOG (format choice → exporting → download ready)
                   ══════════════════════════════════════════════════════════════ */}
                <ExportDialog
                    show={exportOpen}
                    onClose={() => setExportOpen(false)}
                    title="Export Activity Logs"
                    recordLabel="activity records"
                    recordCount={logs.total ?? 0}
                    scopeNote={isFiltering ? 'Current Filters Applied' : 'Entire Activity Log'}
                    exportUrl={filteredExportUrl}
                    fallbackName="trivora_system_activity_logs"
                />
            </div>
        </Layout>
    );
}
