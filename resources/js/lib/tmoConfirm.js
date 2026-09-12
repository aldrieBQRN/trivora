import Swal from 'sweetalert2';

const TONE_COLORS = {
    primary: '#1D2542',
    success: '#059669',
    danger: '#DC2626',
    warning: '#D97706',
};

/**
 * Wraps SweetAlert2 with the TMO Panel's token colors so every confirmation
 * dialog across pages uses the same button colors instead of each page
 * hardcoding its own hex values.
 */
export function tmoConfirm({
    title,
    html,
    text,
    tone = 'primary',
    icon = 'question',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    input,
    inputPlaceholder,
    inputValidator,
}) {
    return Swal.fire({
        title,
        html,
        text,
        icon,
        input,
        inputPlaceholder,
        inputValidator,
        showCancelButton: true,
        confirmButtonColor: TONE_COLORS[tone] || TONE_COLORS.primary,
        cancelButtonColor: '#6B7280',
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
    });
}

export function tmoAlert({ title, text, tone = 'success', icon = 'success' }) {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: TONE_COLORS[tone] || TONE_COLORS.primary,
    });
}
