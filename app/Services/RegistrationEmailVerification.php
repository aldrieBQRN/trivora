<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\RegistrationEmailCodeNotice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Email ownership check before an account is created: a 6-digit code is emailed and must be
 * entered back. Used by
 *  - public MTOP registration (web): a correct code marks the email verified in the session;
 *    RegistrationController::store() refuses an unverified email.
 *  - passenger app sign-up (API, no session): a correct code returns a short-lived
 *    verification token that PassengerAuthController::register() requires.
 *  - passenger app email change (API, signed in): the code is sent to the NEW address and
 *    confirm() checks it before PassengerAuthController::verifyEmailChange() saves it.
 * The code is kept hashed in the cache; nothing is written to the users table here.
 */
class RegistrationEmailVerification
{
    public const EXPIRES_MINUTES = 10;
    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_ATTEMPTS = 5;
    public const SESSION_KEY = 'registration_verified_email';
    public const API_TOKEN_MINUTES = 30;

    /** Email wording per sign-up flow ("Enter this code to confirm your email address …"). */
    public const CONTEXT_MTOP = 'for your Trivora MTOP application.';
    public const CONTEXT_PASSENGER = 'and finish creating your Trivora passenger account.';
    public const CONTEXT_EMAIL_CHANGE = 'as the new email for your Trivora passenger account.';

    /**
     * @throws ValidationException
     */
    public function send(string $email, string $context = self::CONTEXT_MTOP): void
    {
        $email = $this->normalize($email);

        if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            $this->fail('This email is already registered to a Trivora account. Please sign in or use a different email.', 'email');
        }

        $wait = $this->secondsUntilResend($email);
        if ($wait > 0) {
            $this->fail("Please wait {$wait} seconds before requesting a new code.", 'email');
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put($this->cacheKey($email), [
            'hash' => Hash::make($code),
            'sent_at' => now()->timestamp,
        ], now()->addMinutes(self::EXPIRES_MINUTES));
        RateLimiter::clear($this->attemptsKey($email));

        try {
            Notification::route('mail', $email)->notify(new RegistrationEmailCodeNotice($code, self::EXPIRES_MINUTES, $context));
        } catch (\Throwable $e) {
            Log::error('Registration verification email could not be sent.', [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            Cache::forget($this->cacheKey($email));
            $this->fail('We could not send the email right now. Please check the address and try again.', 'email');
        }
    }

    /**
     * Web flow: check the code; on success the email is marked verified for this session.
     *
     * @throws ValidationException
     */
    public function verify(string $email, string $code): void
    {
        $this->checkCode($email, $code);
        session()->put(self::SESSION_KEY, $this->normalize($email));
    }

    /**
     * API flow (no session): check the code and return a one-time verification token, valid
     * for API_TOKEN_MINUTES, that proves ownership of this email at account creation.
     *
     * @throws ValidationException
     */
    public function verifyForToken(string $email, string $code): string
    {
        $this->checkCode($email, $code);

        $token = Str::random(64);
        Cache::put($this->tokenKey($token), $this->normalize($email), now()->addMinutes(self::API_TOKEN_MINUTES));

        return $token;
    }

    /**
     * API flow where the caller acts on the result itself (e.g. saving a signed-in user's new
     * email): check the code, with no session flag or token issued.
     *
     * @throws ValidationException
     */
    public function confirm(string $email, string $code): void
    {
        $this->checkCode($email, $code);
    }

    /** Whether $token was issued for exactly this email (and is still valid). */
    public function tokenMatches(?string $token, ?string $email): bool
    {
        return $token && $email && Cache::get($this->tokenKey($token)) === $this->normalize($email);
    }

    /** One-time use: discard the token once the account has been created. */
    public function forgetToken(string $token): void
    {
        Cache::forget($this->tokenKey($token));
    }

    /**
     * @throws ValidationException
     */
    private function checkCode(string $email, string $code): void
    {
        $email = $this->normalize($email);
        $entry = Cache::get($this->cacheKey($email));

        if (! $entry) {
            $this->fail('This code has expired or was not requested. Please request a new one.');
        }

        $key = $this->attemptsKey($email);
        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            Cache::forget($this->cacheKey($email));
            $this->fail('Too many incorrect attempts. Please request a new code.');
        }

        if (! Hash::check($code, $entry['hash'])) {
            RateLimiter::hit($key, self::EXPIRES_MINUTES * 60);
            $left = self::MAX_ATTEMPTS - RateLimiter::attempts($key);
            if ($left <= 0) {
                Cache::forget($this->cacheKey($email));
                $this->fail('Too many incorrect attempts. Please request a new code.');
            }
            $this->fail("Incorrect code. {$left} attempt" . ($left === 1 ? '' : 's') . ' left.');
        }

        Cache::forget($this->cacheKey($email));
        RateLimiter::clear($key);
    }

    public function isVerified(?string $email): bool
    {
        return $email !== null && session(self::SESSION_KEY) === $this->normalize($email);
    }

    public function secondsUntilResend(string $email): int
    {
        $entry = Cache::get($this->cacheKey($this->normalize($email)));
        if (! $entry) {
            return 0;
        }

        $elapsed = now()->timestamp - (int) $entry['sent_at'];

        return max(0, self::RESEND_COOLDOWN_SECONDS - $elapsed);
    }

    private function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    private function cacheKey(string $email): string
    {
        return 'registration-email-code:' . sha1($email);
    }

    private function tokenKey(string $token): string
    {
        return 'registration-email-token:' . hash('sha256', $token);
    }

    private function attemptsKey(string $email): string
    {
        return 'registration-email-code-attempts:' . sha1($email);
    }

    /**
     * @throws ValidationException
     */
    private function fail(string $message, string $field = 'code'): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
