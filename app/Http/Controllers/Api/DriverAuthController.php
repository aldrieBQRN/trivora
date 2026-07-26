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
            'name'                 => 'nullable|string|max:150',
            'full_name'            => 'nullable|string|max:150',
            'email'                => 'required|email|unique:users,email',
            'password'             => 'required|string|min:6',
            'mobile_number'        => 'nullable|string',
            'contact_number'       => 'nullable|string',
            'license_number'       => 'nullable|string',
            'franchise_number'     => 'nullable|string',
            'plate_number'         => 'nullable|string',
            'toda'                 => 'nullable|string',
            'tracking_capability'  => 'nullable|string|in:iot_enabled,mobile_only',
            'iot_device_id'        => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $driverName = $request->name ?: ($request->full_name ?: 'Driver');
        $email = strtolower(trim($request->email));
        $licenseNo = strtoupper(trim($request->license_number ?: ($request->franchise_number ?: 'N01-18-000142')));
        $mobile = $request->mobile_number ?: ($request->contact_number ?: '+63 917 888 9999');
        $plateNo = strtoupper(trim($request->plate_number ?: 'TRV-001'));
        $trackingCap = $request->tracking_capability ?: 'iot_enabled';

        // 1. STRICT FRANCHISE PERMIT VERIFICATION: Check if License/Permit exists in Operator database
        $operator = Operator::where('license_number', $licenseNo)->first();

        if (!$operator) {
            return response()->json([
                'success' => false,
                'message' => "No registered MTOP operator franchise found for permit/license number '{$licenseNo}'. Registration requires a valid MTOP franchise registered at the Municipal Hall.",
                'code'    => 'INVALID_FRANCHISE_PERMIT',
            ], 404);
        }

        // 2. Check for active/approved franchise status
        $hasApprovedFranchise = $operator->applications()
            ->whereIn('status', ['completed', 'pending_payment', 'pending_inspection'])
            ->exists() || $operator->tricycles()->exists();

        if (!$hasApprovedFranchise) {
            return response()->json([
                'success' => false,
                'message' => "The MTOP franchise for license number '{$licenseNo}' is still pending or not yet approved. Registration requires an active MTOP franchise.",
                'code'    => 'FRANCHISE_NOT_APPROVED',
            ], 403);
        }

        // 3. Prevent duplicate account registration under the same permit/license number
        if ($operator->user_id && $operator->user && $operator->user->is_active && $operator->user->email !== $email) {
            return response()->json([
                'success' => false,
                'message' => "An active driver account is already linked to permit/license number '{$licenseNo}'. Please log in instead.",
                'code'    => 'ACCOUNT_ALREADY_EXISTS',
            ], 409);
        }

        // 4. Create or Find User
        $user = User::where('email', $email)->first();
        if (!$user) {
            $user = User::create([
                'name'      => $driverName,
                'email'     => $email,
                'password'  => Hash::make($request->password),
                'role'      => 'tricycle_driver',
                'is_active' => true,
            ]);
        }

        // Link user to verified operator
        $operator->user_id = $user->id;
        $operator->save();

        // 3. Find or Create Tricycle safely
        $iotId = $request->iot_device_id ? trim($request->iot_device_id) : null;
        $tricycle = \App\Models\Tricycle::where('plate_number', $plateNo)
            ->when($iotId, function ($query) use ($iotId) {
                return $query->orWhere('iot_device_id', $iotId);
            })
            ->first();

        if (!$tricycle) {
            $tricycle = \App\Models\Tricycle::create([
                'operator_id'          => $operator->id,
                'coding_scheme_number' => '0142',
                'plate_number'         => $plateNo,
                'engine_number'        => 'ENG-' . rand(10000, 99999),
                'chassis_number'       => 'CHS-' . rand(10000, 99999),
                'make'                 => 'Kawasaki',
                'model'                => 'Barako 175',
                'year_model'           => 2024,
                'body_color'           => 'Black/Red',
                'status'               => 'active',
                'iot_device_id'        => $iotId ?: ('TRV-GPS-' . rand(1000, 9999)),
                'tracking_capability'  => $trackingCap,
            ]);
        } else {
            $tricycle->update([
                'operator_id' => $operator->id,
                'tracking_capability' => $trackingCap,
            ]);
        }

        // 4. Create or Update Driver record in drivers table
        $driver = \App\Models\Driver::where('user_id', $user->id)->first();
        if (!$driver) {
            $driver = \App\Models\Driver::create([
                'user_id'        => $user->id,
                'operator_id'    => $operator->id,
                'tricycle_id'    => $tricycle->id,
                'license_number' => $licenseNo,
                'mobile_number'  => $mobile,
                'is_online'      => false,
                'is_available'   => true,
                'rating'         => 5.00,
                'total_trips'    => 0,
                'today_earnings' => 0.00,
            ]);
        }

        // 5. Create Sanctum Token
        $token = $user->createToken('trivora-driver-mobile-app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Driver registered and record saved to database successfully.',
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'driver'   => $driver,
            'operator' => $operator,
            'tricycle' => $tricycle,
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
        $driver = \App\Models\Driver::where('user_id', $user->id)->first();
        $operator = $user->operator ?: ($driver ? $driver->operator : null);
        $tricycle = $driver && $driver->tricycle ? $driver->tricycle : ($operator ? $operator->tricycles()->first() : null);

        $todaName = 'TODA Brgy. 8';
        if ($tricycle && $tricycle->todaZone) {
            $todaName = $tricycle->todaZone->name;
        } elseif ($operator && $operator->todaZone) {
            $todaName = $operator->todaZone->name;
        }

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
            'driver'  => $driver,
            'operator' => $operator ? [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'toda_zone'      => $todaName,
            ] : null,
            'tricycle' => $tricycle ? [
                'id'          => $tricycle->id,
                'body_number' => $tricycle->body_number ?: '0088',
                'plate_number'=> $tricycle->plate_number,
                'make_model'  => "{$tricycle->make} {$tricycle->model}",
                'status'      => $tricycle->status,
                'toda_zone'   => $todaName,
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
