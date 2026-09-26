/**
 * TRIVORA — All 42 official barangays of Nasugbu, Batangas (PSA/PSGC).
 * Single source of truth shared by BOTH registration entry points:
 *   - Public Registration (resources/js/Pages/Registration/PublicApply.jsx)
 *   - Driver Portal New Unit Registration / Renewal (resources/js/Pages/Operator/Compliance/MTOPWizard.jsx)
 * Keeps the applicant & separate-driver barangay selects from drifting apart.
 *
 * The 12 Poblacion barangays use a bare number as the submitted value (so the backend's
 * 'Brgy. ' . $barangay concatenation reads as "Brgy. 1, Nasugbu, Batangas"), paired with a
 * clear "Barangay N" label. Mirrors App\Support\NasugbuBarangays on the backend.
 */
export const NASUGBU_BARANGAYS = [
    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Barangay ${i + 1}` })),
    'Aga', 'Balaytigui', 'Banilad', 'Bilaran', 'Bucana', 'Bulihan', 'Bunducan', 'Butucan',
    'Calayo', 'Catandaan', 'Cogunan', 'Dayap', 'Kaylaway', 'Kayrilaw', 'Latag', 'Looc',
    'Lumbangan', 'Malapad na Bato', 'Mataas na Pulo', 'Maugat', 'Munting Indan', 'Natipuan',
    'Pantalan', 'Papaya', 'Putat', 'Reparo', 'Talangan', 'Tumalim', 'Utod', 'Wawa',
].map(b => (typeof b === 'string' ? { value: b, label: b } : b));
