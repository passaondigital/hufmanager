# HufManager Slim — Entitlement V1, Block 1 — Production Snapshot Rehearsal

Status: **REHEARSAL EXECUTED FOR REAL, THIS SESSION, AGAINST AN ISOLATED
RESTORE OF PRODUCTION. PRODUCTION ITSELF WAS NEVER WRITTEN TO.** This
document formalizes the rehearsal Block 1's authorization depended on
(Gate C), which had no prior repo artifact — see
`HUFMANAGER_SLIM_ENTITLEMENT_PRODUCTION_READINESS_V1.md` and
`HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md` for everything this builds on.

**Update (same day, security remediation):** after
`HUFMANAGER_SLIM_ENTITLEMENT_SECURITY_REVIEW_2026-09-12.md` found and
this session fixed 3 findings (F1/F2/F3), the ENTIRE rehearsal below was
re-executed from scratch on a second, separate fresh isolated restore
(`hm_rehearsal_secfix_20260912T1030Z`) with the FINAL corrected
7-migration stack (the original 6 plus the new
`20260912051700_fix_create_invoice_with_items_entitlement_gate_v1.sql`).
Section 8 records that re-run. Sections 1-7 below are the original,
pre-fix rehearsal (6 migrations) and are kept for the record — every
number in both runs matches.

## 1. Backup used

- File: `/home/administrator/prod-db-backup-pre-entitlement/20260912T063224Z/hufmanager_prod_pre_entitlement.dump`
- Size: 28188573 bytes
- SHA256: `09f0b41263f209ab47515735ec10dd596347998b5d8a889f2cbf656b454f573f`
  — verified via `sha256sum -c SHA256SUMS` this session, matches exactly.

## 2. Restore method

- Target: a freshly created, isolated database
  (`hm_rehearsal_entitlement_20260912T0952Z`) inside the existing local
  Supabase Postgres container (`supabase_db_vnschgjxkzzwzefqlrji`,
  Postgres 17.6) — same approach as the prior backup/restore drill
  (§9a of the legacy-compatibility doc), never Production, never the
  ongoing XXL-staging database.
- `pg_restore --no-owner --no-privileges -j4`. 205 errors ignored, all of
  the same class already documented in §9a: `cron.*_seq` sequences
  absent (pg_cron is single-database-locked to `postgres` on this
  cluster, so a differently-named restore target cannot receive cron
  state — a restore-target caveat, not a backup defect) and a handful of
  superuser-only event-trigger/extension statements. Nothing
  business-data-related failed.
- Post-restore sanity check against known Production baseline: `profiles`
  101 rows, `user_roles` provider=37 / admin=2 (exact match to the
  documented cohort in `HUFMANAGER_SLIM_LEGACY_COMPATIBILITY_V1.md` §2),
  `hm_lifecycle_events`=1 row (exact match), `product_entitlements`
  absent (correct, pre-entitlement state).
- Database dropped again immediately after the rehearsal; staged dump
  copy removed from the container. Nothing left behind.

## 3. Migration order applied (identical to the Block 1 deploy order)

1. `20260911204057_add_hufmanager_slim_entitlement_schema_v1.sql`
2. `20260911204058_add_hufmanager_slim_entitlement_writer_v1.sql`
3. `20260911204059_add_hufmanager_slim_entitlement_reconciler_v1.sql`
4. `20260911204100_add_hufmanager_slim_access_context_api_v1.sql`
5. `20260912051500_add_hufmanager_slim_rls_direct_api_enforcement_v1.sql`
6. `20260912051600_add_hufmanager_slim_legacy_backfill_v1.sql`

All six applied cleanly, in order, with no errors, against the restored
copy of real Production data.

## 4. Legacy classification — real dry run, real data, no PII in this report

Executed `public.hm_backfill_hufmanager_slim_legacy_entitlements_v1(now(), true)`
(the actual shipped function, not a manual re-derivation of the rule) against
the restored copy, aggregated by class:

