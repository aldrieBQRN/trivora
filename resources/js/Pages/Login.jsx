import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ShieldCheck, User, KeyRound,
    Award, Bike, Shield, ArrowLeft,
    Eye, EyeOff, AlertCircle, Loader2,
    CheckCircle2, Sparkles, Building2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Unified System Login
   Brand Primary: #25449B (Royal Nasugbu Blue)
   Senior UI/UX Designer Redesign
   Split-Screen Layout: Brand Identity & Municipal Context + Clean Auth Card
   Path: resources/js/Pages/Login.jsx
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=DM+Sans:wght@500;600;700&display=swap');

.ol-root *, .ol-root *::before, .ol-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.ol-root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0F172A;
  min-height: 100vh;
  display: flex;
  background: #F8FAFC;
}

@media (max-width: 960px) {
  .ol-root {
    flex-direction: column;
  }
}

/* ── Brand Side (Left Column: Royal Blue + Backdrop Image) ───────────── */
.ol-side {
  flex: 0 0 42%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px 44px;
  border-radius: 0 28px 28px 0;
  background: #182F72;
  box-shadow: 12px 0 36px -6px rgba(15, 23, 42, 0.22), 4px 0 14px -2px rgba(15, 23, 42, 0.12);
  z-index: 5;
}

@media (max-width: 1120px) {
  .ol-side {
    padding: 40px 32px;
    flex: 0 0 42%;
  }
}

@media (max-width: 960px) {
  .ol-side {
    flex: 0 0 auto;
    padding: 32px 24px;
    border-radius: 0 0 28px 28px;
    box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.2), 0 4px 10px -2px rgba(15, 23, 42, 0.1);
  }
}

.ol-side-backdrop {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(155deg, rgba(18, 40, 102, 0.92) 0%, rgba(37, 68, 155, 0.86) 55%, rgba(15, 33, 85, 0.95) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.ol-side-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  width: 100%;
}

@media (max-width: 960px) {
  .ol-side-content {
    gap: 24px;
  }
}

/* Clean transparent logo (No white box, no border) */
.ol-brand-logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  width: fit-content;
  transition: transform .2s ease;
}

.ol-side-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  font-family: 'DM Sans', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 20px;
  width: fit-content;
}

.ol-side-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(26px, 2.5vw, 36px);
  font-weight: 800;
  letter-spacing: -.025em;
  line-height: 1.2;
  color: #FFFFFF;
  margin-bottom: 12px;
}

.ol-side-tagline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .ol-side-tagline {
    margin-bottom: 0;
  }
}

.ol-side-tagline-word {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: .04em;
  color: #93C5FD;
}

.ol-side-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.82);
  max-width: 440px;
}

@media (max-width: 960px) {
  .ol-side-desc {
    display: none;
  }
}

/* Authorized Portals List */
.ol-portals-box {
  margin-top: 36px;
  padding: 22px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
}

@media (max-width: 960px) {
  .ol-portals-box {
    display: none;
  }
}

.ol-portals-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 14px;
}

.ol-portals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
}

.ol-portal-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #FFFFFF;
}

.ol-portal-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  flex-shrink: 0;
  margin-top: 1px;
}

.ol-portal-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #FFFFFF;
}

.ol-portal-role {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.4;
}

.ol-side-foot {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
}

@media (max-width: 960px) {
  .ol-side-foot {
    display: none;
  }
}

/* ── Form Side (Right Column: Clean White Authentication Card) ────────── */
.ol-form-side {
  flex: 1;
  position: relative;
  background: #FFFFFF;
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
}

@media (max-width: 960px) {
  .ol-form-side {
    min-height: auto;
    overflow: visible;
  }
}

.ol-content-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 40px 0;
}

@media (max-width: 640px) {
  .ol-content-topbar {
    padding: 16px 20px 0;
  }
}

.ol-topbar-logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: transform .2s ease;
}

.ol-topbar-logo:hover {
  transform: scale(1.02);
}

.ol-topbar-logo-img {
  height: 44px;
  width: auto;
  object-fit: contain;
  display: block;
}

@media (max-width: 640px) {
  .ol-topbar-logo-img {
    height: 36px;
  }
}

