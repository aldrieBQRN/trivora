<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Email to the driver's own registered account address for a newly recorded color-coding
 * violation. Sent by App\Services\ViolationNotifier, which also builds $details. Uses the
 * driver-facing CITE- reference, the same one the driver app shows.
 */
class ColorCodingViolationDriverNotice extends Notification
{
    /**
     * @param  array<string, mixed>  $details
     */
    public function __construct(public array $details)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $plate = $this->details['plate_number'] ? " (Plate {$this->details['plate_number']})" : '';

        return (new MailMessage)
            ->subject(self::singleLine("Color-coding violation recorded – {$this->details['driver_reference']}{$plate}"))
            ->view(
                ['html' => 'emails.violations.driver', 'text' => 'emails.violations.driver-text'],
                ['details' => $this->details]
            );
    }

    private static function singleLine(string $value): string
    {
        return trim(preg_replace('/[\r\n\t]+/', ' ', $value));
    }
}
