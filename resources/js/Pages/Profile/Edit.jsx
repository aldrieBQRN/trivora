import React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import BPLOLayout from '@/Layouts/BPLOLayout';
import OperatorLayout from '@/Layouts/OperatorLayout';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Account Settings — the signed-in user's own record (ProfileController::edit), inside their
 * portal's layout. Only real, stored account data; no invented fields or preferences. Each fact
 * appears once: identity + read-only details in the profile card, editable data in the forms.
 */
export default function Edit({ account, status }) {
    const { auth } = usePage().props;
    const a = account || {};

    // Stable, module-level layout components (never a component defined in render — that would
    // remount the forms on every keystroke).
    const [Layout, layoutProps] =
        a.role === 'bplo_staff' ? [BPLOLayout, { title: 'Account Settings', role: a.role_label }]
        : a.role === 'tricycle_driver' ? [OperatorLayout, { title: 'Account Settings', operatorName: auth?.user?.name }]
        : (a.role === 'tmo_personnel' || a.role === 'admin') ? [TrivoraLayout, { title: 'Account Settings', role: a.role_label }]
        : [AuthenticatedLayout, {}];

    return (
        <Layout {...layoutProps}>
            <Head title="Account Settings | TRIVORA" />
            <div className="w-full pb-12">
                <div className="mb-6">
                    <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">Account Settings</h1>
                    <p className="mt-1 text-[13.5px] text-slate-500">Manage your profile, password and account information.</p>
                </div>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {/* Profile card first on small screens, right column on large ones */}
                    <div className="lg:order-2 lg:sticky lg:top-4">
                        <ProfileCard account={a} />
                    </div>

                    <div className="min-w-0 space-y-6 lg:order-1">
                        <ProfileSection account={a} status={status} />
                        <SecuritySection />
                    </div>
                </div>
            </div>
        </Layout>
    );
}

/* ── Profile card: identity + read-only account details ────────────── */

function ProfileCard({ account }) {
    const initials = (account.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const reg = account.registration;
    const details = [
        reg?.contact_number && ['Mobile number', reg.contact_number],
        reg?.birthday && ['Birthday', reg.birthday],
        account.employee_id && ['Employee ID', account.employee_id],
        account.position && ['Position', account.position],
        ['Email verified', account.email_verified_at || 'Not verified'],
        ['Member since', account.member_since || '—'],
    ].filter(Boolean);

    return (
        <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3.5 px-5 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1D2542] text-[15px] font-bold tracking-wide text-white">
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-slate-900">{account.name}</p>
                    <p className="truncate text-[12.5px] text-slate-500">{account.email}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 px-5 pb-4">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-700">{account.role_label}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                    account.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${account.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {account.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>

            <dl className="divide-y divide-slate-100 border-t border-slate-100">
                {details.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 px-5 py-3">
                        <dt className="text-[12.5px] text-slate-500">{k}</dt>
                        <dd className="min-w-0 truncate text-right text-[12.5px] font-semibold text-slate-800">{v}</dd>
                    </div>
                ))}
            </dl>

            <p className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-[11.5px] leading-relaxed text-slate-500">
                {reg
                    ? 'Mobile number and birthday come from your franchise registration.'
                    : 'Role and employment details are managed by your office administrator.'}
            </p>
        </aside>
    );
}

/* ── Form card primitives ───────────────────────────────────────────── */

function FormCard({ title, description, onSubmit, footer, children }) {
    return (
        <form onSubmit={onSubmit} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
                {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">{children}</div>
            {footer}
        </form>
    );
}

function Field({ label, hint, htmlFor, error, className = '', children }) {
    return (
        <div className={`min-w-0 ${className}`}>
            <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-medium text-slate-700">{label}</label>
            {children}
            {error ? (
                <p className="mt-1.5 text-[12px] font-medium text-rose-600">{error}</p>
            ) : hint ? (
                <p className="mt-1.5 text-[12px] text-slate-400">{hint}</p>
            ) : null}
        </div>
    );
}

function CardFooter({ note, processing, saved, label }) {
    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-[12.5px] text-slate-500">{note}</p>
            <div className="flex items-center gap-3">
                {saved && (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-700">
                        <CheckCircle2 size={14} /> Saved
                    </span>
                )}
                <button
                    type="submit"
                    disabled={processing}
                    className="h-9 rounded-lg bg-[#1D2542] px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] hover:bg-[#283256] disabled:opacity-60"
                >
                    {processing ? 'Saving…' : label}
                </button>
            </div>
        </div>
    );
}

