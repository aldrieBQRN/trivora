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
     * Register a new passenger.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'mobile_number' => 'required|string|max:20',
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
            ],
        ]);
    }

    /**
     * Get current authenticated passenger profile.
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
