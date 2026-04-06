import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    FileText, LogIn, ShieldCheck,
    ArrowRight, Search,
    Cpu, Zap, Megaphone, Phone, QrCode
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Public Welcome / Landing Page
   Shares TrivoraLayout's slate-indigo token system
   Prefix: wl-* (welcome/landing)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

/* ── Base ────────────────────────────────────────────────────────────── */
.wl-root {
  font-family: 'Inter', sans-serif;
  background: #EDEEF4;
  color: #1C2340;
  min-height: 100vh;
  display: flex; flex-direction: column;
  overflow-x: hidden;
}
.wl-root *, .wl-root *::before, .wl-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Hero Backdrop (PHOTO BACKGROUND) ────────────────────────────────── */
.wl-hero-backdrop {
  position: absolute; top: 0; left: 0; width: 100%;
  height: 62vh; min-height: 460px;
  /* Dark gradient overlay + Photo Background */
  background-image:
    linear-gradient(to bottom, rgba(28, 35, 64, 0.7) 0%, rgba(28, 35, 64, 0.95) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
  z-index: 0;
  overflow: hidden;
}

/* Subtle tech dot grid overlay on top of the photo */
.wl-hero-backdrop::before {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

/* ── Constraint wrapper ──────────────────────────────────────────────── */
.wl-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  width: 100%;
}
@media (max-width: 640px) { .wl-wrap { padding: 0 20px; } }

/* ── Header ──────────────────────────────────────────────────────────── */
.wl-header {
  height: 80px;
  display: flex; align-items: center; justify-content: space-between;
  position: relative; z-index: 10;
}
.wl-logo { display: flex; align-items: center; gap: 14px; text-decoration: none; }
.wl-logo-img-wrap {
  height: 46px; width: auto; border-radius: 10px;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
  display: flex; align-items: center; justify-content: center;
  padding: 6px 10px; flex-shrink: 0;
  transition: box-shadow .2s;
}
.wl-logo:hover .wl-logo-img-wrap { box-shadow: 0 4px 16px rgba(0,0,0,.22); }
.wl-logo-img {
  height: 30px; width: auto; object-fit: contain; display: block;
}
.wl-logo-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px; font-weight: 800;
  letter-spacing: -.02em; color: #FFFFFF;
  line-height: 1; margin-bottom: 4px;
}
.wl-logo-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: rgba(255,255,255,.6); line-height: 1;
}
.wl-header-link {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.7); text-decoration: none;
  transition: color .18s;
}
.wl-header-link:hover { color: #FFFFFF; }
@media (max-width: 640px) { .wl-header-link { display: none; } }

/* ── Hero ────────────────────────────────────────────────────────────── */
.wl-hero {
  position: relative; z-index: 10;
  text-align: center;
  padding-top: 48px;
  padding-bottom: 100px;
}
.wl-status-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 50px;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2);
  backdrop-filter: blur(8px);
  margin-bottom: 28px;
}
.wl-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #34D399;
  box-shadow: 0 0 0 3px rgba(52,211,153,.2);
  animation: wlPulse 2s ease-in-out infinite;
}
@keyframes wlPulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(52,211,153,.2); }
  50%       { box-shadow: 0 0 0 6px rgba(52,211,153,.08); }
}
.wl-status-text {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: #FFFFFF;
}
.wl-hero-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 800; letter-spacing: -.03em;
  color: #FFFFFF; line-height: 1.05;
  margin-bottom: 22px;
}
.wl-hero-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.7);
  max-width: 480px; margin: 0 auto;
  line-height: 1.9;
}

/* ── Entry cards ─────────────────────────────────────────────────────── */
.wl-cards-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 820px;
  margin: 0 auto;
  position: relative; z-index: 10;
  margin-top: -56px;
  padding-bottom: 80px;
}
@media (max-width: 640px) { .wl-cards-row { grid-template-columns: 1fr; margin-top: -32px; } }

