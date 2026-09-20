import React, { useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import BPLOLayout from '@/Layouts/BPLOLayout';
import OperatorLayout from '@/Layouts/OperatorLayout';
import { BackLink, Button } from '@/Components/TMO';
import {
    Printer, ArrowLeft, ChevronLeft, Building2, CheckCircle2,
    ShieldCheck, AlertCircle, QrCode, FileText, Bike, User
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Official Municipal Payment Ticket (Order of Payment)
   Scoped CSS (.pt-*) to prevent layout collisions with .tmo-root * reset
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=DM+Sans:wght@500;700&family=JetBrains+Mono:wght@600;700;800&display=swap');

.pt-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 920px;
  margin: 0 auto;
  padding: 12px 16px 56px 16px;
}

/* ── Action Bar ── */
.pt-action-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 20px !important;
  gap: 16px !important;
}
.pt-back-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  color: #5A6488 !important;
  text-decoration: none !important;
  padding: 8px 14px !important;
  border-radius: 8px !important;
  background: #F1F4FA !important;
  border: 1px solid rgba(28,35,64,.08) !important;
  transition: all .2s ease !important;
}
.pt-back-btn:hover {
  background: #E2E7F3 !important;
  color: #1C2340 !important;
}
.pt-print-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 10px 22px !important;
  background: #1C2340 !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 10px !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  box-shadow: 0 4px 14px rgba(28,35,64,.2) !important;
  transition: all .2s ease !important;
}
.pt-print-btn:hover {
  background: #4F5BCB !important;
  box-shadow: 0 6px 20px rgba(79,91,203,.35) !important;
  transform: translateY(-1px) !important;
}

/* ── Contextual Notification Banners ── */
.pt-banner {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 18px !important;
  padding: 18px 22px !important;
  border-radius: 14px !important;
  margin-bottom: 24px !important;
  background: #ECFDF5 !important;
  border: 1.5px solid #A7F3D0 !important;
}
.pt-banner-amber {
  background: #FFFBEB !important;
  border: 1.5px solid #FDE68A !important;
}
.pt-banner-content {
  display: flex !important;
  align-items: flex-start !important;
  gap: 14px !important;
}
.pt-banner-icon {
  width: 40px !important;
  height: 40px !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  background: #D1FAE5 !important;
  color: #047857 !important;
}
.pt-banner-icon-amber {
  background: #FEF3C7 !important;
  color: #B45309 !important;
}
.pt-banner-title {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 13.5px !important;
  font-weight: 700 !important;
  color: #065F46 !important;
  margin-bottom: 4px !important;
}
.pt-banner-title-amber {
  color: #92400E !important;
}
.pt-banner-desc {
  font-size: 12px !important;
  line-height: 1.55 !important;
  color: #065F46 !important;
}
.pt-banner-desc-amber {
  color: #78350F !important;
}
.pt-banner-action {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  padding: 9px 18px !important;
  background: #059669 !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 8px !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 10.5px !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
  transition: all .18s ease !important;
}
.pt-banner-action:hover {
  background: #047857 !important;
}

/* ── Printable Ticket Container ── */
.pt-ticket-card {
  background: #FFFFFF !important;
  border: 1.5px solid #DCE2EE !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(28,35,64,.08) !important;
  padding: 36px 44px !important;
  color: #1C2340 !important;
  position: relative !important;
}

