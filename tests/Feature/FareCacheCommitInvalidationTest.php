<?php

namespace Tests\Feature;

use App\Models\FareConfiguration;
use App\Services\FareService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/**
 * Exercises the *real* deferred fare-cache invalidation path (FareService::forgetActiveFareCacheAfterCommit):
 * the after-commit callback firing on a successful commit and being discarded on a rollback.
 *
 * The rest of the suite never reaches this path — every other test runs inside the
 * DatabaseTransactions wrapper (which rolls back, so an after-commit callback would never fire)
 * and the deferred branch is otherwise skipped under PHPUnit. So this class deliberately does NOT
 * use DatabaseTransactions: it needs genuine commits and rollbacks. It cleans up everything it
 * commits so no row leaks into other tests, and it isolates only the fare_configurations table.
 */
class FareCacheCommitInvalidationTest extends TestCase
{
    /** Distinct from the ₱50.00 migration baseline and every fare any other test writes. */
    private const COMMITTED_BASE_FARE = 173.45;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        // Take the production branch of the defer decision (after-commit) for this class only.
        FareService::forceDeferredCacheInvalidation(true);
    }

    protected function tearDown(): void
    {
        // Remove whatever this class committed (the rollback test persists nothing) so it cannot
        // affect the fare tests that follow. The migration baseline row is left untouched.
        FareConfiguration::where('base_fare', self::COMMITTED_BASE_FARE)->delete();
        Cache::flush();
        FareService::forceDeferredCacheInvalidation(null);
        parent::tearDown();
    }

    private function makeConfiguration(float $baseFare): FareConfiguration
    {
        return FareConfiguration::create([
            'base_fare' => $baseFare,
            'base_fare_per_passenger' => 25.00,
            'included_distance_km' => 4.00,
            'rate_per_km' => 5.00,
            'effective_date' => now(),
            'is_active' => true,
        ]);
    }

    public function test_a_committed_fare_write_invalidates_the_cache_only_after_commit(): void
    {
        // Prime the "now" cache with the currently-active configuration.
        $active = FareService::getActiveFare();
        $versionBefore = FareService::activeFareCacheVersion();

        DB::transaction(function () use ($active, $versionBefore) {
            $this->makeConfiguration(self::COMMITTED_BASE_FARE);

            // Still inside the transaction: the cache must NOT have been invalidated yet, so the
            // primed value is still served (no premature invalidation from a rolled-back write).
            $this->assertSame($versionBefore, FareService::activeFareCacheVersion());
            $this->assertSame($active, FareService::getActiveFare());
        });

        // After the commit, the after-commit callback has run: the version bumped and the next read
        // resolves the freshly-persisted configuration.
        $this->assertSame($versionBefore + 1, FareService::activeFareCacheVersion());
        $this->assertSame(self::COMMITTED_BASE_FARE, (float) FareService::getActiveFare()->base_fare);
    }

    public function test_a_rolled_back_fare_write_never_invalidates_the_cache(): void
    {
        FareService::getActiveFare();
        $versionBefore = FareService::activeFareCacheVersion();

        try {
            DB::transaction(function () {
                $this->makeConfiguration(self::COMMITTED_BASE_FARE);
                throw new RuntimeException('force a rollback');
            });
            $this->fail('the transaction should have rethrown the exception');
        } catch (RuntimeException $e) {
            $this->assertSame('force a rollback', $e->getMessage());
        }

        // The deferred callback was discarded together with the transaction: the cache version is
        // untouched and the row was never persisted.
        $this->assertSame($versionBefore, FareService::activeFareCacheVersion());
        $this->assertSame(0, FareConfiguration::where('base_fare', self::COMMITTED_BASE_FARE)->count());
    }
}