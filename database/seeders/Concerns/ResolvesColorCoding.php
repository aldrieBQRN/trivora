<?php

namespace Database\Seeders\Concerns;

use App\Models\ColorCodingScheme;
use App\Services\ColorCodingRuleService;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Seeded color-coding data must follow the same rule the system applies: a unit's scheme is
 * the active scheme listing the last digit of its sticker number, and a color-coding violation
 * can only happen on that scheme's restricted weekday.
 */
trait ResolvesColorCoding
{
    protected function schemeForCoding(?string $codingNumber): ?ColorCodingScheme
    {
        if (! preg_match('/(\d)\D*$/', (string) $codingNumber, $m)) {
            return null;
        }

        return ColorCodingRuleService::schemeForLastDigit((int) $m[1]);
    }

    /**
     * The scheme's restricted weekday on or before $around, keeping the time of day.
     */
    protected function codingDayOnOrBefore(?ColorCodingScheme $scheme, CarbonInterface $around): Carbon
    {
        $at = Carbon::instance($around);
        $day = $scheme?->restricted_days[0] ?? null;

        if (! $day || $at->format('l') === $day) {
            return $at;
        }

        return $at->copy()->previous($day)->setTimeFrom($at);
    }
}
