import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, XCircle, Clock, ShieldOff, UserX, Settings2, Smartphone } from 'lucide-react';

/**
 * Public page a printed tricycle QR opens (/ride/q/{token}). Shows only safe unit details and
 * whether the tricycle is taking walk-in passengers right now — the status and message come from
 * the server (QrRideService::publicStatus). Joining happens in the Trivora Passenger app.
 */
const TITLES = {
    invalid_qr: { title: 'QR code not recognized', icon: XCircle, tone: 'danger' },
    tricycle_not_active: { title: 'Tricycle not in service', icon: ShieldOff, tone: 'danger' },
    franchise_suspended: { title: 'Franchise suspended', icon: ShieldOff, tone: 'danger' },
    franchise_revoked: { title: 'Franchise revoked', icon: ShieldOff, tone: 'danger' },
    franchise_inactive: { title: 'No active franchise', icon: ShieldOff, tone: 'danger' },
    no_driver: { title: 'No driver on duty', icon: UserX, tone: 'muted' },
    driver_offline: { title: 'No driver on duty', icon: UserX, tone: 'muted' },
    driver_busy: { title: 'Driver is on a booked ride', icon: Clock, tone: 'muted' },
    capacity_not_configured: { title: 'Not yet set up for QR Ride', icon: Settings2, tone: 'muted' },
    ride_full: { title: 'This tricycle is full', icon: Clock, tone: 'muted' },
    ride_in_progress: { title: 'Ride is currently in progress', icon: Clock, tone: 'muted' },
};

const TONE = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    muted: 'bg-slate-100 text-slate-600 ring-slate-200',
    danger: 'bg-red-50 text-red-600 ring-red-100',
};

export default function QrRideLanding({ status }) {
    const meta = status.available
        ? {
              title: status.state === 'boarding' ? 'Passengers are currently boarding' : 'Available',
              icon: CheckCircle2,
              tone: 'success',
          }
        : TITLES[status.reason] || { title: 'Not available right now', icon: Clock, tone: 'muted' };
    const Icon = meta.icon;
    const t = status.tricycle;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <Head title="Scan to Ride | TRIVORA" />
            <div className="mx-auto w-full max-w-sm">
                <Link href="/" className="mx-auto block w-fit">
                    <img src="/images/logo.png" alt="TRIVORA" className="h-9 w-auto" />
                </Link>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Scan to Ride</p>
                    <div className={`mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full ring-8 ${TONE[meta.tone]}`}>
                        <Icon size={26} strokeWidth={2.2} />
                    </div>
                    <h1 className="mt-4 text-lg font-black tracking-tight text-slate-900">{meta.title}</h1>
                    {status.message && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{status.message}</p>}

                    {t && (
                        <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100 text-left text-sm">
                            <Row label="Plate Number" value={t.plate_number} mono />
                            {t.sticker_number && <Row label="Sticker Number" value={t.sticker_number} mono />}
                            <Row label="Vehicle" value={[t.make, t.model].filter(Boolean).join(' ')} />
                            {t.body_color && <Row label="Color" value={t.body_color} />}
                        </dl>
                    )}
                </div>

                {status.available && (
                    <p className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
                        <Smartphone size={15} className="mt-0.5 shrink-0 text-slate-400" />
                        Scan this QR from the Trivora Passenger app to enter your destination, see your fare, and join.
                    </p>
                )}

                <p className="mt-6 text-center text-[11px] text-slate-400">Municipal Tricycle Office · Nasugbu, Batangas</p>
            </div>
        </div>
    );
}

function Row({ label, value, mono }) {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className={`font-semibold text-slate-900 ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</dd>
        </div>
    );
}
