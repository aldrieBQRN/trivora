<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Email to the designated TMO mailbox (VIOLATION_TMO_EMAIL) for a newly recorded color-coding
 * violation. Sent by App\Services\ViolationNotifier, which also builds $details.
 */
class ColorCodingViolationTmoAlert extends Notification
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
        $plate = $this->details['plate_number'] ? ' · ' . $this->details['plate_number'] : '';

        return (new MailMessage)
            ->subject(self::singleLine("[TMO] New color-coding violation – {$this->details['tmo_reference']}{$plate}"))
            ->view(
                ['html' => 'emails.violations.tmo', 'text' => 'emails.violations.tmo-text'],
                ['details' => $this->details]
            );
    }

    private static function singleLine(string $value): string
    {
        return trim(preg_replace('/[\r\n\t]+/', ' ', $value));
    }
}
