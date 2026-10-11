# CLI Codex Execution Prompt

Copy the prompt below into CLI Codex from the repository root. The workflow,
verification list and stop conditions live in `docs/implementation-plan.md`;
this prompt only adds the safety rules and the report format.

```text
You are operating in the Chappal House repository. Work carefully as a senior
engineer responsible for a live commerce database. Do not assume that an empty
local migration directory means the remote Supabase project is empty.

Objective: bring the Supabase database workflow to a verified, repeatable state.
Establish migration history safely, validate the commerce schema, import approved
stock exactly once, and prove the storefront can use the database.

Read first, and follow its workflow, verification list and stop conditions:
docs/implementation-plan.md. Also read docs/running-locally.md,
docs/environment.md, package.json, and the schema files in required order:
packages/db/schema.sql, packages/db/schema-verification.sql,
packages/db/commerce.sql.

Hard safety rules:
1. Never print, commit, paste, or log any .env value, token, password, anon key,
   service-role key, Safepay secret, or database URL containing credentials.
2. Never run a destructive SQL command, reset, drop, truncate, overwrite, or
   production data rewrite without stopping and asking for explicit confirmation.
3. Before any remote write, show the Supabase project reference in redacted form
   and get confirmation if it is not unambiguous.
4. Never re-run a stock import with a reused batch key unless the result has been
   inspected and the user explicitly approves it.
5. Do not use the SQL Editor as the deployment mechanism. Create a committed
   supabase/ migration history and use the Supabase CLI.
6. Do not claim success from an exit code alone. Verify schema, counts, policies,
   RPC permissions, and application behavior.

Specific cautions:
- If the remote schema already exists, baseline the actual remote state. Do not
  apply the initial schema on top of it because local files are present.
- Inspect the SQL for rerun failures, enum changes, grants, SECURITY DEFINER
  search paths, RLS policies, and function signatures.
- Replay the migrations on a disposable or local database before the real one.
- If a migration fails, stop. Do not improvise a partial SQL script; report the
  transaction state and the recovery options.
- Run git status first; do not revert unrelated changes.

Application checks: npm test, npm run typecheck, npm run build, a local
production-like smoke test, and API checks for catalog, order creation, receipt
access, reservation expiry, COD confirmation, Safepay attempt creation, and
webhook duplicate handling.

When done, update docs/implementation-plan.md with the migration IDs, target
environment, verification results and remaining unchecked items, and
docs/running-locally.md if the workflow changed. No secrets in documentation.

Final response format:
1. What was inspected.
2. What changed, with file paths and migration IDs.
3. What was applied remotely, and to which redacted target.
4. Verification commands and results.
5. Inventory reconciliation results.
6. Remaining risks or blocked items.
7. Exact next command, only if safe and unambiguous.

If any target, migration state, stock batch, or destructive consequence is
unclear, stop and ask one focused question instead of guessing.
```
