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
use App\Models\Tricycle;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ApplicationsSeeder extends Seeder
{
    /**
     * Seed sample applications at different stages of the workflow pipeline.
     *
     *  App 1 → Pedro Ramos  → fully completed (franchise issued)
     *  App 2 → Jose Bautista → pending payment (passed inspection)
     *  App 3 → Ernesto Villanueva → pending inspection (docs approved)
     */
    public function run(): void
    {
        $tmo       = User::where('email', 'tmo.jdelacruz@trivora.gov.ph')->first();
        $bplo      = User::where('email', 'bplo.areyes@trivora.gov.ph')->first();
        $treasurer = User::where('email', 'treasurer@trivora.gov.ph')->first();

        $op1       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.pramos@trivora.ph'))->first();
        $op2       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.jbautista@trivora.ph'))->first();
        $op3       = Operator::whereHas('user', fn ($q) => $q->where('email', 'driver.evillanueva@trivora.ph'))->first();

        $tri1      = Tricycle::where('plate_number', 'AAA-1234')->first();
        $tri2      = Tricycle::where('plate_number', 'BBB-5678')->first();
        $tri3      = Tricycle::where('plate_number', 'CCC-9012')->first();

        $redScheme  = ColorCodingScheme::where('name', 'Red')->first();
        $blueScheme = ColorCodingScheme::where('name', 'Blue')->first();

        // -----------------------------------------------------------------
        // APPLICATION 1: Pedro Ramos — COMPLETED (franchise issued)
        // -----------------------------------------------------------------
        if ($op1 && $tri1 && ! Application::where('reference_number', 'APP-2026-00001')->exists()) {
            $app1 = Application::create([
                'reference_number' => 'APP-2026-00001',
                'operator_id'      => $op1->id,
                'tricycle_id'      => $tri1->id,
                'application_type' => 'new',
                'current_step'     => 5,
                'status'           => 'completed',
                'submitted_at'     => now()->subDays(30),
                'completed_at'     => now()->subDays(10),
                'remarks'          => 'All requirements complete. Franchise issued.',
            ]);

            // Documents
            $this->seedDocuments($app1, 'approved', $tmo);

            // Status history
            $this->seedStatusHistory($app1, $op1->user, $tmo, $bplo, $treasurer);

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

            // Payment
            Payment::create([
                'application_id'          => $app1->id,
                'processed_by'            => $treasurer?->id,
                'official_receipt_number' => 'OR-2026-000001',
                'amount'                  => 750.00,
                'payment_method'          => 'cash',
                'payment_date'            => now()->subDays(15)->toDateString(),
                'payment_time'            => '10:45:00',
                'is_verified'             => true,
                'verified_at'             => now()->subDays(15),
                'notes'                   => 'Full payment received.',
            ]);

            // Franchise scheme
            if ($redScheme && $bplo) {
                FranchiseScheme::firstOrCreate(
                    ['franchise_number' => 'FS-2026-00001'],
                    [
                        'application_id'         => $app1->id,
                        'tricycle_id'            => $tri1->id,
                        'color_coding_scheme_id' => $redScheme->id,
                        'issued_by'              => $bplo->id,
                        'issue_date'             => now()->subDays(10)->toDateString(),
                        'expiry_date'            => now()->addYear()->subDays(10)->toDateString(),
                        'is_active'              => true,
                        'notes'                  => 'Initial franchise issuance.',
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
                'notes'          => 'Application submitted.',
                'created_at'     => now()->subDays(15),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app2->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_review',
                'to_status'      => 'pending_inspection',
                'from_step'      => 1,
                'to_step'        => 2,
                'notes'          => 'Documents verified. Proceeding to inspection.',
                'created_at'     => now()->subDays(12),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app2->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_inspection',
                'to_status'      => 'pending_payment',
                'from_step'      => 2,
                'to_step'        => 3,
                'notes'          => 'Tricycle passed physical inspection.',
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
        if ($op3 && $tri3 && ! Application::where('reference_number', 'APP-2026-00003')->exists()) {
            $app3 = Application::create([
                'reference_number' => 'APP-2026-00003',
                'operator_id'      => $op3->id,
                'tricycle_id'      => $tri3->id,
                'application_type' => 'new',
                'current_step'     => 3,
                'status'           => 'pending_inspection',
                'submitted_at'     => now()->subDays(5),
                'completed_at'     => null,
                'remarks'          => null,
            ]);

            $this->seedDocuments($app3, 'approved', $tmo);

            ApplicationStatusHistory::create([
                'application_id' => $app3->id,
                'changed_by'     => $op3->user_id,
                'from_status'    => null,
                'to_status'      => 'pending_review',
                'from_step'      => null,
                'to_step'        => 1,
                'notes'          => 'Application submitted by operator.',
                'created_at'     => now()->subDays(5),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app3->id,
                'changed_by'     => $tmo?->id,
                'from_status'    => 'pending_review',
                'to_status'      => 'pending_inspection',
                'from_step'      => 1,
                'to_step'        => 2,
                'notes'          => 'All documents verified. Scheduled for inspection.',
                'created_at'     => now()->subDays(2),
            ]);
        }

        $this->command->info('✔ Applications seeded (3 applications at different workflow stages).');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

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
            ApplicationDocument::create([
                'application_id'   => $app->id,
                'document_type'    => $type,
                'file_name'        => Str::slug($type) . '_sample.pdf',
                'file_path'        => 'documents/' . $app->reference_number . '/' . Str::slug($type) . '.pdf',
                'file_size_kb'     => rand(80, 500),
                'mime_type'        => 'application/pdf',
                'review_status'    => $reviewStatus,
                'reviewed_by'      => $reviewStatus !== 'pending' ? $reviewer?->id : null,
                'reviewed_at'      => $reviewStatus !== 'pending' ? now()->subDays(rand(1, 5)) : null,
                'rejection_reason' => null,
            ]);
        }
    }

    private function seedStatusHistory(
        Application $app,
        ?User $driver,
        ?User $tmo,
        ?User $bplo,
        ?User $treasurer
    ): void {
        $histories = [
            [
                'changed_by'  => $driver?->id,
                'from_status' => null,
                'to_status'   => 'pending_review',
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator.',
                'offset_days' => 30,
            ],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_review',
                'to_status'   => 'pending_inspection',
                'from_step'   => 1,
                'to_step'     => 2,
                'notes'       => 'All documents reviewed and approved.',
                'offset_days' => 27,
            ],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'to_status'   => 'pending_payment',
                'from_step'   => 2,
                'to_step'     => 3,
                'notes'       => 'Physical inspection passed.',
                'offset_days' => 25,
            ],
            [
                'changed_by'  => $treasurer?->id,
                'from_status' => 'pending_payment',
                'to_status'   => 'paid',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Payment received. OR issued.',
                'offset_days' => 15,
            ],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'paid',
                'to_status'   => 'completed',
                'from_step'   => 4,
                'to_step'     => 5,
                'notes'       => 'Franchise scheme issued. Application complete.',
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
}
