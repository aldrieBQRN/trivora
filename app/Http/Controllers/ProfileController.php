<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Staff accounts keep their own mobile number / address on the user record. A driver's mobile
     * number lives on their operator profile (it is their Driver App login), so it is not edited
     * here.
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
                'registration'      => $operator ? [
                    'birthday'       => $operator->date_of_birth?->format('M d, Y'),
                    'contact_number' => $operator->contact_number,
                ] : null,
            ],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $data = $request->validated();
        if (!in_array($request->user()->role, self::STAFF_ROLES, true)) {
            unset($data['contact_number'], $data['address'], $data['birthday']);
        }

        $request->user()->fill($data);

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
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
