import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, CheckCircle2, Camera, Eye, X, FileText, ChevronDown, RotateCcw } from 'lucide-react';
import {
    getVehicleYears,
    vehicleYears,
    VEHICLE_BODY_COLORS,
    vehicleBodyColors,
    VEHICLE_BODY_TYPES,
    vehicleBodyTypes,
    VEHICLE_DETAIL_FIELDS
} from '@/data/registrationRequirements';

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
    linear-gradient(165deg, rgba(18, 40, 102, 0.92) 0%, rgba(37, 68, 155, 0.86) 55%, rgba(15, 33, 85, 0.95) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover; background-position: center; background-repeat: no-repeat;
  color: #FFFFFF;
}
@media (max-width: 900px) { .pa-side { flex: 0 0 auto; padding: 36px 28px; border-radius: 0 0 28px 28px; } }

.pa-side-top { position: relative; z-index: 1; }
.pa-side-mid { position: relative; z-index: 1; margin-top: 36px; }
@media (max-width: 900px) { .pa-side-mid { margin-top: 22px; } }
.pa-side-bottom { position: relative; z-index: 1; margin-top: 28px; }
@media (max-width: 900px) { .pa-side-bottom { display: none; } }

.pa-side-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #FFFFFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  margin-bottom: 16px;
  width: fit-content;
  backdrop-filter: blur(4px);
}

.pa-page-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(24px, 2.6vw, 30px); font-weight: 800;
  letter-spacing: -.025em; color: #FFFFFF;
  line-height: 1.18; margin-top: 20px; margin-bottom: 10px;
}
@media (max-width: 900px) { .pa-page-title { margin-top: 14px; font-size: 21px; } }
.pa-page-sub {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 400;
  color: rgba(255,255,255,.82); line-height: 1.6; max-width: 320px;
}
@media (max-width: 900px) { .pa-page-sub { display: none; } }

.pa-side-note {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600;
  color: rgba(255,255,255,.65); line-height: 1.6;
  padding-top: 20px; border-top: 1px solid rgba(255,255,255,.14);
}

/* ── Vertical step list ───────────────────────────────────────────────── */
.pa-step-v-list { display: flex; flex-direction: column; }
@media (max-width: 900px) { .pa-step-v-list { flex-direction: row; align-items: flex-start; gap: 4px; } }

.pa-step-v { display: flex; gap: 14px; }
@media (max-width: 900px) { .pa-step-v { flex: 1; flex-direction: column; align-items: center; gap: 6px; } }

.pa-step-v-rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
@media (max-width: 900px) { .pa-step-v-rail { flex-direction: row; width: 100%; } }

.pa-step-v-dot {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.3);
  background: rgba(255,255,255,.1);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 800;
  color: rgba(255,255,255,.7);
  transition: all .3s ease;
}
.pa-step-v-dot.active { background: #FFFFFF; border-color: #FFFFFF; color: #25449B; box-shadow: 0 0 0 5px rgba(255,255,255,.24); }
.pa-step-v-dot.done { background: #25449B; border-color: #FFFFFF; color: #FFFFFF; }
.pa-step-v-line {
  width: 2px; flex: 1; min-height: 28px;
  background: rgba(255,255,255,.18); border-radius: 2px;
  transition: background .3s;
}
.pa-step-v-line.done { background: #FFFFFF; }
@media (max-width: 900px) { .pa-step-v-line { width: 100%; height: 2px; min-height: 0; flex: 1; margin-top: 16px; } }

.pa-step-v-text { padding-bottom: 28px; padding-top: 5px; }
@media (max-width: 900px) { .pa-step-v-text { display: none; } }
.pa-step-v-label {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700;
  letter-spacing: -0.01em; color: rgba(255,255,255,.65);
  transition: color .3s; margin-bottom: 3px;
}
.pa-step-v-label.active, .pa-step-v-label.done { color: #FFFFFF; font-weight: 800; }
.pa-step-v-desc { font-family: 'Inter', sans-serif; font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.5; max-width: 220px; }

/* ── Content pane (right) ────────────────────────────────────────────── */
.pa-content { flex: 1; display: grid; grid-template-rows: auto 1fr; min-width: 0; background: #FFFFFF; overflow: hidden; }
@media (max-width: 900px) { .pa-content { overflow: visible; } }
.pa-content-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 40px 0;
}
@media (max-width: 640px) { .pa-content-topbar { padding: 16px 20px 0; } }

.pa-topbar-logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: transform .2s ease;
}
.pa-topbar-logo:hover {
  transform: scale(1.02);
}
.pa-topbar-logo-img {
  height: 44px;
  width: auto;
  object-fit: contain;
  display: block;
}
@media (max-width: 640px) {
  .pa-topbar-logo-img {
    height: 36px;
  }
}

.pa-back-link {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700;
  color: #64748B; text-decoration: none; transition: color .18s ease, transform .18s ease;
  padding: 6px 0; background: transparent; border: none; box-shadow: none;
}
.pa-back-link:hover { color: #25449B; transform: translateX(-3px); }

.pa-content-center { display: flex; align-items: safe center; justify-content: center; padding: 28px 24px; overflow-y: auto; }
.pa-content-inner { width: 100%; max-width: 640px; }

/* ── Step card ───────────────────────────────────────────────────────── */
.pa-card { animation: paFadeUp .4s cubic-bezier(.2,0,.2,1) both; }
.pa-card--elevated {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 24px;
  padding: 52px 44px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
  max-width: 580px; margin: 40px auto;
}
@media (max-width: 640px) { .pa-card--elevated { padding: 36px 20px; margin: 20px auto; } }

/* ── Card heading ────────────────────────────────────────────────────── */
.pa-card-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 32px; gap: 16px;
}
.pa-card-icon {
  width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: #EFF6FF;
  border: 1.5px solid #D6E4FF;
  display: flex; align-items: center; justify-content: center;
  color: #25449B;
  box-shadow: 0 2px 8px rgba(37, 68, 155, 0.1);
}
.pa-card-top-text { display: flex; align-items: center; gap: 16px; }
.pa-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 26px; font-weight: 800;
  letter-spacing: -.025em; color: #0F172A;
  margin-bottom: 4px; line-height: 1.2;
}
.pa-card-sub {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 400;
  color: #64748B; line-height: 1.5;
}

/* ── Agreement scroll box ────────────────────────────────────────────── */
.pa-agree-scroll {
  height: 280px;
  overflow-y: auto;
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 22px 24px;
  margin-bottom: 20px;
  scroll-behavior: smooth;
}
.pa-agree-scroll::-webkit-scrollbar { width: 6px; }
.pa-agree-scroll::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 6px; }
.pa-agree-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 6px; }