| Class | Count | Action |
|---|---|---|
| PROVEN_PAID | 1 | DRY_RUN_WOULD_INSERT |
| PROVEN_MANUAL_GRANT | 3 | DRY_RUN_WOULD_INSERT |
| PROVEN_TRIAL | 3 | DRY_RUN_WOULD_INSERT |
| AMBIGUOUS_ACTIVE_ONLY | 28 | DRY_RUN_WOULD_INSERT |
| SUSPENDED | 1 | DRY_RUN_WOULD_INSERT |
| NO_EVIDENCE | 1 | SKIPPED_NO_EVIDENCE |
| PROVEN_ADMIN_EMPLOYEE | 2 | n/a — `admin` role, outside this function's cohort by design |

`BACKFILL_PREVIEW_ROWS=36` (sum of every `DRY_RUN_WOULD_INSERT` row).
`product_entitlements` row count after the dry run: **0** — confirms the
dry run wrote nothing.

Every number matches exactly what was expected going into this rehearsal.

## 5. Rollback — executed for real on the isolated copy

Full rollback sequence (10x `DROP POLICY`, `DROP FUNCTION` backfill,
`DROP TRIGGER`, `DROP FUNCTION` x5 writer/trigger-wrapper/reconciler/access-API x2)
executed as a single multi-statement batch. First two attempts failed
mid-batch on wrong function signatures (Postgres's simple-query protocol
runs a multi-statement batch as one implicit transaction, so both failed
attempts rolled back atomically and left zero partial state — verified,
not assumed). Third attempt, with corrected signatures, succeeded
completely.

| Check | Before | After rollback |
|---|---|---|
| `hm_lifecycle_events` rows | 1 | 1 (untouched) |
| `hufi_data_events` rows | 2 | 2 (untouched) |
| `hufi_data_state` rows | 2 | 2 (untouched) |
| Phase 9 RLS policies on the 5 protection-surface tables | 10 | 0 |
| `product_entitlements` rows | 0 | 0 |
| `product_entitlements` table | exists | still exists (left in place, unused — additive-only rollback, matches §6 of the readiness doc) |
| Entitlement/access functions (writer, trigger wrapper, reconciler, access API, `has_hufmanager_access_v1`, legacy backfill) | 6 | 0 |

`ROLLBACK_RLS=PASS`
`ROLLBACK_PRESERVES_ENTITLEMENTS=PASS`
`ROLLBACK_PRESERVES_LIFECYCLE=PASS`

## 6. Production impact

