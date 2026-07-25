import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import {
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Search,
    Filter,
    FileSearch,
    ClipboardCheck,
    Stamp,
    Wallet,
    RefreshCw,
    X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   OPERATOR PORTAL — MTOP Applications Tracker
   Path: resources/js/Pages/Operator/Compliance/MTOP.jsx
   Prefix: mtop-*
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.mtop-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  width: 100%;
  padding-bottom: 80px;
  max-width: 1400px;
  margin: 0 auto;
}
.mtop-root *, .mtop-root *::before, .mtop-root *::after { box-sizing: border-box; }

/* ── Page heading ───────────────────────────────────────────────────── */
.mtop-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .2em; text-transform: uppercase;
  color: #4F5BCB;
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px;
}
.mtop-eyebrow::before {
  content: ''; width: 24px; height: 2px;
  background: #4F5BCB; border-radius: 4px;
}
.mtop-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px; font-weight: 800; letter-spacing: -.03em;
  color: #1C2340; line-height: 1.1;
}
.mtop-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500;
  color: #64748B; margin-top: 8px;
}

/* ── Top-bar right cluster ───────────────────────────────────────────── */
.mtop-topbar {
  display: flex; align-items: flex-end; justify-content: space-between;
  flex-wrap: wrap; gap: 20px;
  margin-bottom: 40px;
}