.wl-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 20px;
  padding: 36px 32px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  box-shadow: 0 4px 24px rgba(28,35,64,.08);
  transition: box-shadow .22s, transform .22s;
}
.wl-card:hover {
  box-shadow: 0 10px 40px rgba(28,35,64,.13);
  transform: translateY(-3px);
}
.wl-card-icon {
  width: 62px; height: 62px; border-radius: 16px;
  background: #EDEEF4;
  border: 1px solid rgba(28,35,64,.07);
  display: flex; align-items: center; justify-content: center;
  color: #1C2340; margin-bottom: 20px;
}
.wl-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340;
  line-height: 1; margin-bottom: 12px;
}
.wl-card-desc {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: .11em; text-transform: uppercase;
  color: #8A96BC; line-height: 1.9;
  margin-bottom: 28px; flex: 1;
}
.wl-btn-primary {
  width: 100%; height: 48px; border-radius: 11px;
  border: none; background: #1C2340; color: #FFFFFF;
  cursor: pointer; text-decoration: none;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .18s, box-shadow .18s;
  box-shadow: 0 3px 12px rgba(28,35,64,.2);
}
.wl-btn-primary:hover { background: #2E3A9E; box-shadow: 0 5px 18px rgba(28,35,64,.25); }
.wl-btn-outline {
  width: 100%; height: 48px; border-radius: 11px;
  border: 1.5px solid rgba(28,35,64,.2); background: #FFFFFF; color: #1C2340;
  cursor: pointer; text-decoration: none;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: border-color .18s, background .18s;
}
.wl-btn-outline:hover { border-color: #4F5BCB; color: #4F5BCB; background: rgba(79,91,203,.03); }

/* ── Section container ───────────────────────────────────────────────── */
.wl-section { padding-bottom: 80px; }

/* ── Verify tool ─────────────────────────────────────────────────────── */
.wl-verify {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; flex-wrap: wrap;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.wl-verify-left { display: flex; align-items: center; gap: 18px; }
.wl-verify-icon {
  width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
  background: rgba(79,91,203,.08);
  border: 1px solid rgba(79,91,203,.15);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB;
}
.wl-verify-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340; margin-bottom: 4px;
}
.wl-verify-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC;
}
.wl-verify-right { display: flex; gap: 10px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
.wl-verify-input {
  height: 44px; border-radius: 10px;
  border: 1px solid rgba(28,35,64,.12);
  background: #FAFAFA;
  padding: 0 16px;
  font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500;
  color: #1C2340; outline: none;
  width: 240px; min-width: 180px;
  transition: border-color .2s, box-shadow .2s;
}
.wl-verify-input:focus {
  border-color: rgba(79,91,203,.4);
  box-shadow: 0 0 0 3px rgba(79,91,203,.09);
  background: #FFFFFF;
}
.wl-verify-input::placeholder { color: #9AA3CC; font-weight: 400; }
.wl-verify-btn {
  height: 44px; padding: 0 22px; border-radius: 10px;
  border: none; background: #1C2340; color: #FFFFFF;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  transition: background .18s;
  white-space: nowrap;
}
.wl-verify-btn:hover { background: #2E3A9E; }

/* ── Section heading ─────────────────────────────────────────────────── */
.wl-sec-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  justify-content: center; margin-bottom: 10px;
}
.wl-sec-eyebrow::before, .wl-sec-eyebrow::after {
  content: ''; flex: 0 0 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.wl-sec-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(22px, 3vw, 30px); font-weight: 800;
  letter-spacing: -.025em; color: #1C2340;
  text-align: center; line-height: 1; margin-bottom: 8px;
}
.wl-sec-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; text-align: center; margin-bottom: 36px;
}

/* ── Feature cards ───────────────────────────────────────────────────── */
.wl-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 900px) { .wl-features-grid { grid-template-columns: 1fr; } }

.wl-feature {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px; padding: 32px 28px;
  transition: box-shadow .2s, border-color .2s;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.wl-feature:hover {
  border-color: rgba(79,91,203,.2);
  box-shadow: 0 6px 24px rgba(28,35,64,.09);
}
.wl-feature-icon {
  width: 48px; height: 48px; border-radius: 13px;
  background: rgba(79,91,203,.08);
  border: 1px solid rgba(79,91,203,.14);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB; margin-bottom: 20px;
}
.wl-feature-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px; font-weight: 800;
  letter-spacing: -.015em; color: #1C2340; margin-bottom: 10px;
}
.wl-feature-desc {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC; line-height: 1.9;
}

/* ── Network + Advisories row ────────────────────────────────────────── */
.wl-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
}
@media (max-width: 900px) { .wl-bottom-grid { grid-template-columns: 1fr; } }

/* Network card */
.wl-network {
  background: #1C2340;
  border-radius: 16px; padding: 32px 28px;
  display: flex; flex-direction: column;
  box-shadow: 0 4px 20px rgba(28,35,64,.2);
}
.wl-network-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px; font-weight: 800;
  letter-spacing: -.02em; color: #FFFFFF; margin-bottom: 5px;
}
.wl-network-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #3A4570; margin-bottom: 32px;
}
.wl-stat-row {
  display: flex; align-items: flex-end; justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.06);
  padding-bottom: 16px; margin-bottom: 16px;
}
.wl-stat-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.wl-stat-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #5A6488;
}
.wl-stat-value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 26px; font-weight: 800;
  letter-spacing: -.025em; color: #FFFFFF; line-height: 1;
}

