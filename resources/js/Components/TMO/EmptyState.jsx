/** Consistent icon + title + description block for empty lists/queues. */
export default function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            {Icon && (
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-tmo-primarySoft">
                    <Icon size={24} strokeWidth={1.75} className="text-tmo-primary" />
                </div>
            )}
            <p className="text-sm font-semibold text-tmo-ink">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-tmo-muted">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
