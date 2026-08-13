# HufManager Shared Supabase Security Gate Audit

Datum: 2026-08-13

Scope: READ-ONLY Live-Befunde des Nutzers, lokale Migrationen, lokale Source-Referenzen, vorbereitete Migrations-/Testartefakte. Keine Production-Migration wurde angewendet.

## Executive Summary

HufManager und HufiApp teilen aktuell dieselbe Supabase-Instanz. Die Product-Splitter-Migration ist vorbereitet, aber nicht angewendet. Bestehende Legacy-Nutzer dürfen weiterhin nicht automatisch anhand von `role`, `signup_app`, `subscription_status`, `user_metadata`, Pferdebesitz oder historischem App-State einem Produkt zugeordnet werden.

Production bleibt blockiert, bis folgende Gates erledigt sind:

- Product-Splitter-Dry-Run mit aggregierter Ausgabe.
- DB-/Storage-Backup verifiziert.
- Prepared-Migrations geprüft und explizit freigegeben.
- Live-RLS- und Storage-Policies gegen Cross-User/Cross-Product getestet.
- Security Advisor Findings erneut geprüft.
- Keine automatische ID-Generierung oder Backfill auf Basis von `horses.eqid IS NULL`.

## Live-Befunde

| Bereich | Befund | Bewertung |
| --- | --- | --- |
| `profiles` | 79 total | Shared legacy Bestand |
| `profiles.signup_app` | 78 `NULL`, 1 `hufiapp` | 78 benötigen Product Choice |
| `horses` | 60 total, 60 gültige `owner_id`, 0 orphan owner relationships | Datenbeziehungen erhalten |
| Pferdebesitz | 36 unterschiedliche Nutzer besitzen mindestens ein Pferd | Pferdebesitz ist kein Produktmarker |
| `provider_subscriptions` | 0 | Keine verified paid Quelle |
| `manual_payments` | 0 | Keine verified paid Quelle |
| `client_subscriptions` | 4 active | KundenApp-/Client-Kontext, nicht SaaS-Provider-Beweis |
| `profiles.copecart_subscription_id` | 1 gesetzt | Ein möglicher Payment Marker |
| `subscription_status` | `active`/`trialing` nicht ausreichend | Nicht `VERIFIED_PAID` |
| SECURITY DEFINER Functions | 153 live total; 148 anon executable; 151 authenticated executable; 2 neither anon nor authenticated executable | Confirmed overbroad RPC surface |
| Core RLS | Enabled on profiles, user_roles, horses, appointments, hoof_analyses, hoof_photos, horse_documents, horse_media, horse_partner_access, access_grants, invoices, invoice_items, expenses, leads, client_subscriptions, provider_subscriptions | Positive, but not proof of secure policies |
| Storage public SELECT | `hoof_photos` policy `Public Access`; `horse-photos` policy `Public can view horse photos` | CONFIRMED P0 before production |
| Storage broad authenticated SELECT | `hoof_images`, `documents`, `hoof_photos` entire buckets | CONFIRMED P0/P1 hardening requirement |
| Bucket public flag | `hufcam-images` public; `blog-images`, `gallery`, `logos` public | `hufcam-images` requires content/use audit |

## Canonical ID Truth

Live-Befund:

- `horses.eqid`: bei allen 60 Pferden leer.
- `horses.readable_id`: 60/60 gesetzt, 60/60 Präfix `EQID`.
- `profiles.readable_id`: `KID` 47, `PID` 30, `EID` 1, `PRID` 1.
- `profiles.ecosystem_id`: 79/79 leer.

Konsequenz:

- `horses.readable_id` ist aktuell die bestehende fachliche EQID-Identität.
- `horses.eqid` ist ein leerer Altbestand und darf nicht als Anlass für neue EQID-Generierung genutzt werden.
- Keine bestehende `readable_id` darf durch Product Choice, Rollenreparatur oder Slim-Migration geändert werden.

## ID System Mapping

