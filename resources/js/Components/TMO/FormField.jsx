export function Label({ children, required, className = '' }) {
    return (
        <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tmo-muted ${className}`}>
            {children}
            {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
    );
}

export function ErrorText({ children }) {
    if (!children) return null;
    return <p className="mt-1.5 text-xs font-medium text-red-600">{children}</p>;
}

const fieldBase =
    'w-full rounded-lg border bg-white px-3.5 text-sm text-tmo-ink placeholder:text-tmo-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-tmo-primary/15';
const fieldBorder = (error) => (error ? 'border-red-300 focus:border-red-500' : 'border-tmo-borderStrong focus:border-tmo-primary');

export function Input({ error, className = '', ...props }) {
    return <input {...props} className={`${fieldBase} h-10 ${fieldBorder(error)} ${className}`} />;
}

export function Select({ error, className = '', children, ...props }) {
    return (
        <select {...props} className={`${fieldBase} h-10 ${fieldBorder(error)} ${className}`}>
            {children}
        </select>
    );
}

export function Textarea({ error, className = '', ...props }) {
    return <textarea {...props} className={`${fieldBase} min-h-[100px] resize-y py-2.5 ${fieldBorder(error)} ${className}`} />;
}