.pa-agree-h {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #0F172A; margin-bottom: 6px; margin-top: 18px;
}
.pa-agree-h:first-child { margin-top: 0; }
.pa-agree-p {
  font-family: 'Inter', sans-serif;
  font-size: 13px; color: #334155;
  line-height: 1.7; margin-bottom: 10px; font-weight: 400;
}
.pa-agree-ol {
  padding-left: 20px; margin-bottom: 10px;
}
.pa-agree-ol li {
  font-family: 'Inter', sans-serif;
  font-size: 13px; color: #334155;
  line-height: 1.7; margin-bottom: 5px; font-weight: 400;
}

.pa-scroll-hint {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px; font-weight: 600;
  color: #25449B; text-align: center;
  background: #EFF6FF; border: 1px solid #BFDBFE;
  border-radius: 999px; padding: 6px 14px; width: fit-content;
  margin: 0 auto 18px;
}

/* ── Checkbox row ────────────────────────────────────────────────────── */
.pa-checkbox-row {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 18px 20px; border-radius: 14px;
  border: 1.5px solid #E2E8F0;
  background: #F8FAFC; margin-bottom: 28px;
  cursor: pointer; transition: all .18s;
}
.pa-checkbox-row:hover { border-color: #CBD5E1; background: #F1F5F9; }
.pa-checkbox-row.checked { border-color: #25449B; background: #EFF6FF; box-shadow: 0 0 0 1px #25449B; }
.pa-checkbox-row.locked { opacity: .55; cursor: not-allowed; }

.pa-checkbox {
  width: 22px; height: 22px; border-radius: 7px;
  border: 2px solid #94A3B8;
  background: #FFFFFF; flex-shrink: 0; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
  transition: all .18s;
}
.pa-checkbox.checked { background: #25449B; border-color: #25449B; box-shadow: 0 2px 6px rgba(37,68,155,0.35); }
.pa-checkbox-text {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 500;
  color: #334155; line-height: 1.6;
}
.pa-checkbox-text span { color: #0F172A; font-weight: 700; }

/* ── Field grid ──────────────────────────────────────────────────────── */
.pa-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
@media (max-width: 640px) { .pa-fields { grid-template-columns: 1fr; } }
.pa-field-full { grid-column: 1 / -1; }
.pa-label-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.pa-switch-btn {
  display: inline-flex; align-items: center; gap: 4px;
  background: none; border: none; padding: 0; cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 700;
  color: #25449B; text-transform: none;
  transition: color .15s;
}
.pa-switch-btn:hover { color: #1B3377; text-decoration: underline; }
.pa-other-field { animation: paFadeIn .18s ease-out; }
@keyframes paFadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Owner vs separate Tricycle Driver toggle ────────────────────────── */
.pa-toggle-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #F8FAFC; border: 1.5px solid #E2E8F0;
  border-radius: 14px; padding: 18px 20px; margin-bottom: 26px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.pa-toggle-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700; color: #0F172A;
}
.pa-toggle-hint { font-family: 'Inter', sans-serif; font-size: 12.5px; color: #64748B; margin-top: 3px; line-height: 1.5; }
.pa-toggle {
  display: inline-flex; align-items: center; gap: 10px;
  background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0;
}
.pa-toggle-track {
  width: 46px; height: 26px; border-radius: 999px;
  background: #CBD5E1; position: relative; transition: background .2s ease;
}
.pa-toggle.on .pa-toggle-track { background: #25449B; }
.pa-toggle-knob {
  position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,.25);
  transition: transform .2s ease;
}
.pa-toggle.on .pa-toggle-knob { transform: translateX(20px); }
.pa-toggle-answer {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px; font-weight: 800; color: #0F172A; min-width: 28px; text-align: left;
}

/* ── Conditional Tricycle Driver subsection (owner ≠ driver) ─────────── */
.pa-subsection {
  border: 1.5px dashed rgba(37,68,155,.35);
  background: #F8FAFF;
  border-radius: 16px; padding: 22px 22px 6px; margin-bottom: 32px;
}
.pa-subsection-head { margin-bottom: 18px; }
.pa-subsection-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
  color: #25449B;
}
.pa-subsection-sub { font-family: 'Inter', sans-serif; font-size: 12.5px; color: #64748B; margin-top: 3px; line-height: 1.55; }
.pa-subsection .pa-fields { margin-bottom: 24px; }

/* ── Field ───────────────────────────────────────────────────────────── */
.pa-label {
  display: flex; align-items: center; gap: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 700;
  letter-spacing: -0.01em;
  color: #1E293B; margin-bottom: 7px; padding-left: 1px;
}
.pa-input {
  width: 100%; height: 50px;
  border: 1.5px solid #CBD5E1;
  border-radius: 12px; background: #FFFFFF;
  padding: 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500; color: #0F172A;
  box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  outline: none; transition: all .2s ease;
}
.pa-input:hover { border-color: #94A3B8; box-shadow: 0 2px 4px 0 rgba(15, 23, 42, 0.06); }
.pa-input:focus {
  border-color: #25449B;
  box-shadow: 0 0 0 4px rgba(37, 68, 155, 0.14), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background: #FFFFFF;
}
.pa-input::placeholder { color: #94A3B8; font-weight: 400; opacity: 1; }

/* Icon-in-field variant ── */
.pa-input-wrap { position: relative; }
.pa-input-wrap .pa-input { padding-left: 44px; }
.pa-input-wrap-icon {
  position: absolute; left: 15px; top: 50%; transform: translateY(-50%);
  color: #64748B; pointer-events: none; display: flex; align-items: center;
  transition: color .2s, transform .2s;
}
.pa-input-wrap:focus-within .pa-input-wrap-icon { color: #25449B; transform: translateY(-50%) scale(1.08); }

.pa-select {
  width: 100%; height: 50px;
  border: 1.5px solid #CBD5E1;
  border-radius: 12px; background: #FFFFFF;
  padding: 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500; color: #0F172A;
  box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  outline: none; appearance: none; cursor: pointer;
  transition: all .2s ease;
}
.pa-select:hover { border-color: #94A3B8; box-shadow: 0 2px 4px 0 rgba(15, 23, 42, 0.06); }
.pa-select:focus {
  border-color: #25449B;
  box-shadow: 0 0 0 4px rgba(37, 68, 155, 0.14), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background: #FFFFFF;
}
.pa-select-wrap { position: relative; }
.pa-select-wrap svg {
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: #64748B; transition: color .2s;
}
.pa-select-wrap:focus-within svg { color: #25449B; }

/* ── Field-level validation error ───────────────────────────────────── */
.pa-input.pa-input-error, .pa-select.pa-input-error {
  border-color: #EF4444;
  background: #FEF2F2;
}
.pa-input.pa-input-error:focus, .pa-select.pa-input-error:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.14);
}
.pa-field-error {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px; font-weight: 600; color: #DC2626;
  margin-top: 6px; padding-left: 2px;
}

/* ── Action row ──────────────────────────────────────────────────────── */
.pa-actions { display: flex; gap: 12px; margin-top: 8px; }

/* ── Buttons ─────────────────────────────────────────────────────────── */
.pa-btn-primary {
  flex: 2; height: 52px; border-radius: 12px;
  border: none; background: #25449B; color: #FFFFFF;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 9px;
  transition: background .18s, box-shadow .18s, transform .12s;
  box-shadow: 0 4px 14px rgba(37,68,155,.28);
}
.pa-btn-primary:hover {
  background: #1B3377;
  box-shadow: 0 6px 20px rgba(37,68,155,.35);
  transform: translateY(-1px);
}
.pa-btn-submit,
.pa-btn-success {
  flex: 2; height: 52px; border-radius: 12px;
  border: none; background: #25449B; color: #FFFFFF;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 9px;
  transition: background .18s, box-shadow .18s, transform .12s;
  box-shadow: 0 4px 14px rgba(37,68,155,.28);
}
.pa-btn-submit:hover,
.pa-btn-success:hover {
  background: #1B3377;
  box-shadow: 0 6px 20px rgba(37,68,155,.38);
  transform: translateY(-1px);
}
.pa-btn-submit:active,
.pa-btn-success:active {
  transform: translateY(0);
}
.pa-btn-ghost {
  flex: 1; height: 52px; border-radius: 12px;
  border: 1.5px solid #CBD5E1; background: #FFFFFF; color: #334155;
  cursor: pointer; text-decoration: none;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: all .18s;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.pa-btn-ghost:hover { border-color: #94A3B8; color: #0F172A; background: #F8FAFC; transform: translateY(-1px); }

/* ── Live Requirements Progress Card ── */
.pa-req-progress-card {
  background: #F8FAFC; border: 1.5px solid #E2E8F0;
  border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;
  display: flex; flex-direction: column; gap: 12px;
}
.pa-req-progress-info {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.pa-req-progress-title {
  display: block; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px; font-weight: 800; color: #0F172A;
}
.pa-req-progress-sub {
  display: block; font-family: 'Inter', sans-serif;
  font-size: 12px; font-weight: 500; color: #64748B; margin-top: 2px;
}
.pa-req-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; font-weight: 700;
  padding: 5px 12px; border-radius: 9999px; white-space: nowrap;
}
.pa-req-badge--ready {
  background: #EFF6FF; color: #25449B; border: 1.5px solid #BFDBFE;
}
.pa-req-badge--pending {
  background: #FFFFFF; color: #475569; border: 1.5px solid #CBD5E1;
}
.pa-req-progress-bar {
  width: 100%; height: 8px; border-radius: 9999px; background: #E2E8F0; overflow: hidden;
}
.pa-req-progress-fill {
  height: 100%; border-radius: 9999px;
  background: linear-gradient(90deg, #25449B 0%, #3B82F6 100%);
  transition: width .35s ease;
}

/* Legacy progress fallback */
.pa-req-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.pa-req-progress-text {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; font-weight: 700;
  color: #475569; white-space: nowrap;
}

/* ── Sectioning ── */
.pa-docs-section { margin-bottom: 24px; }
.pa-docs-section-header { margin-bottom: 14px; }
.pa-docs-section-title {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 800;
  color: #0F172A;
}
.pa-docs-section-icon { color: #25449B; }
.pa-docs-count-pill {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;
  background: #EFF6FF; color: #25449B; border: 1px solid #DBEAFE;
}
.pa-docs-count-pill--opt {
  background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0;
}
.pa-docs-section-sub {
  font-family: 'Inter', sans-serif; font-size: 12.5px; color: #64748B; margin: 3px 0 0;
}

.pa-docs-subhead {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 800;
  letter-spacing: .05em; text-transform: uppercase; color: #64748B;
  margin: 28px 0 14px; padding-top: 24px; border-top: 1px dashed #CBD5E1;
}

/* ── File upload grid ── */
.pa-docs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; }
@media (max-width: 680px) { .pa-docs-grid { grid-template-columns: 1fr; } }

/* ── File upload tags & chips ── */
.pa-file-chip {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: #F1F5F9; border: 1.5px solid #E2E8F0;
  display: flex; align-items: center; justify-content: center;
  color: #64748B; transition: all .18s;
}
.pa-file-tile-container.done .pa-file-chip {
  background: #EFF6FF; border-color: #BFDBFE; color: #25449B;
}
.pa-file-tags { display: flex; gap: 6px; flex-shrink: 0; }
.pa-tag-req {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 700;
  color: #475569; background: #F1F5F9;
  border: 1px solid #CBD5E1; border-radius: 6px; padding: 2px 8px;
}
.pa-tag-opt {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 600;
  color: #64748B; background: #F8FAFC;
  border: 1px solid #E2E8F0; border-radius: 6px; padding: 2px 8px;
}
.pa-tag-done {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 700;
  color: #25449B; background: #EFF6FF;
  border: 1px solid #BFDBFE; border-radius: 6px; padding: 2px 8px;
}

/* ── Inspection reminder notice ────────────────────────────────────────── */
.pa-notice {
  display: flex; gap: 14px; align-items: flex-start;
  background: #F8FAFC; border: 1.5px solid #E2E8F0; border-left: 4px solid #25449B;
  border-radius: 12px; padding: 16px 20px; margin-top: 8px; margin-bottom: 26px;
}
.pa-notice-icon { color: #25449B; flex-shrink: 0; margin-top: 2px; }
.pa-notice-title {
  display: block; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 2px;
}
.pa-notice-text {
  font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500;
  color: #475569; line-height: 1.55; margin: 0;
}

/* ── Success card ────────────────────────────────────────────────────── */
.pa-success-icon {
  width: 88px; height: 88px; border-radius: 50%;
  background: #ECFDF5;
  border: 2px solid #A7F3D0;
  display: flex; align-items: center; justify-content: center;
  color: #059669; margin: 0 auto 28px;
  box-shadow: 0 4px 14px rgba(5,150,105,.18);
}
.pa-tracking-box {
  background: #0F172A; border-radius: 16px; padding: 24px 28px;
  max-width: 360px; margin: 0 auto 28px;
  position: relative; overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(15,23,42,0.25);
}
.pa-tracking-box::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 4px; background: linear-gradient(180deg, #25449B 0%, #122866 100%);
}
.pa-tracking-eyebrow {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: #94A3B8; margin-bottom: 8px;
}
.pa-tracking-number {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px; font-weight: 800;
  letter-spacing: .04em; color: #FFFFFF; line-height: 1;
}
.pa-success-desc {
  font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 400;
  color: #475569; line-height: 1.7; max-width: 440px; margin: 0 auto 36px;
  text-align: center;
}
.pa-success-desc span { color: #0F172A; font-weight: 700; }

/* ── Footer ──────────────────────────────────────────────────────────── */
.pa-footer {
  border-top: 1px solid #E2E8F0;
  padding: 20px 40px; text-align: center;
}
@media (max-width: 640px) { .pa-footer { padding: 16px 20px; } }
.pa-footer-copy {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600;
  color: #64748B;
}

/* ── Multi-file uploads style overrides ── */
.pa-file-tile-container {
  display: flex; flex-direction: column; justify-content: space-between; gap: 10px;
  background: #FFFFFF; border: 1.5px solid #E2E8F0;
  box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.03);
  border-radius: 14px; padding: 16px 18px; min-height: 102px;
  transition: all .2s ease;
}
.pa-file-tile-container:hover {
  border-color: #CBD5E1; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06); transform: translateY(-1px);
}
.pa-file-tile-container.done {
  border-style: solid;
  border-color: #25449B; background: #FAFCFF;
  box-shadow: 0 2px 8px rgba(37, 68, 155, 0.06);
}
.pa-file-tile-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  width: 100%;
}
.pa-file-title-group { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.pa-file-title-text {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 700; color: #0F172A;
  line-height: 1.35;
}
.pa-file-tile-container.done .pa-file-title-text { color: #0F172A; }
.pa-file-hint {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 12px; font-weight: 400; color: #64748B;
  line-height: 1.4; margin-top: 2px;
}

.pa-upload-btn-label {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px;
  background: #EFF6FF; border: 1px solid #BFDBFE;
  color: #25449B; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: normal; cursor: pointer; transition: all .18s;
  width: fit-content;
}
.pa-upload-btn-label:hover {
  background: #25449B; color: #FFFFFF; border-color: #25449B;
}

/* ── Empty-state dropzone ── */
.pa-upload-dropzone {
  display: flex; align-items: center; gap: 11px; width: 100%;
  padding: 10px 14px; border-radius: 10px;
  border: 1.5px dashed #CBD5E1; background: #F8FAFC;
  cursor: pointer; transition: all .18s ease; text-align: left;
}
.pa-upload-dropzone:hover { background: #EFF6FF; border-color: #25449B; }
.pa-upload-dropzone-icon {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: #FFFFFF; border: 1px solid #E2E8F0; color: #64748B;
  display: flex; align-items: center; justify-content: center;
  transition: all .18s ease;
}
.pa-upload-dropzone:hover .pa-upload-dropzone-icon {
  background: #25449B; color: #FFFFFF; border-color: #25449B;
}
.pa-upload-dropzone-text {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12.5px; font-weight: 700;
  color: #334155; line-height: 1.4; transition: color .18s ease;
}
.pa-upload-dropzone:hover .pa-upload-dropzone-text {
  color: #25449B;
}

/* ── Inline thumbnails ── */
.pa-upload-thumbs-row { display: flex; align-items: center; gap: 8px; width: 100%; flex-wrap: wrap; margin-top: 2px; }
.pa-upload-thumb-btn {
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  border: 1.5px solid #CBD5E1; overflow: hidden; padding: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF; color: #64748B; transition: border-color .15s;
}
.pa-upload-thumb-btn:hover { border-color: #25449B; }
.pa-upload-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pa-upload-thumb-more {
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  background: #F1F5F9; color: #475569;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700;
}
.pa-upload-add-more, .pa-upload-view-btn {
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  border: 1.5px dashed #CBD5E1; background: #FFFFFF; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748B; transition: all .15s;
}
.pa-upload-add-more { margin-left: auto; }
.pa-upload-view-btn { border-style: solid; border-color: #E2E8F0; }
.pa-upload-add-more:hover, .pa-upload-view-btn:hover { border-color: #25449B; color: #25449B; background: #EFF6FF; }

.pa-file-list {
  display: flex; flex-direction: column; gap: 6px; width: 100%;
  margin-top: 4px;
}
.pa-uploaded-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #FFFFFF; border: 1px solid #E2E8F0;
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
  background: #F1F5F9; border: 1px solid #E2E8F0;
  display: flex; align-items: center; justify-content: center;
  color: #64748B; flex-shrink: 0;
}
.pa-uploaded-name {
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
  color: #334155; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
}
.pa-remove-btn {
  background: none; border: none; color: #94A3B8; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 4px; border-radius: 50%; transition: all .15s;
}
.pa-remove-btn:hover {
  background: rgba(220,38,38,.08); color: #DC2626;
}

/* ── Embedded use (Driver Portal New Unit / Renewal wizard) ──────────── */
.pa-hstep-list { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.pa-hstep { display: flex; align-items: center; gap: 12px; }
.pa-hstep-dot {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid #CBD5E1; background: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 800; color: #64748B;
  transition: all .3s ease;
}
.pa-hstep-dot.active { background: #25449B; border-color: #25449B; color: #FFFFFF; box-shadow: 0 0 0 5px rgba(37,68,155,.14); }
.pa-hstep-dot.done { background: #25449B; border-color: #25449B; color: #FFFFFF; }
.pa-hstep-label {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 700;
  color: #64748B;
}
.pa-hstep-label.active, .pa-hstep-label.done { color: #0F172A; font-weight: 800; }
.pa-hstep-line { width: 48px; height: 2px; border-radius: 2px; background: #CBD5E1; flex-shrink: 0; }
.pa-hstep-line.done { background: #25449B; }
@media (max-width: 640px) { .pa-hstep-line { width: 24px; } }

.pa-panel {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 22px;
  padding: 32px 28px;
  box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04);
}
@media (max-width: 640px) { .pa-panel { padding: 24px 16px; border-radius: 18px; } }
.pa-panel-inner { width: 100%; }

.pa-owner-card {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 20px; border-radius: 14px;
  background: #F8FAFC; border: 1.5px solid #E2E8F0;
  margin-top: 28px; margin-bottom: 16px;
}
.pa-owner-eyebrow {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; color: #64748B;
}
.pa-owner-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 800; color: #0F172A; margin-top: 3px; }
.pa-owner-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; margin-top: 3px; }
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

    if (!String(data.year_model || '').trim()) {
        errors.year_model = 'Please select a year model.';
    } else {
        const year = parseInt(data.year_model, 10);
        if (Number.isNaN(year) || year < 2000 || year > currentYear) {
            errors.year_model = `Please select a valid year between 2000 and ${currentYear}.`;
        }
    }

    if (!String(data.body_color || '').trim()) {
        errors.body_color = 'Please select a body color.';
    } else if (data.body_color === 'Other' && !String(data.body_color_other || '').trim()) {
        errors.body_color_other = 'Please specify body color.';
    }

    if (!String(data.body_type || '').trim()) {
        errors.body_type = 'Please select a body type.';
    } else if (data.body_type === 'Other' && !String(data.body_type_other || '').trim()) {
        errors.body_type_other = 'Please specify body type.';
    }

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

        const cleanContact = String(data.driver_contact || '').trim();
        if (!cleanContact) {
            errors.driver_contact = 'Driver mobile number is required.';
        } else if (!/^09\d{9}$/.test(cleanContact)) {
            errors.driver_contact = 'Driver mobile number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).';
        }

        if (!data.driver_barangay) errors.driver_barangay = 'Please select the driver barangay.';
    }
    return errors;
}

/**
 * Mobile number input helpers — ensures numbers only, prevents letters/symbols,
 * handles paste, and restricts to max 11 digits.
 */
export const handleMobileKeyDown = (e) => {
    const allowed = [
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End'
    ];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
    }
};

export const sanitizeMobileNumber = (val) => {
    return String(val || '').replace(/\D/g, '').slice(0, 11);
};

export const handleMobilePaste = (e, onCleanValue) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const clean = sanitizeMobileNumber(paste);
    onCleanValue(clean);
};

/**
 * Password strength calculation considering:
 * - minimum length (8+)
 * - uppercase and lowercase
 * - numbers
 * - special characters
 * States: Weak, Medium, Strong
 */
export function calculatePasswordStrength(pass) {
    if (!pass) return { score: 0, label: '', color: '', percent: 0 };
    const len = pass.length;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);

    let score = 0;
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (hasUpper && hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    if (len < 8 || score <= 2) {
        return { score: 1, label: 'Weak', color: '#DC2626', percent: 33 };
    }
    if (score <= 3 || !(hasUpper && hasLower && (hasNumber || hasSpecial))) {
        return { score: 2, label: 'Medium', color: '#D97706', percent: 66 };
    }
    return { score: 3, label: 'Strong', color: '#059669', percent: 100 };
}

/**
 * Compact, professional password-strength meter
 */
export function PasswordStrengthMeter({ password }) {
    if (!password) return null;
    const strength = calculatePasswordStrength(password);

    return (
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Password Strength
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: strength.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {strength.label}
                </span>
            </div>
            <div style={{ display: 'flex', gap: '5px', height: '5px' }}>
                <div style={{ flex: 1, borderRadius: '3px', background: strength.score >= 1 ? strength.color : '#E2E8F0', transition: 'background 0.2s' }} />
                <div style={{ flex: 1, borderRadius: '3px', background: strength.score >= 2 ? strength.color : '#E2E8F0', transition: 'background 0.2s' }} />
                <div style={{ flex: 1, borderRadius: '3px', background: strength.score >= 3 ? strength.color : '#E2E8F0', transition: 'background 0.2s' }} />
            </div>
        </div>
    );
}

/**
 * Shared Vehicle Specs form fields — used by both Public Registration (New Unit)
 * and Driver Portal MTOP Wizard (Renewal & New Unit) so options and behaviors remain strictly unified.
 */
export function VehicleSpecsFields({ data, setData, fieldError, markTouched, years, colors, bodyTypes }) {
    const currentYears = years || vehicleYears;
    const currentColorList = colors || vehicleBodyColors;
    const currentBodyTypeList = bodyTypes || vehicleBodyTypes;

    const colorSelectRef = useRef(null);
    const bodyTypeSelectRef = useRef(null);

    const handleSwitchToColorDropdown = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (typeof setData === 'function') {
            try {
                setData({ body_color: '', body_color_other: '' });
            } catch {
                setData('body_color', '');
                setData('body_color_other', '');
            }
        }
        setTimeout(() => {
            if (colorSelectRef.current) {
                colorSelectRef.current.focus();
                if (typeof colorSelectRef.current.showPicker === 'function') {
                    try {
                        colorSelectRef.current.showPicker();
                    } catch {}
                }
            }
        }, 50);
    };

    const handleSwitchToBodyTypeDropdown = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (typeof setData === 'function') {
            try {
                setData({ body_type: '', body_type_other: '' });
            } catch {
                setData('body_type', '');
                setData('body_type_other', '');
            }
        }
        setTimeout(() => {
            if (bodyTypeSelectRef.current) {
                bodyTypeSelectRef.current.focus();
                if (typeof bodyTypeSelectRef.current.showPicker === 'function') {
                    try {
                        bodyTypeSelectRef.current.showPicker();
                    } catch {}
                }
            }
        }, 50);
    };

    return (
        <div className="pa-fields">
            {/* LTO Plate Number (Headline field spanning row 1) */}
            <Field label="LTO Plate Number" error={fieldError('plate_number')} className="pa-field-full">
                <input
                    className={`pa-input${fieldError('plate_number') ? ' pa-input-error' : ''}`}
                    placeholder="e.g. AAA-1234"
                    autoComplete="off"
                    value={data.plate_number || ''}
                    onChange={e => setData('plate_number', e.target.value)}
                    onBlur={() => markTouched('plate_number')}
                />
            </Field>

            {/* Motorcycle Make & Model + Year Model (Row 2) */}
            <Field label="Motorcycle Make & Model" error={fieldError('make_model')}>
                <input
                    className={`pa-input${fieldError('make_model') ? ' pa-input-error' : ''}`}
                    placeholder="e.g. Honda TMX 125"
                    autoComplete="off"
                    value={data.make_model || ''}
                    onChange={e => setData('make_model', e.target.value)}
                    onBlur={() => markTouched('make_model')}
                />
            </Field>

            <Field label="Year Model" error={fieldError('year_model')}>
                <div className="pa-select-wrap">
                    <select
                        className={`pa-select${fieldError('year_model') ? ' pa-input-error' : ''}`}
                        value={data.year_model || ''}
                        onChange={e => setData('year_model', e.target.value)}
                        onBlur={() => markTouched('year_model')}
                    >
                        <option value="">Select Year Model</option>
                        {currentYears.map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                        ))}
                    </select>
                    <ChevronDown size={15} strokeWidth={2} />
                </div>
            </Field>

            {/* Body Color & Body Type (Row 3 - Same Row, In-Place Transform) */}
            {data.body_color === 'Other' ? (
                <Field
                    label="Body Color (Custom)"
                    action={
                        <button
                            type="button"
                            className="pa-switch-btn"
                            onClick={handleSwitchToColorDropdown}
                            title="Switch back to standard color list"
                        >
                            <RotateCcw size={10} strokeWidth={2.4} />
                            <span>Choose from list</span>
                        </button>
                    }
                    error={fieldError('body_color_other') || fieldError('body_color')}
                    className="pa-other-field"
                >
                    <input
                        className={`pa-input${(fieldError('body_color_other') || fieldError('body_color')) ? ' pa-input-error' : ''}`}
                        placeholder="Type custom body color (e.g. Matte Black)"
                        autoComplete="off"
                        autoFocus
                        value={data.body_color_other || ''}
                        onChange={e => setData('body_color_other', e.target.value)}
                        onBlur={() => {
                            markTouched('body_color');
                            markTouched('body_color_other');
                        }}
                    />
                </Field>
            ) : (
                <Field label="Body Color" error={fieldError('body_color')}>
                    <div className="pa-select-wrap">
                        <select
                            ref={colorSelectRef}
                            className={`pa-select${fieldError('body_color') ? ' pa-input-error' : ''}`}
                            value={data.body_color || ''}
                            onChange={e => {
                                const val = e.target.value;
                                setData('body_color', val);
                                if (val !== 'Other') {
                                    setData('body_color_other', '');
                                }
                            }}
                            onBlur={() => markTouched('body_color')}
                        >
                            <option value="">Select Body Color</option>
                            {currentColorList.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <ChevronDown size={15} strokeWidth={2} />
                    </div>
                </Field>
            )}

            {data.body_type === 'Other' ? (
                <Field
                    label="Body Type (Custom)"
                    action={
                        <button
                            type="button"
                            className="pa-switch-btn"
                            onClick={handleSwitchToBodyTypeDropdown}
                            title="Switch back to standard body type list"
                        >
                            <RotateCcw size={10} strokeWidth={2.4} />
                            <span>Choose from list</span>
                        </button>
                    }
                    error={fieldError('body_type_other') || fieldError('body_type')}
                    className="pa-other-field"
                >
                    <input
                        className={`pa-input${(fieldError('body_type_other') || fieldError('body_type')) ? ' pa-input-error' : ''}`}
                        placeholder="Type custom body type (e.g. Extended Sidecar)"
                        autoComplete="off"
                        autoFocus
                        value={data.body_type_other || ''}
                        onChange={e => setData('body_type_other', e.target.value)}
                        onBlur={() => {
                            markTouched('body_type');
                            markTouched('body_type_other');
                        }}
                    />
                </Field>
            ) : (
                <Field label="Body Type" error={fieldError('body_type')}>
                    <div className="pa-select-wrap">
                        <select
                            ref={bodyTypeSelectRef}
                            className={`pa-select${fieldError('body_type') ? ' pa-input-error' : ''}`}
                            value={data.body_type || ''}
                            onChange={e => {
                                const val = e.target.value;
                                setData('body_type', val);
                                if (val !== 'Other') {
                                    setData('body_type_other', '');
                                }
                            }}
                            onBlur={() => markTouched('body_type')}
                        >
                            <option value="">Select Body Type</option>
                            {currentBodyTypeList.map(bt => (
                                <option key={bt} value={bt}>{bt}</option>
                            ))}
                        </select>
                        <ChevronDown size={15} strokeWidth={2} />
                    </div>
                </Field>
            )}

            {/* Engine Number */}
            <Field label="Engine Number" error={fieldError('engine_number')}>
                <input
                    className={`pa-input${fieldError('engine_number') ? ' pa-input-error' : ''}`}
                    placeholder="e.g. ENG-123456"
                    autoComplete="off"
                    value={data.engine_number || ''}
                    onChange={e => setData('engine_number', e.target.value)}
                    onBlur={() => markTouched('engine_number')}
                />
            </Field>

            {/* Chassis Number */}
            <Field label="Chassis Number" error={fieldError('chassis_number')}>
                <input
                    className={`pa-input${fieldError('chassis_number') ? ' pa-input-error' : ''}`}
                    placeholder="e.g. CHS-123456"
                    autoComplete="off"
                    value={data.chassis_number || ''}
                    onChange={e => setData('chassis_number', e.target.value)}
                    onBlur={() => markTouched('chassis_number')}
                />
            </Field>

            {/* LTO OR Number */}
            <Field label="LTO OR Number" error={fieldError('or_number')}>
                <input
                    className={`pa-input${fieldError('or_number') ? ' pa-input-error' : ''}`}
                    placeholder="e.g. OR-12345678"
                    autoComplete="off"
                    value={data.or_number || ''}
                    onChange={e => setData('or_number', e.target.value)}
                    onBlur={() => markTouched('or_number')}
                />
            </Field>

            {/* LTO CR Number */}
            <Field label="LTO CR Number" error={fieldError('cr_number')}>
                <input
                    className={`pa-input${fieldError('cr_number') ? ' pa-input-error' : ''}`}
                    placeholder="e.g. CR-12345678"
                    autoComplete="off"
                    value={data.cr_number || ''}
                    onChange={e => setData('cr_number', e.target.value)}
                    onBlur={() => markTouched('cr_number')}
                />
            </Field>
        </div>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

export function Field({ label, action, children, className, error }) {
    return (
        <div className={className}>
            {action ? (
                <div className="pa-label-row" style={{ marginBottom: '8px' }}>
                    <span className="pa-label" style={{ marginBottom: 0 }}>{label}</span>
                    {action}
                </div>
            ) : (
                <label className="pa-label">{label}</label>
            )}
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
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,68,155,.1)', color: '#25449B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#25449B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                <Camera size={18} color="#25449B" /> Capture Photo ({label})
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
                                        padding: '12px 28px', borderRadius: '12px', background: '#25449B', color: '#FFFFFF',
                                        border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px',
                                        display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(37,68,155,.28)'
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
                                                style={{ background: 'none', border: 'none', color: '#25449B', cursor: 'pointer', padding: '4px' }}
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