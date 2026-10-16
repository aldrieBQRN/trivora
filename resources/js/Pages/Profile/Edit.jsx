import React, { useEffect, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2, Lock, KeyRound, Eye, EyeOff, Loader2, ShieldCheck, Mail, Phone,
    Calendar, MapPin, BadgeCheck, Briefcase, IdCard, User, Info, Circle, Camera, Trash2, Home, Image as ImageIcon,
} from 'lucide-react';
import Avatar from '@/Components/Avatar';
import { Modal } from '@/Components/TMO';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import BPLOLayout from '@/Layouts/BPLOLayout';
import OperatorLayout from '@/Layouts/OperatorLayout';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// Same soft, layered card shadow used across the TMO/BPLO panel pages.
const CARD_SHADOW = 'shadow-[0_1px_3px_0_rgba(15,23,42,0.07),0_10px_28px_-8px_rgba(15,23,42,0.14)]';

/**
 * Account Settings — the signed-in user's own record (ProfileController::edit), inside their
 * portal's layout. Profile details are read-only (maintained by each office's Staff Management,
 * or a driver's franchise registration); the password is the only thing changed here.
 */
export default function Edit({ account }) {
    const { auth } = usePage().props;
    const a = account || {};

    // Stable, module-level layout components (never a component defined in render — that would
    // remount the password form on every keystroke).
    const [Layout, layoutProps] =
        a.role === 'bplo_staff' ? [BPLOLayout, { title: 'Account Settings', role: a.role_label }]
        : a.role === 'tricycle_driver' ? [OperatorLayout, { title: 'Account Settings', operatorName: auth?.user?.name }]
        : (a.role === 'tmo_personnel' || a.role === 'admin') ? [TrivoraLayout, { title: 'Account Settings', role: a.role_label }]
        : [AuthenticatedLayout, {}];

    return (
        <Layout {...layoutProps}>
            <Head title="Account Settings | TRIVORA" />
            <div className="w-full pb-12">
                {/* Page header */}
                <div className="mb-6 border-b border-slate-200/80 pb-5">
                    <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                        Account Settings
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        View your account information and keep your password secure.
                    </p>
                </div>

                <ProfileHero account={a} />

                <div className="mt-6 grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
                    <ProfileDetails account={a} />
                    <PasswordCard />
                </div>
            </div>
        </Layout>
    );
}

