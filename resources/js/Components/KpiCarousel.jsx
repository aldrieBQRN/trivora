import React, { Children, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/*
 * KPI card deck: on phones (< sm) it shows ONE card at a time, centered between ‹ › buttons
 * (swiping also works — native scroll-snap, no library). From sm up it is the normal grid and
 * the buttons are hidden. Cards keep their own markup unchanged.
 */
export default function KpiCarousel({
    children,
    className = 'mb-6',
    gridClassName = 'sm:grid-cols-2 lg:grid-cols-4',
}) {
    const items = Children.toArray(children).filter(Boolean);
    const trackRef = useRef(null);
    const [active, setActive] = useState(0);
    const last = items.length - 1;

    const stepWidth = (el) => {
        const first = el.children[0];
        if (!first) return 0;
        const gap = parseFloat(window.getComputedStyle(el).columnGap) || 0;
        return first.offsetWidth + gap;
    };

    const handleScroll = () => {
        const el = trackRef.current;
        if (!el) return;
        const step = stepWidth(el);
        if (step > 0) setActive(Math.min(last, Math.max(0, Math.round(el.scrollLeft / step))));
    };

    const goTo = (index) => {
        const el = trackRef.current;
        if (!el) return;
        const target = Math.min(last, Math.max(0, index));
        el.scrollTo({ left: target * stepWidth(el), behavior: 'smooth' });
        setActive(target);
    };

    return (
        <div className={className}>
            <div className="flex items-center gap-2 sm:block">
                {items.length > 1 && (
                    <ArrowButton
                        side="left"
                        disabled={active === 0}
                        onClick={() => goTo(active - 1)}
                        label="Previous card"
                    />
                )}
    
                <div
                    ref={trackRef}
                    onScroll={handleScroll}
                    aria-live="polite"
                    className={`-mx-3 -mb-8 -mt-2 flex min-w-0 flex-1 snap-x snap-mandatory scroll-px-3 gap-8 overflow-x-auto px-3 pb-8 pt-2 scrollbar-none sm:m-0 sm:grid sm:snap-none sm:gap-4 sm:overflow-visible sm:p-0 ${gridClassName} items-stretch`}
                >
                    {items.map((child, i) => (
                        <div
                            key={i}
                            className="flex w-full shrink-0 snap-center sm:w-auto [&>*]:min-w-0 [&>*]:flex-1"
                        >
                            {child}
                        </div>
                    ))}
                </div>
    
                {items.length > 1 && (
                    <ArrowButton
                        side="right"
                        disabled={active === last}
                        onClick={() => goTo(active + 1)}
                        label="Next card"
                    />
                )}
            </div>

            {/* Position dots — phones only */}
            {items.length > 1 && (
                <div className="relative mt-3 flex items-center justify-center gap-1.5 sm:hidden">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={`Show card ${i + 1} of ${items.length}`}
                            aria-current={active === i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                active === i ? 'w-5 bg-[#182B62]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Round ‹ › button beside the card — phones only. Stays in place (dimmed) at either end so the
// card never shifts sideways.
function ArrowButton({ side, disabled, onClick, label }) {
    const Icon = side === 'left' ? ChevronLeft : ChevronRight;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.12)] transition-all hover:border-slate-300 hover:text-[#182B62] active:scale-95 disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none sm:hidden"
        >
            <Icon size={17} strokeWidth={2.5} />
        </button>
    );
}
