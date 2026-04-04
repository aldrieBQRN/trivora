import React, { useState, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import {
    ChevronRight, Upload, ShieldCheck, CreditCard,
    Info, CheckCircle2, MapPin, Smartphone, Wallet,
    Check, Loader2, ArrowRight, ArrowLeft, Bike, Wifi
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Public Apply / MTOP Registration Wizard
   5-Step Flow: Agreement → Operator → Vehicle → Documents → Payment
   Matches Welcome.jsx design system: Plus Jakarta Sans · Inter · DM Sans
   Palette: Navy #1C2340 · Indigo accent #4F5BCB · Slate bg #EDEEF4
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.pa-root *, .pa-root *::before, .pa-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.pa-root {
  font-family: 'Inter', sans-serif;
  background: #EDEEF4;
  color: #1C2340;
  min-height: 100vh;
  display: flex; flex-direction: column;
  overflow-x: hidden;
}

/* ── Hero backdrop ────────────────────────────────────────────────────── */
.pa-hero-backdrop {
  position: absolute; top: 0; left: 0; width: 100%;
  height: 460px;
  background: #1C2340;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
  z-index: 0;
  overflow: hidden;
}
.pa-hero-backdrop::after {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 60% 80% at 80% 20%, rgba(79,91,203,.18) 0%, transparent 70%),
    radial-gradient(ellipse 40% 60% at 10% 80%, rgba(79,91,203,.10) 0%, transparent 70%);
  pointer-events: none;
}
.pa-hero-backdrop::before {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

/* ── Constraint wrapper ──────────────────────────────────────────────── */
.pa-wrap {
  max-width: 1200px; margin: 0 auto;
  padding: 0 32px; width: 100%;
}
@media (max-width: 640px) { .pa-wrap { padding: 0 20px; } }

/* ── Header ──────────────────────────────────────────────────────────── */
.pa-header {
  height: 80px;
  display: flex; align-items: center; justify-content: space-between;
  position: relative; z-index: 10;
}
.pa-logo { display: flex; align-items: center; gap: 14px; text-decoration: none; }
.pa-logo-img-wrap {
  height: 46px; width: auto; border-radius: 10px;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
  display: flex; align-items: center; justify-content: center;
  padding: 6px 10px; flex-shrink: 0;
  transition: box-shadow .2s;
}
.pa-logo:hover .pa-logo-img-wrap { box-shadow: 0 4px 16px rgba(0,0,0,.22); }
.pa-logo-img {
  height: 30px; width: auto; object-fit: contain; display: block;
}
.pa-logo-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px; font-weight: 800;
  letter-spacing: -.02em; color: #FFFFFF;
  line-height: 1; margin-bottom: 4px;
}
.pa-logo-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: rgba(255,255,255,.35); line-height: 1;
}
.pa-header-link {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.5); text-decoration: none;
  transition: color .18s;
}
.pa-header-link:hover { color: #FFFFFF; }

/* ── Page heading band ───────────────────────────────────────────────── */
.pa-page-head {
  position: relative; z-index: 10;
  padding-bottom: 64px; text-align: center;
}
.pa-page-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 14px; border-radius: 50px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  margin-bottom: 18px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .17em; text-transform: uppercase;
  color: rgba(255,255,255,.55);
}
.pa-page-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 4vw, 42px); font-weight: 800;
  letter-spacing: -.03em; color: #FFFFFF;
  line-height: 1.1; margin-bottom: 12px;
}
.pa-page-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.35);
}

