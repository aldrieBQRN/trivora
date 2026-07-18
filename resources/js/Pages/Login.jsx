import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ShieldCheck, User, KeyRound, ArrowLeft,
    Banknote, Award, Bike, Shield
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Unified System Login (With Demo Accounts)
   Matches Welcome.jsx / PublicApply.jsx design system
   Plus Jakarta Sans · Inter · DM Sans · Navy #1C2340 · Indigo #4F5BCB
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ol-root *, .ol-root *::before, .ol-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.ol-root {
  font-family: 'Inter', sans-serif;
  background: #EDEEF4;
  color: #1C2340;
  min-height: 100vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* ── Full Screen Photo Backdrop ──────────────────────────────────────── */
.ol-backdrop {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background-image:
    linear-gradient(to bottom, rgba(28, 35, 64, 0.75) 0%, rgba(28, 35, 64, 0.95) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}
/* Subtle tech dot grid overlay */
.ol-backdrop::before {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

/* ── Center Layout ───────────────────────────────────────────────────── */
.ol-center-container {
  position: relative; z-index: 10;
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 20px;
}

/* ── Card ────────────────────────────────────────────────────────────── */
.ol-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 16px 40px rgba(0,0,0,.25);
  width: 100%; max-width: 420px;
  animation: olFadeUp .5s cubic-bezier(.2,0,.2,1) both;
}
@media (max-width: 480px) { .ol-card { padding: 36px 28px; } }
@keyframes olFadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Card branding (Clean Logo) ──────────────────────────────────────── */
.ol-brand {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; margin-bottom: 32px;
}
.ol-brand-icon {
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.ol-brand-logo {
  height: 56px; width: auto; object-fit: contain; display: block;
}
.ol-brand-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 26px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340;
  line-height: 1; margin-bottom: 8px;
}
.ol-brand-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC;
}

/* ── Divider ─────────────────────────────────────────────────────────── */
.ol-divider {
  height: 1px;
  background: rgba(28,35,64,.07);
  margin-bottom: 32px;
}

/* ── Fields ──────────────────────────────────────────────────────────── */
.ol-fields { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }

.ol-label {
  display: block;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #5A6488; margin-bottom: 8px; padding-left: 2px;
}
.ol-input-wrap { position: relative; }
.ol-input-icon {
  position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
  color: #8A96BC; pointer-events: none;
  display: flex; align-items: center;
}
.ol-input {
  width: 100%; height: 52px;
  border: 1.5px solid rgba(28,35,64,.12);
  border-radius: 12px; background: #FAFAFA;
  padding: 0 16px 0 46px;
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 500; color: #1C2340;
  outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
}
.ol-input:hover { border-color: rgba(28,35,64,.2); background: #FFFFFF; }
.ol-input:focus {
  border-color: rgba(79,91,203,.45);
  box-shadow: 0 0 0 3px rgba(79,91,203,.1);
  background: #FFFFFF;
}
.ol-input::placeholder { color: #9AA3CC; font-weight: 400; }
.ol-error {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #DC2626; margin-top: 6px; padding-left: 2px;
}

/* ── Options row ─────────────────────────────────────────────────────── */
.ol-options {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 32px;
}
.ol-remember {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
}
.ol-remember input[type="checkbox"] {
  width: 16px; height: 16px; border-radius: 5px;
  border: 1.5px solid rgba(28,35,64,.2);
  accent-color: #1C2340; cursor: pointer;
}
.ol-remember-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #5A6488; cursor: pointer; transition: color .18s;
}
.ol-remember:hover .ol-remember-label { color: #1C2340; }
.ol-forgot {
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #5A6488; text-decoration: none; transition: color .18s;
}
.ol-forgot:hover { color: #4F5BCB; }

/* ── Submit button ───────────────────────────────────────────────────── */
.ol-btn {
  width: 100%; height: 54px; border-radius: 12px;
  border: none; background: #1C2340; color: #FFFFFF;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .18s, box-shadow .18s, transform .12s;
  box-shadow: 0 4px 16px rgba(28,35,64,.25);
}
.ol-btn:hover:not(:disabled) {
  background: #2E3A9E;
  box-shadow: 0 6px 22px rgba(28,35,64,.3);
  transform: translateY(-1px);
}
.ol-btn:disabled {
  background: rgba(28,35,64,.15);
  color: rgba(28,35,64,.35);
  box-shadow: none; cursor: not-allowed; transform: none;
}

/* ── Return Link ─────────────────────────────────────────────────────── */
.ol-return-link {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 18px; width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none;
  transition: color .2s;
}
.ol-return-link:hover { color: #1C2340; }

/* ── Demo Accounts Section ───────────────────────────────────────────── */
.ol-demo-wrap {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px dashed rgba(28,35,64,.1);
}
.ol-demo-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .15em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 12px; text-align: center;
}
.ol-demo-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.ol-demo-btn {
  background: #FAFAFC; border: 1px solid rgba(28,35,64,.08);
  border-radius: 8px; padding: 10px 12px;
  font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
  color: #5A6488; cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ol-demo-btn:hover {
  background: #FFFFFF; border-color: #4F5BCB; color: #4F5BCB;
  box-shadow: 0 2px 8px rgba(79,91,203,.1);
}

/* ── Footer note ─────────────────────────────────────────────────────── */
.ol-footer-note {
  position: absolute; bottom: 32px; left: 0; right: 0;
  text-align: center; z-index: 10;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: rgba(255,255,255,.4);
}
`;

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        login_id: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    // Auto-fill form fields for quick demo access
    const setDemoAccount = (role) => {
        const credentials = {
            tmo: { login_id: 'tmo.jdelacruz@trivora.gov.ph', password: 'TmoUser@123' },
            cashier: { login_id: 'treasurer@trivora.gov.ph', password: 'Treasurer@123' },
            bplo: { login_id: 'bplo.areyes@trivora.gov.ph', password: 'BploUser@123' },
            operator: { login_id: 'driver.pramos@trivora.ph', password: 'Driver@123' }
        };

        setData({
            login_id: credentials[role].login_id,
            password: credentials[role].password,
            remember: false
        });
    };

    return (
        <div className="ol-root">
            <Head title="System Login | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* Full screen backdrop */}
            <div className="ol-backdrop" />

            {/* ── CENTERED CONTENT ── */}
            <div className="ol-center-container">
                <div className="ol-card">
                    {/* Branding with Clean Logo */}
                    <div className="ol-brand">
                        <div className="ol-brand-icon">
                            <img src="/images/logo.png" alt="TRIVORA" className="ol-brand-logo" />
                        </div>
                        <p className="ol-brand-title">System Access</p>
                        <p className="ol-brand-sub">TRIVORA Unified Portal</p>
                    </div>

                    <div className="ol-divider" />

                    {/* Form */}
                    <form onSubmit={submit}>
                        <div className="ol-fields">
                            {/* Generic Email/Mobile Input */}
                            <div>
                                <label className="ol-label">Email or Mobile Number</label>
                                <div className="ol-input-wrap">
                                    <span className="ol-input-icon">
                                        <User size={16} strokeWidth={2} />
                                    </span>
                                    <input
                                        type="text"
                                        className="ol-input"
                                        placeholder="Enter email or mobile no."
                                        value={data.login_id}
                                        onChange={e => setData('login_id', e.target.value)}
                                    />
                                </div>
                                {errors.login_id && <p className="ol-error">{errors.login_id}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="ol-label">Password</label>
                                <div className="ol-input-wrap">
                                    <span className="ol-input-icon">
                                        <KeyRound size={16} strokeWidth={2} />
                                    </span>
                                    <input
                                        type="password"
                                        className="ol-input"
                                        placeholder="Enter your password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                    />
                                </div>
                                {errors.password && <p className="ol-error">{errors.password}</p>}
                            </div>
                        </div>

                        {/* Remember + Forgot */}
                        <div className="ol-options">
                            <label className="ol-remember">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={e => setData('remember', e.target.checked)}
                                />
                                <span className="ol-remember-label">Remember me</span>
                            </label>
                            <Link href="#" className="ol-forgot">Forgot Password?</Link>
                        </div>

                        {/* Submit */}
                        <button type="submit" className="ol-btn" disabled={processing}>
                            <ShieldCheck size={16} strokeWidth={2} />
                            Secure Login
                        </button>

                        {/* Return Link */}
                        <Link href="/" className="ol-return-link">

                            Return to Home
                        </Link>
                    </form>

                    {/* ── Quick Demo Access ── */}
                    <div className="ol-demo-wrap">
                        <p className="ol-demo-title">Quick Demo Access</p>
                        <div className="ol-demo-grid">
                            <button type="button" className="ol-demo-btn" onClick={() => setDemoAccount('tmo')}>
                                <Shield size={14} strokeWidth={2} /> TMO
                            </button>
                            <button type="button" className="ol-demo-btn" onClick={() => setDemoAccount('cashier')}>
                                <Banknote size={14} strokeWidth={2} /> Treasurer
                            </button>
                            <button type="button" className="ol-demo-btn" onClick={() => setDemoAccount('bplo')}>
                                <Award size={14} strokeWidth={2} /> BPLO
                            </button>
                            <button type="button" className="ol-demo-btn" onClick={() => setDemoAccount('operator')}>
                                <Bike size={14} strokeWidth={2} /> Driver
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer note */}
            <p className="ol-footer-note">
                Authorized LGU Personnel &amp; Operators Only
            </p>
        </div>
    );
}