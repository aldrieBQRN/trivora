<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DriverGcashQrController extends Controller
{
    /**
     * Show the authenticated driver's configured GCash QR code and details.
     */
    public function show(Request $request): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 403);
        }

        $hasQr = $driver->hasGcashConfigured();

        return response()->json([
            'configured' => $hasQr,
            'has_gcash_qr' => $hasQr,
            'gcash_qr_url' => $driver->gcash_qr_url,
            'gcash_name' => $driver->gcash_name,
            'gcash_number' => $driver->gcash_number,
            'driver' => [
                'configured' => $hasQr,
                'has_gcash_qr' => $hasQr,
                'gcash_qr_url' => $driver->gcash_qr_url,
                'gcash_name' => $driver->gcash_name,
                'gcash_number' => $driver->gcash_number,
            ],
        ]);
    }

    /**
     * Upload or replace the authenticated driver's own GCash QR code.
     */
    public function update(Request $request): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 403);
        }

        $validated = $request->validate([
            'qr_image' => 'required|image|mimes:jpg,jpeg,png,webp,heic|max:5120',
            'gcash_name' => 'nullable|string|max:150',
            'gcash_number' => 'nullable|string|max:20',
        ]);

        $oldPath = $driver->gcash_qr_path;
        $newPath = $request->file('qr_image')->store('driver_gcash_qrs', 'public');

        $driver->update([
            'gcash_qr_path' => $newPath,
            'gcash_name' => $validated['gcash_name'] ?? $driver->gcash_name,
            'gcash_number' => $validated['gcash_number'] ?? $driver->gcash_number,
        ]);

        if ($oldPath && $oldPath !== $newPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'event' => 'payment.driver_qr_uploaded',
            'auditable_type' => Driver::class,
            'auditable_id' => $driver->id,
            'old_values' => ['gcash_qr_path' => $oldPath],
            'new_values' => [
                'gcash_qr_path' => $newPath,
                'gcash_name' => $driver->gcash_name,
                'gcash_number' => $driver->gcash_number,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $hasQr = $driver->hasGcashConfigured();

        return response()->json([
            'message' => 'GCash QR code updated successfully.',
            'configured' => $hasQr,
            'has_gcash_qr' => $hasQr,
            'gcash_qr_url' => $driver->gcash_qr_url,
            'gcash_name' => $driver->gcash_name,
            'gcash_number' => $driver->gcash_number,
            'driver' => [
                'configured' => $hasQr,
                'has_gcash_qr' => $hasQr,
                'gcash_qr_url' => $driver->gcash_qr_url,
                'gcash_name' => $driver->gcash_name,
                'gcash_number' => $driver->gcash_number,
            ],
        ]);
    }

    /**
     * Remove the authenticated driver's GCash QR code, reverting their account to cash-only.
     */
    public function destroy(Request $request): JsonResponse
    {
        $driver = Driver::where('user_id', $request->user()->id)->first();

        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 403);
        }

        $oldPath = $driver->gcash_qr_path;

        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        $driver->update([
            'gcash_qr_path' => null,
            'gcash_name' => null,
            'gcash_number' => null,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'event' => 'payment.driver_qr_removed',
            'auditable_type' => Driver::class,
            'auditable_id' => $driver->id,
            'old_values' => ['gcash_qr_path' => $oldPath],
            'new_values' => ['gcash_qr_path' => null],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'GCash QR code removed. Cash-only mode active.',
            'configured' => false,
            'has_gcash_qr' => false,
            'gcash_qr_url' => null,
            'gcash_name' => null,
            'gcash_number' => null,
            'driver' => [
                'configured' => false,
                'has_gcash_qr' => false,
                'gcash_qr_url' => null,
                'gcash_name' => null,
                'gcash_number' => null,
            ],
        ]);
    }
}
