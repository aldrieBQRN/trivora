import React, { useState, useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import NotificationBell from '@/Components/NotificationBell';
import {
    Bell, Menu, Settings, LogOut,
    ChevronDown, ChevronRight,
    LayoutDashboard, ShieldCheck,
    FileSearch, ClipboardCheck,
    Bike, ShieldAlert, Users, X, Radio, BarChart3, MapPin, Banknote, ScrollText
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO Panel shell — sidebar + header chrome shared by every TMO page.
   Brand token: `#182B62` (Deep Royal Navy).
───────────────────────────────────────────────────────────────────────── */

export default function TrivoraLayout({ children, title, role = "TMO Personnel", breadcrumbs = null }) {
    const { url, props } = usePage();
    const isAdmin = props?.auth?.user?.role === 'admin';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    // Signed-in account for the header menu (shared auth prop — never a hardcoded placeholder).
    const authUser = props?.auth?.user;
    const accountName = authUser?.name || role;
    const accountInitials = (authUser?.name || role)
        .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const [isExiting,   setIsExiting]   = useState(false);

    const navigation = [
        {
            group: "Operations",
            links: [
                { name: 'Dashboard',            icon: LayoutDashboard, route: '/tmo-dashboard' },
                { name: 'Live Monitoring',      icon: Radio,           route: '/tmo/live' },
                { name: 'Tricycle Registry',    icon: Bike,            route: '/tmo/registry' },
                { name: 'Violation Records',    icon: ShieldAlert,     route: '/violations' },
                { name: 'Reports & Analytics',  icon: BarChart3,       route: '/tmo/reports' },
            ]
        },
        {
            group: "TMO Pipeline",
            links: [
                { name: 'Document Review',       icon: FileSearch,     route: '/tmo/docs'               },
                { name: 'Physical Inspection',   icon: ClipboardCheck, route: '/tmo/physical'           },
                { name: 'Final Confirmation',    icon: ShieldCheck,    route: '/tmo/final-confirmation' },
            ]
        },
        {
            group: "Management",
            links: [
                { name: 'Staff Management',     icon: Users,        route: '/tmo/users' },
                { name: 'Fare Management',      icon: Banknote,     route: '/tmo/fares' },
                { name: 'System Activity Logs', icon: ScrollText,   route: '/tmo/activity-logs' },
            ]
        },
    ];

    const allLinks   = navigation.flatMap(g => g.links);

    // Fallback matching to determine active state visually
    const activePage = allLinks.find(l => url.startsWith(l.route))?.name || title;

    // Helper to check if a navigation link is active (including its subpages)
    const isLinkActive = (link) => {
        const path = (url || '').split('?')[0];
        if (path === link.route || path.startsWith(link.route + '/')) return true;
        if (link.route === '/tmo/docs' && path.startsWith('/tmo/review/docs')) return true;
        if (link.route === '/tmo/physical' && (path.startsWith('/tmo/review/physical') || path.startsWith('/tmo/ticket'))) return true;
        if (link.route === '/tmo/registry' && path.startsWith('/tmo/tricycle')) return true;
        if (link.route === '/violations' && (path.startsWith('/violations/') || path.startsWith('/tmo/violations'))) return true;
        return false;
    };

    // Dynamic breadcrumb trail resolution
    const computedBreadcrumbs = useMemo(() => {
        if (breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
            return breadcrumbs;
        }

        const crumbs = [
            { label: 'TMO', href: '/tmo-dashboard' }
        ];

        const path = (url || '').split('?')[0];

        if (path === '/tmo-dashboard' || path === '') {
            crumbs.push({ label: 'Dashboard' });
            return crumbs;
        }

        // Subpage mapping for pipeline and detail views (Short action names)
        const SUBPAGE_MAP = [
            {
                prefix: '/tmo/review/docs',
                group: 'TMO Pipeline',
                parentName: 'Document Review',
                parentRoute: '/tmo/docs',
                defaultLeaf: 'Review',
            },
            {
                prefix: '/tmo/review/physical',
                group: 'TMO Pipeline',
                parentName: 'Physical Inspection',
                parentRoute: '/tmo/physical',
                defaultLeaf: 'Inspection',
            },
            {
                prefix: '/tmo/ticket',
                group: 'TMO Pipeline',
                parentName: 'Physical Inspection',
                parentRoute: '/tmo/physical',
                defaultLeaf: 'Ticket',
            },
            {
                prefix: '/tmo/final-confirmation/',
                group: 'TMO Pipeline',
                parentName: 'Final Confirmation',
                parentRoute: '/tmo/final-confirmation',
                defaultLeaf: 'Confirmation',
            },
            {
                prefix: '/tmo/tricycle',
                group: 'Operations',
                parentName: 'Tricycle Registry',
                parentRoute: '/tmo/registry',
                defaultLeaf: 'Details',
            },
            {
                prefix: '/tmo/violations/create',
                group: 'Operations',
                parentName: 'Violation Records',
                parentRoute: '/violations',
                defaultLeaf: 'File Ticket',
            },
            {
                prefix: '/violations/create',
                group: 'Operations',
                parentName: 'Violation Records',
                parentRoute: '/violations',
                defaultLeaf: 'File Ticket',
            },
            {
                prefix: '/violations/',
                group: 'Operations',
                parentName: 'Violation Records',
                parentRoute: '/violations',
                defaultLeaf: 'Details',
            },
        ];

        // 1. Check if path matches a known subpage
        const matchedSubpage = SUBPAGE_MAP.find(s => path.startsWith(s.prefix));
        if (matchedSubpage) {
            crumbs.push({ label: matchedSubpage.group });
            crumbs.push({ label: matchedSubpage.parentName, href: matchedSubpage.parentRoute });
            crumbs.push({ label: matchedSubpage.defaultLeaf });
            return crumbs;
        }

        // 2. Standard top-level navigation matches
        let matchedGroup = null;
        let matchedLink = null;

        for (const g of navigation) {
            for (const l of g.links) {
                if (path === l.route || path.startsWith(l.route + '/')) {
                    if (!matchedLink || l.route.length > matchedLink.route.length) {
                        matchedGroup = g;
                        matchedLink = l;
                    }
                }
            }
        }

        if (matchedGroup && matchedLink) {
            crumbs.push({ label: matchedGroup.group });

            const isSubpage = path !== matchedLink.route;
            if (isSubpage) {
                crumbs.push({ label: matchedLink.name, href: matchedLink.route });
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
            router.post('/logout', {}, {
                onFinish: () => {
                    window.location.href = '/login';
                },
                onError: () => {
                    window.location.href = '/login';
                },
            });
        }, 400);
    };

    return (
        <div
            className="flex h-screen overflow-hidden bg-[#F8FAFC] font-['Inter',sans-serif] text-slate-800"
            style={{ opacity: isExiting ? 0 : 1, transition: 'opacity .4s' }}
        >
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ══════ SIDEBAR ══════════════════════════════════════ */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#182B62] transition-transform duration-300 print:hidden lg:static lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-[72px] shrink-0 items-center justify-between px-4 border-b border-white/[0.08]">
                    <Link href="/tmo-dashboard" className="flex items-center gap-3 group">
                        <div className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-white px-2.5 py-1 shadow-sm ring-1 ring-white/10 transition-transform group-hover:scale-105">
                            <img src="/images/logo.png" alt="Trivora" className="h-6 w-auto object-contain" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-sm font-black tracking-wider text-white leading-tight">
                                TRIVORA
                            </span>
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-white/60 leading-tight mt-0.5">
                                TMO Portal
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

                <nav className="flex flex-1 flex-col overflow-y-auto px-3.5 pb-3.5 pt-2 custom-scrollbar-dark">
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
                                            href={link.route}
                                            className={`mb-1 flex items-center rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-all duration-150 ${
                                                isActive
                                                    ? 'bg-white text-[#182B62] shadow-sm font-bold'
                                                    : 'text-white/75 hover:bg-white/[0.09] hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                                                <span className="truncate">{link.name}</span>
                                            </div>
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
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 print:hidden sm:px-8 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">

                    {/* Left: Mobile Toggle & Page Breadcrumbs */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-4">
                        <button
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 lg:hidden shrink-0"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={18} strokeWidth={2} />
                        </button>

                        {/* Breadcrumbs Trail */}
                        <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-[12.5px] font-medium overflow-hidden sm:flex sm:gap-2">
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
                                                className="text-slate-500 hover:text-[#182B62] transition-colors shrink-0 font-medium"
                                            >
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span
                                                className={`truncate ${
                                                    isLast
                                                        ? 'text-[#182B62] font-extrabold tracking-tight font-[\'Plus_Jakarta_Sans\',sans-serif]'
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
                    <div className="flex items-center gap-3 shrink-0">
                        <NotificationBell />

                        <div className="h-6 w-px bg-slate-200" />

                        {/* Profile */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200/60"
                                onClick={() => setProfileOpen(p => !p)}
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#182B62] to-[#25449B] text-[11px] font-bold tracking-wide text-white shadow-xs">
                                    {accountInitials}
                                </div>

                                <div className="hidden text-left leading-tight md:block">
                                    <p className="max-w-[160px] truncate text-[12.5px] font-bold text-slate-800 font-[\'Plus_Jakarta_Sans\',sans-serif]">{accountName}</p>
                                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{role}</p>
                                </div>

                                <ChevronDown
                                    size={13}
                                    strokeWidth={2.5}
                                    className={`shrink-0 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-tmo-border bg-white shadow-lg">
                                    <div className="border-b border-tmo-border px-4 py-3">
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-tmo-subtle">{role}</p>
                                        <p className="truncate text-sm font-bold text-tmo-ink">{accountName}</p>
                                        {authUser?.email && <p className="truncate text-[11px] text-tmo-subtle">{authUser.email}</p>}
                                    </div>
                                    <div className="p-1.5">
                                        <Link href={route('profile.edit')} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-tmo-muted hover:bg-tmo-bg hover:text-tmo-ink">
                                            <Settings size={14} strokeWidth={1.8} />
                                            Account Settings
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
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
                <main className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 custom-scrollbar">
                    <div className="mx-auto max-w-[1500px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
