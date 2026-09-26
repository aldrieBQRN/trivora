<?php

namespace App\Http\Controllers\TMO;

use App\Http\Controllers\Controller;
use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * TMO's Suspend / Revoke / Reinstate actions for a tricycle's FRANCHISE — operational
 * authorization belongs to the franchise permit (FranchiseScheme), not any individual driver
 * account. Bound on the Tricycle (matching the Tricycle Details page's own route param) rather
 * than the FranchiseScheme directly; each action resolves the tricycle's current scheme itself.
 */
class FranchiseStatusController extends Controller
{
    public function suspend(Request $request, Tricycle $tricycle): RedirectResponse
    {
        $validated = $request->validate(['reason' => 'required|string|min:5|max:1000']);

        return $this->transition($tricycle, FranchiseScheme::STATUS_SUSPENDED, $validated['reason'], 'suspended');
    }

    public function revoke(Request $request, Tricycle $tricycle): RedirectResponse
    {
        $validated = $request->validate(['reason' => 'required|string|min:5|max:1000']);

        return $this->transition($tricycle, FranchiseScheme::STATUS_REVOKED, $validated['reason'], 'revoked');
    }

    public function reinstate(Request $request, Tricycle $tricycle): RedirectResponse
    {
        $validated = $request->validate(['reason' => 'nullable|string|max:1000']);

        return $this->transition($tricycle, FranchiseScheme::STATUS_ACTIVE, $validated['reason'] ?? null, 'reinstated');
    }

    private function transition(Tricycle $tricycle, string $toStatus, ?string $reason, string $pastTenseVerb): RedirectResponse
    {
        $franchiseScheme = $tricycle->franchiseScheme;

        if (!$franchiseScheme) {
            return back()->with('error', 'This tricycle has no current franchise permit to manage.');
        }

        try {
            $franchiseScheme->transitionStatus($toStatus, $reason, Auth::id());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "Franchise #{$franchiseScheme->franchise_number} has been {$pastTenseVerb}.");
    }
}
