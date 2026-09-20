import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import {
    MapPin, ChevronLeft, Edit2, Building2, User, Phone,
    Bike, ShieldCheck, AlertTriangle, ArrowUpRight,
    Compass, X, CheckCircle2, Calendar, FileText
} from 'lucide-react';

const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';
const NASUGBU_CENTER = [14.0733, 120.6320];

// Custom terminal icon matching Live Monitoring TODA terminal marker
const terminalPinIcon = L.divIcon({
    className: 'custom-toda-marker',
    html: `
        <div class="relative flex items-center justify-center cursor-pointer" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.28));">
            <div style="
                background: #1D2542;
                color: #FFFFFF;
                width: 28px;
                height: 28px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #FFFFFF;
            ">
                <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                </div>
            </div>
        </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26]
});

export default function TodaDetails({ toda = {}, assignedTricycles = [] }) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const hasCoordinates = toda.latitude !== null && toda.longitude !== null &&
                           toda.latitude !== undefined && toda.longitude !== undefined;

    const mapCenter = hasCoordinates ? [toda.latitude, toda.longitude] : NASUGBU_CENTER;

    return (
        <TrivoraLayout title={`TODA: ${toda.name}`} role="TMO Personnel">
            <Head title={`${toda.name} | TRIVORA`} />

            {/* ══════════════════════════════════════════════════════════════
                1. TOP ACTION & NAVIGATION BAR
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-4 flex items-center justify-between">
                <Link
                    href="/tmo/toda"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                    <span>Back to TODA Management</span>
                </Link>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                2. HEADER BANNER
               ══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>TODA Profile</span>
                        <span>·</span>
                        <span className="font-mono text-slate-700">{toda.code}</span>
                    </div>
                    <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        {toda.name}
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                        Registered in Barangay {toda.barangay}, Nasugbu Batangas
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                        toda.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                        <span>{toda.is_active ? 'Active Association' : 'Inactive'}</span>
                    </span>

                    <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                    >
                        <Edit2 size={13} strokeWidth={2.2} />
                        <span>Edit Details &amp; Location</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                3. MAIN 2-COLUMN LAYOUT
               ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                {/* ── LEFT COLUMN: TERMINAL MAP & DETAILS (5 cols) ── */}
                <div className="flex flex-col gap-6 lg:col-span-5">

                    {/* Terminal Location Card */}
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[#1D2542]">
                                    <MapPin size={15} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Official Terminal Location
                                </h3>
                            </div>
                            {hasCoordinates ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2 py-0.2">
                                    <CheckCircle2 size={10} />
                                    <span>Pinned</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-full px-2 py-0.2">
                                    <AlertTriangle size={10} />
                                    <span>Not Set</span>
                                </span>
                            )}
                        </div>

                        {/* Interactive Leaflet Map */}
                        <div className="relative h-[260px] w-full bg-slate-100 z-0">
                            <MapContainer
                                center={mapCenter}
                                zoom={hasCoordinates ? 16 : 14}
                                zoomControl={false}
                                scrollWheelZoom={true}
                                className="h-full w-full"
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_3qo7_1_ac41fdc9883213d666d06544"
                                    attribution='&copy; CARTO'
                                />

                                {hasCoordinates && (
                                    <Marker position={[toda.latitude, toda.longitude]} icon={terminalPinIcon}>
                                        <Popup>
                                            <div className="p-1">
                                                <p className="font-bold text-slate-900 text-xs m-0">{toda.name}</p>
                                                <p className="text-[11px] text-slate-500 m-0 mt-0.5">{toda.terminal_name || toda.barangay}</p>
                                                <p className="text-[10px] text-slate-400 font-mono m-0 mt-1">
                                                    {toda.latitude.toFixed(5)}° N, {toda.longitude.toFixed(5)}° E
                                                </p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                                <ZoomControl position="bottomright" />
                            </MapContainer>

                            {!hasCoordinates && (
                                <div className="absolute inset-0 z-[1000] pointer-events-none flex flex-col items-center justify-center bg-slate-900/10 p-4 text-center">
                                    <div className="rounded-xl bg-white/95 p-3.5 shadow-md border border-slate-200 max-w-xs">
                                        <AlertTriangle size={20} className="mx-auto text-amber-600 mb-1.5" />
                                        <p className="text-xs font-bold text-slate-800">No Pin Configured</p>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Click "Edit Details &amp; Location" to place this TODA's terminal marker on the map.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Location Details Strip */}
                        <div className="p-5 border-t border-slate-100 space-y-3">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terminal Name</span>
                                <p className="text-sm font-bold text-slate-900 mt-0.5">
                                    {toda.terminal_name || <span className="text-slate-400 font-normal italic">Not specified</span>}
                                </p>
                            </div>

                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Address / Landmark</span>
                                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                                    {toda.address || <span className="text-slate-400 italic">Not specified</span>}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400">Coordinates</span>
                                    <p className="font-mono text-slate-800 font-semibold mt-0.5">
                                        {hasCoordinates ? `${toda.latitude.toFixed(5)}, ${toda.longitude.toFixed(5)}` : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400">Barangay</span>
                                    <p className="font-semibold text-slate-800 mt-0.5">{toda.barangay}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Organization & Contact Card */}
                    <div className={`rounded-2xl border border-slate-200/90 bg-white p-5 ${CARD_SHADOW} space-y-3.5`}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                            Association Leadership
                        </h4>

                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <User size={18} strokeWidth={2.2} />
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-400">TODA President / Head</span>
                                <p className="text-xs sm:text-sm font-bold text-slate-900">
                                    {toda.president_name || <span className="text-slate-400 font-normal italic">Not recorded</span>}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <Phone size={18} strokeWidth={2.2} />
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-400">Contact Number</span>
                                <p className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                                    {toda.contact_number || <span className="text-slate-400 font-normal font-sans italic">Not recorded</span>}
                                </p>
                            </div>
                        </div>

                        {toda.description && (
                            <div className="pt-2 border-t border-slate-100">
                                <span className="text-[11px] font-semibold text-slate-400">Description / Coverage</span>
                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed italic">
                                    "{toda.description}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN: ASSIGNED TRICYCLES (7 cols) ── */}
                <div className="flex flex-col gap-6 lg:col-span-7">
                    <div className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white ${CARD_SHADOW}`}>
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[#1D2542]">
                                    <Bike size={15} strokeWidth={2.2} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Assigned Tricycles
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Tricycles registered under {toda.name}
                                    </p>
                                </div>
                            </div>

                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 font-mono">
                                {assignedTricycles.length} units
                            </span>
                        </div>

                        {assignedTricycles.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <Bike size={20} strokeWidth={1.8} />
                                </div>
                                <h4 className="mt-3 text-sm font-bold text-slate-800">No tricycles assigned</h4>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                    No tricycles currently have their TODA Zone set to {toda.name}. Tricycles can be assigned through MTOP registration or the Tricycle Registry.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/75">
                                            <th scope="col" className="py-3 pl-5 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Body # / Scheme
                                            </th>
                                            <th scope="col" className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Plate Number
                                            </th>
                                            <th scope="col" className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Driver / Operator
                                            </th>
                                            <th scope="col" className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Make &amp; Model
                                            </th>
                                            <th scope="col" className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Status
                                            </th>
                                            <th scope="col" className="py-3 pl-2 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {assignedTricycles.map((tri) => (
                                            <tr key={tri.id} className="group transition-colors hover:bg-slate-50/80">
                                                {/* Body # */}
                                                <td className="py-3 pl-5 pr-3 align-middle font-mono font-bold text-xs text-slate-900">
                                                    #{tri.body_number}
                                                </td>

                                                {/* Plate */}
                                                <td className="py-3 px-3 align-middle">
                                                    <span className="font-mono font-bold text-xs text-slate-800">
                                                        {tri.plate_number}
                                                    </span>
                                                </td>

                                                {/* Operator */}
                                                <td className="py-3 px-3 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">
                                                            {tri.operator_name}
                                                        </span>
                                                        {tri.contact_number !== 'N/A' && (
                                                            <span className="text-[10.5px] text-slate-400 font-mono">
                                                                {tri.contact_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Make & Model */}
                                                <td className="py-3 px-3 align-middle">
                                                    <span className="text-xs text-slate-600 truncate max-w-[140px] block">
                                                        {tri.make_model || 'N/A'}
                                                    </span>
                                                    {tri.color_scheme && (
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {tri.color_scheme}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-3 align-middle">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                                                        tri.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : tri.status === 'suspended'
                                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        {tri.status === 'active' ? 'Active' : tri.status === 'suspended' ? 'Suspended' : 'Unregistered'}
                                                    </span>
                                                </td>

                                                {/* Action */}
                                                <td className="py-3 pl-2 pr-5 text-right align-middle">
                                                    <Link
                                                        href={`/tmo/tricycle/${tri.id}`}
                                                        className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                                        title="View Tricycle Profile"
                                                    >
                                                        <span>Profile</span>
                                                        <ArrowUpRight size={11} strokeWidth={2.5} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════
                4. EDIT MODAL WITH MAP PICKER
               ══════════════════════════════════════════════════════════════ */}
            {isEditModalOpen && (
                <EditTodaDetailsModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    toda={toda}
                />
            )}
        </TrivoraLayout>
    );
}

function EditTodaDetailsModal({ isOpen, onClose, toda }) {
    const form = useForm({
        name: toda.name || '',
        code: toda.code || '',
        barangay: toda.barangay || '',
        terminal_name: toda.terminal_name || '',
        address: toda.address || '',
        latitude: toda.latitude !== null && toda.latitude !== undefined ? toda.latitude : '',
        longitude: toda.longitude !== null && toda.longitude !== undefined ? toda.longitude : '',
        president_name: toda.president_name || '',
        contact_number: toda.contact_number || '',
        description: toda.description || '',
        is_active: toda.is_active ?? true,
    });

    const [mapCenter] = useState(() => {
        if (toda.latitude && toda.longitude) {
            return [toda.latitude, toda.longitude];
        }
        return NASUGBU_CENTER;
    });

    const handleLocationSelect = (lat, lng) => {
        form.setData((prev) => ({
            ...prev,
            latitude: Number(lat.toFixed(7)),
            longitude: Number(lng.toFixed(7)),
        }));
    };

    const handleMarkerDrag = (e) => {
        const marker = e.target;
        if (marker != null) {
            const position = marker.getLatLng();
            form.setData((prev) => ({
                ...prev,
                latitude: Number(position.lat.toFixed(7)),
                longitude: Number(position.lng.toFixed(7)),
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        form.put(`/tmo/toda/${toda.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                Swal.fire({
                    icon: 'success',
                    title: 'TODA Updated',
                    text: 'TODA and terminal details updated successfully.',
                    timer: 1800,
                    showConfirmButton: false,
                });
            },
        });
    };

    const hasCoordinates = form.data.latitude !== '' && form.data.longitude !== '' &&
                           form.data.latitude !== null && form.data.longitude !== null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#1D2542]">
                            <Building2 size={16} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Edit {toda.name}
                            </h3>
                            <p className="text-xs text-slate-400">
                                Update terminal location and association information
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                TODA Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-[#1D2542] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                TODA Code <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={form.data.code}
                                onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
                                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-[#1D2542] outline-none font-mono uppercase"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Barangay <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={form.data.barangay}
                                onChange={(e) => form.setData('barangay', e.target.value)}
                                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-[#1D2542] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Terminal Name
                            </label>
                            <input
                                type="text"
                                value={form.data.terminal_name}
                                onChange={(e) => form.setData('terminal_name', e.target.value)}
                                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-[#1D2542] outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Address / Landmark
                        </label>
                        <input
                            type="text"
                            value={form.data.address}
                            onChange={(e) => form.setData('address', e.target.value)}
                            className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-[#1D2542] outline-none"
                        />
                    </div>

                    {/* Interactive Map Location Picker */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Compass size={14} className="text-[#1D2542]" />
                                <span className="text-xs font-bold text-slate-800">
                                    Terminal Map Location
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                Click map to set pin
                            </span>
                        </div>

                        <div className="relative h-56 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 z-0">
                            <MapContainer
                                center={mapCenter}
                                zoom={hasCoordinates ? 16 : 14}
                                scrollWheelZoom={true}
                                className="h-full w-full"
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_3qo7_1_ac41fdc9883213d666d06544"
                                    attribution='&copy; CARTO'
                                />

                                <MapClickHandler onLocationSelect={handleLocationSelect} />

                                {hasCoordinates && (
                                    <Marker
                                        position={[Number(form.data.latitude), Number(form.data.longitude)]}
                                        icon={terminalPinIcon}
                                        draggable={true}
                                        eventHandlers={{
                                            dragend: handleMarkerDrag,
                                        }}
                                    />
                                )}
                            </MapContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">Latitude</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={form.data.latitude}
                                    onChange={(e) => form.setData('latitude', e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-mono text-slate-900 focus:border-[#1D2542] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10.5px] font-semibold text-slate-500 mb-0.5">Longitude</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={form.data.longitude}
                                    onChange={(e) => form.setData('longitude', e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-mono text-slate-900 focus:border-[#1D2542] outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                TODA President / Head
                            </label>
                            <input
                                type="text"
                                value={form.data.president_name}
                                onChange={(e) => form.setData('president_name', e.target.value)}
                                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-[#1D2542] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Contact Number
                            </label>
                            <input
                                type="text"
                                value={form.data.contact_number}
                                onChange={(e) => form.setData('contact_number', e.target.value)}
                                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-[#1D2542] outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Notes / Description
                        </label>
                        <textarea
                            rows={2}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#1D2542] outline-none resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="edit_is_active_checkbox"
                            checked={form.data.is_active}
                            onChange={(e) => form.setData('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-[#1D2542] focus:ring-[#1D2542]"
                        />
                        <label htmlFor="edit_is_active_checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                            Active TODA
                        </label>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-[#1D2542] hover:bg-[#283256] text-white px-5 py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {form.processing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}
