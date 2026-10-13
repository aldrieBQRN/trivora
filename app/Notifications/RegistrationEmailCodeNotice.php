<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emails the 6-digit code that verifies an email before an account is created (public MTOP
 * registration, passenger app sign-up). Sent synchronously by
 * App\Services\RegistrationEmailVerification (to an on-demand address, since no account exists
 * yet) so a failure is reported immediately.
 */
class RegistrationEmailCodeNotice extends Notification
{
    public function __construct(public string $code, public int $expiresMinutes, public string $context = 'for your Trivora account.')
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = ['code' => $this->code, 'expiresMinutes' => $this->expiresMinutes, 'context' => $this->context];

        return (new MailMessage)
            ->subject("Your Trivora verification code: {$this->code}")
            ->view(['html' => 'emails.registration-code', 'text' => 'emails.registration-code-text'], $data);
    }
}
