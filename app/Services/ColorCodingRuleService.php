<?php

namespace App\Services;

/**
 * The single source of truth for the color-coding restricted-day rule (last digit of a
 * tricycle's body/plate number -> which weekday it's barred from operating). This mapping
 * was previously duplicated independently in DashboardController::getRestrictedEndings(),
 * DriverTelematicsController::getRestrictedDigitsForDay(), and BPLOController::getCodingDay()
 * — all three now delegate here so the rule only has to change in one place.
 */
class ColorCodingRuleService
{
    protected const DAY_TO_DIGITS = [
        'Monday'    => [1, 2],
        'Tuesday'   => [3, 4],
        'Wednesday' => [5, 6],
        'Thursday'  => [7, 8],
        'Friday'    => [9, 0],
        'Saturday'  => [],
        'Sunday'    => [],
    ];

    /**
     * Which last-digits are barred from operating on the given weekday.
     */
    public static function restrictedDigitsForDay(string $dayName): array
    {
        return self::DAY_TO_DIGITS[$dayName] ?? [];
    }

    /**
     * Which weekday a given last-digit is restricted on (used when assigning a
     * ColorCodingScheme at franchise-release time). Returns null for a digit that
     * has no restricted day (shouldn't happen with the current 0-9 mapping, but
     * kept defensive since callers assign this from user input).
     */
    public static function codingDayForLastDigit(int $digit): ?string
    {
        foreach (self::DAY_TO_DIGITS as $day => $digits) {
            if (in_array($digit, $digits, true)) {
                return $day;
            }
        }

        return null;
    }
}
