import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/Components/TMO';
import {
    FileSpreadsheet, FileText, Download, Loader2, Check, X, Filter, RotateCcw,
} from 'lucide-react';

const FORMATS = {
    excel: {
        id: 'excel',
        label: 'Excel Spreadsheet',
        ext: '.xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        desc: 'Official municipal workbook with a regular (non-sticky) table header',
        badge: '.XLSX',
        badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        icon: FileSpreadsheet,
    },
    pdf: {
        id: 'pdf',
        label: 'PDF Report',
        ext: '.pdf',
        mime: 'application/pdf',
        desc: 'Official municipal document formatted as a landscape A4 table',
        badge: '.PDF',
        badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
        iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
        icon: FileText,
    },
};

/**
 * Export flow in ONE modal: choose a file format → exporting (progress) → download ready / failed.
 * Mirrors the System Activity Logs export, but as a single dialog that changes step instead of
 * closing one modal and opening another.
 *
 * Props:
 *   show, onClose
 *   title          — e.g. "Export Active Registry"
 *   recordLabel    — what is being exported, e.g. "registry units"
 *   recordCount    — number shown in the scope summary (omit for multi-section reports)
 *   scopeNote      — optional badge text, e.g. "Current Filters Applied"
 *   exportUrl      — endpoint (may already carry query params); `format` is appended
 *   fallbackName   — filename (without extension) if the server sends none
 */
export default function ExportDialog({ show, onClose, title, recordLabel = 'records', recordCount, scopeNote, exportUrl, fallbackName = 'trivora_export' }) {
    const [format, setFormat] = useState('excel');
    const [step, setStep] = useState('choose'); // 'choose' | 'loading' | 'success' | 'error'
    const [progress, setProgress] = useState(0);
    const [filename, setFilename] = useState('');
    const intervalRef = useRef(null);

    const meta = FORMATS[format];
    // "49 registry units", or just "Violations & Compliance report" when there's no single count.
    const scopeText = recordCount === undefined || recordCount === null ? recordLabel : `${recordCount} ${recordLabel}`;
    const MetaIcon = meta.icon;

    useEffect(() => () => clearInterval(intervalRef.current), []);

    const reset = () => {
        clearInterval(intervalRef.current);
        setStep('choose');
        setProgress(0);
        setFilename('');
    };

    const handleClose = () => {
        if (step === 'loading') return;
        onClose();
        setTimeout(reset, 300);
    };

    const runExport = async () => {
        setStep('loading');
        setProgress(12);

        // Smooth progress while the server builds the file; jumps to 100% once it arrives.
        intervalRef.current = setInterval(() => {
            setProgress((prev) => (prev >= 88 ? prev : prev + Math.floor(Math.random() * 10) + 6));
        }, 220);

        try {
            const url = new URL(exportUrl, window.location.origin);
            url.searchParams.set('format', format);

            const response = await fetch(url.toString(), { headers: { Accept: meta.mime } });
            if (!response.ok) throw new Error(`Export request failed with status: ${response.status}`);

            let name = `${fallbackName}${meta.ext}`;
            const disposition = response.headers.get('content-disposition');
            const match = disposition && /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (match && match[1]) name = match[1].replace(/['"]/g, '');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            clearInterval(intervalRef.current);
            setProgress(100);
            setFilename(name);
            setStep('success');
        } catch (err) {
            clearInterval(intervalRef.current);
            console.error('Failed to export report:', err);
            setStep('error');
        }
    };

    const headerTitle = {
        choose: title,
        loading: `Exporting to ${meta.label}`,
        success: 'Download Ready',
        error: 'Export Failed',
    }[step];

    const headerDescription = {
        choose: `Choose a file format to export ${scopeText}.`,
        loading: `Please wait while we prepare your ${recordLabel} as a ${meta.label}.`,
        success: `Your ${meta.label} has been downloaded successfully.`,
        error: 'An error occurred while preparing your export.',
    }[step];

    const secondaryBtn = 'rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer';
    const primaryBtn = 'inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] hover:bg-[#25449B] text-white px-5 py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer';

    const footer = {
        choose: (
            <div className="flex w-full items-center justify-between gap-3">
                <button type="button" onClick={handleClose} className={secondaryBtn}>Cancel</button>
                <button type="button" onClick={runExport} className={primaryBtn}>
                    <Download size={14} />
                    <span>Export {meta.badge}</span>
                </button>
            </div>
        ),
        loading: null,
        success: (
            <div className="flex w-full items-center justify-between gap-3">
                <button type="button" onClick={reset} className={secondaryBtn}>Export Another</button>
                <button type="button" onClick={handleClose} className={primaryBtn}>
                    <Check size={14} />
                    <span>Done</span>
                </button>
            </div>
        ),
        error: (
            <div className="flex w-full items-center justify-between gap-3">
                <button type="button" onClick={handleClose} className={secondaryBtn}>Close</button>
                <button type="button" onClick={runExport} className={primaryBtn}>
                    <RotateCcw size={14} />
                    <span>Try Again</span>
                </button>
            </div>
        ),
    }[step];

    return (
        <Modal
            show={show}
            onClose={handleClose}
            closeable={step !== 'loading'}
            maxWidth="lg"
            title={headerTitle}
            description={headerDescription}
            footer={footer}
        >
            <div className="py-1 font-['Plus_Jakarta_Sans',sans-serif]">
                {step === 'choose' && (
                    <div className="space-y-4">
                        {/* Export scope */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Filter size={14} className="text-slate-400 shrink-0" />
                                <span className="font-medium">
                                    Export Scope: <span className="font-bold text-slate-900">{scopeText}</span>
                                </span>
                            </div>
                            {scopeNote && (
                                <span className="inline-flex items-center self-start sm:self-auto rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
                                    {scopeNote}
                                </span>
                            )}
                        </div>

                        {/* Format options */}
                        <div role="radiogroup" aria-label="File format" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.values(FORMATS).map((item) => {
                                const isSelected = format === item.id;
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => setFormat(item.id)}
                                        className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#182B62]/30 ${
                                            isSelected
                                                ? 'border-[#182B62] bg-[#182B62]/[0.02] ring-2 ring-[#182B62]/20 shadow-xs'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                        }`}
                                    >
                                        <div className="w-full">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${item.iconColor}`}>
                                                    <Icon size={17} strokeWidth={2.2} />
                                                </div>
                                                <span className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                                                    isSelected ? 'border-[#182B62] bg-[#182B62]' : 'border-slate-300'
                                                }`}>
                                                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                </span>
                                            </div>
                                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                                {item.label}
                                                <span className={`inline-flex items-center rounded-md border px-1.5 py-px text-[9.5px] font-bold ${item.badgeColor}`}>
                                                    {item.badge}
                                                </span>
                                            </h4>
                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 'loading' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.iconColor}`}>
                                <Loader2 size={20} className="animate-spin" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-700">Preparing {meta.label}…</span>
                                    <span className="text-xs font-bold tabular-nums text-[#182B62]">{progress}%</span>
                                </div>
                                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-[#182B62] transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                            Formatting {scopeText}. Your download will start automatically once ready — please keep this window open.
                        </p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <Check size={20} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs font-bold text-emerald-900">Download Complete</h4>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700">
                                Saved to your downloads folder.
                            </p>
                            {filename && (
                                <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2 py-1 font-mono text-[10.5px] font-semibold text-slate-700">
                                    <MetaIcon size={12} className="shrink-0 text-emerald-600" />
                                    <span className="truncate">{filename}</span>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                            <X size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-rose-900">Failed to Export</h4>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700">
                                We couldn't generate the file. Please check your connection and try again.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
