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

    /**
     * POST a public MTOP registration whose email was already verified with the emailed code
     * (RegistrationEmailVerification), as the real Applicant Information step requires.
     */
    protected function postRegistration(array $payload): \Illuminate\Testing\TestResponse
    {
        return $this->withSession([
            \App\Services\RegistrationEmailVerification::SESSION_KEY => strtolower(trim((string) ($payload['email'] ?? ''))),
        ])->post(route('register.public.submit'), $payload);
    }
}
