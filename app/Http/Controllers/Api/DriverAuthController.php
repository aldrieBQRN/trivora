<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Operator;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DriverAuthController extends Controller
{
    /**
     * Step 1: Verify Driver Franchise Eligibility
     * Checks if the LTO License exists in the Operator table and has an active franchise.
     */
    public function verifyEligibility(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'license_number' => 'required|string',
            'date_of_birth'  => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $licenseNo = strtoupper(trim($request->license_number));

        // Find operator by license number
        $operator = Operator::where('license_number', $licenseNo)->first();

        if (!$operator) {
            return response()->json([
                'success' => false,
                'message' => 'No registered operator record found under this driver license number. Please register for an MTOP franchise first at the Municipal Hall.',
            ], 404);
        }

        // Check if user account is already claimed
        if ($operator->user_id && $operator->user && $operator->user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'An active driver account has already been registered for this license number. Please login instead.',
                'code'    => 'ACCOUNT_ALREADY_EXISTS',
            ], 409);
        }

        // Check for active/approved franchise application or registered tricycle unit
        $hasApprovedFranchise = $operator->applications()
            ->whereIn('status', ['completed', 'pending_payment', 'pending_inspection'])
            ->exists() || $operator->tricycles()->exists();

        if (!$hasApprovedFranchise) {
            return response()->json([
                'success' => false,
                'message' => 'Your franchise application is still pending or not yet submitted. Verification requires a valid MTOP franchise.',
                'code'    => 'FRANCHISE_NOT_APPROVED',
            ], 403);
        }

        // Generate temporary verification token
        $verificationToken = sha1($operator->id . '|' . $operator->license_number . '|' . config('app.key'));

        return response()->json([
            'success'            => true,
            'message'            => 'Franchise eligibility verified successfully.',
            'eligible'           => true,
            'verification_token' => $verificationToken,
            'operator'           => [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'Unassigned',
                'barangay'       => $operator->barangay,
            ],
        ], 200);
    }

    /**
     * Step 2: Register Verified Driver Account
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'license_number'     => 'required|string',
            'verification_token' => 'required|string',
            'email'              => 'required|email|unique:users,email',
            'password'           => 'required|string|min:8|confirmed',
            'contact_number'     => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $licenseNo = strtoupper(trim($request->license_number));
        $operator = Operator::where('license_number', $licenseNo)->first();

        if (!$operator) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid operator record.',
            ], 404);
        }

        // Verify token match
        $expectedToken = sha1($operator->id . '|' . $operator->license_number . '|' . config('app.key'));
        if ($request->verification_token !== $expectedToken) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification session.',
            ], 403);
        }

        if ($operator->user_id && $operator->user && $operator->user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Account already registered.',
            ], 409);
        }

        // Create system user account
        $user = User::create([
            'name'     => $operator->full_name,
            'email'    => strtolower(trim($request->email)),
            'password' => Hash::make($request->password),
            'role'     => 'tricycle_driver',
            'is_active'=> true,
        ]);

        // Link operator profile to user
        $operator->user_id = $user->id;
        if ($request->contact_number) {
            $operator->contact_number = $request->contact_number;
        }
        $operator->save();

        // Create Sanctum API token for mobile app
        $token = $user->createToken('trivora-driver-mobile-app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Driver account created successfully.',
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'operator' => [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'N/A',
            ],
        ], 201);
    }

    /**
     * Driver Login Endpoint
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login'    => 'required|string', // accepts email or license_number
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $login = trim($request->login);
        $user = null;

        if (filter_var($login, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', strtolower($login))->first();
        } else {
            // Find user by operator license number
            $operator = Operator::where('license_number', strtoupper($login))->first();
            if ($operator && $operator->user) {
                $user = $operator->user;
            }
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid login credentials.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Account is suspended or inactive.',
            ], 403);
        }

        if ($user->role !== 'tricycle_driver' && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Access restricted to driver accounts only.',
            ], 403);
        }

        $token = $user->createToken('trivora-driver-mobile-app')->plainTextToken;
        $operator = $user->operator;
        $tricycle = $operator ? $operator->tricycles()->first() : null;

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'operator' => $operator ? [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'N/A',
            ] : null,
            'tricycle' => $tricycle ? [
                'id'          => $tricycle->id,
                'body_number' => $tricycle->body_number ?: 'Pending',
                'plate_number'=> $tricycle->plate_number,
                'make_model'  => "{$tricycle->make} {$tricycle->model}",
                'status'      => $tricycle->status,
            ] : null,
        ], 200);
    }

    /**
     * Fetch Current Driver Profile & Telematics Status
     */
    public function me(Request $request)
    {
        $user = $request->user();
        $operator = $user->operator;
        $tricycle = $operator ? $operator->tricycles()->with(['todaZone', 'franchiseScheme'])->first() : null;

        return response()->json([
            'success' => true,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'operator' => $operator ? [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'contact_number' => $operator->contact_number,
                'barangay'       => $operator->barangay,
                'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'N/A',
            ] : null,
            'tricycle' => $tricycle ? [
                'id'          => $tricycle->id,
                'body_number' => $tricycle->body_number ?: 'Pending',
                'plate_number'=> $tricycle->plate_number,
                'make_model'  => "{$tricycle->make} {$tricycle->model}",
                'status'      => $tricycle->status,
                'toda_name'   => $tricycle->todaZone ? $tricycle->todaZone->name : 'Unassigned',
            ] : null,
        ], 200);
    }

    /**
     * Driver Logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ], 200);
    }
}
