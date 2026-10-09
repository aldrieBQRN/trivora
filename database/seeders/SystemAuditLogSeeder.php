<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\FareConfiguration;
use App\Models\FranchiseScheme;
use App\Models\Tricycle;
use App\Models\User;
use App\Models\Violation;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemAuditLogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Truncate existing audit logs
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('audit_logs')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 2. Resolve existing actors or fallback to realistic placeholders
        $tmo1 = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first()
            ?? User::where('role', 'tmo_personnel')->first();
        $tmo2 = User::where('email', 'tmo.msantos@trivora.gov.ph')->first()
            ?? User::where('role', 'tmo_personnel')->orderBy('id', 'desc')->first();

        $bplo1 = User::where('email', 'bplo.areyes@trivora.gov.ph')->first()
            ?? User::where('role', 'bplo_staff')->first();
        $bplo2 = User::where('email', 'bplo.cmendoza@trivora.gov.ph')->first()
            ?? User::where('role', 'bplo_staff')->orderBy('id', 'desc')->first();

        $admin = User::where('role', 'admin')->first();
        $driver = User::where('role', 'tricycle_driver')->first();

        $sampleTricycles = Tricycle::take(5)->get();
        $sampleApps = Application::take(5)->get();
        $sampleViolations = Violation::take(5)->get();

        $t1Plate = $sampleTricycles->get(0)?->plate_number ?? '123-ABC';
        $t2Plate = $sampleTricycles->get(1)?->plate_number ?? '456-DEF';
        $t3Plate = $sampleTricycles->get(2)?->plate_number ?? '789-GHI';

        $app1Ref = $sampleApps->get(0)?->reference_number ?? 'APP-2026-0012';
        $app2Ref = $sampleApps->get(1)?->reference_number ?? 'APP-2026-0018';
        $app3Ref = $sampleApps->get(2)?->reference_number ?? 'APP-2026-0024';

        $vio1Ref = $sampleViolations->get(0) ? ('VIO-26-' . str_pad($sampleViolations->get(0)->id, 4, '0', STR_PAD_LEFT)) : 'VIO-26-0004';
        $vio2Ref = $sampleViolations->get(1) ? ('VIO-26-' . str_pad($sampleViolations->get(1)->id, 4, '0', STR_PAD_LEFT)) : 'VIO-26-0009';

        $records = [];
        $now = Carbon::now();

        // ---------------------------------------------------------------------
        // Module: FARE MANAGEMENT
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $admin?->id ?? 1,
            'actor_name'       => $admin?->name ?? 'System Administrator',
            'actor_role'       => 'admin',
            'module'           => 'fare',
            'action'           => 'fare.updated',
            'event'            => 'fare.updated',
            'auditable_type'   => FareConfiguration::class,
            'auditable_id'     => 1,
            'target_type'      => FareConfiguration::class,
            'target_id'        => 1,
            'target_reference' => 'Fare Matrix 2026-A',
            'description'      => 'Updated municipal base fare and incremental distance rates pursuant to City Ordinance #2026-04.',
            'channel'          => 'web',
            'old_values'       => json_encode(['base_fare' => 45.00, 'rate_per_km' => 4.50, 'included_distance_km' => 3.5]),
            'new_values'       => json_encode(['base_fare' => 50.00, 'rate_per_km' => 5.00, 'included_distance_km' => 4.0]),
            'metadata'         => json_encode(['ordinance_no' => '2026-04', 'effective_date' => $now->copy()->subDays(15)->toDateString()]),
            'ip_address'       => '192.168.1.10',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(15)->setHour(9)->setMinute(15),
        ];

        $records[] = [
            'user_id'          => $tmo1?->id ?? 2,
            'actor_name'       => $tmo1?->name ?? 'Juan dela Cruz',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'fare',
            'action'           => 'fare.updated',
            'event'            => 'fare.updated',
            'auditable_type'   => FareConfiguration::class,
            'auditable_id'     => 1,
            'target_type'      => FareConfiguration::class,
            'target_id'        => 1,
            'target_reference' => 'Fare Configuration #1',
            'description'      => 'Calibrated nighttime differential rate (10%) active between 10:00 PM and 5:00 AM.',
            'channel'          => 'web',
            'old_values'       => json_encode(['night_diff_rate' => 0.08, 'min_night_diff_fare' => 55.00]),
            'new_values'       => json_encode(['night_diff_rate' => 0.10, 'min_night_diff_fare' => 60.00]),
            'metadata'         => json_encode(['verified_by' => 'TMO Operations Division']),
            'ip_address'       => '192.168.1.15',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(3)->setHour(14)->setMinute(30),
        ];

        // ---------------------------------------------------------------------
        // Module: DOCUMENT REVIEW
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $tmo1?->id ?? 2,
            'actor_name'       => $tmo1?->name ?? 'Juan dela Cruz',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'document_review',
            'action'           => 'document.approved',
            'event'            => 'document.approved',
            'auditable_type'   => Application::class,
            'auditable_id'     => $sampleApps->get(0)?->id ?? 101,
            'target_type'      => Application::class,
            'target_id'        => $sampleApps->get(0)?->id ?? 101,
            'target_reference' => $app1Ref,
            'description'      => "Verified and approved applicant requirements: LTO Driver's License and Barangay Clearance.",
            'channel'          => 'web',
            'old_values'       => json_encode(['status' => 'pending_review', 'documents_verified' => false]),
            'new_values'       => json_encode(['status' => 'documents_approved', 'documents_verified' => true]),
            'metadata'         => json_encode(['applicant' => 'Rogelio Bautista', 'license_no' => 'N02-18-998241']),
            'ip_address'       => '192.168.1.15',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(12)->setHour(10)->setMinute(45),
        ];

        $records[] = [
            'user_id'          => $tmo2?->id ?? 3,
            'actor_name'       => $tmo2?->name ?? 'Maria Santos',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'document_review',
            'action'           => 'document.resubmission_requested',
            'event'            => 'document.resubmission_requested',
            'auditable_type'   => Application::class,
            'auditable_id'     => $sampleApps->get(1)?->id ?? 102,
            'target_type'      => Application::class,
            'target_id'        => $sampleApps->get(1)?->id ?? 102,
            'target_reference' => $app2Ref,
            'description'      => 'Requested document resubmission: Uploaded LTO Official Receipt (OR) copy was blurry and unreadable.',
            'channel'          => 'web',
            'old_values'       => json_encode(['status' => 'pending_review']),
            'new_values'       => json_encode(['status' => 'resubmission_required']),
            'metadata'         => json_encode(['rejection_reason' => 'Blurry copy of LTO Official Receipt. Please upload clear scan.']),
            'ip_address'       => '192.168.1.18',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(9)->setHour(11)->setMinute(10),
        ];

        $records[] = [
            'user_id'          => $tmo2?->id ?? 3,
            'actor_name'       => $tmo2?->name ?? 'Maria Santos',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'document_review',
            'action'           => 'document.approved',
            'event'            => 'document.approved',
            'auditable_type'   => Application::class,
            'auditable_id'     => $sampleApps->get(1)?->id ?? 102,
            'target_type'      => Application::class,
            'target_id'        => $sampleApps->get(1)?->id ?? 102,
            'target_reference' => $app2Ref,
            'description'      => 'Re-evaluated and approved resubmitted LTO Official Receipt (OR).',
            'channel'          => 'web',
            'old_values'       => json_encode(['status' => 'resubmission_required']),
            'new_values'       => json_encode(['status' => 'documents_approved']),
            'metadata'         => json_encode(['resubmission_cleared' => true]),
            'ip_address'       => '192.168.1.18',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(7)->setHour(15)->setMinute(20),
        ];

        // ---------------------------------------------------------------------
        // Module: PHYSICAL INSPECTION
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $tmo1?->id ?? 2,
            'actor_name'       => $tmo1?->name ?? 'Juan dela Cruz',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'inspection',
            'action'           => 'inspection.passed',
            'event'            => 'inspection.passed',
            'auditable_type'   => Tricycle::class,
            'auditable_id'     => $sampleTricycles->get(0)?->id ?? 1,
            'target_type'      => Tricycle::class,
            'target_id'        => $sampleTricycles->get(0)?->id ?? 1,
            'target_reference' => $t1Plate,
            'description'      => "Physical roadworthiness inspection PASSED: Headlight, sidecar integrity, tail lights, and brakes verified.",
            'channel'          => 'web',
            'old_values'       => json_encode(['inspection_status' => 'pending']),
            'new_values'       => json_encode(['inspection_status' => 'passed', 'inspected_at' => $now->copy()->subDays(11)->toDateTimeString()]),
            'metadata'         => json_encode(['inspector' => 'Officer Juan dela Cruz', 'passed_checklist' => ['headlight', 'brakes', 'sidecar', 'exhaust']]),
            'ip_address'       => '192.168.1.15',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(11)->setHour(14)->setMinute(15),
        ];

        $records[] = [
            'user_id'          => $tmo2?->id ?? 3,
            'actor_name'       => $tmo2?->name ?? 'Maria Santos',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'inspection',
            'action'           => 'inspection.failed',
            'event'            => 'inspection.failed',
            'auditable_type'   => Tricycle::class,
            'auditable_id'     => $sampleTricycles->get(1)?->id ?? 2,
            'target_type'      => Tricycle::class,
            'target_id'        => $sampleTricycles->get(1)?->id ?? 2,
            'target_reference' => $t2Plate,
            'description'      => 'Physical inspection FAILED: Defective right sidecar brake light and non-compliant muffler noise level.',
            'channel'          => 'web',
            'old_values'       => json_encode(['inspection_status' => 'pending']),
            'new_values'       => json_encode(['inspection_status' => 'failed']),
            'metadata'         => json_encode(['defects' => ['Defective brake light', 'Excessive exhaust decibels'], 'reinspection_deadline' => '7 days']),
            'ip_address'       => '192.168.1.18',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(8)->setHour(13)->setMinute(45),
        ];

        $records[] = [
            'user_id'          => $tmo2?->id ?? 3,
            'actor_name'       => $tmo2?->name ?? 'Maria Santos',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'inspection',
            'action'           => 'inspection.passed',
            'event'            => 'inspection.passed',
            'auditable_type'   => Tricycle::class,
            'auditable_id'     => $sampleTricycles->get(1)?->id ?? 2,
            'target_type'      => Tricycle::class,
            'target_id'        => $sampleTricycles->get(1)?->id ?? 2,
            'target_reference' => $t2Plate,
            'description'      => 'Re-inspection PASSED: Brake light replaced and standard muffler installed.',
            'channel'          => 'web',
            'old_values'       => json_encode(['inspection_status' => 'failed']),
            'new_values'       => json_encode(['inspection_status' => 'passed']),
            'metadata'         => json_encode(['reinspection' => true, 'cleared_by' => 'Officer Maria Santos']),
            'ip_address'       => '192.168.1.18',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(5)->setHour(16)->setMinute(0),
        ];

        // ---------------------------------------------------------------------
        // Module: FRANCHISE & RELEASING (BPLO & TMO)
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $bplo1?->id ?? 4,
            'actor_name'       => $bplo1?->name ?? 'Ana Reyes',
            'actor_role'       => 'bplo_staff',
            'module'           => 'franchise',
            'action'           => 'franchise.released',
            'event'            => 'franchise.released',
            'auditable_type'   => FranchiseScheme::class,
            'auditable_id'     => 1,
            'target_type'      => FranchiseScheme::class,
            'target_id'        => 1,
            'target_reference' => 'STK-2026-0089',
            'description'      => "Released official Motorized Tricycle Operator's Permit (MTOP) sticker STK-2026-0089.",
            'channel'          => 'web',
            'old_values'       => json_encode(['franchise_status' => 'approved_for_release', 'sticker_issued' => false]),
            'new_values'       => json_encode(['franchise_status' => 'active', 'sticker_issued' => true, 'valid_until' => $now->copy()->addYear()->toDateString()]),
            'metadata'         => json_encode(['or_number' => 'OR-2026-78411', 'amount_paid' => 450.00]),
            'ip_address'       => '192.168.1.22',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(10)->setHour(11)->setMinute(30),
        ];

        $records[] = [
            'user_id'          => $bplo2?->id ?? 5,
            'actor_name'       => $bplo2?->name ?? 'Carlos Mendoza',
            'actor_role'       => 'bplo_staff',
            'module'           => 'franchise',
            'action'           => 'franchise.renewed',
            'event'            => 'franchise.renewed',
            'auditable_type'   => FranchiseScheme::class,
            'auditable_id'     => 2,
            'target_type'      => FranchiseScheme::class,
            'target_id'        => 2,
            'target_reference' => 'STK-2026-0092',
            'description'      => 'Processed annual franchise renewal and issued updated validation certificate for 2026-2027.',
            'channel'          => 'web',
            'old_values'       => json_encode(['valid_until' => $now->copy()->subDays(5)->toDateString()]),
            'new_values'       => json_encode(['valid_until' => $now->copy()->addYear()->toDateString(), 'status' => 'renewed']),
            'metadata'         => json_encode(['renewal_cycle' => 'Annual', 'operator' => 'Danilo Cruz']),
            'ip_address'       => '192.168.1.25',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(4)->setHour(15)->setMinute(40),
        ];

        // ---------------------------------------------------------------------
        // Module: VIOLATIONS & APPEALS
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $tmo1?->id ?? 2,
            'actor_name'       => $tmo1?->name ?? 'Juan dela Cruz',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'violation',
            'action'           => 'violation.issued',
            'event'            => 'violation.issued',
            'auditable_type'   => Violation::class,
            'auditable_id'     => $sampleViolations->get(0)?->id ?? 1,
            'target_type'      => Violation::class,
            'target_id'        => $sampleViolations->get(0)?->id ?? 1,
            'target_reference' => $vio1Ref,
            'description'      => 'Issued violation citation for overcharging passenger fare on Poblacion to San Isidro route.',
            'channel'          => 'web',
            'old_values'       => null,
            'new_values'       => json_encode(['violation_code' => 'OVERCHARGING_FARE', 'penalty_fee' => 500.00, 'status' => 'pending']),
            'metadata'         => json_encode(['location' => 'J.P. Rizal St., Poblacion', 'passenger_complainant' => 'Anonymous']),
            'ip_address'       => '192.168.1.15',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(6)->setHour(9)->setMinute(20),
        ];

        $records[] = [
            'user_id'          => $tmo2?->id ?? 3,
            'actor_name'       => $tmo2?->name ?? 'Maria Santos',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'violation',
            'action'           => 'violation.payment_recorded',
            'event'            => 'violation.payment_recorded',
            'auditable_type'   => Violation::class,
            'auditable_id'     => $sampleViolations->get(0)?->id ?? 1,
            'target_type'      => Violation::class,
            'target_id'        => $sampleViolations->get(0)?->id ?? 1,
            'target_reference' => $vio1Ref,
            'description'      => 'Recorded penalty payment of ₱500.00 at TMO Treasury Cashier. Citation cleared.',
            'channel'          => 'web',
            'old_values'       => json_encode(['status' => 'pending', 'paid_at' => null]),
            'new_values'       => json_encode(['status' => 'settled', 'paid_at' => $now->copy()->subDays(2)->toDateTimeString()]),
            'metadata'         => json_encode(['official_receipt' => 'OR-TMO-99412', 'amount' => 500.00]),
            'ip_address'       => '192.168.1.18',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(2)->setHour(10)->setMinute(15),
        ];

        // ---------------------------------------------------------------------
        // Module: USER MANAGEMENT
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $admin?->id ?? 1,
            'actor_name'       => $admin?->name ?? 'System Administrator',
            'actor_role'       => 'admin',
            'module'           => 'user_management',
            'action'           => 'staff.created',
            'event'            => 'staff.created',
            'auditable_type'   => User::class,
            'auditable_id'     => $tmo2?->id ?? 3,
            'target_type'      => User::class,
            'target_id'        => $tmo2?->id ?? 3,
            'target_reference' => 'TMO-2026-004',
            'description'      => 'Provisioned new municipal staff account for Traffic Enforcer Maria Santos.',
            'channel'          => 'web',
            'old_values'       => null,
            'new_values'       => json_encode(['name' => 'Maria Santos', 'role' => 'tmo_personnel', 'position' => 'Traffic Enforcer II', 'is_active' => true]),
            'metadata'         => json_encode(['authorized_by' => 'Office of the Mayor']),
            'ip_address'       => '192.168.1.10',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(20)->setHour(8)->setMinute(30),
        ];

        $records[] = [
            'user_id'          => $admin?->id ?? 1,
            'actor_name'       => $admin?->name ?? 'System Administrator',
            'actor_role'       => 'admin',
            'module'           => 'user_management',
            'action'           => 'staff.updated',
            'event'            => 'staff.updated',
            'auditable_type'   => User::class,
            'auditable_id'     => $tmo1?->id ?? 2,
            'target_type'      => User::class,
            'target_id'        => $tmo1?->id ?? 2,
            'target_reference' => 'TMO-2026-002',
            'description'      => 'Updated personnel rank and assigned zone responsibility to Central Enforcement Sector.',
            'channel'          => 'web',
            'old_values'       => json_encode(['position' => 'Traffic Enforcer I']),
            'new_values'       => json_encode(['position' => 'Senior Field Supervisor']),
            'metadata'         => json_encode(['department' => 'TMO Field Enforcement Division']),
            'ip_address'       => '192.168.1.10',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(14)->setHour(16)->setMinute(10),
        ];

        // ---------------------------------------------------------------------
        // Module: DRIVER APPLICATIONS
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $driver?->id,
            'actor_name'       => $driver?->name ?? 'Danilo Dela Torre',
            'actor_role'       => 'tricycle_driver',
            'module'           => 'application',
            'action'           => 'application.submitted',
            'event'            => 'application.submitted',
            'auditable_type'   => Application::class,
            'auditable_id'     => $sampleApps->get(2)?->id ?? 103,
            'target_type'      => Application::class,
            'target_id'        => $sampleApps->get(2)?->id ?? 103,
            'target_reference' => $app3Ref,
            'description'      => 'Submitted new franchise application with complete franchise documents via driver portal.',
            'channel'          => 'web',
            'old_values'       => null,
            'new_values'       => json_encode(['status' => 'submitted', 'zone' => 'Poblacion Zone 1']),
            'metadata'         => json_encode(['submission_channel' => 'Driver Web Portal']),
            'ip_address'       => '120.28.184.45',
            'user_agent'       => 'Mozilla/5.0 (Android; Mobile) Chrome/126.0.0.0',
            'created_at'       => $now->copy()->subDays(1)->setHour(14)->setMinute(5),
        ];

        // ---------------------------------------------------------------------
        // Module: REPORTS & ANALYTICS
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $tmo1?->id ?? 2,
            'actor_name'       => $tmo1?->name ?? 'Juan dela Cruz',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'reports',
            'action'           => 'report.exported_excel',
            'event'            => 'report.exported_excel',
            'auditable_type'   => null,
            'auditable_id'     => null,
            'target_type'      => null,
            'target_id'        => null,
            'target_reference' => 'TMO-REP-2026-09',
            'description'      => 'Exported Monthly Roadworthiness & Tricycle Safety Compliance Excel report.',
            'channel'          => 'web',
            'old_values'       => null,
            'new_values'       => null,
            'metadata'         => json_encode(['report' => 'inspection_compliance', 'period' => 'September 2026', 'records_count' => 128]),
            'ip_address'       => '192.168.1.15',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subDays(1)->setHour(17)->setMinute(10),
        ];

        // ---------------------------------------------------------------------
        // Module: TODAY ACTIONS (Fresh activity logs)
        // ---------------------------------------------------------------------
        $records[] = [
            'user_id'          => $tmo1?->id ?? 2,
            'actor_name'       => $tmo1?->name ?? 'Juan dela Cruz',
            'actor_role'       => 'tmo_personnel',
            'module'           => 'inspection',
            'action'           => 'inspection.passed',
            'event'            => 'inspection.passed',
            'auditable_type'   => Tricycle::class,
            'auditable_id'     => $sampleTricycles->get(2)?->id ?? 3,
            'target_type'      => Tricycle::class,
            'target_id'        => $sampleTricycles->get(2)?->id ?? 3,
            'target_reference' => $t3Plate,
            'description'      => 'Physical inspection verified and passed for annual renewal sticker issuance.',
            'channel'          => 'web',
            'old_values'       => json_encode(['inspection_status' => 'pending']),
            'new_values'       => json_encode(['inspection_status' => 'passed']),
            'metadata'         => json_encode(['verified_at' => $now->toDateTimeString(), 'unit_condition' => 'Excellent']),
            'ip_address'       => '192.168.1.15',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subHours(2),
        ];

        $records[] = [
            'user_id'          => $bplo1?->id ?? 4,
            'actor_name'       => $bplo1?->name ?? 'Ana Reyes',
            'actor_role'       => 'bplo_staff',
            'module'           => 'franchise',
            'action'           => 'franchise.released',
            'event'            => 'franchise.released',
            'auditable_type'   => FranchiseScheme::class,
            'auditable_id'     => 3,
            'target_type'      => FranchiseScheme::class,
            'target_id'        => 3,
            'target_reference' => 'STK-2026-0112',
            'description'      => 'Released MTOP Certificate and municipal identification sticker for franchise unit.',
            'channel'          => 'web',
            'old_values'       => json_encode(['status' => 'pending_releasing']),
            'new_values'       => json_encode(['status' => 'released', 'released_at' => $now->toDateTimeString()]),
            'metadata'         => json_encode(['processed_by' => 'Ana Reyes (BPLO)']),
            'ip_address'       => '192.168.1.22',
            'user_agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            'created_at'       => $now->copy()->subMinutes(35),
        ];

        // 3. Batch insert using raw DB query to bypass Eloquent immutability guard
        DB::table('audit_logs')->insert($records);

        $this->command->info('✅ Successfully cleared old audit logs and seeded ' . count($records) . ' realistic administrative activity logs!');
    }
}
