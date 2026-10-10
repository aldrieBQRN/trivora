import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import {
  FileText, LogIn, ShieldCheck,
  Search, Cpu, Satellite,
  Phone, Wallet,
  ClipboardCheck, Award, ArrowRight, Calendar, Menu, X
} from 'lucide-react';

const FADE = 'wl-fade';
const delay = (ms) => ({ animationDelay: `${ms}ms` });

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Public Welcome / Landing Page Redesign
   Brand Primary: #25449B (Royal Nasugbu Blue)
   Senior UI/UX Designer Redesign
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
.wl-root input:focus-visible {
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

.wl-nav { display: flex; align-items: center; gap: 32px; }
@media (max-width: 900px) { .wl-nav { display: none; } }

.wl-nav-link {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: #334155;
  text-decoration: none;
  position: relative;
  padding: 6px 0;
  transition: color .18s ease;
}
.wl-nav-link:hover { color: #25449B; }
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
.wl-nav-link:hover::after { width: 100%; }

.wl-header-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.wl-nav-login {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
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
  padding: 0 22px;
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
#verify, #how-it-works, #technology { scroll-margin-top: 96px; }

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
@media (max-width: 900px) { .wl-menu-btn { display: inline-flex; } }

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
@media (min-width: 901px) { .wl-drawer, .wl-drawer-overlay { display: none; } }

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
}
.wl-mobile-link:hover { color: #25449B; }
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
  max-width: 600px;
  margin: 0 auto;
}

/* ── Section 1: Verification Card (Deep Shadow Effect) ─────────────────── */
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

/* ── Section 2: How It Works Steps (Refined Card Shadow) ───────────────── */
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

/* ── Section 3: Technology Bento Grid (Elevated Card Shadow) ──────────── */
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
  box-shadow: 0 16px 28px -6px rgba(0, 0, 0, 0.12), 0 8px 12px -4px rgba(0, 0, 0, 0.06);
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

/* ── Section 4: Closing CTA Band ───────────────────────────────────────── */
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
.wl-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 0;
  flex-wrap: wrap;
}
.wl-footer-copy {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 2px;
}
.wl-footer-tagline {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: #64748B;
}
.wl-footer-links {
  display: flex;
  align-items: center;
  gap: 20px;
}
.wl-footer-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-decoration: none;
}
.wl-footer-item--highlight {
  color: #25449B;
  font-weight: 700;
}
.wl-footer-sep { color: #CBD5E1; }
`;

const STEPS = [
  { icon: FileText, title: 'Apply Online', desc: 'Submit your MTOP application, tricycle details, and required documents digitally without waiting in long queues.' },
  { icon: ClipboardCheck, title: 'TMO Verification', desc: 'The Traffic Management Office reviews your submitted requirements and conducts the physical tricycle inspection.' },
  { icon: Wallet, title: 'Settle Fees', desc: 'Pay official franchise fees at the Municipal Treasurer’s Office or through accredited channels using your Order of Payment.' },
  { icon: Award, title: 'Get Your Permit', desc: 'Receive your official MTOP sticker and digital franchise certificate, fully activated in the municipal database.' },
];

export default function Welcome() {
  const [plateQuery, setPlateQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile sidebar keyboard & resize listeners
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    const onResize = () => { if (window.innerWidth > 900) setMenuOpen(false); };
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
      text: 'Looking up official franchise record.',
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
          text: `No official franchise record found for Plate No. "${plateQuery.trim().toUpperCase()}".`,
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

  return (
    <div className="wl-root">
      <Head title="TRIVORA | Smart Tricycle Management System — Nasugbu LGU" />
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
              <a href="#verify" className="wl-nav-link">Verify Permit</a>
              <a href="#how-it-works" className="wl-nav-link">How It Works</a>
              <a href="#technology" className="wl-nav-link">Technology</a>
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
            ['#verify', 'Verify Permit'],
            ['#how-it-works', 'How It Works'],
            ['#technology', 'Technology']
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="wl-mobile-link"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
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

              <p className={`wl-hero-sub ${FADE}`} style={delay(160)}>
                The official portal of the Nasugbu Municipal Government for applying,
                renewing, and verifying tricycle franchises (MTOP)—backed by real-time GPS fleet monitoring
                and automated compliance tracking.
              </p>

              <div className={`wl-hero-cta ${FADE}`} style={delay(220)}>
                <Link href="/register-mtop" className="wl-hero-btn-primary">
                  Apply for a Permit <ArrowRight size={15} strokeWidth={2.4} />
                </Link>
                <a href="#verify" className="wl-hero-btn-outline">
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
                  <span>Live GPS Telemetry</span>
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

        {/* ── Band 1: Public Plate Verification (Light Slate) ── */}
        <section className="wl-band wl-band-slate" id="verify" aria-labelledby="verify-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <Search size={12} strokeWidth={2.4} /> Quick Action
              </div>
              <h2 className="wl-sec-title" id="verify-heading">Verify a Franchise</h2>
              <p className="wl-sec-sub">Check if a tricycle has an official municipal franchise before boarding or settling disputes.</p>
            </div>

            <div className="wl-verify-card">
              <div className="wl-verify-left">
                <div className="wl-verify-icon-wrap" aria-hidden="true">
                  <Search size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="wl-verify-title">Public Plate Verification</h3>
                  <p className="wl-verify-desc">Enter any registered tricycle plate number to inspect its MTOP validity instantly.</p>
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

        {/* ── Band 2: How It Works (White) ── */}
        <section className="wl-band wl-band-white" id="how-it-works" aria-labelledby="how-it-works-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <ClipboardCheck size={12} strokeWidth={2.4} /> 4-Step Process
              </div>
              <h2 className="wl-sec-title" id="how-it-works-heading">How It Works</h2>
              <p className="wl-sec-sub">From online application to franchise approval — a modern paperless system designed for operators.</p>
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

        {/* ── Band 3: Technology Bento Grid (Slate) ── */}
        <section className="wl-band wl-band-slate" id="technology" aria-labelledby="technology-heading">
          <div className="wl-wrap">
            <div className="wl-sec-head">
              <div className="wl-sec-eyebrow">
                <Cpu size={12} strokeWidth={2.4} /> Smart Mobility
              </div>
              <h2 className="wl-sec-title" id="technology-heading">Powered by Modern Technology</h2>
              <p className="wl-sec-sub">Combining smart telemetry, cloud records, and automated compliance for an organized Nasugbu transit fleet.</p>
            </div>

            <div className="wl-bento">
              <FeatureCard
                large
                icon={Cpu}
                title="Automated Violation Detection"
                desc="Smart GPS tracking automatically checks units against active municipal coding schedules and zone boundaries, maintaining transport discipline in real-time without constant manual checkpoints."
              />
              <FeatureCard
                icon={Satellite}
                title="GPS Fleet Telemetry"
                desc="Active tricycles transmit periodic coordinates, giving the Traffic Management Office clear, data-driven operational visibility across Nasugbu roads."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Real-Time Permit Tracking"
                desc="Track your MTOP application stage by stage — from document verification to payment and sticker issuance — right from your mobile device."
              />
              <FeatureCard
                icon={Calendar}
                title="Proactive Renewal Alerts"
                desc="Automated notifications notify operators and drivers well before franchise expiry, eliminating late penalties and unexpected operational halts."
              />
            </div>
          </div>
        </section>

        {/* ── Band 4: Closing CTA (Royal #25449B Full Bleed) ── */}
        <section className="wl-cta-band">
          <div className="wl-wrap">
            <div className="wl-cta-inner">
              <h2 className="wl-cta-title">Ready to manage your tricycle franchise?</h2>
              <p className="wl-cta-sub">
                Join thousands of operators utilizing Nasugbu's digital MTOP portal.
                Apply online in minutes with fast verification and transparent status tracking.
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
          <div className="wl-footer-inner">
            <div>
              <p className="wl-footer-copy">
                &copy; {new Date().getFullYear()} TRIVORA &bull; Smart Tricycle Management System
              </p>
              <p className="wl-footer-tagline">
                Pamahalaang Bayan ng Nasugbu &bull; Traffic Management Office (TMO)
              </p>
            </div>

            <div className="wl-footer-links">
              <span className="wl-footer-item wl-footer-item--highlight">
                <Phone size={13} strokeWidth={2.2} /> TMO Helpline Available
              </span>
              <span className="wl-footer-sep">&bull;</span>
              <span className="wl-footer-item">
                Nasugbu, Batangas
              </span>
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
