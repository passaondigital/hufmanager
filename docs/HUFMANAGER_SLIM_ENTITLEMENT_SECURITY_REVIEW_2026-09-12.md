# HufManager Slim — Entitlement V1 / Phase 9 — Security Review (Gate B)

**Verdict: SECURITY_REVIEW=PASS.** All 3 findings fixed and verified by
real reproduction against an isolated restore of the Production backup
(not staging) with the corrected migration stack applied. See
`docs/HUFMANAGER_SLIM_ENTITLEMENT_REHEARSAL_2026-09-12.md` for the full
rehearsal record this verification is part of.

## Reviewed scope

- Commit range: `09cc0baf..22b7fa46` (branch
  `release/hufmanager-lifecycle-2026-09-11`), plus the corrective commit
  that follows this review — everything since the already-Production-live
  lifecycle core, i.e. the full Entitlement/Access V1 + Phase 9 diff.
- Primary focus: the seven entitlement/Phase-9 migrations
  (`20260911204057`–`20260912051700`, the last one new — see Finding 1),
  `has_hufmanager_access_v1`, `get_hufmanager_access_context_v1`, the
  legacy backfill function, `create_invoice_with_items`, and the frontend
  `HufmanagerSlimAccessGate` / `useHufmanagerSlimAccess`.
- Method (first pass): sub-agent identified candidates by reading the diff
  + full current file contents; each candidate was independently
  reproduced empirically against the local Supabase **dev/staging**
  instance. I separately spot-verified the underlying facts.
- Method (fix verification pass, this update): a **fresh isolated restore
  of the real Production backup** (`hufmanager_prod_pre_entitlement.dump`,
  sha256 `09f0b41263f209ab47515735ec10dd596347998b5d8a889f2cbf656b454f573f`)
  with the full corrected migration stack applied, then every fix
  exercised end to end via `scripts/phase9-security-remediation-tests.sql`
  (new, F1-T1..T9 / F2-T1..T8 / F3-T1..T4c) plus the existing
  `phase9-*-tests.sql` suite. Database dropped afterward; Production
  itself was never written to.

**Important methodology correction found during fix verification:** the
original findings were verified against the local dev/staging instance,
which this task assumed "mirrors the intended Production deploy" — it
does not, for RLS specifically. Testing against a real Production
restore surfaced that staging carries several extra permissive policies
Production does not have (see "Additional findings" below). Findings 1-3
below are unaffected by this (their root cause is independent of which
policy set is used), but it materially changed how Finding 2 had to be
re-verified — see Finding 2.

## Findings

### 1. `invoices` Phase-9 gate is fully bypassed by `create_invoice_with_items` — HIGH — **FIXED**

- File: `supabase/migrations/20260912051500_add_hufmanager_slim_rls_direct_api_enforcement_v1.sql:91-101,158-168`. Root cause: pre-existing `create_invoice_with_items(jsonb,jsonb)` in `supabase/migrations/20260908161000_p0_correction_pass.sql:56`.
- `postgres` (owner of `create_invoice_with_items`, `SECURITY DEFINER`) has `rolbypassrls = true`, so RLS on `invoices` is invisible to this RPC regardless of the Phase 9 gate.
- **Fix**: new migration `supabase/migrations/20260912051700_fix_create_invoice_with_items_entitlement_gate_v1.sql` (a new migration, not an edit to the 2026-09-08 original — `create_invoice_with_items` predates `has_hufmanager_access_v1()`, so referencing it there would be a forward dependency; this migration runs last, after that helper exists). Adds `IF NOT (has_hufmanager_access_v1() OR is_admin(v_actor) OR is_master_admin()) THEN RAISE EXCEPTION ...` right after the existing "provider must match authenticated user" check. `create_invoice_with_items` itself does **not** exist on Production yet (confirmed read-only), so this migration was safe to write directly rather than as a same-day corrective patch on top of a live function.
- **Evidence**: `scripts/phase9-security-remediation-tests.sql` F1-T1 through F1-T9, all PASS against a real Production-data restore with the corrected stack: ACTIVE provider succeeds (T1); NO_ENTITLEMENT/PAUSED/FROZEN all rejected with `'HufManager Slim access required to create invoices'` (T2-T4); foreign-client and provider-impersonation attempts still correctly rejected by the pre-existing checks (T5-T6); admin-as-provider bypass preserved (T7); direct-table and RPC paths agree for the not-entitled case (T8); a rejected (mismatched-total) call leaves no partial invoice/invoice_items row — atomicity intact (T9).
- **Rollback note (new)**: rolling back Phase 9 by dropping `has_hufmanager_access_v1()` while leaving this fix in place breaks `create_invoice_with_items` at runtime (`function ... does not exist`) rather than reintroducing the bypass — fails closed, not open, but invoice creation stops working entirely until either the function is reverted too or `has_hufmanager_access_v1()` is restored. Documented in the rehearsal doc's rollback section; anyone rolling back Phase 9 in the future must roll back this migration first (or accept invoices are down until they do).

### 2. `horses` Phase-9 gate has zero effect for the `created_by_provider_id` ownership path — HIGH — **FIXED**

