# HufiApp Market-Ready Release Plan

**Stand:** 07.08.2026
**Grundlage:** `HUFIAPP_MARKET_READY_MASTER_AUDIT.md` (gleiches Verzeichnis)
**Prinzip:** Maximal zehn P0/P1-Pakete, keine künstliche Aufsplittung, keine Architekturänderung. Jedes Paket ist isoliert deploybar.

---

## Reihenfolge und Abhängigkeiten

```
1. TASK BUILD-001  (Build-Flavor-Fix)          — unabhängig, sofort möglich
2. TASK MARKET-101 (TD-05 org_id-Fix)          — unabhängig, sofort möglich
3. TASK REL-001    (Correlation-ID)            — bereits READY, unabhängig
   → nach REL-001: isolierter Edge-Function-Deploy anthropic-proxy (Pascal-Freigabe nötig)
4. TASK MARKET-104 (Rechnungsversand deployen)  — Code bereits fertig, nur Deploy-Schritt, unabhängig
5. TASK MARKET-105 (CopeCart-Härtung deployen)  — Code bereits fertig, nur Deploy-Schritt, unabhängig
6. TASK AVV-001    (AVV-Dashboard Read-Layer)   — unabhängig
7. TASK REG-001    (Registrierungsquelle)       — Voraussetzung: Codex-Reset, Ursachendiagnose zuerst
8. TASK REG-002    (Registrierungs-Mail Label)  — Voraussetzung: REG-001
9. TASK MARKET-102 (Biometrie-Server-Backup)    — unabhängig
10. TASK MARKET-103 (Error-Monitoring-Basis)    — unabhängig
```

Pakete 1, 2, 3, 6, 9, 10 können parallel/in beliebiger Reihenfolge starten. Paket 8 hängt zwingend von 7 ab. Pakete 4/5 sind reine Deploy-Aktionen ohne neue Implementierung — höchste Wirkung pro Aufwand.

---

## Paketdetails

### 1. BUILD-001 — Build-Flavor-Fix (bereits in CODEXTODO.md, hier priorisiert als P0)

Siehe vollständige Definition in `CODEXTODO.md`. **Neu bewertet: P0 statt P1** — verfälscht den Markenauftritt des Hauptprodukts für jeden ersten Besucher.

- **Tests:** `npm run build` mit `VITE_APP_FLAVOR=hufiapp`, Titel/Manifest-Kontrolle im `dist/`-Output (nicht live).
- **Rollback:** `deploy.sh`-Änderung ist eine einzige Zeile, trivial rückgängig zu machen.
- **Aufwand:** < 0,5 Tag.
- **Deploy-Art:** erst `./deploy.sh` mit Fix nach separater Pascal-Freigabe, kein automatischer Deploy in diesem Paket.
- **Pascal-Entscheidung:** Freigabe des `deploy.sh`-Fixes und des nachfolgenden Live-Deploys.

### 2. MARKET-101 — TD-05 `org_id`-Filterlücke schließen

- **Problem:** `PortalWidgets.tsx:61` zählt `insurance_claims` nur nach `status`, nicht nach `org_id` — Cross-Tenant-Zählungsleck.
- **Sichtbare Auswirkung:** Falsche/fremde Zahlen in einem Portal-Widget, kein Datenexport-Leck, aber echtes Mandantentrennungs-Risiko.
- **Repository/Datei:** `hufiapp-dev`, `src/components/portal/PortalWidgets.tsx`.
- **Datenbankbezug:** keine Migration, reiner Query-Fix (Filter ergänzen).
- **Sicherheitsbezug:** P0, Mandantentrennung.
- **Scope:** nur die eine Query in `PortalWidgets.tsx`.
- **Nicht im Scope:** kein Umbau des Portal-Widgets, keine anderen Queries in derselben Datei.
- **Tests:** Nutzer aus Org A sieht nur eigene Claims, nicht Gesamtzahl.
- **Akzeptanz:** Filter ergänzt, TODO-Kommentar entfernt, kein anderer Query-Pfad verändert.
- **Rollback:** einzelne Zeile.
- **Aufwand:** < 0,5 Tag.
- **Abhängigkeiten:** keine.
- **Deploy-Art:** Teil des nächsten regulären `deploy.sh`-Laufs (Frontend), kein isolierter Edge-Function-Deploy nötig.
- **Pascal-Entscheidung:** Freigabe zu READY, später Freigabe zum Deploy.

### 3. REL-001 — Correlation-ID (bereits vollständig in CODEXTODO.md definiert, einziger READY-Task)

Nach Fertigstellung: isolierter Deploy nur der Funktion `anthropic-proxy` — **kein** `./deploy.sh`, da dieser das gesamte Frontend inkl. noch nicht freigegebener Änderungen mit ausrollen würde (bereits in der Release-Bridge-Prüfung dieser Auditserie so festgestellt).

### 4. MARKET-104 — Rechnungsversand-Autorisierungsfix isoliert deployen

