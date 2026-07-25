import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, Filter, Bike,
    AlertTriangle, CheckCircle2,
    X, MapPin, Calendar, Download,
    ChevronRight, ChevronLeft
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO COMMAND — Tricycle Registry
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: tr-* (tricycle-registry)
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.tr-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 48px;
}
.tr-root *, .tr-root *::before, .tr-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.tr-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.tr-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #4F5BCB; border-radius: 2px;
}
.tr-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 30px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1;
}
.tr-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase;
  color: #8A96BC; margin-top: 6px;
}

/* ── Stat cards ─────────────────────────────────────────────────────── */
.tr-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}
@media (max-width: 768px) { .tr-stats { grid-template-columns: 1fr; } }

.tr-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex; align-items: flex-start; gap: 16px;
  position: relative; overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}
.tr-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}
.tr-stat-accent { border-top: 2.5px solid #4F5BCB; }
.tr-stat::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}
.tr-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tr-stat-indigo  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; border-radius: 10px; }
.tr-stat-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; border-radius: 10px; }
.tr-stat-amber   { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; border-radius: 10px; }
.tr-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800;
  color: #1C2340; line-height: 1;
}
.tr-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; margin-top: 5px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.tr-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
}
.tr-search {
  width: 320px;
  position: relative; display: flex; align-items: center;
  background: #FFFFFF; border: 1px solid rgba(28,35,64,.15);
  border-radius: 50px; padding: 0 16px; height: 42px;
  transition: border-color .18s, box-shadow .18s;
}
.tr-search:focus-within {
  border-color: #4F5BCB;
  box-shadow: 0 0 0 3px rgba(79,91,203,.12);
}
.tr-search input {
  border: none !important; outline: none !important;
  box-shadow: none !important; background: transparent;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: #1C2340; width: 100%; margin-left: 10px;
}
.tr-search input:focus, .tr-search input:focus-visible {
  border: none !important; outline: none !important;
  box-shadow: none !important; ring: 0 !important;
}
.tr-search input::placeholder { color: #8A96BC; font-weight: 400; }
.tr-search-icon { color: #6B7280; flex-shrink: 0; }
.tr-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #6B7280; display: flex; padding: 0;
  transition: color .15s;
}
.tr-clear-btn:hover { color: #1C2340; }

.tr-toolbar-right { display: flex; align-items: center; gap: 10px; }
.tr-filter-btn {
  height: 42px; padding: 0 16px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.15);
  background: #FFFFFF; color: #374151;
  display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.tr-filter-btn:hover { border-color: rgba(28,35,64,.18); color: #1C2340; }

.tr-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.tr-select-icon {
  position: absolute;
  left: 14px;
  pointer-events: none;
  color: #6B7280;
  z-index: 2;
}
.tr-select {
  height: 42px; padding: 0 32px 0 36px; border-radius: 50px;
  border: 1px solid rgba(28,35,64,.15); background: #FFFFFF;
  color: #374151; font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; cursor: pointer; outline: none;
  transition: all .18s;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
.tr-select:hover, .tr-select:focus { border-color: #4F5BCB; color: #1C2340; }

/* ── Table card ─────────────────────────────────────────────────────── */
.tr-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
}
.tr-table { width: 100%; border-collapse: collapse; }

.tr-thead-row { border-bottom: 1px solid rgba(28,35,64,.07); }
.tr-th {
  padding: 14px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #4F5BCB; text-align: left; white-space: nowrap;
  background: rgba(79, 91, 203, 0.05);
}

.tr-row {
  border-bottom: 1px solid rgba(28,35,64,.05);
  transition: background .15s;
}
.tr-row:last-child { border-bottom: none; }
.tr-row:hover { background: rgba(237,238,244,.7); }
.tr-td { padding: 18px 24px; vertical-align: middle; }

/* Tricycle ID cell */
.tr-body-no {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 800;
  color: #1C2340; line-height: 1; margin-bottom: 4px;
}
.tr-plate-no {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: #4F5BCB;
  background: rgba(79,91,203,.1);
  border: 1px solid rgba(79,91,203,.25);
  padding: 3px 8px; border-radius: 5px;
  display: inline-block;
}

/* Operator cell */
.tr-op-name {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1;
  margin-bottom: 4px; letter-spacing: -.01em;
}
.tr-op-meta {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase;
  color: #6B7280;
  display: flex; align-items: center; gap: 5px;
}

/* TODA & Coding cell */
.tr-toda-name {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #3A4570; line-height: 1; margin-bottom: 5px;
}
.tr-coding-day {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #4F5BCB; display: flex; align-items: center; gap: 4px;
}

/* Status cell */
.tr-status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 6px;
}
.tr-status-active    { background: rgba(5,150,105,.15); color: #059669; border: 1px solid rgba(5,150,105,.35); }
.tr-status-suspended { background: rgba(249,115,22,.15); color: #D97706; border: 1px solid rgba(249,115,22,.35); }

/* Action button */
.tr-action-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: #1C2340; color: #FFFFFF;
  padding: 9px 18px; border-radius: 50px;
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  text-decoration: none;
  transition: background .18s, box-shadow .18s, transform .18s;
  white-space: nowrap;
}
.tr-action-btn:hover {
  background: #2E3A9E;
  box-shadow: 0 4px 14px rgba(79,91,203,.28);
  transform: translateX(2px);
}

/* td right alignment */
.tr-td-right { text-align: right; }

/* Empty state */
.tr-empty { padding: 64px 0; text-align: center; }
.tr-empty-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(79,91,203,.1);
  border: 1px solid rgba(79,91,203,.2);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; color: #4F5BCB;
}
.tr-empty-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  color: #3A4570; margin-bottom: 6px;
}
.tr-empty-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: #8A96BC;
}

/* Pagination bar */
.tr-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-top: 1px solid rgba(28,35,64,.07);
  background: #FAFAFD; flex-wrap: wrap; gap: 12px;
}
.tr-page-info {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 600; color: #6B7280;
}
.tr-page-controls { display: flex; align-items: center; gap: 6px; }
.tr-page-btn {
  height: 32px; min-width: 32px; padding: 0 10px; border-radius: 8px;
  border: 1px solid rgba(28,35,64,.12); background: #FFFFFF;
  color: #1C2340; font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.tr-page-btn:hover:not(:disabled) {
  border-color: #4F5BCB; color: #4F5BCB; background: rgba(79,91,203,.05);
}
.tr-page-btn:disabled {
  opacity: 0.4; cursor: not-allowed;
}
.tr-page-btn-active {
  background: #1C2340 !important; color: #FFFFFF !important;
  border-color: #1C2340 !important;
}
`;

export default function TricycleRegistry({ initialUnits = [] }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Default Registry Data set (25 registered units with Tricycle Number Coding Scheme)
    const defaultUnits = [
        { id: 1,  coding_scheme_number: '0142', body_no: '0142', sticker_no: '0142', plate_no: 'AAA-1234', operator: 'Ricardo Dalisay', contact: '0917 123 4567', toda: 'TODA Bucana', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 2,  coding_scheme_number: '0089', body_no: '0089', sticker_no: '0089', plate_no: 'BBB-5678', operator: 'Cardo Santos', contact: '0918 555 1234', toda: 'TODA Brgy. 10', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 3,  coding_scheme_number: '0301', body_no: '0301', sticker_no: '0301', plate_no: 'CCC-9012', operator: 'Juan Dela Cruz', contact: '0919 888 9999', toda: 'TODA Brgy. 8', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'suspended' },
        { id: 4,  coding_scheme_number: '0012', body_no: '0012', sticker_no: '0012', plate_no: 'DDD-3456', operator: 'Maria Clara', contact: '0920 111 2222', toda: 'TODA Brgy. 14', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 5,  coding_scheme_number: '0204', body_no: '0204', sticker_no: '0204', plate_no: 'EEE-7890', operator: 'Emilio Aguinaldo', contact: '0921 333 4444', toda: 'TODA Bucana', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'active' },
        { id: 6,  coding_scheme_number: '0512', body_no: '0512', sticker_no: '0512', plate_no: 'FFF-2468', operator: 'Andres Bonifacio', contact: '0922 444 5555', toda: 'TODA Brgy. 10', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'suspended' },
        { id: 7,  coding_scheme_number: '0108', body_no: '0108', sticker_no: '0108', plate_no: 'GGG-1357', operator: 'Apolinario Mabini', contact: '0923 666 7777', toda: 'TODA Brgy. 8', coding_color: 'Green', coding_hex: '#10B981', coding_bg: 'rgba(16,185,129,.12)', coding_day: 'Thursday', status: 'active' },
        { id: 8,  coding_scheme_number: '0330', body_no: '0330', sticker_no: '0330', plate_no: 'HHH-9876', operator: 'Gabriela Silang', contact: '0924 777 8888', toda: 'TODA Brgy. 14', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 9,  coding_scheme_number: '0415', body_no: '0415', sticker_no: '0415', plate_no: 'JJJ-5432', operator: 'Melchora Aquino', contact: '0925 888 9990', toda: 'TODA Bucana', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'suspended' },
        { id: 10, coding_scheme_number: '0602', body_no: '0602', sticker_no: '0602', plate_no: 'KKK-1122', operator: 'Jose Rizal', contact: '0926 999 0011', toda: 'TODA Brgy. 10', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 11, coding_scheme_number: '0711', body_no: '0711', sticker_no: '0711', plate_no: 'LLL-3344', operator: 'Antonio Luna', contact: '0927 123 9988', toda: 'TODA Brgy. 8', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 12, coding_scheme_number: '0820', body_no: '0820', sticker_no: '0820', plate_no: 'MMM-5566', operator: 'Gregorio del Pilar', contact: '0928 234 8877', toda: 'TODA Brgy. 14', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 13, coding_scheme_number: '0935', body_no: '0935', sticker_no: '0935', plate_no: 'NNN-7788', operator: 'Marcelo H. del Pilar', contact: '0929 345 7766', toda: 'TODA Bucana', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'active' },
        { id: 14, coding_scheme_number: '0150', body_no: '0150', sticker_no: '0150', plate_no: 'PPP-9900', operator: 'Mariano Gomez', contact: '0930 456 6655', toda: 'TODA Brgy. 10', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'suspended' },
        { id: 15, coding_scheme_number: '0264', body_no: '0264', sticker_no: '0264', plate_no: 'QQQ-1230', operator: 'Jose Burgos', contact: '0931 567 5544', toda: 'TODA Brgy. 8', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'active' },
        { id: 16, coding_scheme_number: '0378', body_no: '0378', sticker_no: '0378', plate_no: 'RRR-4560', operator: 'Jacinto Zamora', contact: '0932 678 4433', toda: 'TODA Brgy. 14', coding_color: 'Green', coding_hex: '#10B981', coding_bg: 'rgba(16,185,129,.12)', coding_day: 'Thursday', status: 'active' },
        { id: 17, coding_scheme_number: '0489', body_no: '0489', sticker_no: '0489', plate_no: 'SSS-7890', operator: 'Graciano Lopez Jaena', contact: '0933 789 3322', toda: 'TODA Bucana', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'active' },
        { id: 18, coding_scheme_number: '0590', body_no: '0590', sticker_no: '0590', plate_no: 'TTT-0123', operator: 'Juan Luna', contact: '0934 890 2211', toda: 'TODA Brgy. 10', coding_color: 'White', coding_hex: '#64748B', coding_bg: 'rgba(100,116,139,.12)', coding_day: 'Friday', status: 'suspended' },
        { id: 19, coding_scheme_number: '0611', body_no: '0611', sticker_no: '0611', plate_no: 'VVV-3456', operator: 'Felix Hidalgo', contact: '0935 901 1100', toda: 'TODA Brgy. 8', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 20, coding_scheme_number: '0722', body_no: '0722', sticker_no: '0722', plate_no: 'WWW-6789', operator: 'Fernando Amorsolo', contact: '0936 012 2299', toda: 'TODA Brgy. 14', coding_color: 'Red', coding_hex: '#EF4444', coding_bg: 'rgba(239,68,68,.12)', coding_day: 'Monday', status: 'active' },
        { id: 21, coding_scheme_number: '0833', body_no: '0833', sticker_no: '0833', plate_no: 'XXX-9012', operator: 'Guillermo Tolentino', contact: '0937 123 3388', toda: 'TODA Bucana', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'active' },
        { id: 22, coding_scheme_number: '0944', body_no: '0944', sticker_no: '0944', plate_no: 'YYY-2345', operator: 'Vicente Manansala', contact: '0938 234 4477', toda: 'TODA Brgy. 10', coding_color: 'Blue', coding_hex: '#3B82F6', coding_bg: 'rgba(59,130,246,.12)', coding_day: 'Tuesday', status: 'suspended' },
        { id: 23, coding_scheme_number: '0055', body_no: '0055', sticker_no: '0055', plate_no: 'ZZZ-5678', operator: 'Carlos Francisco', contact: '0939 345 5566', toda: 'TODA Brgy. 8', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'active' },
        { id: 24, coding_scheme_number: '0166', body_no: '0166', sticker_no: '0166', plate_no: 'ABC-8901', operator: 'Nick Joaquin', contact: '0940 456 6677', toda: 'TODA Brgy. 14', coding_color: 'Yellow', coding_hex: '#D97706', coding_bg: 'rgba(245,158,11,.12)', coding_day: 'Wednesday', status: 'active' },
        { id: 25, coding_scheme_number: '0277', body_no: '0277', sticker_no: '0277', plate_no: 'XYZ-2346', operator: 'Jose Garcia Villa', contact: '0941 567 7788', toda: 'TODA Bucana', coding_color: 'Green', coding_hex: '#10B981', coding_bg: 'rgba(16,185,129,.12)', coding_day: 'Thursday', status: 'active' },
    ];

    const units = initialUnits && initialUnits.length > 0 ? initialUnits : defaultUnits;

    // Filter Logic across all tricycle unit attributes
    const filtered = units.filter(u => {
        const q = query.trim().toLowerCase();
        const matchesQuery = !q || (
            (u.coding_scheme_number && String(u.coding_scheme_number).toLowerCase().includes(q)) ||
            (u.body_no && String(u.body_no).toLowerCase().includes(q)) ||
            (u.plate_no && String(u.plate_no).toLowerCase().includes(q)) ||
            (u.operator && String(u.operator).toLowerCase().includes(q)) ||
            (u.id && String(u.id).toLowerCase().includes(q)) ||
            (u.contact && String(u.contact).toLowerCase().includes(q)) ||
            (u.toda && String(u.toda).toLowerCase().includes(q)) ||
            (u.coding_day && String(u.coding_day).toLowerCase().includes(q))
        );
        const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    // Pagination Calculations
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
    const paginated = filtered.slice(startIndex, endIndex);

    const handleQueryChange = (val) => {
        setQuery(val);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (val) => {
        setStatusFilter(val);
        setCurrentPage(1);
    };

    // Export CSV Handler
    const handleExport = () => {
        const exportList = filtered.length > 0 ? filtered : units;

        const csvHeaders = ['Tricycle ID', 'Body Number', 'Plate Number', 'Operator', 'Contact', 'TODA Zone', 'Coding Day', 'Status'];
        const csvRows = exportList.map(u => [
            u.id,
            u.body_no,
            u.plate_no,
            u.operator,
            u.contact || 'N/A',
            u.toda,
            u.coding_day,
            u.status.toUpperCase()
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Trivora_Active_Tricycle_Registry_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalCount     = units.length;
    const activeCount    = units.filter(u => u.status === 'active').length;
    const suspendedCount = units.filter(u => u.status === 'suspended').length;

    return (
        <TrivoraLayout title="Tricycle Registry" role="TMO Officer">
            <Head title="Tricycle Registry | TRIVORA" />

            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="tr-root" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 48 }}>

                {/* ── Page heading ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="tr-eyebrow">Tricycle Management</p>
                    <h1 className="tr-title">Active Tricycle Registry</h1>
                    <p className="tr-subtitle">Master record of all registered and operating tricycles in Nasugbu</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="tr-stats">
                    <StatCard count={totalCount}     label="Total Registered" icon={Bike}          iconClass="tr-stat-indigo" accent />
                    <StatCard count={activeCount}    label="Active Tricycles"     icon={CheckCircle2}  iconClass="tr-stat-emerald" />
                    <StatCard count={suspendedCount} label="Suspended Tricycles"  icon={AlertTriangle} iconClass="tr-stat-amber" />
                </div>

                {/* ── Toolbar ── */}
                <div className="tr-toolbar">
                    <div className="tr-search">
                        <Search size={14} strokeWidth={2} className="tr-search-icon" />
                        <input
                            type="text"
                            placeholder="Search Unit ID, Plate, or Operator…"
                            value={query}
                            onChange={e => handleQueryChange(e.target.value)}
                        />
                        {query && (
                            <button className="tr-clear-btn" onClick={() => handleQueryChange('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="tr-toolbar-right">
                        {/* STATUS FILTER DROPDOWN WITH ICON INSIDE */}
                        <div className="tr-select-wrap">
                            <Filter size={13} strokeWidth={2} className="tr-select-icon" />
                            <select
                                className="tr-select"
                                value={statusFilter}
                                onChange={e => handleStatusFilterChange(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="suspended">Suspended Only</option>
                            </select>
                        </div>

                        {/* EXPORT CSV BUTTON */}
                        <button className="tr-filter-btn" onClick={handleExport} title="Download CSV report">
                            <Download size={14} strokeWidth={2} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="tr-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tr-table">
                            <thead>
                                <tr className="tr-thead-row">
                                    <th className="tr-th">Tricycle Unit ID</th>
                                    <th className="tr-th">Plate Number</th>
                                    <th className="tr-th">Tricycle Operator</th>
                                    <th className="tr-th">TODA & Coding Scheme</th>
                                    <th className="tr-th">Status</th>
                                    <th className="tr-th" style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="tr-empty">
                                                <div className="tr-empty-icon">
                                                    <Bike size={26} strokeWidth={1.4} color="#8A96BC" />
                                                </div>
                                                <p className="tr-empty-title">
                                                    {query || statusFilter !== 'all' ? 'No matching records found' : 'Registry is empty'}
                                                </p>
                                                <p className="tr-empty-sub">
                                                    {query || statusFilter !== 'all' ? 'Try adjusting your search query or status filter' : 'No registered tricycles yet.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map(unit => (
                                        <UnitRow key={unit.id} unit={unit} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── PAGINATION BAR (5 RECORDS PER PAGE) ── */}
                    {filtered.length > 0 && (
                        <div className="tr-pagination">
                            <div className="tr-page-info">
                                Showing <span style={{ fontWeight: 700, color: '#1C2340' }}>{filtered.length === 0 ? 0 : startIndex + 1}</span> to{' '}
                                <span style={{ fontWeight: 700, color: '#1C2340' }}>{endIndex}</span> of{' '}
                                <span style={{ fontWeight: 700, color: '#1C2340' }}>{filtered.length}</span> records
                                {statusFilter !== 'all' && ` (Filtered: ${statusFilter})`}
                            </div>

                            <div className="tr-page-controls">
                                <button
                                    className="tr-page-btn"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={activePage === 1}
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        className={`tr-page-btn ${activePage === pageNum ? 'tr-page-btn-active' : ''}`}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                ))}

                                <button
                                    className="tr-page-btn"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={activePage === totalPages}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TrivoraLayout>
    );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({ count, label, icon: Icon, iconClass, accent }) {
    const iconColors = {
        'tr-stat-indigo': '#FFFFFF',
        'tr-stat-emerald': '#FFFFFF',
        'tr-stat-amber': '#FFFFFF'
    };
    return (
        <div className={`tr-stat${accent ? ' tr-stat-accent' : ''}`}>
            <div className={`tr-stat-icon ${iconClass}`}>
                <Icon size={19} strokeWidth={2.5} color={iconColors[iconClass]} />
            </div>
            <div>
                <p className="tr-stat-val">{count}</p>
                <p className="tr-stat-lbl">{label}</p>
            </div>
        </div>
    );
}

function UnitRow({ unit }) {
    const getStatusDetails = (status) => {
        switch (status) {
            case 'active':    return { label: 'Active',    class: 'tr-status-active',    icon: CheckCircle2 };
            case 'suspended': return { label: 'Suspended', class: 'tr-status-suspended', icon: AlertTriangle };
            default:          return { label: 'Active',    class: 'tr-status-active',    icon: CheckCircle2 };
        }
    };

    const statusInfo = getStatusDetails(unit.status);
    const StatusIcon = statusInfo.icon;

    const codingHex = unit.coding_hex || '#4F5BCB';
    const codingColorName = unit.coding_color || 'Standard';

    const unitIdCode = unit.unit_code || `TRV-${String(unit.id).padStart(3, '0')}`;

    return (
        <tr className="tr-row">
            <td className="tr-td">
                <span style={{
                    fontSize: 12, fontWeight: 700, color: '#374151',
                    fontFamily: 'DM Sans, sans-serif'
                }}>
                    {unitIdCode}
                </span>
            </td>
            <td className="tr-td">
                <span className="tr-plate-no">{unit.plate_no}</span>
            </td>
            <td className="tr-td">
                <p className="tr-op-name">{unit.operator}</p>
                <p className="tr-op-meta">
                    <MapPin size={10} strokeWidth={2.5} color="#8A96BC" />
                    {unit.contact}
                </p>
            </td>
            <td className="tr-td">
                <p className="tr-toda-name" style={{ marginBottom: 4 }}>{unit.toda}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: codingHex, flexShrink: 0,
                        boxShadow: `0 0 0 2px ${codingHex}25`
                    }} />
                    <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: 800,
                        color: '#1C2340', background: '#F3F4F6', padding: '2px 7px', borderRadius: 5,
                        border: '1px solid rgba(28,35,64,.12)'
                    }}>
                        #{unit.coding_scheme_number || unit.body_no || unit.sticker_no}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
                        ({unit.coding_day ? (unit.coding_day.split(' ')[0] === 'Mon' ? 'Monday' : unit.coding_day.split(' ')[0] === 'Tue' ? 'Tuesday' : unit.coding_day.split(' ')[0] === 'Wed' ? 'Wednesday' : unit.coding_day.split(' ')[0] === 'Thu' ? 'Thursday' : unit.coding_day.split(' ')[0] === 'Fri' ? 'Friday' : unit.coding_day) : 'Monday'})
                    </span>
                </div>
            </td>
            <td className="tr-td">
                <span className={`tr-status-badge ${statusInfo.class}`}>
                    <StatusIcon size={10} strokeWidth={3} color={statusInfo.class === 'tr-status-active' ? '#059669' : '#B45309'} /> {statusInfo.label}
                </span>
            </td>
            <td className="tr-td tr-td-right">
                <Link href={route('tricycle.details', unit.id)} className="tr-action-btn">
                    View Details
                    <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
            </td>
        </tr>
    );
}