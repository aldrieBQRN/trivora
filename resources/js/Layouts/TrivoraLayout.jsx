import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    Bell, Menu, Search, Settings, LogOut,
    ChevronDown, Command,
    LayoutDashboard, ShieldCheck,
    FileSearch, ClipboardCheck,
    Bike, ShieldAlert, Users, X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO Panel shell — sidebar + header chrome shared by every TMO page.
   Brand token: tmo-primary (#1D2542). See tailwind.config.js `tmo.*` colors.
───────────────────────────────────────────────────────────────────────── */

export default function TrivoraLayout({ children, title, role = "TMO Personnel" }) {
    const { url, props } = usePage();
    const isAdmin = props?.auth?.user?.role === 'admin';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isExiting,   setIsExiting]   = useState(false);

    const navigation = [
        {
            group: "Operations",
            links: [
                { name: 'Live Monitoring',      icon: LayoutDashboard, route: '/tmo-dashboard' },

                { name: 'Tricycle Registry',    icon: Bike,            route: '/tmo/registry' },
                { name: 'Violation Records',    icon: ShieldAlert,     route: '/violations' },
            ]
        },
        {
            group: "TMO Pipeline",
            links: [
                { name: 'Document Review',     icon: FileSearch,     route: '/tmo/docs'               },
                { name: 'Physical Inspection', icon: ClipboardCheck, route: '/tmo/physical'           },
                { name: 'Final Confirmation',  icon: ShieldCheck,    route: '/tmo/final-confirmation' },
            ]
        },
        {
            group: "Management",
            links: [
                { name: 'Staff Management', icon: Users, route: '/tmo/users' },
            ]
        },
    ];

    const allLinks   = navigation.flatMap(g => g.links);

    // Fallback matching to determine active state visually
    const activePage = allLinks.find(l => url.startsWith(l.route))?.name || title;

    const handleLogout = () => {
        setIsExiting(true);
        setTimeout(() => {
            router.post('/logout');
        }, 400);
    };

    return (
        <div
            className="flex min-h-screen bg-tmo-bg font-sans"
            style={{ opacity: isExiting ? 0 : 1, transition: 'opacity .4s' }}
        >
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ══════ SIDEBAR ══════════════════════════════════════ */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-tmo-primary transition-transform duration-300 print:hidden md:static md:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
                    <Link href="/tmo-dashboard" className="flex items-center">
                        <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1">
                            <img src="/images/logo.png" alt="Trivora" className="h-8 w-auto object-contain" />
                        </div>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white md:hidden"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

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
                                    const isActive = url.startsWith(link.route);
                                    return (
                                        <Link
                                            key={link.name}
                                            href={link.route}
                                            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                                                isActive
                                                    ? 'bg-white font-semibold text-tmo-primary'
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

                    {/* Bottom Logout Button */}
                    <div className="shrink-0 border-t border-white/10 pt-3.5">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                        >
                            <LogOut size={16} strokeWidth={2.5} className="shrink-0" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* ══════ MAIN COLUMN ══════════════════════════════════ */}
            <div className="flex min-w-0 flex-1 flex-col">

                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-tmo-border bg-white px-5 print:hidden sm:px-8">

                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-tmo-border text-tmo-muted hover:border-tmo-borderStrong hover:text-tmo-ink md:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={18} strokeWidth={2} />
                    </button>
                    <div className="hidden md:block" />

                    <div className="flex items-center gap-2">

                        {/* Search (decorative — not wired to a search endpoint) */}
                        <div className="hidden items-center gap-2 rounded-lg border border-tmo-border bg-tmo-bg px-3 h-9 w-[230px] xl:flex focus-within:border-tmo-primary focus-within:ring-2 focus-within:ring-tmo-primary/15">
                            <Search size={14} strokeWidth={2} className="shrink-0 text-tmo-subtle" />
                            <input
                                placeholder="Search records…"
                                className="w-full bg-transparent text-xs font-medium text-tmo-ink placeholder:text-tmo-subtle focus:outline-none"
                            />
                            <div className="hidden items-center gap-0.5 rounded border border-tmo-border bg-white px-1.5 py-0.5 lg:flex">
                                <Command size={9} className="text-tmo-subtle" />
                                <span className="text-[9px] font-bold text-tmo-subtle">K</span>
                            </div>
                        </div>

                        {/* Bell */}
                        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-tmo-muted hover:bg-tmo-bg hover:text-tmo-ink">
                            <Bell size={18} strokeWidth={1.8} />
                            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full border border-white bg-tmo-primary" />
                        </button>

                        <div className="mx-1 h-7 w-px bg-tmo-border" />

                        {/* Profile */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-tmo-bg"
                                onClick={() => setProfileOpen(p => !p)}
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tmo-primary text-[11px] font-bold tracking-wide text-white">
                                    TM
                                </div>

                                <div className="hidden text-left leading-tight md:block">
                                    <p className="text-[12.5px] font-bold text-tmo-ink">{role}</p>
                                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-tmo-subtle">Authorized</p>
                                </div>

                                <ChevronDown
                                    size={13}
                                    strokeWidth={2.5}
                                    className={`shrink-0 text-tmo-subtle transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-tmo-border bg-white shadow-lg">
                                    <div className="border-b border-tmo-border px-4 py-3">
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-tmo-subtle">Management</p>
                                        <p className="text-sm font-bold text-tmo-ink">Administrator</p>
                                    </div>
                                    <div className="p-1.5">
                                        <Link href="#" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-tmo-muted hover:bg-tmo-bg hover:text-tmo-ink">
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
                <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-8">
                    <div className="mx-auto max-w-[1500px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
