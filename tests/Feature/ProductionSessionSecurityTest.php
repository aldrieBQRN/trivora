<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProductionSessionSecurityTest extends TestCase
{
    #[Test]
    public function session_cookie_is_http_only_and_lax_by_default(): void
    {
        $this->assertTrue(config('session.http_only'));
        $this->assertSame('lax', config('session.same_site'));
    }

    #[Test]
    public function session_secure_cookie_policy_respects_environment(): void
    {
        // When APP_ENV is production and SESSION_SECURE_COOKIE is not explicitly set,
        // config('session.secure') must evaluate to true.
        unset($_ENV['SESSION_SECURE_COOKIE'], $_SERVER['SESSION_SECURE_COOKIE']);
        putenv('SESSION_SECURE_COOKIE');
        $_ENV['APP_ENV'] = 'production';
        $_SERVER['APP_ENV'] = 'production';
        putenv('APP_ENV=production');

        $config = require config_path('session.php');
        $this->assertTrue($config['secure'], 'Production must enforce HTTPS-only secure session cookies by default.');

        // When APP_ENV is local and SESSION_SECURE_COOKIE is not explicitly set,
        // config('session.secure') must evaluate to false to allow local HTTP development.
        unset($_ENV['SESSION_SECURE_COOKIE'], $_SERVER['SESSION_SECURE_COOKIE']);
        putenv('SESSION_SECURE_COOKIE');
        $_ENV['APP_ENV'] = 'local';
        $_SERVER['APP_ENV'] = 'local';
        putenv('APP_ENV=local');

        $configLocal = require config_path('session.php');
        $this->assertFalse($configLocal['secure'], 'Local development must allow HTTP session cookies.');

        // When SESSION_SECURE_COOKIE is explicitly set, it overrides APP_ENV.
        $_ENV['SESSION_SECURE_COOKIE'] = 'true';
        $_SERVER['SESSION_SECURE_COOKIE'] = 'true';
        putenv('SESSION_SECURE_COOKIE=true');

        $configExplicit = require config_path('session.php');
        $this->assertTrue($configExplicit['secure']);

        // Clean up environment variables
        unset($_ENV['SESSION_SECURE_COOKIE'], $_SERVER['SESSION_SECURE_COOKIE']);
        putenv('SESSION_SECURE_COOKIE');
        $_ENV['APP_ENV'] = 'testing';
        $_SERVER['APP_ENV'] = 'testing';
        putenv('APP_ENV=testing');
    }
}