/* ── Identity banner ─────────────────────────────────────────────────── */

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function ProfileHero({ account }) {
    const [photoModalOpen, setPhotoModalOpen] = useState(false);

    return (
        <section className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
            <div className="h-20 sm:h-24 bg-gradient-to-r from-[#182B62] via-[#25449B] to-[#3b5bb5]" aria-hidden="true" />
            <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="relative -mt-10 sm:-mt-12 shrink-0 self-start">
                        <Avatar
                            name={account.name}
                            src={account.profile_photo_url}
                            fallback="?"
                            className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-[#182B62] to-[#25449B] text-2xl sm:text-3xl font-black tracking-wide text-white shadow-md"
                        />
                        <button
                            type="button"
                            onClick={() => setPhotoModalOpen(true)}
                            aria-label="Change profile photo"
                            title="Change profile photo"
                            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#182B62] text-white shadow-md transition-colors hover:bg-[#25449B] cursor-pointer"
                        >
                            <Camera size={14} />
                        </button>
                    </div>
                    <div className="min-w-0 sm:pb-1">
                        <h2 className="truncate text-lg sm:text-xl font-extrabold text-slate-900">{account.name}</h2>
                        <p className="truncate text-xs sm:text-sm text-slate-600">{account.email}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:pb-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-[#182B62]">
                        <ShieldCheck size={13} strokeWidth={2.4} />
                        {account.role_label}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                        account.is_active ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700' : 'border-rose-200/80 bg-rose-50 text-rose-700'
                    }`}>
                        {account.is_active ? 'Active Account' : 'Inactive Account'}
                    </span>
                    {account.member_since && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                            <Calendar size={12} />
                            Member since {account.member_since}
                        </span>
                    )}
                </div>
            </div>

            <ProfilePhotoModal show={photoModalOpen} onClose={() => setPhotoModalOpen(false)} account={account} />
        </section>
    );
}

/* ── Profile photo modal: take a picture / choose from gallery / remove ── */

function ProfilePhotoModal({ show, onClose, account }) {
    // step: 'menu' | 'camera' | 'preview' | 'confirm-remove'
    const [step, setStep] = useState('menu');
    const [preview, setPreview] = useState(null); // { file, url }
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const galleryRef = useRef(null);
    const captureRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const hasPhoto = !!account.profile_photo_url;

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const clearPreview = () => {
        if (preview?.url) URL.revokeObjectURL(preview.url);
        setPreview(null);
    };

    const reset = () => {
        stopCamera();
        clearPreview();
        setStep('menu');
        setError('');
    };

    const close = () => {
        if (busy) return;
        onClose();
        setTimeout(reset, 250);
    };

    // Always release the camera if the page unmounts mid-capture.
    useEffect(() => () => stopCamera(), []);

    const acceptFile = (file) => {
        if (!file) return;
        if (!PHOTO_TYPES.includes(file.type)) {
            setError('Please choose a JPG, PNG, or WEBP image.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setError('The photo must be 5 MB or smaller.');
            return;
        }
        setError('');
        clearPreview();
        setPreview({ file, url: URL.createObjectURL(file) });
        setStep('preview');
    };

    const onFileInput = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        acceptFile(file);
    };

    const openCamera = async () => {
        setError('');
        // No camera API (e.g. insecure context) → let the device's own camera picker handle it.
        if (!navigator.mediaDevices?.getUserMedia) {
            captureRef.current?.click();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            streamRef.current = stream;
            setStep('camera');
            // The <video> mounts on the next render.
            requestAnimationFrame(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
            });
        } catch {
            setError('Camera access was blocked or is unavailable. You can choose a photo from your gallery instead.');
        }
    };

    const capture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        // Square, centre-cropped snapshot (avatars are square).
        const size = Math.min(video.videoWidth, video.videoHeight);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = Math.min(size, 800);
        const ctx = canvas.getContext('2d');
        // Un-mirror: the live preview is mirrored like a selfie camera, the saved photo is not.
        ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) return;
            stopCamera();
            acceptFile(new File([blob], `profile-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
    };

    const save = () => {
        if (!preview) return;
        router.post(route('profile.photo.update'), { photo: preview.file }, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => { onClose(); setTimeout(reset, 250); },
            onError: (errs) => setError(errs.photo || 'The photo could not be uploaded. Please try again.'),
        });
    };

    const remove = () => {
        router.delete(route('profile.photo.destroy'), {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => { onClose(); setTimeout(reset, 250); },
            onError: () => setError('The photo could not be removed. Please try again.'),
        });
    };

    const titles = {
        menu: 'Profile Photo',
        camera: 'Take a Photo',
        preview: 'Use This Photo?',
        'confirm-remove': 'Remove Profile Photo?',
    };
    const descriptions = {
        menu: hasPhoto ? 'Update or remove the photo shown on your account.' : 'Add a photo so others can recognise your account.',
        camera: 'Center your face in the frame, then capture.',
        preview: 'This is how your profile photo will look.',
        'confirm-remove': 'Your initials will be shown instead.',
    };

    const btnSecondary = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer';
    const btnPrimary = 'inline-flex items-center gap-1.5 rounded-xl bg-[#182B62] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#25449B] active:scale-[0.98] disabled:opacity-50 cursor-pointer';

    const footer = {
        menu: null,
        camera: (
            <div className="flex w-full items-center justify-between gap-3">
                <button type="button" className={btnSecondary} onClick={() => { stopCamera(); setStep('menu'); }}>Back</button>
                <button type="button" className={btnPrimary} onClick={capture}>
                    <Camera size={14} /> Capture
                </button>
            </div>
        ),
        preview: (
            <div className="flex w-full items-center justify-between gap-3">
                <button type="button" className={btnSecondary} disabled={busy} onClick={() => { clearPreview(); setStep('menu'); }}>
                    Choose Another
                </button>
                <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {busy ? 'Saving…' : 'Use Photo'}
                </button>
            </div>
        ),
        'confirm-remove': (
            <div className="flex w-full items-center justify-between gap-3">
                <button type="button" className={btnSecondary} disabled={busy} onClick={() => setStep('menu')}>Cancel</button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={remove}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {busy ? 'Removing…' : 'Remove Photo'}
                </button>
            </div>
        ),
    }[step];

    return (
        <Modal show={show} onClose={close} closeable={!busy} maxWidth="md" title={titles[step]} description={descriptions[step]} footer={footer}>
            {/* Hidden pickers: gallery, and the device camera fallback */}
            <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileInput} />
            <input ref={captureRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFileInput} />

            {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/70 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-700">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            {step === 'menu' && (
                <div>
                    <div className="mb-5 flex justify-center">
                        <Avatar
                            name={account.name}
                            src={account.profile_photo_url}
                            fallback="?"
                            className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-3xl font-black text-white shadow-md"
                        />
                    </div>
                    <div className="space-y-2">
                        <PhotoOption icon={Camera} title="Take a Photo" subtitle="Use your device camera" onClick={openCamera} />
                        <PhotoOption icon={ImageIcon} title="Choose from Gallery" subtitle="JPG, PNG or WEBP · up to 5 MB" onClick={() => galleryRef.current?.click()} />
                        {hasPhoto && (
                            <PhotoOption icon={Trash2} title="Remove Photo" subtitle="Show your initials instead" danger onClick={() => { setError(''); setStep('confirm-remove'); }} />
                        )}
                    </div>
                </div>
            )}

            {step === 'camera' && (
                <div className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl bg-slate-900">
                    <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
                </div>
            )}

            {step === 'preview' && preview && (
                <div className="flex justify-center">
                    <img src={preview.url} alt="New profile photo preview" className="h-48 w-48 rounded-2xl object-cover shadow-md ring-4 ring-slate-100" />
                </div>
            )}

            {step === 'confirm-remove' && (
                <div className="flex justify-center">
                    <Avatar
                        name={account.name}
                        src={account.profile_photo_url}
                        fallback="?"
                        className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#182B62] to-[#25449B] text-3xl font-black text-white opacity-70 shadow-md"
                    />
                </div>
            )}
        </Modal>
    );
}

