/** Consistent icon + title + description block for empty lists/queues. */
export default function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            {Icon && (
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Icon size={20} strokeWidth={1.75} className="text-gray-400" />
                </div>
            )}
            <p className="text-[14px] font-semibold text-gray-800">{title}</p>
            {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-gray-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
