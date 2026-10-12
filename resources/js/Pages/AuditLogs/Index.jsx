import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { Modal, Button } from '@/Components/TMO';
import {
    ScrollText, Search, X, RotateCcw, Eye, ShieldCheck,
    Users, Clock, Activity, FileSpreadsheet, ArrowRight,
    Filter, Calendar, ChevronLeft, ChevronRight, Loader2, Check,
    Download, ChevronDown, FileText, Printer
} from 'lucide-react';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

const FORMAT_META = {
    excel: {
        id: 'excel',
        label: 'Excel Spreadsheet',
        ext: '.xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        desc: 'Official municipal workbook with non-sticky table header',
        badge: '.XLSX',
        badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        icon: FileSpreadsheet,
    },
    pdf: {
        id: 'pdf',
        label: 'Landscape PDF Report',
        ext: '.pdf',
        mime: 'application/pdf',
        desc: 'Official municipal document formatted in landscape A4 table',
        badge: '.PDF',
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
        iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
        icon: FileText,
    },
};

export default function Index({
    logs = { data: [], current_page: 1, last_page: 1, total: 0, per_page: 15 },
    stats = { total: 0, today: 0, staff: 0, driver: 0 },
    filters = {},
    availableModules = [],
    availableRoles = [],
    exportUrl,
}) {
    const { auth } = usePage().props;
    const user = auth?.user || {};

    const Layout = TrivoraLayout;
    const layoutProps = { title: 'System Activity Logs', role: 'TMO Personnel' };

    const [selectedLog, setSelectedLog] = useState(null);
    const [exportOptionsModalOpen, setExportOptionsModalOpen] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState('excel');
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportStatus, setExportStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [exportProgress, setExportProgress] = useState(0);
    const [exportFormat, setExportFormat] = useState('excel'); // 'excel' | 'pdf' | 'csv' | 'json'

    // Background refresh
    useBackgroundRefresh(['logs', 'stats'], {
        paused: Boolean(selectedLog) || exportOptionsModalOpen || exportModalOpen,
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

    const handleCloseExportModal = () => {
        if (exportStatus === 'loading') return;
        setExportModalOpen(false);
        setTimeout(() => {
            setExportStatus('idle');
            setExportProgress(0);
        }, 300);
    };

    const handleExport = async (format = 'excel') => {
        setExportFormat(format);
        if (exportStatus === 'loading') return;

        setExportProgress(12);
        setExportStatus('loading');
        setExportModalOpen(true);

        // Smooth simulated progress increments while server prepares export
        const interval = setInterval(() => {
            setExportProgress((prev) => {
                if (prev >= 88) return prev;
                return prev + Math.floor(Math.random() * 10) + 6;
            });
        }, 220);

        try {
            const params = new URLSearchParams();
            params.set('format', format);
            if (search) params.set('search', search);
            if (module) params.set('module', module);
            if (role) params.set('role', role);
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const url = `${exportUrl}?${params.toString()}`;
            const meta = FORMAT_META[format] || FORMAT_META.excel;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: meta.mime,
                },
            });

            if (!response.ok) {
                throw new Error(`Export request failed with status: ${response.status}`);
            }

            clearInterval(interval);
            setExportProgress(100);

            let filename = `trivora_system_activity_logs${meta.ext}`;
            const disposition = response.headers.get('content-disposition');
            if (disposition && disposition.includes('filename=')) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            setExportStatus('success');
        } catch (err) {
            clearInterval(interval);
            console.error('Failed to export report:', err);
            setExportStatus('error');
        }
    };

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
            return <span className="text-slate-400 italic">None</span>;
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
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                            Audit trail of administrative actions, inspections, violations, and portal activities in Nasugbu.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setExportOptionsModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98] self-start sm:self-center shrink-0 cursor-pointer"
                        title="Export activity logs"
                    >
                        <Download size={15} className="text-[#182B62] shrink-0" />
                        <span>Export</span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. COMPACT OPERATIONAL KPI DECK (1 card per row on mobile < 640px)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch print:hidden">
                    {/* Card 1: Total Activities */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Activities
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#182B62]">
                                    <ScrollText size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-slate-900 leading-none">
                                    {stats.total}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Logs
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 line-clamp-1">
                                Recorded system-wide activity
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-400 shrink-0">Scope:</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                All Portals
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Today's Activity */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Today's Activity
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                                    <Clock size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-blue-600 leading-none">
                                    {stats.today}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Today
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 line-clamp-1">
                                Activities in the last 24 hours
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-400 shrink-0">Window:</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                Past 24 Hours
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Staff Actions */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Staff Actions
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                                    <ShieldCheck size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-emerald-600 leading-none">
                                    {stats.staff}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Actions
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 line-clamp-1">
                                TMO, BPLO, and Admin personnel
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-400 shrink-0">Offices:</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                TMO &amp; BPLO
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Driver Actions */}
                    <div className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:p-6 ${CARD_SHADOW} transition-all`}>
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
                                <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                    Driver Actions
                                </span>
                                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                                    <Users size={15} strokeWidth={2.2} />
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight tabular-nums text-sky-600 leading-none">
                                    {stats.driver}
                                </span>
                                <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Actions
                                </span>
                            </div>
                            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-500 line-clamp-1">
                                Driver portal transactions
                            </p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100/90 px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="font-semibold text-slate-400 shrink-0">Portal:</span>
                            <span className="font-bold text-slate-800 shrink-0">
                                Driver Web App
                            </span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. COMMAND & FILTER DECK
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`mb-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 ${CARD_SHADOW} print:hidden`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        {/* Primary Search Bar */}
                        <div className="relative flex-1 min-w-[220px]">
                            <Search
                                size={16}
                                strokeWidth={2.2}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search by name, reference number, action, or details…"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182B62]/10"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => handleSearchChange('')}
                                    className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Filter Controls Row */}
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
                            {/* Module Dropdown */}
                            <div className="col-span-1">
                                <select
                                    value={module}
                                    onChange={handleModuleChange}
                                    className="h-10 w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#182B62] focus:outline-none focus:ring-2 focus:ring-[#182B62]/10 cursor-pointer truncate"
                                >
                                    <option value="">All Sections</option>
                                    {availableModules.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Actor Role Dropdown */}
                            <div className="col-span-1">
                                <select
                                    value={role}
                                    onChange={handleRoleChange}
                                    className="h-10 w-full sm:w-40 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs transition-colors focus:border-[#182B62] focus:outline-none focus:ring-2 focus:ring-[#182B62]/10 cursor-pointer truncate"
                                >
                                    <option value="">All Roles</option>
                                    {availableRoles.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date From & To */}
                            <div className="col-span-2 sm:col-span-auto flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => handleDateChange(e.target.value, to)}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#182B62] focus:outline-none"
                                    title="Date from"
                                />
                                <span className="text-slate-400 text-xs">to</span>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => handleDateChange(from, e.target.value)}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#182B62] focus:outline-none"
                                    title="Date to"
                                />
                            </div>

                            {isFiltering && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="col-span-2 sm:col-span-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <RotateCcw size={12} strokeWidth={2.2} />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    4. DATA DISPLAY: DESKTOP TABLE + DEDICATED MOBILE CARDS
                   ══════════════════════════════════════════════════════════════ */}
                {logs.data.length === 0 ? (
                    <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-12 text-center ${CARD_SHADOW}`}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <ScrollText size={24} strokeWidth={1.8} />
                        </div>
                        <h3 className="mt-3.5 text-base font-bold text-slate-900">
                            No activities found
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                            No logs match your current search or date filters.
                        </p>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 cursor-pointer"
                            >
                                <RotateCcw size={12} strokeWidth={2.2} />
                                <span>Clear all filters</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop & Tablet Data Table with Integrated Modern Footer (>= md) */}
                        <div className={`hidden md:block overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/75">
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
                                                        <div className="text-[11px] text-slate-400 font-medium">{log.created_at_human}</div>
                                                    </td>

                                                    {/* User & Role */}
                                                    <td className="py-3.5 px-4 align-middle">
                                                        <div className="font-bold text-slate-900">{log.actor_name}</div>
                                                        <span
                                                            className={`mt-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${roleMeta.className}`}
                                                        >
                                                            {roleMeta.label}
                                                        </span>
                                                    </td>

                                                    {/* Action & Module */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                                                        <div className="text-xs font-bold text-slate-900">
                                                            {formatActionLabel(log.action)}
                                                        </div>
                                                        <div className="text-[11px] font-medium text-slate-500">
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
                                                        <div className="text-[10.5px] text-slate-400">
                                                            {log.target_type || null}
                                                        </div>
                                                    </td>

                                                    {/* Summary */}
                                                    <td className="py-3.5 px-4 max-w-sm align-middle">
                                                        <p className="line-clamp-2 leading-relaxed text-slate-600 font-medium">
                                                            {log.description || '—'}
                                                        </p>
                                                    </td>

                                                    {/* View Details Button */}
                                                    <td className="py-3.5 pr-6 pl-3 text-right whitespace-nowrap align-middle print:hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLog(log)}
                                                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-[0.98] cursor-pointer"
                                                        >
                                                            View
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
                                    <p className="text-slate-500 font-medium">
                                        Showing <span className="font-bold text-slate-800 tabular-nums">{(logs.current_page - 1) * logs.per_page + 1}</span>–
                                        <span className="font-bold text-slate-800 tabular-nums">{Math.min(logs.current_page * logs.per_page, logs.total)}</span> of{' '}
                                        <span className="font-bold text-slate-800 tabular-nums">{logs.total}</span> records
                                    </p>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={logs.current_page <= 1}
                                            onClick={() => handlePageChange(logs.current_page - 1)}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
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
                                                                <span className="px-1 text-xs text-slate-400 font-medium">…</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePageChange(p)}
                                                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                                    logs.current_page === p
                                                                        ? 'bg-[#182B62] text-white shadow-2xs'
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
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                        >
                                            <span>Next</span>
                                            <ChevronRight size={13} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dedicated Mobile Cards Deck (< md) */}
                        <div className="flex flex-col gap-3 md:hidden">
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
                                                <span className={`mt-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleMeta.className}`}>
                                                    {roleMeta.label}
                                                </span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs font-bold text-slate-900">{log.created_at}</div>
                                                <div className="text-[10.5px] text-slate-400 font-medium">{log.created_at_human}</div>
                                            </div>
                                        </div>

                                        {/* Action & Module */}
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Action</span>
                                                <span className="font-bold text-slate-900">{formatActionLabel(log.action)}</span>
                                            </div>
                                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700">
                                                {formatModuleLabel(log.module)}
                                            </span>
                                        </div>

                                        {/* Record Reference */}
                                        <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-2.5 text-xs flex items-center justify-between gap-2">
                                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Reference</span>
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
                                            className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                                        >
                                            View
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Mobile Pagination Card */}
                            {logs.total > 0 && (
                                <div className={`flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 ${CARD_SHADOW} print:hidden`}>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Page <span className="font-bold text-slate-900 tabular-nums">{logs.current_page}</span> of{' '}
                                        <span className="font-bold text-slate-900 tabular-nums">{logs.last_page}</span>
                                        <span className="ml-1 text-[11px] text-slate-400">({logs.total} logs)</span>
                                    </p>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={logs.current_page <= 1}
                                            onClick={() => handlePageChange(logs.current_page - 1)}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                                        >
                                            <ChevronLeft size={13} strokeWidth={2.5} />
                                            <span>Prev</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={logs.current_page >= logs.last_page}
                                            onClick={() => handlePageChange(logs.current_page + 1)}
                                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
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
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <Activity size={13} className="text-slate-600" />
                                        <span>Activity Summary</span>
                                    </div>
                                    <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-900">
                                        {selectedLog.description}
                                    </p>
                                </div>

                                {/* Core Info 4-Box Grid (2 columns x 2 rows) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Performed By</span>
                                        <div className="mt-1 font-bold text-slate-900 truncate" title={selectedLog.actor_name}>
                                            {selectedLog.actor_name}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-500">
                                            {getRoleBadge(selectedLog.actor_role).label}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                                        <div className="text-[11px] font-medium text-slate-500">
                                            {selectedLog.action.startsWith('auth.')
                                                ? 'Web Session'
                                                : selectedLog.action === 'report.exported_excel'
                                                ? 'Excel Report'
                                                : (selectedLog.target_type || 'General')}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Action</span>
                                        <div className="mt-1 font-bold text-slate-900 truncate" title={formatActionLabel(selectedLog.action)}>
                                            {formatActionLabel(selectedLog.action)}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-500">
                                            {formatModuleLabel(selectedLog.module)}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date &amp; Time</span>
                                        <div className="mt-1 font-bold text-slate-900">
                                            {selectedLog.created_at}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-500">
                                            {selectedLog.created_at_human}
                                        </div>
                                    </div>
                                </div>

                                {/* Intelligent State Details Section */}
                                {hasStateData && (
                                    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
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
                                                                        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-500 line-through">
                                                                            {formatFieldValue(oldVal, key)}
                                                                        </div>
                                                                        <ArrowRight size={13} className="text-slate-400 shrink-0" />
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

                                {/* Technical Metadata Strip */}
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-500">
                                    <span>IP Address: <strong className="font-mono text-slate-700">{selectedLog.ip_address || 'Internal Network'}</strong></span>
                                    <span>Audit ID: <strong className="font-mono text-slate-700">#{selectedLog.id}</strong></span>
                                </div>
                            </div>
                        );
                    })()}
                </Modal>

                {/* ══════════════════════════════════════════════════════════════
                    6. EXPORT FORMAT SELECTION MODAL
                   ══════════════════════════════════════════════════════════════ */}
                <Modal
                    show={exportOptionsModalOpen}
                    onClose={() => setExportOptionsModalOpen(false)}
                    title="Export Activity Logs"
                    description={`Choose a file format to export ${logs.total ?? 0} activity records.`}
                    maxWidth="lg"
                    footer={
                        <div className="flex w-full items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setExportOptionsModalOpen(false)}
                                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setExportOptionsModalOpen(false);
                                    handleExport(selectedFormat);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <Download size={14} />
                                <span>Export</span>
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4 py-1 font-['Plus_Jakarta_Sans',sans-serif]">
                        {/* Active Filters Context */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Filter size={14} className="text-slate-400 shrink-0" />
                                <span className="font-medium">
                                    Export Scope: <span className="font-bold text-slate-900">{logs.total ?? 0} matching records</span>
                                </span>
                            </div>
                            {isFiltering ? (
                                <span className="inline-flex items-center self-start sm:self-auto rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200/70">
                                    Current Filters Applied
                                </span>
                            ) : (
                                <span className="inline-flex items-center self-start sm:self-auto rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
                                    Entire Activity Log
                                </span>
                            )}
                        </div>

                        {/* Format Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.values(FORMAT_META).map((item) => {
                                const isSelected = selectedFormat === item.id;
                                const IconComponent = item.icon;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedFormat(item.id)}
                                        className={`relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-[#182B62] bg-[#182B62]/[0.02] ring-2 ring-[#182B62]/20 shadow-xs'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${item.iconColor}`}>
                                                    <IconComponent size={16} strokeWidth={2.2} />
                                                </div>
                                                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${item.badgeColor}`}>
                                                    {item.badge}
                                                </span>
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-900">
                                                {item.label}
                                            </h4>
                                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>

                                        <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
                                            <span className="text-[10.5px] font-medium text-slate-400">
                                                {isSelected ? 'Selected' : 'Click to select'}
                                            </span>
                                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                                                isSelected ? 'border-[#182B62] bg-[#182B62]' : 'border-slate-300'
                                            }`}>
                                                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Modal>

                {/* ══════════════════════════════════════════════════════════════
                    7. EXPORT PROGRESS MODAL
                   ══════════════════════════════════════════════════════════════ */}
                <Modal
                    show={exportModalOpen}
                    onClose={handleCloseExportModal}
                    closeable={exportStatus !== 'loading'}
                    maxWidth="md"
                    title={
                        exportStatus === 'success'
                            ? 'Download Ready'
                            : exportStatus === 'error'
                            ? 'Export Failed'
                            : `Exporting to ${FORMAT_META[exportFormat]?.label || 'File'}`
                    }
                    description={
                        exportStatus === 'success'
                            ? `Your ${FORMAT_META[exportFormat]?.label || 'file'} has been downloaded successfully.`
                            : exportStatus === 'error'
                            ? 'An error occurred while preparing your export.'
                            : `Please wait while we gather and prepare your activity records in ${FORMAT_META[exportFormat]?.label || 'file'} format.`
                    }
                    footer={
                        exportStatus !== 'loading' && (
                            <div className="flex w-full justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseExportModal}
                                    className={`rounded-xl px-5 py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                                        exportStatus === 'error'
                                            ? 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            : 'bg-[#182B62] hover:bg-[#25449B] text-white'
                                    }`}
                                >
                                    {exportStatus === 'success' ? 'Done' : 'Close'}
                                </button>
                            </div>
                        )
                    }
                >
                    <div className="py-2 font-['Plus_Jakarta_Sans',sans-serif]">
                        {exportStatus === 'loading' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#182B62] border border-slate-200">
                                        <Loader2 size={20} className="animate-spin" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-700">
                                                Preparing {FORMAT_META[exportFormat]?.label || 'file'}...
                                            </span>
                                            <span className="text-xs font-bold text-[#182B62] tabular-nums">
                                                {exportProgress}%
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-[#182B62] transition-all duration-300 ease-out"
                                                style={{ width: `${exportProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Formatting rows with your selected filters. Your download will start automatically once ready.
                                </p>
                            </div>
                        )}

                        {exportStatus === 'success' && (
                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                    <Check size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-900">Download Complete</h4>
                                    <p className="mt-0.5 text-[11px] text-emerald-700 leading-relaxed">
                                        Your {FORMAT_META[exportFormat]?.label || 'file'} has been saved to your downloads folder.
                                    </p>
                                </div>
                            </div>
                        )}

                        {exportStatus === 'error' && (
                            <div className="flex items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                                    <X size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-rose-900">Failed to Export</h4>
                                    <p className="mt-0.5 text-[11px] text-rose-700 leading-relaxed">
                                        We couldn't generate the file. Please check your connection and try again.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            </div>
        </Layout>
    );
}
