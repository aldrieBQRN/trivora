import { useCallback, useState } from 'react';

const STORAGE_KEY = 'trivora.sidebarCollapsed';

// Desktop-only "icons only" sidebar preference, shared by the TMO, BPLO and Driver layouts.
// Every Inertia page remounts its layout, so the choice lives in localStorage (read on first
// render to avoid a width flash) instead of component state alone. Storage can be unavailable
// (private mode, blocked site data) — then it simply falls back to the expanded sidebar.
export default function useSidebarCollapsed() {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            return false;
        }
    });

    const toggle = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
            } catch {
                // Preference just won't persist across pages.
            }
            return next;
        });
    }, []);

    return [collapsed, toggle];
}