const inputCls = (error) =>
    `h-10 w-full rounded-lg border bg-white px-3 text-[13.5px] text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.03)] placeholder:text-slate-400 focus:outline-none focus:ring-[3px] ${
        error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-[#1D2542] focus:ring-[#1D2542]/10'
    }`;

/* ── Profile ────────────────────────────────────────────────────────── */

function ProfileSection({ account, status }) {
    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: account.name || '',
        email: account.email || '',
        contact_number: account.contact_number || '',
        birthday: account.birthday || '',
        address: account.address || '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    };

    return (
        <FormCard
            title="Profile"
            description="The name and contact details on your account."
            onSubmit={submit}
            footer={<CardFooter note="Changes apply to this account only." processing={processing} saved={recentlySuccessful || status === 'profile-updated'} label="Save changes" />}
        >
            <Field label="Full name" htmlFor="name" error={errors.name}>
                <input id="name" className={inputCls(errors.name)} value={data.name} autoComplete="name"
                    onChange={(e) => setData('name', e.target.value)} />
            </Field>
            <Field label="Email address" hint="Used to sign in to the portal." htmlFor="email" error={errors.email}>
                <input id="email" type="email" className={inputCls(errors.email)} value={data.email} autoComplete="email"
                    onChange={(e) => setData('email', e.target.value)} />
            </Field>
            {account.is_staff && (
                <>
                    <Field label="Mobile number" htmlFor="contact_number" error={errors.contact_number}>
                        <input id="contact_number" className={inputCls(errors.contact_number)} value={data.contact_number}
                            placeholder="e.g. 0917 123 4567" autoComplete="tel"
                            onChange={(e) => setData('contact_number', e.target.value)} />
                    </Field>
                    <Field label="Birthday" htmlFor="birthday" error={errors.birthday}>
                        <input id="birthday" type="date" className={inputCls(errors.birthday)} value={data.birthday}
                            max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)} autoComplete="bday"
                            onChange={(e) => setData('birthday', e.target.value)} />
                    </Field>
                    <Field label="Address" htmlFor="address" error={errors.address} className="sm:col-span-2">
                        <input id="address" className={inputCls(errors.address)} value={data.address} autoComplete="street-address"
                            onChange={(e) => setData('address', e.target.value)} />
                    </Field>
                </>
            )}
        </FormCard>
    );
}

/* ── Password & Security ────────────────────────────────────────────── */

function SecuritySection() {
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

    return (
        <FormCard
            title="Password & Security"
            description="Change the password you use to sign in."
            onSubmit={submit}
            footer={<CardFooter note="Use at least 8 characters." processing={processing} saved={recentlySuccessful} label="Update password" />}
        >
            <Field label="Current password" htmlFor="current_password" error={errors.current_password} className="sm:col-span-2 sm:max-w-[calc(50%-10px)]">
                <input id="current_password" type="password" className={inputCls(errors.current_password)} value={data.current_password}
                    autoComplete="current-password" onChange={(e) => setData('current_password', e.target.value)} />
            </Field>
            <Field label="New password" htmlFor="password" error={errors.password}>
                <input id="password" type="password" className={inputCls(errors.password)} value={data.password}
                    autoComplete="new-password" onChange={(e) => setData('password', e.target.value)} />
            </Field>
            <Field label="Confirm new password" htmlFor="password_confirmation" error={errors.password_confirmation}>
                <input id="password_confirmation" type="password" className={inputCls(errors.password_confirmation)} value={data.password_confirmation}
                    autoComplete="new-password" onChange={(e) => setData('password_confirmation', e.target.value)} />
            </Field>
        </FormCard>
    );
}
