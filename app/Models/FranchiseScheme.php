<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class FranchiseScheme extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_REVOKED = 'revoked';

    /**
     * The only operational-authorization transitions TMO may ever perform. Revoked is
     * deliberately terminal — there is no Revoked -> Active/Suspended path back for this
     * franchise; a genuinely new franchise would have to be issued instead.
     */
    private const ALLOWED_STATUS_TRANSITIONS = [
        self::STATUS_ACTIVE     => [self::STATUS_SUSPENDED, self::STATUS_REVOKED],
        self::STATUS_SUSPENDED  => [self::STATUS_ACTIVE, self::STATUS_REVOKED],
        self::STATUS_REVOKED    => [],
    ];

    /**
     * In-memory default so a just-created scheme's $status is 'active' immediately, matching
     * the column's own DB-level default (see the Driver-status feature this replaced, where the
     * same in-memory-default gap caused a freshly created model to read back `status === null`
     * in the very same response instead of its DB default).
     */
    protected $attributes = [
        'status' => self::STATUS_ACTIVE,
    ];

    protected $fillable = [
        'application_id',
        'tricycle_id',
        'color_coding_scheme_id',
        'issued_by',
        'franchise_number',
        // Was previously omitted, so BPLOController::release()'s FranchiseScheme::create([...,
        // 'sticker_number' => $stickerNumber, ...]) silently dropped it on every real release —
        // the column exists (migration 2026_09_12_000000) and activeRegistryList() already reads
        // it back (`$scheme?->sticker_number`), so this was a real gap, not intentional.
        'sticker_number',
        'issue_date',
        'expiry_date',
        'is_active',
        'status',
        'status_reason',
        'status_changed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'issue_date'         => 'date',
            'expiry_date'        => 'date',
            'is_active'          => 'boolean',
            'status_changed_at'  => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Check whether this franchise permit has expired.
     */
    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date->isPast();
    }

    // -------------------------------------------------------------------------
    // Driver person resolution — SAME relationships as the TMO Active Tricycle Registry
    // -------------------------------------------------------------------------

    /**
     * The application this unit's owner/driver relationship is read from — resolved exactly
     * like the TMO Active Tricycle Registry details page does it
     * (DashboardController: `$tri->applications()->with(...)->latest()->first()`): the
     * tricycle's MOST RECENT application, falling back to the franchise's own linked
     * application only for units with no application rows at all.
     *
     * Verification goes through this single query so the Driver App and the registry can
     * never disagree — update the relationship in the registry and verification reflects it
     * automatically, with no second data source for registration to drift onto.
     */
    public function registryApplication(): ?Application
    {
        return $this->tricycle?->applications()->latest()->first() ?? $this->application;
    }

    /**
     * Whether the tricycle OWNER (the `operators` record) is also the person who drives
     * this franchise's tricycle — as decided by the unit's registry application. A unit
     * with no application at all (legacy/manual records) predates the separate-driver
     * concept entirely, so the owner drives there.
     */
    public function ownerIsDriver(): bool
    {
        $application = $this->registryApplication();

        return $application === null || (bool) $application->owner_is_driver;
    }

    /**
     * The person who actually DRIVES this franchise's tricycle: the owner (operators)
     * when owner-is-driver, otherwise the separate `application_drivers` person of the
     * same registry application.
     *
     * Null only when the application says "separate driver" but no driver person row
     * exists — callers surface that as DRIVER_NOT_ON_FILE and must never fall back to
     * the owner, or they would verify the wrong person's identity.
     *
     * @return Operator|ApplicationDriver|null
     */
    public function driverPerson(): Operator|ApplicationDriver|null
    {
        if ($this->ownerIsDriver()) {
            return $this->tricycle?->operator;
        }

        return $this->registryApplication()?->tricycleDriver;
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeExpired($query)
    {
        return $query->where('expiry_date', '<', now());
    }

    // -------------------------------------------------------------------------
    // Operational authorization status
    // -------------------------------------------------------------------------

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    public function isRevoked(): bool
    {
        return $this->status === self::STATUS_REVOKED;
    }

    /**
     * Whether this franchise currently authorizes its assigned driver to operate: go Online,
     * accept/perform bookings, transmit GPS telematics. The single check every enforcement point
     * (EnsureFranchiseIsOperational middleware, BookingDispatchService, Driver::canOperate())
     * consults, so the rule is defined in exactly one place.
     */
    public function canOperate(): bool
    {
        return $this->isActive();
    }

    public function canTransitionTo(string $toStatus): bool
    {
        return in_array($toStatus, self::ALLOWED_STATUS_TRANSITIONS[$this->status] ?? [], true);
    }

    /**
     * The single, centralized place a franchise's operational status is ever changed. Enforces
     * the allowed-transition table above (Revoked is terminal), records an append-only history
     * row (FranchiseStatusHistory), and — whenever the franchise is leaving Active — immediately
     * forces every driver assigned to this franchise's tricycle Offline/unavailable and clears
     * their movement-tracking session, so "suspended/revoked" can never silently coexist with
     * "currently online" in the data.
     *
     * @throws \InvalidArgumentException when the transition isn't allowed from the current status.
     */
    public function transitionStatus(string $toStatus, ?string $reason, int $changedByUserId): void
    {
        if (!$this->canTransitionTo($toStatus)) {
            throw new \InvalidArgumentException(
                "Cannot transition franchise status from '{$this->status}' to '{$toStatus}'."
            );
        }

        $fromStatus = $this->status;

        DB::transaction(function () use ($toStatus, $fromStatus, $reason, $changedByUserId) {
            $this->update([
                'status'            => $toStatus,
                'status_reason'     => $reason,
                'status_changed_at' => now(),
            ]);

            if ($toStatus !== self::STATUS_ACTIVE) {
                Driver::where('tricycle_id', $this->tricycle_id)->update([
                    'is_online'     => false,
                    'is_available'  => false,
                    'online_since'  => null,
                ]);
            }

            FranchiseStatusHistory::create([
                'franchise_scheme_id' => $this->id,
                'changed_by'          => $changedByUserId,
                'from_status'         => $fromStatus,
                'to_status'           => $toStatus,
                'reason'              => $reason,
            ]);
        });
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(FranchiseStatusHistory::class)->orderByDesc('created_at');
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The application that produced this franchise scheme.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * The tricycle this franchise is issued to.
     */
    public function tricycle(): BelongsTo
    {
        return $this->belongsTo(Tricycle::class);
    }

    /**
     * The color-coding scheme assigned to this franchise.
     */
    public function colorCodingScheme(): BelongsTo
    {
        return $this->belongsTo(ColorCodingScheme::class);
    }

    /**
     * The BPLO staff member who issued this franchise.
     */
    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    /**
     * Violations recorded under this franchise.
     */
    public function violations(): HasMany
    {
        return $this->hasMany(Violation::class);
    }
}