function PhotoOption({ icon: Icon, title, subtitle, onClick, danger = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors cursor-pointer ${
                danger ? 'border-rose-200/80 hover:bg-rose-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                danger ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-indigo-100 bg-indigo-50 text-[#182B62]'
            }`}>
                <Icon size={16} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
                <span className={`block text-[13px] font-bold ${danger ? 'text-rose-700' : 'text-slate-900'}`}>{title}</span>
                <span className="block text-[11.5px] text-slate-600">{subtitle}</span>
            </span>
        </button>
    );
}

/* ── Read-only profile information ──────────────────────────────────── */

function ProfileDetails({ account }) {
    const reg = account.registration;
    const isDriver = !!reg;

    const rows = [
        { icon: User, label: 'Full name', value: account.name },
        { icon: Mail, label: 'Email address', value: account.email },
        { icon: Phone, label: 'Mobile number', value: isDriver ? reg.contact_number : account.contact_number },
        { icon: Calendar, label: 'Birthday', value: isDriver ? reg.birthday : formatDate(account.birthday) },
        isDriver && { icon: Home, label: 'Barangay (Nasugbu)', value: reg.barangay },
        !isDriver && { icon: MapPin, label: 'Address', value: account.address, wide: true },
        account.is_staff && { icon: IdCard, label: 'Employee ID', value: account.employee_id, mono: true },
        account.is_staff && { icon: Briefcase, label: 'Position', value: account.position },
        { icon: BadgeCheck, label: 'Email verified', value: account.email_verified_at || 'Not verified' },
    ].filter(Boolean);

    return (
        <section className={`flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
            <CardHeader
                icon={User}
                title="Profile Information"
                description="Your personal and account details on record."
                badge={(
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
                        <Lock size={10} /> Read-only
                    </span>
                )}
            />

            <dl className="grid flex-1 grid-cols-1 content-start gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-2 sm:px-6">
                {rows.map(({ icon: Icon, label, value, wide, mono }) => (
                    <div key={label} className={`flex items-start gap-3 rounded-xl px-1 py-3 ${wide ? 'sm:col-span-2' : ''}`}>
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600">
                            <Icon size={14} strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                            <dt className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                            <dd className={`mt-0.5 break-words text-[13.5px] font-semibold ${value ? 'text-slate-900' : 'text-slate-500 font-medium'} ${mono && value ? 'font-mono' : ''}`}>
                                {value || 'Not provided'}
                            </dd>
                        </div>
                    </div>
                ))}
            </dl>

            <div className="flex items-start gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:px-6">
                <Info size={14} className="mt-0.5 shrink-0 text-slate-500" />
                <p className="text-[12px] leading-relaxed text-slate-600">
                    {isDriver
                        ? 'These details come from your franchise registration. To correct them, please visit the Traffic Management Office (TMO).'
                        : 'Profile details are maintained by your office administrator through Staff Management. Contact them if anything needs to be updated.'}
                </p>
            </div>
        </section>
    );
}

