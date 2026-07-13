import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    Bell, Menu, Search, Settings, LogOut,
    ChevronDown, Command, LayoutDashboard, FileText, CheckSquare
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TREASURER PORTAL — Enterprise light theme (Centered Logo & No Breadcrumb)
   Matches Operator/Trivora token system exactly
   Fonts  : Plus Jakarta Sans (display) · Inter (UI) · DM Sans (labels)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.tmo-root *, .tmo-root *::before, .tmo-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}

.tmo-root {
  font-family: 'Inter', sans-serif;
  background: #FFFFFF;
  color: #1C2340;
  min-height: 100vh;
  display: flex;
}

/* ─── SIDEBAR ──────────────────────────────────────────────────────── */
.t-sidebar {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: 262px; z-index: 50;
  background: linear-gradient(180deg, #1C2340 0%, #2A3B5C 100%);
  border-right: 1px solid rgba(255,255,255,.08);
  display: flex; flex-direction: column;
  transform: translateX(-100%);
  transition: transform .3s cubic-bezier(.4,0,.2,1);
}
@media (min-width: 768px) {
  .t-sidebar { position: static; transform: none !important; }
}
.t-sidebar.open { transform: translateX(0); }

/* Logo */
.t-logo {
  height: 76px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; /* Centered */
  padding: 0 24px; text-decoration: none;
  border: none;
}
.t-logo-wrap {
  background: #FFFFFF;
  border-radius: 8px;
  padding: 4px 8px;
  display: flex; align-items: center; justify-content: center;
  border: none;
  box-shadow: none;
  transition: transform .2s ease, box-shadow .2s ease;
  flex-shrink: 0;
}
.t-logo:hover .t-logo-wrap {
  box-shadow: 0 4px 14px rgba(0,0,0,0.3);
  border-color: rgba(255,255,255,.25);
}
.t-logo-img { height: 38px; width: auto; display: block; object-fit: contain; }

/* ── Nav Area ──────────────────────────────────────────────────────── */
.t-nav {
  flex: 1; display: flex; flex-direction: column;
  padding: 24px 14px 14px 14px; overflow-y: auto;
}
.t-nav::-webkit-scrollbar { width: 0; }
.t-nav-scroll { flex: 1; }

/* Group */
.t-nav-group { margin-bottom: 30px; }
.t-group-label {
  display: flex; align-items: center; gap: 10px;
  padding: 0 10px; margin-bottom: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #FFFFFF;
}
.t-group-label::after {
  content: ''; flex: 1; height: 1px;
  background: #FFFFFF;
}

/* Nav link */
.t-nav-link {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 13px; border-radius: 9px;
  font-size: 13.5px; font-weight: 500;
  color: #FFFFFF; text-decoration: none;
  position: relative; transition: all .18s ease;
  margin-bottom: 6px;
}
.t-nav-link:hover { background: rgba(255,255,255,.05); color: #FFFFFF; font-weight: 600; }
.t-nav-link.active {
  background: #FFFFFF;
  color: #1C2340; font-weight: 600;
}
.t-nav-link.active::before {
  content: '';
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 20px;
  background: linear-gradient(180deg, #7B8EF5 0%, #60A5FA 100%);
  border-radius: 0 3px 3px 0;
}
.t-nav-icon { flex-shrink: 0; color: #FFFFFF; transition: color .18s; }
.t-nav-link:hover .t-nav-icon { color: #FFFFFF; }
.t-nav-link.active .t-nav-icon { color: #4F5BCB; }

/* ── Bottom Action (Logout fixed at bottom) ── */
.t-bottom-action {
  flex-shrink: 0;
  padding: 16px 14px 24px 14px;
  border-top: 1px solid rgba(255,255,255,.08);
  background: transparent;
}
.t-logout-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 10px 13px; border-radius: 9px;
  font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600;
  color: #FF6B6B;
  background: transparent; border: none;
  cursor: pointer; transition: all .18s ease;
  text-align: left;
}
.t-logout-btn .t-nav-icon {
  color: #FF6B6B;
  transition: color .18s;
}
.t-logout-btn:hover {
  background: rgba(255,107,107,.1);
  color: #FF8787;
}
.t-logout-btn:hover .t-nav-icon {
  color: #FF8787;
}

/* ─── MOBILE OVERLAY ───────────────────────────────────────────────── */
.t-overlay {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(10,14,50,.3);
  backdrop-filter: blur(4px);
  transition: opacity .3s; cursor: pointer;
}
.t-overlay.hidden { opacity: 0; pointer-events: none; }

/* ─── MAIN COLUMN ──────────────────────────────────────────────────── */
.t-main { flex: 1; display: flex; flex-direction: column;
          height: 100vh; min-width: 0; overflow: hidden; }

/* ─── HEADER ───────────────────────────────────────────────────────── */
.t-header {
  height: 72px; flex-shrink: 0;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid rgba(28,35,64,.07);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px; position: sticky; top: 0; z-index: 30;
}

/* Left */
.t-header-left { display: flex; align-items: center; gap: 14px; }

/* Mobile toggle */
.t-menu-btn {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 9px;
  border: 1px solid rgba(28,35,64,.1);
  background: #FFFFFF; color: #5A6488; cursor: pointer;
  transition: all .18s;
}
.t-menu-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }
.t-menu-btn.mobile { display: flex; }
@media (min-width: 1024px) { .t-menu-btn.mobile { display: none; } }

/* Right cluster */
.t-header-right { display: flex; align-items: center; gap: 8px; }

/* Search */
.t-search {
  display: none; align-items: center; gap: 9px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.09);
  border-radius: 50px; height: 38px;
  padding: 0 14px; width: 255px;
  transition: width .25s ease, border-color .2s, box-shadow .2s;
  cursor: text;
}
@media (min-width: 1280px) { .t-search { display: flex; } }
.t-search:focus-within {
  width: 300px;
  border-color: rgba(79,91,203,.4);
  box-shadow: 0 0 0 3px rgba(79,91,203,.09);
}
.t-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif; font-size: 12.5px;
  font-weight: 500; color: #1C2340; width: 100%;
}
.t-search input::placeholder { color: #9AA3CC; }
.t-search-icon { flex-shrink: 0; color: #9AA3CC; transition: color .18s; }
.t-search:focus-within .t-search-icon { color: #4F5BCB; }
.t-kbd {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 2px;
  background: #F2F4FA; border: 1px solid rgba(28,35,64,.09);
  border-radius: 5px; padding: 2px 7px;
  font-family: 'DM Sans', sans-serif; font-size: 9px;
  font-weight: 800; letter-spacing: .06em; color: #8A96BC;
}

/* Notification bell */
.t-notif {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 9px;
  border: 1px solid transparent;
  background: transparent; color: #5A6488;
  cursor: pointer; transition: all .18s;
}
.t-notif:hover {
  background: #FFFFFF; color: #1C2340;
  border-color: rgba(28,35,64,.1);
}
.t-notif-pip {
  position: absolute; top: 9px; right: 9px;
  width: 6px; height: 6px; border-radius: 50%;
  background: #4F5BCB;
  border: 1.5px solid #EDEEF4;
}

/* Divider */
.t-hdivider {
  width: 1px; height: 28px;
  background: rgba(28,35,64,.1);
  margin: 0 4px;
}

/* Profile */
.t-profile { position: relative; }
.t-profile-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 5px 12px 5px 5px; border-radius: 50px;
  border: 1px solid transparent;
  background: transparent; cursor: pointer;
  transition: all .18s;
}
.t-profile-btn:hover {
  background: #FFFFFF;
  border-color: rgba(28,35,64,.1);
}
.t-avatar {
  width: 34px; height: 34px; border-radius: 9px;
  background: linear-gradient(135deg, #4F5BCB 0%, #2E3A9E 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 800;
  color: #FFFFFF; letter-spacing: .04em;
  flex-shrink: 0;
}
.t-pinfo { display: none; text-align: left; line-height: 1; }
@media (min-width: 768px) { .t-pinfo { display: block; } }
.t-pname {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px; font-weight: 700;
  color: #1C2340; letter-spacing: -.01em; margin-bottom: 4px;
}
.t-psub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}
.t-chevron {
  color: #9AA3CC; transition: transform .2s;
  flex-shrink: 0;
}
.t-chevron.open { transform: rotate(180deg); }

/* Dropdown */
.t-dropdown {
  position: absolute; right: 0; top: calc(100% + 10px);
  width: 220px;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(28,35,64,.12), 0 2px 8px rgba(28,35,64,.06);
  overflow: hidden;
  animation: tDropIn .18s cubic-bezier(.2,0,.2,1) both;
  z-index: 60;
}
@keyframes tDropIn {
  from { opacity: 0; transform: translateY(-6px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)  scale(1); }
}
.t-dd-head {
  padding: 16px 18px 13px;
  border-bottom: 1px solid rgba(28,35,64,.06);
}
.t-dd-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #9AA3CC; margin-bottom: 5px;
}
.t-dd-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px; font-weight: 700;
  color: #1C2340;
}
.t-dd-body { padding: 8px; }
.t-dd-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 12px; border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 500;
  color: #5A6488; background: transparent;
  border: none; cursor: pointer; text-decoration: none;
  transition: all .15s ease;
}
.t-dd-item:hover { background: #EDEEF4; color: #1C2340; }
.t-dd-item.danger { color: #B91C1C; }
.t-dd-item.danger:hover { background: #FEF2F2; }

/* ─── PAGE CONTENT ─────────────────────────────────────────────────── */
.t-page {
  flex: 1; overflow-y: auto;
  padding: 36px 32px 52px;
}
.t-page::-webkit-scrollbar { width: 4px; }
.t-page::-webkit-scrollbar-track { background: transparent; }
.t-page::-webkit-scrollbar-thumb { background: rgba(28,35,64,.1); border-radius: 4px; }
.t-content {
  max-width: 1500px; margin: 0 auto;
  animation: tFadeUp .4s cubic-bezier(.2,0,.2,1) both;
}
@keyframes tFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export default function TreasurerLayout({ children, title, treasurerName = "Municipal Cashier" }) {
    const { url } = usePage();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // 🔴 TREASURER-SPECIFIC NAVIGATION 🔴
    const navigation = [
        {
            group: "Finance Operations",
            links: [
                { name: 'Dashboard', icon: LayoutDashboard, route: 'treasurer.dashboard' },
                { name: 'Pending Payments', icon: CheckSquare, route: 'treasurer.pending' }, // Added Pending Tab
                { name: 'Payment Records', icon: FileText, route: 'treasurer.transactions' },
            ]
        }
    ];

    // Helper to determine if a link is active based on current route name
    const isLinkActive = (routeName) => {
        try {
            return route().current(routeName) || route().current(`${routeName}.*`);
        } catch (e) {
            // Fallback for purely URL-based checking if `route()` helper isn't available
            return url.includes(routeName.replace('treasurer.', '/treasurer/'));
        }
    };

    const handleLogout = () => {
        setIsExiting(true);
        setTimeout(() => {
            router.post('/logout');
        }, 400);
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="tmo-root" style={{ opacity: isExiting ? 0 : 1, transition: 'opacity .5s' }}>

                {/* Mobile overlay */}
                <div
                    className={`t-overlay${sidebarOpen ? '' : ' hidden'}`}
                    onClick={() => setSidebarOpen(false)}
                />

                {/* ══════ SIDEBAR ══════════════════════════════════════ */}
                <aside className={`t-sidebar${sidebarOpen ? ' open' : ''}`}>

                    {/* Centered Logo without text */}
                    <Link href={route('treasurer.dashboard')} className="t-logo">
                        <div className="t-logo-wrap">
                            <img src="/images/logo.png" alt="Trivora" className="t-logo-img" />
                        </div>
                    </Link>

                    {/* Nav Area (Scrollable) */}
                    <nav className="t-nav">
                        {navigation.map((group, gi) => (
                            <div key={gi} className="t-nav-group">
                                <div className="t-group-label">{group.group}</div>

                                {group.links.map((link) => {
                                    const Icon = link.icon;
                                    const active = isLinkActive(link.route);
                                    return (
                                        <Link
                                            key={link.name}
                                            href={route(link.route)}
                                            className={`t-nav-link${active ? ' active' : ''}`}
                                        >
                                            <Icon
                                                size={16}
                                                strokeWidth={active ? 2.5 : 1.8}
                                                className="t-nav-icon"
                                            />
                                            <span>{link.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    {/* ONLY Logout anchored at the very bottom, outside the scrollable area */}
                    <div className="t-bottom-action">
                        <button onClick={handleLogout} className="t-logout-btn">
                            <LogOut size={16} strokeWidth={2.5} className="t-nav-icon" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* ══════ MAIN COLUMN ══════════════════════════════════ */}
                <div className="t-main">

                    {/* Header */}
                    <header className="t-header">

                        {/* Left */}
                        <div className="t-header-left">
                            <button
                                className="t-menu-btn mobile"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu size={18} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Right */}
                        <div className="t-header-right">

                            {/* Search */}
                            <div className="t-search">
                                <Search size={13} strokeWidth={2} className="t-search-icon" />
                                <input placeholder="Search records…" />
                                <div className="t-kbd">
                                    <Command size={9} color="#8A96BC" />
                                    <span>K</span>
                                </div>
                            </div>

                            {/* Bell */}
                            <button className="t-notif">
                                <Bell size={18} strokeWidth={1.8} />
                                <span className="t-notif-pip" />
                            </button>

                            <div className="t-hdivider" />

                            {/* Profile */}
                            <div className="t-profile">
                                <button
                                    className="t-profile-btn"
                                    onClick={() => setProfileOpen(p => !p)}
                                >
                                    <div className="t-avatar">
                                        {treasurerName.charAt(0)}
                                    </div>

                                    <div className="t-pinfo">
                                        <p className="t-pname">{treasurerName}</p>
                                        <p className="t-psub">Treasurer's Office</p>
                                    </div>

                                    <ChevronDown
                                        size={13} strokeWidth={2.5}
                                        className={`t-chevron${profileOpen ? ' open' : ''}`}
                                    />
                                </button>

                                {profileOpen && (
                                    <div className="t-dropdown">
                                        <div className="t-dd-head">
                                            <p className="t-dd-label">Account</p>
                                            <p className="t-dd-name">{treasurerName}</p>
                                        </div>
                                        <div className="t-dd-body">
                                            <Link href={route('profile.edit')} className="t-dd-item">
                                                <Settings size={14} strokeWidth={1.8} />
                                                Account Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="t-dd-item danger"
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
                    <main className="t-page">
                        <div className="t-content">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}