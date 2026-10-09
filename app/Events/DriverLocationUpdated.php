<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DriverLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $bookingId,
        public int $driverId,
        public int $tricycleId,
        public float $latitude,
        public float $longitude,
        public ?int $headingDeg,
        public string $recordedAt
    ) {
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('booking.' . $this->bookingId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'DriverLocationUpdated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'booking_id'  => $this->bookingId,
            'driver_id'   => $this->driverId,
            'tricycle_id' => $this->tricycleId,
            'latitude'    => $this->latitude,
            'longitude'   => $this->longitude,
            'heading_deg' => $this->headingDeg,
            'recorded_at' => $this->recordedAt,
        ];
    }
}