/* ── Change password ─────────────────────────────────────────────────── */

function PasswordCard() {
    const { data, setData, put, errors, processing, recentlySuccessful, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) reset('password', 'password_confirmation');
                if (errs.current_password) reset('current_password');
            },
        });
    };

    const checks = [
        { label: 'At least 8 characters', ok: data.password.length >= 8 },
        { label: 'Passwords match', ok: data.password.length > 0 && data.password === data.password_confirmation },
        { label: 'Different from current password', ok: data.password.length > 0 && data.password !== data.current_password },
    ];
    const canSubmit = data.current_password && checks.every((c) => c.ok) && !processing;

    return (
        <form onSubmit={submit} className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white ${CARD_SHADOW}`}>
            <CardHeader icon={KeyRound} title="Change Password" description="Update the password you use to sign in." />

            <div className="space-y-3 px-5 py-4 sm:px-6">
                {recentlySuccessful && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 text-[12.5px] font-semibold text-emerald-800">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                        Your password has been updated.
                    </div>
                )}

                <PasswordField
                    id="current_password"
                    label="Current password"
                    value={data.current_password}
                    error={errors.current_password}
                    autoComplete="current-password"
                    onChange={(v) => setData('current_password', v)}
                />
                <PasswordField
                    id="password"
                    label="New password"
                    value={data.password}
                    error={errors.password}
                    autoComplete="new-password"
                    onChange={(v) => setData('password', v)}
                />
                <PasswordField
                    id="password_confirmation"
                    label="Confirm new password"
                    value={data.password_confirmation}
                    error={errors.password_confirmation}
                    autoComplete="new-password"
                    onChange={(v) => setData('password_confirmation', v)}
                />

                <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                    {checks.map((c) => (
                        <li key={c.label} className={`flex items-center gap-1.5 text-[11.5px] font-medium ${c.ok ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {c.ok
                                ? <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                                : <Circle size={13} className="shrink-0 text-slate-400" />}
                            {c.label}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:px-6">
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#182B62] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#25449B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                    {processing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    {processing ? 'Updating…' : 'Update Password'}
                </button>
            </div>
        </form>
    );
}

function PasswordField({ id, label, value, error, autoComplete, onChange }) {
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-xs font-bold text-slate-900">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    autoComplete={autoComplete}
                    onChange={(e) => onChange(e.target.value)}
                    className={`h-11 w-full rounded-xl border bg-slate-50/50 px-3.5 pr-11 text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                        error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-[#182B62] focus:ring-[#182B62]/10'
                    }`}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && <p className="mt-1.5 text-[12px] font-semibold text-rose-600">{error}</p>}
        </div>
    );
}

/* ── Shared bits ─────────────────────────────────────────────────────── */

function CardHeader({ icon: Icon, title, description, badge }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-[#182B62]">
                    <Icon size={16} strokeWidth={2.2} />
                </div>
                <div>
                    <h2 className="text-sm sm:text-[15px] font-bold text-slate-900">{title}</h2>
                    <p className="text-[12px] text-slate-600">{description}</p>
                </div>
            </div>
            {badge}
        </div>
    );
}

function formatDate(isoDate) {
    if (!isoDate) return null;
    const d = new Date(`${isoDate}T00:00:00`);
    return Number.isNaN(d.getTime()) ? isoDate : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}
