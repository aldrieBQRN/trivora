import { Calendar } from 'lucide-react';

/**
 * Shared date-range control for BPLO Reports & Analytics — a Quick Range preset dropdown plus
 * custom from/to inputs, in one compact row. Mirrors TMODashboard/Reports/DateRangeFilter.jsx's
 * structure and preset set exactly (Today/This Week/This Month/This Quarter/This Year), restyled
 * with BPLO's own slate/#1D2542 convention. No date-picker library: native `<input type="date">`
 * plus server-side Carbon math (see BPLOReportController) is enough at this scale.
 */
const PRESETS = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'This Week' },
    { value: '30d', label: 'This Month' },
    { value: '90d', label: 'This Quarter' },
    { value: '365d', label: 'This Year' },
];

// Uses local calendar-date components (not toISOString, which converts to UTC and can silently
// shift the date by a day depending on the browser's timezone offset).
function fmtLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function presetToRange(preset) {
    const to = new Date();
    const from = new Date();
    if (preset === 'today') {
        // from === to === today
    } else if (preset === '7d') {
        from.setDate(from.getDate() - 6);
    } else if (preset === '30d') {
        from.setDate(from.getDate() - 29);
    } else if (preset === '90d') {
        from.setDate(from.getDate() - 89);
    } else if (preset === '365d') {
        from.setDate(from.getDate() - 364);
    }
    return { from: fmtLocalDate(from), to: fmtLocalDate(to) };
}

export default function DateRangeFilter({ from, to, onChange }) {
    // Controlled: reflects whichever preset (if any) actually matches the current from/to props,
    // instead of guessing/resetting the select imperatively.
    const activePreset = PRESETS.find((p) => {
        const r = presetToRange(p.value);
        return r.from === from && r.to === to;
    })?.value || '';

    const handlePreset = (e) => {
        const preset = e.target.value;
        if (!preset) return;
        onChange(presetToRange(preset));
    };

    return (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <select
                value={activePreset}
                onChange={handlePreset}
                className="h-9 w-full shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:w-40"
            >
                <option value="">Quick Range…</option>
                {PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>

            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Calendar size={14} className="hidden shrink-0 text-slate-400 sm:block" />
                <input
                    type="date"
                    value={from}
                    max={to}
                    onChange={(e) => onChange({ from: e.target.value, to })}
                    className="h-9 min-w-0 flex-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:flex-none"
                />
                <span className="shrink-0 text-xs text-slate-400">to</span>
                <input
                    type="date"
                    value={to}
                    min={from}
                    onChange={(e) => onChange({ from, to: e.target.value })}
                    className="h-9 min-w-0 flex-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-[#1D2542] focus:outline-none focus:ring-2 focus:ring-[#1D2542]/10 sm:flex-none"
                />
            </div>
        </div>
    );
}
