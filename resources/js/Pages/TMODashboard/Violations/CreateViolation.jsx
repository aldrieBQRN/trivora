import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ChevronLeft, ShieldAlert, AlertTriangle,
    CheckCircle2, Clock, MapPin, FileText, Search
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO TICKET PANEL — File Manual Violation Ticket
   Prefix: cv-* (create-violation)
   Using the unified Trivora TMO Slate-Indigo/Emerald design system
   ───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.cv-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 48px;
}
.cv-root *, .cv-root *::before, .cv-root *::after { box-sizing: border-box; }

/* ── Heading ── */
.cv-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #DC2626;
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.cv-eyebrow::before {
  content: ''; width: 18px; height: 1.5px;
  background: #DC2626; border-radius: 2px;
}
.cv-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1.1;
}

/* ── Nav ── */
.cv-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  margin-bottom: 24px;
  transition: color .18s;
}
.cv-back-link:hover { color: #1C2340; }

/* ── Panel Card ── */
.cv-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.12);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(28,35,64,.08);
}

/* ── Form Fields ── */
.cv-group {
  margin-bottom: 24px;
  position: relative;
}
.cv-label {
  display: block;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: #5A6488; margin-bottom: 8px;
}
.cv-input, .cv-select, .cv-textarea {
  width: 100%;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 500;
  color: #1C2340;
  background: #FAFAFA;
  border: 1.5px solid rgba(28,35,64,.12);
  border-radius: 10px;
  padding: 12px 16px;
  transition: all .2s;
  outline: none;
}
.cv-input:focus, .cv-select:focus, .cv-textarea:focus {
  background: #FFFFFF;
  border-color: #4F5BCB;
  box-shadow: 0 0 0 4px rgba(79,91,203,.12);
}
.cv-textarea {
  resize: vertical; min-height: 100px;
}
.cv-error {
  font-size: 11px; color: #DC2626;
  font-weight: 600; margin-top: 6px;
  display: flex; align-items: center; gap: 4px;
}

/* ── Autocomplete dropdown ── */
.cv-search-container {
  position: relative;
}
.cv-search-icon {
  position: absolute; right: 16px; top: 50%;
  transform: translateY(-50%);
  color: #8A96BC; pointer-events: none;
}
.cv-dropdown {
  position: absolute; top: 100%; left: 0; right: 0;
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.15);
  border-radius: 10px;
  max-height: 200px; overflow-y: auto;
  box-shadow: 0 10px 30px rgba(28,35,64,.15);
  z-index: 50; margin-top: 6px;
}
.cv-option {
  padding: 12px 16px;
  font-size: 13px; font-weight: 500;
  color: #1C2340; cursor: pointer;
  transition: background .15s;
}
.cv-option:hover {
  background: rgba(79,91,203,.06);
  color: #4F5BCB;
}

/* ── Action Buttons ── */
.cv-actions {
  display: flex; justify-content: flex-end; gap: 12px;
  margin-top: 36px; padding-top: 24px;
  border-top: 1px solid rgba(28,35,64,.08);
}
.cv-btn-cancel {
  height: 44px; padding: 0 24px;
  border-radius: 10px; border: 1.5px solid rgba(28,35,64,.15);
  background: transparent; color: #5A6488;
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  display: inline-flex; align-items: center; justify-content: center;
  text-decoration: none; cursor: pointer;
  transition: all .2s;
}
.cv-btn-cancel:hover {
  background: rgba(28,35,64,.04);
  color: #1C2340;
}
.cv-btn-submit {
  height: 44px; padding: 0 28px;
  border-radius: 10px; border: none;
  background: #DC2626; color: #FFFFFF;
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; cursor: pointer;
  box-shadow: 0 4px 14px rgba(220,38,38,.2);
  transition: all .2s;
}
.cv-btn-submit:hover:not(:disabled) {
  background: #B91C1C;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(220,38,38,.28);
}
.cv-btn-submit:disabled {
  opacity: 0.6; cursor: not-allowed;
}

