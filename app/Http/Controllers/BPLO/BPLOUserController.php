<?php

namespace App\Http\Controllers\BPLO;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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
                'contact_number'     => $u->contact_number,
                'address'            => $u->address,
                'is_active'          => (bool)$u->is_active,
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
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'email'          => 'required|string|email|max:255|unique:users,email',
            'password'       => ['required', 'string', Password::defaults()],
            'is_active'      => 'boolean',
            'position'       => 'nullable|string|max:100',
            'contact_number' => 'nullable|string|max:30',
            'address'        => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name'           => trim($validated['name']),
            'email'          => strtolower(trim($validated['email'])),
            'password'       => Hash::make($validated['password']),
            'role'           => 'bplo_staff',
            'is_active'      => $validated['is_active'] ?? true,
            'position'       => $validated['position'] ?? null,
            'contact_number' => $validated['contact_number'] ?? null,
            'address'        => $validated['address'] ?? null,
        ]);

        // Employee ID is system-generated from the account's own auto-increment id,
        // so it's guaranteed unique and never editable by the form.
        $user->update(['employee_id' => 'BPLO-' . str_pad($user->id, 4, '0', STR_PAD_LEFT)]);

        return redirect()->route('bplo.users')->with('success', "BPLO staff account for {$validated['name']} created successfully.");
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
            'contact_number' => 'nullable|string|max:30',
            'address'        => 'nullable|string|max:255',
        ]);

        // employee_id is system-generated on creation and never editable here.
        $updateData = [
            'name'           => trim($validated['name']),
            'email'          => strtolower(trim($validated['email'])),
            'position'       => $validated['position'] ?? null,
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

        $user->update(['is_active' => !$user->is_active]);

        $statusText = $user->is_active ? 'activated' : 'deactivated';
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
        $user->delete();

        return redirect()->route('bplo.users')->with('success', "Staff account for {$userName} has been removed.");
    }
}
