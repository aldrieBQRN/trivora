<?php

namespace App\Services;

use App\Models\ColorCodingScheme;
use App\Models\Tricycle;
use Carbon\CarbonInterface;

/**
 * Authoritative service for color-coding rules, backed strictly by the database.
 * No hardcoded DAY_TO_DIGITS mapping exists in application code; all restricted
 * days, restricted digits, hex colors, and fine amounts are read from color_coding_schemes.
 */
class ColorCodingRuleService
{
    /**
     * Evaluate whether a tricycle is restricted on a given date (default today).
     *
     * Authoritative identifier evaluated is tricycles.coding_scheme_number (Sticker Number).
     *
     * @return array{
     *     is_restricted_today: bool,
     *     evaluated_identifier: ?string,
     *     last_digit: ?int,
     *     scheme_id: ?int,
     *     scheme_name: ?string,
     *     color_hex: ?string,
     *     restricted_days: array<string>,
     *     restricted_digits: array<int>,
     *     fine_amount: float,
     *     status: string,
     *     status_label: string,
     *     warning_message: ?string
     * }
     */
    public static function evaluateTricycle(Tricycle $tricycle, ?CarbonInterface $date = null): array
    {
        $today = $date ?? now();
        $dayName = $today->format('l');

        // Authoritative Sticker Number / coding number
        $identifier = $tricycle->coding_scheme_number;
        $lastDigit = null;
        if ($identifier !== null && $identifier !== '') {
            $clean = trim((string) $identifier);
            if (preg_match('/\d$/', $clean, $matches)) {
                $lastDigit = (int) $matches[0];
            }
        }

        // Prefer the tricycle's active franchise scheme's color coding scheme
        $scheme = $tricycle->franchiseScheme?->colorCodingScheme;

        // Fallback: if unit has no assigned scheme yet, resolve scheme from DB matching the last digit
        if (!$scheme && $lastDigit !== null) {
            $scheme = self::schemeForLastDigit($lastDigit);
        }

        return self::formatEvaluation($scheme, $dayName, $identifier, $lastDigit);
    }

    /**
     * Evaluate an explicit ColorCodingScheme record directly.
     */
    public static function evaluateScheme(?ColorCodingScheme $scheme, ?int $lastDigit = null, ?CarbonInterface $date = null, ?string $identifier = null): array
    {
        $today = $date ?? now();
        $dayName = $today->format('l');

        return self::formatEvaluation($scheme, $dayName, $identifier, $lastDigit);
    }

    /**
     * Format the evaluation result array.
     */
    protected static function formatEvaluation(?ColorCodingScheme $scheme, string $dayName, ?string $identifier, ?int $lastDigit): array
    {
        $schemeId = $scheme?->id;
        $schemeName = $scheme?->name;
        $colorHex = $scheme?->color_hex;
        $restrictedDays = $scheme?->restricted_days ?? [];
        $restrictedDigits = $scheme?->restricted_digits ?? [];
        $fineAmount = $scheme ? (float) $scheme->fine_amount : 500.00;

        $isRestricted = false;
        if ($scheme && $scheme->is_active) {
            $isRestricted = $scheme->isRestricted($dayName, $lastDigit);
        }

        $formattedFine = number_format($fineAmount, 2);
        $warningMessage = $isRestricted
            ? "Operating on restricted coding day ({$dayName}, ending digit {$lastDigit}). Municipal Fine: ₱{$formattedFine}."
            : null;

        $status = $isRestricted ? 'restricted' : 'compliant';
        $statusLabel = $isRestricted ? 'Restricted Today (Coding Day)' : 'Allowed Operation';

        return [
            'is_restricted_today'  => $isRestricted,
            'evaluated_identifier' => $identifier,
            'last_digit'           => $lastDigit,
            'scheme_id'            => $schemeId,
            'scheme_name'          => $schemeName,
            'color_hex'            => $colorHex,
            'restricted_days'      => $restrictedDays,
            'restricted_digits'    => $restrictedDigits,
            'fine_amount'          => $fineAmount,
            'status'               => $status,
            'status_label'         => $statusLabel,
            'warning_message'      => $warningMessage,
        ];
    }

    /**
     * Which last-digits are barred from operating on the given weekday, dynamically loaded from the database.
     *
     * @return array<int>
     */
    public static function restrictedDigitsForDay(string $dayName): array
    {
        $schemes = ColorCodingScheme::where('is_active', true)->get();
        $digits = [];

        foreach ($schemes as $scheme) {
            if ($scheme->isRestrictedOn($dayName)) {
                $digits = array_merge($digits, $scheme->restricted_digits ?? []);
            }
        }

        return array_values(array_unique($digits));
    }

    /**
     * Find the active database ColorCodingScheme responsible for a given last digit.
     */
    public static function schemeForLastDigit(int $digit): ?ColorCodingScheme
    {
        return ColorCodingScheme::where('is_active', true)
            ->whereJsonContains('restricted_digits', $digit)
            ->first();
    }

    /**
     * Which weekday a given last-digit is restricted on, dynamically loaded from the database.
     */
    public static function codingDayForLastDigit(int $digit): ?string
    {
        $scheme = self::schemeForLastDigit($digit);

        return $scheme && !empty($scheme->restricted_days) ? $scheme->restricted_days[0] : null;
    }
}
