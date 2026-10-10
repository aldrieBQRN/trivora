<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\ColorCodingScheme;
use App\Models\FareConfiguration;
use App\Models\TodaZone;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SystemAuditLogTest extends TestCase
{
    use DatabaseTransactions;

    protected User $tmoUser;
    protected User $bploUser;
    protected User $driverUser;
    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmoUser = User::factory()->create([
            'role'      => 'tmo_personnel',
            'is_active' => true,
        ]);

        $this->bploUser = User::factory()->create([
            'role'      => 'bplo_staff',
            'is_active' => true,
        ]);

        $this->driverUser = User::factory()->create([
            'role'      => 'tricycle_driver',
            'is_active' => true,
        ]);

        $this->adminUser = User::factory()->create([
            'role'      => 'admin',
            'is_active' => true,
        ]);
    }

    public function test_tmo_personnel_can_view_tmo_activity_logs(): void
    {
        $response = $this->actingAs($this->tmoUser)
            ->get(route('tmo.activity-logs'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('AuditLogs/Index')
            ->has('logs')
            ->has('filters')
            ->has('availableModules')
            ->has('availableRoles')
        );
    }

    public function test_bplo_staff_cannot_view_administrative_activity_logs(): void
    {
        $response = $this->actingAs($this->bploUser)
            ->get(route('tmo.activity-logs'));

        $response->assertStatus(403);
    }

    public function test_driver_cannot_view_administrative_activity_logs(): void
    {
        $tmoResponse = $this->actingAs($this->driverUser)
            ->get(route('tmo.activity-logs'));

        $tmoResponse->assertStatus(403);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get(route('tmo.activity-logs'));
        $response->assertRedirect(route('login'));
    }

    public function test_creating_tmo_staff_generates_audit_log(): void
    {
        $response = $this->actingAs($this->tmoUser)->post(route('tmo.users.store'), [
            'name'           => 'Officer Juan Dela Cruz',
            'email'          => 'juan.delacruz.test@trivora.gov.ph',
            'password'       => 'Password123!',
            'position'       => 'Traffic Enforcer I',
            'contact_number' => '09171234567',
        ]);

        $response->assertRedirect(route('tmo.users'));

        $this->assertDatabaseHas('audit_logs', [
            'module'      => 'user_management',
            'action'      => 'staff.created',
            'actor_name'  => $this->tmoUser->name,
            'actor_role'  => 'tmo_personnel',
            'channel'     => 'web',
        ]);

        $log = AuditLog::where('action', 'staff.created')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertNotNull($log->new_values);
        $this->assertEquals('Officer Juan Dela Cruz', $log->new_values['name']);
        $this->assertNull($log->old_values);
    }

    public function test_updating_tmo_staff_generates_audit_log_with_before_and_after_diff(): void
    {
        $targetUser = User::factory()->create([
            'role'      => 'tmo_personnel',
            'name'      => 'Officer Pedro Original',
            'position'  => 'Enforcer I',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->tmoUser)->put(route('tmo.users.update', $targetUser), [
            'name'           => 'Officer Pedro Updated',
            'email'          => $targetUser->email,
            'position'       => 'Senior Enforcer',
            'contact_number' => '09189998888',
        ]);

        $response->assertRedirect(route('tmo.users'));

        $log = AuditLog::where('action', 'staff.updated')
            ->where('target_id', $targetUser->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals('Officer Pedro Original', $log->old_values['name']);
        $this->assertEquals('Officer Pedro Updated', $log->new_values['name']);
        $this->assertEquals('Enforcer I', $log->old_values['position']);
        $this->assertEquals('Senior Enforcer', $log->new_values['position']);
    }

    public function test_toggling_tmo_staff_status_generates_audit_log(): void
    {
        $targetUser = User::factory()->create([
            'role'      => 'tmo_personnel',
            'name'      => 'Officer To Deactivate',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->tmoUser)->patch(route('tmo.users.toggle-status', $targetUser));
        $response->assertRedirect(route('tmo.users'));

        $log = AuditLog::where('action', 'staff.status_toggled')
            ->where('target_id', $targetUser->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertTrue($log->old_values['is_active']);
        $this->assertFalse($log->new_values['is_active']);
    }

    public function test_deleting_tmo_staff_generates_audit_log_preserving_actor_and_target_info(): void
    {
        $targetUser = User::factory()->create([
            'role'        => 'tmo_personnel',
            'name'        => 'Officer To Delete',
            'employee_id' => 'TMO-9999',
            'is_active'   => false,
        ]);
        $targetId = $targetUser->id;

        $response = $this->actingAs($this->tmoUser)->delete(route('tmo.users.destroy', $targetUser));
        $response->assertRedirect(route('tmo.users'));

        $log = AuditLog::where('action', 'staff.deleted')
            ->where('target_id', $targetId)
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals('Officer To Delete', $log->old_values['name']);
        $this->assertEquals('TMO-9999', $log->target_reference);
        $this->assertEquals($this->tmoUser->name, $log->actor_name);
    }

    public function test_fare_update_generates_audit_log(): void
    {
        FareConfiguration::firstOrCreate(
            ['effective_date' => '2026-01-01'],
            [
                'base_fare'               => 50.00,
                'base_fare_per_passenger' => 25.00,
                'included_distance_km'    => 4.00,
                'rate_per_km'             => 5.00,
                'night_diff_rate'         => 0.10,
                'night_diff_start'        => '22:00',
                'night_diff_end'          => '05:00',
                'min_night_diff_fare'     => 60.00,
                'is_active'               => true,
            ]
        );

        $response = $this->actingAs($this->tmoUser)->post(route('tmo.fares.store'), [
            'base_fare'               => 60.00,
            'base_fare_per_passenger' => 30.00,
            'included_distance_km'    => 4.00,
            'rate_per_km'             => 6.00,
            'effective_date'          => now()->toDateString(),
            'night_diff_rate'         => 0.15,
            'night_diff_start'        => '22:00',
            'night_diff_end'          => '05:00',
            'min_night_diff_fare'     => 70.00,
        ]);

        $response->assertRedirect(route('tmo.fares'));

        $log = AuditLog::where('action', 'fare.updated')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertEquals('fare', $log->module);
        $this->assertEquals(50.00, (float)$log->old_values['base_fare']);
        $this->assertEquals(60.00, (float)$log->new_values['base_fare']);
    }

    public function test_audit_logs_are_strictly_immutable_on_update(): void
    {
        $log = AuditLog::create([
            'actor_name'       => 'Test Actor',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'test_module',
            'action'           => 'test.action',
            'event'            => 'test.action',
            'channel'          => 'web',
            'description'      => 'Test description',
            'created_at'       => now(),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Audit logs are immutable and cannot be modified.');

        $log->update(['description' => 'Tampered description']);
    }

    public function test_audit_logs_are_strictly_immutable_on_delete(): void
    {
        $log = AuditLog::create([
            'actor_name'       => 'Test Actor',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'test_module',
            'action'           => 'test.action',
            'event'            => 'test.action',
            'channel'          => 'web',
            'description'      => 'Test description',
            'created_at'       => now(),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Audit logs are immutable and cannot be deleted.');

        $log->delete();
    }

    public function test_export_activity_logs_excel_generates_file_and_audits_itself(): void
    {
        // Seed an audit log entry first
        AuditService::log(
            module: 'document_review',
            action: 'document.approved',
            record: null,
            description: 'Approved test document',
            targetReference: 'APP-TEST-001',
            actor: $this->tmoUser
        );

        $response = $this->actingAs($this->tmoUser)
            ->get(route('tmo.activity-logs.export-excel'));

        $response->assertStatus(200);
        $this->assertStringContainsString('spreadsheetml.sheet', (string)$response->headers->get('content-type'));

        // Check self-audit
        $exportLog = AuditLog::where('action', 'report.exported_excel')
            ->where('metadata->report', 'audit_logs')
            ->latest('id')
            ->first();

        $this->assertNotNull($exportLog);
        $this->assertEquals($this->tmoUser->name, $exportLog->actor_name);
    }

    public function test_export_activity_logs_pdf_csv_and_json(): void
    {
        AuditService::log(
            module: 'franchise',
            action: 'franchise.issued',
            record: null,
            description: 'Issued test franchise',
            targetReference: 'MTOP-999',
            actor: $this->tmoUser
        );

        // PDF export (landscape municipal document)
        $pdfResponse = $this->actingAs($this->tmoUser)
            ->get(route('tmo.activity-logs.export', ['format' => 'pdf']));
        $pdfResponse->assertStatus(200);
        $this->assertStringContainsString('application/pdf', (string) $pdfResponse->headers->get('content-type'));

        // CSV export
        $csvResponse = $this->actingAs($this->tmoUser)
            ->get(route('tmo.activity-logs.export', ['format' => 'csv']));
        $csvResponse->assertStatus(200);
        $this->assertStringContainsString('text/csv', (string) $csvResponse->headers->get('content-type'));

        // JSON export
        $jsonResponse = $this->actingAs($this->tmoUser)
            ->get(route('tmo.activity-logs.export', ['format' => 'json']));
        $jsonResponse->assertStatus(200);
        $this->assertStringContainsString('application/json', (string) $jsonResponse->headers->get('content-type'));
    }

    public function test_mobile_api_requests_are_guarded_against_accidental_web_logging(): void
    {
        // Simulate a request pointing to an API path
        $request = \Illuminate\Http\Request::create('/api/mobile/driver/status', 'GET');
        $this->app->instance('request', $request);

        $result = AuditService::log(
            module: 'telemetry',
            action: 'driver.ping',
            record: null,
            description: 'Mobile GPS ping'
        );

        $this->assertNull($result);
        $this->assertDatabaseMissing('audit_logs', [
            'action' => 'driver.ping',
        ]);
    }

    public function test_activity_logs_filters_by_module_and_role(): void
    {
        AuditService::log(
            module: 'document_review',
            action: 'document.approved',
            record: null,
            description: 'Approved test document A',
            actor: $this->tmoUser
        );

        AuditService::log(
            module: 'franchise',
            action: 'bplo.franchise_released',
            record: null,
            description: 'Released franchise B',
            actor: $this->bploUser
        );

        $response = $this->actingAs($this->tmoUser)->get(route('tmo.activity-logs', ['module' => 'document_review']));
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.module', 'document_review')
        );

        $response2 = $this->actingAs($this->tmoUser)->get(route('tmo.activity-logs', ['role' => 'bplo_staff']));
        $response2->assertStatus(200);
        $response2->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.actor_role', 'bplo_staff')
        );
    }

    public function test_web_login_and_logout_generate_audit_logs(): void
    {
        $testUser = User::factory()->create([
            'role'      => 'tmo_personnel',
            'email'     => 'test.login.officer@trivora.gov.ph',
            'password'  => bcrypt('Password123!'),
            'is_active' => true,
        ]);

        // 1. Test Login
        $loginResponse = $this->post(route('login'), [
            'login_id' => 'test.login.officer@trivora.gov.ph',
            'password' => 'Password123!',
        ]);

        $loginResponse->assertRedirect(route('tmo.dashboard'));

        $loginLog = AuditLog::where('action', 'auth.login')
            ->where('user_id', $testUser->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($loginLog);
        $this->assertEquals('auth', $loginLog->module);
        $this->assertEquals($testUser->name, $loginLog->actor_name);
        $this->assertEquals('tmo_personnel', $loginLog->actor_role);

        // 2. Test Logout
        $logoutResponse = $this->actingAs($testUser)->post(route('logout'));
        $logoutResponse->assertRedirect(route('login'));

        $logoutLog = AuditLog::where('action', 'auth.logout')
            ->where('user_id', $testUser->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($logoutLog);
        $this->assertEquals('auth', $logoutLog->module);
        $this->assertEquals($testUser->name, $logoutLog->actor_name);
    }

    public function test_profile_update_and_password_update_generate_audit_logs(): void
    {
        $testUser = User::factory()->create([
            'role'      => 'tricycle_driver',
            'name'      => 'Driver Juan Test',
            'email'     => 'driver.test.profile@trivora.ph',
            'password'  => bcrypt('OldPassword123!'),
            'is_active' => true,
        ]);

        // 1. Profile Update
        $profileResponse = $this->actingAs($testUser)->patch(route('profile.update'), [
            'name'  => 'Driver Juan Updated',
            'email' => 'driver.test.profile@trivora.ph',
        ]);

        $profileResponse->assertRedirect(route('profile.edit'));

        $profileLog = AuditLog::where('action', 'profile.updated')
            ->where('user_id', $testUser->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($profileLog);
        $this->assertEquals('profile', $profileLog->module);
        $this->assertEquals('Driver Juan Test', $profileLog->old_values['name']);
        $this->assertEquals('Driver Juan Updated', $profileLog->new_values['name']);

        // 2. Password Update
        $passwordResponse = $this->actingAs($testUser)->put(route('password.update'), [
            'current_password'      => 'OldPassword123!',
            'password'              => 'NewSecurePass123!',
            'password_confirmation' => 'NewSecurePass123!',
        ]);

        $passwordResponse->assertSessionHasNoErrors();

        $passwordLog = AuditLog::where('action', 'profile.password_updated')
            ->where('user_id', $testUser->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($passwordLog);
        $this->assertEquals('profile', $passwordLog->module);
        $this->assertStringContainsString('changed their account security credentials', $passwordLog->description);
    }
}
