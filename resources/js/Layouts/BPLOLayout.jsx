import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    Bell, Menu, Search, Settings, LogOut,
    ChevronDown, Command,
    Award, FileCheck
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   CIVIC PRESTIGE — Enterprise light theme
   Fonts  : Plus Jakarta Sans (display) · Inter (UI) · DM Sans (labels)
   Palette: Cool blue-white · Royal blue · Bright royal accent
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.bplo-root *, .bplo-root *::before, .bplo-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}

.bplo-root {
  font-family: 'Inter', sans-serif;
  background: #EDEEF4;
  color: #1A3380;
  min-height: 100vh;
  display: flex;
}

/* ─── SIDEBAR ──────────────────────────────────────────────────────── */
.b-sidebar {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: 262px; z-index: 50;
  background: #FFFFFF;
  border-right: 1px solid rgba(26,51,128,.07);
  display: flex; flex-direction: column;
  transform: translateX(-100%);
  transition: transform .3s cubic-bezier(.4,0,.2,1);
}
@media (min-width: 1024px) {
  .b-sidebar { position: static; transform: none !important; }
}
.b-sidebar.open { transform: translateX(0); }

/* Logo */
.b-logo {
  height: 72px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(26,51,128,.06);
  padding: 0 24px; text-decoration: none;
}
.b-logo img {
  height: 50px; width: auto; object-fit: contain;
  transition: transform .3s ease;
}
.b-logo:hover img { transform: scale(1.05); }

/* Nav scroll area */
.b-nav { flex: 1; overflow-y: auto; padding: 30px 14px 14px; }
.b-nav::-webkit-scrollbar { width: 0; }

/* Group */
.b-nav-group { margin-bottom: 30px; }
.b-group-label {
  display: flex; align-items: center; gap: 10px;
  padding: 0 10px; margin-bottom: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #7A9BC8;
}
.b-group-label::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(26,51,128,.07);
}

