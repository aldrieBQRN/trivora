import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import {
    Upload, Info, CheckCircle2, MapPin, Check, Camera, Eye, X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Public Apply / MTOP Registration Wizard
   4-Step Flow: Agreement → Tricycle Driver → Vehicle → Documents → Success
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

/* ── Hero backdrop (PHOTO BACKGROUND) ────────────────────────────────── */
.pa-hero-backdrop {
  position: absolute; top: 0; left: 0; width: 100%;
  height: 460px;

  /* Dark gradient overlay + Photo Background */
  background-image:
    linear-gradient(to bottom, rgba(28, 35, 64, 0.6) 0%, rgba(28, 35, 64, 0.98) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

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

/* ── Page heading band ───────────────────────────────────────────────── */
.pa-page-head {
  position: relative; z-index: 10;
  padding-bottom: 64px; text-align: center;
  padding-top: 32px;
}
.pa-page-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(28px, 4vw, 42px); font-weight: 800;
  letter-spacing: -.03em; color: #FFFFFF;
  line-height: 1.1; margin-bottom: 16px;
}
.pa-page-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.8);
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
  border: 2px solid rgba(255,255,255,.3);
  background: rgba(255,255,255,.1);
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 800;
  color: rgba(255,255,255,.6);
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
  color: rgba(255,255,255,.6); transition: color .3s;
  white-space: nowrap;
}
.pa-step-label.active { color: #FFFFFF; }
.pa-step-label.done   { color: rgba(255,255,255,.8); }
.pa-step-line {
  width: 64px; height: 2px;
  background: rgba(255,255,255,.2);
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
.pa-card-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 36px; gap: 16px;
}
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
.pa-footer { background: #FFFFFF; border-top: 1px solid rgba(28,35,64,.07); margin-top: auto; }
.pa-footer-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 22px 0; flex-wrap: wrap;
}
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
.pa-file-title-text {
  font-family: 'Inter', sans-serif;
  font-size: 11.5px; font-weight: 600; color: #1C2340;
  line-height: 1.3;
}
.pa-file-tile-container.done .pa-file-title-text { color: #065F46; }

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
`;

export default function PublicApply() {
    const { url } = usePage();
    const [step, setStep] = useState(1);
    const [agreed, setAgreed] = useState(false);
    const [scrolledTerms, setScrolledTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nasugbuBarangays = [
        'Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Poblacion 4',
        'Wawa', 'Papaya', 'Bucana', 'Lumbangan', 'Pantalan', 'Bilaran', 'Cogunan',
    ];

    const documentList = [
        { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)',                         conditional: true  },
        { id: 'orcr',      label: 'Xerox OR/CR',                                          required:    true  },
        { id: 'receipt',   label: 'Delivery Receipt (Kung walang OR/CR / New)',            conditional: true  },
        { id: 'license',   label: "Driver's License Back-to-back (Prof/Restriction 1/A1)", required:    true  },
        { id: 'brgy',      label: 'Barangay Clearance (Original)',                         required:    true  },
        { id: 'toda',      label: 'TODA/NAFTODA/ACTODAN Clearance (Original)',             required:    true  },
        { id: 'driver_id', label: "Driver's ID Issued by NAFTODA/ACTODAN",                required:    true  },
        { id: 'tariff',    label: 'List of Existing Tariff Fee (For sidecar)',             conditional: true  },
        { id: 'auth',      label: "Authorization Letter & ID (Kung hindi may-ari)",       conditional: true  },
    ];

    const { data, setData, post, processing, errors } = useForm({
        first_name: '', last_name: '', contact: '', barangay: 'Wawa',
        email: '', password: '',
        plate_number: '', make_model: '', year_model: '2024', body_color: 'Black/Red', body_type: 'Pass-Thru Sidecar',
        engine_number: '', chassis_number: '', or_number: '', cr_number: '', toda: 'TODA Bucana',
        documents: {},
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === '1' && params.get('reference')) {
            setStep(5);
        }
    }, [url]);

    const getReferenceNo = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('reference') || 'NSB-26-8812';
    };

    const next = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s + 1); };
    const back = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => s - 1); };

    const handleFileUpload = (docId, fileOrFiles) => {
        const currentFiles = data.documents[docId] || [];
        const filesToAdd = fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)
            ? Array.from(fileOrFiles)
            : [fileOrFiles];

        const updated = [...currentFiles, ...filesToAdd];
        setData('documents', {
            ...data.documents,
            [docId]: updated
        });
    };

    const handleRemoveFile = (docId, indexToRemove) => {
        const currentFiles = data.documents[docId] || [];
        const updated = currentFiles.filter((_, i) => i !== indexToRemove);
        setData('documents', {
            ...data.documents,
            [docId]: updated.length > 0 ? updated : undefined
        });
    };

    const requiredDocsIds   = documentList.filter(d => d.required).map(d => d.id);
    const hasAllRequired    = requiredDocsIds.every(id => {
        const files = data.documents[id];
        return Array.isArray(files) && files.length > 0;
    });

    const handleTermsScroll = (e) => {
        const el = e.target;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
            setScrolledTerms(true);
        }
    };

    const submitApplication = (e) => {
        if (e) e.preventDefault();
        
        if (!hasAllRequired) {
            Swal.fire({
                title: 'Missing Requirements',
                text: 'Pakisumite ang lahat ng required na dokumento bago magpatuloy.',
                icon: 'warning',
                confirmButtonColor: '#1C2340'
            });
            return;
        }

        setIsSubmitting(true);
        post('/register-mtop', {
            forceFormData: true,
            onFinish: () => setIsSubmitting(false),
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                Swal.fire({
                    title: 'Submission Failed',
                    text: firstErr || 'Please check your inputs and try again.',
                    icon: 'error',
                    confirmButtonColor: '#1C2340'
                });
            }
        });
    };

    const steps = ['Agreement', 'Tricycle Driver', 'Vehicle', 'Documents'];

    return (
        <div className="pa-root">
            <Head title="Franchise Registration | TRIVORA Nasugbu" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* Hero backdrop */}
            <div className="pa-hero-backdrop" />

            {/* ── HEADER ── */}
            <header className="pa-wrap">
                <div className="pa-header">
                    <Link href="/" className="pa-logo">
                        <div className="pa-logo-img-wrap">
                            <img src="/images/logo.png" alt="TRIVORA" className="pa-logo-img" />
                        </div>
                    </Link>
                </div>
            </header>

            {/* ── PAGE HEADING ── */}
            {step < 5 && (
                <div className="pa-wrap">
                    <div className="pa-page-head">
                        <h1 className="pa-page-title">Register Your<br />Tricycle Unit</h1>
                        <p className="pa-page-sub">Complete all steps to submit your franchise application</p>
                    </div>
                </div>
            )}

            {/* ── MAIN CONTENT ── */}
            <main style={{ position: 'relative', zIndex: 10, flex: 1, paddingBottom: 64 }}>
                <div className="pa-wrap">

                    {/* PROGRESS */}
                    {step < 5 && (
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
                            <div className="pa-card-top">
                                <div>
                                    <h2 className="pa-card-title">Terms & Agreement</h2>
                                    <p className="pa-card-sub">Read the full policy before proceeding with your application</p>
                                </div>
                            </div>

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

                                <h3 className="pa-agree-h">3. Document Authenticity</h3>
                                <p className="pa-agree-p">
                                    By submitting this application, the applicant certifies that all uploaded documents are genuine,
                                    unaltered, and legally obtained. Any falsification or submission of fraudulent documents is
                                    punishable under existing national and local ordinances and shall result in immediate revocation
                                    of any issued permit.
                                </p>

                                <h3 className="pa-agree-h">4. Tricycle Inspection & GPS Installation</h3>
                                <p className="pa-agree-p">
                                    Submission of this application does not guarantee approval. Units must pass a physical roadworthiness inspection.
                                    Upon approval, the TMO will install an LGU-provided Smart GPS Tracker on the unit for safety and traffic monitoring.
                                    Tampering with or removing this device is a severe violation.
                                </p>

                                <h3 className="pa-agree-h">5. Compliance with Local Ordinances</h3>
                                <p className="pa-agree-p">
                                    The operator agrees to strictly abide by the Nasugbu Traffic Code, including the Color Coding Scheme and designated TODA routing.
                                    Violations detected manually or via the Smart GPS system may result in fines or franchise revocation.
                                </p>

                                <h3 className="pa-agree-h">6. Fees and Payment</h3>
                                <p className="pa-agree-p">
                                    All franchise and regulatory fees are subject to current municipal ordinances. Payments are collected only after the unit passes physical inspection.
                                    The Smart GPS Tracker is provided by the Municipal Government at no hardware cost to the operator.
                                </p>

                                <h3 className="pa-agree-h">7. Data Privacy and Consent</h3>
                                <p className="pa-agree-p">
                                    By applying, you consent to the collection and processing of your personal data and real-time GPS location data in accordance with the Data Privacy Act of 2012 (R.A. 10173).
                                    Data will be used exclusively for franchise administration, traffic management, and public safety.
                                </p>
                            </div>

                            {!scrolledTerms && (
                                <p className="pa-scroll-hint">
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
                                    including the <span>Data Privacy Consent</span> and compliance with traffic ordinances.
                                </p>
                            </div>

                            <div className="pa-actions">
                                <Link href="/" className="pa-btn-ghost">
                                    Cancel
                                </Link>
                                <button className="pa-btn-primary" onClick={next}>
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: DRIVER INFO ── */}
                    {step === 2 && (
                        <div className="pa-card">
                            <div className="pa-card-top">
                                <div>
                                    <h2 className="pa-card-title">Tricycle Driver Info</h2>
                                    <p className="pa-card-sub">Registered Driver of the Tricycle Unit</p>
                                </div>
                            </div>

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
                                <Field label="Email Address">
                                    <input className="pa-input" type="email" placeholder="e.g. driver.pramos@trivora.ph"
                                        value={data.email} onChange={e => setData('email', e.target.value)} />
                                </Field>
                                <Field label="Account Password">
                                    <input className="pa-input" type="password" placeholder="Min. 8 characters"
                                        value={data.password} onChange={e => setData('password', e.target.value)} />
                                </Field>
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    Back
                                </button>
                                <button className="pa-btn-primary" onClick={next}>
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: VEHICLE ── */}
                    {step === 3 && (
                        <div className="pa-card">
                            <div className="pa-card-top">
                                <div>
                                    <h2 className="pa-card-title">Vehicle Specs</h2>
                                    <p className="pa-card-sub">Tricycle Registration & Unit Details</p>
                                </div>
                            </div>

                            <div className="pa-fields">
                                <Field label="TODA Assignment">
                                    <div className="pa-select-wrap">
                                        <select className="pa-select" value={data.toda}
                                            onChange={e => setData('toda', e.target.value)}>
                                            <option value="TODA Bucana">TODA Bucana</option>
                                            <option value="TODA Brgy. 10">TODA Brgy. 10</option>
                                            <option value="TODA Brgy. 8">TODA Brgy. 8</option>
                                            <option value="TODA Brgy. 14">TODA Brgy. 14</option>
                                        </select>
                                    </div>
                                </Field>
                                <Field label="LTO Plate Number">
                                    <input className="pa-input" placeholder="e.g. AAA-1234"
                                        value={data.plate_number} onChange={e => setData('plate_number', e.target.value)} />
                                </Field>
                                <Field label="Motorcycle Make & Model">
                                    <input className="pa-input" placeholder="e.g. Kawasaki Barako 175"
                                        value={data.make_model} onChange={e => setData('make_model', e.target.value)} />
                                </Field>
                                <Field label="Year Model">
                                    <input className="pa-input" placeholder="e.g. 2024"
                                        value={data.year_model} onChange={e => setData('year_model', e.target.value)} />
                                </Field>
                                <Field label="Body Color">
                                    <input className="pa-input" placeholder="e.g. Red/White"
                                        value={data.body_color} onChange={e => setData('body_color', e.target.value)} />
                                </Field>
                                <Field label="Body Type">
                                    <input className="pa-input" placeholder="e.g. Pass-Thru Sidecar"
                                        value={data.body_type} onChange={e => setData('body_type', e.target.value)} />
                                </Field>
                                <Field label="Engine Number">
                                    <input className="pa-input" placeholder="ENG-XXXXXX"
                                        value={data.engine_number} onChange={e => setData('engine_number', e.target.value)} />
                                </Field>
                                <Field label="Chassis Number">
                                    <input className="pa-input" placeholder="CHAS-XXXXXX"
                                        value={data.chassis_number} onChange={e => setData('chassis_number', e.target.value)} />
                                </Field>
                                <Field label="LTO OR Number">
                                    <input className="pa-input" placeholder="OR-2026-XXXXX"
                                        value={data.or_number} onChange={e => setData('or_number', e.target.value)} />
                                </Field>
                                <Field label="LTO CR Number">
                                    <input className="pa-input" placeholder="CR-2026-XXXXX"
                                        value={data.cr_number} onChange={e => setData('cr_number', e.target.value)} />
                                </Field>
                            </div>

                            <div className="pa-actions">
                                <button className="pa-btn-ghost" onClick={back}>
                                    Back
                                </button>
                                <button className="pa-btn-primary" onClick={next}>
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: DOCUMENTS & SUBMIT ── */}
                    {step === 4 && (
                        <div className="pa-card" style={{ maxWidth: 900 }}>
                            <div className="pa-card-top">
                                <div>
                                    <h2 className="pa-card-title">Requirements</h2>
                                    <p className="pa-card-sub">Take a clear photo or upload scanned copies of each document</p>
                                </div>
                            </div>

                            <div className="pa-docs-grid">
                                {documentList.map(doc => (
                                    <FileUpload
                                        key={doc.id}
                                        id={doc.id}
                                        label={doc.label}
                                        required={doc.required}
                                        conditional={doc.conditional}
                                        files={data.documents[doc.id] || []}
                                        onUpload={files => handleFileUpload(doc.id, files)}
                                        onRemove={idx => handleRemoveFile(doc.id, idx)}
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
                                    Back
                                </button>
                                <button className="pa-btn-success" onClick={submitApplication}>
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 5: SUCCESS ── */}
                    {step === 5 && (
                        <div className="pa-card" style={{ textAlign: 'center', padding: '64px 48px', animation: 'paFadeUp .5s ease both' }}>
                            <div className="pa-success-icon">
                                <CheckCircle2 size={38} strokeWidth={2} />
                            </div>

                            <h2 className="pa-card-title" style={{ marginBottom: 6 }}>Application Submitted</h2>
                            <p className="pa-card-sub" style={{ marginBottom: 32 }}>Your documents have been received</p>

                            <div className="pa-tracking-box">
                                <p className="pa-tracking-eyebrow">Your Tracking Number</p>
                                <p className="pa-tracking-number">{getReferenceNo()}</p>
                            </div>

                            <p className="pa-success-desc">
                                Your application is now <span>pending TMO Validation.</span> Please wait
                                for an SMS confirmation before bringing your tricycle for physical inspection
                                and <span>GPS device installation.</span> Payment will be collected after passing inspection.
                            </p>

                                                        <Link href="/operator/dashboard"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 9,
                                    height: 52, padding: '0 36px', borderRadius: 12,
                                    background: '#1C2340', color: '#FFFFFF', textDecoration: 'none',
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
                                    letterSpacing: '.15em', textTransform: 'uppercase',
                                    boxShadow: '0 4px 14px rgba(28,35,64,.25)',
                                }}
                            >
                                Go to Dashboard
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

function FileUpload({ id, label, required, conditional, files = [], onUpload, onRemove }) {
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
                <span className="pa-file-title-text">{label}</span>
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

            {/* Action Row containing upload trigger (left) and view gallery icon (right) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px', marginTop: '4px' }}>
                <div>
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
                    <button
                        type="button"
                        className="pa-upload-btn-label"
                        onClick={() => setShowChoiceModal(true)}
                        style={{ cursor: 'pointer' }}
                    >
                        <Upload size={10} strokeWidth={2.5} />
                        Add Photo / PDF
                    </button>
                </div>

                {isUploaded && (
                    <button
                        type="button"
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            padding: '6px', background: 'none', border: 'none',
                            color: '#4F5BCB', cursor: 'pointer', transition: 'color .18s'
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowGallery(true);
                        }}
                        title="View Uploaded Photos"
                    >
                        <Eye size={16} strokeWidth={2.5} />
                    </button>
                )}
            </div>

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