.cv-fine-helper {
  font-size: 11px; color: #8A96BC;
  margin-top: 6px; font-weight: 500;
  display: flex; align-items: center; gap: 4px;
}
`;

export default function CreateViolation({ units = [], selectedTricycleId = null }) {
    // Autocomplete Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Initial load setup
    useEffect(() => {
        if (selectedTricycleId) {
            const preselected = units.find(u => u.id === selectedTricycleId);
            if (preselected) {
                setSearchQuery(preselected.label);
                setData('tricycle_id', preselected.id);
            }
        }
    }, [selectedTricycleId, units]);

    // Close autocomplete on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter units based on autocomplete search
    const filteredUnits = units.filter(u =>
        u.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Form attributes using Inertia form handler
    const { data, setData, post, processing, errors } = useForm({
        tricycle_id: selectedTricycleId || '',
        violation_type: 'color_coding',
        fine_amount: 500,
        location: '',
        notes: ''
    });

    // Reactively update default fine amounts based on violation type selection
    const handleTypeChange = (e) => {
        const type = e.target.value;
        let defaultFine = 200;
        if (type === 'color_coding') defaultFine = 500;
        else if (type === 'route_violation') defaultFine = 300;
        else if (type === 'expired_franchise') defaultFine = 1000;

        setData(prev => ({
            ...prev,
            violation_type: type,
            fine_amount: defaultFine
        }));
    };

    // Form Submit
    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('tmo.violations.store'));
    };

    return (
        <TrivoraLayout title="File Violation Ticket" role="TMO Officer">
            <Head title="File Violation Ticket | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="cv-root">
                {/* ── Navigation back ── */}
                <Link href={route('tmo.violations')} className="cv-back-link">
                    <ChevronLeft size={14} strokeWidth={3} />
                    Back to Violations
                </Link>

                {/* ── Header ── */}
                <div style={{ marginBottom: 32 }}>
                    <p className="cv-eyebrow">Apprehension Registry</p>
                    <h1 className="cv-title">File Infraction Ticket</h1>
                </div>

                {/* ── Form Card ── */}
                <form className="cv-card" onSubmit={handleSubmit}>
                    {/* Tricycle autocomplete picker */}
                    <div className="cv-group" ref={dropdownRef}>
                        <label className="cv-label">Target Tricycle Unit</label>
                        <div className="cv-search-container">
                            <input
                                type="text"
                                className="cv-input"
                                placeholder="Type tricycle unit number or plate number..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setData('tricycle_id', ''); // clear id while typing
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                            />
                            <Search size={16} className="cv-search-icon" />
                        </div>
                        
                        {showDropdown && searchQuery && filteredUnits.length > 0 && (
                            <div className="cv-dropdown">
                                {filteredUnits.map((u) => (
                                    <div
                                        key={u.id}
                                        className="cv-option"
                                        onClick={() => {
                                            setSearchQuery(u.label);
                                            setData('tricycle_id', u.id);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        {u.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {errors.tricycle_id && (
                            <span className="cv-error">
                                <AlertTriangle size={11} /> {errors.tricycle_id}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Offense Category */}
                        <div className="cv-group">
                            <label className="cv-label">Offense Category</label>
                            <select
                                className="cv-select"
                                value={data.violation_type}
                                onChange={handleTypeChange}
                            >
                                <option value="color_coding">Color Coding Violation</option>
                                <option value="route_violation">Route Violation</option>
                                <option value="expired_franchise">Expired Franchise</option>
                                <option value="other">Other/Minor Infraction</option>
                            </select>
                            {errors.violation_type && (
                                <span className="cv-error">
                                    <AlertTriangle size={11} /> {errors.violation_type}
                                </span>
                            )}
                        </div>

                        {/* Fine Amount */}
                        <div className="cv-group">
                            <label className="cv-label">Penalty Fine (₱)</label>
                            <input
                                type="number"
                                className="cv-input"
                                value={data.fine_amount}
                                onChange={e => setData('fine_amount', e.target.value)}
                                min="0"
                                step="50"
                            />
                            <span className="cv-fine-helper">
                                <Clock size={11} /> Recommended penalty fine for selected offense
                            </span>
                            {errors.fine_amount && (
                                <span className="cv-error">
                                    <AlertTriangle size={11} /> {errors.fine_amount}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="cv-group">
                        <label className="cv-label">Detected Location / Checkpoint</label>
                        <input
                            type="text"
                            className="cv-input"
                            placeholder="e.g. Barangay 2 Crossing, Plaza Frontage, Nasugbu Highway"
                            value={data.location}
                            onChange={e => setData('location', e.target.value)}
                        />
                        {errors.location && (
                            <span className="cv-error">
                                <AlertTriangle size={11} /> {errors.location}
                            </span>
                        )}
                    </div>

                    {/* Remarks / Officer Report */}
                    <div className="cv-group">
                        <label className="cv-label">Officer Remarks & Evidence Details</label>
                        <textarea
                            className="cv-textarea"
                            placeholder="Specify details (e.g. driver name, passengers carrying, or particular circumstances of deviation)"
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                        />
                        {errors.notes && (
                            <span className="cv-error">
                                <AlertTriangle size={11} /> {errors.notes}
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="cv-actions">
                        <Link href={route('tmo.violations')} className="cv-btn-cancel">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className="cv-btn-submit"
                            disabled={processing || !data.tricycle_id || !data.location}
                        >
                            <ShieldAlert size={14} />
                            {processing ? 'Logging Ticket...' : 'File Infraction Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </TrivoraLayout>
    );
}