- **Problem:** Commits `b3785f15`/`13075211` (Autorisierungsprüfung `send-invoice-email`) sind fertig und getestet, aber nicht live — PROD läuft auf Version 122 ohne diesen Schutz.
- **Sichtbare Auswirkung:** ohne Deploy bleibt eine (bereits behobene) Autorisierungslücke im Rechnungsversand produktiv aktiv.
- **Repository:** `hufiapp-dev`, `supabase/functions/send-invoice-email/`.
- **Datenbankbezug:** keiner.
- **Sicherheitsbezug:** IDOR-artige Lücke wird geschlossen (beliebiger Nutzer könnte sonst Versand für fremde Rechnung auslösen).
- **Scope:** ausschließlich `supabase functions deploy send-invoice-email`.
- **Nicht im Scope:** kein Frontend-Deploy, keine weitere Funktion.
- **Tests:** bereits 5/5 Contract-Tests grün (verifiziert in dieser Auditserie); nach Deploy kontrollierter Testversand an eine von Pascal kontrollierte Adresse.
- **Akzeptanz:** Live-Funktion entspricht committetem Stand, kontrollierter Testversand erfolgreich.
- **Rollback:** vorherige Version (122) erneut deployen.
- **Aufwand:** < 0,5 Tag (reiner Deploy, keine neue Implementierung).
- **Abhängigkeiten:** keine.
- **Deploy-Art:** isolierter Edge-Function-Deploy.
- **Pascal-Entscheidung:** ausdrückliche Deploy-Freigabe (bereits einmal in dieser Auditserie angefragt, noch nicht erteilt).

### 5. MARKET-105 — CopeCart-Webhook-Härtung isoliert deployen

- **Problem:** Commit `870a2c1c` (HMAC-Härtung, Duplikatschutz, Betragsabgleich) ist fertig und getestet, PROD läuft auf Version 160 ohne diese Härtung.
- **Sichtbare Auswirkung:** ohne Deploy bleiben bereits behobene Schwächen (u. a. Betrags-/Replay-Schutz) produktiv ungeschlossen.
- **Repository:** `hufiapp-dev`, `supabase/functions/copecart-webhook/`.
- **Datenbankbezug:** keiner.
- **Sicherheitsbezug:** Zahlungsintegrität.
- **Scope:** ausschließlich `supabase functions deploy copecart-webhook`.
- **Nicht im Scope:** keine Änderung an Produkt-/Preis-Mappings.
- **Tests:** 3/3 Contract-Tests grün (verifiziert in dieser Auditserie); nach Deploy CopeCart-Sandbox-/Test-IPN.
- **Akzeptanz:** Live-Funktion entspricht committetem Stand, Test-IPN korrekt verarbeitet.
- **Rollback:** vorherige Version (160) erneut deployen.
- **Aufwand:** < 0,5 Tag.
- **Abhängigkeiten:** keine.
- **Deploy-Art:** isolierter Edge-Function-Deploy.
- **Pascal-Entscheidung:** ausdrückliche Deploy-Freigabe.

### 6. AVV-001 — siehe vollständige, bereits präzisierte Definition in `CODEXTODO.md`.

### 7. REG-001 — siehe vollständige Definition in `CODEXTODO.md`. Voraussetzung: Ursache der leeren `signup_app`-Spalte zuerst diagnostizieren (kontrollierter Testsignup), nicht raten.

### 8. REG-002 — siehe vollständige Definition in `CODEXTODO.md`. Abhängig von REG-001.

### 9. MARKET-102 — Biometrie-Server-Backup

- **Problem:** `hufi-biometrics.ts` speichert Credential-Referenz nur in `localStorage`, kein Server-Backup — Lockout bei Geräte-/Browserwechsel.
- **Sichtbare Auswirkung:** Nutzer verliert biometrischen Zugang bei neuem Gerät, muss neu registrieren.
- **Repository:** `hufiapp-dev`, `src/lib/hufi-biometrics.ts`, neue Spalte `user_profiles.webauthn_credentials` (Migration bereits als Entwurf aus früherer Prüfung bekannt, hier erneut zu verifizieren, nicht blind zu übernehmen).
- **Datenbankbezug:** additive Migration nötig — **nicht ohne separate Freigabe ausführen**.
- **Sicherheitsbezug:** P1, kein akutes Risiko, aber Nutzungshürde.
- **Scope:** Server-Backup + Restore-Pfad für Credential-Referenz.
- **Nicht im Scope:** kein neuer Login-Flow.
- **Tests:** Registrierung Gerät A, Wiederherstellung Gerät B.
- **Akzeptanz:** Credential-Referenz übersteht Geräte-/Browserwechsel.
- **Rollback:** Migration additiv, keine bestehenden Daten verändert.
- **Aufwand:** < 1 Tag.
- **Abhängigkeiten:** keine.
- **Deploy-Art:** Migration + Frontend, beides einzeln freizugeben.
- **Pascal-Entscheidung:** Freigabe der Migration, Freigabe zu READY.

### 10. MARKET-103 — Minimales Error-Monitoring

