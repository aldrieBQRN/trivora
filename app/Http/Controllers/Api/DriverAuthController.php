<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DriverAuthController extends Controller
{
    /**
     * Resolves a franchise number to its FranchiseScheme -> Tricycle -> Operator chain and runs
     * every independent eligibility check both verifyEligibility() and register() must agree on:
     * the franchise must exist, be linked to a real tricycle/operator, be active and unexpired,
     * not already be claimed by another account, and (when a DOB is supplied) match the
     * authoritative operator record. `franchise_schemes.franchise_number` is the sole credential
     * used to look this up — never a plate number, which only ever comes back as *output* of a
     * successful resolution here, never as input.
     *
     * Returns ['error' => JsonResponse] on the first failed check, or ['franchiseScheme'=>,
     * 'tricycle'=>, 'operator'=>] on success. $email (register() only) preserves the existing
     * "same email = resuming your own registration, not a conflict" exception; verifyEligibility()
     * has no email at that step and always treats an already-claimed franchise as a conflict.
     */
    private function resolveAndValidateFranchise(
        string $franchiseNumber,
        ?string $submittedDob,
        bool $requireDob = false,
        ?string $email = null
    ): array {
        $franchiseScheme = FranchiseScheme::where('franchise_number', $franchiseNumber)->first();

        if (!$franchiseScheme) {
            return ['error' => response()->json([
                'success' => false,
                'message' => "No franchise record found for franchise permit number '{$franchiseNumber}'. Registration requires a valid MTOP franchise issued at the Municipal Hall.",
                'code'    => 'INVALID_FRANCHISE_PERMIT',
            ], 404)];
        }

        $tricycle = $franchiseScheme->tricycle;
        $operator = $tricycle?->operator;

        if (!$tricycle || !$operator) {
            return ['error' => response()->json([
                'success' => false,
                'message' => 'This franchise record is not linked to a valid tricycle and operator on file.',
                'code'    => 'NO_FRANCHISED_TRICYCLE',
            ], 422)];
        }

        if (!$franchiseScheme->is_active) {
            return ['error' => response()->json([
                'success' => false,
                'message' => "Franchise permit '{$franchiseNumber}' is not an approved/active franchise.",
                'code'    => 'FRANCHISE_NOT_APPROVED',
            ], 403)];
        }

        if ($franchiseScheme->is_expired) {
            return ['error' => response()->json([
                'success' => false,
                'message' => "Franchise permit '{$franchiseNumber}' has expired. Please renew at the Nasugbu BPLO.",
                'code'    => 'FRANCHISE_EXPIRED',
            ], 403)];
        }

        if (
            $operator->user_id && $operator->user && $operator->user->is_active
            && (!$email || $operator->user->email !== $email)
        ) {
            return ['error' => response()->json([
                'success' => false,
                'message' => 'An active driver account has already been registered for this franchise. Please login instead.',
                'code'    => 'ACCOUNT_ALREADY_EXISTS',
            ], 409)];
        }

        // Verify the submitted date of birth against the authoritative operator record on file.
        // Only enforced when a DOB is actually supplied (or required by the caller), so a caller
        // that omits it entirely (existing verify-eligibility behavior) is unaffected.
        if ($requireDob || ($submittedDob !== null && $submittedDob !== '')) {
            $submittedDate = new \DateTime((string) $submittedDob);
            if (!$operator->date_of_birth->isSameDay($submittedDate)) {
                return ['error' => response()->json([
                    'success' => false,
                    'message' => 'The date of birth does not match our franchise records for this permit.',
                    'code'    => 'DOB_MISMATCH',
                ], 422)];
            }
        }

        return ['franchiseScheme' => $franchiseScheme, 'tricycle' => $tricycle, 'operator' => $operator];
    }

    /**
     * Step 1: Verify Driver Franchise Eligibility
     * The authoritative franchise credential is franchise_schemes.franchise_number — never a
     * plate number, which is only ever returned here as the resolved tricycle's real identity.
     */
    public function verifyEligibility(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'franchise_number' => 'required|string',
            'date_of_birth'    => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $franchiseNo = strtoupper(trim($request->franchise_number));

        $result = $this->resolveAndValidateFranchise($franchiseNo, $request->date_of_birth);
        if (isset($result['error'])) {
            return $result['error'];
        }

        /** @var FranchiseScheme $franchiseScheme */
        $franchiseScheme = $result['franchiseScheme'];
        /** @var Tricycle $tricycle */
        $tricycle = $result['tricycle'];
        /** @var Operator $operator */
        $operator = $result['operator'];

        // Generate temporary verification token — bound to this exact franchise + operator, not
        // trusted as an opaque client value (register() recomputes and checks it independently).
        $verificationToken = sha1($operator->id . '|' . $franchiseScheme->franchise_number . '|' . config('app.key'));

        return response()->json([
            'success'            => true,
            'message'            => 'Franchise eligibility verified successfully.',
            'eligible'           => true,
            'verification_token' => $verificationToken,
            // Echoed from the resolved DB record, not merely the request input, so the UI can
            // display the authoritative permit number distinctly from what the driver typed.
            'franchise_number'   => $franchiseScheme->franchise_number,
            'operator'           => [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'Unassigned',
                'barangay'       => $operator->barangay,
            ],
            'tricycle' => [
                'id'           => $tricycle->id,
                'plate_number' => $tricycle->plate_number,
                'body_number'  => $tricycle->body_number ?: $tricycle->coding_scheme_number,
                'status'       => $tricycle->status,
                'make_model'   => "{$tricycle->make} {$tricycle->model}",
                'toda_zone'    => $tricycle->todaZone ? $tricycle->todaZone->name : null,
            ],
        ], 200);
    }

    /**
     * Step 2: Register Verified Driver Account
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'               => 'nullable|string|max:150',
            'full_name'          => 'nullable|string|max:150',
            'email'              => 'required|email|unique:users,email',
            'password'           => 'required|string|min:6',
            'mobile_number'      => 'nullable|string',
            'contact_number'     => 'nullable|string',
            'franchise_number'   => 'required|string',
            'date_of_birth'      => 'required|date',
            'verification_token' => 'required|string',
            // GPS telematics tracking method — reuses the exact enum values already established
            // by Tricycle.active_tracking_mode / DriverTelematicsController::setTrackingMode,
            // rather than inventing a new one.
            'tracking_mode'      => 'required|in:mobile_app,iot_device',
            'iot_device_id'      => 'nullable|string|max:50',
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
        $franchiseNo = strtoupper(trim($request->franchise_number));
        $trackingMode = $request->tracking_mode;

        return DB::transaction(function () use ($request, $driverName, $email, $franchiseNo, $trackingMode) {
            // Independently resolve and re-verify the franchise from scratch — never trust that
            // the client already passed this at the eligibility-check step. Not yet locked: this
            // is a cheap pre-check so a request that's going to fail validation anyway never
            // needs to acquire the operator row lock at all.
            $result = $this->resolveAndValidateFranchise($franchiseNo, $request->date_of_birth, requireDob: true, email: $email);
            if (isset($result['error'])) {
                return $result['error'];
            }

            /** @var FranchiseScheme $franchiseScheme */
            $franchiseScheme = $result['franchiseScheme'];
            /** @var Tricycle $tricycle */
            $tricycle = $result['tricycle'];
            /** @var Operator $unlockedOperator */
            $unlockedOperator = $result['operator'];

            // Lock the operator row for the duration of the actual write so two concurrent
            // registration attempts for the same franchise can't both pass the "not already
            // claimed" check before either commits (classic TOCTOU race).
            $operator = Operator::where('id', $unlockedOperator->id)->lockForUpdate()->first();

            if ($operator->user_id && $operator->user && $operator->user->is_active && $operator->user->email !== $email) {
                return response()->json([
                    'success' => false,
                    'message' => 'An active driver account has already been registered for this franchise. Please login instead.',
                    'code'    => 'ACCOUNT_ALREADY_EXISTS',
                ], 409);
            }

            // The verification token is recomputed server-side from the resolved franchise +
            // operator, not trusted as an opaque client-supplied value — this proves the request
            // actually went through the eligibility check for THIS franchise rather than being
            // forged/guessed.
            $expectedToken = sha1($operator->id . '|' . $franchiseScheme->franchise_number . '|' . config('app.key'));
            if (!hash_equals($expectedToken, (string) $request->verification_token)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Franchise verification is invalid or out of date. Please verify your franchise eligibility again.',
                    'code'    => 'INVALID_VERIFICATION_TOKEN',
                ], 422);
            }

            // Defense-in-depth: the resolved unit must genuinely be owned by this operator, even
            // though it was already derived strictly from franchiseScheme->tricycle->operator.
            // A client-supplied plate/body number plays no role anywhere in this resolution, no
            // tricycle row is ever created, and only THIS operator's own unit is ever mutated —
            // so one operator's registration can never reassign or hijack another operator's unit.
            if ((int) $tricycle->operator_id !== (int) $operator->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Franchised tricycle ownership could not be verified.',
                    'code'    => 'TRICYCLE_OWNERSHIP_MISMATCH',
                ], 422);
            }

            $iotDeviceId = null;
            if ($trackingMode === 'iot_device') {
                $iotDeviceId = trim((string) $request->iot_device_id);
                if ($iotDeviceId === '') {
                    return response()->json([
                        'success' => false,
                        'message' => 'An IoT Hardware Device ID is required when IoT Hardware tracking is selected.',
                        'code'    => 'IOT_DEVICE_ID_REQUIRED',
                    ], 422);
                }
                $deviceTaken = Tricycle::where('iot_device_id', $iotDeviceId)
                    ->where('id', '!=', $tricycle->id)
                    ->exists();
                if ($deviceTaken) {
                    return response()->json([
                        'success' => false,
                        'message' => "IoT Hardware Device ID '{$iotDeviceId}' is already registered to another unit.",
                        'code'    => 'IOT_DEVICE_ID_TAKEN',
                    ], 422);
                }
            }

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

            $mobile = $request->mobile_number ?: ($request->contact_number ?: $operator->contact_number);

            // Persist the driver's chosen GPS tracking method on their own, already-verified
            // tricycle only — never a fake/default device id, and Mobile always clears any device
            // id so a stray value can't linger from a prior setup.
            $tricycle->update([
                'active_tracking_mode' => $trackingMode,
                'iot_device_id'        => $trackingMode === 'iot_device' ? $iotDeviceId : null,
                'tracking_capability'  => $trackingMode === 'iot_device' ? 'iot_enabled' : 'mobile_only',
            ]);

            $driver = Driver::where('user_id', $user->id)->first();
            if (!$driver) {
                $driver = Driver::create([
                    'user_id'        => $user->id,
                    'operator_id'    => $operator->id,
                    'tricycle_id'    => $tricycle->id,
                    'license_number' => $operator->license_number,
                    'mobile_number'  => $mobile,
                    'is_online'      => false,
                    'is_available'   => true,
                    'rating'         => 5.00,
                    'total_trips'    => 0,
                    'today_earnings' => 0.00,
                ]);
            }

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
                    'profile_photo_url' => $user->profile_photo_url,
                ],
                'driver'           => $driver,
                'franchise_number' => $franchiseScheme->franchise_number,
                'operator' => [
                    'id'             => $operator->id,
                    'full_name'      => $operator->full_name,
                    'license_number' => $operator->license_number,
                    'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'Unassigned',
                ],
                'tricycle' => [
                    'id'                   => $tricycle->id,
                    'body_number'          => $tricycle->body_number ?: $tricycle->coding_scheme_number,
                    'plate_number'         => $tricycle->plate_number,
                    'make_model'           => "{$tricycle->make} {$tricycle->model}",
                    'status'               => $tricycle->status,
                    'toda_zone'            => $tricycle->todaZone ? $tricycle->todaZone->name : null,
                    'active_tracking_mode' => $tricycle->active_tracking_mode,
                    'tracking_capability'  => $tricycle->tracking_capability,
                    'iot_device_id'        => $tricycle->iot_device_id,
                ],
            ], 201);
        });
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
        $driver = Driver::where('user_id', $user->id)->first();
        $operator = $user->operator ?: ($driver ? $driver->operator : null);
        // Must resolve strictly through the driver's own tricycle_id FK — never an independent
        // "first tricycle for this operator" lookup, which could return a different unit than
        // register()/`/driver/me` and disagree with what this same driver was just assigned.
        if ($driver) {
            $driver->load(['tricycle.franchiseScheme']);
        }
        $tricycle = $driver ? $driver->tricycle : null;

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
                'profile_photo_url' => $user->profile_photo_url,
            ],
            'driver'  => $driver,
            'operator' => $operator ? [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'toda_zone'      => $todaName,
            ] : null,
            'tricycle' => $tricycle ? [
                'id'                   => $tricycle->id,
                'coding_scheme_number' => $tricycle->coding_scheme_number ?: ($tricycle->body_number ?: '0142'),
                'body_number'          => $tricycle->body_number ?: ($tricycle->coding_scheme_number ?: '0142'),
                'plate_number'         => $tricycle->plate_number,
                'make_model'           => "{$tricycle->make} {$tricycle->model}",
                'status'               => $tricycle->status,
                'toda_zone'            => $todaName,
                'tracking_capability'  => $tricycle->tracking_capability ?: 'mobile_only',
                'active_tracking_mode' => $tricycle->active_tracking_mode ?: ($tricycle->tracking_capability === 'iot_enabled' ? 'iot_device' : 'mobile_app'),
                'iot_device_id'        => $tricycle->iot_device_id,
                'franchise_number'     => $tricycle->franchiseScheme?->franchise_number,
            ] : null,
        ], 200);
    }

    /**
     * Fetch Current Driver Profile & Telematics Status
     */
    public function me(Request $request)
    {
        $user = $request->user();
        $driver = Driver::where('user_id', $user->id)->first();
        $operator = $user->operator;
        // Must match login()/register() exactly: the driver's own tricycle_id FK, never an
        // unrelated "first tricycle belonging to this operator" lookup (see
        // resolveAndValidateFranchise for why the tricycle's own operator_id FK, not an
        // Application/"first tricycle" lookup, is the only safe ownership source of truth).
        if ($driver) {
            $driver->load(['tricycle.todaZone', 'tricycle.franchiseScheme']);
        }
        $tricycle = $driver ? $driver->tricycle : null;

        return response()->json([
            'success' => true,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
                'profile_photo_url' => $user->profile_photo_url,
            ],
            // Raw Driver model (id, rating, total_trips, mobile_number, today_earnings) — same
            // shape login()/register() already send, and required so a session restored from a
            // cold start (see mapAuthResponseToDriverProfile) carries the real drivers.id every
            // other driver-scoped endpoint (getActiveBooking, updateStatus, telematics, ...)
            // is keyed on, not the unrelated users.id.
            'driver'  => $driver,
            'operator' => $operator ? [
                'id'             => $operator->id,
                'full_name'      => $operator->full_name,
                'license_number' => $operator->license_number,
                'contact_number' => $operator->contact_number,
                'barangay'       => $operator->barangay,
                'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'N/A',
            ] : null,
            'tricycle' => $tricycle ? [
                'id'                   => $tricycle->id,
                'body_number'          => $tricycle->body_number ?: 'Pending',
                'coding_scheme_number' => $tricycle->coding_scheme_number ?: ($tricycle->body_number ?: 'Pending'),
                'plate_number'         => $tricycle->plate_number,
                'make_model'           => "{$tricycle->make} {$tricycle->model}",
                'status'               => $tricycle->status,
                'toda_name'            => $tricycle->todaZone ? $tricycle->todaZone->name : 'Unassigned',
                'active_tracking_mode' => $tricycle->active_tracking_mode ?: ($tricycle->tracking_capability === 'iot_enabled' ? 'iot_device' : 'mobile_app'),
                'tracking_capability'  => $tricycle->tracking_capability ?: 'mobile_only',
                'iot_device_id'        => $tricycle->iot_device_id,
                'franchise_number'     => $tricycle->franchiseScheme?->franchise_number,
            ] : null,
        ], 200);
    }

    /**
     * Update Driver Online / Availability Status
     * Called when the driver toggles the Online/Offline switch in the mobile app.
     * Backend dispatch (getPendingRequests) only routes bookings to drivers with is_online = true.
     */
    public function updateStatus(Request $request)
    {
        $validated = $request->validate([
            'is_online'    => 'required|boolean',
            'is_available' => 'nullable|boolean',
        ]);

        $driver = \App\Models\Driver::where('user_id', $request->user()->id)->first();

        if (!$driver) {
            return response()->json([
                'success' => false,
                'message' => 'Driver record not found for this account.',
            ], 404);
        }

        $updateData = ['is_online' => $validated['is_online']];

        if (array_key_exists('is_available', $validated) && $validated['is_available'] !== null) {
            $updateData['is_available'] = $validated['is_available'];
        } elseif (!$validated['is_online']) {
            // Going offline always implies unavailable for new dispatch.
            $updateData['is_available'] = false;
        }

        $driver->update($updateData);

        return response()->json([
            'success'      => true,
            'is_online'    => $driver->is_online,
            'is_available' => $driver->is_available,
        ]);
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
