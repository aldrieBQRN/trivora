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
            className="flex h-screen overflow-hidden bg-tmo-bg font-sans"
            style={{ opacity: isExiting ? 0 : 1, transition: 'opacity .4s' }}
        >
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[1px] lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ══════ SIDEBAR ══════════════════════════════════════ */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-tmo-primary transition-transform duration-300 print:hidden lg:static lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-[68px] shrink-0 items-center justify-between px-5">
                    <Link href="/tmo-dashboard" className="flex items-center gap-2.5">
                        <div className="flex h-9 items-center justify-center rounded-lg bg-white px-2">
                            <img src="/images/logo.png" alt="Trivora" className="h-6 w-auto object-contain" />
                        </div>
                        <div className="leading-none">
                            <p className="text-[13.5px] font-semibold tracking-tight text-white">Trivora</p>
                            <p className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/45">TMO Panel</p>
                        </div>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

                <div className="mx-5 h-px bg-white/[0.08]" />

                <nav className="flex flex-1 flex-col overflow-y-auto px-3.5 pb-3.5 pt-4">
                    <div className="flex-1">
                        {navigation.map((group, gi) => (
                            <div key={gi} className="mb-6">
                                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">
                                    {group.group}
                                </p>

                                {group.links.map((link) => {
                                    const Icon     = link.icon;
                                    const isActive = url.startsWith(link.route);
                                    return (
                                        <Link
                                            key={link.name}
                                            href={link.route}
                                            className={`relative mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                                                isActive
                                                    ? 'bg-white/[0.09] font-medium text-white'
                                                    : 'font-normal text-white/60 hover:bg-white/[0.06] hover:text-white/90'
                                            }`}
                                        >
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-white" />
                                            )}
                                            <Icon size={16} strokeWidth={1.9} className={`shrink-0 ${isActive ? 'text-white' : 'text-white/45'}`} />
                                            <span>{link.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Bottom profile rail */}
                    <div className="shrink-0 border-t border-white/[0.08] pt-3">
                        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white ring-1 ring-white/10">
                                TM
                            </div>
                            <div className="min-w-0 flex-1 leading-tight">
                                <p className="truncate text-[12.5px] font-medium text-white">{role}</p>
                                <p className="text-[10.5px] text-white/40">Authorized</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                title="Sign out"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <LogOut size={15} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </nav>
            </aside>

            {/* ══════ MAIN COLUMN ══════════════════════════════════ */}
            <div className="flex min-w-0 flex-1 flex-col">

                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/90 px-5 backdrop-blur-sm print:hidden sm:px-8">

                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-800 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={18} strokeWidth={2} />
                    </button>
                    <div className="hidden lg:block" />

                    <div className="flex items-center gap-1.5">

                        {/* Search (decorative — not wired to a search endpoint) */}
                        <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 h-9 w-[240px] transition-colors xl:flex focus-within:border-tmo-primary focus-within:bg-white focus-within:ring-[3px] focus-within:ring-tmo-primary/10">
                            <Search size={14} strokeWidth={2} className="shrink-0 text-gray-400" />
                            <input
                                placeholder="Search records…"
                                className="w-full bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none"
                            />
                            <div className="hidden items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0.5 lg:flex">
                                <Command size={9} className="text-gray-400" />
                                <span className="text-[9px] font-semibold text-gray-400">K</span>
                            </div>
                        </div>

                        {/* Bell */}
                        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">
                            <Bell size={18} strokeWidth={1.8} />
                            <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full border-2 border-white bg-tmo-primary" />
                        </button>

                        <div className="mx-1.5 h-6 w-px bg-gray-200" />

                        {/* Profile */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2.5 transition-colors hover:bg-gray-100"
                                onClick={() => setProfileOpen(p => !p)}
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tmo-primary text-[11px] font-semibold tracking-wide text-white">
                                    TM
                                </div>

                                <div className="hidden text-left leading-tight md:block">
                                    <p className="text-[13px] font-medium text-gray-900">{role}</p>
                                    <p className="text-[11px] text-gray-400">Authorized</p>
                                </div>

                                <ChevronDown
                                    size={13}
                                    strokeWidth={2.25}
                                    className={`shrink-0 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-900/5">
                                    <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Management</p>
                                        <p className="text-sm font-semibold text-gray-900">Administrator</p>
                                    </div>
                                    <div className="p-1.5">
                                        <Link href="#" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
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
                <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
                    <div className="mx-auto max-w-[1500px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
