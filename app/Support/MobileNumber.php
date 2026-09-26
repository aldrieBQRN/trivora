<?php

namespace App\Support;

/**
 * Shared mobile-number matching helpers for the two user-facing login flows — the owner/staff
 * web portal (OperatorAuthController), which accepts either a stored email or mobile number,
 * and the driver app (Api\DriverAuthController), which authenticates by mobile number or
 * franchise permit number only (no email login for that flow).
 */
class MobileNumber
{
    /**
     * Digit-only variants of an entered mobile number, covering every local/international
     * form a number may be stored as — 09…, bare 9…, +63…/63… — so any stored equivalent
     * resolves to the same account.
     *
     * @return list<string>
     */
    public static function variants(string $value): array
    {
        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if ($digits === '') {
            return [];
        }

        $variants = [$digits];

        if (str_starts_with($digits, '63') && strlen($digits) >= 12) {
            $variants[] = '0' . substr($digits, 2);
        }
        if (str_starts_with($digits, '0') && strlen($digits) >= 11) {
            $variants[] = '63' . substr($digits, 1);
        }
        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $variants[] = '0' . $digits;
            $variants[] = '63' . $digits;
        }

        return array_values(array_unique($variants));
    }

    /**
     * SQL expression that strips the separators (-, space, +) a mobile number may be stored
     * with, so a stored column value can be compared directly against variants() in an
     * IN (...) clause regardless of how it was formatted on file.
     */
    public static function normalizedSql(string $column): string
    {
        return "REPLACE(REPLACE(REPLACE({$column}, '-', ''), ' ', ''), '+', '')";
    }

    /**
     * Whether an entered login identifier even resembles a mobile number. Lets a login
     * attempt try the mobile lookup first without hijacking franchise permit numbers or
     * operator license numbers, which contain digits of their own (e.g. FS-2026-00004).
     */
    public static function looksLikeMobile(string $value): bool
    {
        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if (strlen($digits) < 10 || strlen($digits) > 13) {
            return false;
        }

        return str_starts_with($digits, '09')
            || str_starts_with($digits, '639')
            || (str_starts_with($digits, '9') && strlen($digits) === 10);
    }
}