.ol-back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #64748B;
  text-decoration: none;
  transition: color .18s ease, transform .18s ease;
  padding: 6px 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.ol-back-link:hover {
  color: #25449B;
  transform: translateX(-3px);
}

.ol-content-center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  overflow-y: auto;
}

@media (max-width: 960px) {
  .ol-content-center {
    padding: 32px 20px 48px;
    overflow-y: visible;
  }
}

.ol-form-card {
  width: 100%;
  max-width: 440px;
  animation: olFadeIn .4s cubic-bezier(.2, 0, .2, 1) both;
}

@keyframes olFadeIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ol-form-header {
  margin-bottom: 28px;
}

.ol-form-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #25449B;
  margin-bottom: 8px;
}

.ol-form-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(24px, 2.2vw, 28px);
  font-weight: 800;
  letter-spacing: -.025em;
  color: #0F172A;
  line-height: 1.25;
  margin-bottom: 6px;
}

.ol-form-sub {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #64748B;
  line-height: 1.5;
}

/* Alert Box */
.ol-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #FEF2F2;
  border: 1px solid #FCA5A5;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 24px;
  animation: olFadeIn .25s ease both;
}

.ol-alert-icon {
  color: #DC2626;
  flex-shrink: 0;
  margin-top: 2px;
}

.ol-alert-text {
  font-size: 13px;
  font-weight: 600;
  color: #991B1B;
  line-height: 1.45;
}

/* Fields */
.ol-field-group {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 22px;
}

.ol-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ol-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ol-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ol-input-icon {
  position: absolute;
  left: 16px;
  color: #94A3B8;
  pointer-events: none;
  display: flex;
  align-items: center;
  transition: color .18s ease;
}

.ol-input {
  width: 100%;
  height: 50px;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  background: #F8FAFC;
  padding: 0 16px 0 46px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #0F172A;
  outline: none;
  transition: border-color .18s, background .18s, box-shadow .18s;
}

.ol-input:hover {
  border-color: #CBD5E1;
  background: #FFFFFF;
}

.ol-input:focus {
  border-color: #25449B;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(37, 68, 155, 0.12);
}

.ol-input-wrap:focus-within .ol-input-icon {
  color: #25449B;
}

.ol-input::placeholder {
  color: #94A3B8;
  font-weight: 400;
}

.ol-input--password {
  padding-right: 48px;
}

.ol-input--password::-ms-reveal,
.ol-input--password::-ms-clear,
.ol-input::-ms-reveal,
.ol-input::-ms-clear,
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.ol-input-toggle {
  position: absolute;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color .15s, background .15s;
}

.ol-input-toggle:hover {
  color: #25449B;
  background: #EFF4FF;
}

.ol-field-hint {
  font-size: 12px;
  color: #64748B;
  padding-left: 2px;
}

.ol-field-error {
  font-size: 12px;
  font-weight: 600;
  color: #DC2626;
  padding-left: 2px;
}

/* Options Row */
.ol-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
  font-size: 13px;
}

.ol-remember {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  color: #475569;
  font-weight: 500;
}

.ol-remember input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid #CBD5E1;
  accent-color: #25449B;
  cursor: pointer;
}

.ol-forgot-link {
  color: #25449B;
  font-weight: 700;
  text-decoration: none;
  transition: color .15s;
}

.ol-forgot-link:hover {
  color: #1B3377;
  text-decoration: underline;
}

/* Primary Button */
.ol-submit-btn {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  border: none;
  background: #25449B;
  color: #FFFFFF;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  cursor: pointer;
  box-shadow: 0 4px 14px -2px rgba(37, 68, 155, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  transition: background .18s, transform .15s, box-shadow .18s;
}

.ol-submit-btn:hover:not(:disabled) {
  background: #1B3377;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px rgba(37, 68, 155, 0.45);
}

.ol-submit-btn:disabled {
  background: #25449B;
  opacity: 0.75;
  cursor: not-allowed;
  transform: none;
}

.ol-spin {
  animation: olSpin .75s linear infinite;
}

@keyframes olSpin {
  to { transform: rotate(360deg); }
}

/* Quick Demo Access */
.ol-demo-section {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid #F1F5F9;
}

.ol-demo-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #94A3B8;
  margin-bottom: 12px;
  text-align: center;
}

