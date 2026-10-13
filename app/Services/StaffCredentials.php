<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\StaffCredentialsNotice;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Server-generated temporary passwords for TMO / BPLO staff accounts. The plaintext password
 * exists only in memory for the duration of issue(): it is hashed onto the account, emailed
 * once, and never returned, logged, audited or flashed. Every (re)issue generates a brand new
 * password — an old or expired one is never resent.
 */
class StaffCredentials
{
    public const TTL_HOURS = 24;

    /**
     * 16 characters from the 62 letter/digit set (~95 bits of entropy) via Str::password, which
     * uses random_int (CSPRNG) and guarantees letters and digits — satisfying Password::defaults().
     * Symbols are left out so the password can't be misread or mangled when copied from an email.
     */
    public function generatePassword(): string
    {
        return Str::password(16, letters: true, numbers: true, symbols: false);
    }

    /**
     * Replace the account's password with a fresh temporary one, require a change at next
     * sign-in, and email the credentials. Returns whether the email was actually delivered to
     * the mailer; on failure the account stays locked behind a password nobody knows until the
     * credentials are reissued.
     */
    public function issue(User $user): bool
    {
        $password = $this->generatePassword();

        $user->forceFill([
            'password' => Hash::make($password),
            'must_change_password' => true,
            'temporary_password_expires_at' => now()->addHours(self::TTL_HOURS),
            'credentials_sent_at' => null,
            'remember_token' => Str::random(60),
        ])->save();

        try {
            // Sent synchronously (the notification is not queued) so the plaintext is never
            // serialized into the jobs table and a delivery failure is known immediately.
            $user->notify(new StaffCredentialsNotice($password, $user->temporary_password_expires_at));
        } catch (\Throwable $e) {
            // Only the exception class/message — never the trace, which could carry arguments.
            Log::error('Staff credentials email could not be sent.', [
                'user_id' => $user->id,
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);

            return false;
        } finally {
            unset($password);
        }

        $user->forceFill(['credentials_sent_at' => now()])->save();

        return true;
    }

    /**
     * Delivery/sign-in state shown in Staff Management: null once the staff member has set
     * their own password (or for accounts that never had a temporary one).
     */
    public static function status(User $user): ?string
    {
        if (! $user->must_change_password) {
            return null;
        }
        if ($user->credentials_sent_at === null) {
            return 'not_sent';
        }

        return $user->temporaryPasswordExpired() ? 'expired' : 'pending';
    }
}
