<?php

namespace App\Services;

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\FareConfiguration;
use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationAppeal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    /**
     * Record an intentional, business-level audit log entry for a Web action.
     *
     * @param string $module Domain module (e.g., 'document_review', 'franchise', 'fare')
     * @param string $action Canonical action key (e.g., 'document.approved', 'fare.updated')
     * @param Model|null $record The target Eloquent model
     * @param string $description Clear human-readable description
     * @param array|null $oldValues Meaningful state before the action
     * @param array|null $newValues Meaningful state after the action
     * @param string|null $targetReference Human-facing identifier (overrides automatic resolution)
     * @param array|null $metadata Auxiliary context (rejection notes, export filters, etc.)
     * @param User|null $actor Override actor when acting on behalf of or newly created user
     * @return AuditLog|null
     */
    public static function log(
        string $module,
        string $action,
        ?Model $record = null,
        string $description = '',
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $targetReference = null,
        ?array $metadata = null,
        ?User $actor = null
    ): ?AuditLog {
        $request = request();

        // 1. Web-Only Guard: do not audit mobile API routes
        if ($request && $request->is('api/*')) {
            return null;
        }

        $user = $actor ?? Auth::user();

        // 2. Resolve actor attributes
        $actorId = $user?->id;
        $actorName = $user?->name ?? 'Guest / Public User';
        $actorRole = $user?->role ?? 'guest';

        // 3. Resolve target reference
        $resolvedRef = $targetReference ?? self::resolveTargetReference($record);

        // 4. Scrub and sanitize values
        $sanitizedOld = self::sanitizeValues($oldValues);
        $sanitizedNew = self::sanitizeValues($newValues);

        $targetType = $record ? get_class($record) : null;
        $targetId = $record ? $record->getKey() : null;

        return AuditLog::create([
            'user_id'          => $actorId,
            'actor_name'       => $actorName,
            'actor_role'       => $actorRole,
            'module'           => $module,
            'action'           => $action,
            'event'            => $action,
            'auditable_type'   => $targetType,
            'auditable_id'     => $targetId,
            'target_type'      => $targetType,
            'target_id'        => $targetId,
            'target_reference' => $resolvedRef,
            'description'      => $description,
            'channel'          => 'web',
            'old_values'       => $sanitizedOld,
            'new_values'       => $sanitizedNew,
            'metadata'         => $metadata,
            'ip_address'       => $request ? $request->ip() : null,
            'user_agent'       => $request ? substr((string) $request->userAgent(), 0, 500) : null,
            'created_at'       => now(),
        ]);
    }

    /**
     * Resolve actual project-compliant target reference for Trivora domain models.
     */
    public static function resolveTargetReference(?Model $record): ?string
    {
        if (! $record) {
            return null;
        }

        if ($record instanceof Application) {
            return $record->reference_number ?: ('APP-#' . $record->id);
        }

        if ($record instanceof Tricycle) {
            if (! empty($record->plate_number)) {
                return $record->plate_number;
            }
            if (! empty($record->coding_scheme_number)) {
                return 'Sticker #' . $record->coding_scheme_number;
            }
            return 'TRV-' . str_pad($record->id, 3, '0', STR_PAD_LEFT);
        }

        if ($record instanceof FranchiseScheme) {
            if (! empty($record->sticker_number)) {
                return $record->sticker_number; // STK-YYYY-NNNN
            }
            if (! empty($record->franchise_number)) {
                return 'Franchise #' . $record->franchise_number;
            }
            return 'FS-#' . $record->id;
        }

        if ($record instanceof Violation) {
            return 'VIO-26-' . str_pad($record->id, 4, '0', STR_PAD_LEFT);
        }

        if ($record instanceof ViolationAppeal) {
            return 'APL-#' . $record->id;
        }

        if ($record instanceof User) {
            return $record->employee_id ?: $record->email;
        }

        if ($record instanceof FareConfiguration) {
            return 'Fare Configuration #' . $record->id;
        }

        if (isset($record->reference_number)) {
            return (string) $record->reference_number;
        }

        if (isset($record->plate_number)) {
            return (string) $record->plate_number;
        }

        return '#' . $record->getKey();
    }

    /**
     * Scrub passwords, tokens, and truncate huge payloads.
     */
    public static function sanitizeValues(?array $values): ?array
    {
        if (! $values) {
            return null;
        }

        $scrubKeys = [
            'password',
            'password_confirmation',
            'remember_token',
            'token',
            'pin',
            'auth_token',
            'secret',
            'two_factor_secret',
            'two_factor_recovery_codes',
        ];

        $sanitized = [];

        foreach ($values as $key => $val) {
            if (in_array(strtolower((string) $key), $scrubKeys, true)) {
                continue;
            }

            if (is_array($val)) {
                $sanitized[$key] = self::sanitizeValues($val);
            } elseif (is_string($val) && strlen($val) > 500) {
                // Truncate excessively long values (e.g. base64 or giant text)
                $sanitized[$key] = substr($val, 0, 500) . '... [truncated]';
            } else {
                $sanitized[$key] = $val;
            }
        }

        return $sanitized;
    }
}
