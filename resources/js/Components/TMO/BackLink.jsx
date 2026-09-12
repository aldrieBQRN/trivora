import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

/** Consistent "back to list" link used at the top of every TMO detail/workflow page. */
export default function BackLink({ href, children = 'Back' }) {
    return (
        <Link
            href={href}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-tmo-muted transition-colors hover:text-tmo-ink"
        >
            <ArrowLeft size={14} strokeWidth={2.5} />
            {children}
        </Link>
    );
}
