<?php

namespace App\Services;

use App\Models\FranchiseScheme;
use App\Models\Violation;

class ViolationEnforcementService
{
    /**
     * Determine whether a violation qualifies as a confirmed offense under municipal ordinance rules.
     * Excludes:
     *  - dismissed violations (status === 'dismissed')
     *  - violations where an appeal was approved (appeal->status === 'approved', which exonerated the citation)
     *  - violations awaiting appeal determination (status === 'contested' or appeal->status === 'under_review')
     */
    public static function isQualifyingConfirmed(Violation $violation): bool
    {
        if ($violation->status === 'dismissed') {
            return false;
        }

        if ($violation->appeal && $violation->appeal->status === 'approved') {
            return false;
        }

        if ($violation->status === 'contested' || ($violation->appeal && $violation->appeal->status === 'under_review')) {
            return false;
        }

        return true;
    }

    /**
     * Calculate the offense number for a specific violation.
     *
     * Identifies the chronological sequence of qualifying confirmed violations for the franchise unit
     * and violation category.
     *
     * Returns 1 for the 1st offense, 2 for the 2nd offense, 3 for 3rd offense, 4 for 4th offense, etc.
     */
    public static function calculateOffenseNumber(Violation $violation): int
    {
        $query = Violation::query()
            ->with('appeal')
            ->where(function ($q) use ($violation) {
                if ($violation->franchise_scheme_id) {
                    $q->where('franchise_scheme_id', $violation->franchise_scheme_id)
                      ->orWhere(function ($sub) use ($violation) {
                          $sub->whereNull('franchise_scheme_id')
                              ->where('tricycle_id', $violation->tricycle_id);
                      });
                } else {
                    $q->where('tricycle_id', $violation->tricycle_id);
                }
            })
            ->where('violation_type', $violation->violation_type);

        $all = $query->orderBy('detected_at', 'asc')->orderBy('id', 'asc')->get();

        $confirmedCountBefore = 0;
        foreach ($all as $item) {
            if ($item->id === $violation->id) {
                break;
            }

            if (self::isQualifyingConfirmed($item)) {
                $confirmedCountBefore++;
            }
        }

        return $confirmedCountBefore + 1;
    }

    /**
     * Compute offense numbers for an entire collection of violations without N+1 queries.
     * Groups by franchise unit + violation type and traverses chronologically.
     *
     * @param \Illuminate\Support\Collection<int, Violation> $violations
     * @return array<int, int> Map of violation ID => offense number
     */
    public static function batchCalculateOffenseNumbers($violations): array
    {
        $grouped = $violations->groupBy(function ($v) {
            $unitKey = $v->franchise_scheme_id ? "fs_{$v->franchise_scheme_id}" : "tri_{$v->tricycle_id}";
            return "{$unitKey}_{$v->violation_type}";
        });

        $results = [];

        foreach ($grouped as $group) {
            // Sort ascending by detection time, then id
            $sorted = $group->sortBy(function ($v) {
                $ts = $v->detected_at ? $v->detected_at->timestamp : 0;
                return sprintf('%012d_%010d', $ts, $v->id);
            });

            $confirmedCount = 0;
            foreach ($sorted as $v) {
                $results[$v->id] = $confirmedCount + 1;

                if (self::isQualifyingConfirmed($v)) {
                    $confirmedCount++;
                }
            }
        }

        return $results;
    }

