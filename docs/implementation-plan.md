# Chappal House Implementation Plan

## Current state

- The application is a Next.js storefront in `apps/storefront`.
- Catalog development works from `data/catalog.json` generated from the stock workbook.
- Supabase schema is currently split across three manually ordered files:
  `packages/db/schema.sql`, `packages/db/schema-verification.sql`, and
  `packages/db/commerce.sql`.
- There is no committed `supabase/` directory, migration history, or Supabase CLI
  configuration yet.
- `scripts/import-stock.mjs` imports workbook data through the idempotent
  `import_storefront_stock` RPC and requires an explicit batch key.
- Checkout, inventory reservations, receipts, analytics, and SafePay server routes
  are present, but production readiness still depends on configuring and validating
  the remote database and secrets.

## Normal database workflow

1. Inspect the target Supabase project and record its current migration state.
2. Establish a migration baseline before applying anything remotely. Do not run the
   three SQL files repeatedly in the SQL Editor.
3. Put the baseline and all future changes in timestamped files under
   `supabase/migrations/`.
4. Run migrations locally or against a disposable Supabase project first.
5. Review the generated SQL and use `supabase db diff` or an equivalent schema
   comparison before production changes.
6. Apply migrations to the linked project only after a backup and an explicit
   confirmation of the target project.
7. Verify tables, functions, policies, grants, views, and representative queries.
8. Import stock only after schema verification. Use `--dry-run` first, then one
   unique `--batch` value per workbook intake.
9. Reconcile imported product counts, variant quantities, and ledger totals against
   the workbook before enabling checkout.

## Execution phases

- [ ] Confirm the Supabase project reference and environment without exposing keys.
- [ ] Baseline the existing remote schema or create a disposable validation project.
- [ ] Convert the current SQL files into an ordered, reviewable migration history.
- [ ] Add migration verification queries and document expected results.
- [ ] Validate RLS, service-role-only RPCs, public catalog access, and security-barrier
      behavior.
- [ ] Run stock parser tests and a dry-run import for each workbook batch.
- [ ] Import each approved batch exactly once and reconcile inventory ledger totals.
- [ ] Validate checkout idempotency, reservation expiry, COD confirmation, SafePay
      webhook idempotency, and receipt access.
- [ ] Run typecheck, tests, build, and a production-like smoke test.
- [ ] Update deployment and rollback notes with the migration IDs and evidence.

## Stop conditions

Stop and ask for confirmation if the target project is ambiguous, the remote schema
does not match the expected baseline, a migration is destructive, a migration would
drop or rewrite production data, a service-role key is exposed, a stock batch key was
already used, or verification produces an unexpected count.

## Required evidence

Every completed phase should record the command, target environment, migration IDs,
row/count checks, and test results. Never record secret values, access tokens, or
service-role keys.