Zero. Every step in this rehearsal ran against the isolated
`hm_rehearsal_entitlement_20260912T0952Z` database, which has since been
dropped. Production identity/state was verified read-only, separately,
via a session with `default_transaction_read_only=on` (see Gate A in
this release's chat record) — no write statement was ever issued against
`vnschgjxkzzwzefqlrji`.

```
FINAL_PRODUCTION_SNAPSHOT_REHEARSAL=PASS
REHEARSAL_EVIDENCE=PASS
BACKUP_ANCHOR=PASS
ENTITLEMENT_ROWS=36
ACTIVE_PAID=1
ACTIVE_TRIAL=3
LEGACY_MANUAL_GRANT=3
LEGACY_ADMIN_EMPLOYEE=2
LEGACY_COMPATIBILITY_REVIEW_REQUIRED=28
SUSPENDED=1
NO_EVIDENCE=1
ROLLBACK_RLS=PASS
ROLLBACK_PRESERVES_ENTITLEMENTS=PASS
ROLLBACK_PRESERVES_LIFECYCLE=PASS
PRODUCTION_WRITES=0
PRODUCTION_CHANGED=NO
```

## 8. Re-run with the final corrected (security-fixed) stack

Same backup, same checksum, same restore method, second fresh isolated
database (`hm_rehearsal_secfix_20260912T1030Z`), dropped afterward.
**Correction to the restore method**: this run used `pg_restore
--no-owner` (privileges included), not `--no-owner --no-privileges` as
in the original run above — the first attempt of this re-run, restored
with `--no-privileges`, stripped Production's real table-level `GRANT`s
and produced false `permission denied` errors unrelated to RLS; recreated
and restored correctly before re-testing. Migration stack: the original 6
files (all unchanged except migrations `20260911204100` and
`20260912051500`, corrected per the security review) plus the new
`20260912051700` — 7 migrations total, applied in order, no errors.

Full existing suite plus the new
`scripts/phase9-security-remediation-tests.sql` executed against this
copy:

| Suite | Result |
|---|---|
| `phase9-entitlement-core-reverify.sql` (T1-T17, T24, T25) | PASS |
| `phase9-invoice-rls-tests.sql` (1-8) | PASS |
| `phase9-legacy-backfill-lab-tests.sql` | PASS |
| `phase9-rls-direct-api-adversarial-tests.sql` | PASS (3 pre-existing, Phase-9-unrelated Production/staging RLS drift items recorded as `INFO`, not failures — see the security review doc's "Additional findings") |
| `phase9-security-remediation-tests.sql` (new) | PASS — F1-T1..T9, F2-T1..T8, F3-T1..T4c |

Legacy classification dry run, re-run against this corrected stack:
identical to Section 4 above, byte-for-byte (`PROVEN_PAID=1,
PROVEN_MANUAL_GRANT=3, PROVEN_TRIAL=3, AMBIGUOUS_ACTIVE_ONLY=28,
SUSPENDED=1, NO_EVIDENCE=1`, `BACKFILL_PREVIEW_ROWS=36`).

**New this run**: a REAL (non-dry-run) backfill execution, twice, to
prove idempotency with real data (not just the dry-run path already
covered by `phase9-legacy-backfill-lab-tests.sql`'s synthetic fixtures):
run 1 inserted exactly 36 rows; run 2 inserted 0 additional rows
(`product_entitlements` stayed at 36) — the one `NO_EVIDENCE` account
correctly stays `SKIPPED_NO_EVIDENCE` on every run, never granted.

Rollback re-run with real entitlement data present (36 real rows, not an
empty table): all 10 Phase 9 RLS policies and all 7 entitlement/access
functions dropped cleanly; `product_entitlements`'s 36 rows preserved
exactly (additive-only rollback — table and data left in place, per the
original rollback plan); `hm_lifecycle_events` (1) and `hufi_data_events`
(2) untouched. **New finding from this run**: with the F1 fix in place,
rolling back `has_hufmanager_access_v1()` while leaving
`create_invoice_with_items` un-reverted breaks invoice creation at
runtime (`function has_hufmanager_access_v1() does not exist` —
confirmed live) rather than reintroducing the bypass. Fails closed, not
open, but is an operational gap in the rollback plan: rolling back Phase
9 must also revert `20260912051700` (or restore
`has_hufmanager_access_v1()` before dropping it), or invoices stay broken
until that's done. Recorded here, not yet fixed in the rollback runbook
text itself — a documentation follow-up, not a blocker.

```
FINAL_PRODUCTION_SNAPSHOT_REHEARSAL_SECFIX=PASS
MIGRATION_COUNT=7
LEGACY_CLASSIFICATION_MATCH=PASS
BACKFILL_ROWS=36
BACKFILL_IDEMPOTENT_SECOND_RUN=PASS (0 additional rows)
F1_TESTS=PASS
F2_TESTS=PASS
F3_TESTS=PASS
ROLLBACK_REHEARSAL=PASS
ROLLBACK_CAVEAT=create_invoice_with_items (20260912051700) must be rolled back before/with has_hufmanager_access_v1, or invoice creation breaks
TYPECHECK=PASS
PRODUCTION_WRITES=0
PRODUCTION_CHANGED=NO
```
