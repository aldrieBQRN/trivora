import React, { useState, useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    Bell, Menu, Settings, LogOut,
    ChevronDown, ChevronRight,
    LayoutDashboard, ShieldAlert,
    FileText, Wallet, Bike, X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Driver / Operator Panel shell — sidebar + header chrome matching TMO & BPLO.
   Brand token: `#1D2542` (solid deep brand navy).
───────────────────────────────────────────────────────────────────────── */

function getInitials(name) {
    if (!name || name === 'Driver') return 'DR';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
    const initials = getInitials(displayName);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
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
                { name: 'Payment History',    icon: Wallet,      path: '/operator/payments'   },
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
        if (link.path === '/operator/payments' && path.startsWith('/operator/payments')) return true;
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
            {
                prefix: '/operator/payments/',
                group: 'Franchise & Compliance',
                parentName: 'Payment History',
                parentRoute: '/operator/payments',
                defaultLeaf: 'Official Receipt',
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
        setIsExiting(true);
        setTimeout(() => {
            router.post('/logout');
        }, 400);
    };

    return (
        <div
            className="flex h-screen overflow-hidden bg-slate-50/60 font-sans text-slate-800"
            style={{ opacity: isExiting ? 0 : 1, transition: 'opacity .4s' }}
        >
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ══════ SIDEBAR ══════════════════════════════════════ */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#1D2542] transition-transform duration-300 print:hidden lg:static lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Logo & Portal Branding Header */}
                <div className="flex h-[72px] shrink-0 items-center justify-between px-4">
                    <Link href="/operator/dashboard" className="flex items-center gap-3 group">
                        <div className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-white px-2.5 py-1 shadow-xs ring-1 ring-white/10 transition-transform group-hover:scale-105">
                            <img src="/images/logo.png" alt="Trivora" className="h-6 w-auto object-contain" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-sm font-black tracking-wider text-white leading-tight">
                                TRIVORA
                            </span>
                            <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50 leading-tight mt-0.5">
                                Driver Portal
                            </span>
                        </div>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex flex-1 flex-col overflow-y-auto px-3.5 pb-3.5 pt-2">
                    <div className="flex-1">
                        {navigation.map((group, gi) => (
                            <div key={gi} className="mb-7">
                                <div className="mb-1.5 flex items-center gap-2.5 px-2.5">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.17em] text-white/50">
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
                                            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                                                isActive
                                                    ? 'bg-white font-semibold text-[#1D2542]'
                                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} className="shrink-0" />
                                            <span>{link.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Bottom Logout Dock */}
                    <div className="shrink-0 border-t border-white/10 p-3">
                        <button
                            onClick={handleLogout}
                            className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-all duration-200 hover:border-rose-500/30 hover:bg-rose-500/10 active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-colors group-hover:bg-rose-500/20 group-hover:text-rose-300">
                                    <LogOut size={14} strokeWidth={2.2} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-white transition-colors group-hover:text-rose-200 leading-tight">
                                        Sign Out
                                    </span>
                                    <span className="text-[10px] font-medium text-white/40 group-hover:text-rose-300/70 transition-colors leading-tight">
                                        End session
                                    </span>
                                </div>
                            </div>
                            <span className="rounded bg-white/10 px-2 py-0.5 text-[9.5px] font-bold text-white/60 transition-colors group-hover:bg-rose-500/25 group-hover:text-rose-200 shrink-0">
                                Exit
                            </span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* ══════ MAIN COLUMN ══════════════════════════════════ */}
            <div className="flex min-w-0 flex-1 flex-col">

                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3.5 print:hidden sm:px-8">

                    {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-4">
                        <button
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 lg:hidden shrink-0"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={18} strokeWidth={2} />
                        </button>

                        {/* Dynamic Breadcrumbs Trail */}
                        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-[12.5px] font-medium overflow-hidden">
                            {computedBreadcrumbs.map((crumb, idx) => {
                                const isLast = idx === computedBreadcrumbs.length - 1;
                                return (
                                    <React.Fragment key={idx}>
                                        {idx > 0 && (
                                            <ChevronRight size={13} className="text-slate-300 shrink-0" strokeWidth={2.2} />
                                        )}
                                        {crumb.href && !isLast ? (
                                            <Link
                                                href={crumb.href}
                                                className="text-slate-500 hover:text-[#1D2542] transition-colors shrink-0 font-medium"
                                            >
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span
                                                className={`truncate ${
                                                    isLast
                                                        ? 'text-[#1D2542] font-bold'
                                                        : 'text-slate-500 font-medium'
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
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Notification Bell */}
                        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                            <Bell size={18} strokeWidth={1.8} />
                            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full border border-white bg-[#1D2542]" />
                        </button>

                        <div className="mx-1 h-7 w-px bg-slate-200" />

                        {/* Profile Menu */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100"
                                onClick={() => setProfileOpen(p => !p)}
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D2542] text-[11px] font-bold tracking-wide text-white">
                                    {initials}
                                </div>

                                <div className="hidden text-left leading-tight md:block">
                                    <p className="text-[12.5px] font-bold text-slate-900">{displayName}</p>
                                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Tricycle Driver</p>
                                </div>

                                <ChevronDown
                                    size={13}
                                    strokeWidth={2.5}
                                    className={`shrink-0 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                    <div className="border-b border-slate-100 px-4 py-3">
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Driver Account</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                                    </div>
                                    <div className="p-1.5">
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        >
                                            <Settings size={14} strokeWidth={1.8} />
                                            Account Settings
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50"
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
                <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
                    <div className="mx-auto max-w-[1500px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}