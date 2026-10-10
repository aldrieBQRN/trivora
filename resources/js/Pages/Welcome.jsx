import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import {
  FileText, LogIn, ShieldCheck,
  Search, Cpu, Satellite,
  Phone, Wallet,
  ClipboardCheck, Award, ArrowRight, Calendar, Menu, X,
  HelpCircle, ChevronDown, ChevronUp, MapPin, Mail, Clock,
  Send, MessageSquare, ExternalLink, Building2, CheckCircle2, Users
} from 'lucide-react';

const FADE = 'wl-fade';
const delay = (ms) => ({ animationDelay: `${ms}ms` });

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Public Welcome / Landing Page
   Brand Primary: #25449B (Royal Nasugbu Blue)
   Senior UI/UX Designer Redesign
   Integrated Sections: Hero Split, Verify, About, How It Works, Features, FAQ, Contact
   Path: resources/js/Pages/Welcome.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=DM+Sans:wght@500;600;700;800&display=swap');

html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

/* ── Base ────────────────────────────────────────────────────────────── */
.wl-root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #F8FAFC;
  color: #1E293B;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.wl-root *, .wl-root *::before, .wl-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.wl-sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

.wl-root a:focus-visible,
.wl-root button:focus-visible,
.wl-root input:focus-visible,
.wl-root textarea:focus-visible,
.wl-root select:focus-visible {
  outline: 2px solid #25449B;
  outline-offset: 2px;
  border-radius: 8px;
}

/* ── Sticky Navbar (Crisp White Background) ─────────────────────────── */
.wl-navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  transition: box-shadow .2s ease, border-color .2s ease;
}
.wl-navbar--scrolled {
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.08);
  border-bottom-color: #CBD5E1;
}
.wl-header {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.wl-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
  gap: 12px;
}
.wl-logo-img-wrap {
  height: 44px;
  width: auto;
  border-radius: 10px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  flex-shrink: 0;
  transition: transform .2s, box-shadow .2s;
}
.wl-logo:hover .wl-logo-img-wrap {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.wl-logo-img { height: 30px; width: auto; object-fit: contain; display: block; }

.wl-nav { display: flex; align-items: center; gap: 26px; }
@media (max-width: 960px) { .wl-nav { display: none; } }

.wl-nav-link {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: #334155;
  text-decoration: none;
  position: relative;
  padding: 6px 0;
  cursor: pointer;
}
.wl-nav-link:hover, .wl-nav-link.active { color: #25449B; }
.wl-nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #25449B;
  border-radius: 2px;
  transition: width .2s ease;
}
.wl-nav-link:hover::after, .wl-nav-link.active::after { width: 100%; }

.wl-header-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.wl-nav-login {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1.5px solid #25449B;
  background: transparent;
  color: #25449B;
  text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .02em;
  transition: background .18s, color .18s, transform .15s;
}
.wl-nav-login:hover {
  background: #EFF4FF;
  color: #1A347D;
  transform: translateY(-1px);
}

.wl-nav-apply {
  display: none;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  background: #25449B;
  color: #FFFFFF;
  text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .02em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background .18s, transform .15s, box-shadow .15s;
}
@media (min-width: 561px) { .wl-nav-apply { display: inline-flex; } }
.wl-nav-apply:hover {
  background: #1B3377;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
}

/* In-page scroll target margin */
#about, #verify, #how-it-works, #features, #faq, #contact { scroll-margin-top: 96px; }

/* ── Mobile Drawer ───────────────────────────────────────────────────── */
.wl-menu-btn {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #E2E8F0;
  background: #F8FAFC;
  color: #25449B;
  cursor: pointer;
  transition: border-color .18s, background .18s;
}
.wl-menu-btn:hover { border-color: #25449B; background: #EFF4FF; }
@media (max-width: 960px) { .wl-menu-btn { display: inline-flex; } }

.wl-drawer-overlay {
  position: fixed; inset: 0; z-index: 90;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  opacity: 0; visibility: hidden;
  transition: opacity .25s ease, visibility .25s ease;
}
.wl-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 100;
  width: min(320px, 86vw);
  display: flex; flex-direction: column;
  background: #FFFFFF;
  border-left: 1px solid #E2E8F0;
  box-shadow: -16px 0 36px rgba(15, 23, 42, 0.15);
  transform: translateX(100%); visibility: hidden;
  transition: transform .28s cubic-bezier(.4,0,.2,1), visibility .28s;
}
.wl-drawer.is-open { transform: translateX(0); visibility: visible; }
.wl-drawer-overlay.is-open { opacity: 1; visibility: visible; }
@media (min-width: 961px) { .wl-drawer, .wl-drawer-overlay { display: none; } }

.wl-drawer-head {
  height: 76px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #E2E8F0;
}
.wl-drawer-head .wl-menu-btn { display: inline-flex; }
.wl-drawer nav { display: flex; flex-direction: column; padding: 16px 20px; flex: 1; overflow-y: auto; }
.wl-drawer-label {
  padding: 8px 4px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #64748B;
}
.wl-mobile-link {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 4px;
  border-bottom: 1px solid #F1F5F9;
  color: #1E293B; text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600;
  transition: color .15s;
  cursor: pointer;
}
.wl-mobile-link:hover, .wl-mobile-link.active { color: #25449B; font-weight: 700; }
.wl-drawer-foot {
  flex-shrink: 0; padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
  border-top: 1px solid #E2E8F0;
  background: #F8FAFC;
}
.wl-mobile-apply, .wl-mobile-login {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  height: 48px; border-radius: 11px; text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700;
}
.wl-mobile-apply {
  background: #25449B; color: #FFFFFF;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.wl-mobile-login {
  border: 1.5px solid #25449B; color: #25449B; background: #FFFFFF;
}

/* ── Constraint wrapper ──────────────────────────────────────────────── */
.wl-wrap { max-width: 1240px; margin: 0 auto; padding: 0 32px; width: 100%; }
@media (max-width: 640px) { .wl-wrap { padding: 0 20px; } }

/* ── Entrance animation ─────────────────────────────────────────────── */
@keyframes wlFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
.wl-fade { animation: wlFadeUp .65s cubic-bezier(.16,1,.3,1) both; }
@media (prefers-reduced-motion: reduce) { .wl-fade { animation: none; } }

/* ════════════════════════════════════════════════════════════════════════
   HERO SECTION — 50/50 SPLIT LAYOUT WITH SEAMLESS CENTER BLEND
   Left: Text on pure white background, balanced centered spacing
   Right: Nasugbu LGU photo with multi-stop seamless gradient fade
════════════════════════════════════════════════════════════════════════ */
.wl-hero-section {
  position: relative;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  overflow: hidden;
}

.wl-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: calc(100vh - 76px);
  min-height: calc(100svh - 76px);
  position: relative;
}

/* Left Hero Column: Pure White Background, Balanced Placement */
.wl-hero-left {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 48px 64px 48px;
  background: #FFFFFF;
  position: relative;
  z-index: 10;
}
.wl-hero-left-inner {
  max-width: 560px;
  width: 100%;
}

.wl-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 9999px;
  background: #EFF4FF;
  border: 1px solid #D6E4FF;
  color: #25449B;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .02em;
  margin-bottom: 24px;
}

