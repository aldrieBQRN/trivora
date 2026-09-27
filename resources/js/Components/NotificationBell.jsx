import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Check } from 'lucide-react';

/**
 * Header notification bell shared by the TMO, BPLO and Driver Portal layouts.
 *
 * Data is the shared `notifications` prop (HandleInertiaRequests -> NotificationController::sharedFor):
 * the signed-in user's own workflow notifications for their portal, never client-side data. It
 * refreshes with every page visit and with the pages' existing background refresh
 * (useBackgroundRefresh requests it alongside the page's own props) — no separate polling.
 */
export default function NotificationBell() {
    const { notifications } = usePage().props;
    const items = notifications?.items ?? [];
    const unread = notifications?.unread_count ?? 0;

    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const refreshOnly = { preserveScroll: true, preserveState: true, only: ['notifications'] };
    const markRead = (id) => router.post(route('notifications.read', id), {}, refreshOnly);
    const markAllRead = () => router.post(route('notifications.read-all'), {}, refreshOnly);
    const openItem = (n) => {
        setOpen(false);
        if (n.url) router.visit(route('notifications.open', n.id));
        else if (!n.read) markRead(n.id);
    };

    return (
        <div className="relative" ref={wrapRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-haspopup="true"
                aria-expanded={open}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    open ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
            >
                <Bell size={18} strokeWidth={1.8} />
                {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1D2542] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Notifications"
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div className="flex items-baseline gap-2">
                            <p className="text-[13px] font-bold text-slate-900">Notifications</p>
                            {unread > 0 && <span className="text-[11px] font-semibold text-slate-400">{unread} unread</span>}
                        </div>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                className="text-[11.5px] font-semibold text-[#1D2542] hover:underline"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                            <Bell size={18} strokeWidth={1.8} className="mx-auto text-slate-300" />
                            <p className="mt-2 text-[13px] font-semibold text-slate-700">No notifications yet</p>
                            <p className="mt-0.5 text-[11.5px] text-slate-400">Workflow updates that need your action will appear here.</p>
                        </div>
                    ) : (
                        <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                            {items.map((n) => (
                                <li key={n.id} className={n.read ? 'bg-white' : 'bg-slate-50/70'}>
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <span
                                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-[#1D2542]'}`}
                                            aria-hidden="true"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => openItem(n)}
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <p className={`text-[12.5px] leading-snug ${n.read ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>
                                                {n.title}
                                            </p>
                                            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-slate-500">{n.message}</p>
                                            <p className="mt-1 text-[10.5px] font-medium text-slate-400">{n.time_label}</p>
                                        </button>
                                        {!n.read && (
                                            <button
                                                type="button"
                                                onClick={() => markRead(n.id)}
                                                title="Mark as read"
                                                aria-label="Mark as read"
                                                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <Check size={14} strokeWidth={2.2} />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
