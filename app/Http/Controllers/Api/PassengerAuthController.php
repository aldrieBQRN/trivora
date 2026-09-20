<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Passenger;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PassengerAuthController extends Controller
{
    /**
     * Current Terms of Service / Privacy Policy revision — bumped whenever their content
     * changes, so accepted_at + this version together record exactly what a passenger agreed to.
     */
    private const TERMS_VERSION = '2026.09';

    /**
     * Register a new passenger.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'mobile_number' => 'required|string|max:20|unique:passengers,mobile_number',
            // `accepted` requires true/1/"yes"/"on" — an omitted, false, or unchecked value fails
            // validation outright, so registration cannot proceed without real, explicit consent.
            'terms_accepted' => 'required|accepted',
            'privacy_policy_accepted' => 'required|accepted',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'role' => 'passenger',
            'is_active' => true,
        ]);

        $passenger = Passenger::create([
            'user_id' => $user->id,
            'mobile_number' => $validated['mobile_number'],
            'rating' => 5.00,
            'total_rides' => 0,
            'terms_accepted' => true,
            'privacy_policy_accepted' => true,
            'consent_accepted_at' => now(),
            'terms_version' => self::TERMS_VERSION,
        ]);

        $token = $user->createToken('passenger_auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Passenger registered successfully.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'passenger_id' => $passenger->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $passenger->mobile_number,
                'rating' => $passenger->rating,
                'emergency_contact' => $passenger->emergency_contact,
                'profile_photo_url' => $user->profile_photo_url,
                'member_since' => $user->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Login passenger with email or mobile number.
     */
    public function login(Request $request): JsonResponse
    {
        $loginInput = $request->input('login') ?: $request->input('email');
        $password = $request->input('password');

        if (!$loginInput || !$password) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide email and password.',
            ], 422);
        }

        $user = User::where('email', strtolower(trim($loginInput)))
            ->orWhere('name', trim($loginInput))
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password credentials.',
            ], 401);
        }

        $passenger = Passenger::where('user_id', $user->id)->first();
        if (!$passenger) {
            $passenger = Passenger::create([
                'user_id' => $user->id,
                'mobile_number' => '+63 900 000 0000',
                'rating' => 5.00,
            ]);
        }

        $token = $user->createToken('passenger_auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Logged in successfully.',
            'token'   => $token,
            'user' => [
                'id' => $user->id,
                'passenger_id' => $passenger->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $passenger->mobile_number,
                'rating' => $passenger->rating,
                'total_rides' => $passenger->total_rides,
                'emergency_contact' => $passenger->emergency_contact,
                'profile_photo_url' => $user->profile_photo_url,
                'member_since' => $user->created_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get current authenticated passenger profile.
     *
     * Queried fresh from the DB on every call (no caching) — this is the trustworthy refetch
     * source the passenger app calls again after a booking reaches a final state, or whenever the
     * Profile screen becomes active, instead of trusting a stale value cached at login.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $passenger = Passenger::where('user_id', $user->id)->first();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'passenger_id' => $passenger ? $passenger->id : null,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $passenger ? $passenger->mobile_number : null,
                'rating' => $passenger ? $passenger->rating : 5.0,
                'total_rides' => $passenger ? $passenger->total_rides : 0,
                'emergency_contact' => $passenger ? $passenger->emergency_contact : null,
                'profile_photo_url' => $user->profile_photo_url,
                'member_since' => $user->created_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Update the authenticated passenger's Emergency Contact.
     *
     * Scoped to just this field — it's the only profile value EditProfileModal collects that had
     * no backend persistence at all (name/email/mobile continue to update local app state only,
     * unchanged, since that wasn't the reported bug). Stored as the single existing
     * `passengers.emergency_contact` varchar column (already used by UsersSeeder in the
     * "Name (Phone)" convention followed here) rather than adding new columns — one column stays
     * the one source of truth; the frontend only splits it into name/phone for display/editing.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'emergency_contact_name' => 'nullable|string|max:80',
            'emergency_contact_phone' => 'nullable|string|max:20',
        ]);

        $passenger = Passenger::where('user_id', $request->user()->id)->first();

        if (! $passenger) {
            return response()->json(['message' => 'No passenger profile found for this account.'], 403);
        }

        $name = trim((string) ($validated['emergency_contact_name'] ?? ''));
        $phone = trim((string) ($validated['emergency_contact_phone'] ?? ''));

        $emergencyContact = match (true) {
            $name !== '' && $phone !== '' => "{$name} ({$phone})",
            $name !== '' => $name,
            $phone !== '' => $phone,
            default => null,
        };

        $passenger->update(['emergency_contact' => $emergencyContact]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'emergency_contact' => $passenger->emergency_contact,
            ],
        ]);
    }

    /**
     * Logout passenger.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
