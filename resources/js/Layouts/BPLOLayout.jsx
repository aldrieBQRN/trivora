import React, { useState, useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    Bell, Menu, Settings, LogOut,
    ChevronDown, ChevronRight,
    LayoutDashboard, FileText,
    FolderCheck, Users, X, BarChart3
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   BPLO Panel shell — sidebar + header chrome shared by every BPLO page.
   Brand token: `#1D2542` (consistent with TMO portal design system).
───────────────────────────────────────────────────────────────────────── */

export default function BPLOLayout({ children, title, role = "BPLO Officer", breadcrumbs = null }) {
    const { url, props } = usePage();
    const isAdmin = props?.auth?.user?.role === 'admin';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isExiting,   setIsExiting]   = useState(false);

    const navigation = [
        {
            group: "BPLO Operations",
            links: [
                { name: 'Dashboard',            icon: LayoutDashboard, route: '/bplo-dashboard' },
                { name: 'Releasing Queue',      icon: FileText,        route: '/bplo/releasing'  },
                { name: 'Active Registry',      icon: FolderCheck,     route: '/bplo/registry'   },
                { name: 'Reports & Analytics',  icon: BarChart3,       route: '/bplo/reports'    },
            ]
        },
        {
            group: "Management",
            links: [
                { name: 'Staff Management',     icon: Users,           route: '/bplo/users'      },
            ]
        }
    ];

    const allLinks = navigation.flatMap(g => g.links);

    // Helper to check if a navigation link is active (including its subpages)
    const isLinkActive = (link) => {
        const path = (url || '').split('?')[0];
        if (path === link.route || path.startsWith(link.route + '/')) return true;
        if (link.route === '/bplo/releasing' && (path.startsWith('/bplo/issue') || path.startsWith('/bplo/ticket'))) return true;
        if (link.route === '/bplo/registry' && path.startsWith('/bplo/registry/')) return true;
        return false;
    };

    // Dynamic breadcrumb trail resolution
    const computedBreadcrumbs = useMemo(() => {
        if (breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
            return breadcrumbs;
        }

        const crumbs = [
            { label: 'BPLO', href: '/bplo-dashboard' }
        ];

        const path = (url || '').split('?')[0];

        if (path === '/bplo-dashboard' || path === '') {
            crumbs.push({ label: 'Dashboard' });
            return crumbs;
        }

        // Subpage mapping for pipeline and detail views (Short action names)
        const SUBPAGE_MAP = [
            {
                prefix: '/bplo/ticket',
                group: 'BPLO Operations',
                parentName: 'Releasing Queue',
                parentRoute: '/bplo/releasing',
                defaultLeaf: 'Payment Ticket',
            },
            {
                prefix: '/bplo/issue',
                group: 'BPLO Operations',
                parentName: 'Releasing Queue',
                parentRoute: '/bplo/releasing',
                defaultLeaf: 'Final Issuance',
            },
            {
                prefix: '/bplo/registry/',
                group: 'BPLO Operations',
                parentName: 'Active Registry',
                parentRoute: '/bplo/registry',
                defaultLeaf: 'Unit Details',
            },
        ];

        // 1. Check if path matches a known subpage
        const matchedSubpage = SUBPAGE_MAP.find(s => path.startsWith(s.prefix));
        if (matchedSubpage) {
            crumbs.push({ label: matchedSubpage.group });
            crumbs.push({ label: matchedSubpage.parentName, href: matchedSubpage.parentRoute });
            crumbs.push({ label: (title && title !== matchedSubpage.parentName) ? title : matchedSubpage.defaultLeaf });
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
                    <Link href="/bplo-dashboard" className="flex items-center gap-3 group">
                        <div className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-white px-2.5 py-1 shadow-xs ring-1 ring-white/10 transition-transform group-hover:scale-105">
                            <img src="/images/logo.png" alt="Trivora" className="h-6 w-auto object-contain" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-sm font-black tracking-wider text-white leading-tight">
                                TRIVORA
                            </span>
                            <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50 leading-tight mt-0.5">
                                BPLO Portal
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
                                            href={link.route}
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
                        {/* Bell */}
                        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                            <Bell size={18} strokeWidth={1.8} />
                            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full border border-white bg-[#1D2542]" />
                        </button>

                        <div className="mx-1 h-7 w-px bg-slate-200" />

                        {/* Profile */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100"
                                onClick={() => setProfileOpen(p => !p)}
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D2542] text-[11px] font-bold tracking-wide text-white">
                                    BP
                                </div>

                                <div className="hidden text-left leading-tight md:block">
                                    <p className="text-[12.5px] font-bold text-slate-900">{role}</p>
                                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Licensing Office</p>
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
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Account</p>
                                        <p className="text-sm font-bold text-slate-900">{role}</p>
                                    </div>
                                    <div className="p-1.5">
                                        <Link href="#" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
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
                <main className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-8 sm:py-7">
                    <div className="mx-auto max-w-[1500px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}