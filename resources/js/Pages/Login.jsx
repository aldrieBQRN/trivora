import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ShieldCheck, User, KeyRound, ArrowLeft,
    Banknote, Award, Bike, Shield,
    Eye, EyeOff, AlertCircle, Loader2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Unified System Login (Split-Screen, With Demo Accounts)
   Matches Welcome.jsx / PublicApply.jsx design system
   Plus Jakarta Sans · Inter · DM Sans · Navy #1C2340 · Indigo #4F5BCB
───────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

.ol-root *, .ol-root *::before, .ol-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Split layout — identity on one side, task on the other, exactly the
   same navy/white contrast used for the landing page's own two-path split,
   so this reads as the same system rather than a different screen style. ── */
.ol-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  min-height: 100vh;
  display: flex;
}
@media (max-width: 900px) { .ol-root { flex-direction: column; } }

/* ── Brand side (photo + identity) ───────────────────────────────────── */
.ol-side {
  flex: 0 0 42%;
  position: relative;
  overflow: hidden;
  display: flex;
  padding: 48px 44px;
  border-radius: 0 28px 28px 0;
}
@media (max-width: 900px) { .ol-side { flex: 0 0 auto; padding: 36px 28px; border-radius: 0 0 28px 28px; } }

.ol-side-backdrop {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(160deg, rgba(28, 35, 64, 0.88) 0%, rgba(28, 35, 64, 0.96) 100%),
    url('/images/nasugbu-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}
.ol-side-backdrop::before {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

.ol-side-content {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; justify-content: space-between;
  width: 100%; min-height: 100%;
}
@media (max-width: 900px) { .ol-side-content { min-height: auto; gap: 28px; } }

.ol-logo { display: flex; align-items: center; gap: 14px; text-decoration: none; width: fit-content; }
.ol-logo-img-wrap {
  height: 42px; width: auto; border-radius: 10px;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
  display: flex; align-items: center; justify-content: center;
  padding: 6px 9px; flex-shrink: 0;
  transition: box-shadow .2s;
}
.ol-logo:hover .ol-logo-img-wrap { box-shadow: 0 4px 16px rgba(0,0,0,.22); }
.ol-side-logo { height: 26px; width: auto; object-fit: contain; display: block; }

.ol-side-bottom { color: #FFFFFF; }
.ol-side-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(26px, 2.6vw, 34px); font-weight: 800;
  letter-spacing: -.02em; line-height: 1.15;
  margin-top: 24px; margin-bottom: 12px;
}
@media (max-width: 900px) { .ol-side-title { margin-top: 16px; } }
.ol-side-desc {
  font-family: 'Inter', sans-serif;
  font-size: 14px; font-weight: 400; line-height: 1.6;
  color: rgba(255,255,255,.75);
  max-width: 340px;
}

.ol-role-list { display: flex; flex-direction: column; gap: 12px; margin-top: 28px; }
@media (max-width: 900px) { .ol-role-list { display: none; } }
.ol-role-item {
  display: flex; align-items: center; gap: 12px;
  font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500;
  color: rgba(255,255,255,.8);
}
.ol-role-icon {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.16);
  display: flex; align-items: center; justify-content: center;
  color: #FFFFFF;
}

.ol-side-footnote {
  margin-top: 28px; padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,.12);
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: rgba(255,255,255,.45);
}
@media (max-width: 900px) { .ol-side-footnote { display: none; } }

/* ── Form side ───────────────────────────────────────────────────────── */
.ol-form-side {
  flex: 1;
  background: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  padding: 48px 24px;
}
@media (max-width: 900px) { .ol-form-side { padding: 40px 24px 56px; } }

.ol-form-inner {
  width: 100%; max-width: 380px;
  animation: olFadeUp .5s cubic-bezier(.2,0,.2,1) both;
}
@keyframes olFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ol-form-heading { margin-bottom: 28px; }
.ol-form-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 25px; font-weight: 800;
  letter-spacing: -.02em; color: #1C2340;
  line-height: 1.2; margin-bottom: 6px;
}
.ol-form-sub {
  font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 400;
  color: #4A5578;
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
.ol-input--password { padding-right: 46px; }
.ol-input-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  width: 34px; height: 34px; border-radius: 8px;
  border: none; background: transparent; cursor: pointer;
  color: #8A96BC; display: flex; align-items: center; justify-content: center;
  transition: color .15s, background .15s;
}
.ol-input-toggle:hover { color: #4F5BCB; background: rgba(79,91,203,.08); }
.ol-error {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #DC2626; margin-top: 6px; padding-left: 2px;
}

/* ── Auth failure banner — one clear, visible callout at the top of the
   form instead of relying only on the small field-level error text. ── */
.ol-alert {
  display: flex; align-items: flex-start; gap: 10px;
  background: #FEF2F2; border: 1px solid rgba(220,38,38,.18);
  border-radius: 12px; padding: 12px 14px;
  margin-bottom: 20px;
  animation: olFadeUp .3s cubic-bezier(.2,0,.2,1) both;
}
.ol-alert-icon { color: #DC2626; flex-shrink: 0; margin-top: 1px; }
.ol-alert-text {
  font-family: 'Inter', sans-serif;
  font-size: 12.5px; font-weight: 500; line-height: 1.5;
  color: #991B1B;
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
  box-shadow: 0 4px 16px rgba(28,35,64,.2);
}
.ol-btn:hover:not(:disabled) {
  background: #2E3A9E;
  box-shadow: 0 6px 22px rgba(28,35,64,.28);
  transform: translateY(-1px);
}
.ol-btn:disabled {
  background: #2E3A9E;
  opacity: .75;
  box-shadow: none; cursor: not-allowed; transform: none;
}
.ol-spin { animation: olSpin .8s linear infinite; }
@keyframes olSpin { to { transform: rotate(360deg); } }

/* ── Back button ─────────────────────────────────────────────────────── */
/* Icon-only, sitting above the heading — the standard "return to site" affordance on a
   login screen, rather than a text link competing with the form's own actions. */
.ol-back-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; margin-left: -8px;
  border: none; background: transparent;
  color: #5A6488; text-decoration: none;
  margin-bottom: 20px;
  transition: color .18s, transform .18s;
}
.ol-back-btn:hover { color: #4F5BCB; transform: translateX(-2px); }

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
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
@media (max-width: 480px) {
  .ol-demo-grid { grid-template-columns: 1fr; }
}
.ol-demo-btn {
  background: #FAFAFC; border: 1px solid rgba(28,35,64,.08);
  border-radius: 8px; padding: 10px 12px;
  font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
  color: #5A6488; cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ol-demo-btn:hover {
  background: #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,.06);
  transform: translateY(-1px);
}
/* Role-tinted accents — each demo account gets its own icon color instead of
   one flat gray, so the roles are distinguishable at a glance. */
.ol-demo-btn--tmo:hover      { border-color: #1C2340; color: #1C2340; }
.ol-demo-btn--bplo:hover     { border-color: #B45309; color: #B45309; }
.ol-demo-btn--operator:hover { border-color: #059669; color: #059669; }
`;

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        login_id: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    // Auto-fill form fields for quick demo access
    const setDemoAccount = (role) => {
        const credentials = {
            tmo: { login_id: 'tmo.jdelacruz@trivora.gov.ph', password: 'TmoUser@123' },
            bplo: { login_id: 'bplo.areyes@trivora.gov.ph', password: 'BploUser@123' },
            operator: { login_id: 'driver.pramos@trivora.ph', password: 'Driver@123' },
        };

        if (credentials[role]) {
            setData({
                login_id: credentials[role].login_id,
                password: credentials[role].password,
                remember: false
            });
        }
    };

    return (
        <div className="ol-root">
            <Head title="System Login | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── Brand side ── */}
            <div className="ol-side">
                <div className="ol-side-backdrop" aria-hidden="true" />
                <div className="ol-side-content">
                    <div className="ol-side-top">
                        <Link href="/" className="ol-logo">
                            <div className="ol-logo-img-wrap">
                                <img src="/images/logo.png" alt="TRIVORA" className="ol-side-logo" />
                            </div>
                        </Link>
                        <h1 className="ol-side-title">Smart Tricycle Management System</h1>
                        <p className="ol-side-desc">
                            The unified back-office for the Nasugbu Municipal Government —
                            permits, franchise verification, fleet monitoring, and regulation in
                            one secure system.
                        </p>
                    </div>

                    <div className="ol-side-bottom">
                        <div className="ol-role-list">
                            <div className="ol-role-item">
                                <span className="ol-role-icon" aria-hidden="true"><Shield size={14} strokeWidth={2} /></span>
                                Traffic Management Office (TMO)
                            </div>
                            <div className="ol-role-item">
                                <span className="ol-role-icon" aria-hidden="true"><Award size={14} strokeWidth={2} /></span>
                                Business Permits &amp; Licensing Office (BPLO)
                            </div>
                            <div className="ol-role-item">
                                <span className="ol-role-icon" aria-hidden="true"><Bike size={14} strokeWidth={2} /></span>
                                Tricycle Drivers &amp; Operators
                            </div>
                        </div>

                        <p className="ol-side-footnote">Authorized LGU Personnel &amp; Operators Only</p>
                    </div>
                </div>
            </div>

            {/* ── Form side ── */}
            <div className="ol-form-side">
                <div className="ol-form-inner">
                    <Link href="/" className="ol-back-btn" aria-label="Return to Home">
                        <ArrowLeft size={17} strokeWidth={2} />
                    </Link>

                    <div className="ol-form-heading">
                        <p className="ol-form-title">Welcome back</p>
                        <p className="ol-form-sub">Sign in with your registered email or mobile number.</p>
                    </div>

                    {errors.login_id && (
                        <div className="ol-alert" role="alert">
                            <AlertCircle size={16} strokeWidth={2} className="ol-alert-icon" />
                            <p className="ol-alert-text">{errors.login_id}</p>
                        </div>
                    )}

                    <form onSubmit={submit}>
                        <div className="ol-fields">
                            {/* Generic Email/Mobile Input */}
                            <div>
                                <label className="ol-label" htmlFor="login_id">Email or Mobile Number</label>
                                <div className="ol-input-wrap">
                                    <span className="ol-input-icon" aria-hidden="true">
                                        <User size={16} strokeWidth={2} />
                                    </span>
                                    <input
                                        id="login_id"
                                        type="text"
                                        className="ol-input"
                                        placeholder="Enter email or mobile no."
                                        value={data.login_id}
                                        onChange={e => setData('login_id', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="ol-label" htmlFor="password">Password</label>
                                <div className="ol-input-wrap">
                                    <span className="ol-input-icon" aria-hidden="true">
                                        <KeyRound size={16} strokeWidth={2} />
                                    </span>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="ol-input ol-input--password"
                                        placeholder="Enter your password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
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
                            {processing ? (
                                <>
                                    <Loader2 size={16} strokeWidth={2} className="ol-spin" />
                                    Signing In…
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={16} strokeWidth={2} />
                                    Secure Login
                                </>
                            )}
                        </button>
                    </form>

                    {/* ── Quick Demo Access ── */}
                    <div className="ol-demo-wrap">
                        <p className="ol-demo-title">Quick Demo Access</p>
                        <div className="ol-demo-grid">
                            <button type="button" className="ol-demo-btn ol-demo-btn--tmo" onClick={() => setDemoAccount('tmo')}>
                                <Shield size={14} strokeWidth={2} /> TMO
                            </button>
                            <button type="button" className="ol-demo-btn ol-demo-btn--bplo" onClick={() => setDemoAccount('bplo')}>
                                <Award size={14} strokeWidth={2} /> BPLO
                            </button>
                            <button type="button" className="ol-demo-btn ol-demo-btn--operator" onClick={() => setDemoAccount('operator')}>
                                <Bike size={14} strokeWidth={2} /> Driver
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
