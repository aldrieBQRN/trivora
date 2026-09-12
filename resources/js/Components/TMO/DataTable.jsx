/** Shared table shell — replaces each page's bespoke `.xx-table` CSS block. */
export function Table({ children, className = '' }) {
    return (
        <div className={`overflow-hidden rounded-xl border border-tmo-border bg-tmo-surface ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">{children}</table>
            </div>
        </div>
    );
}

export function Thead({ children }) {
    return (
        <thead className="border-b border-tmo-border bg-tmo-bg">
            <tr className="[&>th]:whitespace-nowrap [&>th]:px-5 [&>th]:py-3 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-tmo-muted">
                {children}
            </tr>
        </thead>
    );
}

export function Tbody({ children }) {
    return <tbody className="divide-y divide-tmo-border">{children}</tbody>;
}

export function Tr({ children, className = '' }) {
    return <tr className={`transition-colors hover:bg-tmo-bg/60 ${className}`}>{children}</tr>;
}

export function Td({ children, className = '' }) {
    return <td className={`px-5 py-3.5 align-middle text-tmo-ink ${className}`}>{children}</td>;
}