.wl-hero-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(38px, 4.2vw, 56px);
  font-weight: 800;
  letter-spacing: -.03em;
  color: #0F172A;
  line-height: 1.1;
  margin-bottom: 22px;
}
.wl-hero-title-accent {
  color: #25449B;
  display: inline-block;
  background: linear-gradient(135deg, #25449B 0%, #1A3680 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.wl-hero-tagline {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(14px, 1.2vw, 16px);
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #25449B;
  margin-top: 2px;
  margin-bottom: 20px;
}
.wl-hero-tagline-word {
  display: inline-block;
  position: relative;
}
.wl-hero-tagline-sep {
  color: #94A3B8;
  font-weight: 400;
  user-select: none;
}

.wl-hero-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(15px, 1.3vw, 17px);
  font-weight: 400;
  color: #334155;
  line-height: 1.7;
  margin-bottom: 34px;
}

.wl-hero-cta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 38px;
}

/* Primary Button: Solid #25449B, Clean Shadow, No Glow */
.wl-hero-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 52px;
  padding: 0 28px;
  border-radius: 12px;
  border: none;
  background: #25449B;
  color: #FFFFFF;
  text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: .02em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.wl-hero-btn-primary:hover {
  background: #1B3377;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08);
}

/* Secondary Button: Clean Crisp Border, Standard Shadow */
.wl-hero-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 52px;
  padding: 0 26px;
  border-radius: 12px;
  border: 1.5px solid #CBD5E1;
  background: #FFFFFF;
  color: #1E293B;
  text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: .02em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: transform .18s ease, border-color .18s ease, color .18s ease, background .18s ease, box-shadow .18s ease;
}
.wl-hero-btn-outline:hover {
  border-color: #25449B;
  color: #25449B;
  background: #EFF4FF;
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
}

/* Quick feature trust pills under hero */
.wl-hero-features {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
  padding-top: 24px;
  border-top: 1px solid #F1F5F9;
}
.wl-hero-feat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
}
.wl-feat-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #EFF4FF;
  color: #25449B;
  font-weight: 800;
  font-size: 11px;
}

/* Right Hero Column: Photo + Seamless Center Blend */
.wl-hero-right {
  position: relative;
  overflow: hidden;
  min-height: 480px;
  background: #FFFFFF;
}

.wl-hero-image-bg {
  position: absolute;
  inset: 0;
  background-image: url('/images/nasugbu-bg.jpg');
  background-size: cover;
  background-position: center 35%;
  background-repeat: no-repeat;
  transition: transform .8s ease;
}

/* The magic center blend gradient — feathers smoothly into pure white on the left split */
.wl-hero-blend-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    #FFFFFF 0%,
    rgba(255, 255, 255, 0.96) 8%,
    rgba(255, 255, 255, 0.8) 20%,
    rgba(255, 255, 255, 0.45) 40%,
    rgba(255, 255, 255, 0.1) 68%,
    rgba(255, 255, 255, 0) 88%
  );
  pointer-events: none;
}

/* Subtle vertical vignettes for photo richness */
.wl-hero-right::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 15%,
    transparent 85%,
    rgba(255, 255, 255, 0.4) 100%
  );
  pointer-events: none;
}

@media (max-width: 1040px) {
  .wl-hero-grid {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .wl-hero-left {
    justify-content: center;
    padding: 52px 24px 44px;
  }
  .wl-hero-left-inner {
    max-width: 620px;
    text-align: center;
  }
  .wl-hero-cta {
    justify-content: center;
  }
  .wl-hero-features {
    justify-content: center;
  }
  .wl-hero-right {
    height: 420px;
    min-height: 420px;
  }
  .wl-hero-blend-gradient {
    background: linear-gradient(
      to bottom,
      #FFFFFF 0%,
      rgba(255, 255, 255, 0.95) 12%,
      rgba(255, 255, 255, 0.4) 40%,
      rgba(255, 255, 255, 0) 80%
    );
  }
}

@media (max-width: 640px) {
  .wl-hero-left { padding: 40px 20px 36px; }
  .wl-hero-cta { flex-direction: column; width: 100%; }
  .wl-hero-btn-primary, .wl-hero-btn-outline { width: 100%; justify-content: center; }
  .wl-hero-features { flex-direction: column; align-items: center; gap: 12px; }
  .wl-hero-right { height: 320px; min-height: 320px; }
}

/* ── Section Bands & Headings ─────────────────────────────────────────── */
.wl-band { position: relative; z-index: 10; padding: 84px 0; }
.wl-band-white { background: #FFFFFF; }
.wl-band-slate { background: #F8FAFC; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; }

@media (max-width: 640px) { .wl-band { padding: 60px 0; } }

.wl-sec-eyebrow {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #25449B;
  background: #EFF4FF;
  border: 1px solid #D6E4FF;
  padding: 5px 14px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}
.wl-sec-head { text-align: center; margin-bottom: 48px; }
.wl-sec-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(26px, 3.2vw, 36px);
  font-weight: 800;
  letter-spacing: -.025em;
  color: #0F172A;
  line-height: 1.2;
  margin-bottom: 12px;
}
.wl-sec-sub {
  font-family: 'Inter', sans-serif;
  font-size: 15.5px;
  font-weight: 400;
  color: #475569;
  line-height: 1.6;
  max-width: 640px;
  margin: 0 auto;
}

/* ── Verification Card (Deep Shadow Effect) ───────────────────────────── */
.wl-verify-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 36px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.wl-verify-card:hover {
  transform: translateY(-2px);
  border-color: #CBD5E1;
  box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.12), 0 10px 15px -5px rgba(0, 0, 0, 0.06);
}
.wl-verify-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}
.wl-verify-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #EFF4FF;
  border: 1px solid #D6E4FF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #25449B;
  flex-shrink: 0;
}
.wl-verify-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -.02em;
  color: #0F172A;
  margin-bottom: 4px;
}
.wl-verify-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #475569;
}
.wl-verify-form {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.wl-verify-input {
  height: 48px;
  width: 260px;
  border-radius: 11px;
  border: 1.5px solid #CBD5E1;
  background: #F8FAFC;
  padding: 0 18px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #0F172A;
  outline: none;
  transition: border-color .18s, box-shadow .18s, background .18s;
}
.wl-verify-input:focus {
  border-color: #25449B;
  box-shadow: 0 0 0 3px rgba(37, 68, 155, 0.12);
  background: #FFFFFF;
}
.wl-verify-input::placeholder { color: #94A3B8; }

.wl-verify-btn {
  height: 48px;
  padding: 0 24px;
  border-radius: 11px;
  border: none;
  background: #25449B;
  color: #FFFFFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background .18s, transform .15s, box-shadow .15s;
}
.wl-verify-btn:hover {
  background: #1B3377;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 860px) {
  .wl-verify-card { flex-direction: column; align-items: stretch; padding: 28px; gap: 24px; }
  .wl-verify-form { flex-direction: column; width: 100%; gap: 12px; }
  .wl-verify-input { width: 100%; }
  .wl-verify-btn { width: 100%; }
}

/* ── Section: About TRIVORA (Comprehensive Single Section) ────────── */
.wl-about-hero-box {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 34px 34px;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.04);
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 36px;
  align-items: center;
  margin-bottom: 28px;
}
@media (max-width: 900px) {
  .wl-about-hero-box { grid-template-columns: 1fr; padding: 24px 20px; gap: 24px; }
}
.wl-about-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.wl-about-stat-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  padding: 18px 16px;
  text-align: center;
  transition: transform .2s, border-color .2s, box-shadow .2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}
