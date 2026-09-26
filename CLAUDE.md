# trivora — Laravel web/admin dashboard

Laravel 12 (PHP 8.2) + Inertia.js v2 + React 18, Tailwind 3, Vite, Sanctum. Leaflet + Mapbox GL (maps), Recharts (charts), SweetAlert2 (alerts).

Scope: only this folder. Don't inspect `trivora-passenger-app/` or `trivora-driver-app/` unless the task explicitly involves the mobile apps consuming an API change here.

## Structure (mirrored 1:1)

- `app/Http/Controllers/{Api,Auth,BPLO,Operator,TMO}/` ↔ `resources/js/Pages/{BPLODashboard,TMODashboard,Operator,Registration,Profile}/`
  - `Api/` — `BookingController`, `DriverAuthController`, `DriverTelematicsController`, `PassengerAuthController` (consumed by both mobile apps, via `routes/api.php`)
  - `BPLO/BPLOController`, `TMO/{ApplicationController,InspectionController,PaymentVerificationController,FinalConfirmationController}`, `Operator/{DashboardController,MTOPController,PaymentController,ViolationController}`
  - `RegistrationController` (root namespace) — the public, unauthenticated franchise application form (`Registration/PublicApply`).
- `app/Models/` — Booking, Driver, Operator, Passenger, TodaZone(+Route), Violation, FranchiseScheme, Tricycle(+Location), Application(+Document/StatusHistory), Payment, Inspection, RideRating, ColorCodingScheme, AuditLog, User
- `routes/{api,web,auth}.php`

A dashboard page's data flow: `routes/web.php` → matching controller → Inertia page under `resources/js/Pages/...` receiving props directly (no separate client fetch layer).

### Franchise workflow

There is **no Treasurer system role or controller** — it was removed (migration `2026_09_12_000000_update_workflow_for_cashier_and_bplo`). Municipal Treasurer/Cashier payment is a real-world, offline, in-person step with no corresponding Trivora page. The actual pipeline:

```
Public Registration (RegistrationController, guest)
  → TMO Document Review (TMO\ApplicationController)
  → TMO Physical Inspection (TMO\InspectionController)
  → Municipal Treasurer/Cashier payment — offline, in person, no system step
  → TMO Payment Verification (TMO\PaymentVerificationController — TMO records the Payment
    row from the driver's Official Receipt and verifies it in one action; BPLO never touches payment)
  → BPLO Releasing (BPLO\BPLOController — Sticker Number + Franchise Number, creates the FranchiseScheme inactive)
  → TMO Final Confirmation & GPS Setup (TMO\FinalConfirmationController — activates the
    FranchiseScheme and the Tricycle)
  → Franchise Active
```

The driver-facing tracker (`Operator\MTOPController` + `resources/js/Pages/Operator/Compliance/MTOP*.jsx`) maps each `Application.status` to one of these phase keys — keep them in sync if either side changes: `tmo-docs`, `tmo-phys-inspect`, `cashier-pay`, `tmo-payment`, `bplo-release`, `tmo-final-confirm`, `completed`.

## Design tokens

`tailwind.config.js` uses the unmodified Tailwind palette/spacing, plus one additive namespace: `colors.tmo.*` (brand `#1D2542` + neutrals) for the TMO Panel only — see `resources/js/Components/TMO/` for the shared component library (Button, PageHeader, KpiCard, StatusBadge, DataTable, Modal, etc.) built on those tokens. Other dashboards (BPLO/Operator) still use stock Tailwind classes; don't add colors/spacing for them without similar justification.

## Conventions

- New controller → put it in the subfolder matching its dashboard area; new page → matching `resources/js/Pages/<Area>/` folder.
- Inertia pages consume controller props directly; don't add a client-side fetch/axios layer for data a controller can already pass as a prop.
- Preserve existing Inertia/controller/route/model conventions; don't introduce new architecture (e.g. a REST client layer, a different state manager) unless asked.

## Commands

- `composer run dev` — app+queue+logs+vite concurrently
- `npm run dev` / `npm run build` — Vite only
- `composer run test` — PHPUnit (run only relevant test files/filters, not the whole suite, for small changes)
- `npx playwright test` — e2e (only when the change affects a flow it covers)
