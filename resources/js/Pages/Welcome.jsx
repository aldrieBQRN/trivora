import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import {
    FileText, LogIn, ShieldCheck,
    Search, Cpu, Zap, Megaphone,
    Phone, Users, Wallet,
    ClipboardCheck, Award, ArrowRight, Calendar
} from 'lucide-react';

const FADE = 'wl-fade';
const delay = (ms) => ({ animationDelay: `${ms}ms` });

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Public Welcome / Landing Page
   Shares TrivoraLayout's slate-indigo token system
   Path: resources/js/Pages/Welcome.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

/* Smooth in-page scroll for the nav's section anchors — scoped to when this
   page is mounted, since the style tag unmounts with it. */
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

/* ── Base ────────────────────────────────────────────────────────────── */
.wl-root {
  font-family: 'Inter', sans-serif;
  background: #EDEEF4;
  color: #1C2340;
  min-height: 100vh;
  display: flex; flex-direction: column;
  /* No overflow-x here: setting only one overflow axis makes the browser
     compute the other as "auto" too, turning this into a scroll container —
     which breaks position:sticky on the navbar below. The hero's own glow
     orbs are already clipped by .wl-hero-backdrop's own overflow:hidden,
     so nothing here needs this. */
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
  outline: 2px solid #4F5BCB;
  outline-offset: 2px;
  border-radius: 6px;
}

/* ── Sticky navbar — stays pinned at the top of the viewport the whole
   scroll (position: sticky, not static), but starts fully transparent
   over the photo hero and only picks up the blurred dark panel once the
   page has scrolled past it, so it never fights the hero image. ── */
