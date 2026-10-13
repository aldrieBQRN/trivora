<?php

namespace App\Http\Controllers\BPLO;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use App\Services\StaffCredentials;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class BPLOUserController extends Controller
{
    /**
     * Display a listing of BPLO staff accounts.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $status = $request->input('status'); // all | active | inactive

        $query = User::where('role', 'bplo_staff')
            ->when($search, function ($q, $term) {
                $q->where(function ($sub) use ($term) {
                    $sub->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%");
                });
            })
            ->when($status === 'active', function ($q) {
                $q->where('is_active', true);
            })
            ->when($status === 'inactive', function ($q) {
                $q->where('is_active', false);
            })
            ->orderBy('created_at', 'desc');

        $users = $query->get()->map(function ($u) {
            return [
                'id'                 => $u->id,
                'name'               => $u->name,
                'email'              => $u->email,
                'role'               => $u->role,
                'role_label'         => 'BPLO Staff',
                'employee_id'        => $u->employee_id,
                'position'           => $u->position,
                'birthday'           => $u->birthday?->format('Y-m-d'),
                'birthday_label'     => $u->birthday?->format('M d, Y'),
                'contact_number'     => $u->contact_number,
                'address'            => $u->address,
                'is_active'          => (bool)$u->is_active,
                // not_sent | pending | expired while a temporary password is outstanding, else null
                'credentials_status' => StaffCredentials::status($u),
                'profile_photo_url'  => $u->profile_photo_url,
                'is_current_user'    => Auth::id() === $u->id,
                'created_at'         => $u->created_at ? $u->created_at->format('M d, Y') : 'N/A',
                'created_ago'        => $u->created_at ? $u->created_at->diffForHumans() : 'N/A',
            ];
        });

        $totalCount    = User::where('role', 'bplo_staff')->count();
        $activeCount   = User::where('role', 'bplo_staff')->where('is_active', true)->count();
        $inactiveCount = User::where('role', 'bplo_staff')->where('is_active', false)->count();
        $newThisMonth  = User::where('role', 'bplo_staff')
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        return Inertia::render('BPLODashboard/StaffManagement', [
            'users'         => $users,
            'searchTerm'    => $search ?: '',
            'statusFilter'  => $status ?: 'all',
            'stats'         => [
                'total'         => $totalCount,
                'active'        => $activeCount,
                'inactive'      => $inactiveCount,
                'new_this_month'=> $newThisMonth,
            ],
            'currentUserId' => Auth::id(),
        ]);
    }

    /**
     * Store a newly created BPLO staff account.
     */
    public function store(Request $request, StaffCredentials $credentials): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'email'          => 'required|string|email|max:255|unique:users,email',
            'is_active'      => 'boolean',
            'position'       => 'nullable|string|max:100',
            'birthday'       => 'nullable|date|before:today|after:1900-01-01',
            'contact_number' => 'nullable|string|max:30',
            'address'        => 'nullable|string|max:255',
        ]);

        // All-or-nothing: if anything fails before the credentials are issued (e.g. a database
        // error), no half-created account is left behind. A failed EMAIL is not an exception —
        // issue() reports it, the account is kept, and the admin is told to resend.
        [$user, $emailed, $employeeId] = DB::transaction(function () use ($validated, $credentials) {
            // The admin never chooses the password: the account starts with an unusable random hash,
            // then StaffCredentials replaces it with an emailed temporary password (see below).
            $user = User::create([
                'name'           => trim($validated['name']),
                'email'          => strtolower(trim($validated['email'])),
                'password'       => Hash::make(Str::random(64)),
                'role'           => 'bplo_staff',
                'is_active'      => $validated['is_active'] ?? true,
                'position'       => $validated['position'] ?? null,
                'birthday'       => $validated['birthday'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
                'address'        => $validated['address'] ?? null,
            ]);

            // Employee ID is system-generated from the account's own auto-increment id,
            // so it's guaranteed unique and never editable by the form.
            $employeeId = 'BPLO-' . str_pad($user->id, 4, '0', STR_PAD_LEFT);
            $user->update(['employee_id' => $employeeId]);

            $emailed = $credentials->issue($user);

            return [$user, $emailed, $employeeId];
        });

        AuditService::log(
            module: 'user_management',
            action: 'bplo_staff.created',
            record: $user,
            description: "Created BPLO staff account for {$user->name} ({$employeeId})",
            oldValues: null,
            newValues: [
                'name'        => $user->name,
                'email'       => $user->email,
                'role'        => $user->role,
                'employee_id' => $employeeId,
                'position'    => $user->position,
                'is_active'   => (bool) $user->is_active,
                'credentials_emailed' => $emailed,
            ]
        );

        if (! $emailed) {
            return redirect()->route('bplo.users')->with('warning', "The account for {$user->name} was created, but the sign-in credentials email could not be sent. Check the mail settings, then use Resend Credentials.");
        }

        return redirect()->route('bplo.users')->with('success', "BPLO staff account for {$user->name} created. Sign-in credentials were emailed to {$user->email}.");
    }

    /**
     * Generate a NEW temporary password and email it again — for credentials that failed to
     * send or expired before first sign-in. Only for accounts that haven't set their own
     * password yet; anyone else recovers through Forgot Password.
     */
    public function resendCredentials(User $user, StaffCredentials $credentials): RedirectResponse
    {
        if ($user->role !== 'bplo_staff') {
            abort(403, 'Unauthorized.');
        }

        if (! $user->must_change_password) {
            return redirect()->route('bplo.users')->with('error', "{$user->name} has already set their own password. They can use Forgot Password on the sign-in page if needed.");
        }

        $emailed = $credentials->issue($user);

        AuditService::log(
            module: 'user_management',
            action: 'bplo_staff.credentials_resent',
            record: $user,
            description: "Reissued temporary sign-in credentials for BPLO staff account {$user->name} ({$user->employee_id})",
            oldValues: null,
            newValues: ['credentials_emailed' => $emailed]
        );

        if (! $emailed) {
            return redirect()->route('bplo.users')->with('warning', "A new temporary password was generated for {$user->name}, but the email could not be sent. Check the mail settings and try again.");
        }

        return redirect()->route('bplo.users')->with('success', "New sign-in credentials were emailed to {$user->email}.");
    }

    /**
     * Update the specified BPLO staff account.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        // Enforce departmental security
        if ($user->role !== 'bplo_staff') {
            abort(403, 'Unauthorized. BPLO can only manage BPLO staff accounts.');
        }

        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'email'          => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password'       => ['nullable', 'string', Password::defaults()],
            'is_active'      => 'boolean',
            'position'       => 'nullable|string|max:100',
            'birthday'       => 'nullable|date|before:today|after:1900-01-01',
            'contact_number' => 'nullable|string|max:30',
            'address'        => 'nullable|string|max:255',
        ]);

        $oldValues = [
            'name'           => $user->name,
            'email'          => $user->email,
            'position'       => $user->position,
            'birthday'       => $user->birthday?->format('Y-m-d'),
            'contact_number' => $user->contact_number,
            'address'        => $user->address,
            'is_active'      => (bool) $user->is_active,
        ];

        // employee_id is system-generated on creation and never editable here.
        $updateData = [
            'name'           => trim($validated['name']),
            'email'          => strtolower(trim($validated['email'])),
            'position'       => $validated['position'] ?? null,
            'birthday'       => $validated['birthday'] ?? null,
            'contact_number' => $validated['contact_number'] ?? null,
            'address'        => $validated['address'] ?? null,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        // Prevent self-deactivation
        if (Auth::id() === $user->id) {
            $updateData['is_active'] = true;
        } elseif (isset($validated['is_active'])) {
            $updateData['is_active'] = $validated['is_active'];
        }

        $user->update($updateData);

        AuditService::log(
            module: 'user_management',
            action: 'bplo_staff.updated',
            record: $user,
            description: "Updated BPLO staff account for {$user->name} ({$user->employee_id})",
            oldValues: $oldValues,
            newValues: [
                'name'           => $user->name,
                'email'          => $user->email,
                'position'       => $user->position,
                'birthday'       => $user->birthday?->format('Y-m-d'),
                'contact_number' => $user->contact_number,
                'address'        => $user->address,
                'is_active'      => (bool) $user->is_active,
            ]
        );

        return redirect()->route('bplo.users')->with('success', "Staff account for {$user->name} updated successfully.");
    }

    /**
     * Toggle active/inactive status for a BPLO staff member.
     */
    public function toggleStatus(User $user): RedirectResponse
    {
        if ($user->role !== 'bplo_staff') {
            abort(403, 'Unauthorized.');
        }

        if (Auth::id() === $user->id) {
            return redirect()->route('bplo.users')->with('error', 'You cannot deactivate your own logged-in account.');
        }

        $oldStatus = (bool) $user->is_active;
        $user->update(['is_active' => !$user->is_active]);

        $statusText = $user->is_active ? 'activated' : 'deactivated';

        AuditService::log(
            module: 'user_management',
            action: 'bplo_staff.status_toggled',
            record: $user,
            description: ucfirst($statusText) . " BPLO staff account for {$user->name} ({$user->employee_id})",
            oldValues: ['is_active' => $oldStatus],
            newValues: ['is_active' => (bool) $user->is_active]
        );

        return redirect()->route('bplo.users')->with('success', "Staff account for {$user->name} has been {$statusText}.");
    }

    /**
     * Remove the specified BPLO staff member.
     */
    public function destroy(User $user): RedirectResponse
    {
        if ($user->role !== 'bplo_staff') {
            abort(403, 'Unauthorized.');
        }

        if (Auth::id() === $user->id) {
            return redirect()->route('bplo.users')->with('error', 'You cannot delete your own logged-in account.');
        }

        $userName = $user->name;
        $employeeId = $user->employee_id;
        $userId = $user->id;

        AuditService::log(
            module: 'user_management',
            action: 'bplo_staff.deleted',
            record: $user,
            description: "Deleted BPLO staff account for {$userName} ({$employeeId})",
            oldValues: [
                'name'        => $user->name,
                'email'       => $user->email,
                'employee_id' => $employeeId,
                'role'        => $user->role,
            ],
            newValues: null,
            targetReference: $employeeId ?: "USER-{$userId}"
        );

        $user->delete();

        return redirect()->route('bplo.users')->with('success', "Staff account for {$userName} has been removed.");
    }
}
