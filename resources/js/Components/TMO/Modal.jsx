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
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/60 px-6 py-[18px]">
                <div className="min-w-0 pt-0.5">
                    <h2 className="text-[16px] font-semibold tracking-tight text-gray-900">{title}</h2>
                    {description && <div className="mt-0.5 text-[13px] text-gray-500">{description}</div>}
                </div>
                {closeable && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-700"
                    >
                        <X size={17} strokeWidth={2} />
                    </button>
                )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">{children}</div>
            {footer && (
                <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                    {footer}
                </div>
            )}
        </BaseModal>
    );
}
