<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * A franchise-workflow event for a portal's staff (stored with Laravel's database channel and shown
 * in the header notification bell). `portal` scopes it to the TMO or BPLO panel; `url` is the
 * existing page/record that needs attention.
 */
class WorkflowNotification extends Notification
{
    public function __construct(
        public string $portal,
        public string $event,
        public string $title,
        public string $message,
        public string $url,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'portal'  => $this->portal,
            'event'   => $this->event,
            'title'   => $this->title,
            'message' => $this->message,
            'url'     => $this->url,
        ];
    }
}