/* Advisories card */
.wl-advisories {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px; padding: 32px 28px;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.wl-adv-header {
  display: flex; align-items: center; gap: 14px;
  padding-bottom: 20px; margin-bottom: 20px;
  border-bottom: 1px solid rgba(28,35,64,.06);
}
.wl-adv-header-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  background: rgba(239,68,68,.07);
  border: 1px solid rgba(239,68,68,.15);
  display: flex; align-items: center; justify-content: center;
  color: #EF4444;
}
.wl-adv-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340; margin-bottom: 3px;
}
.wl-adv-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC;
}
.wl-adv-list { display: flex; flex-direction: column; gap: 12px; }
.wl-adv-item {
  display: flex; gap: 16px;
}
.wl-adv-date-col { display: flex; flex-direction: column; align-items: center; padding-top: 2px; min-width: 48px; }
.wl-adv-date {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #4F5BCB; margin-bottom: 6px;
}
.wl-adv-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(79,91,203,.25);
}
.wl-adv-body {
  background: #FAFAFA;
  border: 1px solid rgba(28,35,64,.06);
  border-radius: 10px; padding: 14px 16px;
  flex: 1;
  transition: background .18s, border-color .18s;
}
.wl-adv-item:hover .wl-adv-body {
  background: #FFFFFF;
  border-color: rgba(79,91,203,.15);
}
.wl-adv-item:hover .wl-adv-dot { background: #4F5BCB; }
.wl-adv-item-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600;
  color: #1C2340; letter-spacing: -.01em;
  margin-bottom: 5px; line-height: 1;
}
.wl-adv-item-desc {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: .09em; text-transform: uppercase;
  color: #8A96BC; line-height: 1.8;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.wl-footer {
  background: #FFFFFF;
  border-top: 1px solid rgba(28,35,64,.07);
  margin-top: auto;
}
.wl-footer-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 24px 0; flex-wrap: wrap;
}
.wl-footer-copy {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #9AA3CC;
}
.wl-footer-links { display: flex; align-items: center; gap: 20px; }
.wl-footer-link {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #9AA3CC; text-decoration: none;
  transition: color .18s;
}
.wl-footer-link:hover { color: #1C2340; }
.wl-footer-sep { color: rgba(28,35,64,.15); font-size: 12px; }
`;

export default function Welcome() {
    const [plateQuery, setPlateQuery] = useState('');

    return (
        <div className="wl-root">
            <Head title="TRIVORA | Nasugbu LGU" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── Dark hero backdrop with Photo ── */}
            <div className="wl-hero-backdrop" />

            {/* ══════ HEADER ══════════════════════════════════════════ */}
            <header className="wl-wrap">
                <div className="wl-header">
                    <Link href="/" className="wl-logo">
                        <div>
                            <div className="wl-logo-img-wrap">
                                <img src="/images/logo.png" alt="TRIVORA" className="wl-logo-img" />
                            </div>
                        </div>
                        <div>
                            <p className="wl-logo-name">TMO Portal</p>
                            <p className="wl-logo-sub">Municipality of Nasugbu</p>
                        </div>
                    </Link>
                    <Link href="/login" className="wl-header-link">
                        Admin Portal <ArrowRight size={13} strokeWidth={2.5} />
                    </Link>
                </div>
            </header>

            {/* ══════ HERO ═══════════════════════════════════════════ */}
            <div className="wl-wrap">
                <div className="wl-hero">
                    <div className="wl-status-pill">
                        <span className="wl-status-dot" />
                        <span className="wl-status-text">System Online &amp; Active</span>
                    </div>
                    <h1 className="wl-hero-title">
                        Smart Tricycle<br />Management System
                    </h1>
                    <p className="wl-hero-sub">
                        Official LGU portal for MTOP applications,<br />
                        franchise renewal, and IoT-enabled fleet monitoring.
                    </p>
                </div>
            </div>

            {/* ══════ MAIN CONTENT ════════════════════════════════════ */}
            <main style={{ position: 'relative', zIndex: 10, flex: 1 }}>
                <div className="wl-wrap">

                    {/* ── Entry cards ── */}
                    <div className="wl-cards-row">
                        <div className="wl-card">
                            <div className="wl-card-icon">
                                <FileText size={26} strokeWidth={1.8} />
                            </div>
                            <p className="wl-card-title">Apply for MTOP</p>
                            <p className="wl-card-desc">
                                Register a new tricycle unit or renew your existing
                                franchise. Upload documents directly from your phone.
                            </p>
                            <Link href="/register-mtop" className="wl-btn-primary">
                                Register <ArrowRight size={14} strokeWidth={2.5} />
                            </Link>
                        </div>

                        <div className="wl-card">
                            <div className="wl-card-icon">
                                <LogIn size={26} strokeWidth={1.8} />
                            </div>
                            <p className="wl-card-title">Operator Portal</p>
                            <p className="wl-card-desc">
                                Already approved? Log in to view your digital franchise,
                                check violation records, and receive system alerts.
                            </p>
                            <Link href={route('login')} className="wl-btn-outline">
                              Login
                          </Link>
                        </div>
                    </div>

                    {/* ── Public Verification ── */}
                    <div className="wl-section">
                        <div className="wl-verify">
                            <div className="wl-verify-left">
                                <div className="wl-verify-icon">
                                    <Search size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p className="wl-verify-title">Public Verification</p>
                                    <p className="wl-verify-sub">Verify a tricycle's franchise status</p>
                                </div>
                            </div>
                            <div className="wl-verify-right">
                                <input
                                    type="text"
                                    className="wl-verify-input"
                                    placeholder="Enter Plate or Body No."
                                    value={plateQuery}
                                    onChange={e => setPlateQuery(e.target.value)}
                                />
                                <button className="wl-verify-btn">Check</button>
                            </div>
                        </div>
                    </div>

                    {/* ── Features ── */}
                    <div className="wl-section">
                        <p className="wl-sec-eyebrow">Technology</p>
                        <h2 className="wl-sec-title">Powered by Modern Technology</h2>
                        <p className="wl-sec-sub">Integrating IoT and Web Systems for a Safer Nasugbu</p>

                        <div className="wl-features-grid">
                            <FeatureCard
                                icon={Cpu}
                                title="Automated Violation Detection"
                                desc="Real-time IoT monitoring tracks coding schemes and out-of-line infractions without manual intervention."
                            />
                            <FeatureCard
                                icon={QrCode}
                                title="Digital Franchise & QR Codes"
                                desc="Secure, tamper-proof digital franchises and integrated QR codes issued instantly upon BPLO approval."
                            />
                            <FeatureCard
                                icon={Zap}
                                title="100% Cashless Pipeline"
                                desc="Secure digital payments via GCash, Maya, and Bank Transfer sent directly to the Municipal Treasurer."
                            />
                        </div>
                    </div>

                    {/* ── Network stats + Advisories ── */}
                    <div className="wl-section">
                        <div className="wl-bottom-grid">
                            <div className="wl-network">
                                <p className="wl-network-title">Live Network</p>
                                <p className="wl-network-sub">System Telemetry</p>
                                <StatRow label="Active Franchises"  value="1,492" />
                                <StatRow label="Monitored TODAs"    value="4"     />
                                <StatRow label="Daily Transactions" value="84"    />
                            </div>

                            <div className="wl-advisories">
                                <div className="wl-adv-header">
                                    <div className="wl-adv-header-icon">
                                        <Megaphone size={18} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="wl-adv-title">LGU Advisories</p>
                                        <p className="wl-adv-sub">TMO &amp; BPLO Announcements</p>
                                    </div>
                                </div>
                                <div className="wl-adv-list">
                                    <AdvisoryItem
                                        date="Mar 30"
                                        title="Strict Implementation of Coding Scheme"
                                        desc="All units must follow the updated plate-ending coding schedule. Violators will be automatically flagged by the TRIVORA system."
                                    />
                                    <AdvisoryItem
                                        date="Mar 25"
                                        title="Online MTOP Renewal Now Open"
                                        desc="Avoid the lines at the Municipal Hall. Renew your franchise completely online through this portal."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            {/* ══════ FOOTER ══════════════════════════════════════════ */}
            <footer className="wl-footer">
                <div className="wl-wrap">
                    <div className="wl-footer-inner">
                        <p className="wl-footer-copy">
                            &copy; 2026 TRIVORA Fleet Operations &bull; Nasugbu Batangas
                        </p>
                        <div className="wl-footer-links">
                            <Link href="#" className="wl-footer-link">
                                <Phone size={11} strokeWidth={2} /> TMO Hotline
                            </Link>
                            <span className="wl-footer-sep">&bull;</span>
                            <Link href="#" className="wl-footer-link">
                                Privacy Policy
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function FeatureCard({ icon: Icon, title, desc }) {
    return (
        <div className="wl-feature">
            <div className="wl-feature-icon">
                <Icon size={20} strokeWidth={2} />
            </div>
            <p className="wl-feature-title">{title}</p>
            <p className="wl-feature-desc">{desc}</p>
        </div>
    );
}

function StatRow({ label, value }) {
    return (
        <div className="wl-stat-row">
            <span className="wl-stat-label">{label}</span>
            <span className="wl-stat-value">{value}</span>
        </div>
    );
}

function AdvisoryItem({ date, title, desc }) {
    return (
        <div className="wl-adv-item">
            <div className="wl-adv-date-col">
                <span className="wl-adv-date">{date}</span>
                <span className="wl-adv-dot" />
            </div>
            <div className="wl-adv-body">
                <p className="wl-adv-item-title">{title}</p>
                <p className="wl-adv-item-desc">{desc}</p>
            </div>
        </div>
    );
}