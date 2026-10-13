<?php

namespace App\Http\Controllers;

use App\Notifications\PublicInquiryNotice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * JSON endpoint behind the landing page "Send a Direct Inquiry" form. Emails the inquiry to the
 * TMO mailbox (VIOLATION_TMO_EMAIL). Validation errors come back as 422 with a `message`.
 */
class PublicInquiryController extends Controller
{
    private const SUBJECTS = [
        'General Inquiry',
        'Application Follow-up',
        'Inspection Inquiry',
        'Coding Violation',
        'Lost Item / Complaint',
    ];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|string|email|max:255',
            'subject' => 'required|string|in:' . implode(',', self::SUBJECTS),
            'message' => 'required|string|max:3000',
        ]);

        $recipient = config('violations.tmo_email');
        if (! $recipient) {
            Log::warning('Public inquiry received but VIOLATION_TMO_EMAIL is not configured.');

            return response()->json(['message' => 'Inquiries are not available right now. Please contact the TMO directly.'], 503);
        }

        try {
            Notification::route('mail', $recipient)->notify(new PublicInquiryNotice([
                'name' => trim($validated['name']),
                'email' => strtolower(trim($validated['email'])),
                'subject' => $validated['subject'],
                'message' => trim($validated['message']),
            ]));
        } catch (\Throwable $e) {
            Log::error('Public inquiry email could not be sent.', [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'We could not send your inquiry right now. Please try again later.'], 503);
        }

        return response()->json(['message' => 'Your inquiry has been sent.']);
    }
}
