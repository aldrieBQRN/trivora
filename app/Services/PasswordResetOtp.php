<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\PasswordResetOtpNotice;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Email OTP password reset shared by the web login and both mobile apps. Codes live hashed in
 * Laravel's stock `password_reset_tokens` table (one row per email, `token` = Hash of the code,
 * `created_at` = when it was sent), so a fresh request simply replaces the previous code.
 * Wrong guesses are counted with RateLimiter; too many invalidate the code.
 */
class PasswordResetOtp
{
    public const EXPIRES_MINUTES = 10;
    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_ATTEMPTS = 5;

    /**
     * Confirm the email belongs to a registered account and email it a fresh 6-digit code.
     *
     * @throws ValidationException
     */
    public function send(string $email): void
    {
        $user = $this->findUser($email);

        if (! $user) {
            $this->fail('No account is registered with this email address.');
        }

        // Drivers who aren't the franchise owner get a system placeholder address
        // (driver.{id}@trivora.test) that can't receive mail.
        if (str_ends_with(strtolower($user->email), '@trivora.test')) {
            $this->fail('This account has no email on file that can receive a code. Please contact the TMO to reset your password.');
        }

        $existing = $this->row($user->email);
        if ($existing) {
            $wait = self::RESEND_COOLDOWN_SECONDS - Carbon::parse($existing->created_at)->diffInSeconds(now());
            if ($wait > 0) {
                $this->fail('Please wait ' . (int) ceil($wait) . ' seconds before requesting a new code.');
            }
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($code), 'created_at' => now()]
        );
        RateLimiter::clear($this->attemptsKey($user->email));

        try {
            $user->notify(new PasswordResetOtpNotice($code, self::EXPIRES_MINUTES));
        } catch (\Throwable $e) {
            report($e);
            $this->forget($user->email);
            $this->fail('We could not send the email right now. Please try again in a moment.');
        }
    }

    /**
     * Check the code without consuming it (lets the apps confirm it before asking for a new password).
     *
     * @throws ValidationException
     */
    public function verify(string $email, string $code): User
    {
        $user = $this->findUser($email);
        $row = $user ? $this->row($user->email) : null;

        if (! $user || ! $row) {
            $this->fail('No active code for this email. Please request a new one.', 'otp');
        }

        if (Carbon::parse($row->created_at)->addMinutes(self::EXPIRES_MINUTES)->isPast()) {
            $this->forget($user->email);
            $this->fail('This code has expired. Please request a new one.', 'otp');
        }

        $key = $this->attemptsKey($user->email);
        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            $this->forget($user->email);
            $this->fail('Too many incorrect attempts. Please request a new code.', 'otp');
        }

        if (! Hash::check($code, $row->token)) {
            RateLimiter::hit($key, self::EXPIRES_MINUTES * 60);
            $left = self::MAX_ATTEMPTS - RateLimiter::attempts($key);
            if ($left <= 0) {
                $this->forget($user->email);
                $this->fail('Too many incorrect attempts. Please request a new code.', 'otp');
            }
            $this->fail("Incorrect code. {$left} attempt" . ($left === 1 ? '' : 's') . ' left.', 'otp');
        }

        return $user;
    }

    /**
     * Verify the code, set the new password, consume the code and sign the account out everywhere.
     *
     * @throws ValidationException
     */
    public function reset(string $email, string $code, string $password): User
    {
        $user = $this->verify($email, $code);

        // The person chose this password themselves, so it also completes (and clears) a
        // pending temporary-password change for staff accounts (StaffCredentials).
        $user->forceFill([
            'password' => Hash::make($password),
            'remember_token' => Str::random(60),
            'must_change_password' => false,
            'temporary_password_expires_at' => null,
        ])->save();

        $user->tokens()->delete();
        $this->forget($user->email);

        event(new PasswordReset($user));

        return $user;
    }

    /**
     * Seconds left before another code may be requested for this email (0 = resend now), measured
     * from when the current code was sent — so a page refresh doesn't restart the countdown.
     */
    public function secondsUntilResend(string $email): int
    {
        $user = $this->findUser($email);
        $row = $user ? $this->row($user->email) : null;

        if (! $row) {
            return 0;
        }

        $elapsed = Carbon::parse($row->created_at)->diffInSeconds(now());

        return max(0, (int) ceil(self::RESEND_COOLDOWN_SECONDS - $elapsed));
    }

    private function findUser(string $email): ?User
    {
        return User::whereRaw('LOWER(email) = ?', [strtolower(trim($email))])->first();
    }

    private function row(string $email): ?object
    {
        return DB::table('password_reset_tokens')->where('email', $email)->first();
    }

    private function forget(string $email): void
    {
        DB::table('password_reset_tokens')->where('email', $email)->delete();
        RateLimiter::clear($this->attemptsKey($email));
    }

    private function attemptsKey(string $email): string
    {
        return 'password-otp:' . strtolower($email);
    }

    /**
     * @throws ValidationException
     */
    private function fail(string $message, string $field = 'email'): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