/* ── Toolbar ────────────────────────────────────────────────────────── */
.mtop-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 24px; flex-wrap: wrap;
}
.mtop-search {
  display: flex; align-items: center; gap: 10px;
  background: #FFFFFF; border: 1px solid rgba(226,232,240, 0.8);
  border-radius: 50px; height: 48px; padding: 0 20px;
  width: 380px; transition: all .2s;
}
.mtop-search:focus-within {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
}
.mtop-search input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif; font-size: 13.5px;
  font-weight: 500; color: #1C2340; width: 100%;
}
.mtop-search input::placeholder { color: #94A3B8; font-weight: 400; }
.mtop-search-icon { color: #94A3B8; flex-shrink: 0; }
.mtop-clear-btn {
  background: none; border: none; cursor: pointer;
  color: #94A3B8; display: flex; padding: 0;
  transition: color .15s;
}
.mtop-clear-btn:hover { color: #1C2340; }

.mtop-toolbar-right { display: flex; align-items: center; gap: 12px; }
.mtop-filter-btn {
  height: 48px; padding: 0 20px; border-radius: 50px;
  border: 1px solid rgba(226,232,240, 0.8);
  background: #FFFFFF; color: #64748B;
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 10.5px;
  font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  cursor: pointer; transition: all .18s;
}
.mtop-filter-btn:hover { border-color: #CBD5E1; color: #1E293B; }

.mtop-count-badge {
  display: flex; align-items: center; gap: 8px;
  height: 48px; padding: 0 20px; border-radius: 50px;
  background: rgba(79,91,203,.05);
  border: 1px solid rgba(79,91,203,.1);
  font-family: 'DM Sans', sans-serif; font-size: 10.5px;
  font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  color: #4F5BCB;
}

/* ── Application Card ───────────────────────────────────────────────── */
.mtop-card {
  background: #FFFFFF;
  border: 1px solid #F1F5F9;
  border-radius: 20px; padding: 28px;
  box-shadow: 0 2px 10px rgba(15,23,42, 0.02);
  display: flex; align-items: center; justify-content: space-between;
  text-decoration: none; transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 16px; cursor: pointer;
}
.mtop-card:hover {
  border-color: rgba(79,91,203, 0.3);
  box-shadow: 0 12px 30px rgba(28,35,64,.06);
}

.mtop-card-left { display: flex; gap: 24px; align-items: center; flex: 1; }
.mtop-icon-box {
  width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.mtop-icon-pending  { background: rgba(79,91,203,.08); color: #4F5BCB; }
.mtop-icon-approved { background: rgba(5,150,105,.08); color: #059669; }
.mtop-icon-action   { background: rgba(217,119,6,.08); color: #D97706; } /* Changed to amber for re-submission */

.mtop-details-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px; font-weight: 800; color: #1E293B; margin-bottom: 6px;
}
.mtop-details-meta {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; color: #94A3B8;
  display: flex; gap: 16px; margin-bottom: 4px;
}
.mtop-details-meta span { color: #64748B; font-weight: 800; }

/* ── Status Pipeline ────────────────────────────────────────────────── */
.mtop-pipeline {
  display: flex; align-items: center; gap: 10px;
  margin-top: 20px; margin-bottom: 16px;
}
.mtop-step {
  display: flex; align-items: center; gap: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 9px;
  font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
}
.mtop-step.done { color: #059669; }
.mtop-step.active { color: #4F5BCB; background: rgba(79,91,203,.08); padding: 4px 12px; border-radius: 50px; }
.mtop-step.waiting { color: #94A3B8; }
.mtop-step.error { color: #D97706; background: rgba(217,119,6,.08); padding: 4px 12px; border-radius: 50px; } /* Using amber for action required */
.mtop-pipe { width: 30px; height: 2px; background: #F1F5F9; border-radius: 2px; }
.mtop-pipe.filled { background: #059669; }

.mtop-details-msg {
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; line-height: 1.5;
}

/* ── Actions ────────────────────────────────────────────────────────── */
.mtop-card-right {
  display: flex; flex-direction: column; align-items: flex-end; gap: 16px;
  min-width: 200px;
}
.mtop-status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 9.5px;
  font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
  padding: 6px 14px; border-radius: 8px; border: 1px solid transparent;
}
.mtop-status-badge.in-progress { background: rgba(79,91,203,.08); color: #4F5BCB; border-color: rgba(79,91,203,.1); }
.mtop-status-badge.completed   { background: rgba(5,150,105,.08); color: #059669; border-color: rgba(5,150,105,.1); }
.mtop-status-badge.expired     { background: rgba(220,38,38,.08); color: #DC2626; border-color: rgba(220,38,38,.1); }
.mtop-status-badge.action-req  { background: rgba(217,119,6,.08); color: #D97706; border-color: rgba(217,119,6,.1); } /* Changed to amber for softer alert */

.mtop-view-text {
  font-family: 'DM Sans', sans-serif; font-size: 10px;
  font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  color: #94A3B8; display: flex; align-items: center; gap: 6px; transition: color .15s;
}
.mtop-card:hover .mtop-view-text { color: #4F5BCB; }
`;

export default function MTOPTracker({ applications = [], auth }) {
    const [query, setQuery] = useState('');
    const operatorName = auth?.user?.name || "Driver";

    const filtered = applications.filter(a =>
        a.id.toLowerCase().includes(query.toLowerCase()) ||
        a.unit.toLowerCase().includes(query.toLowerCase())
    );

    const renderPipeline = (phase, status) => {
        const steps = [
            { id: 'tmo-docs', label: 'Requirements', icon: FileSearch },
            { id: 'tmo-phys', label: 'Physical Inspection', icon: ClipboardCheck },
            { id: 'cashier-pay', label: 'Payment', icon: Wallet },
            { id: 'bplo-release', label: 'BPLO Releasing', icon: Stamp }
        ];

        let currentIndex = 4;
        if (phase === 'tmo-docs') currentIndex = 0;
        if (phase === 'tmo-phys') currentIndex = 1;
        if (phase === 'cashier-pay') currentIndex = 2;
        if (phase === 'bplo-release') currentIndex = 3;

        return (
            <div className="mtop-pipeline">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    let stepClass = 'waiting';
                    let isFilled = false;

                    if (index < currentIndex) {
                        stepClass = 'done';
                        isFilled = true;
                    } else if (index === currentIndex) {
                        stepClass = (status === 'action-req') ? 'error' : 'active';
                    }

                    return (
                        <React.Fragment key={step.id}>
                            <div className={`mtop-step ${stepClass}`}>
                                <Icon size={12} strokeWidth={2.5} />
                                {step.label}
                            </div>
                            {index < 3 && <div className={`mtop-pipe ${isFilled ? 'filled' : ''}`} />}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    const hasExpiredApp = applications.some(a => a.is_expired || a.status === 'expired');
    const expiredAppWithCanRenew = applications.find(a => a.can_renew);
    const hasPendingRenewal = applications.some(a => a.type.includes('Renewal') && a.status === 'in-progress');

    return (
        <OperatorLayout title="MTOP Applications" operatorName={operatorName}>
            <Head title="MTOP Tracker | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="mtop-root">

                <div className="mtop-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <p className="mtop-eyebrow">Franchise & Compliance</p>
                        <h1 className="mtop-title">Application Tracker</h1>
                        <p className="mtop-subtitle">Monitor and manage your municipal franchise records.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link
                            href={route('operator.mtop.create')}
                            style={{ height: 42, padding: '0 20px', borderRadius: 10, background: '#4F5BCB', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'none', boxShadow: '0 4px 14px rgba(79,91,203,.25)', transition: 'all .2s' }}
                        >
                            + New Unit Registration
                        </Link>
                    </div>
                </div>



                <div className="mtop-toolbar">
                    <div className="mtop-search">
                        <Search size={16} strokeWidth={2.5} className="mtop-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by ID or Unit Model…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="mtop-clear-btn" onClick={() => setQuery('')}>
                                <X size={14} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                    <div className="mtop-toolbar-right">
                        <button className="mtop-filter-btn">
                            <Filter size={15} strokeWidth={2.5} />
                            Filter Status
                        </button>
                        <div className="mtop-count-badge">
                            <FileText size={14} strokeWidth={2.5} />
                            Results: {filtered.length}
                        </div>
                    </div>
                </div>

                <div className="mtop-grid">
                    {filtered.map(app => {
                        const isRedCard = app.card_color === 'red' || (app.is_expired && !app.has_pending_renewal && !app.has_active_valid);
                        const isYellowCard = app.card_color === 'yellow' || (app.is_expired && (app.has_pending_renewal || app.has_active_valid));

                        const cardStyle = isRedCard ? {
                            background: '#FFF5F5',
                            border: '1.5px solid rgba(220,38,38,.25)',
                            boxShadow: '0 4px 16px rgba(220,38,38,.04)'
                        } : isYellowCard ? {
                            background: '#FFFBEB',
                            border: '1.5px solid rgba(217,119,6,.25)',
                            boxShadow: '0 4px 16px rgba(217,119,6,.04)'
                        } : {};

                        const iconBoxStyle = isRedCard ? {
                            background: 'rgba(220,38,38,.12)',
                            color: '#DC2626'
                        } : isYellowCard ? {
                            background: 'rgba(217,119,6,.12)',
                            color: '#D97706'
                        } : {};

                        return (
                            <Link
                                key={app.id}
                                href={route('operator.mtop.details', { id: app.id })}
                                className="mtop-card"
                                style={cardStyle}
                            >
                                <div className="mtop-card-left">
                                    <div
                                        className={`mtop-icon-box ${
                                            app.status === 'completed' ? 'mtop-icon-approved' :
                                            app.status === 'action-req' ? 'mtop-icon-action' : 'mtop-icon-pending'
                                        }`}
                                        style={iconBoxStyle}
                                    >
                                        <FileText size={24} strokeWidth={2} />
                                    </div>

                                    <div>
                                        <h3 className="mtop-details-title" style={{ margin: 0 }}>{app.type}: {app.unit}</h3>
                                        <div className="mtop-details-meta" style={{ marginTop: 4 }}>
                                            <p>Tracking ID: <span>{app.id}</span></p>
                                            <p>Submission: <span>{app.date}</span></p>
                                        </div>

                                        {app.status !== 'completed' && !isRedCard && !isYellowCard && renderPipeline(app.phase, app.status)}

                                        <p className="mtop-details-msg" style={{
                                            color: isRedCard ? '#DC2626' : (isYellowCard ? '#B45309' : (app.status === 'action-req' ? '#D97706' : '#64748B')),
                                            marginTop: (isRedCard || isYellowCard) ? 6 : 0,
                                            fontWeight: (isRedCard || isYellowCard) ? 700 : 500
                                        }}>
                                            {app.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="mtop-card-right">
                                    <span className={`mtop-status-badge ${app.status}`} style={
                                        isRedCard ? { background: 'rgba(220,38,38,.12)', color: '#DC2626', borderColor: 'rgba(220,38,38,.2)' } :
                                        isYellowCard ? { background: 'rgba(217,119,6,.12)', color: '#D97706', borderColor: 'rgba(217,119,6,.2)' } : {}
                                    }>
                                        {app.status === 'completed' ? <CheckCircle2 size={12} strokeWidth={3}/> :
                                         isRedCard ? <AlertCircle size={12} strokeWidth={3}/> :
                                         isYellowCard ? <Clock size={12} strokeWidth={3}/> :
                                         app.status === 'action-req' ? <AlertCircle size={12} strokeWidth={3}/> :
                                         <Clock size={12} strokeWidth={3}/>}
                                        {app.status === 'completed' ? 'Approved' :
                                         isRedCard ? 'Expired' :
                                         isYellowCard ? 'Expired (Renewed)' :
                                         app.status === 'action-req' ? (app.phase === 'tmo-phys' ? 'Re-inspection' : 'Re-submission') : 'In Progress'}
                                    </span>

                                    <div className="mtop-view-text" style={{ color: isRedCard ? '#DC2626' : (isYellowCard ? '#D97706' : undefined) }}>
                                        Track Status <ChevronRight size={14} strokeWidth={3} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 0', background: '#FFF', borderRadius: '24px', border: '1px dashed #E2E8F0' }}>
                            <FileText size={48} strokeWidth={1} style={{ margin: '0 auto 16px', color: '#94A3B8', opacity: 0.5 }} />
                            <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: 800, color: '#1E293B' }}>No applications found</p>
                            <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#64748B', marginTop: 4 }}>We couldn't find any records matching your search.</p>
                        </div>
                    )}
                </div>

            </div>
        </OperatorLayout>
    );
}