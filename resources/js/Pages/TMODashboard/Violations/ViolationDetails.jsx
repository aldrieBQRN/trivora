import React from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    ChevronLeft, Calendar, MapPin, AlertTriangle,
    Map, User, Bike, Printer, CheckCircle2, Navigation
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TMO COMMAND — Violation Details (Real Leaflet Map)
   Mirrors TrivoraLayout's slate-indigo token system
   Prefix: vd-* (violation-details)
───────────────────────────────────────────────────────────────────────── */

// Custom Pulsing Pin for the Violation Location
const createViolationIcon = () => {
    return L.divIcon({
        className: 'vd-custom-pin',
        html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
                <div style="position: absolute; inset: 0; border-radius: 50%; opacity: 0.35; background-color: #EF4444; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #DC2626; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.15); z-index: 10;"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10]
    });
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.vd-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
}
.vd-root *, .vd-root *::before, .vd-root *::after { box-sizing: border-box; }

/* ── Back nav ────────────────────────────────────────────────────────── */
.vd-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 28px; flex-wrap: wrap; gap: 14px;
}
.vd-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  transition: color .18s;
}
.vd-back-link:hover { color: #1C2340; }
.vd-status-badge {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase;
  border-radius: 50px; padding: 6px 16px;
  display: inline-flex; align-items: center; gap: 6px;
}
.vd-status-unsettled {
  color: #B45309; background: rgba(217,119,6,.1); border: 1px solid rgba(217,119,6,.2);
}
.vd-status-settled {
  color: #065F46; background: rgba(5,150,105,.1); border: 1px solid rgba(5,150,105,.2);
}

/* ── Page Header ─────────────────────────────────────────────────────── */
.vd-header {
  margin-bottom: 32px;
}
.vd-eyebrow {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase;
  color: #DC2626; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.vd-eyebrow::before {
  content: ''; width: 18px; height: 1.5px; background: #DC2626; border-radius: 2px;
}
.vd-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px; font-weight: 800; letter-spacing: -.025em;
  color: #1C2340; line-height: 1; margin-bottom: 8px;
}
.vd-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 500; color: #5A6488;
}

/* ── Layout Grid ─────────────────────────────────────────────────────── */
.vd-grid {
  display: grid; grid-template-columns: 1fr 380px; gap: 24px;
}
@media (max-width: 960px) { .vd-grid { grid-template-columns: 1fr; } }

/* ── Shared Card ─────────────────────────────────────────────────────── */
.vd-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 18px;
  box-shadow: 0 1px 6px rgba(28,35,64,.05);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.vd-card-pad { padding: 32px; }
.vd-card-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340;
  margin-bottom: 24px; display: flex; align-items: center; gap: 10px;
}

/* ── Evidence Map Section (Left) ─────────────────────────────────────── */
.vd-evidence-box {
  background: #E5E7EB;
  border-radius: 14px; height: 340px;
  margin-bottom: 24px; position: relative; overflow: hidden;
  border: 1px solid rgba(28,35,64,.1);
  z-index: 1; /* Fix for leaflet */
}
.vd-map-overlay {
  position: absolute; bottom: 12px; left: 12px;
  background: rgba(28,35,64,0.9);
  color: #FFFFFF;
  padding: 6px 12px; border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  display: flex; align-items: center; gap: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  pointer-events: none;
  z-index: 1000; /* Above Leaflet controls */
}
.vd-map-ping {
  width: 6px; height: 6px; border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

/* Custom Popup Styles */
.vd-popup .leaflet-popup-content-wrapper {
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
  padding: 0;
}
.vd-popup .leaflet-popup-content {
  margin: 10px 14px;
  font-family: 'Inter', sans-serif;
}

.vd-evidence-meta-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.vd-meta-item {
  background: #FAFAFA; border: 1px solid rgba(28,35,64,.08);
  padding: 20px; border-radius: 14px;
}
.vd-meta-lbl {
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #8A96BC;
  margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
}
.vd-meta-val {
  font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
  color: #1C2340; line-height: 1.4;
}

/* ── Details Panel (Right) ───────────────────────────────────────────── */
.vd-detail-row {
  display: flex; align-items: flex-start; gap: 16px;
  padding-bottom: 20px; margin-bottom: 20px;
  border-bottom: 1px solid rgba(28,35,64,.07);
}
.vd-detail-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.vd-detail-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(28,35,64,.04); border: 1px solid rgba(28,35,64,.08);
  display: flex; align-items: center; justify-content: center;
  color: #5A6488; flex-shrink: 0;
}
.vd-detail-icon.danger {
  background: rgba(220,38,38,.06); border-color: rgba(220,38,38,.15); color: #DC2626;
}
.vd-detail-lbl {
  font-family: 'DM Sans', sans-serif; font-size: 9.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #8A96BC;
  margin-bottom: 4px;
}
.vd-detail-val {
  font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600;
  color: #1C2340; line-height: 1.4;
}

