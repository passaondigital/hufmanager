# HufManager Security TODO

Stand: 2026-08-14
Kanonisches Register: /home/pascaladmin/hufmanager-hybrid-release/SECURITY.md

Dieses Dokument enthaelt ausschliesslich unerledigte / aktuelle Arbeit.
Vollstaendige Evidenzhistorie siehe SECURITY.md.

---

## P1

- [x] **STORAGE-007** — Transfer Documents Broad Authenticated Access — **CLOSED 2026-08-14**
  - Status: CLOSED + CURRENT EVIDENCE
  - Migration: 20260814172700_p1_storage_transfer_documents_hardening.sql (Production-live)
  - Evidenz: 8/8 Acceptance Tests PASS (T1-T8) — Seller SELECT, Buyer SELECT, Unrelated DENY, Malformed DENY, Nonexistent DENY, Seller INSERT, Unrelated INSERT DENY, Malformed INSERT DENY
  - Teardown: Testdaten vollstaendig bereinigt, 0 verwaiste Objekte verifiziert

- [ ] **STORAGE-008** — Chat Images Broad Upload / Path Model
  - Status: OPEN P1
  - Naechste Aktion: Frontend-Aenderung (Pfadmodell) + Policy-Haertung
  - Evidenz: 2026-08-14 (identifiziert) — Pfadmodell erfordert Frontend-Aenderung
  - Schliesskriterium: Upload nur in eigene Chat-Pfade moeglich, Production-Verifikation PASS
  - Retest-Trigger: Frontend + Policy Aenderung

- [ ] **STORAGE-009** — Completion Reports Cross-Provider
  - Status: OPEN P1
  - Naechste Aktion: Provider-Scoping in Policy einbauen
  - Evidenz: 2026-08-14 (identifiziert) — Provider-Scoping fehlt
  - Schliesskriterium: Reports nur fuer eigene Provider-ID lesbar, Production-Verifikation PASS
  - Retest-Trigger: Policy Aenderung

- [ ] **FUNC-002** — SECURITY DEFINER Vollstaendige Klassifizierung
  - Status: OPEN P1
  - Naechste Aktion: Alle 153 SECURITY DEFINER Functions klassifizieren (148 anon executable, 151 authenticated executable)
  - Evidenz: 2026-08-13 HufiDB Security Run
  - Schliesskriterium: Jede Function mit Risikobewertung, unnoetige EXECUTE-Grants entfernt
  - Retest-Trigger: Function / Grant Aenderung

## P2

- [ ] **STORAGE-010** — PDFs Cross-Tenant Read
  - Status: OPEN P2
  - Naechste Aktion: Tenant-Isolation in Policy einbauen
  - Evidenz: 2026-08-14 (identifiziert) — Tenant-Isolation fehlt
  - Schliesskriterium: PDFs nur fuer eigenen Tenant lesbar, Production-Verifikation PASS
  - Retest-Trigger: Policy Aenderung

- [ ] **STORAGE-011** — Feedback Screenshots Public Read
  - Status: OPEN P2
  - Naechste Aktion: Public SELECT Policy entfernen oder einschraenken
  - Evidenz: 2026-08-14 (identifiziert) — Public SELECT Policy aktiv
  - Schliesskriterium: Kein oeffentlicher Lesezugriff, Production-Verifikation PASS
  - Retest-Trigger: Policy Aenderung

- [ ] **STORAGE-012** — Horse Photos Public Policy
  - Status: OPEN P2
  - Naechste Aktion: Produktentscheidung ob Public Read gewollt, ggf. einschraenken
  - Evidenz: 2026-08-14 (identifiziert) — Public can view horse photos
  - Schliesskriterium: Bewusste Produktentscheidung dokumentiert + umgesetzt
  - Retest-Trigger: Policy Aenderung

- [ ] **STORAGE-013** — Hoof Photos Public Policy
  - Status: OPEN P2
  - Naechste Aktion: Public Access Policy pruefen und einschraenken
  - Evidenz: 2026-08-14 (identifiziert) — Public Access Policy aktiv
  - Schliesskriterium: Kein unbeabsichtigter oeffentlicher Zugriff, Production-Verifikation PASS
  - Retest-Trigger: Policy Aenderung

