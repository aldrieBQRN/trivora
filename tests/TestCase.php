<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The array cache store is process-wide and is NOT rolled back between tests like the
        // database, so clear it to keep application caching from leaking across tests.
        Cache::flush();
    }
}