/* ── Fine Box ────────────────────────────────────────────────────────── */
.vd-fine-box {
  background: #DC2626; color: #FFFFFF;
  padding: 28px 24px; display: flex; flex-direction: column; align-items: center;
  text-align: center;
}
.vd-fine-box.settled {
  background: #059669;
}
.vd-fine-lbl {
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.7);
  margin-bottom: 8px;
}
.vd-fine-val {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 42px; font-weight: 800;
  letter-spacing: -.02em; line-height: 1;
}

/* ── Actions ─────────────────────────────────────────────────────────── */
.vd-print-btn {
  width: 100%; height: 54px; border-radius: 12px;
  border: 1.5px solid rgba(28,35,64,.15); background: #FFFFFF;
  font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase; color: #1C2340;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; transition: all .18s; margin-top: 24px;
}
.vd-print-btn:hover { background: #FAFAFA; border-color: #1C2340; box-shadow: 0 4px 12px rgba(28,35,64,.05); }
`;

export default function ViolationDetails({ violationId = 'VIO-26-8841' }) {
    // Simulated Mock Data for the specific violation
    const record = {
        id: violationId,
        date: 'April 5, 2026',
        time: '08:45 AM',
        lat: 14.0725,  // Exact Nasugbu Latitude
        lng: 120.6321, // Exact Nasugbu Longitude
        location_desc: 'Nasugbu Highway, Zone 1',
        operator: 'Ricardo Dalisay',
        toda: 'TODA D (Papaya)',
        body_no: 'N-142',
        plate_no: '8812',
        type: 'Coding Scheme Violation',
        source: 'IoT Location Tracker',
        fine: 500,
        status: 'unsettled', // 'unsettled' | 'settled'
        notes: 'GPS Tracker detected movement during a restricted operational day based on plate ending (2).'
    };

    return (
        <TrivoraLayout title="Violation Details" role="TMO Officer">
            <Head title={`Ticket ${record.id} | TRIVORA`} />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="vd-root" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 52 }}>

                {/* ── Nav ── */}
                <div className="vd-nav">
                    <Link href="/violations" className="vd-back-link">
                        <ChevronLeft size={14} strokeWidth={3} />
                        Back to Records
                    </Link>
                    <span className={`vd-status-badge ${record.status === 'unsettled' ? 'vd-status-unsettled' : 'vd-status-settled'}`}>
                        {record.status === 'unsettled' ? <AlertTriangle size={11} strokeWidth={2.5}/> : <CheckCircle2 size={11} strokeWidth={2.5}/>}
                        {record.status === 'unsettled' ? 'Unsettled Fine' : 'Settled & Cleared'}
                    </span>
                </div>

                {/* ── Header ── */}
                <div className="vd-header">
                    <p className="vd-eyebrow">Apprehension Ticket</p>
                    <h1 className="vd-title">Incident {record.id}</h1>
                    <p className="vd-subtitle">Recorded via TRIVORA IoT Network</p>
                </div>

                <div className="vd-grid">

                    {/* ════ LEFT: Evidence ════ */}
                    <div className="vd-card">
                        <div className="vd-card-pad">
                            <h2 className="vd-card-title">
                                <Map size={20} color="#4F5BCB" />
                                GPS Tracking Data
                            </h2>

                            {/* REAL Interactive Map Evidence */}
                            <div className="vd-evidence-box">
                                <MapContainer
                                    center={[record.lat, record.lng]}
                                    zoom={16}
                                    zoomControl={false}
                                    scrollWheelZoom={true}
                                    style={{ height: '100%', width: '100%', backgroundColor: '#E5E7EB', zIndex: 1 }}
                                >
                                    <TileLayer
                                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                        attribution="&copy; Google Maps"
                                    />

                                    <Marker
                                        position={[record.lat, record.lng]}
                                        icon={createViolationIcon()}
                                    >
                                        <Popup className="vd-popup">
                                            <div style={{ padding: '2px 0' }}>
                                                <p style={{ fontSize: '11.5px', fontWeight: 800, color: '#1C2340', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                                                    {record.id}
                                                </p>
                                                <p style={{ fontSize: '9px', fontWeight: 700, color: '#DC2626', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    Coding Alert
                                                </p>
                                            </div>
                                        </Popup>
                                    </Marker>

                                    <ZoomControl position="bottomright" />
                                </MapContainer>

                                {/* UI Overlay */}
                                <div className="vd-map-overlay">
                                    <span className="vd-map-ping"></span>
                                    GPS Lock: Accurate
                                </div>
                            </div>

                            <div className="vd-evidence-meta-grid">
                                <div className="vd-meta-item">
                                    <p className="vd-meta-lbl"><Calendar size={13} strokeWidth={2}/> Detection Time</p>
                                    <p className="vd-meta-val">{record.date}<br/><span style={{ fontSize: 11, color: '#5A6488' }}>{record.time}</span></p>
                                </div>
                                <div className="vd-meta-item">
                                    <p className="vd-meta-lbl"><MapPin size={13} strokeWidth={2}/> Coordinates</p>
                                    <p className="vd-meta-val">{record.lat}° N, {record.lng}° E<br/><span style={{ fontSize: 11, color: '#5A6488' }}>{record.location_desc}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════ RIGHT: Details & Fine ════ */}
                    <div className="vd-card">
                        <div className={`vd-fine-box ${record.status === 'settled' ? 'settled' : ''}`}>
                            <p className="vd-fine-lbl">Assessed Penalty</p>
                            <p className="vd-fine-val">₱{record.fine.toFixed(2)}</p>
                        </div>

                        <div className="vd-card-pad" style={{ flex: 1 }}>

                            <div className="vd-detail-row">
                                <div className="vd-detail-icon danger"><AlertTriangle size={18} /></div>
                                <div>
                                    <p className="vd-detail-lbl">Infraction Details</p>
                                    <p className="vd-detail-val" style={{ color: '#DC2626' }}>{record.type}</p>
                                    <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#5A6488', marginTop: 4, lineHeight: 1.5 }}>
                                        {record.notes}
                                    </p>
                                </div>
                            </div>

                            <div className="vd-detail-row">
                                <div className="vd-detail-icon"><User size={18} /></div>
                                <div>
                                    <p className="vd-detail-lbl">Registered Operator</p>
                                    <p className="vd-detail-val">{record.operator}</p>
                                    <p style={{ fontFamily: 'DM Sans', fontSize: 10, color: '#8A96BC', marginTop: 4 }}>{record.toda}</p>
                                </div>
                            </div>

                            <div className="vd-detail-row">
                                <div className="vd-detail-icon"><Bike size={18} /></div>
                                <div>
                                    <p className="vd-detail-lbl">Vehicle Specs</p>
                                    <p className="vd-detail-val">Plate: {record.plate_no}</p>
                                    <p className="vd-detail-val" style={{ color: '#5A6488' }}>Body No: {record.body_no}</p>
                                </div>
                            </div>

                            <button className="vd-print-btn">
                                <Printer size={15} strokeWidth={2} />
                                Print Ticket Notice
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </TrivoraLayout>
    );
}