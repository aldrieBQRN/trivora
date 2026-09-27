<?php

namespace App\Services;

use App\Models\Application;
use App\Models\User;
use App\Models\Violation;
use App\Notifications\WorkflowNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Sends real franchise-workflow events to the staff portal that must act next (header
 * notification bell). Called from the controller actions that perform the transition — never
 * from model events, so seeders and data fixes never generate notifications.
 *
 * Recipients are every active user of that portal's role, except the person who performed the
 * action. A notification failure never breaks the workflow action itself.
 */
class StaffNotifier
{
    /** Portal key => the one role that portal's notifications go to. */
    public const PORTAL_ROLES = [
        'tmo'  => 'tmo_personnel',
        'bplo' => 'bplo_staff',
    ];

    /** The portal a user's notifications belong to (null = no portal notifications). */
    public static function portalFor(?User $user): ?string
    {
        if (!$user) {
            return null;
        }
        $portal = array_search($user->role, self::PORTAL_ROLES, true);

        return $portal === false ? null : $portal;
    }

    /**
     * An application moved to a new status. Only statuses where a staff portal must act next
     * produce a notification; the rest (rejected, failed inspection, completed, …) wait on the
     * driver or end the workflow.
     */
    public static function applicationStatusChanged(Application $application, ?string $fromStatus, string $toStatus, ?int $actorId = null): void
    {
        $application->loadMissing('tricycle');
        $ref = $application->reference_number ?: ('Application #' . $application->id);
        $plate = $application->tricycle?->plate_number;
        $unit = $plate ? " · {$plate}" : '';
        $kind = $application->application_type === 'renewal' ? 'renewal' : 'new unit';

        [$portal, $event, $title, $message, $url] = match ($toStatus) {
            'pending_review' => $fromStatus === 'rejected'
                ? ['tmo', 'application_resubmitted', 'Resubmitted documents need re-review',
                    "{$ref}{$unit} — the driver re-uploaded the rejected requirements.",
                    route('tmo.review.docs', $application->id, false)]
                : ['tmo', 'application_submitted', 'New application for Document Review',
                    "{$ref}{$unit} — {$kind} application submitted.",
                    route('tmo.review.docs', $application->id, false)],
            'pending_inspection' => $fromStatus === 'failed_inspection'
                ? ['tmo', 'reinspection_requested', 'Reinspection requested',
                    "{$ref}{$unit} — the driver fixed the failed items and is ready for reinspection.",
                    route('tmo.review.physical', $application->id, false)]
                : ['tmo', 'inspection_pending', 'Vehicle inspection pending',
                    "{$ref}{$unit} — documents approved; ready for physical inspection.",
                    route('tmo.review.physical', $application->id, false)],
            'pending_bplo_release' => ['bplo', 'release_pending', 'Ready for sticker & plate release',
                "{$ref}{$unit} — passed physical inspection; awaiting BPLO release.",
                route('bplo.issue', $application->id, false)],
            'awaiting_tmo_confirmation' => ['tmo', 'final_confirmation_pending', 'Final Confirmation & GPS setup pending',
                "{$ref}{$unit} — released by BPLO; confirm and set up GPS tracking.",
                route('tmo.final-confirmation.show', $application->id, false)],
            default => [null, null, null, null, null],
        };

        if ($portal) {
            self::send($portal, $event, $title, $message, $url, $actorId);
        }
    }

    /** A driver submitted an appeal against a violation — TMO reviews appeals. */
    public static function violationAppealSubmitted(Violation $violation, ?int $actorId = null): void
    {
        $violation->loadMissing('tricycle');
        $plate = $violation->tricycle?->plate_number;
        self::send(
            'tmo',
            'violation_appeal_submitted',
            'New violation appeal',
            'Violation #' . $violation->id . ($plate ? " · {$plate}" : '') . ' — the driver submitted an appeal for review.',
            route('tmo.violations.details', $violation->id, false),
            $actorId,
        );
    }

    private static function send(string $portal, string $event, string $title, string $message, string $url, ?int $actorId): void
    {
        try {
            $recipients = User::where('role', self::PORTAL_ROLES[$portal])
                ->where('is_active', true)
                ->when($actorId, fn ($q) => $q->where('id', '!=', $actorId))
                ->get();

            if ($recipients->isNotEmpty()) {
                Notification::send($recipients, new WorkflowNotification($portal, $event, $title, $message, $url));
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
