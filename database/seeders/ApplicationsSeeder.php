<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationStatusHistory;
use App\Models\ColorCodingScheme;
use App\Models\FranchiseScheme;
use App\Models\Inspection;
use App\Models\Operator;
use App\Models\Payment;
use App\Models\TodaZone;
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ApplicationsSeeder extends Seeder
{
    /**
     * Seed sample applications at different stages of the workflow pipeline.
     */
    public function run(): void
    {
        $tmo       = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first();
        $bplo      = User::where('email', 'bplo.areyes@trivora.gov.ph')->first();
        $admin     = User::where('role', 'admin')->first();

        // TODA Zones
        $todaBucana = TodaZone::where('code', 'TODA-BUCANA')->orWhere('name', 'TODA Bucana')->first();
        $todaBrgy10 = TodaZone::where('code', 'TODA-BRGY10')->orWhere('name', 'TODA Brgy. 10')->first();
        $todaBrgy8  = TodaZone::where('code', 'TODA-BRGY8')->orWhere('name', 'TODA Brgy. 8')->first();
        $todaBrgy4  = TodaZone::where('code', 'TODA-BRGY4')->orWhere('name', 'TODA Brgy. 4')->first();

        $op1       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.pramos@trivora.ph'))->first();
        $op2       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.jbautista@trivora.ph'))->first();
        $op3       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.evillanueva@trivora.ph'))->first();
        $op4       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.mclara@trivora.ph'))->first();
        $op5       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.rsantos@trivora.ph'))->first();

        // Additional driver accounts & operators for diverse physical inspection queue
        $userBen = User::firstOrCreate(
            ['email' => 'driver.bcruz@trivora.ph'],
            [
                'name'      => 'Ben Cruz',
                'password'  => \Illuminate\Support\Facades\Hash::make('Driver@123'),
                'role'      => 'tricycle_driver',
                'is_active' => true,
            ]
        );
        $opBen = Operator::firstOrCreate(
            ['contact_number' => '091700000003'],
            [
                'user_id'                  => $userBen->id,
                'first_name'               => 'Ben',
                'middle_name'              => 'Santos',
                'last_name'                => 'Cruz',
                'address'                  => '14 Rizal St., Brgy. 10',
                'barangay'                 => 'Barangay 10',
                'date_of_birth'            => '1984-04-12',
                'license_number'           => 'N01-84-112233',
                'license_expiry_date'      => '2028-04-12',
                'license_restriction_code' => '1,2',
                'toda_id'                  => $todaBrgy10?->id,
            ]
        );
        if (! $opBen->user_id) {
            $opBen->update(['user_id' => $userBen->id]);
        }

        $userCarla = User::firstOrCreate(
            ['email' => 'driver.csantos@trivora.ph'],
            [
                'name'      => 'Carla Santos',
                'password'  => \Illuminate\Support\Facades\Hash::make('Driver@123'),
                'role'      => 'tricycle_driver',
                'is_active' => true,
            ]
        );
        $opCarla = Operator::firstOrCreate(
            ['contact_number' => '091700000004'],
            [
                'user_id'                  => $userCarla->id,
                'first_name'               => 'Carla',
                'middle_name'              => 'Mae',
                'last_name'                => 'Santos',
                'address'                  => '28 Bonifacio St., Brgy. 8',
                'barangay'                 => 'Barangay 8',
                'date_of_birth'            => '1992-09-18',
                'license_number'           => 'N01-92-445566',
                'license_expiry_date'      => '2027-09-18',
                'license_restriction_code' => '1',
                'toda_id'                  => $todaBrgy8?->id,
            ]
        );
        if (! $opCarla->user_id) {
            $opCarla->update(['user_id' => $userCarla->id]);
        }

        $userDante = User::firstOrCreate(
            ['email' => 'driver.dlopez@trivora.ph'],
            [
                'name'      => 'Dante Lopez',
                'password'  => \Illuminate\Support\Facades\Hash::make('Driver@123'),
                'role'      => 'tricycle_driver',
                'is_active' => true,
            ]
        );
        $opDante = Operator::firstOrCreate(
            ['contact_number' => '091700000005'],
            [
                'user_id'                  => $userDante->id,
                'first_name'               => 'Dante',
                'middle_name'              => 'Reyes',
                'last_name'                => 'Lopez',
                'address'                  => '5 Mabini St., Brgy. 4',
                'barangay'                 => 'Barangay 4',
                'date_of_birth'            => '1980-01-25',
                'license_number'           => 'N01-80-778899',
                'license_expiry_date'      => '2026-01-25',
                'license_restriction_code' => '1,2',
                'toda_id'                  => $todaBrgy4?->id,
            ]
        );
        if (! $opDante->user_id) {
            $opDante->update(['user_id' => $userDante->id]);
        }

        $userElena = User::firstOrCreate(
            ['email' => 'driver.egarcia@trivora.ph'],
            [
                'name'      => 'Elena Garcia',
                'password'  => \Illuminate\Support\Facades\Hash::make('Driver@123'),
                'role'      => 'tricycle_driver',
                'is_active' => true,
            ]
        );
        $opElena = Operator::firstOrCreate(
            ['contact_number' => '091700000006'],
            [
                'user_id'                  => $userElena->id,
                'first_name'               => 'Elena',
                'middle_name'              => 'Torres',
                'last_name'                => 'Garcia',
                'address'                  => '92 Seaside Blvd., Bucana',
                'barangay'                 => 'Bucana',
                'date_of_birth'            => '1989-11-30',
                'license_number'           => 'N01-89-332211',
                'license_expiry_date'      => '2028-11-30',
                'license_restriction_code' => '1,2',
                'toda_id'                  => $todaBucana?->id,
            ]
        );
        if (! $opElena->user_id) {
            $opElena->update(['user_id' => $userElena->id]);
        }

        $tri1      = Tricycle::where('plate_number', 'AAA-1234')->first();
        $tri2      = Tricycle::where('plate_number', 'BBB-5678')->first();
        $tri3      = Tricycle::where('plate_number', 'CCC-9012')->first();
        $tri4      = Tricycle::where('plate_number', 'DDD-3456')->first();
        $tri5      = Tricycle::where('plate_number', 'EEE-7890')->first();
        $tri10     = Tricycle::where('plate_number', 'KKK-1122')->first();
        $tri11     = Tricycle::where('plate_number', 'LLL-3344')->first();
        $tri12     = Tricycle::where('plate_number', 'MMM-5566')->first();
        $tri13     = Tricycle::where('plate_number', 'NNN-7788')->first();
        $tri14     = Tricycle::where('plate_number', 'PPP-9900')->first();
        $tri15     = Tricycle::where('plate_number', 'QQQ-1230')->first();
        $tri16     = Tricycle::where('plate_number', 'RRR-4560')->first();
        $tri17     = Tricycle::where('plate_number', 'SSS-7890')->first();
        $tri18     = Tricycle::where('plate_number', 'TTT-0123')->first();
        $tri19     = Tricycle::where('plate_number', 'VVV-3456')->first();
        $tri20     = Tricycle::where('plate_number', 'WWW-6789')->first();
        $tri21     = Tricycle::where('plate_number', 'XXX-9012')->first();
        $tri22     = Tricycle::where('plate_number', 'YYY-2345')->first();
        $tri23     = Tricycle::where('plate_number', 'ZZZ-5678')->first();
        $tri24     = Tricycle::where('plate_number', 'ABC-8901')->first();
        $tri25     = Tricycle::where('plate_number', 'XYZ-2346')->first();

        $redScheme    = ColorCodingScheme::where('name', 'Red')->first();
        $blueScheme   = ColorCodingScheme::where('name', 'Blue')->first();
        $yellowScheme = ColorCodingScheme::where('name', 'Yellow')->first();
        $greenScheme  = ColorCodingScheme::where('name', 'Green')->first();

        // -----------------------------------------------------------------
        // APPLICATION 1: Pedro Ramos — COMPLETED (franchise issued)
        // -----------------------------------------------------------------
        if ($op1 && $tri1 && ! Application::where('reference_number', 'APP-2026-00001')->exists()) {
            $app1 = Application::create([
                'reference_number' => 'APP-2026-00001',
                'operator_id'      => $op1->id,
                'tricycle_id'      => $tri1->id,
                'application_type' => 'new',
                'current_step'     => 6,
                'status'           => 'completed',
                'sticker_number'   => 'STK-2026-0001',
                'submitted_at'     => now()->subDays(30),
                'completed_at'     => now()->subDays(10),
                'remarks'          => 'All requirements complete. Franchise sticker released.',
            ]);

            // Documents
            $this->seedDocuments($app1, 'approved', $tmo);

            // Status history
            $this->seedStatusHistory($app1, $op1->user, $tmo, $bplo, $admin);

            // Inspection (passed)
            Inspection::create([
                'application_id'    => $app1->id,
                'inspector_id'      => $tmo?->id,
                'attempt_number'    => 1,
                'inspection_date'   => now()->subDays(25)->toDateString(),
                'inspection_time'   => '09:30:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Vehicle in excellent condition. All systems operational.',
            ]);

            // Payment (Municipal Cashier payment verified by BPLO)
            Payment::create([
                'application_id'          => $app1->id,
                'processed_by'            => $bplo?->id ?? $admin?->id,
                'official_receipt_number' => 'OR-2026-000001',
                'amount'                  => 750.00,
                'payment_method'          => 'cash',
                'payment_date'            => now()->subDays(15)->toDateString(),
                'payment_time'            => '10:45:00',
                'is_verified'             => true,
                'verified_at'             => now()->subDays(15),
                'notes'                   => 'Municipal Cashier Official Receipt verified by BPLO.',
            ]);

            // Seed expired franchise scheme (FS-2023-00001) for Pedro Ramos to demonstrate expired status
            if ($redScheme && $bplo) {
                FranchiseScheme::firstOrCreate(
                    ['franchise_number' => 'FS-2023-00001'],
                    [
                        'application_id'         => $app1->id,
                        'tricycle_id'            => $tri1->id,
                        'color_coding_scheme_id' => $redScheme->id,
                        'issued_by'              => $bplo->id,
                        'issue_date'             => now()->subYears(3)->subDays(30)->toDateString(),
                        'expiry_date'            => now()->subDays(30)->toDateString(),
                        'is_active'              => true, // Active permit record that is now past expiry date
                        'notes'                  => 'Franchise permit issued in 2023 (Expired 30 days ago).',
                    ]
                );

                $tri1->update(['status' => 'active']);
            }
        }

        // -----------------------------------------------------------------
        // APPLICATION 2: Jose Bautista — PENDING PAYMENT
        // -----------------------------------------------------------------
        if ($op2 && $tri2 && ! Application::where('reference_number', 'APP-2026-00002')->exists()) {
            $app2 = Application::create([
                'reference_number' => 'APP-2026-00002',
                'operator_id'      => $op2->id,
                'tricycle_id'      => $tri2->id,
                'application_type' => 'new',
                'current_step'     => 4,
                'status'           => 'pending_payment',
                'submitted_at'     => now()->subDays(15),
                'completed_at'     => null,
                'remarks'          => null,
            ]);

            $this->seedDocuments($app2, 'approved', $tmo);

            ApplicationStatusHistory::create([
                'application_id' => $app2->id,
                'changed_by'     => $op2->user_id,
                'from_status'    => null,
                'to_status'      => 'pending_review',
                'from_step'      => null,
                'to_step'        => 1,
                'notes'          => 'Application submitted by operator.',
                'created_at'     => now()->subDays(15),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app2->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_review',
                'to_status'      => 'pending_inspection',
                'from_step'      => 1,
                'to_step'        => 2,
                'notes'          => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'     => now()->subDays(12),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app2->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_inspection',
                'to_status'      => 'pending_payment',
                'from_step'      => 3,
                'to_step'        => 4,
                'notes'          => 'Tricycle passed physical inspection. Payment Ticket issued.',
                'created_at'     => now()->subDays(8),
            ]);

            Inspection::create([
                'application_id'    => $app2->id,
                'inspector_id'      => $tmo?->id,
                'attempt_number'    => 1,
                'inspection_date'   => now()->subDays(8)->toDateString(),
                'inspection_time'   => '14:00:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Unit passed all checklist items.',
            ]);
        }

        // -----------------------------------------------------------------
        // APPLICATION 3: Ernesto Villanueva — PENDING INSPECTION
        // -----------------------------------------------------------------
        if ($op3 && $tri3) {
            $app3 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00003'],
                [
                    'operator_id'      => $op3->id,
                    'tricycle_id'      => $tri3->id,
                    'application_type' => 'new',
                    'current_step'     => 3,
                    'status'           => 'pending_inspection',
                    'submitted_at'     => now()->subDays(5),
                    'completed_at'     => null,
                    'remarks'          => null,
                ]
            );

            Payment::where('application_id', $app3->id)->delete();
            Inspection::where('application_id', $app3->id)->delete();

            $this->seedDocuments($app3, 'approved', $tmo);

            ApplicationStatusHistory::updateOrCreate(
                ['application_id' => $app3->id, 'to_status' => 'pending_review'],
                [
                    'changed_by'     => $op3->user_id,
                    'from_status'    => null,
                    'from_step'      => null,
                    'to_step'        => 1,
                    'notes'          => 'Application submitted by operator.',
                    'created_at'     => now()->subDays(5),
                ]
            );
            ApplicationStatusHistory::updateOrCreate(
                ['application_id' => $app3->id, 'to_status' => 'pending_inspection'],
                [
                    'changed_by'     => $tmo?->id,
                    'from_status'    => 'pending_review',
                    'from_step'      => 1,
                    'to_step'        => 2,
                    'notes'          => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                    'created_at'     => now()->subDays(2),
                ]
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 4: Maria Clara — REJECTED (document validation failed)
        // -----------------------------------------------------------------
        if ($op4 && $tri4 && ! Application::where('reference_number', 'APP-2026-00004')->exists()) {
            $app4 = Application::create([
                'reference_number' => 'APP-2026-00004',
                'operator_id'      => $op4->id,
                'tricycle_id'      => $tri4->id,
                'application_type' => 'new',
                'current_step'     => 1,
                'status'           => 'rejected',
                'submitted_at'     => now()->subDays(6),
                'completed_at'     => null,
                'remarks'          => 'Requirements rejected. Driver\'s license copy is blurry.',
            ]);

            // Seed documents with 1 rejected doc
            $this->seedDocuments($app4, 'approved', $tmo);

            // Explicitly reject the driver's license
            $licenseDoc = $app4->documents()->where('document_type', 'drivers_license')->first();
            if ($licenseDoc) {
                $licenseDoc->update([
                    'review_status'    => 'rejected',
                    'rejection_reason' => 'The uploaded Driver\'s License photo is blurry and illegible. Please upload a clear scan.',
                ]);
            }

            ApplicationStatusHistory::create([
                'application_id' => $app4->id,
                'changed_by'     => $op4->user_id,
                'from_status'    => null,
                'to_status'      => 'pending_review',
                'from_step'      => null,
                'to_step'        => 1,
                'notes'          => 'Application submitted.',
                'created_at'     => now()->subDays(6),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app4->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_review',
                'to_status'      => 'rejected',
                'from_step'      => 1,
                'to_step'        => 1,
                'notes'          => 'Driver\'s License document rejected due to blurriness.',
                'created_at'     => now()->subDays(4),
            ]);
        }

        // -----------------------------------------------------------------
        // APPLICATION 5: Ricardo Santos — FAILED INSPECTION (safety defects)
        // -----------------------------------------------------------------
        if ($op5 && $tri5) {
            $app5 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00005'],
                [
                    'operator_id'      => $op5->id,
                    'tricycle_id'      => $tri5->id,
                    'application_type' => 'new',
                    'current_step'     => 3,
                    'status'           => 'failed_inspection',
                    'submitted_at'     => now()->subDays(10),
                    'completed_at'     => null,
                    'remarks'          => 'Physical inspection failed. Safety defects detected.',
                ]
            );

            Payment::where('application_id', $app5->id)->delete();

            $this->seedDocuments($app5, 'approved', $tmo);

            ApplicationStatusHistory::updateOrCreate(
                ['application_id' => $app5->id, 'to_status' => 'pending_review'],
                [
                    'changed_by'     => $op5->user_id,
                    'from_status'    => null,
                    'from_step'      => null,
                    'to_step'        => 1,
                    'notes'          => 'Application submitted.',
                    'created_at'     => now()->subDays(10),
                ]
            );
            ApplicationStatusHistory::updateOrCreate(
                ['application_id' => $app5->id, 'to_status' => 'pending_inspection'],
                [
                    'changed_by'     => $tmo?->id,
                    'from_status'    => 'pending_review',
                    'from_step'      => 1,
                    'to_step'        => 2,
                    'notes'          => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                    'created_at'     => now()->subDays(8),
                ]
            );
            ApplicationStatusHistory::updateOrCreate(
                ['application_id' => $app5->id, 'to_status' => 'failed_inspection'],
                [
                    'changed_by'     => $tmo?->id,
                    'from_status'    => 'pending_inspection',
                    'from_step'      => 3,
                    'to_step'        => 3,
                    'notes'          => 'Physical inspection failed: safety equipment and brakes defects.',
                    'created_at'     => now()->subDays(5),
                ]
            );

            // Save inspection report with details
            Inspection::updateOrCreate(
                ['application_id' => $app5->id, 'attempt_number' => 1],
                [
                    'inspector_id'      => $tmo?->id,
                    'inspection_date'   => now()->subDays(5)->toDateString(),
                    'inspection_time'   => '10:00:00',
                    'location_address'  => 'TMO Compound, Municipal Hall',
                    'result'            => 'failed',
                    'safety_equipment'  => false,
                    'brakes_steering'   => false,
                    'lights_reflectors' => true,
                    'tires_suspension'  => true,
                    'emissions_test'    => true,
                    'license_toda_docs' => true,
                    'inspector_notes'   => json_encode([
                        'statuses' => [
                            'headlights' => 'passed',
                            'taillights' => 'passed',
                            'signals'    => 'passed',
                            'horn'       => 'passed',
                            'mirrors'    => 'failed',
                            'brakes'     => 'failed',
                            'plate'      => 'passed',
                            'sidecar'    => 'passed',
                        ],
                        'defects' => [
                            'mirrors' => 'Missing right-side mirror.',
                            'brakes'  => 'Front brake wire loose and unresponsive.',
                        ]
                    ]),
                ]
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 6: Ernesto Villanueva — AWAITING TMO FINAL CONFIRMATION
        // -----------------------------------------------------------------
        $tri6 = Tricycle::where('plate_number', 'FFF-2468')->first();
        if ($op3 && $tri6) {
            $app6 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00006'],
                [
                    'operator_id'      => $op3->id,
                    'tricycle_id'      => $tri6->id,
                    'application_type' => 'new',
                    'current_step'     => 5,
                    'status'           => 'awaiting_tmo_confirmation',
                    'sticker_number'   => 'STK-2026-0512',
                    'submitted_at'     => now()->subDays(12),
                    'completed_at'     => null,
                    'remarks'          => 'Sticker and coding plate released by BPLO. Returned to TMO for tracking setup and activation.',
                ]
            );

            $this->seedDocuments($app6, 'approved', $tmo);

            ApplicationStatusHistory::create([
                'application_id' => $app6->id,
                'changed_by'     => $op3->user_id,
                'from_status'    => null,
                'to_status'      => 'pending_review',
                'from_step'      => null,
                'to_step'        => 1,
                'notes'          => 'Application submitted by operator.',
                'created_at'     => now()->subDays(12),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app6->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_review',
                'to_status'      => 'pending_inspection',
                'from_step'      => 1,
                'to_step'        => 2,
                'notes'          => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'     => now()->subDays(10),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app6->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_inspection',
                'to_status'      => 'pending_payment',
                'from_step'      => 3,
                'to_step'        => 4,
                'notes'          => 'Tricycle passed physical roadworthiness inspection. Payment Ticket issued.',
                'created_at'     => now()->subDays(7),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app6->id,
                'changed_by'     => $bplo?->id,
                'from_status'    => 'pending_payment',
                'to_status'      => 'payment_verified',
                'from_step'      => 4,
                'to_step'        => 5,
                'notes'          => 'Municipal Cashier Official Receipt verified by BPLO.',
                'created_at'     => now()->subDays(4),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app6->id,
                'changed_by'     => $bplo?->id,
                'from_status'    => 'payment_verified',
                'to_status'      => 'awaiting_tmo_confirmation',
                'from_step'      => 5,
                'to_step'        => 5,
                'notes'          => 'Franchise sticker STK-2026-0512 released by BPLO. Driver instructed to return to TMO for GPS configuration.',
                'created_at'     => now()->subDays(2),
            ]);

            Inspection::updateOrCreate(
                ['application_id' => $app6->id],
                [
                    'inspector_id'      => $tmo?->id,
                    'attempt_number'    => 1,
                    'inspection_date'   => now()->subDays(7)->toDateString(),
                    'inspection_time'   => '11:00:00',
                    'location_address'  => 'TMO Compound, Municipal Hall',
                    'result'            => 'passed',
                    'safety_equipment'  => true,
                    'brakes_steering'   => true,
                    'lights_reflectors' => true,
                    'tires_suspension'  => true,
                    'emissions_test'    => true,
                    'license_toda_docs' => true,
                    'inspector_notes'   => 'Vehicle cleared all roadworthiness inspection requirements.',
                ]
            );

            Payment::updateOrCreate(
                ['application_id' => $app6->id],
                [
                    'processed_by'            => $bplo?->id ?? $admin?->id,
                    'official_receipt_number' => 'OR-2026-000512',
                    'amount'                  => 750.00,
                    'payment_method'          => 'cash',
                    'payment_date'            => now()->subDays(4)->toDateString(),
                    'payment_time'            => '14:30:00',
                    'is_verified'             => true,
                    'verified_at'             => now()->subDays(4),
                    'notes'                   => 'Municipal Cashier Official Receipt verified by BPLO.',
                ]
            );

            if ($blueScheme && $bplo) {
                FranchiseScheme::updateOrCreate(
                    ['tricycle_id' => $tri6->id],
                    [
                        'application_id'         => $app6->id,
                        'franchise_number'       => $tri6->coding_scheme_number ?: '0512',
                        'color_coding_scheme_id' => $blueScheme->id,
                        'issued_by'              => $bplo->id,
                        'issue_date'             => now()->subDays(2)->toDateString(),
                        'expiry_date'            => now()->addYears(3)->toDateString(),
                        'is_active'              => false, // Inactive pending TMO final confirmation
                        'notes'                  => 'Coding #0512 assigned by BPLO. Awaiting TMO Final Confirmation.',
                    ]
                );
            }
        }

        // -----------------------------------------------------------------
        // APPLICATION 7: Pedro Ramos — PENDING REVIEW (fresh submission, second unit)
        // -----------------------------------------------------------------
        $tri7 = Tricycle::where('plate_number', 'GGG-1357')->first();
        if ($op1 && $tri7 && ! Application::where('reference_number', 'APP-2026-00007')->exists()) {
            $app7 = Application::create([
                'reference_number' => 'APP-2026-00007',
                'operator_id'      => $op1->id,
                'tricycle_id'      => $tri7->id,
                'application_type' => 'new',
                'current_step'     => 1,
                'status'           => 'pending_review',
                'submitted_at'     => now()->subDays(2),
                'completed_at'     => null,
                'remarks'          => null,
            ]);

            $this->seedDocuments($app7, 'pending', null);

            ApplicationStatusHistory::create([
                'application_id' => $app7->id,
                'changed_by'     => $op1->user_id,
                'from_status'    => null,
                'to_status'      => 'pending_review',
                'from_step'      => null,
                'to_step'        => 1,
                'notes'          => 'Application submitted by operator. Awaiting TMO document review.',
                'created_at'     => now()->subDays(2),
            ]);
        }

        // -----------------------------------------------------------------
        // APPLICATION 8: Ricardo Santos — PENDING REVIEW (fresh submission, second unit)
        // -----------------------------------------------------------------
        $tri8 = Tricycle::where('plate_number', 'HHH-9876')->first();
        if ($op5 && $tri8 && ! Application::where('reference_number', 'APP-2026-00008')->exists()) {
            $app8 = Application::create([
                'reference_number' => 'APP-2026-00008',
                'operator_id'      => $op5->id,
                'tricycle_id'      => $tri8->id,
                'application_type' => 'new',
                'current_step'     => 1,
                'status'           => 'pending_review',
                'submitted_at'     => now()->subHours(6),
                'completed_at'     => null,
                'remarks'          => null,
            ]);

            $this->seedDocuments($app8, 'pending', null);

            ApplicationStatusHistory::create([
                'application_id' => $app8->id,
                'changed_by'     => $op5->user_id,
                'from_status'    => null,
                'to_status'      => 'pending_review',
                'from_step'      => null,
                'to_step'        => 1,
                'notes'          => 'Application submitted by operator. Awaiting TMO document review.',
                'created_at'     => now()->subHours(6),
            ]);
        }

        // -----------------------------------------------------------------
        // APPLICATION 9: Jose Bautista — PENDING INSPECTION
        // -----------------------------------------------------------------
        $tri9 = Tricycle::where('plate_number', 'JJJ-5432')->first();
        if ($op2 && $tri9) {
            $app9 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00009'],
                [
                    'operator_id'      => $op2->id,
                    'tricycle_id'      => $tri9->id,
                    'application_type' => 'new',
                    'current_step'     => 3,
                    'status'           => 'pending_inspection',
                    'submitted_at'     => now()->subDays(3),
                    'completed_at'     => null,
                    'remarks'          => null,
                ]
            );

            Payment::where('application_id', $app9->id)->delete();
            Inspection::where('application_id', $app9->id)->delete();

            $this->seedDocuments($app9, 'approved', $tmo);

            ApplicationStatusHistory::updateOrCreate(
                ['application_id' => $app9->id, 'to_status' => 'pending_review'],
                [
                    'changed_by'     => $op2->user_id,
                    'from_status'    => null,
                    'from_step'      => null,
                    'to_step'        => 1,
                    'notes'          => 'Application submitted by operator.',
                    'created_at'     => now()->subDays(3),
                ]
            );
            ApplicationStatusHistory::updateOrCreate(
                ['application_id' => $app9->id, 'to_status' => 'pending_inspection'],
                [
                    'changed_by'     => $tmo?->id,
                    'from_status'    => 'pending_review',
                    'from_step'      => 1,
                    'to_step'        => 2,
                    'notes'          => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                    'created_at'     => now(),
                ]
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 10: Ben Cruz — PENDING INSPECTION (Scheduled) [TODA Brgy. 10]
        // -----------------------------------------------------------------
        if ($opBen && $tri10) {
            $tri10->update(['operator_id' => $opBen->id]);
            $this->seedPendingInspectionApp('APP-2026-00010', $opBen, $tri10, 'new', 4, 2, $tmo);
        }

        // -----------------------------------------------------------------
        // APPLICATION 11: Carla Santos — PENDING INSPECTION (Scheduled) [TODA Brgy. 8]
        // -----------------------------------------------------------------
        if ($opCarla && $tri11) {
            $tri11->update(['operator_id' => $opCarla->id]);
            $this->seedPendingInspectionApp('APP-2026-00011', $opCarla, $tri11, 'renewal', 3, 1, $tmo);
        }

        // -----------------------------------------------------------------
        // APPLICATION 12: Dante Lopez — FAILED INSPECTION (Needs Re-inspection) [TODA Brgy. 4]
        // -----------------------------------------------------------------
        if ($opDante && $tri12) {
            $tri12->update(['operator_id' => $opDante->id]);
            $this->seedFailedInspectionApp(
                'APP-2026-00012',
                $opDante,
                $tri12,
                'renewal',
                6,
                4,
                2,
                [
                    'headlights' => 'passed',
                    'taillights' => 'failed',
                    'signals'    => 'passed',
                    'horn'       => 'passed',
                    'mirrors'    => 'passed',
                    'brakes'     => 'passed',
                    'plate'      => 'failed',
                    'sidecar'    => 'passed',
                ],
                [
                    'taillights' => 'Brake light not responding upon actuation.',
                    'plate'      => 'Plate number loose or hanging.',
                ],
                $tmo
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 13: Elena Garcia — PENDING INSPECTION (Scheduled) [TODA Bucana]
        // -----------------------------------------------------------------
        if ($opElena && $tri13) {
            $tri13->update(['operator_id' => $opElena->id]);
            $this->seedPendingInspectionApp('APP-2026-00013', $opElena, $tri13, 'new', 2, 0, $tmo);
        }

        // -----------------------------------------------------------------
        // APPLICATION 14: Ben Cruz — FAILED INSPECTION (Needs Re-inspection) [TODA Brgy. 10]
        // -----------------------------------------------------------------
        if ($opBen && $tri14) {
            $tri14->update(['operator_id' => $opBen->id]);
            $this->seedFailedInspectionApp(
                'APP-2026-00014',
                $opBen,
                $tri14,
                'new',
                7,
                5,
                3,
                [
                    'headlights' => 'passed',
                    'taillights' => 'passed',
                    'signals'    => 'failed',
                    'horn'       => 'failed',
                    'mirrors'    => 'passed',
                    'brakes'     => 'passed',
                    'plate'      => 'passed',
                    'sidecar'    => 'passed',
                ],
                [
                    'horn'    => 'Weak or muffled sound from warning horn.',
                    'signals' => 'Left flasher not blinking on front or rear.',
                ],
                $tmo
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 15: Carla Santos — PENDING INSPECTION (Scheduled) [TODA Brgy. 8]
        // -----------------------------------------------------------------
        if ($opCarla && $tri15) {
            $tri15->update(['operator_id' => $opCarla->id]);
            $this->seedPendingInspectionApp('APP-2026-00015', $opCarla, $tri15, 'renewal', 2, 0, $tmo);
        }

        // -----------------------------------------------------------------
        // APPLICATION 16: Dante Lopez — PENDING INSPECTION (Scheduled) [TODA Brgy. 4]
        // -----------------------------------------------------------------
        if ($opDante && $tri16) {
            $tri16->update(['operator_id' => $opDante->id]);
            $this->seedPendingInspectionApp('APP-2026-00016', $opDante, $tri16, 'new', 3, 1, $tmo);
        }

        // -----------------------------------------------------------------
        // APPLICATION 17: Elena Garcia — FAILED INSPECTION (Needs Re-inspection) [TODA Bucana]
        // -----------------------------------------------------------------
        if ($opElena && $tri17) {
            $tri17->update(['operator_id' => $opElena->id]);
            $this->seedFailedInspectionApp(
                'APP-2026-00017',
                $opElena,
                $tri17,
                'renewal',
                5,
                3,
                1,
                [
                    'headlights' => 'passed',
                    'taillights' => 'passed',
                    'signals'    => 'passed',
                    'horn'       => 'passed',
                    'mirrors'    => 'failed',
                    'brakes'     => 'passed',
                    'plate'      => 'passed',
                    'sidecar'    => 'failed',
                ],
                [
                    'sidecar' => 'Loose passenger canopy/roof structure.',
                    'mirrors' => 'Cracked/shattered rearview mirror glass.',
                ],
                $tmo
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 18: Jose Bautista — PENDING INSPECTION (Scheduled) [TODA Brgy. 10]
        // -----------------------------------------------------------------
        if ($op2 && $tri18) {
            $tri18->update(['operator_id' => $op2->id]);
            $this->seedPendingInspectionApp('APP-2026-00018', $op2, $tri18, 'renewal', 4, 1, $tmo);
        }

        // -----------------------------------------------------------------
        // APPLICATION 19: Ernesto Villanueva — FAILED INSPECTION (Needs Re-inspection) [TODA Brgy. 8]
        // -----------------------------------------------------------------
        if ($op3 && $tri19) {
            $tri19->update(['operator_id' => $op3->id]);
            $this->seedFailedInspectionApp(
                'APP-2026-00019',
                $op3,
                $tri19,
                'renewal',
                8,
                5,
                2,
                [
                    'headlights' => 'failed',
                    'taillights' => 'passed',
                    'signals'    => 'passed',
                    'horn'       => 'passed',
                    'mirrors'    => 'passed',
                    'brakes'     => 'failed',
                    'plate'      => 'passed',
                    'sidecar'    => 'passed',
                ],
                [
                    'headlights' => 'Busted headlight bulb on low beam.',
                    'brakes'     => 'Excessively loose drive chain and weak brake tension.',
                ],
                $tmo
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 20: Pedro Ramos — PENDING INSPECTION (Scheduled) [TODA Brgy. 4]
        // -----------------------------------------------------------------
        if ($op1 && $tri20) {
            $tri20->update(['operator_id' => $op1->id]);
            $this->seedPendingInspectionApp('APP-2026-00020', $op1, $tri20, 'new', 2, 0, $tmo);
        }

        // -----------------------------------------------------------------
        // APPLICATION 21: Ben Cruz — AWAITING TMO CONFIRMATION [TODA Bucana]
        // -----------------------------------------------------------------
        if ($opBen && $tri21) {
            $tri21->update(['operator_id' => $opBen->id]);
            $this->seedAwaitingConfirmationApp(
                'APP-2026-00021',
                $opBen,
                $tri21,
                'new',
                $blueScheme ?? $redScheme,
                $tmo,
                $bplo,
                $admin
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 22: Carla Santos — AWAITING TMO CONFIRMATION [TODA Brgy. 10]
        // -----------------------------------------------------------------
        if ($opCarla && $tri22) {
            $tri22->update(['operator_id' => $opCarla->id]);
            $this->seedAwaitingConfirmationApp(
                'APP-2026-00022',
                $opCarla,
                $tri22,
                'renewal',
                $blueScheme,
                $tmo,
                $bplo,
                $admin
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 23: Dante Lopez — AWAITING TMO CONFIRMATION [TODA Brgy. 8]
        // -----------------------------------------------------------------
        if ($opDante && $tri23) {
            $tri23->update(['operator_id' => $opDante->id]);
            $this->seedAwaitingConfirmationApp(
                'APP-2026-00023',
                $opDante,
                $tri23,
                'renewal',
                $yellowScheme ?? $redScheme,
                $tmo,
                $bplo,
                $admin
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 24: Elena Garcia — AWAITING TMO CONFIRMATION [TODA Brgy. 4]
        // -----------------------------------------------------------------
        if ($opElena && $tri24) {
            $tri24->update(['operator_id' => $opElena->id]);
            $this->seedAwaitingConfirmationApp(
                'APP-2026-00024',
                $opElena,
                $tri24,
                'new',
                $yellowScheme ?? $blueScheme,
                $tmo,
                $bplo,
                $admin
            );
        }

        // -----------------------------------------------------------------
        // BPLO RELEASING QUEUE APPLICATIONS (status = 'payment_verified')
        // Verified by BPLO, now awaiting body/plate number and sticker releasing
        // -----------------------------------------------------------------

        // APPLICATION 25: Elena Garcia [TODA Bucana]
        if ($opElena && $tri25) {
            $tri25->update(['operator_id' => $opElena->id]);
            $this->seedPaymentVerifiedApp(
                'APP-2026-00025',
                $opElena,
                $tri25,
                'new',
                'OR-2026-081294',
                5,
                1,
                $tmo,
                $bplo
            );
        }

        // APPLICATION 26: Ben Cruz [TODA Brgy. 10]
        $tri26 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-4819'],
            [
                'operator_id'   => $opBen?->id,
                'toda_zone_id'  => $todaBrgy10?->id,
                'make'          => 'Honda',
                'model'         => 'TMX 125',
                'year_model'    => 2023,
                'body_color'    => 'Blue/Silver',
                'body_type'     => 'Pass-Thru Sidecar',
                'engine_number' => 'ENG-HD-481920',
                'chassis_number'=> 'CHS-HD-481920',
                'or_number'     => 'OR-2026-04819',
                'cr_number'     => 'CR-2026-04819',
                'status'        => 'unregistered',
            ]
        );
        if ($opBen && $tri26) {
            $this->seedPaymentVerifiedApp(
                'APP-2026-00026',
                $opBen,
                $tri26,
                'renewal',
                'OR-2026-081305',
                6,
                3,
                $tmo,
                $bplo
            );
        }

        // APPLICATION 27: Carla Santos [TODA Brgy. 8]
        $tri27 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-7203'],
            [
                'operator_id'   => $opCarla?->id,
                'toda_zone_id'  => $todaBrgy8?->id,
                'make'          => 'Yamaha',
                'model'         => 'STX 125',
                'year_model'    => 2024,
                'body_color'    => 'Black/Red',
                'body_type'     => 'Pass-Thru Sidecar',
                'engine_number' => 'ENG-YM-720311',
                'chassis_number'=> 'CHS-YM-720311',
                'or_number'     => 'OR-2026-07203',
                'cr_number'     => 'CR-2026-07203',
                'status'        => 'unregistered',
            ]
        );
        if ($opCarla && $tri27) {
            $this->seedPaymentVerifiedApp(
                'APP-2026-00027',
                $opCarla,
                $tri27,
                'new',
                'OR-2026-081318',
                4,
                5,
                $tmo,
                $bplo
            );
        }

        // APPLICATION 28: Dante Lopez [TODA Brgy. 4]
        $tri28 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-9182'],
            [
                'operator_id'   => $opDante?->id,
                'toda_zone_id'  => $todaBrgy4?->id,
                'make'          => 'Kawasaki',
                'model'         => 'Barako 175',
                'year_model'    => 2023,
                'body_color'    => 'Green/White',
                'body_type'     => 'Pass-Thru Sidecar',
                'engine_number' => 'ENG-KW-918255',
                'chassis_number'=> 'CHS-KW-918255',
                'or_number'     => 'OR-2026-09182',
                'cr_number'     => 'CR-2026-09182',
                'status'        => 'unregistered',
            ]
        );
        if ($opDante && $tri28) {
            $this->seedPaymentVerifiedApp(
                'APP-2026-00028',
                $opDante,
                $tri28,
                'renewal',
                'OR-2026-081340',
                7,
                8,
                $tmo,
                $bplo
            );
        }

        // APPLICATION 29: Jose Bautista [TODA Brgy. 10]
        $tri29 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-5541'],
            [
                'operator_id'   => $op2?->id,
                'toda_zone_id'  => $todaBrgy10?->id,
                'make'          => 'Honda',
                'model'         => 'TMX Alpha',
                'year_model'    => 2024,
                'body_color'    => 'Yellow/Black',
                'body_type'     => 'Pass-Thru Sidecar',
                'engine_number' => 'ENG-HD-554109',
                'chassis_number'=> 'CHS-HD-554109',
                'or_number'     => 'OR-2026-05541',
                'cr_number'     => 'CR-2026-05541',
                'status'        => 'unregistered',
            ]
        );
        if ($op2 && $tri29) {
            $this->seedPaymentVerifiedApp(
                'APP-2026-00029',
                $op2,
                $tri29,
                'new',
                'OR-2026-081366',
                8,
                16,
                $tmo,
                $bplo
            );
        }

        // APPLICATION 30: Pedro Ramos [TODA Bucana]
        $tri30 = Tricycle::updateOrCreate(
            ['plate_number' => 'PLT-2390'],
            [
                'operator_id'   => $op1?->id,
                'toda_zone_id'  => $todaBucana?->id,
                'make'          => 'Suzuki',
                'model'         => 'GD 110',
                'year_model'    => 2023,
                'body_color'    => 'Violet/White',
                'body_type'     => 'Pass-Thru Sidecar',
                'engine_number' => 'ENG-SZ-239077',
                'chassis_number'=> 'CHS-SZ-239077',
                'or_number'     => 'OR-2026-02390',
                'cr_number'     => 'CR-2026-02390',
                'status'        => 'unregistered',
            ]
        );
        if ($op1 && $tri30) {
            $this->seedPaymentVerifiedApp(
                'APP-2026-00030',
                $op1,
                $tri30,
                'renewal',
                'OR-2026-081382',
                9,
                24,
                $tmo,
                $bplo
            );
        }

        $this->command->info('✔ Applications seeded (30 applications across all workflow stages including active physical inspection, releasing, and final confirmation queues).');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function seedPendingInspectionApp(
        string $refNumber,
        Operator $operator,
        Tricycle $tricycle,
        string $appType,
        int $subDaysSubmitted,
        int $subDaysApproved,
        ?User $tmo
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $refNumber],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 3,
                'status'           => 'pending_inspection',
                'submitted_at'     => now()->subDays($subDaysSubmitted),
                'completed_at'     => null,
                'remarks'          => null,
            ]
        );

        Payment::where('application_id', $app->id)->delete();
        Inspection::where('application_id', $app->id)->delete();

        $this->seedDocuments($app, 'approved', $tmo);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id ?? $tmo?->id ?? 1,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator with uploaded requirements.',
                'created_at'  => now()->subDays($subDaysSubmitted),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id ?? 1,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays($subDaysApproved),
            ]
        );

        return $app;
    }

    private function seedFailedInspectionApp(
        string $refNumber,
        Operator $operator,
        Tricycle $tricycle,
        string $appType,
        int $subDaysSubmitted,
        int $subDaysApproved,
        int $subDaysFailed,
        array $statuses,
        array $defects,
        ?User $tmo
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $refNumber],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 3,
                'status'           => 'failed_inspection',
                'submitted_at'     => now()->subDays($subDaysSubmitted),
                'completed_at'     => null,
                'remarks'          => 'Physical inspection failed. Safety defects detected.',
            ]
        );

        Payment::where('application_id', $app->id)->delete();

        $this->seedDocuments($app, 'approved', $tmo);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id ?? $tmo?->id ?? 1,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'          => 'Application submitted by operator.',
                'created_at'     => now()->subDays($subDaysSubmitted),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays($subDaysApproved),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'failed_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 3,
                'to_step'     => 3,
                'notes'       => 'Physical inspection failed: safety defects detected.',
                'created_at'  => now()->subDays($subDaysFailed),
            ]
        );

        Inspection::updateOrCreate(
            ['application_id' => $app->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays($subDaysFailed)->toDateString(),
                'inspection_time'   => '10:30:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'failed',
                'safety_equipment'  => !isset($defects['mirrors']) && !isset($defects['sidecar']),
                'brakes_steering'   => !isset($defects['brakes']),
                'lights_reflectors' => !isset($defects['headlights']) && !isset($defects['taillights']) && !isset($defects['signals']),
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => !isset($defects['plate']),
                'inspector_notes'   => json_encode([
                    'statuses' => $statuses,
                    'defects'  => $defects,
                ]),
            ]
        );

        return $app;
    }

    private function seedDocuments(Application $app, string $reviewStatus, ?User $reviewer): void
    {
        $types = [
            'drivers_license',
            'or_cr',
            'proof_of_residence',
            'toda_clearance',
            'photo_id',
        ];

        foreach ($types as $type) {
            ApplicationDocument::updateOrCreate(
                [
                    'application_id' => $app->id,
                    'document_type'  => $type,
                ],
                [
                    'file_name'        => Str::slug($type) . '_sample.pdf',
                    'file_path'        => 'documents/' . $app->reference_number . '/' . Str::slug($type) . '.pdf',
                    'file_size_kb'     => rand(80, 500),
                    'mime_type'        => 'application/pdf',
                    'review_status'    => $reviewStatus,
                    'reviewed_by'      => $reviewStatus !== 'pending' ? $reviewer?->id : null,
                    'reviewed_at'      => $reviewStatus !== 'pending' ? now()->subDays(rand(1, 5)) : null,
                    'rejection_reason' => null,
                ]
            );
        }
    }

    private function seedStatusHistory(
        Application $app,
        ?User $driver,
        ?User $tmo,
        ?User $bplo,
        ?User $admin
    ): void {
        $histories = [
            [
                'changed_by'  => $driver?->id,
                'from_status' => null,
                'to_status'   => 'pending_review',
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator with uploaded requirements.',
                'offset_days' => 30,
            ],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'to_status'   => 'pending_inspection',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'offset_days' => 27,
            ],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'to_status'   => 'pending_payment',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Physical inspection passed. Municipal Payment Ticket issued.',
                'offset_days' => 25,
            ],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'pending_payment',
                'to_status'   => 'payment_verified',
                'from_step'   => 4,
                'to_step'     => 5,
                'notes'       => 'Physical cashier Official Receipt verified by BPLO.',
                'offset_days' => 15,
            ],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'payment_verified',
                'to_status'   => 'awaiting_tmo_confirmation',
                'from_step'   => 5,
                'to_step'     => 5,
                'notes'       => 'Franchise sticker and coding plate released by BPLO. Endorsed to TMO for final confirmation.',
                'offset_days' => 12,
            ],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'awaiting_tmo_confirmation',
                'to_status'   => 'completed',
                'from_step'   => 5,
                'to_step'     => 6,
                'notes'       => 'Signed ticket verified by TMO. Mobile GPS configured and franchise permit activated.',
                'offset_days' => 10,
            ],
        ];

        foreach ($histories as $h) {
            ApplicationStatusHistory::create([
                'application_id' => $app->id,
                'changed_by'     => $h['changed_by'],
                'from_status'    => $h['from_status'],
                'to_status'      => $h['to_status'],
                'from_step'      => $h['from_step'],
                'to_step'        => $h['to_step'],
                'notes'          => $h['notes'],
                'created_at'     => now()->subDays($h['offset_days']),
            ]);
        }
    }

    private function seedAwaitingConfirmationApp(
        string $ref,
        Operator $operator,
        Tricycle $tricycle,
        string $appType,
        ?ColorCodingScheme $colorScheme,
        ?User $tmo,
        ?User $bplo,
        ?User $admin
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $ref],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 5,
                'status'           => 'awaiting_tmo_confirmation',
                'tracking_method'  => null,
                'iot_device_id'    => null,
                'submitted_at'     => now()->subDays(12),
                'completed_at'     => null,
                'remarks'          => 'Coding scheme cleared by BPLO. Returned to TMO for tracking setup and activation.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id ?? $tmo?->id ?? 1,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator with complete requirements.',
                'created_at'  => now()->subDays(12),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements verified and approved by TMO Officer. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays(10),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_payment'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Tricycle passed physical roadworthiness inspection. Municipal Payment Ticket issued.',
                'created_at'  => now()->subDays(7),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'awaiting_tmo_confirmation'],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'pending_payment',
                'from_step'   => 4,
                'to_step'     => 5,
                'notes'       => 'Coding plate verified by BPLO. Driver instructed to proceed to TMO for GPS configuration and final activation.',
                'created_at'  => now()->subDays(2),
            ]
        );

        Inspection::updateOrCreate(
            ['application_id' => $app->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays(7)->toDateString(),
                'inspection_time'   => '10:00:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Vehicle cleared all 8 roadworthiness testing points.',
            ]
        );

        $codingNumber = $tricycle->coding_scheme_number ?: '0001';

        if ($colorScheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tricycle->id],
                [
                    'application_id'         => $app->id,
                    'color_coding_scheme_id' => $colorScheme->id,
                    'franchise_number'       => $codingNumber,
                    'issued_by'              => $bplo->id,
                    'issue_date'             => now()->subDays(2)->toDateString(),
                    'expiry_date'            => now()->addYears(3)->toDateString(),
                    'is_active'              => false,
                    'notes'                  => "Coding #{$codingNumber} assigned by BPLO. Awaiting TMO Final Confirmation & GPS configuration.",
                ]
            );
        }

        return $app;
    }

    private function seedPaymentVerifiedApp(
        string $refNumber,
        Operator $operator,
        Tricycle $tricycle,
        string $appType,
        string $orNumber,
        int $subDaysSubmitted,
        int $subHoursVerified,
        ?User $tmo,
        ?User $bplo
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $refNumber],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 5,
                'status'           => 'payment_verified',
                'submitted_at'     => now()->subDays($subDaysSubmitted),
                'completed_at'     => null,
                'remarks'          => 'Official Receipt verified by BPLO Cashier desk. Ready for plate and sticker releasing.',
                'created_at'       => now()->subDays($subDaysSubmitted),
                'updated_at'       => now()->subHours($subHoursVerified),
            ]
        );

        // Remove active franchise scheme so application is pending issuance in BPLO
        FranchiseScheme::where('tricycle_id', $tricycle->id)->delete();

        $this->seedDocuments($app, 'approved', $tmo);

        Inspection::updateOrCreate(
            ['application_id' => $app->id, 'attempt_number' => 1],
            [
                'inspector_id'      => $tmo?->id,
                'inspection_date'   => now()->subDays(2)->toDateString(),
                'inspection_time'   => '10:00:00',
                'location_address'  => 'TMO Compound, Municipal Hall',
                'result'            => 'passed',
                'safety_equipment'  => true,
                'brakes_steering'   => true,
                'lights_reflectors' => true,
                'tires_suspension'  => true,
                'emissions_test'    => true,
                'license_toda_docs' => true,
                'inspector_notes'   => 'Passed all technical and safety inspections. Certified roadworthy.',
            ]
        );

        Payment::updateOrCreate(
            ['application_id' => $app->id],
            [
                'processed_by'            => $bplo?->id,
                'official_receipt_number' => $orNumber,
                'amount'                  => 750.00,
                'payment_method'          => 'cash',
                'payment_date'            => now()->subDays(1)->toDateString(),
                'payment_time'            => '11:15:00',
                'is_verified'             => true,
                'verified_at'             => now()->subHours($subHoursVerified),
                'notes'                   => 'Municipal Cashier Official Receipt inspected and verified by BPLO.',
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id ?? $tmo?->id ?? 1,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator with complete requirements.',
                'created_at'  => now()->subDays($subDaysSubmitted),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'Requirements approved. Endorsed for roadworthiness inspection.',
                'created_at'  => now()->subDays(3),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_payment'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Tricycle passed physical inspection. Order of Payment ticket generated.',
                'created_at'  => now()->subDays(2),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'payment_verified'],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'pending_payment',
                'from_step'   => 4,
                'to_step'     => 5,
                'notes'       => "Payment verified with Official Receipt {$orNumber}. Endorsed for sticker and body number release.",
                'created_at'  => now()->subHours($subHoursVerified),
            ]
        );

        return $app;
    }
}
