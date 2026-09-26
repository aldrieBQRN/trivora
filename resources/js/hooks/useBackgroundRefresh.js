import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

/**
 * System-wide cadence for background refresh of live / workflow-dependent data across every
 * Trivora panel (TMO, BPLO, Driver Web Portal).
 *
 * This is deliberately NOT `setInterval(() => reloadEverything(), 5000)`. Every tick runs through
 * the guards below first, and the refresh itself is always an Inertia *partial* reload
 * (`router.reload({ only })`), which:
 *
 *   - requests ONLY the props passed in `only` — never the whole page,
 *   - forces `preserveState: true` / `preserveScroll: true`, so local UI state (search text,
 *     filters, pagination, an open modal, unsaved form data, the currently selected record)
 *     survives untouched — props are merged in, the component is never remounted,
 *   - forces `async: true`, which makes Inertia skip the progress bar entirely (no flicker,
 *     no page-blocking overlay), and targets the async request stream so it can never cancel
 *     an in-flight form submission, and
 *   - re-requests `window.location.href`, so query-string state (tabs, date ranges, filters
 *     pushed into the URL) is re-read as-is instead of being reset.
 *
 * A tick is skipped — not queued, not errored — when:
 *
 *   1. any Inertia visit is still running (our own last reload, a form POST, a filter
 *      navigation): prevents overlapping requests and prevents a refresh racing the user's
 *      own action mid-submission,
 *   2. the page passed `paused: true` (open modal, `processing` form, running upload),
 *   3. the user is engaged: focused in an input/textarea/select/contenteditable, an open
 *      dialog (headless-ui Modal / SweetAlert2), or the tab is hidden.
 *
 * Failures are swallowed: a background poll must never turn into a page-breaking error, and
 * the next tick simply tries again.
 */
export const BACKGROUND_REFRESH_INTERVAL_MS = 5000;

// headless-ui <Dialog> renders role="dialog" (+ aria-modal), SweetAlert2 renders .swal2-container.
const OPEN_DIALOG_SELECTOR = '[role="dialog"],[aria-modal="true"],.swal2-container';

// If Inertia reports a visit for this long without ever firing its finish event, treat the
// counter as stalled and resume refreshing rather than going stale forever.
const VISIT_STALL_TIMEOUT_MS = 30000;

function isUserEngaged() {
    if (typeof document === 'undefined') return false;
    // Hidden tab: don't queue up requests nobody is looking at. The next tick after the tab
    // becomes visible again resumes normally.
    if (document.hidden) return true;

    const el = document.activeElement;
    if (el && el !== document.body) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) {
            return true;
        }
    }

    // Never refresh underneath an open modal or confirmation dialog.
    return !!document.querySelector(OPEN_DIALOG_SELECTOR);
}

/**
 * Refresh `only` props from the current URL every `interval` ms without disturbing the user.
 *
 * @param {string[]} only   Inertia props this page actually renders that can change server-side.
 * @param {{ interval?: number, enabled?: boolean, paused?: boolean }} options
 */
export default function useBackgroundRefresh(only, options = {}) {
    const { interval = BACKGROUND_REFRESH_INTERVAL_MS, enabled = true, paused = false } = options;

    // Held in refs so a new array literal / boolean on every render doesn't restart the timer.
    const onlyRef = useRef(only);
    const pausedRef = useRef(paused);
    onlyRef.current = only;
    pausedRef.current = paused;

    useEffect(() => {
        if (!enabled) return undefined;

        let visitsInFlight = 0;
        let lastVisitActivityAt = 0;

        const onStart = () => {
            visitsInFlight += 1;
            lastVisitActivityAt = Date.now();
        };
        const onFinish = () => {
            visitsInFlight = Math.max(0, visitsInFlight - 1);
            lastVisitActivityAt = Date.now();
        };

        document.addEventListener('inertia:start', onStart);
        document.addEventListener('inertia:finish', onFinish);

        const tick = () => {
            if (visitsInFlight > 0) {
                // A visit that has genuinely finished every event but one got lost — resume
                // refreshing instead of silently never polling again.
                if (Date.now() - lastVisitActivityAt < VISIT_STALL_TIMEOUT_MS) return;
                visitsInFlight = 0;
            }

            if (pausedRef.current) return;
            if (isUserEngaged()) return;

            try {
                router.reload({ only: onlyRef.current, replace: true });
            } catch (err) {
                // Background refresh is best-effort: swallow and retry on the next tick.
            }
        };

        const timer = setInterval(tick, interval);

        return () => {
            clearInterval(timer);
            document.removeEventListener('inertia:start', onStart);
            document.removeEventListener('inertia:finish', onFinish);
        };
    }, [interval, enabled]);
}
