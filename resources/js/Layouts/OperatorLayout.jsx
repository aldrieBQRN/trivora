import React, { useState, useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import NotificationBell from '@/Components/NotificationBell';
import {
    Bell, Menu, Settings, LogOut, Smartphone, Download, CheckCircle2,
    ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
    LayoutDashboard, ShieldAlert,
    FileText, Bike, X
} from 'lucide-react';

import Avatar from '@/Components/Avatar';
import useSidebarCollapsed from '@/hooks/useSidebarCollapsed';
import LogoutOverlay from '@/Components/LogoutOverlay';
/* ─────────────────────────────────────────────────────────────────────────
   Driver / Operator Panel shell — sidebar + header chrome matching TMO & BPLO.
   Brand token: `#182B62` (Deep Royal Navy).
───────────────────────────────────────────────────────────────────────── */

export default function OperatorLayout({
    children,
    title,
    operatorName = "Driver",
    breadcrumbs = null
}) {
    const { url, props } = usePage();
    const user = props?.auth?.user;
    const displayName = (operatorName && operatorName !== "Driver")
        ? operatorName
        : (user?.name || "Driver");

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [collapsed, toggleCollapsed] = useSidebarCollapsed();
    const [isExiting,   setIsExiting]   = useState(false);

    // ── Driver-specific Navigation ──
    const navigation = [
        {
            group: "My Account",
            links: [
                { name: 'Dashboard',    icon: LayoutDashboard, path: '/operator/dashboard' },
                { name: 'My Tricycles', icon: Bike,            path: '/operator/fleet'     },
            ]
        },
        {
            group: "Franchise & Compliance",
            links: [
                { name: 'MTOP Applications', icon: FileText,    path: '/operator/mtop'       },
                { name: 'Violation Records',  icon: ShieldAlert, path: '/operator/violations' },
            ]
        }
    ];

    // Helper to check if a navigation link is active (including its subpages)
    const isLinkActive = (link) => {
        const path = (url || '').split('?')[0];
        if (path === link.path || path.startsWith(link.path + '/')) return true;
        if (link.path === '/operator/fleet' && path.startsWith('/operator/tracking')) return true;
        if (link.path === '/operator/mtop' && path.startsWith('/operator/mtop')) return true;
        if (link.path === '/operator/violations' && path.startsWith('/operator/violations')) return true;
        return false;
    };

    // Dynamic breadcrumb trail resolution
    const computedBreadcrumbs = useMemo(() => {
        if (breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
            return breadcrumbs;
        }

        const crumbs = [
            { label: 'Driver', href: '/operator/dashboard' }
        ];

        const path = (url || '').split('?')[0];

        if (path === '/operator/dashboard' || path === '' || path === '/operator') {
            crumbs.push({ label: 'Dashboard' });
            return crumbs;
        }

        const SUBPAGE_MAP = [
            {
                prefix: '/operator/tracking',
                group: 'My Account',
                parentName: 'My Tricycles',
                parentRoute: '/operator/fleet',
                defaultLeaf: 'Live Tracking',
            },
            {
                prefix: '/operator/mtop/create',
                group: 'Franchise & Compliance',
                parentName: 'MTOP Applications',
                parentRoute: '/operator/mtop',
                defaultLeaf: 'New Application',
            },
            {
                prefix: '/operator/mtop/',
                suffix: '/fix',
                group: 'Franchise & Compliance',
                parentName: 'MTOP Applications',
                parentRoute: '/operator/mtop',
                defaultLeaf: 'Fix Application',
            },
            {
                prefix: '/operator/mtop/',
                suffix: '/ticket',
                group: 'Franchise & Compliance',
                parentName: 'MTOP Applications',
                parentRoute: '/operator/mtop',
                defaultLeaf: 'Payment Ticket',
            },
            {
                prefix: '/operator/mtop/',
                group: 'Franchise & Compliance',
                parentName: 'MTOP Applications',
                parentRoute: '/operator/mtop',
                defaultLeaf: 'Application Details',
            },
            {
                prefix: '/operator/violations/',
                group: 'Franchise & Compliance',
                parentName: 'Violation Records',
                parentRoute: '/operator/violations',
                defaultLeaf: 'Violation Details',
            },
        ];

        // 1. Check if path matches a known subpage
        for (const s of SUBPAGE_MAP) {
            if (s.suffix) {
                if (path.startsWith(s.prefix) && path.endsWith(s.suffix)) {
                    crumbs.push({ label: s.group });
                    crumbs.push({ label: s.parentName, href: s.parentRoute });
                    crumbs.push({ label: (title && title !== s.parentName) ? title : s.defaultLeaf });
                    return crumbs;
                }
            } else if (path.startsWith(s.prefix) && path !== s.parentRoute) {
                crumbs.push({ label: s.group });
                crumbs.push({ label: s.parentName, href: s.parentRoute });
                crumbs.push({ label: (title && title !== s.parentName) ? title : s.defaultLeaf });
                return crumbs;
            }
        }

        // 2. Standard top-level navigation matches
        let matchedGroup = null;
        let matchedLink = null;

        for (const g of navigation) {
            for (const l of g.links) {
                if (path === l.path || path.startsWith(l.path + '/')) {
                    if (!matchedLink || l.path.length > matchedLink.path.length) {
                        matchedGroup = g;
                        matchedLink = l;
                    }
                }
            }
        }

        if (matchedGroup && matchedLink) {
            crumbs.push({ label: matchedGroup.group });

            const isSubpage = path !== matchedLink.path;
            if (isSubpage) {
                crumbs.push({ label: matchedLink.name, href: matchedLink.path });
                crumbs.push({ label: (title && title !== matchedLink.name) ? title : 'Details' });
            } else {
                crumbs.push({ label: matchedLink.name });
            }
        } else if (title) {
            crumbs.push({ label: title });
        }

        return crumbs;
    }, [breadcrumbs, url, title]);

    const handleLogout = () => {
        if (isExiting) return;
        setProfileOpen(false);
        setIsExiting(true);
        setTimeout(() => {
            router.post('/logout', {}, {
                onFinish: () => {
                    window.location.href = '/login';
                },
                onError: () => {
                    window.location.href = '/login';
                },
            });
        }, 150);
    };

    return (
        <div className="flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden bg-[#F6F7FB] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <LogoutOverlay show={isExiting} />

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ══════ SIDEBAR ══════════════════════════════════════ */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-hidden bg-[#182B62] transition-[transform,width] duration-300 print:hidden lg:static lg:translate-x-0 ${collapsed ? 'lg:w-[76px]' : ''} ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Logo & Portal Branding Header */}
                <div className={`flex h-[72px] shrink-0 items-center justify-between px-4 border-b border-white/[0.08] ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                    <Link href="/operator/dashboard" className="group flex min-w-0 items-center gap-3.5" aria-label="Trivora Driver Portal — Dashboard">
                        {/* The logo image already carries the TRIVORA wordmark, so no duplicate text label */}
                        <div className={`flex h-10 shrink-0 items-center justify-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm transition-transform group-hover:scale-[1.03] lg:h-11 lg:px-3 ${collapsed ? 'lg:!h-10 lg:w-[52px] lg:!px-1.5' : ''}`}>
                            <img src="/images/logo.png" alt="Trivora" className={`h-6 w-auto object-contain lg:h-7 ${collapsed ? 'lg:!h-auto lg:w-full' : ''}`} />
                        </div>
                        <span className={`flex shrink-0 flex-col justify-center leading-none ${collapsed ? 'lg:hidden' : ''}`}>
                            <span className="text-[15px] font-black tracking-wide text-white">DRIVER</span>
                            <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/80">Portal</span>
                        </span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Nav Links */}
                <nav className={`flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-3.5 pb-3.5 pt-2 custom-scrollbar-dark ${collapsed ? 'lg:px-3' : ''}`}>
                    <div className="flex-1">
                        {navigation.map((group, gi) => (
                            <div key={gi} className={`mb-7 ${collapsed ? 'lg:mb-4' : ''}`}>
                                <div className={`mb-1.5 flex items-center gap-2.5 px-2.5 ${collapsed ? 'lg:px-1.5 lg:py-2' : ''}`}>
                                    <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65 ${collapsed ? 'lg:hidden' : ''}`}>
                                        {group.group}
                                    </span>
                                    <span className="h-px flex-1 bg-white/10" />
                                </div>

                                {group.links.map((link) => {
                                    const Icon     = link.icon;
                                    const isActive = isLinkActive(link);
                                    return (
                                        <Link
                                            key={link.name}
                                            href={link.path}
                                            title={collapsed ? link.name : undefined}
                                            aria-label={link.name}
                                            className={`mb-1 flex items-center rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all duration-150 ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                                                isActive
                                                    ? 'bg-white text-[#182B62] shadow-sm font-semibold'
                                                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                                                <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{link.name}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Download Driver App — Sign Out lives in the header account menu.
                        Link comes from DRIVER_APP_DOWNLOAD_URL; hidden until it is set. */}
                    {props?.driverAppUrl && (
                        <div className={`shrink-0 border-t border-white/10 p-3 ${collapsed ? 'lg:hidden' : ''}`}>
                            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                                {/* App identity */}
                                <div className="relative flex items-center gap-2.5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#182B62]">
                                        <Smartphone size={19} strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] font-extrabold leading-tight text-white">Trivora Driver App</p>
                                        <div className="mt-1 flex items-center gap-1.5">
                                            <span className="rounded-md bg-white/15 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-white">Android</span>
                                            <span className="rounded-md bg-white/15 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-white">Free</span>
                                        </div>
                                    </div>
                                </div>

                                {/* What the app is for */}
                                <ul className="relative mt-3 space-y-1.5">
                                    {['Go online & accept ride bookings', 'Share live GPS while on duty'].map((feature) => (
                                        <li key={feature} className="flex items-start gap-1.5 text-[11.5px] font-medium leading-snug text-white">
                                            <CheckCircle2 size={12} strokeWidth={2.4} className="mt-px shrink-0 text-emerald-300" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href={props.driverAppUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-400 active:scale-[0.98]"
                                >
                                    <Download size={14} strokeWidth={2.4} />
                                    Download APK
                                </a>

                                <p className="relative mt-2 text-center text-[10.5px] font-medium leading-snug text-white/90">
                                    Allow installs from this source when your phone asks.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Collapsed sidebar (desktop): icon-only shortcut to the same APK link */}
                    {props?.driverAppUrl && collapsed && (
                        <div className="hidden shrink-0 justify-center border-t border-white/10 py-3 lg:flex">
                            <a
                                href={props.driverAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download Trivora Driver (Android)"
                                aria-label="Download Trivora Driver (Android)"
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white transition-all hover:bg-emerald-400 active:scale-[0.98]"
                            >
                                <Download size={17} strokeWidth={2.4} />
                            </a>
                        </div>
                    )}
                </nav>
            </aside>

            {/* ══════ MAIN COLUMN ══════════════════════════════════ */}
            <div className="flex min-w-0 flex-1 flex-col">

                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 print:hidden sm:px-8 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">

                    {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-4">
                        <button
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900 lg:hidden shrink-0 transition-colors"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={18} strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 lg:flex"
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {collapsed ? <PanelLeftOpen size={18} strokeWidth={2} /> : <PanelLeftClose size={18} strokeWidth={2} />}
                        </button>

                        {/* Logo (mobile & tablet — replaces breadcrumbs) */}
                        <Link href="/operator/dashboard" className="flex shrink-0 items-center lg:hidden">
                            <img src="/images/logo.png" alt="Trivora" className="h-7 w-auto object-contain" />
                        </Link>

                        {/* Dynamic Breadcrumbs Trail */}
                        <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-[13px] font-medium overflow-hidden lg:flex lg:gap-2">
                            {computedBreadcrumbs.map((crumb, idx) => {
                                const isLast = idx === computedBreadcrumbs.length - 1;
                                return (
                                    <React.Fragment key={idx}>
                                        {idx > 0 && (
                                            <ChevronRight size={13} className="text-slate-400 shrink-0" strokeWidth={2.2} />
                                        )}
                                        {crumb.href && !isLast ? (
                                            <Link
                                                href={crumb.href}
                                                className="text-slate-600 hover:text-[#182B62] transition-colors shrink-0 font-medium"
                                            >
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span
                                                className={`truncate ${
                                                    isLast
                                                        ? 'text-[#182B62] font-extrabold tracking-tight'
                                                        : 'text-slate-600 font-medium'
                                                }`}
                                            >
                                                {crumb.label}
                                            </span>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Right: Notifications & Profile Menu */}
                    <div className="flex items-center gap-3 shrink-0">
                        <NotificationBell />

                        <div className="h-6 w-px bg-slate-200" />

                        {/* Profile Menu */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200/60"
                                onClick={() => setProfileOpen(p => !p)}
                            >
                                <Avatar name={displayName} src={user?.profile_photo_url} fallback="DR" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-bold tracking-wide text-white shadow-sm" />

                                <div className="hidden text-left leading-tight md:block">
                                    <p className="max-w-[160px] truncate text-[12px] font-bold text-slate-800">{displayName}</p>
                                    <p className="text-[10.5px] font-medium text-slate-600">Tricycle Driver</p>
                                </div>

                                <ChevronDown
                                    size={13}
                                    strokeWidth={2.5}
                                    className={`shrink-0 text-slate-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_-12px_rgba(15,23,42,0.22)]">
                                    <div className="border-b border-slate-100 px-4 py-3">
                                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Driver Account</p>
                                        <p className="truncate text-[13.5px] font-semibold text-slate-900">{displayName}</p>
                                        {user?.email && <p className="truncate text-[11.5px] text-slate-600 mt-0.5">{user.email}</p>}
                                    </div>
                                    <div className="p-1.5">
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                        >
                                            <Settings size={14} strokeWidth={1.8} />
                                            Account Settings
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                                        >
                                            <LogOut size={14} strokeWidth={1.8} />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 custom-scrollbar font-['Plus_Jakarta_Sans',sans-serif]">
                    <div className="mx-auto max-w-[1500px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}