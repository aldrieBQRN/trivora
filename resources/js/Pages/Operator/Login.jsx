import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ShieldCheck, Smartphone, KeyRound, ArrowLeft } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   TRIVORA — Operator Login
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
  overflow-x: hidden;
}

/* ── Hero backdrop ───────────────────────────────────────────────────── */
.ol-backdrop {
  position: absolute; top: 0; left: 0; width: 100%;
  height: 52vh; min-height: 340px;
  background: #1C2340;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
  z-index: 0; overflow: hidden;
}
.ol-backdrop::after {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 60% 60% at 80% 10%, rgba(79,91,203,.2) 0%, transparent 70%),
    radial-gradient(ellipse 40% 50% at 10% 90%, rgba(79,91,203,.1) 0%, transparent 70%);
  pointer-events: none;
}
.ol-backdrop::before {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}

/* ── Wrapper ─────────────────────────────────────────────────────────── */
.ol-wrap {
  max-width: 1200px; margin: 0 auto;
  padding: 0 32px; width: 100%;
}
@media (max-width: 640px) { .ol-wrap { padding: 0 20px; } }

/* ── Header ──────────────────────────────────────────────────────────── */
.ol-header {
  height: 80px;
  display: flex; align-items: center; justify-content: space-between;
  position: relative; z-index: 10;
}
.ol-logo { display: flex; align-items: center; gap: 14px; text-decoration: none; }
.ol-logo-img-wrap {
  height: 46px; width: auto; border-radius: 10px;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
  display: flex; align-items: center; justify-content: center;
  padding: 6px 10px; flex-shrink: 0;
  transition: box-shadow .2s;
}
.ol-logo:hover .ol-logo-img-wrap { box-shadow: 0 4px 16px rgba(0,0,0,.22); }
.ol-logo-img {
  height: 30px; width: auto; object-fit: contain; display: block;
}
.ol-logo-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px; font-weight: 800;
  letter-spacing: -.02em; color: #FFFFFF;
  line-height: 1; margin-bottom: 4px;
}
.ol-logo-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: rgba(255,255,255,.35); line-height: 1;
}
.ol-back-link {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.45); text-decoration: none;
  transition: color .18s;
}
.ol-back-link:hover { color: #FFFFFF; }

/* ── Center layout ───────────────────────────────────────────────────── */
.ol-center {
  position: relative; z-index: 10;
  flex: 1; display: flex; align-items: flex-start;
  justify-content: center;
  padding: 40px 0 64px;
}

/* ── Card ────────────────────────────────────────────────────────────── */
.ol-card {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 20px;
  padding: 48px 44px;
  box-shadow: 0 8px 40px rgba(28,35,64,.14);
  width: 100%; max-width: 440px;
  animation: olFadeUp .4s cubic-bezier(.2,0,.2,1) both;
}
@media (max-width: 480px) { .ol-card { padding: 32px 24px; } }
@keyframes olFadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Card branding ───────────────────────────────────────────────────── */
.ol-brand {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; margin-bottom: 36px;
}
.ol-brand-icon {
  width: 64px; height: 64px; border-radius: 16px;
  background: #1C2340;
  display: flex; align-items: center; justify-content: center;
  color: #FFFFFF; margin-bottom: 20px;
  box-shadow: 0 6px 20px rgba(28,35,64,.25);
}
.ol-brand-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px; font-weight: 800;
  letter-spacing: -.025em; color: #1C2340;
  line-height: 1; margin-bottom: 8px;
}
.ol-brand-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
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
.ol-fields { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px; }

.ol-label {
  display: block;
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: #8A96BC; margin-bottom: 8px; padding-left: 2px;
}
.ol-input-wrap { position: relative; }
.ol-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #9AA3CC; pointer-events: none;
  display: flex; align-items: center;
}
.ol-input {
  width: 100%; height: 50px;
  border: 1.5px solid rgba(28,35,64,.12);
  border-radius: 11px; background: #FAFAFA;
  padding: 0 16px 0 44px;
  font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 500; color: #1C2340;
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
  margin-bottom: 28px;
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
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; cursor: pointer; transition: color .18s;
}
.ol-remember:hover .ol-remember-label { color: #1C2340; }
.ol-forgot {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #8A96BC; text-decoration: none; transition: color .18s;
}
.ol-forgot:hover { color: #4F5BCB; }

/* ── Submit button ───────────────────────────────────────────────────── */
.ol-btn {
  width: 100%; height: 52px; border-radius: 12px;
  border: none; background: #1C2340; color: #FFFFFF;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 9px;
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

/* ── Footer note ─────────────────────────────────────────────────────── */
.ol-footer-note {
  text-align: center; margin-top: 28px;
  font-family: 'DM Sans', sans-serif;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase;
  color: rgba(255,255,255,.3);
}
`;

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        mobile_number: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/operator/login');
    };

    return (
        <div className="ol-root">
            <Head title="Operator Login | TRIVORA" />
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* Hero backdrop */}
            <div className="ol-backdrop" />

            {/* ── HEADER ── */}
            <header className="ol-wrap">
                <div className="ol-header">
                    <Link href="/" className="ol-logo">
                        <div>
                            <div className="ol-logo-img-wrap">
                                <img src="/images/logo.png" alt="TRIVORA" className="ol-logo-img" />
                            </div>
                        </div>
                        <div>
                            <p className="ol-logo-name">TMO Portal</p>
                            <p className="ol-logo-sub">Municipality of Nasugbu</p>
                        </div>
                    </Link>
                    <Link href="/" className="ol-back-link">
                        <ArrowLeft size={13} strokeWidth={2.5} /> Back to Portal
                    </Link>
                </div>
            </header>

            {/* ── CARD ── */}
            <div className="ol-wrap">
                <div className="ol-center">
                    <div className="ol-card">

                        {/* Branding */}
                        <div className="ol-brand">
                            <div className="ol-brand-icon">
                                <ShieldCheck size={28} strokeWidth={1.8} />
                            </div>
                            <p className="ol-brand-title">Operator Access</p>
                            <p className="ol-brand-sub">TRIVORA Fleet Management</p>
                        </div>

                        <div className="ol-divider" />

                        {/* Form */}
                        <form onSubmit={submit}>
                            <div className="ol-fields">

                                {/* Mobile */}
                                <div>
                                    <label className="ol-label">Mobile Number</label>
                                    <div className="ol-input-wrap">
                                        <span className="ol-input-icon">
                                            <Smartphone size={15} strokeWidth={2} />
                                        </span>
                                        <input
                                            type="text"
                                            className="ol-input"
                                            placeholder="09XX XXX XXXX"
                                            value={data.mobile_number}
                                            onChange={e => setData('mobile_number', e.target.value)}
                                        />
                                    </div>
                                    {errors.mobile_number && <p className="ol-error">{errors.mobile_number}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="ol-label">Password</label>
                                    <div className="ol-input-wrap">
                                        <span className="ol-input-icon">
                                            <KeyRound size={15} strokeWidth={2} />
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
                                <ShieldCheck size={15} strokeWidth={2} />
                                Login to Portal
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Footer note */}
            <p className="ol-footer-note" style={{ position: 'relative', zIndex: 10, paddingBottom: 32 }}>
                Authorized LGU Personnel &amp; Operators Only
            </p>
        </div>
    );
}