.ol-demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

@media (max-width: 480px) {
  .ol-demo-grid {
    grid-template-columns: 1fr;
  }
}

.ol-demo-btn {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 10px 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all .18s ease;
}

.ol-demo-btn:hover {
  background: #FFFFFF;
  border-color: #25449B;
  color: #25449B;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.ol-demo-btn--active {
  background: #EFF4FF;
  border-color: #25449B;
  color: #25449B;
}

.ol-register-hint {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
  color: #64748B;
}

.ol-register-link {
  color: #25449B;
  font-weight: 700;
  text-decoration: none;
}

.ol-register-link:hover {
  text-decoration: underline;
}
`;

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        login_id: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    // Quick demo accounts for review and testing
    const setDemoAccount = (role) => {
        const credentials = {
            tmo: { login_id: 'tmo.jdelacruz@trivora.gov.ph', password: 'TmoUser@123' },
            bplo: { login_id: 'bplo.areyes@trivora.gov.ph', password: 'BploUser@123' },
            operator: { login_id: 'driver.test@trivora.test', password: 'TestDriver123!' },
        };

        if (credentials[role]) {
            setSelectedRole(role);
            setData({
                login_id: credentials[role].login_id,
                password: credentials[role].password,
                remember: false
            });
        }
    };

    return (
        <div className="ol-root">
            <Head title="Sign In | TRIVORA — Nasugbu, Batangas" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── Brand Side (Left Column: Royal Blue + Backdrop) ── */}
            <div className="ol-side">
                <div className="ol-side-backdrop" aria-hidden="true" />
                <div className="ol-side-content">
                    <div>
                        <div className="ol-side-badge">
                            <ShieldCheck size={13} strokeWidth={2.4} /> Nasugbu, Batangas
                        </div>

                        <h1 className="ol-side-title">
                            Smart Tricycle<br />Management System
                        </h1>

                        <div className="ol-side-tagline" aria-label="Tagline: Track, Protect, Connect">
                            <span className="ol-side-tagline-word">Track.</span>
                            <span className="ol-side-tagline-word">Protect.</span>
                            <span className="ol-side-tagline-word">Connect.</span>
                        </div>

                        <p className="ol-side-desc">
                            The central municipal platform connecting local operators, drivers, and municipal offices for streamlined franchise processing, inspections, and road management.
                        </p>
                    </div>

                    {/* Authorized Portals Overview */}
                    <div className="ol-portals-box">
                        <p className="ol-portals-title">Authorized Portals</p>
                        <ul className="ol-portals-list">
                            <li className="ol-portal-item">
                                <span className="ol-portal-icon" aria-hidden="true">
                                    <Shield size={15} strokeWidth={2.2} />
                                </span>
                                <div>
                                    <div className="ol-portal-name">Traffic Management Office (TMO)</div>
                                    <div className="ol-portal-role">Roadworthiness inspection, route scheduling &amp; verification</div>
                                </div>
                            </li>
                            <li className="ol-portal-item">
                                <span className="ol-portal-icon" aria-hidden="true">
                                    <Award size={15} strokeWidth={2.2} />
                                </span>
                                <div>
                                    <div className="ol-portal-name">Business Permits &amp; Licensing Office (BPLO)</div>
                                    <div className="ol-portal-role">Franchise application validation &amp; sticker issuance</div>
                                </div>
                            </li>
                            <li className="ol-portal-item">
                                <span className="ol-portal-icon" aria-hidden="true">
                                    <Bike size={15} strokeWidth={2.2} />
                                </span>
                                <div>
                                    <div className="ol-portal-name">Tricycle Drivers &amp; Operators</div>
                                    <div className="ol-portal-role">Franchise filing, renewal tracker &amp; color-coding guide</div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <p className="ol-side-foot">
                        &copy; 2026 TRIVORA Fleet Operations &bull; Nasugbu, Batangas
                    </p>
                </div>
            </div>

            {/* ── Form Side (Right Column: Clean Authentication Card) ── */}
            <div className="ol-form-side">
                {/* Content Topbar — matching Registration */}
                <div className="ol-content-topbar">
                    <Link href="/" className="ol-topbar-logo" title="TRIVORA — Return to Home">
                        <img src="/images/logo.png" alt="TRIVORA" className="ol-topbar-logo-img" />
                    </Link>
                    <Link href="/" className="ol-back-link">
                        <ArrowLeft size={16} strokeWidth={2.4} /> Back to Home
                    </Link>
                </div>

                <div className="ol-content-center">
                    <div className="ol-form-card">
                        <div className="ol-form-header">
                            <h2 className="ol-form-title">Welcome back</h2>
                            <p className="ol-form-sub">
                                Sign in with your registered email or mobile number to access your account.
                            </p>
                        </div>

                        {/* Auth Error Banner */}
                        {errors.login_id && (
                            <div className="ol-alert" role="alert">
                                <AlertCircle size={17} strokeWidth={2.2} className="ol-alert-icon" />
                                <p className="ol-alert-text">{errors.login_id}</p>
                            </div>
                        )}

                        <form onSubmit={submit}>
                            <div className="ol-field-group">
                                {/* Email or Mobile Number */}
                                <div className="ol-field">
                                    <label className="ol-label" htmlFor="login_id">
                                        <span>Email or Mobile Number</span>
                                    </label>
                                    <div className="ol-input-wrap">
                                        <span className="ol-input-icon" aria-hidden="true">
                                            <User size={16} strokeWidth={2.2} />
                                        </span>
                                        <input
                                            id="login_id"
                                            type="text"
                                            autoComplete="username"
                                            className="ol-input"
                                            placeholder="e.g. juan@email.com or 09171234567"
                                            value={data.login_id}
                                            onChange={e => setData('login_id', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <span className="ol-field-hint">Accepts your registered email or 11-digit mobile number.</span>
                                </div>

                                {/* Password */}
                                <div className="ol-field">
                                    <label className="ol-label" htmlFor="password">
                                        <span>Password</span>
                                    </label>
                                    <div className="ol-input-wrap">
                                        <span className="ol-input-icon" aria-hidden="true">
                                            <KeyRound size={16} strokeWidth={2.2} />
                                        </span>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            className="ol-input ol-input--password"
                                            placeholder="Enter your password"
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="ol-input-toggle"
                                            onClick={() => setShowPassword(v => !v)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="ol-field-error">{errors.password}</p>}
                                </div>
                            </div>

                            {/* Options: Remember Me & Forgot Password */}
                            <div className="ol-options-row">
                                <label className="ol-remember">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={e => setData('remember', e.target.checked)}
                                    />
                                    <span>Remember me</span>
                                </label>
                                <Link href="#" className="ol-forgot-link">
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" className="ol-submit-btn" disabled={processing}>
                                {processing ? (
                                    <>
                                        <Loader2 size={16} strokeWidth={2.5} className="ol-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={17} strokeWidth={2.4} />
                                        <span>Sign In to Portal</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Quick Demo Access for Testing */}
                        <div className="ol-demo-section">
                            <p className="ol-demo-label">Quick Demo Access</p>
                            <div className="ol-demo-grid">
                                <button
                                    type="button"
                                    className={`ol-demo-btn ${selectedRole === 'tmo' ? 'ol-demo-btn--active' : ''}`}
                                    onClick={() => setDemoAccount('tmo')}
                                >
                                    <Shield size={14} strokeWidth={2.2} /> TMO
                                </button>
                                <button
                                    type="button"
                                    className={`ol-demo-btn ${selectedRole === 'bplo' ? 'ol-demo-btn--active' : ''}`}
                                    onClick={() => setDemoAccount('bplo')}
                                >
                                    <Award size={14} strokeWidth={2.2} /> BPLO
                                </button>
                                <button
                                    type="button"
                                    className={`ol-demo-btn ${selectedRole === 'operator' ? 'ol-demo-btn--active' : ''}`}
                                    onClick={() => setDemoAccount('operator')}
                                >
                                    <Bike size={14} strokeWidth={2.2} /> Driver
                                </button>
                            </div>
                        </div>

                        {/* Don't have an MTOP yet? */}
                        <div className="ol-register-hint">
                            Don't have an MTOP permit yet?{' '}
                            <Link href="/register-mtop" className="ol-register-link">
                                Apply online
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
