<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Expo push tokens registered by the passenger and driver apps (App\Services\ExpoPushService).
     * One row per physical install: the token is unique, so a phone that signs in to a different
     * account moves its token to that account instead of notifying both. `personal_access_token_id`
     * ties the row to the Sanctum session that registered it, so logging out of that session
     * removes it (see the apps' logout endpoints). Additive only.
     */
    public function up(): void
    {
        if (Schema::hasTable('device_push_tokens')) {
            return;
        }

        Schema::create('device_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('app', 16); // 'passenger' | 'driver'
            $table->string('token')->unique();
            $table->string('platform', 16)->nullable();
            $table->unsignedBigInteger('personal_access_token_id')->nullable()->index();
            $table->timestamp('last_registered_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'app']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_push_tokens');
    }
};
