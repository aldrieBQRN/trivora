<?php

namespace Tests\Feature;

use App\Models\Application;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApplicationReferenceNumberTest extends TestCase
{
    use DatabaseTransactions;

    private function prefix(): string
    {
        return 'APP-' . now()->year . '-';
    }

    #[Test]
    public function the_counter_starts_after_the_highest_existing_reference(): void
    {
        DB::table('reference_counters')->where('name', $this->prefix())->delete();
        $highest = (int) Application::where('reference_number', 'like', $this->prefix() . '%')
            ->pluck('reference_number')
            ->map(fn ($ref) => (int) substr($ref, strlen($this->prefix())))
            ->max();

        $this->assertSame($this->prefix() . str_pad($highest + 1, 5, '0', STR_PAD_LEFT), Application::generateReferenceNumber());
    }

    #[Test]
    public function consecutive_allocations_never_repeat_even_before_any_application_is_saved(): void
    {
        // Simultaneous submissions each allocate before saving anything — the old
        // "highest existing + 1" read would have handed every one of them the same number.
        $refs = collect(range(1, 5))->map(fn () => Application::generateReferenceNumber());

        $this->assertCount(5, $refs->unique());
    }

    #[Test]
    public function a_number_taken_outside_the_counter_is_skipped(): void
    {
        $next = Application::generateReferenceNumber();
        $nextSuffix = (int) substr($next, strlen($this->prefix())) + 1;
        $taken = $this->prefix() . str_pad($nextSuffix, 5, '0', STR_PAD_LEFT);
        // Only the reference matters here (as when a seeder writes one directly), so the row
        // skips the operator/tricycle graph; the test transaction rolls it back.
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('applications')->insert([
            'reference_number' => $taken,
            'operator_id' => 0,
            'tricycle_id' => 0,
            'application_type' => 'new',
            'status' => 'pending_review',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->assertSame($this->prefix() . str_pad($nextSuffix + 1, 5, '0', STR_PAD_LEFT), Application::generateReferenceNumber());
    }
}
