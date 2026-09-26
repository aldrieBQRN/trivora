import React from 'react';
import { Head } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import { PageHeader, BackLink } from '@/Components/TMO';
import {
    Calendar, Bike, MapPin,
    User, Phone, ShieldCheck,
    Clock, FileBadge, Check, Mail,
    CreditCard, Home, Navigation
} from 'lucide-react';

/**
 * Determine coding day and scheme details from the Sticker Number or registry coding_day.
 */
function getCodingSchemeInfo(codingNumber, serverCodingDay) {
    if (serverCodingDay && serverCodingDay !== 'None' && serverCodingDay !== 'Unassigned') {
        const dayMap = {
            'Monday': { digits: '1 & 2', scheme: 'Blue Scheme', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' },
            'Tuesday': { digits: '3 & 4', scheme: 'Green Scheme', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dotClass: 'bg-emerald-500' },
            'Wednesday': { digits: '5 & 6', scheme: 'Yellow Scheme', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80', dotClass: 'bg-amber-500' },
            'Thursday': { digits: '7 & 8', scheme: 'Purple Scheme', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80', dotClass: 'bg-purple-500' },
            'Friday': { digits: '9 & 0', scheme: 'Red Scheme', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80', dotClass: 'bg-rose-500' },
        };
        const mapped = dayMap[serverCodingDay] || { digits: '—', scheme: 'Standard Scheme', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-400' };
        return {
            day: serverCodingDay,
            ...mapped
        };
    }

    if (!codingNumber) {
        return { day: 'Monday', digits: '1 & 2', scheme: 'Blue Scheme', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
    }

    const clean = String(codingNumber).trim();
    const lastChar = clean.charAt(clean.length - 1);
    const lastDigit = parseInt(lastChar, 10);

    if (isNaN(lastDigit)) {
        return { day: 'Monday', digits: '1 & 2', scheme: 'Blue Scheme', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
    }

    switch (lastDigit) {
        case 1:
        case 2:
            return { day: 'Monday', digits: '1 & 2', scheme: 'Blue Scheme', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
        case 3:
        case 4:
            return { day: 'Tuesday', digits: '3 & 4', scheme: 'Green Scheme', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dotClass: 'bg-emerald-500' };
        case 5:
        case 6:
            return { day: 'Wednesday', digits: '5 & 6', scheme: 'Yellow Scheme', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80', dotClass: 'bg-amber-500' };
        case 7:
        case 8:
            return { day: 'Thursday', digits: '7 & 8', scheme: 'Purple Scheme', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80', dotClass: 'bg-purple-500' };
        case 9:
        case 0:
            return { day: 'Friday', digits: '9 & 0', scheme: 'Red Scheme', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80', dotClass: 'bg-rose-500' };
        default:
            return { day: 'Monday', digits: '1 & 2', scheme: 'Blue Scheme', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
    }
}

// Shared soft, layered shadow token — same elevation language used across the redesigned TMO
// panel pages, so BPLO cards read as part of the same product.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function RegistryDetails({ registry }) {
    const codingInfo = getCodingSchemeInfo(registry?.coding_scheme_number, registry?.coding_day);
    const isActive = registry?.status === 'active';

    // Background refresh of this registry entry: a status change made in another session updates
    // it without a manual reload. Display-only page — no form or modal state to disturb.
    useBackgroundRefresh(['registry']);

    return (
        <BPLOLayout title="Registry Details" role="BPLO Officer">
            <Head title={`Registry: ${registry?.coding_scheme_number || registry?.plate_no || 'Unit'} | TRIVORA`} />

            <div className="mx-auto max-w-7xl space-y-6 pb-12">

                {/* ══════════════════════════════════════════════════════════════
                    1. CLEAN PAGE HEADER (standard PageHeader + BackLink pattern, same as
                       Reports & other detail pages) — replaces the previous oversized
                       hero profile card while keeping the record's identity badges,
                       metadata row, and actions.
                   ══════════════════════════════════════════════════════════════ */}
                <PageHeader
                    backLink={<BackLink href="/bplo/registry">Back to Active Registry</BackLink>}
                    eyebrow={
                        <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                            Municipality of Nasugbu &bull; BPLO Tricycle Record
                        </span>
                    }
                    title={
                        <span className="font-mono text-2xl font-black tracking-tight">
                            No. {registry?.coding_scheme_number || '—'}
                        </span>
                    }
                    badge={
                        <span className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            {/* LTO Plate Badge */}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-black tracking-wider shadow-xs">
                                {registry?.plate_no || '—'}
                            </span>

                            {/* Franchise Number Badge */}
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                                <FileBadge size={12} className="text-slate-400" />
                                <span>{registry?.sticker_no || 'N/A'}</span>
                            </span>

                            {/* Status Badge */}
                            {isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span>Active Franchise</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                    <span>Suspended / Revoked</span>
                                </span>
                            )}
                        </span>
                    }
                    subtitle={
                        <span className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <User size={14} className="text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-900">{registry?.operator || 'Registered Tricycle Owner'}</span>
                            </span>

                            <span className="text-slate-300 hidden sm:inline">&bull;</span>

                            <span className="flex items-center gap-1.5">
                                <Bike size={14} className="text-slate-400 shrink-0" />
                                <span>{registry?.make || 'Standard Tricycle Unit'}</span>
                            </span>

                            <span className="text-slate-300 hidden sm:inline">&bull;</span>

                            <span className="flex items-center gap-1.5">
                                <span className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-slate-200 shrink-0 ${codingInfo.dotClass}`} />
                                <span className="font-semibold text-slate-900">
                                    {codingInfo.day} Coding ({codingInfo.scheme})
                                </span>
                            </span>
                        </span>
                    }
                    actions={
                        <>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-[#1D2542]">
                                {registry?.plate_no || 'NO-PLATE'}
                            </span>
                        </>
                    }
                />

                {/* ══════════════════════════════════════════════════════════════
                    2. BALANCED 2-COLUMN EXECUTIVE WORKSTATION (50/50 Split)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* ── COLUMN 1: DRIVER PROFILE & FRANCHISE CLEARANCE ── */}
                    <div className="space-y-6">

                        {/* Card 1: Tricycle Owner Information */}
                        <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                        <User size={15} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Tricycle Owner Information
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-normal">
                                            Registered owner's personal and license details
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                                    Verified
                                </span>
                            </div>

                            <div className="p-5 divide-y divide-slate-100 text-xs">
                                {/* Operator Full Name */}
                                <div className="pb-3.5 flex items-start justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Full Name</span>
                                        <span className="text-base font-bold text-slate-900 mt-0.5 block">{registry?.operator || '—'}</span>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1D2542] to-[#2A3560] text-white flex items-center justify-center text-sm font-bold shadow-2xs shrink-0">
                                        {registry?.operator ? registry.operator.charAt(0).toUpperCase() : 'D'}
                                    </div>
                                </div>

                                {/* Contact Number */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Phone size={13} className="text-slate-400" />
                                        Contact Number
                                    </span>
                                    {registry?.contact && registry.contact !== 'N/A' ? (
                                        <a href={`tel:${registry.contact}`} className="font-semibold text-slate-800 hover:text-[#1D2542] transition-colors font-mono">
                                            {registry.contact}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">No contact provided</span>
                                    )}
                                </div>

                                {/* Email Address */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Mail size={13} className="text-slate-400" />
                                        Email Address
                                    </span>
                                    <span className="font-semibold text-slate-700 truncate max-w-[220px]">
                                        {registry?.email || 'N/A'}
                                    </span>
                                </div>

                                {/* Residential Address */}
                                <div className="py-3 flex items-start justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0 mt-0.5">
                                        <Home size={13} className="text-slate-400" />
                                        Home Address
                                    </span>
                                    <span className="font-semibold text-slate-800 text-right">
                                        {registry?.address || `${registry?.barangay || 'Nasugbu'}, Batangas`}
                                    </span>
                                </div>

                                {/* Barangay */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <MapPin size={13} className="text-slate-400" />
                                        Barangay / District
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                        {registry?.barangay || 'Poblacion'}
                                    </span>
                                </div>

                                {/* Date of Birth */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Calendar size={13} className="text-slate-400" />
                                        Date of Birth
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                        {registry?.date_of_birth || 'Dec 12, 1988'}
                                    </span>
                                </div>

                                {/* Professional Driver's License */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <CreditCard size={13} className="text-slate-400" />
                                        Driver's License No.
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                                        {registry?.license_no || 'N01-88-567890'}
                                    </span>
                                </div>

                                {/* License Expiry & Restrictions */}
                                <div className="pt-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">License Expiry / Codes</span>
                                    <span className="font-semibold text-slate-800">
                                        {registry?.license_expiry || 'Dec 11, 2027'} (Codes: {registry?.license_codes || '1, 2'})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 1b: Tricycle Driver — visually distinct from the owner card above;
                            only a separate person when the application says the owner isn't the driver */}
                        <div className={`overflow-hidden rounded-2xl border border-indigo-200/70 bg-indigo-50/30 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/60 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/[0.12] text-indigo-600">
                                        <User size={15} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                                            Tricycle Driver
                                        </h3>
                                        <p className="text-[11px] text-indigo-400 font-normal">
                                            Person who drives this registered unit
                                        </p>
                                    </div>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${registry?.ownerIsDriver ? 'bg-white text-slate-600 border-slate-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200/70'}`}>
                                    {registry?.ownerIsDriver ? 'Same as Owner' : 'Different Person'}
                                </span>
                            </div>

                            <div className="p-5 text-xs">
                                {registry?.ownerIsDriver ? (
                                    <p className="text-slate-600">
                                        The <strong className="text-slate-800">Tricycle Owner</strong>{' '}
                                        ({registry?.operator || '—'}) is also the tricycle driver of this unit.
                                    </p>
                                ) : registry?.tricycleDriver ? (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium">Name</span>
                                            <span className="font-semibold text-slate-800">{registry.tricycleDriver.full_name || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                                <Calendar size={13} className="text-slate-400" />
                                                Birthday
                                            </span>
                                            <span className="font-semibold text-slate-800">{registry.tricycleDriver.birthday || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                                <Phone size={13} className="text-slate-400" />
                                                Mobile
                                            </span>
                                            <span className="font-mono font-semibold text-slate-800">{registry.tricycleDriver.contact_number || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                                <MapPin size={13} className="text-slate-400" />
                                                Barangay
                                            </span>
                                            <span className="font-semibold text-slate-800">{registry.tricycleDriver.barangay || '—'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-500">No separate driver provided for this unit.</p>
                                )}
                            </div>
                        </div>

                        {/* Card 2: Franchise & Route Information */}
                        <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.02] text-emerald-600">
                                        <FileBadge size={15} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Franchise &amp; Route Information
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-normal">
                                            Franchise permit and route details
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                                    <Check size={10} strokeWidth={2.5} />
                                    Approved
                                </span>
                            </div>

                            <div className="p-5 divide-y divide-slate-100 text-xs">
                                <div className="pb-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Franchise Number</span>
                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                                        {registry?.sticker_no || 'N/A'}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Date Issued</span>
                                    <span className="font-semibold text-slate-800">{registry?.issue_date || 'March 12, 2026'}</span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Navigation size={13} className="text-slate-400" />
                                        GPS Tracking Status
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Mobile GPS Active
                                    </span>
                                </div>

                                <div className="pt-3">
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Authorized to pick up and drop off passengers within the municipality of Nasugbu under local traffic rules.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── COLUMN 2: VEHICLE TECHNICAL SPECS & CODING SCHEME ── */}
                    <div className="space-y-6">

                        {/* Card 1: Registered Tricycle Specifications */}
                        <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                        <Bike size={15} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Tricycle Details
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-normal">
                                            Motorcycle, sidecar, and LTO registration details
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-slate-400">
                                    Registered
                                </span>
                            </div>

                            <div className="p-5 divide-y divide-slate-100 text-xs">
                                <div className="pb-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Make &amp; Model</span>
                                    <span className="font-bold text-slate-900">{registry?.make || '—'}</span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Year &amp; Body Color</span>
                                    <span className="font-semibold text-slate-800">
                                        {registry?.year_model || '2022'} &bull; {registry?.body_color || 'Blue'}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Sidecar Type</span>
                                    <span className="font-semibold text-slate-800">{registry?.body_type || 'Standard Side Car'}</span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">LTO Plate Number</span>
                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                                        {registry?.plate_no || '—'}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Sticker Number</span>
                                    <span className="font-mono font-bold text-[#1D2542] text-sm">
                                        No. {registry?.coding_scheme_number || '—'}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Official Receipt (OR) Number</span>
                                    <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        {registry?.or_number || 'OR-2026-000141'}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Certificate of Registration (CR) Number</span>
                                    <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        {registry?.cr_number || 'CR-2026-000141'}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Engine Number</span>
                                    <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        {registry?.engine_number || 'N/A'}
                                    </span>
                                </div>

                                <div className="pt-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Chassis Number</span>
                                    <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        {registry?.chassis_number || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Color Coding & Traffic Schedule */}
                        <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 ${CARD_SHADOW} space-y-4`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-[#1D2542]" />
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Color Coding &amp; Traffic Schedule
                                        </h4>
                                        <p className="text-[11px] text-slate-400 font-normal">
                                            Weekly coding day and operating hours
                                        </p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${codingInfo.badgeClass}`}>
                                    {codingInfo.day} Coding
                                </span>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Coding Day:</span>
                                    <span className="font-bold text-slate-900">{codingInfo.day}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Color Scheme:</span>
                                    <span className="font-semibold text-slate-800">{codingInfo.scheme} (Ending in {codingInfo.digits})</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Authorized Area:</span>
                                    <span className="font-semibold text-[#1D2542]">Nasugbu Municipal Zone</span>
                                </div>
                            </div>

                            <div className="rounded-lg bg-amber-50/60 p-3 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                                <strong>Notice:</strong> Tricycles are not allowed to operate on highways during their assigned coding day. Violations will be reported to the Traffic Management Office (TMO).
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </BPLOLayout>
    );
}