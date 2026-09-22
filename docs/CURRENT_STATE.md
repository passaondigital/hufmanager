# HufManager — CURRENT STATE / SOURCE OF TRUTH

**Stand:** 22.09.2026

> Aktueller technischer Snapshot für Menschen und Agenten. Bei Widerspruch gilt: verifizierter Runtime-/Production-Stand vor älterer Planung, Marketingtext oder historischer Dokumentation.

## 1. Git / Release-Linie

- Repository: `passaondigital/hufmanager`
- Aktive Lifecycle-Release-Linie: `release/hufmanager-lifecycle-2026-09-11`
- Operativer Code-Baseline-Commit vor diesem reinen Dokumentationsupdate: `0ca6d2a44cb5026b04e6994b1d68f26a122e0725`
- `main` ist für den Lifecycle-Strang nicht der aktuelle Arbeitsstand; der letzte dort sichtbare Baseline-Commit war `d68e5151e64e042c56099c6f332c9911b1c71344`.
- Dieses Dokumentationsupdate ändert keine Runtime-, Datenbank- oder Produktlogik.

## 2. Bereits verifiziert

### XXL-Staging / P0

Aus dem dokumentierten Stabilisierungslauf:

- Staging-Isolation: PASS
- DB-Stabilität: PASS
- P0 Security/DB: PASS
- Invoice-Atomicität/Negativmatrix: PASS
- DB-Lint: 0 Fehler
- aktive Staging→Production-Pfade wurden vor den Tests deaktiviert bzw. verifiziert

Diese Punkte nicht ohne neuen gegenteiligen Beweis erneut als offen behandeln.

## 3. Lifecycle / Production-Deploy — aktueller Gate-Stand

Nach den operatorseitig dokumentierten Claude-Code-/Terminal-Ausgaben:

- Prerequisite-Migration für die Lifecycle-Step-1-Abhängigkeiten wurde kontrolliert angewendet und postgeprüft.
- Lifecycle **Step 1** wurde atomar angewendet und postgeprüft.
- Der Postcheck für Step 1 war PASS.
- **Step 2 wurde NICHT angewendet.**
- Kein Scheduler-Start, kein Edge-Deploy und keine Service-Restarts im gestoppten Schritt.
- Kein blindes `supabase db push`.

### Aktueller Blocker

Die lokale Migration-Dateimenge und das Production-/Remote-Migration-Ledger sind nicht eindeutig deckungsgleich.

Damit gilt:

**MIGRATION_LEDGER = BLOCKED**  
**SAFE_FOR_MIGRATION_2 = NO**

Das ist derzeit der maßgebliche Release-Stop. Ein Schema kann fachlich korrekt sein und trotzdem eine uneindeutige Migration-Historie besitzen; Migrationen dürfen deshalb nicht nur wegen Dateiname/Timestamp erneut ausgeführt werden.

## 4. Backup / Rollback

Laut den dokumentierten Deploy-Ausgaben wurden vor den Production-Schritten Backup-/Restore-/Rollback-Artefakte erzeugt und verifiziert.

Vor jedem weiteren Production-Schritt müssen diese Artefakte erneut auffindbar und zur betroffenen Migration passend sein.

## 5. Exakt nächster technischer Schritt

Vor Migration Step 2:

1. lokales Repo-Migrationsledger inventarisieren,
2. Remote-/Production-Ledger inventarisieren,
3. tatsächlichen Production-Schema-Stand read-only erfassen,
4. jede Abweichung klassifizieren als:
   - echte fehlende Migration,
   - bereits angewendet mit anderem Dateinamen/Timestamp,
   - historische Legacy-Migration,
   - neue Release-Migration,
   - reine Ledger-/Naming-Abweichung ohne Schema-Differenz,
5. für jede Abweichung dokumentieren: LOCAL, REMOTE, SCHEMA-EFFEKT, BEREITS ANGEWENDET, RISIKO, BEHANDLUNG,
6. erst danach ein explizites `LEDGER_RECONCILED=YES` und `SAFE_FOR_MIGRATION_2=YES` zulassen.

Bis dahin:

- keine Migration #2,
- kein ungeprüfter DB-Push,
- kein DNS-Cutover,
- kein neuer Production-Deploy,
- keine destruktive History-Reparatur.

## 6. Produkt-/Pilotstatus

Der technische Kern wurde stark gehärtet, aber ein Production-/Pilot-GO darf nicht aus einzelnen PASS-Werten abgeleitet werden.

Die maßgebliche Produktprüfung bleibt der vollständige reale Kernflow:

`Login → Kunde → Pferd → Termin → Tour → Dokumentation → Material → Rechnung/PDF`

inklusive Mobile, Draft/Resume und UI-Mandantentrennung.

## 7. Infrastrukturgrenze

Bekannte Trennung:

- XXL-Staging: `cloud-server-10634828` / `85.190.105.104`
- HufManager Staging-App: `/srv/hufi/lab/factory/projects/hufmanager`
- Production und Staging nicht vermischen.
- Supabase-/DB-/DNS-/Deployment-Ziele vor jedem Write erneut verifizieren.

## 8. Source-of-Truth-Regel

Priorität bei Konflikten:

1. aktuell verifizierter Production-/Runtime-Stand,
2. Backup-/Postcheck-/Acceptance-Evidenz,
3. aktueller Release-Branch und Migrationen,
4. HM-CodeDoku / Master-Audit,
5. ältere Architektur-/Planungsdokumente,
6. Marketingtext.

Keine Secrets, Tokens, Passwörter oder Service-Role-Keys in Git oder Agentenwissen aufnehmen.
