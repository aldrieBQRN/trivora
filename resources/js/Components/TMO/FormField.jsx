export function Label({ children, required, className = '' }) {
    return (
        <label className={`mb-1.5 block text-[13px] font-medium text-gray-700 ${className}`}>
            {children}
            {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
    );
}

export function HelperText({ children }) {
    if (!children) return null;
    return <p className="mt-1.5 text-[12px] text-gray-400">{children}</p>;
}

export function ErrorText({ children }) {
    if (!children) return null;
    return <p className="mt-1.5 text-[12px] font-medium text-red-600">{children}</p>;
}

const fieldBase =
    'w-full rounded-lg border bg-white px-3.5 text-[13.5px] text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-[3px]';
const fieldBorder = (error) => (error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/12' : 'border-gray-300 focus:border-tmo-primary focus:ring-tmo-primary/12');

export function Input({ error, className = '', ...props }) {
    return <input {...props} className={`${fieldBase} h-9 ${fieldBorder(error)} ${className}`} />;
}

export function Select({ error, className = '', children, ...props }) {
    return (
        <select {...props} className={`${fieldBase} h-9 ${fieldBorder(error)} ${className}`}>
            {children}
        </select>
    );
}

export function Textarea({ error, className = '', ...props }) {
    return <textarea {...props} className={`${fieldBase} min-h-[100px] py-2.5 resize-y ${fieldBorder(error)} ${className}`} />;
}