.wl-about-stat-card:hover {
  transform: translateY(-2px);
  border-color: #25449B;
  box-shadow: 0 6px 16px rgba(37, 68, 155, 0.08);
}
.wl-about-stat-num {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #25449B;
  line-height: 1.2;
}
.wl-about-stat-lbl {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  color: #475569;
  font-weight: 600;
  margin-top: 5px;
}

.wl-about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}
@media (max-width: 900px) {
  .wl-about-grid { grid-template-columns: 1fr; gap: 20px; }
}

.wl-about-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 18px;
  padding: 28px 26px;
  display: flex;
  gap: 20px;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.04);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.wl-about-card:hover {
  transform: translateY(-3px);
  border-color: #25449B;
  box-shadow: 0 16px 28px -6px rgba(37, 68, 155, 0.1);
}
.wl-about-card-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: #EFF4FF;
  border: 1px solid #D6E4FF;
  color: #25449B;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wl-about-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16.5px;
  font-weight: 800;
  color: #0F172A;
  margin-bottom: 6px;
}
.wl-about-card-desc {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.6;
}

/* ── How It Works Steps (Refined Card Shadow) ─────────────────────────── */
.wl-steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  position: relative;
}
@media (max-width: 992px) { .wl-steps-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .wl-steps-grid { grid-template-columns: 1fr; } }

.wl-step-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 18px;
  padding: 32px 24px;
  position: relative;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.04);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
  display: flex;
  flex-direction: column;
}
.wl-step-card:hover {
  transform: translateY(-4px);
  border-color: #25449B;
  box-shadow: 0 16px 28px -6px rgba(0, 0, 0, 0.12), 0 8px 12px -4px rgba(0, 0, 0, 0.06);
}
.wl-step-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.wl-step-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #EFF4FF;
  border: 1px solid #D6E4FF;
  color: #25449B;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wl-step-num {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #25449B;
  background: #EFF4FF;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wl-step-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #0F172A;
  margin-bottom: 8px;
}
.wl-step-desc {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  font-weight: 400;
  color: #475569;
  line-height: 1.6;
}

/* ── Technology Bento Grid (Elevated Card Shadow) ─────────────────────── */
.wl-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.wl-bento-card--lg { grid-column: 1 / -1; }
@media (max-width: 960px) {
  .wl-bento { grid-template-columns: repeat(2, 1fr); }
  .wl-bento > .wl-bento-card:last-child:nth-child(even) { grid-column: 1 / -1; }
}
@media (max-width: 640px) { .wl-bento { grid-template-columns: 1fr; } }

.wl-bento-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.04);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.wl-bento-card:hover {
  transform: translateY(-3px);
  border-color: rgba(37, 68, 155, 0.35);
  box-shadow: 0 16px 28px -6px rgba(37, 68, 155, 0.12), 0 8px 12px -4px rgba(0, 0, 0, 0.06);
}
.wl-bento-card--lg {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}
.wl-bento-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #EFF4FF;
  border: 1px solid #D6E4FF;
  color: #25449B;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}
.wl-bento-card--lg .wl-bento-icon {
  width: 58px;
  height: 58px;
  margin-bottom: 0;
}
.wl-bento-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16.5px;
  font-weight: 800;
  letter-spacing: -.015em;
  color: #0F172A;
  margin-bottom: 8px;
}
.wl-bento-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #475569;
  line-height: 1.6;
}

/* ── FAQ Accordion ────────────────────────────────────────────────────── */
.wl-faq-list {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.wl-faq-item {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
  transition: border-color .2s, box-shadow .2s;
}
.wl-faq-item.is-open {
  border-color: #25449B;
  box-shadow: 0 8px 24px rgba(37, 68, 155, 0.08);
}
.wl-faq-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 26px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}
.wl-faq-question {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1.4;
}
.wl-faq-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #F1F5F9;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background .2s, color .2s;
}
.wl-faq-item.is-open .wl-faq-icon-btn {
  background: #EFF4FF;
  color: #25449B;
}
.wl-faq-answer {
  padding: 0 26px 24px;
  font-family: 'Inter', sans-serif;
  font-size: 14.5px;
  font-weight: 400;
  color: #475569;
  line-height: 1.68;
}

/* ── Contact Section ─────────────────────────────────────────────────── */
.wl-contact-grid {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 36px;
}
@media (max-width: 960px) {
  .wl-contact-grid { grid-template-columns: 1fr; }
}

.wl-contact-cards-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.wl-contact-info-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 18px;
  padding: 26px 24px;
  display: flex;
  align-items: flex-start;
  gap: 18px;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.04);
  transition: transform .2s, border-color .2s, box-shadow .2s;
}
.wl-contact-info-card:hover {
  transform: translateY(-2px);
  border-color: #25449B;
  box-shadow: 0 14px 28px -6px rgba(37, 68, 155, 0.1);
}
.wl-contact-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #EFF4FF;
  border: 1px solid #D6E4FF;
  color: #25449B;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wl-contact-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #0F172A;
  margin-bottom: 4px;
}
.wl-contact-card-desc {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  font-weight: 400;
  color: #475569;
  line-height: 1.55;
}

/* Contact Form Box */
.wl-contact-form-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
}
.wl-contact-form-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #0F172A;
  margin-bottom: 6px;
}
.wl-contact-form-sub {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #64748B;
  margin-bottom: 24px;
}
.wl-form-group { margin-bottom: 18px; }
.wl-form-label {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 6px;
}
.wl-form-input, .wl-form-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1.5px solid #CBD5E1;
  background: #F8FAFC;
  padding: 12px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #0F172A;
  outline: none;
  transition: border-color .18s, box-shadow .18s, background .18s;
}
.wl-form-input:focus, .wl-form-textarea:focus {
  border-color: #25449B;
  box-shadow: 0 0 0 3px rgba(37, 68, 155, 0.12);
  background: #FFFFFF;
}
.wl-form-input::placeholder, .wl-form-textarea::placeholder { color: #94A3B8; }
.wl-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 600px) {
  .wl-form-row { grid-template-columns: 1fr; }
}