- **Problem:** `ErrorBoundary.tsx` fängt nur UI-Fehler ab, kein echtes Backend (Sentry Platzhalter).
- **Sichtbare Auswirkung:** Ausfälle bei echten Kunden bleiben unbemerkt.
- **Repository:** `hufiapp-dev`, `src/components/ErrorBoundary.tsx`.
- **Datenbankbezug:** keiner.
- **Sicherheitsbezug:** Betriebssicherheit, kein Datenzugriffsrisiko.
- **Scope:** Basis-Setup eines Monitoring-Diensts, keine PII in Fehlerreports.
- **Nicht im Scope:** kein vollständiges APM.
- **Tests:** bewusst ausgelöster Testfehler erscheint im Monitoring.
- **Akzeptanz:** ein realer Fehler wird sichtbar protokolliert.
- **Rollback:** Feature-Flag/Entfernen der Integration.
- **Aufwand:** ca. 1 Tag.
- **Abhängigkeiten:** keine.
- **Deploy-Art:** Frontend-Deploy.
- **Pascal-Entscheidung:** Wahl des Monitoring-Diensts (Secret/Konto nötig).

---

## Nachtrag 07.08.2026 — Repository-Wahrheit und vier Kernbestandteile

**Vorrang vor allen zehn Paketen oben:** Klärung, ob `hufiapp-dev` oder `/root/hufmanager_v25/production` künftig kanonisch für Codex-Deploys ist (siehe Master Audit Abschnitt 13). Ohne diese Klärung ist jedes „isoliertes Deployment" der Pakete 4/5 (Rechnungsversand/CopeCart) technisch unmöglich, da die zugrundeliegenden Fixes im Produktions-Branch schlicht nicht existieren — sie müssten zuerst dorthin übertragen werden.

Vier neue, eng begrenzte Pakete aus den Kernbestandteil-Prüfungen (Master Audit Abschnitt 14), keines davon kurzfristig „einfach deploybar":

- **MARKET-106 — Wischoberfläche produktionsreif entscheiden/bauen.** P1. Voraussetzung: Repository-Entscheidung. Entweder (a) `HufiSwipeWorkspace` reell in den Produktions-Branch überführen, `VITE_HUFI_SWIPE_WORKSPACE` produktiv aktivieren, echten Live-/Gerätetest durchführen — oder (b) Pascal entscheidet bewusst, sie für den ersten Marktstart zu streichen. Kein Codex-Vorgriff auf diese Entscheidung.
- **MARKET-107 — Offline-Konfliktbehandlung prüfen/ergänzen.** P1. `src/lib/offline/syncQueue.ts` ohne erkennbaren Schutz vor Duplikaten/Konflikten bei Mehrgeräte-Nutzung — vor MARKET-READY zu klären, nicht zwingend vor CONTROLLED PILOT.
- **MARKET-108 — Zehner-Kachelstruktur final entscheiden.** P0 (Grundsatzentscheidung, keine Umsetzung). Pascal muss `HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md` Abschnitt 9 lesen und die Hypothese bestätigen, korrigieren oder verwerfen — keine Umsetzung möglich, solange offen.
- **MARKET-109 — Onboarding-Systeme bereinigen/klären.** P1. Sechs von sieben gefundenen Onboarding-Komponenten sind hinsichtlich produktiver Erreichbarkeit ungeklärt — vor MARKET-READY vollständig nachzuvollziehen, welche aktiv sind und ob Altcode entfernt werden kann.

Diese vier Pakete sind **keine** der ursprünglichen zehn Pakete — Gesamtzahl P0/P1 damit 14, wie in Abschnitt „Prinzip" oben als Ausnahme dokumentiert, weil Pascals eigene neue Vorgabe (vier nicht verhandelbare Bestandteile) nach Erstellung der ursprünglichen Zehnerliste hinzukam.

---

## Definition of Done (Gesamtplan)

Alle zehn Pakete READY-gesetzt (durch Pascal, nicht automatisch), REL-001 zuerst abgeschlossen und live verifiziert, Build-Flavor-Fix live verifiziert, TD-05-Fix live verifiziert, beide bereits fertigen Edge-Function-Deploys (Rechnungsversand, CopeCart) live verifiziert, AVV-Dashboard zeigt reale Zahlen, Registrierungsquelle liefert für neue Signups einen validierten Wert.

## Geschätzter Gesamtaufwand

Rund 5–6 Codex-Arbeitstage für alle zehn Pakete (Implementierung), zzgl. mehrerer kurzer, isolierter Deploy-/Freigabeschritte durch Pascal — keine Migration ist zwingend blockierend für den ersten Piloten außer MARKET-102 (Biometrie), die auch verschoben werden kann.

## Realistischer Weg zum ersten zahlenden Neukunden

1. Sofort ohne Codex-Arbeit möglich: kontrollierter Pilot mit 1–3 Kunden unter manueller Begleitung (siehe Master Audit Abschnitt 12).
2. Nach Paketen 1–5 (Build-Flavor, TD-05, REL-001, Rechnungsversand-Deploy, CopeCart-Deploy): Stufe C (Market-Ready) realistisch erreichbar.
3. Pakete 6–10 verbessern Nachweisqualität und Betriebssicherheit, sind aber kein harter Blocker für den ersten Kunden.