/* Header */
.pt-header {
  text-align: center !important;
  border-bottom: 1.5px solid #E2E8F0 !important;
  padding-bottom: 22px !important;
  margin-bottom: 22px !important;
}
.pt-header-rep {
  font-family: 'DM Sans', sans-serif !important;
  font-size: 9.5px !important;
  font-weight: 700 !important;
  letter-spacing: .16em !important;
  text-transform: uppercase !important;
  color: #64748B !important;
  margin-bottom: 4px !important;
}
.pt-header-mun {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 20px !important;
  font-weight: 800 !important;
  letter-spacing: -.02em !important;
  color: #0F172A !important;
  margin-bottom: 4px !important;
}
.pt-header-offices {
  font-family: 'DM Sans', sans-serif !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: .12em !important;
  text-transform: uppercase !important;
  color: #475569 !important;
  margin-bottom: 12px !important;
}
.pt-header-title-box {
  margin-top: 8px !important;
  display: inline-block !important;
  padding: 5px 22px !important;
  border-top: 1.5px solid #0F172A !important;
  border-bottom: 1.5px solid #0F172A !important;
}
.pt-header-doctitle {
  display: block !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  letter-spacing: .12em !important;
  text-transform: uppercase !important;
  color: #0F172A !important;
}
.pt-header-docsub {
  display: block !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 9.5px !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  color: #64748B !important;
  margin-top: 1px !important;
}

/* 4-Item Meta Strip */
.pt-meta-strip {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 16px !important;
  padding: 16px 20px !important;
  background: #F8FAFC !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 12px !important;
  margin-bottom: 22px !important;
}
.pt-meta-lbl {
  display: block !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  letter-spacing: .12em !important;
  text-transform: uppercase !important;
  color: #64748B !important;
  margin-bottom: 4px !important;
}
.pt-meta-val {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #0F172A !important;
}
.pt-meta-mono {
  font-family: 'JetBrains Mono', monospace !important;
  font-weight: 800 !important;
  color: #0F172A !important;
}
.pt-meta-ref {
  font-family: 'JetBrains Mono', monospace !important;
  color: #4F5BCB !important;
}

/* Section Title */
.pt-sec-title {
  font-family: 'DM Sans', sans-serif !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: .14em !important;
  text-transform: uppercase !important;
  color: #64748B !important;
  margin-bottom: 10px !important;
}

/* Applicant & Vehicle 2-Column Info Card */
.pt-info-card {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 16px !important;
  margin-bottom: 24px !important;
}
@media (max-width: 640px) {
  .pt-info-card { grid-template-columns: 1fr !important; }
}
.pt-info-col {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 10px !important;
  padding: 14px 18px !important;
}
.pt-info-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 6px 0 !important;
  border-bottom: 1px solid #F1F5F9 !important;
  font-size: 12px !important;
}
.pt-info-row:last-child {
  border-bottom: none !important;
}
.pt-info-k {
  color: #64748B !important;
  font-weight: 500 !important;
}
.pt-info-v {
  font-weight: 700 !important;
  color: #0F172A !important;
  text-align: right !important;
}