    /**
     * Ordinance penalty details by offense number:
     * - 1st offense: ₱500 fine
     * - 2nd offense: ₱1,000 fine
     * - 3rd offense: ₱2,500 fine + tricycle impoundment + franchise suspension
     * - 4th offense: Franchise cancellation (Revoked) - No fine amount invented
     */
    public static function getPenaltyDetails(int $offenseNumber): array
    {
        $ordinal = self::ordinal($offenseNumber);
        $offenseLabel = "{$ordinal} Offense";

        return match ($offenseNumber) {
            1 => [
                'offense_number'       => 1,
                'offense_label'        => $offenseLabel,
                'fine_amount'          => 500.00,
                'penalty_text'         => '₱500',
                'penalty_display'      => '1st Offense · ₱500',
                'action_required'      => false,
                'requires_impoundment' => false,
                'requires_suspension'  => false,
                'requires_revocation'  => false,
                'sanctions_summary'    => '₱500 fine',
            ],
            2 => [
                'offense_number'       => 2,
                'offense_label'        => $offenseLabel,
                'fine_amount'          => 1000.00,
                'penalty_text'         => '₱1,000',
                'penalty_display'      => '2nd Offense · ₱1,000',
                'action_required'      => false,
                'requires_impoundment' => false,
                'requires_suspension'  => false,
                'requires_revocation'  => false,
                'sanctions_summary'    => '₱1,000 fine',
            ],
            3 => [
                'offense_number'       => 3,
                'offense_label'        => $offenseLabel,
                'fine_amount'          => 2500.00,
                'penalty_text'         => '₱2,500',
                'penalty_display'      => '3rd Offense · ₱2,500',
                'action_required'      => true,
                'requires_impoundment' => true,
                'requires_suspension'  => true,
                'requires_revocation'  => false,
                'sanctions_summary'    => '₱2,500 fine + Tricycle Impoundment + Franchise Suspension',
            ],
            default => [
                'offense_number'       => $offenseNumber,
                'offense_label'        => $offenseLabel,
                'fine_amount'          => null, // Deliberately null: no fine amount invented for 4th offense
                'penalty_text'         => 'Franchise Cancellation',
                'penalty_display'      => "{$ordinal} Offense · Franchise Cancellation",
                'action_required'      => true,
                'requires_impoundment' => false,
                'requires_suspension'  => false,
                'requires_revocation'  => true,
                'sanctions_summary'    => 'Franchise Cancellation (Revoked)',
            ],
        };
    }

    /**
     * Resolve enforcement indicator state:
     * - Offenses 1 & 2: 'no_action_required' ('No Action Required')
     * - Offenses 3 & 4 (pending confirmation): 'action_required' ('Action Required')
     * - Confirmed & completed enforcement: 'completed' ('Action Completed')
     * - Awaiting appeal review: 'pending_confirmation' ('Pending Confirmation')
     * - Dismissed / appeal approved: 'no_action_required' ('No Action Required')
     */
    public static function resolveEnforcementState(Violation $violation, int $offenseNumber): array
    {
        // 1. Awaiting appeal review
        if ($violation->status === 'contested' || ($violation->appeal && $violation->appeal->status === 'under_review')) {
            return [
                'status' => 'pending_confirmation',
                'label'  => 'Pending Confirmation',
                'badge'  => 'amber',
            ];
        }

        // 2. Dismissed or exonerated by approved appeal
        if ($violation->status === 'dismissed' || ($violation->appeal && $violation->appeal->status === 'approved')) {
            return [
                'status' => 'no_action_required',
                'label'  => 'No Action Required',
                'badge'  => 'slate',
            ];
        }

        // 3. Completed enforcement
        if ($violation->enforcement && $violation->enforcement->status === 'completed') {
            return [
                'status' => 'completed',
                'label'  => 'Action Completed',
                'badge'  => 'emerald',
            ];
        }

        // 4. Offenses 1 & 2
        if ($offenseNumber < 3) {
            return [
                'status' => 'no_action_required',
                'label'  => 'No Action Required',
                'badge'  => 'slate',
            ];
        }

        // 5. Offenses 3 & 4+ pending enforcement
        return [
            'status' => 'action_required',
            'label'  => 'Action Required',
            'badge'  => 'rose',
        ];
    }

    /**
     * Convert integer to ordinal string (1st, 2nd, 3rd, 4th, etc.).
     */
    public static function ordinal(int $number): string
    {
        $ends = ['th','st','nd','rd','th','th','th','th','th','th'];
        if ((($number % 100) >= 11) && (($number % 100) <= 13)) {
            return $number . 'th';
        }
        return $number . $ends[$number % 10];
    }
}
