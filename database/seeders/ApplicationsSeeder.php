<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationDriver;
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
     *
     * Owner vs separate tricycle driver: APP-2026-00001 (completed) demonstrates the
     * separate-driver DETAIL pages (owner_is_driver = 0 + an application_drivers row)
     * but its franchise '0142' is already claimed by a registered driver account;
     * APP-2026-00050 (completed + active, unclaimed franchise '0777') is the REGISTERABLE
     * separate-driver demo for the mobile Driver Registration 3-step flow — verification
     * checks the driver person (Isko Mercado), never the owner. Every other application
     * here stays owner-is-driver (column default, no driver row), matching all
     * pre-existing records.
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
        $opBen = Operator::where('license_number', 'N01-84-112233')
            ->orWhere('user_id', $userBen->id)
            ->first();
        if (! $opBen) {
            $opBen = Operator::create([
                'user_id'                  => $userBen->id,
                'contact_number'           => '09175550003',
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
            ]);
        }
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
        $opCarla = Operator::where('license_number', 'N01-92-445566')
            ->orWhere('user_id', $userCarla->id)
            ->first();
        if (! $opCarla) {
            $opCarla = Operator::create([
                'user_id'                  => $userCarla->id,
                'contact_number'           => '09175550004',
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
            ]);
        }
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
        $opDante = Operator::where('license_number', 'N01-80-778899')
            ->orWhere('user_id', $userDante->id)
            ->first();
        if (! $opDante) {
            $opDante = Operator::create([
                'user_id'                  => $userDante->id,
                'contact_number'           => '09175550005',
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
            ]);
        }
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
        $opElena = Operator::where('license_number', 'N01-89-332211')
            ->orWhere('user_id', $userElena->id)
            ->first();
        if (! $opElena) {
            $opElena = Operator::create([
                'user_id'                  => $userElena->id,
                'contact_number'           => '09175550006',
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
            ]);
        }
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

        // The retired in-system payment workflow's statuses must never appear in ANY
        // application's append-only trail — they predate the canonical 1-5 step scale and
        // would corrupt the Application Tracker's status-history-derived step dates. This
        // also repairs leftover fixtures seeded by older seeder versions (e.g.
        // APP-2026-00038/00039) that no block below owns.
        ApplicationStatusHistory::where(function ($query) {
            $query->whereIn('from_status', ['pending_payment', 'payment_issue', 'payment_verified', 'paid'])
                ->orWhereIn('to_status', ['pending_payment', 'payment_issue', 'payment_verified', 'paid']);
        })->delete();

        // -----------------------------------------------------------------
        // APPLICATION 1: Pedro Ramos — COMPLETED (franchise issued)
        // -----------------------------------------------------------------
        // Idempotent on purpose: this application IS the demo state (completed + an
        // expired permit to demonstrate the tracker's/expired-tricycle state), so a re-run
        // must be able to repair drifted demo data instead of skipping it via an exists()
        // guard.
        if ($op1 && $tri1) {
            $app1 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00001'],
                [
                    'operator_id'      => $op1->id,
                    'tricycle_id'      => $tri1->id,
                    'application_type' => 'new',
                    'current_step'     => 5,
                    'status'           => 'completed',
                    'sticker_number'   => 'STK-2026-0001',
                    'submitted_at'     => now()->subDays(30),
                    'completed_at'     => now()->subDays(10),
                    'remarks'          => 'All requirements complete. Franchise Number released.',
                ]
            );

            // Owner vs separate tricycle driver: this completed application is the demo
            // case where the driver is a DIFFERENT person than the tricycle owner — the
            // Active Tricycle Registry / application detail pages show the distinct
            // Tricycle Driver card, and Pedro's My Tricycles "View Details" flags
            // same-vs-different. Every other seeded application stays owner-is-driver
            // (the column default), so both scenarios are represented in demo data.
            $app1->update(['owner_is_driver' => false]);
            ApplicationDriver::updateOrCreate(
                ['application_id' => $app1->id],
                [
                    'first_name'     => 'Nemesio',
                    'last_name'      => 'Ramos',
                    'date_of_birth'  => '1995-06-12',
                    'contact_number' => '09171234701',
                    'barangay'       => $op1->barangay ?: 'Bucana',
                ]
            );

            // No Payment row — the system never records or verifies payment under the current
            // workflow; the applicant pays entirely offline at the Municipal Treasurer's Office.
            Payment::where('application_id', $app1->id)->delete();

            // Documents
            $this->seedDocuments($app1, 'approved', $tmo);

            // Status history (rebuilds from scratch — see seedStatusHistory())
            $this->seedStatusHistory($app1, $op1->user, $tmo, $bplo, $admin);

            // Inspection (passed)
            Inspection::updateOrCreate(
                ['application_id' => $app1->id, 'attempt_number' => 1],
                [
                    'inspector_id'      => $tmo?->id,
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
                ]
            );

            // Expired franchise permit for Pedro Ramos to demonstrate the expired state.
            // Keyed by tricycle_id (one permit row per unit, whatever seed order ran) and
            // never touching a scheme issued under a different application, so TricyclesSeeder
            // re-runs can't silently restore a future expiry over this deliberate expiry.
            if ($redScheme && $bplo) {
                FranchiseScheme::updateOrCreate(
                    ['tricycle_id' => $tri1->id],
                    [
                        'application_id'         => $app1->id,
                        'franchise_number'       => $tri1->coding_scheme_number ?: '0142',
                        'sticker_number'         => $app1->sticker_number,
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
        // APPLICATION 2: Jose Bautista — PENDING BPLO RELEASE
        // -----------------------------------------------------------------
        if ($op2 && $tri2) {
            $app2 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00002'],
                [
                    'operator_id'      => $op2->id,
                    'tricycle_id'      => $tri2->id,
                    'application_type' => 'new',
                    'current_step'     => 3,
                    'status'           => 'pending_bplo_release',
                    'submitted_at'     => now()->subDays(15),
                    'completed_at'     => null,
                    'remarks'          => null,
                ]
            );

            $this->seedDocuments($app2, 'approved', $tmo);

            $this->resetStatusHistory($app2);

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
                'to_status'      => 'pending_bplo_release',
                'from_step'      => 2,
                'to_step'        => 3,
                'notes'          => "Physical roadworthiness inspection passed — driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
                'created_at'     => now()->subDays(8),
            ]);

            Inspection::updateOrCreate(
                ['application_id' => $app2->id, 'attempt_number' => 1],
                [
                'inspector_id'      => $tmo?->id,
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
                    'current_step'     => 2,
                    'status'           => 'pending_inspection',
                    'submitted_at'     => now()->subDays(5),
                    'completed_at'     => null,
                    'remarks'          => null,
                ]
            );

            Payment::where('application_id', $app3->id)->delete();
            Inspection::where('application_id', $app3->id)->delete();

            $this->seedDocuments($app3, 'approved', $tmo);

            $this->resetStatusHistory($app3);

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
        if ($op4 && $tri4) {
            $app4 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00004'],
                [
                    'operator_id'      => $op4->id,
                    'tricycle_id'      => $tri4->id,
                    'application_type' => 'new',
                    'current_step'     => 1,
                    'status'           => 'rejected',
                    'submitted_at'     => now()->subDays(6),
                    'completed_at'     => null,
                    'remarks'          => 'Requirements rejected. Driver\'s license copy is blurry.',
                ]
            );

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

            $this->resetStatusHistory($app4);

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
                    'current_step'     => 2,
                    'status'           => 'failed_inspection',
                    'submitted_at'     => now()->subDays(10),
                    'completed_at'     => null,
                    'remarks'          => 'Physical inspection failed. Safety defects detected.',
                ]
            );

            Payment::where('application_id', $app5->id)->delete();

            $this->seedDocuments($app5, 'approved', $tmo);

            $this->resetStatusHistory($app5);

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
                    'from_step'      => 2,
                    'to_step'        => 2,
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
                    // Physical inspection is a single overall decision — inspector_notes is
                    // always one plain-text overall reason, never a per-item statuses/defects
                    // structure.
                    'inspector_notes'   => 'Physical inspection requires reinspection. Missing right-side mirror. Front brake wire loose and unresponsive.',
                ]
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 6: Ernesto Villanueva — AWAITING TMO FINAL CONFIRMATION
        // -----------------------------------------------------------------
        $tri6 = Tricycle::where('plate_number', 'FFF-2468')->first();
        if ($op3 && $tri6) {
            // The application belongs to this operator — keep the unit's ownership in step
            // with it, so the Application Tracker and My Tricycles can never disagree about
            // whose unit it is.
            $tri6->update(['operator_id' => $op3->id]);
            $app6 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00006'],
                [
                    'operator_id'      => $op3->id,
                    'tricycle_id'      => $tri6->id,
                    'application_type' => 'new',
                    'current_step'     => 4,
                    'status'           => 'awaiting_tmo_confirmation',
                    'sticker_number'   => 'STK-2026-0512',
                    'submitted_at'     => now()->subDays(12),
                    'completed_at'     => null,
                    'remarks'          => 'Sticker and coding plate released by BPLO. Returned to TMO for tracking setup and activation.',
                ]
            );

            $this->seedDocuments($app6, 'approved', $tmo);

            // Demonstrates the resubmission scenario: an earlier attempt at this same
            // requirement was rejected, then the operator uploaded a corrected copy — a real
            // second ApplicationDocument row, exactly like RegistrationController/MTOPController's
            // resubmit flow (::create(), never overwriting the old row). The requirement's
            // current status must reflect the newer row, not this obsolete rejected one.
            // Kept exactly once across re-runs — this second ApplicationDocument row is
            // itself part of the demo fixture, not something to append on every seed.
            \App\Models\ApplicationDocument::where('application_id', $app6->id)
                ->where('file_name', 'barangay-clearance-v1-blurry.pdf')
                ->delete();

            \App\Models\ApplicationDocument::create([
                'application_id'    => $app6->id,
                'document_type'     => 'barangay_clearance',
                'file_name'         => 'barangay-clearance-v1-blurry.pdf',
                'file_path'         => 'documents/' . $app6->reference_number . '/barangay-clearance-v1.pdf',
                'file_size_kb'      => 210,
                'mime_type'         => 'application/pdf',
                'review_status'     => 'rejected',
                'reviewed_by'       => $tmo?->id,
                'reviewed_at'       => now()->subDays(11),
                'rejection_reason'  => 'Scanned copy is blurry and the barangay seal is not legible.',
                'created_at'        => now()->subDays(11),
                'updated_at'        => now()->subDays(11),
            ]);

            $this->resetStatusHistory($app6);

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
                'to_status'      => 'pending_bplo_release',
                'from_step'      => 2,
                'to_step'        => 3,
                'notes'          => "Physical roadworthiness inspection passed — driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
                'created_at'     => now()->subDays(7),
            ]);
            ApplicationStatusHistory::create([
                'application_id' => $app6->id,
                'changed_by'     => $bplo?->id,
                'from_status'    => 'pending_bplo_release',
                'to_status'      => 'awaiting_tmo_confirmation',
                'from_step'      => 3,
                'to_step'        => 4,
                'notes'          => 'Franchise Number STK-2026-0512 released by BPLO. Driver instructed to return to TMO for GPS configuration.',
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

            // No Payment row — see APPLICATION 1's note above.

            if ($blueScheme && $bplo) {
                FranchiseScheme::updateOrCreate(
                    ['tricycle_id' => $tri6->id],
                    [
                        'application_id'         => $app6->id,
                        'franchise_number'       => $tri6->coding_scheme_number ?: '0512',
                        'sticker_number'         => $app6->sticker_number,
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
        // Repairs ownership even when the application itself already exists — a re-run of
        // TricyclesSeeder must not be able to leave the unit on a different operator than
        // the applicant whose tracker shows it.
        if ($op1 && $tri7 && $tri7->operator_id !== $op1->id) {
            $tri7->update(['operator_id' => $op1->id]);
        }
        // The demo driver's ONE Document Review (requirements) stage application — this
        // block is the demo fixture for that stage, so a re-run always resets it to
        // pending_review (documents back to pending, trail rebuilt) instead of skipping
        // via an exists() guard and leaving a UI-advanced duplicate inspection-stage entry.
        if ($op1 && $tri7) {
            $app7 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00007'],
                [
                    'operator_id'      => $op1->id,
                    'tricycle_id'      => $tri7->id,
                    'application_type' => 'new',
                    'current_step'     => 1,
                    'status'           => 'pending_review',
                    'submitted_at'     => now()->subDays(2),
                    'completed_at'     => null,
                    'remarks'          => null,
                ]
            );

            $this->seedDocuments($app7, 'pending', null);

            $this->resetStatusHistory($app7);

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
        if ($op5 && $tri8 && $tri8->operator_id !== $op5->id) {
            $tri8->update(['operator_id' => $op5->id]);
        }
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
            $tri9->update(['operator_id' => $op2->id]);
            $app9 = Application::updateOrCreate(
                ['reference_number' => 'APP-2026-00009'],
                [
                    'operator_id'      => $op2->id,
                    'tricycle_id'      => $tri9->id,
                    'application_type' => 'new',
                    'current_step'     => 2,
                    'status'           => 'pending_inspection',
                    'submitted_at'     => now()->subDays(3),
                    'completed_at'     => null,
                    'remarks'          => null,
                ]
            );

            Payment::where('application_id', $app9->id)->delete();
            Inspection::where('application_id', $app9->id)->delete();

            $this->seedDocuments($app9, 'approved', $tmo);

            $this->resetStatusHistory($app9);

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
        // BPLO RELEASING QUEUE APPLICATIONS (status = 'pending_bplo_release')
        // Cleared physical inspection; now awaiting body/plate number and sticker releasing
        // -----------------------------------------------------------------

        // APPLICATION 25: Elena Garcia [TODA Bucana]
        if ($opElena && $tri25) {
            $tri25->update(['operator_id' => $opElena->id]);
            $this->seedPendingBploReleaseApp(
                'APP-2026-00025',
                $opElena,
                $tri25,
                'new',
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
            $this->seedPendingBploReleaseApp(
                'APP-2026-00026',
                $opBen,
                $tri26,
                'renewal',
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
            $this->seedPendingBploReleaseApp(
                'APP-2026-00027',
                $opCarla,
                $tri27,
                'new',
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
            $this->seedPendingBploReleaseApp(
                'APP-2026-00028',
                $opDante,
                $tri28,
                'renewal',
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
            $this->seedPendingBploReleaseApp(
                'APP-2026-00029',
                $op2,
                $tri29,
                'new',
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
            $this->seedPendingBploReleaseApp(
                'APP-2026-00030',
                $op1,
                $tri30,
                'renewal',
                9,
                24,
                $tmo,
                $bplo
            );
        }

        // -----------------------------------------------------------------
        // APPLICATION 50: SEPARATE-DRIVER REGISTRATION DEMO — completed + ACTIVE franchise
        // -----------------------------------------------------------------
        // The mobile Driver Registration flow verifies the ACTUAL tricycle driver of a
        // franchise, never automatically the owner. This is the code-seeded end-to-end
        // demo of that path: a completed application whose driver is a DIFFERENT person
        // than the owner (owner_is_driver = 0 + an application_drivers row), carrying an
        // ACTIVE, unexpired, UNCLAIMED franchise — so all three registration steps can be
        // run in the driver app:
        //   Step 1  Franchise '0777' + driver's full name 'Isko Mercado' + DOB 1996-03-08
        //   Step 2  Isko's existing details shown read-only (never re-typed, never a
        //           second personal-information record)
        //   Step 3  password only — creates Isko's own account and leaves the OWNER's
        //           login (owner.regdemo@trivora.ph) completely untouched.
        // Unlike APP-2026-00001 / Nemesio Ramos (franchise '0142' is already claimed by a
        // registered driver account -> 409 ACCOUNT_ALREADY_EXISTS), this block never
        // creates a Driver row, so franchise '0777' stays registerable across re-seeds.
        $userRegOwner = User::firstOrCreate(
            ['email' => 'owner.regdemo@trivora.ph'],
            [
                'name'      => 'Rolando Mercado',
                'password'  => \Illuminate\Support\Facades\Hash::make('Driver@123'),
                'role'      => 'tricycle_driver',
                'is_active' => true,
            ]
        );
        $opRegOwner = Operator::firstOrCreate(
            ['license_number' => 'N01-87-556677'],
            [
                'user_id'                  => $userRegOwner->id,
                'toda_id'                  => $todaBucana?->id,
                'first_name'               => 'Rolando',
                'middle_name'              => 'Diaz',
                'last_name'                => 'Mercado',
                'contact_number'           => '09175550007',
                'address'                  => '12 Sultan St., Poblacion, Nasugbu',
                'barangay'                 => 'Poblacion',
                'date_of_birth'            => '1987-06-15',
                'license_number'           => 'N01-87-556677',
                'license_expiry_date'      => now()->addYears(3)->toDateString(),
                'license_restriction_code' => '1,2',
            ]
        );
        if (! $opRegOwner->user_id) {
            $opRegOwner->update(['user_id' => $userRegOwner->id]);
        }

        $triRegDemo = Tricycle::updateOrCreate(
            ['plate_number' => 'REG-7788'],
            [
                'operator_id'          => $opRegOwner->id,
                'toda_zone_id'         => $todaBucana?->id,
                'coding_scheme_number' => '0777',
                'engine_number'        => 'ENG-REG-7788',
                'chassis_number'       => 'CHS-REG-7788',
                'or_number'            => 'OR-2026-07778',
                'cr_number'            => 'CR-2026-07778',
                'make'                 => 'Honda',
                'model'                => 'TMX 125',
                'year_model'           => 2023,
                'body_color'           => 'Black/Red',
                'body_type'            => 'Standard',
                'status'               => 'active',
                'tracking_capability'  => 'mobile_only',
                'active_tracking_mode' => 'mobile_app',
            ]
        );

        $appRegDemo = Application::updateOrCreate(
            ['reference_number' => 'APP-2026-00050'],
            [
                'operator_id'      => $opRegOwner->id,
                'tricycle_id'      => $triRegDemo->id,
                'owner_is_driver'  => false,
                'application_type' => 'new',
                'current_step'     => 5,
                'status'           => 'completed',
                'sticker_number'   => 'STK-2026-7788',
                'submitted_at'     => now()->subDays(30),
                'completed_at'     => now()->subDays(10),
                'remarks'          => 'All requirements complete. Franchise issued; driver is a separate person from the owner.',
            ]
        );

        // The ACTUAL driver of this franchise — the person Step 1 verifies and whose
        // details Step 2 shows read-only. Deliberately NOT a users/drivers record until
        // the mobile flow is completed: this person is franchise-application data only.
        ApplicationDriver::updateOrCreate(
            ['application_id' => $appRegDemo->id],
            [
                'first_name'     => 'Isko',
                'last_name'      => 'Mercado',
                'date_of_birth'  => '1996-03-08',
                'contact_number' => '09175550008',
                'barangay'       => 'Poblacion',
            ]
        );

        if ($redScheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $triRegDemo->id],
                [
                    'application_id'         => $appRegDemo->id,
                    'franchise_number'       => '0777',
                    'sticker_number'         => $appRegDemo->sticker_number,
                    'color_coding_scheme_id' => $redScheme->id,
                    'issued_by'              => $bplo->id,
                    'issue_date'             => now()->subDays(10)->toDateString(),
                    'expiry_date'            => now()->addYears(3)->toDateString(),
                    'is_active'              => true,
                    'notes'                  => 'Registration demo permit: completed + active + unclaimed, separate tricycle driver.',
                ]
            );

            $triRegDemo->update(['status' => 'active']);
        }

        $this->seedDocuments($appRegDemo, 'approved', $tmo);
        $this->seedStatusHistory($appRegDemo, $userRegOwner, $tmo, $bplo, $admin);

        $this->command->info('✔ Applications seeded (30 applications across all workflow stages including active physical inspection, releasing, and final confirmation queues).');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Rebuild an application's append-only status-history trail before seeding the
     * canonical rows. These helpers are the demo fixture for their application: stale
     * rows from earlier runs or manual UI testing (legacy payment-step statuses, or a
     * stray transition contradicting the current status) must never survive to make the
     * Application Tracker's status-history-derived dates disagree with the real status.
     */
    private function resetStatusHistory(Application $app): void
    {
        ApplicationStatusHistory::where('application_id', $app->id)->delete();
    }

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
                'current_step'     => 2,
                'status'           => 'pending_inspection',
                'submitted_at'     => now()->subDays($subDaysSubmitted),
                'completed_at'     => null,
                'remarks'          => null,
            ]
        );

        Payment::where('application_id', $app->id)->delete();
        Inspection::where('application_id', $app->id)->delete();

        $this->seedDocuments($app, 'approved', $tmo);

        $this->resetStatusHistory($app);

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
        array $defects,
        ?User $tmo
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $refNumber],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 2,
                'status'           => 'failed_inspection',
                'submitted_at'     => now()->subDays($subDaysSubmitted),
                'completed_at'     => null,
                'remarks'          => 'Physical inspection failed. Safety defects detected.',
            ]
        );

        Payment::where('application_id', $app->id)->delete();

        $this->seedDocuments($app, 'approved', $tmo);

        $this->resetStatusHistory($app);

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'pending_review'],
            [
                'changed_by'  => $operator->user_id ?? $tmo?->id ?? 1,
                'from_status' => null,
                'from_step'   => null,
                'to_step'     => 1,
                'notes'       => 'Application submitted by operator.',
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
                'notes'       => 'Requirements verified and approved. Endorsed for tricycle inspection.',
                'created_at'  => now()->subDays($subDaysApproved),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'failed_inspection'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 2,
                'to_step'     => 2,
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
                // Physical inspection is a single overall decision — inspector_notes is always
                // one plain-text overall reason, never a per-item statuses/defects structure.
                'inspector_notes'   => 'Physical inspection requires reinspection. ' . implode(' ', array_filter($defects)),
            ]
        );

        return $app;
    }

    /**
     * Seeds the 9 mandatory items from the canonical franchise registration requirement list
     * (App\Models\ApplicationDocument::CANONICAL_REQUIREMENTS) using the SAME document_type
     * vocabulary the real registration workflow writes — never a separate fake structure. The 2
     * conditional items (delivery_receipt, authorization_letter) are situational and left
     * unsubmitted by default, same as a typical applicant who already has an OR/CR and owns
     * their own unit.
     *
     * $statusOverrides lets a caller give individual requirements a different review_status than
     * the batch default (e.g. a realistic mix of verified/pending/rejected on one application,
     * rather than every document sharing one uniform status).
     *
     * A renewal application (App::application_type === 'renewal') additionally gets Prangkisa
     * seeded, matching Operator\MTOPController::store()'s real renewal-only requirement.
     */
    private function seedDocuments(Application $app, string $reviewStatus, ?User $reviewer, array $statusOverrides = []): void
    {
        $types = [
            'police_clearance',
            'health_certificate',
            'orcr_photocopy',
            'drivers_license',
            'barangay_clearance',
            'toda_clearance',
            'cedula',
            'driver_id',
            'tariff_list',
        ];

        if ($app->application_type === 'renewal') {
            $types[] = 'prangkisa';
        }

        foreach ($types as $type) {
            $status = $statusOverrides[$type] ?? $reviewStatus;

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
                    'review_status'    => $status,
                    'reviewed_by'      => $status !== 'pending' ? $reviewer?->id : null,
                    'reviewed_at'      => $status !== 'pending' ? now()->subDays(rand(1, 5)) : null,
                    'rejection_reason' => $status === 'rejected' ? 'Document image is unclear or invalid; please resubmit a clearer copy.' : null,
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
        // Rebuild this application's audit trail from scratch: this application IS the demo
        // fixture, so stale rows recorded by earlier runs or manual UI testing (e.g. statuses
        // from the retired in-system payment workflow) must never survive to contradict the
        // application's current status or the tracker's status-history-derived step dates.
        ApplicationStatusHistory::where('application_id', $app->id)->delete();

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
                'to_status'   => 'pending_bplo_release',
                'from_step'   => 2,
                'to_step'     => 3,
                'notes'       => "Physical inspection passed. Driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
                'offset_days' => 25,
            ],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'pending_bplo_release',
                'to_status'   => 'awaiting_tmo_confirmation',
                'from_step'   => 3,
                'to_step'     => 4,
                'notes'       => 'Franchise Number and coding plate released by BPLO. Endorsed to TMO for final confirmation.',
                'offset_days' => 12,
            ],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'awaiting_tmo_confirmation',
                'to_status'   => 'completed',
                'from_step'   => 4,
                'to_step'     => 5,
                'notes'       => 'Physical roadworthiness and requirements verified by TMO. Mobile GPS configured and franchise permit activated.',
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
                'current_step'     => 4,
                'status'           => 'awaiting_tmo_confirmation',
                'tracking_method'  => null,
                'iot_device_id'    => null,
                'submitted_at'     => now()->subDays(12),
                'completed_at'     => null,
                'remarks'          => 'Sticker Number cleared by BPLO. Returned to TMO for tracking setup and activation.',
            ]
        );

        $this->seedDocuments($app, 'approved', $tmo);

        $this->resetStatusHistory($app);

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
            ['application_id' => $app->id, 'to_status' => 'pending_bplo_release'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 2,
                'to_step'     => 3,
                'notes'       => "Tricycle passed physical roadworthiness inspection. Driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
                'created_at'  => now()->subDays(7),
            ]
        );

        ApplicationStatusHistory::updateOrCreate(
            ['application_id' => $app->id, 'to_status' => 'awaiting_tmo_confirmation'],
            [
                'changed_by'  => $bplo?->id,
                'from_status' => 'pending_bplo_release',
                'from_step'   => 3,
                'to_step'     => 4,
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

        // Franchise Number (STK-YYYY-NNNN): BPLO release generates it once
        // (BPLOController::showReleaseForm) and persists it to the application first, then
        // copies that same serial onto the franchise scheme (release()). An already-issued
        // serial is reused verbatim, so a re-run can never hand out a different number.
        $franchiseNumber = $app->sticker_number
            ?: 'STK-' . now()->format('Y') . '-' . str_pad($codingNumber, 4, '0', STR_PAD_LEFT);
        if ($app->sticker_number !== $franchiseNumber) {
            $app->update(['sticker_number' => $franchiseNumber]);
        }

        if ($colorScheme && $bplo) {
            FranchiseScheme::updateOrCreate(
                ['tricycle_id' => $tricycle->id],
                [
                    'application_id'         => $app->id,
                    'color_coding_scheme_id' => $colorScheme->id,
                    'franchise_number'       => $codingNumber,
                    'sticker_number'         => $franchiseNumber,
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

    private function seedPendingBploReleaseApp(
        string $refNumber,
        Operator $operator,
        Tricycle $tricycle,
        string $appType,
        int $subDaysSubmitted,
        int $subHoursReleased,
        ?User $tmo,
        ?User $bplo
    ): Application {
        $app = Application::updateOrCreate(
            ['reference_number' => $refNumber],
            [
                'operator_id'      => $operator->id,
                'tricycle_id'      => $tricycle->id,
                'application_type' => $appType,
                'current_step'     => 3,
                'status'           => 'pending_bplo_release',
                'submitted_at'     => now()->subDays($subDaysSubmitted),
                'completed_at'     => null,
                'remarks'          => "Passed physical inspection. Driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
                'created_at'       => now()->subDays($subDaysSubmitted),
                'updated_at'       => now()->subHours($subHoursReleased),
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

        // No Payment row — see APPLICATION 1's note above.

        $this->resetStatusHistory($app);

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
            ['application_id' => $app->id, 'to_status' => 'pending_bplo_release'],
            [
                'changed_by'  => $tmo?->id,
                'from_status' => 'pending_inspection',
                'from_step'   => 2,
                'to_step'     => 3,
                'notes'       => "Tricycle passed physical inspection. Driver instructed to pay at the Municipal Treasurer's Office, then proceed to BPLO for sticker/plate release.",
                'created_at'  => now()->subHours($subHoursReleased),
            ]
        );

        return $app;
    }
}