.wl-form-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  width: 100%;
  border-radius: 11px;
  border: none;
  background: #25449B;
  color: #FFFFFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background .18s, transform .15s, box-shadow .15s;
}
.wl-form-submit-btn:hover {
  background: #1B3377;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* ── Closing CTA Band ──────────────────────────────────────────────────── */
.wl-cta-band {
  background: linear-gradient(135deg, #182F72 0%, #25449B 50%, #1A347D 100%);
  padding: 84px 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.wl-cta-band::before {
  content: '';
  position: absolute;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 400px;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.18), transparent 70%);
  pointer-events: none;
}
.wl-cta-inner {
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 0 auto;
}
.wl-cta-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 3.8vw, 42px);
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: -.025em;
  margin-bottom: 16px;
  line-height: 1.2;
}
.wl-cta-sub {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.65;
  margin-bottom: 34px;
}
.wl-cta-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}
.wl-cta-btn-main {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 52px;
  padding: 0 32px;
  border-radius: 12px;
  border: none;
  background: #FFFFFF;
  color: #25449B;
  text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: transform .18s, box-shadow .18s, background .18s;
}
.wl-cta-btn-main:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  background: #F8FAFC;
}
.wl-cta-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 52px;
  padding: 0 30px;
  border-radius: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #FFFFFF;
  text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  transition: border-color .18s, background .18s, transform .18s;
}
.wl-cta-btn-ghost:hover {
  border-color: #FFFFFF;
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}
@media (max-width: 640px) {
  .wl-cta-actions { flex-direction: column; }
  .wl-cta-btn-main, .wl-cta-btn-ghost { width: 100%; justify-content: center; }
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.wl-footer {
  background: #FFFFFF;
  border-top: 1px solid #E2E8F0;
  margin-top: auto;
}
.wl-footer-top {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 40px;
  padding: 56px 0 44px;
}
@media (max-width: 900px) {
  .wl-footer-top { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 560px) {
  .wl-footer-top { grid-template-columns: 1fr; gap: 32px; }
}

.wl-footer-brand-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #0F172A;
  margin-bottom: 8px;
}
.wl-footer-brand-desc {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  color: #64748B;
  line-height: 1.6;
  max-width: 320px;
}
.wl-footer-col-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #0F172A;
  margin-bottom: 16px;
}
.wl-footer-nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wl-footer-nav-link {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px;
  font-weight: 500;
  color: #475569;
  text-decoration: none;
  transition: color .15s;
}
.wl-footer-nav-link:hover { color: #25449B; }

.wl-footer-bottom {
  border-top: 1px solid #F1F5F9;
  padding: 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.wl-footer-copy {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #64748B;
}
.wl-footer-helpline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #25449B;
  text-decoration: none;
}
`;

const STEPS = [
  { icon: FileText, title: 'Submit Papers Online', desc: 'Fill in your details and upload your tricycle papers and clearances from your phone or computer—no need to line up early.' },
  { icon: ClipboardCheck, title: 'TMO Review & Inspection', desc: 'The Traffic Management Office reviews your papers and checks your tricycle’s road safety and roadworthiness.' },
  { icon: Wallet, title: 'Pay at Municipal Cashier', desc: 'After your tricycle passes inspection, proceed to pay your franchise fee at the Municipal Treasurer cashier window in the municipal hall.' },
  { icon: Award, title: 'Claim Sticker & Permit', desc: 'Receive your MTOP windshield sticker and franchise permit. You’re ready to drive with peace of mind.' },
];

const FAQS = [
  {
    q: 'What papers do I need to apply for or renew an MTOP franchise?',
    a: (
      <div>
        <p style={{ marginBottom: 10, fontWeight: 500 }}>
          Take a clear photo or upload scanned copies of each document when submitting your application online:
        </p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <li><strong>Photocopy of OR/CR</strong> (or Delivery Receipt if newly purchased / no OR/CR yet)</li>
          <li><strong>Driver’s License</strong> — back-to-back photocopy (Professional / Restriction 1/A1)</li>
          <li><strong>Barangay Clearance</strong> (Original)</li>
          <li><strong>Police Clearance or LGU Certification</strong></li>
          <li><strong>Health Certificate</strong> (Driver)</li>
          <li><strong>Cedula</strong> (Community Tax Certificate)</li>
          <li><strong>TODA / NAFTODA / ACTODAN Clearance</strong> (Original)</li>
          <li><strong>Driver's ID Issued by NAFTODA/ACTODAN</strong></li>
          <li><strong>List of Existing Tariff Fee</strong> (for sidecar display)</li>
          <li><strong>Xerox Prangkisa</strong> — required when renewing an existing franchise</li>
          <li><em>Operator's Authorization Letter &amp; ID</em> — if a representative is filing on behalf of the owner</li>
        </ul>
        <p style={{ fontSize: 13, color: '#64748B' }}>
          Tip: Ensure all documents are clear, flat, and legible before uploading.
        </p>
      </div>
    )
  },
  {
    q: 'How can passengers check if a tricycle has an active permit?',
    a: 'Simply type the tricycle plate number in the verification box on this page. It instantly checks municipal records and shows if the franchise is active, valid, and authorized to operate.'
  },
  {
    q: 'How does daily color-coding and route monitoring work?',
    a: 'The system helps operators and drivers keep track of their weekly color-coding schedules and authorized municipal routes, preventing accidental violations and helping traffic flow smoothly.'
  },
  {
    q: 'Where and how do I pay my franchise fees?',
    a: 'After your tricycle physical inspection is conducted and approved by TMO personnel, you will be instructed to pay the franchise fee in person at the Municipal Treasurer cashier at the Municipal Hall.'
  },
  {
    q: 'How long does the online application process take?',
    a: 'Most applications are completed in 2 to 3 working days once your tricycle’s physical inspection is done—saving you multiple trips and hours of waiting.'
  },
  {
    q: 'What should I do if my franchise has already expired?',
    a: 'Log into your operator account, go to Renewal, upload your updated OR/CR and clearances, and bring your unit to the TMO for a quick inspection. Renewing right away keeps you authorized to operate.'
  }
];

export default function Welcome() {
  const [plateQuery, setPlateQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [activeSection, setActiveSection] = useState('about');

  // Contact form local state
  const [contactForm, setContactForm] = useState({
    name: '',
    contact: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [sendingMsg, setSendingMsg] = useState(false);

  // Track active section on scroll (scroll-spy)
  useEffect(() => {
    const sections = ['about', 'verify', 'how-it-works', 'features', 'faq', 'contact'];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 130;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth in-page navigation handler
  const scrollToSection = (e, targetId) => {
    if (e && e.preventDefault) e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      const navOffset = 76;
      const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      try {
        window.history.pushState(null, '', `#${targetId}`);
      } catch {
        // ignore
      }
      setActiveSection(targetId);
      setMenuOpen(false);
    }
  };

  // Mobile sidebar keyboard & resize listeners
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    const onResize = () => { if (window.innerWidth > 960) setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  // Navbar elevation shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Public Verification Function — calls real API with SweetAlert2
  const handleVerify = async () => {
    if (!plateQuery.trim()) {
      Swal.fire({
        title: 'Plate Number Required',
        text: 'Please enter a Plate Number to check franchise status.',
        icon: 'warning',
        confirmButtonColor: '#25449B',
        customClass: { title: 'font-jakarta', popup: 'font-inter' }
      });
      return;
    }

    Swal.fire({
      title: 'Searching Records...',
      text: 'Looking up franchise record.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch(`/api/public/verify-plate?plate=${encodeURIComponent(plateQuery.trim())}`);
      const data = await res.json();

      if (!data.found && data.ambiguous) {
        Swal.fire({
          title: 'Ambiguous Plate Number',
          text: `More than one unit matches "${plateQuery.trim().toUpperCase()}". Please enter the complete plate number.`,
          icon: 'info',
          confirmButtonColor: '#25449B',
          customClass: { title: 'font-jakarta', popup: 'font-inter' }
        });
        return;
      }

      if (!data.found) {
        Swal.fire({
          title: 'Record Not Found',
          text: `No franchise record found for Plate No. "${plateQuery.trim().toUpperCase()}".`,
          icon: 'question',
          confirmButtonColor: '#25449B',
          customClass: { title: 'font-jakarta', popup: 'font-inter' }
        });
        return;
      }

      const appStatus = data.application_status || '';
      const isActive = data.status === 'Active';
      const isExpired = data.status === 'Expired';
      const isUnregistered = data.status === 'Unregistered';
      const isSuspended = data.status === 'Suspended';
      const isRevoked = data.status === 'Revoked';
      const hasIssue = isSuspended || isRevoked || /Rejected|Reinspection|Cancelled/i.test(appStatus);
      const inProcess = /In Process/i.test(appStatus);

      const isTrulyActive = isActive && !inProcess && !hasIssue;

      const statusColor = isTrulyActive ? '#059669'
        : isExpired ? '#D97706'
          : hasIssue ? '#DC2626'
            : inProcess ? '#25449B'
              : (isUnregistered && !appStatus) ? '#475569'
                : '#475569';

      const statusIcon = isTrulyActive ? 'success'
        : (isExpired || hasIssue) ? 'warning'
          : 'info';

      const statusLabel = isTrulyActive ? '✓ ACTIVE — Valid MTOP Franchise'
        : isRevoked ? '⊗ REVOKED — Franchise Revoked'
          : isSuspended ? '⊗ SUSPENDED — Not Authorized to Operate'
            : isExpired ? '⚠ EXPIRED — Renewal Required'
              : appStatus ? ((hasIssue ? '⊗ ' : '○ ') + appStatus)
                : isUnregistered ? '○ UNREGISTERED — No Permit Issued'
                  : '○ Pending';

      const statusTitle = isTrulyActive ? 'Valid Franchise Verified'
        : (isExpired || hasIssue) ? 'Franchise Issue Detected'
          : inProcess ? 'Application In Progress'
            : 'Franchise Record Found';

      const panelBg = isTrulyActive ? '#F0FDF4'
        : (isExpired || hasIssue) ? '#FEF2F2'
          : '#EFF4FF';

      const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

      Swal.fire({
        title: statusTitle,
        html: `
          <div style="text-align:left;padding:14px 14px;background:${panelBg};border-radius:12px;margin-top:10px;font-size:13.5px;line-height:1.8;border:1px solid rgba(0,0,0,0.06)">
            <b>Plate No:</b> ${esc(data.plate)}<br/>
            ${!inProcess && data.franchise_number ? `<b>Franchise Number:</b> ${esc(data.franchise_number)}<br/>` : ''}
            ${!inProcess && data.sticker_number ? `<b>Sticker Number:</b> ${esc(data.sticker_number)}<br/>` : ''}
            <b>Operator:</b> ${esc(data.operator)}<br/>
            <b>Unit:</b> ${esc(data.make_model)}<br/>
            ${data.expiry ? `<b>Franchise Expiry:</b> ${esc(data.expiry)}<br/>` : ''}
            ${appStatus ? `<b>Application Status:</b> ${esc(appStatus)}<br/>` : ''}
            <br/><span style="color:${statusColor};font-weight:800;font-size:13.5px">${statusLabel}</span>
          </div>
        `,
        icon: statusIcon,
        confirmButtonColor: isTrulyActive ? '#059669' : '#25449B',
        customClass: { title: 'font-jakarta', popup: 'font-inter' }
      });
    } catch {
      Swal.fire({
        title: 'Connection Error',
        text: 'Could not reach the verification server. Please try again.',
        icon: 'error',
        confirmButtonColor: '#25449B',
      });
    }
  };

  // Handle Contact Inquiry submit
  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.contact.trim() || !contactForm.message.trim()) {
      Swal.fire({
        title: 'Incomplete Fields',
        text: 'Please fill in your name, contact details, and message.',
        icon: 'warning',
        confirmButtonColor: '#25449B',
        customClass: { title: 'font-jakarta', popup: 'font-inter' }
      });
      return;
    }

    setSendingMsg(true);
    setTimeout(() => {
      setSendingMsg(false);
      Swal.fire({
        title: 'Message Sent!',
        text: 'Thank you for reaching out. Your inquiry has been submitted and will be reviewed shortly.',
        icon: 'success',
        confirmButtonColor: '#25449B',
        customClass: { title: 'font-jakarta', popup: 'font-inter' }
      });
      setContactForm({ name: '', contact: '', subject: 'General Inquiry', message: '' });
    }, 600);
  };

  return (
    <div className="wl-root">
      <Head title="TRIVORA | Smart Tricycle Management System — Nasugbu, Batangas" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ══════ STICKY NAVBAR (CRISP WHITE BACKGROUND) ══════════ */}
      <header className={`wl-navbar ${scrolled ? 'wl-navbar--scrolled' : ''}`}>
        <div className="wl-wrap">
          <div className="wl-header">
            <Link href="/" className="wl-logo">
              <div className="wl-logo-img-wrap">
                <img src="/images/logo.png" alt="TRIVORA" className="wl-logo-img" />
              </div>
            </Link>

            <nav className="wl-nav" aria-label="Primary Navigation">
              <a
                href="#about"
                onClick={(e) => scrollToSection(e, 'about')}
                className={`wl-nav-link ${activeSection === 'about' ? 'active' : ''}`}
              >
                About
              </a>
              <a
                href="#verify"
                onClick={(e) => scrollToSection(e, 'verify')}
                className={`wl-nav-link ${activeSection === 'verify' ? 'active' : ''}`}
              >
                Verify
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, 'how-it-works')}
                className={`wl-nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={(e) => scrollToSection(e, 'features')}
                className={`wl-nav-link ${activeSection === 'features' ? 'active' : ''}`}
              >
                Features
              </a>
              <a
                href="#faq"
                onClick={(e) => scrollToSection(e, 'faq')}
                className={`wl-nav-link ${activeSection === 'faq' ? 'active' : ''}`}
              >
                FAQ
              </a>
              <a
                href="#contact"
                onClick={(e) => scrollToSection(e, 'contact')}
                className={`wl-nav-link ${activeSection === 'contact' ? 'active' : ''}`}
              >
                Contact
              </a>
            </nav>

            <div className="wl-header-actions">
              <Link href={route('login')} className="wl-nav-login">
                <LogIn size={15} strokeWidth={2.4} /> Log In
              </Link>
              <Link href="/register-mtop" className="wl-nav-apply">
                Apply Now <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
              <button
                type="button"
                className="wl-menu-btn"
                aria-label="Open mobile menu"
                aria-expanded={menuOpen}
                aria-controls="wl-mobile-menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu size={20} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Drawer ──────────────────────────────────────── */}
      <div
        className={`wl-drawer-overlay ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="wl-mobile-menu"
        className={`wl-drawer ${menuOpen ? 'is-open' : ''}`}
        aria-label="Mobile Menu"
        aria-hidden={!menuOpen}
      >
        <div className="wl-drawer-head">
          <Link href="/" className="wl-logo" onClick={() => setMenuOpen(false)}>
            <div className="wl-logo-img-wrap">
              <img src="/images/logo.png" alt="TRIVORA" className="wl-logo-img" />
            </div>
          </Link>
          <button
            type="button"
            className="wl-menu-btn"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>
        <nav aria-label="Mobile Navigation">
          <span className="wl-drawer-label">Quick Navigation</span>
          {[
            ['about', 'About the System'],
            ['verify', 'Verify Permit'],
            ['how-it-works', 'How It Works'],
            ['features', 'Features'],
            ['faq', 'FAQ'],
            ['contact', 'Contact Us']
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={`wl-mobile-link ${activeSection === id ? 'active' : ''}`}
              tabIndex={menuOpen ? 0 : -1}
              onClick={(e) => scrollToSection(e, id)}
            >
              {label} <ArrowRight size={15} strokeWidth={2.2} />
            </a>
          ))}
        </nav>
        <div className="wl-drawer-foot">
          <Link
            href="/register-mtop"
            className="wl-mobile-apply"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
          >
            Apply for a Permit <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
          <Link
            href={route('login')}
            className="wl-mobile-login"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
          >
            <LogIn size={15} strokeWidth={2.2} /> Log In to Portal
          </Link>
        </div>
      </aside>

      {/* ══════ HERO SECTION (50/50 SPLIT WITH SEAMLESS CENTER BLEND) ══════ */}
      <section className="wl-hero-section">
        <div className="wl-hero-grid">

          {/* Left Column: Pure White Background + Content */}
          <div className="wl-hero-left">
            <div className="wl-hero-left-inner">
              <div className={`wl-hero-badge ${FADE}`} style={delay(0)}>
                <ShieldCheck size={14} strokeWidth={2.4} />
                <span>Nasugbu, Batangas</span>
              </div>

              <h1 className={`wl-hero-title ${FADE}`} style={delay(80)}>
                Smart Tricycle<br />
                <span className="wl-hero-title-accent">Management System</span>
              </h1>

              <div className={`wl-hero-tagline ${FADE}`} style={delay(120)} aria-label="Tagline: Track, Protect, Connect">
                <span className="wl-hero-tagline-word">Track.</span>
                <span className="wl-hero-tagline-word">Protect.</span>
                <span className="wl-hero-tagline-word">Connect.</span>
              </div>

              <p className={`wl-hero-sub ${FADE}`} style={delay(160)}>
                A modern tricycle management and franchise platform for Nasugbu, Batangas. Apply for or renew your MTOP permit online, check daily color-coding schedules, and verify authorized tricycles across town.
              </p>

              <div className={`wl-hero-cta ${FADE}`} style={delay(220)}>
                <Link href="/register-mtop" className="wl-hero-btn-primary">
                  Apply for a Permit <ArrowRight size={15} strokeWidth={2.4} />
                </Link>
                <a href="#verify" onClick={(e) => scrollToSection(e, 'verify')} className="wl-hero-btn-outline">
                  <Search size={15} strokeWidth={2.2} /> Verify a Plate
                </a>
              </div>

              <div className={`wl-hero-features ${FADE}`} style={delay(280)}>
                <div className="wl-hero-feat-item">
                  <span className="wl-feat-check">&#10003;</span>
                  <span>100% Online Filing</span>
                </div>
                <div className="wl-hero-feat-item">
                  <span className="wl-feat-check">&#10003;</span>
                  <span>Instant Franchise Lookup</span>
                </div>
                <div className="wl-hero-feat-item">
                  <span className="wl-feat-check">&#10003;</span>
                  <span>Daily Color-Coding Guide</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Background Image with Seamless Center White Blend */}
          <div className="wl-hero-right" aria-hidden="true">
            <div className="wl-hero-image-bg" />
            <div className="wl-hero-blend-gradient" />
          </div>

        </div>
      </section>

      {/* ══════ MAIN CONTENT ════════════════════════════════════ */}
      <main style={{ flex: 1 }}>

        {/* ── Band 1: About Section (Slate) ── */}
        <section className="wl-band wl-band-slate" id="about" aria-labelledby="about-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <Building2 size={12} strokeWidth={2.4} /> About TRIVORA
              </div>
              <h2 className="wl-sec-title" id="about-heading">Modernizing Tricycle Transport in Nasugbu</h2>
              <p className="wl-sec-sub">
                Connecting local tricycle operators, drivers, and commuters with simple, modern municipal transport services.
              </p>
            </div>

            {/* Municipal Mission & Impact Story */}
            <div className="wl-about-hero-box">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#EFF4FF', borderRadius: 999, color: '#25449B', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                  <Award size={13} strokeWidth={2.4} /> Nasugbu Transport Platform
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 12, lineHeight: 1.35 }}>
                  Making Tricycle Services Faster, Safer, and More Organized for Nasugbu
                </h3>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 14 }}>
                  Created for the people of Nasugbu, Batangas, TRIVORA brings the Traffic Management Office (TMO) and the Business Permits &amp; Licensing Office (BPLO) together into one convenient website for all Nasugbu tricycle operators.
                </p>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
                  No more lost paperwork or whole days spent waiting in line at the munisipyo. Operators can apply and renew from home, commuters can check standard fares and verify drivers, and our town keeps traffic moving smoothly.
                </p>
              </div>

              {/* Stats Highlights */}
              <div className="wl-about-stats-grid">
                <div className="wl-about-stat-card">
                  <div className="wl-about-stat-num">100%</div>
                  <div className="wl-about-stat-lbl">Online Filing</div>
                </div>
                <div className="wl-about-stat-card">
                  <div className="wl-about-stat-num">3,000+</div>
                  <div className="wl-about-stat-lbl">Registered Units</div>
                </div>
                <div className="wl-about-stat-card">
                  <div className="wl-about-stat-num">42</div>
                  <div className="wl-about-stat-lbl">Barangays Covered</div>
                </div>
                <div className="wl-about-stat-card">
                  <div className="wl-about-stat-num">24/7</div>
                  <div className="wl-about-stat-lbl">Plate Number Check</div>
                </div>
              </div>
            </div>

            {/* 4 Pillars Grid */}
            <div className="wl-about-grid">
              <div className="wl-about-card">
                <div className="wl-about-card-icon">
                  <FileText size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="wl-about-card-title">Online MTOP Franchise Filing</h3>
                  <p className="wl-about-card-desc">
                    Submit your requirements online without waiting in early morning lines. Track the review step-by-step and receive your approved permit faster.
                  </p>
                </div>
              </div>

              <div className="wl-about-card">
                <div className="wl-about-card-icon">
                  <Satellite size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="wl-about-card-title">Daily Color-Coding &amp; Route Guide</h3>
                  <p className="wl-about-card-desc">
                    Helps drivers easily check their allowed operating days and assigned routes, preventing honest mistakes and keeping traffic orderly.
                  </p>
                </div>
              </div>

              <div className="wl-about-card">
                <div className="wl-about-card-icon">
                  <ShieldCheck size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="wl-about-card-title">Passenger Safety &amp; Unit Lookup</h3>
                  <p className="wl-about-card-desc">
                    Passengers and commuters can easily type any tricycle's plate number on this portal to verify franchise validity, confirm authorized driver details, and ensure safe travel across Nasugbu.
                  </p>
                </div>
              </div>

              <div className="wl-about-card">
                <div className="wl-about-card-icon">
                  <Building2 size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="wl-about-card-title">Unified TMO &amp; BPLO Processing</h3>
                  <p className="wl-about-card-desc">
                    Connects the Traffic Management Office and the Business Permits Office so inspections, document reviews, and permit approvals happen smoothly without duplicate paperwork.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Band 2: Public Plate Verification (White) ── */}
        <section className="wl-band wl-band-white" id="verify" aria-labelledby="verify-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <Search size={12} strokeWidth={2.4} /> Quick Action
              </div>
              <h2 className="wl-sec-title" id="verify-heading">Verify a Franchise</h2>
              <p className="wl-sec-sub">Check if a tricycle has an active municipal permit before riding or when resolving an issue.</p>
            </div>

            <div className="wl-verify-card">
              <div className="wl-verify-left">
                <div className="wl-verify-icon-wrap" aria-hidden="true">
                  <Search size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="wl-verify-title">Public Plate &amp; Permit Check</h3>
                  <p className="wl-verify-desc">Enter any Nasugbu tricycle plate number to check its franchise status right away.</p>
                </div>
              </div>
              <form
                className="wl-verify-form"
                onSubmit={(e) => { e.preventDefault(); handleVerify(); }}
              >
                <label htmlFor="plate-verify-input" className="wl-sr-only">Plate number</label>
                <input
                  id="plate-verify-input"
                  name="plate"
                  type="text"
                  className="wl-verify-input"
                  placeholder="Enter Plate No. (e.g. 8812)"
                  value={plateQuery}
                  onChange={e => setPlateQuery(e.target.value)}
                />
                <button type="submit" className="wl-verify-btn">Check Status</button>
              </form>
            </div>
          </div>
        </section>

        {/* ── Band 3: How It Works (Slate) ── */}
        <section className="wl-band wl-band-slate" id="how-it-works" aria-labelledby="how-it-works-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <ClipboardCheck size={12} strokeWidth={2.4} /> 4-Step Process
              </div>
              <h2 className="wl-sec-title" id="how-it-works-heading">How It Works</h2>
              <p className="wl-sec-sub">From application to approved franchise sticker — a simple 4-step process designed for drivers and operators.</p>
            </div>

            <div className="wl-steps-grid">
              {STEPS.map((s, i) => (
                <div className="wl-step-card" key={s.title}>
                  <div className="wl-step-top">
                    <div className="wl-step-icon">
                      <s.icon size={24} strokeWidth={2} />
                    </div>
                    <span className="wl-step-num">{i + 1}</span>
                  </div>
                  <h3 className="wl-step-title">{s.title}</h3>
                  <p className="wl-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Band 4: Helpful Features Bento Grid (White) ── */}
        <section className="wl-band wl-band-white" id="features" aria-labelledby="features-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <Cpu size={12} strokeWidth={2.4} /> Helpful Features
              </div>
              <h2 className="wl-sec-title" id="features-heading">Built for Nasugbu's Roads</h2>
              <p className="wl-sec-sub">Practical, everyday tools designed to make tricycle operations safer and more convenient for our town.</p>
            </div>

            <div className="wl-bento">
              <FeatureCard
                large
                icon={Cpu}
                title="Smart Color-Coding Guide"
                desc="Helps drivers stay on top of their designated color-coding days and routes, preventing accidental violations and keeping our streets organized."
              />
              <FeatureCard
                icon={Satellite}
                title="Live Route Overview"
                desc="Provides the Traffic Management Office with a clear view of road activity to manage traffic buildup and ensure enough rides for all barangays."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Step-by-Step Status Tracker"
                desc="See exactly where your application is—from document check to payment and sticker pickup—right on your mobile screen."
              />
              <FeatureCard
                icon={Calendar}
                title="Friendly Renewal Reminders"
                desc="Receive helpful notifications well before your franchise expires, giving you plenty of time to renew without paying late fees."
              />
            </div>
          </div>
        </section>

        {/* ── Band 5: Frequently Asked Questions (Slate) ── */}
        <section className="wl-band wl-band-slate" id="faq" aria-labelledby="faq-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <HelpCircle size={12} strokeWidth={2.4} /> Got Questions?
              </div>
              <h2 className="wl-sec-title" id="faq-heading">Frequently Asked Questions</h2>
              <p className="wl-sec-sub">Quick answers to common questions about MTOP franchise applications, requirements, and rules in Nasugbu.</p>
            </div>

            <div className="wl-faq-list">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div className={`wl-faq-item ${isOpen ? 'is-open' : ''}`} key={faq.q}>
                    <button
                      type="button"
                      className="wl-faq-trigger"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      aria-expanded={isOpen}
                    >
                      <span className="wl-faq-question">{faq.q}</span>
                      <span className="wl-faq-icon-btn">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="wl-faq-answer">
                        {typeof faq.a === 'string' ? <p>{faq.a}</p> : faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Band 6: Contact Section (White) ── */}
        <section className="wl-band wl-band-white" id="contact" aria-labelledby="contact-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <Mail size={12} strokeWidth={2.4} /> Direct Assistance
              </div>
              <h2 className="wl-sec-title" id="contact-heading">Contact &amp; Inquiries</h2>
              <p className="wl-sec-sub">Need assistance with your MTOP application, inspection schedule, or tricycle guidelines? We are here to help.</p>
            </div>

            <div className="wl-contact-grid">
              {/* Left Column: Official Contact Info Cards */}
              <div className="wl-contact-cards-col">
                <div className="wl-contact-info-card">
                  <div className="wl-contact-card-icon">
                    <MapPin size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="wl-contact-card-title">Municipal Office</h3>
                    <p className="wl-contact-card-desc">
                      Traffic Management Office (TMO)<br />
                      Pamahalaang Bayan ng Nasugbu<br />
                      F. Alix Street, Nasugbu, Batangas 4231
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#25449B' }}>
                      <CheckCircle2 size={13} strokeWidth={2.4} /> Municipal Hall Helpdesk
                    </div>
                  </div>
                </div>

                <div className="wl-contact-info-card">
                  <div className="wl-contact-card-icon">
                    <Phone size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="wl-contact-card-title">Direct Hotlines</h3>
                    <p className="wl-contact-card-desc">
                      TMO Dispatch: <strong>(043) 740-8112</strong><br />
                      Mobile Helpline: <strong>+63 917 123 4567</strong><br />
                      Email: <strong>tmo@nasugbu.gov.ph</strong>
                    </p>
                  </div>
                </div>

                <div className="wl-contact-info-card">
                  <div className="wl-contact-card-icon">
                    <Clock size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="wl-contact-card-title">Public Service Hours</h3>
                    <p className="wl-contact-card-desc">
                      Monday to Friday: <strong>8:00 AM – 5:00 PM</strong><br />
                      Physical Tricycle Inspections: <strong>8:30 AM – 4:00 PM</strong><br />
                      Closed on Weekends and Official Holidays
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Inquiry / Assistance Form */}
              <div className="wl-contact-form-card">
                <h3 className="wl-contact-form-title">Send a Direct Inquiry</h3>
                <p className="wl-contact-form-sub">Have a specific question about your franchise or permit status? Send your inquiry here.</p>

                <form onSubmit={handleContactSubmit}>
                  <div className="wl-form-row">
                    <div className="wl-form-group">
                      <label className="wl-form-label" htmlFor="ct-name">Full Name</label>
                      <input
                        id="ct-name"
                        type="text"
                        className="wl-form-input"
                        placeholder="Juan dela Cruz"
                        value={contactForm.name}
                        onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="wl-form-group">
                      <label className="wl-form-label" htmlFor="ct-contact">Mobile / Email</label>
                      <input
                        id="ct-contact"
                        type="text"
                        className="wl-form-input"
                        placeholder="0917XXXXXXX or name@email.com"
                        value={contactForm.contact}
                        onChange={e => setContactForm({ ...contactForm, contact: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="wl-form-group">
                    <label className="wl-form-label" htmlFor="ct-subject">Inquiry Subject</label>
                    <select
                      id="ct-subject"
                      className="wl-form-input"
                      value={contactForm.subject}
                      onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                    >
                      <option value="General Inquiry">General MTOP Inquiry</option>
                      <option value="Application Follow-up">Application Status Follow-up</option>
                      <option value="Inspection Inquiry">Tricycle Physical Inspection</option>
                      <option value="Coding Violation">Coding / Violation Appeal</option>
                      <option value="Lost Item / Complaint">Commuter Feedback or Complaint</option>
                    </select>
                  </div>

                  <div className="wl-form-group">
                    <label className="wl-form-label" htmlFor="ct-msg">Your Message</label>
                    <textarea
                      id="ct-msg"
                      rows={4}
                      className="wl-form-textarea"
                      placeholder="Please provide details about your inquiry or plate number if applicable..."
                      value={contactForm.message}
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="wl-form-submit-btn" disabled={sendingMsg}>
                    <Send size={15} strokeWidth={2.2} />
                    {sendingMsg ? 'Sending message...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ── Band 7: Closing CTA (Royal #25449B Full Bleed) ── */}
        <section className="wl-cta-band">
          <div className="wl-wrap">
            <div className="wl-cta-inner">
              <h2 className="wl-cta-title">Ready to apply or renew your tricycle franchise?</h2>
              <p className="wl-cta-sub">
                Apply in minutes, track your approval status online, and avoid waiting in long lines at the municipal hall.
              </p>
              <div className="wl-cta-actions">
                <Link href="/register-mtop" className="wl-cta-btn-main">
                  Apply for a Permit <ArrowRight size={15} strokeWidth={2.4} />
                </Link>
                <Link href={route('login')} className="wl-cta-btn-ghost">
                  <LogIn size={15} strokeWidth={2.2} /> Operator Log In
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ══════ FOOTER (CRISP WHITE BACKGROUND) ══════════════════ */}
      <footer className="wl-footer">
        <div className="wl-wrap">
          <div className="wl-footer-top">
            <div>
              <div className="wl-logo-img-wrap" style={{ display: 'inline-flex', marginBottom: 14 }}>
                <img src="/images/logo.png" alt="TRIVORA" className="wl-logo-img" />
              </div>
              <p className="wl-footer-brand-title">Smart Tricycle Management System</p>
              <p className="wl-footer-brand-desc">
                Smart tricycle management and franchise platform serving operators, drivers, and commuters in Nasugbu, Batangas.
              </p>
            </div>

            <div>
              <p className="wl-footer-col-title">Navigation</p>
              <ul className="wl-footer-nav-list">
                <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="wl-footer-nav-link">About the System</a></li>
                <li><a href="#verify" onClick={(e) => scrollToSection(e, 'verify')} className="wl-footer-nav-link">Verify Franchise</a></li>
                <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="wl-footer-nav-link">How It Works</a></li>
                <li><a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="wl-footer-nav-link">Features</a></li>
                <li><a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="wl-footer-nav-link">FAQ</a></li>
                <li><a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} className="wl-footer-nav-link">Contact</a></li>
              </ul>
            </div>

            <div>
              <p className="wl-footer-col-title">Services</p>
              <ul className="wl-footer-nav-list">
                <li><a href="#verify" onClick={(e) => scrollToSection(e, 'verify')} className="wl-footer-nav-link">Verify Franchise</a></li>
                <li><Link href="/register-mtop" className="wl-footer-nav-link">Apply for Permit</Link></li>
                <li><Link href={route('login')} className="wl-footer-nav-link">Driver Portal</Link></li>
                <li><Link href={route('login')} className="wl-footer-nav-link">TMO Staff Access</Link></li>
                <li><a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} className="wl-footer-nav-link">Contact Helpdesk</a></li>
              </ul>
            </div>

            <div>
              <p className="wl-footer-col-title">Transport Helpdesk</p>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 8 }}>
                Pamahalaang Bayan ng Nasugbu<br />
                F. Alix St., Nasugbu, Batangas<br />
                Hotline: (043) 740-8112
              </p>
              <a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} style={{ fontSize: 13, fontWeight: 700, color: '#25449B', textDecoration: 'none' }}>
                Go to Contact Desk &darr;
              </a>
            </div>
          </div>

          <div className="wl-footer-bottom">
            <p className="wl-footer-copy">
              &copy; {new Date().getFullYear()} TRIVORA &bull; Nasugbu, Batangas. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="wl-footer-nav-link">About</a>
              <a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} className="wl-footer-nav-link">Contact</a>
              <a href="tel:0437408112" className="wl-footer-helpline">
                <Phone size={13} strokeWidth={2.4} /> Helpline: (043) 740-8112
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Bento Sub-Component ──────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, large }) {
  return (
    <div className={`wl-bento-card ${large ? 'wl-bento-card--lg' : ''}`}>
      <div className="wl-bento-icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2.2} />
      </div>
      <div>
        <h3 className="wl-bento-title">{title}</h3>
        <p className="wl-bento-desc">{desc}</p>
      </div>
    </div>
  );
}
