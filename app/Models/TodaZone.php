<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TodaZone extends Model
{
    protected $fillable = [
        'name',
        'code',
        'barangay',
        'terminal_name',
        'address',
        'latitude',
        'longitude',
        'president_name',
        'contact_number',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Operators/drivers belonging to this TODA zone.
     */
    public function operators(): HasMany
    {
        return $this->hasMany(Operator::class, 'toda_id');
    }

    /**
     * Tricycles assigned to this TODA zone.
     */
    public function tricycles(): HasMany
    {
        return $this->hasMany(Tricycle::class, 'toda_zone_id');
    }

    /**
     * Geo-coordinate waypoints that define this zone's route boundary.
     */
    public function routes(): HasMany
    {
        return $this->hasMany(TodaZoneRoute::class)->orderBy('sequence_order');
    }

    /**
     * Generate a unique TODA code based on name and/or barangay.
     */
    public static function generateUniqueCode(string $name, ?string $barangay = null): string
    {
        // Strip "TODA" prefix if entered by user (e.g. "TODA Bucana" -> "Bucana")
        $cleaned = preg_replace('/^\s*toda\s*[-_]?\s*/i', '', trim($name));
        if (empty($cleaned) && $barangay) {
            $cleaned = preg_replace('/^\s*toda\s*[-_]?\s*/i', '', trim($barangay));
        }

        // Keep alphanumeric characters and convert spaces/symbols to hyphen
        $slug = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', trim($cleaned)));
        $slug = trim($slug, '-');

        if (empty($slug)) {
            $slug = 'ZONE';
        }

        $baseCode = 'TODA-' . $slug;
        if (strlen($baseCode) > 16) {
            $baseCode = substr($baseCode, 0, 16);
        }

        $candidate = $baseCode;
        $counter = 1;

        while (static::where('code', $candidate)->exists()) {
            $counter++;
            $suffix = '-' . str_pad((string) $counter, 2, '0', STR_PAD_LEFT);
            $candidate = substr($baseCode, 0, 20 - strlen($suffix)) . $suffix;
        }

        return $candidate;
    }

    /**
     * Generate the next sequential TODA code (e.g. TODA-05, TODA-06).
     */
    public static function generateNextCode(): string
    {
        $maxNum = static::all()->map(function ($t) {
            if (preg_match('/(?:TODA-)?(?:0*)(\d+)$/i', $t->code, $m)) {
                return (int) $m[1];
            }
            return 0;
        })->max();

        $nextNum = max($maxNum ?: 0, static::count()) + 1;
        $code = 'TODA-' . str_pad((string) $nextNum, 2, '0', STR_PAD_LEFT);

        while (static::where('code', $code)->exists()) {
            $nextNum++;
            $code = 'TODA-' . str_pad((string) $nextNum, 2, '0', STR_PAD_LEFT);
        }

        return $code;
    }
}
