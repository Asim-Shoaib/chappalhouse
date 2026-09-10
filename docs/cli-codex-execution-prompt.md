# CLI Codex Execution Prompt

Copy the prompt below into CLI Codex from the repository root.

```text
You are operating in the Chappal House repository. Work carefully as a senior
engineer responsible for a live commerce database. Do not assume that an empty
local migration directory means the remote Supabase project is empty.

Objective:
Bring the repository and its Supabase database workflow to a verified, repeatable
state. Establish migration history safely, validate the commerce schema, import
approved stock exactly once, and prove the storefront can use the database. Do not
blindly push SQL or bulk data.

Repository context:
- Next.js app: apps/storefront
- Root scripts: package.json
- Catalog seed: data/catalog.json
- Workbook: docs/Chappal House.xlsx
- Existing schema files, in required order:
  1. packages/db/schema.sql
  2. packages/db/schema-verification.sql
  3. packages/db/commerce.sql
- Stock importer: scripts/import-stock.mjs
- Existing importer RPC: import_storefront_stock
- Local instructions: docs/running-locally.md
- Project plan and stop conditions: docs/implementation-plan.md

Hard safety rules:
1. Never print, commit, paste, or log any .env value, token, password, anon key,
   service-role key, SafePay secret, or database URL containing credentials.
2. Never run a destructive SQL command, reset, drop, truncate, overwrite, or
   production data rewrite without stopping and asking for explicit confirmation.
3. Before any remote write, show the exact Supabase project reference/target in a
   redacted form and obtain confirmation if it is not unambiguous.
4. Never re-run a stock import with a reused batch key unless the result has been
   inspected and the user explicitly approves it. The importer is designed to be
   idempotent, but inventory must still be reconciled.
5. Do not use the SQL Editor as the normal deployment mechanism. Create a committed
   supabase/ migration history and use the Supabase CLI workflow where possible.
6. Do not claim success from a command exit code alone. Verify schema, counts,
   policies, RPC permissions, and application behavior.

Phase 1: inspect before changing anything
- Read the repository files above and inspect package scripts.
- Check whether supabase/config.toml, supabase/migrations, and linked-project
  metadata exist. If absent, state that clearly.
- Inspect the current remote migration/schema state using read-only commands.
- Identify whether the remote database is empty, partially provisioned, or already
  contains these tables/functions.
- Run git status if this is a git checkout; do not revert unrelated changes.
- Produce a short risk report before creating or applying migrations.

Phase 2: establish migration history
- If the remote schema is empty, create a Supabase CLI project configuration and
  convert the three existing SQL files into ordered migrations without changing
  their behavior except where required for repeatable deployment.
- If the remote schema already exists, first create a safe baseline representing the
  actual remote state. Do not apply the initial schema on top of an existing schema
  just because local files are present.
- Keep schema, phone verification, and commerce changes in clearly ordered migration
  files. Make later migrations additive and reviewable.
- Inspect the SQL for rerun failures, enum changes, grants, SECURITY DEFINER search
  paths, RLS policies, and function signatures.
- Use a disposable/local Supabase database for a clean replay. Capture migration
  output and verification results.

Phase 3: apply only after review
- Show the migration list and a concise summary of every remote write.
- Ask for confirmation immediately before linking/applying to the real project.
- Apply migrations using the safest supported CLI command.
- If a migration fails, stop. Do not improvise a second partial SQL script. Inspect
  the failure, determine transaction state, and report the exact recovery options.

Phase 4: verify the database
Verify, without exposing secrets:
- products, variants, product_images, orders, order_items, stock_movements
- phone_verifications, stock_notifications, analytics_events
- inventory_reservations, payment_attempts, payment_events, storefront_rate_limits
- required enums, indexes, views, triggers, and functions
- public catalog read access through public_products only
- no public/anon/authenticated access to orders, payments, inventory internals, or
  service-role-only RPCs
- RLS is enabled on every sensitive table
- security-definer functions use a controlled search_path
- duplicate SafePay events and duplicate idempotency keys are handled correctly

Phase 5: stock import and reconciliation
- Run the parser tests.
- Run each intended workbook import with --dry-run first.
- Report parsed product count, line count, and total pairs.
- Confirm the batch key is new and the workbook is the intended source.
- Only after approval, run the real import once per batch.
- Reconcile products, variants, stock_movements, and variants.stock_qty against the
  workbook. Check that every stock quantity has a matching batch_intake ledger row.
- Do not set stock_qty directly and do not change cost/price values without a source
  decision from the owner.

Phase 6: application verification
Run, as applicable:
- npm test
- npm run typecheck
- npm run build
- a local production-like smoke test
- API checks for catalog, order creation, receipt access, reservation expiry, COD
  confirmation, SafePay attempt creation, and webhook duplicate handling
- confirm missing environment configuration fails safely rather than leaking errors

Documentation changes:
- Update docs/implementation-plan.md with actual migration IDs, target environment,
  verification results, and remaining unchecked items.
- Update docs/running-locally.md if the migration/import workflow changes.
- Do not put secrets or sensitive production data in documentation.

Final response format:
1. What was inspected.
2. What changed, with file paths and migration IDs.
3. What was applied remotely, and to which redacted target.
4. Verification commands and results.
5. Inventory reconciliation results.
6. Remaining risks or blocked items.
7. Exact next command, only if safe and unambiguous.

If any target, migration state, stock batch, or destructive consequence is unclear,
stop and ask one focused question instead of guessing.
```
