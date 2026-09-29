<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * A QR Ride business-rule rejection. Rendered by Laravel as `{ message, code }` with the given
 * HTTP status, so the QR controllers stay thin and the mobile apps can branch on `code`.
 */
class QrRideException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 409,
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->errorCode,
        ], $this->status);
    }
}
