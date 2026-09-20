<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Application extends Model
{
    protected $fillable = [
        'reference_number',
        'operator_id',
        'tricycle_id',
        'application_type',
        'current_step',
        'status',
        'sticker_number',
        'tracking_method',
        'iot_device_id',
        'submitted_at',
        'completed_at',
        'remarks',
        'terms_accepted',
        'privacy_policy_accepted',
        'consent_accepted_at',
        'terms_version',
    ];

    protected function casts(): array
    {
        return [
            'current_step'            => 'integer',
            'submitted_at'            => 'datetime',
            'completed_at'            => 'datetime',
            'terms_accepted'          => 'boolean',
            'privacy_policy_accepted' => 'boolean',
            'consent_accepted_at'     => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Workflow helpers & Payment Ticket
    // -------------------------------------------------------------------------

    public function isPendingReview(): bool
    {
        return in_array($this->status, ['pending_review', 'under_review']);
    }


    public function isPendingInspection(): bool
    {
        return in_array($this->status, ['pending_inspection', 'under_inspection', 'failed_inspection']);
    }

    public function isPendingPayment(): bool
    {
        return in_array($this->status, ['pending_payment', 'payment_issue']);
    }

    public function isPaymentVerified(): bool
    {
        return in_array($this->status, ['payment_verified', 'paid']);
    }

    public function isAwaitingFinalConfirmation(): bool
    {
        return $this->status === 'awaiting_tmo_confirmation';
    }

    public function isCompleted(): bool
    {
        return in_array($this->status, ['completed', 'scheme_issued']);
    }

    /**
     * Structured municipal payment ticket / order of payment for the physical cashier.
     */
    public function getPaymentTicketAttribute(): array
    {
        $breakdown = [
            ['description' => 'Municipal Franchise Filing Fee', 'code' => 'ACC-101', 'amount' => 500.00],
            ['description' => 'TMO Physical Inspection Fee',   'code' => 'ACC-102', 'amount' => 150.00],
            ['description' => 'Franchise Sticker & Plate Tag',  'code' => 'ACC-103', 'amount' => 100.00],
        ];

        return [
            'ticket_number'     => 'TKT-' . date('Y') . '-' . str_pad($this->id, 5, '0', STR_PAD_LEFT),
            'reference_number'  => $this->reference_number,
            'application_type'  => $this->application_type ?? 'new',
            'applicant_name'    => $this->operator ? $this->operator->full_name : 'N/A',
            'contact_number'    => $this->operator ? $this->operator->contact_number : 'N/A',
            'tricycle_details'  => [
                'plate_number'   => $this->tricycle ? $this->tricycle->plate_number : 'N/A',
                'engine_number'  => $this->tricycle ? $this->tricycle->engine_number : 'N/A',
                'chassis_number' => $this->tricycle ? $this->tricycle->chassis_number : 'N/A',
                'make_model'     => $this->tricycle ? "{$this->tricycle->make} {$this->tricycle->model}" : 'N/A',
                'toda_zone'      => ($this->tricycle && $this->tricycle->todaZone) ? $this->tricycle->todaZone->name : 'N/A',
            ],
            'total_amount'      => 750.00,
            'fees_breakdown'    => $breakdown,
            'items'             => $breakdown,
            'cashier_window'    => 'Municipal Cashier Counter — Nasugbu Municipal Hall Ground Floor',
            'bplo_office'       => 'Business Permits & Licensing Office (BPLO) Counter',
            'issued_at'         => $this->updated_at ? $this->updated_at->format('M d, Y') : now()->format('M d, Y'),
            'instructions'      => [
                'Present this Payment Ticket along with your valid ID to the Municipal Cashier counter (Ground Floor, Municipal Hall).',
                'Pay the exact total amount of ₱750.00 in cash to the Cashier Officer.',
                'Ensure you receive the Official Receipt (OR) and that this Payment Ticket is stamped/validated by the Cashier.',
                'Proceed directly to the BPLO (Business Permits & Licensing Office) counter with your Official Receipt and validated Payment Ticket for verification and Franchise Sticker release.',
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePendingReview($query)
    {
        return $query->where('status', 'pending_review');
    }


    public function scopePendingInspection($query)
    {
        return $query->where('status', 'pending_inspection');
    }

    public function scopePendingPayment($query)
    {
        return $query->where('status', 'pending_payment');
    }

    public function scopePaymentVerified($query)
    {
        return $query->whereIn('status', ['payment_verified', 'paid']);
    }

    public function scopeAwaitingFinalConfirmation($query)
    {
        return $query->where('status', 'awaiting_tmo_confirmation');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The operator who submitted this application.
     */
    public function operator(): BelongsTo
    {
        return $this->belongsTo(Operator::class);
    }

    /**
     * The tricycle unit this application is for.
     */
    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    /**
     * All documents attached to this application.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(ApplicationDocument::class);
    }

    /**
     * The immutable status history timeline for this application.
     */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(ApplicationStatusHistory::class)->orderBy('created_at');
    }

    /**
     * All physical inspection attempts for this application.
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class)->orderBy('attempt_number');
    }

    /**
     * The most recent inspection attempt.
     */
    public function latestInspection(): HasOne
    {
        return $this->hasOne(Inspection::class)->latestOfMany('attempt_number');
    }

    /**
     * The payment record for this application.
     */
    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    /**
     * The franchise scheme issued from this application.
     */
    public function franchiseScheme(): HasOne
    {
        return $this->hasOne(FranchiseScheme::class);
    }
}
