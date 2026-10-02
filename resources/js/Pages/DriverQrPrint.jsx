import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Printer, Download, AlertTriangle, X } from 'lucide-react';
import QrCodeImage, { downloadQrPng } from '@/Components/QrCodeImage';

/**
 * Printable "Scan to Ride" sheet for the driver's assigned tricycle.
 * Formatted for standard A6 portrait sheet size. Allows the driver to download high-res PNG or print/save as PDF.
 */
export default function DriverQrPrint({ unit, qrRide, autoPrint = false }) {
    const ready = qrRide.status === 'ready';

    useEffect(() => {
        if (autoPrint) {
            const timer = setTimeout(() => {
                window.print();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [autoPrint]);

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans">
            <Head title={`${unit.unit_code} Driver QR | TRIVORA`} />
            <style>{`
                @page { size: A6 portrait; margin: 0; }
                @media print {
                    .qr-sheet { box-shadow: none !important; border: 0 !important; margin: 0 auto !important; }
                }
            `}</style>

            {/* Screen-only toolbar */}
            <div className="print:hidden border-b border-slate-200 bg-white shadow-sm">
                <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            <X size={14} /> Close
                        </button>
                        <span className="font-mono text-sm font-bold text-slate-800">{unit.unit_code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => downloadQrPng(qrRide.qr_url, `trivora-scan-to-ride-${unit.unit_code}.png`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                            <Download size={14} /> Download PNG
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D2542] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 shadow-sm"
                        >
                            <Printer size={14} /> Print / Save as PDF
                        </button>
                    </div>
                </div>

                {!ready && (
                    <div className="mx-auto max-w-2xl px-4 pb-3">
                        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" />
                            <span>This QR code is not accepting passengers yet. {qrRide.note}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* The sheet (A6: 105mm x 148mm) */}
            <div className="qr-sheet mx-auto my-8 flex w-[105mm] min-h-[148mm] flex-col items-center justify-between border border-slate-200 bg-white px-[9mm] py-[10mm] text-center shadow-md print:my-0 print:border-0 print:shadow-none">
                <div>
                    <p className="text-[15pt] font-black tracking-[0.28em] text-[#1D2542]">TRIVORA</p>
                    <p className="mt-[2mm] text-[20pt] font-black leading-none tracking-tight text-slate-900">SCAN TO RIDE</p>
                </div>

                <div className="my-[4mm] flex items-center justify-center p-2 rounded-xl border border-slate-100 bg-white">
                    <QrCodeImage value={qrRide.qr_url} size={250} title={`Scan to ride ${unit.unit_code}`} />
                </div>

                <p className="text-[10pt] leading-snug text-slate-600">
                    Scan to enter your destination<br />and join this tricycle's ride.
                </p>

                <div className="mt-[5mm] w-full border-t border-slate-300 pt-[4mm]">
                    <div className="grid grid-cols-2 gap-[3mm] text-center">
                        <div>
                            <p className="text-[7pt] font-bold uppercase tracking-widest text-slate-500">Unit Code</p>
                            <p className="font-mono text-[12pt] font-black text-slate-900">{unit.unit_code}</p>
                        </div>
                        <div>
                            <p className="text-[7pt] font-bold uppercase tracking-widest text-slate-500">Plate Number</p>
                            <p className="font-mono text-[12pt] font-black text-slate-900">{unit.plate_number || '—'}</p>
                        </div>
                        {unit.sticker_number && (
                            <div>
                                <p className="text-[7pt] font-bold uppercase tracking-widest text-slate-500">Sticker Number</p>
                                <p className="font-mono text-[11pt] font-bold text-slate-800">{unit.sticker_number}</p>
                            </div>
                        )}
                        {unit.passenger_capacity && (
                            <div>
                                <p className="text-[7pt] font-bold uppercase tracking-widest text-slate-500">Capacity</p>
                                <p className="text-[11pt] font-bold text-slate-800">{unit.passenger_capacity} Passengers</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