.wl-navbar {
  position: sticky; top: 0; z-index: 50;
  background: transparent;
  border-bottom: 1px solid transparent;
  backdrop-filter: none; -webkit-backdrop-filter: none;
  transition: background .25s ease, border-color .25s ease;
}
.wl-navbar--solid {
  background: rgba(20, 26, 51, .68);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.wl-header {
  height: 76px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px;
}
.wl-logo { display: flex; align-items: center; text-decoration: none; flex-shrink: 0; }
.wl-logo-img-wrap {
  height: 42px; width: auto; border-radius: 10px;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
  display: flex; align-items: center; justify-content: center;
  padding: 5px 9px; flex-shrink: 0;
  transition: box-shadow .2s;
}
.wl-logo:hover .wl-logo-img-wrap { box-shadow: 0 4px 16px rgba(0,0,0,.22); }
.wl-logo-img { height: 28px; width: auto; object-fit: contain; display: block; }

.wl-nav { display: flex; align-items: center; gap: 32px; }
@media (max-width: 860px) { .wl-nav { display: none; } }
.wl-nav-link {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: rgba(255,255,255,.72);
  text-decoration: none;
  transition: color .18s;
}
.wl-nav-link:hover { color: #FFFFFF; }
.wl-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.wl-nav-login {
  display: inline-flex; align-items: center; gap: 7px;
  height: 38px; padding: 0 18px; border-radius: 9px;
  border: 1.5px solid rgba(255,255,255,.28);
  color: #FFFFFF; text-decoration: none;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  transition: border-color .18s, background .18s;
}
.wl-nav-login:hover { border-color: #FFFFFF; background: rgba(255,255,255,.08); }
.wl-nav-apply {
  display: none;
  align-items: center; gap: 7px;
  height: 38px; padding: 0 18px; border-radius: 9px;
  border: none; background: #FFFFFF; color: #1C2340;
  text-decoration: none;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .12em; text-transform: uppercase;
  box-shadow: 0 3px 12px rgba(0,0,0,.18);
  transition: transform .15s, box-shadow .15s;
}
@media (min-width: 561px) { .wl-nav-apply { display: inline-flex; } }
.wl-nav-apply:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(0,0,0,.24); }

/* ── Hero Backdrop (PHOTO BACKGROUND) ────────────────────────────────── */
/* Full-screen hero — fills the viewport below the sticky navbar (76px)
   so the first thing a visitor sees is one uninterrupted, immersive scene
   instead of a short banner strip. */
.wl-hero-backdrop {
  position: absolute; top: 0; left: 0; width: 100%;
  height: calc(100vh - 76px); min-height: 560px;
  background-image:
    linear-gradient(160deg, rgba(20, 26, 51, 0.82) 0%, rgba(20, 26, 51, 0.96) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-bottom-left-radius: 44px;
  border-bottom-right-radius: 44px;
  z-index: 0;
  overflow: hidden;
}
.wl-hero-glow {
  position: absolute; border-radius: 50%; pointer-events: none;
  filter: blur(70px); z-index: 0;
}
.wl-hero-glow--1 {
  top: -140px; right: -100px; width: 460px; height: 460px;
  background: radial-gradient(circle, rgba(79,91,203,.4), transparent 70%);
}
.wl-hero-glow--2 {
  bottom: -160px; left: -120px; width: 420px; height: 420px;
  background: radial-gradient(circle, rgba(255,255,255,.14), transparent 70%);
}

/* ── Entrance animation ─────────────────────────────────────────────── */
@keyframes wlFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.wl-fade { animation: wlFadeUp .6s cubic-bezier(.16,1,.3,1) both; }
@media (prefers-reduced-motion: reduce) { .wl-fade { animation: none; } }

/* ── Constraint wrapper ──────────────────────────────────────────────── */
.wl-wrap { max-width: 1200px; margin: 0 auto; padding: 0 32px; width: 100%; }
@media (max-width: 640px) { .wl-wrap { padding: 0 20px; } }

.wl-band { position: relative; z-index: 10; padding-top: 80px; }
.wl-band-white { background: #FFFFFF; padding-top: 80px; }
.wl-band-neutral { padding-top: 80px; }
@media (max-width: 640px) {
  .wl-band, .wl-band-white, .wl-band-neutral { padding-top: 56px; }
}

/* ── Hero — full viewport height, content vertically centered ────────── */
.wl-hero {
  position: relative; z-index: 10;
  min-height: calc(100vh - 76px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
  padding-top: 48px;
  padding-bottom: 64px;
}
@media (max-width: 640px) { .wl-hero { padding-top: 32px; padding-bottom: 48px; min-height: calc(100vh - 76px); } }

.wl-hero-badge {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 16px; border-radius: 20px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.2);
  color: rgba(255,255,255,.88);
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  margin-bottom: 24px;
}
.wl-hero-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(38px, 6.4vw, 68px);
  font-weight: 800; letter-spacing: -.03em;
  color: #FFFFFF; line-height: 1.04;
  margin-bottom: 20px;
}
.wl-hero-title-accent {
  background: linear-gradient(100deg, #8B93E8 0%, #C7CBF5 50%, #FFFFFF 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.wl-hero-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 1.6vw, 16.5px); font-weight: 400;
  color: rgba(255,255,255,.82);
  max-width: 540px; margin: 0 auto;
  line-height: 1.65;
}
.wl-hero-cta {
  display: flex; align-items: center; justify-content: center;
  gap: 14px; flex-wrap: wrap;
  margin-top: 34px;
}
.wl-hero-btn-primary, .wl-hero-btn-outline {
  display: inline-flex; align-items: center; gap: 8px;
  height: 52px; padding: 0 28px; border-radius: 12px;
  text-decoration: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 800;
  letter-spacing: .12em; text-transform: uppercase;
  transition: transform .18s, box-shadow .18s, background .18s, border-color .18s, color .18s;
}
.wl-hero-btn-primary {
  border: none; background: #FFFFFF; color: #1C2340;
  box-shadow: 0 8px 24px rgba(0,0,0,.22);
}
.wl-hero-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,.3); }
.wl-hero-btn-outline {
  border: 1.5px solid rgba(255,255,255,.32); background: rgba(255,255,255,.04); color: #FFFFFF;
}
.wl-hero-btn-outline:hover { border-color: #FFFFFF; background: rgba(255,255,255,.1); transform: translateY(-2px); }

/* ── Section container / heading ─────────────────────────────────────── */
.wl-section { padding-bottom: 84px; }
@media (max-width: 640px) { .wl-section { padding-bottom: 56px; } }

.wl-sec-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  justify-content: center; margin-bottom: 10px;
}
.wl-sec-eyebrow::before, .wl-sec-eyebrow::after { content: ''; flex: 0 0 18px; height: 1.5px; background: #4F5BCB; border-radius: 2px; }
.wl-sec-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(24px, 3.2vw, 32px); font-weight: 800;
  letter-spacing: -.025em; color: #1C2340;
  text-align: center; line-height: 1.15; margin-bottom: 10px;
}
.wl-sec-sub {
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 400;
  color: #4A5578; text-align: center; line-height: 1.55;
  max-width: 560px; margin: 0 auto 40px;
}

/* ── Verify tool ─────────────────────────────────────────────────────── */
.wl-verify {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 18px;
  padding: 28px 32px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; flex-wrap: wrap;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.wl-verify-left { display: flex; align-items: center; gap: 18px; }
.wl-verify-icon {
  width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(79,91,203,.16), rgba(79,91,203,.02));
  border: 1px solid rgba(79,91,203,.15);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB;
}
.wl-verify-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; margin-bottom: 4px; }
.wl-verify-sub { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 400; color: #4A5578; }
.wl-verify-right { display: flex; gap: 10px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
.wl-verify-input {
  height: 44px; border-radius: 10px;
  border: 1px solid rgba(28,35,64,.12);
  background: #FAFAFA;
  padding: 0 16px;
  font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 500;
  color: #1C2340; outline: none;
  width: 240px; min-width: 180px;
  transition: border-color .2s, box-shadow .2s;
}
.wl-verify-input:focus { border-color: rgba(79,91,203,.4); box-shadow: 0 0 0 3px rgba(79,91,203,.09); background: #FFFFFF; }
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
@media (max-width: 640px) {
  .wl-verify { flex-direction: column; align-items: stretch; padding: 24px; }
  .wl-verify-right { justify-content: stretch; }
  .wl-verify-input { width: 100%; min-width: 0; flex: 1 1 auto; }
  .wl-verify-btn { flex: 0 0 auto; }
}

/* ── How It Works — real 4-step applicant journey, not decorative
   filler: mirrors the actual Apply → Review → Pay → Active pipeline. ── */
.wl-steps {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28px;
}
.wl-steps-line {
  position: absolute; top: 32px; left: 12%; right: 12%; height: 2px;
  background-image: linear-gradient(to right, rgba(79,91,203,.28) 0 10px, transparent 10px 18px);
  background-size: 18px 2px;
  z-index: 0;
}
@media (max-width: 860px) {
  .wl-steps { grid-template-columns: 1fr 1fr; row-gap: 36px; }
  .wl-steps-line { display: none; }
}
@media (max-width: 560px) { .wl-steps { grid-template-columns: 1fr; } }

.wl-step { position: relative; z-index: 1; text-align: center; }
.wl-step-icon-wrap { position: relative; width: 64px; height: 64px; margin: 0 auto 18px; }
.wl-step-icon {
  width: 64px; height: 64px; border-radius: 18px;
  background: linear-gradient(135deg, rgba(79,91,203,.15), rgba(79,91,203,.02));
  border: 1px solid rgba(79,91,203,.14);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB;
}
.wl-step-badge {
  position: absolute; top: -6px; left: -6px;
  width: 22px; height: 22px; border-radius: 50%;
  background: #1C2340; color: #FFFFFF;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #EDEEF4;
}
.wl-step-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14.5px; font-weight: 800; letter-spacing: -.015em; color: #1C2340; margin-bottom: 7px; }
.wl-step-desc { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 400; color: #4A5578; line-height: 1.55; max-width: 220px; margin: 0 auto; }

/* ── Feature bento grid — the highlighted feature runs the full width as
   its own row, then the remaining features tile evenly in three equal
   columns below, so the grid always resolves clean instead of leaving a
   gap when an odd number of cards can't fill a 2+1 split. ── */
.wl-bento { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.wl-feature--lg { grid-column: 1 / -1; }
@media (max-width: 1024px) { .wl-bento { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) {
  .wl-bento { grid-template-columns: 1fr; }
  .wl-feature--lg { flex-direction: column; }
  .wl-feature--lg .wl-feature-icon { margin-bottom: 14px; }
}

.wl-feature {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 18px; padding: 30px 28px;
  transition: box-shadow .2s, border-color .2s;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.wl-feature:hover { border-color: rgba(79,91,203,.2); box-shadow: 0 8px 28px rgba(28,35,64,.1); }
.wl-feature--lg { display: flex; align-items: flex-start; gap: 22px; }
.wl-feature--lg .wl-feature-icon { margin-bottom: 0; flex-shrink: 0; width: 54px; height: 54px; }
.wl-feature-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(79,91,203,.16), rgba(79,91,203,.02));
  border: 1px solid rgba(79,91,203,.14);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB; margin-bottom: 18px;
  transition: background .2s;
}
.wl-feature:hover .wl-feature-icon { background: linear-gradient(135deg, rgba(79,91,203,.24), rgba(79,91,203,.04)); }
.wl-feature-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15.5px; font-weight: 800; letter-spacing: -.015em; color: #1C2340; margin-bottom: 8px; }
.wl-feature-desc { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 400; color: #4A5578; line-height: 1.58; }

/* ── Overview metrics strip ──────────────────────────────────────────── */
.wl-stat-strip {
  display: flex;
  background: linear-gradient(135deg, #1C2340 0%, #232C50 100%);
  border-radius: 18px;
  padding: 30px 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(28,35,64,.2);
}
.wl-stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0 16px; text-align: center; }
.wl-stat-item:not(:last-child) { border-right: 1px solid rgba(255,255,255,.08); }
.wl-stat-icon {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  color: #FFFFFF; margin-bottom: 4px;
}
.wl-stat-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -.025em; color: #FFFFFF; line-height: 1; }
.wl-stat-label { font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #8A96BC; }
@media (max-width: 640px) {
  .wl-stat-strip { flex-direction: column; padding: 6px 28px; }
  .wl-stat-item { flex-direction: row-reverse; justify-content: space-between; align-items: center; width: 100%; padding: 16px 0; text-align: left; }
  .wl-stat-item:not(:last-child) { border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); }
  .wl-stat-value { font-size: 24px; }
  .wl-stat-icon { display: none; }
}

/* Advisories card */
.wl-advisories {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 18px; padding: 32px 28px;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
  display: flex; flex-direction: column;
}
.wl-adv-header { display: flex; align-items: center; gap: 14px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid rgba(28,35,64,.06); }
.wl-adv-header-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(239,68,68,.14), rgba(239,68,68,.02));
  border: 1px solid rgba(239,68,68,.15);
  display: flex; align-items: center; justify-content: center;
  color: #EF4444;
}
.wl-adv-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; margin-bottom: 3px; }
.wl-adv-sub { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 400; color: #4A5578; }
.wl-adv-list { display: flex; flex-direction: column; gap: 12px; }
.wl-adv-item { display: flex; gap: 16px; }
.wl-adv-chip {
  flex-shrink: 0; width: 50px; height: 50px; border-radius: 12px;
  background: rgba(28,35,64,.05);
  border: 1px solid rgba(28,35,64,.08);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  transition: background .18s, border-color .18s;
}
.wl-adv-item:hover .wl-adv-chip { background: rgba(79,91,203,.08); border-color: rgba(79,91,203,.2); }
.wl-adv-chip-month { font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #4F5BCB; }
.wl-adv-chip-day { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #1C2340; line-height: 1.2; }
.wl-adv-body { background: #FAFAFA; border: 1px solid rgba(28,35,64,.06); border-radius: 10px; padding: 14px 16px; flex: 1; transition: background .18s, border-color .18s; }
.wl-adv-item:hover .wl-adv-body { background: #FFFFFF; border-color: rgba(79,91,203,.15); }
.wl-adv-item-title { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #1C2340; letter-spacing: -.01em; margin-bottom: 5px; line-height: 1.3; }
.wl-adv-item-desc { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 400; color: #4A5578; line-height: 1.55; }
.wl-adv-footnote { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 400; color: #8A96BC; line-height: 1.5; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(28,35,64,.06); }

/* ── Closing CTA band — full-bleed, distinct from every other section,
   the "ready to act" close every modern landing page ends on. ── */
.wl-cta-band {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%);
  padding: 76px 0;
  text-align: center;
}
.wl-cta-inner { position: relative; z-index: 1; }
.wl-cta-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(24px, 3.6vw, 36px); font-weight: 800;
  color: #FFFFFF; letter-spacing: -.02em; margin-bottom: 14px;
}
.wl-cta-sub {
  font-family: 'Inter', sans-serif; font-size: 14.5px; font-weight: 400;
  color: rgba(255,255,255,.8); max-width: 480px; margin: 0 auto 30px; line-height: 1.6;
}
.wl-cta-actions { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
.wl-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 52px; padding: 0 30px; border-radius: 12px;
  background: #FFFFFF; color: #1C2340; text-decoration: none;
  font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 800;
  letter-spacing: .12em; text-transform: uppercase;
  box-shadow: 0 8px 24px rgba(0,0,0,.2);
  transition: transform .18s, box-shadow .18s;
}
.wl-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,.28); }
.wl-cta-btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  height: 52px; padding: 0 30px; border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,.3); background: transparent; color: #FFFFFF;
  text-decoration: none;
  font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 800;
  letter-spacing: .12em; text-transform: uppercase;
  transition: border-color .18s, background .18s, transform .18s;
}
.wl-cta-btn-ghost:hover { border-color: #FFFFFF; background: rgba(255,255,255,.08); transform: translateY(-2px); }

/* ── Footer ──────────────────────────────────────────────────────────── */
.wl-footer { background: #FFFFFF; border-top: 1px solid rgba(28,35,64,.07); margin-top: auto; }
.wl-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 0; flex-wrap: wrap; }
.wl-footer-copy-col { display: flex; flex-direction: column; gap: 3px; }
.wl-footer-copy { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #9AA3CC; }
.wl-footer-tagline { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 400; color: #B7BEDA; }
.wl-footer-links { display: flex; align-items: center; gap: 20px; }
.wl-footer-item { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #9AA3CC; }
.wl-footer-sep { color: rgba(28,35,64,.15); font-size: 12px; }
`;

const STEPS = [
    { icon: FileText,       title: 'Apply Online',       desc: 'Submit your MTOP application and documents through this portal — no queuing required.' },
    { icon: ClipboardCheck, title: 'TMO Verification',   desc: 'The Traffic Management Office reviews your documents and inspects your tricycle.' },
    { icon: Wallet,         title: 'Settle Fees',        desc: 'Pay your franchise fees at the Municipal Treasurer’s Office using the generated order of payment.' },
    { icon: Award,          title: 'Get Your Permit',    desc: 'Receive your official MTOP sticker and secure digital permit, ready to use.' },
];

export default function Welcome({ overview = {} }) {
    const [plateQuery, setPlateQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);

    const activePermits = overview.activePermits ?? 0;
    const todaCount = overview.todaCount ?? 0;
    const paymentsToday = overview.paymentsToday ?? 0;

    // Navbar goes from transparent (over the hero photo) to a solid blurred
    // panel once the page has scrolled past the top of the hero.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Public Verification Function — calls real API
    const handleVerify = async () => {
        if (!plateQuery.trim()) {
            Swal.fire({
                title: 'Input Required',
                text: 'Please enter a Plate Number to check.',
                icon: 'warning',
                confirmButtonColor: '#1C2340',
                customClass: { title: 'font-jakarta', popup: 'font-inter' }
            });
            return;
        }

        Swal.fire({
            title: 'Checking...',
            text: 'Looking up franchise record.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        try {
            const res = await fetch(`/api/public/verify-plate?plate=${encodeURIComponent(plateQuery.trim())}`);
            const data = await res.json();

            if (!data.found) {
                Swal.fire({
                    title: 'Record Not Found',
                    text: `No official franchise record found for Plate No. "${plateQuery.trim().toUpperCase()}".`,
                    icon: 'question',
                    confirmButtonColor: '#1C2340',
                    customClass: { title: 'font-jakarta', popup: 'font-inter' }
                });
                return;
            }

            const statusColor = data.status === 'Active' ? '#059669'
                              : data.status === 'Expired' ? '#D97706'
                              : data.status === 'Unregistered' ? '#6B7280'
                              : '#DC2626';

            const statusIcon = data.status === 'Active' ? 'success'
                             : data.status === 'Expired' ? 'warning'
                             : 'error';

            const statusLabel = data.status === 'Active' ? '✓ ACTIVE — Valid MTOP Franchise'
                              : data.status === 'Expired' ? '⚠ EXPIRED — Renewal Required'
                              : data.status === 'Unregistered' ? '○ UNREGISTERED — No Permit Issued'
                              : '⊗ ' + data.status.toUpperCase();

            Swal.fire({
                title: data.status === 'Active' ? 'Valid Franchise Found' : 'Franchise Issue Detected',
                html: `
                    <div style="text-align:left;padding:12px 10px;background:${data.status === 'Active' ? '#F0FDF4' : '#FEF2F2'};border-radius:10px;margin-top:8px;font-size:13px;line-height:1.8">
                        <b>Plate No:</b> ${data.plate}<br/>
                        ${data.body_number ? `<b>Body No:</b> ${data.body_number}<br/>` : ''}
                        <b>Operator:</b> ${data.operator}<br/>
                        <b>Unit:</b> ${data.make_model}<br/>
                        <b>TODA Zone:</b> ${data.toda}<br/>
                        ${data.expiry ? `<b>Franchise Expiry:</b> ${data.expiry}<br/>` : ''}
                        <br/><span style="color:${statusColor};font-weight:800;font-size:13px">${statusLabel}</span>
                    </div>
                `,
                icon: statusIcon,
                confirmButtonColor: data.status === 'Active' ? '#059669' : '#1C2340',
                customClass: { title: 'font-jakarta', popup: 'font-inter' }
            });
        } catch {
            Swal.fire({
                title: 'Error',
                text: 'Could not reach the verification server. Please try again.',
                icon: 'error',
                confirmButtonColor: '#1C2340',
            });
        }
    };

    return (
        <div className="wl-root">
            <Head title="TRIVORA | Nasugbu LGU" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ══════ STICKY NAV ══════════════════════════════════════ */}
            <div className={`wl-navbar ${scrolled ? 'wl-navbar--solid' : ''}`}>
                <div className="wl-wrap">
                    <div className="wl-header">
                        <Link href="/" className="wl-logo">
                            <div className="wl-logo-img-wrap">
                                <img src="/images/logo.png" alt="TRIVORA" className="wl-logo-img" />
                            </div>
                        </Link>

                        {/* Ordered to match the actual page sequence below (Verify →
                            How It Works → Technology → Status), not an arbitrary order. */}
                        <nav className="wl-nav" aria-label="Primary">
                            <a href="#verify" className="wl-nav-link">Verify Permit</a>
                            <a href="#how-it-works" className="wl-nav-link">How It Works</a>
                            <a href="#technology" className="wl-nav-link">Technology</a>
                            <a href="#announcements" className="wl-nav-link">Status</a>
                        </nav>

                        <div className="wl-header-actions">
                            <Link href={route('login')} className="wl-nav-login">
                                <LogIn size={13} strokeWidth={2.2} /> Log In
                            </Link>
                            <Link href="/register-mtop" className="wl-nav-apply">
                                Apply Now
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Dark hero backdrop with photo — decorative, same info already in text. ── */}
            <div className="wl-hero-backdrop" aria-hidden="true">
                <div className="wl-hero-glow wl-hero-glow--1" />
                <div className="wl-hero-glow wl-hero-glow--2" />
            </div>

            {/* ══════ HERO ═══════════════════════════════════════════ */}
            <div className="wl-wrap">
                <div className="wl-hero">
                    <p className={`wl-hero-badge ${FADE}`} style={delay(0)}>
                        <ShieldCheck size={12} strokeWidth={2.4} /> Official Municipal Platform — Nasugbu, Batangas
                    </p>
                    <h1 className={`wl-hero-title ${FADE}`} style={delay(80)}>
                        Smart Tricycle<br /><span className="wl-hero-title-accent">Management System</span>
                    </h1>
                    <p className={`wl-hero-sub ${FADE}`} style={delay(160)}>
                        The official portal of the Nasugbu Municipal Government for applying and
                        renewing tricycle permits (MTOP), with smart GPS-based fleet monitoring.
                    </p>
                    <div className={`wl-hero-cta ${FADE}`} style={delay(220)}>
                        <Link href="/register-mtop" className="wl-hero-btn-primary">
                            Apply for a Permit <ArrowRight size={14} strokeWidth={2.4} />
                        </Link>
                        <a href="#verify" className="wl-hero-btn-outline">
                            <Search size={14} strokeWidth={2.2} /> Verify a Plate
                        </a>
                    </div>
                </div>
            </div>

            {/* ══════ MAIN CONTENT ════════════════════════════════════ */}
            <main style={{ flex: 1 }}>

                {/* ── Band 1: Public plate verification ── */}
                <div className="wl-band">
                    <div className="wl-wrap">

                        <section className="wl-section" id="verify" aria-labelledby="verify-heading">
                            <p className="wl-sec-eyebrow">Quick Action</p>
                            <h2 className="wl-sec-title" id="verify-heading">Verify a Franchise</h2>
                            <p className="wl-sec-sub">Check if a tricycle has a valid municipal permit before boarding.</p>
                            <div className="wl-verify">
                                <div className="wl-verify-left">
                                    <div className="wl-verify-icon" aria-hidden="true">
                                        <Search size={20} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="wl-verify-title">Public Plate Verification</p>
                                        <p className="wl-verify-sub">Enter a plate number to check its status instantly.</p>
                                    </div>
                                </div>
                                <form
                                    className="wl-verify-right"
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
                        </section>

                    </div>
                </div>

                {/* ── Band 2: How It Works (white) — the real 4-step applicant journey ── */}
                <div className="wl-band wl-band-white">
                    <div className="wl-wrap">
                        <section className="wl-section" id="how-it-works" aria-labelledby="how-it-works-heading">
                            <p className="wl-sec-eyebrow">Process</p>
                            <h2 className="wl-sec-title" id="how-it-works-heading">How It Works</h2>
                            <p className="wl-sec-sub">From application to an active franchise — four steps, entirely trackable online.</p>

                            <div className="wl-steps">
                                <div className="wl-steps-line" aria-hidden="true" />
                                {STEPS.map((s, i) => (
                                    <div className="wl-step" key={s.title}>
                                        <div className="wl-step-icon-wrap">
                                            <div className="wl-step-icon">
                                                <s.icon size={26} strokeWidth={1.8} />
                                            </div>
                                            <span className="wl-step-badge" aria-hidden="true">{i + 1}</span>
                                        </div>
                                        <h3 className="wl-step-title">{s.title}</h3>
                                        <p className="wl-step-desc">{s.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* ── Band 3: Technology (neutral, alternating) ── */}
                <div className="wl-band wl-band-neutral">
                    <div className="wl-wrap">
                        <section className="wl-section" id="technology" aria-labelledby="technology-heading">
                            <p className="wl-sec-eyebrow">Technology</p>
                            <h2 className="wl-sec-title" id="technology-heading">Powered by Modern Technology</h2>
                            <p className="wl-sec-sub">Smart trackers and online tools working together for a safer, more organized Nasugbu.</p>

                            <div className="wl-bento">
                                <FeatureCard
                                    large
                                    icon={Cpu}
                                    title="Automatic Violation Check"
                                    desc="Smart GPS tracking flags coding-day and out-of-route violations automatically, keeping the fleet disciplined without manual monitoring — every active unit is checked in real time, all day."
                                />
                                <FeatureCard
                                    icon={ShieldCheck}
                                    title="Secure Digital Permit"
                                    desc="Your approved permit is delivered straight to your phone — fast, paperless, and easy to present when asked."
                                />
                                <FeatureCard
                                    icon={Zap}
                                    title="Automated Payment Ticket"
                                    desc="Receive an itemized municipal order of payment with clear fee breakdowns for quick, transparent cashier settlement."
                                />
                                <FeatureCard
                                    icon={Calendar}
                                    title="Renewal Reminders"
                                    desc="The system tracks every franchise's expiry date and flags upcoming renewals before they lapse."
                                />
                            </div>
                        </section>
                    </div>
                </div>

                {/* ── Band 4: Status (white — metrics strip + advisories) ── */}
                <div className="wl-band wl-band-white">
                    <div className="wl-wrap">
                        <section className="wl-section" id="announcements" aria-labelledby="announcements-heading">
                            <p className="wl-sec-eyebrow">Status</p>
                            <h2 className="wl-sec-title" id="announcements-heading">Fleet Overview &amp; Advisories</h2>
                            <p className="wl-sec-sub">Current registration totals and notices from the Traffic and Permit Offices.</p>

                            <div className="wl-stat-strip">
                                <StatItem icon={ShieldCheck} label="Active Permits"  value={activePermits.toLocaleString()} />
                                <StatItem icon={Users}       label="TODA Registered" value={todaCount.toLocaleString()} />
                                <StatItem icon={Wallet}      label="Payments Today"  value={paymentsToday.toLocaleString()} />
                            </div>

                            <div className="wl-advisories">
                                <div className="wl-adv-header">
                                    <div className="wl-adv-header-icon" aria-hidden="true">
                                        <Megaphone size={18} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <h3 className="wl-adv-title">Announcements</h3>
                                        <p className="wl-adv-sub">General notices from the Traffic and Permit Offices.</p>
                                    </div>
                                </div>
                                <div className="wl-adv-list">
                                    <AdvisoryItem
                                        month="Mar" day="30"
                                        title="Strict Implementation of Coding Scheme"
                                        desc="Please follow the updated plate-ending coding schedule. The system automatically flags and records violators."
                                    />
                                    <AdvisoryItem
                                        month="Mar" day="25"
                                        title="Online Permit Renewal Now Open"
                                        desc="Skip the lines at the Municipal Hall — tricycle permits can now be renewed completely online through this portal."
                                    />
                                </div>
                                <p className="wl-adv-footnote">
                                    For the latest advisories, contact or visit the Traffic Management Office directly.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                {/* ── Band 5: Closing CTA — full-bleed navy, the page's final call to act ── */}
                <div className="wl-cta-band">
                    <div className="wl-wrap">
                        <div className="wl-cta-inner">
                            <h2 className="wl-cta-title">Ready to get your permit?</h2>
                            <p className="wl-cta-sub">
                                Join the operators already managing their MTOP franchise online — no queues,
                                no lost paperwork, just a straightforward digital process.
                            </p>
                            <div className="wl-cta-actions">
                                <Link href="/register-mtop" className="wl-cta-btn">
                                    Apply for a Permit <ArrowRight size={14} strokeWidth={2.4} />
                                </Link>
                                <Link href={route('login')} className="wl-cta-btn-ghost">
                                    <LogIn size={14} strokeWidth={2.2} /> Log In
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* ══════ FOOTER ══════════════════════════════════════════ */}
            <footer className="wl-footer">
                <div className="wl-wrap">
                    <div className="wl-footer-inner">
                        <div className="wl-footer-copy-col">
                            <p className="wl-footer-copy">
                                &copy; 2026 TRIVORA Fleet Operations &bull; Nasugbu Batangas
                            </p>
                            <p className="wl-footer-tagline">A digital service of the Municipal Government of Nasugbu.</p>
                        </div>
                        {/* Plain text, not links — neither a hotline number nor a Privacy Policy
                            page exists yet in this app, so these are presented as informational
                            labels rather than dead "#" links. */}
                        <div className="wl-footer-links">
                            <span className="wl-footer-item">
                                <Phone size={11} strokeWidth={2} /> TMO Hotline
                            </span>
                            <span className="wl-footer-sep">&bull;</span>
                            <span className="wl-footer-item">
                                Privacy Policy
                            </span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function FeatureCard({ icon: Icon, title, desc, large }) {
    return (
        <div className={`wl-feature ${large ? 'wl-feature--lg' : ''}`}>
            <div className="wl-feature-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2} />
            </div>
            <div>
                <h3 className="wl-feature-title">{title}</h3>
                <p className="wl-feature-desc">{desc}</p>
            </div>
        </div>
    );
}

function StatItem({ icon: Icon, label, value }) {
    return (
        <div className="wl-stat-item">
            {Icon && (
                <span className="wl-stat-icon" aria-hidden="true">
                    <Icon size={16} strokeWidth={2.2} />
                </span>
            )}
            <span className="wl-stat-value">{value}</span>
            <span className="wl-stat-label">{label}</span>
        </div>
    );
}

function AdvisoryItem({ month, day, title, desc }) {
    return (
        <div className="wl-adv-item">
            <div className="wl-adv-chip" aria-hidden="true">
                <span className="wl-adv-chip-month">{month}</span>
                <span className="wl-adv-chip-day">{day}</span>
            </div>
            <div className="wl-adv-body">
                <p className="wl-adv-item-title">{title}</p>
                <p className="wl-adv-item-desc">{desc}</p>
            </div>
        </div>
    );
}
