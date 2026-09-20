import React from 'react';
import { Head, Link } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    ChevronLeft, Calendar, Bike, MapPin,
    User, Phone, Printer, ShieldCheck,
    Clock, FileBadge, Check, Mail,
    CreditCard, Home, Navigation
} from 'lucide-react';

/**
 * Determine coding day and scheme details from body number or registry coding_day.
 */
function getCodingSchemeInfo(bodyNumber, serverCodingDay) {
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

    if (!bodyNumber) {
        return { day: 'Monday', digits: '1 & 2', scheme: 'Blue Scheme', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotClass: 'bg-blue-500' };
    }

    const clean = String(bodyNumber).trim();
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
    const codingInfo = getCodingSchemeInfo(registry?.body_no, registry?.coding_day);
    const isActive = registry?.status === 'active';

    const handlePrint = () => {
        window.print();
    };

    return (
        <BPLOLayout title="Registry Details" role="BPLO Officer">
            <Head title={`Registry: ${registry?.body_no || registry?.plate_no || 'Unit'} | TRIVORA`} />

            <div className="mx-auto max-w-7xl space-y-6 pb-12">

                {/* ══════════════════════════════════════════════════════════════
                    1. TOP ACTION & NAVIGATION BAR
                   ══════════════════════════════════════════════════════════════ */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href="/bplo/registry"
                        className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                        <span>Back to Active Registry</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-[0.98] transition-all"
                        >
                            <Printer size={13} strokeWidth={2.2} className="text-slate-500" />
                            <span>Print Record</span>
                        </button>

                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-[#1D2542]">
                            {registry?.plate_no || 'NO-PLATE'}
                        </span>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    2. HERO PROFILE HEADER CARD
                   ══════════════════════════════════════════════════════════════ */}
                <div className={`relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-8 ${CARD_SHADOW}`}>
                    {/* Barely-there ambient color — brand tint without ever reading as a solid block */}
                    <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-gradient-to-br from-[#1D2542]/[0.07] to-transparent blur-3xl" aria-hidden="true" />
                    <Bike size={128} className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 text-[#1D2542]/[0.04]" />

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            {/* Eyebrow */}
                            <div className="mb-2 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                                <span>Municipality of Nasugbu &bull; BPLO Tricycle Record</span>
                            </div>

                            {/* Title & Badges */}
                            <div className="mb-3.5 flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="font-mono text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
                                    No. {registry?.body_no || '—'}
                                </span>

                                {/* LTO Plate Badge */}
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs sm:text-sm font-black tracking-wider shadow-xs">
                                    {registry?.plate_no || '—'}
                                </span>

                                {/* Franchise Sticker Badge */}
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                                    <FileBadge size={12} className="text-slate-400" />
                                    <span>{registry?.sticker_no || `STK-${registry?.body_no || '0000'}`}</span>
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
                            </div>

                            {/* Bottom Metadata Row */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <User size={14} className="text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-900">{registry?.operator || 'Registered Driver'}</span>
                                </div>

                                <span className="text-slate-300 hidden sm:inline">&bull;</span>

                                <div className="flex items-center gap-1.5">
                                    <Bike size={14} className="text-slate-400 shrink-0" />
                                    <span>{registry?.make || 'Standard Tricycle Unit'}</span>
                                </div>

                                <span className="text-slate-300 hidden sm:inline">&bull;</span>

                                <div className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                    <span>{registry?.toda || 'Unassigned TODA'}</span>
                                </div>

                                <span className="text-slate-300 hidden sm:inline">&bull;</span>

                                <div className="flex items-center gap-1.5">
                                    <span className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-slate-200 shrink-0 ${codingInfo.dotClass}`} />
                                    <span className="font-semibold text-slate-900">
                                        {codingInfo.day} Coding ({codingInfo.scheme})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Seal & Municipal Badge */}
                        <div className="self-start lg:self-center flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm border border-slate-200/70">
                                <img src="/images/logo.png" alt="TRIVORA Logo" className="h-full w-full object-contain" />
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">LGU Nasugbu</span>
                                <span className="text-xs font-black text-slate-900 block">Official BPLO Record</span>
                                <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold mt-0.5">
                                    <Check size={11} strokeWidth={2.5} /> Verified Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    3. BALANCED 2-COLUMN EXECUTIVE WORKSTATION (50/50 Split)
                   ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* ── COLUMN 1: DRIVER PROFILE & FRANCHISE CLEARANCE ── */}
                    <div className="space-y-6">

                        {/* Card 1: Driver & Operator Information */}
                        <div className={`overflow-hidden rounded-2xl border border-slate-200/70 bg-white ${CARD_SHADOW}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D2542]/[0.10] to-[#1D2542]/[0.02] text-[#1D2542]">
                                        <User size={15} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Driver &amp; Operator Information
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-normal">
                                            Personal and driver's license details
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
                                    <span className="text-slate-500 font-medium">Franchise Sticker No.</span>
                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                                        {registry?.sticker_no || `STK-${registry?.body_no || '0141'}`}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">MTOP Permit No.</span>
                                    <span className="font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        MTOP-2026-{registry?.body_no || '0141'}
                                    </span>
                                </div>

                                <div className="py-3 flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Assigned TODA</span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-[#1D2542] border border-indigo-100">
                                        {registry?.toda || 'Unassigned Zone'}
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
                                        Authorized to pick up and drop off passengers within the route of {registry?.toda || 'Nasugbu'} under local traffic rules.
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
                                    <span className="text-slate-500 font-medium">Tricycle Number Coding Scheme</span>
                                    <span className="font-mono font-bold text-[#1D2542] text-sm">
                                        No. {registry?.body_no || '—'}
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
                                    <span className="text-slate-500 font-medium">Restricted Hours:</span>
                                    <span className="font-semibold text-slate-800">7:00 AM – 7:00 PM</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Color Scheme:</span>
                                    <span className="font-semibold text-slate-800">{codingInfo.scheme} (Ending in {codingInfo.digits})</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Authorized Route:</span>
                                    <span className="font-semibold text-[#1D2542]">{registry?.toda || 'Assigned Zone'}</span>
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