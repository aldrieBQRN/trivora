import { Search, X } from 'lucide-react';

/** Boxy (not pill) search input — the panel's one shared search control. */
export default function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
    return (
        <div className={`relative flex items-center ${className}`}>
            <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 text-gray-400" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-[13.5px] text-gray-900 placeholder:text-gray-400 transition-all focus:border-tmo-primary focus:outline-none focus:ring-[3px] focus:ring-tmo-primary/12"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                    <X size={13} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}
