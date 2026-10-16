import React from 'react';
import { Loader2 } from 'lucide-react';

// Full-screen "Signing out…" modal shown while the logout request runs and the browser
// navigates to /login, so the user never sees a blank page in between.
export default function LogoutOverlay({ show }) {
    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4 font-['Plus_Jakarta_Sans',sans-serif]"
            role="alertdialog"
            aria-live="assertive"
            aria-busy="true"
            aria-label="Signing out"
        >
            <div className="flex w-full max-w-[300px] flex-col items-center rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white px-6 py-7 text-center shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_-12px_rgba(15,23,42,0.22)]">
                <div className="flex h-11 items-center justify-center rounded-xl bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200/80">
                    <img src="/images/logo.png" alt="Trivora" className="h-7 w-auto object-contain" />
                </div>
                <Loader2 size={26} strokeWidth={2.4} className="mt-5 animate-spin text-[#182B62]" />
                <p className="mt-3 text-[15px] font-black tracking-tight text-slate-900">Signing out…</p>
                <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">
                    Please wait while we securely end your session.
                </p>
            </div>
        </div>
    );
}
