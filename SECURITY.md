# HufManager Security Master Register

Stand: 2026-08-14
Letzte Produktionsverifikation: 2026-08-14
Supabase Projekt: vnschgjxkzzwzefqlrji

---

## Verbindliche Synchronisationsregel

JEDE erfolgreiche Sicherheitsaufgabe muss atomar aktualisieren:

A) Kanonisches SECURITY.md (dieses Dokument)
B) Kanonisches SECURITY_TODO.md
C) HufiOS SECURITY.md / RELEASE_STATUS.md / product-status.json
D) Git-Evidenz/Migrationsreferenz wo zutreffend

Eine Sicherheitsaufgabe ist NICHT abgeschlossen, wenn eines davon veraltet ist.

## Verbindliche Agenten-Secret-Handling-Regel

Ein Agent darf niemals `cat .env*` ausführen oder Secrets via `grep` im Klartext ausgeben. Zur Überprüfung von Umgebungsvariablen dürfen ausschließlich die Existenz (YES/NO) oder die Schlüsselnamen (Keys) inventarisiert werden. Jede versehentliche Offenlegung von Secrets erfordert eine sofortige Rotation des betroffenen Keys und eine Registrierung unter SEC-003.

---

## Storage Security

| ID | Titel | Status | Prio | Letzte Verifikation | Evidenz | Retest-Trigger |
|---|---|---|---|---|---|---|
| STORAGE-001 | Provider Self-Grant | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | Phase 1 Migration + Production acceptance tests | access_grants Aenderung |
| STORAGE-002 | Partner Invitation Takeover | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | Phase 1 Migration + Production acceptance tests | horse_partner_access Aenderung |
| STORAGE-003 | Horse Documents Broad Upload | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | 20260814160400_p1_storage_policy_hardening_phase1.sql — DROP "Horse documents upload" | horse-documents Policy Aenderung |
| STORAGE-004 | Horse Documents Path Policy Bug | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | 20260814160400_p1_storage_policy_hardening_phase1.sql — objects.name statt h.name | horse-documents Policy Aenderung |
| STORAGE-005 | Expired Grant Read Bypass | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | 20260814163800_p1_storage_expired_grant_read_fix.sql — has_active_access_grant() | access_grants / horse-documents / Storage RLS Aenderung |
| STORAGE-006 | Legal Documents Cross-Provider | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | 20260814160400_p1_storage_policy_hardening_phase1.sql — foldername(name)[1] = auth.uid() | legal-documents Policy Aenderung |
| STORAGE-007 | Transfer Documents Broad Authenticated Access | OPEN | P1 | 2026-08-14 (identifiziert) | Transfer parties policies erlauben jeden authentifizierten Nutzer auf transfers/* | Erfordert Redesign mit horse_transfers-Verknuepfung |
| STORAGE-008 | Chat Images Broad Upload / Path Model | OPEN | P1 | 2026-08-14 (identifiziert) | Erfordert Frontend-Aenderung (Pfadmodell) | Frontend + Policy Aenderung |
| STORAGE-009 | Completion Reports Cross-Provider | OPEN | P1 | 2026-08-14 (identifiziert) | Provider-Scoping fehlt | Policy Aenderung |
| STORAGE-010 | PDFs Cross-Tenant Read | OPEN | P2 | 2026-08-14 (identifiziert) | Tenant-Isolation fehlt | Policy Aenderung |
| STORAGE-011 | Feedback Screenshots Public Read | OPEN | P2 | 2026-08-14 (identifiziert) | Public SELECT Policy | Policy Aenderung |
| STORAGE-012 | Horse Photos Public Policy | OPEN | P2 | 2026-08-14 (identifiziert) | Public can view horse photos | Policy Aenderung |
| STORAGE-013 | Hoof Photos Public Policy | OPEN | P2 | 2026-08-14 (identifiziert) | Public Access Policy | Policy Aenderung |
| STORAGE-014 | HufCam Public Bucket | OPEN / REVIEW | P2 | 2026-08-14 (identifiziert) | hufcam-images public=true, inhaltliche Pruefung erforderlich | Bucket-Flag Aenderung |

## Auth / Route / Server Authorization

| ID | Titel | Status | Prio | Letzte Verifikation | Evidenz | Retest-Trigger |
|---|---|---|---|---|---|---|
| AUTH-001 | Frontend Service Role Leakage | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-16 | Deep Dive Audit: kein service_role im Frontend | Frontend-Build Aenderung |
| AUTH-002 | Privilege Escalation in Views | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-05 | Security Fixes: alle Views security_invoker=on | View-Aenderung |
| AUTH-003 | Frontend Password Hashes | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-16 | Deep Dive Audit: nicht exponiert | Frontend-Build Aenderung |
| AUTH-004 | Route / Server Authorization | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | Production SQL Test: anon denied, wrong role denied, wrong workspace denied, revoked denied, direct API denied | Auth/RLS/workspace/relationship Aenderung |
| AUTH-005 | Botschafter Service Role | REVIEW | P2 | 2026-03-16 | Audit: legitim aber regelmaessiges Review erforderlich | Edge Function Aenderung |

## Database (RLS & Policies)

| ID | Titel | Status | Prio | Letzte Verifikation | Evidenz | Retest-Trigger |
|---|---|---|---|---|---|---|
| DB-001 | RLS Coverage | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-16 | Deep Dive Audit: 170/170 Tabellen RLS enabled + min. 1 Policy | Tabellen-Aenderung |
| DB-002 | PII-Zugriff (Profiles) | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-05 | Security Fixes: profiles_strict_connected_select | profiles Policy Aenderung |
| DB-003 | Medizinische Daten Segregation | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-05 | Security Fixes: horses_basic + horses_medical Views | horses View/Policy Aenderung |
| DB-004 | Zahlungsinterna (Invoices) | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-05 | Security Fixes: invoices_client_view | invoices View/Policy Aenderung |
| DB-005 | Zeitlich begrenzter Zugriff (GPS) | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-05 | Security Fixes: valid_until + auto_revoke_on_last_appointment | access_grants Aenderung |
| DB-006 | Consent-Tracking (Appointments) | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-05 | Security Fixes: data_shared_with_partners/employees | appointments Policy Aenderung |
| DB-007 | Rate Limiting | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-16 | Deep Dive Audit: check_*_rate_limit Functions | Rate Limit Aenderung |

## Edge Functions

| ID | Titel | Status | Prio | Letzte Verifikation | Evidenz | Retest-Trigger |
|---|---|---|---|---|---|---|
| EDGE-001 | CORS Absicherung | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-16 | Deep Dive Audit: Standard-Pattern | Edge Function Aenderung |
| EDGE-002 | Verwaiste Edge Functions | OPEN | P3 | 2026-03-16 | Deep Dive Audit: ca. 8 verwaist | Edge Function Deployment |

## Functions

| ID | Titel | Status | Prio | Letzte Verifikation | Evidenz | Retest-Trigger |
|---|---|---|---|---|---|---|
| FUNC-001 | search_horse_by_readable_id | REVIEW | P2 | 2026-08-14 | Production: SECURITY DEFINER, anon EXECUTE=false, authenticated EXECUTE=true, owner_id NOT returned, liefert id/readable_id/name/photo_url/breed ohne Relationship-Check. Produktentscheidung erforderlich ob authentifizierter Lookup ohne Beziehung gewollt ist. | Function / RLS Aenderung |
| FUNC-002 | SECURITY DEFINER Klassifizierung | OPEN | P1 | 2026-08-13 | 153 total, 148 anon executable, 151 authenticated executable | Vollstaendige Klassifizierung erforderlich |

## Secrets / Infrastructure / XSS / Lifecycle

| ID | Titel | Status | Prio | Letzte Verifikation | Evidenz | Retest-Trigger |
|---|---|---|---|---|---|---|
| SEC-001 | CSP Headers | OPEN | P2 | 2026-03-16 | Deep Dive Audit: keine CSP Headers konfiguriert | Frontend Deployment |
| SEC-002 | XSS Prevention | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-16 | Deep Dive Audit: 49/50 DOMPurify, 1x statisch | Frontend Aenderung |
| SEC-003 | Agent Secret Handling / ENV Exposure | CLOSED + CURRENT EVIDENCE | — | 2026-08-14 | Audit von .env.production.local: Enthält nur public VITE_SUPABASE_PUBLISHABLE_KEY und VITE_SUPABASE_URL. Keine echten Secrets exponiert. Regel etabliert. | Agenten-Systemaenderung |
| LIFECYCLE-001 | Soft-Delete / DSGVO-Export | HISTORICAL EVIDENCE / RETEST | P2 | 2026-03-16 | Audit: deleted_at + data-export Edge Function | Loeschkonzept Aenderung |
| INFRA-001 | Infrastruktur-Audit (VPS/Backup/Secrets/Deps) | OPEN | P2 | nie | Kein dediziertes Audit vorhanden | Erstmalige Durchfuehrung erforderlich |

---

## Zusammenfassung

| Kategorie | Anzahl |
|---|---|
| CLOSED + CURRENT EVIDENCE | 8 |
| HISTORICAL EVIDENCE / RETEST | 13 |
| OPEN P1 | 4 |
| OPEN P2 | 6 |
| OPEN P2 / REVIEW | 1 |
| OPEN P3 | 1 |
| REVIEW P2 | 2 |
| P0 | 0 |

Naechste Aktion: STORAGE-007 (Transfer Documents) oder FUNC-002 (SECURITY DEFINER Klassifizierung) — beide P1.

---

## Audit-Historie

| Datum | Typ | Quelle |
|---|---|---|
| 2026-03-05 | Security Fixes Migration | docs/security-fixes.md |
| 2026-03-15 | Pferdeakte Audit | docs/pferdeakte-audit-2026-03-15.md |
| 2026-03-16 | Deep Dive Audit | docs/deep-dive-audit-2026-03-16.md |
| 2026-08-13 | HufiDB Security Run | /home/pascaladmin/hufidb/reports/2026-08-13_HUFIDB_SECURITY_RUN.md |
| 2026-08-14 | Storage Phase 1 Hardening | supabase/migrations/20260814160400_p1_storage_policy_hardening_phase1.sql |
| 2026-08-14 | Expired Grant Read Fix | supabase/migrations/20260814163800_p1_storage_expired_grant_read_fix.sql |
| 2026-08-14 | AUTH-004 Production Retest | Live SQL Test auf vnschgjxkzzwzefqlrji |
| 2026-08-14 | FUNC-001 Production Reverification | Live grants + function body inspection auf vnschgjxkzzwzefqlrji |
