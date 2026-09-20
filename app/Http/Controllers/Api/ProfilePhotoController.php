<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Shared by both the Passenger and Driver mobile apps — a profile photo is a plain attribute of
 * the authenticated User account (see User::profile_photo_path), not something specific to
 * either role, so one controller serves both apps' /profile-photo routes rather than duplicating
 * this logic per app.
 */
class ProfilePhotoController extends Controller
{
    /**
     * Upload or replace the authenticated user's own profile photo. Always acts on
     * $request->user() — there is no way to target another account's photo.
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png,heic,webp|max:5120',
        ]);

        $user = $request->user();
        $oldPath = $user->profile_photo_path;

        $newPath = $request->file('photo')->store('profile_photos', 'public');
        $user->update(['profile_photo_path' => $newPath]);

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Profile photo updated.',
            'profile_photo_url' => $user->profile_photo_url,
        ]);
    }

    /**
     * Remove the authenticated user's profile photo, reverting the app to its default avatar.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
            $user->update(['profile_photo_path' => null]);
        }

        return response()->json([
            'message' => 'Profile photo removed.',
            'profile_photo_url' => null,
        ]);
    }
}
