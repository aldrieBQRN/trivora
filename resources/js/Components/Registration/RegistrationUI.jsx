import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, CheckCircle2, Camera, Eye, X, FileText } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Shared franchise registration UI — the design system of Public Registration
   (Pages/Registration/PublicApply.jsx), also used by the Driver Portal's
   New Unit Registration / Renewal wizard (Pages/Operator/Compliance/MTOPWizard.jsx)
   so both forms look and validate the same. All classes are pa-* scoped.
───────────────────────────────────────────────────────────────────────── */

export const REGISTRATION_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.pa-embed { font-family: 'Inter', sans-serif; color: #1C2340; }

.pa-root *, .pa-root *::before, .pa-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Fixed to the viewport height on desktop (not min-height) so the side
   panel and content pane are capped at one screen — the content pane can
   then scroll internally without dragging the side panel along with it.
   On mobile the split collapses into one normal scrolling page instead. */
.pa-root {
  font-family: 'Inter', sans-serif;
  background: #FFFFFF;
  color: #1C2340;
  height: 100vh;
  display: flex; flex-direction: row;
  overflow: hidden;
}
@media (max-width: 900px) { .pa-root { flex-direction: column; height: auto; min-height: 100vh; overflow: visible; } }

@keyframes paFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes paSpin { to { transform: rotate(360deg); } }

/* ── Split layout: branded step panel (left) + active step content
   (right) — a different structural approach from the old centered
   card-over-photo-hero layout, closer to how Login.jsx pairs an identity
   panel with a task panel. ── */
.pa-side {
  flex: 0 0 42%; position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 48px 44px;
  border-radius: 0 28px 28px 0;
  background-image:
    linear-gradient(165deg, rgba(20,26,51,.86) 0%, rgba(20,26,51,.97) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover; background-position: center; background-repeat: no-repeat;
  color: #FFFFFF;
}
@media (max-width: 900px) { .pa-side { flex: 0 0 auto; padding: 36px 28px; border-radius: 0 0 28px 28px; } }

.pa-side::before {
  content: ''; position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 26px 26px; pointer-events: none;
}
.pa-hero-glow { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(70px); }
.pa-hero-glow--1 { top: -120px; right: -100px; width: 340px; height: 340px; background: radial-gradient(circle, rgba(79,91,203,.42), transparent 70%); }
.pa-hero-glow--2 { bottom: -140px; left: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,255,255,.12), transparent 70%); }

.pa-side-top { position: relative; z-index: 1; }
.pa-side-mid { position: relative; z-index: 1; margin-top: 36px; }
@media (max-width: 900px) { .pa-side-mid { margin-top: 22px; } }
.pa-side-bottom { position: relative; z-index: 1; margin-top: 28px; }
@media (max-width: 900px) { .pa-side-bottom { display: none; } }

.pa-logo { display: flex; align-items: center; gap: 14px; text-decoration: none; width: fit-content; }
.pa-logo-img-wrap {
  height: 42px; width: auto; border-radius: 10px;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
  display: flex; align-items: center; justify-content: center;
  padding: 6px 9px; flex-shrink: 0;
  transition: box-shadow .2s;
}
.pa-logo:hover .pa-logo-img-wrap { box-shadow: 0 4px 16px rgba(0,0,0,.22); }
.pa-logo-img { height: 26px; width: auto; object-fit: contain; display: block; }

.pa-page-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(22px, 2.6vw, 27px); font-weight: 800;
  letter-spacing: -.025em; color: #FFFFFF;
  line-height: 1.15; margin-top: 24px; margin-bottom: 8px;
}
@media (max-width: 900px) { .pa-page-title { margin-top: 16px; font-size: 20px; } }
.pa-page-sub {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 400;
  color: rgba(255,255,255,.72); line-height: 1.6; max-width: 300px;
}
@media (max-width: 900px) { .pa-page-sub { display: none; } }

.pa-side-note {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: rgba(255,255,255,.45); line-height: 1.8;
  padding-top: 20px; border-top: 1px solid rgba(255,255,255,.12);
}

/* ── Vertical step list ───────────────────────────────────────────────── */
.pa-step-v-list { display: flex; flex-direction: column; }
@media (max-width: 900px) { .pa-step-v-list { flex-direction: row; align-items: flex-start; gap: 4px; } }

.pa-step-v { display: flex; gap: 14px; }
@media (max-width: 900px) { .pa-step-v { flex: 1; flex-direction: column; align-items: center; gap: 6px; } }

.pa-step-v-rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
@media (max-width: 900px) { .pa-step-v-rail { flex-direction: row; width: 100%; } }

