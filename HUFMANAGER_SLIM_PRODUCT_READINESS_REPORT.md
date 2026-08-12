# HUFMANAGER SLIM PRODUCT READINESS REPORT

Stand: 2026-08-12

HufManager Slim ist ein eigenstaendiges, schlankes HufManager-Produkt. Dieser Report bewertet den bestehenden HufManager-Codebestand als Grundlage fuer HufManager Slim. Er ist keine HufiApp-Migration und keine HufiApp-Compliance-Freigabe.

## SUPABASE_ARCHITECTURE

- Vorhanden ist eine umfangreiche Supabase-Integration mit `auth`, `storage`, `realtime`, Edge Functions, Migrations und vielen RLS-/Storage-Policies im HufManager-Repo.
- Das Projekt nutzt `@supabase/supabase-js` im Frontend über [`src/integrations/supabase/client.ts`](./src/integrations/supabase/client.ts).
- Relevante Artefakte sind unter `supabase/migrations/*` und `supabase/functions/*` vorhanden.
- Es existieren bereits Schutzmuster für private Buckets, signed URLs, Realtime-Tabellen und serverseitige Funktionen.

## AUTH_MODEL

- Auth wird clientseitig über Supabase Sessions und `useAuth` verarbeitet.
- Frontend Role State ist keine Authorization Source of Truth.
- Rollen werden im Frontend nicht aus `user_metadata` fuer Autorisierungsentscheidungen abgeleitet.
- Eine Rolle gilt nur als aufgeloest, wenn sie aus der vertrauenswuerdigen `user_roles`-Quelle kommt und einen bekannten Wert hat.
- `ROLE_NOT_FOUND`, `ROLE_INVALID` und `CONTEXT_NOT_RESOLVED` fuehren zu DENY/LIMITED State, nicht zu `client`.
- `client` bleibt eine gueltige Rolle, wenn sie aus `user_roles` aufgeloest wurde.
- Supabase RLS muss server-/DB-seitig durchgesetzt werden und bleibt unabhaengig vom Frontend-Rollenstatus.
- `user_metadata` bleibt nur fuer nicht-sicherheitskritische Anzeige- oder Signup-Intent-Daten geeignet.

## RLS_STATUS

- Im Repo existieren zahlreiche RLS-Migrationen und Storage-Policies.
- Der Code enthält deutliche Hinweise auf die Absicherung sensibler Tabellen und Buckets.
- Vollstaendige Live-Verifikation gegen die echte Supabase-Instanz steht noch aus: `NOT_LIVE_VERIFIED`.
- Risiko bleibt dort, wo alte Migrationsstände oder nicht mehr synchronisierte Policies existieren.
- Es wird keine DSGVO- oder Security-Konformitaet behauptet, die nicht technisch und rechtlich verifiziert wurde.

## STORAGE_SECURITY

- Private Buckets und Signed-URL-Nutzung sind bereits im Projekt vorgesehen.
- Hilfsfunktionen wie [`src/lib/storage.ts`](./src/lib/storage.ts) unterscheiden zwischen öffentlichen und privaten Buckets.
- Im Repo existieren mehrere Storage-Policies für horse documents, horse media, chat images, admin attachments und weitere Buckets.
- Offen bleibt die vollstaendige Live-Pruefung, ob alle Buckets aktuell konsistent private/public gesetzt sind: `NOT_LIVE_VERIFIED`.

## PRIVACY_CONTROLS

- Privacy-by-design ist in Teilen strukturell vorbereitet:
  - Datenexport-Funktionen
  - Löschfunktionen
  - Retention-/Audit-Hinweise
  - DSGVO-/AI-Transparenzseiten
- Das Frontend enthält weiterhin einige historische Texte und Seiten, die noch harmonisiert werden sollten.
- Keine juristische Neubewertung vorgenommen. Keine Rechtskonformitaet wird allein aus Code-Struktur abgeleitet.

## AI_DATA_SCOPE

- AI- und Voice-Funktionen existieren im HufManager-Codebestand.
- Die Trennung zwischen deterministischer Fachlogik und generativer Unterstützung ist fachlich gewollt.
- Keine neuen Autorisierungsentscheidungen durch KI eingeführt.
- Weitere Verifikation nötig, welche Daten tatsächlich an externe Modelle gehen.

## AUDIT_MODEL

