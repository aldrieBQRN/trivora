<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Register role-based access middleware alias
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

// Support alternative environment files for InfinityFree (env.php, env.txt, app.env)
if (file_exists($envPhp = $app->basePath('env.php')) || file_exists($envPhp = $app->basePath('custom_env.php'))) {
    $envVars = require $envPhp;
    if (is_array($envVars)) {
        foreach ($envVars as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = (string) $value;
            $_SERVER[$key] = (string) $value;
        }
    }
} elseif (!file_exists($app->environmentFilePath())) {
    if (file_exists($app->basePath('env.txt'))) {
        $app->loadEnvironmentFrom('env.txt');
    } elseif (file_exists($app->basePath('app.env'))) {
        $app->loadEnvironmentFrom('app.env');
    } elseif (file_exists($app->basePath('production.env'))) {
        $app->loadEnvironmentFrom('production.env');
    }
}

return $app;