- File: `supabase/migrations/20260912051500_add_hufmanager_slim_rls_direct_api_enforcement_v1.sql:103-118,174-190`.
- **Fix**: both `horses` RESTRICTIVE policies now check `NOT (EXISTS(access_grants ...) OR EXISTS(profiles WHERE created_by_provider_id = auth.uid()))`, covering both real provider-relationship paths, matching `provider_can_manage_client_horses()`'s own logic.
- **Correction versus the original finding**: the original finding (and its live reproduction) was run against the local dev/staging instance. Re-verifying against a real Production restore found Production's actual permissive policies on `horses` do **not** include a `created_by_provider_id` branch at all today (only `access_grants`) — staging has extra, newer policies Production doesn't have. This means the exact bypass described in the original finding is **not currently exploitable on Production** (there is no permissive grant for that path to bypass yet) — but the fix is still correct and necessary as defense-in-depth: the moment Production's `horses` policies are ever updated to match staging (a real, apparently-already-planned change), the Phase 9 gate must already cover it, not silently reopen this exact hole. See "Additional findings" below for the drift itself, tracked separately.
- **Evidence**: `scripts/phase9-security-remediation-tests.sql` F2-T1 through F2-T8, all PASS. Because Production doesn't yet have the `created_by_provider_id` permissive grant, the test installs it temporarily (staging-equivalent, inside the same rolled-back transaction) specifically so the entitlement *gate's own logic* can be exercised end to end rather than being untestable due to an unrelated missing grant: entitled provider via this path succeeds (T1); the same provider without entitlement / PAUSED / FROZEN is denied (T2-T4); the client's own view of their horse is unaffected either way (T5, see caveat below); an unrelated client and an unrelated provider (own entitlement, no relation) stay denied (T6-T7); admin-as-provider bypass works on this path too (T8).

### 3. `has_hufmanager_access_v1(uuid)` is directly callable as a cross-account entitlement-status oracle — MEDIUM — **FIXED**

- File: `supabase/migrations/20260911204100_add_hufmanager_slim_access_context_api_v1.sql`.
- **Fix**: `has_hufmanager_access_v1()` now takes no argument, always evaluates against `auth.uid()`, granted to `authenticated`. Every RLS call site (11 across `20260912051500`) updated to call it with no argument (behaviourally identical — they always passed `auth.uid()` anyway). Confirmed no frontend code calls this function directly (only `get_hufmanager_access_context_v1()`, unaffected). The rare legitimate server-side/test-harness need for an arbitrary-uuid lookup now goes through a new internal function, `public._hm_has_hufmanager_access_v1(_user_id uuid)` — `REVOKE ALL FROM PUBLIC/anon/authenticated`, `GRANT EXECUTE TO service_role` only, same posture as every other internal helper in this V1 (writer, reconciler).
- **Evidence**: `scripts/phase9-security-remediation-tests.sql` F3-T1 through F3-T4c, all PASS: own-account query succeeds (T1); the old `(uuid)` signature no longer exists as a callable overload at all (T2); `anon` denied `EXECUTE` (T3); the internal helper still answers for an arbitrary uuid under sufficient privilege (T4) and is *not* reachable by `authenticated` (T4c).

## Additional findings — CORRECTED after live Production verification (Block 2)

**Correction, 2026-09-12, Block 2:** the two items originally reported
here ("horses has no owner-self-view policy on Production", "contacts
has no admin cross-account view policy on Production") were **wrong**.
Both policies ( `"Horse owner full access"` on `public.horses`,
`"Admins can view all contacts"` on `public.contacts`) genuinely exist
and work correctly on real Production — confirmed by running
`scripts/phase9-rls-direct-api-adversarial-tests.sql` and
`scripts/phase9-security-remediation-tests.sql` live against Production
itself (wrapped in `BEGIN...ROLLBACK`, nothing committed): A3c, F2-T5 and
A4a all now return the expected `1`, not `0`.

**Root cause of the original wrong report**: the isolated restore used to
verify F1/F2/F3 (`hm_rehearsal_secfix_20260912T1030Z`) was restored with
`pg_restore -j 4` (4 parallel workers). `pg_restore`'s own summary line
("273 errors ignored") was only spot-checked against a few expected,
already-documented restore-target caveats (the `pg_cron` sequences, a
few superuser-only event triggers) — it was not fully audited, and these
two `CREATE POLICY` statements were silently among the ignored errors,
most likely lost to a parallel-restore dependency race (`-j 4`), not a
real absence on Production. Lesson for future rehearsals: either restore
with `-j 1` for full fidelity, or fully grep the ignored-error list for
every `CREATE POLICY`/`CREATE TABLE`/etc. statement before drawing any
conclusion from what a restored copy does *not* show.

**What is still correct from the original finding**: the *provider-side*
half of Finding 2 — that Production's `"Provider can view/delete/create
client horses"` policies check `access_grants` only, with no
`created_by_provider_id` branch (unlike the local dev/staging instance)
— is independently re-confirmed directly against live Production
(`SELECT ... FROM pg_policies WHERE tablename='horses'`) and stands
exactly as reported in Finding 2 above. Only the two *client/admin-view*
items were false positives from the restore artifact.

Net effect: there is no known pre-existing customer-horse-visibility or
admin-contact-visibility gap on Production. `BLOCK2_PRECONDITION_TECH_DEBT`
is retracted; nothing carries forward to Block 2/3 planning from this
item.

## What was checked and found correct (no finding)

Fixed `search_path` on every new function; `REVOKE ALL FROM PUBLIC/anon/authenticated` + `GRANT` only to the intended role on writer/reconciler/backfill; zero write grants to `authenticated` on `product_entitlements`; no SQL injection, no hardcoded secrets; legacy backfill's `created_at < p_cutover_at` one-shot structural guard, idempotent on a second real run (verified: second `hm_backfill_..._v1(now(), false)` call inserts 0 additional rows, `product_entitlements` stays at 36); no PII written into the new audit/metadata columns beyond what already exists in `profiles`.

## Final verdict

```
SECURITY_REVIEW=PASS
F1_INVOICE_RPC_BYPASS=FIXED
F2_HORSES_CREATED_BY_PROVIDER_BYPASS=FIXED
F3_ACCESS_ORACLE=FIXED
NONBLOCKING_WARN=0 (the 2 originally reported Production RLS gaps were retracted after live verification -- see "Additional findings — CORRECTED")
```
