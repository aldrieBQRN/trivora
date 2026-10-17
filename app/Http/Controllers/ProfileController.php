<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Staff accounts keep their own mobile number / address on the user record (maintained through
     * each office's Staff Management). A driver's details live on their operator profile from
     * franchise registration. Account Settings only displays them — the password is the one thing
     * a user changes here (Auth\PasswordController).
     */
    public const STAFF_ROLES = ['tmo_personnel', 'bplo_staff', 'municipal_treasurer', 'admin'];

    public const ROLE_LABELS = [
        'tmo_personnel'       => 'TMO Personnel',
        'bplo_staff'          => 'BPLO Staff',
        'municipal_treasurer' => 'Municipal Treasurer',
        'admin'               => 'Administrator',
        'tricycle_driver'     => 'Tricycle Driver / Operator',
        'passenger'           => 'Passenger',
    ];

    /**
     * Display the signed-in user's Account Settings (always their own record).
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        // A driver's personal details (birthday, mobile number = Driver App login) were entered at
        // franchise registration and live on their operator record — shown read-only here.
        $operator = $user->role === 'tricycle_driver'
            ? \App\Models\Operator::where('user_id', $user->id)->first()
            : null;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'account' => [
                'name'              => $user->name,
                'email'             => $user->email,
                'role'              => $user->role,
                'role_label'        => self::ROLE_LABELS[$user->role] ?? ucwords(str_replace('_', ' ', (string) $user->role)),
                'is_staff'          => in_array($user->role, self::STAFF_ROLES, true),
                'contact_number'    => $user->contact_number,
                'birthday'          => $user->birthday?->format('Y-m-d'),
                'address'           => $user->address,
                'employee_id'       => $user->employee_id,
                'position'          => $user->position,
                'is_active'         => (bool) $user->is_active,
                'email_verified_at' => $user->email_verified_at?->format('M d, Y'),
                'member_since'      => $user->created_at?->format('M d, Y'),
                'profile_photo_url' => $user->profile_photo_url,
                'registration'      => $operator ? [
                    'birthday'       => $operator->date_of_birth?->format('M d, Y'),
                    'contact_number' => $operator->contact_number,
                    'barangay'       => $operator->barangay,
                ] : null,
            ],
        ]);
    }

    /**
     * Upload or replace the signed-in user's own profile photo (the same users.profile_photo_path
     * the mobile apps use via Api\ProfilePhotoController). The only editable thing on the profile.
     */
    public function updatePhoto(Request $request): RedirectResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ], [
            'photo.max' => 'The photo must be 5 MB or smaller.',
        ]);

        $user = $request->user();
        $oldPath = $user->profile_photo_path;

        $user->update(['profile_photo_path' => \App\Services\SecureUpload::store($request->file('photo'), 'profile_photos', 'public', 'photo', 1024)['path']]);

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        AuditService::log(
            module: 'profile',
            action: 'profile.photo_updated',
            record: $user,
            description: "User {$user->name} updated their profile photo"
        );

        return Redirect::route('profile.edit')->with('status', 'photo-updated');
    }

    /**
     * Remove the signed-in user's profile photo (falls back to their initials).
     */
    public function destroyPhoto(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
            $user->update(['profile_photo_path' => null]);

            AuditService::log(
                module: 'profile',
                action: 'profile.photo_removed',
                record: $user,
                description: "User {$user->name} removed their profile photo"
            );
        }

        return Redirect::route('profile.edit')->with('status', 'photo-removed');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
