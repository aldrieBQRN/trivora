<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\FranchiseScheme;
use App\Models\Operator;
use App\Models\Tricycle;
use App\Models\User;
use App\Support\MobileNumber;
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
     * resolve to an actual person on file, and not already be claimed by a registered account.
     *
     * The WHOLE verification flow is the franchise permit number alone — no date of birth, no
     * name, nothing else is asked for or checked. verifyEligibility() returns the people
     * actually associated with that franchise (the Tricycle Owner always, plus the separate
     * application_drivers person when one is assigned) so the user picks which of them this
     * Driver App account belongs to; register() then validates that selection against exactly
     * this resolution — an account can only ever be linked to the ACTUAL owner/driver of the
     * franchise, never to an unrelated person, and never to a duplicate person record.
     *
     * `franchise_schemes.franchise_number` is the sole credential used to look this up — never
     * a plate number, which only ever comes back as *output* of a successful resolution here,
     * never as input.
     *
     * Returns ['error' => JsonResponse] on the first failed check, or
     * ['franchiseScheme' =>, 'tricycle' =>, 'operator' =>, 'person' =>, 'ownerIsDriver' =>]
     * on success.
     */
    private function resolveAndValidateFranchise(string $franchiseNumber): array {
        $franchiseScheme = FranchiseScheme::where('franchise_number', $franchiseNumber)->first();

        // Applicants copy the identifier they were shown. The registry used to print a
        // `PERMIT-2026-<unit>` display string (built from the unit's coding scheme number),
        // so a typed number in that shape still has to resolve rather than 404. The display
        // itself is gone — the registry now shows the real Franchise Number — but the shim
        // stays because drivers may still be holding a printed slip in the old format.
        // Resolve the suffix first as a franchise number, then as the unit's coding
        // scheme number. Everything downstream (token, response echo, register) still uses
        // the AUTHORITATIVE franchise_schemes.franchise_number, never the typed display format.
        if (!$franchiseScheme) {
            $suffix = preg_replace('/^PERMIT-\d{4}-/', '', $franchiseNumber);
            if ($suffix !== '' && $suffix !== $franchiseNumber) {
                $franchiseScheme = FranchiseScheme::where('franchise_number', $suffix)
                    ->orderByDesc('id')
                    ->first();
            }
            if (!$franchiseScheme && $suffix !== '') {
                $unit = Tricycle::where('coding_scheme_number', $suffix)
                    ->orderByDesc('id')
                    ->first();
                $franchiseScheme = $unit
                    ? FranchiseScheme::where('tricycle_id', $unit->id)->orderByDesc('id')->first()
                    : null;
            }
        }

        if (!$franchiseScheme) {
            // One of the two toast-ready outcomes the app shows verbatim on Verify Franchise:
            // anything that does not exist / is invalid / is not registered / cannot be found
            // in the franchise registry surfaces as this single message (the `code` still
            // distinguishes the precise reason for logs and non-UI clients).
            return ['error' => response()->json([
                'success' => false,
                'message' => 'Franchise not found.',
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
                'message' => 'Franchise not found.',
                'code'    => 'FRANCHISE_NOT_APPROVED',
            ], 403)];
        }

        if ($franchiseScheme->is_expired) {
            return ['error' => response()->json([
                'success' => false,
                'message' => 'Franchise not found.',
                'code'    => 'FRANCHISE_EXPIRED',
            ], 403)];
        }

        // Core rule: ONE franchise = ONE Driver App account. Checked HERE, inside the shared
        // resolver, so clicking Verify Franchise already decides the outcome — the
        // already-registered case never reaches the person-selection screen, and no second
        // account can ever be created for the franchise. Keyed on the FRANCHISE: a
        // `drivers` row bound to the franchise's own unit (tricycle_id), plus the unit's
        // operator (drivers.license_number is UNIQUE — at most one Driver row per operator,
        // so the two keys always agree in normal data). operators.user_id is deliberately
        // NOT used: public registration always sets it for owners who have never registered
        // a Driver App account. The same helper runs again inside register() after the row
        // lock, closing the check-then-act race window between the two calls.
        if ($this->franchiseAlreadyRegistered($tricycle, $operator)) {
            return ['error' => response()->json([
                'success' => false,
                'message' => 'Franchise already registered.',
                'code'    => 'ACCOUNT_ALREADY_EXISTS',
            ], 409)];
        }

        // The ACTUAL driver person for this franchise (owner, or the separate
        // application_drivers row). Missing only when the application says "separate
        // driver" but no person row exists — never invented, never fallen back to owner.
        $person = $franchiseScheme->driverPerson();
        $ownerIsDriver = $franchiseScheme->ownerIsDriver();

        if (!$person) {
            return ['error' => response()->json([
                'success' => false,
                'message' => 'This application has no separate tricycle driver person on file. Please ask the applicant to update their application at the Municipal Hall.',
                'code'    => 'DRIVER_NOT_ON_FILE',
            ], 422)];
        }

        return [
            'franchiseScheme' => $franchiseScheme,
            'tricycle'        => $tricycle,
            'operator'        => $operator,
            'person'          => $person,
            'ownerIsDriver'   => $ownerIsDriver,
        ];
    }

    /**
     * Does this franchise already have a Driver App account? One franchise = one account, so
     * this is THE uniqueness check — run at verify time (Verify Franchise click) and again
     * inside register() after the operator row lock.
     *
     * Keyed on the franchise itself: a `drivers` row bound to the franchise's own unit
     * (tricycle_id), plus that unit's operator (drivers.license_number is UNIQUE per
     * operator license, so at most one Driver row can ever exist for them — the two keys
     * agree in normal data, and holding both means neither a same-unit re-registration nor
     * a second attempt by the same owner can slip through). Never keyed on
     * operators.user_id, which public registration always sets for the owner.
     */
    private function franchiseAlreadyRegistered(Tricycle $tricycle, Operator $operator): bool
    {
        return Driver::where('tricycle_id', $tricycle->id)
            ->orWhere('operator_id', $operator->id)
            ->exists();
    }

    /**
     * The verified person's EXISTING personal information, read-only, for the registration
     * UI to display for confirmation — never re-collected and never a second person record.
     *
     * `date_of_birth` is the exact date-only Y-m-d value and `birthday` its display form —
     * both formatted straight from the model's `date` cast attribute, never round-tripped
     * through a UTC/timezone conversion that could shift the day by one (picking Sep 23 must
     * always show Sep 23).
     *
     * @param  Operator|\App\Models\ApplicationDriver  $person
     * @return array{first_name: ?string, last_name: ?string, full_name: ?string, birthday: ?string, date_of_birth: ?string, mobile_number: ?string, barangay: ?string}
     */
    private function personalInformationPayload($person): array
    {
        return [
            'first_name'    => $person->first_name,
            'last_name'     => $person->last_name,
            'full_name'     => $person->full_name,
            'birthday'      => $person->date_of_birth?->format('M d, Y'),
            'date_of_birth' => $person->date_of_birth?->format('Y-m-d'),
            'mobile_number' => $person->contact_number,
            'barangay'      => $person->barangay,
        ];
    }

    /**
     * One SELECTABLE person associated with the franchise — used by verify-eligibility's
     * `people` list so the app offers exactly the real Tricycle Owner (and the separate
     * assigned Tricycle Driver, when one exists) as the possible Driver App accounts. The
     * `type` key is what register() later validates the user's selection against, so an
     * account can never be created for someone unrelated to this franchise.
     *
     * @param  Operator|\App\Models\ApplicationDriver  $person
     */
    private function personPayload($person, string $type, string $role): array
    {
        return array_merge(
            ['type' => $type, 'role' => $role],
            $this->personalInformationPayload($person)
        );
    }

    /**
     * Step 1: Resolve the franchise and return the people actually associated with it.
     * Registration starts with exactly ONE field — the Franchise Permit No. — and on success
     * the response carries every registered person of that franchise (the Tricycle Owner,
     * plus the separate assigned Tricycle Driver when one exists) read-only, so the app
     * shows them for the user to CHOOSE which one this account belongs to instead of asking
     * anyone to re-enter or self-declare personal details. No name, email, mobile, or date
     * of birth is collected here.
     * The authoritative franchise credential is franchise_schemes.franchise_number — never a
     * plate number, which is only ever returned here as the resolved tricycle's real identity.
     */
    public function verifyEligibility(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'franchise_number' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $franchiseNo = strtoupper(trim($request->franchise_number));

        $result = $this->resolveAndValidateFranchise($franchiseNo);
        if (isset($result['error'])) {
            return $result['error'];
        }

        /** @var FranchiseScheme $franchiseScheme */
        $franchiseScheme = $result['franchiseScheme'];
        /** @var Tricycle $tricycle */
        $tricycle = $result['tricycle'];
        /** @var Operator $operator */
        $operator = $result['operator'];
        /** @var Operator|\App\Models\ApplicationDriver $driverPerson */
        $driverPerson = $result['person'];

        // The franchise's selectable people, in a stable order: the Tricycle Owner always,
        // then the separate assigned Tricycle Driver when the application has one. When the
        // owner IS the driver (or there is no linked application), driverPerson() resolves
        // to the owner themselves — a single entry labeled "Tricycle Owner & Driver", never
        // the same person listed twice. This list is the ONLY set register() will ever link
        // an account to.
        $people = [$this->personPayload(
            $operator,
            'owner',
            $result['ownerIsDriver'] ? 'Tricycle Owner & Driver' : 'Tricycle Owner'
        )];
        if (!$result['ownerIsDriver']) {
            $people[] = $this->personPayload($driverPerson, 'driver', 'Tricycle Driver');
        }

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
            // Whether the owner is also the driver (true) or this franchise has a separate
            // application_drivers person (false) — drives which people are listed for selection.
            'owner_is_driver'    => $result['ownerIsDriver'],
            // The same registry application the TMO Active Tricycle Registry details page
            // shows for this unit — never the franchise's stale linked application — so the
            // reference on the verification screen matches the registry record exactly.
            'application_reference' => $franchiseScheme->registryApplication()?->reference_number,
            // Read-only: the franchise's people from the approved franchise/application, for
            // the user to select which of them this account belongs to. No new
            // personal-information record is ever created from this endpoint.
            'people'             => $people,
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
                'coding_scheme_number' => $tricycle->coding_scheme_number,
                'body_number'          => $tricycle->coding_scheme_number, // legacy key — kept for shipped app builds
                'status'       => $tricycle->status,
                'make_model'   => "{$tricycle->make} {$tricycle->model}",
                'toda_zone'    => $tricycle->todaZone ? $tricycle->todaZone->name : null,
            ],
        ], 200);
    }

    /**
     * Step 2: Create/link the driver's login account to ONE of the franchise's EXISTING
     * people (the Tricycle Owner or the separate assigned Tricycle Driver) — the selection
     * the user made from verify-eligibility's `people` list. The selection is re-validated
     * server-side against the actual franchise record, never trusted from the client alone,
     * so an account can only ever belong to the real owner/driver of THIS franchise. Never
     * reads client-supplied personal information — name, birthday, mobile and barangay all
     * come from the franchise/application record, so no duplicate personal-information
     * record is ever created. Only verification fields plus a password are accepted.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'franchise_number'   => 'required|string',
            // Which of THIS franchise's people (verify-eligibility's `people` list) the
            // account is for — constrained to the only two roles that can ever exist, then
            // independently resolved against the franchise's actual records below.
            'person_type'        => 'required|string|in:owner,driver',
            'verification_token' => 'required|string',
            'password'           => 'required|string|min:6',
            'confirm_password'   => 'sometimes|nullable|string|same:password',
            // GPS telematics tracking method — optional; when absent the tricycle's existing
            // tracking fields are left untouched (settable later via POST /telemetry-mode).
            // Reuses the exact enum values already established by
            // Tricycle.active_tracking_mode / DriverTelematicsController::setTrackingMode.
            'tracking_mode'      => 'nullable|in:mobile_app,iot_device',
            'iot_device_id'      => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $franchiseNo = strtoupper(trim($request->franchise_number));
        $trackingMode = $request->tracking_mode;

        return DB::transaction(function () use ($request, $franchiseNo, $trackingMode) {
            // Independently resolve and re-verify the franchise from scratch — never trust that
            // the client already passed this at the eligibility-check step. Not yet locked: this
            // is a cheap pre-check so a request that's going to fail validation anyway never
            // needs to acquire the operator row lock at all.
            $result = $this->resolveAndValidateFranchise($franchiseNo);
            if (isset($result['error'])) {
                return $result['error'];
            }

            /** @var FranchiseScheme $franchiseScheme */
            $franchiseScheme = $result['franchiseScheme'];
            /** @var Tricycle $tricycle */
            $tricycle = $result['tricycle'];
            /** @var Operator $unlockedOperator */
            $unlockedOperator = $result['operator'];
            /** @var Operator|\App\Models\ApplicationDriver $driverPerson */
            $driverPerson = $result['person'];
            $ownerIsDriver = $result['ownerIsDriver'];

            // Lock the operator row for the duration of the actual write so two concurrent
            // registration attempts for the same franchise can't both pass the "not already
            // claimed" check before either commits (classic TOCTOU race).
            $operator = Operator::where('id', $unlockedOperator->id)->lockForUpdate()->first();

            // Re-check "already registered" AFTER taking the lock, so a racing request can't slip
            // a second driver account onto the same franchise. Same franchise-keyed helper as
            // the verify-time gate — the lock just closes the window between the two checks
            // (this is also the only place it can ever fire: a non-racing repeat is already
            // refused up front by resolveAndValidateFranchise, before person selection).
            if ($this->franchiseAlreadyRegistered($tricycle, $operator)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Franchise already registered.',
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

            // Resolve the SELECTED person against this franchise's actual records — the client
            // only ever names one of verify-eligibility's `people` roles, and this is where
            // that choice is bound to the real owner/driver so nobody can register as a person
            // unrelated to the franchise. A `driver` choice on an owner-is-driver franchise has
            // no separate person to select and is refused outright; a person's name, birthday,
            // or mobile plays no part in the resolution (they're never submitted at all).
            $selectedIsOwner = $request->person_type === 'owner';
            if (!$selectedIsOwner && $ownerIsDriver) {
                return response()->json([
                    'success' => false,
                    'message' => 'This franchise has no separate tricycle driver person on file. Please ask the applicant to update their application at the Municipal Hall.',
                    'code'    => 'DRIVER_NOT_ON_FILE',
                ], 422);
            }
            /** @var Operator|\App\Models\ApplicationDriver $person */
            $person = $selectedIsOwner ? $operator : $driverPerson;

            // Defense-in-depth: the resolved unit must genuinely be owned by this operator, even
            // though it was already derived strictly from franchiseScheme->tricycle->operator.
            // A client-supplied plate or Sticker Number plays no role anywhere in this resolution, no
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

            // ---- Account resolution: ONE source of truth = the selected person ----
            // The driver never supplies an email; users.email is NOT NULL UNIQUE, so a
            // deterministic system address is derived per franchise and looked up first
            // (a retry can't collide). Selecting the OWNER reuses the owner's existing login
            // instead of ever creating a duplicate user for the same person; selecting the
            // separate driver builds their own account and never touches the owner's.
            $user = null;
            if ($selectedIsOwner && $operator->user) {
                $user = $operator->user;
            } else {
                $email = 'driver.' . $franchiseScheme->id . '@trivora.test';
                $user = User::where('email', $email)->first() ?: User::create([
                    'name'      => $person->full_name,
                    'email'     => $email,
                    'password'  => Hash::make($request->password),
                    'role'      => 'tricycle_driver',
                    'is_active' => true,
                ]);
            }

            // The password the driver just typed is authoritative for their driver-app account
            // (whether the user row was reused or freshly created), and the display name is
            // always derived from the selected person — never from client-supplied input.
            $user->name = $person->full_name;
            $user->password = Hash::make($request->password);
            $user->save();

            // Link the operator to the account ONLY while unlinked and only when the OWNER is
            // the selected person (the owner's first driver-app registration) — never
            // overwrite an existing link, and never touch it for a separate driver, whose
            // account must not hijack the owner's login.
            if ($selectedIsOwner && !$operator->user_id) {
                $operator->user_id = $user->id;
                $operator->save();
            }

            // Persist the driver's chosen GPS tracking method on their own, already-verified
            // tricycle only — Mobile always clears any device id so a stray value can't linger
            // from a prior setup. Absent entirely: leave the tricycle's tracking untouched.
            if ($trackingMode !== null && $trackingMode !== '') {
                $tricycle->update([
                    'active_tracking_mode' => $trackingMode,
                    'iot_device_id'        => $trackingMode === 'iot_device' ? $iotDeviceId : null,
                    'tracking_capability'  => $trackingMode === 'iot_device' ? 'iot_enabled' : 'mobile_only',
                ]);
            }

            $driver = Driver::where('operator_id', $operator->id)->first();
            if (!$driver) {
                $driver = Driver::create([
                    'user_id'        => $user->id,
                    'operator_id'    => $operator->id,
                    'tricycle_id'    => $tricycle->id,
                    'license_number' => $operator->license_number,
                    'mobile_number'  => $person->contact_number,
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
                'owner_is_driver'  => $ownerIsDriver,
                // Which of the franchise's people this account was created for, plus that
                // person's same read-only payload verify-eligibility returned — the
                // confirmation step's data, echoed back so the UI never keeps its own copy.
                'person_type'      => $selectedIsOwner ? 'owner' : 'driver',
                'personal_information' => $this->personPayload(
                    $person,
                    $selectedIsOwner ? 'owner' : 'driver',
                    $selectedIsOwner
                        ? ($ownerIsDriver ? 'Tricycle Owner & Driver' : 'Tricycle Owner')
                        : 'Tricycle Driver'
                ),
                'operator' => [
                    'id'             => $operator->id,
                    'full_name'      => $operator->full_name,
                    'license_number' => $operator->license_number,
                    'toda_zone'      => $operator->todaZone ? $operator->todaZone->name : 'Unassigned',
                ],
                'tricycle' => [
                    'id'                   => $tricycle->id,
                    'coding_scheme_number' => $tricycle->coding_scheme_number,
                    'body_number'          => $tricycle->coding_scheme_number, // legacy key — kept for shipped app builds
                    'plate_number'         => $tricycle->plate_number,
                    'make_model'           => "{$tricycle->make} {$tricycle->model}",
                    'status'               => $tricycle->status,
                    'toda_zone'            => $tricycle->todaZone ? $tricycle->todaZone->name : null,
                    'active_tracking_mode' => $tricycle->active_tracking_mode,
                    'tracking_capability'  => $tricycle->tracking_capability,
                    'iot_device_id'        => $tricycle->iot_device_id,
                ],
                'franchise' => [
                    'status'             => $franchiseScheme->status,
                    'status_reason'      => $franchiseScheme->status_reason,
                    'status_changed_at'  => $franchiseScheme->status_changed_at,
                ],
            ], 201);
        });
    }

    /**
     * Driver Login Endpoint
     *
     * The user-facing credential is the driver's EXISTING mobile number + password — the
     * same mobile-number login the owner web portal uses. Email is no longer part of the
     * flow. Franchise permit number and operator license number remain accepted as
     * non-email fallbacks for existing clients.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login'    => 'required|string', // the account's mobile number (or franchise/license number)
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

        // Mobile number — the primary, user-facing login credential: the person's own
        // verified number already on file. Every stored source resolves to the account of
        // the person who actually drives this franchise: the registered Driver row's
        // mobile_number (copied from the verified person at registration), a staff/owner
        // account's users.contact_number, or the owner's operators.contact_number resolved
        // through its linked user. MobileNumber::variants covers the 09…/9…/+63…/63…
        // forms so any stored equivalent matches.
        if (MobileNumber::looksLikeMobile($login)) {
            $variants = MobileNumber::variants($login);
            $inClause = implode(',', array_fill(0, count($variants), '?'));

            $user = Driver::whereNotNull('mobile_number')
                ->whereRaw(MobileNumber::normalizedSql('mobile_number') . " IN ({$inClause})", $variants)
                ->first()?->user;

            if (!$user) {
                $user = User::whereNotNull('contact_number')
                    ->whereRaw(MobileNumber::normalizedSql('contact_number') . " IN ({$inClause})", $variants)
                    ->first();
            }

            if (!$user) {
                $mobileOperator = Operator::whereNotNull('contact_number')
                    ->whereRaw(MobileNumber::normalizedSql('contact_number') . " IN ({$inClause})", $variants)
                    ->first();

                $user = $mobileOperator?->user
                    ?? ($mobileOperator ? Driver::where('operator_id', $mobileOperator->id)->first()?->user : null);
            }
        }

        if (!$user) {
            // Franchise permit number — a non-email fallback identifier for the actual
            // driver of a franchise. Resolves strictly through the registered Driver row
            // for that franchise's tricycle, so an unregistered franchise (no Driver row
            // yet) can never log in.
            $franchiseScheme = FranchiseScheme::where('franchise_number', strtoupper($login))->first();
            if ($franchiseScheme) {
                $user = Driver::where('tricycle_id', $franchiseScheme->tricycle_id)->first()?->user;
            }
        }

        if (!$user) {
            // Operator license number → the owner-linked account, falling back to the
            // Driver row's account when operators.user_id was never linked (a separate
            // driver registration deliberately never overwrites the owner's link).
            $licensedOperator = Operator::where('license_number', strtoupper($login))->first();
            if ($licensedOperator) {
                $user = $licensedOperator->user
                    ?? Driver::where('operator_id', $licensedOperator->id)->first()?->user;
            }
        }

        // Email identifiers are intentionally NOT resolved — email is no longer part of
        // the login flow, so an email-shaped input simply fails to match any account above.

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

        // Operational authorization belongs to the driver's FRANCHISE, not their own account —
        // login is never blocked here even when that franchise is suspended or revoked. The
        // driver can always authenticate to see their own account and franchise status; the
        // franchise.operational middleware is the sole gate on the endpoints that actually let a
        // driver drive (go Online, accept bookings, transmit GPS).
        $driverAccount = Driver::where('user_id', $user->id)->first();

        $token = $user->createToken('trivora-driver-mobile-app')->plainTextToken;
        $driver = $driverAccount;
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
                'coding_scheme_number' => $tricycle->coding_scheme_number ?: 'Pending',
                'body_number'          => $tricycle->coding_scheme_number ?: 'Pending', // legacy key
                'plate_number'         => $tricycle->plate_number,
                'make_model'           => "{$tricycle->make} {$tricycle->model}",
                'status'               => $tricycle->status,
                'toda_zone'            => $todaName,
                'tracking_capability'  => $tricycle->tracking_capability ?: 'mobile_only',
                'active_tracking_mode' => $tricycle->active_tracking_mode ?: ($tricycle->tracking_capability === 'iot_enabled' ? 'iot_device' : 'mobile_app'),
                'iot_device_id'        => $tricycle->iot_device_id,
                'franchise_number'     => $tricycle->franchiseScheme?->franchise_number,
            ] : null,
            // Operational authorization status — the app shows a "Franchise Suspended"/"Franchise
            // Revoked" indicator from this, never from anything on the driver's own account.
            'franchise' => $tricycle?->franchiseScheme ? [
                'status'             => $tricycle->franchiseScheme->status,
                'status_reason'      => $tricycle->franchiseScheme->status_reason,
                'status_changed_at'  => $tricycle->franchiseScheme->status_changed_at,
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
        // Same fallback login() uses: the operator linked to this user, else the operator
        // behind this account's Driver row (a separate driver's own user row is never linked
        // onto operators.user_id, so that link only exists for owner-is-driver accounts).
        $operator = $user->operator ?: ($driver ? $driver->operator : null);
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
            // cold start carries the real drivers.id every other driver-scoped endpoint
            // (getActiveBooking, updateStatus, telematics, ...) is keyed on, not the
            // unrelated users.id.
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
                'body_number'          => $tricycle->coding_scheme_number ?: 'Pending', // legacy key
                'coding_scheme_number' => $tricycle->coding_scheme_number ?: 'Pending',
                'plate_number'         => $tricycle->plate_number,
                'make_model'           => "{$tricycle->make} {$tricycle->model}",
                'status'               => $tricycle->status,
                'toda_name'            => $tricycle->todaZone ? $tricycle->todaZone->name : 'Unassigned',
                'active_tracking_mode' => $tricycle->active_tracking_mode ?: ($tricycle->tracking_capability === 'iot_enabled' ? 'iot_device' : 'mobile_app'),
                'tracking_capability'  => $tricycle->tracking_capability ?: 'mobile_only',
                'iot_device_id'        => $tricycle->iot_device_id,
                'franchise_number'     => $tricycle->franchiseScheme?->franchise_number,
            ] : null,
            'franchise' => $tricycle?->franchiseScheme ? [
                'status'             => $tricycle->franchiseScheme->status,
                'status_reason'      => $tricycle->franchiseScheme->status_reason,
                'status_changed_at'  => $tricycle->franchiseScheme->status_changed_at,
            ] : null,
        ], 200);
    }

    /**
     * Update Driver Online / Availability Status
     * Called when the driver toggles the Online/Offline switch in the mobile app.
     * Backend dispatch (getPendingRequests) only routes bookings to drivers with is_online = true.
     *
     * Also owns the `online_since` session boundary that the coding/restricted-day 100-meter
     * movement rule anchors on (TelemetryService::hasConfirmedMovementSinceOnline()): going online
     * starts a fresh session (a new movement anchor is established from the first GPS ping
     * received after this moment), and going offline always ends it.
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

        if ($validated['is_online']) {
            // Only stamp a NEW session start when actually transitioning from offline (or no
            // session was ever recorded) — a redundant "still online" call must never reset an
            // in-progress movement anchor.
            if (!$driver->is_online || !$driver->online_since) {
                $updateData['online_since'] = now();
            }
        } else {
            // Going offline always clears/ends the current movement-tracking session.
            $updateData['online_since'] = null;
        }

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