- [ ] **STORAGE-014** — HufCam Public Bucket / Review
  - Status: OPEN / REVIEW P2
  - Naechste Aktion: Inhaltliche Pruefung ob hufcam-images public=true gewollt ist
  - Evidenz: 2026-08-14 (identifiziert) — hufcam-images Bucket ist public=true
  - Schliesskriterium: Bewusste Produktentscheidung dokumentiert, Bucket-Flag ggf. geaendert
  - Retest-Trigger: Bucket-Flag Aenderung

- [ ] **SEC-001** — CSP Headers
  - Status: OPEN P2
  - Naechste Aktion: CSP Headers konfigurieren
  - Evidenz: 2026-03-16 Deep Dive Audit — keine CSP Headers konfiguriert
  - Schliesskriterium: CSP Headers aktiv und getestet
  - Retest-Trigger: Frontend Deployment

- [ ] **INFRA-001** — Infrastruktur-Audit (VPS/Backup/Secrets/Dependencies)
  - Status: OPEN P2
  - Naechste Aktion: Erstmaliges dediziertes Infrastruktur-Audit durchfuehren
  - Evidenz: Kein dediziertes Audit vorhanden
  - Schliesskriterium: Audit abgeschlossen, Ergebnisse dokumentiert, kritische Findings adressiert
  - Retest-Trigger: Erstmalige Durchfuehrung erforderlich

## P3

- [ ] **EDGE-002** — Verwaiste Edge Functions
  - Status: OPEN P3
  - Naechste Aktion: Ca. 8 verwaiste Edge Functions identifizieren und entscheiden (entfernen oder dokumentieren)
  - Evidenz: 2026-03-16 Deep Dive Audit
  - Schliesskriterium: Alle verwaisten Functions adressiert
  - Retest-Trigger: Edge Function Deployment

## REVIEW

- [ ] **FUNC-001** — search_horse_by_readable_id
  - Status: REVIEW P2
  - Naechste Aktion: Produktentscheidung ob authentifizierter Lookup ohne Relationship-Check gewollt ist
  - Evidenz: 2026-08-14 Production — SECURITY DEFINER, anon EXECUTE=false, authenticated EXECUTE=true, owner_id NOT returned, liefert id/readable_id/name/photo_url/breed
  - Schliesskriterium: Explizite Produktentscheidung dokumentiert, ggf. Relationship-Check eingebaut
  - Retest-Trigger: Function / RLS Aenderung

- [ ] **AUTH-005** — Botschafter Service Role
  - Status: REVIEW P2
  - Naechste Aktion: Regelmaessiges Review ob Service-Role-Nutzung noch legitim und minimal
  - Evidenz: 2026-03-16 Audit — als legitim bewertet
  - Schliesskriterium: Review-Ergebnis dokumentiert
  - Retest-Trigger: Edge Function Aenderung

## RETEST REQUIRED

- [ ] **AUTH-001** — Frontend Service Role Leakage
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production Frontend-Build auf service_role-Leaks pruefen
  - Evidenz: 2026-03-16 Deep Dive Audit — kein service_role im Frontend gefunden
  - Schliesskriterium: Aktueller Frontend-Build verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: Frontend-Build Aenderung

- [ ] **AUTH-002** — Privilege Escalation in Views
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production Views auf security_invoker=on pruefen
  - Evidenz: 2026-03-05 Security Fixes — alle Views security_invoker=on
  - Schliesskriterium: Aktuelle Production-Views verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: View-Aenderung

- [ ] **AUTH-003** — Frontend Password Hashes
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Aktuellen Frontend-Build pruefen ob Password-Hashes exponiert
  - Evidenz: 2026-03-16 Deep Dive Audit — nicht exponiert
  - Schliesskriterium: Aktueller Frontend-Build verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: Frontend-Build Aenderung

- [ ] **DB-001** — RLS Coverage
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production RLS-Status fuer alle Tabellen verifizieren (170/170 + min. 1 Policy)
  - Evidenz: 2026-03-16 Deep Dive Audit
  - Schliesskriterium: Aktuelle Production-Zaehlung verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: Tabellen-Aenderung

