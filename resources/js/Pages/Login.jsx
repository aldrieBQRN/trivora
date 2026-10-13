import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ShieldCheck, KeyRound,
    Award, Bike, Shield, ArrowLeft,
    Eye, EyeOff, AlertCircle, Loader2,
    CheckCircle2, Sparkles, Building2,
    Mail, Send, MailCheck
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
    linear-gradient(155deg, rgba(18, 40, 102, 0.92) 0%, rgba(37, 68, 155, 0.86) 55%, rgba(15, 33, 85, 0.95) 100%);
  background-color: #1B3478;
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

.ol-alert--success {
  background: #F0FDF4;
  border-color: #86EFAC;
}
.ol-alert--success .ol-alert-icon { color: #16A34A; }
.ol-alert--success .ol-alert-text { color: #166534; }

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

/* ── Forgot / reset password panels ─────────────────────────────────── */
.ol-input--code {
  padding-left: 46px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: .45em;
}

.ol-input--code::placeholder {
  letter-spacing: .45em;
  color: #CBD5E1;
}

.ol-sent-to {
  color: #0F172A;
  font-weight: 700;
  word-break: break-all;
}

.ol-resend-row {
  font-size: 12.5px;
  color: #64748B;
  padding-left: 2px;
}

.ol-text-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: #25449B;
  font-weight: 700;
  cursor: pointer;
}

.ol-text-btn:hover { text-decoration: underline; }
.ol-text-btn:disabled { opacity: .55; cursor: not-allowed; text-decoration: none; }

/* ── Custom scrollbar (matches .custom-scrollbar in panels) ──────────── */
html, .ol-content-center { scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
html::-webkit-scrollbar, .ol-content-center::-webkit-scrollbar { width: 6px; height: 6px; }
html::-webkit-scrollbar-track, .ol-content-center::-webkit-scrollbar-track { background: transparent; }
html::-webkit-scrollbar-thumb, .ol-content-center::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 9999px; }
html::-webkit-scrollbar-thumb:hover, .ol-content-center::-webkit-scrollbar-thumb:hover { background-color: #94A3B8; }
`;

/* ─────────────────────────────────────────────────────────────────────────
   Forgot password — rendered inside the same Login layout (mode="forgot" /
   mode="reset"), so recovering an account never leaves the sign-in screen.
   Backed by App\Services\PasswordResetOtp (emailed 6-digit code).
   ───────────────────────────────────────────────────────────────────────── */
function FormAlert({ type = 'error', children }) {
    const success = type === 'success';
    return (
        <div className={`ol-alert${success ? ' ol-alert--success' : ''}`} role={success ? 'status' : 'alert'}>
            {success
                ? <CheckCircle2 size={17} strokeWidth={2.2} className="ol-alert-icon" />
                : <AlertCircle size={17} strokeWidth={2.2} className="ol-alert-icon" />}
            <p className="ol-alert-text">{children}</p>
        </div>
    );
}

function ForgotPasswordPanel() {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <>
            <div className="ol-form-header">
                <h2 className="ol-form-title">Forgot password?</h2>
                <p className="ol-form-sub">
                    Enter the email address registered to your account and we'll send you a 6-digit verification code.
                </p>
            </div>

            {errors.email && <FormAlert>{errors.email}</FormAlert>}

            <form onSubmit={submit}>
                <div className="ol-field-group">
                    <div className="ol-field">
                        <label className="ol-label" htmlFor="email">
                            <span>Email Address</span>
                        </label>
                        <div className="ol-input-wrap">
                            <span className="ol-input-icon" aria-hidden="true">
                                <Mail size={16} strokeWidth={2.2} />
                            </span>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                className="ol-input"
                                placeholder="e.g. juan@email.com"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                </div>

                <button type="submit" className="ol-submit-btn" disabled={processing}>
                    {processing ? (
                        <>
                            <Loader2 size={16} strokeWidth={2.5} className="ol-spin" />
                            <span>Sending code...</span>
                        </>
                    ) : (
                        <>
                            <Send size={16} strokeWidth={2.4} />
                            <span>Send Verification Code</span>
                        </>
                    )}
                </button>
            </form>

            <div className="ol-register-hint">
                Remembered your password?{' '}
                <Link href={route('login')} className="ol-register-link">Back to sign in</Link>
            </div>
        </>
    );
}

function VerifyCodePanel({ email, status, resendAfterSeconds = 60 }) {
    const { data, setData, post, processing, errors } = useForm({
        email: email,
        otp: '',
    });
    const [resendIn, setResendIn] = useState(resendAfterSeconds);
    const [resending, setResending] = useState(false);
    const [resendError, setResendError] = useState(null);

    useEffect(() => {
        if (resendIn <= 0) return;
        const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendIn]);

    const resend = () => {
        setResendError(null);
        router.post(route('password.email'), { email: data.email }, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setResending(true),
            onFinish: () => setResending(false),
            // The redirect re-renders this step with the server's fresh cooldown for the new code.
            onSuccess: (page) => {
                setResendIn(page.props.resendAfterSeconds ?? 60);
                setData('otp', '');
            },
            onError: (errs) => setResendError(errs.email),
        });
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('password.verify'));
    };

    const formError = errors.email || errors.otp || resendError;

    return (
        <>
            <div className="ol-form-header">
                <h2 className="ol-form-title">Check your email</h2>
                <p className="ol-form-sub">
                    Enter the 6-digit code sent to <span className="ol-sent-to">{email}</span>.
                </p>
            </div>

            {formError
                ? <FormAlert>{formError}</FormAlert>
                : status && <FormAlert type="success">{status}</FormAlert>}

            <form onSubmit={submit}>
                <div className="ol-field-group">
                    <div className="ol-field">
                        <label className="ol-label" htmlFor="otp">
                            <span>Verification Code</span>
                        </label>
                        <div className="ol-input-wrap">
                            <span className="ol-input-icon" aria-hidden="true">
                                <MailCheck size={16} strokeWidth={2.2} />
                            </span>
                            <input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                className="ol-input ol-input--code"
                                placeholder="000000"
                                value={data.otp}
                                onChange={e => setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                autoFocus
                                required
                            />
                        </div>
                        <span className="ol-resend-row">
                            Didn't receive it?{' '}
                            {resendIn > 0 ? (
                                <>Resend in {resendIn}s</>
                            ) : (
                                <button type="button" className="ol-text-btn" onClick={resend} disabled={resending}>
                                    {resending ? 'Sending...' : 'Resend code'}
                                </button>
                            )}
                        </span>
                    </div>
                </div>

                <button type="submit" className="ol-submit-btn" disabled={processing || data.otp.length !== 6}>
                    {processing ? (
                        <>
                            <Loader2 size={16} strokeWidth={2.5} className="ol-spin" />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={17} strokeWidth={2.4} />
                            <span>Verify Code</span>
                        </>
                    )}
                </button>
            </form>

            <div className="ol-register-hint">
                Wrong email?{' '}
                <Link href={route('password.request')} className="ol-register-link">Use a different email</Link>
            </div>
        </>
    );
}

function NewPasswordPanel({ email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    // The code can expire between verifying it and submitting here; the server then
    // reports it on `otp`/`email`, and the only way forward is a new code.
    const codeError = errors.otp || errors.email;

    return (
        <>
            <div className="ol-form-header">
                <h2 className="ol-form-title">Create new password</h2>
                <p className="ol-form-sub">
                    Your code is verified. Choose a new password for <span className="ol-sent-to">{email}</span>.
                </p>
            </div>

            {codeError && (
                <FormAlert>
                    {codeError}{' '}
                    <Link href={route('password.request')} className="ol-register-link">Request a new code</Link>
                </FormAlert>
            )}

            <form onSubmit={submit}>
                <div className="ol-field-group">
                    <div className="ol-field">
                        <label className="ol-label" htmlFor="password">
                            <span>New Password</span>
                        </label>
                        <div className="ol-input-wrap">
                            <span className="ol-input-icon" aria-hidden="true">
                                <KeyRound size={16} strokeWidth={2.2} />
                            </span>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="ol-input ol-input--password"
                                placeholder="At least 8 characters"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                autoFocus
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

                    <div className="ol-field">
                        <label className="ol-label" htmlFor="password_confirmation">
                            <span>Confirm New Password</span>
                        </label>
                        <div className="ol-input-wrap">
                            <span className="ol-input-icon" aria-hidden="true">
                                <KeyRound size={16} strokeWidth={2.2} />
                            </span>
                            <input
                                id="password_confirmation"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="ol-input"
                                placeholder="Re-enter your new password"
                                value={data.password_confirmation}
                                onChange={e => setData('password_confirmation', e.target.value)}
                                required
                            />
                        </div>
                        {errors.password_confirmation && <p className="ol-field-error">{errors.password_confirmation}</p>}
                    </div>
                </div>

                <button type="submit" className="ol-submit-btn" disabled={processing}>
                    {processing ? (
                        <>
                            <Loader2 size={16} strokeWidth={2.5} className="ol-spin" />
                            <span>Saving password...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={17} strokeWidth={2.4} />
                            <span>Reset Password</span>
                        </>
                    )}
                </button>
            </form>

            <div className="ol-register-hint">
                Changed your mind?{' '}
                <Link href={route('login')} className="ol-register-link">Back to sign in</Link>
            </div>
        </>
    );
}

function ChangePasswordPanel({ email, expiresAt }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        put(route('password.change.update'), {
            onFinish: () => reset('current_password', 'password', 'password_confirmation'),
        });
    };

    return (
        <>
            <div className="ol-form-header">
                <h2 className="ol-form-title">Set your password</h2>
                <p className="ol-form-sub">
                    You signed in as <span className="ol-sent-to">{email}</span> with a temporary password.
                    Choose your own password to continue.
                </p>
            </div>

            {expiresAt && !errors.current_password && (
                <FormAlert type="success">Your temporary password stays valid until {expiresAt}.</FormAlert>
            )}
            {errors.current_password && <FormAlert>{errors.current_password}</FormAlert>}

            <form onSubmit={submit}>
                <div className="ol-field-group">
                    <div className="ol-field">
                        <label className="ol-label" htmlFor="current_password">
                            <span>Temporary Password</span>
                        </label>
                        <div className="ol-input-wrap">
                            <span className="ol-input-icon" aria-hidden="true">
                                <Mail size={16} strokeWidth={2.2} />
                            </span>
                            <input
                                id="current_password"
                                type="password"
                                autoComplete="current-password"
                                className="ol-input"
                                placeholder="From your welcome email"
                                value={data.current_password}
                                onChange={e => setData('current_password', e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <div className="ol-field">
                        <label className="ol-label" htmlFor="password">
                            <span>New Password</span>
                        </label>
                        <div className="ol-input-wrap">
                            <span className="ol-input-icon" aria-hidden="true">
                                <KeyRound size={16} strokeWidth={2.2} />
                            </span>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="ol-input ol-input--password"
                                placeholder="At least 8 characters"
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

                    <div className="ol-field">
                        <label className="ol-label" htmlFor="password_confirmation">
                            <span>Confirm New Password</span>
                        </label>
                        <div className="ol-input-wrap">
                            <span className="ol-input-icon" aria-hidden="true">
                                <KeyRound size={16} strokeWidth={2.2} />
                            </span>
                            <input
                                id="password_confirmation"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="ol-input"
                                placeholder="Re-enter your new password"
                                value={data.password_confirmation}
                                onChange={e => setData('password_confirmation', e.target.value)}
                                required
                            />
                        </div>
                        {errors.password_confirmation && <p className="ol-field-error">{errors.password_confirmation}</p>}
                    </div>
                </div>

                <button type="submit" className="ol-submit-btn" disabled={processing}>
                    {processing ? (
                        <>
                            <Loader2 size={16} strokeWidth={2.5} className="ol-spin" />
                            <span>Saving password...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={17} strokeWidth={2.4} />
                            <span>Save Password &amp; Continue</span>
                        </>
                    )}
                </button>
            </form>

            <div className="ol-register-hint">
                Not you?{' '}
                <Link href={route('logout')} method="post" as="button" className="ol-text-btn">Sign out</Link>
            </div>
        </>
    );
}

export default function Login({ mode = 'login', status, email, resendAfterSeconds, expiresAt }) {
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

    return (
        <div className="ol-root">
            <Head title={`${mode === 'login' ? 'Sign In' : mode === 'change' ? 'Set Your Password' : 'Reset Password'} | TRIVORA — Nasugbu, Batangas`} />
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
                        {mode === 'forgot' && <ForgotPasswordPanel />}
                        {mode === 'verify' && (
                            <VerifyCodePanel email={email} status={status} resendAfterSeconds={resendAfterSeconds} />
                        )}
                        {mode === 'reset' && <NewPasswordPanel email={email} />}
                        {mode === 'change' && <ChangePasswordPanel email={email} expiresAt={expiresAt} />}
                        {mode === 'login' && (<>
                        <div className="ol-form-header">
                            <h2 className="ol-form-title">Welcome back</h2>
                            <p className="ol-form-sub">
                                Sign in with your registered email address to access your account.
                            </p>
                        </div>

                        {/* Status Banner (e.g. after a password reset) */}
                        {status && !errors.login_id && (
                            <div className="ol-alert ol-alert--success" role="status">
                                <CheckCircle2 size={17} strokeWidth={2.2} className="ol-alert-icon" />
                                <p className="ol-alert-text">{status}</p>
                            </div>
                        )}

                        {/* Auth Error Banner */}
                        {errors.login_id && (
                            <div className="ol-alert" role="alert">
                                <AlertCircle size={17} strokeWidth={2.2} className="ol-alert-icon" />
                                <p className="ol-alert-text">{errors.login_id}</p>
                            </div>
                        )}

                        <form onSubmit={submit}>
                            <div className="ol-field-group">
                                {/* Email Address (login is email-only) */}
                                <div className="ol-field">
                                    <label className="ol-label" htmlFor="login_id">
                                        <span>Email Address</span>
                                    </label>
                                    <div className="ol-input-wrap">
                                        <span className="ol-input-icon" aria-hidden="true">
                                            <Mail size={16} strokeWidth={2.2} />
                                        </span>
                                        <input
                                            id="login_id"
                                            type="email"
                                            autoComplete="email"
                                            className="ol-input"
                                            placeholder="e.g. juan@email.com"
                                            value={data.login_id}
                                            onChange={e => setData('login_id', e.target.value)}
                                            required
                                        />
                                    </div>
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
                                <Link href={route('password.request')} className="ol-forgot-link">
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

                        {/* Don't have an MTOP yet? */}
                        <div className="ol-register-hint">
                            Don't have an MTOP permit yet?{' '}
                            <Link href="/register-mtop" className="ol-register-link">
                                Apply online
                            </Link>
                        </div>
                        </>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
