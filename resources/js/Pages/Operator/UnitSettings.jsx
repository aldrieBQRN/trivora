import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import OperatorLayout from '@/Layouts/OperatorLayout';
import Swal from 'sweetalert2';
import {
    ArrowLeft,
    Settings,
    Bell,
    Smartphone,
    BatteryMedium,
    Wifi,
    RefreshCw,
    Save
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   DRIVER PORTAL — Unit Settings (Full-Width Enterprise View)
   Path: resources/js/Pages/Operator/UnitSettings.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.us-root { font-family: 'Inter', sans-serif; color: #1C2340; padding-bottom: 64px; max-width: 1440px; margin: 0 auto; }
.us-root *, .us-root *::before, .us-root *::after { box-sizing: border-box; }

/* ── Header ── */
.us-topbar { margin-bottom: 32px; }
.us-back-btn {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: #5A6488;
    text-decoration: none; transition: color .2s; margin-bottom: 24px;
}
.us-back-btn:hover { color: #1C2340; }

.us-title-wrap { display: flex; align-items: center; gap: 16px; }
.us-title-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(79,91,203,.1) 0%, rgba(79,91,203,.05) 100%);
    border: 1px solid rgba(79,91,203,.15); color: #4F5BCB;
    display: flex; align-items: center; justify-content: center;
}
.us-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -.02em; color: #1C2340; line-height: 1.1; }
.us-subtitle { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5A6488; margin-top: 4px; }

/* ── Settings Layout (Full Width Adjustments) ── */
.us-grid { display: grid; grid-template-columns: 320px 1fr; gap: 40px; align-items: start; }
@media (max-width: 1024px) { .us-grid { grid-template-columns: 280px 1fr; gap: 24px; } }
@media (max-width: 768px) { .us-grid { grid-template-columns: 1fr; } }

/* ── Sidebar Nav ── */
.us-nav { display: flex; flex-direction: column; gap: 8px; }
.us-nav-item {
    display: flex; align-items: center; gap: 12px; padding: 14px 18px;
    border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 14.5px; font-weight: 600;
    color: #5A6488; background: transparent; border: 1px solid transparent;
    cursor: pointer; transition: all .2s; text-align: left;
}
.us-nav-item:hover { background: rgba(28,35,64,.03); color: #1C2340; }
.us-nav-item.active { background: #FFFFFF; border-color: rgba(28,35,64,.1); color: #4F5BCB; box-shadow: 0 2px 8px rgba(28,35,64,.04); }

/* ── Cards ── */
.us-card {
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.08); border-radius: 20px;
    box-shadow: 0 4px 20px rgba(28,35,64,.03); overflow: hidden; margin-bottom: 24px;
}
.us-card-header { padding: 32px 40px; border-bottom: 1px dashed rgba(28,35,64,.08); background: rgba(79,91,203,.02); }
.us-card-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #1C2340; }
.us-card-desc { font-size: 14px; font-weight: 500; color: #8A96BC; margin-top: 6px; }

.us-card-body { padding: 16px 40px 40px; }

/* ── Toggles / Rows ── */
.us-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 28px 0; border-bottom: 1px solid rgba(28,35,64,.05); gap: 24px;
}
.us-row:last-child { border-bottom: none; }
.us-row-info { flex: 1; }
.us-row-title { font-size: 15.5px; font-weight: 700; color: #1C2340; margin-bottom: 6px; }
.us-row-desc { font-size: 13.5px; font-weight: 500; color: #5A6488; line-height: 1.6; max-width: 600px; }

/* Custom Toggle Switch */
.us-toggle {
    position: relative; width: 48px; height: 26px; background: #E2E8F0;
    border-radius: 50px; cursor: pointer; transition: background .3s; flex-shrink: 0;
}
.us-toggle.active { background: #059669; }
.us-toggle::after {
    content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px;
    background: #FFFFFF; border-radius: 50%; transition: transform .3s, box-shadow .3s;
    box-shadow: 0 2px 4px rgba(0,0,0,.1);
}
.us-toggle.active::after { transform: translateX(22px); }

/* ── Device Info Box ── */
.us-device-box {
    background: #F8F9FC; border: 1px solid rgba(28,35,64,.06); border-radius: 14px;
    padding: 24px; display: flex; align-items: center; justify-content: space-between;
    margin: 24px 0 16px;
}
.us-device-left { display: flex; align-items: center; gap: 20px; }
.us-device-icon { width: 52px; height: 52px; background: rgba(5,150,105,.1); color: #059669; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.us-device-id { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #8A96BC; margin-bottom: 6px; }
.us-device-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: #1C2340; }

.us-restart-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px;
    background: #FFFFFF; border: 1px solid rgba(28,35,64,.15); border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: #1C2340; cursor: pointer;
    transition: all .2s;
}
.us-restart-btn:hover { background: #F3F4F6; border-color: rgba(28,35,64,.3); }

/* ── Save Button ── */
.us-save-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%;
    padding: 20px; border-radius: 14px; background: #1C2340; color: #FFFFFF;
    font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase; border: none; cursor: pointer;
    box-shadow: 0 4px 14px rgba(28,35,64,.2); transition: all .2s;
}
.us-save-btn:hover { background: #2E3A9E; box-shadow: 0 6px 20px rgba(79,91,203,.3); transform: translateY(-1px); }
`;

export default function UnitSettings({ tricycle }) {
    const [activeTab, setActiveTab] = useState('notifications');
    const [trackingMode, setTrackingMode] = useState(tricycle?.active_tracking_mode || 'mobile_app');
    const [iotDeviceId, setIotDeviceId] = useState(tricycle?.iot_device_id || 'TRV-GPS-992');

    // Toggle States
    const [settings, setSettings] = useState({
        smsAlerts: true,
        codingWarning: true,
        batteryWarning: true,
        zoneAlert: false,
    });

    const toggleSetting = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Upgraded Save Action with SweetAlert2
    const handleSave = () => {
        Swal.fire({
            title: 'Settings Saved!',
            text: 'Your device preferences and alerts have been updated successfully.',
            icon: 'success',
            confirmButtonColor: '#059669', // Matches your emerald success token
            color: '#1C2340', // Dark slate text
            background: '#FFFFFF',
            borderRadius: '16px',
            customClass: {
                title: 'font-jakarta', // Hooking into your global font variables if available
                popup: 'font-inter'
            }
        });
    };

    return (
        <OperatorLayout title="Unit Settings" operatorName="Mario Dela Cruz">
            <Head title="Unit Settings | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <div className="us-root">

                {/* ── HEADER ── */}
                <div className="us-topbar">
                    <Link href={route('operator.fleet')} className="us-back-btn">
                        <ArrowLeft size={14} strokeWidth={2.5} /> Back to My Tricycle
                    </Link>
                    <div className="us-title-wrap">
                        <div className="us-title-icon">
                            <Settings size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="us-title">Unit Settings</h1>
                            <p className="us-subtitle">Configure text alerts and GPS tracker settings for NSB-123.</p>
                        </div>
                    </div>
                </div>

                {/* ── MAIN GRID ── */}
                <div className="us-grid">

                    {/* Sidebar Nav */}
                    <div className="us-nav">
                        <button
                            className={`us-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <Bell size={18} /> Notification Alerts
                        </button>
                        <button
                            className={`us-nav-item ${activeTab === 'device' ? 'active' : ''}`}
                            onClick={() => setActiveTab('device')}
                        >
                            <Smartphone size={18} /> GPS Tracker Settings
                        </button>
                    </div>

                    {/* Content Area */}
                    <div>
                        {activeTab === 'notifications' && (
                            <div className="us-card">
                                <div className="us-card-header">
                                    <h2 className="us-card-title">Notification Preferences</h2>
                                    <p className="us-card-desc">Choose which automated alerts you want to receive for this tricycle.</p>
                                </div>
                                <div className="us-card-body">

                                    <div className="us-row">
                                        <div className="us-row-info">
                                            <h3 className="us-row-title">Text Message (SMS) Alerts</h3>
                                            <p className="us-row-desc">Receive critical notifications directly to your registered mobile phone (0912***6789).</p>
                                        </div>
                                        <div className={`us-toggle ${settings.smsAlerts ? 'active' : ''}`} onClick={() => toggleSetting('smsAlerts')} />
                                    </div>

                                    <div className="us-row">
                                        <div className="us-row-info">
                                            <h3 className="us-row-title">Color Coding Reminders</h3>
                                            <p className="us-row-desc">Get a text reminder 12 hours before your restricted coding day (e.g., Sunday night if your coding is Monday).</p>
                                        </div>
                                        <div className={`us-toggle ${settings.codingWarning ? 'active' : ''}`} onClick={() => toggleSetting('codingWarning')} />
                                    </div>

                                    <div className="us-row">
                                        <div className="us-row-info">
                                            <h3 className="us-row-title">Out of Boundary Alert</h3>
                                            <p className="us-row-desc">Notify me immediately if the tricycle leaves the assigned municipal boundary or TODA zone.</p>
                                        </div>
                                        <div className={`us-toggle ${settings.zoneAlert ? 'active' : ''}`} onClick={() => toggleSetting('zoneAlert')} />
                                    </div>

                                </div>
                            </div>
                        )}

                        {activeTab === 'device' && (
                            <div className="us-card">
                                <div className="us-card-header">
                                    <h2 className="us-card-title">GPS Telemetry & Location Setup</h2>
                                    <p className="us-card-desc">Choose how real-time location data is shared for municipal fleet compliance.</p>
                                </div>
                                <div className="us-card-body">

                                    <div style={{ marginBottom: 24 }}>
                                        <h3 className="us-row-title" style={{ marginBottom: 8 }}>Active Location Source</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setTrackingMode('mobile_app')}
                                                style={{
                                                    padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                                                    background: trackingMode === 'mobile_app' ? '#EEF2FF' : '#F8FAFC',
                                                    border: trackingMode === 'mobile_app' ? '2px solid #4F5BCB' : '1px solid #E2E8F0',
                                                    transition: 'all .15s'
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, fontSize: '13px', color: '#1C2340' }}>📱 Driver Mobile App GPS</div>
                                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Transmits via smartphone native GPS when on duty.</div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setTrackingMode('iot_device')}
                                                style={{
                                                    padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                                                    background: trackingMode === 'iot_device' ? '#ECFDF5' : '#F8FAFC',
                                                    border: trackingMode === 'iot_device' ? '2px solid #059669' : '1px solid #E2E8F0',
                                                    transition: 'all .15s'
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, fontSize: '13px', color: '#1C2340' }}>📡 Smart GPS Tracker Box</div>
                                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Transmits automatically from onboard hardware box.</div>
                                            </button>
                                        </div>
                                    </div>

                                    {trackingMode === 'iot_device' ? (
                                        <div className="us-device-box">
                                            <div className="us-device-left">
                                                <div className="us-device-icon"><Wifi size={24} /></div>
                                                <div>
                                                    <p className="us-device-id">Device ID: {iotDeviceId}</p>
                                                    <p className="us-device-name">Status: Connected & Active</p>
                                                </div>
                                            </div>
                                            <button className="us-restart-btn" onClick={() => {
                                                Swal.fire({
                                                    title: 'Syncing...',
                                                    text: 'Pinging the hardware GPS tracker.',
                                                    icon: 'info',
                                                    timer: 1500,
                                                    showConfirmButton: false
                                                });
                                            }}>
                                                <RefreshCw size={14} /> Refresh Connection
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="us-device-box" style={{ background: 'rgba(79,91,203,.06)', border: '1px solid rgba(79,91,203,.2)' }}>
                                            <div className="us-device-left">
                                                <div className="us-device-icon" style={{ background: '#4F5BCB', color: '#fff' }}><Smartphone size={24} /></div>
                                                <div>
                                                    <p className="us-device-id" style={{ color: '#1C2340' }}>Mode: Driver Mobile App GPS</p>
                                                    <p className="us-device-name" style={{ color: '#4F5BCB' }}>Active • Trivora Driver App Installed</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="us-row">
                                        <div className="us-row-info">
                                            <h3 className="us-row-title">Low Battery Warning</h3>
                                            <p className="us-row-desc">Send a text message alert when the tracking device battery drops below 15%.</p>
                                        </div>
                                        <div className={`us-toggle ${settings.batteryWarning ? 'active' : ''}`} onClick={() => toggleSetting('batteryWarning')} />
                                    </div>

                                </div>
                            </div>
                        )}

                        <button className="us-save-btn" onClick={handleSave}>
                            <Save size={18} /> Save Settings
                        </button>
                    </div>

                </div>
            </div>
        </OperatorLayout>
    );
}