/* ── Progress tracker ────────────────────────────────────────────────── */
.pa-progress {
  display: flex; align-items: center; justify-content: center;
  gap: 0; margin-bottom: 40px;
  position: relative; z-index: 10;
}
.pa-step {
  display: flex; align-items: center; gap: 0;
}
.pa-step-node {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  position: relative; z-index: 2;
}
.pa-step-dot {
  width: 36px; height: 36px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 800;
  color: rgba(255,255,255,.4);
  transition: all .3s ease;
}
.pa-step-dot.active {
  background: #FFFFFF;
  border-color: #FFFFFF;
  color: #1C2340;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
}
.pa-step-dot.done {
  background: #4F5BCB;
  border-color: #4F5BCB;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(79,91,203,.4);
}
.pa-step-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: rgba(255,255,255,.35); transition: color .3s;
  white-space: nowrap;
}
.pa-step-label.active { color: #FFFFFF; }
.pa-step-label.done   { color: rgba(255,255,255,.6); }
.pa-step-line {
  width: 64px; height: 2px;
  background: rgba(255,255,255,.1);
  margin: 0 4px; margin-bottom: 24px;
  border-radius: 2px; overflow: hidden;
  transition: background .3s;
}
.pa-step-line.done { background: #4F5BCB; }
@media (max-width: 640px) { .pa-step-line { width: 24px; } }

/* ── Step card ───────────────────────────────────────────────────────── */
.pa-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 20px;
  padding: 44px 48px;
  box-shadow: 0 4px 24px rgba(28,35,64,.08);
  max-width: 780px; margin: 0 auto;
  animation: paFadeUp .4s cubic-bezier(.2,0,.2,1) both;
}
@media (max-width: 640px) { .pa-card { padding: 28px 20px; } }
@keyframes paFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Card heading ────────────────────────────────────────────────────── */
.pa-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 26px; font-weight: 800;
  letter-spacing: -.025em; color: #1C2340;
  margin-bottom: 6px; line-height: 1;
}
.pa-card-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 36px;
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
  display: flex; align-items: center; justify-content: center; gap: 6px;
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
.pa-input::placeholder { color: #9AA3CC; font-weight: 400; }

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
.pa-btn-primary:hover:not(:disabled) {
  background: #2E3A9E;
  box-shadow: 0 6px 20px rgba(28,35,64,.3);
  transform: translateY(-1px);
}
.pa-btn-primary:disabled {
  background: rgba(28,35,64,.15); color: rgba(28,35,64,.35);
  box-shadow: none; cursor: not-allowed; transform: none;
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
.pa-btn-success:hover:not(:disabled) {
  background: #047857;
  box-shadow: 0 6px 20px rgba(5,150,105,.3);
  transform: translateY(-1px);
}
.pa-btn-success:disabled {
  background: rgba(28,35,64,.15); color: rgba(28,35,64,.35);
  box-shadow: none; cursor: not-allowed;
}
.pa-btn-ghost {
  flex: 1; height: 52px; border-radius: 12px;
  border: 1.5px solid rgba(28,35,64,.14); background: #FFFFFF; color: #4A5070;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: border-color .18s, background .18s, color .18s;
}
.pa-btn-ghost:hover { border-color: rgba(28,35,64,.25); color: #1C2340; background: #FAFAFA; }
.pa-btn-ghost:disabled { opacity: .45; cursor: not-allowed; }

/* ── File upload grid ────────────────────────────────────────────────── */
.pa-docs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
@media (max-width: 640px) { .pa-docs-grid { grid-template-columns: 1fr; } }

/* ── File upload tile ────────────────────────────────────────────────── */
.pa-file-tile {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px dashed rgba(28,35,64,.15);
  background: #FAFAFA;
  cursor: pointer; transition: all .18s;
  min-height: 72px;
}
.pa-file-tile:hover { border-color: rgba(79,91,203,.3); background: #FFFFFF; }
.pa-file-tile.done {
  border-style: solid;
  border-color: rgba(5,150,105,.25); background: rgba(5,150,105,.03);
}
.pa-file-info { flex: 1; min-width: 0; }
.pa-file-name {
  font-family: 'Inter', sans-serif;
  font-size: 11.5px; font-weight: 600; color: #1C2340;
  line-height: 1.3; margin-bottom: 6px;
}
.pa-file-tile.done .pa-file-name { color: #065F46; }
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
.pa-file-icon-wrap {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: rgba(28,35,64,.06); border: 1px solid rgba(28,35,64,.09);
  display: flex; align-items: center; justify-content: center;
  color: #8A96BC; transition: all .18s;
}
.pa-file-tile:hover .pa-file-icon-wrap { background: rgba(79,91,203,.08); border-color: rgba(79,91,203,.15); color: #4F5BCB; }
.pa-file-tile.done .pa-file-icon-wrap { background: rgba(5,150,105,.1); border-color: rgba(5,150,105,.2); color: #059669; }
.pa-file-thumb { width: 38px; height: 38px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(5,150,105,.2); flex-shrink: 0; }

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

/* ── IoT notice ──────────────────────────────────────────────────────── */
.pa-iot-notice {
  display: flex; gap: 14px; align-items: flex-start;
  background: rgba(79,91,203,.05); border: 1px solid rgba(79,91,203,.18);
  border-radius: 12px; padding: 16px 18px; margin-bottom: 28px;
}
.pa-iot-notice-icon { color: #4F5BCB; flex-shrink: 0; margin-top: 1px; }
.pa-iot-notice-text {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #2D3690; line-height: 1.9;
}

/* ── Fee breakdown ───────────────────────────────────────────────────── */
.pa-fee-box {
  background: #FAFAFA; border: 1.5px solid rgba(28,35,64,.1);
  border-radius: 14px; padding: 0; overflow: hidden; margin-bottom: 28px;
}
.pa-fee-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid rgba(28,35,64,.06);
}
.pa-fee-row:last-child { border-bottom: none; }
.pa-fee-row.iot { background: rgba(79,91,203,.03); }
.pa-fee-label {
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: #5A6488; display: flex; align-items: center; gap: 8px;
}
.pa-fee-badge {
  font-family: 'DM Sans', sans-serif; font-size: 7.5px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 5px;
  background: rgba(79,91,203,.1); color: #4F5BCB;
  border: 1px solid rgba(79,91,203,.2);
}
.pa-fee-amount {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 800;
  color: #1C2340; letter-spacing: -.01em;
}
.pa-fee-total {
  background: #1C2340;
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px;
}
.pa-fee-total-label {
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: rgba(255,255,255,.5);
}
.pa-fee-total-amount {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  letter-spacing: -.025em; color: #FFFFFF; line-height: 1;
}

/* ── Payment method buttons ──────────────────────────────────────────── */
.pa-pay-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
.pa-pay-method {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 22px 12px; border-radius: 14px;
  border: 1.5px solid rgba(28,35,64,.12); background: #FFFFFF; cursor: pointer;
  transition: all .18s; box-shadow: 0 1px 4px rgba(28,35,64,.05);
}
.pa-pay-method:hover { border-color: rgba(79,91,203,.3); box-shadow: 0 4px 16px rgba(28,35,64,.09); }
.pa-pay-method.active { border-color: #1C2340; background: #F8F9FC; box-shadow: 0 4px 16px rgba(28,35,64,.14); }
.pa-pay-icon { color: #8A96BC; transition: color .18s; }
.pa-pay-method:hover .pa-pay-icon { color: #4F5BCB; }
.pa-pay-method.active .pa-pay-icon { color: #1C2340; }
.pa-pay-label {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; transition: color .18s;
}
.pa-pay-method:hover .pa-pay-label { color: #4F5BCB; }
.pa-pay-method.active .pa-pay-label { color: #1C2340; }
.pa-pay-check {
  width: 18px; height: 18px; border-radius: 50%; background: #1C2340;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(.6); transition: all .2s;
}
.pa-pay-method.active .pa-pay-check { opacity: 1; transform: scale(1); }

/* ── Success card ────────────────────────────────────────────────────── */
.pa-success-icon {
  width: 88px; height: 88px; border-radius: 50%;
  background: rgba(5,150,105,.08); border: 2px solid rgba(5,150,105,.2);
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
  color: rgba(255,255,255,.35); margin-bottom: 8px;
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
.pa-footer { background: #FFFFFF; border-top: 1px solid rgba(28,35,64,.07); margin-top: auto; }
.pa-footer-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 22px 0; flex-wrap: wrap;
}
.pa-footer-copy {
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: #9AA3CC;
}
`;

export default function PublicApply() {
    const [step, setStep] = useState(1);
    const [agreed, setAgreed] = useState(false);
    const [scrolledTerms, setScrolledTerms] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const fees = [
        { label: 'Police Clearance / OR from LGU',  price: 150 },
        { label: 'Health Certificate (Driver)',       price: 55  },
        { label: 'Cedula (Municipal Treasurer)',      price: 40  },
        { label: 'Application & Filing Fee',          price: 250 },
        { label: 'IoT Tracking Device (GPS Unit)',    price: 500, iot: true },
    ];
    const total = fees.reduce((acc, curr) => acc + curr.price, 0);

    const nasugbuBarangays = [
        'Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Poblacion 4',
        'Wawa', 'Papaya', 'Bucana', 'Lumbangan', 'Pantalan', 'Bilaran', 'Cogunan',
    ];

    const documentList = [
        { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)',                         conditional: true  },
        { id: 'orcr',      label: 'Xerox OR/CR',                                           required:    true  },
        { id: 'receipt',   label: 'Delivery Receipt (Kung walang OR/CR / New)',            conditional: true  },
        { id: 'license',   label: "Driver's License Back-to-back (Prof/Restriction 1/A1)", required:    true  },
        { id: 'brgy',      label: 'Barangay Clearance (Original)',                         required:    true  },
        { id: 'toda',      label: 'TODA/NAFTODA/ACTODAN Clearance (Original)',             required:    true  },
        { id: 'driver_id', label: "Driver's ID Issued by NAFTODA/ACTODAN",                required:    true  },
        { id: 'tariff',    label: 'List of Existing Tariff Fee (For sidecar)',             required:    true  },
        { id: 'auth',      label: "Authorization Letter & ID (Kung hindi may-ari)",       conditional: true  },
    ];

    const { data, setData } = useForm({
        first_name: '', last_name: '', contact: '', barangay: 'Wawa',
        make_model: '', engine_number: '', chassis_number: '', toda: 'A',
        documents: {},
    });

    const next = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
    const back = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };

    const handleFileUpload  = (docId, file) => setData('documents', { ...data.documents, [docId]: file });
    const requiredDocsIds   = documentList.filter(d => d.required).map(d => d.id);
    const hasAllRequired    = requiredDocsIds.every(id => !!data.documents[id]);

    const handleTermsScroll = (e) => {
        const el = e.target;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
            setScrolledTerms(true);
        }
    };

    const submitApplication = () => {
        setIsProcessingPayment(true);
        setTimeout(() => { setIsProcessingPayment(false); next(); }, 2000);
    };

    const steps = ['Agreement', 'Operator', 'Vehicle', 'Documents', 'Payment'];

    return (
        <div className="pa-root">
            <Head title="MTOP Registration | TRIVORA Nasugbu" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* Hero backdrop */}
            <div className="pa-hero-backdrop" />

            {/* ── HEADER ── */}
            <header className="pa-wrap">
                <div className="pa-header">
                    <Link href="/" className="pa-logo">
                        <div>
                            <div className="pa-logo-img-wrap">
                                <img src="/images/logo.png" alt="TRIVORA" className="pa-logo-img" />
                            </div>
                        </div>
                        <div>
                            <p className="pa-logo-name">TMO Portal</p>
                            <p className="pa-logo-sub">Municipality of Nasugbu</p>
                        </div>
                    </Link>
                    <Link href="/" className="pa-header-link">
                        Cancel <ArrowRight size={13} strokeWidth={2.5} />
                    </Link>
                </div>
            </header>

            {/* ── PAGE HEADING ── */}
            {step < 6 && (
                <div className="pa-wrap">
                    <div className="pa-page-head">
                        <div className="pa-page-eyebrow">
                            <Bike size={12} strokeWidth={2.5} />
                            MTOP Online Application
                        </div>
                        <h1 className="pa-page-title">Register Your<br />Tricycle Unit</h1>
                        <p className="pa-page-sub">Complete all five steps to submit your franchise</p>
                    </div>
                </div>
            )}

            {/* ── MAIN CONTENT ── */}
            <main style={{ position: 'relative', zIndex: 10, flex: 1, paddingBottom: 64 }}>
                <div className="pa-wrap">

                    {/* PROGRESS */}
                    {step < 6 && (
                        <div className="pa-progress">
                            {steps.map((label, i) => {
                                const num      = i + 1;
                                const isDone   = step > num;
                                const isActive = step === num;
                                return (
                                    <div key={label} className="pa-step">
                                        <div className="pa-step-node">
                                            <div className={`pa-step-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                                                {isDone ? <Check size={14} strokeWidth={3} /> : num}
                                            </div>
                                            <span className={`pa-step-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>{label}</span>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div className={`pa-step-line ${isDone ? 'done' : ''}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── STEP 1: AGREEMENT ── */}
                    {step === 1 && (
                        <div className="pa-card">
                            <h2 className="pa-card-title">Terms & Agreement</h2>
                            <p className="pa-card-sub">Read the full policy before proceeding with your MTOP application</p>

                            <div className="pa-agree-scroll" onScroll={handleTermsScroll}>
                                <h3 className="pa-agree-h">1. Purpose and Scope</h3>
                                <p className="pa-agree-p">
                                    This online application system is operated by the Traffic Management Office (TMO) of the
                                    Municipality of Nasugbu, Batangas. It facilitates the electronic submission of Motorized
                                    Tricycle Operator Permit (MTOP) applications for new franchises and renewals within the
                                    territorial jurisdiction of Nasugbu.
                                </p>

                                <h3 className="pa-agree-h">2. Eligibility Requirements</h3>
                                <ol className="pa-agree-ol">
                                    <li>Applicant must be a registered resident of Nasugbu, Batangas.</li>
                                    <li>The tricycle unit must be duly registered with the Land Transportation Office (LTO).</li>
                                    <li>The operator must be a member in good standing of a recognized TODA, NAFTODA, or ACTODAN association.</li>
                                    <li>Applicant must not have any pending violations or unresolved cases with the TMO.</li>
                                </ol>

                                <h3 className="pa-agree-h">3. IoT Tracking Device Requirement</h3>
                                <p className="pa-agree-p">
                                    Effective Calendar Year 2026, all MTOP-covered tricycle units operating within Nasugbu are
                                    required to install an approved GPS-based IoT Tracking Device as a condition of franchise
                                    issuance or renewal. The one-time device fee of ₱500.00 is non-refundable and covers hardware
                                    and first-year connectivity. Devices must remain functional at all times; tampering or removal
                                    constitutes a violation of this franchise.
                                </p>

                                <h3 className="pa-agree-h">4. Document Authenticity</h3>
                                <p className="pa-agree-p">
                                    By submitting this application, the applicant certifies that all uploaded documents are genuine,
                                    unaltered, and legally obtained. Any falsification or submission of fraudulent documents is
                                    punishable under existing national and local ordinances and shall result in immediate revocation
                                    of any issued permit.
                                </p>

                                <h3 className="pa-agree-h">5. Physical Inspection</h3>
                                <p className="pa-agree-p">
                                    Submission of this online application does not constitute automatic approval. The TMO reserves
                                    the right to schedule and conduct a physical inspection of the tricycle unit prior to issuance
                                    of the MTOP. The applicant will be notified via SMS of the inspection schedule.
                                </p>

                                <h3 className="pa-agree-h">6. Fees and Payment</h3>
                                <p className="pa-agree-p">
                                    All fees stated in this portal are in Philippine Peso (₱) and are subject to change by
                                    municipal ordinance. Payments are processed through authorized digital payment channels
                                    (GCash, Maya, Bank Transfer). Official receipts shall be issued electronically.
                                </p>

                                <h3 className="pa-agree-h">7. Data Privacy</h3>
                                <p className="pa-agree-p">
                                    Personal information collected through this portal is governed by Republic Act No. 10173
                                    (Data Privacy Act of 2012). Information will only be used for the processing of the MTOP
                                    application and related official communications. The Municipality of Nasugbu does not sell
                                    or share personal data with third parties.
                                </p>
                            </div>

                            {!scrolledTerms && (
                                <p className="pa-scroll-hint">
                                    <ArrowLeft size={11} style={{ transform: 'rotate(-90deg)' }} />
                                    Scroll down to read the full terms
                                </p>
                            )}

                            <div
                                className={`pa-checkbox-row${agreed ? ' checked' : ''}${!scrolledTerms ? ' locked' : ''}`}
                                onClick={() => scrolledTerms && setAgreed(a => !a)}
                            >
                                <div className={`pa-checkbox${agreed ? ' checked' : ''}`}>
                                    {agreed && <Check size={11} strokeWidth={3} color="#FFFFFF" />}
                                </div>
                                <p className="pa-checkbox-text">
                                    I have read, understood, and agree to the <span>Terms & Conditions</span>,
                                    including the mandatory <span>IoT Tracking Device requirement</span> and all applicable fees.
                                </p>
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-primary" disabled={!agreed} onClick={next}>
                                    Proceed to Operator Info <ChevronRight size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: OPERATOR ── */}
                    {step === 2 && (
                        <div className="pa-card">
                            <h2 className="pa-card-title">Operator Info</h2>
                            <p className="pa-card-sub">Owner / Registered Operator of the Tricycle Unit</p>

                            <div className="pa-fields">
                                <Field label="First Name">
                                    <input className="pa-input" placeholder="e.g. Juan"
                                        value={data.first_name} onChange={e => setData('first_name', e.target.value)} />
                                </Field>
                                <Field label="Last Name">
                                    <input className="pa-input" placeholder="e.g. Dela Cruz"
                                        value={data.last_name} onChange={e => setData('last_name', e.target.value)} />
                                </Field>
                                <Field label="Mobile Number">
                                    <input className="pa-input" placeholder="09XX XXX XXXX"
                                        value={data.contact} onChange={e => setData('contact', e.target.value)} />
                                </Field>
                                <Field label="Barangay (Nasugbu)">
                                    <div className="pa-select-wrap">
                                        <select className="pa-select" value={data.barangay}
                                            onChange={e => setData('barangay', e.target.value)}>
                                            {nasugbuBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                        <MapPin size={15} strokeWidth={2} />
                                    </div>
                                </Field>
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    <ArrowLeft size={13} /> Back
                                </button>
                                <button className="pa-btn-primary"
                                    disabled={!data.first_name || !data.last_name || !data.contact}
                                    onClick={next}>
                                    Next: Vehicle Details <ChevronRight size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: VEHICLE ── */}
                    {step === 3 && (
                        <div className="pa-card">
                            <h2 className="pa-card-title">Vehicle Specs</h2>
                            <p className="pa-card-sub">Tricycle Registration & Unit Details</p>

                            <div className="pa-fields">
                                <Field label="TODA Assignment" className="pa-field-full">
                                    <div className="pa-select-wrap">
                                        <select className="pa-select" value={data.toda}
                                            onChange={e => setData('toda', e.target.value)}>
                                            <option value="A">TODA A (Poblacion)</option>
                                            <option value="B">TODA B (Wawa)</option>
                                            <option value="C">TODA C (Bucana)</option>
                                            <option value="D">TODA D (Papaya)</option>
                                        </select>
                                        <ChevronRight size={14} strokeWidth={2} style={{ transform: 'rotate(90deg)' }} />
                                    </div>
                                </Field>
                                <div className="pa-field-full">
                                    <Field label="Motorcycle Make & Model">
                                        <input className="pa-input" placeholder="e.g. Kawasaki Barako 175"
                                            value={data.make_model} onChange={e => setData('make_model', e.target.value)} />
                                    </Field>
                                </div>
                                <Field label="Engine Number">
                                    <input className="pa-input" placeholder="ENG-XXXXXX"
                                        value={data.engine_number} onChange={e => setData('engine_number', e.target.value)} />
                                </Field>
                                <Field label="Chassis Number">
                                    <input className="pa-input" placeholder="CHAS-XXXXXX"
                                        value={data.chassis_number} onChange={e => setData('chassis_number', e.target.value)} />
                                </Field>
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    <ArrowLeft size={13} /> Back
                                </button>
                                <button className="pa-btn-primary"
                                    disabled={!data.engine_number || !data.chassis_number}
                                    onClick={next}>
                                    Next: Upload Documents <ChevronRight size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: DOCUMENTS ── */}
                    {step === 4 && (
                        <div className="pa-card" style={{ maxWidth: 900 }}>
                            <h2 className="pa-card-title">Requirements</h2>
                            <p className="pa-card-sub">Take a clear photo or upload scanned copies of each document</p>

                            <div className="pa-docs-grid">
                                {documentList.map(doc => (
                                    <FileUpload
                                        key={doc.id}
                                        id={doc.id}
                                        label={doc.label}
                                        required={doc.required}
                                        conditional={doc.conditional}
                                        file={data.documents[doc.id]}
                                        onUpload={file => handleFileUpload(doc.id, file)}
                                    />
                                ))}
                            </div>

                            <div className="pa-notice">
                                <Info size={17} className="pa-notice-icon" />
                                <p className="pa-notice-text">
                                    Bago isumite ang mga dokumento, siguraduhing maayos ang ilaw, busina,
                                    side mirrors, baterya, at plaka (LTO/GSO) para sa physical inspection ng TMO.
                                </p>
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    <ArrowLeft size={13} /> Back
                                </button>
                                <button className="pa-btn-primary" disabled={!hasAllRequired} onClick={next}>
                                    {hasAllRequired
                                        ? <>Proceed to Payment <ChevronRight size={14} /></>
                                        : 'Upload Required Docs'
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 5: PAYMENT ── */}
                    {step === 5 && (
                        <div className="pa-card">
                            <h2 className="pa-card-title">Settlement</h2>
                            <p className="pa-card-sub">Review fees and select a payment method</p>

                            <div className="pa-fee-box">
                                {fees.map((f, i) => (
                                    <div key={i} className={`pa-fee-row${f.iot ? ' iot' : ''}`}>
                                        <span className="pa-fee-label">
                                            {f.label}
                                            {f.iot && <span className="pa-fee-badge">New 2026</span>}
                                        </span>
                                        <span className="pa-fee-amount">₱{f.price.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="pa-fee-total">
                                    <span className="pa-fee-total-label">Total Amount</span>
                                    <span className="pa-fee-total-amount">₱{total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="pa-iot-notice">
                                <Wifi size={17} className="pa-iot-notice-icon" />
                                <p className="pa-iot-notice-text">
                                    IoT GPS Tracking Device will be installed during physical inspection at the TMO office.
                                    Device must remain active and unmodified for the duration of the franchise period.
                                </p>
                            </div>

                            <label className="pa-label" style={{ marginBottom: 12 }}>Select Payment Method</label>
                            <div className="pa-pay-grid">
                                <PayMethod active={paymentMethod === 'gcash'} label="GCash"   icon={Smartphone} onClick={() => setPaymentMethod('gcash')} />
                                <PayMethod active={paymentMethod === 'maya'}  label="Maya"    icon={Wallet}     onClick={() => setPaymentMethod('maya')} />
                                <PayMethod active={paymentMethod === 'bank'}  label="Bank"    icon={CreditCard} onClick={() => setPaymentMethod('bank')} />
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back} disabled={isProcessingPayment}>
                                    <ArrowLeft size={13} /> Back
                                </button>
                                <button className="pa-btn-success"
                                    disabled={!paymentMethod || isProcessingPayment}
                                    onClick={submitApplication}>
                                    {isProcessingPayment
                                        ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                                        : <><ShieldCheck size={15} /> Pay ₱{total.toFixed(2)}</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 6: SUCCESS ── */}
                    {step === 6 && (
                        <div className="pa-card" style={{ textAlign: 'center', padding: '64px 48px', animation: 'paFadeUp .5s ease both' }}>
                            <div className="pa-success-icon">
                                <CheckCircle2 size={38} strokeWidth={2} />
                            </div>

                            <h2 className="pa-card-title" style={{ marginBottom: 6 }}>Application Submitted</h2>
                            <p className="pa-card-sub" style={{ marginBottom: 32 }}>Your documents and payment have been received</p>

                            <div className="pa-tracking-box">
                                <p className="pa-tracking-eyebrow">Your Tracking Number</p>
                                <p className="pa-tracking-number">NSB-26-8812</p>
                            </div>

                            <p className="pa-success-desc">
                                Your application is now <span>pending TMO Validation.</span> Please wait
                                for an SMS confirmation before bringing your tricycle for physical inspection
                                and <span>IoT device installation.</span>
                            </p>

                            <Link href="/"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 9,
                                    height: 52, padding: '0 36px', borderRadius: 12,
                                    background: '#1C2340', color: '#FFFFFF', textDecoration: 'none',
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
                                    letterSpacing: '.15em', textTransform: 'uppercase',
                                    boxShadow: '0 4px 14px rgba(28,35,64,.25)',
                                }}
                            >
                                Return to Portal <ArrowRight size={13} strokeWidth={2.5} />
                            </Link>
                        </div>
                    )}

                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className="pa-footer">
                <div className="pa-wrap">
                    <div className="pa-footer-inner">
                        <p className="pa-footer-copy">&copy; 2026 TRIVORA Fleet Operations &bull; Nasugbu Batangas</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Field({ label, children, className }) {
    return (
        <div className={className}>
            <label className="pa-label">{label}</label>
            {children}
        </div>
    );
}

function FileUpload({ id, label, required, conditional, file, onUpload }) {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!file) { setPreviewUrl(null); return; }
        if (file.type?.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
    }, [file]);

    return (
        <label htmlFor={id} className={`pa-file-tile${file ? ' done' : ''}`}>
            <input
                type="file" id={id} accept="image/*,.pdf" className="sr-only"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }}
            />
            <div className="pa-file-info">
                <p className="pa-file-name">{label}</p>
                <div className="pa-file-tags">
                    {file
                        ? <span className="pa-tag-done">✓ Uploaded</span>
                        : required
                            ? <span className="pa-tag-req">Required</span>
                            : conditional
                                ? <span className="pa-tag-opt">Optional</span>
                                : null
                    }
                </div>
            </div>
            {previewUrl
                ? <img src={previewUrl} alt="preview" className="pa-file-thumb" />
                : (
                    <div className="pa-file-icon-wrap">
                        {file
                            ? <Check size={16} strokeWidth={2.5} />
                            : <Upload size={15} strokeWidth={1.8} />
                        }
                    </div>
                )
            }
        </label>
    );
}

function PayMethod({ active, label, icon: Icon, onClick }) {
    return (
        <button onClick={onClick} className={`pa-pay-method${active ? ' active' : ''}`}>
            <Icon size={26} strokeWidth={1.6} className="pa-pay-icon" />
            <span className="pa-pay-label">{label}</span>
            <div className="pa-pay-check">
                <Check size={10} strokeWidth={3} color="#FFFFFF" />
            </div>
        </button>
    );
}