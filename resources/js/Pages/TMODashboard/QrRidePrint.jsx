import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Printer, Download, AlertTriangle } from 'lucide-react';
import QrCodeImage, { downloadQrPng } from '@/Components/QrCodeImage';

/**
 * Printable "Scan to Ride" sheet for one tricycle — only what a passenger needs: the QR, one line
 * of instruction, and the unit's Unit Code / real Sticker Number (omitted when none is issued,
 * never invented). No token text, driver details, fares or capacity are printed.
 */
export default function QrRidePrint({ unit, qrRide }) {
    const ready = qrRide.status === 'ready';

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            <Head title={`${unit.unit_code} QR | TRIVORA`} />
            <style>{`
                @page { size: A6 portrait; margin: 0; }
                @media print { .qr-sheet { box-shadow: none !important; border: 0 !important; margin: 0 auto !important; } }
            `}</style>

            {/* Screen-only toolbar */}
            <div className="print:hidden border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <Link href={route('tricycle.details', unit.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
                        <ChevronLeft size={16} /> {unit.unit_code}
                    </Link>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => downloadQrPng(qrRide.qr_url, `trivora-scan-to-ride-${unit.unit_code}.png`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                            <Download size={14} /> Download PNG
                        </button>
                        <button type="button" onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D2542] px-3 py-2 text-xs font-bold text-white hover:opacity-90">
                            <Printer size={14} /> Print
                        </button>
                    </div>
                </div>
                {!ready && (
                    <div className="mx-auto max-w-3xl px-4 pb-3">
                        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>This QR is not accepting passengers yet. {qrRide.note}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* The sheet (A6) */}
            <div className="qr-sheet mx-auto my-8 flex w-[105mm] min-h-[148mm] flex-col items-center justify-between border border-slate-200 bg-white px-[9mm] py-[10mm] text-center shadow-sm print:my-0">
                <div>
                    <p className="text-[15pt] font-black tracking-[0.28em] text-[#1D2542]">TRIVORA</p>
                    <p className="mt-[2mm] text-[20pt] font-black leading-none tracking-tight text-slate-900">SCAN TO RIDE</p>
                </div>

                <QrCodeImage value={qrRide.qr_url} size={260} className="my-[5mm]" title={`Scan to ride ${unit.unit_code}`} />

                <p className="text-[10.5pt] leading-snug text-slate-700">
                    Scan to enter your destination<br />and join this tricycle's ride.
                </p>

                <div className="mt-[6mm] w-full border-t border-slate-300 pt-[4mm]">
                    <div className={`grid ${unit.sticker_number ? 'grid-cols-2' : 'grid-cols-1'} gap-[4mm]`}>
                        <div>
                            <p className="text-[7pt] font-bold uppercase tracking-widest text-slate-500">Unit Code</p>
                            <p className="font-mono text-[13pt] font-black text-slate-900">{unit.unit_code}</p>
                        </div>
                        {unit.sticker_number && (
                            <div>
                                <p className="text-[7pt] font-bold uppercase tracking-widest text-slate-500">Sticker Number</p>
                                <p className="font-mono text-[13pt] font-black text-slate-900">{unit.sticker_number}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
