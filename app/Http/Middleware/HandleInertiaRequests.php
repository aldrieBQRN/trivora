<?php

namespace App\Http\Middleware;

use App\Models\Operator;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default on every Inertia response.
     *
     * Available in every React page via:
     *   const { auth } = usePage().props;
     *   auth.user.role  → 'tmo_personnel' | 'bplo_staff' | etc.
     *   auth.operator   → operator profile (only for tricycle_driver role)
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        // Resolve the operator profile only for tricycle_driver accounts
        $operator = null;
        if ($user && $user->role === 'tricycle_driver') {
            $operator = Operator::where('user_id', $user->id)
                ->select([
                    'id',
                    'first_name',
                    'middle_name',
                    'last_name',
                    'contact_number',
                    'barangay',
                    'license_number',
                    'license_expiry_date',
                    'toda_id',
                ])
                ->first();

            if ($operator) {
                $operator->full_name = trim(
                    "{$operator->first_name} {$operator->middle_name} {$operator->last_name}"
                );
            }
        }

        return [
            ...parent::share($request),

            'auth' => [
                'user' => $user ? [
                    'id'         => $user->id,
                    'name'       => $user->name,
                    'email'      => $user->email,
                    'role'       => $user->role,
                    'is_active'  => $user->is_active,
                    'profile_photo_path' => $user->profile_photo_path,
                ] : null,
                'operator' => $operator,
            ],

            // Flash messages available as toast notifications in React
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
                'warning' => session('warning'),
            ],
        ];
    }
}
