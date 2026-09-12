import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

/** Consistent "back to list" link used at the top of every TMO detail/workflow page. */
export default function BackLink({ href, children = 'Back' }) {
    return (
        <Link
            href={href}
            className="group mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
            <ArrowLeft size={14} strokeWidth={2.25} className="transition-transform group-hover:-translate-x-0.5" />
            {children}
        </Link>
    );
}
