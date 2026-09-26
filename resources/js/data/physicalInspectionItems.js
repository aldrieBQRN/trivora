/**
 * TRIVORA Physical Inspection — Canonical Inspection Items
 * Single source of truth for the 13 official physical-inspection checklist items, reused everywhere the
 * checklist is displayed (TMO Physical Inspection, Operator MTOP Applications/Details/Fix,
 * Tricycle Registry Details). These are reference/descriptive information only — the active
 * inspection decision is a single overall approve/reject result, never a per-item status.
 *
 * Usage:
 *   import { PHYSICAL_INSPECTION_ITEMS } from '@/data/physicalInspectionItems';
 */

export const PHYSICAL_INSPECTION_ITEMS = [
    {
        id: 'head-light',
        label: 'HEAD LIGHT',
        requirement: 'Front head light present, properly mounted, and in working condition.',
    },
    {
        id: 'horn',
        label: 'HORN',
        requirement: 'Audible warning device working properly with sufficient volume for traffic safety.',
    },
    {
        id: 'right-front-signal-light',
        label: 'RIGHT FRONT SIGNAL LIGHT',
        requirement: 'Right front turn signal present and flashing visibly when activated.',
    },
    {
        id: 'left-front-signal',
        label: 'LEFT FRONT SIGNAL',
        requirement: 'Left front turn signal present and flashing visibly when activated.',
    },
    {
        id: 'right-side-mirror',
        label: 'RIGHT SIDE MIRROR',
        requirement: 'Right rearview side mirror present, securely attached, and unobstructed.',
    },
    {
        id: 'left-side-mirror',
        label: 'LEFT SIDE MIRROR',
        requirement: 'Left rearview side mirror present, securely attached, and unobstructed.',
    },
    {
        id: 'right-rear-signal-light',
        label: 'RIGHT REAR SIGNAL LIGHT',
        requirement: 'Right rear turn signal light present and flashing visibly when activated.',
    },
    {
        id: 'left-rear-signal-light',
        label: 'LEFT REAR SIGNAL LIGHT',
        requirement: 'Left rear turn signal light present and flashing visibly when activated.',
    },
    {
        id: 'stop-light',
        label: 'STOP LIGHT',
        requirement: 'Brake/stop light illuminates brightly when the brake lever or pedal is pressed.',
    },
    {
        id: 'battery',
        label: 'BATTERY',
        requirement: 'Battery present, securely mounted, and holding charge for electrical components.',
    },
    {
        id: 'sidecar-inside-light',
        label: 'SIDE CAR INSIDE LIGHT',
        requirement: 'Interior light inside the sidecar present and functioning.',
    },
    {
        id: 'drivers-id',
        label: "DRIVER'S ID FROM NAFTODA/ACTODAN",
        requirement: 'Driver presents a valid government-issued ID from NAFTODA or ACTODAN.',
    },
    {
        id: 'display-of-existing-tariff',
        label: 'DISPLAY OF EXISTING TARIFF (TARIPA)',
        requirement: 'Current official tariff (Taripa) displayed inside the unit where passengers can read it.',
    },
];