.pa-step-v-dot {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.28);
  background: rgba(255,255,255,.08);
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800;
  color: rgba(255,255,255,.6);
  transition: all .3s ease;
}
.pa-step-v-dot.active { background: #FFFFFF; border-color: #FFFFFF; color: #1C2340; box-shadow: 0 0 0 5px rgba(255,255,255,.14); }
.pa-step-v-dot.done { background: #4F5BCB; border-color: #4F5BCB; color: #FFFFFF; }
.pa-step-v-line {
  width: 2px; flex: 1; min-height: 28px;
  background: rgba(255,255,255,.16); border-radius: 2px;
  transition: background .3s;
}
.pa-step-v-line.done { background: #4F5BCB; }
@media (max-width: 900px) { .pa-step-v-line { width: 100%; height: 2px; min-height: 0; flex: 1; margin-top: 15px; } }

.pa-step-v-text { padding-bottom: 28px; padding-top: 3px; }
@media (max-width: 900px) { .pa-step-v-text { display: none; } }
.pa-step-v-label {
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800;
  letter-spacing: .04em; color: rgba(255,255,255,.55);
  transition: color .3s; margin-bottom: 4px;
}
.pa-step-v-label.active, .pa-step-v-label.done { color: #FFFFFF; }
.pa-step-v-desc { font-family: 'Inter', sans-serif; font-size: 11.5px; color: rgba(255,255,255,.5); line-height: 1.5; max-width: 220px; }

/* ── Content pane (right) — a 3-row grid (topbar / centered content /
   footer) so the active step centers vertically & horizontally exactly
   like Login.jsx's form pane, without that centering fighting the
   topbar link or footer this page still needs (Login has neither). ── */
.pa-content { flex: 1; display: grid; grid-template-rows: auto 1fr auto; min-width: 0; background: #FFFFFF; overflow: hidden; }
@media (max-width: 900px) { .pa-content { overflow: visible; } }
.pa-content-topbar {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 20px 40px 0;
}
@media (max-width: 640px) { .pa-content-topbar { padding: 16px 20px 0; } }
.pa-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none; transition: color .18s;
}
.pa-back-link:hover { color: #1C2340; }

.pa-content-center { display: flex; align-items: safe center; justify-content: center; padding: 24px 24px; overflow-y: auto; }
.pa-content-inner { width: 100%; max-width: 620px; }

/* ── Step card (now the primary content itself, not a floating box) ──── */
.pa-card { animation: paFadeUp .4s cubic-bezier(.2,0,.2,1) both; }
.pa-card--elevated {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 22px;
  padding: 56px 48px;
  box-shadow: 0 1px 2px 0 rgba(28,35,64,.04), 0 8px 32px -8px rgba(28,35,64,.14);
  max-width: 560px; margin: 40px auto;
}
@media (max-width: 640px) { .pa-card--elevated { padding: 40px 24px; margin: 20px auto; } }

/* ── Card heading ────────────────────────────────────────────────────── */
.pa-card-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 36px; gap: 16px;
}
.pa-card-icon {
  width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(79,91,203,.15), rgba(79,91,203,.02));
  border: 1px solid rgba(79,91,203,.14);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB;
}
.pa-card-top-text { display: flex; align-items: center; gap: 16px; }
.pa-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 25px; font-weight: 800;
  letter-spacing: -.025em; color: #1C2340;
  margin-bottom: 5px; line-height: 1.15;
}
.pa-card-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC;
}

/* ── Agreement scroll box ────────────────────────────────────────────── */
.pa-agree-scroll {
  height: 280px;
  overflow-y: auto;
  background: #FAFAFA;
  border: 1.5px solid rgba(28,35,64,.1);
  border-radius: 14px;
  padding: 24px 26px;
  margin-bottom: 20px;
  scroll-behavior: smooth;
}
.pa-agree-scroll::-webkit-scrollbar { width: 5px; }
.pa-agree-scroll::-webkit-scrollbar-track { background: rgba(28,35,64,.04); border-radius: 5px; }
.pa-agree-scroll::-webkit-scrollbar-thumb { background: rgba(28,35,64,.18); border-radius: 5px; }

.pa-agree-h {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 700;
  color: #1C2340; margin-bottom: 8px; margin-top: 20px;
}
.pa-agree-h:first-child { margin-top: 0; }
.pa-agree-p {
  font-family: 'Inter', sans-serif;
  font-size: 12px; color: #5A6488;
  line-height: 1.8; margin-bottom: 10px;
}
.pa-agree-ol {
  padding-left: 18px; margin-bottom: 10px;
}
.pa-agree-ol li {
  font-family: 'Inter', sans-serif;
  font-size: 12px; color: #5A6488;
  line-height: 1.8; margin-bottom: 4px;
}

.pa-scroll-hint {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; text-align: center;
  margin-bottom: 16px;
}

/* ── Checkbox row ────────────────────────────────────────────────────── */
.pa-checkbox-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px 18px; border-radius: 12px;
  border: 1.5px solid rgba(28,35,64,.1);
  background: #F8F9FC; margin-bottom: 28px;
  cursor: pointer; transition: border-color .18s, background .18s;
}
.pa-checkbox-row:hover { border-color: rgba(28,35,64,.2); }
.pa-checkbox-row.checked { border-color: rgba(79,91,203,.3); background: rgba(79,91,203,.04); }
.pa-checkbox-row.locked { opacity: .5; cursor: not-allowed; }

