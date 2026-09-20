<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Physical GPS tracker identity, kept separate from `tricycles.iot_device_id` (which stays as a
 * human-facing display copy set at Final Confirmation time — see FinalConfirmationController).
 * This table is the source of truth for "does this physical device exist, and which tricycle is
 * it currently paired to" — it can be repointed to a new tricycle without losing the device's own
 * history, and without touching any TricycleLocation ping (that table only ever references
 * tricycle_id, never a device row).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gps_devices', function (Blueprint $table) {
            $table->id();

            // The identifier the physical tracker will present when it talks to the (future) TCP
            // receiver. Deliberately NOT assumed to be the IMEI — the real ST-901L wire format is
            // still unverified (see the GPS/IoT audit), so this is whatever value TMO records as
            // the tracker's identity today (its printed serial, an IMEI, or a hardware label).
            $table->string('device_identifier', 50)->unique();

            $table->string('imei', 20)->nullable()->unique();
            $table->string('sim_number', 20)->nullable();
            $table->string('model', 50)->default('ST-901L');

            $table->foreignId('tricycle_id')->nullable()->constrained('tricycles')->nullOnDelete();

            $table->enum('status', ['unprovisioned', 'paired', 'revoked'])->default('unprovisioned');

            // The ONLY field an "Online/Offline" badge may ever read once telemetry ingestion
            // exists — never inferred from status/pairing alone. Stays null until a later phase
            // wires up real ST-901L telemetry.
            $table->timestamp('last_seen_at')->nullable();

            $table->timestamp('paired_at')->nullable();
            $table->foreignId('paired_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gps_devices');
    }
};
