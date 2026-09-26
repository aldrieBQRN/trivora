<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationDocument extends Model
{
    /**
     * The canonical franchise registration requirement list — the single source of truth for
     * every page that displays "which documents are required and what's their status" (Public
     * Registration, Driver Portal New Unit Registration/Renewal, TMO Document Review, Tricycle
     * Registry Details). Keyed by the requirement key stored in document_type for new-style
     * submissions (see resolveRequirementKey()). Labels mirror
     * resources/js/data/registrationRequirements.js's REGISTRATION_DOCUMENTS list exactly.
     *
     * 'renewal_only' items are mandatory ONLY when the owning application's application_type is
     * 'renewal' (e.g. Prangkisa, which only exists for a unit that already has a prior
     * franchise) — never required for a 'new' unit registration.
     */
    public const CANONICAL_REQUIREMENTS = [
        'police_clearance'     => ['label' => 'Police Clearance or LGU Certification', 'mandatory' => true],
        'health_certificate'   => ['label' => 'Health Certificate (Driver)', 'mandatory' => true],
        'orcr_photocopy'       => ['label' => 'Photocopy of OR/CR', 'mandatory' => true],
        'drivers_license'      => ['label' => "Driver's License Back-to-back (Prof/Restriction 1/A1)", 'mandatory' => true],
        'delivery_receipt'     => ['label' => 'Delivery Receipt (Kung walang OR/CR pa / New Unit)', 'mandatory' => false],
        'barangay_clearance'   => ['label' => 'Barangay Clearance (Original)', 'mandatory' => true],
        'toda_clearance'       => ['label' => 'TODA/NAFTODA/ACTODAN Clearance (Original)', 'mandatory' => true],
        'cedula'               => ['label' => 'Cedula', 'mandatory' => true],
        'driver_id'            => ['label' => "Driver's ID Issued by NAFTODA/ACTODAN", 'mandatory' => true],
        'tariff_list'          => ['label' => 'List of Existing Tariff Fee (For Sidecar Display)', 'mandatory' => true],
        'authorization_letter' => ['label' => "Operator's Authorization Letter & ID (Kung hindi may-ari)", 'mandatory' => false],
        'prangkisa'            => ['label' => 'Xerox Prangkisa (Kung Renew)', 'mandatory' => false, 'renewal_only' => true],
    ];

    protected $fillable = [
        'application_id',
        'document_type',
        'file_name',
        'file_path',
        'file_size_kb',
        'mime_type',
        'review_status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at'   => 'datetime',
            'file_size_kb'  => 'integer',
        ];
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePending($query)
    {
        return $query->where('review_status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('review_status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('review_status', 'rejected');
    }

    // -------------------------------------------------------------------------
    // Requirement resolution
    // -------------------------------------------------------------------------

    /**
     * Maps a stored document to the canonical requirement key (a CANONICAL_REQUIREMENTS key)
     * it fulfills. New submissions (since the document_type VARCHAR migration) store the
     * requirement key directly as document_type — no mapping needed. Older submissions used a
     * 6-value generic enum, with 4 conditional document kinds collapsed into 'other' and
     * disambiguated only by a file_name prefix (RegistrationController::store()'s old $docKeys
     * convention); that legacy path is preserved here so historical applications still resolve
     * correctly. Shared by TMO\ApplicationController (Document Review) and DashboardController
     * (Tricycle Registry Details) so both pages agree on exactly the same requirement.
     */
    public static function resolveRequirementKey(self $doc): string
    {
        static $legacyTypeMap = [
            'drivers_license'    => 'drivers_license',
            'or_cr'              => 'orcr_photocopy',
            'proof_of_residence' => 'barangay_clearance',
            'toda_clearance'     => 'toda_clearance',
            'photo_id'           => 'driver_id',
        ];

        static $legacyOtherPrefixMap = [
            'receipt'   => 'delivery_receipt',
            'tariff'    => 'tariff_list',
            'auth'      => 'authorization_letter',
            'prangkisa' => 'prangkisa',
        ];

        if (isset($legacyTypeMap[$doc->document_type])) {
            return $legacyTypeMap[$doc->document_type];
        }

        if ($doc->document_type === 'other') {
            $parts = explode('_', $doc->file_name, 2);
            if (count($parts) > 1 && isset($legacyOtherPrefixMap[$parts[0]])) {
                return $legacyOtherPrefixMap[$parts[0]];
            }
            return 'other';
        }

        // New-style document_type IS the requirement key already.
        return $doc->document_type;
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The application this document belongs to.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * The TMO personnel who reviewed this document.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
