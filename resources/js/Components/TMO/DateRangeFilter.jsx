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
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <select
                value={activePreset}
                onChange={handlePreset}
                aria-label="Quick range"
                className="h-9 shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs font-semibold text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:w-36"
            >
                <option value="">Quick Range…</option>
                {PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>

            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Calendar size={14} className="hidden shrink-0 text-tmo-subtle sm:block" />
                <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => onChange({ from: e.target.value, to })}
                    aria-label="From date"
                    className="h-9 min-w-0 flex-1 shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:flex-none"
                />
                <span className="shrink-0 text-xs text-tmo-subtle">to</span>
                <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => onChange({ from, to: e.target.value })}
                    aria-label="To date"
                    className="h-9 min-w-0 flex-1 shrink-0 rounded-lg border border-tmo-borderStrong bg-white px-2.5 text-xs text-tmo-ink focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15 sm:flex-none"
                />
            </div>
        </div>
    );
}
