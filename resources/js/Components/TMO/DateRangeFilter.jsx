import { Calendar } from 'lucide-react';

/**
 * Shared date-range control for Reports & Analytics: a Quick Range preset dropdown plus
 * custom from/to inputs, in one compact row. No date-picker library: native
 * `<input type="date">` plus server-side Carbon math (see TMO\ReportController) is enough
 * at this scale.
 */
const PRESETS = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'This Week' },
    { value: '30d', label: 'This Month' },
    { value: '90d', label: 'This Quarter' },
    { value: '365d', label: 'This Year' },
];

// Uses local calendar-date components (not toISOString, which converts to UTC and
// can silently shift the date by a day depending on the browser's timezone offset).
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
    // Controlled: reflects whichever preset (if any) actually matches the current
    // from/to props, instead of guessing/resetting the select imperatively.
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto font-['Plus_Jakarta_Sans',sans-serif]">
            <select
                value={activePreset}
                onChange={handlePreset}
                aria-label="Quick range"
                className="h-10 w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-8 text-xs font-bold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62] cursor-pointer"
            >
                <option value="">Quick Range…</option>
                {PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Calendar size={14} className="hidden shrink-0 text-slate-500 sm:block" />
                <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => onChange({ from: e.target.value, to })}
                    aria-label="From date"
                    className="h-10 flex-1 sm:w-32 sm:flex-none rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-semibold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                />
                <span className="shrink-0 text-xs font-bold text-slate-500 px-0.5">to</span>
                <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => onChange({ from, to: e.target.value })}
                    aria-label="To date"
                    className="h-10 flex-1 sm:w-32 sm:flex-none rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-semibold text-slate-700 transition-colors focus:border-[#182B62] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#182B62]"
                />
            </div>
        </div>
    );
}
