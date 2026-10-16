<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Email to the TMO mailbox (VIOLATION_TMO_EMAIL) from the landing page
 * "Send a Direct Inquiry" form. Reply-To is the sender, so TMO can answer directly.
 */
class PublicInquiryNotice extends Notification
{
    /**
     * @param  array{name: string, email: string, subject: string, message: string}  $inquiry
     */
    public function __construct(public array $inquiry)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(self::singleLine("[Inquiry] {$this->inquiry['subject']} – {$this->inquiry['name']}"))
            ->replyTo($this->inquiry['email'], $this->inquiry['name'])
            ->view(
                ['html' => 'emails.public-inquiry', 'text' => 'emails.public-inquiry-text'],
                ['inquiry' => $this->inquiry]
            );
    }

    private static function singleLine(string $value): string
    {
        return trim(preg_replace('/[\r\n\t]+/', ' ', $value));
    }
}
