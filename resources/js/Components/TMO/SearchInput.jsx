import { Search, X } from 'lucide-react';

/** Boxy (not pill) search input — the panel's one shared search control. */
export default function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
    return (
        <div className={`relative flex items-center ${className}`}>
            <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 text-tmo-subtle" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-lg border border-tmo-borderStrong bg-white pl-9 pr-9 text-sm text-tmo-ink placeholder:text-tmo-subtle transition-colors focus:border-tmo-primary focus:outline-none focus:ring-2 focus:ring-tmo-primary/15"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-tmo-subtle hover:bg-gray-100 hover:text-tmo-ink"
                >
                    <X size={13} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}