- [ ] **DB-002** — PII-Zugriff (Profiles)
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production profiles_strict_connected_select Policy verifizieren
  - Evidenz: 2026-03-05 Security Fixes
  - Schliesskriterium: Aktuelle Production-Policy verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: profiles Policy Aenderung

- [ ] **DB-003** — Medizinische Daten Segregation
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production horses_basic + horses_medical Views verifizieren
  - Evidenz: 2026-03-05 Security Fixes
  - Schliesskriterium: Aktuelle Production-Views verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: horses View/Policy Aenderung

- [ ] **DB-004** — Zahlungsinterna (Invoices)
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production invoices_client_view verifizieren
  - Evidenz: 2026-03-05 Security Fixes
  - Schliesskriterium: Aktuelle Production-View verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: invoices View/Policy Aenderung

- [ ] **DB-005** — Zeitlich begrenzter Zugriff (GPS)
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production valid_until + auto_revoke_on_last_appointment verifizieren
  - Evidenz: 2026-03-05 Security Fixes
  - Schliesskriterium: Aktuelle Production-Grants verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: access_grants Aenderung

- [ ] **DB-006** — Consent-Tracking (Appointments)
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production data_shared_with_partners/employees Policies verifizieren
  - Evidenz: 2026-03-05 Security Fixes
  - Schliesskriterium: Aktuelle Production-Policies verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: appointments Policy Aenderung

- [ ] **DB-007** — Rate Limiting
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production check_*_rate_limit Functions verifizieren
  - Evidenz: 2026-03-16 Deep Dive Audit
  - Schliesskriterium: Aktuelle Production-Functions verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: Rate Limit Aenderung

- [ ] **EDGE-001** — CORS Absicherung
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Aktuelle Edge Functions auf CORS-Standard-Pattern pruefen
  - Evidenz: 2026-03-16 Deep Dive Audit
  - Schliesskriterium: Aktuelle Edge Functions verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: Edge Function Aenderung

- [ ] **SEC-002** — XSS Prevention
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Aktuellen Frontend-Build auf DOMPurify-Abdeckung pruefen (49/50 + 1x statisch)
  - Evidenz: 2026-03-16 Deep Dive Audit
  - Schliesskriterium: Aktuelle Frontend-Abdeckung verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: Frontend Aenderung

- [ ] **LIFECYCLE-001** — Soft-Delete / DSGVO-Export
  - Status: HISTORICAL EVIDENCE / RETEST
  - Naechste Aktion: Production deleted_at + data-export Edge Function verifizieren
  - Evidenz: 2026-03-16 Audit
  - Schliesskriterium: Aktueller Production-Stand verifiziert, CLOSED + CURRENT EVIDENCE
  - Retest-Trigger: Loeschkonzept Aenderung

## DEFERRED

Keine Items aktuell auf DEFERRED.

---

## Verbindliche Synchronisationsregel

JEDE erfolgreiche Sicherheitsaufgabe muss atomar aktualisieren:

A) Kanonisches SECURITY.md
B) Kanonisches SECURITY_TODO.md (dieses Dokument)
C) HufiOS SECURITY.md / RELEASE_STATUS.md / product-status.json
D) Git-Evidenz/Migrationsreferenz wo zutreffend

Eine Sicherheitsaufgabe ist NICHT abgeschlossen, wenn eines davon veraltet ist.
Kein Agent darf behaupten: "TODO war nicht Teil dieser Aufgabe."

## Verbindliche Agenten-Secret-Handling-Regel

Ein Agent darf niemals `cat .env*` ausführen oder Secrets via `grep` im Klartext ausgeben. Zur Überprüfung von Umgebungsvariablen dürfen ausschließlich die Existenz (YES/NO) oder die Schlüsselnamen (Keys) inventarisiert werden. Jede versehentliche Offenlegung von Secrets erfordert eine sofortige Rotation des betroffenen Keys und eine Registrierung unter SEC-003.
