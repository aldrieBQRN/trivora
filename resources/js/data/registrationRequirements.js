/**
 * TRIVORA Franchise Registration — Canonical Vehicle Details & Requirements
 * Single source of truth for the fields/documents used by BOTH registration entry points:
 *   - Public Registration (resources/js/Pages/Registration/PublicApply.jsx)
 *   - Driver Portal New Unit Registration / Renewal (resources/js/Pages/Operator/Compliance/MTOPWizard.jsx)
 * and referenced by TMO Document Review (resources/js/Pages/TMODashboard/DocumentReview.jsx) for
 * the matching requirement labels. Keeps the two registration flows from silently drifting apart —
 * same fields, same labels, same order, same required/conditional rules everywhere.
 *
 * Document `id` values are the exact document_type stored on ApplicationDocument (see
 * App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS on the backend, which this list mirrors).
 *
 * Usage:
 *   import { VEHICLE_DETAIL_FIELDS, REGISTRATION_DOCUMENTS, getApplicableDocuments } from '@/data/registrationRequirements';
 */

export const VEHICLE_DETAIL_FIELDS = [
    { id: 'plate_number', label: 'LTO Plate Number', placeholder: 'LTO Plate Number' },
    { id: 'make_model', label: 'Motorcycle Make & Model', placeholder: 'Make & Model' },
    { id: 'year_model', label: 'Year Model', placeholder: 'Year Model' },
    { id: 'body_color', label: 'Body Color', placeholder: 'Body Color' },
    { id: 'body_type', label: 'Body Type', placeholder: 'Body Type' },
    { id: 'engine_number', label: 'Engine Number', placeholder: 'Engine Number' },
    { id: 'chassis_number', label: 'Chassis Number', placeholder: 'Chassis Number' },
    { id: 'or_number', label: 'LTO OR Number', placeholder: 'LTO OR Number' },
    { id: 'cr_number', label: 'LTO CR Number', placeholder: 'LTO CR Number' },
];

// required: always required. conditional (required: false): situational, never blocks submission.
// renewalOnly: only applies to (and is only required for) a 'renewal' application_type — never
// shown or required for a 'new' unit registration.
export const REGISTRATION_DOCUMENTS = [
    { id: 'police_clearance', label: 'Police Clearance or LGU Certification', required: true },
    { id: 'health_certificate', label: 'Health Certificate (Driver)', required: true },
    { id: 'orcr_photocopy', label: 'Photocopy of OR/CR', required: true },
    { id: 'drivers_license', label: "Driver's License — Back-to-back Photocopy (Prof/Restriction 1/A1)", required: true },
    { id: 'barangay_clearance', label: 'Barangay Clearance (Original)', required: true },
    { id: 'toda_clearance', label: 'TODA/NAFTODA/ACTODAN Clearance (Original)', required: true },
    { id: 'cedula', label: 'Cedula', required: true, hint: 'For redemption/processing at the Municipal Treasurer’s Office' },
    { id: 'driver_id', label: "Driver's ID Issued by NAFTODA/ACTODAN", required: true },
    { id: 'tariff_list', label: 'List of Existing Tariff Fee', required: true, hint: 'For display inside the sidecar' },
    { id: 'delivery_receipt', label: 'Delivery Receipt (Photocopy)', required: false, hint: 'Required for vehicles without OR/CR yet, or for new units' },
    { id: 'authorization_letter', label: "Operator's Authorization Letter & Photocopy of ID", required: false, hint: 'Required if the person processing or claiming the permit is not the operator/owner' },
    { id: 'prangkisa', label: 'Xerox Prangkisa (Kung Renew)', required: false, renewalOnly: true, hint: 'Required only when renewing an existing franchise' },
];

/**
 * The documents that actually apply for a given application_type: excludes Prangkisa for a
 * 'new' unit registration (it has no prior franchise to xerox), and marks it required for a
 * 'renewal'.
 */
export function getApplicableDocuments(applicationType = 'new') {
    const isRenewal = applicationType === 'renewal';
    return REGISTRATION_DOCUMENTS
        .filter(doc => !doc.renewalOnly || isRenewal)
        .map(doc => (doc.renewalOnly ? { ...doc, required: isRenewal } : doc));
}
