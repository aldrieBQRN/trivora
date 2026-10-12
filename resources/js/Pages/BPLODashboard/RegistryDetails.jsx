import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import useBackgroundRefresh from '@/hooks/useBackgroundRefresh';
import BPLOLayout from '@/Layouts/BPLOLayout';
import Avatar from '@/Components/Avatar';
import {
    ChevronLeft, Calendar, Bike, MapPin,
    User, Phone,
    Clock, FileBadge, Check, Mail,
    Navigation
} from 'lucide-react';

// Shared soft, layered shadow token — same elevation used across the other BPLO/TMO pages.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

/**
 * Determine coding day and scheme details from the Sticker Number or registry coding_day.
 */
function getCodingSchemeInfo(registry) {
    if (!registry) {
        return { day: 'Unassigned', digits: '—', scheme: 'Standard Scheme', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-400' };
    }

    const cs = registry.coding_status;
    if (cs && cs.scheme_name) {
        const day = (cs.restricted_days && cs.restricted_days[0]) ? cs.restricted_days[0] : (registry.coding_day || 'Unassigned');
        const digits = (cs.restricted_digits && cs.restricted_digits.length > 0) ? cs.restricted_digits.join(' & ') : '—';
        return {
            day,
            digits,
            scheme: `${cs.scheme_name} Scheme`,
            hex: cs.color_hex,
            badgeClass: 'border-slate-200/80',
            dotClass: '',
            style: { backgroundColor: `${cs.color_hex}15`, color: '#1e293b', borderColor: `${cs.color_hex}40` },
            dotStyle: { backgroundColor: cs.color_hex },
        };
    }

    const day = registry.coding_day && registry.coding_day !== 'None' ? registry.coding_day : 'Unassigned';
    const scheme = registry.coding_scheme ? `${registry.coding_scheme} Scheme` : 'Standard Scheme';
    const hex = registry.coding_color || '#64748B';
    return {
        day,
        digits: '—',
        scheme,
        hex,
        badgeClass: 'border-slate-200/80',
        dotClass: '',
        style: { backgroundColor: `${hex}15`, color: '#1e293b', borderColor: `${hex}40` },
        dotStyle: { backgroundColor: hex },
    };
}

export default function RegistryDetails({ registry }) {
    const codingInfo = useMemo(() => getCodingSchemeInfo(registry), [registry]);
    const isActive = registry?.status === 'active';

    // Background refresh of this registry entry: a status change made in another session updates
    // it without a manual reload. Display-only page — no form or modal state to disturb.
    useBackgroundRefresh(['registry']);

    return (
        <BPLOLayout title="Registry Details" role="BPLO Officer">
            <Head title={`Registry: ${registry?.coding_scheme_number || registry?.plate_no || 'Unit'} | TRIVORA`} />

            <div className="mx-auto max-w-7xl space-y-6 pb-12">

                {/* ── Top Bar: Navigation ── */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                    <Link
                        href="/bplo/registry"
                        className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                        <span>Back to Active Registry</span>
                    </Link>
                </div>

                {/* ── Page Hero: Unit Identification & Status ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 leading-tight">
                                Franchise {registry?.sticker_no || '—'}
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-black tracking-wider">
                                {registry?.plate_no || 'NO PLATE'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
                            {registry?.make || 'Tricycle'} · Official Registry Record · Nasugbu, Batangas
                        </p>
                    </div>

                    {isActive ? (
                        <span className="inline-flex items-center self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                            Active Franchise
                        </span>
                    ) : (
                        <span className="inline-flex items-center self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                            Suspended / Revoked
                        </span>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. BALANCED 2-COLUMN EXECUTIVE WORKSTATION (50/50 Split)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* ── COLUMN 1: DRIVER PROFILE & FRANCHISE CLEARANCE ── */}
                    <div className="space-y-6">

                        {/* Card 1: Tricycle Owner Information */}
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#182B62]/[0.10] to-[#182B62]/[0.02] text-[#182B62]">
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
                                    <Avatar
                                        name={registry?.operator}
                                        src={registry?.operator_photo}
                                        className="h-12 w-12 rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-white flex items-center justify-center text-sm font-bold shadow-2xs shrink-0"
                                    />
                                </div>

                                {/* First Name & Last Name */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">First Name</span>
                                    <span className="font-semibold text-slate-900">
                                        {registry?.first_name || registry?.owner?.first_name || '—'}
                                    </span>
                                </div>
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Last Name</span>
                                    <span className="font-semibold text-slate-900">
                                        {registry?.last_name || registry?.owner?.last_name || '—'}
                                    </span>
                                </div>

                                {/* Date of Birth */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Calendar size={13} className="text-slate-400" />
                                        Birthday
                                    </span>
                                    <span className="font-mono font-semibold text-slate-800">
                                        {registry?.date_of_birth || registry?.owner?.birthday || '—'}
                                    </span>
                                </div>

                                {/* Contact Number */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Phone size={13} className="text-slate-400" />
                                        Mobile Number
                                    </span>
                                    {registry?.contact && registry.contact !== 'N/A' ? (
                                        <a href={`tel:${registry.contact}`} className="font-semibold text-slate-800 hover:text-[#182B62] transition-colors font-mono">
                                            {registry.contact}
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">No contact provided</span>
                                    )}
                                </div>

                                {/* Barangay */}
                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <MapPin size={13} className="text-slate-400" />
                                        Barangay (Nasugbu)
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                        {registry?.barangay || 'Poblacion'}
                                    </span>
                                </div>

                                {/* Email Address */}
                                <div className="pt-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Mail size={13} className="text-slate-400" />
                                        Email Address
                                    </span>
                                    <span className="font-semibold text-slate-700 truncate max-w-[220px]">
                                        {registry?.email || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 1b: Tricycle Driver — visually distinct from the owner card above;
                            only a separate person when the application says the owner isn't the driver */}
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-indigo-200/70 bg-indigo-50/30 ${CARD_SHADOW}`}>
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
                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium">First Name</span>
                                            <span className="font-semibold text-slate-800">{registry.tricycleDriver.first_name || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium">Last Name</span>
                                            <span className="font-semibold text-slate-800">{registry.tricycleDriver.last_name || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                                <Calendar size={13} className="text-slate-400" />
                                                Birthday
                                            </span>
                                            <span className="font-mono font-semibold text-slate-800">{registry.tricycleDriver.birthday || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                                <Phone size={13} className="text-slate-400" />
                                                Mobile Number
                                            </span>
                                            <span className="font-mono font-semibold text-slate-800">{registry.tricycleDriver.contact_number || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                                <MapPin size={13} className="text-slate-400" />
                                                Barangay (Nasugbu)
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
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
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
                        <div className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#182B62]/[0.10] to-[#182B62]/[0.02] text-[#182B62]">
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
                                    <span className="font-mono font-bold text-[#182B62] text-sm">
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
                        <div className={`rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 space-y-4 ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-[#182B62]" />
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Color Coding &amp; Traffic Schedule
                                        </h4>
                                        <p className="text-[11px] text-slate-400 font-normal">
                                            Weekly coding day and operating hours
                                        </p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${codingInfo.badgeClass}`} style={codingInfo.style}>
                                    {codingInfo.day} Coding
                                </span>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Sticker Number:</span>
                                    <span className="font-mono font-bold text-[#182B62]">{registry?.coding_scheme_number || '—'}</span>
                                </div>
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
                                    <span className="font-semibold text-[#182B62]">Nasugbu Municipal Zone</span>
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
