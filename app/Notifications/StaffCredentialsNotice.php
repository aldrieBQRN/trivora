<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/**
 * Emails a new TMO / BPLO staff member their sign-in email and server-generated temporary
 * password. Deliberately NOT ShouldQueue: queuing would serialize the plaintext password into
 * the jobs table. Sent only by App\Services\StaffCredentials.
 */
class StaffCredentialsNotice extends Notification
{
    public function __construct(
        #[\SensitiveParameter] private string $temporaryPassword,
        private Carbon $expiresAt,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = [
            'name' => $notifiable->name,
            'email' => $notifiable->email,
            'roleLabel' => match ($notifiable->role) {
                'tmo_personnel' => 'TMO Personnel',
                'bplo_staff' => 'BPLO Staff',
                default => 'Staff',
            },
            'temporaryPassword' => $this->temporaryPassword,
            'expiresAt' => $this->expiresAt->copy()->timezone(config('app.timezone'))->format('M d, Y g:i A'),
            'loginUrl' => route('login'),
        ];

        return (new MailMessage)
            ->subject('Your Trivora staff account')
            ->view(['html' => 'emails.staff-credentials', 'text' => 'emails.staff-credentials-text'], $data);
    }

    /**
     * Keep the plaintext out of var_dump/debug output of this object.
     */
    public function __debugInfo(): array
    {
        return ['expiresAt' => $this->expiresAt];
    }
}
