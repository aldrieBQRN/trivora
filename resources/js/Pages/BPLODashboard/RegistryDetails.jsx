import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link } from '@inertiajs/react';
import BPLOLayout from '@/Layouts/BPLOLayout';
import {
    ArrowLeft,
    Calendar,
    Eye,
    Bike,
    MapPin,
    User,
    FileCheck2,
    FileText,
    CheckCircle2,
    Phone,
    Gauge,
} from 'lucide-react';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.rd-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 48px;
}
.rd-root *, .rd-root *::before, .rd-root *::after { box-sizing: border-box; }

/* Back nav */
.rd-nav {
  display: flex;
  align-items: center;
  margin-bottom: 28px;
}
.rd-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #8A96BC;
  text-decoration: none;
  transition: color .18s;
}
.rd-back-link:hover { color: #1C2340; }

/* Hero + Operator card */
.rd-hero-shell {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.12);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(28,35,64,.15);
  margin-bottom: 34px;
}

.rd-hero {
  background: linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%);
  border-radius: 20px 20px 0 0;
  padding: 34px 38px;
  position: relative;
  overflow: hidden;
}
.rd-hero-bg-icon {
  position: absolute;
  top: 50%;
  right: -24px;
  transform: translateY(-50%);
  color: #FFFFFF;
  opacity: .08;
  pointer-events: none;
}
.rd-hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 30px;
  align-items: center;
}
@media (max-width: 768px) {
  .rd-hero-inner { grid-template-columns: 1fr; }
}
.rd-hero-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #FFFFFF;
  margin-bottom: 10px;
}
.rd-hero-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -.025em;
  color: #FFFFFF;
  line-height: 1;
  margin-bottom: 14px;
}
.rd-hero-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.rd-hero-meta-item {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #FFFFFF;
}
.rd-hero-logo {
  max-width: 120px;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
}

.rd-hero-content {
  display: flex;
  flex-direction: column;
}

.rd-op-wrap { padding: 24px; }
.rd-op-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}
.rd-op-field {
  display: flex;
  align-items: center;
  gap: 14px;
}
.rd-op-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(79,91,203,.08);
  color: #4F5BCB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rd-op-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #8A96BC;
  margin-bottom: 4px;
}
.rd-op-value {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1C2340;
}

/* Requirements section */
.rd-section { margin-bottom: 28px; }
.rd-section-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .17em;
  text-transform: uppercase;
  color: #4F5BCB;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.rd-section-label::before {
  content: '';
  width: 18px;
  height: 1.5px;
  background: #4F5BCB;
  border-radius: 2px;
}

.rd-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  overflow: hidden;
}
.rd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(28,35,64,.07);
  background: rgba(79,91,203,.05);
}
.rd-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .11em;
  text-transform: uppercase;
  color: #4F5BCB;
}
.rd-count {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #5A6488;
}

.rd-table { width: 100%; border-collapse: collapse; }
.rd-table th {
  text-align: left;
  padding: 12px 18px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: #8A96BC;
  border-bottom: 1px solid rgba(28,35,64,.06);
}
.rd-table td {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(28,35,64,.05);
  font-size: 13px;
  color: #1C2340;
}
.rd-table tr:last-child td { border-bottom: none; }

.rd-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: .11em;
  text-transform: uppercase;
  border: 1px solid transparent;
}
.rd-status-verified {
  background: rgba(16,185,129,.12);
  color: #047857;
  border-color: rgba(16,185,129,.28);
}

.rd-preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(79,91,203,.25);
  background: rgba(79,91,203,.08);
  color: #2E3A9E;
  text-decoration: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}
.rd-preview-btn:hover {
  background: rgba(79,91,203,.14);
}

/* Preview modal */
.rd-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(10,14,50,.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.rd-modal {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(28,35,64,.2);
  width: 100%;
  max-width: 760px;
  overflow: hidden;
}
.rd-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(28,35,64,.07);
}
.rd-modal-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: #1C2340;
  letter-spacing: -.02em;
}
.rd-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #8A96BC;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.rd-modal-close:hover { color: #1C2340; }
.rd-modal-body {
  background: #F4F6FF;
  padding: 12px;
}
.rd-modal-image {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  background: #FFFFFF;
  border-radius: 10px;
}
.rd-modal-frame {
  width: 100%;
  height: 70vh;
  border: none;
  border-radius: 10px;
  background: #FFFFFF;
}

