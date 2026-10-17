<?php

namespace App\Http\Controllers;

use App\Models\ApplicationDocument;
use App\Models\ViolationAppeal;
use App\Services\SecureUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class SecureDocumentController extends Controller
{
    /**
     * Serve an application document to authorized users.
     *
     * Authorized:
     * - Admin, TMO Personnel, BPLO Staff
     * - The operator who submitted the application
     * - The driver assigned to the application or tricycle
     * - Valid temporary signed URL
     */
    public function showApplicationDocument(Request $request, int|string $id): Response
    {
        $document = ApplicationDocument::with(['application.operator', 'application.tricycle'])->findOrFail($id);

        if (! $this->isAuthorizedForApplicationDocument($request, $document)) {
            abort(Auth::check() ? 403 : 401, 'Unauthorized access to application document.');
        }

        return $this->serveFile($document->file_path, $document->file_name, $document->mime_type);
    }

    /**
     * Serve violation appeal evidence to authorized users.
     *
     * Authorized:
     * - Admin, TMO Personnel, BPLO Staff
     * - The driver who submitted the appeal
     * - The operator who owns the tricycle/driver
     * - Valid temporary signed URL
     */
    public function showViolationAppealEvidence(Request $request, int|string $id): Response
    {
        $appeal = ViolationAppeal::with(['driver.operator', 'violation'])->findOrFail($id);

        if (! $this->isAuthorizedForViolationAppeal($request, $appeal)) {
            abort(Auth::check() ? 403 : 401, 'Unauthorized access to violation appeal evidence.');
        }

        if (! $appeal->evidence_path) {
            abort(404, 'No evidence file associated with this appeal.');
        }

        return $this->serveFile($appeal->evidence_path, basename($appeal->evidence_path));
    }

    private function isAuthorizedForApplicationDocument(Request $request, ApplicationDocument $document): bool
    {
        if ($request->hasValidSignature()) {
            return true;
        }

        $user = $request->user();
        if (! $user) {
            return false;
        }

        // Administrative and Municipal Staff roles
        if (in_array($user->role, ['admin', 'tmo_personnel', 'bplo_staff'], true)) {
            return true;
        }

        $application = $document->application;
        if (! $application) {
            return false;
        }

        // Operator who owns the application
        if ($application->operator && (int) $application->operator->user_id === (int) $user->id) {
            return true;
        }

        // Driver assigned to the application's operator or tricycle
        if ($user->driver) {
            if ($application->operator_id && (int) $user->driver->operator_id === (int) $application->operator_id) {
                return true;
            }
            if ($application->tricycle_id && (int) $user->driver->tricycle_id === (int) $application->tricycle_id) {
                return true;
            }
        }

        return false;
    }

    private function isAuthorizedForViolationAppeal(Request $request, ViolationAppeal $appeal): bool
    {
        if ($request->hasValidSignature()) {
            return true;
        }

        $user = $request->user();
        if (! $user) {
            return false;
        }

        // Administrative and Municipal Staff roles
        if (in_array($user->role, ['admin', 'tmo_personnel', 'bplo_staff'], true)) {
            return true;
        }

        // Driver who submitted the appeal
        if ($appeal->driver && (int) $appeal->driver->user_id === (int) $user->id) {
            return true;
        }

        // Operator of the driver
        if ($appeal->driver && $appeal->driver->operator && (int) $appeal->driver->operator->user_id === (int) $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Resolve and safely stream/serve file preventing path traversal.
     */
    private function serveFile(string $filePath, ?string $downloadName = null, ?string $mimeType = null): Response
    {
        // Path traversal guard: reject any directory traversal tokens
        $normalized = str_replace('\\', '/', $filePath);
        if (str_contains($normalized, '..') || str_starts_with($normalized, '/')) {
            abort(400, 'Invalid file path.');
        }

        // Prefer private 'local' disk; fallback to 'public' for legacy pre-migration files
        $disk = null;
        if (Storage::disk('local')->exists($normalized)) {
            $disk = 'local';
        } elseif (Storage::disk('public')->exists($normalized)) {
            $disk = 'public';
        }

        if (! $disk) {
            abort(404, 'File not found in storage.');
        }

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
        ];

        // Only PDFs and images render inline. Anything else (e.g. an HTML file stored before
        // uploads were validated) is forced to download as opaque bytes, so it can never run
        // in a staff member's session.
        $mimeType ??= Storage::disk($disk)->mimeType($normalized) ?: null;
        if (in_array($mimeType, SecureUpload::SAFE_INLINE_MIMES, true)) {
            $headers['Content-Type'] = $mimeType;

            return Storage::disk($disk)->response($normalized, $downloadName, $headers);
        }

        $headers['Content-Type'] = 'application/octet-stream';

        return Storage::disk($disk)->download($normalized, $downloadName, $headers);
    }
}