/* Breakdown Table */
.pt-table-wrap {
  border: 1px solid #CBD5E1 !important;
  border-radius: 10px !important;
  overflow: hidden !important;
  margin-bottom: 22px !important;
}
.pt-table {
  width: 100% !important;
  border-collapse: collapse !important;
  font-size: 12px !important;
}
.pt-th {
  background: #F1F5F9 !important;
  padding: 10px 16px !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: .12em !important;
  text-transform: uppercase !important;
  color: #475569 !important;
  text-align: left !important;
  border-bottom: 1px solid #CBD5E1 !important;
}
.pt-th-r { text-align: right !important; }
.pt-td {
  padding: 10px 16px !important;
  border-bottom: 1px solid #E2E8F0 !important;
  color: #1E293B !important;
}
.pt-td-r { text-align: right !important; font-weight: 600 !important; }
.pt-td-code { font-family: 'JetBrains Mono', monospace !important; font-size: 11px !important; color: #64748B !important; }
.pt-tr-total {
  background: #F8FAFC !important;
}
.pt-td-total-lbl {
  padding: 14px 16px !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
  color: #0F172A !important;
}
.pt-td-total-val {
  padding: 14px 16px !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 18px !important;
  font-weight: 800 !important;
  color: #0F172A !important;
  text-align: right !important;
}

/* Instructions Box */
.pt-inst-box {
  background: #F8FAFC !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 10px !important;
  padding: 16px 18px !important;
  margin-bottom: 24px !important;
}
.pt-inst-row {
  display: flex !important;
  align-items: flex-start !important;
  gap: 10px !important;
  margin-bottom: 8px !important;
  font-size: 11.5px !important;
  line-height: 1.5 !important;
  color: #334155 !important;
}
.pt-inst-row:last-child { margin-bottom: 0 !important; }
.pt-inst-num {
  width: 18px !important;
  height: 18px !important;
  border-radius: 50% !important;
  background: #E2E8F0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 9.5px !important;
  font-weight: 800 !important;
  color: #0F172A !important;
  flex-shrink: 0 !important;
  margin-top: 1px !important;
}

/* Validation Boxes (Cashier & BPLO) */
.pt-stamps-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 18px !important;
  margin-top: 24px !important;
}
@media (max-width: 640px) {
  .pt-stamps-grid { grid-template-columns: 1fr !important; }
}
.pt-stamp-box {
  border: 1.5px dashed #94A3B8 !important;
  border-radius: 10px !important;
  padding: 16px 18px !important;
  text-align: center !important;
  background: #FFFFFF !important;
}
.pt-stamp-title {
  font-family: 'DM Sans', sans-serif !important;
  font-size: 9.5px !important;
  font-weight: 800 !important;
  letter-spacing: .12em !important;
  text-transform: uppercase !important;
  color: #475569 !important;
  margin-bottom: 8px !important;
}
.pt-stamp-placeholder {
  height: 56px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #CBD5E1 !important;
  font-size: 11px !important;
  font-style: italic !important;
}
.pt-stamp-lines {
  border-top: 1px solid #E2E8F0 !important;
  padding-top: 8px !important;
  font-size: 10px !important;
  color: #64748B !important;
  text-align: left !important;
  line-height: 1.6 !important;
}

/* Security footer */
.pt-footer {
  margin-top: 24px !important;
  text-align: center !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 9px !important;
  letter-spacing: .12em !important;
  text-transform: uppercase !important;
  color: #94A3B8 !important;
  border-top: 1px solid #F1F5F9 !important;
  padding-top: 14px !important;
}

/* Barcode simulation bar */
.pt-barcode-wrap {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 2px !important;
  height: 32px !important;
  margin-top: 6px !important;
}
.pt-bar {
  background: #0F172A !important;
  height: 100% !important;
}

/* ─── Mobile Responsiveness ─── */
@media (max-width: 640px) {
  .pt-root {
    padding: 12px 12px 48px 12px !important;
  }
  .pt-ticket-card {
    padding: 20px 16px !important;
    border-radius: 12px !important;
  }
  .pt-header-mun {
    font-size: 16px !important;
  }
  .pt-header-title-box {
    padding: 4px 14px !important;
  }
  .pt-header-doctitle {
    font-size: 11px !important;
  }
  .pt-meta-strip {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
    padding: 12px 14px !important;
  }
  .pt-meta-val {
    font-size: 12px !important;
  }
  .pt-info-card {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }
  .pt-info-col {
    padding: 10px 12px !important;
  }
  .pt-table th, .pt-table td {
    padding: 8px 10px !important;
  }
  .pt-stamps-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
}