| PREFIX | ENTITY | CURRENT_COLUMN | GENERATOR | IMMUTABLE | REFERENCED_BY | TARGET_CANONICAL_COLUMN | MIGRATION_REQUIRED |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EQID` | Horse / Equine | `horses.readable_id` | `generate_horse_readable_id()` via `generate_horse_readable_id_trigger`; uses `generate_random_id('EQID')` | Not enforced today | Pferdeakte, Kundenlisten, Admin-Datenhub, `search_horse_by_readable_id`, UI display; legacy `horses.eqid` only in old quality checks | `horses.readable_id` | YES: immutability guard, no backfill, no new generation |
| `KID` | Customer / client profile | `profiles.readable_id` | `generate_profile_readable_id()` default/client branch; historical raw metadata dependency exists in older migration | Not enforced today | Kundenverwaltung, profile search, access grants, admin views | `profiles.readable_id` | YES: immutability guard and generator review, no value rewrite |
| `PID` | Provider / business user profile | `profiles.readable_id` | `generate_profile_readable_id()` provider branch | Not enforced today | Provider admin, revenue views, customer relationships | `profiles.readable_id` | YES: immutability guard and role/product separation |
| `EID` | Employee profile | `profiles.readable_id` | Role repair / later profile readable ID logic; live count confirms use | Not enforced today | Employee/admin contexts | `profiles.readable_id` | YES: needs generator/path review before future role changes |
| `PRID` | Partner profile and CRM partner contact | `profiles.readable_id`, `contacts.readable_id` | `generate_profile_readable_id()` partner branch; `generate_contact_readable_id()` for contacts | Not enforced today | Partner integration, contacts CRM, admin search | `profiles.readable_id` for accounts; `contacts.readable_id` for CRM contacts | YES: immutability guard; clarify account vs contact namespace |

## SECURITY DEFINER Surface

Live reality on 2026-08-13 confirms 153 SECURITY DEFINER functions, of which 148 are executable by `anon` and 151 by `authenticated`. Only 2 are neither `anon` nor `authenticated` executable. The Function-Privilege-Surface is therefore confirmed too broad.

Local migration scan using `scripts/security-definer-surface-audit.mjs` found 162 unique `SECURITY DEFINER` function names in the local migration history, including newly prepared functions. This is a source-side classification; live `pg_proc` remains the authority before production apply.

| Classification | Count | Examples / Notes |
| --- | ---: | --- |
| `PUBLIC_INTENTIONAL` | 11 | Public landing/review/magic-link functions; must still validate payload, rate limit and avoid private data |
| `AUTHENTICATED_REQUIRED` | 15 | Role/context/RPC helpers such as `get_user_role`, `get_horse_medical_data`, `get_provider_clients`, `get_partner_shared_data`, `get_agent_data_hub`, Hufi credit functions |
| `INTERNAL_TRIGGER_ONLY` | 85 | Trigger/helper functions such as `handle_new_user`, `notify_*`, `validate_*`, `generate_*`, `prevent_*`, `protect_*`; direct API EXECUTE generally not needed |
| `ADMIN_ONLY` | 12 | Admin dashboards, repair, admin metadata, invoice/contract generators; body-level admin checks required |
| `BACKEND_ONLY` | 1 | `add_purchased_voice_credits`; service-role/server-only |
| `UNSAFE_OR_SUSPICIOUS` | 4 | `search_horse_by_readable_id`, `delete_client_cascade`, `delete_horse_safe`, `generate_random_id` |
| `NEEDS_REVIEW` | 34 | Mixed helper/application functions requiring live body/privilege export |

Critical findings:

- `search_horse_by_readable_id(text)` is a confirmed P0. Live body has no `auth.uid()`, relationship or permission check and currently returns horse UUID, readable_id, name, photo_url, breed and owner_id from guessed EQID. Live grants include anon and authenticated EXECUTE.
- `generate_random_id(text)` is an internal helper but may be directly executable if grants are not hardened.
- Trigger functions should not be callable as public RPC endpoints.
- `admin_repair_user_role(...)` can change role-related `readable_id` prefix in historical logic. That conflicts with the new canonical ID immutability rule and requires review before future use.
- `delete_client_cascade` and `delete_horse_safe` have live-confirmed internal auth.uid/relationship checks, so they are not equivalent to the EQID leak. They still should not be anon-executable.

## Function Usage Audit

| Function / Surface | Usage | Classification | Hardening Impact |
| --- | --- | --- | --- |
| `search_horse_by_readable_id` | `src/components/network/ConnectionSearch.tsx`; docs/QA references; Observation flow explicitly avoids it | USED_FRONTEND | Anon must be revoked. Authenticated may remain only with hardened body and relationship checks. UI must handle `found:false` for unauthorized EQID. |
| `delete_client_cascade` | `src/components/customers/CustomerDetailModal.tsx` | USED_FRONTEND | Revoke anon; keep authenticated only with body authorization. |
| `delete_horse_safe` | `src/components/customers/CustomerDetailModal.tsx` | USED_FRONTEND | Revoke anon; keep authenticated only with body authorization. |
| `generate_random_id` | SQL generator functions and admin role repair; no frontend/edge call found | USED_DATABASE | Revoke anon/authenticated direct RPC; trigger/SQL execution remains internal. |
| `hoof_photos` bucket | `HufCamPro.tsx`, `generate-collages.js`; HufCam stores `photo_url=fileName`, `url=publicUrl` | USED_FRONTEND / SCRIPT | Removing public read may break direct publicUrl rendering until signed/authorized URL path is used. |
| `horse-photos` bucket | Historical bucket; no direct current frontend storage call found in focused search | LEGACY_UNKNOWN | Public read should be removed; owner-folder read only until mapping confirmed. |
| `hufcam-images` bucket | No active code path found; historical docs say public/empty | UNKNOWN | Do not flip bucket public flag before live object-content audit. |

## RLS Audit Result

Local migrations show RLS enabled for core tables including:

- `profiles`
- `user_roles`
- `horses`
- `appointments`
- `hoof_photos`
- `horse_documents`
- `horse_media`
- `access_grants`
- `horse_partner_access`
- `invoices`
- `expenses`
- `provider_subscriptions`
- prepared `product_memberships`

Open live verification:

| Table / Area | RLS Status From Local Migrations | Gate |
| --- | --- | --- |
| Profiles | Enabled, multiple relationship/admin policies | Verify anon denied and cross-profile access bounded |
| User roles | Enabled | Verify no `user_metadata` authz and no role enumeration |
| Horses | Enabled | Verify owner/provider/partner/customer boundaries |
| Appointments | Enabled | Verify cross-provider and customer-app boundaries |
| Hoof photos / media | Enabled for table, storage needs separate check | Verify object path policies |
| Horse documents | Enabled plus storage policies | Verify no URL/object bypass |
| Access grants | Enabled | Verify no cross-business grant manipulation |
| Horse partner access | Enabled with partner/provider/client policies | Verify owner approval and active/status gates |
| Invoices / invoice items | Invoices enabled; invoice_items require live schema policy export | Verify business billing separation from SaaS billing |
| Expenses | Enabled | Verify provider-only scope |
| Subscriptions | Provider subscriptions enabled; client subscriptions live active count observed | Verify SaaS billing vs customer billing separation |
| Leads | Enabled | Verify public lead endpoint does not expose tenant IDs or business data |
| Product memberships | Prepared, not applied | Must be applied and tested before production splitter |

## Storage Audit Result

Local migrations show many storage buckets and policies. Relevant buckets include:

- `horse-photos`
- `horse-documents`
- `horse-media`
- `horse-vault`
- `expense-receipts`
- `office-pdfs`
- `admin-invoices`
- `legal-documents`
- `completion-reports`

Findings:

- `hoof_photos` has confirmed live public SELECT policy `Public Access` with `bucket_id = 'hoof_photos'`.
- `horse-photos` has confirmed live public SELECT policy `Public can view horse photos` with `bucket_id = 'horse-photos'`.
- `hoof_images`, `documents` and `hoof_photos` have confirmed live broad authenticated SELECT on entire buckets.
- `horse-photos` was once public/broadly readable, later set non-public, but broad policies remain active by OR-effect.
- `horse-documents` has several policy rewrites and relationship-based policies; live state must be verified because migration history contains superseded variants.
- `horse-media` has a dedicated bucket with allowed MIME types and owner path checks; live cross-user object tests still required.
- Some buckets are intentionally public or broadly readable for website/content assets (`logos`, `blog-images`, `gallery`), but they must not contain customer/horse data.
- `hufcam-images` bucket is public and not blindly changed because current repository evidence does not prove whether it contains horse/customer data or active content.
- `office-pdfs` had historical public-read removal; live verification required.

Prepared storage migration:

- `supabase/migrations/20260813001000_storage_policy_hardening_prepared.sql`
- Removes confirmed broad/public SELECT policies.
- Adds relationship-scoped `hoof_photos` object SELECT using `hoof_photos` + `horses` relationship.
- Adds conservative owner-folder SELECT for `horse-photos`, `hoof_images`, `documents`, and `hufcam-images`.
- Does not flip `hufcam-images` bucket public flag.

Expected breaking impact:

- `HufCamPro.tsx` currently stores/uses `getPublicUrl()` for `hoof_photos`; public-read removal requires signed URLs or authenticated object fetch in runtime before production apply.
- `scripts/generate-collages.js` uses `getPublicUrl()` for `hoof_photos`; should be updated or run only in an authorized/server context.

## Security Advisor Additional Findings

| Finding | Classification | Rationale |
| --- | --- | --- |
| `anon_security_definer_function_executable` | PRODUCTION_REQUIRED | Default PUBLIC execute on SECURITY DEFINER can bypass RLS |
| `authenticated_security_definer_function_executable` | PRODUCTION_REQUIRED | Authenticated users still must pass relationship/product checks |
| Leaked password protection disabled | RECOMMENDED | Auth hardening for production; enable after confirming Auth settings and user impact |
| `pg_net` extension in public schema | NEEDS_REVIEW | Extension placement should be verified; moving can impact existing jobs/functions |

## Prepared Migrations

Prepared only, not applied:

1. `supabase/migrations/20260812233000_function_execute_privilege_hardening_prepared.sql`
   - Targeted `REVOKE`/`GRANT` by classified function group.
   - Removes anon from sensitive functions.
   - Removes direct RPC execution for selected trigger/helper functions.

2. `supabase/migrations/20260812233100_security_definer_body_hardening_prepared.sql`
   - Replaces `search_horse_by_readable_id(text)` body with relationship checks.
   - Requires `auth.uid()`.
   - Allows owner, provider-for-horse, active partner access, or admin.

3. `supabase/migrations/20260812233200_canonical_readable_id_guard_prepared.sql`
   - Adds immutability triggers for existing `readable_id`.
   - Protects non-empty legacy `horses.eqid` if present in another environment.
   - Does not backfill, rewrite, delete or generate IDs.

4. `supabase/migrations/20260813001000_storage_policy_hardening_prepared.sql`
   - Drops confirmed public/broad storage SELECT policies.
   - Adds relationship/owner scoped replacements.
   - Leaves `hufcam-images` bucket public flag unchanged pending object-content audit.

Existing splitter migration remains:

- `supabase/migrations/20260812231000_product_membership_splitter.sql`
- Status: prepared, not applied.

## Prepared Tests

Prepared:

- `scripts/security-definer-surface-audit.mjs`
- `scripts/shared-security-gate-negative-tests.sql`

Test intent:

- Anon cannot execute admin/delete/medical/billing/random-ID functions.
- Trigger/helper functions are not public RPC endpoints.
- Product membership uses `UNIQUE(user_id, product)`.
- Product membership RLS exists after splitter migration.
- Readable ID immutability triggers exist after ID guard migration.
- Readable ID knowledge never grants access without RLS/relationship permission.

Live tests still required:

- USER A cannot see USER B horses, appointments, documents, invoices.
- BUSINESS A cannot see BUSINESS B data.
- CUSTOMER A cannot see CUSTOMER B customer-app data.
- HUFMANAGER membership does not imply HUFIAPP access.
- HUFIAPP membership does not imply HUFMANAGER access.
- Storage object paths cannot be guessed across users.
- ANON + known EQID returns no horse/owner data.
- AUTH USER A + USER B EQID returns no data unless relationship exists.
- ANON `hoof_photos` and `horse-photos` object read denied.
- AUTH USER A cannot read USER B hoof image/document object.
- Authorized owner/provider/partner relationship remains allowed.

## Production Gate

Status: `BLOCKED`

Required before production:

1. Export live function privileges and compare with local classification.
2. Export live RLS policies and storage policies.
3. Run product splitter dry run with aggregated output only.
4. Verify database and storage backup.
5. Review prepared migrations.
6. Apply migrations only after explicit approval.
7. Run negative SQL tests and cross-user runtime tests.
8. Re-run Security Advisor.
9. Confirm no existing IDs changed.