.rd-no-data {
  padding: 40px 24px;
  text-align: center;
  color: #8A96BC;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}
`;

export default function RegistryDetails({ registry }) {
    const requirements = registry?.requirements || [];
    const [previewDoc, setPreviewDoc] = useState(null);

    const isImagePreview = (url = '') => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url);

    return (
        <BPLOLayout title="Registry Details" role="BPLO Officer">
            <Head title={`Registry Details | ${registry?.plate_no || 'TRIVORA'}`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="rd-root" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 48 }}>
                <div className="rd-nav">
                    <Link href="/bplo/registry" className="rd-back-link">
                        <ArrowLeft size={14} strokeWidth={3} />
                        Back to Registry
                    </Link>
                </div>

                {/* ── Hero Section + Operator Info ── */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(28,35,64,.12)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(28,35,64,.15)', marginBottom: '40px' }}>
                    <div className="rd-hero" style={{ background: 'linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%)', borderRadius: '20px 20px 0 0', marginBottom: 0 }}>
                        <Bike size={64} className="rd-hero-bg-icon" style={{ opacity: 0.08, color: '#1C2340' }} />
                        <div className="rd-hero-inner">
                            <div className="rd-hero-content">
                                <p className="rd-hero-label" style={{ color: '#FFFFFF' }}>Tricycle Unit ID</p>
                                <h1 className="rd-hero-title" style={{ color: '#FFFFFF' }}>{registry?.body_no || '-'}</h1>
                                <div className="rd-hero-meta">
                                    <span className="rd-hero-meta-item" style={{ color: '#FFFFFF' }}>
                                        <span>Plate: {registry?.plate_no || '-'}</span>
                                    </span>
                                    <span className="rd-hero-meta-item" style={{ color: '#FFFFFF' }}>
                                        <span>{registry?.make || '-'}</span>
                                    </span>
                                    <span className="rd-hero-meta-item" style={{ color: '#FFFFFF' }}>
                                        <span>{registry?.status === 'active' ? '✓ Active' : '⊗ Suspended'}</span>
                                    </span>
                                </div>
                            </div>
                            <img src="/images/logo.png" alt="Logo" style={{ maxWidth: '120px', height: 'auto', objectFit: 'contain', borderRadius: '12px' }} />
                        </div>
                    </div>

                    {/* Operator info inside same card */}
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <User size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Owner/Operator</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.operator || '-'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Phone size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Contact</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.contact || '-'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>TODA/Route</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.toda || '-'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Calendar size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Coding Day</p>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.coding_day || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rd-section">
                    <p className="rd-section-label">Vehicle Specifications</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', padding: '24px', backgroundColor: '#FFFFFF', border: '1px solid rgba(28,35,64,.08)', borderRadius: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bike size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Make & Model</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.make || '-'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Gauge size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Engine Number</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.engine_number || '-'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Gauge size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Chassis Number</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.chassis_number || '-'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Bike size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>Plate Number</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.plate_no || '-'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79,91,203,.08)', color: '#4F5BCB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <MapPin size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8A96BC', marginBottom: '4px' }}>TODA Assignment</p>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#1C2340' }}>{registry?.toda || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rd-section">
                    <p className="rd-section-label">Requirements</p>
                    <div className="rd-card">
                        <div className="rd-head">
                            <div className="rd-head-left">
                                <FileCheck2 size={14} strokeWidth={2.2} />
                                Submitted Requirements
                            </div>
                            <p className="rd-count">Total: {requirements.length}</p>
                        </div>

                        {requirements.length === 0 ? (
                            <div className="rd-no-data">No requirement documents available</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="rd-table">
                                    <thead>
                                        <tr>
                                            <th>Document</th>
                                            <th>Verification</th>
                                            <th>Preview File</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requirements.map((doc, idx) => (
                                            <tr key={`${doc.name}-${idx}`}>
                                                <td style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <FileText size={14} strokeWidth={2} style={{ color: '#4F5BCB' }} />
                                                    {doc.name}
                                                </td>
                                                <td>
                                                    <span className="rd-status rd-status-verified">
                                                        <CheckCircle2 size={11} strokeWidth={2.3} />
                                                        Verified
                                                    </span>
                                                </td>
                                                <td>
                                                    {/* ALWAYS route to the orcr preview blade template */}
                                                    <button
                                                        type="button"
                                                        className="rd-preview-btn"
                                                        onClick={() => setPreviewDoc({ name: doc.name, url: '/document/orcr-preview' })}
                                                    >
                                                        <Eye size={12} strokeWidth={2.2} />
                                                        Preview File
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {previewDoc && createPortal(
                    <div className="rd-modal-overlay" onClick={() => setPreviewDoc(null)}>
                        <div className="rd-modal" onClick={e => e.stopPropagation()}>
                            <div className="rd-modal-header">
                                <p className="rd-modal-title">Document Preview - {previewDoc.name}</p>
                                <button type="button" className="rd-modal-close" onClick={() => setPreviewDoc(null)}>
                                    Close
                                </button>
                            </div>
                            <div className="rd-modal-body">
                                {isImagePreview(previewDoc.url) ? (
                                    <img src={previewDoc.url} alt={previewDoc.name} className="rd-modal-image" />
                                ) : (
                                    <iframe src={previewDoc.url} className="rd-modal-frame" title={`${previewDoc.name} Preview`} />
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </BPLOLayout>
    );
}