/* Nav link */
.b-nav-link {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 13px; border-radius: 9px;
  font-size: 13.5px; font-weight: 500;
  color: #4A6090; text-decoration: none;
  position: relative; transition: all .18s ease;
}
.b-nav-link:hover { background: rgba(26,51,128,.05); color: #1A3380; }
.b-nav-link.active {
  background: rgba(65,105,225,.09);
  color: #1A3380; font-weight: 600;
}
.b-nav-link.active::before {
  content: '';
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 20px;
  background: linear-gradient(180deg, #5B88F0 0%, #1E3A8A 100%);
  border-radius: 0 3px 3px 0;
}
.b-nav-icon { flex-shrink: 0; color: #8AAAD4; transition: color .18s; }
.b-nav-link:hover .b-nav-icon { color: #5A7AAA; }
.b-nav-link.active .b-nav-icon { color: #4169E1; }

/* ── Bottom Action (Logout fixed at bottom) ── */
.b-bottom-action {
  flex-shrink: 0;
  padding: 16px 14px 24px 14px;
  border-top: 1px solid rgba(26,51,128,.06);
  background: #FFFFFF;
}
.b-logout-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 10px 13px; border-radius: 9px;
  font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600;
  color: #DC2626;
  background: transparent; border: none;
  cursor: pointer; transition: all .18s ease;
  text-align: left;
}
.b-logout-btn .b-nav-icon {
  color: #DC2626;
  transition: color .18s;
}
.b-logout-btn:hover {
  background: rgba(220,38,38,.08);
  color: #B91C1C;
}
.b-logout-btn:hover .b-nav-icon {
  color: #B91C1C;
}

/* ─── MOBILE OVERLAY ───────────────────────────────────────────────── */
.b-overlay {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(10,20,80,.3);
  backdrop-filter: blur(4px);
  transition: opacity .3s; cursor: pointer;
}
.b-overlay.hidden { opacity: 0; pointer-events: none; }

/* ─── MAIN COLUMN ──────────────────────────────────────────────────── */
.b-main { flex: 1; display: flex; flex-direction: column;
          height: 100vh; min-width: 0; overflow: hidden; }

/* ─── HEADER ───────────────────────────────────────────────────────── */
.b-header {
  height: 72px; flex-shrink: 0;
  background: rgba(238,243,255,.92);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid rgba(26,51,128,.07);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px; position: sticky; top: 0; z-index: 30;
}

/* Left */
.b-header-left { display: flex; align-items: center; gap: 14px; }

/* Mobile toggle */
.b-menu-btn {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 9px;
  border: 1px solid rgba(26,51,128,.1);
  background: #FFFFFF; color: #4A6090; cursor: pointer;
  transition: all .18s;
}
.b-menu-btn:hover { border-color: rgba(26,51,128,.18); color: #1A3380; }

/* Breadcrumb */
.b-breadcrumb {
  align-items: center; gap: 10px;
  display: none;
}
@media (min-width: 1024px) { .b-breadcrumb { display: flex; } }
.b-bc-base {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: #7A9BC8;
}
.b-bc-sep { color: rgba(26,51,128,.2); font-size: 14px; line-height: 1; }
.b-bc-page {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 700; letter-spacing: -.01em;
  color: #1A3380; line-height: 1;
}

/* Right cluster */
.b-header-right { display: flex; align-items: center; gap: 8px; }

/* Search */
.b-search {
  display: none; align-items: center; gap: 9px;
  background: #FFFFFF;
  border: 1px solid rgba(26,51,128,.09);
  border-radius: 50px; height: 38px;
  padding: 0 14px; width: 255px;
  transition: width .25s ease, border-color .2s, box-shadow .2s;
  cursor: text;
}
@media (min-width: 1280px) { .b-search { display: flex; } }
.b-search:focus-within {
  width: 300px;
  border-color: rgba(65,105,225,.4);
  box-shadow: 0 0 0 3px rgba(65,105,225,.09);
}
.b-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif; font-size: 12.5px;
  font-weight: 500; color: #1A3380; width: 100%;
}
.b-search input::placeholder { color: #7A9BC8; font-weight: 400; }
.b-search-icon { color: #7A9BC8; flex-shrink: 0; }
.b-kbd {
  display: flex; align-items: center; gap: 2px;
  background: #EEF3FF; border: 1px solid rgba(26,51,128,.08);
  border-radius: 5px; padding: 3px 6px; flex-shrink: 0;
}
.b-kbd span {
  font-family: 'DM Sans', sans-serif; font-size: 8.5px;
  font-weight: 700; color: #7A9BC8;
}

/* Divider */
.b-hdivider { width: 1px; height: 26px; background: rgba(26,51,128,.08); margin: 0 4px; }

/* Notification */
.b-notif {
  position: relative; width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 9px; border: 1px solid transparent;
  color: #4A6090; cursor: pointer; transition: all .18s;
  background: transparent;
}
.b-notif:hover {
  background: #FFFFFF;
  border-color: rgba(26,51,128,.1);
  color: #1A3380;
}
.b-notif-pip {
  position: absolute; top: 9px; right: 9px;
  width: 7px; height: 7px; border-radius: 50%;
  background: #4169E1; border: 2px solid #EEF3FF;
}

/* Profile */
.b-profile { position: relative; }
.b-profile-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 10px 4px 4px; border-radius: 12px;
  border: 1px solid transparent;
  background: transparent; cursor: pointer; transition: all .18s;
}
.b-profile-btn:hover {
  background: #FFFFFF;
  border-color: rgba(26,51,128,.1);
  box-shadow: 0 2px 8px rgba(10,20,80,.06);
}
.b-avatar {
  width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(145deg, #1E3A8A 0%, #2E57C8 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 700; letter-spacing: .05em;
  color: #BFDBFE;
  border: 1px solid rgba(91,136,240,.25);
}
.b-pname {
  display: none;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; color: #1A3380;
  line-height: 1; margin-bottom: 5px;
}
.b-psub {
  font-size: 9.5px; font-weight: 500; letter-spacing: .07em;
  text-transform: uppercase; color: #7A9BC8; line-height: 1;
}
@media (min-width: 768px) { .b-pname { display: block; } }
.b-pinfo { display: none; text-align: left; }
@media (min-width: 768px) { .b-pinfo { display: block; } }
.b-chevron { color: #7A9BC8; transition: transform .2s; }
.b-chevron.open { transform: rotate(180deg); }

/* Dropdown */
.b-dropdown {
  position: absolute; right: 0; top: calc(100% + 10px);
  width: 228px;
  background: #FFFFFF;
  border: 1px solid rgba(26,51,128,.09);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(10,20,80,.1), 0 4px 12px rgba(10,20,80,.06);
  overflow: hidden; z-index: 60;
  animation: bDropIn .16s cubic-bezier(.2,0,.2,1) both;
}
@keyframes bDropIn {
  from { opacity:0; transform: translateY(-6px) scale(.97); }
  to   { opacity:1; transform: translateY(0) scale(1); }
}
.b-dd-head {
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(26,51,128,.06);
}
.b-dd-label {
  font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: #7A9BC8; margin-bottom: 5px;
}
.b-dd-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px; font-weight: 700; color: #1A3380;
}
.b-dd-body { padding: 6px; }
.b-dd-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 11px 12px; border-radius: 10px;
  font-size: 13px; font-weight: 500; color: #3A5080;
  background: none; border: none; cursor: pointer;
  text-decoration: none; transition: all .15s;
}
.b-dd-item:hover { background: #EEF3FF; color: #1A3380; }
.b-dd-item.danger { color: #B91C1C; }
.b-dd-item.danger:hover { background: #FEF2F2; }

/* ─── PAGE CONTENT ─────────────────────────────────────────────────── */
.b-page {
  flex: 1; overflow-y: auto;
  padding: 36px 32px 52px;
}
.b-page::-webkit-scrollbar { width: 4px; }
.b-page::-webkit-scrollbar-track { background: transparent; }
.b-page::-webkit-scrollbar-thumb { background: rgba(26,51,128,.1); border-radius: 4px; }
.b-content {
  max-width: 1500px; margin: 0 auto;
  animation: bFadeUp .4s cubic-bezier(.2,0,.2,1) both;
}
@keyframes bFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export default function BPLOLayout({ children, title, role = "BPLO Officer" }) {
    const { url } = usePage();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isExiting,   setIsExiting]   = useState(false);

    // 🔴 BPLO NAVIGATION (Administration removed as requested) 🔴
    const navigation = [
        {
            group: "Issuance Hub",
            links: [
                { name: 'Releasing Queue', icon: Award,     route: '/bplo/releasing' },
                { name: 'Active Registry', icon: FileCheck, route: '/bplo/registry'  },
            ]
        }
    ];

    const allLinks   = navigation.flatMap(g => g.links);
    const activePage = allLinks.find(l => url.startsWith(l.route))?.name || title;

    // Fixed logout redirection
    // 🔴 DEMO LOGOUT LOGIC 🔴
    const handleLogout = () => {
        setIsExiting(true);
        setTimeout(() => {
            // For now, just instantly redirect to the login page
            window.location.href = '/login';

            // NOTE: Once we connect the real database authentication,
            // you will swap this back to: router.post('/logout')
        }, 400);
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="bplo-root" style={{ opacity: isExiting ? 0 : 1, transition: 'opacity .5s' }}>

                <div
                    className={`b-overlay${sidebarOpen ? '' : ' hidden'}`}
                    onClick={() => setSidebarOpen(false)}
                />

                {/* ══════ SIDEBAR ══════════════════════════════════════ */}
                <aside className={`b-sidebar${sidebarOpen ? ' open' : ''}`}>

                    <Link href="/bplo/releasing" className="b-logo">
                        <img src="/images/logo.png" alt="TRIVORA" />
                    </Link>

                    <nav className="b-nav">
                        {navigation.map((group, gi) => (
                            <div key={gi} className="b-nav-group">
                                <div className="b-group-label">{group.group}</div>

                                {group.links.map((link) => {
                                    const Icon     = link.icon;
                                    const isActive = url.startsWith(link.route);
                                    return (
                                        <Link
                                            key={link.name}
                                            href={link.route}
                                            className={`b-nav-link${isActive ? ' active' : ''}`}
                                        >
                                            <Icon
                                                size={16}
                                                strokeWidth={isActive ? 2.5 : 1.8}
                                                className="b-nav-icon"
                                            />
                                            <span>{link.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    {/* ONLY Logout anchored at the bottom */}
                    <div className="b-bottom-action">
                        <button onClick={handleLogout} className="b-logout-btn">
                            <LogOut size={16} strokeWidth={2.5} className="b-nav-icon" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* ══════ MAIN COLUMN ══════════════════════════════════ */}
                <div className="b-main">

                    {/* Header */}
                    <header className="b-header">

                        <div className="b-header-left">
                            <button
                                className="b-menu-btn"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu size={18} strokeWidth={2} />
                            </button>

                            <div className="b-breadcrumb">
                                <span className="b-bc-base">Nasugbu</span>
                                <span className="b-bc-sep">/</span>
                                <span className="b-bc-page">{activePage}</span>
                            </div>
                        </div>

                        <div className="b-header-right">

                            <div className="b-search">
                                <Search size={13} strokeWidth={2} className="b-search-icon" />
                                <input placeholder="Search registry…" />
                                <div className="b-kbd">
                                    <Command size={9} color="#7A9BC8" />
                                    <span>K</span>
                                </div>
                            </div>

                            <button className="b-notif">
                                <Bell size={18} strokeWidth={1.8} />
                                <span className="b-notif-pip" />
                            </button>

                            <div className="b-hdivider" />

                            <div className="b-profile">
                                <button
                                    className="b-profile-btn"
                                    onClick={() => setProfileOpen(p => !p)}
                                >
                                    <div className="b-avatar">BP</div>

                                    <div className="b-pinfo">
                                        <p className="b-pname">{role}</p>
                                        <p className="b-psub">LGU Authorized</p>
                                    </div>

                                    <ChevronDown
                                        size={13} strokeWidth={2.5}
                                        className={`b-chevron${profileOpen ? ' open' : ''}`}
                                    />
                                </button>

                                {profileOpen && (
                                    <div className="b-dropdown">
                                        <div className="b-dd-head">
                                            <p className="b-dd-label">Administrative</p>
                                            <p className="b-dd-name">BPLO Head</p>
                                        </div>
                                        <div className="b-dd-body">
                                            <Link href="#" className="b-dd-item">
                                                <Settings size={14} strokeWidth={1.8} />
                                                Office Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="b-dd-item danger"
                                            >
                                                <LogOut size={14} strokeWidth={1.8} />
                                                Terminate Session
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="b-page">
                        <div className="b-content">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}