.pa-checkbox {
  width: 20px; height: 20px; border-radius: 6px;
  border: 2px solid rgba(28,35,64,.2);
  background: #FFFFFF; flex-shrink: 0; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
  transition: all .18s;
}
.pa-checkbox.checked { background: #1C2340; border-color: #1C2340; }
.pa-checkbox-text {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .08em; color: #5A6488; line-height: 1.75;
}
.pa-checkbox-text span { color: #1C2340; }

/* ── Field grid ──────────────────────────────────────────────────────── */
.pa-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
@media (max-width: 640px) { .pa-fields { grid-template-columns: 1fr; } }
.pa-field-full { grid-column: 1 / -1; }

/* ── Owner vs separate Tricycle Driver toggle ────────────────────────── */
.pa-toggle-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #F7F8FC; border: 1px solid rgba(28,35,64,.09);
  border-radius: 12px; padding: 14px 16px; margin-bottom: 24px;
}
.pa-toggle-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px; font-weight: 700; color: #1C2340;
}
.pa-toggle-hint { font-size: 11.5px; color: #6B7280; margin-top: 3px; line-height: 1.5; }
.pa-toggle {
  display: inline-flex; align-items: center; gap: 10px;
  background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0;
}
.pa-toggle-track {
  width: 44px; height: 24px; border-radius: 999px;
  background: #C7CBD9; position: relative; transition: background .18s;
}
.pa-toggle.on .pa-toggle-track { background: #4F5BCB; }
.pa-toggle-knob {
  position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,.25);
  transition: transform .18s;
}
.pa-toggle.on .pa-toggle-knob { transform: translateX(20px); }
.pa-toggle-answer {
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px; font-weight: 700; color: #1C2340; min-width: 26px; text-align: left;
}

/* ── Conditional Tricycle Driver subsection (owner ≠ driver) ─────────── */
.pa-subsection {
  border: 1.5px dashed rgba(79,91,203,.38);
  background: rgba(79,91,203,.035);
  border-radius: 14px; padding: 18px 18px 4px; margin-bottom: 32px;
}
.pa-subsection-head { margin-bottom: 18px; }
.pa-subsection-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: #4F5BCB;
}
.pa-subsection-sub { font-size: 12px; color: #5A6488; margin-top: 4px; line-height: 1.55; }
.pa-subsection .pa-fields { margin-bottom: 28px; }

/* ── Field ───────────────────────────────────────────────────────────── */
.pa-label {
  display: block;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 8px; padding-left: 2px;
}
.pa-input {
  width: 100%; height: 48px;
  border: 1.5px solid rgba(28,35,64,.12);
  border-radius: 11px; background: #FAFAFA;
  padding: 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 500; color: #1C2340;
  outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
}
.pa-input:hover { border-color: rgba(28,35,64,.2); background: #FFFFFF; }
.pa-input:focus {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  background: #FFFFFF;
}
.pa-input::placeholder { color: #A0AEC0; font-weight: 400; opacity: 0.65; }

/* Icon-in-field variant — used on the driver-info fields for a richer feel. */
.pa-input-wrap { position: relative; }
.pa-input-wrap .pa-input { padding-left: 42px; }
.pa-input-wrap-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #9AA3CC; pointer-events: none; display: flex; align-items: center;
  transition: color .2s;
}
.pa-input-wrap:focus-within .pa-input-wrap-icon { color: #4F5BCB; }

.pa-select {
  width: 100%; height: 48px;
  border: 1.5px solid rgba(28,35,64,.12);
  border-radius: 11px; background: #FAFAFA;
  padding: 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 500; color: #1C2340;
  outline: none; appearance: none; cursor: pointer;
  transition: border-color .2s, box-shadow .2s, background .2s;
}
.pa-select:hover { border-color: rgba(28,35,64,.2); background: #FFFFFF; }
.pa-select:focus {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  background: #FFFFFF;
}
.pa-select-wrap { position: relative; }
.pa-select-wrap svg {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: #9AA3CC;
}

/* ── Field-level validation error ───────────────────────────────────── */
.pa-input.pa-input-error, .pa-select.pa-input-error {
  border-color: rgba(220,38,38,.5);
  background: rgba(220,38,38,.03);
}
.pa-input.pa-input-error:focus, .pa-select.pa-input-error:focus {
  box-shadow: 0 0 0 3px rgba(220,38,38,.1);
}
.pa-field-error {
  font-family: 'Inter', sans-serif;
  font-size: 10.5px; font-weight: 600; color: #DC2626;
  margin-top: 6px; padding-left: 2px;
}

/* ── Action row ──────────────────────────────────────────────────────── */
.pa-actions { display: flex; gap: 12px; }

/* ── Buttons ─────────────────────────────────────────────────────────── */
.pa-btn-primary {
  flex: 2; height: 52px; border-radius: 12px;
  border: none; background: #1C2340; color: #FFFFFF;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 9px;
  transition: background .18s, box-shadow .18s, transform .12s;
  box-shadow: 0 4px 14px rgba(28,35,64,.25);
}
.pa-btn-primary:hover {
  background: #2E3A9E;
  box-shadow: 0 6px 20px rgba(28,35,64,.3);
  transform: translateY(-1px);
}
.pa-btn-success {
  flex: 2; height: 52px; border-radius: 12px;
  border: none; background: #059669; color: #FFFFFF;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 9px;
  transition: background .18s, box-shadow .18s, transform .12s;
  box-shadow: 0 4px 14px rgba(5,150,105,.25);
}
.pa-btn-success:hover {
  background: #047857;
  box-shadow: 0 6px 20px rgba(5,150,105,.3);
  transform: translateY(-1px);
}
.pa-btn-ghost {
  flex: 1; height: 52px; border-radius: 12px;
  border: 1.5px solid rgba(28,35,64,.14); background: #FFFFFF; color: #4A5070;
  cursor: pointer; text-decoration: none;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: border-color .18s, background .18s, color .18s;
}
.pa-btn-ghost:hover { border-color: rgba(28,35,64,.25); color: #1C2340; background: #FAFAFA; }

/* ── File upload grid ────────────────────────────────────────────────── */
.pa-docs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
@media (max-width: 640px) { .pa-docs-grid { grid-template-columns: 1fr; } }

/* ── Required-docs progress readout — live feedback instead of only
   finding out what's missing after clicking Submit. ── */
.pa-req-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.pa-req-progress-bar { flex: 1; height: 6px; border-radius: 4px; background: rgba(28,35,64,.08); overflow: hidden; }
.pa-req-progress-fill { height: 100%; border-radius: 4px; background: #059669; transition: width .3s ease; }
.pa-req-progress-text {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .05em; color: #5A6488; white-space: nowrap;
}

.pa-docs-subhead {
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; color: #8A96BC;
  margin: 26px 0 12px; padding-top: 22px; border-top: 1px dashed rgba(28,35,64,.12);
}

/* ── File upload tile icon chip — gradient, matches the icon-chip language
   used across the rest of the app; swaps to a settled emerald tone once
   the document has files attached. ── */
.pa-file-chip {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(79,91,203,.14), rgba(79,91,203,.02));
  border: 1px solid rgba(79,91,203,.14);
  display: flex; align-items: center; justify-content: center;
  color: #4F5BCB; transition: all .18s;
}
.pa-file-tile-container.done .pa-file-chip {
  background: linear-gradient(135deg, rgba(5,150,105,.16), rgba(5,150,105,.02));
  border-color: rgba(5,150,105,.2); color: #059669;
}
.pa-file-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.pa-tag-req {
  font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #DC2626; background: rgba(220,38,38,.07);
  border: 1px solid rgba(220,38,38,.15); border-radius: 5px; padding: 2px 8px;
}
.pa-tag-opt {
  font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; background: rgba(28,35,64,.05);
  border: 1px solid rgba(28,35,64,.1); border-radius: 5px; padding: 2px 8px;
}
.pa-tag-done {
  font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: #065F46; background: rgba(5,150,105,.08);
  border: 1px solid rgba(5,150,105,.2); border-radius: 5px; padding: 2px 8px;
}

/* ── Info notice ─────────────────────────────────────────────────────── */
.pa-notice {
  display: flex; gap: 14px; align-items: flex-start;
  background: rgba(245,158,11,.06); border: 1px solid rgba(245,158,11,.2);
  border-radius: 12px; padding: 16px 18px; margin-bottom: 28px;
}
.pa-notice-icon { color: #D97706; flex-shrink: 0; margin-top: 1px; }
.pa-notice-text {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #92400E; line-height: 1.9;
}

/* ── Success card ────────────────────────────────────────────────────── */
.pa-success-icon {
  width: 88px; height: 88px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(5,150,105,.16), rgba(5,150,105,.02));
  border: 2px solid rgba(5,150,105,.2);
  display: flex; align-items: center; justify-content: center;
  color: #059669; margin: 0 auto 32px;
}
.pa-tracking-box {
  background: #1C2340; border-radius: 14px; padding: 24px 28px;
  max-width: 340px; margin: 0 auto 28px;
  position: relative; overflow: hidden;
}
.pa-tracking-box::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 4px; background: linear-gradient(180deg, #4F5BCB 0%, #1C2340 100%);
}
.pa-tracking-eyebrow {
  font-family: 'DM Sans', sans-serif; font-size: 8.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: white; margin-bottom: 8px;
}
.pa-tracking-number {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800;
  letter-spacing: .05em; color: #FFFFFF; line-height: 1;
}
.pa-success-desc {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC; line-height: 2; max-width: 420px; margin: 0 auto 36px;
  text-align: center;
}
.pa-success-desc span { color: #1C2340; border-bottom: 1.5px solid rgba(28,35,64,.2); padding-bottom: 1px; }

/* ── Footer ──────────────────────────────────────────────────────────── */
.pa-footer {
  border-top: 1px solid rgba(28,35,64,.07);
  padding: 20px 40px; text-align: center;
}
@media (max-width: 640px) { .pa-footer { padding: 16px 20px; } }
.pa-footer-copy {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: #9AA3CC;
}

/* ── Multi-file uploads style overrides ── */
.pa-file-tile-container {
  display: flex; flex-direction: column; gap: 8px;
  background: #FAFAFA; border: 1.5px dashed rgba(28,35,64,.15);
  border-radius: 12px; padding: 14px 16px; min-height: 90px;
  transition: all .18s;
}
.pa-file-tile-container.done {
  border-style: solid;
  border-color: rgba(5,150,105,.25); background: rgba(5,150,105,.02);
}
.pa-file-tile-header {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; margin-bottom: 6px;
}
.pa-file-title-group { display: flex; align-items: center; gap: 10px; min-width: 0; }
.pa-file-title-text {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 11.5px; font-weight: 600; color: #1C2340;
  line-height: 1.3;
}
.pa-file-tile-container.done .pa-file-title-text { color: #065F46; }
.pa-file-hint {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 10px; font-weight: 500; color: #9AA3CC;
  line-height: 1.4; margin-top: 1px;
}

.pa-upload-btn-label {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px;
  background: rgba(79,91,203,.08); border: 1px solid rgba(79,91,203,.15);
  color: #4F5BCB; font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; cursor: pointer; transition: all .18s;
  width: fit-content;
}
.pa-upload-btn-label:hover {
  background: #4F5BCB; color: #FFFFFF; border-color: #4F5BCB;
}

/* ── Empty-state dropzone — a full-width, obviously tappable action
   instead of a small pill button, since most applicants attach these
   via phone camera and need an unmissable primary target. ── */
.pa-upload-dropzone {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 10px 12px; border-radius: 10px;
  border: 1.5px dashed rgba(79,91,203,.35); background: rgba(79,91,203,.04);
  cursor: pointer; transition: all .18s; text-align: left;
}
.pa-upload-dropzone:hover { background: rgba(79,91,203,.09); border-color: rgba(79,91,203,.55); }
.pa-upload-dropzone-icon {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: rgba(79,91,203,.12); color: #4F5BCB;
  display: flex; align-items: center; justify-content: center;
}
.pa-upload-dropzone-text {
  font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 700;
  color: #4F5BCB; line-height: 1.4;
}

/* ── Inline thumbnails — seeing the actual photo you just took builds
   more confidence than a checkmark alone, without forcing a modal open. ── */
.pa-upload-thumbs-row { display: flex; align-items: center; gap: 6px; width: 100%; flex-wrap: wrap; }
.pa-upload-thumb-btn {
  width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
  border: 1px solid rgba(28,35,64,.1); overflow: hidden; padding: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF; color: #8A96BC; transition: border-color .15s;
}
.pa-upload-thumb-btn:hover { border-color: rgba(79,91,203,.45); }
.pa-upload-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pa-upload-thumb-more {
  width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
  background: rgba(28,35,64,.05); color: #5A6488;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
}
.pa-upload-add-more, .pa-upload-view-btn {
  width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
  border: 1px dashed rgba(28,35,64,.16); background: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #8A96BC; transition: all .15s;
}
.pa-upload-add-more { margin-left: auto; }
.pa-upload-view-btn { border-style: solid; }
.pa-upload-add-more:hover, .pa-upload-view-btn:hover { border-color: rgba(79,91,203,.45); color: #4F5BCB; background: rgba(79,91,203,.06); }

.pa-file-list {
  display: flex; flex-direction: column; gap: 6px; width: 100%;
  margin-top: 4px;
}
.pa-uploaded-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.08);
  border-radius: 8px; padding: 6px 10px;
}
.pa-uploaded-item-left {
  display: flex; align-items: center; gap: 8px; min-width: 0;
}
.pa-uploaded-thumb {
  width: 28px; height: 28px; border-radius: 6px; object-fit: cover;
  border: 1px solid rgba(0,0,0,.08); flex-shrink: 0;
}
.pa-uploaded-icon-fallback {
  width: 28px; height: 28px; border-radius: 6px;
  background: rgba(28,35,64,.05); border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  color: #8A96BC; flex-shrink: 0;
}
.pa-uploaded-name {
  font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500;
  color: #4A5070; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
}
.pa-remove-btn {
  background: none; border: none; color: #9CA3AF; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 4px; border-radius: 50%; transition: all .15s;
}
.pa-remove-btn:hover {
  background: rgba(220,38,38,.08); color: #DC2626;
}

/* ── Embedded use (Driver Portal New Unit / Renewal wizard) ──────────── */
/* Light horizontal version of the vertical stepper above (same dot, line and label treatment). */
.pa-hstep-list { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.pa-hstep { display: flex; align-items: center; gap: 12px; }
.pa-hstep-dot {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid #D5DAE7; background: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800; color: #8A96BC;
  transition: all .3s ease;
}
.pa-hstep-dot.active { background: #1C2340; border-color: #1C2340; color: #FFFFFF; box-shadow: 0 0 0 5px rgba(28,35,64,.10); }
.pa-hstep-dot.done { background: #4F5BCB; border-color: #4F5BCB; color: #FFFFFF; }
.pa-hstep-label {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #8A96BC;
}
.pa-hstep-label.active, .pa-hstep-label.done { color: #1C2340; }
.pa-hstep-line { width: 48px; height: 2px; border-radius: 2px; background: #D5DAE7; flex-shrink: 0; }
.pa-hstep-line.done { background: #4F5BCB; }
@media (max-width: 640px) { .pa-hstep-line { width: 24px; } }

/* White panel that gives the form the public page's clean white canvas inside a portal layout. */
.pa-panel {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 22px;
  padding: 32px 28px;
  box-shadow: 0 1px 2px 0 rgba(28,35,64,.04), 0 8px 32px -8px rgba(28,35,64,.10);
}
@media (max-width: 640px) { .pa-panel { padding: 24px 16px; border-radius: 18px; } }
/* Inside the portal the form uses the panel's full width (no centered narrow column). */
.pa-panel-inner { width: 100%; }

/* Read-only Tricycle Owner summary (the logged-in portal account). */
.pa-owner-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 14px;
  background: #F7F8FB; border: 1px solid rgba(28,35,64,.08);
  margin-top: 28px; margin-bottom: 16px;
}
.pa-owner-eyebrow {
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: #8A96BC;
}
.pa-owner-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #1C2340; margin-top: 3px; }
.pa-owner-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6B7597; margin-top: 3px; }
`;

// <input type="date"> value for "today" in local time (toISOString is UTC and can
// silently shift the boundary by a day).
export const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function validateVehicleInfo(data) {
    const errors = {};
    const currentYear = new Date().getFullYear();
    if (!String(data.plate_number || '').trim()) errors.plate_number = 'LTO plate number is required.';
    if (!String(data.make_model || '').trim()) errors.make_model = 'Motorcycle make & model is required.';
    if (!String(data.year_model).trim()) {
        errors.year_model = 'Year model is required.';
    } else {
        const year = parseInt(data.year_model, 10);
        if (Number.isNaN(year) || year < 1980 || year > currentYear + 1) {
            errors.year_model = `Enter a valid year between 1980 and ${currentYear + 1}.`;
        }
    }
    if (!String(data.body_color || '').trim()) errors.body_color = 'Body color is required.';
    if (!String(data.body_type || '').trim()) errors.body_type = 'Body type is required.';
    if (!String(data.engine_number || '').trim()) errors.engine_number = 'Engine number is required.';
    if (!String(data.chassis_number || '').trim()) errors.chassis_number = 'Chassis number is required.';
    if (!String(data.or_number || '').trim()) errors.or_number = 'LTO OR number is required.';
    if (!String(data.cr_number || '').trim()) errors.cr_number = 'LTO CR number is required.';
    return errors;
}

/** Separate Tricycle Driver fields — only required when the owner is NOT the driver. */
export function validateDriverInfo(data) {
    const errors = {};
    if (!data.owner_is_driver) {
        if (!String(data.driver_first_name || '').trim()) errors.driver_first_name = 'Driver first name is required.';
        if (!String(data.driver_last_name || '').trim()) errors.driver_last_name = 'Driver last name is required.';
        if (!data.driver_birthday) errors.driver_birthday = 'Driver birthday is required.';
        else if (data.driver_birthday > todayIso()) errors.driver_birthday = 'Birthday cannot be in the future.';
        if (!String(data.driver_contact || '').trim()) errors.driver_contact = 'Driver mobile number is required.';
        if (!data.driver_barangay) errors.driver_barangay = 'Please select the driver barangay.';
    }
    return errors;
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

export function Field({ label, children, className, error }) {
    return (
        <div className={className}>
            <label className="pa-label">{label}</label>
            {children}
            {error && <p className="pa-field-error">{error}</p>}
        </div>
    );
}

export function FileUpload({ id, label, hint, required, conditional, files = [], onUpload, onRemove }) {
    const [previewUrls, setPreviewUrls] = useState([]);
    const [showGallery, setShowGallery] = useState(false);
    const [activePreviewUrl, setActivePreviewUrl] = useState(null);
    const [showChoiceModal, setShowChoiceModal] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        const urls = files.map(file => {
            if (file) {
                return URL.createObjectURL(file);
            }
            return null;
        });
        setPreviewUrls(urls);
        return () => {
            urls.forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, [files]);

    useEffect(() => {
        if (showGallery || activePreviewUrl !== null || showChoiceModal || showCameraModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showGallery, activePreviewUrl, showChoiceModal, showCameraModal]);

    const startCamera = async () => {
        setCameraError(null);
        setShowChoiceModal(false);
        setShowCameraModal(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError("Camera access permission denied or camera not available on this device.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCameraModal(false);
        setCameraError(null);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const capturedFile = new File([blob], `captured_doc_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onUpload([capturedFile]);
                stopCamera();
            }
        }, 'image/jpeg', 0.9);
    };

    const isUploaded = files.length > 0;

    return (
        <div className={`pa-file-tile-container${isUploaded ? ' done' : ''}`}>
            <div className="pa-file-tile-header">
                <div className="pa-file-title-group">
                    <span className="pa-file-chip" aria-hidden="true">
                        {isUploaded ? <CheckCircle2 size={16} strokeWidth={2} /> : <FileText size={16} strokeWidth={2} />}
                    </span>
                    <span>
                        <span className="pa-file-title-text">{label}</span>
                        {hint && <span className="pa-file-hint">{hint}</span>}
                    </span>
                </div>
                <div className="pa-file-tags">
                    {isUploaded
                        ? <span className="pa-tag-done">✓ {files.length} File(s)</span>
                        : required
                            ? <span className="pa-tag-req">Required</span>
                            : conditional
                                ? <span className="pa-tag-opt">Optional</span>
                                : null
                    }
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                id={id}
                accept="image/*,.pdf"
                multiple
                className="sr-only"
                style={{ display: 'none' }}
                onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                        onUpload(e.target.files);
                        e.target.value = '';
                    }
                }}
            />

            {/* Empty state: one large, obvious tap target — not a small pill button. */}
            {!isUploaded && (
                <button type="button" className="pa-upload-dropzone" onClick={() => setShowChoiceModal(true)}>
                    <span className="pa-upload-dropzone-icon" aria-hidden="true"><Camera size={15} strokeWidth={2} /></span>
                    <span className="pa-upload-dropzone-text">Tap to add photo or PDF</span>
                </button>
            )}

            {/* Uploaded state: inline thumbnails for instant visual confirmation,
                plus quick add-more / full-gallery actions. */}
            {isUploaded && (
                <div className="pa-upload-thumbs-row">
                    {previewUrls.slice(0, 4).map((url, i) => (
                        <button
                            type="button"
                            key={i}
                            className="pa-upload-thumb-btn"
                            onClick={() => setActivePreviewUrl(url)}
                            title="View file"
                        >
                            {url && files[i]?.type?.startsWith('image/')
                                ? <img src={url} alt="" className="pa-upload-thumb-img" />
                                : <FileText size={14} strokeWidth={2} />}
                        </button>
                    ))}
                    {files.length > 4 && <span className="pa-upload-thumb-more">+{files.length - 4}</span>}
                    <button type="button" className="pa-upload-add-more" onClick={() => setShowChoiceModal(true)} title="Add another file">
                        <Upload size={13} strokeWidth={2.5} />
                    </button>
                    <button type="button" className="pa-upload-view-btn" onClick={() => setShowGallery(true)} title="View or remove uploaded files">
                        <Eye size={14} strokeWidth={2.5} />
                    </button>
                </div>
            )}

            {/* Choice Modal (Upload vs Take Picture) */}
            {showChoiceModal && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                    }}
                    onClick={() => setShowChoiceModal(false)}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '16px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px', fontWeight: 800, color: '#1C2340' }}>
                                Select Attachment Method
                            </h4>
                            <button type="button" onClick={() => setShowChoiceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <p style={{ margin: 0, fontSize: '12.5px', color: '#5A6488', fontFamily: "'Inter', sans-serif" }}>
                            Choose how you would like to attach <strong>{label}</strong>:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowChoiceModal(false);
                                    if (fileInputRef.current) fileInputRef.current.click();
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                    borderRadius: '12px', background: '#F8F9FC', border: '1.5px solid rgba(28,35,64,.08)',
                                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 700, color: '#1C2340',
                                    transition: 'all .15s'
                                }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(79,91,203,.1)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Upload size={18} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div>Upload File / Document</div>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A96BC', marginTop: '2px' }}>Browse photo or PDF from device</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={startCamera}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                    borderRadius: '12px', background: '#F8F9FC', border: '1.5px solid rgba(28,35,64,.08)',
                                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 700, color: '#1C2340',
                                    transition: 'all .15s'
                                }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5,150,105,.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={18} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div>Take a Picture</div>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#8A96BC', marginTop: '2px' }}>Snap photo directly using camera</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Live Camera Modal */}
            {showCameraModal && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                    }}
                    onClick={stopCamera}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '520px',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1C2340', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Camera size={18} color="#059669" /> Capture Photo ({label})
                            </span>
                            <button type="button" onClick={stopCamera} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ position: 'relative', background: '#000', width: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {cameraError ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#EF4444' }}>
                                    <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>{cameraError}</p>
                                    <label
                                        htmlFor={`cam_pub_fallback_${id}`}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px', background: '#DC2626', color: '#FFF',
                                            fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-block'
                                        }}
                                    >
                                        Open Device Camera App
                                    </label>
                                    <input
                                        type="file"
                                        id={`cam_pub_fallback_${id}`}
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                onUpload(e.target.files);
                                                stopCamera();
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }}
                                />
                            )}
                        </div>

                        {!cameraError && (
                            <div style={{ padding: '16px 20px', background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    style={{ padding: '10px 20px', borderRadius: '10px', background: '#E2E8F0', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    style={{
                                        padding: '12px 28px', borderRadius: '12px', background: '#059669', color: '#FFFFFF',
                                        border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px',
                                        display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(5,150,105,.3)'
                                    }}
                                >
                                    <Camera size={16} /> Snap Photo
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Gallery Modal overlay */}
            {showGallery && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
                    }}
                    onClick={() => setShowGallery(false)}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '500px',
                            maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1C2340', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Uploaded Documents ({files.length})
                            </span>
                            <button
                                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={() => setShowGallery(false)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#F9FAFB' }}>
                            {files.map((file, idx) => {
                                const isImg = file.type?.startsWith('image/');
                                const thumb = previewUrls[idx];
                                
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid rgba(28,35,64,.08)', borderRadius: '10px', padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                            {isImg && thumb ? (
                                                <img src={thumb} alt="Preview" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(0,0,0,.08)' }} />
                                            ) : (
                                                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(28,35,64,.05)', border: '1px solid rgba(28,35,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A96BC' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                                                </div>
                                            )}
                                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#4A5070', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {file.name}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                type="button"
                                                style={{ background: 'none', border: 'none', color: '#4F5BCB', cursor: 'pointer', padding: '4px' }}
                                                onClick={() => setActivePreviewUrl(thumb || previewUrls[idx])}
                                                title="View file"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                                            </button>
                                            <button
                                                type="button"
                                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px' }}
                                                onClick={() => {
                                                    onRemove(idx);
                                                    if (files.length <= 1) {
                                                        setShowGallery(false);
                                                    }
                                                }}
                                                title="Remove file"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Fullscreen Document Preview Modal */}
            {activePreviewUrl !== null && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
                    }}
                    onClick={() => setActivePreviewUrl(null)}
                >
                    <div
                        style={{
                            background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '800px',
                            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1C2340', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Document Preview
                            </span>
                            <button
                                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={() => setActivePreviewUrl(null)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                            {activePreviewUrl.includes('application/pdf') || files.find(f => previewUrls.indexOf(activePreviewUrl) !== -1)?.type === 'application/pdf' ? (
                                <iframe
                                    src={activePreviewUrl}
                                    style={{ width: '100%', height: '70vh', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    title="PDF Preview"
                                />
                            ) : (
                                <img
                                    src={activePreviewUrl}
                                    alt="Preview"
                                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}