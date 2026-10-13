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
            ->greeting('New public inquiry')
            ->line('**Name:** ' . $this->inquiry['name'])
            ->line('**Email:** ' . $this->inquiry['email'])
            ->line('**Subject:** ' . $this->inquiry['subject'])
            ->line('**Message:**')
            ->line($this->inquiry['message'])
            ->salutation('Reply to this email to respond to the sender.');
    }

    private static function singleLine(string $value): string
    {
        return trim(preg_replace('/[\r\n\t]+/', ' ', $value));
    }
}
