import { X } from 'lucide-react';
import BaseModal from '@/Components/Modal';

/**
 * TMO-styled wrapper around the app's shared headless-ui Modal, giving every
 * TMO dialog the same header/body/footer convention instead of each page
 * building its own overlay (createPortal, inline divs, etc.).
 */
export default function Modal({ show, onClose, title, description, maxWidth = '2xl', footer, children, closeable = true }) {
    return (
        <BaseModal show={show} onClose={onClose} maxWidth={maxWidth} closeable={closeable}>
            <div className="flex items-start justify-between border-b border-tmo-border px-6 py-4">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-tmo-ink">{title}</h2>
                    {description && <p className="mt-0.5 text-sm text-tmo-muted">{description}</p>}
                </div>
                {closeable && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tmo-subtle hover:bg-gray-100 hover:text-tmo-ink"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
                <div className="flex items-center justify-end gap-2 border-t border-tmo-border bg-tmo-bg/50 px-6 py-4">
                    {footer}
                </div>
            )}
        </BaseModal>
    );
}