- Es gibt bereits Audit-/Timeline-/Notification-ähnliche Strukturen im Repo.
- Relevante Änderungen sollten weiterhin anlassbezogen protokolliert werden, insbesondere bei:
  - Login
  - Rollenänderungen
  - Subscription-/Entitlement-Änderungen
  - Rechnungsstatus
  - Löschvorgänge
- Kein neues Vollzeit-Event-Tracking eingeführt.

## SAAS_MONETIZATION

- Der HufManager-Codebestand enthaelt bereits Subscription- und Plan-Logik.
- Es gibt vorhandene Hinweise auf Copecart-/Webhook-/Plan-Übernahme.
- Eine saubere Trennung zwischen:
  - Kund*innen-Rechnungen des Hufbearbeiters
  - und SaaS-Abonnement des HufManager-Nutzers
  ist fachlich notwendig.

## ENTITLEMENTS

- Feature-Gating ist bereits im Code angelegt.
- Der sichere Ansatz fuer HufManager Slim ist: Subscription -> Plan -> Entitlements -> Feature.
- UI-Verstecken allein reicht nicht.
- Feingranulare, serverseitig abgesicherte Entitlements sollten weiter ausgebaut werden.

## CUSTOMER_INVOICING

- Kund*innen-Rechnungen sind ein eigener Geschäftsfall und dürfen nicht mit SaaS-Billing vermischt werden.
- Die bestehende Rechnungslogik im Produkt bleibt davon getrennt.

## ONBOARDING

- Es existieren Demo-/Invite-/Setup-Artefakte im Repo.
- Ein produktiver Erst-Use-Flow sollte auf einen schnellen ersten Nutzen führen:
  - Registrierung
  - Grundkontext
  - erster Kunde
  - erstes Pferd
  - erster Termin
  - Heute-Screen

## MOBILE_RESILIENCE

- Der Slim-Fokus bleibt mobil.
- Kritische Eingaben sollten nicht still verschwinden.
- Auto-Save/Draft-/Retry-Verhalten ist dort relevant, wo Dokumentation und Fotos unterwegs entstehen.

## NOTIFICATIONS

- Benachrichtigungs- und Reminder-Artefakte sind vorhanden.
- Anforderungen bleiben:
  - kontrollierbar
  - abschaltbar
  - nachvollziehbar
  - nicht doppelt
  - nicht spammy

## BACKUP_RECOVERY

- Es gibt viele Migrationen und damit eine brauchbare Historie.
- Vor destruktiven Änderungen muss weiterhin geprüft werden, ob ein Rollback oder eine Rücksicherung möglich ist.
- Keine destruktiven Live-Aktionen ohne Freigabe.

## OBSERVABILITY

- Es existieren mehrere Health-/Notification-/Function-Artefakte.
- Fehler sollten sauber gemeldet werden, ohne sensible Inhalte in Logs zu schreiben.

## SECURITY_TESTS

- Automatisierbar und empfehlenswert:
  - anon rejected
  - valid user accepted
  - RLS own data allowed
  - RLS cross-user denied
  - storage own file allowed
  - storage cross-user denied
  - entitlement gating enforced
  - protected routes protected
- Live-Datenbanktests wurden in dieser Runde nicht ausgefuehrt: `NOT_LIVE_VERIFIED`.

## KNOWN_LIMITATIONS

- Keine Live-Supabase-Objektprüfung der Policies und Buckets.
- Keine End-to-End-Verifikation gegen eine Produktions- oder Staging-Datenbank.
- Einige historische Seiten enthalten noch alte visuelle/inhaltliche Reste.

## LEGAL_REVIEW_ITEMS

- Juristische Freigabe für Rechtstexte, Aufbewahrungsfristen, Widerruf, Vertrags- und Datenschutztexte bleibt erforderlich.
- DSGVO-/AI-Kommunikation sollte fachlich sauber, aber nicht juristisch neu erfunden werden.

## PRODUCTION_BLOCKERS

- Irreversible DB-/Storage-/RLS-Änderungen ohne Freigabe.
- Live-Migrations ohne vorherige Verifikation der betroffenen Umgebung.
- Herausgabe von Secrets oder echten Zugangsdaten.

## RESULT

- Rollenentscheidungen im Frontend wurden von `user_metadata` entkoppelt.
- `ROLE_NOT_FOUND` und `ROLE_INVALID` fuehren zu DENY/LIMITED State.
- Das Projekt bleibt HufManager Slim.
- Weitere Supabase-Live-Verifikation bleibt als naechste Sicherheitsstufe offen.
