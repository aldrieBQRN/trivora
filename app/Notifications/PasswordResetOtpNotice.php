<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emails the 6-digit password reset code. Sent synchronously by App\Services\PasswordResetOtp
 * so a mail failure can be reported back to the person straight away.
 */
class PasswordResetOtpNotice extends Notification
{
    public function __construct(public string $code, public int $expiresMinutes)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = [
            'name' => $notifiable->name,
            'code' => $this->code,
            'expiresMinutes' => $this->expiresMinutes,
        ];

        return (new MailMessage)
            ->subject("Your Trivora password reset code: {$this->code}")
            ->view(['html' => 'emails.password-otp', 'text' => 'emails.password-otp-text'], $data);
    }
}
