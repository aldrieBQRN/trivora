/** Shared table shell — replaces each page's bespoke `.xx-table` CSS block. */
export function Table({ children, className = '' }) {
    return (
        <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left">{children}</table>
            </div>
        </div>
    );
}

export function Thead({ children }) {
    return (
        <thead className="border-b border-gray-200 bg-gray-50/80">
            <tr className="[&>th]:whitespace-nowrap [&>th]:px-5 [&>th]:py-3 [&>th]:text-[11.5px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-gray-500">
                {children}
            </tr>
        </thead>
    );
}

export function Tbody({ children }) {
    return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function Tr({ children, className = '' }) {
    return <tr className={`transition-colors duration-100 hover:bg-gray-50/70 ${className}`}>{children}</tr>;
}

export function Td({ children, className = '' }) {
    return <td className={`px-5 py-4 align-middle text-[13.5px] text-gray-800 ${className}`}>{children}</td>;
}