/* ─── PRINT CSS (Guarantees Strict Single Page Fit on A4 & Letter) ─── */
@media print {
  @page {
    size: A4 portrait;
    margin: 5mm 8mm;
  }
  body, html {
    background: #FFFFFF !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
  }
  .tmo-root, .bplo-root, .op-root {
    display: block !important;
    background: #FFFFFF !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .t-sidebar, .t-header, .b-sidebar, .b-header, .no-print, .pt-action-bar, .pt-banner {
    display: none !important;
  }
  .t-main, .t-page, .t-content {
    padding: 0 !important;
    margin: 0 !important;
    height: auto !important;
    overflow: visible !important;
  }
  .pt-root {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .pt-ticket-card {
    box-shadow: none !important;
    border: 1px solid #1E293B !important;
    border-radius: 6px !important;
    padding: 10px 14px !important;
    margin: 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .pt-header {
    border-bottom: 1px solid #CBD5E1 !important;
    padding-bottom: 6px !important;
    margin-bottom: 8px !important;
  }
  .pt-header-rep {
    font-size: 8px !important;
    margin-bottom: 1px !important;
    color: #475569 !important;
  }
  .pt-header-mun {
    font-size: 15px !important;
    margin: 2px 0 !important;
    color: #000000 !important;
  }
  .pt-header-offices {
    font-size: 8.5px !important;
    margin-bottom: 5px !important;
    color: #475569 !important;
  }
  .pt-header-title-box {
    margin-top: 3px !important;
    padding: 2px 12px !important;
    border-top: 1px solid #000000 !important;
    border-bottom: 1px solid #000000 !important;
  }
  .pt-header-doctitle {
    font-size: 9px !important;
    color: #000000 !important;
  }
  .pt-header-docsub {
    font-size: 7.5px !important;
    color: #475569 !important;
  }
  .pt-meta-strip {
    padding: 6px 10px !important;
    margin-bottom: 8px !important;
    gap: 8px !important;
    border-radius: 6px !important;
    background: #F8FAFC !important;
    border: 1px solid #CBD5E1 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pt-meta-lbl {
    font-size: 7.5px !important;
    margin-bottom: 2px !important;
  }
  .pt-meta-val {
    font-size: 11px !important;
  }
  .pt-sec-title {
    font-size: 8px !important;
    margin-bottom: 4px !important;
    margin-top: 4px !important;
    color: #334155 !important;
  }
  .pt-info-card {
    gap: 8px !important;
    margin-bottom: 8px !important;
  }
  .pt-info-col {
    padding: 6px 10px !important;
    border-radius: 6px !important;
    border: 1px solid #CBD5E1 !important;
  }
  .pt-info-row {
    padding: 2px 0 !important;
    font-size: 10px !important;
  }
  .pt-table-wrap {
    margin-bottom: 8px !important;
    border: 1px solid #CBD5E1 !important;
    border-radius: 6px !important;
  }
  .pt-th {
    padding: 4px 8px !important;
    font-size: 8px !important;
    background: #F1F5F9 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pt-td {
    padding: 3.5px 8px !important;
    font-size: 10px !important;
  }
  .pt-tr-total {
    background: #F8FAFC !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pt-td-total-lbl {
    padding: 5px 8px !important;
    font-size: 10.5px !important;
  }
  .pt-td-total-val {
    padding: 5px 8px !important;
    font-size: 14px !important;
  }
  .pt-inst-box {
    padding: 6px 10px !important;
    margin-bottom: 8px !important;
    border-radius: 6px !important;
    background: #F8FAFC !important;
    border: 1px solid #CBD5E1 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pt-inst-row {
    margin-bottom: 2px !important;
    font-size: 9px !important;
    line-height: 1.3 !important;
    gap: 6px !important;
  }
  .pt-inst-num {
    width: 14px !important;
    height: 14px !important;
    font-size: 8px !important;
  }
  .pt-stamps-grid {
    margin-top: 8px !important;
    gap: 8px !important;
  }
  .pt-stamp-box {
    padding: 6px 8px !important;
    border-radius: 6px !important;
    border: 1px dashed #64748B !important;
  }
  .pt-stamp-title {
    font-size: 8px !important;
    margin-bottom: 3px !important;
  }
  .pt-stamp-placeholder {
    height: 24px !important;
    font-size: 8.5px !important;
  }
  .pt-stamp-lines {
    padding-top: 3px !important;
    font-size: 8px !important;
    line-height: 1.35 !important;
  }
  .pt-footer {
    margin-top: 6px !important;
    padding-top: 5px !important;
    font-size: 7.5px !important;
    border-top: 1px solid #CBD5E1 !important;
  }
  .pt-barcode-wrap {
    height: 14px !important;
    margin-top: 2px !important;
  }
}
`;

// Shared soft, layered shadow token — same elevation language used across the TMO/Operator SaaS
// redesign, so this page's screen chrome reads as one consistent product. Only used on chrome
// (nav/header/banners) — never inside .pt-ticket-card, which is the preserved printable ticket.
const CARD_SHADOW = 'shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)]';

export default function PaymentTicket({ application }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isTMO = user?.role === 'tmo_personnel' || user?.role === 'admin';
    const isBPLO = user?.role === 'bplo_staff';

    const { reference_number, payment_ticket, operator_name } = application;
    const ticket = payment_ticket || {
        ticket_number: 'TKT-2026-00001',
        reference_number: reference_number || 'APP-2026-00001',
        application_type: 'new',
        applicant_name: operator_name || 'Tricycle Operator',
        contact_number: 'N/A',
        tricycle_details: {
            plate_number: 'N/A',
            engine_number: 'N/A',
            chassis_number: 'N/A',
            make_model: 'N/A',
            toda_zone: 'N/A',
        },
        fees_breakdown: [
            { description: 'Municipal Franchise Filing Fee', code: 'ACC-101', amount: 500.00 },
            { description: 'TMO Physical Inspection Fee', code: 'ACC-102', amount: 150.00 },
            { description: 'Franchise Sticker & Plate Tag', code: 'ACC-103', amount: 100.00 },
        ],
        total_amount: 750.00,
        issued_at: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        instructions: [
            'Present this Payment Ticket along with your valid ID to the Municipal Treasurer\'s cashier counter (Ground Floor, Municipal Hall).',
            'Pay the exact total amount of ₱750.00 in cash to the Treasurer\'s Cashier Officer.',
            'Ensure you receive the Official Receipt (OR) and that this Payment Ticket is stamped/validated by the Cashier.',
            'Return to the TMO (Tricycle Management Office) counter with your Official Receipt and validated Payment Ticket for payment verification, then proceed to BPLO for Franchise Sticker release.',
        ],
    };

    const fees = ticket.fees_breakdown || ticket.items || [
        { description: 'Municipal Franchise Filing Fee', code: 'ACC-101', amount: 500.00 },
        { description: 'TMO Physical Inspection Fee', code: 'ACC-102', amount: 150.00 },
        { description: 'Franchise Sticker & Plate Tag', code: 'ACC-103', amount: 100.00 },
    ];

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('print=1')) {
            const timer = setTimeout(() => {
                window.print();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const backHref = isTMO
        ? '/tmo/physical'
        : isBPLO
        ? '/bplo/releasing'
        : route('operator.mtop.details', { id: application.id });

    const backLabel = isTMO
        ? 'Back to Physical Inspection Queue'
        : isBPLO
        ? 'Back to Releasing Queue'
        : 'Back to Application Details';

    const content = (
        <div className="pt-root">
            <Head title={`Payment Ticket ${ticket.ticket_number} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── 1. TOP NAVIGATION (Hidden in Print) ── */}
            <div className="mb-4 flex items-center no-print">
                <BackLink href={backHref}>{backLabel}</BackLink>
            </div>

            {/* ── 2. CLEAN WORKSTATION HEADER (Hidden in Print) ── */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5 no-print">
                <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>Payment Assessment</span>
                    </div>
                    <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        {ticket.ticket_number}
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                        Submitted by <strong className="font-semibold text-slate-700">{ticket.applicant_name}</strong> · Ref: <span className="font-mono font-bold text-slate-700">{ticket.reference_number}</span>
                    </p>
                </div>

                <div className="shrink-0">
                    <Button variant="primary" size="lg" icon={Printer} onClick={handlePrint} className="w-full sm:w-auto">
                        Print Payment Ticket
                    </Button>
                </div>
            </div>

            {/* ── 3. CONTEXTUAL NOTIFICATION BANNER (Hidden in Print) ── */}
            {isTMO ? (
                <div className={`mb-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 sm:p-5 no-print ${CARD_SHADOW}`}>
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.02] text-emerald-600 mt-0.5">
                            <CheckCircle2 size={19} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm font-bold text-emerald-900 leading-snug">
                                Physical Inspection Passed — Handout Ready
                            </h3>
                            <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                                Please print this official Order of Payment and physically hand it to driver <strong className="font-semibold text-emerald-950">{ticket.applicant_name}</strong>.
                                Instruct the driver to proceed to <strong className="font-semibold text-emerald-950">Municipal Cashier (Window 2)</strong> to pay <strong className="font-semibold text-emerald-950">₱750.00 cash OTC</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`mb-6 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 sm:p-5 no-print ${CARD_SHADOW}`}>
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.02] text-amber-600 mt-0.5">
                            <AlertCircle size={19} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm font-bold text-amber-900 leading-snug">
                                Physical Cashier Payment Notice
                            </h3>
                            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                                Statutory franchise fees are paid <strong className="font-semibold text-amber-950">in person at the Municipal Treasurer's cashier counter</strong> (Ground Floor, Municipal Hall).
                                Present this ticket or show the Ticket Number on your phone when paying. After paying, take your Official Receipt (OR) to the <strong className="font-semibold text-amber-950">TMO counter</strong> for verification.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 4. PRINTABLE OFFICIAL PAYMENT TICKET ── */}
            <div id="printable-ticket" className="pt-ticket-card">

                {/* Municipal Header */}
                <div className="pt-header">
                    <p className="pt-header-rep">Republic of the Philippines &bull; Province of Batangas</p>
                    <h2 className="pt-header-mun">MUNICIPAL GOVERNMENT OF TRIVORA</h2>
                    <p className="pt-header-offices">
                        Tricycle Management Office (TMO) &bull; Municipal Cashier Division &bull; BPLO
                    </p>
                    <div className="pt-header-title-box">
                        <span className="pt-header-doctitle">
                            Official Municipal Payment Ticket
                        </span>
                        <span className="pt-header-docsub">
                            (Order of Payment)
                        </span>
                    </div>
                </div>

                {/* 4-Item Meta Strip */}
                <div className="pt-meta-strip">
                    <div>
                        <span className="pt-meta-lbl">Ticket Number</span>
                        <span className="pt-meta-val pt-meta-mono">{ticket.ticket_number}</span>
                    </div>
                    <div>
                        <span className="pt-meta-lbl">Reference No.</span>
                        <span className="pt-meta-val pt-meta-ref">{ticket.reference_number}</span>
                    </div>
                    <div>
                        <span className="pt-meta-lbl">Date Issued</span>
                        <span className="pt-meta-val">{ticket.issued_at}</span>
                    </div>
                    <div>
                        <span className="pt-meta-lbl">Application Type</span>
                        <span className="pt-meta-val" style={{ textTransform: 'capitalize' }}>
                            {ticket.application_type} Franchise
                        </span>
                    </div>
                </div>

                {/* Applicant & Vehicle Info */}
                <p className="pt-sec-title">Applicant &amp; Vehicle Registration Details</p>
                <div className="pt-info-card">
                    <div className="pt-info-col">
                        <div className="pt-info-row">
                            <span className="pt-info-k">Operator / Driver</span>
                            <span className="pt-info-v">{ticket.applicant_name}</span>
                        </div>
                        <div className="pt-info-row">
                            <span className="pt-info-k">Contact Number</span>
                            <span className="pt-info-v">{ticket.contact_number || 'N/A'}</span>
                        </div>
                        <div className="pt-info-row">
                            <span className="pt-info-k">TODA Zone Assignment</span>
                            <span className="pt-info-v">{ticket.tricycle_details?.toda_zone || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="pt-info-col">
                        <div className="pt-info-row">
                            <span className="pt-info-k">Plate / Temp Number</span>
                            <span className="pt-info-v pt-meta-mono">{ticket.tricycle_details?.plate_number || 'N/A'}</span>
                        </div>
                        <div className="pt-info-row">
                            <span className="pt-info-k">Make &amp; Model</span>
                            <span className="pt-info-v">{ticket.tricycle_details?.make_model || 'N/A'}</span>
                        </div>
                        <div className="pt-info-row">
                            <span className="pt-info-k">Engine Number</span>
                            <span className="pt-info-v pt-meta-mono">{ticket.tricycle_details?.engine_number || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Official Assessment Fee Breakdown Table */}
                <p className="pt-sec-title">Official Assessment Fee Breakdown</p>
                <div className="pt-table-wrap">
                    <table className="pt-table">
                        <thead>
                            <tr>
                                <th className="pt-th" style={{ width: 120 }}>Account Code</th>
                                <th className="pt-th">Particulars / Assessment Description</th>
                                <th className="pt-th pt-th-r" style={{ width: 160 }}>Amount (PHP)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fees.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="pt-td pt-td-code">{item.code || `ACC-10${idx + 1}`}</td>
                                    <td className="pt-td" style={{ fontWeight: 500 }}>{item.description}</td>
                                    <td className="pt-td pt-td-r">₱{Number(item.amount).toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr className="pt-tr-total">
                                <td colSpan={2} className="pt-td-total-lbl">
                                    Total Amount Payable at Cashier
                                </td>
                                <td className="pt-td-total-val">
                                    ₱{Number(ticket.total_amount || 750.00).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Instructions for Applicant */}
                <div className="pt-inst-box">
                    <p className="pt-sec-title" style={{ marginBottom: 8 }}>Instructions for Applicant</p>
                    {ticket.instructions && ticket.instructions.map((inst, index) => (
                        <div key={index} className="pt-inst-row">
                            <span className="pt-inst-num">{index + 1}</span>
                            <span>{inst}</span>
                        </div>
                    ))}
                </div>

                {/* Physical Validation & Endorsement Stamps */}
                <div className="pt-stamps-grid">
                    <div className="pt-stamp-box">
                        <p className="pt-stamp-title">Physical Municipal Cashier Validation</p>
                        <div className="pt-stamp-placeholder"></div>
                        <div className="pt-stamp-lines">
                            <div>Official Receipt (OR) No.: ________________________</div>
                            <div>Date Paid: ___________________ Amount: ₱750.00</div>
                            <div>Cashier Signature: _______________________________</div>
                        </div>
                    </div>

                    <div className="pt-stamp-box">
                        <p className="pt-stamp-title">BPLO Receipt Verification &amp; Sticker Release</p>
                        <div className="pt-stamp-placeholder"></div>
                        <div className="pt-stamp-lines">
                            <div>Franchise Sticker Serial No.: ____________________</div>
                            <div>Assigned Body No.: _______________________________</div>
                            <div>Verified &amp; Released By: __________________________</div>
                        </div>
                    </div>
                </div>

                {/* Simulated Barcode */}
                <div style={{ marginTop: 22, textAlign: 'center' }}>
                    <div className="pt-barcode-wrap">
                        {[2,1,3,1,2,4,1,2,3,1,2,1,4,2,1,3,1,2,1,4,1,3,2,1,2,4,1,3,1,2,4,1,2,3,1,2,1,4,2,1,3,1,2,1,4,1,3,2,1,2,4,1,3,1,2,4].map((w, i) => (
                            <div
                                key={i}
                                className="pt-bar"
                                style={{ width: w * 1.5, opacity: i % 2 === 0 ? 0.9 : 0.4 }}
                            />
                        ))}
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748B', letterSpacing: '0.15em' }}>
                        *{ticket.ticket_number}*
                    </span>
                </div>

                {/* Security Footer Note */}
                <div className="pt-footer">
                    Official Document &bull; Generated by TRIVORA Municipal Regulatory System &bull; Not Valid without Cashier Official Receipt
                </div>

            </div>
        </div>
    );

    if (isTMO) {
        return (
            <TrivoraLayout title="Municipal Payment Ticket" role="TMO Officer">
                {content}
            </TrivoraLayout>
        );
    }

    if (isBPLO) {
        return (
            <BPLOLayout title="Municipal Payment Ticket">
                {content}
            </BPLOLayout>
        );
    }

    return (
        <OperatorLayout title="Municipal Payment Ticket" operatorName={operator_name}>
            {content}
        </OperatorLayout>
    );
}
